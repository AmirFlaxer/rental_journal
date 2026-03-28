import { NextRequest, NextResponse } from "next/server";

const GOV_SEARCH  = "https://data.gov.il/api/3/action/datastore_search";
const STREETS_RID = "a7296d1a-f8c9-4b70-96c2-6ebb4352f8e3";

const ISRAEL_CITIES = [
  "ירושלים","תל אביב-יפו","חיפה","ראשון לציון","פתח תקווה","אשדוד","נתניה","באר שבע",
  "בני ברק","חולון","רמת גן","אשקלון","רחובות","בת ים","בית שמש","כפר סבא","הרצליה",
  "חדרה","מודיעין-מכבים-רעות","נצרת","לוד","רמלה","נס ציונה","ראש העין","עפולה",
  "גבעתיים","הוד השרון","רעננה","קריית גת","אילת","אום אל-פחם","אלעד","אור יהודה",
  "טבריה","נהריה","גבעת שמואל","קריית אתא","קריית ביאליק","קריית מוצקין","קריית ים",
  "מגדל העמק","עכו","ערד","יבנה","קריית שמונה","צפת","דימונה","בית שאן","נתיבות",
  "אופקים","שדרות","טירת כרמל","מעלה אדומים","גבעת זאב","מבשרת ציון","כרמיאל",
  "קלנסווה","טמרה","שפרעם","סח'נין","יקנעם עילית","זכרון יעקב","פרדס חנה-כרכור",
  "גן יבנה","כפר יונה","אבן יהודה","טייבה","גדרה","מזכרת בתיה","יהוד-מונוסון",
  "קריית מלאכי","מיתר","ירוחם","ייט'ב","ריינה","מג'ד אל-כרום","עראבה","דייר אל-אסד",
  "באקה אל-גרבייה","נשר","עתלית","פוריידיס","כפר מנדא","נוף הגליל","כפר קרע",
];

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  // Try government API first
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const url = new URL(GOV_SEARCH);
    url.searchParams.set("resource_id", STREETS_RID);
    url.searchParams.set("fields", "שם_ישוב");
    url.searchParams.set("q", q);
    url.searchParams.set("limit", "50");

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    clearTimeout(timer);

    const j = await res.json();
    const seen = new Set<string>();
    const cities: string[] = [];

    for (const r of (j?.result?.records || []) as Record<string, string>[]) {
      const name = r["שם_ישוב"];
      if (!name || !name.includes(q)) continue;
      if (seen.has(name)) continue;
      seen.add(name);
      cities.push(name);
      if (cities.length >= 10) break;
    }

    if (cities.length > 0) return NextResponse.json(cities);
  } catch {
    clearTimeout(timer);
  }

  // Fallback: built-in list
  const matches = ISRAEL_CITIES.filter((c) => c.includes(q)).slice(0, 10);
  return NextResponse.json(matches);
}
