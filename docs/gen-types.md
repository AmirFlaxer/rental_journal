# מדריך: supabase gen types

מטרה: הטיפוסים ב-`src/types/database.ts` נגזרים מהטיפוסים שנוצרים אוטומטית מסכימת ה-DB (`src/types/supabase.ts`), במקום טיפוסים ידניים שיכולים לסחוף מה-DB בלי אזהרה.

## שלב 1 - יצירת קובץ הטיפוסים (פעם ראשונה + אחרי כל שינוי סכימה)

הפרויקט כולל script. צריך רק להתחבר ל-Supabase פעם אחת:

1. התחבר: `npx --yes supabase@latest login` (ייפתח דפדפן, מאשרים).
2. הרץ: `npm run gen:types`
   - זה מייצר את `src/types/supabase.ts` מהסכימה של פרויקט `waizojlaygcjpqgluhea`.

חלופה בלי login (אם יש לך את ה-DB connection string מ-Supabase Dashboard, Settings, Database):
```
npx --yes supabase@latest gen types typescript --db-url "<CONNECTION_STRING>" --schema public > src/types/supabase.ts
```
(אל תשמור את ה-connection string ב-git.)

## שלב 2 - הרפקטור ל-snake_case מקצה-לקצה - בוצע (2026-07-08)

הפרויקט תוקנן ל-snake_case מקצה-לקצה: DB, API routes ודפי ה-UI כולם משתמשים באותם שמות שדות. שכבת ההמרה הידנית `camelKeys`/`snakeKeys` (לשעבר `src/lib/supabase/case.ts`) הוסרה לגמרי. `tsc`, `vitest`, `lint` ו-`build` ירוקים.

שני איים מכוונים של camelCase שנשארו בכוונה (לא שאריות):

1. **חילוץ AI מסמכים** - `/api/documents/[id]/extract` ו-`/api/leases/extract-temp` מחזירים JSON של חילוץ בפורמט camelCase (`firstName`, `startDate`, `monthlyRent` וכו'). דפי `leases/import` ו-`leases/[id]/edit` קוראים את זה כ-camelCase ומבצעים המרה ל-snake_case בגבול ה-POST, כשהנתונים נשמרים ב-DB.
2. **נתיב סיום חוזה מוקדם** (`/api/leases/[id]/terminate`) - שדות התגובה `noticeMonths`/`effectiveDate` הם ערכים מחושבים (לא עמודות DB); שני הצדדים (route והצרכן) תואמים.

## הערות

- כל שינוי סכימה עתידי: להריץ שוב `npm run gen:types`, ואז `npx tsc --noEmit` לוודא שאין שאריות טיפוסים.
- project ref: `waizojlaygcjpqgluhea` (מוטמע ב-script).
