# SPEC.md - Rental Journal

> מצב נוכחי, החלטות, והצעד הבא. מתעדכן בכל session.

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
- **עיצוב (Design System)**: כל מסכי הדשבורד עברו לשפה אחידה — כרטיסי KPI בגרדיאנט עם טקסט לבן ואייקון רקע שקוף, פס accent אנכי לצד כל כותרת (ורוד=ראשי, ירוק=הכנסות, כתום=הוצאות/מס), ברים בגרדיאנט, ותיבות מצב כהות. צבעים: ירוק=הכנסות, אדום=הוצאות, כתום/ענבר=מס, ורוד=accent. פונט Rubik.

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
- **Vercel auto-deploy לא עובד** — יש להריץ `vercel --prod --yes` ידנית לאחר כל push (אין חיבור GitHub→Vercel פעיל)
- **PWA לא נבדקה על מכשיר אמיתי** — לבדוק התקנה ב-Chrome Android / Safari iOS
- **📨 טופס "אודות" → שמירת פניות ב-DB** — כיום טופס הדיווח (`/dashboard/about`) שולח דרך `mailto` בלבד. הצעה: טבלת `feedback` + `POST /api/feedback`.
- **📚 חוברת הסברים למשתמש** — ראה פירוט בסעיף למטה

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

## הצעד הבא
1. להריץ את ה-SQL למעלה ב-Supabase Dashboard
2. להגדיר `CRON_SECRET` ב-Vercel env vars
3. לבדוק PWA על נייד (Chrome Android / Safari iOS)
4. לשקול `supabase gen types typescript` להסיר שגיאות `any`
5. 📚 להכין חוברת הסברים (ראה סעיף למעלה)
