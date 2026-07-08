import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { camelKeys, snakeKeys } from "@/lib/supabase/case";
import { paymentSchema } from "@/lib/validations";
import { reconcileAutoTax } from "@/lib/auto-tax";
import {
  isCheckPaymentMethod,
  closeCheckReminderForPayment,
  reopenCheckReminderForPayment,
} from "@/lib/check-reminders";
import { z } from "zod";

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*, property:properties(*), lease:leases(*)")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  return NextResponse.json(camelKeys(data));
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = await createClient();

    // שמירת מצב התשלום לפני העדכון
    const { data: existing } = await supabase
      .from("payments")
      .select("status, paid_date, amount, payment_type, property_id, lease_id, due_date, lease:leases(payment_method)")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    const body = await request.json();
    // מונע mass-assignment (למשל userId/id) גם בעדכון חלקי - ולידציה תמיד רצה, כולל בנתיב החלקי
    delete body.userId;
    delete body.id;
    const isFullUpdate = ["propertyId", "paymentType", "amount", "dueDate"].some((k) => k in body);
    const data = isFullUpdate ? paymentSchema.parse(body) : paymentSchema.partial().parse(body);
    // partialPaidAmount לא ב-paymentSchema (paymentSchema.ts הוא בבעלות תחום אחר) -
    // נקלט ישירות מה-body ומועבר בנפרד ל-update
    const partialPaidAmount =
      typeof body.partialPaidAmount === "number"
        ? body.partialPaidAmount
        : body.partialPaidAmount === null
          ? null
          : undefined;

    const { data: row, error } = await supabase
      .from("payments")
      .update({
        ...(snakeKeys(data) as object),
        ...(partialPaidAmount !== undefined ? { partial_paid_amount: partialPaidAmount } : {}),
      })
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select("*, property:properties(*), lease:leases(*)")
      .single();

    if (error) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    // ניהול הוצאת מס אוטומטית ותזכורת "הפקדת שק" לפי המצב הסופי אחרי העדכון
    if (existing && row) {
      const wasPaid = existing.status === "paid";
      const isNowRent = row.payment_type === "Rent";
      const isNowPaid = row.status === "paid";

      // תשלום חלקי לעולם לא סוגר תזכורת שק - רק status "paid" מלא סוגר/פותח מחדש
      const leaseId = row.lease_id;
      const leaseRelation = existing.lease as
        | { payment_method: string | null }
        | { payment_method: string | null }[]
        | null;
      const leasePaymentMethod = Array.isArray(leaseRelation)
        ? leaseRelation[0]?.payment_method
        : leaseRelation?.payment_method;
      if (isNowRent && isNowPaid && !wasPaid) {
        if (leaseId && isCheckPaymentMethod(leasePaymentMethod)) {
          const paidDate = row.paid_date ?? new Date().toISOString();
          await closeCheckReminderForPayment(supabase, session.user.id, id, leaseId, row.due_date, paidDate);
        }
      } else if (wasPaid && !isNowPaid) {
        await reopenCheckReminderForPayment(supabase, session.user.id, id);
      }

      // מס אוטומטי - על הסכום שהתקבל בפועל (מטפל גם בתשלום חלקי)
      await reconcileAutoTax(supabase, session.user.id, {
        id,
        payment_type: row.payment_type,
        property_id: row.property_id,
        amount: row.amount,
        status: row.status,
        paid_date: row.paid_date,
        notes: row.notes,
        partial_paid_amount: row.partial_paid_amount,
      });
    }

    return NextResponse.json(camelKeys(row));
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Validation failed", details: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();

  // תזכורת שק: פותח מחדש לפני המחיקה - אם התקבול הזה סגר תזכורת, שלא תיעלם איתו
  await reopenCheckReminderForPayment(supabase, session.user.id, id);

  // מחיקת הוצאת מס משויכת לפני מחיקת התשלום - ה-FK on delete set null מנתק את
  // source_payment_id במקום למחוק, ולכן חובה להסיר את הוצאת המס באופן מפורש כאן
  await reconcileAutoTax(supabase, session.user.id, {
    id,
    payment_type: "Rent",
    property_id: null,
    amount: 0,
    status: "pending",
    paid_date: null,
    notes: null,
  });

  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (error) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  return NextResponse.json({ message: "Payment deleted successfully" });
}
