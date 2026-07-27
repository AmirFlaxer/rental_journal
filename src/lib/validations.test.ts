import { describe, it, expect } from "vitest";
import { propertyUtilitySchema, propertyUtilityUpdateSchema } from "@/lib/validations";

// תדירות שנתית בלי חודש-עוגן אינה מייצרת תזכורת אף פעם, ובלי שגיאה - הסוג הגרוע
// של כשל, כי החשבון נראה מוגדר. הבדיקות כאן נועלות את ההגנה בשכבת ה-API.
const base = {
  property_id: "p1",
  type: "insurance" as const,
  responsibility: "owner_pays" as const,
};

describe("propertyUtilitySchema - חודש עוגן לתדירות שנתית", () => {
  it("דוחה תדירות שנתית בלי חודש עוגן", () => {
    const result = propertyUtilitySchema.safeParse({ ...base, frequency: "annual" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["anchor_month"]);
      expect(result.error.issues[0].message).toBe("לתדירות שנתית חובה לציין חודש עוגן");
    }
  });

  it("דוחה גם כשחודש העוגן נשלח במפורש כ-null", () => {
    expect(propertyUtilitySchema.safeParse({ ...base, frequency: "annual", anchor_month: null }).success).toBe(false);
  });

  it("מקבל תדירות שנתית עם חודש עוגן", () => {
    const result = propertyUtilitySchema.safeParse({
      ...base, frequency: "annual", anchor_month: 10, anchor_day: 31,
    });
    expect(result.success).toBe(true);
  });

  it("אינו נוגע בחודשי ובדו-חודשי - הם תקינים בלי חודש עוגן", () => {
    expect(propertyUtilitySchema.safeParse({ ...base, type: "water", frequency: "monthly" }).success).toBe(true);
    expect(propertyUtilitySchema.safeParse({ ...base, type: "water", frequency: "bimonthly" }).success).toBe(true);
  });
});

describe("propertyUtilityUpdateSchema - עדכון חלקי", () => {
  it("דוחה מעבר לתדירות שנתית בלי חודש עוגן", () => {
    expect(propertyUtilityUpdateSchema.safeParse({ frequency: "annual" }).success).toBe(false);
  });

  it("מקבל עדכון שאינו נוגע בתדירות - אין לנו את הערך השמור ואין מה לאכוף", () => {
    expect(propertyUtilityUpdateSchema.safeParse({ active: false }).success).toBe(true);
    expect(propertyUtilityUpdateSchema.safeParse({ anchor_day: 15 }).success).toBe(true);
  });

  it("מקבל מעבר לתדירות שנתית כשחודש העוגן נשלח יחד", () => {
    expect(propertyUtilityUpdateSchema.safeParse({ frequency: "annual", anchor_month: 10 }).success).toBe(true);
  });
});
