import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { taskSchema } from "@/lib/validations";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", session.user.id)
    .order("completed_at", { ascending: true, nullsFirst: true })
    .order("due_date", { ascending: true });

  if (error) return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const data = taskSchema.parse(body);

    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("tasks")
      .insert({ ...data, user_id: session.user.id })
      .select()
      .single();

    if (error) return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Validation failed", details: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
