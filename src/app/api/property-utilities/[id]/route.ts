import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { propertyUtilitySchema } from "@/lib/validations";
import { z } from "zod";

interface RouteParams { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = await createClient();
    const body = await request.json();
    // ולידציה מונעת mass-assignment - zod מסנן שדות לא מוכרים (userId וכו') אוטומטית
    const data = propertyUtilitySchema.partial().parse(body);
    // property_id לא ניתן לשינוי בעדכון - חשבון שייך לנכס שבו נוצר. השמטה מונעת
    // העברת חשבון לנכס אחר בלי אימות בעלות (בניגוד ל-POST שמאמת).
    delete data.property_id;

    const { data: row, error } = await supabase
      .from("property_utilities")
      .update(data)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Validation failed", details: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: "Failed to update property utility" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = await createClient();
    const { error } = await supabase
      .from("property_utilities")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete property utility" }, { status: 500 });
  }
}
