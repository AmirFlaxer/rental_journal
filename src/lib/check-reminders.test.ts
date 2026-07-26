import { describe, it, expect } from "vitest";
import { isCheckPaymentMethod, pickReminderToAdopt } from "./check-reminders";

describe("isCheckPaymentMethod", () => {
  it("מזהה שיטת תשלום בשקים", () => {
    expect(isCheckPaymentMethod("check")).toBe(true);
    expect(isCheckPaymentMethod("checks")).toBe(true);
    expect(isCheckPaymentMethod("CHECK")).toBe(true);
  });

  it("דוחה שיטות אחרות ואת ריק", () => {
    expect(isCheckPaymentMethod("bank_transfer")).toBe(false);
    expect(isCheckPaymentMethod(null)).toBe(false);
    expect(isCheckPaymentMethod(undefined)).toBe(false);
  });
});

describe("pickReminderToAdopt", () => {
  const OPEN = { id: "t-open", due_date: "2026-07-26", completed_at: null, source_payment_id: null };
  const CLOSED = { id: "t-closed", due_date: "2026-07-26", completed_at: "2026-07-25", source_payment_id: null };
  const OTHER_MONTH = { id: "t-aug", due_date: "2026-08-26", completed_at: null, source_payment_id: null };
  const LINKED = { id: "t-linked", due_date: "2026-07-26", completed_at: "2026-07-25", source_payment_id: "p9" };

  it("מעדיף משימה פתוחה של אותו חודש", () => {
    expect(pickReminderToAdopt([CLOSED, OPEN], "2026-07")?.id).toBe("t-open");
  });

  it("מאמץ משימה סגורה כשאין פתוחה - מונע כפילות", () => {
    expect(pickReminderToAdopt([CLOSED], "2026-07")?.id).toBe("t-closed");
  });

  it("לא נוגע במשימה של חודש אחר", () => {
    expect(pickReminderToAdopt([OTHER_MONTH], "2026-07")).toBeNull();
  });

  it("לא מאמץ משימה שכבר מקושרת לתקבול אחר", () => {
    expect(pickReminderToAdopt([LINKED], "2026-07")).toBeNull();
  });

  it("מחזיר null כשאין מועמדות", () => {
    expect(pickReminderToAdopt([], "2026-07")).toBeNull();
  });
});
