import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";

const VALID_PROVIDERS = ["gemini", "anthropic", "ollama"] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cookieStore = await cookies();
  const provider = cookieStore.get("llm_provider")?.value || process.env.LLM_PROVIDER || "gemini";
  return NextResponse.json({ provider });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { provider } = (await req.json()) as { provider: Provider };
  if (!VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "ספק לא תקין" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("llm_provider", provider, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return response;
}
