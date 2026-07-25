import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET - שני קוראים: משתמש מחובר (כפתור "עדכן מדדים") ו-Vercel Cron.
// Vercel Cron שולח תמיד GET עם Authorization: Bearer <CRON_SECRET> - ולא POST.
// כשהבדיקה הזו ישבה רק על POST הקרון החודשי קיבל 401 והמדדים נתקעו.
export async function GET(request: NextRequest) {
  if (isCronRequest(request)) return runRefresh();

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return runRefresh();
}

function isCronRequest(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function runRefresh(): Promise<NextResponse> {
  const results: { type: string; inserted: number; error?: string }[] = [];

  // --- USD: Frankfurter API (ממוצע חודשי מנתונים יומיים) ---
  try {
    const usdResult = await fetchUsd();
    if (usdResult.length > 0) {
      const { error } = await supabaseAdmin
        .from("index_rates")
        .upsert(usdResult, { onConflict: "type,period_date", ignoreDuplicates: true });
      results.push({ type: "usd", inserted: usdResult.length, error: error?.message });
    } else {
      results.push({ type: "usd", inserted: 0, error: "no data" });
    }
  } catch (e) {
    results.push({ type: "usd", inserted: 0, error: String(e) });
  }

  // --- CPI: הלמ"ס - מדד המחירים לצרכן כללי ---
  try {
    const cpiResult = await fetchCpi();
    if (cpiResult.length > 0) {
      // ignoreDuplicates: false - מעדכן ערכים קיימים (נרמול עקבי)
      const { error } = await supabaseAdmin
        .from("index_rates")
        .upsert(cpiResult, { onConflict: "type,period_date", ignoreDuplicates: false });
      results.push({ type: "cpi", inserted: cpiResult.length, error: error?.message });
    } else {
      results.push({ type: "cpi", inserted: 0, error: "no data" });
    }
  } catch (e) {
    results.push({ type: "cpi", inserted: 0, error: String(e) });
  }

  return NextResponse.json({ ok: true, results });
}

// POST - הפעלה ידנית עם CRON_SECRET (נשמר לתאימות; הקרון עצמו משתמש ב-GET)
export async function POST(request: NextRequest) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return runRefresh();
}

// ----------------------------------------------------------------
// Frankfurter - שער יציג USD/ILS ממוצע חודשי (מנתונים יומיים)
// ----------------------------------------------------------------
async function fetchUsd(): Promise<{ type: string; period_date: string; value: number }[]> {
  const today = new Date();
  const startYear = today.getFullYear() - 4;
  const start = `${startYear}-01-01`;
  const end = today.toISOString().slice(0, 10);

  const url = `https://api.frankfurter.app/${start}..${end}?from=USD&to=ILS`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Frankfurter HTTP ${res.status}`);

  const json = await res.json();
  const rates: Record<string, { ILS: number }> = json?.rates ?? {};

  // מיון ל-ממוצע חודשי: { "YYYY-MM": [rate, rate, ...] }
  const byMonth: Record<string, number[]> = {};
  for (const [date, val] of Object.entries(rates)) {
    if (!val?.ILS) continue;
    const month = date.slice(0, 7); // YYYY-MM
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(val.ILS);
  }

  return Object.entries(byMonth).map(([month, values]) => ({
    type: "usd",
    period_date: `${month}-01`,
    value: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10000) / 10000,
  }));
}

// ----------------------------------------------------------------
// הלמ"ס - מדד המחירים לצרכן כללי (id=120010)
// API: https://api.cbs.gov.il/index/data/price
// מנרמל ערכים בשרשור רציף מהנתון הישן ביותר - כדי לאפשר השוואה
// תקינה בין תקופות עם בסיסי מדד שונים
// ----------------------------------------------------------------
async function fetchCpi(): Promise<{ type: string; period_date: string; value: number }[]> {
  const allMonths: { year: number; month: number; percent: number }[] = [];

  // שולף את כל הדפים (הלמ"ס מחזיר ~900 רשומות בסך הכל)
  let page = 1;
  while (page <= 12) {
    const url =
      `https://api.cbs.gov.il/index/data/price` +
      `?id=120010&format=json&download=false&Page=${page}&PageSize=100`;
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`CBS API HTTP ${res.status}`);

    const json = await res.json();
    const dates: { year: number; month: number; percent: number }[] =
      json?.month?.[0]?.date ?? [];

    for (const d of dates) {
      allMonths.push({ year: d.year, month: d.month, percent: d.percent ?? 0 });
    }

    const paging = json?.paging;
    if (!paging || page >= paging.last_page) break;
    page++;
  }

  if (allMonths.length === 0) return [];

  // מיון מהישן לחדש
  allMonths.sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month));

  // שרשור ראשוני מהנתון הישן ביותר = 1.0
  const rawValues: number[] = [];
  let prev = 1.0;
  for (let i = 0; i < allMonths.length; i++) {
    const v = i === 0 ? 1.0 : prev * (1 + allMonths[i].percent / 100);
    rawValues.push(v);
    prev = v;
  }

  // מציאת ינואר 2020 כנקודת ייחוס - כך שהערכים בממשק נראים סבירים (~100)
  const refIdx = allMonths.findIndex((d) => d.year === 2020 && d.month === 1);
  const refRaw = refIdx >= 0 ? rawValues[refIdx] : rawValues[rawValues.length - 1];
  const factor = 100.0 / refRaw;

  return allMonths.map((d, i) => ({
    type: "cpi",
    period_date: `${d.year}-${String(d.month).padStart(2, "0")}-01`,
    value: Math.round(rawValues[i] * factor * 100) / 100,
  }));
}
