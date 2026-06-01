import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { backfillAutoTaxForYear, deleteAllAutoTaxExpenses } from "@/lib/auto-tax";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(session.user.id);
  const autoTaxEnabled = user?.user_metadata?.auto_tax_enabled !== false;
  return NextResponse.json({ autoTaxEnabled });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { autoTaxEnabled } = (await req.json()) as { autoTaxEnabled: boolean };
  await supabaseAdmin.auth.admin.updateUserById(session.user.id, {
    user_metadata: { auto_tax_enabled: autoTaxEnabled },
  });

  // הפעלה → תיקון רטרואקטיבי מתחילת השנה; כיבוי → מחיקת כל הוצאות המס האוטומטיות
  let affected = 0;
  if (autoTaxEnabled) {
    affected = await backfillAutoTaxForYear(supabaseAdmin, session.user.id);
  } else {
    affected = await deleteAllAutoTaxExpenses(supabaseAdmin, session.user.id);
  }
  return NextResponse.json({ ok: true, affected });
}
