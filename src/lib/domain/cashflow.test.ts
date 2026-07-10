import { describe, it, expect } from "vitest";
import { monthCashflow, cashflowTrendPct } from "./cashflow";

const rent = (paid_date: string, amount: number, extra: object = {}) => ({
  payment_type: "Rent", status: "paid", paid_date, amount, ...extra,
});

describe("monthCashflow", () => {
  it("סוכם תקבולי שכירות ששולמו בחודש פחות הוצאות החודש", () => {
    const payments = [rent("2026-07-03", 5500), rent("2026-07-08", 7875), rent("2026-06-05", 5500)];
    const expenses = [{ amount: 550, date: "2026-07-03" }, { amount: 200, date: "2026-06-15" }];
    expect(monthCashflow(payments, expenses, "2026-07")).toBe(5500 + 7875 - 550);
  });

  it("תשלום חלקי נספר לפי הסכום שהתקבל בפועל", () => {
    const payments = [rent("2026-07-03", 5500, { status: "partial", partial_paid_amount: 2000 })];
    expect(monthCashflow(payments, [], "2026-07")).toBe(2000);
  });

  it("מתעלם מתקבולים שאינם שכירות ומתקבולים ללא paid_date", () => {
    const payments = [
      { payment_type: "Deposit", status: "paid", paid_date: "2026-07-01", amount: 10000 },
      rent("", 5500),
      { ...rent("2026-07-02", 4000), paid_date: null },
    ];
    expect(monthCashflow(payments as never, [], "2026-07")).toBe(0);
  });
});

describe("cashflowTrendPct", () => {
  it("מחשב אחוז שינוי מעוגל מול חודש קודם", () => {
    expect(cashflowTrendPct(12038, 11575)).toBe(4);
    expect(cashflowTrendPct(10000, 12500)).toBe(-20);
  });

  it("מחזיר null כשאין בסיס השוואה (חודש קודם אפס או שלילי)", () => {
    expect(cashflowTrendPct(5000, 0)).toBeNull();
    expect(cashflowTrendPct(5000, -100)).toBeNull();
  });
});
