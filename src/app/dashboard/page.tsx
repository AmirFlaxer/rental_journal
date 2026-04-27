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

function countPendingPayments(leases: Lease[], dbPayments: Payment[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let count = 0;

  // DB payments that are not paid
  count += dbPayments.filter((p) => p.status !== "paid").length;

  // Virtual slots (past due, not in DB)
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

      if (new Date(dueDate) <= today) {
        const exists = dbPayments.some(
          (p) => p.lease?.id === lease.id && p.dueDate.slice(0, 7) === monthKey
        );
        if (!exists) count++;
      }
      cur.setMonth(cur.getMonth() + 1);
    }
  }

  return count;
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
  const pendingPayments = countPendingPayments(leases, payments);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const stats = [
    { label: "נכסים", value: properties.length, icon: "🏢", color: "bg-indigo-50 text-indigo-700", border: "border-indigo-200", href: "/dashboard/properties" },
    { label: "חוזים פעילים", value: activeLeases.length, icon: "📋", color: "bg-emerald-50 text-emerald-700", border: "border-emerald-200", href: "/dashboard/leases" },
    { label: "הכנסה חודשית", value: monthlyIncome > 0 ? `₪${monthlyIncome.toLocaleString()}` : "—", icon: "💰", color: "bg-blue-50 text-blue-700", border: "border-blue-200", href: "/dashboard/reports" },
    { label: "תקבולים ממתינים", value: pendingPayments > 0 ? pendingPayments : "0", icon: "⏳", color: "bg-amber-50 text-amber-700", border: "border-amber-200", href: "/dashboard/payments" },
    { label: "הוצאות כוללות", value: totalExpenses > 0 ? `₪${totalExpenses.toLocaleString()}` : "₪0", icon: "💸", color: "bg-rose-50 text-rose-700", border: "border-rose-200", href: "/dashboard/expenses" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">שלום 👋</h1>
        <p className="text-gray-500 mt-1 text-sm">
          {new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/leases/import"
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all">
          <span>📥</span> ייבוא חוזה
        </Link>
        <Link href="/dashboard/properties/new"
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 border border-gray-200 transition-all">
          <span>🏢</span> נכס חדש
        </Link>
        <Link href="/dashboard/reports"
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 border border-gray-200 transition-all">
          <span>📊</span> דוחות
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className={`bg-white rounded-2xl border ${s.border} p-4 flex flex-col gap-2 hover:shadow-md transition-shadow`}>
            <span className="text-2xl">{s.icon}</span>
            <div className={`text-xl font-bold ${s.color.split(" ")[1]}`}>{s.value}</div>
            <div className="text-xs text-gray-500 font-medium">{s.label}</div>
          </Link>
        ))}
      </div>

      {/* Properties */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">הנכסים שלי</h2>
          <Link href="/dashboard/properties/new"
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700">
            + הוסף נכס
          </Link>
        </div>

        {properties.length === 0 ? (
          <div className="bg-white rounded-2xl px-6 py-14 text-center space-y-4">
            <div className="text-5xl">🏠</div>
            <p className="text-gray-500 font-medium">עדיין אין נכסים</p>
            <p className="text-gray-400 text-sm">התחל בהוספת נכס או בייבוא חוזה</p>
            <div className="flex gap-3 justify-center pt-2">
              <Link href="/dashboard/leases/import"
                className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700">
                📥 ייבוא חוזה
              </Link>
              <Link href="/dashboard/properties/new"
                className="px-5 py-2 bg-white text-gray-700 rounded-xl font-semibold text-sm border border-gray-200 hover:bg-gray-50">
                🏢 הוסף נכס
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
