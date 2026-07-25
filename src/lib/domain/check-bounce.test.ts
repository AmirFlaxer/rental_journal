import { describe, it, expect } from "vitest";
import {
  hasOpenBounce,
  bounceChainForPayment,
  bounceCountForLease,
  BOUNCE_REASON_LABELS,
  type CheckBounce,
} from "./check-bounce";

const BOUNCES: CheckBounce[] = [
  { id: "b2", payment_id: "p1", lease_id: "l1", bounced_at: "2026-08-02", reason: "restricted" },
  { id: "b1", payment_id: "p1", lease_id: "l1", bounced_at: "2026-07-08", reason: "nsf" },
  { id: "b3", payment_id: "p2", lease_id: "l1", bounced_at: "2026-09-15", reason: "nsf" },
  { id: "b4", payment_id: "p9", lease_id: "l2", bounced_at: "2026-05-01", reason: "other" },
];

describe("hasOpenBounce", () => {
  it("מזהה שק שחזר וטרם טופל", () => {
    expect(hasOpenBounce({ id: "p1", status: "pending" }, BOUNCES)).toBe(true);
  });

  it("מחזיר false אחרי שהשוכר שילם שוב", () => {
    expect(hasOpenBounce({ id: "p1", status: "paid" }, BOUNCES)).toBe(false);
  });

  it("מחזיר false לתקבול שמעולם לא חזר לו שק", () => {
    expect(hasOpenBounce({ id: "p5", status: "pending" }, BOUNCES)).toBe(false);
  });
});

describe("bounceChainForPayment", () => {
  it("מחזיר את השרשרת ממוינת מהישן לחדש", () => {
    const chain = bounceChainForPayment("p1", BOUNCES);
    expect(chain.map((b) => b.id)).toEqual(["b1", "b2"]);
  });

  it("מחזיר רשימה ריקה לתקבול בלי החזרות", () => {
    expect(bounceChainForPayment("p5", BOUNCES)).toEqual([]);
  });
});

describe("bounceCountForLease", () => {
  it("סופר אירועים ולא תקבולים - שתי החזרות באותו תקבול נספרות פעמיים", () => {
    expect(bounceCountForLease("l1", BOUNCES)).toBe(3);
  });

  it("מחזיר 0 לחוזה נקי", () => {
    expect(bounceCountForLease("l7", BOUNCES)).toBe(0);
  });
});

describe("BOUNCE_REASON_LABELS", () => {
  it("יש תווית עברית לכל סיבה", () => {
    expect(BOUNCE_REASON_LABELS.nsf).toBe('אכ"מ - אין כיסוי מספיק');
    expect(BOUNCE_REASON_LABELS.restricted).toBe("חשבון מוגבל");
    expect(BOUNCE_REASON_LABELS.cancelled).toBe("בוטל על ידי המושך");
    expect(BOUNCE_REASON_LABELS.other).toBe("אחר");
  });
});
