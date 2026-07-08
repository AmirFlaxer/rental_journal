import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { leaseSchema } from "@/lib/validations";
import { z } from "zod";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leases")
    .select("*, properties(*), tenant:tenants(*), lease_documents(*), payments(*)")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "חוזה לא נמצא" }, { status: 404 });
  return NextResponse.json(data);
}

// PUT - עדכון חוזה קיים. חוזים לעולם לא נמחקים ולא נוצרים מחדש כאן - רק עדכון.
// (במקור היה כאן POST שיצר חוזה חדש - שריד copy-paste מ-/api/leases; אף מסך לא קרא לו,
// ודף העריכה שלח PUT וקיבל 405 בפועל).
interface RouteParams { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const data = leaseSchema.parse(body);

    const supabase = await createClient();

    // ודא שהחוזה קיים ושייך למשתמש, ושלוף ערכי הצמדה קיימים לצורך ברירות מחדל
    const { data: existing } = await supabase
      .from("leases")
      .select("id, base_amount, base_date")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    if (!existing) return NextResponse.json({ error: "חוזה לא נמצא" }, { status: 404 });

    // Verify property belongs to user
    const { data: property } = await supabase
      .from("properties")
      .select("id")
      .eq("id", data.property_id)
      .eq("user_id", session.user.id)
      .single();

    if (!property) return NextResponse.json({ error: "Property not found or unauthorized" }, { status: 404 });

    // Block overlapping active leases on same property - למעט החוזה הנוכחי עצמו
    const { data: overlap } = await supabase
      .from("leases")
      .select("id")
      .eq("property_id", data.property_id)
      .eq("user_id", session.user.id)
      .neq("id", id)
      .neq("status", "ended")
      .lte("start_date", data.end_date)
      .gte("end_date", data.start_date)
      .limit(1)
      .maybeSingle();

    if (overlap) return NextResponse.json({ error: "לנכס זה כבר קיים חוזה פעיל בתקופה זו" }, { status: 409 });

    // Verify tenant belongs to user
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("id", data.tenant_id)
      .eq("user_id", session.user.id)
      .single();

    if (!tenant) return NextResponse.json({ error: "Tenant not found or unauthorized" }, { status: 404 });

    // כאשר יש הצמדה ולא סופקו ערכי בסיס בקלט - שומרים על הערכים הקיימים ב-DB אם יש,
    // ורק אם גם אלה חסרים נופלים לברירת מחדל (שכ"ד/תאריך התחלה נוכחיים)
    if (data.linkage_type !== "none") {
      if (!data.base_amount) data.base_amount = existing.base_amount ?? data.monthly_rent;
      if (!data.base_date) data.base_date = existing.base_date ? new Date(existing.base_date) : data.start_date;
    }

    const { data: row, error } = await supabase
      .from("leases")
      .update(data)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select("*, properties(*), tenant:tenants(*), payments(*)")
      .single();

    if (error) {
      console.error("Update lease error:", error);
      return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
    }

    return NextResponse.json(row);
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Validation failed", details: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: "Failed to update lease" }, { status: 500 });
  }
}

// DELETE - מותר רק לחוזה יתום (שהנכס שלו כבר לא קיים), לצורכי ניקוי תחזוקה.
// חוזה עם נכס קיים הוא היסטוריה משפטית ולא ניתן למחיקה.
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data: lease } = await supabase
    .from("leases")
    .select("id, property_id, properties(id)")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (!lease) return NextResponse.json({ error: "חוזה לא נמצא" }, { status: 404 });

  const hasProperty = Array.isArray(lease.properties)
    ? lease.properties.length > 0
    : !!lease.properties;
  if (hasProperty) {
    return NextResponse.json(
      { error: "לא ניתן למחוק חוזה של נכס קיים - חוזים נשמרים כהיסטוריה" },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("leases")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (error) return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
