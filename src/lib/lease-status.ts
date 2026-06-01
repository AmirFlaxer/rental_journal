// Helper שמחשב סטטוס חוזה אפקטיבי לפי תאריכים — לא סומך על שדה status בלבד.
// חוזים ישנים עלולים להישאר עם status="active" למרות שתאריך הסיום עבר.
// הנתונים לא נמחקים/מעודכנים (שמורים כהיסטוריה משפטית).

export type EffectiveLeaseStatus = "active" | "future" | "expired" | "ended";

interface LeaseForStatus {
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  start_date?: string | null;
  end_date?: string | null;
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
  const startStr = lease.startDate ?? lease.start_date;
  const endStr = lease.endDate ?? lease.end_date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (startStr && new Date(startStr) > today) return "future";
  if (endStr && new Date(endStr) < today) return "expired";
  return "active";
}

export function isLeaseCurrentlyActive(lease: LeaseForStatus): boolean {
  return effectiveLeaseStatus(lease) === "active";
}
