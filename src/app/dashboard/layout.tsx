"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/dashboard", label: "לוח בקרה", icon: "🏠", exact: true },
  { href: "/dashboard/properties", label: "נכסים", icon: "🏢" },
  { href: "/dashboard/leases", label: "חוזים", icon: "📄", exact: true },
  { href: "/dashboard/leases/import", label: "ייבוא חוזה", icon: "📥" },
  { href: "/dashboard/expenses", label: "הוצאות", icon: "💸" },
  { href: "/dashboard/payments", label: "תקבולים", icon: "💳" },
  { href: "/dashboard/reports", label: "דוחות", icon: "📊" },
  { href: "/dashboard/reports/tax", label: "דוח מס", icon: "📋" },
  { href: "/dashboard/debts", label: "חובות", icon: "🔴" },
  { href: "/dashboard/tasks", label: "תזכורות", icon: "🔔" },
  { href: "/dashboard/about", label: "אודות", icon: "ℹ️" },
];

function NavItem({ href, label, icon, exact }: { href: string; label: string; icon: string; exact?: boolean }) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
      style={isActive ? {
        background: "var(--accent-dim)",
        color: "var(--accent)",
        borderRight: "2px solid var(--accent)",
      } : {
        color: "var(--text-2)",
      }}
    >
      <span className="text-base leading-none" aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const name = data.user?.user_metadata?.name as string | undefined;
      if (name) setUserName(name);
    });
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/signin");
  }

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg-base)" }}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 right-0 z-40 w-60 flex flex-col transition-transform duration-300
          ${mobileOpen ? "translate-x-0" : "translate-x-full"}
          lg:translate-x-0 lg:static`}
        style={{ background: "var(--bg-surface)", borderLeft: "1px solid var(--border)" }}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ background: "var(--accent)" }}>נ</div>
            <span className="font-semibold text-sm" style={{ color: "var(--text-1)", fontFamily: "var(--font-outfit), var(--font-heebo), sans-serif", letterSpacing: "0.01em" }}>
              ניהול נכסים
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </nav>

        {/* User */}
        <div className="p-3" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "var(--bg-elevated)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
              style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
              {userName ? userName[0] : "מ"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "var(--text-1)" }}>{userName || "משתמש"}</p>
            </div>
            <Link href="/dashboard/settings" title="הגדרות" aria-label="הגדרות"
              className="text-sm transition-colors" style={{ color: "var(--text-3)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--accent)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}>
              <span aria-hidden="true">⚙</span>
            </Link>
            <button onClick={handleSignOut} title="התנתקות" aria-label="התנתקות"
              className="text-sm transition-colors" style={{ color: "var(--text-3)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}>
              <span aria-hidden="true">↩</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          role="button"
          aria-label="סגור תפריט"
          tabIndex={0}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
          onKeyDown={e => e.key === "Enter" && setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) — גובה + safe-area-top ל-standalone */}
        <header className="flex items-center px-4 gap-3 lg:hidden"
          style={{
            background: "var(--bg-surface)",
            borderBottom: "1px solid var(--border)",
            paddingTop: "max(1rem, env(safe-area-inset-top))",
            paddingBottom: "0.75rem",
          }}>
          <button onClick={() => setMobileOpen(!mobileOpen)} aria-label="פתח תפריט"
            className="p-2 rounded-lg text-sm" style={{ color: "var(--text-2)" }} aria-expanded={mobileOpen}>
            <span aria-hidden="true">☰</span>
          </button>
          <span className="font-bold" style={{ color: "var(--text-1)" }}>ניהול נכסים</span>
        </header>

        {/* pb מפצה על bottom nav + safe-area-bottom (home indicator ב-iPhone) */}
        <main className="flex-1 overflow-auto" style={{ paddingBottom: "calc(4rem + env(safe-area-inset-bottom))" }}>
          {children}
        </main>

        {/* Mobile bottom nav — 5 פריטים ראשיים בלבד לעמידה ב-44px touch target */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-center justify-around px-2"
          style={{
            background: "var(--bg-surface)",
            borderTop: "1px solid var(--border)",
            paddingTop: "0.25rem",
            paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))",
          }}>
          {[
            { href: "/dashboard", label: "בקרה", icon: "🏠", exact: true },
            { href: "/dashboard/properties", label: "נכסים", icon: "🏢" },
            { href: "/dashboard/leases", label: "חוזים", icon: "📄", exact: true },
            { href: "/dashboard/payments", label: "תקבולים", icon: "💳" },
            { href: "/dashboard/tasks", label: "תזכורות", icon: "🔔" },
          ].map((item) => (
            <MobileNavItem key={item.href} {...item} />
          ))}
        </nav>
      </div>
    </div>
  );
}

function MobileNavItem({ href, label, icon, exact }: { href: string; label: string; icon: string; exact?: boolean }) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link href={href} className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg min-w-0 flex-1 min-h-[44px] justify-center"
      style={{ color: isActive ? "var(--accent)" : "var(--text-3)" }}>
      <span className="text-xl leading-none" aria-hidden="true">{icon}</span>
      <span className="text-[11px] font-medium truncate w-full text-center">{label}</span>
    </Link>
  );
}
