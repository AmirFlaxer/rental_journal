# עיצוב: חשבונות שירות לפי נכס + תזכורות מחזוריות

תאריך: 2026-07-08
סטטוס: מאושר לתכנון

## מטרה

לאפשר לבעל הנכס לסמן בכל נכס אילו חשבונות שירות (מים, גז, חשמל, ארנונה, ועד בית, אחר) רלוונטיים, מי אחראי עליהם, ובאיזו תדירות - והמערכת תייצר **תזכורות מחזוריות אוטומטיות** לחשבונות שבאחריות המשכיר. בנוסף, תזכורת **"סיום חוזה מתקרב"** מחוזה פעיל. התזכורות וירטואליות (נוצרות מהקונפיגורציה/מהחוזה בכל טעינה), ולכן מרפאות את עצמן - מה שמייתר כפתור "שחזור תזכורות" נפרד (פיצ'ר שקופל לכאן).

## החלטות מפתח

- **קונפיגורציה על הנכס** (לא על החוזה): עובדת גם כשהנכס ריק (ארנונה/ועד), ומקום אחד לתחזק. אם השוכר מתחלף והאחריות משתנה - עורכים את הנכס.
- **תזכורות וירטואליות** בדפוס הקיים של תזכורות השק (`generateVirtualCheckTasks`): נוצרות מהקונפיג, סימון "בוצע" יוצר שורת `tasks` אמיתית עם `completed_at` שמכסה את התקופה.
- **YAGNI**: בלי יום-בחודש, בלי סכום משוער, בלי קישור אוטומטי להוצאה. אפשר בהמשך.

## מודל נתונים

טבלה חדשה `property_utilities`:

| עמודה | טיפוס | הערה |
|-------|-------|------|
| id | text PK | gen_random_uuid |
| user_id | uuid | RLS owner |
| property_id | text | FK properties, on delete cascade |
| type | text | water \| gas \| electricity \| municipal_tax \| house_committee \| other |
| custom_label | text null | שם חופשי כש-type='other' |
| frequency | text | monthly \| bimonthly |
| anchor_month | int null | 1-12, רק ל-bimonthly - החודש שבו החשבון נוחת (מגדיר את זוגיות החלון) |
| responsibility | text | owner_pays \| owner_forwards \| tenant_pays |
| active | boolean | default true |
| created_at, updated_at | timestamptz | |

RLS: `property_utilities_owner` (user_id = auth.uid()). מיגרציה ידנית + עדכון supabase_schema.sql ו-README.

## API

- `GET /api/property-utilities` - כל החשבונות של המשתמש (הדף מסנן לפי propertyId).
- `POST /api/property-utilities` - יצירה (אימות בעלות על הנכס).
- `PUT /api/property-utilities/[id]`, `DELETE /api/property-utilities/[id]` - עדכון/מחיקה, מסונן user_id.
- `propertyUtilitySchema` ב-validations.ts.

## לוגיקת דומיין (נבדקת)

`src/lib/domain/utility-schedule.ts`:
- `utilityAppliesThisPeriod(utility, today)`: monthly - תמיד החודש הנוכחי; bimonthly - רק אם `(currentMonth - anchor_month)` זוגי.
- `currentUtilityPeriodKey(today)`: YYYY-MM נוכחי (מקומי, דרך localMonthKey).
- `generateVirtualUtilityTasks(utilities, dbTasks, today)`: לכל חשבון active עם responsibility בין owner_pays/owner_forwards, שחל בתקופה הנוכחית ולא מכוסה ע"י task קיים (לפי utility.id + חודש) - מייצר task וירטואלי. סינון tenant_pays. dedup לפי utility.id + חודש.
- מיפוי קטגוריה: water/gas/electricity/municipal_tax לקטגוריות הקיימות; house_committee ו-other ל-"Other" עם התיאור בכותרת. בלי שינוי enum הקטגוריות.
- נוסח כותרת: owner_pays -> "תשלום {סוג} - {נכס}"; owner_forwards -> "העברת חשבון {סוג} לשוכר - {נכס}".

## תזכורת "סיום חוזה מתקרב" (וירטואלית, ללא נתון חדש)

`src/lib/domain/lease-reminders.ts` (נבדק): `generateVirtualLeaseRenewalTasks(leases, dbTasks, today)`:
- לכל חוזה שאינו ended/paused, מעוגן ל-`end_date`.
- מיוצר רק כשנשארו עד 3 חודשים (90 יום) לסיום. סימון "בוצע" סוגר את כל השלב.
- **הסלמת עדיפות**: >75 יום -> normal; 60-75 יום (2.5 חודשים) -> high; <60 יום -> high + סימון דחוף בכותרת.
- due_date להצגה = `end_date`; הכותרת/תת-כותרת: "סיום חוזה מתקרב - {נכס}" + "מסתיים בעוד {X} ימים". קטגוריה: "Lease Renewal".
- תזכורות אלה נכנסות תמיד לסעיף "רלוונטיות" (כבר מסוננות לחלון 90 יום ביצירה).
- dedup/סגירה: מפתח = lease.id + `end_date` (מחזור-סיום). task אמיתי: related_entity_type='lease_renewal', related_entity_id=lease.id, due_date=end_date, completed_at. הארכת חוזה (end_date חדש) מייצרת מחזור חדש.

## אינטגרציה ב-UI

- **עמוד הנכס** `properties/[id]/page.tsx`: סעיף חדש "חשבונות שירות" - רשימה + הוספה/עריכה/מחיקה (סוג, תדירות, anchor_month אם דו-חודשי, אחריות). TanStack Query + invalidation.
- **דף התזכורות** `tasks/page.tsx`: `generateVirtualUtilityTasks` ו-`generateVirtualLeaseRenewalTasks` מצטרפים ל-`generateVirtualCheckTasks`. query נוסף ל-property-utilities. סימון "בוצע" בדפוס הקיים (יצירת task אמיתי עם related_entity_type='property_utility'/'lease_renewal', related_entity_id, completed_at). ה-cleanup הקיים (Rent Collection בלבד) לא נוגע בטיפוסים החדשים.

## טיפול בשגיאות

- הטבלה אולי לא קיימת בפרודקשן עד שהמיגרציה תורץ: ה-query ל-property-utilities ייכשל בחן; דף התזכורות ימשיך לעבוד (התזכורות הווירטואליות של החשבונות פשוט לא יופיעו). דף הנכס יציג שגיאה עדינה בסעיף.

## בדיקות

- vitest ל-utility-schedule: monthly תמיד חל; bimonthly חל רק בחודשי זוגיות ה-anchor; dedup לפי utility+חודש; סינון tenant_pays; מיפוי קטגוריה ונוסח כותרת.
- vitest ל-lease-reminders: מיוצר רק בתוך 90 יום לסיום; הסלמת עדיפות בגבולות 75/60 יום; dedup/סגירה לפי lease.id+end_date; לא מיוצר לחוזה ended/paused; הארכה (end_date חדש) מייצרת מחזור חדש. מוקפא עם vi.setSystemTime.

## מחוץ ל-scope

יום-בחודש, סכום משוער, קישור אוטומטי להוצאה, קונפיגורציה פר-חוזה, התראות Push על החשבונות.
