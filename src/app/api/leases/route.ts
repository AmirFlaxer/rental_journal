import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { camelKeys, snakeKeys } from "@/lib/supabase/case";
import { leaseSchema } from "@/lib/validations";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leases")
    .select("*, properties(*), tenant:tenants(*), payments(*)")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(camelKeys(data));
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const data = leaseSchema.parse(body);

    const supabase = await createClient();

    // Verify property belongs to user
    const { data: property } = await supabase
      .from("properties")
      .select("id")
      .eq("id", data.propertyId)
      .eq("user_id", session.user.id)
      .single();

    if (!property) return NextResponse.json({ error: "Property not found or unauthorized" }, { status: 404 });

    // Verify tenant belongs to user
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("id", data.tenantId)
      .eq("user_id", session.user.id)
      .single();

    if (!tenant) return NextResponse.json({ error: "Tenant not found or unauthorized" }, { status: 404 });

    const { data: row, error } = await supabase
      .from("leases")
      .insert({ ...(snakeKeys(data) as object), user_id: session.user.id })
      .select("*, properties(*), tenant:tenants(*), payments(*)")
      .single();

    if (error) {
      console.error("Create lease error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(camelKeys(row), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Validation failed", details: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: "Failed to create lease" }, { status: 500 });
  }
}
