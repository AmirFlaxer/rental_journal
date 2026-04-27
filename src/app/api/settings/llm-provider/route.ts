import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const VALID_PROVIDERS = ["gemini", "anthropic", "ollama"] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // קריאה מ-Supabase user_metadata (מסונכרן בין מכשירים)
  const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(session.user.id);
  const fromMetadata = user?.user_metadata?.llm_provider as Provider | undefined;

  // fallback: cookie → env → ברירת מחדל
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get("llm_provider")?.value as Provider | undefined;

  const provider = fromMetadata || fromCookie || process.env.LLM_PROVIDER || "gemini";
  return NextResponse.json({ provider });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { provider } = (await req.json()) as { provider: Provider };
  if (!VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "ספק לא תקין" }, { status: 400 });
  }

  // שמירה ב-Supabase user_metadata — מסונכרן בין מכשירים
  await supabaseAdmin.auth.admin.updateUserById(session.user.id, {
    user_metadata: { llm_provider: provider },
  });

  // גם cookie לקריאה מהירה בצד שרת (ה-extract route קורא ממנו)
  const response = NextResponse.json({ ok: true });
  response.cookies.set("llm_provider", provider, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return response;
}
