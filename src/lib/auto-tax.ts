import { supabaseAdmin } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getReceivedAmount } from "@/lib/domain/partial-payment";
import { appDateStr } from "@/lib/domain/dates";
import type { Payment } from "@/types/database";

/**
 * התיאור של הוצאת המס האוטומטית - תווית שהמערכת מייצרת, לא טקסט של המשתמש.
 * מרוכז כאן כדי שכל מקומות היצירה יסכימו עליו, ושרשומות ישנות ייושרו אליו
 * בעת התאמה (רשומות שנוצרו לפני שינוי התווית נשארות עד לעדכון התקבול שלהן).
 */
export const AUTO_TAX_DESCRIPTION = 'מס הכנסה 10% - תקבול שכ"ד אוטומטי';

export async function isAutoTaxEnabled(userId: string): Promise<boolean> {
  const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
  return user?.user_metadata?.auto_tax_enabled !== false;
}

// מצב התקבול הרלוונטי להתאמת הוצאת המס - שמות שדות snake_case כמו שורת DB גולמית
export type AutoTaxPaymentState = Pick<
  Payment,
  "id" | "payment_type" | "property_id" | "amount" | "status" | "paid_date" | "notes" | "partial_paid_amount"
>;

/**
 * מיישר את הוצאת המס האוטומטית (10%) של תקבול נתון למצב הרצוי - במקום שלוש
 * פונקציות נפרדות (create/update/delete) שהקורא היה צריך להחליט ביניהן.
 * הכלל: payment_type=Rent וגם התקבל סכום בפועל (getReceivedAmount>0) - לוודא
 * שקיימת הוצאת מס עם amount=10% מהסכום שהתקבל, property_id עדכני ו-date=paid_date
 * (יצירה אם אין, עדכון אם יש ושונה); אחרת - מחיקת הוצאה קיימת אם יש.
 * יצירה חדשה מותנית ב-isAutoTaxEnabled; עדכון/מחיקה של הוצאה קיימת מתבצעים תמיד -
 * כדי לא להשאיר הוצאת מס "יתומה" מול תקבול ששונה אחרי שהמסלול כובה.
 */
export async function reconcileAutoTax(
  supabase: SupabaseClient,
  userId: string,
  payment: AutoTaxPaymentState
): Promise<void> {
  const received =
    payment.payment_type === "Rent"
      ? getReceivedAmount({
          amount: payment.amount,
          status: payment.status,
          paid_date: payment.paid_date,
          notes: payment.notes,
          partial_paid_amount: payment.partial_paid_amount,
        })
      : 0;

  const { data: existing } = await supabase
    .from("expenses")
    .select("id, amount, date, property_id, description")
    .eq("user_id", userId)
    .eq("source_payment_id", payment.id)
    .eq("is_auto_tax", true)
    .maybeSingle();

  // לא התקבל דבר (או אין נכס משויך) - אין מקום להוצאת מס
  if (received <= 0 || !payment.property_id) {
    if (existing) {
      await supabase
        .from("expenses")
        .delete()
        .eq("user_id", userId)
        .eq("source_payment_id", payment.id)
        .eq("is_auto_tax", true);
    }
    return;
  }

  const taxAmount = Math.round(received * 0.1 * 100) / 100;
  const taxDate = payment.paid_date ?? appDateStr();

  if (!existing) {
    const enabled = await isAutoTaxEnabled(userId);
    if (!enabled) return;
    await supabase.from("expenses").insert({
      user_id: userId,
      property_id: payment.property_id,
      category: "Tax",
      description: AUTO_TAX_DESCRIPTION,
      amount: taxAmount,
      date: taxDate,
      paid_by: "landlord",
      recurring: false,
      bill_transferred: false,
      is_auto_tax: true,
      source_payment_id: payment.id,
    });
    return;
  }

  const changed =
    existing.amount !== taxAmount ||
    existing.property_id !== payment.property_id ||
    existing.date !== taxDate ||
    existing.description !== AUTO_TAX_DESCRIPTION;

  if (changed) {
    await supabase
      .from("expenses")
      .update({ amount: taxAmount, property_id: payment.property_id, date: taxDate, description: AUTO_TAX_DESCRIPTION })
      .eq("id", existing.id);
  }
}

// מחיקת כל הוצאות המס האוטומטיות של המשתמש - בעת כיבוי מסלול 10%.
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

// תיקון רטרואקטיבי: יצירת הוצאות מס לכל תקבולי שכ"ד שהתקבל בהם סכום אי-פעם
// (getReceivedAmount>0) ושעדיין אין להם הוצאת מס. בעת הפעלת מסלול 10%.
export async function backfillAutoTaxForYear(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data: payments } = await supabase
    .from("payments")
    .select("id, property_id, amount, status, paid_date, notes, partial_paid_amount")
    .eq("user_id", userId)
    .eq("payment_type", "Rent")
    .not("paid_date", "is", null);
  if (!payments?.length) return 0;

  const { data: existing } = await supabase
    .from("expenses")
    .select("source_payment_id")
    .eq("user_id", userId)
    .eq("is_auto_tax", true);
  const covered = new Set((existing ?? []).map((e) => e.source_payment_id));

  const rows = payments
    .filter((p) => !covered.has(p.id) && p.property_id)
    .map((p) => {
      const received = getReceivedAmount({
        amount: p.amount,
        status: p.status,
        paid_date: p.paid_date,
        notes: p.notes,
        partial_paid_amount: p.partial_paid_amount,
      });
      if (received <= 0) return null;
      return {
        user_id: userId,
        property_id: p.property_id,
        category: "Tax",
        description: AUTO_TAX_DESCRIPTION,
        amount: Math.round(received * 0.1 * 100) / 100,
        date: p.paid_date,
        paid_by: "landlord",
        recurring: false,
        bill_transferred: false,
        is_auto_tax: true,
        source_payment_id: p.id,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
  if (!rows.length) return 0;
  await supabase.from("expenses").insert(rows);
  return rows.length;
}
