# SPEC.md - Rental Journal

> מצב נוכחי, החלטות, והצעד הבא. מתעדכן בכל session.

## מעבר אמוג'י ל-Phosphor Icons (2026-07-15/16, מוזג ופרוס)

- **65 גליפי-אמוג'י (ניווט, קטגוריות, סטטוס-תשלום, פעולות, דקורטיביים) הוחלפו באייקוני `@phosphor-icons/react`** (weight="duotone") - מניע: מקצועיות/רצינות (אפליקציית ניהול-כספים). הכרעה על גבי קומפניון-ויזואלי חי: השוואת 4 משפחות-אייקונים (Lucide/Tabler/Phosphor-Regular/Phosphor-Duotone) ובחירת עובי-קו/צבע - Duotone נבחר (יותר "חם", תואם לזהות "יומן הספר").
- **ארכיטקטורה**: `src/lib/icons.ts` (מפת שם-לוגי→קומפוננטה, `IconName = keyof typeof ICONS`) + `src/components/Icon.tsx` (עטיפה, `weight="duotone"` ברירת-מחדל). כל מפת-קטגוריה קיימת (`CAT_ICON`, `TYPE_ICON`, `UTILITY_TYPE_OPTIONS` וכו') הוטבה-טיפוס ל-`Record<string, IconName>` - טעות-הקלדה בשם-אייקון = שגיאת-`tsc`, לא תקלת-ריצה.
- **תיקוני-אגב**: `NAV_ITEMS` (סרגל+bottom-nav) אוחד ל-`src/lib/nav-items.ts` יחיד; סטטוס-תשלום "עתידי" אוחד לשם-לוגי `future` בשני מסכים שונים (`properties/[id]` ו-`reports/[propertyId]`) שהיו לא-עקביים לפני-כן.
- **תהליך**: brainstorming (כולל קומפניון-ויזואלי לבחירת עובי-קו/משפחה/תיקוני-icon בודדים) → spec → plan (15 משימות) → subagent-driven (מיישמי Haiku/Sonnet + סקירת-Sonnet לכל משימה + סקירת-על Opus) → מיזוג ל-main.
- **לקחים**: (1) `Receipt` ב-Lucide מצייר "$" בתוך-הצורה (Phosphor לא) - לבדוק SVG-path בפועל לפני קביעת אייקון-כסף. (2) שני "פספוסי-תוכנית" נתפסו ותוקנו תוך-כדי (Task 4: `⚠` שלא נכלל ב-brief; Task 7: 2 אתרי-צריכה של `UTILITY_TYPE_OPTIONS` שלא נכללו). (3) סוכן-implementer אחד ביצע commit בטעות על `main` הראשי במקום ה-worktree - שוחזר בבטחה (cherry-pick + `git checkout -B`). (4) סקירת-העל הסופית תפסה התנגשות-סמנטית אחת (`paid`/CheckCircle לכפתור-ניווט "השוואת הצמדה" - הוחלף ל-`reports`).
- הכל ירוק: tsc/lint/vitest(100/100)/build + בדיקה חזותית Playwright על 15 מסכים מאומתים. קומיט אחרון `fd46a80`, CI ירוק, פרוס.

## רדיזיין "מהדורת נייר" (2026-07-10, מוזג ופרוס)

- **מעבר מכהה-בלבד לערכת "קלף" בהירה אחת** (הכרעת מחקר רב-סוכני: 7/7 אפליקציות בקטגוריה בהירות, positive polarity, קהל 35-65, שימוש יומי קצר). אין ערכה כהה ואין theme switcher. spec: docs/superpowers/specs/2026-07-10-paper-edition-redesign-design.md, תוכנית: docs/superpowers/plans/2026-07-10-paper-edition-redesign.md.
- **טוקנים**: רקע `#f3edde`, כרטיס `#fbf7ec`, דיו `#231f16`, מותג `#7c83ff` (טקסט מותג על קלף: `--accent-hover #5b62e6` ל-AA), ענבר טקסט `#92400e`, ירוק `#047857`, אדום `#be123c`. צל חם עדין.
- **Heebo יחיד** (400/500/700) - Rubik ו-Frank Ruhl Libre הוסרו; `--font-rubik`/`--font-display` הם aliases ל-Heebo.
- **דשבורד חדש** (בנוי לביקור 1-3 דקות אחת לכמה ימים): "מאז הביקור האחרון" (localStorage, created_at מכריע), "דורש טיפול" (איחורים/משימות עד 7 ימים/חוזים עד 90 יום - src/lib/domain/attention.ts), מספר-גיבור "תזרים החודש אחרי מס" + מגמה (src/lib/domain/cashflow.ts), פיד מקובץ שבועי (weekGroupLabel). מודולים חדשים ב-domain עם 18 בדיקות; סה"כ 95 ירוקות.
- **manifest**: שם "יומן הספר - ניהול נכסים", theme_color `#f3edde` (פס סטטוס קלף; WebAPK מותקן מתעדכן תוך עד ~יום).
- **לקח תהליכי**: נוסף סקיל verify פרויקטלי (.claude/skills/verify, לא בגיט) - חובה בדיקה ויזואלית Playwright אחרי שערים סטטיים; תפסה 2 באגים (NaN מ-timestamptz, Invalid Date) ששערים סטטיים פספסו. תאריכים מה-DB הם timestamptz - כל פירוק חייב `.slice(0, 10)`.
- **מגמת התזרים**: משווה "עד אותו יום בחודש הקודם" (יולי 1-10 מול יוני 1-10) - שקט כשהמקצב תקין, מתריע רק על חריגה אמיתית. הכרעת אמיר על גבי דמו אינטראקטיבי, TDD, commit 1338c63. שערים: tsc/lint/vitest 98/98 ירוקים (כשל ה-vitest הזמני היה קבצי-זבל של סוכן, נוקו).

## רפקטור: gen types + snake_case מקצה לקצה (2026-07-08, מוזג ופרוס)

- **הושלם שלב 2 של docs/gen-types.md** (סשן ייעודי, 8 משימות subagent-driven + סקירת Opus סופית): `src/types/supabase.ts` מיוצר מהסכימה (`npm run gen:types`), `src/types/database.ts` גוזר ממנו את כל הישויות (צמצומי enum דרך Omit בלבד), **שכבת ההמרה camelKeys/snakeKeys נמחקה** - כל ה-API והדפים עובדים snake_case כמו ה-DB.
- **תחזוקה שוטפת**: אחרי כל שינוי סכימה להריץ `npm run gen:types` ואז `npx tsc --noEmit`.
- **שני איי camelCase מכוונים** (מתועדים ב-docs/gen-types.md): JSON של חילוץ-AI (extract routes; מומר בגבול ה-POST בדף הייבוא) ותשובת terminate (noticeMonths/effectiveDate).
- **באגים אמיתיים שתוקנו אגב הרפקטור**: פרטי שק (check_bank/branch/account/deposit_reminder) נחתכו בשקט מ-leaseSchema ולא נשמרו מעולם - נוספו לסכמה; 3 מפתחות join/שדה שגויים בדף נכס (lease_documents/file_name/due_date); LeaseStatus יושר למציאות (5 ערכים: active/ended נכתבים היום, paused/terminated/expired מורשת).
- שערים בעת המיזוג: tsc 0 שגיאות, vitest 77/77, lint נקי, build עובר, CI+deploy ירוקים. merge commit `7f5233c`.

## פיצ'ר: חשבונות שירות + תזכורות מחזוריות (2026-07-08)

- **טבלה חדשה `property_utilities`** (על הנכס): type (מים/גז/חשמל/ארנונה/ועד בית/אחר), frequency (monthly/bimonthly + anchor_month), responsibility (owner_pays/owner_forwards/tenant_pays), active. CRUD ב-/api/property-utilities. סעיף UI בעמוד הנכס.
- **תזכורות וירטואליות חדשות** (אותו דפוס של תזכורות שק - מרפאות את עצמן, סימון "בוצע" = שורת DB שחוסמת חזרה לאותה תקופה, מחזור הבא מופיע מעצמו):
  - **חשבונות שירות**: src/lib/domain/utility-schedule.ts - תזכורת לתקופה הנוכחית לחשבונות owner_pays/owner_forwards (נוסח שונה). tenant_pays = בלי תזכורת. bimonthly לפי זוגיות anchor_month.
  - **סיום חוזה מתקרב**: src/lib/domain/lease-reminders.ts - מ-90 יום לפני end_date, הסלמת עדיפות ב-75/60 יום, תזכורת אחת שסימון אחד סוגר (מפתח lease+endDate).
- **"שחזור תזכורות" (רעיון ישן) קופל לכאן**: הווירטואליות מרפאות את עצמן, אין צורך בכפתור שחזור.
- מיגרציה `20260708_property_utilities.sql` **הורצה בפרודקשן 2026-07-08** ✅. spec: docs/superpowers/specs/2026-07-08-property-utilities-design.md.

## גל שיפורים שני (2026-07-08) - חוב-טכני, freemium, משוב, לינט

- **תשלום חלקי כעמודת DB**: עמודת `payments.partial_paid_amount` אמיתית במקום הקידוד `__partial__` ב-notes. getReceivedAmount מעדיף אותה ונופל לפענוח notes לרשומות ישנות (backfill במיגרציה, notes לא נמחק). רשומות חדשות: הסיבה ב-notes כטקסט נקי, הסכום בעמודה.
- **תשתית freemium (כבויה)**: טבלת `subscriptions` + RLS; `src/lib/plan.ts` (getPlan, isOverPropertyQuota, `ENFORCE_QUOTA=false`); נקודת אכיפת מכסה ב-POST /api/properties - no-op עד שיופעל. **כשמפעילים**: לשנות ENFORCE_QUOTA ל-true.
- **טופס משוב ל-DB**: טבלת `feedback` + RLS; POST /api/feedback; טופס האודות שולח ל-DB (best-effort) + fallback ל-mailto.
- **לינט חוסם**: כל 38 בעיות הלינט תוקנו; הוסר `continue-on-error` - כשל לינט חוסם פריסה. date-input עבר מ-ref-during-render ל-setState-during-render.
- **פריסה אוטומטית פעילה**: GitHub Actions (secrets מוגדרים) - כל push ל-main בודק ופורס. אין צורך ב-vercel deploy ידני.
- **3 המיגרציות (payments_partial_amount, subscriptions, feedback) הורצו בפרודקשן 2026-07-08** ✅ (סטטוס מלא: supabase/migrations/README.md).

**נדחה מפורשות (לסשן ייעודי):** Server Components לדוחות (מנוגד ל-TanStack שנעשה), supabase gen types (דורש token), פיצ'רים גדולים (חשבונות שירות, שחזור תזכורות, חוברת הסברים).

## שדרוג רוחבי (2026-07-08) - ביקורת עומק + גל שיפורים

ביקורת רב-סוכנית (אבטחה/נכונות/איכות/UX/ביצועים + רוויזיה ארכיטקטונית) ויישום מלא של גל 1+2:

**ארכיטקטורה חדשה:**
- **src/lib/domain/** - ספריית לוגיקה עסקית מאוחדת: `rent-schedule.ts` (לוח שכ"ד וירטואלי אחד במקום 4 עותקים שסטו), `partial-payment.ts` (getReceivedAmount - מקור אמת לסכום שהתקבל), `dates.ts` (עזרי תאריכים מקומיים בלי UTC)
- **TanStack Query** בכל דפי הדשבורד (QueryProvider ב-layout, apiGet+queryKeys ב-src/lib/api-client.ts) - ניווט בין מסכים לא טוען מחדש נתונים; מוטציות עושות invalidation צולב (תקבול משפיע גם על tasks+expenses)
- **בדיקות**: vitest, 47 בדיקות על הלוגיקה הפיננסית (rent-schedule, partial-payment, dates, linkage, lease-status). `npx vitest run`
- **CI**: .github/workflows/ci.yml - typecheck+lint+tests על כל push + פריסה אוטומטית ל-Vercel (דורש secrets: VERCEL_TOKEN/ORG_ID/PROJECT_ID)
- **מיגרציות**: supabase/migrations/ - קבצי SQL ממוספרים כמקור אמת (עדיין הרצה ידנית ב-Dashboard)

**באגים קריטיים שתוקנו:**
- עריכת חוזה הייתה שבורה לגמרי (הדף שלח PUT, ה-route לא ייצא PUT - 405) - נוסף PUT מלא עם ולידציה
- תשלום חלקי נספר כמלא במס האוטומטי, בדוח המס ובדוחות - עכשיו הכל דרך getReceivedAmount; תשלום חלקי לא סוגר תזכורת שק (החלטת אמיר)
- הפעלת אופציה מאפסת בסיס הצמדה (base_amount/base_date לשכ"ד האופציה)
- משפחת באגי UTC: linkage.pickRate (בחר מדד תקופה קודמת), ווידג'ט שקים בדף נכס, לוח חודשי בדוח נכס, effectiveLeaseStatus (חוזה שמתחיל היום הוצג future), ימי איחור בחובות
- מחיקת תקבול פותחת מחדש תזכורת שק; DELETE חוזים קיים עכשיו (מוגבל ליתומים בלבד)
- דוח ראשי לא סופר יותר פיקדונות/החזרים כהכנסה (רק Rent)
- ניקוי תזכורות עבר לשרת (POST /api/tasks/cleanup) - בוטל הסיכון של מחיקת תזכורות תקינות בכשל רשת רגעי
- mass-assignment נסגר (ולידציה ב-PUT tasks/payments), user_id ב-UPDATE של terminate/activate-option, סיומת קובץ מ-MIME
- auto-expire של חוזים הוסר מ-GET (כתיבה בנתיב קריאה) ועבר ל-cron היומי
- reconcileAutoTax - פונקציה אחת שמיישרת הוצאת מס למצב תקבול (מחליפה create/update/delete נפרדים); backfill לכל השנים
- select ממוקד ב-GET leases/payments (הוסרו payments מקונן ו-lease מלא - החיסכון הגדול ברשת)

**עדיין ידני (פעולות משתמש):**
1. להריץ ב-Supabase Dashboard את `supabase/migrations/20260708_push_subscriptions_rls.sql` (RLS חסר על מנויי Push - ממצא אבטחה)
2. להוסיף secrets ב-GitHub (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID) כדי שהפריסה האוטומטית תעבוד

## מצב נוכחי (2026-06-01)

### מה עובד
- **Auth**: Supabase Auth (email/password)
- **נכסים**: CRUD מלא, סוגים (דירה/בית/מסחרי), נתוני רכישה
- **דיירים**: CRUD, ת"ז עם ולידציה
- **חוזים**: CRUD + ייבוא מ-PDF/DOCX/תמונה עם AI (Gemini/Claude/Ollama)
  - אופציית הארכה (has_option)
  - סיום מוקדם עם מעקב
  - שוכר שני
  - שיטת תקבול (כולל שיקים עם תזכורות אוטומטיות)
  - **הצמדת שכ"ד**: linkage_type (none/usd/cpi), linkage_frequency (monthly/quarterly/semiannual)
  - **פאנל השוואת מסלולים**: חישוב תיאורטי מה היה שכ"ד לו היה צמוד, בדף עריכת חוזה
- **תקבולים**: CRUD, סטטוס (pending/paid/overdue/partial)
- **מס הכנסה**: הוצאת מס 10% אוטומטית עם כל תקבול שכ"ד (`is_auto_tax=true`, ניתן לכבות בהגדרות), דוח מס שנתי לפי נכס וחודש
  - **מתג הגדרות 10%**: הפעלה → backfill רטרואקטיבי מתחילת השנה; כיבוי → מחיקת כל הוצאות המס (`src/lib/auto-tax.ts`)
  - **דוחות לא סופרים מס פעמיים**: `/api/reports` מסנן `is_auto_tax` מ-totalExpenses/קטגוריות; המס מוצג רק כשורת 10% מחושבת
- **הוצאות**: CRUD עם קטגוריות
- **חובות**: חישוב חובות אוטומטי כולל slots וירטואליים
- **דוחות**: הכנסות/הוצאות לפי חודש, סיכום לפי נכס
- **תזכורות**: CRUD + תזכורות שיקים אוטומטיות
- **אודות**: דף `/dashboard/about` — מידע על המפתח והאפליקציה, יצירת קשר, וטופס דיווח באגים/בקשות (mailto)
- **הגדרות**: החלפת ספק AI (Gemini/Claude/Ollama), מס אוטומטי, Push, שינוי סיסמה
- **תחזוקה** (`/dashboard/settings` → סעיף תחזוקה): ניקוי תזכורות שק יתומות/כפולות, ניקוי חוזים יתומים, בדיקת תקינות חוזים (נכסים עם 2+ חוזים פעילים)
- **PWA**: manifest, service worker, safe-area insets, standalone mode
- **עיצוב (Design System)**: רדיזיין "יומן הספר" (2026-06-26) — זהות ויזואלית מלאה לכל האפליקציה. **מותג דיו-אינדיגו-סגול** `#7c83ff` (החליף ורוד `#f53892`). כותרות ב-**Frank Ruhl Libre** (סריף עברי, `var(--font-display)`), גוף ב-Rubik. אלמנט חתימה `.ledger-rule` (קו יומן) + קצה זהב `--gilt` לסימן המותג. דף נחיתה + auth מותגיים עם רקע מרושט. **צבעים סמנטיים נשמרו: ירוק=הכנסות, אדום=הוצאות, כתום=מס**. הכל מונע מ-CSS vars + Tailwind overrides ב-globals.css.

### Stack
- Next.js 16 (App Router), TypeScript, Tailwind v4
- Supabase (PostgreSQL + Auth + Storage)
- AI: Gemini 2.5 Flash (ברירת מחדל) / Claude Opus 4.6 / Ollama qwen2.5:7b
- Vercel (hosting + cron)

### DB
- טבלאות: properties, tenants, leases, lease_documents, expenses, payments, tasks, property_assets, **index_rates** (חדש)
- leases: הוספו עמודות linkage_type, linkage_frequency, base_amount, base_date
- expenses: הוספו עמודות is_auto_tax (boolean), source_payment_id (text) — לחישוב מס אוטומטי
- **⚠️ לא קיימות מיגרציות** — שינויי schema צריכים ALTER TABLE ידני ב-Supabase Dashboard

### PWA
- `public/sw.js` — service worker (cache static assets, network-first)
- `src/app/manifest.ts` — manifest מוגדר
- `src/app/layout.tsx` — viewport export נפרד, statusBarStyle: black-translucent
- `src/app/globals.css` — overscroll-behavior: none, touch-action: manipulation
- `src/app/dashboard/layout.tsx` — safe-area-inset ל-header ו-bottom nav

## החלטות שהתקבלו
| החלטה | סיבה |
|--------|-------|
| `effectiveLeaseStatus` תאריך-מודע | חוזה "פעיל" נקבע לפי `start≤today≤end`, לא לפי שדה status (ה-cron לא תמיד רץ). מיושם בכל המסכים לעקביות |
| דף חוזים מאחד כפילויות בתצוגה | חוזים עם אותו נכס+תאריכים מוצגים פעם אחת (לפי עדיפות active>future>ended) — בלי למחוק נתונים |
| מס אוטומטי מוחרג מ-totalExpenses בדוחות | המס מוצג כשורת 10% מחושבת; ספירה כפולה נמנעת ע"י סינון `is_auto_tax` ב-`/api/reports` |
| חוזים לא נמחקים/מעודכנים | שמורים כהיסטוריה משפטית לתמיד (כפילויות מדויקות בלבד נוקו, עם העברת מסמכים לחוזה ששרד) |
| Supabase Auth (לא NextAuth) | עובד אופליין בצד שרת, SSR תומך |
| index_rates בDB + Cron | מהיר יותר מ-API call בכל טעינה, שומר היסטוריה |
| מדד נדלן — נדחה | אין API נקי, יוזן ידנית בעתיד |
| Vercel Cron ב-16 לחודש | יום לאחר פרסום מדד הלמ"ס |

## בעיות ידועות / TODO פתוח
- ~~**ספק LLM נשמר ב-cookie בלבד**~~ — **נפתר**: נשמר ב-Supabase user_metadata + cookie כ-cache
- ~~**~50 שגיאות TypeScript `any`**~~ — **נפתר חלקית**: `src/types/database.ts` נוצר; 3 שורות שוליות נותרו
- ~~**חוזים ישנים ב-status=active משפיעים על תצוגות**~~ — **נפתר**: `isLeaseCurrentlyActive` מוחל על כל הדשבורד
- ~~**CRON_SECRET**~~ — **מוגדר ב-Vercel** ✅
- ~~**SQL migrations**~~ — **כל הטבלאות/עמודות קיימות ב-DB** ✅ (index_rates, linkage_type, is_auto_tax)
- ~~**error.message דולף מ-API**~~ — **נפתר** (2026-06-07): כל routes מחזירים שגיאות גנריות
- ~~**LLM provider מ-cookie**~~ — **נפתר** (2026-06-07): extract routes קוראים מ-user_metadata
- ~~**VAPID fallback לכתובת דמה**~~ — **נפתר** (2026-06-07): מחזיר 503 אם חסר
- ~~**באג UTC בתזכורות שק**~~ — **נפתר** (2026-06-07): `generateCheckReminders` משתמש ב-getDate() מקומי; dedup מעדיף לא-פגת-תוקף על פגת-תוקף לאותו חודש
- ~~**תזכורות שק יתומות/כפולות**~~ — **נפתר** (2026-06-07): ניקוי אוטומטי בטעינת דף + כפתור תחזוקה בהגדרות
- ~~**באג UTC באישור תקבול ביום עצמו**~~ — **נפתר** (2026-06-26): השוואת מחרוזת YYYY-MM-DD במקום `new Date()` ב-payments/debts/dashboard
- ~~**route מסמכים נדרס בתוכן index_rates**~~ — **נפתר** (2026-06-26): שוחזרו GET/DELETE עם בדיקת בעלות (documents/[id]/route.ts)
- ~~**enum סטטוס תשלום חסר partial**~~ — **נפתר** (2026-06-26): יושר ל-PaymentStatus ב-validations.ts
- ~~**Vercel auto-deploy לא עובד**~~ — **נפתר** (2026-07-08): פריסה אוטומטית דרך GitHub Actions על כל push ל-main (secrets מוגדרים); אין צורך ב-vercel deploy ידני
- ~~**PWA לא נבדקה על מכשיר אמיתי (Android)**~~ — **נבדקה 2026-07-09** על OnePlus CPH2653 אמיתי דרך adb+CDP: manifest בלי שגיאות, SW activated, מותקנת כ-WebAPK מלא, standalone מאומת (`display-mode: standalone` = true); נבדקו גם המסכים מבפנים אחרי התחברות (בקרה/נכסים/חוזים/תקבולים/תזכורות) - נתונים אמיתיים נטענים, צבעים סמנטיים תקינים, ותזכורות חשבונות-שירות + סיום-חוזה מהפיצ'ר החדש מופיעות בפרודקשן. Safari iOS לא ייבדק - אין מכשיר iOS זמין (2026-07-09). **ממצא פתוח**: `theme_color` ב-manifest הוא הכחול הישן `#2563eb` - פס הסטטוס באפליקציה המותקנת כחול במקום סגול המותג `#7c83ff`
- **📨 טופס "אודות" → שמירת פניות ב-DB** — כיום טופס הדיווח (`/dashboard/about`) שולח דרך `mailto` בלבד. הצעה: טבלת `feedback` + `POST /api/feedback`.
- **📚 חוברת הסברים למשתמש** — ראה פירוט בסעיף למטה
- **🧾 חשבונות שירות לפי נכס + תזכורות מחזוריות** (רעיון לפעם הבאה) — בכל נכס לסמן אילו חשבונות מגיעים לבעלים (מים, גז, חשמל, ארנונה, ועד בית וכו'), כל אחד עם תדירות (חודשי / דו-חודשי) ואולי יום בחודש. המערכת תייצר **תזכורת מחזורית אוטומטית** לכל חשבון מסומן. נקודות לתכנון: טבלת `property_utilities` (property_id, type, frequency, due_day, active) או שדה JSON על `properties`; חיבור למנגנון התזכורות הקיים (`tasks`); אולי קישור אוטומטי להוצאה כשמסמנים "שולם". להתחבר לשדות הקיימים `paid_by` / `bill_transferred` ב-expenses.
- **🔄 שחזור/יצירה-מחדש של תזכורות מהמקור** (רעיון לפעם הבאה) — לפעמים נוצר עומס/תקלות בתזכורות; אם מוחקים הכל צריך כפתור **"החזר תזכורות"** שמייצר מחדש מהנתונים הקיימים, בלי להזין ידנית. מה לשחזר: (1) תזכורות תשלום שכ"ד לפי החוזה — סכום, תאריך, תוקף; (2) תזכורות תשלום למוסדות/חשבונות שיש להעביר לשוכר; (3) תזכורת חידוש ביטוח; (4) תזכורת תשלום למנהל הנכסים. נקודות לתכנון: פעולה idempotent (לא ליצור כפילויות אם כבר קיימות — dedup לפי lease+type+חודש), כפתור בסעיף "תחזוקה" הקיים בהגדרות, ו/או הצעה אוטומטית כשמזהים שאין תזכורות פעילות לחוזה פעיל. משלים את ניקוי התזכורות הקיים (זה מנקה, זה משחזר).

## לפני פריסה / שינוי DB
```sql
-- להריץ ב-Supabase SQL Editor:

-- [חדש] מס אוטומטי — עמודות בטבלת expenses:
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS is_auto_tax boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_payment_id text;
ALTER TABLE leases
  ADD COLUMN IF NOT EXISTS linkage_type text NOT NULL DEFAULT 'none'
    CHECK (linkage_type IN ('none','usd','cpi')),
  ADD COLUMN IF NOT EXISTS linkage_frequency text NOT NULL DEFAULT 'monthly'
    CHECK (linkage_frequency IN ('monthly','quarterly','semiannual')),
  ADD COLUMN IF NOT EXISTS base_amount float,
  ADD COLUMN IF NOT EXISTS base_date timestamptz;

CREATE TABLE IF NOT EXISTS index_rates (
  id          serial      PRIMARY KEY,
  type        text        NOT NULL CHECK (type IN ('usd','cpi')),
  period_date date        NOT NULL,
  value       float       NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (type, period_date)
);

ALTER TABLE index_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "index_rates_read" ON index_rates FOR SELECT USING (true);
```

## 📚 TODO: חוברת הסברים למשתמש

מדריך שימוש מובנה באפליקציה — מלא ומפורט.

### מבנה החוברת
**פרק 0 — תחילת עבודה** (תקציר מהיר, 1-2 עמודים):
- הוספת נכס ראשון
- הוספת דייר + חוזה
- רישום תקבול ראשון
- סיכום זרימת העבודה החודשית

**פרקים מפורטים לפי קטגוריה:**
1. **נכסים** — הוספה, עריכה, מסמכים, ניהול נכס
2. **חוזים** — ייבוא, עריכה, הצמדה, אופציה, סיום מוקדם
3. **תקבולים** — רישום, תשלום חלקי, שיקים
4. **הוצאות** — קטגוריות, מס אוטומטי
5. **חובות** — קריאת דוח חובות
6. **דוחות** — דוח שנתי, דוח מס, השוואת מסלולי הצמדה
7. **תזכורות** — יצירה, עדיפות, סימון בוצע
8. **הגדרות** — AI provider, מס אוטומטי, Web Push

### אינטגרציה באפליקציה
- כפתור ? / "עזרה" בכל מסך (header או FAB)
- לחיצה → פתיחת החוברת **בפרק המתאים לאותו מסך** (anchor links / URL hash)
- פורמט מומלץ: MDX page ב-`/dashboard/help` עם anchor לכל פרק
- כתובת חיצונית אפשרית (Notion / GitBook / Markdown ב-GitHub Pages)

### לפני הכתיבה
- לסיים את כל הפיצ'רים הפתוחים קודם כך שהחוברת לא תתיישן
- לבחור פלטפורמה לאחסון (פנימי ב-Next.js vs. חיצוני)

---

## 💰 אסטרטגיית מונטיזציה ושיווק (דיון 2026-06-29)

> **החלטה: להישאר חינם בינתיים, ללמוד מה משתמשים רוצים, ולעבור למודל בתשלום בהמשך.**
> סיגנל לעבור למסחרי: מסה קריטית של משתמשים פעילים, או עדות שמשתמשים מזינים 3+ נכסים (כלומר יש קהל שמודל הג'ייטינג היה תופס).

### מודל בתשלום מתוכנן (כשנגיע לזה)
- **גישה מומלצת**: Freemium היברידי — להתחיל רזה עם ג'ייטינג לפי **מספר נכסים** בלבד (קל למימוש ולתקשורת), ובהמשך להוסיף שכבת פיצ'רים פרימיום (הצמדה אוטומטית, דוחות מס, כספת מסמכים) כשנדע מה הכי יקר-ערך.
- **סף ומחיר מומלצים**: 2 נכסים חינם · ~₪249/שנה (שנתי בלבד בהתחלה כדי לפשט חיוב מתחדש).
- **ספק תשלום מומלץ**: ספק ישראלי מקומי (Cardcom ראשי / PayPlus / Grow) — בגלל חשבונית מס אוטומטית, מע"מ, וכרטיסי אשראי ישראליים. לא Stripe/Paddle (בעיות ILS + חשבונית נופלת עלינו ידנית).
- **עקרון קריטי**: לא לדרוס/לנעול נתונים קיימים. מי שכבר הזין מעל המכסה — הנכסים הקיימים נשארים נגישים לקריאה ועריכה; רק **הוספת נכס חדש** מעבר למכסה נחסמת.
- **אכיפה**: חייבת להיות בצד שרת (server action) + הגנת DB (trigger על insert ל-properties), לא רק UI.
- **סקיצת DB לעתיד**: טבלת `subscriptions` (user_id, plan, status, current_period_end, trial_end, provider, provider_*_id), RLS לקריאה עצמית בלבד, כתיבה דרך service_role (webhook).

### שיווק
- **הבחנה מרכזית**: קהל ה-GitHub (מפתחים) ≠ הלקוחות (בעלי דירות ישראלים). הרפו הציבורי הוא נכס מוניטין/portfolio, **לא** ערוץ גיוס משתמשים.
- **רפו ציבורי מול מונטיזציה**: כל עוד חינם — להשאיר ציבורי. ברגע שעוברים למסחרי — להפוך לפרטי או לעבור ל-source-available (רישיון non-commercial). לא להשאיר MIT ואז לנסות לגבות.
- **ערוצים אמיתיים** (לפי עדיפות): קבוצות פייסבוק ישראליות לבעלי דירות/משקיעים · קהילות וואטסאפ · תוכן+SEO בעברית ("חישוב הצמדה למדד", "מס שכר דירה") · TikTok/Reels · README כדף נחיתה · Product Hunt (משני).
- **בדיקת אבטחה (2026-06-29)**: הרפו נקי — אין דליפת מפתחות. `.env*` ב-gitignore, admin.ts קורא מ-`process.env`, README מכיל placeholders בלבד.

### עזרה עתידית שביקש המשתמש (נשמר להמשך)
שיפור README כדף נחיתה עם צילומי מסך · ניסוח פוסט/תוכן ראשון לקבוצות פייסבוק · מימוש המודל בתשלום כשתגיע ההחלטה.

---

## הצעד הבא (סשן-אייקונים 2026-07-15/16)

מעבר-האמוג'י הושלם ופרוס (ראה סעיף למעלה). לא נשאר פריט-חובה מהמעבר עצמו - כל הממצאים (Critical/Important) תוקנו, הממצאים ה-Minor שנותרו (תיעוד מלא ב-`.superpowers/sdd/progress.md` שהיה ב-worktree, לפני שנוקה) הם קוסמטיים-בלבד ולא נשמרו כ-TODO נפרד כי אף אחד מהם לא נחשב חוב-טכני משמעותי.

## הצעד הבא
1. ~~להריץ את ה-SQL למעלה ב-Supabase Dashboard~~ - **בוצע** (כל הטבלאות/עמודות קיימות; מיגרציות 2026-07-08 הורצו, ראו supabase/migrations/README.md)
2. ~~להגדיר `CRON_SECRET` ב-Vercel env vars~~ - **בוצע** ✅
3. ~~לבדוק PWA על נייד Android~~ - **בוצע 2026-07-09** ✅ (iOS לא ייבדק - אין מכשיר); ~~theme_color~~ - **נפתר** (אומת 2026-07-15: production מגיש `#f3edde` קלף, לא כחול ישן - תואם לרדיזיין)
4. ~~לשקול `supabase gen types typescript`~~ - **בוצע במלואו 2026-07-08** (כולל snake_case מקצה לקצה)
5. חוברת הסברים למשתמש - **spec נכתב ונדחף** (2026-07-16, `docs/superpowers/specs/2026-07-16-user-guide-design.md`): עמוד `/dashboard/help` פנימי (TSX), 9 פרקים (פתיחה+8 קטגוריות), כפתור-עזרה בסרגל עם קפיצה-חכמה לפי מסך. **טרם אושר סופית ע"י אמיר וטרם נכתבה תוכנית-ביצוע** - זו נקודת-ההמשך הבאה: לקרוא את ה-spec, לאשר/לתקן, ואז writing-plans.
