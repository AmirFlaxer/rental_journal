# תוכנית מימוש: gen types + snake_case מקצה לקצה

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** להחליף את הטיפוסים הידניים בטיפוסים שנוצרים מסכימת ה-DB (`src/types/supabase.ts`, כבר נוצר), ולתקנן snake_case מקצה לקצה - ביטול ההמרה camelKeys/snakeKeys (אפשרות א' מ-docs/gen-types.md).

**Architecture:** ה-DB הוא snake_case; עד היום כל API route המיר ל-camelCase בתשובה והמיר חזרה בקלט. אחרי הרפקטור: ה-JSON בכל ה-API הוא snake_case כמו ה-DB, הדפים צורכים snake_case ישירות, וכל הטיפוסים נגזרים מ-`Database` המיוצר. זה מסיר מקור-באגים שקט (טיפוסים שנסחפים מה-DB) ושכבת המרה רקורסיבית בכל בקשה.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase, zod, TanStack Query, vitest.

## Global Constraints (חוזה-ההמרה - חל על כל המשימות)

1. **כיוון אחד בלבד:** מפתחות JSON/טיפוסים עוברים מ-camelCase ל-snake_case בדיוק לפי שמות העמודות ב-`src/types/supabase.ts`. אין להמציא שמות.
2. **מה לא ממירים:**
   - פרמטרי route של Next.js (למשל `params.propertyId` בתיקייה `[propertyId]`) - שם התיקייה קובע.
   - שמות משתנים/פונקציות/props מקומיים שאינם מפתחות-wire (מותר `const propertyId = ...`).
   - שדות טופס שאינם עמודות DB (email/password/confirmPassword ב-auth).
   - מפתחות של קשרי-join בתשובות Supabase (`property:properties(...)`, `tenant`, `documents`) - נשארים כשמם.
   - צורת ה-JSON שמחזיר חילוץ ה-AI (extract) - פנימית לדף הייבוא; רק ה-POST הסופי ל-API עובר snake_case.
3. **אין שינוי לוגיקה.** רפקטור שמות בלבד. כל סטייה לוגית שמתגלה - לדווח, לא לתקן בשקט.
4. **טיפוסים:** אין להגדיר מחדש שדות עמודות ידנית. הכול נגזר מ-`Database` (ראה משימה 1). צמצומי enum נעשים עם `Omit & {...}` בלבד.
5. **בדיקות:** `npx vitest run` חייב להיות ירוק בסוף משימה 2 והלאה. `npx tsc --noEmit` ירוק מלא נדרש רק ממשימה 8 (בין משימות 1-7 מותרות שגיאות בקבצים שטרם הומרו - אך אסור שיהיו שגיאות בקבצים שהמשימה הנוכחית בבעלותה).
6. **commit בסוף כל משימה** עם הודעה בעברית, על branch `refactor/gen-types-snake-case`.
7. אין מקף ארוך ואין חצים בטקסט עברי (הערות/הודעות commit).

---

### Task 1: תשתית - database.ts מעל הטיפוסים המיוצרים + validations ב-snake_case

**Files:**
- Modify: `src/types/database.ts` (החלפה מלאה בתוכן שלמטה)
- Modify: `src/lib/validations.ts`
- Delete: `src/lib/supabase/case.ts`
- Reference: `src/types/supabase.ts` (מיוצר - אין לערוך ידנית)

**Interfaces (Produces):** כל הקוד בפרויקט מייבא מ-`@/types/database` את אותם שמות טיפוסים כמו היום (`Lease`, `Payment`, ...) - אבל עכשיו הם snake_case. הטיפוסים `LeaseRow`/`ExpenseRow`/`PaymentRow`/`PropertyRow`/`PropertyUtilityRow` נמחקים; מי שייבא אותם יעבור לשמות הבסיס במשימות הבאות.

- [ ] **Step 1:** להחליף את `src/types/database.ts` בתוכן הבא במלואו (לאמת מול `supabase.ts` ששמות הטבלאות והעמודות קיימים; אם עמודה מהרשימה לא קיימת ב-generated - לעצור ולדווח BLOCKED):

```ts
// טיפוסי DB - נגזרים מהסכימה המיוצרת (src/types/supabase.ts, נוצר ע"י npm run gen:types).
// snake_case בכל השכבות: DB, API JSON, ודפי הלקוח. אין המרת מפתחות.
// צמצומי enum נעשים כאן בלבד, עם Omit - לא מגדירים עמודות ידנית.
import type { Database } from "./supabase";

type TableRow<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type { Database };

// ---- enums דומייניים (צמצום מעל string של הסכימה) ----
export type LinkageType = "none" | "usd" | "cpi";
export type LinkageFrequency = "monthly" | "quarterly" | "semiannual";
export type LeaseStatus = "active" | "terminated" | "expired";
export type PaymentMethod = "bank_transfer" | "check" | "cash" | "other";
export type ExpenseCategory =
  | "maintenance"
  | "repair"
  | "insurance"
  | "tax"
  | "management"
  | "utilities"
  | "other";
export type PaymentStatus = "pending" | "paid" | "overdue" | "partial";
export type TaskPriority = "low" | "normal" | "high" | "urgent";
export type TaskStatus = "pending" | "done";
export type AssetCondition = "new" | "good" | "fair" | "poor";
export type IndexRateType = "usd" | "cpi";
export type PropertyUtilityType =
  | "water"
  | "gas"
  | "electricity"
  | "municipal_tax"
  | "house_committee"
  | "other";
export type PropertyUtilityFrequency = "monthly" | "bimonthly";
export type PropertyUtilityResponsibility = "owner_pays" | "owner_forwards" | "tenant_pays";

// ---- טיפוסי ישויות (snake_case, נגזרים מהסכימה) ----
export type Property = TableRow<"properties">;
export type Tenant = TableRow<"tenants">;

export type Lease = Omit<
  TableRow<"leases">,
  "status" | "linkage_type" | "linkage_frequency" | "payment_method"
> & {
  status: LeaseStatus;
  linkage_type: LinkageType;
  linkage_frequency: LinkageFrequency;
  payment_method: PaymentMethod | null;
};

export type LeaseDocument = TableRow<"lease_documents">;

export type Expense = Omit<TableRow<"expenses">, "category"> & {
  category: ExpenseCategory | string;
};

export type Payment = Omit<TableRow<"payments">, "status"> & {
  status: PaymentStatus;
};

// הערה: העמודה status מיושנת - לעולם לא מתעדכנת ע"י האפליקציה בפועל.
// completed_at הוא מקור האמת היחיד למשימה פתוחה (null) מול שהושלמה (תאריך).
export type Task = Omit<TableRow<"tasks">, "priority" | "status"> & {
  priority: TaskPriority;
  status: TaskStatus;
};

export type PropertyAsset = Omit<TableRow<"property_assets">, "condition"> & {
  condition: AssetCondition;
};

export type IndexRate = Omit<TableRow<"index_rates">, "type"> & {
  type: IndexRateType;
};

export type PropertyUtility = Omit<
  TableRow<"property_utilities">,
  "type" | "frequency" | "responsibility"
> & {
  type: PropertyUtilityType;
  frequency: PropertyUtilityFrequency;
  responsibility: PropertyUtilityResponsibility;
};

// ---- טיפוסים מועשרים לתשובות API (מפתחות join נשארים כשמם) ----
export type LeaseWithRelations = Lease & {
  tenant?: Tenant;
  property?: Property;
  documents?: LeaseDocument[];
};

export type PropertyWithLeases = Property & {
  leases?: Lease[];
  expenses?: Expense[];
  payments?: Payment[];
};
```

- [ ] **Step 2:** אימות סחיפה: להריץ `npx tsc --noEmit 2>&1 | grep "types/database.ts"` - אפס שגיאות בקובץ עצמו. אם `Omit` נכשל על עמודה חסרה בסכימה המיוצרת - זה ממצא סחיפה אמיתי; לדווח ב-report ולעצור רק אם אין פתרון ברור.
- [ ] **Step 3:** להמיר את כל מפתחות השדות ב-`src/lib/validations.ts` שממופים לעמודות DB ל-snake_case (למשל `propertyId` יהפוך ל-`property_id`, `startDate` ל-`start_date`, `hasOption` ל-`has_option` וכן הלאה, בכל הסכמות: property, tenant, lease, expense, payment, task, propertyUtility, feedback אם קיימת). הודעות השגיאה והלוגיקה (refine/transform/defaults) נשארות זהות. סכמות auth (signUp/signIn) לא משתנות.
- [ ] **Step 4:** למחוק את `src/lib/supabase/case.ts` (`git rm`).
- [ ] **Step 5:** commit: `refactor: טיפוסי DB נגזרים מ-gen types + ולידציות snake_case (שלב 1/8)`

---

### Task 2: ספריות domain ו-lib + כל הבדיקות

**Files (Modify - כולל קובצי ה-test הצמודים):**
- `src/lib/domain/rent-schedule.ts` + `.test.ts`
- `src/lib/domain/partial-payment.ts` + `.test.ts`
- `src/lib/domain/dates.ts` + `.test.ts` (ככל הנראה בלי שדות DB - לוודא בלבד)
- `src/lib/domain/lease-reminders.ts` + `.test.ts`
- `src/lib/domain/utility-schedule.ts` + `.test.ts`
- `src/lib/linkage.ts` + `.test.ts`
- `src/lib/lease-status.ts` + `.test.ts`
- `src/lib/auto-tax.ts`
- `src/lib/check-reminders.ts`
- `src/lib/plan.ts`

**Interfaces:** הפונקציות שומרות שם וחתימה לוגית; רק שמות שדות באובייקטים ובטיפוסי הפרמטרים עוברים ל-snake_case (או עוברים להשתמש בטיפוסים מ-`@/types/database`). קוד שכבר עובד ב-snake_case (auto-tax, check-reminders עובדים מול שורות DB גולמיות) - רק ליישר את הגדרות הטיפוס המקומיות לטיפוסים החדשים ולהסיר כפילויות.

- [ ] **Step 1:** לקרוא כל קובץ, להמיר מפתחות camelCase שממופים לעמודות DB, ולהעדיף `Pick<Lease, ...>`/טיפוסים מ-`@/types/database` על הגדרות מקומיות כפולות.
- [ ] **Step 2:** לעדכן fixtures בבדיקות לאותם שמות snake_case. אסור לשנות ערכים/ציפיות של בדיקות.
- [ ] **Step 3:** `npx vitest run` - כל הבדיקות ירוקות (היו 60+; אותו מספר בדיוק חייב לעבור, אפס skipped חדשים).
- [ ] **Step 4:** commit: `refactor: ספריות domain ובדיקות ל-snake_case (שלב 2/8)`

---

### Task 3: API routes קבוצה א' - properties, tenants, property-utilities, feedback, index-rates, reports

**Files (Modify):**
- `src/app/api/properties/route.ts`, `src/app/api/properties/[id]/route.ts`
- `src/app/api/tenants/route.ts`, `src/app/api/tenants/[id]/route.ts`
- `src/app/api/property-utilities/route.ts`, `src/app/api/property-utilities/[id]/route.ts`
- `src/app/api/feedback/route.ts`
- `src/app/api/index-rates/route.ts`
- `src/app/api/reports/route.ts`

**התבנית הקנונית (חלה על כל route בכל הקבוצות):**

לפני:
```ts
import { camelKeys, snakeKeys } from "@/lib/supabase/case";
// GET:
return NextResponse.json(camelKeys(data));
// POST:
const data = schema.parse(body);
await supabase.from("payments").insert({ ...(snakeKeys(data) as object), user_id: session.user.id });
```

אחרי:
```ts
// (אין ייבוא case.ts - הקובץ נמחק)
// GET:
return NextResponse.json(data);
// POST: הסכמה כבר snake_case (משימה 1), אז:
const data = schema.parse(body);
await supabase.from("payments").insert({ ...data, user_id: session.user.id });
```

- [ ] **Step 1:** בכל קובץ: להסיר את ייבוא case.ts, להסיר עטיפות `camelKeys(...)`/`snakeKeys(...)`, ולעדכן כל התייחסות לשדה קלט (`data.propertyId` יהפוך ל-`data.property_id` וכו', כולל בקריאות ל-`z.coerce.date` תוצרים כמו `new Date(data.dueDate)`).
- [ ] **Step 2:** reports/route.ts בונה JSON מחושב (לא שורות DB גולמיות) - להמיר גם את מפתחות הפלט המחושבים ל-snake_case ולתעד ב-report את רשימת המפתחות שהשתנו (הדפים במשימות 6-7 יתיישרו לפיהם).
- [ ] **Step 3:** `npx tsc --noEmit 2>&1 | grep "app/api/(properties|tenants|property-utilities|feedback|index-rates|reports)"` - אפס שגיאות בקבצי המשימה. `grep -r "camelKeys\|snakeKeys" src/app/api/<הקבצים>` - אפס מופעים.
- [ ] **Step 4:** commit: `refactor: הסרת המרת מפתחות מ-routes קבוצה א (שלב 3/8)`

---

### Task 4: API routes קבוצה ב' - leases, payments, expenses, tasks + בדיקת routes ללא המרה

**Files (Modify):**
- `src/app/api/leases/route.ts`, `src/app/api/leases/[id]/route.ts`, `src/app/api/leases/[id]/terminate/route.ts`, `src/app/api/leases/[id]/activate-option/route.ts`, `src/app/api/leases/[id]/upload/route.ts`
- `src/app/api/payments/route.ts`, `src/app/api/payments/[id]/route.ts`
- `src/app/api/expenses/route.ts`, `src/app/api/expenses/[id]/route.ts`
- `src/app/api/tasks/route.ts`, `src/app/api/tasks/[id]/route.ts`
- בדיקה בלבד (לתקן רק אם מחזירים/מצפים camelCase): `src/app/api/tasks/cleanup/route.ts`, `src/app/api/documents/[id]/route.ts`, `src/app/api/documents/[id]/extract/route.ts`, `src/app/api/leases/extract-temp/route.ts`, `src/app/api/cron/notify/route.ts`, `src/app/api/push/subscribe/route.ts`, `src/app/api/settings/tax/route.ts`, `src/app/api/settings/llm-provider/route.ts`, `src/app/api/index-rates/refresh/route.ts`

**Interfaces:** אותה תבנית קנונית ממשימה 3. שים לב ב-payments/route.ts: הטיפול המיוחד ב-`partialPaidAmount` (נקרא ישירות מה-body) הופך ל-`body.partial_paid_amount`; שאר הלוגיקה (reconcileAutoTax, closeCheckReminderForPayment) כבר מקבלת snake_case ונשארת זהה.

- [ ] **Step 1:** להמיר את 11 קבצי ה-CRUD לפי התבנית הקנונית.
- [ ] **Step 2:** לעבור על קבצי ה"בדיקה בלבד": אם route מחזיר שורות DB כמו-שהן או קורא שדות body - הוא כנראה כבר snake_case ואין לגעת; לתקן רק מקום שמחזיר camelCase ללקוח או מצפה ל-camelCase בקלט. לתעד ב-report מה נמצא בכל קובץ.
- [ ] **Step 3:** `npx tsc --noEmit` מסונן לקבצי המשימה - אפס שגיאות; `grep -r "camelKeys\|snakeKeys" src/app/api src/lib` - אפס מופעים בכל הפרויקט.
- [ ] **Step 4:** commit: `refactor: הסרת המרת מפתחות מ-routes קבוצה ב (שלב 4/8)`

---

### Task 5: דפי לקוח קבוצה א' - הליבה הפיננסית

**Files (Modify):**
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/payments/page.tsx`
- `src/app/dashboard/debts/page.tsx`
- `src/app/dashboard/expenses/page.tsx`
- `src/app/dashboard/tasks/page.tsx`
- `src/app/dashboard/maintenance/page.tsx`
- `src/app/dashboard/layout.tsx` (בדיקה - כנראה בלי שדות DB)

**כללי ההמרה בדפים (חלים גם על משימות 6-7):**
- כל גישה לשדה שמגיע מה-API עוברת ל-snake_case (`payment.dueDate` יהפוך ל-`payment.due_date`).
- interfaces מקומיים לנתוני API: למחוק ולייבא מ-`@/types/database` כשיש התאמה, או להמיר את המפתחות כשהצורה היא תשובת-join חלקית (למשל `property: { id: string; title: string }` נשאר, אבל `dueDate` בתוכו הופך `due_date`).
- גופי בקשה (fetch/apiPost) עוברים ל-snake_case בהתאם לסכמות ולידציה ממשימה 1.
- state מקומי של טפסים: מותר להשאיר שמות camelCase בתוך ה-state, אבל בבניית ה-body לשליחה חייבים מפתחות snake_case. פשוט יותר: ליישר גם את ה-state - לשיקול המיישם, העיקר עקביות בתוך הקובץ.
- קריאות לפונקציות domain (rent-schedule וכו') - החתימות כבר snake_case ממשימה 2.

- [ ] **Step 1:** להמיר את הקבצים לפי הכללים.
- [ ] **Step 2:** `npx tsc --noEmit` מסונן לקבצי המשימה - אפס שגיאות.
- [ ] **Step 3:** commit: `refactor: דפי הליבה הפיננסית ל-snake_case (שלב 5/8)`

---

### Task 6: דפי לקוח קבוצה ב' - נכסים

**Files (Modify):**
- `src/app/dashboard/properties/page.tsx`
- `src/app/dashboard/properties/new/page.tsx`
- `src/app/dashboard/properties/[id]/page.tsx`
- `src/app/dashboard/properties/[id]/edit/page.tsx`
- `src/app/dashboard/properties/[id]/add-expense/page.tsx`
- `src/app/dashboard/properties/[id]/add-lease/page.tsx`
- `src/app/dashboard/properties/[id]/add-payment/page.tsx`
- `src/components/property-form.tsx`

אותם כללים ממשימה 5. שים לב: `properties/[id]/page.tsx` גדול (כולל סעיף חשבונות-שירות חדש) - לעבוד שיטתית, שדה-שדה.

- [ ] **Step 1:** המרה לפי הכללים.
- [ ] **Step 2:** `npx tsc --noEmit` מסונן לקבצי המשימה - אפס שגיאות.
- [ ] **Step 3:** commit: `refactor: דפי נכסים ל-snake_case (שלב 6/8)`

---

### Task 7: דפי לקוח קבוצה ג' - חוזים, דיירים, דוחות, הגדרות

**Files (Modify):**
- `src/app/dashboard/leases/page.tsx`
- `src/app/dashboard/leases/[id]/edit/page.tsx`
- `src/app/dashboard/leases/import/page.tsx` (זהירות: ממפה תוצאת חילוץ AI לטופס; צורת החילוץ לא משתנה, רק ה-POST הסופי)
- `src/app/dashboard/tenants/[id]/edit/page.tsx`
- `src/app/dashboard/reports/page.tsx`
- `src/app/dashboard/reports/[propertyId]/page.tsx` (פרמטר ה-route `propertyId` נשאר!)
- `src/app/dashboard/reports/tax/page.tsx`
- `src/app/dashboard/reports/linkage/page.tsx`
- `src/app/dashboard/settings/page.tsx`
- `src/app/dashboard/about/page.tsx`

אותם כללים ממשימה 5. דפי הדוחות צורכים את מפתחות הפלט החדשים של reports/route.ts - לקרוא את ה-report של משימה 3 (יימסר בהנחיה) ולהתיישר אליו.

- [ ] **Step 1:** המרה לפי הכללים.
- [ ] **Step 2:** `npx tsc --noEmit` מסונן לקבצי המשימה - אפס שגיאות.
- [ ] **Step 3:** commit: `refactor: דפי חוזים/דוחות/הגדרות ל-snake_case (שלב 7/8)`

---

### Task 8: התכנסות - שערים מלאים + סריקת שאריות

- [ ] **Step 1:** `npx tsc --noEmit` - אפס שגיאות בכל הפרויקט. לתקן כל שארית.
- [ ] **Step 2:** `npx vitest run` - הכול ירוק.
- [ ] **Step 3:** `npm run lint` - נקי (הלינט חוסם פריסה).
- [ ] **Step 4:** `npm run build` - עובר.
- [ ] **Step 5:** סריקות שאריות, כולן חייבות להחזיר אפס תוצאות רלוונטיות (למעט פרמטרי route, state מקומי מותר, ו-auth):
  - `grep -rn "camelKeys\|snakeKeys" src`
  - `grep -rnE "\.(propertyId|tenantId|leaseId|userId|startDate|endDate|monthlyRent|dueDate|paidDate|paidBy|isAutoTax|hasOption|baseAmount|baseDate|linkageType|anchorMonth|customLabel|partialPaidAmount|completedAt|relatedEntity|sourcePaymentId|periodDate|firstName|lastName|idNumber)\b" src` - לבדוק כל מופע ידנית (חלקם לגיטימיים: params, state מקומי).
  - `grep -rnE "(propertyId|startDate|dueDate|monthlyRent):" src/app --include="*.tsx"` על גופי-בקשה.
- [ ] **Step 6:** לעדכן את `docs/gen-types.md`: שלב 2 בוצע; נותרה רק ההוראה התחזוקתית (להריץ gen:types אחרי כל שינוי סכימה).
- [ ] **Step 7:** commit: `refactor: התכנסות - שערים ירוקים וסריקת שאריות (שלב 8/8)`

---

## אחרי המשימות (בשליטת המתזמר, לא subagent)

1. סקירת branch סופית (Opus) על כל ה-diff מ-merge-base.
2. תיקוני ממצאים (fix subagent אחד לכל הממצאים), re-review.
3. merge ל-main + push; לוודא GitHub Actions ירוק (typecheck+lint+tests+deploy). **אין צורך ב-vercel deploy ידני - הפריסה האוטומטית פעילה.**
4. בדיקת עשן בפרודקשן: התחברות, דף נכסים, דף תשלומים, יצירת תזכורת.
5. עדכון SPEC.md + memory.

## סיכונים ידועים

- **גישה לא-מוקלדת חומקת מ-tsc** (למשל `any` או אינדקס דינמי): לכן סריקות ה-grep במשימה 8 הן שער חובה, לא המלצה.
- **דפי דוחות** תלויים במפתחות הפלט המחושבים של reports/route.ts - ה-report של משימה 3 הוא החוזה.
- **supabase typed client** (`createClient<Database>`): לא בתוכנית הזו. שדרוג אופציונלי עתידי; היום ה-client לא מוקלד והטיפוס נכפה ידנית בצד הקורא. לא להוסיף במסגרת הרפקטור (YAGNI).
