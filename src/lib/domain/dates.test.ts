import { describe, it, expect } from "vitest";
import { localDateStr, localMonthKey, isoDateParts, isoMonthKey, diffDays, weekGroupLabel, appDateStr, appNoonIso } from "@/lib/domain/dates";

describe("localDateStr / localMonthKey", () => {
  it("בונים מחרוזת מרכיבי תאריך מקומיים (לא UTC)", () => {
    const d = new Date(2026, 0, 5); // 5 בינואר 2026, נבנה מרכיבים מקומיים
    expect(localDateStr(d)).toBe("2026-01-05");
    expect(localMonthKey(d)).toBe("2026-01");
  });
});

describe("isoDateParts", () => {
  it("פרסור תאריך ISO רגיל", () => {
    expect(isoDateParts("2026-01-15")).toEqual({ year: 2026, month: 1, day: 15 });
  });

  it("פרסור טקסטואלי - מתעלם מרכיב זמן/אזור-זמן במחרוזת ISO", () => {
    expect(isoDateParts("2026-07-01T00:00:00+00:00")).toEqual({ year: 2026, month: 7, day: 1 });
  });
});

describe("isoMonthKey", () => {
  it("מחזיר YYYY-MM גם כשיש רכיב זמן במחרוזת", () => {
    expect(isoMonthKey("2026-01-15")).toBe("2026-01");
    expect(isoMonthKey("2026-07-01T00:00:00+00:00")).toBe("2026-07");
  });
});

describe("diffDays", () => {
  it("הפרש ימים חיובי כש-a מאוחר מ-b", () => {
    expect(diffDays("2026-01-10", "2026-01-01")).toBe(9);
  });

  it("הפרש ימים שלילי כש-a מוקדם מ-b", () => {
    expect(diffDays("2026-01-01", "2026-01-10")).toBe(-9);
  });

  it("מתעלם מרכיב הזמן - משווה רק את התאריך גם עם timestamps שונים", () => {
    expect(diffDays("2026-07-02T10:00:00+00:00", "2026-07-01T23:00:00+00:00")).toBe(1);
  });
});

describe("weekGroupLabel", () => {
  // 2026-07-10 הוא יום שישי; תחילת השבוע (ראשון) 2026-07-05
  it("מסווג לשבוע הנוכחי, לשבוע שעבר ולחודש לפי לוח עברי-ישראלי (שבוע מתחיל בראשון)", () => {
    expect(weekGroupLabel("2026-07-10", "2026-07-10")).toBe("השבוע");
    expect(weekGroupLabel("2026-07-05", "2026-07-10")).toBe("השבוע");
    expect(weekGroupLabel("2026-07-04", "2026-07-10")).toBe("שבוע שעבר");
    expect(weekGroupLabel("2026-06-28", "2026-07-10")).toBe("שבוע שעבר");
    expect(weekGroupLabel("2026-06-27", "2026-07-10")).toBe("יוני 2026");
  });

  it("תומך בפורמט timestamptz מלא מה-DB", () => {
    expect(weekGroupLabel("2026-07-08T00:00:00+00:00", "2026-07-10")).toBe("השבוע");
    expect(weekGroupLabel("2026-06-20T15:30:00+00:00", "2026-07-10")).toBe("יוני 2026");
  });
});

describe("appDateStr", () => {
  // המקרה שאומת בדאטה: תקבול שנרשם 26.7.2026 בשעה 02:37 שעון ישראל נשמר עם
  // הוצאת מס בתאריך 25.7, כי toISOString החזיר את היום הקודם ב-UTC.
  it("מחזיר את היום הישראלי גם בשעות שבהן UTC עדיין אתמול", () => {
    expect(appDateStr(new Date("2026-07-25T23:37:00Z"))).toBe("2026-07-26");
    expect(appDateStr(new Date("2026-07-25T21:00:00Z"))).toBe("2026-07-26");
  });

  it("לא מקדים את היום כשישראל עדיין באותו תאריך", () => {
    expect(appDateStr(new Date("2026-07-26T20:59:00Z"))).toBe("2026-07-26");
    expect(appDateStr(new Date("2026-07-26T05:00:00Z"))).toBe("2026-07-26");
  });

  it("חוצה נכון גבול חודש - הנקודה שמזיזה שורה בדוח המס", () => {
    expect(appDateStr(new Date("2026-07-31T22:00:00Z"))).toBe("2026-08-01");
    expect(appDateStr(new Date("2026-07-31T20:59:00Z"))).toBe("2026-07-31");
  });

  it("נכון גם בשעון חורף (UTC+2) ולא רק בקיץ (UTC+3)", () => {
    expect(appDateStr(new Date("2026-01-31T22:30:00Z"))).toBe("2026-02-01");
    expect(appDateStr(new Date("2026-01-31T21:30:00Z"))).toBe("2026-01-31");
  });
});

describe("appNoonIso", () => {
  it("מקבע צהריים-UTC על היום הישראלי, כך שכל גזירת-תאריך במורד הזרם תסכים", () => {
    const iso = appNoonIso(new Date("2026-07-25T23:37:00Z"));
    expect(iso).toBe("2026-07-26T12:00:00.000Z");
    expect(iso.slice(0, 10)).toBe("2026-07-26");
    expect(new Date(iso).toISOString().slice(0, 7)).toBe("2026-07");
  });

  it("שומר על היום הנכון גם בגבול חודש", () => {
    expect(appNoonIso(new Date("2026-07-31T22:00:00Z"))).toBe("2026-08-01T12:00:00.000Z");
  });
});
