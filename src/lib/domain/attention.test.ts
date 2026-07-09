import { describe, it, expect } from "vitest";
import { buildAttentionItems } from "./attention";

const TODAY = "2026-07-10";

describe("buildAttentionItems", () => {
  it("תקבול באיחור ראשון, אחריו משימה קרובה, ואז חוזה שמסתיים", () => {
    const items = buildAttentionItems({
      payments: [{ id: "p1", status: "pending", due_date: "2026-07-01", amount: 5500, property: { title: "נורדאו 58" } }],
      activeLeases: [{ id: "l1", end_date: "2026-10-07", properties: { title: "שלומציון המלכה 5" } }],
      openTasks: [{ id: "t1", title: "הפקדת שק שכ\"ד", due_date: "2026-07-12" }],
      today: TODAY,
    });
    expect(items.map((i) => i.kind)).toEqual(["overdue", "task", "lease_ending"]);
    expect(items[0].label).toContain("נורדאו 58");
    expect(items[0].sub).toContain("5,500");
    expect(items[2].sub).toBe("בעוד 89 ימים");
  });

  it("מתעלם ממה שלא דורש טיפול: שולם, משימה רחוקה, חוזה שמסתיים בעוד יותר מ-90 יום", () => {
    const items = buildAttentionItems({
      payments: [{ id: "p1", status: "paid", due_date: "2026-07-01", amount: 5500 }],
      activeLeases: [{ id: "l1", end_date: "2027-01-01", properties: { title: "x" } }],
      openTasks: [{ id: "t1", title: "רחוק", due_date: "2026-07-30" }],
      today: TODAY,
    });
    expect(items).toEqual([]);
  });

  it("משימה שמועדה היום מקבלת sub 'היום'; חוזה שמסתיים היום - 'מסתיים היום'", () => {
    const items = buildAttentionItems({
      payments: [],
      activeLeases: [{ id: "l1", end_date: TODAY, properties: { title: "x" } }],
      openTasks: [{ id: "t1", title: "לתקן דוד", due_date: TODAY }],
      today: TODAY,
    });
    expect(items.find((i) => i.kind === "task")?.sub).toBe("היום");
    expect(items.find((i) => i.kind === "lease_ending")?.sub).toBe("מסתיים היום");
  });
});
