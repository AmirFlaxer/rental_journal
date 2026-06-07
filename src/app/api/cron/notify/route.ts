import { NextResponse } from "next/server";
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function sendToUser(subs: PushSubscription[], title: string, body: string, url: string, tag: string) {
  const payload = JSON.stringify({ title, body, url, tag });
  await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      )
    )
  );
}

export async function GET(req: Request) {
  const vapidSubject = process.env.VAPID_SUBJECT;
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidSubject || !vapidPublic || !vapidPrivate) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 503 });
  }
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── 1. חוזים שפוגים בעוד 30 או 7 ימים ──────────────────────────────
  const { data: leases } = await supabaseAdmin
    .from("leases")
    .select("id, end_date, user_id, properties(title)")
    .eq("status", "active");

  const leaseNotifications: Record<string, { title: string; body: string }[]> = {};

  for (const lease of leases ?? []) {
    const daysLeft = Math.ceil(
      (new Date(lease.end_date).getTime() - today.getTime()) / 86400000
    );
    if (daysLeft !== 30 && daysLeft !== 7) continue;

    const propTitle = (lease.properties as unknown as { title: string } | null)?.title ?? "נכס";
    const msg = {
      title: `⚠️ חוזה עומד לפוג — ${propTitle}`,
      body: `נותרו ${daysLeft} ימים לסיום החוזה`,
    };
    if (!leaseNotifications[lease.user_id]) leaseNotifications[lease.user_id] = [];
    leaseNotifications[lease.user_id].push(msg);
  }

  // ── 2. תזכורות שק — מחר ──────────────────────────────────────────
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const { data: tasks } = await supabaseAdmin
    .from("tasks")
    .select("id, title, user_id, due_date")
    .eq("status", "pending")
    .eq("due_date", tomorrowStr)
    .ilike("title", "%שק%");

  const taskNotifications: Record<string, { title: string; body: string }[]> = {};
  for (const task of tasks ?? []) {
    if (!taskNotifications[task.user_id]) taskNotifications[task.user_id] = [];
    taskNotifications[task.user_id].push({
      title: "🧾 תזכורת: הפקדת שק מחר",
      body: task.title,
    });
  }

  // ── 3. שליחה לכל משתמש ─────────────────────────────────────────
  const allUserIds = new Set([
    ...Object.keys(leaseNotifications),
    ...Object.keys(taskNotifications),
  ]);

  for (const userId of allUserIds) {
    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (!subs?.length) continue;

    for (const n of leaseNotifications[userId] ?? []) {
      await sendToUser(subs, n.title, n.body, "/dashboard/leases", "lease-expiry");
    }
    for (const n of taskNotifications[userId] ?? []) {
      await sendToUser(subs, n.title, n.body, "/dashboard/tasks", "check-reminder");
    }
  }

  return NextResponse.json({ ok: true, sent: allUserIds.size });
}
