// Helper שמחשב סטטוס חוזה אפקטיבי לפי תאריכים — לא סומך על שדה status בלבד.
// חוזים ישנים עלולים להישאר עם status="active" למרות שתאריך הסיום עבר.
// הנתונים לא נמחקים/מעודכנים (שמורים כהיסטוריה משפטית).

export type EffectiveLeaseStatus = "active" | "future" | "expired" | "ended";

// start_date/end_date חובה (required) בכוונה - בסכימה הם NOT NULL, וקורא שטרם
// הומר ל-snake_case (מעביר startDate/endDate) ייכשל בקומפילציה במקום להתדרדר
// בשקט ל"הכל active". status נשאר string רחב - הקוד משווה גם "ended"/"paused"
// ההיסטוריים שאינם ב-enum LeaseStatus המצומצם.
interface LeaseForStatus {
  status: string;
  start_date: string;
  end_date: string;
}

export function effectiveLeaseStatus(lease: LeaseForStatus): EffectiveLeaseStatus {
  if (lease.status === "terminated") return "ended";
  if (lease.status === "ended") return "ended";
  if (lease.status === "paused") return "ended";
  if (lease.status === "expired") return "expired";

  // status="active" (או לא מזוהה) — קובעים לפי תאריכים, לא לפי שדה ה-status:
  // ה-cron לא תמיד רץ (CRON_SECRET לא תמיד מוגדר), ולכן חוזים ישנים עלולים
  // להישאר status="active" אחרי שתוקפם פג. תאריך הסיום הוא מקור האמת.
  // הערה: תקבולים שנרשמו במפורש כ"ממתין" עדיין מוצגים כחוב — רק חודשים
  // שלא נרשמו כלל בחוזה שהסתיים מפסיקים להיווצר כחוב וירטואלי.
  // השוואת מחרוזות תאריך מקומיות - new Date("YYYY-MM-DD") מתפרש כחצות UTC,
  // וחוזה שמתחיל "היום" היה מוצג כ-future לאורך כל היום הראשון (Asia/Jerusalem, UTC+2/3)
  const startStr = lease.start_date;
  const endStr = lease.end_date;
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (startStr && startStr.slice(0, 10) > todayStr) return "future";
  if (endStr && endStr.slice(0, 10) < todayStr) return "expired";
  return "active";
}

export function isLeaseCurrentlyActive(lease: LeaseForStatus): boolean {
  return effectiveLeaseStatus(lease) === "active";
}
