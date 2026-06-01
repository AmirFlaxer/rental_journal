"use client";

import { useState } from "react";
import Link from "next/link";

// ── ניתן לעריכה בקלות ─────────────────────────────────────
const DEV = {
  name: "אמיר",
  // ספר על עצמך — הטקסט הזה מוצג בקטע "המפתח". ערוך כרצונך.
  bio: "מפתח עצמאי שבונה מוצרים מקצה לקצה. את היומן הזה בניתי כדי לנהל נכסי השכרה בצורה פשוטה, מסודרת ומדויקת — בלי גיליונות אקסל מפוזרים. אני מאמין בכלים שחוסכים זמן, שומרים על הנתונים מסודרים, ומציגים את התמונה הפיננסית בבירור.",
  email: "benqueman@gmail.com",
  github: "", // אופציונלי: כתובת GitHub מלאה, למשל https://github.com/username
};

const APP_VERSION = "1.0";

const APP_FEATURES = [
  { icon: "🏢", title: "ניהול נכסים", desc: "דירות, בתים ונכסים מסחריים עם כל הפרטים" },
  { icon: "📄", title: "חוזים חכמים", desc: "ייבוא מ-PDF/תמונה עם AI, הצמדה למדד/דולר, אופציות" },
  { icon: "💳", title: "תקבולים וחובות", desc: "מעקב תשלומים, תשלומים חלקיים, וחישוב חובות אוטומטי" },
  { icon: "📋", title: "מס הכנסה 10%", desc: "חישוב מס אוטומטי ודוח מס שנתי מוכן להדפסה" },
  { icon: "📊", title: "דוחות ואנליטיקה", desc: "הכנסות, הוצאות ורווח לפי נכס, חודש ושנה" },
  { icon: "🔔", title: "תזכורות", desc: "שיקים, סיום חוזים ומשימות — שלא תשכח כלום" },
];

type FeedbackType = "bug" | "feature";

export default function AboutPage() {
  const [type, setType] = useState<FeedbackType>("bug");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [copied, setCopied] = useState(false);

  const subjectPrefix = type === "bug" ? "🐞 דיווח באג" : "✨ בקשת פיצ'ר";
  const subject = `[${type === "bug" ? "באג" : "בקשה"}] ${title || "ללא כותרת"}`;
  const body =
    `${subjectPrefix} — יומן השכרות\n\n` +
    `כותרת: ${title}\n\n` +
    `פירוט:\n${details}\n\n` +
    `———\nנשלח מתוך האפליקציה · ${new Date().toLocaleString("he-IL")}`;

  const mailtoHref = `mailto:${DEV.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const canSend = title.trim().length > 0 && details.trim().length > 0;

  const copyDetails = async () => {
    try {
      await navigator.clipboard.writeText(`${subject}\n\n${body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-1.5">
          <Link href="/dashboard" className="hover:text-gray-600 transition-colors">לוח בקרה</Link>
          <span className="opacity-50">/</span>
          <span className="text-gray-600">אודות</span>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
          <span className="inline-block w-1.5 h-7 rounded-full bg-gradient-to-b from-pink-400 to-pink-600" />
          אודות
        </h1>
      </div>

      {/* Hero — about the app */}
      <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-pink-500 to-pink-700 text-white">
        <span className="absolute -top-4 -left-3 text-7xl opacity-15 select-none">🏠</span>
        <div className="relative">
          <h2 className="text-xl font-extrabold drop-shadow-sm">יומן השכרות</h2>
          <p className="text-sm text-white/85 mt-1 leading-relaxed max-w-lg">
            ניהול נכסי השכרה מקצה לקצה — נכסים, חוזים, תקבולים, הוצאות, מס ודוחות. הכל במקום אחד, בעברית, ומותאם לנייד.
          </p>
          <span className="inline-block mt-3 text-xs font-semibold bg-white/20 rounded-full px-3 py-1">גרסה {APP_VERSION}</span>
        </div>
      </div>

      {/* App features */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2.5">
          <span className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600" />
          מה האפליקציה עושה
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {APP_FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{f.icon}</span>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{f.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* About the developer */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2.5">
          <span className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-pink-400 to-pink-600" />
          המפתח
        </h2>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-700 text-white flex items-center justify-center text-2xl font-extrabold flex-shrink-0">
            {DEV.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900">{DEV.name}</p>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{DEV.bio}</p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2.5">
          <span className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600" />
          צור קשר
        </h2>
        <div className="flex flex-wrap gap-3">
          <a
            href={`mailto:${DEV.email}`}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-xl font-semibold text-sm hover:brightness-110 transition-all"
          >
            <span>✉️</span> {DEV.email}
          </a>
          {DEV.github && (
            <a
              href={DEV.github}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 rounded-xl font-semibold text-sm border border-gray-200 hover:bg-gray-50 transition-all"
            >
              <span>💻</span> GitHub
            </a>
          )}
        </div>
      </section>

      {/* Feedback form */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2.5">
          <span className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-orange-400 to-orange-600" />
          דיווח באג או בקשת פיצ'ר
        </h2>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          {/* Type selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setType("bug")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                type === "bug"
                  ? "bg-gradient-to-br from-rose-500 to-rose-700 text-white border-transparent"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              🐞 דיווח על באג
            </button>
            <button
              onClick={() => setType("feature")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                type === "feature"
                  ? "bg-gradient-to-br from-pink-500 to-pink-700 text-white border-transparent"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              ✨ בקשת פיצ'ר
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">כותרת *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === "bug" ? "למשל: שגיאה בחישוב חוב" : "למשל: ייצוא דוח לאקסל"}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">פירוט *</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              placeholder={
                type === "bug"
                  ? "מה קרה? מה ציפית שיקרה? באיזה מסך? צעדים לשחזור..."
                  : "תאר את הפיצ'ר המבוקש ואיך הוא יעזור לך..."
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={canSend ? mailtoHref : undefined}
              aria-disabled={!canSend}
              onClick={(e) => { if (!canSend) e.preventDefault(); }}
              className={`flex-1 min-w-[160px] text-center py-2.5 rounded-xl font-semibold text-sm transition-all ${
                canSend
                  ? "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white hover:brightness-110"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              ✉️ שלח באימייל
            </a>
            <button
              onClick={copyDetails}
              disabled={!canSend}
              className="px-4 py-2.5 rounded-xl font-semibold text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {copied ? "✓ הועתק" : "📋 העתק"}
            </button>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            הכפתור פותח את אפליקציית האימייל שלך עם הפנייה מוכנה ל-{DEV.email}. אם אין אצלך אימייל מוגדר — לחץ &quot;העתק&quot; ושלח ידנית.
          </p>
        </div>
      </section>
    </div>
  );
}
