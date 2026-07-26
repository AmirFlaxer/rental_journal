import { auth as getAuth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const session = await getAuth();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "var(--bg-base)" }}>
      {/* רקע מרוּשט - שורות יומן דקות, אווירה של דף ספר חשבונות */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          background:
            "repeating-linear-gradient(to bottom, transparent 0, transparent 37px, rgba(35,31,22,0.035) 37px, rgba(35,31,22,0.035) 38px)",
          maskImage: "radial-gradient(120% 80% at 50% 0%, #000 40%, transparent 100%)",
        }}
      />
      {/* הילה עדינה של דיו */}
      <div
        className="pointer-events-none absolute -top-32 start-1/4 h-[28rem] w-[28rem] rounded-full blur-[120px]"
        style={{ background: "var(--accent-dim)" }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-7">
        {/* כותרת המותג */}
        <header className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-extrabold text-white shadow-lg"
            style={{ background: "var(--accent)", boxShadow: "0 0 0 1px var(--gilt), 0 8px 24px rgba(124,131,255,0.35)" }}
          >
            נ
          </div>
          <span className="font-display text-lg font-bold" style={{ color: "var(--text-1)" }}>
            ניהול שכירויות
          </span>
        </header>

        {/* Hero */}
        <main className="flex flex-1 flex-col justify-center py-12">
          <div className="max-w-2xl">
            <span
              className="text-sm font-semibold tracking-wide"
              style={{ color: "var(--accent)" }}
            >
              ניהול נכסים לבעלי דירות
            </span>
            <h1
              className="font-display mt-3 text-5xl font-black leading-[1.05] sm:text-6xl"
              style={{ color: "var(--text-1)" }}
            >
              כל שקל.<br />כל חוזה.<br />כל דייר.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed" style={{ color: "var(--text-2)" }}>
              יומן השכירות שמנהל את הנכסים שלך - תקבולים, הצמדה למדד, דוח מס
              ותזכורות - במקום אחד, בדיוק מתי שצריך.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/auth/signin"
                className="rounded-xl px-7 py-3 font-semibold text-white transition-transform hover:-translate-y-0.5"
                style={{ background: "var(--accent)", boxShadow: "0 10px 30px rgba(124,131,255,0.3)" }}
              >
                התחברות
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-xl px-7 py-3 font-semibold transition-colors"
                style={{ color: "var(--text-1)", border: "1px solid var(--border)" }}
              >
                פתיחת יומן חדש
              </Link>
            </div>
          </div>

          {/* אלמנט החתימה - כרטיס יומן עם שורות נכס אמיתיות */}
          <div className="mt-14 max-w-2xl">
            <div className="ledger-rule mb-3 flex items-baseline justify-between">
              <h2 className="font-display text-sm font-bold" style={{ color: "var(--text-2)" }}>
                היומן שלך
              </h2>
              <span className="text-xs" style={{ color: "var(--text-3)" }}>3 נכסים · יוני 2026</span>
            </div>

            <div
              className="overflow-hidden rounded-2xl"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "0 24px 60px rgba(0,0,0,0.14)" }}
            >
              {LEDGER_ROWS.map((r, i) => (
                <div
                  key={r.name}
                  className="flex items-center gap-3 px-5 py-3.5"
                  style={{ borderTop: i === 0 ? "none" : "1px solid var(--divider)" }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" style={{ color: "var(--text-1)" }}>{r.name}</p>
                    <p className="text-xs" style={{ color: "var(--text-3)" }}>{r.sub}</p>
                  </div>
                  <span className="hidden text-xs sm:inline" style={{ color: "var(--text-3)" }}>{r.linkage}</span>
                  <span className="font-bold tabular-nums" style={{ color: "var(--text-1)" }}>{r.rent}</span>
                  <span
                    className="w-20 rounded-full px-2.5 py-1 text-center text-xs font-semibold"
                    style={{ background: r.tone.bg, color: r.tone.fg }}
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-4 text-sm" style={{ color: "var(--text-3)" }}>
              הצמדה אוטומטית למדד · דוח מס שנתי · תזכורות תשלום
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

const TONE = {
  paid:   { bg: "rgba(16,185,129,0.15)", fg: "#34d399" },
  due:    { bg: "rgba(239,68,68,0.15)",  fg: "#f87171" },
  wait:   { bg: "rgba(35,31,22,0.06)", fg: "var(--text-2)" },
};

const LEDGER_ROWS = [
  { name: "דירה · רוטשילד 12, תל אביב", sub: "דייר: מ. כהן", rent: "₪6,200", linkage: "+2.1% מדד", status: "שולם",   tone: TONE.paid },
  { name: "דירה · נורדאו 58, תל אביב",  sub: "דייר: ש. לוי", rent: "₪7,875", linkage: "צמוד דולר",  status: "לתשלום", tone: TONE.due },
  { name: "מסחרי · המלכה 5, תל אביב",   sub: "דייר: א. בר",  rent: "₪5,500", linkage: "-",          status: "ממתין",  tone: TONE.wait },
];
