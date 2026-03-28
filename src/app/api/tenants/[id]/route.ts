import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { camelKeys, snakeKeys } from "@/lib/supabase/case";
import { tenantSchema } from "@/lib/validations";
import { z } from "zod";

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("*, leases(*, properties(*), payments(*))")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  return NextResponse.json(camelKeys(data));
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = await createClient();
    const body = await request.json();
    const data = tenantSchema.parse(body);

    const { data: row, error } = await supabase
      .from("tenants")
      .update(snakeKeys(data) as object)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    return NextResponse.json(camelKeys(row));
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Validation failed", details: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: "Failed to update tenant" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { error } = await supabase
    .from("tenants")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (error) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  return NextResponse.json({ message: "Tenant deleted successfully" });
}
