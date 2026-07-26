# תוכנית מימוש: ביטוח שנתי, אחריות לפי אכלוס ואופק מתגלגל

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** תזכורות חשבונות השירות יכירו בביטוח שנתי, יעבירו את האחריות לבעלים כשהנכס ריק, ויוגבלו לאופק מתגלגל של שנה - כך שמחיקת 72 תזכורות-2049 הישנות תהפוך ממחיקת פיצ'ר למיגרציה.

**Architecture:** כל הלוגיקה מרוכזת ב-`src/lib/domain/utility-schedule.ts`, שהוא מודול טהור עם בדיקות-יחידה קיימות - הקורא (`tasks/page.tsx`) מספק נתונים, המודול לא שולף כלום בעצמו. שלוש פונקציות טהורות חדשות (`effectiveResponsibility`, `utilityDueDate`, `utilityMonthWindow`) נבדקות בנפרד, ואז `generateVirtualUtilityTasks` מרכיב אותן ומייצר על פני חלון חודשים במקום חודש בודד. ה-UI (עמוד הנכס, מסך התזכורות) הוא השכבה האחרונה ואינו מכיל לוגיקת-תאריכים.

**Tech Stack:** Next.js 16.2.1 (App Router), React 19, TypeScript, Tailwind v4, vitest (environment node), Supabase (postgres + RLS), @tanstack/react-query, @phosphor-icons/react.

**Spec:** [docs/superpowers/specs/2026-07-26-utility-reminders-design.md](../specs/2026-07-26-utility-reminders-design.md) - מאושר. אין להרחיב מעליו: סכומים כספיים, ראייה-קדימה לנכס מאוכלס ותזכורות-עזיבה הוצאו ממנו במפורש.

## Global Constraints

- **עברית בלבד** בכל טקסט שמוצג למשתמש, בכל הערה בקוד ובכל הודעת-commit.
- **מקף רגיל (`-`) ולא מקף ארוך**, בקוד ובתיעוד. **אין חצים** (`→`, `←`) בטקסט עברי - הם מתהפכים ב-RTL; להשתמש במילה ("לכן", "מ-X ל-Y") או בנקודתיים.
- **אין תווי-כיווניוּת בלתי-נראים** (RLM `U+200F`, LRM `U+200E`) בשום קובץ.
- **טבלאות Markdown בעברית** נעטפות ב-`<div dir="rtl" align="right">` עם שורה ריקה בין התגים לטבלה.
- **כל עמוד תחת `src/app/dashboard/` שמרנדר `Icon` חייב `"use client"`** - `tsc`/`lint`/`vitest` לא תופסים את זה, רק `npm run build`.
- **תאריכים:** אין `new Date().toISOString()` לגזירת יום קלנדרי. `localDateStr`/`localMonthKey` לתאריך-לקוח, `appDateStr`/`appNoonIso` (מ-`src/lib/domain/dates.ts`) כשהיום נקבע בצד השרת. שדות `timestamptz` מה-DB חייבים `.slice(0, 10)` לפני פירוק.
- **סדר פריסה:** המיגרציה של Task 1 חייבת לרוץ בפרודקשן **לפני** שהקוד שכותב `anchor_day` נפרס. Task 1 עוצר לאישור אמיר.
- **שערים לפני כל commit:** `npx vitest run` · `npm run lint` · `npx tsc --noEmit` · `npm run build`. שינוי UI מחייב בנוסף אימות ויזואלי לפי סקיל `verify` (Playwright, רוחב 390 ורוחב דסקטופ, אפס שגיאות-קונסולה).
- **צבעים סמנטיים:** הכנסות emerald · הוצאות rose · מס amber. תגית "נכס ריק" היא ניטרלית (אפור/`--text-3`), לא אזהרה.
- **אסור לגעת בנתונים היסטוריים.** מחיקת 72 השורות היא Task 7 בלבד, ורק באישור מפורש של אמיר בזמן הביצוע.
- **Next.js בגרסה הזו שונה ממה שאתה מכיר** (`AGENTS.md`): לפני כתיבת קוד שנוגע ב-API של הפריימוורק, לקרוא את המדריך הרלוונטי ב-`node_modules/next/dist/docs/`.

---

## מפת הקבצים

<div dir="rtl" align="right">

| קובץ | אחריות | מי נוגע בו |
|---|---|---|
| `supabase/migrations/20260726_utility_anchor_day.sql` | **חדש.** עמודת `anchor_day` | Task 1 |
| `src/types/database.ts` | `PropertyUtilityType` + `insurance`, `PropertyUtilityFrequency` + `annual` | Task 1 |
| `src/lib/validations.ts` | `propertyUtilitySchema` - enums חדשים + `anchor_day` | Task 1 |
| `src/lib/domain/utility-schedule.ts` | כל לוגיקת הלוח: טיפוסים, מיפויים, אחריות אפקטיבית, מועד, חלון, מחולל | Tasks 1-4 |
| `src/lib/domain/utility-schedule.test.ts` | בדיקות-היחידה של כל האמור לעיל | Tasks 1-4 |
| `src/app/dashboard/tasks/page.tsx` | מרכיב `PropertyOccupancy[]`, קורא למחולל, מרנדר תגית "נכס ריק" | Task 5 |
| `src/app/dashboard/properties/[id]/page.tsx` | טופס החשבון: סוג ביטוח, נעילת תדירות, תאריך חידוש | Task 6 |

</div>

**מה לא נוגעים בו:** `src/app/api/property-utilities/route.ts` - הוא מעביר את הגוף דרך `propertyUtilitySchema` ושומר, ולכן הרחבת הסכימה ב-Task 1 מספיקה. אין צורך בשינוי ראוט.

---

## Task 1: הרחבת המודל - `insurance`, `annual`, `anchor_day`

**Files:**
- Create: `supabase/migrations/20260726_utility_anchor_day.sql`
- Modify: `src/types/database.ts:31-38`
- Modify: `src/lib/validations.ts:131-139`
- Modify: `src/lib/domain/utility-schedule.ts:9-32` (טיפוסים), `:55-70` (`mapUtilityCategory`), `:73-88` (`utilityTypeLabel`)
- Test: `src/lib/domain/utility-schedule.test.ts`

**Interfaces:**
- Consumes: כלום - זו המשימה הראשונה.
- Produces: `UtilityType` כולל `"insurance"` · `UtilityFrequency` כולל `"annual"` · `PropertyUtilityLike.anchor_day?: number | null` · `mapUtilityCategory("insurance") === "Insurance"` · `utilityTypeLabel("insurance") === "ביטוח"`.

- [ ] **Step 1: כתיבת המיגרציה**

צור `supabase/migrations/20260726_utility_anchor_day.sql`:

```sql
-- עמודת anchor_day ל-property_utilities - יום החידוש בחודש, לתדירות annual.
-- לתדירות שנתית לא מספיק חודש-עוגן: ביטוח מתחדש בתאריך מלא (למשל 31.10),
-- ואילו anchor_month לבדו קובע רק את החודש.
-- nullable בכוונה: monthly/bimonthly נשארות מעוגנות ל-1 בחודש ולא משתמשות בעמודה.
-- ראו docs/superpowers/specs/2026-07-26-utility-reminders-design.md

ALTER TABLE property_utilities ADD COLUMN IF NOT EXISTS anchor_day int;

COMMENT ON COLUMN property_utilities.anchor_day IS
  'יום בחודש (1-31) לתדירות annual. null לשאר התדירויות.';
```

- [ ] **Step 2: עצירה - אמיר מריץ את המיגרציה**

אל תמשיך עד שאמיר מאשר שהמיגרציה רצה. להציג לו:

> 1. להיכנס ל-Supabase, לפרויקט, ולבחור **SQL Editor** בתפריט הצדדי.
> 2. ללחוץ **New query**.
> 3. להדביק את התוכן של `supabase/migrations/20260726_utility_anchor_day.sql` וללחוץ **Run**.
> 4. לאמת שהתשובה היא `Success. No rows returned`.
> 5. לכתוב לי "המיגרציה רצה".

הסיבה שזה עוצר כאן: הקוד ב-Task 6 כותב `anchor_day`, וכתיבה לעמודה שאינה קיימת נכשלת בפרודקשן. המיגרציה לפני הקוד, לא אחריו.

- [ ] **Step 3: כתיבת הבדיקה הנופלת**

הוסף ל-`src/lib/domain/utility-schedule.test.ts` (בסוף הקובץ):

```ts
describe("ביטוח כסוג חשבון", () => {
  it("ממופה לקטגוריה Insurance - זהה לתזכורות הישנות, כך שהמיגרציה עקבית", () => {
    expect(mapUtilityCategory("insurance")).toBe("Insurance");
  });

  it("תווית עברית: ביטוח", () => {
    expect(utilityTypeLabel("insurance")).toBe("ביטוח");
  });

  it("שאר הסוגים לא זזו", () => {
    expect(mapUtilityCategory("water")).toBe("Water");
    expect(utilityTypeLabel("municipal_tax")).toBe("ארנונה");
  });
});
```

עדכן את ה-import בראש הקובץ כך שיכלול את שתי הפונקציות:

```ts
import {
  utilityAppliesThisPeriod,
  generateVirtualUtilityTasks,
  mapUtilityCategory,
  utilityTypeLabel,
  type PropertyUtilityLike,
  type DbTaskLike,
} from "@/lib/domain/utility-schedule";
```

- [ ] **Step 4: הרצה כדי לוודא כשל**

Run: `npx vitest run src/lib/domain/utility-schedule.test.ts`
Expected: FAIL - `Argument of type '"insurance"' is not assignable to parameter of type 'UtilityType'` (או כשל השוואה על `"Insurance"`).

- [ ] **Step 5: הרחבת הטיפוסים ב-`utility-schedule.ts`**

ב-`src/lib/domain/utility-schedule.ts` החלף את שני הטיפוסים ואת השדה `anchor_day`:

```ts
export type UtilityType =
  | "water"
  | "gas"
  | "electricity"
  | "municipal_tax"
  | "house_committee"
  | "insurance"
  | "other";

export type UtilityFrequency = "monthly" | "bimonthly" | "annual";
```

בתוך `PropertyUtilityLike`, מתחת ל-`anchor_month`, הוסף:

```ts
  /** 1-31, רלוונטי רק ל-annual - היום בחודש שבו החשבון מתחדש (למשל 31 ב-31.10) */
  anchor_day?: number | null;
```

הוסף `case` ל-`mapUtilityCategory` (לפני `case "other"`):

```ts
    case "insurance":
      return "Insurance";
```

והוסף `case` ל-`utilityTypeLabel` (לפני `case "other"`):

```ts
    case "insurance":
      return "ביטוח";
```

- [ ] **Step 6: הרחבת הטיפוסים הגלובליים והוולידציה**

ב-`src/types/database.ts` החלף:

```ts
export type PropertyUtilityType =
  | "water"
  | "gas"
  | "electricity"
  | "municipal_tax"
  | "house_committee"
  | "insurance"
  | "other";
export type PropertyUtilityFrequency = "monthly" | "bimonthly" | "annual";
```

ב-`src/lib/validations.ts` החלף את `propertyUtilitySchema`:

```ts
export const propertyUtilitySchema = z.object({
  property_id: z.string().min(1, "Property is required"),
  type: z.enum(["water", "gas", "electricity", "municipal_tax", "house_committee", "insurance", "other"]),
  custom_label: z.string().nullish(),
  frequency: z.enum(["monthly", "bimonthly", "annual"]).default("monthly"),
  anchor_month: z.number().int().min(1).max(12).nullish(),
  // anchor_day נדרש בפועל רק ל-annual, וה-UI אוכף זאת. כאן nullish כדי לא לשבור
  // עדכון של חשבון חודשי קיים שאינו שולח את השדה בכלל.
  anchor_day: z.number().int().min(1).max(31).nullish(),
  responsibility: z.enum(["owner_pays", "owner_forwards", "tenant_pays"]).default("owner_pays"),
  active: z.boolean().optional(),
});
```

- [ ] **Step 7: הרצת הבדיקות והשערים**

Run: `npx vitest run` ואז `npx tsc --noEmit`
Expected: הבדיקות עוברות. `tsc` נקי - ואם הוא מתלונן על `switch` לא-ממצה במקום שלא נגעת בו, זה בדיוק מה שהוא צריך לעשות: לך לשם והוסף טיפול ב-`insurance` (בדוק `src/app/dashboard/properties/[id]/page.tsx` ו-`src/app/dashboard/tasks/page.tsx`).

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260726_utility_anchor_day.sql src/types/database.ts src/lib/validations.ts src/lib/domain/utility-schedule.ts src/lib/domain/utility-schedule.test.ts
git commit -m "feat(utilities): סוג חשבון ביטוח, תדירות שנתית ועמודת anchor_day

ביטוח מבנה מתחדש פעם בשנה ללא קשר לשוכר, ולא היה לו מקום במודל: UtilityType
לא הכיר בו ו-UtilityFrequency תמכה בחודשי ודו-חודשי בלבד. anchor_month לבדו
אינו מספיק לשנתי - חידוש הוא תאריך מלא (31.10), ולכן נוספה anchor_day.

המיגרציה הורצה בפרודקשן לפני הקומיט הזה."
```

---

## Task 2: `effectiveResponsibility` - האחריות עוברת לבעלים בנכס ריק

**Files:**
- Modify: `src/lib/domain/utility-schedule.ts` (פונקציה חדשה, אחרי `utilityTypeLabel`)
- Test: `src/lib/domain/utility-schedule.test.ts`

**Interfaces:**
- Consumes: `UtilityType`, `UtilityResponsibility` מ-Task 1.
- Produces: `effectiveResponsibility(utility: Pick<PropertyUtilityLike, "type" | "responsibility">, occupied: boolean): UtilityResponsibility`

- [ ] **Step 1: כתיבת הבדיקה הנופלת**

הוסף ל-`src/lib/domain/utility-schedule.test.ts`:

```ts
describe("effectiveResponsibility", () => {
  it("ביטוח תמיד על הבעלים - גם בנכס מאוכלס וגם אם הוגדר אחרת", () => {
    expect(effectiveResponsibility({ type: "insurance", responsibility: "tenant_pays" }, true)).toBe("owner_pays");
    expect(effectiveResponsibility({ type: "insurance", responsibility: "owner_forwards" }, true)).toBe("owner_pays");
    expect(effectiveResponsibility({ type: "insurance", responsibility: "owner_pays" }, false)).toBe("owner_pays");
  });

  it("נכס ריק - חשבון שהשוכר שילם ישירות עובר לבעלים", () => {
    expect(effectiveResponsibility({ type: "water", responsibility: "tenant_pays" }, false)).toBe("owner_pays");
    expect(effectiveResponsibility({ type: "electricity", responsibility: "owner_forwards" }, false)).toBe("owner_pays");
  });

  it("נכס מאוכלס - ההגדרה נשמרת כמו שהיא", () => {
    expect(effectiveResponsibility({ type: "water", responsibility: "tenant_pays" }, true)).toBe("tenant_pays");
    expect(effectiveResponsibility({ type: "water", responsibility: "owner_forwards" }, true)).toBe("owner_forwards");
    expect(effectiveResponsibility({ type: "municipal_tax", responsibility: "owner_pays" }, true)).toBe("owner_pays");
  });
});
```

הוסף `effectiveResponsibility` ל-import בראש הקובץ.

- [ ] **Step 2: הרצה כדי לוודא כשל**

Run: `npx vitest run src/lib/domain/utility-schedule.test.ts`
Expected: FAIL - `effectiveResponsibility is not a function` / שגיאת import.

- [ ] **Step 3: מימוש מינימלי**

הוסף ל-`src/lib/domain/utility-schedule.ts`:

```ts
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
```

- [ ] **Step 4: הרצה כדי לוודא הצלחה**

Run: `npx vitest run src/lib/domain/utility-schedule.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/utility-schedule.ts src/lib/domain/utility-schedule.test.ts
git commit -m "feat(utilities): effectiveResponsibility - אחריות אפקטיבית לפי אכלוס

פונקציה טהורה: ביטוח תמיד על הבעלים, ובנכס ריק גם חשבון tenant_pays עובר
לבעלים. עדיין לא בשימוש - המחולל יקרא לה ב-Task 4."
```

---

## Task 3: מועד וחלות - `annual` בחודש-העוגן ובתאריך שלו

**Files:**
- Modify: `src/lib/domain/utility-schedule.ts:96-101` (`utilityAppliesThisPeriod`), פונקציה חדשה `utilityDueDate`
- Test: `src/lib/domain/utility-schedule.test.ts`

**Interfaces:**
- Consumes: הטיפוסים מ-Task 1.
- Produces:
  - `utilityAppliesThisPeriod(utility: PropertyUtilityLike, monthDate: Date): boolean` - **הסמנטיקה מתרחבת:** "חל בחודש של התאריך שהועבר", ולא "חל בחודש הנוכחי". קריאה עם `new Date()` מתנהגת כמו קודם, ולכן הקוראים הקיימים לא נשברים.
  - `utilityDueDate(utility: PropertyUtilityLike, monthKey: string): string` - `YYYY-MM-DD`.

- [ ] **Step 1: כתיבת הבדיקה הנופלת**

הוסף ל-`src/lib/domain/utility-schedule.test.ts`:

```ts
describe("utilityAppliesThisPeriod - תדירות שנתית", () => {
  it("חל רק בחודש העוגן", () => {
    const insurance = makeUtility({ type: "insurance", frequency: "annual", anchor_month: 10, anchor_day: 31 });
    expect(utilityAppliesThisPeriod(insurance, new Date(2026, 9, 1))).toBe(true); // אוקטובר
    expect(utilityAppliesThisPeriod(insurance, new Date(2026, 8, 1))).toBe(false); // ספטמבר
    expect(utilityAppliesThisPeriod(insurance, new Date(2027, 9, 1))).toBe(true); // אוקטובר בשנה הבאה
  });

  it("בלי חודש עוגן אינו חל בכלל - לא ממציא מועד חידוש שרירותי", () => {
    const insurance = makeUtility({ type: "insurance", frequency: "annual", anchor_month: null });
    expect(utilityAppliesThisPeriod(insurance, new Date(2026, 9, 1))).toBe(false);
  });

  it("חודשי ודו-חודשי לא השתנו, והחודש נלקח מהתאריך שהועבר ולא מ'היום'", () => {
    expect(utilityAppliesThisPeriod(makeUtility({ frequency: "monthly" }), new Date(2026, 2, 1))).toBe(true);
    const bimonthly = makeUtility({ frequency: "bimonthly", anchor_month: 7 });
    expect(utilityAppliesThisPeriod(bimonthly, new Date(2026, 6, 1))).toBe(true);  // יולי
    expect(utilityAppliesThisPeriod(bimonthly, new Date(2026, 7, 1))).toBe(false); // אוגוסט
    expect(utilityAppliesThisPeriod(bimonthly, new Date(2026, 8, 1))).toBe(true);  // ספטמבר
  });
});

describe("utilityDueDate", () => {
  it("שנתי - היום בחודש הוא anchor_day", () => {
    const insurance = makeUtility({ type: "insurance", frequency: "annual", anchor_month: 10, anchor_day: 31 });
    expect(utilityDueDate(insurance, "2026-10")).toBe("2026-10-31");
  });

  it("שנתי - יום שלא קיים בחודש נחתך לסוף החודש", () => {
    const insurance = makeUtility({ type: "insurance", frequency: "annual", anchor_month: 2, anchor_day: 31 });
    expect(utilityDueDate(insurance, "2026-02")).toBe("2026-02-28");
    expect(utilityDueDate(insurance, "2028-02")).toBe("2028-02-29"); // שנה מעוברת
  });

  it("שנתי בלי anchor_day נופל ל-1 בחודש", () => {
    const insurance = makeUtility({ type: "insurance", frequency: "annual", anchor_month: 10, anchor_day: null });
    expect(utilityDueDate(insurance, "2026-10")).toBe("2026-10-01");
  });

  it("חודשי ודו-חודשי תמיד ה-1 בחודש", () => {
    expect(utilityDueDate(makeUtility({ frequency: "monthly" }), "2026-07")).toBe("2026-07-01");
    expect(utilityDueDate(makeUtility({ frequency: "bimonthly", anchor_month: 7 }), "2026-07")).toBe("2026-07-01");
  });
});
```

עדכן את `makeUtility` בקובץ הבדיקות כך שיכלול `anchor_day: null` בברירת המחדל, והוסף `utilityDueDate` ל-import.

- [ ] **Step 2: הרצה כדי לוודא כשל**

Run: `npx vitest run src/lib/domain/utility-schedule.test.ts`
Expected: FAIL - `utilityDueDate is not a function`, ובדיקת ה-annual נכשלת כי הפונקציה הקיימת מחזירה `true` לכל חודש (היא מטפלת רק ב-`monthly`/`bimonthly`).

- [ ] **Step 3: מימוש מינימלי**

החלף את `utilityAppliesThisPeriod` ב-`src/lib/domain/utility-schedule.ts`:

```ts
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
```

- [ ] **Step 4: הרצה כדי לוודא הצלחה**

Run: `npx vitest run src/lib/domain/utility-schedule.test.ts`
Expected: PASS - כולל הבדיקות הקיימות של `utilityAppliesThisPeriod` (הן העבירו `today` ולכן ממשיכות לעבוד).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/utility-schedule.ts src/lib/domain/utility-schedule.test.ts
git commit -m "feat(utilities): חלות ומועד לתדירות שנתית

utilityAppliesThisPeriod מקבל חודש-יעד (הסמנטיקה התרחבה מ'החודש הנוכחי' ל'חודש
התאריך שהועבר', כדי שהמחולל יוכל להריץ אותו על חלון חודשים) ומטפל ב-annual: חל
רק בחודש העוגן, ובלי חודש עוגן אינו חל בכלל.

utilityDueDate חדש: שנתי נופל על anchor_day עם חיתוך לאורך החודש (31 בפברואר הוא
28, ובשנה מעוברת 29), שאר התדירויות על ה-1."
```

---

## Task 4: אופק מתגלגל - `utilityMonthWindow` והמחולל

**Files:**
- Modify: `src/lib/domain/utility-schedule.ts` (טיפוס `PropertyOccupancy`, `utilityMonthWindow`, `VirtualTask`, `utilityTitle`, `generateVirtualUtilityTasks`)
- Test: `src/lib/domain/utility-schedule.test.ts`

**Interfaces:**
- Consumes: `effectiveResponsibility` (Task 2), `utilityAppliesThisPeriod` + `utilityDueDate` (Task 3).
- Produces:
  - `PropertyOccupancy { property_id: string; vacant_since?: string | null; next_lease_start?: string | null; occupied: boolean }`
  - `utilityMonthWindow(occupancy: PropertyOccupancy | undefined, today: Date): string[]` - מפתחות `YYYY-MM`.
  - `VirtualTask` עם שדה נוסף `vacantProperty?: boolean`.
  - `generateVirtualUtilityTasks(utilities, dbTasks, today, occupancies: PropertyOccupancy[]): VirtualTask[]` - **הפרמטר הרביעי חובה** (בכוונה: ברירת-מחדל הייתה משמרת בשקט את ההתנהגות הישנה אצל קורא ששכח לעדכן).

- [ ] **Step 1: כתיבת הבדיקה הנופלת - החלון**

הוסף ל-`src/lib/domain/utility-schedule.test.ts`:

```ts
describe("utilityMonthWindow", () => {
  it("נכס מאוכלס - החודש הנוכחי בלבד", () => {
    const window = utilityMonthWindow({ property_id: "p1", occupied: true }, FIXED_TODAY);
    expect(window).toEqual(["2026-07"]);
  });

  it("נכס בלי מידע אכלוס מתנהג כמאוכלס - ברירת מחדל שמרנית", () => {
    expect(utilityMonthWindow(undefined, FIXED_TODAY)).toEqual(["2026-07"]);
  });

  it("נכס ריק - מהחודש הנוכחי ועד סוף השנה הקלנדרית", () => {
    const window = utilityMonthWindow(
      { property_id: "p1", occupied: false, vacant_since: "2026-05-31" },
      FIXED_TODAY
    );
    expect(window).toEqual(["2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"]);
  });

  it("חוזה הבא חוסם את האופק - עד היום שלפני תחילתו", () => {
    const window = utilityMonthWindow(
      { property_id: "p1", occupied: false, vacant_since: "2026-06-30", next_lease_start: "2026-09-01" },
      FIXED_TODAY
    );
    expect(window).toEqual(["2026-07", "2026-08"]);
  });

  it("חוזה הבא שמתחיל באמצע חודש - אותו חודש עדיין נכלל", () => {
    const window = utilityMonthWindow(
      { property_id: "p1", occupied: false, next_lease_start: "2026-09-15" },
      FIXED_TODAY
    );
    expect(window).toEqual(["2026-07", "2026-08", "2026-09"]);
  });

  it("חוזה הבא שמתחיל החודש - חלון ריק", () => {
    const window = utilityMonthWindow(
      { property_id: "p1", occupied: false, next_lease_start: "2026-07-01" },
      FIXED_TODAY
    );
    expect(window).toEqual([]);
  });

  it("האופק מתגלגל: ריצה ב-1 בינואר מייצרת עד סוף השנה החדשה ולא מעבר", () => {
    const window = utilityMonthWindow(
      { property_id: "p1", occupied: false, vacant_since: "2025-11-30" },
      new Date(2027, 0, 1)
    );
    expect(window).toHaveLength(12);
    expect(window[0]).toBe("2027-01");
    expect(window[11]).toBe("2027-12");
  });
});
```

- [ ] **Step 2: הרצה כדי לוודא כשל**

Run: `npx vitest run src/lib/domain/utility-schedule.test.ts`
Expected: FAIL - `utilityMonthWindow is not a function`.

- [ ] **Step 3: מימוש החלון**

הוסף ל-`src/lib/domain/utility-schedule.ts` (מתחת ל-`currentUtilityPeriodKey`):

```ts
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
```

- [ ] **Step 4: הרצה כדי לוודא הצלחה**

Run: `npx vitest run src/lib/domain/utility-schedule.test.ts -t utilityMonthWindow`
Expected: PASS (7 בדיקות).

- [ ] **Step 5: כתיבת הבדיקה הנופלת - המחולל**

הוסף ל-`src/lib/domain/utility-schedule.test.ts`:

```ts
describe("generateVirtualUtilityTasks - אכלוס וחלון", () => {
  const occupied = (id: string): PropertyOccupancy => ({ property_id: id, occupied: true });
  const vacant = (id: string, extra: Partial<PropertyOccupancy> = {}): PropertyOccupancy => ({
    property_id: id,
    occupied: false,
    ...extra,
  });

  it("חשבון tenant_pays מייצר תזכורת בנכס ריק", () => {
    const util = makeUtility({ responsibility: "tenant_pays" });
    const result = generateVirtualUtilityTasks([util], [], FIXED_TODAY, [vacant("p1")]);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].title).toBe("תשלום מים - רוטשילד 1");
    expect(result[0].vacantProperty).toBe(true);
  });

  it("חשבון tenant_pays אינו מייצר תזכורת בנכס מאוכלס", () => {
    const util = makeUtility({ responsibility: "tenant_pays" });
    expect(generateVirtualUtilityTasks([util], [], FIXED_TODAY, [occupied("p1")])).toEqual([]);
  });

  it("נכס מאוכלס - חודש נוכחי בלבד, וללא תגית נכס ריק", () => {
    const util = makeUtility({ responsibility: "owner_pays" });
    const result = generateVirtualUtilityTasks([util], [], FIXED_TODAY, [occupied("p1")]);
    expect(result).toHaveLength(1);
    expect(result[0].due_date).toBe("2026-07-01");
    expect(result[0].vacantProperty).toBeFalsy();
  });

  it("נכס ריק - חשבון חודשי מייצר תזכורת לכל חודש עד סוף השנה", () => {
    const util = makeUtility({ responsibility: "owner_pays", frequency: "monthly" });
    const result = generateVirtualUtilityTasks([util], [], FIXED_TODAY, [vacant("p1")]);
    expect(result.map((t) => t.due_date)).toEqual([
      "2026-07-01", "2026-08-01", "2026-09-01", "2026-10-01", "2026-11-01", "2026-12-01",
    ]);
  });

  it("ביטוח שנתי - תזכורת אחת בחודש העוגן ובתאריך החידוש", () => {
    const insurance = makeUtility({
      type: "insurance", frequency: "annual", anchor_month: 10, anchor_day: 31,
      responsibility: "owner_pays",
    });
    const result = generateVirtualUtilityTasks([insurance], [], FIXED_TODAY, [vacant("p1")]);
    expect(result).toHaveLength(1);
    expect(result[0].due_date).toBe("2026-10-31");
    expect(result[0].title).toBe("חידוש ביטוח - רוטשילד 1");
    expect(result[0].category).toBe("Insurance");
  });

  it("ביטוח מיוצר גם בנכס מאוכלס אם חודש העוגן הוא החודש הנוכחי", () => {
    const insurance = makeUtility({
      type: "insurance", frequency: "annual", anchor_month: 7, anchor_day: 15,
      responsibility: "tenant_pays",
    });
    const result = generateVirtualUtilityTasks([insurance], [], FIXED_TODAY, [occupied("p1")]);
    expect(result).toHaveLength(1);
    expect(result[0].due_date).toBe("2026-07-15");
  });

  it("dedup - משימה אמיתית חוסמת את החודש שלה בלבד", () => {
    const util = makeUtility({ responsibility: "owner_pays", frequency: "monthly" });
    const dbTasks: DbTaskLike[] = [
      {
        category: "Water",
        related_entity_type: "property_utility",
        related_entity_id: "u1",
        due_date: "2026-09-01",
        completed_at: "2026-09-02",
      },
    ];
    const result = generateVirtualUtilityTasks([util], dbTasks, FIXED_TODAY, [vacant("p1")]);
    const months = result.map((t) => t.due_date.slice(0, 7));
    expect(months).not.toContain("2026-09");
    expect(months).toContain("2026-08");
    expect(months).toContain("2026-10");
  });

  it("החוזה הבא חוסם את זנב החלון", () => {
    const util = makeUtility({ responsibility: "owner_pays", frequency: "monthly" });
    const result = generateVirtualUtilityTasks([util], [], FIXED_TODAY, [
      vacant("p1", { next_lease_start: "2026-09-01" }),
    ]);
    expect(result.map((t) => t.due_date)).toEqual(["2026-07-01", "2026-08-01"]);
  });

  it("מזהי התזכורות ייחודיים לכל חודש - אחרת React מתלונן על key כפול", () => {
    const util = makeUtility({ responsibility: "owner_pays", frequency: "monthly" });
    const result = generateVirtualUtilityTasks([util], [], FIXED_TODAY, [vacant("p1")]);
    expect(new Set(result.map((t) => t.id)).size).toBe(result.length);
  });

  it("חשבון לא פעיל אינו מייצר כלום גם בנכס ריק", () => {
    const util = makeUtility({ active: false, responsibility: "tenant_pays" });
    expect(generateVirtualUtilityTasks([util], [], FIXED_TODAY, [vacant("p1")])).toEqual([]);
  });
});
```

הוסף `utilityMonthWindow` ו-`type PropertyOccupancy` ל-import בראש הקובץ.

**חשוב:** הבדיקות הקיימות של `generateVirtualUtilityTasks` בקובץ קוראות לה עם שלושה פרמטרים ויישברו ב-`tsc`. עדכן כל אחת מהן להעביר פרמטר רביעי `[{ property_id: "p1", occupied: true }]` - כלומר לשמר את התנהגות "נכס מאוכלס" שהן נכתבו עבורה.

- [ ] **Step 6: הרצה כדי לוודא כשל**

Run: `npx vitest run src/lib/domain/utility-schedule.test.ts`
Expected: FAIL - `Expected 3 arguments, but got 4` / `vacantProperty` אינו קיים על הטיפוס.

- [ ] **Step 7: מימוש המחולל**

ב-`src/lib/domain/utility-schedule.ts`, הוסף שדה ל-`VirtualTask`:

```ts
  isVirtual: true;
  /** התזכורת נוצרה בגלל שהנכס ריק - מוצג כתגית במסך התזכורות */
  vacantProperty?: boolean;
```

החלף את `utilityTitle` כך שיקבל אחריות אפקטיבית ויכיר בביטוח:

```ts
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
```

והחלף את `generateVirtualUtilityTasks` במלואה:

```ts
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
    for (const monthKey of utilityMonthWindow(occupancy, today)) {
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
```

- [ ] **Step 8: הרצת כל הבדיקות**

Run: `npx vitest run` ואז `npx tsc --noEmit`
Expected: הבדיקות עוברות. `tsc` **ייכשל** ב-`src/app/dashboard/tasks/page.tsx` - הקורא מעביר שלושה פרמטרים. זה מכוון; Task 5 מתקן אותו.

- [ ] **Step 9: Commit**

```bash
git add src/lib/domain/utility-schedule.ts src/lib/domain/utility-schedule.test.ts
git commit -m "feat(utilities): אופק מתגלגל ומחולל מודע-אכלוס

utilityMonthWindow: נכס מאוכלס מקבל את החודש הנוכחי בלבד כמו קודם, ונכס ריק מקבל
מתחילת הריקות ועד min(31 בדצמבר, יום לפני החוזה הבא). האופק נמדד מול שנת 'היום'
ולכן מתגלגל מעצמו ב-1 בינואר ולא עולה על שנה - זה מה שמונע את חזרת תזכורות-2049.

generateVirtualUtilityTasks מקבל occupancies כפרמטר רביעי חובה (לא ברירת-מחדל:
כזו הייתה משמרת בשקט את ההתנהגות הישנה אצל קורא ששכח לעדכן), מייצר על פני חלון
חודשים, ומסמן vacantProperty. dedup עבר מ'חשבון' ל'חשבון+חודש'.

tsc נכשל כרגע ב-tasks/page.tsx במכוון - הקורא מעודכן במשימה הבאה."
```

---

## Task 5: חיבור מסך התזכורות

**Files:**
- Modify: `src/app/dashboard/tasks/page.tsx` - import, `interface Task`, `PropertyUtilityRow`, `occupancies`, הקריאה למחולל, רינדור התגית
- Test: אין בדיקת-יחידה (רכיב) - האימות הוא `npm run build` + Playwright ב-Task 7

**Interfaces:**
- Consumes: `generateVirtualUtilityTasks(utilities, dbTasks, today, occupancies)`, `type PropertyOccupancy` (Task 4).
- Produces: מסך תזכורות שמציג תזכורות של נכס ריק עם תגית `נכס ריק`.

- [ ] **Step 1: הרחבת הטיפוסים המקומיים בדף**

ב-`src/app/dashboard/tasks/page.tsx`:

הוסף לתוך `interface Task` (ליד `isVirtual?: boolean`):

```ts
  vacantProperty?: boolean;
```

הוסף לתוך `interface PropertyUtilityRow` (ליד `anchor_month`):

```ts
  anchor_day?: number | null;
```

עדכן את ה-import של המודול:

```ts
import { generateVirtualUtilityTasks, type PropertyUtilityLike, type PropertyOccupancy } from "@/lib/domain/utility-schedule";
```

והוסף import לחישוב חוזה פעיל:

```ts
import { isLeaseCurrentlyActive } from "@/lib/lease-status";
```

- [ ] **Step 2: הרכבת `PropertyOccupancy[]`**

הוסף מיד **לפני** `const virtualUtility = useMemo(...)`:

```ts
  // מצב האכלוס של כל נכס, מהחוזים שכבר נטענים בדף - בדפוס של utilitiesWithTitle.
  // status ?? "active" כי בטיפוס המקומי הוא אופציונלי, ו-isLeaseCurrentlyActive
  // דורש מחרוזת; חוזה בלי status נבדק לפי תאריכים וזו ההתנהגות הרצויה.
  const occupancies: PropertyOccupancy[] = useMemo(() => {
    const leasesByProperty = new Map<string, Lease[]>();
    for (const lease of leases) {
      const propertyId = lease.properties?.id;
      if (!propertyId) continue;
      const list = leasesByProperty.get(propertyId);
      if (list) list.push(lease);
      else leasesByProperty.set(propertyId, [lease]);
    }

    const todayIso = todayStr();
    return properties.map((property) => {
      const propertyLeases = leasesByProperty.get(property.id) ?? [];
      const occupied = propertyLeases.some((l) =>
        isLeaseCurrentlyActive({ status: l.status ?? "active", start_date: l.start_date, end_date: l.end_date })
      );

      // סוף החוזה האחרון שהסתיים - תחילת הריקות
      const endedDates = propertyLeases
        .map((l) => l.end_date.slice(0, 10))
        .filter((end) => end < todayIso)
        .sort();
      // תחילת החוזה הבא שטרם התחיל - חוסם את האופק
      const futureStarts = propertyLeases
        .map((l) => l.start_date.slice(0, 10))
        .filter((start) => start > todayIso)
        .sort();

      return {
        property_id: property.id,
        occupied,
        vacant_since: endedDates.length ? endedDates[endedDates.length - 1] : null,
        next_lease_start: futureStarts.length ? futureStarts[0] : null,
      };
    });
  }, [leases, properties]);
```

- [ ] **Step 3: העברת האכלוס למחולל**

החלף את הקריאה הקיימת:

```ts
  const virtualUtility = useMemo(
    () => generateVirtualUtilityTasks(utilitiesWithTitle, dbTasks, new Date(), occupancies),
    [utilitiesWithTitle, dbTasks, occupancies]
  );
```

- [ ] **Step 4: הרצת `tsc` כדי לוודא שהכשל המכוון נסגר**

Run: `npx tsc --noEmit`
Expected: נקי. אם הוא מתלונן ש-`Lease` אינו מוגדר בהיקף הזה, ודא שאתה משתמש ב-`interface Lease` המקומי של הדף (שורה 107) ולא מייבא טיפוס אחר.

- [ ] **Step 5: רינדור תגית "נכס ריק"**

מצא את המקום שבו כרטיס תזכורת מרנדר את שורת-המטא שלו (חפש את הביטוי `isVirtual` בתוך ה-JSX של כרטיס המשימה). הוסף שם, אחרי סימון "וירטואלי" הקיים:

```tsx
{task.vacantProperty && (
  <span
    className="px-1.5 py-0.5 rounded text-xs font-semibold whitespace-nowrap"
    style={{ background: "var(--bg-elevated)", color: "var(--text-3)", border: "1px solid var(--border)" }}
  >
    נכס ריק
  </span>
)}
```

התגית ניטרלית ולא אזהרה - היא מסבירה **למה** החשבון חל על אמיר ולא על השוכר. אין להשתמש ב-rose/amber שמסומנים סמנטית להוצאות ולמס.

- [ ] **Step 6: שערים מלאים**

Run: `npx vitest run && npm run lint && npx tsc --noEmit && npm run build`
Expected: הכל עובר. `npm run build` הוא הגייט היחיד שתופס בעיית גבול-client, ולכן אין לדלג עליו.

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/tasks/page.tsx
git commit -m "feat(tasks): תזכורות חשבונות לנכס ריק, עם תגית נכס ריק

המסך מרכיב PropertyOccupancy לכל נכס מהחוזים שהוא כבר טוען (מאוכלס לפי
isLeaseCurrentlyActive, תחילת ריקות מסוף החוזה האחרון שהסתיים, וחוזה הבא
מהחוזה הקרוב שטרם התחיל) ומעביר אותו למחולל.

התוצאה: נכס ריק מציג את החשבונות שיחולו על הבעלים עד סוף השנה - כולל אלה
שהוגדרו tenant_pays ושהמסך דילג עליהם לגמרי עד היום."
```

---

## Task 6: טופס החשבון בעמוד הנכס

**Files:**
- Modify: `src/app/dashboard/properties/[id]/page.tsx` - `UTILITY_TYPE_OPTIONS`, טיפוס הטופס, `utilityForm`, בורר התדירות, שדה תאריך החידוש, שורת התצוגה ברשימה
- Test: אין בדיקת-יחידה - אימות ויזואלי ב-Task 7

**Interfaces:**
- Consumes: `PropertyUtilityType` כולל `"insurance"`, `PropertyUtilityFrequency` כולל `"annual"` (Task 1).
- Produces: שמירה של `type: "insurance"`, `frequency: "annual"`, `anchor_month`, `anchor_day`.

- [ ] **Step 1: הוספת ביטוח לבורר הסוגים**

ב-`src/app/dashboard/properties/[id]/page.tsx`, הוסף ל-`UTILITY_TYPE_OPTIONS` (שורה 35) פריט לפני `other`:

```ts
  { value: "insurance", label: "ביטוח", icon: "insurance" },
```

השם הלוגי `insurance` **כבר קיים** ב-`src/lib/icons.ts` (אומת בזמן כתיבת התוכנית) - אין להוסיף אייקון חדש למפה. `UTILITY_TYPE_OPTIONS` מוטבע-טיפוס, ולכן טעות-הקלדה בשם תיפול ב-`tsc`.

- [ ] **Step 2: הוספת `anchorDay` למצב הטופס**

מצא את הטיפוס של `utilityForm` (סביב שורה 109) והוסף שדה:

```ts
  anchorDay: number;
```

עדכן את שתי נקודות האתחול:

בפתיחת טופס חדש (סביב שורה 421, שם יש `frequency: "monthly"`) הוסף:

```ts
      anchorDay: new Date().getDate(),
```

בפתיחת טופס עריכה (סביב שורה 434, שם יש `anchorMonth: u.anchor_month ?? ...`) הוסף:

```ts
      anchorDay: u.anchor_day ?? 1,
```

- [ ] **Step 3: שמירה - `anchor_day` נשלח רק לשנתי**

בגוף הבקשה (סביב שורה 449-451) החלף את שורת ה-`anchor_month` בשתי שורות:

```ts
        anchor_month:
          utilityForm.frequency === "bimonthly" || utilityForm.frequency === "annual"
            ? utilityForm.anchorMonth
            : null,
        anchor_day: utilityForm.frequency === "annual" ? utilityForm.anchorDay : null,
```

- [ ] **Step 4: נעילת התדירות והאחריות בבחירת ביטוח**

בבורר הסוגים (סביב שורה 629), ה-`onClick` של כל אפשרות מעדכן `type`. הרחב אותו כך שבחירת ביטוח נועלת את השדות התלויים:

```tsx
onClick={() =>
  setUtilityForm(
    o.value === "insurance"
      ? { ...utilityForm, type: o.value, frequency: "annual", responsibility: "owner_pays" }
      : { ...utilityForm, type: o.value }
  )
}
```

בבורר התדירות (סביב שורה 653) הוסף `annual` לרשימת האפשרויות, והשבת את הבורר כשהסוג הוא ביטוח:

```tsx
disabled={utilityForm.type === "insurance"}
```

ובבורר האחריות (סביב שורה 684) עטוף את כל הבלוק כך שלא יוצג בביטוח:

```tsx
{utilityForm.type !== "insurance" && (
  /* בלוק בורר האחריות הקיים, ללא שינוי פנימי */
)}
```

הוסף מתחת לבורר התדירות, כשהסוג ביטוח, שורת-הסבר:

```tsx
{utilityForm.type === "insurance" && (
  <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
    ביטוח מבנה מתחדש פעם בשנה והוא תמיד באחריות הבעלים, ולכן התדירות והאחריות קבועות.
  </p>
)}
```

- [ ] **Step 5: שדה תאריך החידוש**

הבלוק הקיים `{utilityForm.frequency === "bimonthly" && (...)}` (שורה 663) מציג בורר חודש-עוגן. הוסף אחריו בלוק מקביל לשנתי, עם חודש **ויום**:

```tsx
{utilityForm.frequency === "annual" && (
  <div className="mt-3">
    <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--text-2)" }}>
      תאריך החידוש
    </label>
    <div className="flex gap-2">
      <select
        value={utilityForm.anchorDay}
        onChange={(e) => setUtilityForm({ ...utilityForm, anchorDay: Number(e.target.value) })}
        className="px-3 py-2 rounded-lg border text-sm"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-1)" }}
        aria-label="יום החידוש"
      >
        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
      <select
        value={utilityForm.anchorMonth}
        onChange={(e) => setUtilityForm({ ...utilityForm, anchorMonth: Number(e.target.value) })}
        className="px-3 py-2 rounded-lg border text-sm"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-1)" }}
        aria-label="חודש החידוש"
      >
        {UTILITY_MONTH_HE.map((m, i) => (
          <option key={m} value={i + 1}>{m}</option>
        ))}
      </select>
    </div>
    <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
      יום שאינו קיים בחודש נחתך אוטומטית לסוף החודש.
    </p>
  </div>
)}
```

- [ ] **Step 6: שורת התצוגה ברשימת החשבונות**

ב-`UTILITY_FREQUENCY_HE` הוסף מפתח `annual: "שנתי"`. בשורת התצוגה (סביב שורה 1210) הוסף את פירוט החידוש ליד הפירוט הקיים של דו-חודשי:

```tsx
{u.frequency === "annual" && u.anchor_month
  ? ` · חידוש ${u.anchor_day ?? 1} ב${UTILITY_MONTH_HE[u.anchor_month - 1]}`
  : ""}
```

- [ ] **Step 7: שערים מלאים**

Run: `npx vitest run && npm run lint && npx tsc --noEmit && npm run build`
Expected: הכל עובר.

- [ ] **Step 8: Commit**

```bash
git add "src/app/dashboard/properties/[id]/page.tsx"
git commit -m "feat(properties): הגדרת ביטוח שנתי בטופס חשבונות השירות

סוג ביטוח נוסף לבורר, ובבחירתו התדירות ננעלת על שנתי ובורר האחריות מוסתר -
ביטוח מבנה תמיד על הבעלים. נחשף שדה תאריך חידוש (יום וחודש) שממלא anchor_month
ו-anchor_day, ורשימת החשבונות מציגה את מועד החידוש."
```

---

## Task 7: אימות מקצה לקצה ומיגרציה של 72 השורות

**Files:**
- Modify: `SPEC.md` (סעיף הפיצ'ר + הצעד הבא), `TODO.md` (הפריט נסגר)
- Test: אימות ידני ב-Playwright לפי סקיל `verify`

**Interfaces:**
- Consumes: הכל.
- Produces: פיצ'ר מאומת ופרוס, ותיעוד מעודכן.

- [ ] **Step 1: אימות ויזואלי - ביטוח**

הפעל את סקיל `verify`. בדוק בשני רוחבים (390 ודסקטופ):

1. עמוד נכס, מקטע חשבונות שירות, **הוספת חשבון** - בחר "ביטוח": התדירות ננעלת על "שנתי", בורר האחריות נעלם, ושדה תאריך החידוש מופיע.
2. שמור עם תאריך חידוש (למשל 31 באוקטובר) ואמת שהשורה ברשימה מציגה `שנתי · חידוש 31 באוקטובר`.
3. מסך תזכורות: תזכורת `חידוש ביטוח - <נכס>` מופיעה במועד הנכון (אם החודש אינו חודש העוגן היא תופיע במקטע "עתידיות").
4. אפס שגיאות-קונסולה.

- [ ] **Step 2: אימות ויזואלי - נכס ריק**

בנכס שאין לו חוזה פעיל (או אחרי סיום חוזה):

1. מסך תזכורות מציג את חשבונות הנכס לכל חודש עד סוף השנה.
2. תזכורות אלה נושאות תגית `נכס ריק`.
3. חשבון שמוגדר `tenant_pays` **מופיע** ברשימה - זה הפער המרכזי שהפיצ'ר סוגר.
4. נכס מאוכלס לא השתנה: חודש נוכחי בלבד, ובלי תגית.

- [ ] **Step 3: דיווח לאמיר ובקשת אישור להגדרת ביטוח**

הצג לו:

> הפיצ'ר עובד ומאומת. כדי להשלים את המיגרציה של 72 התזכורות הישנות, בסדר הזה:
> 1. להיכנס לכל נכס שיש לו ביטוח מבנה, ולהגדיר חשבון מסוג **ביטוח** עם תאריך החידוש האמיתי.
> 2. לאמת במסך התזכורות שתזכורת החידוש הבאה מופיעה במועד הנכון.
> 3. רק אחרי שתאשר שזה נכון - אמחק את 72 השורות הישנות.

- [ ] **Step 4: מחיקת 72 השורות - רק באישור מפורש**

**אין לבצע בלי אישור מאמיר באותו רגע.** זו נגיעה בדאטה היסטורית.

לפני המחיקה, הצג ספירה מדויקת של מה שיימחק (`related_entity_type = "lease"` בקטגוריות השירות והביטוח, שמועדן מעבר לאופק), ואת השורות עצמן לדגימה. אחרי המחיקה, אמת שהספירה החדשה היא אפס ושמסך התזכורות עדיין מציג את תזכורת החידוש החדשה - כלומר שנמחקה הכפילות ולא הפיצ'ר.

- [ ] **Step 5: עדכון מסמכי-האמת**

ב-`SPEC.md` הוסף סעיף פיצ'ר חדש (בדפוס הסעיפים הקיימים) שמתעד: ביטוח כסוג חשבון שנתי, אחריות אפקטיבית לפי אכלוס, אופק מתגלגל, והמיגרציה שהורצה. עדכן את `§הצעד הבא` - הפריט הזה נסגר. ב-`TODO.md` סמן את הפריט כבוצע.

- [ ] **Step 6: Commit ודחיפה**

```bash
git add SPEC.md TODO.md
git commit -m "docs: תזכורות השירות - ביטוח שנתי, אחריות לפי אכלוס ואופק מתגלגל"
git push origin main
```

ואמת ש-CI ירוק בשני ה-jobs (`checks` ו-`deploy`) לפני שאתה מכריז על סיום.

---

## Self-Review

**כיסוי ה-spec:** כל שורה בטבלת "שינויים במודל הנתונים" מכוסה ב-Task 1. כל שורה בטבלת "שינויים בקוד" מכוסה: `mapUtilityCategory` ו-`utilityTypeLabel` ב-Task 1, `effectiveResponsibility` ב-Task 2, `utilityAppliesThisPeriod` ו-`utilityDueDate` ב-Task 3, `generateVirtualUtilityTasks` ב-Task 4. `PropertyOccupancy` מוגדר ב-Task 4 ומורכב ב-Task 5. שלושת סעיפי "ממשק משתמש" מכוסים: טופס ב-Task 6, מסך התזכורות ותגית "נכס ריק" ב-Task 5. כל שבע שורות טבלת הבדיקות ב-spec ממופות לבדיקות ממשיות ב-Tasks 2-4. שלושת שלבי "מיגרציה של 72 השורות" הם Tasks 7.3-7.4.

**פערים שנסגרו בכתיבה:** ה-spec אינו אומר מה קורה לנכס שאין לו רשומת אכלוס - נקבע "מתנהג כמאוכלס" (שמרני, ומכוסה בבדיקה). ה-spec אינו אומר מה קורה לביטוח בלי חודש-עוגן - נקבע "אינו חל", מתועד בקוד ובבדיקה, וה-UI אוכף את השדה. ה-spec אינו מגדיר את שדה-הסימון של "נכס ריק" - נקבע `vacantProperty` על `VirtualTask`.

**עקביות טיפוסים:** `PropertyOccupancy` זהה ב-Task 4 (הגדרה) וב-Task 5 (הרכבה). `utilityMonthWindow(occupancy, today)` נקרא באותה חתימה בשני המקומות. `anchor_day` נכתב באותו שם בכל שבע נקודות הנגיעה (מיגרציה, טיפוס גלובלי, ולידציה, `PropertyUtilityLike`, `PropertyUtilityRow`, טופס, תצוגה). `vacantProperty` זהה במחולל, בטיפוס `VirtualTask`, בטיפוס `Task` של הדף וברינדור.
