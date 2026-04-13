# רשימת משימות לתיקון עתידי

נושאים שזוהו אבל לא תוקנו עדיין, ממוינים לפי סדר חשיבות.
תאריך עדכון: 2026-04-13.

---

## 🔴 עדיפות גבוהה — באגים שעלולים לפגוע בשימוש

### 1. `setState` סינכרוני בתוך `useEffect` ב-[date-input.tsx:42](src/components/date-input.tsx#L42)
```tsx
useEffect(() => {
  const iso = toIso(local.d, local.m, local.y);
  if (iso !== (value || "")) {
    setLocal(parseDate(value)); // ← cascading renders
  }
}, [value]);
```
**בעיה**: עלול לגרום ל-cascading renders ו-UI קופץ.
**פתרון מוצע**: חישוב ה-state הנגזר ישירות במקום ה-effect, או שימוש ב-`useMemo` / state-reducer.
**גילוי**: אזהרת ESLint `react-hooks/set-state-in-effect`.

### 2. ספק LLM נשמר ב-cookie בלבד
ספק ה-AI שנבחר בהגדרות נשמר כ-cookie `llm_provider`, ולא מסונכרן למסד הנתונים.
**בעיה**: אם מתחברים מדפדפן/מכשיר אחר, הספק יחזור ל-gemini (ברירת מחדל).
**פתרון מוצע**: לשמור את ההעדפה בעמודה `preferred_llm_provider` בטבלת המשתמשים ב-Supabase, ולקרוא ממנה בצד השרת.

### 3. שכפול חוזים "פעילים" — ניקוי נתונים מול מניעה
תיקנו את החישוב ב-[api/reports/route.ts](src/app/api/reports/route.ts) שיתעלם מחוזים ישנים שסטטוסם `active` אבל התאריך עבר.
**בעיה שנותרה**: למרות התיקון, עדיין יש בנתונים חוזים ישנים שלא סומנו כ"הסתיים". זה עלול לבלבל בתצוגות אחרות (למשל רשימת חוזים, לוח בקרה, התראות).
**פתרון מוצע**:
- סקריפט חד-פעמי שמסמן `status='ended'` אוטומטית לכל חוזה ש-`end_date < today`
- Cron / function שרץ פעם ביום ומעדכן סטטוסים

---

## 🟡 עדיפות בינונית — איכות קוד ותחזוקתיות

### 4. טיפוסי `any` ברחבי הקוד — ~50 שגיאות ESLint
שימוש רחב ב-`any` בעיקר בטיפוסי נתונים שמגיעים מ-Supabase (`Property`, `Lease`, `Payment`, `Expense`, `Tenant`, `Task`).
**קבצים עיקריים**:
- [src/app/dashboard/leases/import/page.tsx](src/app/dashboard/leases/import/page.tsx)
- [src/app/dashboard/reports/[propertyId]/page.tsx](src/app/dashboard/reports/[propertyId]/page.tsx)
- [src/app/api/reports/route.ts](src/app/api/reports/route.ts)
- [src/components/property-form.tsx](src/components/property-form.tsx)

**פתרון מוצע**: להגדיר קובץ `src/types/database.ts` עם טיפוסים מדויקים, או להשתמש ב-`supabase gen types typescript` ליצירה אוטומטית מהסכמה.

### 5. גרסת `extract-temp` — Ollama עם מודל ברירת מחדל לא-קיים
ב-[api/leases/extract-temp/route.ts:185](src/app/api/leases/extract-temp/route.ts#L185) ברירת המחדל היא `qwen3.5:9b` — tag שלא קיים רשמית ב-Ollama.
**פתרון מוצע**: לשנות ברירת מחדל למודל קיים (`qwen2.5:7b` או `gemma3:4b`), ולהוסיף בדיקה מקדימה עם `/api/tags` שמזהירה אם המודל לא מותקן.

### 6. ב-[api/reports/route.ts](src/app/api/reports/route.ts) — חישוב `monthlyRent` כפול
אחרי התיקון שלנו, יש שתי פונקציות filter על `p.leases` (פעם ל-`currentLeases` ופעם ל-`activeLeases`).
**פתרון מוצע**: חישוב יחיד עם shape אחד שמחזיר גם currentLeases וגם activeLeases במעבר אחד.

---

## 🟢 עדיפות נמוכה — קוסמטיקה וניקיון

### 7. תווי `"` לא-escaped ב-JSX (~4 מקומות)
`שכ"ד`, `סה"כ` — צריכים להיות `{'"'}` או `&quot;` ב-JSX לפי כללי ESLint.
**קבצים**:
- [src/app/dashboard/reports/page.tsx:279, 313](src/app/dashboard/reports/page.tsx#L279)
- [src/components/property-form.tsx:255](src/components/property-form.tsx#L255)

### 8. אזהרת Tailwind בזמן dev: `TT: undefined function: 21`
לא משפיע על פעולה אבל מעיד על פונקציית גופן שלא מוגדרת בקונפיג.
**פתרון מוצע**: לבדוק את [src/app/globals.css](src/app/globals.css) ו-[tailwind.config](tailwind.config.ts) אחר שימוש ב-`@apply` או `theme()` על מפתח שלא קיים.

### 9. עבודה בתהליך — PWA שלא הושלמה
קבצים לא-מקומיטים שמרמזים על פיצ'ר PWA שהתחיל ולא נגמר:
- `public/sw.js`
- `public/icon-192.png`, `public/icon-512.png`, `public/icon.svg`, `public/apple-touch-icon.png`
- `src/app/manifest.ts`

**צריך**:
- לוודא ש-`manifest.ts` מיוצא נכון ושה-service worker רשום ב-[src/app/layout.tsx](src/app/layout.tsx)
- לבדוק התקנה על מובייל ב-Chrome/Safari
- לקמיט ולדחוף ל-Vercel

### 10. קבצי ביניים מיותרים ב-git
- `build.log` — log build שלא היה אמור להיכנס לריפו, יש להוסיף ל-`.gitignore`
- `prisma.config.ts.bak` — קובץ backup, למחוק אם לא נחוץ

---

## 📋 בוצע לאחרונה (לתיעוד)

- ✅ **2026-04-13** — תיקון `Gemini: The model is currently experiencing high demand` — retry + fallback chain ([aa9bf46](https://github.com/AmirFlaxer/rental_journal/commit/aa9bf46))
- ✅ **2026-04-13** — תיקון "הכנסה לחודש" בדוחות: קיבוץ לפי `due_date`, חישוב "שכ"ד חודשי" לפי טווח תאריכים היום ([684759b](https://github.com/AmirFlaxer/rental_journal/commit/684759b))
- ✅ **2026-04-13** — עדכון README: תיאור מסך הגדרות כולל החלפת ספק AI ([d092f75](https://github.com/AmirFlaxer/rental_journal/commit/d092f75))
