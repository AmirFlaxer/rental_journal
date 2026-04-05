import puppeteer from "puppeteer";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: "Arial", "David", sans-serif;
    font-size: 11pt;
    line-height: 1.7;
    color: #111;
    direction: rtl;
    padding: 20mm 18mm;
  }
  h1 {
    text-align: center;
    font-size: 16pt;
    font-weight: bold;
    margin-bottom: 4px;
    letter-spacing: 1px;
  }
  .subtitle {
    text-align: center;
    font-size: 10pt;
    color: #555;
    margin-bottom: 24px;
  }
  .divider {
    border: none;
    border-top: 2px solid #222;
    margin: 14px 0;
  }
  .divider-light {
    border: none;
    border-top: 1px solid #bbb;
    margin: 10px 0;
  }
  section {
    margin-bottom: 18px;
  }
  h2 {
    font-size: 12pt;
    font-weight: bold;
    background: #f0f0f0;
    padding: 4px 8px;
    border-right: 4px solid #333;
    margin-bottom: 8px;
  }
  .grid2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 24px;
  }
  .field {
    display: flex;
    gap: 6px;
    padding: 2px 0;
  }
  .field .label {
    font-weight: bold;
    min-width: 110px;
    color: #333;
  }
  p { margin-bottom: 6px; }
  .clause {
    margin-bottom: 6px;
    padding-right: 18px;
    text-indent: -18px;
  }
  .clause::before {
    font-weight: bold;
  }
  .signatures {
    margin-top: 40px;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 20px;
    text-align: center;
  }
  .sig-box {
    border-top: 1px solid #444;
    padding-top: 8px;
    font-size: 10pt;
  }
  .highlight {
    background: #fffbe6;
    border: 1px solid #e0c000;
    padding: 8px 12px;
    border-radius: 4px;
    margin: 8px 0;
  }
  @media print {
    body { padding: 0; }
    .page-break { page-break-before: always; }
  }
</style>
</head>
<body>

<h1>חוזה שכירות מגורים</h1>
<div class="subtitle">מס׳ חוזה: RJ-2025-0047 &nbsp;|&nbsp; תאריך עריכה: 15 ביוני 2025</div>
<hr class="divider">

<section>
  <h2>א. פרטי הצדדים</h2>
  <div class="grid2">
    <div>
      <strong>המשכיר:</strong>
      <div class="field"><span class="label">שם מלא:</span> יוסף גולדברג</div>
      <div class="field"><span class="label">ת.ז.:</span> 123456789</div>
      <div class="field"><span class="label">כתובת:</span> רחוב ביאליק 7, רמת גן</div>
      <div class="field"><span class="label">טלפון:</span> 050-123 4567</div>
      <div class="field"><span class="label">דוא"ל:</span> yosef.goldberg@gmail.com</div>
    </div>
    <div>
      <strong>השוכר הראשי:</strong>
      <div class="field"><span class="label">שם מלא:</span> דניאל כהן</div>
      <div class="field"><span class="label">ת.ז.:</span> 207654321</div>
      <div class="field"><span class="label">כתובת נוכחית:</span> רחוב אלנבי 18, תל אביב</div>
      <div class="field"><span class="label">טלפון:</span> 052-345 6789</div>
      <div class="field"><span class="label">דוא"ל:</span> daniel.cohen@gmail.com</div>
    </div>
  </div>
  <hr class="divider-light">
  <div>
    <strong>השוכרת השנייה (בת הזוג):</strong>
    <div class="grid2">
      <div>
        <div class="field"><span class="label">שם מלא:</span> מיכל לוי</div>
        <div class="field"><span class="label">ת.ז.:</span> 312765432</div>
      </div>
      <div>
        <div class="field"><span class="label">טלפון:</span> 054-987 6543</div>
        <div class="field"><span class="label">דוא"ל:</span> michal.levi@gmail.com</div>
      </div>
    </div>
    <p style="font-size:10pt;color:#555">הוסכם כי שני השוכרים ביחד ולחוד אחראים לכל התחייבויות חוזה זה.</p>
  </div>
</section>

<section>
  <h2>ב. פרטי הנכס</h2>
  <div class="grid2">
    <div>
      <div class="field"><span class="label">כתובת:</span> רחוב הרצל 42</div>
      <div class="field"><span class="label">עיר:</span> תל אביב-יפו</div>
      <div class="field"><span class="label">מיקוד:</span> 6578903</div>
      <div class="field"><span class="label">קומה:</span> 3</div>
      <div class="field"><span class="label">מס׳ דירה:</span> 8</div>
    </div>
    <div>
      <div class="field"><span class="label">גודל:</span> 78 מ"ר</div>
      <div class="field"><span class="label">חדרים:</span> 3.5</div>
      <div class="field"><span class="label">מרפסות:</span> 1</div>
      <div class="field"><span class="label">חניה:</span> מקום חניה 1</div>
      <div class="field"><span class="label">מחסן:</span> מחסן 3 מ"ר</div>
    </div>
  </div>
  <p style="margin-top:8px">הנכס כולל: ריצוף שיש, מטבח מאובזר, מזגן, דוד שמש, ממ"ד. הנכס נמסר מרוהט חלקית בהתאם לפרוטוקול מסירה חתום בנפרד.</p>
</section>

<section>
  <h2>ג. תקופת השכירות ודמי שכירות</h2>
  <div class="grid2">
    <div>
      <div class="field"><span class="label">תחילת שכירות:</span> 01 ביולי 2025</div>
      <div class="field"><span class="label">סיום שכירות:</span> 30 ביוני 2026</div>
      <div class="field"><span class="label">משך:</span> 12 חודשים</div>
    </div>
    <div>
      <div class="field"><span class="label">דמי שכירות:</span> <strong>₪6,500 לחודש</strong></div>
      <div class="field"><span class="label">מועד תשלום:</span> ה-1 בכל חודש</div>
      <div class="field"><span class="label">פיקדון:</span> ₪19,500 (3 חודשים)</div>
    </div>
  </div>

  <div class="highlight" style="margin-top:10px">
    <strong>תקופת אופציה:</strong> לשוכרים זכות אופציה להארכת החוזה ב-12 חודשים נוספים,
    מ-01 ביולי 2026 עד 30 ביוני 2027, בדמי שכירות של <strong>₪6,800 לחודש</strong> (עלייה של 4.6%).
    השוכרים יודיעו למשכיר בכתב על מימוש האופציה לא יאוחר מ-<strong>90 יום</strong> לפני תום תקופת השכירות הראשונה.
  </div>
</section>

<section>
  <h2>ד. אמצעי תשלום</h2>
  <p>דמי השכירות ישולמו באמצעות <strong>שיקים</strong>, כדלקמן:</p>
  <p class="clause">1. &nbsp;בעת חתימת חוזה זה ימסרו השוכרים למשכיר <strong>12 שיקים דחויים</strong> מראש, כל שיק על סך ₪6,500, לתאריכי הפרעון הרלוונטיים.</p>
  <p class="clause">2. &nbsp;השיקים יהיו משוכים מחשבון בנק הפועלים, סניף 532, מספר חשבון 123456.</p>
  <p class="clause">3. &nbsp;החזרת שיק מכל סיבה שהיא תחייב את השוכרים בקנס בסך ₪500 וריבית פיגורים בשיעור 3% לחודש על הסכום שלא שולם.</p>
</section>

<section>
  <h2>ה. פיקדון ובטחונות</h2>
  <p class="clause">1. &nbsp;השוכרים ישלמו למשכיר פיקדון בסך <strong>₪19,500</strong> (שלושה חודשי שכירות), אשר ישמש ערובה לקיום התחייבויות השוכרים.</p>
  <p class="clause">2. &nbsp;הפיקדון יוחזר לשוכרים בתוך 30 יום ממועד פינוי הנכס ומסירת המפתחות, בניכוי כל חוב ו/או נזק שייגרם לנכס.</p>
</section>

<section>
  <h2>ו. תנאים כלליים</h2>
  <p class="clause">1. &nbsp;<strong>חשבונות:</strong> השוכרים ישלמו ישירות לספקים את חשבונות החשמל, הגז, המים והארנונה מיום קבלת הנכס ועד יום החזרתו.</p>
  <p class="clause">2. &nbsp;<strong>שימוש בנכס:</strong> הנכס ישמש למגורים בלבד. אסור לשוכרים להשכיר את הנכס בשכירות משנה ללא הסכמה כתובה מראש מהמשכיר.</p>
  <p class="clause">3. &nbsp;<strong>אחזקה:</strong> השוכרים יאחזקו את הנכס במצב תקין ויבצעו תיקונים שוטפים עד ₪500 לתקלה. תיקונים מעל סכום זה — באחריות המשכיר.</p>
  <p class="clause">4. &nbsp;<strong>עישון:</strong> אסור לעשן בתוך הנכס ובמרפסת.</p>
  <p class="clause">5. &nbsp;<strong>בעלי חיים:</strong> הכנסת בעלי חיים מותנית בהסכמת המשכיר בכתב.</p>
  <p class="clause">6. &nbsp;<strong>שינויים בנכס:</strong> אין לבצע שינויים מבניים ללא אישור כתוב מראש. בתום השכירות יחזיר השוכר את הנכס למצבו המקורי.</p>
  <p class="clause">7. &nbsp;<strong>ביטוח:</strong> השוכרים יבטחו את תכולתם בביטוח תכולה לאורך כל תקופת השכירות.</p>
</section>

<section>
  <h2>ז. פינוי מוקדם</h2>
  <p class="clause">1. &nbsp;<strong>עזיבה מוקדמת מצד השוכרים:</strong> השוכרים רשאים לסיים את החוזה לפני תום תקופתו בהודעה כתובה של 90 יום מראש, ובתנאי שישלמו את דמי השכירות עד למציאת שוכר חלופי מתאים.</p>
  <p class="clause">2. &nbsp;<strong>פינוי מצד המשכיר:</strong> המשכיר יהיה רשאי לדרוש פינוי מוקדם רק בהפרה יסודית של חוזה זה, ובהודעה של 90 יום מראש.</p>
</section>

<div class="page-break"></div>

<section>
  <h2>ח. הצהרות הצדדים</h2>
  <p>הצדדים מצהירים כי קראו הבינו ואישרו את כל תנאי חוזה זה, וכי הם פועלים מרצונם החופשי ללא לחץ.</p>
  <br>
  <p>נכתב ונחתם ב<strong>תל אביב</strong>, ביום <strong>15 ביוני 2025</strong>.</p>
</section>

<div class="signatures">
  <div class="sig-box">
    <p><strong>המשכיר</strong></p>
    <p>יוסף גולדברג</p>
    <p style="color:#aaa;margin-top:30px">חתימה</p>
  </div>
  <div class="sig-box">
    <p><strong>השוכר הראשי</strong></p>
    <p>דניאל כהן</p>
    <p style="color:#aaa;margin-top:30px">חתימה</p>
  </div>
  <div class="sig-box">
    <p><strong>השוכרת השנייה</strong></p>
    <p>מיכל לוי</p>
    <p style="color:#aaa;margin-top:30px">חתימה</p>
  </div>
</div>

</body>
</html>`;

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle0" });
const pdfBuffer = await page.pdf({
  format: "A4",
  printBackground: true,
  margin: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" },
});
await browser.close();

const outPath = path.join(__dirname, "../public/חוזה_שכירות_הרצל42.pdf");
writeFileSync(outPath, pdfBuffer);
console.log("PDF created:", outPath);
