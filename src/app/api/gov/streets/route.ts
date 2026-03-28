import { NextRequest, NextResponse } from "next/server";

const GOV_SEARCH  = "https://data.gov.il/api/3/action/datastore_search";
const STREETS_RID = "a7296d1a-f8c9-4b70-96c2-6ebb4352f8e3";

async function fetchStreets(q: string, limit: number, signal: AbortSignal): Promise<{ שם_רחוב: string; שם_ישוב: string }[]> {
  const url = new URL(GOV_SEARCH);
  url.searchParams.set("resource_id", STREETS_RID);
  url.searchParams.set("fields", "שם_רחוב,שם_ישוב");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(limit));
  const res = await fetch(url.toString(), { signal });
  const j = await res.json();
  return j?.success ? (j.result?.records ?? []) : [];
}

export async function GET(req: NextRequest) {
  const q    = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const city = req.nextUrl.searchParams.get("city")?.trim() ?? "";

  if (q.length < 2 && !city) return NextResponse.json([]);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const requests: Promise<{ שם_רחוב: string; שם_ישוב: string }[]>[] = [];

    if (city) {
      // Request 1: all streets for this city (up to 500) — broad coverage
      requests.push(fetchStreets(city, 500, controller.signal));

      // Request 2: specific street query within city — covers large cities (Jerusalem, Tel Aviv)
      if (q.length >= 2) {
        requests.push(fetchStreets(`${q} ${city}`, 20, controller.signal));
      }
    } else {
      requests.push(fetchStreets(q, 50, controller.signal));
    }

    const results = await Promise.all(requests);
    clearTimeout(timer);

    const seen = new Set<string>();
    const streets: { name: string }[] = [];

    for (const records of results) {
      for (const r of records) {
        const name  = (r["שם_רחוב"] ?? "").trim();
        const rCity = (r["שם_ישוב"] ?? "").trim();

        if (!name) continue;
        if (city && rCity !== city) continue;
        if (q && !name.includes(q)) continue;
        if (seen.has(name)) continue;
        seen.add(name);
        streets.push({ name });
        if (streets.length >= 10) break;
      }
      if (streets.length >= 10) break;
    }

    return NextResponse.json(streets);
  } catch {
    clearTimeout(timer);
    return NextResponse.json([]);
  }
}
