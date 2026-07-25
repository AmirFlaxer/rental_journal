# מעבר מאמוג'י לאייקוני Phosphor (Duotone) - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** להחליף את כל 65 גליפי-האמוג'י באפליקציה (ניווט, קטגוריות, סטטוס-תשלום, פעולות, דקורטיביים) באייקוני `@phosphor-icons/react` (משקל `duotone`), דרך שכבת-מיפוי מרכזית אחת.

**Architecture:** מפה לוגית-שם→קומפוננטה ב-`src/lib/icons.ts` + עטיפה `<Icon name="..." />` ב-`src/components/Icon.tsx`. כל מקום בקוד שהיה מכיל אמוג'י גולמי עובר לצרוך את `<Icon>` עם שם-לוגי, לא emoji. מפות-קטגוריה קיימות (`CAT_ICON` וכו') משנות טיפוס מ-`Record<string, string>` ל-`Record<string, IconName>` - כך ש-`tsc` (שכבר שער-CI קיים) תופס טעויות-הקלדה בשם-אייקון בזמן-קומפילציה, במקום סורק-regex שביר.

**Tech Stack:** Next.js 16 App Router, TypeScript, `@phosphor-icons/react` (חדש), vitest, Playwright (בדיקה חזותית ידנית בסוף).

## Global Constraints

- ספרייה: `@phosphor-icons/react`. משקל ברירת-מחדל בקומפוננטת `<Icon>`: `weight="duotone"` (לפי spec §3.1 - אין פרמטר "עובי-קו" נפרד, ה-weight עצמו הוא בחירת-הסגנון).
- גודל ברירת-מחדל: 20px בניווט, 18px בכרטיסי-סטטוס, 16px בטקסט-מוטבע/כפתורים קטנים (spec §4). לציין `size` מפורש בכל שימוש לפי ההקשר.
- צבע: `currentColor` דרך prop `color`/className לפי הכללים הסמנטיים הקיימים (ירוק=הכנסה/paid, אדום=הוצאה/debts/overdue, ענבר=מס/partial/attention-בינונית) - **לא** לשנות שום צבע-סמנטי קיים, רק את סוג-האלמנט (span-עם-אמוג'י → `<Icon>`).
- `📥`/`↩`/`☰`/`↻` וכל שאר האייקונים - **אין היפוך-RTL נדרש** (spec §5 - כל הגליפים הכיווניים היו רק בהערות-קוד; ה-carets `▲▼▶` שנוספו להיקף שומרים על הכיוון-הלוגי-הקיים במקור, לא מתהפכים).
- `👋` בברכת-הדשבורד **יורד לגמרי** (spec §5) - לא מוחלף באייקון.
- `src/app/api/cron/notify/route.ts`: מחרוזות-כותרת של Web Push הן טקסט-OS-נטיבי (לא React) - **אי-אפשר** להשתמש שם ב-`<Icon>`. הפתרון: הסרת-האמוג'י מהמחרוזת (התאמה לרוח-"מקצועיות" של המעבר), לא טיפול-קומפוננטה.
- אחרי כל task: `npx tsc --noEmit` חייב 0 שגיאות לפני commit (זה שכבת-הבטיחות העיקרית נגד טעויות-הקלדה בשם-אייקון, ראו §Task 1).
- שער-סיום מלא (Task 15): `npx tsc --noEmit && npm run lint && npx vitest run && npm run build` + בדיקה חזותית Playwright (סקיל `verify` הפרויקטלי) - חובה, שינוי-רוחב שנוגע בכל מסך.

---

### Task 1: תשתית-אייקונים (`@phosphor-icons/react`, מפה, עטיפה)

**Files:**
- Modify: `package.json`
- Create: `src/lib/icons.ts`
- Create: `src/components/Icon.tsx`
- Test: `src/lib/icons.test.ts`

**Interfaces:**
- Produces: `ICONS: Record<IconName, PhosphorIconComponent>`, `type IconName = keyof typeof ICONS`, `<Icon name={IconName} size?: number className?: string color?: string />` - כל Task הבא צורך את שניהם מ-`@/lib/icons` ו-`@/components/Icon`.

- [ ] **Step 1: התקנת התלות**

```bash
npm install @phosphor-icons/react
```

- [ ] **Step 2: אימות ההתקנה**

Run: `node -e "console.log(require('@phosphor-icons/react/package.json').version)"`
Expected: מדפיס מספר-גרסה (למשל `2.1.10`) בלי שגיאה.

- [ ] **Step 3: יצירת `src/lib/icons.ts` - המפה המרכזית**

```ts
import {
  House, Buildings, FileText, FileArrowDown, Receipt, HandCoins, ChartBar,
  ClipboardText, WarningCircle, Bell, Info, Wrench, Gear, SignOut, List,
  ShieldCheck, Wallet, CalendarCheck, Percent, Fire, Drop, Lightning, Bank,
  Briefcase, Package, CheckCircle, CircleHalf, Warning, Calendar, XCircle,
  Prohibit, DoorOpen, Archive, Eraser, MagnifyingGlass, User, Users, Note,
  File, Paperclip, Printer, ArrowSquareOut, Envelope, Bug, Sparkle,
  Newspaper, Brain, Hourglass, Check, X, Trash, PencilSimple, PushPin,
  ArrowsClockwise, ArrowClockwise, PlusSquare, CaretUp, CaretDown, CaretRight,
  Storefront, CreditCard,
} from "@phosphor-icons/react";

export const ICONS = {
  // ניווט
  dashboard: House,
  properties: Buildings,
  leases: FileText,
  leaseImport: FileArrowDown,
  expenses: Receipt,
  payments: HandCoins,
  reports: ChartBar,
  taxReport: ClipboardText,
  debts: WarningCircle,
  tasks: Bell,
  about: Info,
  maintenance: Wrench,
  settings: Gear,
  signOut: SignOut,
  menu: List,

  // קטגוריות (תזכורות + הוצאות)
  insurance: ShieldCheck,
  rentCollection: Wallet,
  leaseRenewal: CalendarCheck,
  tax: Percent,
  gas: Fire,
  water: Drop,
  electricity: Lightning,
  municipalTax: Bank,
  professionalFees: Briefcase,
  other: Package,
  houseCommittee: Buildings,

  // סטטוס-תשלום ("מיני-רמזור")
  paid: CheckCircle,
  partial: CircleHalf,
  unpaid: Warning,
  future: Calendar,
  overdue: XCircle,
  expired: Prohibit,
  expiringSoon: WarningCircle,
  earlyTermination: DoorOpen,

  // ארכיון/תחזוקה/טפסים
  archive: Archive,
  cleanup: Eraser,
  integrityCheck: MagnifyingGlass,
  singleTenant: User,
  multipleTenants: Users,
  note: Note,
  document: File,
  attachment: Paperclip,
  print: Printer,

  // אודות / AI
  externalLink: ArrowSquareOut,
  mail: Envelope,
  bugReport: Bug,
  aiMagic: Sparkle,
  weeklyDigest: Newspaper,
  aiThinking: Brain,
  aiLoading: Hourglass,

  // פעולות כלליות
  check: Check,
  cancel: X,
  delete: Trash,
  edit: PencilSimple,
  pin: PushPin,
  sync: ArrowsClockwise,
  refresh: ArrowClockwise,
  add: PlusSquare,
  warning: Warning,

  // כיווץ/הרחבה
  caretUp: CaretUp,
  caretDown: CaretDown,
  caretRight: CaretRight,

  // סוגי-נכס + אמצעי-תשלום
  apartment: Buildings,
  house: House,
  commercial: Storefront,
  creditCard: CreditCard,
} as const;

export type IconName = keyof typeof ICONS;
```

- [ ] **Step 4: יצירת `src/components/Icon.tsx` - קומפוננטת-העטיפה**

```tsx
import { ICONS, type IconName } from "@/lib/icons";

type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
  color?: string;
};

export function Icon({ name, size = 20, className, color }: IconProps) {
  const Component = ICONS[name];
  return <Component weight="duotone" size={size} className={className} color={color} />;
}
```

- [ ] **Step 5: כתיבת בדיקת-שפיות**

```ts
import { describe, it, expect } from "vitest";
import { ICONS } from "./icons";

describe("ICONS map sanity", () => {
  it("every entry is a defined component (catches broken imports/typos)", () => {
    const broken = Object.entries(ICONS).filter(([, Component]) => Component == null);
    expect(broken).toEqual([]);
  });

  it("has no duplicate-looking empty keys", () => {
    expect(Object.keys(ICONS).length).toBeGreaterThan(60);
  });
});
```

- [ ] **Step 6: הרצת הבדיקות ו-typecheck**

Run: `npx vitest run src/lib/icons.test.ts && npx tsc --noEmit`
Expected: 2 passed, 0 שגיאות-טיפוס.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/icons.ts src/components/Icon.tsx src/lib/icons.test.ts
git commit -m "feat: תשתית Icon - מפת Phosphor Duotone מרכזית + עטיפת קומפוננטה"
```

---

### Task 2: איחוד ניווט (`nav-items.ts`) + `layout.tsx`

**Files:**
- Create: `src/lib/nav-items.ts`
- Modify: `src/app/dashboard/layout.tsx`

**Interfaces:**
- Consumes: `Icon` מ-`@/components/Icon`, `IconName` מ-`@/lib/icons` (Task 1).
- Produces: `NAV_ITEMS: {href: string; label: string; icon: IconName; exact?: boolean}[]`, `MOBILE_NAV_ITEMS` (תת-קבוצה) - צריכה גם ב-Task-ים עתידיים אם ייווצר צורך בניווט נוסף.

- [ ] **Step 1: יצירת `src/lib/nav-items.ts`**

```ts
import type { IconName } from "@/lib/icons";

export type NavItem = { href: string; label: string; icon: IconName; exact?: boolean };

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "לוח בקרה", icon: "dashboard", exact: true },
  { href: "/dashboard/properties", label: "נכסים", icon: "properties" },
  { href: "/dashboard/leases", label: "חוזים", icon: "leases", exact: true },
  { href: "/dashboard/leases/import", label: "ייבוא חוזה", icon: "leaseImport" },
  { href: "/dashboard/expenses", label: "הוצאות", icon: "expenses" },
  { href: "/dashboard/payments", label: "תקבולים", icon: "payments" },
  { href: "/dashboard/reports", label: "דוחות", icon: "reports" },
  { href: "/dashboard/reports/tax", label: "דוח מס", icon: "taxReport" },
  { href: "/dashboard/debts", label: "חובות", icon: "debts" },
  { href: "/dashboard/tasks", label: "תזכורות", icon: "tasks" },
  { href: "/dashboard/about", label: "אודות", icon: "about" },
  { href: "/dashboard/maintenance", label: "תחזוקה", icon: "maintenance" },
];

export const MOBILE_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "בקרה", icon: "dashboard", exact: true },
  { href: "/dashboard/properties", label: "נכסים", icon: "properties" },
  { href: "/dashboard/leases", label: "חוזים", icon: "leases", exact: true },
  { href: "/dashboard/payments", label: "תקבולים", icon: "payments" },
  { href: "/dashboard/tasks", label: "תזכורות", icon: "tasks" },
];
```

- [ ] **Step 2: עדכון `src/app/dashboard/layout.tsx` - ייבואים + הסרת המערכים המקומיים**

Edit (`src/app/dashboard/layout.tsx:1-22`) - old:
```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { QueryProvider } from "@/components/query-provider";

const NAV_ITEMS = [
  { href: "/dashboard", label: "לוח בקרה", icon: "🏠", exact: true },
  { href: "/dashboard/properties", label: "נכסים", icon: "🏢" },
  { href: "/dashboard/leases", label: "חוזים", icon: "📄", exact: true },
  { href: "/dashboard/leases/import", label: "ייבוא חוזה", icon: "📥" },
  { href: "/dashboard/expenses", label: "הוצאות", icon: "💸" },
  { href: "/dashboard/payments", label: "תקבולים", icon: "💳" },
  { href: "/dashboard/reports", label: "דוחות", icon: "📊" },
  { href: "/dashboard/reports/tax", label: "דוח מס", icon: "📋" },
  { href: "/dashboard/debts", label: "חובות", icon: "🔴" },
  { href: "/dashboard/tasks", label: "תזכורות", icon: "🔔" },
  { href: "/dashboard/about", label: "אודות", icon: "ℹ️" },
  { href: "/dashboard/maintenance", label: "תחזוקה", icon: "🔧" },
];

function NavItem({ href, label, icon, exact }: { href: string; label: string; icon: string; exact?: boolean }) {
```

new:
```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { QueryProvider } from "@/components/query-provider";
import { Icon } from "@/components/Icon";
import { NAV_ITEMS, MOBILE_NAV_ITEMS, type NavItem as NavItemType } from "@/lib/nav-items";

function NavItem({ href, label, icon, exact }: NavItemType) {
```

- [ ] **Step 3: עדכון רינדור-האייקון בתוך `NavItem` (שורה ~40)**

old:
```tsx
      <span className="text-base leading-none" aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
```

new:
```tsx
      <Icon name={icon} size={20} color={isActive ? "var(--accent)" : "var(--text-2)"} />
      <span>{label}</span>
    </Link>
  );
}
```

- [ ] **Step 4: הגדרות/התנתקות/תפריט-מובייל (שורות 107, 113, 143)**

old (107):
```tsx
              <span aria-hidden="true">⚙</span>
```
new:
```tsx
              <Icon name="settings" size={16} />
```

old (113):
```tsx
              <span aria-hidden="true">↩</span>
```
new:
```tsx
              <Icon name="signOut" size={16} />
```

old (143):
```tsx
            <span aria-hidden="true">☰</span>
```
new:
```tsx
            <Icon name="menu" size={20} />
```

- [ ] **Step 5: `nav.map(NAV_ITEMS)` - וידוא ה-import הישן לא נדרש (שורה ~88, ללא שינוי בגוף אבל לוודא `NAV_ITEMS` מגיע מהאימפורט החדש)**

אין שינוי בשורה `{NAV_ITEMS.map((item) => (` עצמה - היא כבר צורכת את המשתנה שעכשיו מיובא מ-`@/lib/nav-items` במקום מוגדר-מקומית.

- [ ] **Step 6: מערך ה-bottom-nav המקומי (שורות 161-170) - מוחלף בייבוא**

old:
```tsx
          {[
            { href: "/dashboard", label: "בקרה", icon: "🏠", exact: true },
            { href: "/dashboard/properties", label: "נכסים", icon: "🏢" },
            { href: "/dashboard/leases", label: "חוזים", icon: "📄", exact: true },
            { href: "/dashboard/payments", label: "תקבולים", icon: "💳" },
            { href: "/dashboard/tasks", label: "תזכורות", icon: "🔔" },
          ].map((item) => (
            <MobileNavItem key={item.href} {...item} />
          ))}
```

new:
```tsx
          {MOBILE_NAV_ITEMS.map((item) => (
            <MobileNavItem key={item.href} {...item} />
          ))}
```

- [ ] **Step 7: `MobileNavItem` - טיפוס + רינדור (שורות 177-187)**

old:
```tsx
function MobileNavItem({ href, label, icon, exact }: { href: string; label: string; icon: string; exact?: boolean }) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link href={href} className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg min-w-0 flex-1 min-h-[44px] justify-center"
      style={{ color: isActive ? "var(--accent)" : "var(--text-3)" }}>
      <span className="text-xl leading-none" aria-hidden="true">{icon}</span>
      <span className="text-[11px] font-medium truncate w-full text-center">{label}</span>
    </Link>
  );
}
```

new:
```tsx
function MobileNavItem({ href, label, icon, exact }: NavItemType) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link href={href} className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg min-w-0 flex-1 min-h-[44px] justify-center"
      style={{ color: isActive ? "var(--accent)" : "var(--text-3)" }}>
      <Icon name={icon} size={22} color={isActive ? "var(--accent)" : "var(--text-3)"} />
      <span className="text-[11px] font-medium truncate w-full text-center">{label}</span>
    </Link>
  );
}
```

- [ ] **Step 8: typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 שגיאות.

- [ ] **Step 9: בדיקה ידנית מהירה**

Run: `npm run dev` ואז לפתוח `http://localhost:3000/dashboard` בדפדפן - לוודא שהסרגל והתפריט-התחתון מציגים אייקונים (לא ריבועים-ריקים/שגיאת-קונסולה). לעצור את השרת בסיום.

- [ ] **Step 10: Commit**

```bash
git add src/lib/nav-items.ts src/app/dashboard/layout.tsx
git commit -m "refactor: איחוד NAV_ITEMS למקור-אמת יחיד + מעבר לאייקוני Phosphor"
```

---

### Task 3: דשבורד ראשי (`dashboard/page.tsx`)

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `Icon`, `IconName` (Task 1).

- [ ] **Step 1: הסרת הברכה (👋) - שורה 204**

old:
```tsx
          שלום 👋
```
new:
```tsx
          שלום
```

- [ ] **Step 2: כפתורי-פעולה מהירה - ייבוא/נכס-חדש/דוחות/דוח-מס (שורות 213-228)**

old:
```tsx
        <Link href="/dashboard/leases/import"
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all">
          <span aria-hidden="true">📥</span> ייבוא חוזה
        </Link>
        <Link href="/dashboard/properties/new"
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 border border-gray-200 transition-all">
          <span aria-hidden="true">🏢</span> נכס חדש
        </Link>
        <Link href="/dashboard/reports"
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 border border-gray-200 transition-all">
          <span aria-hidden="true">📊</span> דוחות
        </Link>
        <Link href="/dashboard/reports/tax"
          className="flex items-center gap-2 px-5 py-2.5 bg-orange-50 text-orange-700 rounded-xl font-semibold text-sm hover:bg-orange-100 border border-orange-200 transition-all">
          <span aria-hidden="true">📋</span> דוח מס שנתי
        </Link>
```
new:
```tsx
        <Link href="/dashboard/leases/import"
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all">
          <Icon name="leaseImport" size={16} /> ייבוא חוזה
        </Link>
        <Link href="/dashboard/properties/new"
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 border border-gray-200 transition-all">
          <Icon name="properties" size={16} /> נכס חדש
        </Link>
        <Link href="/dashboard/reports"
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 border border-gray-200 transition-all">
          <Icon name="reports" size={16} /> דוחות
        </Link>
        <Link href="/dashboard/reports/tax"
          className="flex items-center gap-2 px-5 py-2.5 bg-orange-50 text-orange-700 rounded-xl font-semibold text-sm hover:bg-orange-100 border border-orange-200 transition-all">
          <Icon name="taxReport" size={16} color="var(--accent-hover)" /> דוח מס שנתי
        </Link>
```

- [ ] **Step 3: פיד "מאז הביקור האחרון" (שורה 235) + סימוני-✓ (שורות 241, 245)**

old:
```tsx
            <span aria-hidden="true">🗞️</span> מאז הביקור האחרון
          </p>
          <ul className="text-sm space-y-1">
            {sinceSummary.paymentsCount > 0 && (
              <li className="flex justify-between">
                <span>{sinceSummary.paymentsCount} תקבולי שכ&quot;ד נכנסו</span>
                <span className="font-bold text-emerald-700 num-ltr">₪{sinceSummary.paymentsSum.toLocaleString()} ✓</span>
              </li>
            )}
            {sinceSummary.tasksDone > 0 && (
              <li className="flex justify-between"><span>{sinceSummary.tasksDone} תזכורות סומנו כבוצעו</span><span className="text-emerald-700">✓</span></li>
            )}
```
new:
```tsx
            <Icon name="weeklyDigest" size={16} color="var(--accent-hover)" /> מאז הביקור האחרון
          </p>
          <ul className="text-sm space-y-1">
            {sinceSummary.paymentsCount > 0 && (
              <li className="flex justify-between items-center">
                <span>{sinceSummary.paymentsCount} תקבולי שכ&quot;ד נכנסו</span>
                <span className="font-bold text-emerald-700 num-ltr flex items-center gap-1">₪{sinceSummary.paymentsSum.toLocaleString()} <Icon name="check" size={14} /></span>
              </li>
            )}
            {sinceSummary.tasksDone > 0 && (
              <li className="flex justify-between items-center"><span>{sinceSummary.tasksDone} תזכורות סומנו כבוצעו</span><Icon name="check" size={14} className="text-emerald-700" /></li>
            )}
```

- [ ] **Step 4: "דורש טיפול" (שורה 260)**

old:
```tsx
          <p className="text-sm font-bold text-amber-700"><span aria-hidden="true">📌</span> דורש טיפול ({attention.length})</p>
```
new:
```tsx
          <p className="text-sm font-bold text-amber-700 flex items-center gap-1"><Icon name="pin" size={16} /> דורש טיפול ({attention.length})</p>
```

- [ ] **Step 5: חצי-מגמה (שורה 280)**

old:
```tsx
              <span aria-hidden="true" className="text-xs">{trendPct > 0 ? "▲" : "▼"}</span>{" "}
```
new:
```tsx
              <Icon name={trendPct > 0 ? "caretUp" : "caretDown"} size={12} className="inline" />{" "}
```

- [ ] **Step 6: כרטיסי הכנסה/הוצאה - `icon` בתוך `incomeExpenseStats` (שורות 194-195) + הרינדור (שורה 305)**

old (194-195):
```tsx
    { label: "הכנסה חודשית", value: monthlyIncome > 0 ? `₪${monthlyIncome.toLocaleString()}` : "-", subValue: monthlyIncome > 0 ? `₪${Math.round(monthlyIncome * 0.9).toLocaleString()} לאחר מס` : undefined, icon: "💰", gradient: "from-emerald-500 to-emerald-700", href: "/dashboard/reports" },
    { label: "הוצאות כוללות", value: totalExpenses > 0 ? `₪${totalExpenses.toLocaleString()}` : "₪0", icon: "💸", gradient: "from-rose-500 to-rose-700", href: "/dashboard/expenses" },
```
new:
```tsx
    { label: "הכנסה חודשית", value: monthlyIncome > 0 ? `₪${monthlyIncome.toLocaleString()}` : "-", subValue: monthlyIncome > 0 ? `₪${Math.round(monthlyIncome * 0.9).toLocaleString()} לאחר מס` : undefined, icon: "rentCollection" as const, gradient: "from-emerald-500 to-emerald-700", href: "/dashboard/reports" },
    { label: "הוצאות כוללות", value: totalExpenses > 0 ? `₪${totalExpenses.toLocaleString()}` : "₪0", icon: "expenses" as const, gradient: "from-rose-500 to-rose-700", href: "/dashboard/expenses" },
```

old (305):
```tsx
            <span className="absolute -top-2 -left-2 text-5xl opacity-15 select-none" aria-hidden="true">{s.icon}</span>
```
new:
```tsx
            <span className="absolute -top-2 -left-2 opacity-15 select-none"><Icon name={s.icon} size={48} color="white" /></span>
```

- [ ] **Step 7: מצב-ריק "אין נכסים" (שורות 353, 359, 363)**

old:
```tsx
            <div className="text-5xl" aria-hidden="true">🏠</div>
            <p className="text-gray-500 font-medium">עדיין אין נכסים</p>
            <p className="text-gray-400 text-sm">התחל בהוספת נכס או בייבוא חוזה</p>
            <div className="flex gap-3 justify-center pt-2">
              <Link href="/dashboard/leases/import"
                className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700">
                <span aria-hidden="true">📥</span> ייבוא חוזה
              </Link>
              <Link href="/dashboard/properties/new"
                className="px-5 py-2 bg-white text-gray-700 rounded-xl font-semibold text-sm border border-gray-200 hover:bg-gray-50">
                <span aria-hidden="true">🏢</span> הוסף נכס
              </Link>
```
new:
```tsx
            <div className="flex justify-center"><Icon name="dashboard" size={48} className="text-gray-300" /></div>
            <p className="text-gray-500 font-medium">עדיין אין נכסים</p>
            <p className="text-gray-400 text-sm">התחל בהוספת נכס או בייבוא חוזה</p>
            <div className="flex gap-3 justify-center pt-2">
              <Link href="/dashboard/leases/import"
                className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700">
                <Icon name="leaseImport" size={16} /> ייבוא חוזה
              </Link>
              <Link href="/dashboard/properties/new"
                className="px-5 py-2 bg-white text-gray-700 rounded-xl font-semibold text-sm border border-gray-200 hover:bg-gray-50">
                <Icon name="properties" size={16} /> הוסף נכס
              </Link>
```

- [ ] **Step 8: הוספת ה-import בראש הקובץ**

בשורה הראשונה שאחרי שאר ה-imports (למצוא בפועל את בלוק ה-imports הקיים בראש `dashboard/page.tsx` ולהוסיף):

```tsx
import { Icon } from "@/components/Icon";
```

- [ ] **Step 9: typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 שגיאות.

- [ ] **Step 10: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "refactor(dashboard): מעבר לאייקוני Phosphor, הסרת ברכת-האמוג'י"
```

---

### Task 4: תזכורות (`tasks/page.tsx`)

**Files:**
- Modify: `src/app/dashboard/tasks/page.tsx`

- [ ] **Step 1: הוספת import + retype ל-`CAT_ICON` (שורות 24-35)**

old:
```tsx
const CAT_ICON: Record<string, string> = {
  Insurance: "🛡️",
  "Rent Collection": "💰",
  "Lease Renewal": "📋",
  Maintenance: "🔧",
  Tax: "📊",
  Gas: "🔥",
  Water: "💧",
  Electricity: "⚡",
  "Municipal Tax": "🏛️",
  Other: "📌",
};
```
new (ולהוסיף `import { Icon } from "@/components/Icon";` ו-`import type { IconName } from "@/lib/icons";` לראש הקובץ, ליד שאר ה-imports):
```tsx
const CAT_ICON: Record<string, IconName> = {
  Insurance: "insurance",
  "Rent Collection": "rentCollection",
  "Lease Renewal": "leaseRenewal",
  Maintenance: "maintenance",
  Tax: "tax",
  Gas: "gas",
  Water: "water",
  Electricity: "electricity",
  "Municipal Tax": "municipalTax",
  Other: "pin",
};
```

- [ ] **Step 2: רינדור-הקטגוריה (שורה 584)**

old:
```tsx
                {CAT_ICON[t.category] || "📌"}
```
new:
```tsx
                <Icon name={CAT_ICON[t.category] ?? "pin"} size={18} />
```

- [ ] **Step 3: מחיקה/ביטול/בוצע (שורות 621, 677, 724, 735)**

old (621):
```tsx
                🗑
```
new:
```tsx
                <Icon name="delete" size={16} />
```

old (677):
```tsx
                {completingId !== null ? "..." : "בוצע ✓"}
```
new:
```tsx
                {completingId !== null ? "..." : <span className="flex items-center gap-1">בוצע <Icon name="check" size={14} /></span>}
```

old (724):
```tsx
                ✕
```
new:
```tsx
                <Icon name="cancel" size={16} />
```

old (735):
```tsx
        <button onClick={() => { setShowForm(false); resetForm(); }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
```
new:
```tsx
        <button onClick={() => { setShowForm(false); resetForm(); }} className="text-gray-400 hover:text-gray-600"><Icon name="cancel" size={18} /></button>
```

- [ ] **Step 4: אישור-סטטוס בכרטיסי-סיכום (שורות 931, 970) + carets (949, 977)**

old (931):
```tsx
          <div className="text-3xl">✅</div>
```
new:
```tsx
          <div className="flex justify-center"><Icon name="paid" size={32} color="var(--emerald,#047857)" /></div>
```

old (970):
```tsx
              <span className="text-lg">✅</span>
```
new:
```tsx
              <Icon name="paid" size={18} className="text-emerald-700" />
```

old (949):
```tsx
          <span className="text-gray-400 text-xs">{showFuture ? "▲" : "▼"}</span>
```
new:
```tsx
          <Icon name={showFuture ? "caretUp" : "caretDown"} size={14} className="text-gray-400" />
```

old (977):
```tsx
              {showDone ? "סגור ▲" : "הצג ▼"}
```
new:
```tsx
              {showDone ? <>סגור <Icon name="caretUp" size={14} className="inline" /></> : <>הצג <Icon name="caretDown" size={14} className="inline" /></>}
```

- [ ] **Step 5: typecheck + lint + vitest**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: 0 שגיאות, כל הבדיקות ירוקות.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/tasks/page.tsx
git commit -m "refactor(tasks): מעבר לאייקוני Phosphor - קטגוריות, פעולות, carets"
```

---

### Task 5: הוצאות (`expenses/page.tsx`)

**Files:**
- Modify: `src/app/dashboard/expenses/page.tsx`

- [ ] **Step 1: הוספת imports + retype ל-`CAT_ICON` (שורות 18-25)**

old:
```tsx
const CAT_ICON: Record<string, string> = {
  Maintenance: "🔧",
  Insurance: "🛡️",
  Tax: "📋",
  Utilities: "💡",
  "Professional Fees": "👔",
  Other: "📦",
};
```
new (עם `import { Icon } from "@/components/Icon"; import type { IconName } from "@/lib/icons";` בראש הקובץ):
```tsx
const CAT_ICON: Record<string, IconName> = {
  Maintenance: "maintenance",
  Insurance: "insurance",
  Tax: "leaseRenewal",
  Utilities: "electricity",
  "Professional Fees": "professionalFees",
  Other: "other",
};
```

> הערה: `Tax` כאן משתמש ב-`leaseRenewal` (`CalendarCheck`) ולא ב-`tax` (`Percent`) - **לתקן לפני commit**: השם הנכון-סמנטית הוא `tax` (`Percent`), לא `leaseRenewal`. השתמשו ב:
```tsx
  Tax: "tax",
```

- [ ] **Step 2: כפתור-ניקוי-סינון וסגירת-טופס (שורות 277, 290)**

old (277):
```tsx
        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">נקה סינון ✕</button>
```
new:
```tsx
        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">נקה סינון <Icon name="cancel" size={14} /></button>
```

old (290):
```tsx
      <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
```
new:
```tsx
      <button onClick={closeForm} className="text-gray-400 hover:text-gray-600"><Icon name="cancel" size={18} /></button>
```

- [ ] **Step 3: מצב-ריק ואייקון-קטגוריה (שורות 393, 407)**

old (393):
```tsx
          <div className="text-4xl">💸</div>
```
new:
```tsx
          <div className="flex justify-center"><Icon name="expenses" size={36} className="text-gray-300" /></div>
```

old (407):
```tsx
                    {CAT_ICON[e.category] || "📦"}
```
new:
```tsx
                    <Icon name={CAT_ICON[e.category] ?? "other"} size={18} />
```

- [ ] **Step 4: הערה, עריכה, מחיקה (שורות 417, 426, 442)**

old (417):
```tsx
{e.notes && <p className="text-xs text-gray-500 mt-0.5 truncate">📝 {e.notes}</p>}
```
new:
```tsx
{e.notes && <p className="text-xs text-gray-500 mt-0.5 truncate flex items-center gap-1"><Icon name="note" size={12} /> {e.notes}</p>}
```

old (426):
```tsx
                    ✏️
```
new:
```tsx
                    <Icon name="edit" size={16} />
```

old (442):
```tsx
                    🗑
```
new:
```tsx
                    <Icon name="delete" size={16} />
```

- [ ] **Step 5: typecheck + lint + vitest**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: 0 שגיאות.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/expenses/page.tsx
git commit -m "refactor(expenses): מעבר לאייקוני Phosphor - קטגוריות ופעולות"
```

---

### Task 6: רשימת-נכסים (`properties/page.tsx`)

**Files:**
- Modify: `src/app/dashboard/properties/page.tsx`

- [ ] **Step 1: הוספת imports + retype ל-`TYPE_ICON` (שורה 10)**

old:
```tsx
const TYPE_ICON: Record<string, string> = { Apartment: "🏢", House: "🏠", Commercial: "🏪" };
```
new (עם `import { Icon } from "@/components/Icon"; import type { IconName } from "@/lib/icons";` בראש הקובץ):
```tsx
const TYPE_ICON: Record<string, IconName> = { Apartment: "apartment", House: "house", Commercial: "commercial" };
```

- [ ] **Step 2: כפתורי-פעולה מהירה (שורות 84, 102, 105) + מצב-ריק (97) + רינדור-סוג-נכס (120)**

old (84):
```tsx
          📥 ייבוא חוזה
```
new:
```tsx
          <Icon name="leaseImport" size={16} className="inline" /> ייבוא חוזה
```

old (97):
```tsx
          <div className="text-5xl">🏠</div>
```
new:
```tsx
          <div className="flex justify-center"><Icon name="dashboard" size={44} className="text-gray-300" /></div>
```

old (102):
```tsx
            📥 ייבוא חוזה
```
new:
```tsx
            <Icon name="leaseImport" size={16} className="inline" /> ייבוא חוזה
```

old (105):
```tsx
            🏢 הוסף נכס
```
new:
```tsx
            <Icon name="properties" size={16} className="inline" /> הוסף נכס
```

old (120):
```tsx
                      {TYPE_ICON[p.property_type] || "🏠"}
```
new:
```tsx
                      <Icon name={TYPE_ICON[p.property_type] ?? "house"} size={20} />
```

- [ ] **Step 3: עריכה/מחיקה (שורות 150, 174)**

old (150):
```tsx
                    ✏️ עריכה
```
new:
```tsx
                    <Icon name="edit" size={14} className="inline" /> עריכה
```

old (174):
```tsx
                    🗑️ מחיקה
```
new:
```tsx
                    <Icon name="delete" size={14} className="inline" /> מחיקה
```

- [ ] **Step 4: typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 שגיאות.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/properties/page.tsx
git commit -m "refactor(properties): מעבר לאייקוני Phosphor - סוג-נכס ופעולות"
```

---

### Task 7: פרטי-נכס (`properties/[id]/page.tsx`)

**Files:**
- Modify: `src/app/dashboard/properties/[id]/page.tsx`

- [ ] **Step 1: הוספת imports + retype ל-`UTILITY_TYPE_OPTIONS` (שורות 31-38)**

old:
```tsx
const UTILITY_TYPE_OPTIONS: { value: PropertyUtilityType; label: string; icon: string }[] = [
  { value: "water", label: "מים", icon: "💧" },
  { value: "gas", label: "גז", icon: "🔥" },
  { value: "electricity", label: "חשמל", icon: "⚡" },
  { value: "municipal_tax", label: "ארנונה", icon: "🏛️" },
  { value: "house_committee", label: "ועד בית", icon: "🏢" },
  { value: "other", label: "אחר", icon: "📌" },
];
```
new (עם `import { Icon } from "@/components/Icon"; import type { IconName } from "@/lib/icons";` בראש הקובץ):
```tsx
const UTILITY_TYPE_OPTIONS: { value: PropertyUtilityType; label: string; icon: IconName }[] = [
  { value: "water", label: "מים", icon: "water" },
  { value: "gas", label: "גז", icon: "gas" },
  { value: "electricity", label: "חשמל", icon: "electricity" },
  { value: "municipal_tax", label: "ארנונה", icon: "municipalTax" },
  { value: "house_committee", label: "ועד בית", icon: "houseCommittee" },
  { value: "other", label: "אחר", icon: "pin" },
];
```

> `UTILITY_TYPE_ICON` (השורה שאחרי, `Object.fromEntries(...)`) נגזרת אוטומטית מ-`UTILITY_TYPE_OPTIONS` - אין צורך לגעת בה, הטיפוס שלה יתעדכן ממילא.

- [ ] **Step 2: מצב-ריק, עריכה, מחיקה (שורות 361, 568, 574)**

old (361):
```tsx
            <div className="text-4xl mb-3">✅</div>
```
new:
```tsx
            <div className="flex justify-center mb-3"><Icon name="paid" size={36} className="text-emerald-600" /></div>
```

old (568):
```tsx
              ✏️ עריכה
```
new:
```tsx
              <Icon name="edit" size={14} className="inline" /> עריכה
```

old (574):
```tsx
              🗑️ מחיקה
```
new:
```tsx
              <Icon name="delete" size={14} className="inline" /> מחיקה
```

- [ ] **Step 3: התרעת-פקיעת-חוזה (שורה 595) - `⛔`/`🔴`/`🟡`**

old:
```tsx
                    {isExpired ? "⛔" : days <= 30 ? "🔴" : "🟡"}&nbsp;
```
new:
```tsx
                    <Icon name={isExpired ? "expired" : days <= 30 ? "expiringSoon" : "expiringSoon"} size={16} color={isExpired ? "var(--rose,#be123c)" : days <= 30 ? "var(--rose,#be123c)" : "var(--amber,#92400e)"} />&nbsp;
```

- [ ] **Step 4: הוספת-חוזה/הוצאה/תקבול (שורות 730, 736, 742)**

old (730):
```tsx
              <span>📋</span> הוסף חוזה שכירות
```
new:
```tsx
              <Icon name="leases" size={16} /> הוסף חוזה שכירות
```

old (736):
```tsx
              <span>🧾</span> הוסף הוצאה
```
new:
```tsx
              <Icon name="expenses" size={16} /> הוסף הוצאה
```

old (742):
```tsx
              <span>💰</span> הוסף תקבול
```
new:
```tsx
              <Icon name="rentCollection" size={16} /> הוסף תקבול
```

- [ ] **Step 5: מסמך-מצורף, אופציה, סיום, עריכה, מחיקה (שורות 844, 858, 864, 926, 934)**

old (844):
```tsx
              <span>📎</span>
```
new:
```tsx
              <Icon name="attachment" size={16} />
```

old (858):
```tsx
                🔄 אופציה
```
new:
```tsx
                <Icon name="sync" size={14} className="inline" /> אופציה
```

old (864):
```tsx
                🚪 סיום
```
new:
```tsx
                <Icon name="earlyTermination" size={14} className="inline" /> סיום
```

old (926):
```tsx
              ✏️ עריכה
```
new:
```tsx
              <Icon name="edit" size={14} className="inline" /> עריכה
```

old (934):
```tsx
              {isConfirmingDelete ? "בטוח?" : "🗑️ מחיקה"}
```
new:
```tsx
              {isConfirmingDelete ? "בטוח?" : <><Icon name="delete" size={14} className="inline" /> מחיקה</>}
```

- [ ] **Step 6: כותרת "תזכורות שקים חודשיים" (שורה 983) + מיני-רמזור סטטוס-תשלום (שורה 1000)**

old (983):
```tsx
          <h2 className="text-base font-bold text-amber-800 mb-3">🔔 תזכורות שקים חודשיים</h2>
```
new:
```tsx
          <h2 className="text-base font-bold text-amber-800 mb-3 flex items-center gap-1.5"><Icon name="tasks" size={18} /> תזכורות שקים חודשיים</h2>
```

old (1000):
```tsx
                      {r.status === "paid" ? "✅ התקבל" : r.status === "partial" ? "🔶 חלקי" : r.dueDate <= today ? "⚠️ לא התקבל" : "📅 עתידי"}
```
new:
```tsx
                      {r.status === "paid" ? <span className="flex items-center gap-1"><Icon name="paid" size={16} color="var(--emerald,#047857)" /> התקבל</span>
                        : r.status === "partial" ? <span className="flex items-center gap-1"><Icon name="partial" size={16} color="var(--amber,#92400e)" /> חלקי</span>
                        : r.dueDate <= today ? <span className="flex items-center gap-1"><Icon name="unpaid" size={16} color="var(--rose,#be123c)" /> לא התקבל</span>
                        : <span className="flex items-center gap-1"><Icon name="future" size={16} className="text-gray-400" /> עתידי</span>}
```

> **תיקון-אגב (spec §3, task-3 בטבלה)**: זה מאחד את סטטוס-ה"עתידי" ל-`future`/`Calendar` - אותו שם-לוגי שישמש גם ב-Task 8 עבור `reports/[propertyId]/page.tsx:327` שהיה `🔲`. שני המסכים יציגו מעתה אותו אייקון לאותה משמעות.

- [ ] **Step 7: typecheck + lint + vitest**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: 0 שגיאות.

- [ ] **Step 8: Commit**

```bash
git add src/app/dashboard/properties/[id]/page.tsx
git commit -m "refactor(property-detail): מעבר לאייקוני Phosphor - חשבונות-שירות, סטטוס-תשלום, פעולות"
```

---

### Task 8: דוחות (`reports/page.tsx`, `reports/[propertyId]/page.tsx`, `reports/tax/page.tsx`, `reports/linkage/page.tsx`)

**Files:**
- Modify: `src/app/dashboard/reports/page.tsx`
- Modify: `src/app/dashboard/reports/[propertyId]/page.tsx`
- Modify: `src/app/dashboard/reports/tax/page.tsx`
- Modify: `src/app/dashboard/reports/linkage/page.tsx`

- [ ] **Step 1: `reports/page.tsx` - כותרות-קישור (שורות 231, 234) + כרטיסי-סטטיסטיקה (305-308, 312)**

הוספת `import { Icon } from "@/components/Icon";` בראש הקובץ.

old (231, 234):
```tsx
              השוואת הצמדה 📈
```
```tsx
              דוח מס שנתי 📋
```
new:
```tsx
              השוואת הצמדה <Icon name="paid" size={14} className="inline" />
```
```tsx
              דוח מס שנתי <Icon name="taxReport" size={14} className="inline" />
```

old (305-308):
```tsx
              { label: "נכסים", value: String(totals.properties), icon: "🏠", gradient: "from-zinc-600 to-zinc-800" },
              { label: "חוזים פעילים", value: String(totals.activeLeases), icon: "📄", gradient: "from-pink-500 to-pink-700" },
              { label: selectedYear ? `הכנסה ${selectedYear}` : "הכנסה חודשית", value: selectedYear ? fmt(totals.totalPaid) : fmt(totals.monthlyRent), icon: "💰", gradient: "from-emerald-500 to-emerald-700" },
              { label: profitCard.label, value: profitCard.value, icon: profitCard.positive ? "📈" : "📉", gradient: profitCard.positive ? "from-emerald-500 to-emerald-700" : "from-rose-500 to-rose-700" },
```
new:
```tsx
              { label: "נכסים", value: String(totals.properties), icon: "properties" as const, gradient: "from-zinc-600 to-zinc-800" },
              { label: "חוזים פעילים", value: String(totals.activeLeases), icon: "leases" as const, gradient: "from-pink-500 to-pink-700" },
              { label: selectedYear ? `הכנסה ${selectedYear}` : "הכנסה חודשית", value: selectedYear ? fmt(totals.totalPaid) : fmt(totals.monthlyRent), icon: "rentCollection" as const, gradient: "from-emerald-500 to-emerald-700" },
              { label: profitCard.label, value: profitCard.value, icon: (profitCard.positive ? "paid" : "unpaid") as const, gradient: profitCard.positive ? "from-emerald-500 to-emerald-700" : "from-rose-500 to-rose-700" },
```

old (310, 312):
```tsx
            return cards.map(({ label, value, icon, gradient }) => (
```
```tsx
                <div className="absolute -top-3 -left-3 text-5xl opacity-15 select-none">{icon}</div>
```
new (שורה 310 נשארת ללא שינוי - היא רק destructure; שורה 312 בלבד משתנה):
```tsx
                <div className="absolute -top-3 -left-3 opacity-15 select-none"><Icon name={icon} size={48} color="white" /></div>
```

> **הערה חשובה**: `profitCard.positive ? "📈" : "📉"` הפך ל-`profitCard.positive ? "paid" : "unpaid"` - `paid`(`CheckCircle`)/`unpaid`(`Warning`) הם קירוב סמנטי ל"מגמה-חיובית/שלילית", לא "חץ-מגמה" מדויק. אם ברצונך אייקון-מגמה ייעודי (חץ-עולה/יורד ולא וי/אזהרה) - אפשר להשתמש ב-`TrendUp`/`TrendDown` של Phosphor במקום; זה דורש הוספת שני ערכים חדשים ל-`ICONS` (`trendUp`/`trendDown`) ב-Task 1 (חזרה-לאחור קטנה אם תרצה זאת - לא נדרש להיקף המאושר).

- [ ] **Step 2: `reports/[propertyId]/page.tsx` - כרטיסי-סטטיסטיקה (163-168, 171) + מיני-רמזור (327)**

הוספת `import { Icon } from "@/components/Icon";` בראש הקובץ.

old (163-168):
```tsx
                  { label: "שכ\"ד חודשי", value: report.monthly_rent > 0 ? fmt(report.monthly_rent) : "-", icon: "📄", gradient: "from-pink-500 to-pink-700" },
                  { label: "הכנסה כוללת", value: fmt(report.total_paid), icon: "💰", gradient: "from-emerald-500 to-emerald-700" },
                  { label: "הוצאות כוללות", value: fmt(report.total_expenses), icon: "💸", gradient: "from-rose-500 to-rose-700" },
                  ...(showTax
                    ? { label: "נטו אחרי מס", value: fmt(netAfterTax), icon: netAfterTax >= 0 ? "📈" : "📉", gradient: netAfterTax >= 0 ? "from-emerald-500 to-emerald-700" : "from-rose-500 to-rose-700" }
                    : { label: "רווח נטו", value: fmt(report.net_income), icon: report.net_income >= 0 ? "📈" : "📉", gradient: report.net_income >= 0 ? "from-emerald-500 to-emerald-700" : "from-rose-500 to-rose-700" },
```
new:
```tsx
                  { label: "שכ\"ד חודשי", value: report.monthly_rent > 0 ? fmt(report.monthly_rent) : "-", icon: "leases" as const, gradient: "from-pink-500 to-pink-700" },
                  { label: "הכנסה כוללת", value: fmt(report.total_paid), icon: "rentCollection" as const, gradient: "from-emerald-500 to-emerald-700" },
                  { label: "הוצאות כוללות", value: fmt(report.total_expenses), icon: "expenses" as const, gradient: "from-rose-500 to-rose-700" },
                  ...(showTax
                    ? { label: "נטו אחרי מס", value: fmt(netAfterTax), icon: (netAfterTax >= 0 ? "paid" : "unpaid") as const, gradient: netAfterTax >= 0 ? "from-emerald-500 to-emerald-700" : "from-rose-500 to-rose-700" }
                    : { label: "רווח נטו", value: fmt(report.net_income), icon: (report.net_income >= 0 ? "paid" : "unpaid") as const, gradient: report.net_income >= 0 ? "from-emerald-500 to-emerald-700" : "from-rose-500 to-rose-700" },
```

old (169, 171):
```tsx
                ].map(({ label, value, icon, gradient }) => (
```
```tsx
                    <div className="absolute -top-3 -left-3 text-5xl opacity-15 select-none">{icon}</div>
```
new (169 ללא שינוי, 171 בלבד):
```tsx
                    <div className="absolute -top-3 -left-3 opacity-15 select-none"><Icon name={icon} size={48} color="white" /></div>
```

old (327):
```tsx
                        {isPaid ? "✅" : isPartial ? "🔶" : isFuture ? "🔲" : "❌"}
```
new:
```tsx
                        <Icon name={isPaid ? "paid" : isPartial ? "partial" : isFuture ? "future" : "overdue"}
                          size={16}
                          color={isPaid ? "var(--emerald,#047857)" : isPartial ? "var(--amber,#92400e)" : isFuture ? undefined : "var(--rose,#be123c)"} />
```

- [ ] **Step 3: `reports/tax/page.tsx` (שורות 152, 213)**

הוספת `import { Icon } from "@/components/Icon";` בראש הקובץ.

old (152):
```tsx
              🖨️ הדפס / PDF
```
new:
```tsx
              <Icon name="print" size={16} className="inline" /> הדפס / PDF
```

old (213):
```tsx
          <div className="text-4xl mb-3">📋</div>
```
new:
```tsx
          <div className="flex justify-center mb-3"><Icon name="taxReport" size={36} className="text-gray-300" /></div>
```

- [ ] **Step 4: `reports/linkage/page.tsx` (שורה 339 - רענון-מדדים) + carets (264, 400)**

הוספת `import { Icon } from "@/components/Icon";` בראש הקובץ.

old (339):
```tsx
                {refreshRatesMutation.isPending ? "מעדכן..." : "↻ עדכן מדדים"}
```
new:
```tsx
                {refreshRatesMutation.isPending ? "מעדכן..." : <><Icon name="refresh" size={14} className="inline" /> עדכן מדדים</>}
```

old (264):
```tsx
                    <span className="text-gray-400 mr-2">{dropdownOpen ? "▲" : "▼"}</span>
```
new:
```tsx
                    <Icon name={dropdownOpen ? "caretUp" : "caretDown"} size={14} className="text-gray-400 mr-2" />
```

old (400):
```tsx
                          {isSelected ? "▲" : "▼"}
```
new:
```tsx
                          <Icon name={isSelected ? "caretUp" : "caretDown"} size={14} />
```

- [ ] **Step 5: typecheck + lint + vitest**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: 0 שגיאות.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/reports/page.tsx src/app/dashboard/reports/\[propertyId\]/page.tsx src/app/dashboard/reports/tax/page.tsx src/app/dashboard/reports/linkage/page.tsx
git commit -m "refactor(reports): מעבר לאייקוני Phosphor - סטטיסטיקות, מיני-רמזור מאוחד, carets"
```

---

### Task 9: רשימת-חוזים (`leases/page.tsx`)

**Files:**
- Modify: `src/app/dashboard/leases/page.tsx`

- [ ] **Step 1: תווית "ארכיון" (שורה 149-161) - הוספת import + JSX במקום מחרוזת**

הוספת `import { Icon } from "@/components/Icon";` בראש הקובץ. `labels[f]` מוצג היום כטקסט בתוך `{labels[f]}` (שורה 161); כדי לשלב אייקון רק בטאב "ארכיון" בלי לשבור את שאר הטאבים, `labels` עובר מ-`Record<string,string>` ל-`Record<string, React.ReactNode>`.

old (שורה 149):
```tsx
          const labels = { all: "הכל", active: "בתוקף", future: "עתידיים", ended: "🗂 ארכיון" };
```
new:
```tsx
          const labels: Record<typeof f, React.ReactNode> = {
            all: "הכל",
            active: "בתוקף",
            future: "עתידיים",
            ended: <span className="inline-flex items-center gap-1"><Icon name="archive" size={14} /> ארכיון</span>,
          };
```

old (שורה 161, ללא שינוי בפועל - `{labels[f]}` כבר תומך ב-`ReactNode`, לא נדרש עדכון בשורת-הרינדור עצמה):
```tsx
              {labels[f]}
```

- [ ] **Step 2: מצב-ריק (שורה 173)**

old:
```tsx
          <div className="text-5xl">📄</div>
```
new:
```tsx
          <div className="flex justify-center"><Icon name="leases" size={44} className="text-gray-300" /></div>
```

- [ ] **Step 3: אמצעי-תשלום (שורה 228)**

old:
```tsx
                    {lease.payment_method === "bank_transfer" ? "💳 העברה בנקאית" : "🧾 שקים"}
```
new:
```tsx
                    {lease.payment_method === "bank_transfer"
                      ? <span className="flex items-center gap-1"><Icon name="creditCard" size={14} /> העברה בנקאית</span>
                      : <span className="flex items-center gap-1"><Icon name="expenses" size={14} /> שקים</span>}
```

- [ ] **Step 4: typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 שגיאות.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/leases/page.tsx
git commit -m "refactor(leases): מעבר לאייקוני Phosphor - אמצעי-תשלום ומצב-ריק"
```

---

### Task 10: ייבוא-חוזה (`leases/import/page.tsx`)

**Files:**
- Modify: `src/app/dashboard/leases/import/page.tsx`

- [ ] **Step 1: הוספת `import { Icon } from "@/components/Icon";` בראש הקובץ, ואז כל ההחלפות הבאות לפי שורה**

old (449):
```tsx
          <div className="text-6xl">✅</div>
```
new:
```tsx
          <div className="flex justify-center"><Icon name="paid" size={52} className="text-emerald-600" /></div>
```

old (460):
```tsx
          <h1 className="text-2xl font-bold text-gray-900">📥 ייבוא חוזה שכירות</h1>
```
new:
```tsx
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Icon name="leaseImport" size={24} /> ייבוא חוזה שכירות</h1>
```

old (478):
```tsx
                {step === "review" && s.key === "upload" && <span>✓</span>}
```
new:
```tsx
                {step === "review" && s.key === "upload" && <Icon name="check" size={14} />}
```

old (488):
```tsx
          <div className="text-5xl">📄</div>
```
new:
```tsx
          <div className="flex justify-center"><Icon name="leases" size={44} className="text-gray-300" /></div>
```

old (496):
```tsx
              <p className="font-semibold" style={{ color: "var(--accent)" }}>📋 הנחיות לקובץ</p>
```
new:
```tsx
              <p className="font-semibold flex items-center gap-1" style={{ color: "var(--accent)" }}><Icon name="taxReport" size={16} /> הנחיות לקובץ</p>
```

old (522):
```tsx
              <span>📎</span>
```
new:
```tsx
              <Icon name="attachment" size={16} />
```

old (524):
```tsx
              <button onClick={() => setFile(null)} className="text-indigo-400 hover:text-indigo-700 mr-1">✕</button>
```
new:
```tsx
              <button onClick={() => setFile(null)} className="text-indigo-400 hover:text-indigo-700 mr-1"><Icon name="cancel" size={14} /></button>
```

old (535):
```tsx
              ⚠️ {fileFormatError}
```
new:
```tsx
              <Icon name="unpaid" size={16} className="inline text-rose-700" /> {fileFormatError}
```

old (547):
```tsx
                ✨ חלץ נתונים מהחוזה
```
new:
```tsx
                <Icon name="aiMagic" size={16} className="inline" /> חלץ נתונים מהחוזה
```

old (573):
```tsx
                {done ? "✓" : active ? (
```
new:
```tsx
                {done ? <Icon name="check" size={14} /> : active ? (
```

old (596):
```tsx
                  <p className="text-xs text-gray-400 text-right">💭 המודל חושב...</p>
```
new:
```tsx
                  <p className="text-xs text-gray-400 text-right flex items-center justify-end gap-1"><Icon name="aiThinking" size={14} /> המודל חושב...</p>
```

old (644):
```tsx
            <div className="font-bold mb-1" style={{ color: "var(--accent)" }}>📋 זוהה נספח הארכת שכירות</div>
```
new:
```tsx
            <div className="font-bold mb-1 flex items-center gap-1" style={{ color: "var(--accent)" }}><Icon name="leaseRenewal" size={16} /> זוהה נספח הארכת שכירות</div>
```

old (656):
```tsx
              <span className="text-lg">🏢</span>
```
new:
```tsx
              <Icon name="properties" size={20} />
```

old (675):
```tsx
              <span>🏠</span>
```
new:
```tsx
              <Icon name="dashboard" size={16} />
```

old (696):
```tsx
              ⚠️ לנכס זה יש חוזה פעיל - הוא יועבר לארכיון ולא יימחק
```
new:
```tsx
              <Icon name="unpaid" size={16} className="inline text-amber-700" /> לנכס זה יש חוזה פעיל - הוא יועבר לארכיון ולא יימחק
```

old (704):
```tsx
              <span>➕</span>
```
new:
```tsx
              <Icon name="add" size={16} />
```

old (731):
```tsx
        <Section title="פרטי השוכר הראשי" icon="👤">
```
new:
```tsx
        <Section title="פרטי השוכר הראשי" icon="singleTenant">
```

old (745):
```tsx
              <span className="text-lg">👥</span>
```
new:
```tsx
              <Icon name="multipleTenants" size={20} />
```

old (769):
```tsx
        <Section title="תנאי השכירות" icon="📋">
```
new:
```tsx
        <Section title="תנאי השכירות" icon="leaseRenewal">
```

old (789):
```tsx
        <Section title="אמצעי תקבול" icon="💳">
```
new:
```tsx
        <Section title="אמצעי תקבול" icon="creditCard">
```

old (832):
```tsx
              <span className="text-lg">🔄</span>
```
new:
```tsx
              <Icon name="sync" size={20} />
```

old (871):
```tsx
          ) : "✅ שמור חוזה"}
```
new:
```tsx
          ) : <><Icon name="paid" size={16} className="inline" /> שמור חוזה</>}
```

- [ ] **Step 2: עדכון קומפוננטת `Section` הפנימית (שורות 96-106)**

old:
```tsx
function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
      </div>
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}
```
new (עם `import type { IconName } from "@/lib/icons";` בראש הקובץ):
```tsx
function Section({ title, icon, children }: { title: string; icon: IconName; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
        <Icon name={icon} size={18} />
        <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
      </div>
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: typecheck + lint + vitest**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: 0 שגיאות. אם `tsc` מצביע על אי-התאמת-טיפוס ב-`Section` (למשל emoji-string ישן שנשאר במקום לא-מטופל) - לתקן לפי הודעת-השגיאה המדויקת.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/leases/import/page.tsx
git commit -m "refactor(lease-import): מעבר לאייקוני Phosphor - 22 מופעים כולל קומפוננטת Section"
```

---

### Task 11: עריכת-חוזה (`leases/[id]/edit/page.tsx`)

**Files:**
- Modify: `src/app/dashboard/leases/[id]/edit/page.tsx`

- [ ] **Step 1: הוספת `import { Icon } from "@/components/Icon";` בראש הקובץ**

- [ ] **Step 2: החלפות (שורות 426, 427, 746, 758, 781, 800)**

old (426, 427):
```tsx
              <span>✅ {applySuccessMsg}</span>
              <button type="button" onClick={() => setApplySuccessMsg("")} className="text-green-600 hover:text-green-800 font-bold">✕</button>
```
new:
```tsx
              <span className="flex items-center gap-1"><Icon name="paid" size={16} /> {applySuccessMsg}</span>
              <button type="button" onClick={() => setApplySuccessMsg("")} className="text-green-600 hover:text-green-800"><Icon name="cancel" size={16} /></button>
```

old (746):
```tsx
                        {uploading ? "מעלה..." : "📎 העלה מסמך"}
```
new:
```tsx
                        {uploading ? "מעלה..." : <><Icon name="attachment" size={14} className="inline" /> העלה מסמך</>}
```

old (758):
```tsx
                      <span className="text-lg flex-shrink-0">{doc.mime_type === "application/pdf" ? "📄" : "📝"}</span>
```
new:
```tsx
                      <Icon name={doc.mime_type === "application/pdf" ? "leases" : "document"} size={20} className="flex-shrink-0" />
```

old (781):
```tsx
                        {extractingDocId === doc.id ? "⏳ מחלץ..." : "✨ שאוב נתונים"}
```
new:
```tsx
                        {extractingDocId === doc.id ? <><Icon name="aiLoading" size={14} className="inline" /> מחלץ...</> : <><Icon name="aiMagic" size={14} className="inline" /> שאוב נתונים</>}
```

old (800):
```tsx
                        🗑
```
new:
```tsx
                        <Icon name="delete" size={16} />
```

- [ ] **Step 3: typecheck + lint + vitest**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: 0 שגיאות.

- [ ] **Step 4: Commit**

```bash
git add "src/app/dashboard/leases/[id]/edit/page.tsx"
git commit -m "refactor(lease-edit): מעבר לאייקוני Phosphor כולל Hourglass לטעינת-AI"
```

---

### Task 12: עמודים קטנים (`debts`, `payments`, `maintenance`, `settings`)

**Files:**
- Modify: `src/app/dashboard/debts/page.tsx`
- Modify: `src/app/dashboard/payments/page.tsx`
- Modify: `src/app/dashboard/maintenance/page.tsx`
- Modify: `src/app/dashboard/settings/page.tsx`

- [ ] **Step 1: `debts/page.tsx` (שורות 177, 190) - הוספת import**

old (177):
```tsx
        <span className="absolute -top-4 -left-3 text-7xl opacity-15 select-none">🔴</span>
```
new:
```tsx
        <span className="absolute -top-4 -left-3 opacity-15 select-none"><Icon name="debts" size={64} /></span>
```

old (190):
```tsx
          <div className="text-5xl">✅</div>
```
new:
```tsx
          <div className="flex justify-center"><Icon name="paid" size={44} className="text-emerald-600" /></div>
```

- [ ] **Step 2: `payments/page.tsx` (שורות 464, 494) - הוספת import**

old (464):
```tsx
            <div className="text-4xl">✅</div>
```
new:
```tsx
            <div className="flex justify-center"><Icon name="paid" size={36} className="text-emerald-600" /></div>
```

old (494):
```tsx
            <span className="text-[10px]">{showPaid ? "▼" : "▶"}</span>
```
new:
```tsx
            <Icon name={showPaid ? "caretDown" : "caretRight"} size={12} />
```

- [ ] **Step 3: `maintenance/page.tsx` - מערך `actions` (שורות 132-153) + רינדור (שורה 174) - הוספת import**

old (132-153):
```tsx
  const actions = [
    {
      title: "ניקוי תזכורות שק",
      desc: "מוחק תזכורות 'הפקדת שק' יתומות, כפולות, או עם תאריך שגוי",
      icon: "🧹",
      onClick: () => cleanupTasksMutation.mutate(),
      running: cleanupTasksMutation.isPending,
      result: cleanupResult,
      btnLabel: "נקה",
      color: "orange",
    },
    {
      title: "ניקוי חוזים יתומים",
      desc: "מוחק חוזים שהנכס שלהם נמחק",
      icon: "📄",
      onClick: () => cleanupLeasesMutation.mutate(),
      running: cleanupLeasesMutation.isPending,
      result: leaseCleanupResult,
      btnLabel: "נקה",
      color: "orange",
    },
  ];
```
new (עם `import type { IconName } from "@/lib/icons";` בראש הקובץ):
```tsx
  const actions: { title: string; desc: string; icon: IconName; onClick: () => void; running: boolean; result: typeof cleanupResult; btnLabel: string; color: string }[] = [
    {
      title: "ניקוי תזכורות שק",
      desc: "מוחק תזכורות 'הפקדת שק' יתומות, כפולות, או עם תאריך שגוי",
      icon: "cleanup",
      onClick: () => cleanupTasksMutation.mutate(),
      running: cleanupTasksMutation.isPending,
      result: cleanupResult,
      btnLabel: "נקה",
      color: "orange",
    },
    {
      title: "ניקוי חוזים יתומים",
      desc: "מוחק חוזים שהנכס שלהם נמחק",
      icon: "leases",
      onClick: () => cleanupLeasesMutation.mutate(),
      running: cleanupLeasesMutation.isPending,
      result: leaseCleanupResult,
      btnLabel: "נקה",
      color: "orange",
    },
  ];
```

old (שורה 174):
```tsx
                <span className="text-2xl">{a.icon}</span>
```
new:
```tsx
                <Icon name={a.icon} size={22} />
```

old (201):
```tsx
          <span className="text-2xl">🔍</span>
```
new:
```tsx
          <Icon name="integrityCheck" size={22} />
```

old (219):
```tsx
          <p key={i} className="font-medium">{leaseAuditResult.issues[0] === "לא נמצאו בעיות" ? "✓ " : "⚠ "}{issue}</p>
```
new:
```tsx
          <p key={i} className="font-medium flex items-center gap-1"><Icon name={leaseAuditResult.issues[0] === "לא נמצאו בעיות" ? "check" : "warning"} size={14} />{issue}</p>
```

- [ ] **Step 4: `settings/page.tsx` (שורות 427, 548) - הוספת import**

old (427):
```tsx
              📋 פתח דוח מס שנתי
```
new:
```tsx
              <Icon name="taxReport" size={16} className="inline" /> פתח דוח מס שנתי
```

old (548) - זהה לתבנית ב-`maintenance/page.tsx:219` (אותו קומפוננטת-audit משוכפלת):
```tsx
          <p key={i} className="font-medium">{leaseAuditResult.issues[0] === "לא נמצאו בעיות" ? "✓ " : "⚠ "}{issue}</p>
```
new:
```tsx
          <p key={i} className="font-medium flex items-center gap-1"><Icon name={leaseAuditResult.issues[0] === "לא נמצאו בעיות" ? "check" : "warning"} size={14} />{issue}</p>
```

- [ ] **Step 5: הוספת `import { Icon } from "@/components/Icon";` לראש כל 4 הקבצים (אם עוד לא נוסף בשלבים למעלה)**

- [ ] **Step 6: typecheck + lint + vitest**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: 0 שגיאות.

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/debts/page.tsx src/app/dashboard/payments/page.tsx src/app/dashboard/maintenance/page.tsx src/app/dashboard/settings/page.tsx
git commit -m "refactor: מעבר לאייקוני Phosphor - חובות, תקבולים, תחזוקה, הגדרות"
```

---

### Task 13: אודות (`about/page.tsx`)

**Files:**
- Modify: `src/app/dashboard/about/page.tsx`

- [ ] **Step 1: הוספת imports + retype ל-`APP_FEATURES` (שורות 17-24)**

old:
```tsx
const APP_FEATURES = [
  { icon: "🏢", title: "ניהול נכסים", desc: "דירות, בתים ונכסים מסחריים עם כל הפרטים" },
  { icon: "📄", title: "חוזים חכמים", desc: "ייבוא מ-PDF/תמונה עם AI, הצמדה למדד/דולר, אופציות" },
  { icon: "💳", title: "תקבולים וחובות", desc: "מעקב תשלומים, תשלומים חלקיים, וחישוב חובות אוטומטי" },
  { icon: "📋", title: "מס הכנסה 10%", desc: "חישוב מס אוטומטי ודוח מס שנתי מוכן להדפסה" },
  { icon: "📊", title: "דוחות ואנליטיקה", desc: "הכנסות, הוצאות ורווח לפי נכס, חודש ושנה" },
  { icon: "🔔", title: "תזכורות", desc: "שיקים, סיום חוזים ומשימות - שלא תשכח כלום" },
];
```
new (עם `import { Icon } from "@/components/Icon"; import type { IconName } from "@/lib/icons";` בראש הקובץ):
```tsx
const APP_FEATURES: { icon: IconName; title: string; desc: string }[] = [
  { icon: "properties", title: "ניהול נכסים", desc: "דירות, בתים ונכסים מסחריים עם כל הפרטים" },
  { icon: "leases", title: "חוזים חכמים", desc: "ייבוא מ-PDF/תמונה עם AI, הצמדה למדד/דולר, אופציות" },
  { icon: "payments", title: "תקבולים וחובות", desc: "מעקב תשלומים, תשלומים חלקיים, וחישוב חובות אוטומטי" },
  { icon: "taxReport", title: "מס הכנסה 10%", desc: "חישוב מס אוטומטי ודוח מס שנתי מוכן להדפסה" },
  { icon: "reports", title: "דוחות ואנליטיקה", desc: "הכנסות, הוצאות ורווח לפי נכס, חודש ושנה" },
  { icon: "tasks", title: "תזכורות", desc: "שיקים, סיום חוזים ומשימות - שלא תשכח כלום" },
];
```

- [ ] **Step 2: `subjectPrefix` (שורה 37) - זו מחרוזת שנכנסת ל-`mailtoHref` (URL, לא JSX!) - לא ניתן להשתמש ב-`<Icon>` כאן**

`subjectPrefix` בונה נושא-מייל (`mailto:...?subject=...`) - טקסט-URL-encoded, לא React. **להשאיר טקסט-נקי בלי אמוג'י** (תואם למניע-המקצועיות):

old:
```tsx
  const subjectPrefix = type === "bug" ? "🐞 דיווח באג" : "✨ בקשת פיצ'ר";
```
new:
```tsx
  const subjectPrefix = type === "bug" ? "דיווח באג" : "בקשת פיצ'ר";
```

- [ ] **Step 3: הירו (שורה 100) + רינדור-פיצ'רים (שורה 119)**

old (100):
```tsx
        <span className="absolute -top-4 -left-3 text-7xl opacity-15 select-none">🏠</span>
```
new:
```tsx
        <span className="absolute -top-4 -left-3 opacity-15 select-none"><Icon name="dashboard" size={64} color="white" /></span>
```

old (119):
```tsx
              <span className="text-2xl flex-shrink-0">{f.icon}</span>
```
new:
```tsx
              <Icon name={f.icon} size={22} className="flex-shrink-0" />
```

- [ ] **Step 4: יצירת-קשר - מייל/GitHub (שורות 157, 166)**

old (157):
```tsx
            <span>✉️</span> {DEV.email}
```
new:
```tsx
            <Icon name="mail" size={16} /> {DEV.email}
```

old (166):
```tsx
              <span>💻</span> GitHub
```
new:
```tsx
              <Icon name="externalLink" size={16} /> GitHub
```

- [ ] **Step 5: כפתורי-דיווח (שורות 189, 199) - טקסט-כפתור בלבד (JSX, לא URL - כאן כן אפשר `<Icon>`)**

old (189):
```tsx
              🐞 דיווח על באג
```
new:
```tsx
              <Icon name="bugReport" size={14} className="inline" /> דיווח על באג
```

old (199):
```tsx
              ✨ בקשת פיצ&apos;ר
```
new:
```tsx
              <Icon name="aiMagic" size={14} className="inline" /> בקשת פיצ&apos;ר
```

- [ ] **Step 6: שליחה/העתקה/אישור (שורות 240, 247, 251)**

old (240):
```tsx
              ✉️ שלח באימייל
```
new:
```tsx
              <Icon name="mail" size={14} className="inline" /> שלח באימייל
```

old (247):
```tsx
              {copied ? "✓ הועתק" : "📋 העתק"}
```
new:
```tsx
              {copied ? <><Icon name="check" size={14} className="inline" /> הועתק</> : <><Icon name="taxReport" size={14} className="inline" /> העתק</>}
```

old (251):
```tsx
            <p className="text-xs text-emerald-600 font-semibold">✓ הפנייה נשמרה במערכת, ומייל נפתח לשליחה</p>
```
new:
```tsx
            <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><Icon name="check" size={12} /> הפנייה נשמרה במערכת, ומייל נפתח לשליחה</p>
```

- [ ] **Step 7: typecheck + lint + vitest**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: 0 שגיאות.

- [ ] **Step 8: Commit**

```bash
git add src/app/dashboard/about/page.tsx
git commit -m "refactor(about): מעבר לאייקוני Phosphor - פיצ'רים, יצירת-קשר, טופס-משוב"
```

---

### Task 14: ניקוי-אמוג'י בהתראות-Push (`api/cron/notify/route.ts`)

**Files:**
- Modify: `src/app/api/cron/notify/route.ts`

**הקשר**: אלה מחרוזות `title` שנשלחות ל-Web Push API ומוצגות ע"י מערכת-ההפעלה (לא React) - קומפוננטת `<Icon>` **לא רלוונטית** כאן. הפתרון היחיד התואם את מניע-המקצועיות: הסרת האמוג'י מהטקסט.

- [ ] **Step 1: כותרת-פקיעת-חוזה (שורה 66)**

old:
```tsx
      title: `⚠️ חוזה עומד לפוג - ${propTitle}`,
```
new:
```tsx
      title: `חוזה עומד לפוג - ${propTitle}`,
```

- [ ] **Step 2: כותרת-תזכורת-שק (שורה 90)**

old:
```tsx
      title: "🧾 תזכורת: הפקדת שק מחר",
```
new:
```tsx
      title: "תזכורת: הפקדת שק מחר",
```

- [ ] **Step 3: typecheck**

Run: `npx tsc --noEmit`
Expected: 0 שגיאות (שינוי-מחרוזת בלבד, לא צפוי להשפיע על טיפוסים).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/notify/route.ts
git commit -m "chore(notify): הסרת אמוג'י מכותרות Push - טקסט-OS-נטיבי, לא ניתן ל-Icon-component"
```

---

### Task 15: שער-סיום מלא - סריקת-אמוג'י אפס + בדיקה חזותית

**Files:** אין שינויי-קוד בטאסק זה - רק אימות.

- [ ] **Step 1: סריקת-אמוג'י אפס בקוד**

```bash
node -e "
const fs = require('fs'); const path = require('path');
function walk(dir, files=[]) {
  for (const f of fs.readdirSync(dir, {withFileTypes:true})) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, files);
    else if (f.name.endsWith('.tsx') || f.name.endsWith('.ts')) files.push(p);
  }
  return files;
}
const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}]/u;
const hits = [];
for (const f of walk('src')) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => { if (emojiRe.test(line)) hits.push(f + ':' + (i+1) + ': ' + line.trim()); });
}
console.log(hits.length ? hits.join('\n') : 'ZERO EMOJI FOUND');
"
```

Expected: `ZERO EMOJI FOUND`. אם נמצאו מופעים - אלה כנראה תוכן-משתמש חופשי (notes/DEV.bio) שמותר להישאר (ראו spec §8 קריטריון 1), או שנשכח מופע - לתקן בהתאם ל-Task המתאים למעלה.

> שים לב: הטווח כאן **לא כולל** `\u{2190}-\u{21FF}` (חצים, נשארים רק בהערות-קוד לפי spec §5) ו-`\u{FE0F}` (variation selector, נעלם ממילא עם הסרת-הגליף שלפניו) - אלה מכוונים-להישאר.

- [ ] **Step 2: שערים סטטיים מלאים**

```bash
npx tsc --noEmit && npm run lint && npx vitest run && npm run build
```

Expected: הכל ירוק, 0 שגיאות.

- [ ] **Step 3: בדיקה חזותית Playwright (סקיל `verify` הפרויקטלי)**

להפעיל `npm run dev` (לוודא קודם שאין שרת-ישן תקוע על פורט 3000 - `netstat -ano | grep ":3000"`, ואם כן להרוג אותו לפני), ואז Playwright fullPage screenshot על כל המסכים: דשבורד, נכסים (+עמוד-פרט), חוזים (+ייבוא +עריכה), הוצאות, תקבולים, דוחות (+דוח-מס +דוח-נכס +השוואת-הצמדה), חובות, תזכורות, אודות, הגדרות, תחזוקה.

בכל צילום לוודא: אייקונים מרונדרים (לא ריבועים-שבורים/טקסט-חסר), צבע-סמנטי נכון (ירוק=הכנסה, אדום=הוצאה/חוב, ענבר=מס/חלקי), יישור-אנכי תקין מול טקסט עברי, ואפס שגיאות-קונסולה. **בנוסף** - לפתוח את `/dashboard/reports/tax` ולבדוק את תצוגת-ההדפסה (Ctrl+P / print preview בדפדפן) לוודא שכפתור "הדפס / PDF" (Task 8) לא שינה את עימוד-ההדפסה עצמו (spec §8 קריטריון 5 - האייקון בכפתור לא אמור להופיע כלל בגרסה-המודפסת, רק הטקסט). לעצור את שרת ה-dev ולנקות צילומי-מסך זמניים בסיום.

- [ ] **Step 4: Commit סיום (אם היו תיקונים משלב 1-3)**

```bash
git add -A
git commit -m "fix: תיקונים אחרונים אחרי שער-סיום מלא (סריקת-אמוג'י + בדיקה חזותית)"
```

אם לא נדרשו תיקונים - אין commit נוסף, ה-branch כבר נקי מהטאסקים הקודמים.
