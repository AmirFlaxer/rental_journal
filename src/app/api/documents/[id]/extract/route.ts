import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
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
החזר תמיד JSON בלבד, ללא טקסט נוסף, בפורמט המדויק שיתבקש.
אם שדה לא מצוי בחוזה, הכנס null.`;

const USER_PROMPT_TEMPLATE = (text: string) => `חלץ את הנתונים הבאים מחוזה השכירות הזה:

**פרטי השוכר:**
- firstName: שם פרטי
- lastName: שם משפחה
- phone: טלפון (פורמט: 05XXXXXXXX)
- idNumber: תעודת זהות (9 ספרות)
- email: אימייל

**פרטי השכירות:**
- startDate: תאריך התחלה (פורמט: YYYY-MM-DD)
- endDate: תאריך סיום (פורמט: YYYY-MM-DD)
- monthlyRent: שכר דירה חודשי (מספר בלבד, ללא סימן ₪)
- depositAmount: פיקדון/ערבות (מספר בלבד)
- terms: תנאים מיוחדים (טקסט חופשי, עד 500 תווים)

החזר JSON בדיוק בפורמט הזה:
{
  "tenant": { "firstName": "...", "lastName": "...", "phone": "...", "idNumber": "...", "email": "..." },
  "lease": { "startDate": "...", "endDate": "...", "monthlyRent": 0, "depositAmount": 0, "terms": "..." }
}

טקסט החוזה:
${text.slice(0, 15000)}`;

export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!process.env.ANTHROPIC_API_KEY)
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

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: USER_PROMPT_TEMPLATE(text) }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text")
      return NextResponse.json({ error: "שגיאה בעיבוד התגובה" }, { status: 500 });

    const match = textBlock.text.trim().match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "לא ניתן לפרסר את הנתונים שחולצו" }, { status: 500 });

    return NextResponse.json(JSON.parse(match[0]));
  } catch (error) {
    console.error("Extract error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "שגיאה בחילוץ הנתונים" }, { status: 500 });
  }
}
