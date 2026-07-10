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

describe("buildAttentionItems - גבולות אופק", () => {
  const base = { payments: [], activeLeases: [], openTasks: [], today: TODAY };

  it("משימה בדיוק באופק 7 ימים נכללת; יום 8 לא", () => {
    const at7 = buildAttentionItems({ ...base, openTasks: [{ id: "t1", title: "x", due_date: "2026-07-17" }] });
    const at8 = buildAttentionItems({ ...base, openTasks: [{ id: "t2", title: "x", due_date: "2026-07-18" }] });
    expect(at7).toHaveLength(1);
    expect(at7[0].sub).toBe("בעוד 7 ימים");
    expect(at8).toHaveLength(0);
  });

  it("חוזה בדיוק באופק 90 ימים נכלל; יום 91 לא", () => {
    const at90 = buildAttentionItems({ ...base, activeLeases: [{ id: "l1", end_date: "2026-10-08", properties: { title: "x" } }] });
    const at91 = buildAttentionItems({ ...base, activeLeases: [{ id: "l2", end_date: "2026-10-09", properties: { title: "x" } }] });
    expect(at90).toHaveLength(1);
    expect(at90[0].sub).toBe("בעוד 90 ימים");
    expect(at91).toHaveLength(0);
  });

  it("תקבול שמועדו היום אינו איחור; משימה שמועדה עבר וחוזה שהסתיים - לא מופיעים", () => {
    const items = buildAttentionItems({
      ...base,
      payments: [{ id: "p1", status: "pending", due_date: TODAY, amount: 100 }],
      openTasks: [{ id: "t1", title: "x", due_date: "2026-07-01" }],
      activeLeases: [{ id: "l1", end_date: "2026-07-01", properties: { title: "x" } }],
    });
    expect(items).toHaveLength(0);
  });

  it("due_date בפורמט timestamptz מלא מה-DB מטופל נכון", () => {
    const items = buildAttentionItems({
      payments: [],
      activeLeases: [],
      openTasks: [
        { id: "t1", title: "קרוב", due_date: "2026-07-12T00:00:00+00:00" },
        { id: "t2", title: "רחוק", due_date: "2026-08-20T00:00:00+00:00" },
      ],
      today: TODAY,
    });
    expect(items).toHaveLength(1);
    expect(items[0].sub).toBe("בעוד 2 ימים");
  });
});
