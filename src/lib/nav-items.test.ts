import { describe, it, expect } from "vitest";
import { NAV_ITEMS, MOBILE_NAV_ITEMS, isNavItemActive } from "./nav-items";

/** שמות הפריטים שנצבעים כפעילים בנתיב נתון */
function activeLabels(pathname: string, items = NAV_ITEMS): string[] {
  return items.filter((i) => isNavItemActive(pathname, i, items)).map((i) => i.label);
}

describe("isNavItemActive", () => {
  it("מדליק פריט אחד בלבד בכל נתיב של הניווט", () => {
    for (const item of NAV_ITEMS) {
      expect(activeLabels(item.href)).toEqual([item.label]);
    }
  });

  it("לא מדליק גם דוחות וגם דוח מס באותו מסך", () => {
    expect(activeLabels("/dashboard/reports/tax")).toEqual(["דוח מס"]);
  });

  it("תת-מסך בלי פריט משלו מדליק את פריט האב", () => {
    expect(activeLabels("/dashboard/reports/linkage")).toEqual(["דוחות"]);
    expect(activeLabels("/dashboard/reports/abc-123")).toEqual(["דוחות"]);
    expect(activeLabels("/dashboard/properties/abc-123/edit")).toEqual(["נכסים"]);
  });

  it("פריט exact לא נדלק בתת-מסכים שלו", () => {
    expect(activeLabels("/dashboard/leases/abc-123/edit")).toEqual([]);
    expect(activeLabels("/dashboard/leases/import")).toEqual(["ייבוא חוזה"]);
  });

  it("לוח הבקרה לא נדלק בכל מסך אחר", () => {
    expect(activeLabels("/dashboard/expenses")).toEqual(["הוצאות"]);
    expect(activeLabels("/dashboard")).toEqual(["לוח בקרה"]);
  });

  it("לא מתאים לנתיב שרק מתחיל באותן אותיות", () => {
    expect(activeLabels("/dashboard/reports-archive")).toEqual([]);
  });

  it("אותו כלל תקף גם בניווט המובייל", () => {
    for (const item of MOBILE_NAV_ITEMS) {
      expect(activeLabels(item.href, MOBILE_NAV_ITEMS)).toEqual([item.label]);
    }
  });
});
