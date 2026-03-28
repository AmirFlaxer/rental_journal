import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { camelKeys } from "@/lib/supabase/case";

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = await createClient();
    const { data: lease, error } = await supabase
      .from("leases")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    if (error || !lease) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    if (lease.early_term_protection)
      return NextResponse.json({ error: "החוזה מוגן מפני סיום מוקדם" }, { status: 400 });

    const body = await request.json();
    const { requestedBy, requestDate, reason } = body;

    if (!requestedBy || !["tenant", "landlord"].includes(requestedBy))
      return NextResponse.json({ error: "יש לציין מי מבקש את הסיום" }, { status: 400 });

    const reqDate = requestDate ? new Date(requestDate) : new Date();
    const noticeMonths = requestedBy === "tenant"
      ? (lease.tenant_notice_months ?? 1)
      : (lease.landlord_notice_months ?? 1);

    const effectiveDate = new Date(reqDate);
    effectiveDate.setMonth(effectiveDate.getMonth() + noticeMonths);

    const leaseEnd = new Date(lease.end_date);
    const finalEffective = effectiveDate > leaseEnd ? leaseEnd : effectiveDate;

    const { data: updated, error: updateErr } = await supabase
      .from("leases")
      .update({
        termination_requested_by: requestedBy,
        termination_request_date: reqDate.toISOString(),
        termination_effective_date: finalEffective.toISOString(),
        termination_reason: reason || null,
        status: finalEffective <= new Date() ? "ended" : "active",
        end_date: finalEffective.toISOString(),
      })
      .eq("id", id)
      .select("*, tenant:tenants(*), property:properties(*)")
      .single();

    if (updateErr) return NextResponse.json({ error: "שגיאה בסיום החוזה" }, { status: 500 });
    return NextResponse.json({ lease: camelKeys(updated), noticeMonths, effectiveDate: finalEffective });
  } catch (error) {
    console.error("Terminate lease error:", error);
    return NextResponse.json({ error: "שגיאה בסיום החוזה" }, { status: 500 });
  }
}
