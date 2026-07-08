# מדריך: supabase gen types (סשן ייעודי עתידי)

מטרה: להחליף את הטיפוסים הידניים ב-`src/types/database.ts` בטיפוסים שנוצרים אוטומטית מסכימת ה-DB, ובהמשך לבטל את המרת snake/camel הידנית (`src/lib/supabase/case.ts`). זה מסיר מקור-באגים שקט (טיפוסים שנסחפים מה-DB).

**חשוב:** זו עבודה פולשנית שנוגעת כמעט בכל route ודף. לא לבצע יחד עם פיצ'רים. סשן נקי ומבודד בלבד.

## שלב 1 - ליצור את קובץ הטיפוסים (פעם ראשונה + אחרי כל שינוי סכימה)

הפרויקט כבר כולל script. צריך רק להתחבר ל-Supabase פעם אחת:

1. התחבר: `npx --yes supabase@latest login` (ייפתח דפדפן, מאשרים).
2. הרץ: `npm run gen:types`
   - זה מייצר את `src/types/supabase.ts` מהסכימה של פרויקט `waizojlaygcjpqgluhea`.

חלופה בלי login (אם יש לך את ה-DB connection string מ-Supabase Dashboard, Settings, Database):
```
npx --yes supabase@latest gen types typescript --db-url "<CONNECTION_STRING>" --schema public > src/types/supabase.ts
```
(אל תשמור את ה-connection string ב-git.)

## שלב 2 - הרפקטור עצמו (הסשן הייעודי)

לפי סדר, עם typecheck+build אחרי כל צעד:

1. **לאמץ את הטיפוסים המיוצרים** - להגדיר aliases נוחים מעל `Database` (למשל `type Payment = Database["public"]["Tables"]["payments"]["Row"]`), ולהחליף בהדרגה את ההגדרות הידניות ב-`src/types/database.ts` בהפניות לאלה.
2. **להחליט על snake vs camel** - הטיפוסים המיוצרים הם snake_case. שתי אפשרויות:
   - א. לתקנן snake_case מקצה-לקצה ולבטל את `camelKeys`/`snakeKeys` (מפתח Kotlin רגיל ל-snake ב-JSON) - הכי נקי, אבל נוגע בכל דף.
   - ב. להשאיר את ההמרה ולהוסיף שכבת mapping דקה - פחות שינוי, פחות רווח.
   - המלצה: א', אבל רק בסשן ייעודי עם רשת בדיקות.
3. **לעדכן צרכנים** - לתקן את כל ה-routes והדפים לפי הבחירה, בגלים לפי בעלות-קבצים (כמו שעשינו בשדרוגים הקודמים).
4. **בדיקות + סקירת Opus + פריסה** - כרגיל.

## הערות

- כל שינוי סכימה עתידי: להריץ שוב `npm run gen:types` כדי לסנכרן את הטיפוסים.
- project ref: `waizojlaygcjpqgluhea` (מוטמע ב-script).
- הרוויזיה הארכיטקטונית דירגה את המשימה "בינוני, לא דחוף" - ערך תחזוקתי, לא ערך משתמש מיידי.
