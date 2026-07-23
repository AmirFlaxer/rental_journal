import { describe, it, expect } from "vitest";
import { heldCashDepositTotal, heldPaperCount } from "@/lib/domain/securities-summary";
import type { LeaseSecurity } from "@/types/database";

function makeSec(overrides: Partial<LeaseSecurity> = {}): LeaseSecurity {
  return {
    id: "s1",
    user_id: "u1",
    lease_id: "l1",
    property_id: "p1",
    kind: "security_check",
    utility_type: null,
    amount: null,
    bank: null,
    branch: null,
    account: null,
    check_number: null,
    status: "held",
    received_date: null,
    resolved_date: null,
    notes: null,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

describe("heldCashDepositTotal", () => {
  it("מסכם רק פיקדונות כספיים בסטטוס מוחזק", () => {
    const items = [
      makeSec({ kind: "cash_deposit", status: "held", amount: 5000 }),
      makeSec({ kind: "cash_deposit", status: "held", amount: 3000 }),
      makeSec({ kind: "cash_deposit", status: "returned", amount: 9000 }), // מוחזר - לא נספר
      makeSec({ kind: "security_check", status: "held", amount: 10000 }),   // שק - לא נספר
    ];
    expect(heldCashDepositTotal(items)).toBe(8000);
  });

  it("מתעלם מ-amount null", () => {
    const items = [
      makeSec({ kind: "cash_deposit", status: "held", amount: null }),
      makeSec({ kind: "cash_deposit", status: "held", amount: 2000 }),
    ];
    expect(heldCashDepositTotal(items)).toBe(2000);
  });

  it("רשימה ריקה מחזירה 0", () => {
    expect(heldCashDepositTotal([])).toBe(0);
  });
});

describe("heldPaperCount", () => {
  it("סופר בטחונות-נייר מוחזקים (כל מה שאינו פיקדון כספי)", () => {
    const items = [
      makeSec({ kind: "security_check", status: "held" }),
      makeSec({ kind: "promissory_note", status: "held" }),
      makeSec({ kind: "utility_check", status: "held" }),
      makeSec({ kind: "utility_check", status: "returned" }), // מוחזר - לא נספר
      makeSec({ kind: "cash_deposit", status: "held" }),      // פיקדון כספי - לא נייר
    ];
    expect(heldPaperCount(items)).toBe(3);
  });

  it("רשימה ריקה מחזירה 0", () => {
    expect(heldPaperCount([])).toBe(0);
  });
});
