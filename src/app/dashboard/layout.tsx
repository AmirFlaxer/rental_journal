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
  { href: "/dashboard/debts", label: "חובות", icon: "🔴" },
  { href: "/dashboard/tasks", label: "תזכורות", icon: "🔔" },
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
      <span className="text-base leading-none">{icon}</span>
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
            <Link href="/dashboard/settings" title="הגדרות"
              className="text-sm transition-colors" style={{ color: "var(--text-3)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--accent)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}>⚙</Link>
            <button onClick={handleSignOut} title="התנתקות"
              className="text-sm transition-colors" style={{ color: "var(--text-3)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}>↩</button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header className="h-16 flex items-center px-4 gap-3 lg:hidden"
          style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg text-sm" style={{ color: "var(--text-2)" }}>☰</button>
          <span className="font-bold" style={{ color: "var(--text-1)" }}>ניהול נכסים</span>
        </header>

        <main className="flex-1 overflow-auto pb-16 lg:pb-0">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-center justify-around px-1 py-1"
          style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border)" }}>
          {[
            { href: "/dashboard", label: "בקרה", icon: "🏠", exact: true },
            { href: "/dashboard/properties", label: "נכסים", icon: "🏢" },
            { href: "/dashboard/leases", label: "חוזים", icon: "📄", exact: true },
            { href: "/dashboard/payments", label: "תקבולים", icon: "💳" },
            { href: "/dashboard/expenses", label: "הוצאות", icon: "💸" },
            { href: "/dashboard/debts", label: "חובות", icon: "🔴" },
            { href: "/dashboard/tasks", label: "תזכורות", icon: "🔔" },
            { href: "/dashboard/reports", label: "דוחות", icon: "📊" },
            { href: "/dashboard/leases/import", label: "ייבוא", icon: "📥" },
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
    <Link href={href} className="flex flex-col items-center gap-0.5 px-1 py-1 rounded-lg min-w-0 flex-1"
      style={{ color: isActive ? "var(--accent)" : "var(--text-3)" }}>
      <span className="text-lg leading-none">{icon}</span>
      <span className="text-[9px] font-medium truncate w-full text-center">{label}</span>
    </Link>
  );
}
