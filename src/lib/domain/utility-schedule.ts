// לוח תזכורות לחשבונות שירות של נכס (מים/גז/חשמל/ארנונה/ועד בית/אחר).
// חשבונות מוגדרים על הנכס (לא על החוזה) - עובד גם כשהנכס ריק (ארנונה/ועד).
// תזכורות וירטואליות בדפוס הקיים של generateVirtualCheckTasks: נוצרות מהקונפיג
// בכל טעינה, וסימון "בוצע" יוצר שורת tasks אמיתית שחוסמת את התקופה (dedup).

import { localMonthKey } from "./dates";
import type { Task } from "@/types/database";

export type UtilityType =
  | "water"
  | "gas"
  | "electricity"
  | "municipal_tax"
  | "house_committee"
  | "insurance"
  | "other";

export type UtilityFrequency = "monthly" | "bimonthly" | "annual";

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
  /** 1-31, רלוונטי רק ל-annual - היום בחודש שבו החשבון מתחדש (למשל 31 ב-31.10) */
  anchor_day?: number | null;
  responsibility: UtilityResponsibility;
  active: boolean;
}

/** תזכורת קיימת ב-DB (אמיתית) - לצורך dedup מול תזכורות וירטואליות */
export type DbTaskLike = Pick<
  Task,
  "category" | "related_entity_type" | "related_entity_id" | "due_date" | "completed_at"
>;

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
  /** התזכורת נוצרה בגלל שהנכס ריק - מוצג כתגית במסך התזכורות */
  vacantProperty?: boolean;
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
    case "insurance":
      return "Insurance";
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
    case "insurance":
      return "ביטוח";
    case "other":
      return customLabel?.trim() || "חשבון";
  }
}

/**
 * האחריות בפועל, אחרי שקלול אכלוס. שני כללים:
 * ביטוח הוא תמיד על הבעלים (הוא מבטח את המבנה, לא את השוכר), וכשהנכס ריק אין
 * שוכר שישלם - ולכן גם חשבון שהוגדר tenant_pays חל על הבעלים. זה בדיוק המצב
 * שבו התזכורת הכי נחוצה, וקודם הוא היה המצב היחיד שבו היא לא נוצרה.
 */
export function effectiveResponsibility(
  utility: Pick<PropertyUtilityLike, "type" | "responsibility">,
  occupied: boolean
): UtilityResponsibility {
  if (utility.type === "insurance") return "owner_pays";
  return occupied ? utility.responsibility : "owner_pays";
}

/**
 * האם החשבון חל בחודש של התאריך שהועבר. הפרמטר הוא **חודש-יעד** ולא בהכרח היום:
 * המחולל מריץ אותו על כל חודש בחלון, ולכן אין כאן שימוש ב-new Date().
 * monthly - תמיד. bimonthly - כש-(חודש - anchor_month) זוגי. annual - רק בחודש
 * העוגן, ובלי חודש עוגן אינו חל בכלל (עדיף שלא תופיע תזכורת מאשר שתופיע בחודש
 * שרירותי; ה-UI אוכף את השדה בהגדרת ביטוח).
 */
export function utilityAppliesThisPeriod(utility: PropertyUtilityLike, monthDate: Date): boolean {
  const month = monthDate.getMonth() + 1; // 1-12 מקומי
  if (utility.frequency === "monthly") return true;
  if (utility.frequency === "annual") {
    if (utility.anchor_month == null) return false;
    return month === utility.anchor_month;
  }
  if (utility.anchor_month == null) return true;
  return Math.abs(month - utility.anchor_month) % 2 === 0;
}

/**
 * מועד התזכורת בתוך החודש. שנתי נופל על anchor_day (נחתך לאורך החודש - 31 בפברואר
 * הוא 28/29), שאר התדירויות על ה-1 כמו קודם.
 */
export function utilityDueDate(utility: PropertyUtilityLike, monthKey: string): string {
  if (utility.frequency !== "annual" || utility.anchor_day == null) return `${monthKey}-01`;
  const [year, month] = monthKey.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate(); // יום 0 של החודש הבא = היום האחרון
  const day = Math.min(Math.max(utility.anchor_day, 1), lastDay);
  return `${monthKey}-${String(day).padStart(2, "0")}`;
}

/** מפתח התקופה הנוכחית - YYYY-MM מקומי */
export function currentUtilityPeriodKey(today: Date): string {
  return localMonthKey(today);
}

/** מצב אכלוס של נכס, כפי שהקורא מרכיב אותו מהחוזים - המודול לא שולף כלום בעצמו */
export interface PropertyOccupancy {
  property_id: string;
  /** סוף החוזה הפעיל האחרון, אם הסתיים - YYYY-MM-DD */
  vacant_since?: string | null;
  /** תחילת החוזה הבא אם כבר נחתם - חוסם את האופק */
  next_lease_start?: string | null;
  /** האם יש חוזה פעיל היום */
  occupied: boolean;
}

/** מפתח חודש (YYYY-MM) מרכיבי שנה וחודש */
function monthKeyOf(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * החודשים שעבורם מיוצרות תזכורות לנכס.
 * מאוכלס (או בלי מידע) - החודש הנוכחי בלבד, כמו קודם.
 * ריק - מתחילת הריקות ועד min(31 בדצמבר של השנה הנוכחית, היום שלפני החוזה הבא).
 * האופק נקבע מול השנה של "היום", ולכן הוא מתגלגל מעצמו בכל 1 בינואר ואינו עולה
 * על שנה - זה מה שמונע את חזרת תזכורות-2049.
 */
export function utilityMonthWindow(
  occupancy: PropertyOccupancy | undefined,
  today: Date
): string[] {
  const currentKey = localMonthKey(today);
  if (!occupancy || occupancy.occupied) return [currentKey];

  // תחילת הריקות = max(סוף החוזה האחרון, תחילת החודש הנוכחי) - לא מייצרים לעבר
  const vacantKey = occupancy.vacant_since?.slice(0, 7);
  const startKey = vacantKey && vacantKey > currentKey ? vacantKey : currentKey;

  let endKey = monthKeyOf(today.getFullYear(), 12);
  if (occupancy.next_lease_start) {
    const [y, m, d] = occupancy.next_lease_start.slice(0, 10).split("-").map(Number);
    // חשבון אריתמטי ב-UTC על רכיבים מפורקים - חסין לאזור זמן
    const dayBefore = new Date(Date.UTC(y, m - 1, d));
    dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
    const blockedKey = monthKeyOf(dayBefore.getUTCFullYear(), dayBefore.getUTCMonth() + 1);
    if (blockedKey < endKey) endKey = blockedKey;
  }
  if (endKey < startKey) return [];

  const months: string[] = [];
  let [year, month] = startKey.split("-").map(Number);
  while (monthKeyOf(year, month) <= endKey) {
    months.push(monthKeyOf(year, month));
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

function utilityTitle(
  utility: PropertyUtilityLike,
  label: string,
  responsibility: UtilityResponsibility
): string {
  if (utility.type === "insurance") return `חידוש ביטוח - ${utility.property_title}`;
  return responsibility === "owner_forwards"
    ? `העברת חשבון ${label} לשוכר - ${utility.property_title}`
    : `תשלום ${label} - ${utility.property_title}`;
}

/**
 * מייצר תזכורות וירטואליות לחשבונות שבאחריות המשכיר **בפועל** (אחרי שקלול אכלוס),
 * פעילים, שחלים בחודש, ושאין להם משימה אמיתית ב-DB לאותו חודש (גם אם מושלמת).
 * נכס מאוכלס מקבל את החודש הנוכחי בלבד; נכס ריק מקבל את כל החלון עד האופק.
 * dedup לפי חשבון+חודש - גם מול dbTasks וגם בין חשבונות באותה ריצה.
 */
export function generateVirtualUtilityTasks(
  utilities: PropertyUtilityLike[],
  dbTasks: DbTaskLike[],
  today: Date,
  occupancies: PropertyOccupancy[]
): VirtualTask[] {
  const occupancyByProperty = new Map(occupancies.map((o) => [o.property_id, o]));

  // מפתחות "חשבון+חודש" שכבר מכוסים ע"י task אמיתי (גם מושלם - dedup)
  const covered = new Set<string>();
  for (const t of dbTasks) {
    if (t.related_entity_type === "property_utility" && t.related_entity_id) {
      covered.add(`${t.related_entity_id}|${t.due_date.slice(0, 7)}`);
    }
  }

  const virtual: VirtualTask[] = [];
  for (const utility of utilities) {
    if (!utility.active) continue;

    const occupancy = occupancyByProperty.get(utility.property_id);
    const occupied = occupancy ? occupancy.occupied : true;
    const responsibility = effectiveResponsibility(utility, occupied);
    if (responsibility === "tenant_pays") continue;

    const label = utilityTypeLabel(utility.type, utility.custom_label);
    const months = utilityMonthWindow(occupancy, today);
    // ביטוח (annual) בנכס מאוכלס מקבל בדרך-כלל רק את החודש הנוכחי (months הוא
    // מערך של איבר אחד), ולכן ברגע שחודש-העוגן חולף התזכורת נעלמת בלי זכר אם
    // לא סומנה - בניגוד לחודשי/דו-חודשי שנוצרים מחדש ממילא בכל חודש. מוסיפים
    // במפורש את חודש-העוגן של השנה הנוכחית כל עוד הוא לא עתידי, כדי שהתזכורת
    // תמשיך "לרדוף" עד שתסומן או שתיסגר ע"י משימת-DB אמיתית (ה-dedup הקיים
    // כבר דואג לזה). לא נוגעים בהתנהגות של חודשי/דו-חודשי (סקירת-ענף I1).
    if (utility.frequency === "annual" && utility.anchor_month != null) {
      const anchorKey = monthKeyOf(today.getFullYear(), utility.anchor_month);
      if (anchorKey <= localMonthKey(today) && !months.includes(anchorKey)) {
        months.push(anchorKey);
      }
    }
    for (const monthKey of months) {
      const [year, month] = monthKey.split("-").map(Number);
      if (!utilityAppliesThisPeriod(utility, new Date(year, month - 1, 1))) continue;

      const key = `${utility.id}|${monthKey}`;
      if (covered.has(key)) continue;
      covered.add(key);

      virtual.push({
        id: `virtual-util-${utility.id}-${monthKey}`,
        title: utilityTitle(utility, label, responsibility),
        category: mapUtilityCategory(utility.type),
        due_date: utilityDueDate(utility, monthKey),
        priority: "normal",
        related_entity_type: "property_utility",
        related_entity_id: utility.id,
        isVirtual: true,
        ...(occupied ? {} : { vacantProperty: true }),
      });
    }
  }

  return virtual;
}
