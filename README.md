# ניהול נכסים — מערכת ניהול השכרת נכסים

אפליקציית SaaS לניהול נכסים להשכרה בעברית מלאה: נכסים, דיירים, חוזים, תקבולים, הוצאות, תזכורות ודוחות.

---

## תכונות עיקריות

| מסך | תיאור |
|-----|-------|
| **לוח בקרה** | סיכום כל הנכסים, הכנסה חודשית, תקבולים ממתינים, הוצאות |
| **נכסים** | ניהול נכסים עם פרטים מלאים (קומה, חניות, מרפסות, מחיר רכישה) |
| **חוזים** | רשימת חוזים עם סטטוס בתוקף/עתידי/פג. אופציה, הגנת סיום מוקדם, ייבוא מ-PDF |
| **תקבולים** | מעקב תשלומים לפי לוח החוזה, סימון שולם / שולם חלקי |
| **הוצאות** | מעקב הוצאות לפי קטגוריה, עריכה ומחיקה |
| **חובות** | דוח חובות פתוחים — תשלומים שמועדם חלף |
| **תזכורות** | חלוקה לרלוונטיות (≤30 יום) ועתידיות. תזכורות שק אוטומטיות מחוזים |
| **דוחות** | דוח רווח/הפסד לפי נכס ותקופה |
| **הגדרות** | עדכון שם מוצג וסיסמה |

### תכונות בולטות
- **ייבוא חוזה מ-PDF** — חילוץ נתוני שוכר ותנאי שכירות בעזרת AI (Anthropic Claude)
- **תזכורות שק אוטומטיות** — חוזה עם תשלום בשקים יוצר תזכורת יום לפני כל מועד פירעון
- **תשלום חלקי** — רישום סכום חלקי + סיבה, תצוגת יתרת חוב
- **השלמה אוטומטית לכתובות** — חיפוש עיר ורחוב מנתוני ממשלת ישראל (data.gov.il)
- **DateInput עברי** — בחירת תאריך יום/חודש/שנה בעברית

---

## טכנולוגיות

| שכבה | טכנולוגיה |
|------|-----------|
| Frontend | Next.js 16, React, TypeScript |
| עיצוב | Tailwind CSS, גופן Heebo |
| Backend | Next.js API Routes |
| מסד נתונים | Supabase (PostgreSQL) |
| אימות | Supabase Auth (SSR) |
| ולידציה | Zod |
| AI | Anthropic Claude API (חילוץ חוזים) |
| כתובות | Geoapify API + data.gov.il |

---

## התקנה

### דרישות מקדימות
- Node.js 18+
- חשבון [Supabase](https://supabase.com) (חינמי)

### 1. שכפול והתקנת תלויות
```bash
git clone https://github.com/AmirFlaxer/rental_journal.git
cd rental_journal
npm install
```

### 2. הגדרת Supabase
1. צור פרויקט חדש ב-[supabase.com](https://supabase.com)
2. פתח **SQL Editor** והרץ את הקובץ `supabase_schema.sql`
3. עבור ל-**Storage** וצור bucket בשם `lease-documents` (Public: false)

### 3. משתני סביבה
צור קובץ `.env.local` בתיקיית הפרויקט:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Anthropic AI — לחילוץ נתוני חוזה מ-PDF (אופציונלי)
ANTHROPIC_API_KEY=sk-ant-...

# Geoapify — השלמה אוטומטית לכתובות (אופציונלי)
NEXT_PUBLIC_GEOAPIFY_KEY=...
```

המפתחות נמצאים ב-Supabase Dashboard → Project Settings → API.

### 4. הפעלה
```bash
npm run dev
```
פתח [http://localhost:3000](http://localhost:3000) בדפדפן.

---

## מבנה הפרויקט

```
src/
├── app/
│   ├── api/
│   │   ├── auth/           # signin, signout, signup
│   │   ├── properties/     # CRUD נכסים
│   │   ├── leases/         # CRUD חוזים + upload + extract
│   │   ├── payments/       # CRUD תקבולים
│   │   ├── expenses/       # CRUD הוצאות
│   │   ├── tasks/          # CRUD תזכורות
│   │   ├── documents/      # מסמכי חוזה
│   │   ├── reports/        # דוחות
│   │   └── gov/            # proxy ל-data.gov.il (ערים/רחובות)
│   ├── auth/               # דפי כניסה והרשמה
│   ├── dashboard/
│   │   ├── properties/     # רשימה + פרטי נכס
│   │   ├── leases/         # רשימה + עריכה + ייבוא
│   │   ├── payments/       # תקבולים
│   │   ├── expenses/       # הוצאות
│   │   ├── debts/          # דוח חובות
│   │   ├── tasks/          # תזכורות
│   │   ├── reports/        # דוחות
│   │   └── settings/       # הגדרות חשבון
│   └── page.tsx            # דף הבית
├── components/
│   ├── address-autocomplete.tsx  # חיפוש כתובת עם gov API
│   ├── date-input.tsx            # DateInput עברי
│   └── property-form.tsx         # טופס נכס
├── lib/
│   ├── supabase/           # server / client / admin / case helpers
│   └── validations.ts      # Zod schemas
├── auth.ts                 # auth() helper
└── proxy.ts                # הגנת /dashboard (Next.js 16)
```

---

## סכמת מסד הנתונים

| טבלה | תיאור |
|------|-------|
| `properties` | נכסים להשכרה |
| `tenants` | דיירים |
| `leases` | חוזי שכירות |
| `payments` | תקבולים ותשלומים |
| `expenses` | הוצאות נכס |
| `tasks` | תזכורות ומשימות |
| `lease_documents` | מסמכי חוזה (metadata) |

הסכמה המלאה כולל RLS policies נמצאת ב-`supabase_schema.sql`.

---

## API Endpoints עיקריים

```
POST   /api/auth/signup
POST   /api/auth/signin
POST   /api/auth/signout

GET    /api/properties
POST   /api/properties
PUT    /api/properties/[id]
DELETE /api/properties/[id]

GET    /api/leases
POST   /api/leases
PUT    /api/leases/[id]
POST   /api/leases/[id]/upload
POST   /api/leases/extract-temp

GET    /api/payments
POST   /api/payments
PUT    /api/payments/[id]
DELETE /api/payments/[id]

GET    /api/expenses
POST   /api/expenses
PUT    /api/expenses/[id]
DELETE /api/expenses/[id]

GET    /api/tasks
POST   /api/tasks
PUT    /api/tasks/[id]
DELETE /api/tasks/[id]
```

---

## פריסה ל-Vercel

1. העלה קוד ל-GitHub
2. ייבא פרויקט ב-[Vercel](https://vercel.com)
3. הוסף את משתני הסביבה מ-`.env.local`
4. לחץ Deploy

---

## אבטחה

- כל API route מאמת את זהות המשתמש דרך Supabase Auth
- RLS (Row Level Security) — כל משתמש רואה רק את הנתונים שלו
- `proxy.ts` מגן על כל נתיבי `/dashboard` בצד השרת
- משתני סביבה לכל מפתח רגיש

---

## רישיון

MIT
