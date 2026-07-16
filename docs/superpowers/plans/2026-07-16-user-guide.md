# חוברת הסברים למשתמש - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** להוסיף עמוד `/dashboard/help` עם חוברת-הסברים בת 9 פרקים (פתיחה + 8 קטגוריות), ונגישות אליו מכל מסך דרך כפתור-עזרה בסרגל שקופץ אוטומטית לפרק הרלוונטי למסך הנוכחי.

**Architecture:** פונקציה טהורה `chapterAnchorFor(pathname)` ב-`src/lib/domain` (נבדקת ביחידה) ממפה נתיב-מסך לעוגן-פרק. כפתור חדש בסרגל (`layout.tsx`) בונה קישור `/dashboard/help#<עוגן>` על בסיס `usePathname()`. עמוד ה-help עצמו הוא קומפוננטת-שרת TSX רגילה (בלי MDX, בלי state) - כל פרק `<section id="...">`, באותו דפוס עיצובי כמו `about/page.tsx` (כרטיסי-קלף, `tick-accent`, `grad-accent-diag`).

**Tech Stack:** Next.js App Router (TSX), Tailwind v4 + טוקני-CSS קיימים (`globals.css`), `@phosphor-icons/react` דרך `src/lib/icons.ts` + `src/components/Icon.tsx`, vitest ל-unit test.

## Global Constraints

- כל טקסט באפליקציה בעברית בלבד - כולל כל תוכן ה-help (spec §1-2).
- בלי MDX ובלי אחסון-חיצוני - עמוד TSX פנימי יחיד (spec §2-3).
- תוכן הפרקים חייב לשקף את המסכים בפועל - לא להמציא פיצ'רים (spec §4). התוכן בתוכנית הזו מבוסס על סקירה בפועל של הקוד (ראו הפניות בכל טופיק).
- שימוש בדפוס העיצוב הקיים בלבד: `tick-accent`, `grad-accent-diag`, מבנה `about/page.tsx` (breadcrumb, hero, כרטיסי-סקשן לבנים) - בלי לעצב מחדש.
- אין להוסיף תלויות (dependencies) חדשות.
- `chapterAnchorFor` היא הפונקציה הטהורה היחידה בפיצ'ר הזה שמקבלת unit test (vitest) - שאר הבדיקה היא tsc/lint/build + בדיקה חזותית Playwright (spec §5).

---

### Task 1: `chapterAnchorFor` - מיפוי נתיב-מסך לפרק

**Files:**
- Create: `src/lib/domain/help-anchor.ts`
- Test: `src/lib/domain/help-anchor.test.ts`

**Interfaces:**
- Produces: `export type HelpSectionId = "intro" | "properties" | "leases" | "payments" | "expenses" | "debts" | "reports" | "tasks" | "settings"`; `export function chapterAnchorFor(pathname: string): HelpSectionId`. Task 2 (כפתור-הסרגל) ו-Task 3 (TOC/עוגני-הפרקים בעמוד עצמו) תלויים בשמות-העוגן המדויקים האלה.

- [ ] **Step 1: לכתוב את הבדיקה הכושלת**

```typescript
// src/lib/domain/help-anchor.test.ts
import { describe, it, expect } from "vitest";
import { chapterAnchorFor } from "./help-anchor";

describe("chapterAnchorFor", () => {
  it("ממפה כל prefix של מסך לעוגן הפרק שלו", () => {
    expect(chapterAnchorFor("/dashboard/properties")).toBe("properties");
    expect(chapterAnchorFor("/dashboard/leases")).toBe("leases");
    expect(chapterAnchorFor("/dashboard/payments")).toBe("payments");
    expect(chapterAnchorFor("/dashboard/expenses")).toBe("expenses");
    expect(chapterAnchorFor("/dashboard/debts")).toBe("debts");
    expect(chapterAnchorFor("/dashboard/reports")).toBe("reports");
    expect(chapterAnchorFor("/dashboard/tasks")).toBe("tasks");
    expect(chapterAnchorFor("/dashboard/settings")).toBe("settings");
  });

  it("ממפה נתיבים מקוננים לפי ה-prefix של המסך הראשי", () => {
    expect(chapterAnchorFor("/dashboard/properties/123/edit")).toBe("properties");
    expect(chapterAnchorFor("/dashboard/properties/123/add-lease")).toBe("properties");
    expect(chapterAnchorFor("/dashboard/leases/import")).toBe("leases");
    expect(chapterAnchorFor("/dashboard/leases/123/edit")).toBe("leases");
    expect(chapterAnchorFor("/dashboard/reports/tax")).toBe("reports");
    expect(chapterAnchorFor("/dashboard/reports/linkage")).toBe("reports");
  });

  it("מחזיר intro לדשבורד הראשי ולמסכים בלי פרק ייעודי", () => {
    expect(chapterAnchorFor("/dashboard")).toBe("intro");
    expect(chapterAnchorFor("/dashboard/about")).toBe("intro");
    expect(chapterAnchorFor("/dashboard/maintenance")).toBe("intro");
    expect(chapterAnchorFor("/dashboard/help")).toBe("intro");
    expect(chapterAnchorFor("")).toBe("intro");
  });
});
```

- [ ] **Step 2: להריץ ולוודא כשל**

Run: `npx vitest run src/lib/domain/help-anchor.test.ts`
Expected: FAIL - `Cannot find module './help-anchor'`

- [ ] **Step 3: לכתוב את המימוש המינימלי**

```typescript
// src/lib/domain/help-anchor.ts
export type HelpSectionId =
  | "intro" | "properties" | "leases" | "payments" | "expenses"
  | "debts" | "reports" | "tasks" | "settings";

const PATHNAME_ANCHORS: { prefix: string; anchor: HelpSectionId }[] = [
  { prefix: "/dashboard/properties", anchor: "properties" },
  { prefix: "/dashboard/leases", anchor: "leases" },
  { prefix: "/dashboard/payments", anchor: "payments" },
  { prefix: "/dashboard/expenses", anchor: "expenses" },
  { prefix: "/dashboard/debts", anchor: "debts" },
  { prefix: "/dashboard/reports", anchor: "reports" },
  { prefix: "/dashboard/tasks", anchor: "tasks" },
  { prefix: "/dashboard/settings", anchor: "settings" },
];

export function chapterAnchorFor(pathname: string): HelpSectionId {
  const match = PATHNAME_ANCHORS.find((p) => pathname.startsWith(p.prefix));
  return match ? match.anchor : "intro";
}
```

- [ ] **Step 4: להריץ ולוודא הצלחה**

Run: `npx vitest run src/lib/domain/help-anchor.test.ts`
Expected: PASS - 3 tests

- [ ] **Step 5: קומיט**

```bash
git add src/lib/domain/help-anchor.ts src/lib/domain/help-anchor.test.ts
git commit -m "feat(help): הוספת chapterAnchorFor למיפוי מסך לפרק בחוברת"
```

---

### Task 2: כפתור-עזרה בסרגל + אייקון

**Files:**
- Modify: `src/lib/icons.ts`
- Modify: `src/app/dashboard/layout.tsx`

**Interfaces:**
- Consumes: `chapterAnchorFor(pathname: string): HelpSectionId` מ-Task 1 (`src/lib/domain/help-anchor.ts`).
- Produces: שם-לוגי-אייקון חדש `"guide"` ב-`IconName` (ל-Task 3 בעמוד ה-help עצמו, לאייקון בכותרת).

- [ ] **Step 1: להוסיף את האייקון `guide` ל-`src/lib/icons.ts`**

ב-`src/lib/icons.ts:1-11` (בלוק ה-import), להוסיף `BookOpenIcon` לרשימת השמות המיובאים מ-`@phosphor-icons/react` (למשל אחרי `ListIcon,`):

```typescript
  HouseIcon, BuildingsIcon, FileTextIcon, FileArrowDownIcon, ReceiptIcon, HandCoinsIcon, ChartBarIcon,
  ClipboardTextIcon, WarningCircleIcon, BellIcon, InfoIcon, WrenchIcon, GearIcon, SignOutIcon, ListIcon,
  BookOpenIcon,
```

ב-`src/lib/icons.ts:13-30` (בלוק "ניווט" ב-`ICONS`), להוסיף שורה אחרי `menu: ListIcon,`:

```typescript
  menu: ListIcon,
  guide: BookOpenIcon,
```

- [ ] **Step 2: לוודא ש-`tsc` מזהה את השם החדש**

Run: `npx tsc --noEmit`
Expected: 0 שגיאות (השם `"guide"` הופך לחלק תקין מ-`IconName`)

- [ ] **Step 3: להוסיף `usePathname` ו-`chapterAnchorFor` ל-`DashboardLayout`**

ב-`src/app/dashboard/layout.tsx`, בלוק ה-imports (שורה 9), להוסיף:

```typescript
import { chapterAnchorFor } from "@/lib/domain/help-anchor";
```

בתוך `export default function DashboardLayout({ children }: ...)` (שורה 33-34), להוסיף שורה ראשונה בגוף הפונקציה:

```typescript
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
```

- [ ] **Step 4: להוסיף את קישור-העזרה לצד הגדרות/התנתקות**

ב-`src/app/dashboard/layout.tsx:90-101` (בלוק ה-"User"), להוסיף קישור עזרה **לפני** קישור ההגדרות, באותו סגנון בדיוק:

```tsx
            <Link href={`/dashboard/help#${chapterAnchorFor(pathname)}`} title="עזרה" aria-label="עזרה"
              className="text-sm transition-colors" style={{ color: "var(--text-3)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--accent)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}>
              <Icon name="guide" size={16} />
            </Link>
            <Link href="/dashboard/settings" title="הגדרות" aria-label="הגדרות"
              className="text-sm transition-colors" style={{ color: "var(--text-3)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--accent)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}>
              <Icon name="settings" size={16} />
            </Link>
```

- [ ] **Step 5: לוודא ששערים סטטיים ירוקים**

Run: `npx tsc --noEmit && npm run lint`
Expected: שני הפקודות ירוקות, 0 שגיאות/אזהרות חדשות

- [ ] **Step 6: קומיט**

```bash
git add src/lib/icons.ts src/app/dashboard/layout.tsx
git commit -m "feat(help): כפתור-עזרה בסרגל עם קפיצה-חכמה לפרק לפי מסך"
```

---

### Task 3: עמוד `/dashboard/help` - שלד + TOC + פרקים 0-2

**Files:**
- Create: `src/app/dashboard/help/page.tsx`

**Interfaces:**
- Consumes: `Icon` מ-`@/components/Icon` (props: `name: IconName, size?, className?, color?`); `IconName` מ-`@/lib/icons` (כולל `"guide"` מ-Task 2).
- Produces: קומפוננטות-עזר פנימיות (לא-מיוצאות) `Topic` ו-`Chapter`, בשימוש חוזר ב-Task 4 ו-Task 5 (אותו קובץ, אותו TSX). `Chapter` מקבל `id: HelpSectionId` שחייב להתאים לעוגני `chapterAnchorFor` מ-Task 1 ול-`TOC` בקובץ הזה.

- [ ] **Step 1: ליצור את הקובץ עם שלד + TOC + פרקים 0-2**

```tsx
// src/app/dashboard/help/page.tsx
import Link from "next/link";
import { Icon } from "@/components/Icon";
import type { IconName } from "@/lib/icons";

const TOC: { id: string; label: string }[] = [
  { id: "intro", label: "0. פתיחה" },
  { id: "properties", label: "1. נכסים" },
  { id: "leases", label: "2. חוזים" },
  { id: "payments", label: "3. תקבולים" },
  { id: "expenses", label: "4. הוצאות" },
  { id: "debts", label: "5. חובות" },
  { id: "reports", label: "6. דוחות" },
  { id: "tasks", label: "7. תזכורות" },
  { id: "settings", label: "8. הגדרות" },
];

function Topic({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <p className="font-semibold text-gray-900 text-sm">{title}</p>
      <p className="text-sm text-gray-500 mt-1 leading-relaxed">{text}</p>
    </div>
  );
}

function Chapter({
  id, num, title, iconName, children,
}: {
  id: string; num: string; title: string; iconName: IconName; children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-3">
      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2.5">
        <span className="inline-block w-1 h-5 rounded-full tick-accent" />
        <Icon name={iconName} size={18} />
        {num}. {title}
      </h2>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        {children}
      </div>
    </section>
  );
}

export default function HelpPage() {
  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-1.5">
          <Link href="/dashboard" className="hover:text-gray-600 transition-colors">לוח בקרה</Link>
          <span className="opacity-50">/</span>
          <span className="text-gray-600">עזרה</span>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
          <span className="inline-block w-1.5 h-7 rounded-full tick-accent" />
          חוברת הסברים
        </h1>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl p-6 grad-accent-diag text-white">
        <span className="absolute -top-4 -left-3 opacity-15 select-none"><Icon name="guide" size={64} color="white" /></span>
        <div className="relative">
          <h2 className="text-xl font-extrabold drop-shadow-sm">מדריך שימוש באפליקציה</h2>
          <p className="text-sm text-white/85 mt-1 leading-relaxed max-w-lg">
            הסבר קצר וישיר לכל פיצ&apos;ר - איך מוסיפים נכס ראשון, איך עובדות תזכורות אוטומטיות, ואיך קוראים דוח חובות.
            אפשר גם ללחוץ על אייקון העזרה בסרגל מכל מסך - זה יקפיץ אתכם ישר לפרק המתאים.
          </p>
        </div>
      </div>

      {/* TOC */}
      <nav className="bg-white rounded-2xl border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-500 mb-2">תוכן העניינים</p>
        <div className="flex flex-wrap gap-2">
          {TOC.map((c) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              {c.label}
            </a>
          ))}
        </div>
      </nav>

      {/* 0. פתיחה */}
      <Chapter id="intro" num="0" title="פתיחה - תחילת עבודה" iconName="guide">
        <Topic
          title="הוספת נכס ראשון"
          text="בלוח הבקרה או בתפריט &quot;נכסים&quot; לוחצים &quot;נכס חדש&quot;. ממלאים שם, סוג נכס (דירה/בית/מסחרי) וכתובת - יש השלמה אוטומטית לכתובת. שאר השדות (קומה, חדרים, מ&quot;ר, מחיר רכישה) אופציונליים."
        />
        <Topic
          title="הוספת דייר וחוזה"
          text="מדף הנכס לוחצים &quot;הוסף חוזה&quot;. בוחרים דייר קיים או מזינים דייר חדש (עם בדיקת תקינות ת&quot;ז). ממלאים תאריכי חוזה - תאריך הסיום מוצע אוטומטית כשנה פחות יום - שכ&quot;ד, פיקדון ושיטת תקבול, ואפשר לסמן שייווצר גם תקבול פיקדון יחד עם החוזה."
        />
        <Topic
          title="רישום תקבול ראשון"
          text="מדף הנכס לוחצים &quot;הוסף תקבול&quot;. אם יש רק חוזה פעיל אחד, הוא נבחר אוטומטית והסכום מתמלא לפי השכ&quot;ד בחוזה - נשאר רק לאשר תאריך וסטטוס."
        />
        <Topic
          title="קיצור דרך: ייבוא עם AI"
          text="במקום להזין נכס-דייר-חוזה בנפרד, &quot;ייבוא חוזה&quot; (בתפריט חוזים) מעלה קובץ PDF או DOCX של החוזה, והבינה המלאכותית ממלאת הכל אוטומטית - כולל יצירת הנכס והדייר אם הם עוד לא קיימים."
        />
      </Chapter>

      {/* 1. נכסים */}
      <Chapter id="properties" num="1" title="נכסים" iconName="properties">
        <Topic
          title="הוספה ועריכה"
          text="טופס אחד משמש גם ליצירה וגם לעריכה: שם, סוג נכס, כתובת עם השלמה אוטומטית, קומה ומספר דירה, חדרי שינה/אמבטיה, מ&quot;ר, מרפסות וחניות, מחיר רכישה ותיאור חופשי."
        />
        <Topic
          title="דף הנכס"
          text="מציג שכ&quot;ד חודשי מהחוזים הפעילים, סה&quot;כ הוצאות ומספר חוזים פעילים, טבלת כל החוזים ההיסטוריים עם המסמכים המצורפים להם, וכפתורי פעולה להפעלת אופציה או סיום מוקדם של חוזה פעיל."
        />
        <Topic
          title="חשבונות שירות"
          text="בסקשן &quot;חשבונות שירות&quot; בדף הנכס מסמנים אילו חשבונות מגיעים (מים/גז/חשמל/ארנונה/ועד בית/אחר), התדירות (חודשי או דו-חודשי) ומי אחראי לתשלום - הבעלים משלם, הבעלים מעביר לדייר, או שהדייר משלם ישירות. הבחירה קובעת אם תיווצר תזכורת אוטומטית."
        />
        <Topic
          title="תזכורות שקים בדף הנכס"
          text="לחוזה פעיל בשיטת תקבול &quot;שקים&quot; מוצג בדף הנכס בלוק תזכורות ל-3 החודשים הקרובים, עם צבע לפי סטטוס - שולם, חלקי, לא שולם, או עתידי."
        />
      </Chapter>

      {/* 2. חוזים */}
      <Chapter id="leases" num="2" title="חוזים" iconName="leases">
        <Topic
          title="ייבוא עם AI"
          text="מעלים קובץ PDF (כולל חוזה סרוק) או DOCX, והמערכת שולפת את כל פרטי החוזה אוטומטית. ספק ה-AI נקבע בהגדרות. המערכת גם מזהה נספחי הארכה/אופציה וממלאת את שדות האופציה לבד. אם לנכס כבר יש חוזה פעיל, הוא עובר אוטומטית לסטטוס &quot;הסתיים&quot; בעת שמירת החוזה החדש - הוא לא נמחק, רק מפסיק להיות פעיל."
        />
        <Topic
          title="עריכה"
          text="כל שדות החוזה ניתנים לעריכה, כולל שאיבת נתונים מחדש ממסמך מצורף וניהול המסמכים (העלאה/מחיקה) של אותו חוזה."
        />
        <Topic
          title="הצמדה"
          text="לכל חוזה אפשר לבחור הצמדה למדד המחירים לצרכן, לדולר, או ללא הצמדה - ותדירות עדכון: חודשי, רבעוני, או חצי-שנתי. שכ&quot;ד הבסיס ותאריך הבסיס נקבעים אוטומטית ביצירת החוזה, ומוצגים בדף העריכה."
        />
        <Topic
          title="אופציה וסיום מוקדם"
          text="חוזה עם אופציית הארכה מציג כפתור &quot;הפעל אופציה&quot; כשמתקרב תאריך הסיום - הפעלה מעדכנת את תאריכי החוזה והשכ&quot;ד, ומאפסת את בסיס ההצמדה לערכי האופציה החדשה. סיום מוקדם מחשב את תאריך הסיום בפועל לפי מספר חודשי ההודעה המוסכמים בחוזה."
        />
        <Topic
          title="שוכר שני"
          text="אפשר להוסיף פרטי שוכר שני (שם, ת&quot;ז, טלפון, אימייל) לאותו חוזה, גם ביצירה וגם בעריכה."
        />
      </Chapter>
    </div>
  );
}
```

- [ ] **Step 2: לוודא ששערים סטטיים ירוקים**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 שגיאות/אזהרות

- [ ] **Step 3: קומיט**

```bash
git add src/app/dashboard/help/page.tsx
git commit -m "feat(help): עמוד חוברת-הסברים - שלד + TOC + פרקים 0-2"
```

---

### Task 4: פרקים 3-5 (תקבולים, הוצאות, חובות)

**Files:**
- Modify: `src/app/dashboard/help/page.tsx`

**Interfaces:**
- Consumes: `Chapter`, `Topic` שהוגדרו ב-Task 3 (באותו קובץ).

- [ ] **Step 1: להוסיף את פרקים 3-5 אחרי פרק 2, לפני סגירת ה-`<div>` הראשי**

ב-`src/app/dashboard/help/page.tsx`, למצוא את הסגירה של `Chapter id="leases"` (`</Chapter>`) שאחריה מיד `</div>\n  );\n}`, ולהוסיף בין השניים:

```tsx
      </Chapter>

      {/* 3. תקבולים */}
      <Chapter id="payments" num="3" title="תקבולים" iconName="payments">
        <Topic
          title="המסך"
          text="מציג יחד תקבולים אמיתיים שכבר נרשמו, ו&quot;משבצות&quot; וירטואליות לחודשים שעדיין לא נרשם עבורם תקבול - כך רואים תמיד את כל התמונה בלי להזין ידנית כל חודש מראש."
        />
        <Topic
          title="סטטוסים"
          text="ממתין, שולם, באיחור, חלקי, ועתידי - למשבצת וירטואלית שתאריכה טרם הגיע."
        />
        <Topic
          title="תשלום חלקי"
          text="כשמסמנים תקבול כ&quot;חלקי&quot;, מזינים את הסכום שהתקבל בפועל - הוא נשמר בנפרד מהסכום המקורי, וכל הדוחות (חובות, מס, דוחות שנתיים) מתחשבים רק בסכום שבאמת התקבל."
        />
        <Topic
          title="שקים"
          text="בחוזה בשיטת תקבול &quot;שקים&quot; מתעדכנות תזכורות הפקדה אוטומטית. סימון תקבול כ&quot;שולם&quot; סוגר את התזכורת המתאימה לבד, וביטול הסימון פותח אותה מחדש."
        />
      </Chapter>

      {/* 4. הוצאות */}
      <Chapter id="expenses" num="4" title="הוצאות" iconName="expenses">
        <Topic
          title="קטגוריות"
          text="תחזוקה, ביטוח, מס, חשבונות (מים/גז/חשמל/ארנונה/ועד בית), שכר טרחה מקצועי, ואחר. אפשר לסמן הוצאה כחוזרת עם תדירות (חודשי/דו-חודשי/רבעוני/שנתי) כדי לא להזין אותה כל פעם מחדש."
        />
        <Topic
          title="מס אוטומטי 10%"
          text="הוצאת המס לא מוזנת ידנית - היא נוצרת, מתעדכנת או נמחקת אוטומטית בכל שינוי בתקבול שכ&quot;ד: כשמתקבל תשלום שכ&quot;ד, נוצרת הוצאת &quot;מס&quot; בגובה 10% מהסכום שהתקבל בפועל (כולל תשלומים חלקיים); אם התקבול מבוטל, ההוצאה נמחקת. אפשר לכבות את המנגנון בהגדרות."
        />
      </Chapter>

      {/* 5. חובות */}
      <Chapter id="debts" num="5" title="חובות" iconName="debts">
        <Topic
          title="איך נבנה הדוח"
          text="הדוח מרכז שני סוגי חוב: תקבולים שנרשמו אך לא סומנו כ&quot;שולם&quot; ותאריך היעד שלהם כבר עבר, וגם משבצות וירטואליות של חודשים שעברו ואין להם בכלל תקבול רשום."
        />
        <Topic
          title="מה מוצג"
          text="סה&quot;כ חוב פתוח, קיבוץ לפי נכס, מספר ימי האיחור לכל פריט, ולתשלום חלקי - כמה כבר שולם וכמה עוד נותר."
        />
      </Chapter>
    </div>
  );
}
```

- [ ] **Step 2: לוודא ששערים סטטיים ירוקים**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 שגיאות/אזהרות

- [ ] **Step 3: קומיט**

```bash
git add src/app/dashboard/help/page.tsx
git commit -m "feat(help): פרקים 3-5 (תקבולים, הוצאות, חובות)"
```

---

### Task 5: פרקים 6-8 (דוחות, תזכורות, הגדרות)

**Files:**
- Modify: `src/app/dashboard/help/page.tsx`

**Interfaces:**
- Consumes: `Chapter`, `Topic` שהוגדרו ב-Task 3 (באותו קובץ).

- [ ] **Step 1: להוסיף את פרקים 6-8 אחרי פרק 5, לפני סגירת ה-`<div>` הראשי**

ב-`src/app/dashboard/help/page.tsx`, למצוא את הסגירה של `Chapter id="debts"` (`</Chapter>`) שאחריה מיד `</div>\n  );\n}`, ולהוסיף בין השניים:

```tsx
      </Chapter>

      {/* 6. דוחות */}
      <Chapter id="reports" num="6" title="דוחות" iconName="reports">
        <Topic
          title="דוח כללי"
          text="לפי שנה נבחרת: פילוח הכנסות/הוצאות חודשי, הוצאות לפי קטגוריה, וסיכום לפי נכס. אפשר להפעיל &quot;מסלול מס 10%&quot; כדי לראות גם שורת מס משוערת ותזרים נטו אחרי מס - זו תצוגה בלבד, לא קשורה למתג המס האוטומטי בהגדרות."
        />
        <Topic
          title="דוח מס שנתי"
          text="טבלת נכס מול 12 חודשי השנה, מבוססת על מה שבאמת התקבל (כולל תשלומים חלקיים), עם שורת מס 10% לכל חודש ובסה&quot;כ. ניתן להדפיס או לייצא ל-PDF."
        />
        <Topic
          title="השוואת מסלולי הצמדה"
          text="מסך נפרד, מקושר מדף הדוחות, שבו בוחרים חוזה ורואים מה היה השכ&quot;ד לו נבחר מסלול הצמדה אחר (ללא הצמדה/דולר/מדד), חודש אחר חודש - כולל הפרש בשקלים ובאחוזים מהשכ&quot;ד הנוכחי. יש כפתור &quot;רענן מדדים&quot; למשיכת נתוני שער/מדד עדכניים."
        />
      </Chapter>

      {/* 7. תזכורות */}
      <Chapter id="tasks" num="7" title="תזכורות" iconName="tasks">
        <Topic
          title="יצירה ידנית"
          text="כותרת, קטגוריה, עדיפות (נמוכה/רגילה/גבוהה), תאריך יעד, קישור אופציונלי לחוזה, הערות - ואפשר להגדיר תזכורת חוזרת בתדירות קבועה של חודשים, עד תאריך מסוים או עד סוף החוזה."
        />
        <Topic
          title="סימון בוצע"
          text="לתזכורת וירטואלית, הסימון יוצר לראשונה רשומה אמיתית ומסמן אותה - כך שהיא לא תיווצר שוב. אפשר גם לבטל סימון (&quot;פתח מחדש&quot;) אם טעיתם."
        />
        <Topic
          title="תזכורות וירטואליות"
          text="נוצרות אוטומטית בלי להזין ידנית: הפקדת שיקים לכל חוזה בשיטת שקים, סיום חוזה מתקרב (מ-90 יום לפני, עם הסלמת דחיפות ב-75 וב-60 יום), וחשבונות שירות מחזוריים לפי התדירות שהוגדרה בדף הנכס."
        />
      </Chapter>

      {/* 8. הגדרות */}
      <Chapter id="settings" num="8" title="הגדרות" iconName="settings">
        <Topic
          title="ספק AI"
          text="בוחרים בין Gemini (חינמי, ברירת המחדל), Claude (בתשלום) או Ollama (מודל מקומי) - הבחירה קובעת מי ינתח את קבצי החוזה בייבוא."
        />
        <Topic
          title="מס אוטומטי 10%"
          text="הפעלת המתג יוצרת רטרואקטיבית הוצאות מס לכל תקבולי השכ&quot;ד ששולמו מתחילת השנה ועדיין אין להם הוצאת מס. כיבוי המתג מוחק את כל הוצאות המס האוטומטיות הקיימות - הוצאות מס שנרשמו ידנית לא נפגעות."
        />
        <Topic
          title="התראות Push"
          text="נרשמים לקבלת התראות דפדפן/מכשיר - בעיקר לפני סיום חוזה (30 ו-7 ימים מראש)."
        />
        <Topic
          title="תחזוקה"
          text="שלוש פעולות ידניות: ניקוי תזכורות שיקים כפולות/יתומות, ניקוי חוזים יתומים (ששוייכו לנכס שנמחק), ובדיקת תקינות שמזהה נכסים עם יותר מחוזה פעיל אחד בו-זמנית."
        />
      </Chapter>
    </div>
  );
}
```

- [ ] **Step 2: לוודא ששערים סטטיים ירוקים**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 שגיאות/אזהרות

- [ ] **Step 3: קומיט**

```bash
git add src/app/dashboard/help/page.tsx
git commit -m "feat(help): פרקים 6-8 (דוחות, תזכורות, הגדרות) - החוברת שלמה"
```

---

### Task 6: אימות מקצה לקצה

**Files:** (ללא שינויי קוד - רק אימות)

**Interfaces:** אין (משתמש בפלט המוגמר של Tasks 1-5).

- [ ] **Step 1: שערים סטטיים מלאים**

Run: `npx tsc --noEmit && npm run lint && npx vitest run && npm run build`
Expected: כולם ירוקים. `npx vitest run` כולל את 3 הבדיקות מ-`help-anchor.test.ts` בנוסף לכל הבדיקות הקיימות.

- [ ] **Step 2: בדיקה חזותית Playwright - עמוד ה-help עצמו**

להריץ `npm run dev`, לנווט ב-Playwright MCP אל `http://localhost:3000/dashboard/help`, לצלם מסך מלא (fullPage) ולוודא: RTL תקין (כותרות מיושרות לימין, אין טקסט הפוך), כל 9 הפרקים מוצגים בשלמותם, התוכן הארוך לא שובר את הפריסה (רוחב הכרטיסים, ריווח), אין NaN/undefined, קונסולת הדפדפן נקייה.

- [ ] **Step 3: בדיקה חזותית Playwright - קפיצה חכמה מ-3 מסכים שונים**

לנווט אל `http://localhost:3000/dashboard/properties`, ללחוץ על אייקון העזרה בסרגל, ולוודא שהדפדפן קופץ ישירות לפרק "1. נכסים" (`#properties`) - לצלם מסך שמראה את הפרק בראש התצוגה. לחזור על אותו תהליך מ-`/dashboard/payments` (מצפים ל-`#payments`) ומ-`/dashboard/settings` (מצפים ל-`#settings`). לנווט גם מ-`/dashboard` (הדשבורד הראשי) ולוודא שהקישור מפנה ל-`#intro`.

- [ ] **Step 4: ניקיון**

לעצור את שרת ה-dev. אם נוצרו צילומי-מסך זמניים בשורש הריפו - למחוק אותם או לוודא שהם untracked.

- [ ] **Step 5: קומיט סיום (אם יש שינויים תלויים, כגון SPEC.md)**

```bash
git status
```

אם אין שינויים נוספים - אין צורך בקומיט נוסף (כל תוכן הפיצ'ר כבר בקומיטים של Tasks 1-5).

---

## Self-Review

**כיסוי-spec:** §2 (עמוד TSX + כפתור-סרגל + קפיצה-חכמה) - Task 2+3; §3 (ארכיטקטורה, `chapterAnchorFor` כפונקציה טהורה+נבדקת) - Task 1; §4 (9 פרקים מלאים, מבוססי-סקירה) - Tasks 3-5; §5 (tsc/lint/vitest/build + Playwright חזותי RTL וקפיצת-עוגן) - Task 6; §6 קריטריוני-הצלחה 1-4 - מכוסים ב-Tasks 3-5 (תוכן) ו-Task 6 (אימות).

**סריקת-placeholders:** אין TBD/"להוסיף בהמשך"/"דומה למעלה" - כל טופיק בכל 9 הפרקים כתוב במלואו בכל אחד מ-Tasks 3-5.

**עקביות-טיפוסים:** `HelpSectionId` (Task 1) - `"intro" | "properties" | "leases" | "payments" | "expenses" | "debts" | "reports" | "tasks" | "settings"` - זהה לכל 9 ה-`id` שמועברים ל-`Chapter` ב-Tasks 3-5 ולכל 9 הרשומות ב-`TOC` (Task 3). שם-האייקון `"guide"` (Task 2) בשימוש הן בכפתור-הסרגל (Task 2) והן בכותרת עמוד ה-help ובפרק הפתיחה (Task 3) - עקבי.
