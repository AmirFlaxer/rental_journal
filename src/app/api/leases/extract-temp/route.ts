import { NextRequest } from "next/server";

// Allow up to 5 minutes for large model cold-starts
export const maxDuration = 300;
import { auth } from "@/auth";
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
חלץ את כל הנתונים הבאים מהחוזה והחזר JSON בלבד ללא שום טקסט נוסף, ללא markdown, ללא הסברים.
אם שדה לא קיים — הכנס null.`;

const buildPrompt = (text: string) => `חלץ מחוזה השכירות הבא את הנתונים הבאים בדיוק בפורמט JSON זה:

{
  "property": {
    "address": "שם הרחוב בלבד (ללא מספר)",
    "houseNumber": "מספר הבית בלבד",
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
    "method": "bank_transfer | checks | cash | bit | paybox",
    "checkBank": "שם בנק לשיקים",
    "checkBranch": "מספר סניף",
    "checkAccount": "מספר חשבון"
  },
  "option": {
    "hasOption": false,
    "optionMonths": null,
    "optionRent": null,
    "optionStartDate": null,
    "optionEndDate": null,
    "optionTerms": null
  },
  "earlyTermination": {
    "hasEarlyTermProtection": false,
    "tenantNoticeDays": null,
    "landlordNoticeDays": null,
    "earlyTermTerms": null
  }
}

טקסט החוזה:
${text.slice(0, 20000)}`;

export async function POST(request: NextRequest) {
  const enc = new TextEncoder();

  // SSE helper
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const send = async (event: object) => {
    await writer.write(enc.encode(`data: ${JSON.stringify(event)}\n\n`));
  };

  // Keep-alive: send a comment every 20s so the browser doesn't close the connection
  let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  const startKeepAlive = () => {
    keepAliveTimer = setInterval(async () => {
      try { await writer.write(enc.encode(": keep-alive\n\n")); } catch { /* ignore if closed */ }
    }, 20000);
  };
  const stopKeepAlive = () => { if (keepAliveTimer) clearInterval(keepAliveTimer); };

  const run = async () => {
    startKeepAlive();
    try {
      const session = await auth();
      if (!session?.user?.id) {
        await send({ type: "error", text: "Unauthorized" });
        return;
      }

      const provider = process.env.LLM_PROVIDER || "anthropic";
      if (provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
        await send({ type: "error", text: "מפתח ANTHROPIC_API_KEY חסר ב-.env" });
        return;
      }
      if (provider === "gemini" && !process.env.GEMINI_API_KEY) {
        await send({ type: "error", text: "מפתח GEMINI_API_KEY חסר ב-.env" });
        return;
      }

      // Step 1 — read file
      await send({ type: "status", step: 1, text: "קורא את הקובץ..." });
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) { await send({ type: "error", text: "לא נבחר קובץ" }); return; }

      const mimeType = file.type || "application/octet-stream";
      if (![MIME_PDF, MIME_DOCX, MIME_DOC].includes(mimeType)) {
        await send({ type: "error", text: "יש להעלות PDF או DOCX בלבד" }); return;
      }
      if (file.size > MAX_SIZE) {
        await send({ type: "error", text: "הקובץ גדול מדי (מקסימום 10MB)" }); return;
      }

      // Step 2 — extract text
      await send({ type: "status", step: 2, text: `מחלץ טקסט מ-${mimeType === MIME_PDF ? "PDF" : "DOCX"}...` });
      const buffer = Buffer.from(await file.arrayBuffer());
      const text = await extractText(buffer, mimeType);
      if (!text.trim()) { await send({ type: "error", text: "לא ניתן לחלץ טקסט מהקובץ" }); return; }
      await send({ type: "status", step: 2, text: `חולץ טקסט (${text.length.toLocaleString()} תווים)` });

      // Step 3 — LLM
      const modelLabel = provider === "ollama"
        ? `Ollama / ${process.env.OLLAMA_MODEL || "qwen3.5:9b"}`
        : provider === "gemini"
        ? `Gemini / ${process.env.GEMINI_MODEL || "gemini-2.5-flash"}`
        : "Claude";
      await send({ type: "status", step: 3, text: `שולח ל-${modelLabel}...` });

      const prompt = buildPrompt(text);
      let rawResponse = "";

      if (provider === "ollama") {
        const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
        const model = process.env.OLLAMA_MODEL || "qwen3.5:9b";

        // Use Ollama native /api/chat — supports think:false directly
        const res = await fetch(`${baseUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content: prompt },
            ],
            options: { temperature: 0 },
            think: false, // disable Qwen3 thinking mode for fast direct output
            stream: true,
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          await send({ type: "error", text: `Ollama שגיאה (${res.status}): ${err.slice(0, 200)}` });
          return;
        }

        // Stream tokens from Ollama native API (newline-delimited JSON)
        const reader = res.body!.getReader();
        const dec = new TextDecoder();
        let buffer2 = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer2 += dec.decode(value, { stream: true });
          const lines = buffer2.split("\n");
          buffer2 = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const chunk = JSON.parse(trimmed);
              // thinking tokens (Qwen3)
              if (chunk.message?.thinking) {
                await send({ type: "thinking", text: chunk.message.thinking });
              }
              // actual response tokens
              const token = chunk.message?.content;
              if (token) {
                rawResponse += token;
                await send({ type: "token", text: token });
              }
            } catch { /* skip malformed */ }
          }
        }
      } else if (provider === "gemini") {
        const https = await import("https");
        const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
        const apiKey = process.env.GEMINI_API_KEY!;

        const body = JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `${SYSTEM}\n\n${prompt}` }] }],
          generationConfig: { temperature: 0 },
        });

        await new Promise<void>((resolve, reject) => {
          const req = https.request({
            hostname: "generativelanguage.googleapis.com",
            path: `/v1/models/${modelName}:generateContent?key=${apiKey}`,
            method: "POST",
            headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
          }, (res) => {
            let data = "";
            res.on("data", (chunk) => { data += chunk; });
            res.on("end", async () => {
              try {
                const json = JSON.parse(data);
                if (json.error) { reject(new Error(`Gemini: ${json.error.message}`)); return; }
                const token = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
                rawResponse = token;
                await send({ type: "token", text: token });
                resolve();
              } catch (e) { reject(e); }
            });
          });
          req.on("error", reject);
          req.write(body);
          req.end();
        });
      } else {
        // Anthropic streaming
        const Anthropic = (await import("@anthropic-ai/sdk")).default;
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const streamResp = client.messages.stream({
          model: "claude-opus-4-6",
          max_tokens: 2048,
          system: SYSTEM,
          messages: [{ role: "user", content: prompt }],
        });

        for await (const event of streamResp) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            rawResponse += event.delta.text;
            await send({ type: "token", text: event.delta.text });
          }
        }
      }

      // Step 4 — parse
      await send({ type: "status", step: 4, text: "מעבד תוצאות..." });
      const match = rawResponse.trim().match(/\{[\s\S]*\}/);
      if (!match) {
        await send({ type: "error", text: "לא ניתן לפרסר JSON מתגובת ה-LLM" }); return;
      }
      const result = JSON.parse(match[0]);
      await send({ type: "result", data: result });
    } catch (err) {
      await send({ type: "error", text: err instanceof Error ? err.message : "שגיאה בחילוץ" });
    } finally {
      stopKeepAlive();
      await writer.close();
    }
  };

  run(); // fire and forget — stream handles lifecycle

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
