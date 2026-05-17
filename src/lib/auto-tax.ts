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
