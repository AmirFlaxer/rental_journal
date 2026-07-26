"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiGet, queryKeys } from "@/lib/api-client";
import { Icon } from "@/components/Icon";
import { formatCurrency } from "@/lib/domain/money";

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

interface RawPayment { id: string; amount: number; paid_date?: string; payment_type: string; due_date: string; }
interface RawExpense { id: string; amount: number; date: string; category: string; }

interface PropertyRaw {
  id: string;
  title: string;
  city: string;
  property_type: string;
  active_leases: number;
  monthly_rent: number;
  last_monthly_rent: number;
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
  lastMonthlyRent: number;
  totalExpenses: number;
  totalPaid: number;
  netIncome: number;
  tax10: number;
  netAfterTax: number;
}

interface Totals {
  properties: number;
  activeLeases: number;
  monthlyRent: number;
  totalExpenses: number;
  totalPaid: number;
  netIncome: number;
  tax10: number;
  netAfterTax: number;
}

interface MonthlyEntry { month: string; income: number; expenses: number; net: number; }

interface ReportsResponse { property_stats: PropertyRaw[]; }

const EMPTY_PROPERTIES: PropertyRaw[] = [];

const fmt = formatCurrency;

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full bg-black/30 rounded-full h-2.5 overflow-hidden">
      <div
        className={`h-2.5 rounded-full bg-gradient-to-l ${color} transition-all duration-700 ease-out`}
        style={{ width: `${Math.max(pct, value > 0 ? 4 : 0)}%` }}
      />
    </div>
  );
}

function deriveYears(properties: PropertyRaw[]): number[] {
  const years = new Set<number>();
  for (const p of properties) {
    for (const pay of p.payments) {
      // Use due_date (rent month) for year derivation, consistent with the grouping below.
      const key = pay.due_date || pay.paid_date;
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
    // Filter by rent month (due_date) - consistent with the backend (/api/reports) and the monthly chart below.
    const payments = year
      ? p.payments.filter((pay) => pay.due_date && new Date(pay.due_date).getFullYear() === year)
      : p.payments;
    const expenses = year
      ? p.expenses.filter((exp) => exp.date && new Date(exp.date).getFullYear() === year)
      : p.expenses;

    const totalPaid = payments.filter((pay) => pay.paid_date).reduce((s, pay) => s + pay.amount, 0);
    const totalExpenses = expenses.reduce((s, exp) => s + exp.amount, 0);

    const tax10 = Math.round(totalPaid * 0.1);
    return {
      id: p.id,
      title: p.title,
      city: p.city,
      propertyType: p.property_type,
      activeLeases: p.active_leases,
      monthlyRent: p.monthly_rent,
      lastMonthlyRent: p.last_monthly_rent,
      totalPaid,
      totalExpenses,
      netIncome: totalPaid - totalExpenses,
      tax10,
      netAfterTax: totalPaid - totalExpenses - tax10,
    };
  });

  const totals: Totals = {
    properties: properties.length,
    activeLeases: propertyStats.reduce((s, p) => s + p.activeLeases, 0),
    monthlyRent: propertyStats.reduce((s, p) => s + p.monthlyRent, 0),
    totalExpenses: propertyStats.reduce((s, p) => s + p.totalExpenses, 0),
    totalPaid: propertyStats.reduce((s, p) => s + p.totalPaid, 0),
    netIncome: propertyStats.reduce((s, p) => s + p.netIncome, 0),
    tax10: propertyStats.reduce((s, p) => s + p.tax10, 0),
    netAfterTax: propertyStats.reduce((s, p) => s + p.netAfterTax, 0),
  };

  // Include only PAID payments in income, but bucket them by their rent month (dueDate),
  // not by the date the money was actually received. This is what matches the backend and
  // what users mean when they ask "how much rent came in for March?".
  const allPayments = properties.flatMap((p) =>
    p.payments.filter((pay) => pay.paid_date && pay.due_date && (!year || new Date(pay.due_date).getFullYear() === year))
  );
  const allExpenses = properties.flatMap((p) =>
    p.expenses.filter((exp) => exp.date && (!year || new Date(exp.date).getFullYear() === year))
  );

  const monthlyMap: Record<string, { income: number; expenses: number }> = {};
  for (const pay of allPayments) {
    const key = new Date(pay.due_date).toISOString().slice(0, 7);
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
  const [selectedYear, setSelectedYear] = useState<number | null>(null); // null = סה"כ
  const [showTax, setShowTax] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.reports,
    queryFn: () => apiGet<ReportsResponse>("/api/reports"),
  });

  const rawProperties = data?.property_stats ?? EMPTY_PROPERTIES;

  const availableYears = useMemo(() => deriveYears(rawProperties), [rawProperties]);

  const { propertyStats, totals, monthly, expensesByCategory } = useMemo(
    () => computeStats(rawProperties, selectedYear),
    [rawProperties, selectedYear]
  );

  if (isLoading) {
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
      <div className="bg-white border-b border-gray-200 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none grad-accent-fade-l" />
        <div className="max-w-6xl mx-auto px-4 py-5 sm:px-6 flex justify-between items-center relative">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-1.5">
              <Link href="/dashboard" className="hover:text-gray-600 transition-colors">לוח בקרה</Link>
              <span className="opacity-50">/</span>
              <span className="text-gray-600">דוחות</span>
            </div>
            <h1 className="text-2xl sm:text-[28px] font-extrabold text-gray-900 flex items-center gap-2.5">
              <span className="inline-block w-1.5 h-7 rounded-full tick-accent" />
              דוחות ואנליטיקה
            </h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/dashboard/reports/linkage" className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 font-semibold text-sm transition-colors">
              השוואת הצמדה <Icon name="reports" size={14} className="inline" />
            </Link>
            <Link href="/dashboard/reports/tax" className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 font-semibold text-sm transition-colors">
              דוח מס שנתי <Icon name="taxReport" size={14} className="inline" />
            </Link>
            <Link href="/dashboard" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold text-sm transition-colors">
              חזרה
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 space-y-6">
        {isError && (
          <div className="p-4 bg-red-100 border border-red-300 text-red-700 rounded-xl flex items-center justify-between gap-3">
            <span>שגיאה בטעינת הדוחות</span>
            <button
              onClick={() => refetch()}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 flex-shrink-0"
            >
              נסה שוב
            </button>
          </div>
        )}

        {/* Year filter + tax toggle */}
        <div className="flex flex-wrap items-center gap-3">
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
          <div className="mr-auto">
            <button
              onClick={() => setShowTax((v) => !v)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                showTax
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-white text-amber-600 border-amber-300 hover:bg-amber-50"
              }`}
            >
              מסלול מס 10%
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(() => {
            const profitCard = showTax
              ? { label: selectedYear ? `רווח אחרי מס ${selectedYear}` : "רווח אחרי מס", value: fmt(totals.netAfterTax), positive: totals.netAfterTax >= 0 }
              : { label: selectedYear ? `רווח נטו ${selectedYear}` : "רווח נטו (כולל)", value: fmt(totals.netIncome), positive: totals.netIncome >= 0 };
            const cards = [
              { label: "נכסים", value: String(totals.properties), icon: "properties" as const, gradient: "from-zinc-600 to-zinc-800" },
              { label: "חוזים פעילים", value: String(totals.activeLeases), icon: "leases" as const, gradient: "from-pink-500 to-pink-700" },
              { label: selectedYear ? `הכנסה ${selectedYear}` : "הכנסה חודשית", value: selectedYear ? fmt(totals.totalPaid) : fmt(totals.monthlyRent), icon: "rentCollection" as const, gradient: "from-emerald-500 to-emerald-700" },
              { label: profitCard.label, value: profitCard.value, icon: profitCard.positive ? "paid" as const : "unpaid" as const, gradient: profitCard.positive ? "from-emerald-500 to-emerald-700" : "from-rose-500 to-rose-700" },
            ];
            return cards.map(({ label, value, icon, gradient }) => (
              <div key={label} className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${gradient} text-white`}>
                <div className="absolute -top-3 -left-3 opacity-15 select-none"><Icon name={icon} size={48} color="white" /></div>
                <div className="text-[11px] font-bold text-white/75 uppercase tracking-wide mb-1.5 relative">{label}</div>
                <div className="text-2xl font-extrabold relative drop-shadow-sm">{value}</div>
              </div>
            ));
          })()}
        </div>
        {showTax && (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-amber-500/30 p-5 bg-gradient-to-br from-amber-500/15 to-amber-700/5">
              <div className="text-xs font-semibold text-amber-500 uppercase mb-1">מס 10% משוער</div>
              <div className="text-2xl font-bold text-amber-400">{fmt(totals.tax10)}</div>
              <div className="text-xs text-amber-500/80 mt-1">10% מ-<span className="num-ltr">{fmt(totals.totalPaid)}</span> הכנסה</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-xs font-semibold text-gray-400 uppercase mb-1">רווח לפני מס</div>
              <div className={`text-2xl font-bold ${totals.netIncome >= 0 ? "text-green-600" : "text-red-500"}`}>{fmt(totals.netIncome)}</div>
              <div className="text-xs text-gray-400 mt-1">הכנסות פחות הוצאות</div>
            </div>
          </div>
        )}

        {/* Per-property summary table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2.5">
              <span className="inline-block w-1 h-5 rounded-full tick-accent" />
              סיכום לפי נכס{selectedYear ? ` - ${selectedYear}` : ""}
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
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">{'שכ"ד'} / חודש</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">הכנסה כוללת</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">הוצאות</th>
                    {showTax && <th className="px-4 py-3 text-right font-semibold text-amber-600">מס 10%</th>}
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">{showTax ? "נטו לפני מס" : "נטו"}</th>
                    {showTax && <th className="px-4 py-3 text-right font-semibold text-gray-600">נטו אחרי מס</th>}
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
                      <td className="px-4 py-4 font-semibold">
                        {p.monthlyRent > 0
                          ? <span className="text-green-600">{fmt(p.monthlyRent)}</span>
                          : p.lastMonthlyRent > 0
                            ? <span className="text-gray-400"><span className="num-ltr">{fmt(p.lastMonthlyRent)}</span> <span className="text-xs font-normal">(לא פעיל)</span></span>
                            : "-"}
                      </td>
                      <td className="px-4 py-4 text-gray-700">{p.totalPaid > 0 ? fmt(p.totalPaid) : "-"}</td>
                      <td className="px-4 py-4 text-red-500">{p.totalExpenses > 0 ? fmt(p.totalExpenses) : "-"}</td>
                      {showTax && <td className="px-4 py-4 font-semibold text-amber-600">{p.tax10 > 0 ? fmt(p.tax10) : "-"}</td>}
                      <td className={`px-4 py-4 font-bold ${p.netIncome >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {fmt(p.netIncome)}
                      </td>
                      {showTax && (
                        <td className={`px-4 py-4 font-bold ${p.netAfterTax >= 0 ? "text-green-600" : "text-red-500"}`}>
                          {fmt(p.netAfterTax)}
                        </td>
                      )}
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
                    <td colSpan={2} className="px-4 py-3 font-bold text-gray-700">{'סה"כ'}</td>
                    <td className="px-4 py-3 font-bold text-green-600">{fmt(totals.monthlyRent)}</td>
                    <td className="px-4 py-3 font-bold text-gray-700">{fmt(totals.totalPaid)}</td>
                    <td className="px-4 py-3 font-bold text-red-500">{fmt(totals.totalExpenses)}</td>
                    {showTax && <td className="px-4 py-3 font-bold text-amber-600">{fmt(totals.tax10)}</td>}
                    <td className={`px-4 py-3 font-bold ${totals.netIncome >= 0 ? "text-green-600" : "text-red-500"}`}>{fmt(totals.netIncome)}</td>
                    {showTax && <td className={`px-4 py-3 font-bold ${totals.netAfterTax >= 0 ? "text-green-600" : "text-red-500"}`}>{fmt(totals.netAfterTax)}</td>}
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
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2.5">
              <span className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600" />
              פעילות חודשית{selectedYear ? ` - ${selectedYear}` : ""}
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
                          נטו: <span className="num-ltr">{fmt(m.net)}</span>
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="w-14 text-gray-500">הכנסה</span>
                          <div className="flex-1"><Bar value={m.income} max={maxMonthlyIncome} color="from-emerald-400 to-emerald-600" /></div>
                          <span className="w-20 text-left text-green-600 font-semibold">{fmt(m.income)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="w-14 text-gray-500">הוצאות</span>
                          <div className="flex-1"><Bar value={m.expenses} max={maxMonthlyIncome} color="from-rose-400 to-rose-600" /></div>
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
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2.5">
              <span className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-orange-400 to-orange-600" />
              הוצאות לפי קטגוריה{selectedYear ? ` - ${selectedYear}` : ""}
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
                      <Bar value={amount} max={maxCatExpense} color="from-orange-400 to-orange-600" />
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
