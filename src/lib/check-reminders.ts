import type { SupabaseClient } from "@supabase/supabase-js";

const CHECK_METHODS = new Set(["check", "checks"]);

export function isCheckPaymentMethod(method?: string | null): boolean {
  return !!method && CHECK_METHODS.has(method.toLowerCase());
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

  const { data: openTasks } = await supabase
    .from("tasks")
    .select("id, due_date")
    .eq("user_id", userId)
    .eq("category", "Rent Collection")
    .eq("related_entity_type", "lease")
    .eq("related_entity_id", leaseId)
    .is("completed_at", null);
  const match = (openTasks ?? []).find((t) => (t.due_date as string).slice(0, 7) === monthKey);
  if (match) {
    await supabase
      .from("tasks")
      .update({ completed_at: paid_date, source_payment_id: paymentId })
      .eq("id", match.id);
    return;
  }

  await supabase.from("tasks").insert({
    user_id: userId,
    title: 'הפקדת שק שכ"ד',
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
