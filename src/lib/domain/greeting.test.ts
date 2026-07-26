import { describe, it, expect } from "vitest";
import { greetingFor } from "./greeting";

describe("greetingFor", () => {
  it("מברך בשם הפרטי בלבד, גם כששמור שם מלא", () => {
    expect(greetingFor("אמיר פ")).toBe("שלום אמיר");
    expect(greetingFor("אמיר פלקסר")).toBe("שלום אמיר");
    expect(greetingFor("אמיר")).toBe("שלום אמיר");
  });

  it("חוזר ל\"שלום\" נקי כשאין שם - ולא ל\"שלום משתמש\"", () => {
    expect(greetingFor(undefined)).toBe("שלום");
    expect(greetingFor(null)).toBe("שלום");
    expect(greetingFor("")).toBe("שלום");
    expect(greetingFor("   ")).toBe("שלום");
  });

  it("מנקה רווחים מיותרים סביב השם ובתוכו", () => {
    expect(greetingFor("  אמיר  פ  ")).toBe("שלום אמיר");
    expect(greetingFor("\nאמיר\t")).toBe("שלום אמיר");
  });
});
