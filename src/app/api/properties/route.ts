import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { camelKeys, snakeKeys } from "@/lib/supabase/case";
import { propertySchema } from "@/lib/validations";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select("*, leases(id, status, monthly_rent)")
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
    const data = propertySchema.parse(body);

    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("properties")
      .insert({ ...(snakeKeys(data) as object), user_id: session.user.id })
      .select()
      .single();

    if (error) {
      console.error("Create property error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(camelKeys(row), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Validation failed", details: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: "Failed to create property" }, { status: 500 });
  }
}
