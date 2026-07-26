const CACHE_NAME = "rental-journal-v1";
const STATIC_ASSETS = ["/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // ניווטי-מסמך אינם עוברים דרכנו: HTML לא נשמר בקאש (ראה הסינון למטה), ולכן ברשת
  // שנפלה ה-respondWith היה נפתר ל-undefined - והדפדפן מציג דף לבן במקום מסך
  // שגיאת-הרשת הרגיל שלו. עדיף להשאיר את הניווט לדפדפן.
  if (event.request.mode === "navigate") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (
          response.ok &&
          event.request.url.match(/\.(js|css|png|svg|woff2?)$/)
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      // גם כאן: כשהנכס אינו בקאש, Response.error() משחזר את התנהגות הדפדפן ללא SW,
      // במקום undefined שנחשב חריגה ומפיל את הבקשה בלי הסבר.
      .catch(async () => (await caches.match(event.request)) || Response.error())
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || "ניהול נכסים", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || "default",
      data: { url: data.url || "/dashboard" },
      vibrate: [100, 50, 100],
      dir: "rtl",
      lang: "he",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) { client.focus(); return; }
      }
      return clients.openWindow(url);
    })
  );
});
