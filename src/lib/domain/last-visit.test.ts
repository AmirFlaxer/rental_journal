import { describe, it, expect } from "vitest";
import { readAndStampVisit, summarizeSince } from "./last-visit";

function fakeStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    dump: () => Object.fromEntries(store),
  };
}

describe("readAndStampVisit", () => {
  it("מחזיר null בביקור ראשון ומטביע את הנוכחי", () => {
    const s = fakeStorage();
    expect(readAndStampVisit(s, "2026-07-10T08:00:00Z")).toBeNull();
    expect(readAndStampVisit(s, "2026-07-12T08:00:00Z")).toBe("2026-07-10T08:00:00Z");
  });
});

describe("summarizeSince", () => {
  const data = {
    payments: [
      { status: "paid", paid_date: "2026-07-08", amount: 7875, payment_type: "Rent" },
      { status: "paid", paid_date: "2026-07-01", amount: 5500, payment_type: "Rent" },
      { status: "pending", due_date: "2026-07-07", paid_date: undefined, amount: 4000, payment_type: "Rent" },
    ],
    tasks: [
      { completed_at: "2026-07-09T10:00:00Z" },
      { completed_at: null },
    ],
  };

  it("מסכם תקבולים, משימות שסומנו וחובות חדשים מאז הביקור", () => {
    const s = summarizeSince("2026-07-06T00:00:00Z", data as never, "2026-07-10");
    expect(s).toEqual({ paymentsCount: 1, paymentsSum: 7875, tasksDone: 1, newOverdue: 1 });
  });

  it("מחזיר null כשאין שום דבר לדווח", () => {
    expect(summarizeSince("2026-07-09T23:00:00Z", { payments: [], tasks: [] }, "2026-07-10")).toBeNull();
  });
});
