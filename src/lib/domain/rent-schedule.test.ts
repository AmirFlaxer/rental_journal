import { describe, it, expect } from "vitest";
import { listRentMonths, coveredPropertyMonths } from "@/lib/domain/rent-schedule";

describe("listRentMonths", () => {
  it("חוזה רגיל של שנה - 12 חודשים, יום חיוב נכון", () => {
    const slots = listRentMonths({ startDate: "2025-01-15", endDate: "2025-12-31" });
    expect(slots).toHaveLength(12);
    expect(slots[0]).toEqual({ monthKey: "2025-01", dueDate: "2025-01-15" });
    expect(slots[11]).toEqual({ monthKey: "2025-12", dueDate: "2025-12-15" });
    // יום החיוב נשאר 15 בכל החודשים (אין חודש קצר מ-15 יום)
    expect(slots.every((s) => s.dueDate.endsWith("-15"))).toBe(true);
  });

  it("חוזה שמתחיל ב-31 לחודש - הצמדה לסוף חודשים קצרים", () => {
    const slots = listRentMonths({ startDate: "2025-01-31", endDate: "2025-12-31" });
    const byMonth = Object.fromEntries(slots.map((s) => [s.monthKey, s.dueDate]));
    expect(byMonth["2025-01"]).toBe("2025-01-31");
    expect(byMonth["2025-02"]).toBe("2025-02-28"); // 2025 - לא מעוברת
    expect(byMonth["2025-03"]).toBe("2025-03-31");
    expect(byMonth["2025-04"]).toBe("2025-04-30");
    expect(slots).toHaveLength(12);
  });

  it("חוזה שמתחיל ב-31 לחודש - פברואר בשנה מעוברת מוצמד ל-29", () => {
    const slots = listRentMonths({ startDate: "2024-01-31", endDate: "2024-12-31" });
    const feb = slots.find((s) => s.monthKey === "2024-02");
    expect(feb?.dueDate).toBe("2024-02-29"); // 2024 - שנה מעוברת
  });

  it("חוזה שמסתיים באמצע חודש לפני יום החיוב - החודש האחרון לא נכלל", () => {
    const slots = listRentMonths({ startDate: "2025-01-15", endDate: "2026-01-05" });
    expect(slots).toHaveLength(12); // ינואר 2025 עד דצמבר 2025 בלבד
    expect(slots.some((s) => s.monthKey === "2026-01")).toBe(false);
    expect(slots[slots.length - 1].monthKey).toBe("2025-12");
  });

  it("חוזה שמסתיים אחרי יום החיוב - החודש האחרון כן נכלל", () => {
    const slots = listRentMonths({ startDate: "2025-01-15", endDate: "2026-01-20" });
    expect(slots).toHaveLength(13);
    expect(slots[slots.length - 1]).toEqual({ monthKey: "2026-01", dueDate: "2026-01-15" });
  });

  it("חוזה של חודש אחד", () => {
    const slots = listRentMonths({ startDate: "2025-03-10", endDate: "2025-03-25" });
    expect(slots).toEqual([{ monthKey: "2025-03", dueDate: "2025-03-10" }]);
  });
});

describe("coveredPropertyMonths", () => {
  it("סינון לפי paymentType=Rent בלבד, ותמיכה גם ב-property.id וגם ב-propertyId", () => {
    const covered = coveredPropertyMonths([
      { paymentType: "Rent", dueDate: "2025-01-15", property: { id: "p1" } },
      { paymentType: "Rent", dueDate: "2025-02-15", propertyId: "p2" }, // בלי אובייקט property
      { paymentType: "Utility", dueDate: "2025-01-15", property: { id: "p1" } }, // לא Rent - לא נכלל
      { paymentType: "Rent", dueDate: "2025-03-15", property: { id: "p1" }, propertyId: "ignored" }, // property.id גובר
    ]);

    expect(covered.size).toBe(3);
    expect(covered.has("p1-2025-01")).toBe(true);
    expect(covered.has("p2-2025-02")).toBe(true);
    expect(covered.has("p1-2025-03")).toBe(true);
    expect(covered.has("ignored-2025-03")).toBe(false);
  });
});
