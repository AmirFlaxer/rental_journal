import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { camelKeys, snakeKeys } from "@/lib/supabase/case";
import { paymentSchema } from "@/lib/validations";
import { reconcileAutoTax } from "@/lib/auto-tax";
import { isCheckPaymentMethod, closeCheckReminderForPayment } from "@/lib/check-reminders";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  // צמצום over-fetching: כל צרכני הרשימה (payments/debts/dashboard) קוראים רק property.id/title.
  // ה-join המקונן ל-lease (lease:leases(*)) לא נקרא בשום מקום - leaseId כבר קיים כשדה root
  // (מכוסה ע"י `*`), אז הוסר לגמרי.
  const { data, error } = await supabase
    .from("payments")
    .select("*, property:properties(id, title)")
    .eq("user_id", session.user.id)
    .order("due_date", { ascending: false });

  if (error) return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  return NextResponse.json(camelKeys(data));
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const data = paymentSchema.parse(body);
    // partialPaidAmount לא ב-paymentSchema (paymentSchema.ts הוא בבעלות תחום אחר) -
    // נקלט ישירות מה-body ומועבר בנפרד ל-insert
    const partialPaidAmount =
      typeof body.partialPaidAmount === "number" ? body.partialPaidAmount : undefined;

    const supabase = await createClient();

    const { data: property } = await supabase
      .from("properties")
      .select("id")
      .eq("id", data.propertyId)
      .eq("user_id", session.user.id)
      .single();

    if (!property) return NextResponse.json({ error: "Property not found or unauthorized" }, { status: 404 });

    let lease: { id: string; payment_method: string | null } | null = null;
    if (data.leaseId) {
      const { data: leaseRow } = await supabase
        .from("leases")
        .select("id, payment_method")
        .eq("id", data.leaseId)
        .eq("user_id", session.user.id)
        .single();
      if (!leaseRow) return NextResponse.json({ error: "Lease not found or unauthorized" }, { status: 404 });
      lease = leaseRow;
    }

    const { data: row, error } = await supabase
      .from("payments")
      .insert({
        ...(snakeKeys(data) as object),
        ...(partialPaidAmount !== undefined ? { partial_paid_amount: partialPaidAmount } : {}),
        user_id: session.user.id,
      })
      .select("*, property:properties(*), lease:leases(*)")
      .single();

    if (error) return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });

    if (row) {
      // מס אוטומטי - על הסכום שהתקבל בפועל (מטפל גם בתשלום חלקי - status "partial")
      await reconcileAutoTax(supabase, session.user.id, {
        id: row.id,
        payment_type: row.payment_type,
        property_id: row.property_id,
        amount: row.amount,
        status: row.status,
        paid_date: row.paid_date,
        notes: row.notes,
        partial_paid_amount: row.partial_paid_amount,
      });

      // סגירת תזכורת "הפקדת שק" רק כששולם במלואו (status "paid" בדיוק, לא partial) ובשיקים
      if (data.leaseId && lease && row.status === "paid" && isCheckPaymentMethod(lease.payment_method)) {
        await closeCheckReminderForPayment(
          supabase,
          session.user.id,
          row.id,
          data.leaseId,
          new Date(data.dueDate).toISOString(),
          row.paid_date ?? new Date().toISOString()
        );
      }
    }

    return NextResponse.json(camelKeys(row), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Validation failed", details: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}
