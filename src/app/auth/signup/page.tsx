"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignUp() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("הסיסמאות אינן תואמות");
      return;
    }

    if (password.length < 8) {
      setError("הסיסמה חייבת להכיל לפחות 8 תווים");
      return;
    }

    setIsLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) {
      setError("שגיאה בהרשמה - בדוק שהמייל תקין והסיסמה עומדת בדרישות");
      setIsLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden px-5 py-8" style={{ background: "var(--bg-base)" }}>
      {/* רקע מרושט תואם לזהות היומן */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.3]"
        style={{
          background:
            "repeating-linear-gradient(to bottom, transparent 0, transparent 37px, rgba(35,31,22,0.035) 37px, rgba(35,31,22,0.035) 38px)",
          maskImage: "radial-gradient(120% 90% at 50% 30%, #000 35%, transparent 100%)",
        }}
      />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl text-base font-extrabold text-white"
            style={{ background: "var(--accent)", boxShadow: "0 0 0 1px var(--gilt), 0 10px 28px rgba(124,131,255,0.35)" }}
          >
            נ
          </div>
          <span className="font-display text-lg font-bold" style={{ color: "var(--text-1)" }}>ניהול נכסים</span>
        </div>

        <div className="p-8 rounded-2xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "0 24px 60px rgba(0,0,0,0.14)" }}>
        <h1 className="font-display text-2xl font-bold mb-6 ledger-rule" style={{ color: "var(--text-1)" }}>פתיחת יומן חדש</h1>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm" role="alert" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)", color: "#f87171" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block font-semibold mb-2 text-sm" style={{ color: "var(--text-2)" }}>שם מלא</label>
            <input
              id="name" type="text" value={name}
              onChange={(e) => setName(e.target.value)} required
              className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-1)" }}
              placeholder="ישראל ישראלי"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="email" className="block font-semibold mb-2 text-sm" style={{ color: "var(--text-2)" }}>אימייל</label>
            <input
              id="email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} required
              className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-1)" }}
              placeholder="your@email.com"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="block font-semibold mb-2 text-sm" style={{ color: "var(--text-2)" }}>סיסמה</label>
            <input
              id="password" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)} required
              className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-1)" }}
              placeholder="••••••••"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="confirmPassword" className="block font-semibold mb-2 text-sm" style={{ color: "var(--text-2)" }}>אימות סיסמה</label>
            <input
              id="confirmPassword" type="password" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} required
              className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-1)" }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit" disabled={isLoading}
            className="w-full py-2.5 rounded-xl font-semibold transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
            style={{ background: "var(--accent)", color: "#fff", boxShadow: "0 10px 30px rgba(124,131,255,0.28)" }}
          >
            {isLoading ? "יוצר חשבון..." : "פתיחת יומן"}
          </button>
        </form>

        <p className="text-center mt-4 text-sm" style={{ color: "var(--text-2)" }}>
          כבר יש לך חשבון?{" "}
          <Link href="/auth/signin" className="font-semibold hover:underline" style={{ color: "var(--accent)" }}>התחברות</Link>
        </p>
        </div>
      </div>
    </div>
  );
}
