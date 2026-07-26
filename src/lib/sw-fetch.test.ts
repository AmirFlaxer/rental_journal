import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// public/sw.js אינו מודול ולכן הוא נטען כטקסט ומורץ מול self מדומה. הבדיקה עוסקת
// במטפל ה-fetch בלבד: מה שהוא בולע ומה שהוא מחזיר, כי respondWith שנפתר ל-undefined
// מתורגם בדפדפן לדף לבן ולא לשגיאת-רשת רגילה.
function loadFetchHandler() {
  const code = readFileSync(path.join(process.cwd(), "public", "sw.js"), "utf8");
  const handlers: Record<string, (event: unknown) => void> = {};
  const fakeSelf = {
    addEventListener: (type: string, fn: (event: unknown) => void) => { handlers[type] = fn; },
    skipWaiting: () => {},
    clients: { claim: () => {} },
    registration: { showNotification: () => {} },
  };
  const fakeCaches = { open: async () => ({ addAll: async () => {}, put: async () => {} }), keys: async () => [], match: async () => undefined };
  new Function("self", "caches", "clients", code)(fakeSelf, fakeCaches, {});
  return handlers.fetch;
}

function makeEvent(request: { method: string; mode: string; url: string }) {
  let responded: unknown = "לא-נקרא";
  return {
    request,
    waitUntil: () => {},
    respondWith: (value: unknown) => { responded = value; },
    get responded() { return responded; },
  };
}

describe("מטפל ה-fetch של service worker", () => {
  it("אינו חוטף ניווטי-מסמך - הדפדפן מטפל בהם בעצמו", () => {
    const handler = loadFetchHandler();
    const event = makeEvent({ method: "GET", mode: "navigate", url: "https://example.test/dashboard" });
    handler(event);
    expect(event.responded).toBe("לא-נקרא");
  });

  it("אינו חוטף בקשות שאינן GET", () => {
    const handler = loadFetchHandler();
    const event = makeEvent({ method: "POST", mode: "cors", url: "https://example.test/api/payments" });
    handler(event);
    expect(event.responded).toBe("לא-נקרא");
  });

  it("לנכס שנכשל ואינו בקאש מחזיר תגובת-שגיאה ולא undefined", async () => {
    const handler = loadFetchHandler();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => Promise.reject(new Error("offline"))) as typeof fetch;
    try {
      const event = makeEvent({ method: "GET", mode: "cors", url: "https://example.test/_next/static/chunk.js" });
      handler(event);
      const resolved = await (event.responded as Promise<Response>);
      expect(resolved).toBeInstanceOf(Response);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
