import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require("pdf-parse");
async function pdfParse(buf: Buffer): Promise<{ text: string }> {
  const parser = new PDFParse({ data: buf });
  const result = await parser.getText();
  await parser.destroy();
  return { text: result.text };
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require("mammoth") as { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> };

interface RouteParams { params: Promise<{ id: string }> }

const MIME_PDF = "application/pdf";
const MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MIME_DOC = "application/msword";

async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === MIME_PDF) return (await pdfParse(buffer)).text;
  if (mimeType === MIME_DOCX || mimeType === MIME_DOC) return (await mammoth.extractRawText({ buffer })).value;
  throw new Error("סוג קובץ לא נתמך לחילוץ נתונים");
}

const SYSTEM_PROMPT = `אתה מסייע לניתוח חוזי שכירות בעברית.
תפקידך לחלץ נתונים מובנים מטקסט של חוזה שכירות.
החזר תמיד JSON בלבד, ללא טקסט נוסף, ללא markdown, בפורמט המדויק שיתבקש.
אם שדה לא מצוי בחוזה, הכנס null.`;

const buildPrompt = (text: string) => `חלץ את הנתונים הבאים מחוזה השכירות הזה והחזר JSON בלבד:

{
  "tenant": {
    "firstName": "שם פרטי שוכר ראשי",
    "lastName": "שם משפחה שוכר ראשי",
    "phone": "טלפון (פורמט: 05XXXXXXXX)",
    "idNumber": "תעודת זהות 9 ספרות",
    "email": "אימייל"
  },
  "lease": {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "monthlyRent": 0,
    "depositAmount": 0,
    "terms": "תנאים מיוחדים עד 500 תווים"
  },
  "option": {
    "hasOption": false,
    "optionMonths": null,
    "optionRent": null,
    "optionTerms": "תנאי האופציה"
  },
  "earlyTermination": {
    "hasProtection": false,
    "tenantNoticeDays": null,
    "landlordNoticeDays": null,
    "terms": "תנאי פינוי מוקדם"
  }
}

טקסט החוזה:
${text.slice(0, 18000)}`;

async function callAnthropic(prompt: string): Promise<string> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });
  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("שגיאה בתגובת Anthropic");
  return block.text;
}

async function callOllama(prompt: string): Promise<string> {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL || "qwen2.5:7b";
  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0,
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`Ollama שגיאה (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const provider = process.env.LLM_PROVIDER || "anthropic";
    if (provider === "anthropic" && !process.env.ANTHROPIC_API_KEY)
      return NextResponse.json({ error: "מפתח API של Anthropic לא מוגדר. הוסף ANTHROPIC_API_KEY ל-.env" }, { status: 503 });

    const supabase = await createClient();
    const { data: doc } = await supabase
      .from("lease_documents")
      .select("*, leases!inner(user_id)")
      .eq("id", id)
      .eq("leases.user_id", session.user.id)
      .single();

    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const { data: fileData, error: storageError } = await supabaseAdmin.storage
      .from("lease-documents")
      .download(doc.stored_name);

    if (storageError || !fileData)
      return NextResponse.json({ error: "שגיאה בטעינת הקובץ" }, { status: 500 });

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const text = await extractText(buffer, doc.mime_type);
    if (!text.trim()) return NextResponse.json({ error: "לא ניתן לחלץ טקסט מהקובץ" }, { status: 422 });

    const prompt = buildPrompt(text);
    const raw = provider === "ollama" ? await callOllama(prompt) : await callAnthropic(prompt);

    const match = raw.trim().match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "לא ניתן לפרסר את הנתונים שחולצו" }, { status: 500 });

    return NextResponse.json(JSON.parse(match[0]));
  } catch (error) {
    console.error("Extract error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "שגיאה בחילוץ הנתונים" }, { status: 500 });
  }
}
