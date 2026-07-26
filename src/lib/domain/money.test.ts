import { describe, it, expect } from "vitest";
import { formatAmount, formatCurrency } from "./money";

// סימן-הכיווניות ש-Intl בעברית מוסיף לפני מינוס. מוגדר כ-escape ולא כתו ממשי
// בקוד - תו בלתי-נראה בקובץ מקור נקרא כזבל-טקסט.
const DIR_MARK = new RegExp(String.fromCharCode(0x200e), "g");

describe("formatAmount", () => {
  it("מעגל שברי אגורות של הוצאת המס האוטומטית", () => {
    // 10% מתקבול שכ״ד 7,875 - נשמר ב-DB כ-787.5
    expect(formatAmount(787.5)).toBe("788");
    expect(formatAmount(520.0)).toBe("520");
  });

  it("מוסיף מפרידי אלפים", () => {
    expect(formatAmount(57005)).toBe("57,005");
    expect(formatAmount(1234567)).toBe("1,234,567");
  });

  it("מטפל באפס ובסכומים שליליים", () => {
    expect(formatAmount(0)).toBe("0");
    // הסימן תפקודי (בלעדיו המינוס מוצג בצד הלא-נכון), ולכן מנוטרל בבדיקה ולא בקוד
    expect(formatAmount(-11454.5).replace(DIR_MARK, "")).toBe("-11,454");
  });
});

describe("formatCurrency", () => {
  it("מוסיף סימן שקל לסכום המעוגל", () => {
    expect(formatCurrency(787.5)).toBe("₪788");
    expect(formatCurrency(13375)).toBe("₪13,375");
  });
});
