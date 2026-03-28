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
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
        isActive
          ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      <span className="text-lg leading-none">{icon}</span>
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
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 right-0 z-40 w-64 bg-white border-l border-gray-200 shadow-xl flex flex-col transition-transform duration-300
          ${mobileOpen ? "translate-x-0" : "translate-x-full"}
          lg:translate-x-0 lg:static lg:shadow-none`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">נ</div>
            <span className="font-bold text-gray-900 text-sm">ניהול נכסים</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
              {userName ? userName[0] : "מ"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{userName || "משתמש"}</p>
            </div>
            <Link
              href="/dashboard/settings"
              title="הגדרות חשבון"
              className="text-gray-400 hover:text-indigo-600 transition-colors text-sm"
            >
              ⚙
            </Link>
            <button
              onClick={handleSignOut}
              title="התנתקות"
              className="text-gray-400 hover:text-red-500 transition-colors text-sm"
            >
              ↩
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 gap-3 lg:hidden">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            ☰
          </button>
          <span className="font-bold text-gray-900">ניהול נכסים</span>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
