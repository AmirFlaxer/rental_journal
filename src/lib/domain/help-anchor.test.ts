import { describe, it, expect } from "vitest";
import { chapterAnchorFor } from "./help-anchor";

describe("chapterAnchorFor", () => {
  it("ממפה כל prefix של מסך לעוגן הפרק שלו", () => {
    expect(chapterAnchorFor("/dashboard/properties")).toBe("properties");
    expect(chapterAnchorFor("/dashboard/leases")).toBe("leases");
    expect(chapterAnchorFor("/dashboard/payments")).toBe("payments");
    expect(chapterAnchorFor("/dashboard/expenses")).toBe("expenses");
    expect(chapterAnchorFor("/dashboard/debts")).toBe("debts");
    expect(chapterAnchorFor("/dashboard/reports")).toBe("reports");
    expect(chapterAnchorFor("/dashboard/tasks")).toBe("tasks");
    expect(chapterAnchorFor("/dashboard/settings")).toBe("settings");
  });

  it("ממפה נתיבים מקוננים לפי ה-prefix של המסך הראשי", () => {
    expect(chapterAnchorFor("/dashboard/properties/123/edit")).toBe("properties");
    expect(chapterAnchorFor("/dashboard/properties/123/add-lease")).toBe("properties");
    expect(chapterAnchorFor("/dashboard/leases/import")).toBe("leases");
    expect(chapterAnchorFor("/dashboard/leases/123/edit")).toBe("leases");
    expect(chapterAnchorFor("/dashboard/reports/tax")).toBe("reports");
    expect(chapterAnchorFor("/dashboard/reports/linkage")).toBe("reports");
  });

  it("מחזיר intro לדשבורד הראשי ולמסכים בלי פרק ייעודי", () => {
    expect(chapterAnchorFor("/dashboard")).toBe("intro");
    expect(chapterAnchorFor("/dashboard/about")).toBe("intro");
    expect(chapterAnchorFor("/dashboard/maintenance")).toBe("intro");
    expect(chapterAnchorFor("/dashboard/help")).toBe("intro");
    expect(chapterAnchorFor("")).toBe("intro");
  });
});
