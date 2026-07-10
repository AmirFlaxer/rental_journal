// תזרים חודשי - מקור אמת יחיד למספר-הגיבור בדשבורד.
// הכנסה = תקבולי שכירות ששולמו בחודש (דרך getReceivedAmount - מכבד תשלום חלקי);
// הוצאה = כל הוצאות החודש כולל מס אוטומטי (ולכן המספר הוא "אחרי מס").
import { getReceivedAmount, type ReceivedAmountInput } from "./partial-payment";

export interface CashflowPayment extends ReceivedAmountInput {
  payment_type: string;
  paid_date?: string | null;
}

export interface CashflowExpense {
  amount: number;
  date: string;
}

export function monthCashflow(
  payments: CashflowPayment[],
  expenses: CashflowExpense[],
  monthKey: string,
  uptoDay?: number
): number {
  // uptoDay: השוואת "עד אותו יום" - חותך את החודש עד היום הנתון (כולל).
  // תומך בתאריכי timestamptz מלאים מה-DB (slice ליום).
  const limit = uptoDay !== undefined ? `${monthKey}-${String(uptoDay).padStart(2, "0")}` : null;
  const inRange = (dateStr: string) =>
    dateStr.slice(0, 7) === monthKey && (limit === null || dateStr.slice(0, 10) <= limit);
  const income = payments
    .filter((p) => p.payment_type === "Rent" && p.paid_date && inRange(p.paid_date))
    .reduce((sum, p) => sum + getReceivedAmount(p), 0);
  const spent = expenses
    .filter((e) => e.date && inRange(e.date))
    .reduce((sum, e) => sum + e.amount, 0);
  return income - spent;
}

// אחוז שינוי מול חודש קודם; null כשאין בסיס השוואה חיובי (מסתירים את שורת המגמה)
export function cashflowTrendPct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
