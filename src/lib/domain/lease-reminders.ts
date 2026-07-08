// תזכורת "סיום חוזה מתקרב" - וירטואלית, ללא נתון חדש בחוזה (מעוגנת ל-end_date).
// אותו דפוס וירטואלי כמו utility-schedule.ts / generateVirtualCheckTasks: נוצרת
// מהחוזה בכל טעינה, וסימון "בוצע" יוצר task אמיתי שחוסם את מחזור-הסיום הזה
// (הארכת חוזה = end_date חדש = מחזור חדש, לא נחסם ע"י הישן).

import { diffDays, localDateStr } from "./dates";

export interface LeaseLike {
  id: string;
  /** ISO - עשוי לכלול שעה */
  endDate: string;
  status?: string | null;
  properties?: { id: string; title: string } | null;
}

/** תזכורת קיימת ב-DB (אמיתית) - לצורך dedup מול תזכורות וירטואליות */
export interface DbTaskLike {
  category: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  /** YYYY-MM-DD */
  dueDate: string;
  completedAt?: string;
}

/** תואם ל-interface Task בדף התזכורות (src/app/dashboard/tasks/page.tsx) */
export interface VirtualTask {
  id: string;
  title: string;
  description?: string;
  category: string;
  /** YYYY-MM-DD */
  dueDate: string;
  priority: "low" | "normal" | "high";
  relatedEntityType: string;
  relatedEntityId: string;
  isVirtual: true;
}

/**
 * מייצר תזכורת "סיום חוזה מתקרב" לכל חוזה שאינו ended/paused, שנשארו לו
 * בין 0 ל-90 יום לסיום, ולא מכוסה ע"י task אמיתי (lease.id + end_date, גם מושלם).
 * הסלמת עדיפות: >75 יום - normal; 60-75 - high; <60 - high + "דחוף" בכותרת.
 */
export function generateVirtualLeaseRenewalTasks(
  leases: LeaseLike[],
  dbTasks: DbTaskLike[],
  today: Date
): VirtualTask[] {
  const todayIso = localDateStr(today);
  const virtual: VirtualTask[] = [];

  for (const lease of leases) {
    if (lease.status === "ended" || lease.status === "paused") continue;

    const endDateStr = lease.endDate.slice(0, 10);
    const daysToEnd = diffDays(endDateStr, todayIso);
    if (daysToEnd < 0 || daysToEnd > 90) continue;

    const covered = dbTasks.some(
      (t) =>
        t.relatedEntityType === "lease_renewal" &&
        t.relatedEntityId === lease.id &&
        t.dueDate.slice(0, 10) === endDateStr
    );
    if (covered) continue;

    const propertyTitle = lease.properties?.title ?? "נכס";
    const urgent = daysToEnd < 60;
    const priority: "normal" | "high" = daysToEnd > 75 ? "normal" : "high";

    virtual.push({
      id: `virtual-renewal-${lease.id}-${endDateStr}`,
      title: urgent
        ? `דחוף: סיום חוזה מתקרב - ${propertyTitle}`
        : `סיום חוזה מתקרב - ${propertyTitle}`,
      description: `מסתיים בעוד ${daysToEnd} ימים`,
      category: "Lease Renewal",
      dueDate: endDateStr,
      priority,
      relatedEntityType: "lease_renewal",
      relatedEntityId: lease.id,
      isVirtual: true,
    });
  }

  return virtual;
}
