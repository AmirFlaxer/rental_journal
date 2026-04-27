# SPEC.md - Rental Journal

> מצב נוכחי, החלטות, והצעד הבא. מתעדכן בכל session.

## מצב נוכחי (2026-04-27)

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
- **הוצאות**: CRUD עם קטגוריות
- **חובות**: חישוב חובות אוטומטי כולל slots וירטואליים
- **דוחות**: הכנסות/הוצאות לפי חודש, סיכום לפי נכס
- **תזכורות**: CRUD + תזכורות שיקים אוטומטיות
- **הגדרות**: החלפת ספק AI (Gemini/Claude/Ollama)
- **PWA**: manifest, service worker, safe-area insets, standalone mode

### Stack
- Next.js 16 (App Router), TypeScript, Tailwind v4
- Supabase (PostgreSQL + Auth + Storage)
- AI: Gemini 2.5 Flash (ברירת מחדל) / Claude Opus 4.6 / Ollama qwen2.5:7b
- Vercel (hosting + cron)

### DB
- טבלאות: properties, tenants, leases, lease_documents, expenses, payments, tasks, property_assets, **index_rates** (חדש)
- leases: הוספו עמודות linkage_type, linkage_frequency, base_amount, base_date
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
| isLeaseCurrentlyActive() helper | חוזים ישנים נשארים status="active" — בדיקת תאריכים חובה |
| חוזים לא נמחקים/מעודכנים | שמורים כהיסטוריה משפטית לתמיד |
| Supabase Auth (לא NextAuth) | עובד אופליין בצד שרת, SSR תומך |
| index_rates בDB + Cron | מהיר יותר מ-API call בכל טעינה, שומר היסטוריה |
| מדד נדלן — נדחה | אין API נקי, יוזן ידנית בעתיד |
| Vercel Cron ב-16 לחודש | יום לאחר פרסום מדד הלמ"ס |

## בעיות ידועות / TODO פתוח
- ~~**ספק LLM נשמר ב-cookie בלבד**~~ — **נפתר**: נשמר ב-Supabase user_metadata + cookie כ-cache
- ~~**~50 שגיאות TypeScript `any`**~~ — **נפתר חלקית**: `src/types/database.ts` נוצר; 3 שורות שוליות נותרו
- ~~**חוזים ישנים ב-status=active משפיעים על תצוגות**~~ — **נפתר**: `isLeaseCurrentlyActive` מוחל על כל הדשבורד (payments, properties, add-payment, property detail, leases import)
- **PWA לא נבדקה על מכשיר אמיתי** — לבדוק התקנה ב-Chrome Android / Safari iOS
- **CRON_SECRET** — צריך להגדיר כ-env var ב-Vercel לפני שה-cron יעבוד

## לפני פריסה / שינוי DB
```sql
-- להריץ ב-Supabase SQL Editor:
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

## הצעד הבא
1. להריץ את ה-SQL למעלה ב-Supabase Dashboard
2. להגדיר `CRON_SECRET` ב-Vercel env vars
3. לבדוק PWA על נייד (Chrome Android / Safari iOS)
4. לשקול `supabase gen types typescript` להסיר שגיאות `any`
