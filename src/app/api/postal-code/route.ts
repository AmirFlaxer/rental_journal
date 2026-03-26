import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const street = searchParams.get("street");

  if (!city || !street) {
    return NextResponse.json(
      { error: "נדרש ישוב ורחוב" },
      { status: 400 }
    );
  }

  try {
    const url = `https://www.israelpost.co.il/zipcode.nsf/SearchZip?openagent&lang=HE&city=${encodeURIComponent(city)}&street=${encodeURIComponent(street)}&type=1`;

    const response = await fetch(url, {
      headers: {
        "Accept": "application/json, text/plain, */*",
        "User-Agent": "Mozilla/5.0",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "שגיאה בחיפוש מיקוד" },
        { status: 502 }
      );
    }

    const text = await response.text();

    // Israel Post returns JSON array or object
    try {
      const data = JSON.parse(text);
      // Response may be array of results or direct object
      const results = Array.isArray(data) ? data : [data];
      const first = results.find((r: any) => r.zip || r.Zip || r.zipcode || r.ZIPCODE);
      const zip =
        first?.zip || first?.Zip || first?.zipcode || first?.ZIPCODE || null;

      if (zip) {
        return NextResponse.json({ zipCode: String(zip) });
      }
      return NextResponse.json({ zipCode: null, message: "מיקוד לא נמצא" });
    } catch {
      // Try to extract zip from HTML/text response
      const match = text.match(/\b\d{7}\b/);
      if (match) {
        return NextResponse.json({ zipCode: match[0] });
      }
      return NextResponse.json({ zipCode: null, message: "מיקוד לא נמצא" });
    }
  } catch (error: any) {
    if (error?.name === "TimeoutError") {
      return NextResponse.json(
        { error: "פג זמן החיבור לדואר ישראל" },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: "שגיאה בחיבור לדואר ישראל" },
      { status: 500 }
    );
  }
}
