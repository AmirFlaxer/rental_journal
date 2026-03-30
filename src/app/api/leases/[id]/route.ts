import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { camelKeys, snakeKeys } from "@/lib/supabase/case";
import { leaseSchema } from "@/lib/validations";
import { z } from "zod";

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leases")
    .select("*, properties(*), tenant:tenants(*), payments(*), lease_documents(*)")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Lease not found" }, { status: 404 });
  return NextResponse.json(camelKeys(data));
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = await createClient();
    const body = await request.json();
    const parsed = leaseSchema.parse(body);
    // propertyId and tenantId are immutable
    const { propertyId: _p, tenantId: _t, ...data } = parsed;

    // Fetch current lease to get property_id
    const { data: current } = await supabase
      .from("leases")
      .select("property_id")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    if (!current) return NextResponse.json({ error: "Lease not found" }, { status: 404 });

    // Block overlapping active leases on same property (excluding self)
    if (data.status !== "ended") {
      const { data: overlap } = await supabase
        .from("leases")
        .select("id")
        .eq("property_id", current.property_id)
        .eq("user_id", session.user.id)
        .neq("status", "ended")
        .neq("id", id)
        .lte("start_date", data.endDate)
        .gte("end_date", data.startDate)
        .limit(1)
        .maybeSingle();

      if (overlap) return NextResponse.json({ error: "לנכס זה כבר קיים חוזה פעיל בתקופה זו" }, { status: 409 });
    }

    const { data: row, error } = await supabase
      .from("leases")
      .update(snakeKeys(data) as object)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select("*, properties(*), tenant:tenants(*), payments(*)")
      .single();

    if (error) {
      console.error("Update lease error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Manage check deposit reminders
    // Always delete existing ones first
    await supabase
      .from("tasks")
      .delete()
      .eq("user_id", session.user.id)
      .eq("related_entity_type", "lease")
      .eq("related_entity_id", id)
      .eq("category", "Rent Collection");

    // Re-create only if payment method is checks
    if (parsed.paymentMethod === "checks") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(parsed.startDate);
      const end = new Date(parsed.endDate);
      const startDay = start.getDate();

      const tasks: object[] = [];
      const cur = new Date(start.getFullYear(), start.getMonth(), 1);

      while (true) {
        if (cur > new Date(end.getFullYear(), end.getMonth(), 1)) break;
        const year = cur.getFullYear();
        const month = cur.getMonth();
        const lastDay = new Date(year, month + 1, 0).getDate();
        const day = Math.min(startDay, lastDay);
        const paymentDue = new Date(year, month, day);

        if (paymentDue >= today) {
          const reminderDate = new Date(paymentDue);
          reminderDate.setDate(reminderDate.getDate() - 1);
          const monthLabel = paymentDue.toLocaleDateString("he-IL", { month: "long", year: "numeric" });
          tasks.push({
            user_id: session.user.id,
            title: `הפקדת שק שכ"ד — ${monthLabel}`,
            category: "Rent Collection",
            due_date: reminderDate.toISOString().split("T")[0],
            priority: "normal",
            related_entity_type: "lease",
            related_entity_id: id,
          });
        }
        cur.setMonth(cur.getMonth() + 1);
      }

      if (tasks.length > 0) {
        await supabase.from("tasks").insert(tasks);
      }
    }

    return NextResponse.json(camelKeys(row));
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Validation failed", details: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: "Failed to update lease" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { error } = await supabase
    .from("leases")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (error) return NextResponse.json({ error: "Lease not found" }, { status: 404 });
  return NextResponse.json({ message: "Lease deleted successfully" });
}
