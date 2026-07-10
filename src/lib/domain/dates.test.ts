import { describe, it, expect } from "vitest";
import { localDateStr, localMonthKey, isoDateParts, isoMonthKey, diffDays, weekGroupLabel } from "@/lib/domain/dates";

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
});
