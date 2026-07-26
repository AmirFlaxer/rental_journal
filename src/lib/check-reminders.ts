import type { SupabaseClient } from "@supabase/supabase-js";

const CHECK_METHODS = new Set(["check", "checks"]);

/** כותרת תזכורת הפקדת השק. היה פרמטר אופציונלי שאף קורא לא העביר - כלומר קבוע בפועל. */
const CHECK_DEPOSIT_TASK_TITLE = 'הפקדת שק שכ"ד';

export function isCheckPaymentMethod(method?: string | null): boolean {
  return !!method && CHECK_METHODS.has(method.toLowerCase());
}

/** מועמדת לאימוץ - חתך המינימלי שהפונקציה צריכה משורת tasks */
export interface ReminderCandidate {
  id: string;
  due_date: string;
  completed_at: string | null;
  source_payment_id: string | null;
}

/**
 * בוחרת איזו תזכורת קיימת לאמץ לתקבול, במקום ליצור שורה חדשה.
 * מעדיפה פתוחה על סגורה, אבל **מאמצת גם סגורה** - אחרת משתמש שסימן
 * את התזכורת ידנית לפני שסימן את התקבול מקבל שתי שורות לאותו חודש.
 * מתעלמת ממשימה שכבר מקושרת לתקבול אחר.
 */
export function pickReminderToAdopt(
  tasks: ReminderCandidate[],
  monthKey: string
): ReminderCandidate | null {
  const sameMonth = tasks.filter(
    (t) => t.due_date.slice(0, 7) === monthKey && !t.source_payment_id
  );
  return sameMonth.find((t) => !t.completed_at) ?? sameMonth[0] ?? null;
}

// סוגר את תזכורת "הפקדת שק" של החוזה+החודש עבור התקבול הזה.
// מאמץ תזכורת פתוחה קיימת אם יש, אחרת יוצר תזכורת סגורה חדשה (התזכורת בד"כ וירטואלית עד כה).
export async function closeCheckReminderForPayment(
  supabase: SupabaseClient,
  userId: string,
  paymentId: string,
  leaseId: string,
  due_date: string,
  paid_date: string
): Promise<void> {
  const monthKey = due_date.slice(0, 7);

  const { data: linked } = await supabase
    .from("tasks")
    .select("id")
    .eq("user_id", userId)
    .eq("source_payment_id", paymentId)
    .maybeSingle();
  if (linked) {
    await supabase.from("tasks").update({ completed_at: paid_date }).eq("id", linked.id);
    return;
  }

  // כולל משימות סגורות - אחרת סימון ידני קודם בתזכורות יוצר כפילות
  const { data: candidates } = await supabase
    .from("tasks")
    .select("id, due_date, completed_at, source_payment_id")
    .eq("user_id", userId)
    .eq("category", "Rent Collection")
    .eq("related_entity_type", "lease")
    .eq("related_entity_id", leaseId);

  const match = pickReminderToAdopt((candidates ?? []) as ReminderCandidate[], monthKey);
  if (match) {
    await supabase
      .from("tasks")
      .update({ completed_at: match.completed_at ?? paid_date, source_payment_id: paymentId })
      .eq("id", match.id);
    return;
  }

  await supabase.from("tasks").insert({
    user_id: userId,
    title: CHECK_DEPOSIT_TASK_TITLE,
    category: "Rent Collection",
    due_date,
    completed_at: paid_date,
    priority: "normal",
    related_entity_type: "lease",
    related_entity_id: leaseId,
    source_payment_id: paymentId,
  });
}

// פותח מחדש תזכורת שנסגרה אוטומטית עבור תקבול שהוחזר ל"לא שולם"
export async function reopenCheckReminderForPayment(
  supabase: SupabaseClient,
  userId: string,
  paymentId: string
): Promise<void> {
  await supabase
    .from("tasks")
    .update({ completed_at: null })
    .eq("user_id", userId)
    .eq("source_payment_id", paymentId);
}
