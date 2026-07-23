import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { leaseSecuritySchema } from "@/lib/validations";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lease_securities")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const data = leaseSecuritySchema.parse(body);

    const supabase = await createClient();

    const { data: property } = await supabase
      .from("properties")
      .select("id")
      .eq("id", data.property_id)
      .eq("user_id", session.user.id)
      .single();
    if (!property) return NextResponse.json({ error: "Property not found or unauthorized" }, { status: 404 });

    const { data: lease } = await supabase
      .from("leases")
      .select("id")
      .eq("id", data.lease_id)
      .eq("user_id", session.user.id)
      .single();
    if (!lease) return NextResponse.json({ error: "Lease not found or unauthorized" }, { status: 404 });

    const { data: row, error } = await supabase
      .from("lease_securities")
      .insert({ ...data, user_id: session.user.id })
      .select()
      .single();

    if (error) return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Validation failed", details: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: "Failed to create lease security" }, { status: 500 });
  }
}
