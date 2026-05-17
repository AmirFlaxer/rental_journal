import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { camelKeys, snakeKeys } from "@/lib/supabase/case";
import { paymentSchema } from "@/lib/validations";
import {
  isAutoTaxEnabled,
  createAutoTaxExpense,
  deleteAutoTaxExpense,
  updateAutoTaxExpense,
} from "@/lib/auto-tax";
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
      .select("paid_date, amount, payment_type, property_id")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    const body = await request.json();
    const isFullUpdate = ["propertyId", "paymentType", "amount", "dueDate"].some((k) => k in body);
    const data = isFullUpdate ? paymentSchema.parse(body) : body;

    const { data: row, error } = await supabase
      .from("payments")
      .update(snakeKeys(data) as object)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select("*, property:properties(*), lease:leases(*)")
      .single();

    if (error) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    // ניהול הוצאת מס אוטומטית
    if (existing) {
      const wasRent = existing.payment_type === "Rent";
      const isNowRent = (data.paymentType ?? existing.payment_type) === "Rent";
      const wasPaid = !!existing.paid_date;
      const isNowPaid = "paidDate" in data ? !!data.paidDate : wasPaid;
      const oldAmount = existing.amount;
      const newAmount = data.amount ?? oldAmount;

      if (isNowRent && isNowPaid && !wasPaid) {
        // הפך לשולם → יוצר הוצאת מס
        const autoTax = await isAutoTaxEnabled(session.user.id);
        if (autoTax) {
          const paidDate = data.paidDate
            ? new Date(data.paidDate).toISOString()
            : new Date().toISOString();
          const propId = data.propertyId ?? existing.property_id;
          await createAutoTaxExpense(supabase, session.user.id, id, propId, newAmount, paidDate);
        }
      } else if (wasRent && wasPaid && !isNowPaid) {
        // הוסר תשלום → מוחק הוצאת מס
        await deleteAutoTaxExpense(supabase, session.user.id, id);
      } else if (wasRent && wasPaid && isNowPaid && newAmount !== oldAmount) {
        // סכום השתנה → מעדכן הוצאת מס
        await updateAutoTaxExpense(supabase, session.user.id, id, newAmount);
      }
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

  // מחיקת הוצאת מס משויכת לפני מחיקת התשלום
  await deleteAutoTaxExpense(supabase, session.user.id, id);

  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (error) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  return NextResponse.json({ message: "Payment deleted successfully" });
}
