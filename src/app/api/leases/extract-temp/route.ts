import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
// auth() is now Supabase-based — no other changes needed here
import Anthropic from "@anthropic-ai/sdk";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require("mammoth") as { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> };

const MIME_PDF = "application/pdf";
const MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MIME_DOC = "application/msword";
const MAX_SIZE = 10 * 1024 * 1024;

async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === MIME_PDF) return (await pdfParse(buffer)).text;
  if (mimeType === MIME_DOCX || mimeType === MIME_DOC) return (await mammoth.extractRawText({ buffer })).value;
  throw new Error("סוג קובץ לא נתמך");
}

const SYSTEM = `אתה מנתח חוזי שכירות בישראל.
חלץ את כל הנתונים הבאים מהחוזה והחזר JSON בלבד ללא שום טקסט נוסף.
אם שדה לא קיים — הכנס null.`;

const buildPrompt = (text: string) => `חלץ מחוזה השכירות הבא:

{
  "property": {
    "address": "כתובת הנכס — רחוב ומספר בלבד",
    "city": "עיר הנכס"
  },
  "tenant": {
    "firstName": "שם פרטי שוכר ראשי",
    "lastName": "שם משפחה שוכר ראשי",
    "idNumber": "ת.ז. שוכר ראשי (9 ספרות)",
    "phone": "טלפון שוכר ראשי",
    "email": "מייל שוכר ראשי"
  },
  "secondTenant": {
    "firstName": "שם פרטי שוכר שני / בן-בת זוג (null אם אין)",
    "lastName": "שם משפחה שוכר שני",
    "idNumber": "ת.ז. שוכר שני",
    "phone": "טלפון שוכר שני",
    "email": "מייל שוכר שני"
  },
  "lease": {
    "startDate": "תאריך תחילת השכירות בפורמט YYYY-MM-DD",
    "endDate": "תאריך סיום השכירות בפורמט YYYY-MM-DD",
    "monthlyRent": 0,
    "depositAmount": 0,
    "terms": "תנאים מיוחדים חשובים עד 500 תווים"
  },
  "payment": {
    "method": "BankTransfer | Check | Cash — לפי מה שכתוב",
    "checkBank": "שם בנק לשיקים (אם רלוונטי)",
    "checkBranch": "מספר סניף",
    "checkAccount": "מספר חשבון"
  }
}

טקסט החוזה:
${text.slice(0, 18000)}`;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "מפתח API של Anthropic לא מוגדר ב-.env (ANTHROPIC_API_KEY)" },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "לא נבחר קובץ" }, { status: 400 });

    const mimeType = file.type || "application/octet-stream";
    const allowed = [MIME_PDF, MIME_DOCX, MIME_DOC];
    if (!allowed.includes(mimeType)) {
      return NextResponse.json({ error: "יש להעלות PDF או DOCX בלבד" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "הקובץ גדול מדי (מקסימום 10MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractText(buffer, mimeType);
    if (!text.trim()) {
      return NextResponse.json({ error: "לא ניתן לחלץ טקסט מהקובץ" }, { status: 422 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      system: SYSTEM,
      messages: [{ role: "user", content: buildPrompt(text) }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "שגיאה בתגובת AI" }, { status: 500 });
    }

    const match = textBlock.text.trim().match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "לא ניתן לפרסר תשובת AI" }, { status: 500 });

    return NextResponse.json(JSON.parse(match[0]));
  } catch (error) {
    console.error("extract-temp:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "שגיאה בחילוץ" },
      { status: 500 }
    );
  }
}
