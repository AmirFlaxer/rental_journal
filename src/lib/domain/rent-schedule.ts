// לוח חיובי שכ"ד של חוזה - האלגוריתם המאוחד לכל התצוגות.
// מחליף ארבעה מימושים מקומיים שסטו זה מזה (payments, debts, dashboard, tasks)
// ואת הווידג'ט בדף נכס. כל התאריכים מחושבים מרכיבים מקומיים/טקסטואליים - בלי UTC.

import { isoDateParts, localDateStr } from "./dates";
import type { Lease } from "@/types/database";

export interface RentMonthSlot {
  /** YYYY-MM */
  monthKey: string;
  /** YYYY-MM-DD - יום החיוב בחודש (יום תחילת החוזה, מוצמד לסוף חודש קצר) */
  due_date: string;
}

export type LeaseLike = Pick<Lease, "start_date" | "end_date">;

/**
 * כל חודשי החיוב של חוזה: מחודש ההתחלה עד חודש הסיום.
 * יום החיוב = יום תחילת החוזה (או היום האחרון בחודש קצר יותר).
 * חודש שמועד החיוב שלו נופל אחרי תאריך סיום החוזה לא נכלל -
 * אין לחייב שכ"ד שמועדו אחרי שהחוזה הסתיים.
 */
export function listRentMonths(lease: LeaseLike): RentMonthSlot[] {
  const start = isoDateParts(lease.start_date);
  const end = isoDateParts(lease.end_date);
  const endDateStr = lease.end_date.slice(0, 10);
  const slots: RentMonthSlot[] = [];

  let year = start.year;
  let month = start.month; // 1-12
  while (year < end.year || (year === end.year && month <= end.month)) {
    const lastDay = new Date(year, month, 0).getDate();
    const day = Math.min(start.day, lastDay);
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;
    const due_date = `${monthKey}-${String(day).padStart(2, "0")}`;
    if (due_date <= endDateStr) slots.push({ monthKey, due_date });
    month++;
    if (month > 12) { month = 1; year++; }
  }
  return slots;
}

/** מפתח dedup אחיד: נכס+חודש (לא חוזה+חודש - שני חוזים לאותו נכס לא מכפילים חיוב) */
export function propertyMonthKey(propertyId: string, monthKey: string): string {
  return `${propertyId}-${monthKey}`;
}

export interface PaymentLike {
  payment_type: string;
  due_date: string;
  property?: { id: string } | null;
  property_id?: string | null;
}

/** קבוצת נכס+חודש המכוסים ע"י תקבולי שכ"ד קיימים (אמיתיים) */
export function coveredPropertyMonths(payments: PaymentLike[]): Set<string> {
  const covered = new Set<string>();
  for (const p of payments) {
    if (p.payment_type !== "Rent") continue;
    const propId = p.property?.id ?? p.property_id;
    if (propId && p.due_date) covered.add(propertyMonthKey(propId, p.due_date.slice(0, 7)));
  }
  return covered;
}

/** מחרוזת "היום" מקומית - לשימוש בהשוואות מחרוזת מול due_date */
export function todayStr(): string {
  return localDateStr();
}
