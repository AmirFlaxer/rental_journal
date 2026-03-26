# יומן נכסים - מערכת ניהול השכרת נכסים

אפליקציית SaaS לניהול נכסים להשכרה, דיירים, חוזים, הוצאות ודוחות כספיים.

## סקירה כללית

אפליקציית Next.js לבעלי נכסים ומנהלי נדל"ן לניהול יעיל של נכסים מרובים:

- **ניהול נכסים** - שמירת פרטי הנכסים כולל קומה, מספר דירה, מרפסות ושטח
- **ניהול דיירים** - מעקב אחר פרטי דיירים, פרטי קשר ותיעוד
- **ניהול חוזים** - יצירת חוזי שכירות ומעקב חידושים
- **מעקב תשלומים** - מעקב אחר תשלומי שכר דירה, פיקדונות ועסקאות כספיות
- **ניהול הוצאות** - מעקב עלויות תחזוקה, ביטוח, מיסים והוצאות נוספות
- **דוחות כספיים** - דוחות רווח/הפסד ותזרים מזומנים
- **ניהול משימות** - תזכורות לחידוש חוזים, ביטוח ותחזוקה
- **תמיכה מרובת משתמשים** - כל משתמש מנהל את נכסיו בסביבה מאובטחת

## טכנולוגיות

- **Frontend**: Next.js עם React ו-TypeScript
- **Backend**: Next.js API Routes
- **מסד נתונים**: SQLite עם Prisma ORM
- **אימות**: NextAuth.js v4
- **עיצוב**: Tailwind CSS
- **ולידציה**: Zod
- **גופן**: Heebo (עברית + לטינית)

## דרישות מקדימות

- Node.js 18+
- npm

## התקנה

1. **כניסה לתיקיית הפרויקט**
   ```bash
   cd rental_journal
   ```

2. **התקנת תלויות**
   ```bash
   npm install
   ```

3. **הגדרת משתני סביבה** - צור קובץ `.env.local` בתיקיית השורש:
   ```
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="הכנס-סוד-אקראי-באורך-32-תווים-לפחות"
   ```

   ליצירת סוד אקראי:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

4. **הרצת מיגרציות מסד נתונים**
   ```bash
   npx prisma migrate dev
   ```

5. **הפעלת שרת הפיתוח**
   ```bash
   npm run dev
   ```

   פתח [http://localhost:3000](http://localhost:3000) בדפדפן.

## התחלה מהירה

1. **דף הבית** - בקר ב-localhost:3000 ובחר הרשמה או כניסה
2. **יצירת חשבון** - הירשם עם אימייל וסיסמה
3. **לוח בקרה** - תועבר אוטומטית לדשבורד
4. **הוספת נכס** - לחץ "נכס חדש" להתחלת ניהול הנכסים שלך
5. **ניהול** - הוסף דיירים, צור חוזים, עקוב אחר תשלומים והוצאות

## מבנה הפרויקט

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # אימות
│   │   ├── properties/   # ניהול נכסים
│   │   └── postal-code/  # חיפוש מיקוד
│   ├── auth/             # דפי כניסה והרשמה
│   ├── dashboard/        # דפי לוח הבקרה (מוגנים)
│   ├── page.tsx          # דף הבית
│   └── layout.tsx        # Layout עם RTL עברית
├── components/           # רכיבי React לשימוש חוזר
│   └── property-form.tsx # טופס נכס עם השלמה אוטומטית לישובים
├── data/
│   └── israeli-settlements.ts  # רשימת ישובים בישראל
├── lib/
│   ├── prisma.ts         # Prisma client singleton
│   └── validations.ts    # Zod schemas
└── auth.ts               # הגדרות NextAuth.js
prisma/
├── schema.prisma         # סכמת מסד הנתונים
└── migrations/           # מיגרציות
```

## סכמת מסד הנתונים

| טבלה | תיאור |
|------|-------|
| `users` | חשבונות משתמשים ואימות |
| `properties` | פרטי נכסים להשכרה |
| `tenants` | פרטי דיירים |
| `leases` | חוזי שכירות |
| `payments` | תשלומים (שכ"ד, פיקדונות) |
| `expenses` | הוצאות נכס |
| `tasks` | תזכורות ומשימות |

## API Endpoints

### אימות
- `POST /api/auth/signup` - יצירת חשבון חדש
- `POST /api/auth/[...nextauth]` - NextAuth endpoints

### נכסים
- `GET /api/properties` - קבלת כל נכסי המשתמש
- `POST /api/properties` - יצירת נכס חדש
- `GET /api/properties/[id]` - קבלת פרטי נכס
- `PUT /api/properties/[id]` - עדכון נכס
- `DELETE /api/properties/[id]` - מחיקת נכס

### כלים
- `GET /api/postal-code?city=...&street=...` - חיפוש מיקוד

## פקודות פיתוח

```bash
# הפעלת שרת פיתוח
npm run dev

# בנייה לפרודקשן
npm run build

# הפעלת שרת פרודקשן
npm start

# Prisma Studio (ממשק גרפי למסד נתונים)
npx prisma studio

# יצירת Prisma types לאחר שינוי סכמה
npx prisma generate

# הרצת מיגרציה חדשה
npx prisma migrate dev --name <שם-המיגרציה>
```

## פתרון בעיות

### פורט 3000 תפוס (Windows)
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

### שגיאת חיבור למסד נתונים
```bash
npx prisma db push
npx prisma generate
```

### אימות לא עובד
- נקה עוגיות דפדפן (Ctrl+Shift+Delete)
- ודא שמשתנה `NEXTAUTH_SECRET` מוגדר (מינימום 32 תווים)
- ודא שמשתנה `NEXTAUTH_URL` תואם לסביבה

### Prisma DLL נעול (Windows)
עצור את שרת הפיתוח ואז הרץ:
```bash
npx prisma generate
```

## אבטחה

- ✅ סיסמאות מוצפנות עם bcrypt
- ✅ אימות עם NextAuth.js ו-JWT
- ✅ כל API route מאמת את המשתמש
- ✅ כל משתמש רואה רק את הנתונים שלו
- ✅ משתני סביבה לנתונים רגישים
- ⚠️ פרודקשן: השתמש תמיד ב-HTTPS
- ⚠️ פרודקשן: הגדר `NEXTAUTH_SECRET` חזק
- ⚠️ פרודקשן: הגדר `NEXTAUTH_URL` נכון

## פריסה

### פריסה ל-Vercel (מומלץ)

1. העלה קוד ל-GitHub
2. ייבא פרויקט ב-Vercel dashboard
3. הוסף משתני סביבה:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (ה-URL של האפליקציה הפרוסה)
4. לחץ Deploy

## רישיון

MIT
