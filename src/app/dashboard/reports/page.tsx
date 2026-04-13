"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

const PROPERTY_TYPE_HE: Record<string, string> = {
  Apartment: "דירה",
  House: "בית",
  Commercial: "מסחרי",
};

const EXPENSE_CAT_HE: Record<string, string> = {
  Maintenance: "תחזוקה",
  Insurance: "ביטוח",
  Tax: "מס",
  Utilities: "שירותים",
  "Professional Fees": 'שכ"ט',
  Other: "אחר",
};

const MONTH_HE = ["ינו'", "פבר'", "מרץ", "אפר'", "מאי", "יוני", "יולי", "אוג'", "ספט'", "אוק'", "נוב'", "דצמ'"];

interface RawPayment { id: string; amount: number; paidDate?: string; paymentType: string; dueDate: string; }
interface RawExpense { id: string; amount: number; date: string; category: string; }

interface PropertyRaw {
  id: string;
  title: string;
  city: string;
  propertyType: string;
  activeLeases: number;
  monthlyRent: number;
  payments: RawPayment[];
  expenses: RawExpense[];
}

interface PropertyStat {
  id: string;
  title: string;
  city: string;
  propertyType: string;
  activeLeases: number;
  monthlyRent: number;
  totalExpenses: number;
  totalPaid: number;
  netIncome: number;
}

interface Totals {
  properties: number;
  activeLeases: number;
  monthlyRent: number;
  totalExpenses: number;
  totalPaid: number;
  netIncome: number;
}

interface MonthlyEntry { month: string; income: number; expenses: number; net: number; }

function fmt(n: number) {
  return `₪${Math.round(n).toLocaleString("he-IL")}`;
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function deriveYears(properties: PropertyRaw[]): number[] {
  const years = new Set<number>();
  for (const p of properties) {
    for (const pay of p.payments) {
      // Use dueDate (rent month) for year derivation, consistent with the grouping below.
      const key = pay.dueDate || pay.paidDate;
      if (key) years.add(new Date(key).getFullYear());
    }
    for (const exp of p.expenses) {
      if (exp.date) years.add(new Date(exp.date).getFullYear());
    }
  }
  return Array.from(years).sort((a, b) => b - a);
}

function computeStats(properties: PropertyRaw[], year: number | null): {
  propertyStats: PropertyStat[];
  totals: Totals;
  monthly: MonthlyEntry[];
  expensesByCategory: Record<string, number>;
} {
  const propertyStats: PropertyStat[] = properties.map((p) => {
    // Filter by rent month (dueDate) — consistent with the backend (/api/reports) and the monthly chart below.
    const payments = year
      ? p.payments.filter((pay) => pay.dueDate && new Date(pay.dueDate).getFullYear() === year)
      : p.payments;
    const expenses = year
      ? p.expenses.filter((exp) => exp.date && new Date(exp.date).getFullYear() === year)
      : p.expenses;

    const totalPaid = payments.filter((pay) => pay.paidDate).reduce((s, pay) => s + pay.amount, 0);
    const totalExpenses = expenses.reduce((s, exp) => s + exp.amount, 0);

    return {
      id: p.id,
      title: p.title,
      city: p.city,
      propertyType: p.propertyType,
      activeLeases: p.activeLeases,
      monthlyRent: p.monthlyRent,
      totalPaid,
      totalExpenses,
      netIncome: totalPaid - totalExpenses,
    };
  });

  const totals: Totals = {
    properties: properties.length,
    activeLeases: propertyStats.reduce((s, p) => s + p.activeLeases, 0),
    monthlyRent: propertyStats.reduce((s, p) => s + p.monthlyRent, 0),
    totalExpenses: propertyStats.reduce((s, p) => s + p.totalExpenses, 0),
    totalPaid: propertyStats.reduce((s, p) => s + p.totalPaid, 0),
    netIncome: propertyStats.reduce((s, p) => s + p.netIncome, 0),
  };

  // Include only PAID payments in income, but bucket them by their rent month (dueDate),
  // not by the date the money was actually received. This is what matches the backend and
  // what users mean when they ask "how much rent came in for March?".
  const allPayments = properties.flatMap((p) =>
    p.payments.filter((pay) => pay.paidDate && pay.dueDate && (!year || new Date(pay.dueDate).getFullYear() === year))
  );
  const allExpenses = properties.flatMap((p) =>
    p.expenses.filter((exp) => exp.date && (!year || new Date(exp.date).getFullYear() === year))
  );

  const monthlyMap: Record<string, { income: number; expenses: number }> = {};
  for (const pay of allPayments) {
    const key = new Date(pay.dueDate).toISOString().slice(0, 7);
    if (!monthlyMap[key]) monthlyMap[key] = { income: 0, expenses: 0 };
    monthlyMap[key].income += pay.amount;
  }
  for (const exp of allExpenses) {
    const key = new Date(exp.date).toISOString().slice(0, 7);
    if (!monthlyMap[key]) monthlyMap[key] = { income: 0, expenses: 0 };
    monthlyMap[key].expenses += exp.amount;
  }

  const monthly = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data, net: data.income - data.expenses }));

  const expensesByCategory: Record<string, number> = {};
  for (const exp of allExpenses) {
    expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + exp.amount;
  }

  return { propertyStats, totals, monthly, expensesByCategory };
}

export default function ReportsPage() {
  const [rawProperties, setRawProperties] = useState<PropertyRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | null>(null); // null = סה"כ

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((d) => {
        setRawProperties(d.propertyStats || []);
      })
      .catch(() => setError("שגיאה בטעינת הדוחות"))
      .finally(() => setLoading(false));
  }, []);

  const availableYears = useMemo(() => deriveYears(rawProperties), [rawProperties]);

  const { propertyStats, totals, monthly, expensesByCategory } = useMemo(
    () => computeStats(rawProperties, selectedYear),
    [rawProperties, selectedYear]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-xl text-gray-500">מייצר דוחות...</div>
      </div>
    );
  }

  const maxMonthlyIncome = Math.max(...monthly.map((m) => m.income), 1);
  const maxCatExpense = Math.max(...Object.values(expensesByCategory), 1);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
              <Link href="/dashboard" className="hover:text-gray-600">לוח בקרה</Link>
              <span>/</span>
              <span className="text-gray-600">דוחות</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">דוחות ואנליטיקה</h1>
          </div>
          <Link href="/dashboard" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold text-sm">
            חזרה
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 space-y-6">
        {error && <div className="p-4 bg-red-100 border border-red-300 text-red-700 rounded-xl">{error}</div>}

        {/* Year filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-600">תקופה:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedYear(null)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                selectedYear === null
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              סה&quot;כ
            </button>
            {availableYears.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                  selectedYear === year
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "נכסים", value: String(totals.properties), color: "text-gray-800" },
            { label: "חוזים פעילים", value: String(totals.activeLeases), color: "text-blue-600" },
            { label: selectedYear ? `הכנסה ${selectedYear}` : "הכנסה חודשית", value: selectedYear ? fmt(totals.totalPaid) : fmt(totals.monthlyRent), color: "text-green-600" },
            { label: selectedYear ? `נטו ${selectedYear}` : "הכנסה נטו (כולל)", value: fmt(totals.netIncome), color: totals.netIncome >= 0 ? "text-green-600" : "text-red-500" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-xs font-semibold text-gray-400 uppercase mb-1">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Per-property summary table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              סיכום לפי נכס{selectedYear ? ` — ${selectedYear}` : ""}
            </h2>
          </div>
          {propertyStats.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400">אין נתונים</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">נכס</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">סוג</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">שכ"ד / חודש</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">הכנסה כוללת</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">הוצאות</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">נטו</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {propertyStats.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-gray-900">{p.title}</div>
                        <div className="text-gray-400 text-xs">{p.city}</div>
                      </td>
                      <td className="px-4 py-4 text-gray-600">{PROPERTY_TYPE_HE[p.propertyType] ?? p.propertyType}</td>
                      <td className="px-4 py-4 font-semibold text-green-600">{p.monthlyRent > 0 ? fmt(p.monthlyRent) : "—"}</td>
                      <td className="px-4 py-4 text-gray-700">{p.totalPaid > 0 ? fmt(p.totalPaid) : "—"}</td>
                      <td className="px-4 py-4 text-red-500">{p.totalExpenses > 0 ? fmt(p.totalExpenses) : "—"}</td>
                      <td className={`px-4 py-4 font-bold ${p.netIncome >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {fmt(p.netIncome)}
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/dashboard/reports/${p.id}`}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-semibold"
                        >
                          דוח מפורט
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 font-bold text-gray-700">סה"כ</td>
                    <td className="px-4 py-3 font-bold text-green-600">{fmt(totals.monthlyRent)}</td>
                    <td className="px-4 py-3 font-bold text-gray-700">{fmt(totals.totalPaid)}</td>
                    <td className="px-4 py-3 font-bold text-red-500">{fmt(totals.totalExpenses)}</td>
                    <td className={`px-4 py-3 font-bold ${totals.netIncome >= 0 ? "text-green-600" : "text-red-500"}`}>{fmt(totals.netIncome)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Monthly breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              פעילות חודשית{selectedYear ? ` — ${selectedYear}` : ""}
            </h2>
            {monthly.length === 0 ? (
              <p className="text-gray-400 text-sm">אין נתונים</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {[...monthly].reverse().map((m) => {
                  const [year, month] = m.month.split("-");
                  const monthName = `${MONTH_HE[parseInt(month) - 1]} ${year}`;
                  return (
                    <div key={m.month}>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span className="font-semibold text-gray-700">{monthName}</span>
                        <span className={m.net >= 0 ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                          נטו: {fmt(m.net)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="w-14 text-gray-500">הכנסה</span>
                          <div className="flex-1"><Bar value={m.income} max={maxMonthlyIncome} color="bg-green-400" /></div>
                          <span className="w-20 text-left text-green-600 font-semibold">{fmt(m.income)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="w-14 text-gray-500">הוצאות</span>
                          <div className="flex-1"><Bar value={m.expenses} max={maxMonthlyIncome} color="bg-red-400" /></div>
                          <span className="w-20 text-left text-red-500 font-semibold">{fmt(m.expenses)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Expenses by category */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              הוצאות לפי קטגוריה{selectedYear ? ` — ${selectedYear}` : ""}
            </h2>
            {Object.keys(expensesByCategory).length === 0 ? (
              <p className="text-gray-400 text-sm">אין הוצאות</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(expensesByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, amount]) => (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-gray-700">{EXPENSE_CAT_HE[cat] ?? cat}</span>
                        <span className="text-red-500 font-bold">{fmt(amount)}</span>
                      </div>
                      <Bar value={amount} max={maxCatExpense} color="bg-orange-400" />
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
