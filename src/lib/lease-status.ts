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
  if (lease.status === "ended") return "ended";
  if (lease.status === "paused") return "ended";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startRaw = lease.startDate ?? lease.start_date;
  const endRaw = lease.endDate ?? lease.end_date;

  const start = startRaw ? new Date(startRaw) : null;
  const end = endRaw ? new Date(endRaw) : null;

  if (start && start > today) return "future";
  if (end && end < today) return "expired"; // status=active אבל תאריך עבר
  return "active";
}

export function isLeaseCurrentlyActive(lease: LeaseForStatus): boolean {
  return effectiveLeaseStatus(lease) === "active";
}
