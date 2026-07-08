import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { propertySchema } from "@/lib/validations";
import { ENFORCE_QUOTA, isOverPropertyQuota } from "@/lib/plan";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  // הערה: פקיעת חוזים אוטומטית (status=ended כש-end_date עבר) עברה ל-cron היומי
  // (/api/cron/notify) - כתיבה בתוך נתיב קריאה שרצה בכל טעינת דף הייתה שגויה.
  // ה-UI ממילא תאריך-מודע (effectiveLeaseStatus) ולא תלוי בעדכון הזה בזמן אמת.

  const { data, error } = await supabase
    .from("properties")
    .select("*, leases(id, status, monthly_rent, start_date, end_date)")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const data = propertySchema.parse(body);

    const supabase = await createClient();

    // נקודת אכיפה למכסת נכסים בתוכנית freemium - כבויה כרגע (ENFORCE_QUOTA=false
    // ב-src/lib/plan.ts), no-op בפועל. תופעל כשמודל התשלום יעלה (ראו SPEC.md).
    if (ENFORCE_QUOTA && (await isOverPropertyQuota(supabase, session.user.id))) {
      return NextResponse.json(
        { error: "הגעת למכסת הנכסים בתוכנית החינמית", code: "quota_exceeded" },
        { status: 402 }
      );
    }

    const { data: row, error } = await supabase
      .from("properties")
      .insert({ ...data, user_id: session.user.id })
      .select()
      .single();

    if (error) {
      console.error("Create property error:", error);
      return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
    }

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Validation failed", details: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: "Failed to create property" }, { status: 500 });
  }
}
