// עזרי תאריכים מקומיים - בלי toISOString, שמסיט יום/חודש אחורה ב-UTC+
// (מקור משפחת באגי ה-UTC המתועדים ב-SPEC).

/** מחרוזת YYYY-MM-DD מרכיבי תאריך מקומיים */
export function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** מחרוזת YYYY-MM מרכיבי תאריך מקומיים */
export function localMonthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * רכיבי תאריך מתוך מחרוזת ISO (למשל "2026-01-15" או "2026-01-15T00:00:00+00:00").
 * פרסור טקסטואלי ישיר - חסין לחלוטין לאזור זמן, בניגוד ל-new Date(iso).
 */
export function isoDateParts(iso: string): { year: number; month: number; day: number } {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return { year: y, month: m, day: d };
}

/** מפתח חודש (YYYY-MM) מתוך מחרוזת תאריך ISO - פרסור טקסטואלי, לא דרך Date */
export function isoMonthKey(iso: string): string {
  return iso.slice(0, 7);
}

/** הפרש ימים שלמים בין שני תאריכי ISO (חיובי אם a מאוחר מ-b) - השוואה בחצות UTC משני הצדדים */
export function diffDays(aIso: string, bIso: string): number {
  const a = Date.UTC(...toUtcArgs(aIso));
  const b = Date.UTC(...toUtcArgs(bIso));
  return Math.round((a - b) / 86400000);
}

function toUtcArgs(iso: string): [number, number, number] {
  const { year, month, day } = isoDateParts(iso);
  return [year, month - 1, day];
}
