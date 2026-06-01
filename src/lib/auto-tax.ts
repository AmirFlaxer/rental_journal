import { supabaseAdmin } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function isAutoTaxEnabled(userId: string): Promise<boolean> {
  const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
  return user?.user_metadata?.auto_tax_enabled !== false;
}

export async function createAutoTaxExpense(
  supabase: SupabaseClient,
  userId: string,
  paymentId: string,
  propertyId: string,
  amount: number,
  paidDate: string
): Promise<void> {
  const taxAmount = Math.round(amount * 0.1 * 100) / 100;
  await supabase.from("expenses").insert({
    user_id: userId,
    property_id: propertyId,
    category: "Tax",
    description: 'מס הכנסה 10% — תקבול שכ"ד אוטומטי',
    amount: taxAmount,
    date: paidDate,
    paid_by: "landlord",
    recurring: false,
    bill_transferred: false,
    is_auto_tax: true,
    source_payment_id: paymentId,
  });
}

export async function deleteAutoTaxExpense(
  supabase: SupabaseClient,
  userId: string,
  paymentId: string
): Promise<void> {
  await supabase
    .from("expenses")
    .delete()
    .eq("user_id", userId)
    .eq("source_payment_id", paymentId)
    .eq("is_auto_tax", true);
}

export async function updateAutoTaxExpense(
  supabase: SupabaseClient,
  userId: string,
  paymentId: string,
  amount: number
): Promise<void> {
  const taxAmount = Math.round(amount * 0.1 * 100) / 100;
  await supabase
    .from("expenses")
    .update({ amount: taxAmount })
    .eq("user_id", userId)
    .eq("source_payment_id", paymentId)
    .eq("is_auto_tax", true);
}

// מחיקת כל הוצאות המס האוטומטיות של המשתמש — בעת כיבוי מסלול 10%.
export async function deleteAllAutoTaxExpenses(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data } = await supabase
    .from("expenses")
    .delete()
    .eq("user_id", userId)
    .eq("is_auto_tax", true)
    .select("id");
  return data?.length ?? 0;
}

// תיקון רטרואקטיבי: יצירת הוצאות מס לכל תקבולי שכ"ד ששולמו מתחילת השנה ואילך
// ושעדיין אין להם הוצאת מס. בעת הפעלת מסלול 10%.
export async function backfillAutoTaxForYear(
  supabase: SupabaseClient,
  userId: string,
  year: number = new Date().getFullYear()
): Promise<number> {
  const yearStart = `${year}-01-01`;
  const { data: payments } = await supabase
    .from("payments")
    .select("id, property_id, amount, paid_date")
    .eq("user_id", userId)
    .eq("payment_type", "Rent")
    .not("paid_date", "is", null)
    .gte("paid_date", yearStart);
  if (!payments?.length) return 0;

  const { data: existing } = await supabase
    .from("expenses")
    .select("source_payment_id")
    .eq("user_id", userId)
    .eq("is_auto_tax", true);
  const covered = new Set((existing ?? []).map((e) => e.source_payment_id));

  const rows = payments
    .filter((p) => !covered.has(p.id) && p.property_id && p.paid_date)
    .map((p) => ({
      user_id: userId,
      property_id: p.property_id,
      category: "Tax",
      description: 'מס הכנסה 10% — תקבול שכ"ד אוטומטי',
      amount: Math.round(p.amount * 0.1 * 100) / 100,
      date: p.paid_date,
      paid_by: "landlord",
      recurring: false,
      bill_transferred: false,
      is_auto_tax: true,
      source_payment_id: p.id,
    }));
  if (!rows.length) return 0;
  await supabase.from("expenses").insert(rows);
  return rows.length;
}
