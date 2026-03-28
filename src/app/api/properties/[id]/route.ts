import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { camelKeys, snakeKeys } from "@/lib/supabase/case";
import { propertySchema } from "@/lib/validations";
import { z } from "zod";

interface RouteParams { params: Promise<{ id: string }> }

async function getOwnedProperty(id: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  return { data, error };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select(`*, leases(*, tenant:tenants(*), payments(*)), expenses(*), payments(*)`)
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Property not found" }, { status: 404 });
  return NextResponse.json(camelKeys(data));
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error: notFound } = await getOwnedProperty(id, session.user.id);
    if (notFound) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    const body = await request.json();
    const data = propertySchema.parse(body);

    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("properties")
      .update(snakeKeys(data) as object)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(camelKeys(row));
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Validation failed", details: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: "Failed to update property" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error: notFound } = await getOwnedProperty(id, session.user.id);
  if (notFound) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  const supabase = await createClient();
  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "Property deleted successfully" });
}
