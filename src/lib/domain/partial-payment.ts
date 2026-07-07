// תשלום חלקי - קידוד/פענוח אחיד. הסכום ששולם בפועל מקודד ב-notes
// בפורמט "__partial__:<amount>\n<reason>". כל צרכן של "כמה באמת התקבל"
// חייב לעבור דרך getReceivedAmount - לא דרך amount/paidDate ישירות.

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
}

/**
 * הסכום שהתקבל בפועל עבור תקבול:
 * paid - הסכום המלא; partial - הסכום המקודד ב-notes; אחרת - 0.
 * זה הבסיס הנכון למס אוטומטי, דוחות הכנסה ודוח מס - לא amount הגולמי.
 */
export function getReceivedAmount(p: ReceivedAmountInput): number {
  if (p.status === "paid") return p.amount;
  if (p.status === "partial") return parsePartialPaid(p.notes) ?? 0;
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
