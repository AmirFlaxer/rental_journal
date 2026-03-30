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
- **ייבוא חוזה מ-PDF/DOCX** — חילוץ נתוני שוכר ותנאי שכירות בעזרת AI (Gemini / Anthropic / Ollama)
- **מניעת כפילות חוזים** — לא ניתן לפתוח שני חוזים פעילים לאותו נכס באותה תקופה
- **תזכורות שק אוטומטיות** — חוזה עם תשלום בשקים יוצר תזכורת יום לפני כל מועד פירעון
- **תזכורות חוזרות** — יצירת סדרת תזכורות חודשיות/רבעוניות/שנתיות בפעולה אחת
- **תשלום חלקי** — רישום סכום חלקי + סיבה, תצוגת יתרת חוב
- **השלמה אוטומטית לכתובות** — חיפוש עיר ורחוב מנתוני ממשלת ישראל (data.gov.il)
- **DateInput עברי** — בחירת תאריך יום/חודש/שנה בעברית
- **עיצוב כהה מלא** — ממשק משתמש כהה מותאם לקריאות גבוהה

---

## טכנולוגיות

| שכבה | טכנולוגיה |
|------|-----------|
| Frontend | Next.js 16, React, TypeScript |
| עיצוב | Tailwind CSS, גופנים Heebo / Outfit / Playfair |
| Backend | Next.js API Routes |
| מסד נתונים | Supabase (PostgreSQL) |
| אימות | NextAuth.js + Supabase |
| ולידציה | Zod |
| AI — ייבוא חוזים | Google Gemini Flash (ברירת מחדל, חינמי) / Anthropic Claude / Ollama |
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

# LLM Provider: "gemini" (ברירת מחדל, חינמי) | "anthropic" | "ollama"
LLM_PROVIDER=gemini

# Google Gemini Flash — חינם: 1,500 בקשות/יום
# קבל מפתח: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.5-flash

# Anthropic Claude — אופציונלי (עלות לפי שימוש)
ANTHROPIC_API_KEY=sk-ant-...

# Ollama — אופציונלי, מקומי ללא עלות (https://ollama.com)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Geoapify — השלמה אוטומטית לכתובות (אופציונלי, 3,000 בקשות/יום בחינם)
NEXT_PUBLIC_GEOAPIFY_KEY=...
```

המפתחות נמצאים ב-Supabase Dashboard → Project Settings → API.

### 4. הפעלה
```bash
npm run dev
```
פתח [http://localhost:3000](http://localhost:3000) בדפדפן.

---

## ספקי AI לייבוא חוזים

המערכת תומכת בשלושה ספקים — ניתן לעבור ביניהם דרך `LLM_PROVIDER` ב-`.env.local`:

| ספק | עלות | פרטיות | מהירות | הערות |
|-----|------|---------|--------|-------|
| **Gemini Flash** | חינם (1,500/יום) | Google מעבדת | מהיר | ברירת מחדל מומלצת |
| **Anthropic Claude** | בתשלום | Anthropic מעבדת | מהיר | איכות גבוהה |
| **Ollama** | חינם לנצח | מקומי לחלוטין | תלוי חומרה | הכי פרטי |

---

## אבטחת מידע ופרטיות

### הגנות מובנות
- כל API route מאמת את זהות המשתמש דרך NextAuth
- **RLS (Row Level Security)** — כל משתמש רואה רק את הנתונים שלו ב-Supabase
- `middleware.ts` מגן על כל נתיבי `/dashboard` בצד השרת
- **מניעת כפילות חוזים** — validation בצד השרת מונע חוזים חופפים לאותו נכס
- כל משתני הסביבה (מפתחות API) נשמרים ב-`.env.local` — מוגן מ-git

### נתונים שנשלחים ל-AI
בעת ייבוא חוזה, טקסט החוזה נשלח לספק ה-AI שנבחר. החוזה עשוי להכיל:
- שמות דיירים, מספרי ת.ז., טלפונים
- כתובת הנכס
- פרטי בנק (מספרי חשבון לשיקים)

**המלצות לפי רמת פרטיות:**

| רמה | המלצה |
|-----|--------|
| 🔴 מקסימלית | השתמש ב-**Ollama** — הנתונים לא עוזבים את המחשב |
| 🟡 גבוהה | השתמש ב-**Gemini** עם [כיבוי שמירת פעילות](https://myactivity.google.com/product/gemini) |
| 🟢 סטנדרטית | ברירת מחדל (Gemini) — Google API לא משתמש בנתונים לאימון לפי תנאי השירות |

### הגדרת פרטיות מומלצת עבור Gemini
1. כנס ל-[myactivity.google.com/product/gemini](https://myactivity.google.com/product/gemini)
2. תחת **"שמירת הפעילות"** — לחץ **"השבתה"**
3. זה מבטיח שהשיחות לא נשמרות ולא משמשות לאימון מודלים

---

## מבנה הפרויקט

```
src/
├── app/
│   ├── api/
│   │   ├── auth/           # signin, signout, signup
│   │   ├── properties/     # CRUD נכסים
│   │   ├── leases/         # CRUD חוזים + upload + extract (AI)
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
└── middleware.ts           # הגנת /dashboard (Next.js 16)
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
POST   /api/leases/extract-temp     # ייבוא חוזה עם AI (SSE streaming)

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

> **שים לב:** Ollama אינו זמין בפריסת Vercel (דורש מחשב מקומי). השתמש ב-Gemini או Anthropic בפרודקשן.

---

## רישיון

MIT
