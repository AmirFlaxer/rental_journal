// לוח תזכורות לחשבונות שירות של נכס (מים/גז/חשמל/ארנונה/ועד בית/אחר).
// חשבונות מוגדרים על הנכס (לא על החוזה) - עובד גם כשהנכס ריק (ארנונה/ועד).
// תזכורות וירטואליות בדפוס הקיים של generateVirtualCheckTasks: נוצרות מהקונפיג
// בכל טעינה, וסימון "בוצע" יוצר שורת tasks אמיתית שחוסמת את התקופה (dedup).

import { localMonthKey } from "./dates";

export type UtilityType =
  | "water"
  | "gas"
  | "electricity"
  | "municipal_tax"
  | "house_committee"
  | "other";

export type UtilityFrequency = "monthly" | "bimonthly";

export type UtilityResponsibility = "owner_pays" | "owner_forwards" | "tenant_pays";

export interface PropertyUtilityLike {
  id: string;
  property_id: string;
  property_title: string;
  type: UtilityType;
  custom_label?: string | null;
  frequency: UtilityFrequency;
  /** 1-12, רלוונטי רק ל-bimonthly - החודש שבו החשבון "נוחת" (מגדיר את זוגיות החלון) */
  anchor_month?: number | null;
  responsibility: UtilityResponsibility;
  active: boolean;
}

/** תזכורת קיימת ב-DB (אמיתית) - לצורך dedup מול תזכורות וירטואליות */
export interface DbTaskLike {
  category: string;
  related_entity_type?: string;
  related_entity_id?: string;
  /** YYYY-MM-DD */
  due_date: string;
  completed_at?: string;
}

/** תואם ל-interface Task בדף התזכורות (src/app/dashboard/tasks/page.tsx) */
export interface VirtualTask {
  id: string;
  title: string;
  description?: string;
  category: string;
  /** YYYY-MM-DD */
  due_date: string;
  priority: "low" | "normal" | "high";
  related_entity_type: string;
  related_entity_id: string;
  isVirtual: true;
}

/** מיפוי סוג חשבון לקטגוריית תזכורת קיימת (בלי שינוי enum הקטגוריות) */
export function mapUtilityCategory(type: UtilityType): string {
  switch (type) {
    case "water":
      return "Water";
    case "gas":
      return "Gas";
    case "electricity":
      return "Electricity";
    case "municipal_tax":
      return "Municipal Tax";
    case "house_committee":
      return "Other";
    case "other":
      return "Other";
  }
}

/** תווית עברית של סוג החשבון - ל-other/house_committee נופל ל-custom_label */
export function utilityTypeLabel(type: UtilityType, customLabel?: string | null): string {
  switch (type) {
    case "water":
      return "מים";
    case "gas":
      return "גז";
    case "electricity":
      return "חשמל";
    case "municipal_tax":
      return "ארנונה";
    case "house_committee":
      return "ועד בית";
    case "other":
      return customLabel?.trim() || "חשבון";
  }
}

/**
 * האם החשבון חל בתקופה (החודש) הנוכחית.
 * monthly - תמיד. bimonthly - רק כש-(currentMonth - anchor_month) זוגי (חלון דו-חודשי
 * שנוחת על anchor_month ואז כל חודשיים). אם anchor_month חסר - נחשב כתמיד חל (הערה
 * לבעל הנכס להשלים את החודש בעריכת הנכס נמצאת ב-UI, לא כאן).
 */
export function utilityAppliesThisPeriod(utility: PropertyUtilityLike, today: Date): boolean {
  if (utility.frequency === "monthly") return true;
  if (utility.anchor_month == null) return true;
  const currentMonth = today.getMonth() + 1; // 1-12 מקומי
  return Math.abs(currentMonth - utility.anchor_month) % 2 === 0;
}

/** מפתח התקופה הנוכחית - YYYY-MM מקומי */
export function currentUtilityPeriodKey(today: Date): string {
  return localMonthKey(today);
}

function utilityTitle(utility: PropertyUtilityLike, label: string): string {
  return utility.responsibility === "owner_forwards"
    ? `העברת חשבון ${label} לשוכר - ${utility.property_title}`
    : `תשלום ${label} - ${utility.property_title}`;
}

/**
 * מייצר תזכורות וירטואליות לחשבונות שירות שבאחריות המשכיר (owner_pays/owner_forwards),
 * פעילים, שחלים בתקופה הנוכחית ולא מכוסים ע"י task קיים ב-DB (גם אם מושלם).
 * dedup לפי utility.id + חודש נוכחי - גם מול dbTasks וגם בין חשבונות באותה ריצה.
 */
export function generateVirtualUtilityTasks(
  utilities: PropertyUtilityLike[],
  dbTasks: DbTaskLike[],
  today: Date
): VirtualTask[] {
  const monthKey = currentUtilityPeriodKey(today);
  const dueDate = `${monthKey}-01`;

  // מזהי חשבונות שכבר מכוסים ע"י task אמיתי לאותו חודש (גם מושלם - dedup)
  const covered = new Set<string>();
  for (const t of dbTasks) {
    if (
      t.related_entity_type === "property_utility" &&
      t.related_entity_id &&
      t.due_date.slice(0, 7) === monthKey
    ) {
      covered.add(t.related_entity_id);
    }
  }

  const virtual: VirtualTask[] = [];
  for (const utility of utilities) {
    if (!utility.active) continue;
    if (utility.responsibility === "tenant_pays") continue;
    if (!utilityAppliesThisPeriod(utility, today)) continue;
    if (covered.has(utility.id)) continue;

    const label = utilityTypeLabel(utility.type, utility.custom_label);
    virtual.push({
      id: `virtual-util-${utility.id}-${monthKey}`,
      title: utilityTitle(utility, label),
      category: mapUtilityCategory(utility.type),
      due_date: dueDate,
      priority: "normal",
      related_entity_type: "property_utility",
      related_entity_id: utility.id,
      isVirtual: true,
    });
    covered.add(utility.id); // dedup בין חשבונות באותה ריצה (למקרה של id כפול בקלט)
  }

  return virtual;
}
