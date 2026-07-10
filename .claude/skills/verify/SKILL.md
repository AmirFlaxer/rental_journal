---
name: verify
description: אימות מקצה לקצה של rental_journal - שערים סטטיים + בדיקה ויזואלית ב-Playwright (חובה לפני commit של שינוי UI). Use when verifying changes work, before committing nontrivial changes, or when asked to run/exercise the app.
---

# אימות rental_journal

## שלב 1 - שערים סטטיים (תמיד)

```bash
npx tsc --noEmit && npm run lint && npx vitest run && npm run build
```

הכל חייב להיות ירוק. build עלול להיכשל על פורט תפוס אם שרת dev רץ - זה לא כשל אמיתי.

## שלב 2 - בדיקה ויזואלית ב-Playwright (חובה לכל שינוי UI)

לקח מ-2026-07-10: שערים סטטיים ירוקים לא מספיקים - באג "בעוד NaN ימים" (93 פריטים בדורש-טיפול) עבר tsc/lint/vitest ונתפס רק בצילום מסך של הדשבורד עם נתונים אמיתיים.

1. להריץ שרת dev ברקע: `npm run dev` (פורט 3000).
2. לנווט עם כלי ה-Playwright MCP (`browser_navigate`) אל:
   - `http://localhost:3000/` (דף נחיתה)
   - `http://localhost:3000/auth/signin` - שים לב: אם פרופיל הדפדפן מחובר (session שמור של Supabase), תופנה אוטומטית ל-/dashboard - זה מצוין, כך בודקים את הדשבורד עם נתונים אמיתיים.
   - `http://localhost:3000/dashboard` + הדפים ששונו (properties, leases, payments, debts, reports, tasks, settings).
3. לכל דף: `browser_take_screenshot` (fullPage) ואז **לקרוא את הצילום** ולחפש:
   - NaN / undefined / null בטקסט מוצג
   - מספרים עם שברים לא מעוגלים (₪7,087.5)
   - תאריכים "הפוכים" או טלפונים שבורים (בעיות RTL - לוודא עטיפת .num-ltr)
   - טקסט בהיר על רקע בהיר / כהה על כהה (שאריות ערכת צבעים)
   - כרטיסים עם מספר פריטים לא סביר (רמז לסינון שבור)
4. לבדוק את קונסולת הדפדפן (Events בפלט הניווט) - 0 שגיאות.

## שלב 3 - בדיקה במכשיר אמיתי (אחרי deploy, לשינויי UI גדולים)

מכשיר האנדרואיד של אמיר (OnePlus CPH2653) מחובר ב-adb:

```bash
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"
"$ADB" devices    # לוודא 3694e208 ברשימה
"$ADB" -s 3694e208 shell am start -a android.intent.action.VIEW -d "https://rentaljournal.vercel.app/dashboard" com.android.chrome
sleep 5
"$ADB" -s 3694e208 exec-out screencap -p > <scratchpad>/device.png
```

לקרוא את הצילום ולוודא רינדור תקין (כולל צבע פס הסטטוס = theme_color).

## ניקיון

- לעצור את שרת ה-dev שהופעל.
- צילומי playwright נכתבים לשורש הריפו / .playwright-mcp - לא לקמפל אותם (למחוק או להשאיר untracked).
