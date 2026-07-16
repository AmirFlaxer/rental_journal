// src/app/dashboard/help/page.tsx
import Link from "next/link";
import { Icon } from "@/components/Icon";
import type { IconName } from "@/lib/icons";

const TOC: { id: string; label: string }[] = [
  { id: "intro", label: "0. פתיחה" },
  { id: "properties", label: "1. נכסים" },
  { id: "leases", label: "2. חוזים" },
  { id: "payments", label: "3. תקבולים" },
  { id: "expenses", label: "4. הוצאות" },
  { id: "debts", label: "5. חובות" },
  { id: "reports", label: "6. דוחות" },
  { id: "tasks", label: "7. תזכורות" },
  { id: "settings", label: "8. הגדרות" },
];

function Topic({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <p className="font-semibold text-gray-900 text-sm">{title}</p>
      <p className="text-sm text-gray-500 mt-1 leading-relaxed">{text}</p>
    </div>
  );
}

function Chapter({
  id, num, title, iconName, children,
}: {
  id: string; num: string; title: string; iconName: IconName; children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-3">
      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2.5">
        <span className="inline-block w-1 h-5 rounded-full tick-accent" />
        <Icon name={iconName} size={18} />
        {num}. {title}
      </h2>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        {children}
      </div>
    </section>
  );
}

export default function HelpPage() {
  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-1.5">
          <Link href="/dashboard" className="hover:text-gray-600 transition-colors">לוח בקרה</Link>
          <span className="opacity-50">/</span>
          <span className="text-gray-600">עזרה</span>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
          <span className="inline-block w-1.5 h-7 rounded-full tick-accent" />
          חוברת הסברים
        </h1>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl p-6 grad-accent-diag text-white">
        <span className="absolute -top-4 -left-3 opacity-15 select-none"><Icon name="guide" size={64} color="white" /></span>
        <div className="relative">
          <h2 className="text-xl font-extrabold drop-shadow-sm">מדריך שימוש באפליקציה</h2>
          <p className="text-sm text-white/85 mt-1 leading-relaxed max-w-lg">
            הסבר קצר וישיר לכל פיצ&apos;ר - איך מוסיפים נכס ראשון, איך עובדות תזכורות אוטומטיות, ואיך קוראים דוח חובות.
            אפשר גם ללחוץ על אייקון העזרה בסרגל מכל מסך - זה יקפיץ אתכם ישר לפרק המתאים.
          </p>
        </div>
      </div>

      {/* TOC */}
      <nav className="bg-white rounded-2xl border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-500 mb-2">תוכן העניינים</p>
        <div className="flex flex-wrap gap-2">
          {TOC.map((c) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              {c.label}
            </a>
          ))}
        </div>
      </nav>

      {/* 0. פתיחה */}
      <Chapter id="intro" num="0" title="פתיחה - תחילת עבודה" iconName="guide">
        <Topic
          title="הוספת נכס ראשון"
          text="בלוח הבקרה או בתפריט &quot;נכסים&quot; לוחצים &quot;נכס חדש&quot;. ממלאים שם, סוג נכס (דירה/בית/מסחרי) וכתובת - יש השלמה אוטומטית לכתובת. שאר השדות (קומה, חדרים, מ&quot;ר, מחיר רכישה) אופציונליים."
        />
        <Topic
          title="הוספת דייר וחוזה"
          text="מדף הנכס לוחצים &quot;הוסף חוזה&quot;. בוחרים דייר קיים או מזינים דייר חדש (עם בדיקת תקינות ת&quot;ז). ממלאים תאריכי חוזה - תאריך הסיום מוצע אוטומטית כשנה פחות יום - שכ&quot;ד, פיקדון ושיטת תקבול, ואפשר לסמן שייווצר גם תקבול פיקדון יחד עם החוזה."
        />
        <Topic
          title="רישום תקבול ראשון"
          text="מדף הנכס לוחצים &quot;הוסף תקבול&quot;. אם יש רק חוזה פעיל אחד, הוא נבחר אוטומטית והסכום מתמלא לפי השכ&quot;ד בחוזה - נשאר רק לאשר תאריך וסטטוס."
        />
        <Topic
          title="קיצור דרך: ייבוא עם AI"
          text="במקום להזין נכס-דייר-חוזה בנפרד, &quot;ייבוא חוזה&quot; (בתפריט חוזים) מעלה קובץ PDF או DOCX של החוזה, והבינה המלאכותית ממלאת הכל אוטומטית - כולל יצירת הנכס והדייר אם הם עוד לא קיימים."
        />
      </Chapter>

      {/* 1. נכסים */}
      <Chapter id="properties" num="1" title="נכסים" iconName="properties">
        <Topic
          title="הוספה ועריכה"
          text="טופס אחד משמש גם ליצירה וגם לעריכה: שם, סוג נכס, כתובת עם השלמה אוטומטית, קומה ומספר דירה, חדרי שינה/אמבטיה, מ&quot;ר, מרפסות וחניות, מחיר רכישה ותיאור חופשי."
        />
        <Topic
          title="דף הנכס"
          text="מציג שכ&quot;ד חודשי מהחוזים הפעילים, סה&quot;כ הוצאות ומספר חוזים פעילים, טבלת כל החוזים ההיסטוריים עם המסמכים המצורפים להם, וכפתורי פעולה להפעלת אופציה או סיום מוקדם של חוזה פעיל."
        />
        <Topic
          title="חשבונות שירות"
          text="בסקשן &quot;חשבונות שירות&quot; בדף הנכס מסמנים אילו חשבונות מגיעים (מים/גז/חשמל/ארנונה/ועד בית/אחר), התדירות (חודשי או דו-חודשי) ומי אחראי לתשלום - הבעלים משלם, הבעלים מעביר לדייר, או שהדייר משלם ישירות. הבחירה קובעת אם תיווצר תזכורת אוטומטית."
        />
        <Topic
          title="תזכורות שקים בדף הנכס"
          text="לחוזה פעיל בשיטת תקבול &quot;שקים&quot; מוצג בדף הנכס בלוק תזכורות ל-3 החודשים הקרובים, עם צבע לפי סטטוס - שולם, חלקי, לא שולם, או עתידי."
        />
      </Chapter>

      {/* 2. חוזים */}
      <Chapter id="leases" num="2" title="חוזים" iconName="leases">
        <Topic
          title="ייבוא עם AI"
          text="מעלים קובץ PDF (כולל חוזה סרוק) או DOCX, והמערכת שולפת את כל פרטי החוזה אוטומטית. ספק ה-AI נקבע בהגדרות. המערכת גם מזהה נספחי הארכה/אופציה וממלאת את שדות האופציה לבד. אם לנכס כבר יש חוזה פעיל, הוא עובר אוטומטית לסטטוס &quot;הסתיים&quot; בעת שמירת החוזה החדש - הוא לא נמחק, רק מפסיק להיות פעיל."
        />
        <Topic
          title="עריכה"
          text="כל שדות החוזה ניתנים לעריכה, כולל שאיבת נתונים מחדש ממסמך מצורף וניהול המסמכים (העלאה/מחיקה) של אותו חוזה."
        />
        <Topic
          title="הצמדה"
          text="לכל חוזה אפשר לבחור הצמדה למדד המחירים לצרכן, לדולר, או ללא הצמדה - ותדירות עדכון: חודשי, רבעוני, או חצי-שנתי. שכ&quot;ד הבסיס ותאריך הבסיס נקבעים אוטומטית ביצירת החוזה, ומוצגים בדף העריכה."
        />
        <Topic
          title="אופציה וסיום מוקדם"
          text="חוזה עם אופציית הארכה מציג כפתור &quot;הפעל אופציה&quot; כשמתקרב תאריך הסיום - הפעלה מעדכנת את תאריכי החוזה והשכ&quot;ד, ומאפסת את בסיס ההצמדה לערכי האופציה החדשה. סיום מוקדם מחשב את תאריך הסיום בפועל לפי מספר חודשי ההודעה המוסכמים בחוזה."
        />
        <Topic
          title="שוכר שני"
          text="אפשר להוסיף פרטי שוכר שני (שם, ת&quot;ז, טלפון, אימייל) לאותו חוזה, גם ביצירה וגם בעריכה."
        />
      </Chapter>
    </div>
  );
}
