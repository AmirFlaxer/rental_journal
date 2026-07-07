import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";

// ניקוי משימות "גביית שכ"ד" פגומות (כפילויות ויתומות) שנוצרו מבאגים ישנים.
// מעביר לשרת לוגיקה שרצה בעבר בצד הלקוח בכל טעינת דף המשימות.
// חוזה מחייב: POST ללא body, מחזיר { deleted: number }.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();

  const [{ data: tasks, error: tasksErr }, { data: leases, error: leasesErr }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, due_date, completed_at, related_entity_id")
      .eq("user_id", session.user.id)
      .eq("category", "Rent Collection")
      .eq("related_entity_type", "lease"),
    supabase
      .from("leases")
      .select("id")
      .eq("user_id", session.user.id),
  ]);

  // שגיאה בשליפת החוזים חייבת לעצור הכל - אחרת כל המשימות ייחשבו יתומות ויימחקו בטעות
  if (tasksErr || leasesErr) {
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }

  const leaseIds = new Set((leases ?? []).map((l) => l.id));
  const toDelete = new Set<string>();

  // כפילויות חוזה+חודש - משאירים את המשימה המושלמת, מוחקים את השאר
  const seen = new Map<string, { id: string; completedAt: string | null }>();
  for (const t of tasks ?? []) {
    if (!t.related_entity_id || !t.due_date) continue;
    const key = `${t.related_entity_id}-${(t.due_date as string).slice(0, 7)}`;
    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, { id: t.id, completedAt: t.completed_at });
      continue;
    }
    if (t.completed_at && !prev.completedAt) {
      toDelete.add(prev.id);
      seen.set(key, { id: t.id, completedAt: t.completed_at });
    } else {
      toDelete.add(t.id);
    }
  }

  // יתומות - משימות ששייכות לחוזה שכבר לא קיים אצל המשתמש
  for (const t of tasks ?? []) {
    if (t.related_entity_id && !leaseIds.has(t.related_entity_id) && !toDelete.has(t.id)) {
      toDelete.add(t.id);
    }
  }

  if (toDelete.size > 0) {
    await supabase
      .from("tasks")
      .delete()
      .eq("user_id", session.user.id)
      .in("id", Array.from(toDelete));
  }

  return NextResponse.json({ deleted: toDelete.size });
}
