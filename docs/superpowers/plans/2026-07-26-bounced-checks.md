# שקים חוזרים - תוכנית יישום

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** סימון תזכורת הפקדת שק ירשום את התקבול כשולם, ושק שחוזר מהבנק יתועד כשרשרת אירועים בולטת שנשמרת בהיסטוריה.

**Architecture:** טבלת אירועים חדשה `check_bounces` (ולא עמודות סטטוס על `payments`), כך שכל החזרה היא שורה והשרשרת נשמרת. שק שחזר מחזיר את `payments.status` ל-`pending`, ומכאן כל ההשלכות - מחיקת הוצאת המס, ירידת ההכנסה בדוחות, הופעת החוב - נגזרות מ-`getReceivedAmount` הקיים בלי לגעת בו. סימון תזכורת מנותב דרך ה-API של התקבולים, כך ש-`closeCheckReminderForPayment` הקיים סוגר ומקשר את המשימה.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (Postgres + RLS), TanStack Query, Tailwind, Vitest.

**אפיון מקור:** [docs/superpowers/specs/2026-07-26-bounced-checks-design.md](../specs/2026-07-26-bounced-checks-design.md)

## Global Constraints

- **שפה:** כל טקסט מוצג, הערת קוד, הודעת commit ושם בדיקה - **בעברית בלבד**.
- **מקפים:** מקף רגיל (`-`) בלבד. **אסור** מקף ארוך (`—`, `–`) בקוד, בטקסט ובהערות.
- **חצים:** **אסור** להשתמש ב-`→` `←` `↔` בטקסט עברי. במקומם מילה.
- **תווי כיווניות בלתי-נראים:** **אסור** להזריק RLM (`U+200F`) או LRM (`U+200E`) לקוד או לטקסט.
- **טבלאות Markdown בעברית:** לעטוף ב-`<div dir="rtl" align="right">` עם שורה ריקה בין התגים לטבלה.
- **צבעים סמנטיים:** הכנסות = emerald/green · הוצאות = rose/red · מס = orange/amber. שק שחזר = **rose מלא**, נבדל מ"פג מועד" הכתום.
- **`.num-ltr`:** למספרים וטלפונים בלבד. **אסור** לעטוף בו מחרוזת שמכילה מילים בעברית - זה מפרק אותה.
- **תצוגת כסף:** תמיד דרך `formatCurrency` / `formatAmount` מ-`@/lib/domain/money`. אסור `toLocaleString()` גולמי.
- **`timestamptz`:** להשוואת תאריכים תמיד `.slice(0, 10)` לפני השוואה.
- **מיגרציות:** קובץ חדש ב-`supabase/migrations/YYYYMMDD_description.sql`, append-only. לעדכן גם את `supabase_schema.sql` (baseline) ואת טבלת הסטטוס ב-`supabase/migrations/README.md`. **אין CLI מקושר** - אמיר מריץ ידנית ב-Supabase Dashboard.
- **בדיקות:** `npx vitest run`. שערים לפני commit: `npx tsc --noEmit && npm run lint && npx vitest run`.
- **`"use client"`:** כל עמוד ב-`src/app/dashboard` שמרנדר `Icon` חייב `"use client"` בשורה הראשונה. `tsc`/`lint`/`vitest` **לא** תופסים את זה - רק `npm run build`.

---

## מבנה הקבצים

<div dir="rtl" align="right">

| קובץ | אחריות |
|---|---|
| `supabase/migrations/20260726_check_bounces.sql` | סכימת הטבלה, RLS, GRANTs |
| `src/lib/domain/check-bounce.ts` | פונקציות טהורות: תוויות סיבה, מצב פתוח, שרשרת, מונה |
| `src/lib/domain/check-bounce.test.ts` | בדיקות למודול הטהור |
| `src/lib/validations.ts` | סכימת zod לגוף בקשת ההחזרה |
| `src/app/api/check-bounces/route.ts` | `GET` - כל ההחזרות של המשתמש |
| `src/app/api/payments/[id]/bounce/route.ts` | `POST` - סימון שק שחזר |
| `src/lib/check-reminders.ts` | אימוץ משימה סגורה (תיקון הכפילות) + פרמטר `title` |
| `src/lib/domain/attention.ts` | `kind: "bounced"` ממוין ראשון |
| `src/app/dashboard/tasks/page.tsx` | ניתוב סימון תזכורת דרך API התקבולים |
| `src/app/dashboard/payments/page.tsx` | מקטע "שקים שחזרו" + כפתור וחלונית סימון |
| `src/app/dashboard/leases/[id]/edit/page.tsx` | מקטע שרשרת ההחזרות בחוזה |
| `src/app/dashboard/page.tsx` | העברת `bounces` ל-`buildAttentionItems` |
| `src/lib/api-client.ts` | `queryKeys.checkBounces` |

</div>

**סדר התלויות:** משימות 1-3 (דאטה ולוגיקה טהורה) הן הבסיס. משימה 4 (תיקון הכפילות) עצמאית לגמרי ואפשר להריץ אותה במקביל. משימות 5-9 בונות מעל 1-3.

---

## Task 1: מיגרציה וטבלת check_bounces

**Files:**
- Create: `supabase/migrations/20260726_check_bounces.sql`
- Modify: `supabase_schema.sql` (הוספה בסוף, לפני מקטע ה-RLS)
- Modify: `supabase/migrations/README.md` (שורה בטבלת הסטטוס)

**Interfaces:**
- Consumes: אין
- Produces: טבלה `check_bounces` עם השדות `id`, `user_id`, `payment_id`, `lease_id`, `bounced_at`, `reason`, `created_at`

- [ ] **Step 1: כתיבת קובץ המיגרציה**

צור `supabase/migrations/20260726_check_bounces.sql`:

```sql
-- טבלת check_bounces - אירועי החזרת שק מהבנק.
-- אירוע ולא סטטוס: שק חלופי שגם חוזר יוצר שורה נוספת, כך שהשרשרת המלאה
-- נשמרת ומשמשת ראיה לביטול חוזה ופינוי.
-- payment_id הוא ON DELETE SET NULL בכוונה - ההיסטוריה שורדת מחיקת תקבול.
-- ראו docs/superpowers/specs/2026-07-26-bounced-checks-design.md

CREATE TABLE IF NOT EXISTS check_bounces (
  id          text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id  text        REFERENCES payments(id) ON DELETE SET NULL,
  lease_id    text        NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  bounced_at  date        NOT NULL,
  reason      text        NOT NULL
                CHECK (reason IN ('nsf','restricted','cancelled','other')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS check_bounces_lease_idx ON check_bounces(lease_id);
CREATE INDEX IF NOT EXISTS check_bounces_payment_idx ON check_bounces(payment_id);

ALTER TABLE check_bounces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "check_bounces_owner" ON check_bounces FOR ALL USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON check_bounces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON check_bounces TO service_role;
```

`bounced_at` הוא `date` ולא `timestamptz` - זהו תאריך יומי שהמשתמש מזין, ו-`date` מונע את מלכודת הסטת חצות שכבר תועדה בפרויקט.

- [ ] **Step 2: עדכון ה-baseline**

ב-`supabase_schema.sql`, אחרי הגדרת טבלת `property_utilities` ולפני מקטע `ROW LEVEL SECURITY`, הוסף את אותה הגדרת `CREATE TABLE` (בלי ה-GRANTs, בעקבות הדפוס הקיים בקובץ), ובמקטע ה-RLS הוסף:

```sql
alter table check_bounces enable row level security;
create policy "check_bounces_owner" on check_bounces for all using (user_id = auth.uid());
```

- [ ] **Step 3: עדכון טבלת הסטטוס**

ב-`supabase/migrations/README.md`, הוסף שורה בסוף טבלת "סטטוס הרצה":

```
| 20260726_check_bounces.sql | ⬜ טרם הורץ |
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260726_check_bounces.sql supabase_schema.sql supabase/migrations/README.md
git commit -m "feat(bounces): מיגרציה לטבלת check_bounces"
```

**עצור כאן ובקש מאמיר להריץ את המיגרציה** ב-Supabase Dashboard לפני שתמשיך למשימה 5 ואילך. משימות 2-4 לא נוגעות ב-DB ואפשר להתקדם בהן בינתיים.

---

## Task 2: מודול דומיין טהור

**Files:**
- Create: `src/lib/domain/check-bounce.ts`
- Test: `src/lib/domain/check-bounce.test.ts`

**Interfaces:**
- Consumes: אין
- Produces:
  - `type BounceReason = "nsf" | "restricted" | "cancelled" | "other"`
  - `interface CheckBounce { id: string; payment_id: string | null; lease_id: string; bounced_at: string; reason: BounceReason }`
  - `const BOUNCE_REASON_LABELS: Record<BounceReason, string>`
  - `hasOpenBounce(payment: { id: string; status: string }, bounces: CheckBounce[]): boolean`
  - `bounceChainForPayment(paymentId: string, bounces: CheckBounce[]): CheckBounce[]`
  - `bounceCountForLease(leaseId: string, bounces: CheckBounce[]): number`

- [ ] **Step 1: כתיבת הבדיקות הנכשלות**

צור `src/lib/domain/check-bounce.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  hasOpenBounce,
  bounceChainForPayment,
  bounceCountForLease,
  BOUNCE_REASON_LABELS,
  type CheckBounce,
} from "./check-bounce";

const BOUNCES: CheckBounce[] = [
  { id: "b2", payment_id: "p1", lease_id: "l1", bounced_at: "2026-08-02", reason: "restricted" },
  { id: "b1", payment_id: "p1", lease_id: "l1", bounced_at: "2026-07-08", reason: "nsf" },
  { id: "b3", payment_id: "p2", lease_id: "l1", bounced_at: "2026-09-15", reason: "nsf" },
  { id: "b4", payment_id: "p9", lease_id: "l2", bounced_at: "2026-05-01", reason: "other" },
];

describe("hasOpenBounce", () => {
  it("מזהה שק שחזר וטרם טופל", () => {
    expect(hasOpenBounce({ id: "p1", status: "pending" }, BOUNCES)).toBe(true);
  });

  it("מחזיר false אחרי שהשוכר שילם שוב", () => {
    expect(hasOpenBounce({ id: "p1", status: "paid" }, BOUNCES)).toBe(false);
  });

  it("מחזיר false לתקבול שמעולם לא חזר לו שק", () => {
    expect(hasOpenBounce({ id: "p5", status: "pending" }, BOUNCES)).toBe(false);
  });
});

describe("bounceChainForPayment", () => {
  it("מחזיר את השרשרת ממוינת מהישן לחדש", () => {
    const chain = bounceChainForPayment("p1", BOUNCES);
    expect(chain.map((b) => b.id)).toEqual(["b1", "b2"]);
  });

  it("מחזיר רשימה ריקה לתקבול בלי החזרות", () => {
    expect(bounceChainForPayment("p5", BOUNCES)).toEqual([]);
  });
});

describe("bounceCountForLease", () => {
  it("סופר אירועים ולא תקבולים - שתי החזרות באותו תקבול נספרות פעמיים", () => {
    expect(bounceCountForLease("l1", BOUNCES)).toBe(3);
  });

  it("מחזיר 0 לחוזה נקי", () => {
    expect(bounceCountForLease("l7", BOUNCES)).toBe(0);
  });
});

describe("BOUNCE_REASON_LABELS", () => {
  it("יש תווית עברית לכל סיבה", () => {
    expect(BOUNCE_REASON_LABELS.nsf).toBe('אכ"מ - אין כיסוי מספיק');
    expect(BOUNCE_REASON_LABELS.restricted).toBe("חשבון מוגבל");
    expect(BOUNCE_REASON_LABELS.cancelled).toBe("בוטל על ידי המושך");
    expect(BOUNCE_REASON_LABELS.other).toBe("אחר");
  });
});
```

- [ ] **Step 2: הרצה לאימות כישלון**

הרץ: `npx vitest run src/lib/domain/check-bounce.test.ts`
צפוי: FAIL עם `Failed to resolve import "./check-bounce"`

- [ ] **Step 3: כתיבת המימוש**

צור `src/lib/domain/check-bounce.ts`:

```ts
// אירועי החזרת שק. אירוע ולא סטטוס - שק חלופי שגם חוזר מוסיף שורה,
// והשרשרת המלאה נשמרת גם אחרי שהשוכר שילם שוב.
// ראו docs/superpowers/specs/2026-07-26-bounced-checks-design.md

export type BounceReason = "nsf" | "restricted" | "cancelled" | "other";

export interface CheckBounce {
  id: string;
  /** null אם התקבול נמחק - ההיסטוריה שורדת */
  payment_id: string | null;
  lease_id: string;
  /** YYYY-MM-DD */
  bounced_at: string;
  reason: BounceReason;
}

export const BOUNCE_REASON_LABELS: Record<BounceReason, string> = {
  nsf: 'אכ"מ - אין כיסוי מספיק',
  restricted: "חשבון מוגבל",
  cancelled: "בוטל על ידי המושך",
  other: "אחר",
};

/**
 * האם לתקבול יש שק שחזר וטרם טופל. מקבל את כל השורות ומסנן בעצמו לפי id.
 * "טופל" = השוכר שילם שוב, כלומר הסטטוס חזר ל-paid.
 */
export function hasOpenBounce(
  payment: { id: string; status: string },
  bounces: CheckBounce[]
): boolean {
  if (payment.status === "paid") return false;
  return bounces.some((b) => b.payment_id === payment.id);
}

/** שרשרת ההחזרות של תקבול, מהישן לחדש - זו התצוגה שמועברת לעורך דין */
export function bounceChainForPayment(paymentId: string, bounces: CheckBounce[]): CheckBounce[] {
  return bounces
    .filter((b) => b.payment_id === paymentId)
    .sort((a, b) => a.bounced_at.localeCompare(b.bounced_at));
}

/** אורך השרשרת בחוזה - סופר אירועים, לא תקבולים */
export function bounceCountForLease(leaseId: string, bounces: CheckBounce[]): number {
  return bounces.filter((b) => b.lease_id === leaseId).length;
}
```

- [ ] **Step 4: הרצה לאימות הצלחה**

הרץ: `npx vitest run src/lib/domain/check-bounce.test.ts`
צפוי: PASS, 8 בדיקות

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/check-bounce.ts src/lib/domain/check-bounce.test.ts
git commit -m "feat(bounces): מודול דומיין טהור לאירועי החזרת שק"
```

---

## Task 3: ראוטים - קריאה וסימון

**Files:**
- Create: `src/app/api/check-bounces/route.ts`
- Create: `src/app/api/payments/[id]/bounce/route.ts`
- Modify: `src/lib/validations.ts` (הוספה בסוף)
- Modify: `src/lib/api-client.ts` (`queryKeys`)

**Interfaces:**
- Consumes: `BounceReason` מ-Task 2, `reconcileAutoTax` מ-`@/lib/auto-tax`, `reopenCheckReminderForPayment` מ-`@/lib/check-reminders`
- Produces:
  - `GET /api/check-bounces` מחזיר `CheckBounce[]`
  - `POST /api/payments/[id]/bounce` גוף `{ bounced_at: string; reason: BounceReason }`
  - `queryKeys.checkBounces`

- [ ] **Step 1: סכימת ולידציה**

ב-`src/lib/validations.ts`, בסוף הקובץ:

```ts
// גוף הבקשה לסימון שק שחזר
export const checkBounceSchema = z.object({
  bounced_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין"),
  reason: z.enum(["nsf", "restricted", "cancelled", "other"]),
});
```

- [ ] **Step 2: מפתח query**

ב-`src/lib/api-client.ts`, בתוך `queryKeys`, אחרי `leaseSecurities`:

```ts
  checkBounces: ["check-bounces"] as const,
```

- [ ] **Step 3: ראוט הקריאה**

צור `src/app/api/check-bounces/route.ts`:

```ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("check_bounces")
    .select("*")
    .eq("user_id", session.user.id)
    .order("bounced_at", { ascending: true });

  if (error) return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 4: ראוט הסימון**

צור `src/app/api/payments/[id]/bounce/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { checkBounceSchema } from "@/lib/validations";
import { reconcileAutoTax } from "@/lib/auto-tax";
import { reopenCheckReminderForPayment } from "@/lib/check-reminders";
import { z } from "zod";

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = checkBounceSchema.parse(await request.json());
    const supabase = await createClient();

    const { data: payment, error: findErr } = await supabase
      .from("payments")
      .select("id, lease_id, status, payment_type, property_id, amount, paid_date, notes, partial_paid_amount")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    if (findErr || !payment) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

    // רק תקבול ששולם במלואו יכול "לחזור" - תשלום חלקי לא נחשב הפקדת שק
    if (payment.status !== "paid")
      return NextResponse.json({ error: "אפשר לסמן החזרה רק על תקבול ששולם" }, { status: 400 });
    if (!payment.lease_id)
      return NextResponse.json({ error: "לתקבול אין חוזה משויך" }, { status: 400 });

    const { error: insertErr } = await supabase.from("check_bounces").insert({
      user_id: session.user.id,
      payment_id: payment.id,
      lease_id: payment.lease_id,
      bounced_at: data.bounced_at,
      reason: data.reason,
    });
    if (insertErr) return NextResponse.json({ error: "שגיאה ברישום ההחזרה" }, { status: 500 });

    const { data: updated, error: updateErr } = await supabase
      .from("payments")
      .update({ status: "pending", paid_date: null })
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select()
      .single();
    if (updateErr) return NextResponse.json({ error: "שגיאה בעדכון התקבול" }, { status: 500 });

    // הסכום שהתקבל בפועל הפך ל-0, ולכן הוצאת המס האוטומטית נמחקת מעצמה
    await reconcileAutoTax(supabase, session.user.id, {
      id: updated.id,
      payment_type: updated.payment_type,
      property_id: updated.property_id,
      amount: updated.amount,
      status: updated.status,
      paid_date: updated.paid_date,
      notes: updated.notes,
      partial_paid_amount: updated.partial_paid_amount,
    });

    await reopenCheckReminderForPayment(supabase, session.user.id, id);

    return NextResponse.json({ ok: true, payment: updated });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Validation failed", details: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: "שגיאה בסימון ההחזרה" }, { status: 500 });
  }
}
```

- [ ] **Step 5: אימות שערים**

הרץ: `npx tsc --noEmit && npm run lint`
צפוי: שניהם עוברים בלי פלט שגיאה

- [ ] **Step 6: Commit**

```bash
git add src/app/api/check-bounces src/app/api/payments/\[id\]/bounce src/lib/validations.ts src/lib/api-client.ts
git commit -m "feat(bounces): ראוטים לקריאת החזרות ולסימון שק שחזר"
```

---

## Task 4: תיקון הכפילות בסגירת תזכורת

**Files:**
- Modify: `src/lib/check-reminders.ts`
- Test: `src/lib/check-reminders.test.ts` (חדש)

**Interfaces:**
- Consumes: אין
- Produces: `closeCheckReminderForPayment(supabase, userId, paymentId, leaseId, due_date, paid_date, title?)` - פרמטר `title` אופציונלי חדש
- Produces: `pickReminderToAdopt(tasks, monthKey)` - פונקציה טהורה מיוצאת לבדיקה

**רקע:** היום הפונקציה מחפשת משימה **פתוחה** לאותו חוזה+חודש. אם המשתמש כבר סימן את התזכורת ידנית (היא סגורה), אף אחת לא נמצאת ונוצרת שורה שנייה - שתי תזכורות כפולות לאותו חודש. זה בדיוק המצב שנוצר אצל אמיר ב-25.7.2026.

- [ ] **Step 1: כתיבת הבדיקה הנכשלת**

צור `src/lib/check-reminders.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isCheckPaymentMethod, pickReminderToAdopt } from "./check-reminders";

describe("isCheckPaymentMethod", () => {
  it("מזהה שיטת תשלום בשקים", () => {
    expect(isCheckPaymentMethod("check")).toBe(true);
    expect(isCheckPaymentMethod("checks")).toBe(true);
    expect(isCheckPaymentMethod("CHECK")).toBe(true);
  });

  it("דוחה שיטות אחרות ואת ריק", () => {
    expect(isCheckPaymentMethod("bank_transfer")).toBe(false);
    expect(isCheckPaymentMethod(null)).toBe(false);
    expect(isCheckPaymentMethod(undefined)).toBe(false);
  });
});

describe("pickReminderToAdopt", () => {
  const OPEN = { id: "t-open", due_date: "2026-07-26", completed_at: null, source_payment_id: null };
  const CLOSED = { id: "t-closed", due_date: "2026-07-26", completed_at: "2026-07-25", source_payment_id: null };
  const OTHER_MONTH = { id: "t-aug", due_date: "2026-08-26", completed_at: null, source_payment_id: null };
  const LINKED = { id: "t-linked", due_date: "2026-07-26", completed_at: "2026-07-25", source_payment_id: "p9" };

  it("מעדיף משימה פתוחה של אותו חודש", () => {
    expect(pickReminderToAdopt([CLOSED, OPEN], "2026-07")?.id).toBe("t-open");
  });

  it("מאמץ משימה סגורה כשאין פתוחה - מונע כפילות", () => {
    expect(pickReminderToAdopt([CLOSED], "2026-07")?.id).toBe("t-closed");
  });

  it("לא נוגע במשימה של חודש אחר", () => {
    expect(pickReminderToAdopt([OTHER_MONTH], "2026-07")).toBeNull();
  });

  it("לא מאמץ משימה שכבר מקושרת לתקבול אחר", () => {
    expect(pickReminderToAdopt([LINKED], "2026-07")).toBeNull();
  });

  it("מחזיר null כשאין מועמדות", () => {
    expect(pickReminderToAdopt([], "2026-07")).toBeNull();
  });
});
```

- [ ] **Step 2: הרצה לאימות כישלון**

הרץ: `npx vitest run src/lib/check-reminders.test.ts`
צפוי: FAIL עם `pickReminderToAdopt is not a function` (או שגיאת import)

- [ ] **Step 3: מימוש הפונקציה הטהורה**

ב-`src/lib/check-reminders.ts`, אחרי `isCheckPaymentMethod`, הוסף:

```ts
/** מועמדת לאימוץ - חתך המינימלי שהפונקציה צריכה משורת tasks */
export interface ReminderCandidate {
  id: string;
  due_date: string;
  completed_at: string | null;
  source_payment_id: string | null;
}

/**
 * בוחרת איזו תזכורת קיימת לאמץ לתקבול, במקום ליצור שורה חדשה.
 * מעדיפה פתוחה על סגורה, אבל **מאמצת גם סגורה** - אחרת משתמש שסימן
 * את התזכורת ידנית לפני שסימן את התקבול מקבל שתי שורות לאותו חודש.
 * מתעלמת ממשימה שכבר מקושרת לתקבול אחר.
 */
export function pickReminderToAdopt(
  tasks: ReminderCandidate[],
  monthKey: string
): ReminderCandidate | null {
  const sameMonth = tasks.filter(
    (t) => t.due_date.slice(0, 7) === monthKey && !t.source_payment_id
  );
  return sameMonth.find((t) => !t.completed_at) ?? sameMonth[0] ?? null;
}
```

- [ ] **Step 4: הרצה לאימות הצלחה**

הרץ: `npx vitest run src/lib/check-reminders.test.ts`
צפוי: PASS, 10 בדיקות

- [ ] **Step 5: חיבור הפונקציה ל-closeCheckReminderForPayment**

ב-`src/lib/check-reminders.ts`, החלף את גוף `closeCheckReminderForPayment` (מהשאילתה `openTasks` ועד סוף הפונקציה) בזה, והוסף `title` לחתימה:

```ts
export async function closeCheckReminderForPayment(
  supabase: SupabaseClient,
  userId: string,
  paymentId: string,
  leaseId: string,
  due_date: string,
  paid_date: string,
  title?: string
): Promise<void> {
  const monthKey = due_date.slice(0, 7);

  const { data: linked } = await supabase
    .from("tasks")
    .select("id")
    .eq("user_id", userId)
    .eq("source_payment_id", paymentId)
    .maybeSingle();
  if (linked) {
    await supabase.from("tasks").update({ completed_at: paid_date }).eq("id", linked.id);
    return;
  }

  // כולל משימות סגורות - אחרת סימון ידני קודם בתזכורות יוצר כפילות
  const { data: candidates } = await supabase
    .from("tasks")
    .select("id, due_date, completed_at, source_payment_id")
    .eq("user_id", userId)
    .eq("category", "Rent Collection")
    .eq("related_entity_type", "lease")
    .eq("related_entity_id", leaseId);

  const match = pickReminderToAdopt((candidates ?? []) as ReminderCandidate[], monthKey);
  if (match) {
    await supabase
      .from("tasks")
      .update({ completed_at: match.completed_at ?? paid_date, source_payment_id: paymentId })
      .eq("id", match.id);
    return;
  }

  await supabase.from("tasks").insert({
    user_id: userId,
    title: title ?? 'הפקדת שק שכ"ד',
    category: "Rent Collection",
    due_date,
    completed_at: paid_date,
    priority: "normal",
    related_entity_type: "lease",
    related_entity_id: leaseId,
    source_payment_id: paymentId,
  });
}
```

שים לב ל-`match.completed_at ?? paid_date`: משימה שכבר נסגרה שומרת על מועד הסגירה המקורי שלה, ומשימה פתוחה נסגרת בתאריך התשלום.

- [ ] **Step 6: אימות שערים**

הרץ: `npx tsc --noEmit && npm run lint && npx vitest run`
צפוי: הכל עובר, כל הבדיקות הקיימות ממשיכות לעבור

- [ ] **Step 7: Commit**

```bash
git add src/lib/check-reminders.ts src/lib/check-reminders.test.ts
git commit -m "fix(reminders): אימוץ תזכורת סגורה במקום יצירת כפילות"
```

---

## Task 5: סימון תזכורת רושם את התקבול

**Files:**
- Modify: `src/app/dashboard/tasks/page.tsx` (הפונקציה `complete`, סביב שורה 464)

**Interfaces:**
- Consumes: `queryKeys` מ-`@/lib/api-client`
- Produces: אין ייצוא חדש

**רקע:** זה הבאג המקורי. `complete()` מעדכן `completed_at` בלבד ולא נוגע בתקבולים. התיקון מנתב תזכורת הפקדת שק דרך ה-API של התקבולים, כך ש-`closeCheckReminderForPayment` הקיים סוגר ומקשר את המשימה - הלקוח לא מעדכן אותה בעצמו.

- [ ] **Step 1: הוספת פונקציית עזר לזיהוי תזכורת שק**

ב-`src/app/dashboard/tasks/page.tsx`, ליד `isRelevant` (סביב שורה 197), הוסף:

```ts
/**
 * תזכורת הפקדת שק - מסומנת דרך התקבול ולא דרך המשימה.
 *
 * בדיקת שיטת התשלום חיונית ואסור להשמיט אותה: שני נתיבי התקבולים בשרת
 * מפעילים את closeCheckReminderForPayment רק כש-isCheckPaymentMethod מתקיים.
 * אם נשלח לשם תזכורת ישנה של חוזה בהעברה בנקאית, ייווצר תקבול אבל המשימה
 * תישאר פתוחה - והמשתמש ילחץ שוב וייצור תקבול כפול. חוזה שאינו בשקים
 * ממשיך במסלול הישן של עדכון המשימה בלבד.
 */
function isCheckDepositReminder(t: Task, leaseById: Map<string, Lease>): boolean {
  if (t.category !== "Rent Collection" || t.related_entity_type !== "lease" || !t.related_entity_id) {
    return false;
  }
  const method = leaseById.get(t.related_entity_id)?.payment_method?.toLowerCase();
  return method === "check" || method === "checks";
}
```

בהתאם, הקריאה ב-`complete` היא `isCheckDepositReminder(t, leaseById)`.

- [ ] **Step 2: הוספת מסלול התקבול ב-complete**

ב-`complete(t)`, מיד אחרי `setCompletingId(key);` ובתוך ה-`try`, לפני `if (t.isVirtual)`, הוסף:

```ts
      if (isCheckDepositReminder(t)) {
        const monthKey = t.due_date.slice(0, 7);
        const existing = payments.find(
          (p) =>
            p.lease_id === t.related_entity_id &&
            p.payment_type === "Rent" &&
            p.due_date.slice(0, 7) === monthKey
        );
        const now = new Date().toISOString();

        const res = existing
          ? await fetch(`/api/payments/${existing.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "paid", paid_date: now }),
            })
          : await fetch("/api/payments", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                property_id: leaseById.get(t.related_entity_id!)?.properties?.id,
                lease_id: t.related_entity_id,
                payment_type: "Rent",
                amount: leaseById.get(t.related_entity_id!)?.monthly_rent,
                due_date: t.due_date,
                paid_date: now,
                status: "paid",
              }),
            });

        if (!res.ok) { showListError("שגיאה ברישום התקבול"); return; }
        // closeCheckReminderForPayment בצד השרת סוגר ומקשר את המשימה
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
        queryClient.invalidateQueries({ queryKey: queryKeys.payments });
        return;
      }
```

- [ ] **Step 3: הוספת הנתונים שהמסלול צריך**

בגוף הקומפוננטה, לצד שאילתות ה-`useQuery` הקיימות, ודא שקיימת שאילתת תקבולים ומפת חוזים. אם `payments` עדיין לא נטען בעמוד, הוסף:

```ts
  const paymentsQuery = useQuery({
    queryKey: queryKeys.payments,
    queryFn: () => apiGet<PaymentLite[]>("/api/payments"),
  });
  const payments = useMemo(() => paymentsQuery.data ?? [], [paymentsQuery.data]);

  const leaseById = useMemo(() => new Map(leases.map((l) => [l.id, l])), [leases]);
```

והגדר את הטיפוס ליד שאר הממשקים בקובץ:

```ts
interface PaymentLite {
  id: string;
  lease_id: string | null;
  payment_type: string;
  due_date: string;
  status: string;
}
```

- [ ] **Step 4: אימות שערים ובנייה**

הרץ: `npx tsc --noEmit && npm run lint && npx vitest run && npm run build`
צפוי: הכל עובר. `npm run build` הכרחי כאן - הוא היחיד שתופס בעיות גבול client/server.

- [ ] **Step 5: אימות ידני**

הרץ `npm run dev`, נווט ל-`/dashboard/tasks`, סמן תזכורת הפקדת שק כבוצעה, ואז נווט ל-`/dashboard/payments`.
צפוי: התקבול של אותו חודש מופיע כ"שולם", ואין תזכורת כפולה במסך התזכורות.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/tasks/page.tsx
git commit -m "fix(tasks): סימון תזכורת הפקדת שק רושם את התקבול"
```

---

## Task 6: מקטע שקים שחזרו במסך התקבולים

**Files:**
- Modify: `src/app/dashboard/payments/page.tsx`

**Interfaces:**
- Consumes: `hasOpenBounce`, `bounceChainForPayment`, `BOUNCE_REASON_LABELS`, `CheckBounce` מ-Task 2 · `queryKeys.checkBounces` מ-Task 3
- Produces: אין ייצוא חדש

- [ ] **Step 1: טעינת ההחזרות**

בראש הקומפוננטה, ליד שאר ה-`useQuery`:

```ts
  const bouncesQuery = useQuery({
    queryKey: queryKeys.checkBounces,
    queryFn: () => apiGet<CheckBounce[]>("/api/check-bounces"),
  });
  const bounces = useMemo(() => bouncesQuery.data ?? [], [bouncesQuery.data]);
```

הוסף `checkBounces` ל-`invalidateAfterPaymentChange` כדי שהמקטע יתעדכן אחרי כל שינוי.

- [ ] **Step 2: חלוקת הפריטים**

אחרי `actionItems`, הוסף:

```ts
  // שקים שחזרו וטרם טופלו - מקטע נפרד מעל "לתשלום", לא מעורבב בחובות רגילים
  const bouncedItems = useMemo(
    () => allItems.filter((p) => !p.isVirtual && hasOpenBounce({ id: p.id, status: p.status }, bounces)),
    [allItems, bounces]
  );
  const bouncedIds = useMemo(() => new Set(bouncedItems.map((p) => p.id)), [bouncedItems]);
```

וסנן אותם מ-`actionItems` כדי שלא יופיעו פעמיים - הוסף לסינון הקיים `&& !bouncedIds.has(p.id)`.

- [ ] **Step 3: רינדור המקטע**

מעל מקטע "לתשלום" הקיים:

```tsx
      {bouncedItems.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-rose-700 flex items-center gap-1.5">
            <Icon name="debts" size={16} />
            שקים שחזרו ({bouncedItems.length})
          </h2>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 divide-y divide-rose-100">
            {bouncedItems.map((p) => {
              const chain = bounceChainForPayment(p.id, bounces);
              const last = chain[chain.length - 1];
              return (
                <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {p.property_title ?? p.property?.title}
                    </p>
                    <p className="text-xs text-rose-700 mt-0.5">
                      {chain.length > 1 && `${chain.length} החזרות · `}
                      {last && `${BOUNCE_REASON_LABELS[last.reason]} · ${new Date(last.bounced_at).toLocaleDateString("he-IL")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-bold text-sm text-rose-700">{formatCurrency(p.amount)}</span>
                    <button onClick={() => togglePaid(p)}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700">
                      שולם מחדש
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
```

- [ ] **Step 4: כפתור וחלונית הסימון**

הוסף state ליד שאר ה-state:

```ts
  const [bounceOpenId, setBounceOpenId] = useState<string | null>(null);
  const [bounceDate, setBounceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [bounceReason, setBounceReason] = useState<BounceReason>("nsf");
  const [savingBounce, setSavingBounce] = useState(false);

  const saveBounce = async (paymentId: string) => {
    setSavingBounce(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}/bounce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bounced_at: bounceDate, reason: bounceReason }),
      });
      if (res.ok) {
        setBounceOpenId(null);
        setBounceDate(new Date().toISOString().slice(0, 10));
        setBounceReason("nsf");
        invalidateAfterPaymentChange();
      }
    } finally {
      setSavingBounce(false);
    }
  };
```

בבלוק `{isPaid && !isVirtual && (...)}` הקיים (סביב שורה 355), ליד כפתור "בטל", הוסף:

```tsx
              <button onClick={() => setBounceOpenId(bounceOpenId === p.id ? null : p.id)}
                className="px-3 py-1.5 bg-white border border-rose-300 text-rose-700 rounded-lg text-xs font-semibold hover:bg-rose-50">
                שק חזר
              </button>
```

ומתחת לשורת התקבול, כשהחלונית פתוחה:

```tsx
          {bounceOpenId === p.id && (
            <div className="mt-2 p-3 rounded-xl border border-rose-200 bg-rose-50 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">תאריך החזרה</label>
                <input type="date" value={bounceDate} onChange={(e) => setBounceDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">סיבה</label>
                <div className="space-y-1">
                  {(Object.keys(BOUNCE_REASON_LABELS) as BounceReason[]).map((r) => (
                    <label key={r} className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="radio" name={`reason-${p.id}`} checked={bounceReason === r}
                        onChange={() => setBounceReason(r)} className="accent-rose-600" />
                      {BOUNCE_REASON_LABELS[r]}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => saveBounce(p.id)} disabled={savingBounce}
                  className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 disabled:opacity-50">
                  {savingBounce ? "..." : "סמן שהשק חזר"}
                </button>
                <button onClick={() => setBounceOpenId(null)}
                  className="px-3 py-1.5 bg-white border border-gray-300 text-gray-600 rounded-lg text-xs font-semibold">
                  ביטול
                </button>
              </div>
            </div>
          )}
```

- [ ] **Step 5: אימות שערים ובנייה**

הרץ: `npx tsc --noEmit && npm run lint && npx vitest run && npm run build`
צפוי: הכל עובר

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/payments/page.tsx
git commit -m "feat(bounces): מקטע שקים שחזרו וחלונית סימון במסך התקבולים"
```

---

## Task 7: דורש טיפול בדשבורד

**Files:**
- Modify: `src/lib/domain/attention.ts`
- Modify: `src/lib/domain/attention.test.ts`
- Modify: `src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `CheckBounce`, `BOUNCE_REASON_LABELS` מ-Task 2
- Produces: `AttentionItem.kind` מקבל את הערך `"bounced"`; `buildAttentionItems` מקבל שדה קלט חדש `bounces: CheckBounce[]`

- [ ] **Step 1: כתיבת הבדיקות הנכשלות**

ב-`src/lib/domain/attention.test.ts`, הוסף בסוף:

```ts
describe("שקים שחזרו", () => {
  const BOUNCE = {
    id: "b1", payment_id: "p-bounced", lease_id: "l1",
    bounced_at: "2026-07-26", reason: "nsf" as const,
  };

  it("פריט שק שחזר מופיע ראשון גם כשיש חוב ותיק יותר", () => {
    const items = buildAttentionItems({
      payments: [
        { id: "p-old", status: "pending", due_date: "2026-01-01", amount: 5000, property: { title: "ותיק" } },
        { id: "p-bounced", status: "pending", due_date: "2026-07-26", amount: 5500, property: { title: "שלומציון" } },
      ],
      activeLeases: [],
      openTasks: [],
      bounces: [BOUNCE],
      today: "2026-07-27",
    });
    expect(items[0].kind).toBe("bounced");
    expect(items[0].label).toContain("שק חזר");
  });

  it("לא מופיע אחרי שהשוכר שילם שוב", () => {
    const items = buildAttentionItems({
      payments: [{ id: "p-bounced", status: "paid", due_date: "2026-07-26", amount: 5500, property: { title: "שלומציון" } }],
      activeLeases: [],
      openTasks: [],
      bounces: [BOUNCE],
      today: "2026-07-27",
    });
    expect(items.some((i) => i.kind === "bounced")).toBe(false);
  });
});
```

הוסף `bounces: []` לכל הקריאות הקיימות ל-`buildAttentionItems` בקובץ הבדיקות.

- [ ] **Step 2: הרצה לאימות כישלון**

הרץ: `npx vitest run src/lib/domain/attention.test.ts`
צפוי: FAIL - `kind` אינו `"bounced"`

- [ ] **Step 3: מימוש**

ב-`src/lib/domain/attention.ts`:

```ts
import { getDebtAmount } from "./partial-payment";
import { formatCurrency } from "./money";
import { hasOpenBounce, BOUNCE_REASON_LABELS, type CheckBounce } from "./check-bounce";
```

הרחב את הטיפוס:

```ts
export interface AttentionItem {
  id: string;
  kind: "bounced" | "overdue" | "task" | "lease_ending";
  label: string;
  sub: string;
  href: string;
}
```

הוסף `bounces: CheckBounce[]` לפרמטר של `buildAttentionItems`, ובתחילת גוף הפונקציה - **לפני** הלולאה הקיימת של התקבולים:

```ts
  const bouncedIds = new Set<string>();
  for (const p of payments) {
    if (!hasOpenBounce({ id: p.id, status: p.status }, bounces)) continue;
    bouncedIds.add(p.id);
    const chain = bounces.filter((b) => b.payment_id === p.id);
    const last = chain[chain.length - 1];
    items.push({
      id: `bounced-${p.id}`,
      kind: "bounced",
      label: `שק חזר - ${p.property?.title ?? "נכס"}`,
      sub: last
        ? `${formatCurrency(p.amount)} · ${BOUNCE_REASON_LABELS[last.reason]} · ${last.bounced_at}`
        : formatCurrency(p.amount),
      href: "/dashboard/payments",
    });
  }
```

ובלולאת התקבולים הקיימת הוסף בתחילתה `if (bouncedIds.has(p.id)) continue;` כדי שלא יופיע פעמיים.

מכיוון שהלולאה החדשה רצה ראשונה, פריטי השקים נכנסים ראשונים למערך. אם קיים מיון בסוף הפונקציה - ודא ש-`bounced` מקבל את העדיפות הגבוהה ביותר.

- [ ] **Step 4: הרצה לאימות הצלחה**

הרץ: `npx vitest run src/lib/domain/attention.test.ts`
צפוי: PASS

- [ ] **Step 5: חיבור בדשבורד**

ב-`src/app/dashboard/page.tsx`, הוסף שאילתת `checkBounces` בדפוס של השאילתות הקיימות, העבר `bounces` ל-`buildAttentionItems`, וודא שהצבע של פריט `bounced` הוא `text-rose-700` ולא הכתום של `overdue`.

- [ ] **Step 6: אימות שערים ובנייה**

הרץ: `npx tsc --noEmit && npm run lint && npx vitest run && npm run build`
צפוי: הכל עובר

- [ ] **Step 7: Commit**

```bash
git add src/lib/domain/attention.ts src/lib/domain/attention.test.ts src/app/dashboard/page.tsx
git commit -m "feat(bounces): שק שחזר ראשון בכרטיס דורש טיפול"
```

---

## Task 8: שרשרת ההחזרות בדף החוזה

**Files:**
- Modify: `src/app/dashboard/leases/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `bounceCountForLease`, `BOUNCE_REASON_LABELS`, `CheckBounce` מ-Task 2 · `queryKeys.checkBounces` מ-Task 3
- Produces: אין ייצוא חדש

**החלטה מהאפיון:** המקטע מופיע **רק בדף החוזה ולא בדף הנכס** - שוכר חדש לא צריך לרשת את הבעייתיות של קודמו.

- [ ] **Step 1: טעינת ההחזרות של החוזה**

```ts
  const bouncesQuery = useQuery({
    queryKey: queryKeys.checkBounces,
    queryFn: () => apiGet<CheckBounce[]>("/api/check-bounces"),
  });
  const leaseBounces = useMemo(
    () => (bouncesQuery.data ?? [])
      .filter((b) => b.lease_id === leaseId)
      .sort((a, b) => a.bounced_at.localeCompare(b.bounced_at)),
    [bouncesQuery.data, leaseId]
  );
```

- [ ] **Step 2: רינדור המקטע**

ליד מקטע "סיום מוקדם" הקיים (סביב שורה 690), הוסף:

```tsx
          {leaseBounces.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-rose-200 p-6">
              <h2 className="text-lg font-bold text-rose-700 flex items-center gap-2">
                <Icon name="debts" size={18} />
                שקים שחזרו בחוזה זה: {leaseBounces.length}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5 mb-4">
                שרשרת ההחזרות המלאה, ממוינת כרונולוגית
              </p>
              <div className="divide-y divide-gray-100">
                {leaseBounces.map((b) => (
                  <div key={b.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                    <span className="text-gray-500 num-ltr">
                      {new Date(b.bounced_at).toLocaleDateString("he-IL")}
                    </span>
                    <span className="text-gray-800 font-semibold">{BOUNCE_REASON_LABELS[b.reason]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
```

התאריך עטוף ב-`num-ltr` כי `toLocaleDateString("he-IL")` בברירת מחדל מחזיר מספרים בלבד (`26.7.2026`). **אסור** לעטוף בו מחרוזת עם מילים בעברית.

- [ ] **Step 3: אימות שערים ובנייה**

הרץ: `npx tsc --noEmit && npm run lint && npx vitest run && npm run build`
צפוי: הכל עובר

- [ ] **Step 4: Commit**

```bash
git add "src/app/dashboard/leases/[id]/edit/page.tsx"
git commit -m "feat(bounces): שרשרת ההחזרות בדף החוזה"
```

---

## Task 9: אימות מקצה לקצה

**Files:** אין שינויי קוד - אימות בלבד

- [ ] **Step 1: שערים סטטיים**

הרץ: `npx tsc --noEmit && npm run lint && npx vitest run && npm run build`
צפוי: הכל ירוק, ומספר הבדיקות גדל ב-18 לפחות (8 ב-check-bounce, 10 ב-check-reminders, 2 ב-attention)

- [ ] **Step 2: אימות ויזואלי לפי סקיל verify**

הפעל `npm run dev` והשתמש בכלי Playwright MCP. עבור כל דף - צילום מסך fullPage, קריאת הצילום, ואפס שגיאות קונסולה.

תרחיש מלא:

1. `/dashboard/tasks` - סמן תזכורת הפקדת שק כבוצעה.
2. `/dashboard/payments` - אמת שהתקבול "שולם" ושאין תזכורת כפולה.
3. `/dashboard/expenses` - אמת שנוצרה הוצאת מס 10% על אותו תקבול.
4. `/dashboard/payments` - לחץ "שק חזר", בחר תאריך וסיבה, אשר.
5. אמת: התקבול עבר למקטע "שקים שחזרו" · הסכום ב-rose · **הוצאת המס נעלמה** ממסך ההוצאות.
6. `/dashboard` - אמת שהפריט מופיע **ראשון** בדורש טיפול ב-rose.
7. `/dashboard/leases/<id>/edit` - אמת שמופיעה שרשרת עם החזרה אחת.
8. חזור על שלבים 4-5 להחזרה שנייה, ואמת ששרשרת בדף החוזה מציגה **שתי** שורות.
9. `/dashboard/payments` - לחץ "שולם מחדש" ואמת שהתקבול חוזר ל"שולם", שהמס נוצר מחדש, **ושהשרשרת בדף החוזה נשארה**.

- [ ] **Step 3: ניקיון**

עצור את שרת ה-dev (כולל אימות `netstat` שפורט 3000 השתחרר - תהליך הבן שורד TaskStop) ומחק את צילומי ה-Playwright מהריפו.

- [ ] **Step 4: עדכון מסמכי האמת**

עדכן את `SPEC.md` עם מודול השקים החוזרים, וסמן ב-`supabase/migrations/README.md` שהמיגרציה הורצה בפרודקשן.

- [ ] **Step 5: Commit**

```bash
git add SPEC.md supabase/migrations/README.md
git commit -m "docs: עדכון SPEC ומצב מיגרציה למודול שקים חוזרים"
```
