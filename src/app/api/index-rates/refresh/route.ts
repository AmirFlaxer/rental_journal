import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Vercel Cron + קריאה ידנית לבדיקה
// Header נדרש: Authorization: Bearer <CRON_SECRET>
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: { type: string; inserted: number; error?: string }[] = [];

  // --- USD: בנק ישראל ---
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

  // --- CPI: data.gov.il ---
  try {
    const cpiResult = await fetchCpi();
    if (cpiResult.length > 0) {
      const { error } = await supabaseAdmin
        .from("index_rates")
        .upsert(cpiResult, { onConflict: "type,period_date", ignoreDuplicates: true });
      results.push({ type: "cpi", inserted: cpiResult.length, error: error?.message });
    } else {
      results.push({ type: "cpi", inserted: 0, error: "no data" });
    }
  } catch (e) {
    results.push({ type: "cpi", inserted: 0, error: String(e) });
  }

  return NextResponse.json({ ok: true, results });
}

// ----------------------------------------------------------------
// Bank of Israel — שער יציג USD/ILS חודשי (ממוצע חודשי)
// ----------------------------------------------------------------
async function fetchUsd(): Promise<{ type: string; period_date: string; value: number }[]> {
  const today = new Date();
  const startYear = today.getFullYear() - 1;
  const start = `${startYear}-01-01`;
  const end = today.toISOString().slice(0, 10);

  const url =
    `https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/EXR/1.0/` +
    `RER_USD_ILS--MABOF-NIS-M-EX?format=jsondata&startPeriod=${start}&endPeriod=${end}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`BOI HTTP ${res.status}`);

  const json = await res.json();
  // מבנה: dataSets[0].series["0:0:0:0:0"].observations
  const observations: Record<string, [string]> =
    json?.dataSets?.[0]?.series?.["0:0:0:0:0"]?.observations ?? {};
  const timePeriods: string[] =
    json?.structure?.dimensions?.observation?.[0]?.values?.map(
      (v: { id: string }) => v.id
    ) ?? [];

  return Object.entries(observations).map(([idx, val]) => ({
    type: "usd",
    period_date: `${timePeriods[Number(idx)]}-01`, // YYYY-MM → YYYY-MM-01
    value: Number(val[0]),
  }));
}

// ----------------------------------------------------------------
// הלמ"ס / data.gov.il — מדד המחירים לצרכן (CPI)
// resource_id של סדרת המדד הכללי
// ----------------------------------------------------------------
async function fetchCpi(): Promise<{ type: string; period_date: string; value: number }[]> {
  const url =
    "https://data.gov.il/api/3/action/datastore_search" +
    "?resource_id=b14bcef3-b5f3-4a1e-add0-e1c4e4c9fc5b&limit=24&sort=date%20desc";

  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`data.gov.il HTTP ${res.status}`);

  const json = await res.json();
  const records: { date: string; index: string | number }[] = json?.result?.records ?? [];

  return records
    .filter((r) => r.date && r.index)
    .map((r) => {
      // date מגיע כ-"YYYY-MM-DD" או "YYYY-MM"
      const periodDate = r.date.length === 7 ? `${r.date}-01` : r.date.slice(0, 10);
      return { type: "cpi", period_date: periodDate, value: Number(r.index) };
    });
}
