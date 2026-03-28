import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { camelKeys, snakeKeys } from "@/lib/supabase/case";
import { paymentSchema } from "@/lib/validations";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*, property:properties(*), lease:leases(*)")
    .eq("user_id", session.user.id)
    .order("due_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(camelKeys(data));
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const data = paymentSchema.parse(body);

    const supabase = await createClient();

    const { data: property } = await supabase
      .from("properties")
      .select("id")
      .eq("id", data.propertyId)
      .eq("user_id", session.user.id)
      .single();

    if (!property) return NextResponse.json({ error: "Property not found or unauthorized" }, { status: 404 });

    if (data.leaseId) {
      const { data: lease } = await supabase
        .from("leases")
        .select("id")
        .eq("id", data.leaseId)
        .eq("user_id", session.user.id)
        .single();
      if (!lease) return NextResponse.json({ error: "Lease not found or unauthorized" }, { status: 404 });
    }

    const { data: row, error } = await supabase
      .from("payments")
      .insert({ ...(snakeKeys(data) as object), user_id: session.user.id })
      .select("*, property:properties(*), lease:leases(*)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(camelKeys(row), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Validation failed", details: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}
