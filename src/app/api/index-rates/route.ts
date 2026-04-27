import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { camelKeys } from "@/lib/supabase/case";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("index_rates")
    .select("*")
    .order("period_date", { ascending: false })
    .limit(120); // ~5 שנים של נתונים חודשיים

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(camelKeys(data));
}
