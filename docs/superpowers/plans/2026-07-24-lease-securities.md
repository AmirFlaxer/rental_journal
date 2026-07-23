# מודול בטחונות (Lease Securities) - תוכנית יישום

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** מעקב ידני אחרי בטחונות המוחזקים תחת חוזה (שק/שטר ביטחון, שקי חשבונות שירות, פיקדון כספי) - כמקטע מתקפל בעמוד הנכס.

**Architecture:** טבלה חדשה `lease_securities` (רשימה מאוחדת לכל סוגי הבטחונות), CRUD ב-`/api/lease-securities` בדפוס `property-utilities`, מקטע מתקפל בעמוד הנכס עם חלונית הוספה/עריכה. לוגיקת-סיכום טהורה ב-`domain` עם בדיקות. אין תזכורות, אין תנועת-כסף, אין נגיעה בדוחות.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (Postgres+RLS), TanStack Query, Zod, Vitest, @phosphor-icons/react.

## Global Constraints

- כל התקשורת/UI בעברית בלבד. מקף רגיל ( - ), בלי חצים.
- snake_case בכל השכבות (DB, API JSON, דפי לקוח) - אין המרת מפתחות (ראו `src/types/database.ts`).
- id של טבלאות הוא `text` עם `DEFAULT gen_random_uuid()::text` (בדפוס `property_utilities`).
- כל טבלה עם RLS: policy יחיד `FOR ALL USING (user_id = auth.uid())` + GRANT ל-authenticated/service_role.
- מיגרציות: קובץ SQL ממוספר, **מורץ ידנית ב-Supabase Dashboard** (הצעד האחרון, פעולת אמיר).
- צבעים סמנטיים נשמרים: ירוק=הכנסה, אדום=הוצאה, כתום=מס. **בטחונות ניטרליים** - לא נכנסים לסכמת ההכנסה/הוצאה.
- אחרי שינוי טיפוסים: `npx tsc --noEmit` חייב לעבור. לפני commit של שינוי-UI: `npm run build` + סקיל `verify` (Playwright).
- אייקונים דרך `Icon`/`IconName` בלבד (טעות-שם = שגיאת tsc).
- עמוד `dashboard/properties/[id]/page.tsx` כבר `"use client"` - אין עמוד חדש, אין גבול-client חדש.

**ספח:** האפיון המלא ב-`docs/superpowers/specs/2026-07-24-lease-securities-design.md`.

---

### Task 1: שכבת נתונים - מיגרציה, טיפוסים, ולידציה

**Files:**
- Create: `supabase/migrations/20260724_lease_securities.sql`
- Modify: `src/types/supabase.ts` (הוספת בלוק `lease_securities` אחרי `property_utilities`, נגמר בשורה ~597)
- Modify: `src/types/database.ts` (הוספת enums + `LeaseSecurity` אחרי `PropertyUtility`, שורה ~87)
- Modify: `src/lib/validations.ts` (הוספת `leaseSecuritySchema` אחרי `propertyUtilitySchema`, שורה ~139)

**Interfaces:**
- Produces: טבלת `lease_securities`; טיפוסים `SecurityKind`, `SecurityStatus`, `SecurityUtilityType`, `LeaseSecurity`; סכמת `leaseSecuritySchema` + טיפוס `LeaseSecurityInput`.

- [ ] **Step 1: כתיבת קובץ המיגרציה**

Create `supabase/migrations/20260724_lease_securities.sql`:

```sql
-- טבלת lease_securities - בטחונות המוחזקים תחת חוזה
-- (שק/שטר ביטחון, שקי חשבונות שירות, פיקדון כספי). מעקב סטטוס ידני בלבד -
-- אין תזכורות, אין תנועת-כסף, אין נגיעה בדוחות.
-- ראו docs/superpowers/specs/2026-07-24-lease-securities-design.md

CREATE TABLE IF NOT EXISTS lease_securities (
  id            text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lease_id      text        NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  property_id   text        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  kind          text        NOT NULL
                  CHECK (kind IN ('cash_deposit','security_check','promissory_note','utility_check','other')),
  utility_type  text        CHECK (utility_type IN ('electricity','water','gas','municipal_tax')),
  amount        numeric,
  bank          text,
  branch        text,
  account       text,
  check_number  text,
  status        text        NOT NULL DEFAULT 'held'
                  CHECK (status IN ('held','returned','cashed')),
  received_date date,
  resolved_date date,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lease_securities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lease_securities_owner" ON lease_securities FOR ALL USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON lease_securities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON lease_securities TO service_role;
```

- [ ] **Step 2: הוספת בלוק הטבלה ל-`src/types/supabase.ts`**

הכנס מיד אחרי הסגירה של בלוק `property_utilities` (אחרי השורה `}` בשורה ~597, לפני `push_subscriptions:`). זה תואם למה ש-`npm run gen:types` ייצר אחרי הרצת המיגרציה - הוספה ידנית כי `gen:types` דורש token+מיגרציה-מורצת (מתועד ב-docs/gen-types.md):

```typescript
      lease_securities: {
        Row: {
          account: string | null
          amount: number | null
          bank: string | null
          branch: string | null
          check_number: string | null
          created_at: string
          id: string
          kind: string
          lease_id: string
          notes: string | null
          property_id: string
          received_date: string | null
          resolved_date: string | null
          status: string
          updated_at: string
          user_id: string
          utility_type: string | null
        }
        Insert: {
          account?: string | null
          amount?: number | null
          bank?: string | null
          branch?: string | null
          check_number?: string | null
          created_at?: string
          id?: string
          kind: string
          lease_id: string
          notes?: string | null
          property_id: string
          received_date?: string | null
          resolved_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
          utility_type?: string | null
        }
        Update: {
          account?: string | null
          amount?: number | null
          bank?: string | null
          branch?: string | null
          check_number?: string | null
          created_at?: string
          id?: string
          kind?: string
          lease_id?: string
          notes?: string | null
          property_id?: string
          received_date?: string | null
          resolved_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          utility_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lease_securities_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_securities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
```

- [ ] **Step 3: הוספת enums + טיפוס הישות ל-`src/types/database.ts`**

הוסף אחרי בלוק `PropertyUtility` (שורה ~87):

```typescript
// ---- בטחונות (lease_securities) ----
export type SecurityKind =
  | "cash_deposit"
  | "security_check"
  | "promissory_note"
  | "utility_check"
  | "other";
export type SecurityStatus = "held" | "returned" | "cashed";
export type SecurityUtilityType = "electricity" | "water" | "gas" | "municipal_tax";

export type LeaseSecurity = Omit<
  TableRow<"lease_securities">,
  "kind" | "status" | "utility_type"
> & {
  kind: SecurityKind;
  status: SecurityStatus;
  utility_type: SecurityUtilityType | null;
};
```

- [ ] **Step 4: הוספת סכמת ולידציה ל-`src/lib/validations.ts`**

הוסף אחרי `propertyUtilitySchema` (שורה ~139):

```typescript
// Lease Security Validations - בטחונות המוחזקים תחת חוזה
export const leaseSecuritySchema = z.object({
  property_id: z.string().min(1, "Property is required"),
  lease_id: z.string().min(1, "Lease is required"),
  kind: z.enum(["cash_deposit", "security_check", "promissory_note", "utility_check", "other"]),
  utility_type: z.enum(["electricity", "water", "gas", "municipal_tax"]).nullish(),
  amount: z.number().min(0).nullish(),
  bank: z.string().nullish(),
  branch: z.string().nullish(),
  account: z.string().nullish(),
  check_number: z.string().nullish(),
  status: z.enum(["held", "returned", "cashed"]).default("held"),
  received_date: z.string().nullish(),
  resolved_date: z.string().nullish(),
  notes: z.string().nullish(),
});
```

הוסף את שורת הטיפוס לצד שאר ה-exports בסוף הקובץ (אחרי `PropertyUtilityInput`, שורה ~157):

```typescript
export type LeaseSecurityInput = z.infer<typeof leaseSecuritySchema>;
```

- [ ] **Step 5: אימות קומפילציה**

Run: `npx tsc --noEmit`
Expected: 0 שגיאות.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260724_lease_securities.sql src/types/supabase.ts src/types/database.ts src/lib/validations.ts
git commit -m "feat(securities): שכבת נתונים - מיגרציה lease_securities, טיפוסים וסכמת ולידציה"
```

---

### Task 2: לוגיקת-סיכום טהורה + בדיקות (TDD)

**Files:**
- Create: `src/lib/domain/securities-summary.ts`
- Test: `src/lib/domain/securities-summary.test.ts`

**Interfaces:**
- Consumes: `LeaseSecurity` מ-`@/types/database` (Task 1).
- Produces: `heldCashDepositTotal(items): number`, `heldPaperCount(items): number`.

- [ ] **Step 1: כתיבת הבדיקה הכושלת**

Create `src/lib/domain/securities-summary.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { heldCashDepositTotal, heldPaperCount } from "@/lib/domain/securities-summary";
import type { LeaseSecurity } from "@/types/database";

function makeSec(overrides: Partial<LeaseSecurity> = {}): LeaseSecurity {
  return {
    id: "s1",
    user_id: "u1",
    lease_id: "l1",
    property_id: "p1",
    kind: "security_check",
    utility_type: null,
    amount: null,
    bank: null,
    branch: null,
    account: null,
    check_number: null,
    status: "held",
    received_date: null,
    resolved_date: null,
    notes: null,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

describe("heldCashDepositTotal", () => {
  it("מסכם רק פיקדונות כספיים בסטטוס מוחזק", () => {
    const items = [
      makeSec({ kind: "cash_deposit", status: "held", amount: 5000 }),
      makeSec({ kind: "cash_deposit", status: "held", amount: 3000 }),
      makeSec({ kind: "cash_deposit", status: "returned", amount: 9000 }), // מוחזר - לא נספר
      makeSec({ kind: "security_check", status: "held", amount: 10000 }),   // שק - לא נספר
    ];
    expect(heldCashDepositTotal(items)).toBe(8000);
  });

  it("מתעלם מ-amount null", () => {
    const items = [
      makeSec({ kind: "cash_deposit", status: "held", amount: null }),
      makeSec({ kind: "cash_deposit", status: "held", amount: 2000 }),
    ];
    expect(heldCashDepositTotal(items)).toBe(2000);
  });

  it("רשימה ריקה מחזירה 0", () => {
    expect(heldCashDepositTotal([])).toBe(0);
  });
});

describe("heldPaperCount", () => {
  it("סופר בטחונות-נייר מוחזקים (כל מה שאינו פיקדון כספי)", () => {
    const items = [
      makeSec({ kind: "security_check", status: "held" }),
      makeSec({ kind: "promissory_note", status: "held" }),
      makeSec({ kind: "utility_check", status: "held" }),
      makeSec({ kind: "utility_check", status: "returned" }), // מוחזר - לא נספר
      makeSec({ kind: "cash_deposit", status: "held" }),      // פיקדון כספי - לא נייר
    ];
    expect(heldPaperCount(items)).toBe(3);
  });

  it("רשימה ריקה מחזירה 0", () => {
    expect(heldPaperCount([])).toBe(0);
  });
});
```

- [ ] **Step 2: הרצה לאימות כישלון**

Run: `npx vitest run src/lib/domain/securities-summary.test.ts`
Expected: FAIL - "Failed to resolve import ... securities-summary".

- [ ] **Step 3: מימוש מינימלי**

Create `src/lib/domain/securities-summary.ts`:

```typescript
// לוגיקת-סיכום טהורה לבטחונות - "כמה אני מחזיק". בלי תופעות-לוואי.
import type { LeaseSecurity } from "@/types/database";

// סכום הפיקדונות הכספיים שעדיין מוחזקים (התחייבות להחזרה). לא הכנסה.
export function heldCashDepositTotal(
  items: Pick<LeaseSecurity, "kind" | "status" | "amount">[]
): number {
  return items
    .filter((s) => s.kind === "cash_deposit" && s.status === "held")
    .reduce((sum, s) => sum + (s.amount ?? 0), 0);
}

// ספירת בטחונות-הנייר המוחזקים (כל מה שאינו פיקדון כספי) - שקים ושטרות.
export function heldPaperCount(
  items: Pick<LeaseSecurity, "kind" | "status">[]
): number {
  return items.filter((s) => s.kind !== "cash_deposit" && s.status === "held").length;
}
```

- [ ] **Step 4: הרצה לאימות הצלחה**

Run: `npx vitest run src/lib/domain/securities-summary.test.ts`
Expected: PASS (5 בדיקות).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain/securities-summary.ts src/lib/domain/securities-summary.test.ts
git commit -m "feat(securities): לוגיקת-סיכום טהורה (פיקדונות/שקים מוחזקים) + בדיקות"
```

---

### Task 3: נתיבי API

**Files:**
- Create: `src/app/api/lease-securities/route.ts`
- Create: `src/app/api/lease-securities/[id]/route.ts`

**Interfaces:**
- Consumes: `leaseSecuritySchema` (Task 1).
- Produces: `GET/POST /api/lease-securities`, `PUT/DELETE /api/lease-securities/[id]`.

- [ ] **Step 1: כתיבת `route.ts` (GET+POST)**

Create `src/app/api/lease-securities/route.ts` (בדפוס `property-utilities/route.ts`, עם אימות בעלות על הנכס **וגם** על החוזה):

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { leaseSecuritySchema } from "@/lib/validations";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lease_securities")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const data = leaseSecuritySchema.parse(body);

    const supabase = await createClient();

    const { data: property } = await supabase
      .from("properties")
      .select("id")
      .eq("id", data.property_id)
      .eq("user_id", session.user.id)
      .single();
    if (!property) return NextResponse.json({ error: "Property not found or unauthorized" }, { status: 404 });

    const { data: lease } = await supabase
      .from("leases")
      .select("id")
      .eq("id", data.lease_id)
      .eq("user_id", session.user.id)
      .single();
    if (!lease) return NextResponse.json({ error: "Lease not found or unauthorized" }, { status: 404 });

    const { data: row, error } = await supabase
      .from("lease_securities")
      .insert({ ...data, user_id: session.user.id })
      .select()
      .single();

    if (error) return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Validation failed", details: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: "Failed to create lease security" }, { status: 500 });
  }
}
```

- [ ] **Step 2: כתיבת `[id]/route.ts` (PUT+DELETE)**

Create `src/app/api/lease-securities/[id]/route.ts` (בדפוס `property-utilities/[id]/route.ts`):

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import { leaseSecuritySchema } from "@/lib/validations";
import { z } from "zod";

interface RouteParams { params: Promise<{ id: string }> }

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = await createClient();
    const body = await request.json();
    // ולידציה מונעת mass-assignment - zod מסנן שדות לא מוכרים (user_id וכו') אוטומטית
    const data = leaseSecuritySchema.partial().parse(body);
    // property_id/lease_id לא ניתנים לשינוי בעדכון - בטחון שייך לחוזה שבו נוצר.
    // השמטה מונעת העברה לחוזה אחר בלי אימות בעלות (בניגוד ל-POST שמאמת).
    delete data.property_id;
    delete data.lease_id;

    const { data: row, error } = await supabase
      .from("lease_securities")
      .update(data)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: "Validation failed", details: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: "Failed to update lease security" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = await createClient();
    const { error } = await supabase
      .from("lease_securities")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete lease security" }, { status: 500 });
  }
}
```

- [ ] **Step 3: אימות קומפילציה + לינט**

Run: `npx tsc --noEmit && npm run lint`
Expected: 0 שגיאות.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/lease-securities
git commit -m "feat(securities): נתיבי API ל-CRUD בטחונות (GET/POST/PUT/DELETE)"
```

---

### Task 4: עמוד הנכס - מפתחות, אייקונים, מקטע-תצוגה מתקפל

**Files:**
- Modify: `src/lib/api-client.ts:20-30` (הוספת מפתח query)
- Modify: `src/lib/icons.ts:14-97` (הוספת 3 אייקונים)
- Modify: `src/app/dashboard/properties/[id]/page.tsx` (imports, query, מפות-תוויות, מקטע-תצוגה)

**Interfaces:**
- Consumes: `LeaseSecurity` (Task 1), `heldCashDepositTotal`/`heldPaperCount` (Task 2), `GET /api/lease-securities` (Task 3).
- Produces: קבועים `SECURITY_KIND_HE`, `SECURITY_STATUS_HE`, `SECURITY_UTILITY_HE`, `SECURITY_KIND_ICON`, `SECURITY_UTILITY_ICON`, פונקציה `securityIcon(s)`, ומצב `securitiesOpen` - ל-Task 5.

- [ ] **Step 1: הוספת מפתח query ב-`src/lib/api-client.ts`**

הוסף שורה אחרונה באובייקט `queryKeys` (אחרי `propertyUtilities`, שורה 29):

```typescript
  leaseSecurities: ["lease-securities"] as const,
```

- [ ] **Step 2: הוספת אייקונים ב-`src/lib/icons.ts`**

הקומפוננטות `ShieldCheckIcon`, `NoteIcon`, `WalletIcon` כבר מיובאות (שורות 5-7). הוסף לאובייקט `ICONS` (למשל אחרי בלוק "פעולות כלליות", לפני `// כיווץ/הרחבה`):

```typescript
  // בטחונות
  security: ShieldCheckIcon,
  promissoryNote: NoteIcon,
  cashDeposit: WalletIcon,
```

- [ ] **Step 3: הוספת imports בעמוד הנכס**

בקובץ `src/app/dashboard/properties/[id]/page.tsx`, הוסף לרשימת ה-imports מ-`@/types/database` את `LeaseSecurity`, `SecurityKind`, `SecurityStatus`, `SecurityUtilityType`, ומ-`@/lib/api-client` כבר מיובאים `apiGet, queryKeys`. הוסף import חדש:

```typescript
import { heldCashDepositTotal, heldPaperCount } from "@/lib/domain/securities-summary";
```

(ודא ש-`Icon` ו-`IconName` מיובאים - `IconName` מ-`@/lib/icons`; אם `IconName` לא מיובא עדיין, הוסף אותו.)

- [ ] **Step 4: הוספת מפות-תוויות/אייקונים ברמת-המודול**

הוסף ליד המפות הקיימות של utilities (ליד `UTILITY_TYPE_ICON`, שורה ~41), ברמת-המודול (מחוץ לקומפוננטה):

```typescript
const SECURITY_KIND_HE: Record<SecurityKind, string> = {
  cash_deposit: "פיקדון כספי",
  security_check: "שק ביטחון",
  promissory_note: "שטר ביטחון",
  utility_check: "שק ביטחון - חשבון שירות",
  other: "אחר",
};
const SECURITY_STATUS_HE: Record<SecurityStatus, string> = {
  held: "מוחזק",
  returned: "הוחזר",
  cashed: "נפדה",
};
const SECURITY_UTILITY_HE: Record<SecurityUtilityType, string> = {
  electricity: "חשמל",
  water: "מים",
  gas: "גז",
  municipal_tax: "ארנונה",
};
const SECURITY_KIND_ICON: Record<SecurityKind, IconName> = {
  cash_deposit: "cashDeposit",
  security_check: "security",
  promissory_note: "promissoryNote",
  utility_check: "electricity",
  other: "other",
};
const SECURITY_UTILITY_ICON: Record<SecurityUtilityType, IconName> = {
  electricity: "electricity",
  water: "water",
  gas: "gas",
  municipal_tax: "municipalTax",
};
function securityIcon(s: Pick<LeaseSecurity, "kind" | "utility_type">): IconName {
  if (s.kind === "utility_check" && s.utility_type) return SECURITY_UTILITY_ICON[s.utility_type];
  return SECURITY_KIND_ICON[s.kind];
}
// תג-סטטוס בגוונים ניטרליים (לא ירוק-הכנסה/אדום-הוצאה)
const SECURITY_STATUS_CLASS: Record<SecurityStatus, string> = {
  held: "bg-gray-100 text-gray-600",
  returned: "bg-green-50 text-green-700",
  cashed: "bg-amber-50 text-amber-700",
};
```

- [ ] **Step 5: הוספת ה-query ומצב הכיווץ בתוך הקומפוננטה**

ליד `utilitiesQuery` (שורה ~136), הוסף:

```typescript
  const securitiesQuery = useQuery({
    queryKey: queryKeys.leaseSecurities,
    queryFn: () => apiGet<LeaseSecurity[]>("/api/lease-securities"),
  });
  const [securitiesOpen, setSecuritiesOpen] = useState(false);
```

- [ ] **Step 6: חישוב החוזה הנוכחי והבטחונות (אחרי חישוב `activeLeases`)**

הוסף אחרי חישוב `propertyUtilities` (שורה ~243):

```typescript
  // החוזה ה"נוכחי" של הנכס: הפעיל (אם יש), אחרת האחרון לפי start_date
  const currentLease =
    activeLeases[0] ??
    [...(property.leases ?? [])].sort((a, b) =>
      (b.start_date ?? "").localeCompare(a.start_date ?? "")
    )[0] ??
    null;
  const propertySecurities = (securitiesQuery.data ?? []).filter((s) => s.property_id === property.id);
  const currentSecurities = currentLease
    ? propertySecurities.filter((s) => s.lease_id === currentLease.id)
    : [];
  // בטחונות מוחזקים מחוזים קודמים - שלא יעלמו כשמתחיל חוזה חדש
  const priorHeldSecurities = propertySecurities.filter(
    (s) => s.status === "held" && (!currentLease || s.lease_id !== currentLease.id)
  );
  const cashHeld = heldCashDepositTotal(currentSecurities);
  const paperHeld = heldPaperCount(currentSecurities);
  const currentTenantName = currentLease?.tenant
    ? `${currentLease.tenant.first_name} ${currentLease.tenant.last_name}`
    : "";
```

- [ ] **Step 7: הוספת מקטע הבטחונות המתקפל ב-JSX**

הוסף מיד אחרי מקטע "חשבונות שירות" (אחרי `</div>` הסוגר של הבלוק `id="utilities"`, שורה ~944). הכפתור הראשי מציג רק סיכום; הפירוט נפתח בלחיצה. **פעולות ההוספה/עריכה (Task 5) יוזרקו לתוך המקטע הזה:**

```tsx
        {/* בטחונות - מקטע מתקפל */}
        <div id="securities" className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setSecuritiesOpen((v) => !v)}
            aria-expanded={securitiesOpen}
            className="w-full flex items-center justify-between gap-3 px-6 py-4 text-right hover:bg-gray-50"
          >
            <span className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 grid place-items-center flex-shrink-0">
                <Icon name="security" size={18} />
              </span>
              <span className="min-w-0">
                <span className="block font-bold text-gray-900">
                  בטחונות{currentTenantName ? ` · חוזה עם ${currentTenantName}` : ""}
                </span>
                <span className="block text-sm text-gray-500">
                  {securitiesQuery.isError
                    ? "יש להריץ מיגרציה כדי להפעיל את התכונה"
                    : cashHeld === 0 && paperHeld === 0
                    ? "אין בטחונות מוחזקים"
                    : <>
                        <span className="num-ltr">₪{cashHeld.toLocaleString()}</span> פיקדון כספי · {paperHeld} שקים/שטרות מוחזקים
                      </>}
                </span>
              </span>
            </span>
            <span className="flex items-center gap-1 text-indigo-700 font-semibold text-sm flex-shrink-0">
              {securitiesOpen ? "הסתר" : "הצג פקדונות"}
              <Icon name={securitiesOpen ? "caretUp" : "caretDown"} size={16} />
            </span>
          </button>

          {securitiesOpen && !securitiesQuery.isError && (
            <div className="border-t border-gray-100">
              <div className="flex items-center justify-between gap-2 px-6 py-3 flex-wrap">
                <div className="flex gap-2 flex-wrap text-sm">
                  <span className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
                    פיקדונות כספיים מוחזקים <b className="num-ltr">₪{cashHeld.toLocaleString()}</b>
                  </span>
                  <span className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
                    שקים/שטרות מוחזקים <b>{paperHeld}</b>
                  </span>
                </div>
                {/* כפתור "הוסף" (Task 5) */}
                {currentLease && (
                  <button
                    onClick={() => openNewSecurityForm(currentLease.id)}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-sm"
                  >
                    + הוסף
                  </button>
                )}
              </div>

              {currentSecurities.length === 0 ? (
                <p className="px-6 py-6 text-gray-400 text-center text-sm">אין בטחונות לחוזה הנוכחי</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {currentSecurities.map((s) => {
                    const isConfirmingDelete = confirmDeleteSecurityId === s.id;
                    const details = [
                      s.bank, s.branch ? `סניף ${s.branch}` : null,
                      s.check_number ? `שק ${s.check_number}` : null,
                    ].filter(Boolean).join(" · ");
                    return (
                      <div key={s.id} className="flex items-center justify-between gap-3 px-6 py-3 flex-wrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon name={securityIcon(s)} size={18} />
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900">
                              {SECURITY_KIND_HE[s.kind]}
                              {s.kind === "utility_check" && s.utility_type ? ` - ${SECURITY_UTILITY_HE[s.utility_type]}` : ""}
                            </div>
                            {details && <div className="text-xs text-gray-500">{details}</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                          {s.amount != null && (
                            <span className="font-bold text-gray-900 num-ltr">₪{Number(s.amount).toLocaleString()}</span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${SECURITY_STATUS_CLASS[s.status]}`}>
                            {SECURITY_STATUS_HE[s.status]}
                          </span>
                          <button
                            onClick={() => openEditSecurityForm(s)}
                            className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-200"
                          >
                            <Icon name="edit" size={14} className="inline" /> עריכה
                          </button>
                          <button
                            onClick={() => (isConfirmingDelete ? handleDeleteSecurity(s.id) : requestDeleteSecurity(s.id))}
                            className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                              isConfirmingDelete ? "bg-red-600 text-white hover:bg-red-700" : "bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700"
                            }`}
                          >
                            {isConfirmingDelete ? "בטוח?" : <><Icon name="delete" size={14} className="inline" /> מחיקה</>}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {priorHeldSecurities.length > 0 && (
                <div className="mx-6 my-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <b>מבטחונות קודמים שטרם הוחזרו:</b>{" "}
                  {priorHeldSecurities.map((s) => SECURITY_KIND_HE[s.kind]).join(", ")}
                </div>
              )}
            </div>
          )}
        </div>
```

> הערה: הקומפוננטה מפנה ל-`openNewSecurityForm`, `openEditSecurityForm`, `confirmDeleteSecurityId`, `requestDeleteSecurity`, `handleDeleteSecurity` - כולם מוגדרים ב-Task 5. לכן Step הבא (הקומפילציה) יעבור רק אחרי Task 5. לפני קומיט של Task 4, הגדר stubs זמניים (יוחלפו ב-Task 5):

```typescript
  const [confirmDeleteSecurityId, setConfirmDeleteSecurityId] = useState<string | null>(null);
  const openNewSecurityForm = (_leaseId: string) => {};
  const openEditSecurityForm = (_s: LeaseSecurity) => {};
  const requestDeleteSecurity = (_id: string) => {};
  const handleDeleteSecurity = (_id: string) => {};
```

- [ ] **Step 8: אימות build**

Run: `npm run build`
Expected: הצלחה (0 שגיאות). ה-stubs מספקים קומפילציה; ההתנהגות המלאה ב-Task 5.

- [ ] **Step 9: Commit**

```bash
git add src/lib/api-client.ts src/lib/icons.ts "src/app/dashboard/properties/[id]/page.tsx"
git commit -m "feat(securities): מקטע-תצוגה מתקפל בעמוד הנכס (סיכום + רשימה, קריאה בלבד)"
```

---

### Task 5: עמוד הנכס - חלונית הוספה/עריכה + מוטציות

**Files:**
- Modify: `src/app/dashboard/properties/[id]/page.tsx` (החלפת ה-stubs במימוש מלא + חלונית מודאלית)

**Interfaces:**
- Consumes: `leaseSecuritySchema` (Task 1), `queryKeys.leaseSecurities` (Task 4), המפות והמצב מ-Task 4.
- Produces: חלונית פעילה להוספה/עריכה/שינוי-סטטוס/מחיקה, עם `invalidateQueries`.

- [ ] **Step 1: הגדרת טיפוס מצב-הטופס והחלפת ה-stubs**

החלף את בלוק ה-stubs מ-Task 4 Step 7 במימוש הבא. הוסף גם טיפוס `SecurityFormState` ברמת-המודול (ליד `UtilityFormState`, שורה ~61):

```typescript
interface SecurityFormState {
  id: string | null;
  lease_id: string;
  kind: SecurityKind;
  utility_type: SecurityUtilityType;
  amount: string;
  bank: string;
  branch: string;
  check_number: string;
  status: SecurityStatus;
  received_date: string;
  resolved_date: string;
  notes: string;
}
```

בתוך הקומפוננטה (במקום ה-stubs):

```typescript
  const [securityForm, setSecurityForm] = useState<SecurityFormState | null>(null);
  const [securityFormError, setSecurityFormError] = useState("");
  const [confirmDeleteSecurityId, setConfirmDeleteSecurityId] = useState<string | null>(null);
  const confirmDeleteSecurityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openNewSecurityForm = (leaseId: string) => {
    setSecurityFormError("");
    setSecurityForm({
      id: null, lease_id: leaseId, kind: "cash_deposit", utility_type: "electricity",
      amount: "", bank: "", branch: "", check_number: "", status: "held",
      received_date: "", resolved_date: "", notes: "",
    });
  };
  const openEditSecurityForm = (s: LeaseSecurity) => {
    setSecurityFormError("");
    setSecurityForm({
      id: s.id, lease_id: s.lease_id, kind: s.kind,
      utility_type: s.utility_type ?? "electricity",
      amount: s.amount != null ? String(s.amount) : "",
      bank: s.bank ?? "", branch: s.branch ?? "", check_number: s.check_number ?? "",
      status: s.status, received_date: s.received_date ?? "", resolved_date: s.resolved_date ?? "",
      notes: s.notes ?? "",
    });
  };

  const handleSaveSecurity = async () => {
    if (!securityForm) return;
    setSecurityFormError("");
    const isCheck = securityForm.kind === "security_check" || securityForm.kind === "utility_check";
    try {
      const payload = {
        property_id: property.id,
        lease_id: securityForm.lease_id,
        kind: securityForm.kind,
        utility_type: securityForm.kind === "utility_check" ? securityForm.utility_type : null,
        amount: securityForm.amount.trim() ? Number(securityForm.amount) : null,
        bank: isCheck ? (securityForm.bank.trim() || null) : null,
        branch: isCheck ? (securityForm.branch.trim() || null) : null,
        check_number: isCheck ? (securityForm.check_number.trim() || null) : null,
        status: securityForm.status,
        received_date: securityForm.received_date || null,
        resolved_date: securityForm.status !== "held" ? (securityForm.resolved_date || null) : null,
        notes: securityForm.notes.trim() || null,
      };
      const res = await fetch(
        securityForm.id ? `/api/lease-securities/${securityForm.id}` : "/api/lease-securities",
        { method: securityForm.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
      );
      if (!res.ok) throw new Error("שגיאה בשמירת הבטחון");
      queryClient.invalidateQueries({ queryKey: queryKeys.leaseSecurities });
      setSecurityForm(null);
    } catch (err) {
      setSecurityFormError(err instanceof Error ? err.message : "שגיאה בשמירת הבטחון");
    }
  };

  const requestDeleteSecurity = (id: string) => {
    setConfirmDeleteSecurityId(id);
    if (confirmDeleteSecurityTimer.current) clearTimeout(confirmDeleteSecurityTimer.current);
    confirmDeleteSecurityTimer.current = setTimeout(() => setConfirmDeleteSecurityId(null), 3000);
  };
  const handleDeleteSecurity = async (id: string) => {
    const res = await fetch(`/api/lease-securities/${id}`, { method: "DELETE" });
    if (res.ok) queryClient.invalidateQueries({ queryKey: queryKeys.leaseSecurities });
    setConfirmDeleteSecurityId(null);
  };
```

ודא ש-`confirmDeleteSecurityTimer` מנוקה ב-`useEffect` הקיים לניקוי טיימרים (ליד `confirmDeleteUtilityTimer`, שורה ~151):

```typescript
    if (confirmDeleteSecurityTimer.current) clearTimeout(confirmDeleteSecurityTimer.current);
```

- [ ] **Step 2: הוספת החלונית המודאלית ב-JSX**

הוסף ליד החלונית של utilities (אחרי הבלוק `{utilityForm && ( ... )}`, שורה ~451-545). מבנה זהה, שדות מותנים לפי `kind`:

```tsx
      {securityForm && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center p-4 z-50" onClick={(e) => { if (e.target === e.currentTarget) setSecurityForm(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[92vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{securityForm.id ? "עריכת בטחון" : "הוספת בטחון"}</h3>
              <button onClick={() => setSecurityForm(null)} className="text-gray-400 hover:text-gray-700"><Icon name="cancel" size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">סוג בטחון</label>
                <select
                  value={securityForm.kind}
                  onChange={(e) => setSecurityForm({ ...securityForm, kind: e.target.value as SecurityKind })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="cash_deposit">פיקדון כספי</option>
                  <option value="security_check">שק ביטחון</option>
                  <option value="promissory_note">שטר ביטחון</option>
                  <option value="utility_check">שק ביטחון לחשבון שירות</option>
                  <option value="other">אחר</option>
                </select>
              </div>

              {securityForm.kind === "utility_check" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">חשבון השירות</label>
                  <select
                    value={securityForm.utility_type}
                    onChange={(e) => setSecurityForm({ ...securityForm, utility_type: e.target.value as SecurityUtilityType })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="electricity">חשמל</option>
                    <option value="water">מים</option>
                    <option value="gas">גז</option>
                    <option value="municipal_tax">ארנונה</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">סכום (₪)</label>
                  <input
                    type="text" inputMode="numeric" value={securityForm.amount}
                    onChange={(e) => setSecurityForm({ ...securityForm, amount: e.target.value })}
                    placeholder={securityForm.kind === "cash_deposit" ? "סכום הפיקדון" : "לא חובה - שק פתוח"}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">תאריך קבלה</label>
                  <input
                    type="date" value={securityForm.received_date}
                    onChange={(e) => setSecurityForm({ ...securityForm, received_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              {(securityForm.kind === "security_check" || securityForm.kind === "utility_check") && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">בנק</label>
                    <input type="text" value={securityForm.bank} onChange={(e) => setSecurityForm({ ...securityForm, bank: e.target.value })} className="w-full border border-gray-300 rounded-lg px-2 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">סניף</label>
                    <input type="text" value={securityForm.branch} onChange={(e) => setSecurityForm({ ...securityForm, branch: e.target.value })} className="w-full border border-gray-300 rounded-lg px-2 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">מס' שק</label>
                    <input type="text" value={securityForm.check_number} onChange={(e) => setSecurityForm({ ...securityForm, check_number: e.target.value })} className="w-full border border-gray-300 rounded-lg px-2 py-2" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">סטטוס</label>
                <div className="flex gap-2">
                  {(["held", "returned", "cashed"] as SecurityStatus[]).map((st) => (
                    <button
                      key={st} type="button"
                      onClick={() => setSecurityForm({ ...securityForm, status: st })}
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm font-semibold ${
                        securityForm.status === st ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700 border-gray-300"
                      }`}
                    >
                      {SECURITY_STATUS_HE[st]}
                    </button>
                  ))}
                </div>
              </div>

              {securityForm.status !== "held" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">תאריך פעולה (החזרה/פדיון)</label>
                  <input
                    type="date" value={securityForm.resolved_date}
                    onChange={(e) => setSecurityForm({ ...securityForm, resolved_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">הערות</label>
                <textarea
                  rows={2} value={securityForm.notes}
                  onChange={(e) => setSecurityForm({ ...securityForm, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              {securityFormError && <p className="text-red-600 text-sm">{securityFormError}</p>}

              <div className="flex gap-2 pt-1">
                <button onClick={handleSaveSecurity} className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold">שמור</button>
                <button type="button" onClick={() => setSecurityForm(null)} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold">ביטול</button>
              </div>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 3: אימות build**

Run: `npm run build`
Expected: הצלחה (0 שגיאות).

- [ ] **Step 4: Commit**

```bash
git add "src/app/dashboard/properties/[id]/page.tsx"
git commit -m "feat(securities): חלונית הוספה/עריכה/שינוי-סטטוס + מוטציות בעמוד הנכס"
```

---

### Task 6: אימות מקצה-לקצה + הרצת מיגרציה

**Files:** אין שינויי קוד - אימות בלבד.

- [ ] **Step 1: חבילת השערים הסטטיים**

Run: `npx tsc --noEmit && npm run lint && npx vitest run && npm run build`
Expected: הכל ירוק (כולל בדיקות Task 2).

- [ ] **Step 2: הרצת המיגרציה בפרודקשן (פעולת אמיר)**

הוראות מדויקות לאמיר:
1. היכנס ל-Supabase Dashboard של הפרויקט, לשונית **SQL Editor**.
2. הדבק את כל התוכן של `supabase/migrations/20260724_lease_securities.sql`.
3. לחץ **Run**. תוצאה צפויה: "Success. No rows returned".
4. עדכן `supabase/migrations/README.md` - סמן את המיגרציה כ"הורצה בפרודקשן 2026-07-24".

- [ ] **Step 3: אימות ויזואלי (סקיל verify / Playwright)**

הפעל את סקיל `verify`. בדוק בעמוד נכס עם חוזה פעיל:
1. המקטע "בטחונות · חוזה עם [שם]" מופיע **מכווץ**, עם שורת-סיכום.
2. לחיצה על "הצג פקדונות" פותחת את הפירוט; "הסתר" סוגר.
3. "הוסף" פותח חלונית; בחירת "פיקדון כספי" - בלי שדה חשבון-שירות/פרטי-שק; בחירת "שק לחשבון שירות" - עם שניהם.
4. שמירת פיקדון כספי ₪5,000 מוחזק: שורת הסיכום מציגה "₪5,000 פיקדון כספי".
5. עריכה, שינוי סטטוס ל"הוחזר" (נפתח שדה תאריך-פעולה), ומחיקה (עם "בטוח?") - עובדים.
6. 0 שגיאות קונסולה, RTL תקין, צבעים סמנטיים לא נפגעו.

- [ ] **Step 4: עדכון SPEC + Commit סופי**

עדכן `SPEC.md` בסעיף חדש "פיצ'ר: בטחונות (2026-07-24)" - טבלה, מקטע מתקפל, בלי אוטומציה, מיגרציה הורצה.

```bash
git add SPEC.md supabase/migrations/README.md
git commit -m "docs(securities): עדכון SPEC + סימון מיגרציה כהורצה בפרודקשן"
```

---

## Self-Review

**כיסוי מול האפיון:**
- טבלה `lease_securities` עם כל השדות - Task 1 ✅
- 5 סוגי `kind` + 3 סטטוסים + CHECK constraints - Task 1 ✅
- RLS owner-only - Task 1 ✅
- CRUD API בדפוס property-utilities - Task 3 ✅
- מקטע מתקפל בעמוד הנכס, מכווץ כברירת מחדל - Task 4 ✅
- שורות סיכום (פיקדון כספי מוחזק / N שקים) - Tasks 2+4 ✅
- הערת "בטחונות קודמים שטרם הוחזרו" - Task 4 ✅
- חלונית הוספה/עריכה עם שדות מותנים + סטטוס-בורר + תאריך-פעולה - Task 5 ✅
- ניטרליות צבעים (לא ירוק/אדום סמנטי) - Task 4 (SECURITY_STATUS_CLASS) ✅
- אין תזכורות/תנועת-כסף/דוחות - לא מיושם בשום Task (מכוון) ✅
- deposit_amount / payment_type ללא שינוי - לא נגענו ✅

**עקביות טיפוסים:** `SecurityKind`/`SecurityStatus`/`SecurityUtilityType`/`LeaseSecurity` מוגדרים ב-Task 1 ובשימוש עקבי ב-2/4/5. `leaseSecurities` queryKey מוגדר ב-Task 4 ובשימוש ב-4/5. שמות פונקציות (`heldCashDepositTotal`, `heldPaperCount`, `securityIcon`, `handleSaveSecurity`) עקביים.

**Placeholders:** אין TBD/TODO. ה-stubs ב-Task 4 מפורשים כזמניים ומוחלפים ב-Task 5 עם קוד מלא.
