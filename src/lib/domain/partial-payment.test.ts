import { describe, it, expect } from "vitest";
import {
  encodePartial,
  parsePartialPaid,
  parsePartialReason,
  getReceivedAmount,
  getDebtAmount,
} from "@/lib/domain/partial-payment";

describe("encodePartial / parsePartialPaid / parsePartialReason", () => {
  it("round-trip מלא, כולל סיבה רב-שורתית", () => {
    const reason = "שילם חלק בגלל עיכוב בעבודה\nהבטיח להשלים את היתרה בשבוע הבא";
    const encoded = encodePartial(1500, reason);

    expect(parsePartialPaid(encoded)).toBe(1500);
    expect(parsePartialReason(encoded)).toBe(reason);
  });

  it("parsePartialPaid על notes רגיל (שאינו מקודד) מחזיר null", () => {
    expect(parsePartialPaid("הערה רגילה בלי קידוד")).toBeNull();
    expect(parsePartialPaid(null)).toBeNull();
    expect(parsePartialPaid(undefined)).toBeNull();
  });
});

describe("getReceivedAmount", () => {
  it("paid - מחזיר את הסכום המלא", () => {
    expect(getReceivedAmount({ amount: 1000, status: "paid" })).toBe(1000);
  });

  it("partial עם קידוד תקין - מחזיר את הסכום המקודד", () => {
    const notes = encodePartial(400, "תשלום חלקי");
    expect(getReceivedAmount({ amount: 1000, status: "partial", notes })).toBe(400);
  });

  it("partial בלי קידוד - מחזיר 0", () => {
    expect(getReceivedAmount({ amount: 1000, status: "partial", notes: "משהו לא מקודד" })).toBe(0);
  });

  it("pending / overdue - מחזירים 0", () => {
    expect(getReceivedAmount({ amount: 1000, status: "pending" })).toBe(0);
    expect(getReceivedAmount({ amount: 1000, status: "overdue" })).toBe(0);
  });

  it("fallback היסטורי - status לא תקין עם paidDate מוגדר מחזיר את הסכום המלא", () => {
    expect(
      getReceivedAmount({ amount: 1000, status: "לא ידוע", paidDate: "2025-01-01" })
    ).toBe(1000);
  });
});

describe("getDebtAmount", () => {
  it("מחשב את יתרת החוב מתוך amount פחות הסכום שהתקבל", () => {
    const notes = encodePartial(400, "תשלום חלקי");
    expect(getDebtAmount({ amount: 1000, status: "partial", notes })).toBe(600);
  });

  it("תקבול ששולם במלואו - חוב 0", () => {
    expect(getDebtAmount({ amount: 1000, status: "paid" })).toBe(0);
  });

  it("לא-שלילי - אם הסכום שהתקבל (לפי הקידוד) גדול מ-amount, החוב נשאר 0", () => {
    const notes = encodePartial(1200, "תשלום ביתר");
    expect(getDebtAmount({ amount: 1000, status: "partial", notes })).toBe(0);
  });
});
