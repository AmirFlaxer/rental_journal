import { NextRequest, NextResponse } from "next/server";

const GOV_SEARCH  = "https://data.gov.il/api/3/action/datastore_search";
const STREETS_RID = "a7296d1a-f8c9-4b70-96c2-6ebb4352f8e3";

export async function GET(req: NextRequest) {
  const q    = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const city = req.nextUrl.searchParams.get("city")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const url = new URL(GOV_SEARCH);
    url.searchParams.set("resource_id", STREETS_RID);
    url.searchParams.set("fields", "שם_רחוב,מיקוד,שם_ישוב");
    url.searchParams.set("q", q);
    url.searchParams.set("limit", "50");
    if (city) {
      url.searchParams.set("filters", JSON.stringify({ "שם_ישוב": city }));
    }

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    clearTimeout(timer);

    const j = await res.json();
    const seen = new Set<string>();
    const streets: { name: string; zip?: string }[] = [];

    for (const r of (j?.result?.records || []) as Record<string, string>[]) {
      const name = r["שם_רחוב"];
      if (!name || !name.includes(q)) continue;
      if (seen.has(name)) continue;
      seen.add(name);
      streets.push({ name, zip: r["מיקוד"] ? String(r["מיקוד"]).trim() : undefined });
      if (streets.length >= 10) break;
    }

    return NextResponse.json(streets);
  } catch {
    clearTimeout(timer);
    return NextResponse.json([]);
  }
}
