# רדיזיין "מהדורת נייר" - תוכנית מימוש

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** מעבר האפליקציה מ"כהה-בלבד" לערכת "קלף" בהירה אחת, פונט Heebo יחיד, והיררכיית דשבורד חדשה שבנויה לביקור של 1-3 דקות אחת לכמה ימים.

**Architecture:** ה-markup כתוב במחלקות Tailwind בהירות; הכהה חי כשכבת overrides ב-`globals.css`. הרדיזיין מחליף את ערכי הטוקנים ואת שכבת ה-overrides בלי לגעת ברוב ה-markup. לוגיקת הדשבורד החדשה (תזרים, "דורש טיפול", "מאז הביקור") נבנית כפונקציות טהורות ב-`src/lib/domain/` עם בדיקות vitest, והדף רק מרכיב אותן.

**Tech Stack:** Next.js 16 (App Router), Tailwind v4 (טוקנים ב-CSS vars), next/font (Heebo), TanStack Query, vitest.

**Spec:** `docs/superpowers/specs/2026-07-10-paper-edition-redesign-design.md`

## Global Constraints

- כל טקסט UI בעברית; מקף רגיל ( - ), לא מקף ארוך; אין תווי חץ (→ ←) בטקסט עברי - משולש ▲/▼ מותר כאייקון מגמה.
- צבעים סמנטיים קבועים: ירוק=הכנסות, אדום=הוצאות, כתום/ענבר=מס והתראות. על קלף: טקסט ירוק `#047857`, אדום `#be123c`, כתום `#b45309`.
- טוקני קלף: רקע `#f3edde`, כרטיס `#fbf7ec`, מוגבה `#f6f0e1`, דיו `#231f16`, מותג `#7c83ff` (ללא שינוי).
- אין ספריות UI חדשות; אין ערכה כהה ואין theme switcher.
- שדות DB ב-snake_case; טיפוסים נגזרים מ-`src/types/database.ts`.
- בדיקות: `npx vitest run <path>`; שערים לפני כל commit: `npx tsc --noEmit` ירוק.
- push ל-main מפעיל CI + פריסה אוטומטית - לכן push רק בסוף, אחרי אימות מלא.

---

### Task 1: ערכת "קלף" - טוקנים ו-overrides ב-globals.css + צבעי מערכת

**Files:**
- Modify: `src/app/globals.css` (בלוק `:root` שורות 3-17; overrides שורות 68-208)
- Modify: `src/app/layout.tsx:24` (viewport themeColor), `:32` (statusBarStyle)
- Modify: `src/app/manifest.ts:10-11` (background/theme), `:5-6` (name/short_name)

**Interfaces:**
- Consumes: אין (משימה ראשונה).
- Produces: טוקני ה-CSS שכל המשימות הבאות מסתמכות עליהם: `--bg-base`, `--bg-surface`, `--bg-elevated`, `--text-1/2/3`, `--border`, `--divider`, `--accent`, `--accent-hover`, `--accent-dim`, `--gilt`. מחלקת `.num-ltr`.

- [ ] **Step 1: החלפת בלוק הטוקנים** - ב-`src/app/globals.css` להחליף את תוכן `:root` (שורות 3-17) ב:

```css
:root {
  /* "יומן הספר - מהדורת נייר" - קלף חם, דיו כהה, מותג אינדיגו-סגול */
  --bg-base:    #f3edde; /* קלף */
  --bg-surface: #fbf7ec; /* פתק/כרטיס */
  --bg-elevated:#f6f0e1; /* קלט, thead, hover */
  --border:     rgba(35,31,22,0.15);
  --divider:    rgba(35,31,22,0.08);
  --text-1:     #231f16; /* דיו - כמעט שחור חם */
  --text-2:     #645c48;
  --text-3:     #9a9077;
  --accent:     #7c83ff; /* דיו אינדיגו-סגול - ללא שינוי */
  --accent-hover:#5b62e6;
  --accent-dim: rgba(124,131,255,0.13);
  --gilt:       #d8b25a; /* זהב מאופק - לסימן המותג בלבד */
}
```

- [ ] **Step 2: עדכון overrides של טקסט** - להחליף את בלוק ה-Text (שורות 79-85) ב:

```css
/* ── Text ───────────────────────────────────────────── */
.text-gray-900,
.text-gray-800     { color: #231f16     !important; }
.text-gray-700     { color: #4d4636     !important; }
.text-gray-600     { color: #645c48     !important; }
.text-gray-500     { color: #7d7560     !important; }
.text-gray-400     { color: #9a9077     !important; }
```

- [ ] **Step 3: צל חם לכרטיסים** - להחליף את בלוק Cards / surfaces (שורות 165-173) ב:

```css
/* ── Cards / surfaces - "פתקים בפנקס": צל חם ועדין ──── */
.rounded-2xl,
.rounded-xl,
.rounded-lg {
  box-shadow: 0 1px 2px rgba(70,55,20,0.07), 0 3px 10px rgba(70,55,20,0.10) !important;
}
.shadow-sm, .shadow-md, .shadow-xl, .shadow-lg {
  box-shadow: 0 2px 4px rgba(70,55,20,0.08), 0 5px 16px rgba(70,55,20,0.12) !important;
}
```

- [ ] **Step 4: badges סמנטיים על קלף** - להחליף את בלוק Status badges (שורות 175-189) ב:

```css
/* ── Status badges - גוונים סמנטיים כהים על קלף ─────── */
.bg-green-100  { background-color: rgba(4,120,87,0.10)   !important; }
.text-green-700{ color: #047857 !important; }
.bg-red-100    { background-color: rgba(190,18,60,0.09)  !important; }
.text-red-700  { color: #be123c !important; }
.bg-amber-100  { background-color: rgba(180,83,9,0.10)   !important; }
.text-amber-700{ color: #b45309 !important; }
.bg-emerald-100{ background-color: rgba(4,120,87,0.10)   !important; }
.text-emerald-700{ color: #047857 !important; }
.bg-yellow-100 { background-color: rgba(180,83,9,0.10)   !important; }
.text-yellow-700{ color: #b45309 !important; }

/* Error boxes */
.bg-red-50     { background-color: rgba(190,18,60,0.07)  !important; }
.border-red-300{ border-color:  rgba(190,18,60,0.35)     !important; }
```

- [ ] **Step 5: scrollbar לקלף** - בבלוק Scrollbar (שורות 204-208) להחליף את שורת ה-thumb:

```css
::-webkit-scrollbar-thumb { background: #cfc5ac; border-radius: 3px; }
```

- [ ] **Step 6: מחלקת בידוד מספרים** - להוסיף מיד אחרי בלוק "Numbers - tabular" (אחרי שורה 213):

```css
/* ── בידוד כיוון למספרים/תאריכים בתוך טקסט עברי ─────── */
.num-ltr { direction: ltr; unicode-bidi: isolate; }
```

- [ ] **Step 7: צבעי מערכת** - ב-`src/app/layout.tsx`: `themeColor: "#f3edde"` (שורה 24), `statusBarStyle: "default"` (שורה 32 - טקסט סטטוס-בר כהה על רקע בהיר). ב-`src/app/manifest.ts`: `name: "יומן הספר - ניהול נכסים"`, `short_name: "יומן הספר"`, `background_color: "#f3edde"`, `theme_color: "#f3edde"`. וכן ב-layout.tsx: `title: "יומן הספר - ניהול נכסים"` (שורה 28), `appleWebApp.title: "יומן הספר"` (שורה 33).

- [ ] **Step 8: אימות** - להריץ:

```bash
npx tsc --noEmit && npm run lint && npm run build
```

Expected: הכל ירוק. בנוסף `npm run dev` והצצה ויזואלית ב-playwright/דפדפן: הדשבורד על רקע קלף, טקסט קריא, badges ירוק/אדום/כתום מובחנים.

- [ ] **Step 9: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx src/app/manifest.ts
git commit -m "feat: ערכת קלף - מעבר לבהיר-בלבד (טוקנים, overrides, theme_color)"
```

---

### Task 2: טיפוגרפיה - Heebo יחיד

**Files:**
- Modify: `src/app/layout.tsx:1-18` (imports + הגדרות פונט), `:58` (className)
- Modify: `src/app/globals.css` (הפניות `--font-rubik` / `--font-display`)

**Interfaces:**
- Consumes: Task 1 (globals.css לאחר החלפת הטוקנים).
- Produces: משתנה `--font-heebo` על html; aliases `--font-rubik` ו-`--font-display` מצביעים אליו (כל הקוד הקיים שמפנה אליהם ממשיך לעבוד).

- [ ] **Step 1: החלפת הפונטים ב-layout.tsx** - להחליף את שורות 1-18 ב:

```tsx
import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { HebrewValidation } from "@/components/hebrew-validation";
import "./globals.css";

// פונט יחיד לכל האפליקציה - גוף, כותרות וספרות (החלטת עיצוב "מהדורת נייר")
const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700"],
});
```

ובשורה 58 להחליף את ה-className ל:

```tsx
className={`${heebo.variable} h-full antialiased`}
```

- [ ] **Step 2: aliases ב-globals.css** - להוסיף בסוף בלוק `:root` (מ-Task 1):

```css
  /* aliases - קוד קיים מפנה ל---font-rubik / --font-display; שניהם Heebo כעת */
  --font-rubik:   var(--font-heebo);
  --font-display: var(--font-heebo);
```

ולעדכן את בלוק הכותרות (שורות 42-46 המקוריות):

```css
h1, h2 {
  font-family: var(--font-heebo), sans-serif;
  font-weight: 700;
  letter-spacing: -0.005em;
}
```

- [ ] **Step 3: אימות** - `npx tsc --noEmit && npm run build`, ואז `npm run dev`: כל הטקסט ב-Heebo (לוודא שאין fallback לסריף בכותרות - h1 בדשבורד, כותרת דף הנחיתה, לוגו auth).

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "feat: Heebo יחיד לגוף, כותרות וספרות - הסרת Rubik ו-Frank Ruhl Libre"
```

---

### Task 3: לוגיקת תזרים חודשי + מגמה (domain, TDD)

**Files:**
- Create: `src/lib/domain/cashflow.ts`
- Test: `src/lib/domain/cashflow.test.ts`

**Interfaces:**
- Consumes: `getReceivedAmount(p)` מ-`src/lib/domain/partial-payment.ts` (קיים; מטפל ב-paid/partial/notes-legacy).
- Produces: `monthCashflow(payments, expenses, monthKey): number`, `cashflowTrendPct(current, previous): number | null`, טיפוסים `CashflowPayment`, `CashflowExpense`. Task 7 צורך את שניהם.

- [ ] **Step 1: בדיקות נכשלות** - ליצור `src/lib/domain/cashflow.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { monthCashflow, cashflowTrendPct } from "./cashflow";

const rent = (paid_date: string, amount: number, extra: object = {}) => ({
  payment_type: "Rent", status: "paid", paid_date, amount, ...extra,
});

describe("monthCashflow", () => {
  it("סוכם תקבולי שכירות ששולמו בחודש פחות הוצאות החודש", () => {
    const payments = [rent("2026-07-03", 5500), rent("2026-07-08", 7875), rent("2026-06-05", 5500)];
    const expenses = [{ amount: 550, date: "2026-07-03" }, { amount: 200, date: "2026-06-15" }];
    expect(monthCashflow(payments, expenses, "2026-07")).toBe(5500 + 7875 - 550);
  });

  it("תשלום חלקי נספר לפי הסכום שהתקבל בפועל", () => {
    const payments = [rent("2026-07-03", 5500, { status: "partial", partial_paid_amount: 2000 })];
    expect(monthCashflow(payments, [], "2026-07")).toBe(2000);
  });

  it("מתעלם מתקבולים שאינם שכירות ומתקבולים ללא paid_date", () => {
    const payments = [
      { payment_type: "Deposit", status: "paid", paid_date: "2026-07-01", amount: 10000 },
      rent("", 5500),
      { ...rent("2026-07-02", 4000), paid_date: null },
    ];
    expect(monthCashflow(payments as never, [], "2026-07")).toBe(0);
  });
});

describe("cashflowTrendPct", () => {
  it("מחשב אחוז שינוי מעוגל מול חודש קודם", () => {
    expect(cashflowTrendPct(12038, 11575)).toBe(4);
    expect(cashflowTrendPct(10000, 12500)).toBe(-20);
  });

  it("מחזיר null כשאין בסיס השוואה (חודש קודם אפס או שלילי)", () => {
    expect(cashflowTrendPct(5000, 0)).toBeNull();
    expect(cashflowTrendPct(5000, -100)).toBeNull();
  });
});
```

- [ ] **Step 2: לוודא כישלון** - `npx vitest run src/lib/domain/cashflow.test.ts` - Expected: FAIL ("Cannot find module './cashflow'").

- [ ] **Step 3: מימוש** - ליצור `src/lib/domain/cashflow.ts`:

```ts
// תזרים חודשי - מקור אמת יחיד למספר-הגיבור בדשבורד.
// הכנסה = תקבולי שכירות ששולמו בחודש (דרך getReceivedAmount - מכבד תשלום חלקי);
// הוצאה = כל הוצאות החודש כולל מס אוטומטי (ולכן המספר הוא "אחרי מס").
import { getReceivedAmount, type ReceivedAmountInput } from "./partial-payment";

export interface CashflowPayment extends ReceivedAmountInput {
  payment_type: string;
  paid_date?: string | null;
}

export interface CashflowExpense {
  amount: number;
  date: string;
}

export function monthCashflow(
  payments: CashflowPayment[],
  expenses: CashflowExpense[],
  monthKey: string
): number {
  const income = payments
    .filter((p) => p.payment_type === "Rent" && p.paid_date && p.paid_date.slice(0, 7) === monthKey)
    .reduce((sum, p) => sum + getReceivedAmount(p), 0);
  const spent = expenses
    .filter((e) => e.date && e.date.slice(0, 7) === monthKey)
    .reduce((sum, e) => sum + e.amount, 0);
  return income - spent;
}

// אחוז שינוי מול חודש קודם; null כשאין בסיס השוואה חיובי (מסתירים את שורת המגמה)
export function cashflowTrendPct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
```

- [ ] **Step 4: לוודא מעבר** - `npx vitest run src/lib/domain/cashflow.test.ts` - Expected: PASS (5 בדיקות).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/cashflow.ts src/lib/domain/cashflow.test.ts
git commit -m "feat: לוגיקת תזרים חודשי ומגמה למספר-הגיבור בדשבורד"
```

---

### Task 4: לוגיקת "דורש טיפול" (domain, TDD)

**Files:**
- Create: `src/lib/domain/attention.ts`
- Test: `src/lib/domain/attention.test.ts`

**Interfaces:**
- Consumes: `getDebtAmount(p)` מ-`src/lib/domain/partial-payment.ts` (קיים).
- Produces: `buildAttentionItems({ payments, activeLeases, openTasks, today }): AttentionItem[]` כאשר `AttentionItem = { id, kind, label, sub, href }`. הקורא (Task 7) מסנן חוזים פעילים ומשימות פתוחות לפני הקריאה.

- [ ] **Step 1: בדיקות נכשלות** - ליצור `src/lib/domain/attention.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildAttentionItems } from "./attention";

const TODAY = "2026-07-10";

describe("buildAttentionItems", () => {
  it("תקבול באיחור ראשון, אחריו משימה קרובה, ואז חוזה שמסתיים", () => {
    const items = buildAttentionItems({
      payments: [{ id: "p1", status: "pending", due_date: "2026-07-01", amount: 5500, property: { title: "נורדאו 58" } }],
      activeLeases: [{ id: "l1", end_date: "2026-10-07", properties: { title: "שלומציון המלכה 5" } }],
      openTasks: [{ id: "t1", title: "הפקדת שק שכ\"ד", due_date: "2026-07-12" }],
      today: TODAY,
    });
    expect(items.map((i) => i.kind)).toEqual(["overdue", "task", "lease_ending"]);
    expect(items[0].label).toContain("נורדאו 58");
    expect(items[0].sub).toContain("5,500");
    expect(items[2].sub).toBe("בעוד 89 ימים");
  });

  it("מתעלם ממה שלא דורש טיפול: שולם, משימה רחוקה, חוזה שמסתיים בעוד יותר מ-90 יום", () => {
    const items = buildAttentionItems({
      payments: [{ id: "p1", status: "paid", due_date: "2026-07-01", amount: 5500 }],
      activeLeases: [{ id: "l1", end_date: "2027-01-01", properties: { title: "x" } }],
      openTasks: [{ id: "t1", title: "רחוק", due_date: "2026-07-30" }],
      today: TODAY,
    });
    expect(items).toEqual([]);
  });

  it("משימה שמועדה היום מקבלת sub 'היום'; חוזה שמסתיים היום - 'מסתיים היום'", () => {
    const items = buildAttentionItems({
      payments: [],
      activeLeases: [{ id: "l1", end_date: TODAY, properties: { title: "x" } }],
      openTasks: [{ id: "t1", title: "לתקן דוד", due_date: TODAY }],
      today: TODAY,
    });
    expect(items.find((i) => i.kind === "task")?.sub).toBe("היום");
    expect(items.find((i) => i.kind === "lease_ending")?.sub).toBe("מסתיים היום");
  });
});
```

- [ ] **Step 2: לוודא כישלון** - `npx vitest run src/lib/domain/attention.test.ts` - Expected: FAIL ("Cannot find module './attention'").

- [ ] **Step 3: מימוש** - ליצור `src/lib/domain/attention.ts`:

```ts
// "דורש טיפול" - הכרטיס הראשון בדשבורד. פונקציה טהורה: הקורא מספק
// חוזים פעילים בלבד (isLeaseCurrentlyActive) ומשימות פתוחות בלבד (completed_at === null).
import { getDebtAmount } from "./partial-payment";

export interface AttentionPayment {
  id: string;
  status: string;
  due_date: string;
  amount: number;
  notes?: string | null;
  partial_paid_amount?: number | null;
  property?: { title?: string };
}

export interface AttentionLease {
  id: string;
  end_date: string;
  properties?: { title?: string };
}

export interface AttentionTask {
  id: string;
  title: string;
  due_date: string;
}

export interface AttentionItem {
  id: string;
  kind: "overdue" | "task" | "lease_ending";
  label: string;
  sub: string;
  href: string;
}

const TASK_HORIZON_DAYS = 7;
const LEASE_HORIZON_DAYS = 90;

// הפרש ימים בין שני תאריכי YYYY-MM-DD בזמן מקומי (בלי מלכודת UTC)
function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const a = new Date(fy, fm - 1, fd).getTime();
  const b = new Date(ty, tm - 1, td).getTime();
  return Math.round((b - a) / 86400000);
}

export function buildAttentionItems(input: {
  payments: AttentionPayment[];
  activeLeases: AttentionLease[];
  openTasks: AttentionTask[];
  today: string;
}): AttentionItem[] {
  const { payments, activeLeases, openTasks, today } = input;
  const items: AttentionItem[] = [];

  for (const p of payments) {
    if (p.status === "paid" || p.due_date >= today) continue;
    items.push({
      id: `overdue-${p.id}`,
      kind: "overdue",
      label: `תקבול באיחור - ${p.property?.title ?? "נכס"}`,
      sub: `₪${getDebtAmount(p).toLocaleString()}`,
      href: "/dashboard/debts",
    });
  }

  for (const t of openTasks) {
    const days = daysBetween(today, t.due_date);
    if (days < 0 || days > TASK_HORIZON_DAYS) continue;
    items.push({
      id: `task-${t.id}`,
      kind: "task",
      label: t.title,
      sub: days === 0 ? "היום" : `בעוד ${days} ימים`,
      href: "/dashboard/tasks",
    });
  }

  for (const l of activeLeases) {
    const days = daysBetween(today, l.end_date);
    if (days < 0 || days > LEASE_HORIZON_DAYS) continue;
    items.push({
      id: `lease-${l.id}`,
      kind: "lease_ending",
      label: `חוזה ${l.properties?.title ?? "נכס"} מסתיים`,
      sub: days === 0 ? "מסתיים היום" : `בעוד ${days} ימים`,
      href: "/dashboard/leases",
    });
  }

  const rank: Record<AttentionItem["kind"], number> = { overdue: 0, task: 1, lease_ending: 2 };
  return items.sort((a, b) => rank[a.kind] - rank[b.kind]);
}
```

- [ ] **Step 4: לוודא מעבר** - `npx vitest run src/lib/domain/attention.test.ts` - Expected: PASS (3 בדיקות).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/attention.ts src/lib/domain/attention.test.ts
git commit -m "feat: לוגיקת 'דורש טיפול' - איחורים, משימות קרובות וחוזים שמסתיימים"
```

---

### Task 5: לוגיקת "מאז הביקור האחרון" (domain, TDD)

**Files:**
- Create: `src/lib/domain/last-visit.ts`
- Test: `src/lib/domain/last-visit.test.ts`

**Interfaces:**
- Consumes: `getReceivedAmount(p)` מ-`./partial-payment`.
- Produces: `readAndStampVisit(storage, nowIso): string | null` (מחזיר את חותמת הביקור הקודם ומטביע את הנוכחי), `summarizeSince(sinceIso, data, today): SinceSummary | null` כאשר `SinceSummary = { paymentsCount, paymentsSum, tasksDone, newOverdue }`. Task 7 צורך את שניהם.

- [ ] **Step 1: בדיקות נכשלות** - ליצור `src/lib/domain/last-visit.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readAndStampVisit, summarizeSince } from "./last-visit";

function fakeStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    dump: () => Object.fromEntries(store),
  };
}

describe("readAndStampVisit", () => {
  it("מחזיר null בביקור ראשון ומטביע את הנוכחי", () => {
    const s = fakeStorage();
    expect(readAndStampVisit(s, "2026-07-10T08:00:00Z")).toBeNull();
    expect(readAndStampVisit(s, "2026-07-12T08:00:00Z")).toBe("2026-07-10T08:00:00Z");
  });
});

describe("summarizeSince", () => {
  const data = {
    payments: [
      { status: "paid", paid_date: "2026-07-08", amount: 7875, payment_type: "Rent" },
      { status: "paid", paid_date: "2026-07-01", amount: 5500, payment_type: "Rent" },
      { status: "pending", due_date: "2026-07-07", paid_date: undefined, amount: 4000, payment_type: "Rent" },
    ],
    tasks: [
      { completed_at: "2026-07-09T10:00:00Z" },
      { completed_at: null },
    ],
  };

  it("מסכם תקבולים, משימות שסומנו וחובות חדשים מאז הביקור", () => {
    const s = summarizeSince("2026-07-06T00:00:00Z", data as never, "2026-07-10");
    expect(s).toEqual({ paymentsCount: 1, paymentsSum: 7875, tasksDone: 1, newOverdue: 1 });
  });

  it("מחזיר null כשאין שום דבר לדווח", () => {
    expect(summarizeSince("2026-07-09T23:00:00Z", { payments: [], tasks: [] }, "2026-07-10")).toBeNull();
  });
});
```

- [ ] **Step 2: לוודא כישלון** - `npx vitest run src/lib/domain/last-visit.test.ts` - Expected: FAIL ("Cannot find module './last-visit'").

- [ ] **Step 3: מימוש** - ליצור `src/lib/domain/last-visit.ts`:

```ts
// "מאז הביקור האחרון" - חותמת ביקור per-device ב-localStorage (בלי DB),
// וסיכום טהור של מה שקרה מאז. הכרטיס מוצג רק כשיש מה לדווח.
import { getReceivedAmount, type ReceivedAmountInput } from "./partial-payment";

const VISIT_KEY = "rj:last-visit";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function readAndStampVisit(storage: StorageLike, nowIso: string): string | null {
  const prev = storage.getItem(VISIT_KEY);
  storage.setItem(VISIT_KEY, nowIso);
  return prev;
}

export interface SincePayment extends ReceivedAmountInput {
  payment_type: string;
  paid_date?: string | null;
  due_date?: string;
}

export interface SinceTask {
  completed_at: string | null;
}

export interface SinceSummary {
  paymentsCount: number;
  paymentsSum: number;
  tasksDone: number;
  newOverdue: number;
}

export function summarizeSince(
  sinceIso: string,
  data: { payments: SincePayment[]; tasks: SinceTask[] },
  today: string
): SinceSummary | null {
  const sinceDay = sinceIso.slice(0, 10);

  const received = data.payments.filter(
    (p) => p.payment_type === "Rent" && p.paid_date && p.paid_date >= sinceDay
  );
  const tasksDone = data.tasks.filter((t) => t.completed_at && t.completed_at >= sinceIso).length;
  const newOverdue = data.payments.filter(
    (p) => p.status !== "paid" && p.due_date && p.due_date >= sinceDay && p.due_date < today
  ).length;

  const summary: SinceSummary = {
    paymentsCount: received.length,
    paymentsSum: received.reduce((s, p) => s + getReceivedAmount(p), 0),
    tasksDone,
    newOverdue,
  };
  const hasNews = summary.paymentsCount > 0 || summary.tasksDone > 0 || summary.newOverdue > 0;
  return hasNews ? summary : null;
}
```

- [ ] **Step 4: לוודא מעבר** - `npx vitest run src/lib/domain/last-visit.test.ts` - Expected: PASS (3 בדיקות).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/last-visit.ts src/lib/domain/last-visit.test.ts
git commit -m "feat: לוגיקת 'מאז הביקור האחרון' - חותמת per-device וסיכום טהור"
```

---

### Task 6: קיבוץ תנועות לפי שבוע (domain, TDD)

**Files:**
- Modify: `src/lib/domain/dates.ts` (הוספת פונקציה בסוף הקובץ)
- Test: `src/lib/domain/dates.test.ts` (הוספת describe בסוף הקובץ)

**Interfaces:**
- Consumes: אין תלות בפונקציות אחרות בקובץ (מימוש עצמאי; לקרוא את הקובץ לפני עריכה וליישר סגנון).
- Produces: `weekGroupLabel(dateStr, today): string` - "השבוע" / "שבוע שעבר" / שם חודש עברי ("יוני 2026"). Task 7 צורך אותה.

- [ ] **Step 1: בדיקה נכשלת** - להוסיף בסוף `src/lib/domain/dates.test.ts`:

```ts
describe("weekGroupLabel", () => {
  // 2026-07-10 הוא יום שישי; תחילת השבוע (ראשון) 2026-07-05
  it("מסווג לשבוע הנוכחי, לשבוע שעבר ולחודש לפי לוח עברי-ישראלי (שבוע מתחיל בראשון)", () => {
    expect(weekGroupLabel("2026-07-10", "2026-07-10")).toBe("השבוע");
    expect(weekGroupLabel("2026-07-05", "2026-07-10")).toBe("השבוע");
    expect(weekGroupLabel("2026-07-04", "2026-07-10")).toBe("שבוע שעבר");
    expect(weekGroupLabel("2026-06-28", "2026-07-10")).toBe("שבוע שעבר");
    expect(weekGroupLabel("2026-06-27", "2026-07-10")).toBe("יוני 2026");
  });
});
```

(ולהוסיף את `weekGroupLabel` ל-import בראש קובץ הבדיקות.)

- [ ] **Step 2: לוודא כישלון** - `npx vitest run src/lib/domain/dates.test.ts` - Expected: FAIL על הבדיקה החדשה בלבד.

- [ ] **Step 3: מימוש** - להוסיף בסוף `src/lib/domain/dates.ts`:

```ts
// כותרת קבוצה לפיד תנועות - רזולוציה שמתאימה לביקור אחת לכמה ימים.
// שבוע ישראלי מתחיל ביום ראשון.
export function weekGroupLabel(dateStr: string, today: string): string {
  const parse = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const t = parse(today);
  const weekStart = new Date(t);
  weekStart.setDate(t.getDate() - t.getDay()); // getDay(): ראשון = 0
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(weekStart.getDate() - 7);

  const d = parse(dateStr);
  if (d >= weekStart) return "השבוע";
  if (d >= prevWeekStart) return "שבוע שעבר";
  return d.toLocaleDateString("he-IL", { month: "long", year: "numeric" });
}
```

- [ ] **Step 4: לוודא מעבר** - `npx vitest run src/lib/domain/dates.test.ts` - Expected: PASS כולל הבדיקות הקיימות.

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/dates.ts src/lib/domain/dates.test.ts
git commit -m "feat: weekGroupLabel - קיבוץ תנועות לפי שבוע לפיד הדשבורד"
```

---

### Task 7: דשבורד - ההיררכיה החדשה

**Files:**
- Modify: `src/app/dashboard/page.tsx` (שכתוב חלק התצוגה; הלוגיקה הקיימת `pendingPaymentsSummary` נשארת)

**Interfaces:**
- Consumes: `monthCashflow`, `cashflowTrendPct` (Task 3); `buildAttentionItems` (Task 4); `readAndStampVisit`, `summarizeSince` (Task 5); `weekGroupLabel` (Task 6); `todayStr` מ-`rent-schedule` (קיים); `getReceivedAmount` (קיים); `queryKeys.tasks` + `apiGet` (קיימים).
- Produces: מסך הבקרה הסופי. אין צרכנים במורד.

- [ ] **Step 1: הוספת שאילתות ונתונים** - בתוך `Dashboard()`: להוסיף שאילתת משימות ולהרחיב את טיפוס ה-Expense וה-Payment המקומיים:

```tsx
interface Task { id: string; title: string; due_date: string; completed_at: string | null; }
// ל-Payment להוסיף: partial_paid_amount?: number | null; property?: { id: string; title?: string };
// ל-Expense להוסיף: date: string;

const tasksQuery = useQuery({ queryKey: queryKeys.tasks, queryFn: () => apiGet<Task[]>("/api/tasks") });
```

(לצרף את `tasksQuery` לחישובי `isPending` / `failedQuery`.)

- [ ] **Step 2: חישובים חדשים** - אחרי ה-useMemo הקיימים:

```tsx
const today = todayStr();                       // YYYY-MM-DD מקומי
const thisMonth = today.slice(0, 7);
const prevMonth = (() => {
  const [y, m] = thisMonth.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
})();

const cashflow = useMemo(() => monthCashflow(payments, expenses, thisMonth), [payments, expenses, thisMonth]);
const trendPct = useMemo(
  () => cashflowTrendPct(cashflow, monthCashflow(payments, expenses, prevMonth)),
  [cashflow, payments, expenses, prevMonth]
);

const openTasks = useMemo(() => tasks.filter((t) => t.completed_at === null), [tasks]);
const attention = useMemo(
  () => buildAttentionItems({
    payments, activeLeases: leases.filter(isLeaseCurrentlyActive), openTasks, today,
  }),
  [payments, leases, openTasks, today]
);

// חותמת ביקור - נקראת ומוטבעת פעם אחת per mount
const [lastVisit] = useState<string | null>(() =>
  typeof window === "undefined" ? null : readAndStampVisit(window.localStorage, new Date().toISOString())
);
const sinceSummary = useMemo(
  () => (lastVisit ? summarizeSince(lastVisit, { payments, tasks }, today) : null),
  [lastVisit, payments, tasks, today]
);

// פיד: תקבולים ששולמו, חדשים ראשונים, עד 6, מקובצים לפי שבוע
const feedGroups = useMemo(() => {
  const paid = payments
    .filter((p) => p.paid_date)
    .sort((a, b) => (b.paid_date! < a.paid_date! ? -1 : 1))
    .slice(0, 6);
  const groups = new Map<string, Payment[]>();
  for (const p of paid) {
    const label = weekGroupLabel(p.paid_date!, today);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(p);
  }
  return [...groups.entries()];
}, [payments, today]);
```

- [ ] **Step 3: JSX חדש** - סדר הבלוקים ב-return (ברכה וכפתורי פעולה נשארים; בלוק "חוזים שעומדים לפוג" הקיים **נמחק** - הוא נבלע ב"דורש טיפול"):

```tsx
{/* מאז הביקור האחרון */}
{sinceSummary && (
  <div className="rounded-2xl p-4 space-y-2" style={{ background: "var(--accent-dim)", border: "1px solid rgba(124,131,255,0.32)" }}>
    <p className="text-sm font-bold" style={{ color: "var(--accent-hover)" }}>
      <span aria-hidden="true">🗞️</span> מאז הביקור האחרון
    </p>
    <ul className="text-sm space-y-1">
      {sinceSummary.paymentsCount > 0 && (
        <li className="flex justify-between">
          <span>{sinceSummary.paymentsCount} תקבולי שכ"ד נכנסו</span>
          <span className="font-bold text-emerald-700 num-ltr">₪{sinceSummary.paymentsSum.toLocaleString()} ✓</span>
        </li>
      )}
      {sinceSummary.tasksDone > 0 && (
        <li className="flex justify-between"><span>{sinceSummary.tasksDone} תזכורות סומנו כבוצעו</span><span className="text-emerald-700">✓</span></li>
      )}
      <li className="flex justify-between">
        <span>חובות חדשים</span>
        {sinceSummary.newOverdue > 0
          ? <span className="font-bold text-red-700">{sinceSummary.newOverdue}</span>
          : <span className="text-emerald-700">אין</span>}
      </li>
    </ul>
  </div>
)}

{/* דורש טיפול */}
{attention.length > 0 && (
  <div className="bg-white rounded-2xl p-4 space-y-2 border border-amber-700/30" style={{ borderInlineStartWidth: 3, borderInlineStartColor: "#b45309" }}>
    <p className="text-sm font-bold text-amber-700"><span aria-hidden="true">📌</span> דורש טיפול ({attention.length})</p>
    {attention.map((item) => (
      <Link key={item.id} href={item.href}
        className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5 hover:bg-gray-100 transition-colors">
        <span className="text-sm font-semibold text-gray-800">{item.label}</span>
        <span className="text-xs font-bold text-gray-500 num-ltr">{item.sub}</span>
      </Link>
    ))}
  </div>
)}

{/* מספר-גיבור: תזרים החודש */}
<div className="text-center py-2">
  <p className="text-sm text-gray-600">תזרים החודש, אחרי מס</p>
  <p className="text-5xl font-bold text-gray-900 num-ltr py-1">₪{cashflow.toLocaleString()}</p>
  {trendPct !== null && (
    <p className={`text-sm font-semibold ${trendPct >= 0 ? "text-emerald-700" : "text-red-700"}`}>
      <span aria-hidden="true" className="text-xs">{trendPct >= 0 ? "▲" : "▼"}</span>{" "}
      {trendPct >= 0 ? "עלייה" : "ירידה"} של {Math.abs(trendPct)}% מהחודש שעבר
    </p>
  )}
</div>

{/* KPI קטנים - כרטיסי נייר, קטנים מובהקות מהגיבור */}
<div className="grid grid-cols-3 gap-3">
  {[
    { label: "נכסים", value: properties.length, href: "/dashboard/properties" },
    { label: "חוזים פעילים", value: activeLeases.length, href: "/dashboard/leases" },
    { label: "תקבולים ממתינים", value: pendingCount, href: "/dashboard/payments" },
  ].map((k) => (
    <Link key={k.label} href={k.href} className="bg-white rounded-xl px-3 py-3 text-center hover:shadow-md transition-shadow">
      <p className="text-xl font-bold text-gray-900">{k.value}</p>
      <p className="text-xs text-gray-500">{k.label}</p>
    </Link>
  ))}
</div>

{/* כרטיסי הכנסה/הוצאות - גרדיאנטים סמנטיים, טקסט לבן (נשמרים) */}
```

את שני כרטיסי הגרדיאנט (הכנסה חודשית emerald, הוצאות rose) לממש כמו מערך `stats` הקיים אך עם שני פריטים בלבד (`monthlyIncome` + subValue אחרי מס; `totalExpenses`); grid-cols-2.

```tsx
{/* תנועות אחרונות - מקובצות לפי שבוע */}
{feedGroups.length > 0 && (
  <div className="space-y-1">
    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2.5">
      <span className="inline-block w-1 h-5 rounded-full tick-accent" />
      תנועות אחרונות
    </h2>
    {feedGroups.map(([label, group]) => (
      <div key={label}>
        <p className="text-xs font-semibold text-gray-400 tracking-wide mt-3 mb-1.5">{label}</p>
        {group.map((p) => (
          <div key={p.id} className="bg-white rounded-xl flex items-center justify-between px-4 py-3 mb-2">
            <div>
              <p className="text-sm font-semibold text-gray-900">{p.payment_type === "Rent" ? "שכ\"ד" : p.payment_type} - {p.property?.title ?? "נכס"}</p>
            </div>
            <p className="text-sm font-bold text-emerald-700 num-ltr">₪{getReceivedAmount(p).toLocaleString()}</p>
          </div>
        ))}
      </div>
    ))}
  </div>
)}
```

רשימת "הנכסים שלי" הקיימת נשארת אחרי הפיד, ללא שינוי מלבד: להחליף את תו החץ `←` בשורה 272 ב-`‹` (תו סימן, לא חץ - כללי RTL).

- [ ] **Step 4: אימות** - `npx tsc --noEmit && npx vitest run && npm run lint`, ואז `npm run dev` ובדיקת המסך: הסדר נכון, "דורש טיפול" נעלם כשאין פריטים, המגמה מוסתרת בלי חודש קודם, רענון שני מציג "מאז הביקור" רק אם קרה משהו.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: דשבורד מהדורת נייר - מאז הביקור, דורש טיפול, מספר-גיבור, פיד שבועי"
```

---

### Task 8: בידוד כיוון וספרות טבלאיות - sweep רוחבי

**Files:**
- Modify: `src/app/dashboard/leases/page.tsx`, `src/app/dashboard/payments/page.tsx`, `src/app/dashboard/debts/page.tsx`, `src/app/dashboard/properties/[id]/page.tsx`, `src/app/dashboard/reports/page.tsx` (נקודתית)

**Interfaces:**
- Consumes: מחלקת `.num-ltr` (Task 1).
- Produces: אין - שיפור עקביות בלבד.

- [ ] **Step 1: איתור מוקדים** - להריץ ולעבור על התוצאות בדפים הנ"ל:

```bash
grep -rn "toLocaleDateString\|toLocaleString()\|052-\|05[0-9]-" src/app/dashboard --include="*.tsx" -l
```

- [ ] **Step 2: עטיפה** - כלל ההחלה: כל ביטוי שמרנדר טווח תאריכים ("26.5.2026 - 25.5.2027"), מספר טלפון, או סכום עם סימן מטבע בתוך משפט עברי - נעטף ב-span עם המחלקה. דוגמת הדפוס (מדף החוזים, שורת התקופה):

```tsx
<span className="num-ltr">{formatDate(l.start_date)} - {formatDate(l.end_date)}</span>
```

סכום שעומד לבד בכרטיס (כמו `₪5,500`) לא חייב עטיפה אם הוא כבר מיושר נכון - העטיפה נדרשת כשהמספר משובץ בתוך טקסט עברי או כשיש שני מספרים עם מפריד ביניהם.

- [ ] **Step 3: אימות ויזואלי** - `npm run dev`, לעבור על חוזים / תקבולים / חובות / דף נכס / דוחות ולוודא: אין תאריך "הפוך", טלפונים נקראים משמאל לימין, טורי סכומים מיושרים.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard
git commit -m "fix: בידוד כיוון LTR לתאריכים, טלפונים וסכומים משובצים בטקסט עברי"
```

---

### Task 9: דף נחיתה ומסכי auth על קלף

**Files:**
- Modify: `src/app/page.tsx`, `src/app/auth/signin/page.tsx`, `src/app/auth/signup/page.tsx` (אם קיים - לבדוק עם `ls src/app/auth`)

**Interfaces:**
- Consumes: טוקני הקלף (Task 1) - הדפים כבר צורכים `var(--text-1)` וכד', ולכן רובם מתהפך אוטומטית.
- Produces: אין.

- [ ] **Step 1: איתור שאריות כהות** - להריץ:

```bash
grep -n "rgba(255,255,255\|rgba(0,0,0\|#0b\|#15\|#1e\|black\|white/" src/app/page.tsx src/app/auth/signin/page.tsx src/app/auth/*/page.tsx
```

- [ ] **Step 2: התאמות** - כלל ההחלה: אלמנטים דקורטיביים שנבנו ללילה (רישות רקע ב-rgba לבן שקוף, זוהר, כתמי אור) מתהפכים לגרסת דיו: `rgba(255,255,255,0.x)` הופך ל-`rgba(35,31,22,0.x)` באותה עוצמה בקירוב; רקעים שחורים קשיחים הופכים ל-`var(--bg-base)`. טקסט על גרדיאנט סגול של המותג נשאר לבן (כלל קיים).

- [ ] **Step 3: אימות ויזואלי** - `npm run dev`: דף הבית (לא מחובר) ומסך ההתחברות נראים "קלף" עקבי עם הדשבורד; ניגודיות טקסט תקינה.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/app/auth
git commit -m "feat: דף נחיתה ומסכי auth על ערכת קלף"
```

---

### Task 10: אימות מקצה לקצה, פריסה ותיעוד

**Files:**
- Modify: `SPEC.md` (סעיף עיצוב + backlog), `C:\Users\1\.claude\projects\c--Projects-rental-journal\memory\project_design_system.md`

**Interfaces:**
- Consumes: כל המשימות הקודמות.
- Produces: main פרוס ומאומת.

- [ ] **Step 1: שערים מלאים**

```bash
npx tsc --noEmit && npm run lint && npx vitest run && npm run build
```

Expected: הכל ירוק (vitest: כל הבדיקות כולל ~11 החדשות).

- [ ] **Step 2: אימות ויזואלי מקומי** - `npm run dev` + מעבר על כל המסכים (בקרה, נכסים, חוזים, תקבולים, הוצאות, חובות, דוחות, תזכורות, הגדרות, אודות, נחיתה, auth). לוודא: אין "איי חושך" (רכיב שנשאר כהה), אין טקסט בהיר על רקע בהיר. בדיקת הדפסה: תצוגת print של דוח המס ללא רגרסיה.

- [ ] **Step 3: push ופריסה** - `git push`, לוודא GitHub Actions ירוק (typecheck+lint+tests+deploy).

- [ ] **Step 4: אימות במכשיר** - במכשיר האנדרואיד (adb): פתיחת ה-PWA המותקנת, צילומי מסך של בקרה/נכסים/חוזים, ולוודא שפס הסטטוס בגוון קלף (theme_color החדש נטען אחרי עדכון ה-WebAPK - עשוי לקחת עד יום; לתעד אם עדיין כחול).

- [ ] **Step 5: תיעוד** - לעדכן ב-`SPEC.md`: סעיף העיצוב (מהדורת נייר: קלף, Heebo, היררכיית דשבורד, תאריך) + להוסיף ל-backlog את סעיף "מחוץ להיקף" מה-spec. לעדכן את קובץ הזיכרון `project_design_system.md`: בהיר-בלבד ערכת קלף, Heebo יחיד (הסריף הוסר), ההיררכיה החדשה; לשמר את כללי הצבעים הסמנטיים.

- [ ] **Step 6: Commit + push**

```bash
git add SPEC.md
git commit -m "docs: עדכון SPEC - רדיזיין מהדורת נייר הושלם [skip ci]"
git push
```

---

## סקירה עצמית (בוצעה)

- **כיסוי spec:** ערכת קלף (Task 1), Heebo (Task 2), מספר-גיבור+מגמה (3+7), דורש טיפול (4+7), מאז הביקור (5+7), פיד שבועי (6+7), tabular-nums+num-ltr (1+8), manifest/theme_color/שם (1), נחיתה+auth (9), קריטריוני הצלחה (10). אין פערים.
- **עקביות טיפוסים:** `buildAttentionItems` מקבל `activeLeases`/`openTasks` מסוננים - Task 7 מסנן לפני הקריאה (מתועד בשני הצדדים). `getReceivedAmount` נצרך ב-3, 5 וב-7 מאותו מקור קיים.
- **ללא placeholders:** כל בדיקה עם קוד מלא; ב-Tasks 8-9 (sweep) ניתן כלל-החלה מפורש + פקודת איתור + דוגמת דפוס - ההיקף המדויק נקבע לפי תוצאות ה-grep בזמן ביצוע.
