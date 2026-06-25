"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isLeaseCurrentlyActive } from "@/lib/lease-status";

interface Property {
  id: string;
  title: string;
  address: string;
  city: string;
  propertyType: string;
  leases?: { status: string; startDate?: string; endDate?: string; monthlyRent: number }[];
}

interface Lease {
  id: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  status: string;
}

interface Payment {
  id: string;
  status: string;
  amount: number;
  dueDate: string;
  lease?: { id: string };
  isVirtual?: boolean;
}

interface Expense {
  id: string;
  amount: number;
}

const TYPE_HE: Record<string, string> = { Apartment: "דירה", House: "בית", Commercial: "מסחרי" };

function pendingPaymentsSummary(leases: Lease[], dbPayments: Payment[]): { count: number; amount: number } {
  const now = new Date();
  // מחרוזת "היום" מקומית — השוואה למחרוזת dueDate חסינה לאזור-זמן (new Date("YYYY-MM-DD") = UTC).
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  let count = 0;
  let amount = 0;

  for (const p of dbPayments) {
    if (p.status !== "paid") { count++; amount += p.amount; }
  }

  for (const lease of leases) {
    if (!isLeaseCurrentlyActive(lease)) continue;
    const start = new Date(lease.startDate);
    const end = new Date(lease.endDate);
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    const startDay = start.getDate();

    while (cur <= endMonth) {
      const year = cur.getFullYear();
      const month = cur.getMonth() + 1;
      const monthKey = `${year}-${String(month).padStart(2, "0")}`;
      const lastDay = new Date(year, month, 0).getDate();
      const day = Math.min(startDay, lastDay);
      const dueDate = `${monthKey}-${String(day).padStart(2, "0")}`;

      if (dueDate <= todayStr) {
        const exists = dbPayments.some(
          (p) => p.lease?.id === lease.id && p.dueDate.slice(0, 7) === monthKey
        );
        if (!exists) { count++; amount += lease.monthlyRent; }
      }
      cur.setMonth(cur.getMonth() + 1);
    }
  }

  return { count, amount };
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(dateStr).getTime() - today.getTime()) / 86400000);
}

export default function Dashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/properties").then((r) => r.json()),
      fetch("/api/leases").then((r) => r.json()),
      fetch("/api/payments").then((r) => r.json()),
      fetch("/api/expenses").then((r) => r.json()),
    ]).then(([props, leas, pays, exps]) => {
      if (Array.isArray(props)) setProperties(props);
      if (Array.isArray(leas)) setLeases(leas);
      if (Array.isArray(pays)) setPayments(pays);
      if (Array.isArray(exps)) setExpenses(exps);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeLeases = properties.flatMap((p) => p.leases || []).filter(isLeaseCurrentlyActive);
  const monthlyIncome = activeLeases.reduce((s, l) => s + l.monthlyRent, 0);
  const { count: pendingCount, amount: pendingAmount } = pendingPaymentsSummary(leases, payments);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  // חוזים שפוגים תוך 60 יום
  const expiringLeases = leases
    .filter((l) => isLeaseCurrentlyActive(l))
    .map((l) => ({ ...l, daysLeft: daysUntil(l.endDate) }))
    .filter((l) => l.daysLeft >= 0 && l.daysLeft <= 60)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const stats = [
    { label: "נכסים", value: properties.length, icon: "🏢", gradient: "from-zinc-600 to-zinc-800", href: "/dashboard/properties" },
    { label: "חוזים פעילים", value: activeLeases.length, icon: "📋", gradient: "from-pink-500 to-pink-700", href: "/dashboard/leases" },
    { label: "הכנסה חודשית", value: monthlyIncome > 0 ? `₪${monthlyIncome.toLocaleString()}` : "—", subValue: monthlyIncome > 0 ? `₪${Math.round(monthlyIncome * 0.9).toLocaleString()} לאחר מס` : undefined, icon: "💰", gradient: "from-emerald-500 to-emerald-700", href: "/dashboard/reports" },
    { label: "תקבולים ממתינים", value: pendingCount > 0 ? pendingCount : "0", subValue: pendingAmount > 0 ? `₪${pendingAmount.toLocaleString()}` : undefined, icon: "⏳", gradient: "from-amber-500 to-amber-700", href: "/dashboard/payments" },
    { label: "הוצאות כוללות", value: totalExpenses > 0 ? `₪${totalExpenses.toLocaleString()}` : "₪0", icon: "💸", gradient: "from-rose-500 to-rose-700", href: "/dashboard/expenses" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
          <span className="inline-block w-1.5 h-7 rounded-full bg-gradient-to-b from-pink-400 to-pink-600" />
          שלום 👋
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          {new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/leases/import"
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all">
          <span aria-hidden="true">📥</span> ייבוא חוזה
        </Link>
        <Link href="/dashboard/properties/new"
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 border border-gray-200 transition-all">
          <span aria-hidden="true">🏢</span> נכס חדש
        </Link>
        <Link href="/dashboard/reports"
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 border border-gray-200 transition-all">
          <span aria-hidden="true">📊</span> דוחות
        </Link>
        <Link href="/dashboard/reports/tax"
          className="flex items-center gap-2 px-5 py-2.5 bg-orange-50 text-orange-700 rounded-xl font-semibold text-sm hover:bg-orange-100 border border-orange-200 transition-all">
          <span aria-hidden="true">📋</span> דוח מס שנתי
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className={`relative overflow-hidden bg-gradient-to-br ${s.gradient} text-white rounded-2xl p-4 flex flex-col gap-1.5 hover:brightness-110 transition-all`}>
            <span className="absolute -top-2 -left-2 text-5xl opacity-15 select-none" aria-hidden="true">{s.icon}</span>
            <div className="text-xl font-extrabold relative drop-shadow-sm">{s.value}</div>
            {"subValue" in s && s.subValue && (
              <div className="text-xs font-semibold text-white/80 relative">{s.subValue}</div>
            )}
            <div className="text-xs text-white/75 font-semibold relative">{s.label}</div>
          </Link>
        ))}
      </div>

      {/* Expiring leases warning */}
      {expiringLeases.length > 0 && (
        <div className="rounded-2xl p-4 space-y-2 border border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-amber-700/5">
          <p className="text-sm font-bold text-amber-300"><span aria-hidden="true">⚠️</span> חוזים שעומדים לפוג בקרוב</p>
          {expiringLeases.map((l) => (
            <Link key={l.id} href="/dashboard/leases"
              className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-amber-500/20 hover:border-amber-400/50 transition-colors">
              <span className="text-sm font-semibold text-gray-800">
                {(l as unknown as { properties?: { title: string } }).properties?.title ?? "נכס"}
              </span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${l.daysLeft <= 14 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                {l.daysLeft === 0 ? "מסתיים היום" : `עוד ${l.daysLeft} ימים`}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Properties */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2.5">
            <span className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-pink-400 to-pink-600" />
            הנכסים שלי
          </h2>
          <Link href="/dashboard/properties/new"
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700">
            + הוסף נכס
          </Link>
        </div>

        {properties.length === 0 ? (
          <div className="bg-white rounded-2xl px-6 py-14 text-center space-y-4">
            <div className="text-5xl" aria-hidden="true">🏠</div>
            <p className="text-gray-500 font-medium">עדיין אין נכסים</p>
            <p className="text-gray-400 text-sm">התחל בהוספת נכס או בייבוא חוזה</p>
            <div className="flex gap-3 justify-center pt-2">
              <Link href="/dashboard/leases/import"
                className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700">
                <span aria-hidden="true">📥</span> ייבוא חוזה
              </Link>
              <Link href="/dashboard/properties/new"
                className="px-5 py-2 bg-white text-gray-700 rounded-xl font-semibold text-sm border border-gray-200 hover:bg-gray-50">
                <span aria-hidden="true">🏢</span> הוסף נכס
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {properties.map((p) => {
              const active = (p.leases || []).filter(isLeaseCurrentlyActive);
              const rent = active.reduce((s, l) => s + l.monthlyRent, 0);
              return (
                <Link key={p.id} href={`/dashboard/properties/${p.id}`}
                  className="bg-white rounded-xl flex items-center justify-between px-4 py-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0">
                      {TYPE_HE[p.propertyType]?.charAt(0) || "נ"}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{p.title}</p>
                      <p className="text-sm text-gray-400">{p.address}, {p.city}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {rent > 0 && (
                      <div className="text-right">
                        <p className="font-semibold text-emerald-700">₪{rent.toLocaleString()}</p>
                        <p className="text-gray-400 text-xs">לחודש</p>
                      </div>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      active.length > 0 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {active.length > 0 ? `${active.length} חוזה פעיל` : "פנוי"}
                    </span>
                    <span className="text-gray-400">←</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
