// אירועי החזרת שק. אירוע ולא סטטוס - שק חלופי שגם חוזר מוסיף שורה,
// והשרשרת המלאה נשמרת גם אחרי שהשוכר שילם שוב.
// ראו docs/superpowers/specs/2026-07-26-bounced-checks-design.md

export type BounceReason = "nsf" | "restricted" | "cancelled" | "other";

export interface CheckBounce {
  id: string;
  /** null אם התקבול נמחק - ההיסטוריה שורדת */
  payment_id: string | null;
  lease_id: string;
  /** YYYY-MM-DD */
  bounced_at: string;
  reason: BounceReason;
}

export const BOUNCE_REASON_LABELS: Record<BounceReason, string> = {
  nsf: 'אכ"מ - אין כיסוי מספיק',
  restricted: "חשבון מוגבל",
  cancelled: "בוטל על ידי המושך",
  other: "אחר",
};

/**
 * האם לתקבול יש שק שחזר וטרם טופל. מקבל את כל השורות ומסנן בעצמו לפי id.
 * "טופל" = השוכר שילם שוב, כלומר הסטטוס חזר ל-paid.
 */
export function hasOpenBounce(
  payment: { id: string; status: string },
  bounces: CheckBounce[]
): boolean {
  if (payment.status === "paid") return false;
  return bounces.some((b) => b.payment_id === payment.id);
}

/** שרשרת ההחזרות של תקבול, מהישן לחדש - זו התצוגה שמועברת לעורך דין */
export function bounceChainForPayment(paymentId: string, bounces: CheckBounce[]): CheckBounce[] {
  return bounces
    .filter((b) => b.payment_id === paymentId)
    .sort((a, b) => a.bounced_at.localeCompare(b.bounced_at));
}

/** אורך השרשרת בחוזה - סופר אירועים, לא תקבולים */
export function bounceCountForLease(leaseId: string, bounces: CheckBounce[]): number {
  return bounces.filter((b) => b.lease_id === leaseId).length;
}
