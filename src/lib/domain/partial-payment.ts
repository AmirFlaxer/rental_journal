// תשלום חלקי - הסכום ששולם בפועל חי בעמודת partial_paid_amount ב-DB.
// רשומות ישנות (לפני המיגרציה) קידדו אותו כטקסט בתוך notes בפורמט
// "__partial__:<amount>\n<reason>" - קידוד זה עדיין נתמך לקריאה (פענוח notes)
// לתאימות לאחור, אבל אינו נכתב עוד לרשומות חדשות.
// כל צרכן של "כמה באמת התקבל" חייב לעבור דרך getReceivedAmount - לא דרך
// amount/paidDate ישירות.

export function encodePartial(amount: number, reason: string): string {
  return `__partial__:${amount}\n${reason}`.trim();
}

export function parsePartialPaid(notes?: string | null): number | null {
  if (!notes) return null;
  const m = notes.match(/^__partial__:(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

export function parsePartialReason(notes?: string | null): string {
  if (!notes) return "";
  return notes.replace(/^__partial__:\d+(?:\.\d+)?\n?/, "").trim();
}

export interface ReceivedAmountInput {
  amount: number;
  status: string;
  paidDate?: string | null;
  notes?: string | null;
  /** עמודת ה-DB - מקור האמת לרשומות חדשות. undefined/null נופל חזרה לפענוח notes. */
  partialPaidAmount?: number | null;
}

/**
 * הסכום שהתקבל בפועל עבור תקבול:
 * paid - הסכום המלא; partial - עמודת partialPaidAmount, ואם היא ריקה (רשומה
 * ישנה) נופל חזרה לפענוח הקידוד ב-notes; אחרת - 0.
 * זה הבסיס הנכון למס אוטומטי, דוחות הכנסה ודוח מס - לא amount הגולמי.
 */
export function getReceivedAmount(p: ReceivedAmountInput): number {
  if (p.status === "paid") return p.amount;
  if (p.status === "partial") return p.partialPaidAmount ?? parsePartialPaid(p.notes) ?? 0;
  // fallback היסטורי: רשומות ישנות עם paidDate בלי status תקין
  if (p.paidDate && p.status !== "pending" && p.status !== "overdue") return p.amount;
  return 0;
}

/** יתרת החוב הפתוחה על תקבול */
export function getDebtAmount(p: ReceivedAmountInput): number {
  return Math.max(0, p.amount - getReceivedAmount(p));
}

/** האם התקבול שולם במלואו (רק אז סוגרים תזכורת שק, יוצרים מס מלא וכו') */
export function isFullyPaid(p: { status: string }): boolean {
  return p.status === "paid";
}
