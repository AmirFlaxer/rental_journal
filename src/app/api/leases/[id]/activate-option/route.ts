import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { camelKeys } from "@/lib/supabase/case";

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: RouteParams) {
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
    if (!lease.has_option) return NextResponse.json({ error: "לחוזה אין אופציה" }, { status: 400 });
    if (lease.option_activated) return NextResponse.json({ error: "האופציה כבר הופעלה" }, { status: 400 });
    if (!lease.option_end) return NextResponse.json({ error: "חסרים תאריכי אופציה" }, { status: 400 });

    const newStartDate = lease.option_start ?? lease.end_date;
    const newEndDate = lease.option_end;
    const newRent = lease.option_rent ?? lease.monthly_rent;

    const start = new Date(newStartDate);
    const end = new Date(newEndDate);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();

    const { data: updated, error: updateErr } = await supabase
      .from("leases")
      .update({
        start_date: newStartDate,
        end_date: newEndDate,
        monthly_rent: newRent,
        lease_term: Math.max(months, 1),
        option_activated: true,
        status: "active",
      })
      .eq("id", id)
      .select("*, tenant:tenants(*), property:properties(*)")
      .single();

    if (updateErr) return NextResponse.json({ error: "שגיאה בהפעלת האופציה" }, { status: 500 });
    return NextResponse.json(camelKeys(updated));
  } catch (error) {
    console.error("Activate option error:", error);
    return NextResponse.json({ error: "שגיאה בהפעלת האופציה" }, { status: 500 });
  }
}
