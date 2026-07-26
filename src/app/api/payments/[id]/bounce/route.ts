import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { checkBounceSchema } from "@/lib/validations";
import { reconcileAutoTax } from "@/lib/auto-tax";
import { isCheckPaymentMethod, reopenCheckReminderForPayment } from "@/lib/check-reminders";
import { z } from "zod";

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = checkBounceSchema.parse(await request.json());
    const supabase = await createClient();

    const { data: payment, error: findErr } = await supabase
      .from("payments")
      .select("id, lease_id, status, payment_type, property_id, amount, paid_date, notes, partial_paid_amount")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    if (findErr || !payment) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

    // רק תקבול ששולם במלואו יכול "לחזור" - תשלום חלקי לא נחשב הפקדת שק
    if (payment.status !== "paid")
      return NextResponse.json({ error: "אפשר לסמן החזרה רק על תקבול ששולם" }, { status: 400 });
    if (!payment.lease_id)
      return NextResponse.json({ error: "לתקבול אין חוזה משויך" }, { status: 400 });

    // "שק חזר" רלוונטי רק לתקבול שכ"ד בחוזה שמשולם בשקים - תנאי סף מהאפיון,
    // לא לפיקדון/חשבון ולא לחוזה בהעברה בנקאית
    if (payment.payment_type !== "Rent")
      return NextResponse.json({ error: "אפשר לסמן החזרה רק על תקבול שכ\"ד" }, { status: 400 });

    const { data: lease, error: leaseErr } = await supabase
      .from("leases")
      .select("payment_method")
      .eq("id", payment.lease_id)
      .eq("user_id", session.user.id)
      .single();
    if (leaseErr || !lease) return NextResponse.json({ error: "החוזה לא נמצא" }, { status: 404 });
    if (!isCheckPaymentMethod(lease.payment_method))
      return NextResponse.json({ error: "אפשר לסמן החזרה רק על חוזה שמשולם בשקים" }, { status: 400 });

    const { error: insertErr } = await supabase.from("check_bounces").insert({
      user_id: session.user.id,
      payment_id: payment.id,
      lease_id: payment.lease_id,
      bounced_at: data.bounced_at,
      reason: data.reason,
    });
    if (insertErr) return NextResponse.json({ error: "שגיאה ברישום ההחזרה" }, { status: 500 });

    const { data: updated, error: updateErr } = await supabase
      .from("payments")
      .update({ status: "pending", paid_date: null })
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select()
      .single();
    if (updateErr) return NextResponse.json({ error: "שגיאה בעדכון התקבול" }, { status: 500 });

    // הסכום שהתקבל בפועל הפך ל-0, ולכן הוצאת המס האוטומטית נמחקת מעצמה
    await reconcileAutoTax(supabase, session.user.id, {
      id: updated.id,
      payment_type: updated.payment_type,
      property_id: updated.property_id,
      amount: updated.amount,
      status: updated.status,
      paid_date: updated.paid_date,
      notes: updated.notes,
      partial_paid_amount: updated.partial_paid_amount,
    });

    await reopenCheckReminderForPayment(supabase, session.user.id, id);

    return NextResponse.json({ ok: true, payment: updated });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Validation failed", details: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: "שגיאה בסימון ההחזרה" }, { status: 500 });
  }
}
