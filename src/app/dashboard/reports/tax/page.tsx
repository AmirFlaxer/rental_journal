"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

const MONTHS_HE = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

const MONTHS_SHORT = [
  "ינו'", "פבר'", "מרץ", "אפר'", "מאי", "יוני",
  "יולי", "אוג'", "ספט'", "אוק'", "נוב'", "דצמ'",
];

function fmt(n: number) {
  if (n === 0) return "—";
  return `₪${Math.round(n).toLocaleString("he-IL")}`;
}

function fmtFull(n: number) {
  return `₪${Math.round(n).toLocaleString("he-IL")}`;
}

interface RawPayment {
  id: string;
  amount: number;
  paidDate?: string | null;
  dueDate: string;
  paymentType: string;
  status: string;
}

interface Property {
  id: string;
  title: string;
  city: string;
  payments: RawPayment[];
}

function deriveYears(properties: Property[]): number[] {
  const years = new Set<number>();
  for (const p of properties) {
    for (const pay of p.payments) {
      if (pay.paidDate && pay.paymentType === "Rent") {
        years.add(new Date(pay.dueDate).getFullYear());
      }
    }
  }
  if (years.size === 0) years.add(new Date().getFullYear());
  return Array.from(years).sort((a, b) => b - a);
}

interface TaxTableData {
  rows: { id: string; title: string; city: string; months: number[]; total: number }[];
  monthTotals: number[];
  grandTotal: number;
}

function computeTaxTable(properties: Property[], year: number): TaxTableData {
  const rows = properties.map((p) => {
    const months = Array(12).fill(0);
    for (const pay of p.payments) {
      if (
        pay.paymentType === "Rent" &&
        pay.paidDate &&
        new Date(pay.dueDate).getFullYear() === year
      ) {
        const monthIdx = new Date(pay.dueDate).getMonth();
        months[monthIdx] += pay.amount;
      }
    }
    const total = months.reduce((s, v) => s + v, 0);
    return { id: p.id, title: p.title, city: p.city, months, total };
  }).filter((r) => r.total > 0);

  const monthTotals = Array(12).fill(0);
  for (const row of rows) {
    for (let m = 0; m < 12; m++) {
      monthTotals[m] += row.months[m];
    }
  }
  const grandTotal = monthTotals.reduce((s, v) => s + v, 0);

  return { rows, monthTotals, grandTotal };
}

export default function TaxReportPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((d) => {
        setProperties((d.propertyStats as Property[]) || []);
      })
      .catch(() => setError("שגיאה בטעינת הנתונים"))
      .finally(() => setLoading(false));
  }, []);

  const availableYears = useMemo(() => deriveYears(properties), [properties]);

  const { rows, monthTotals, grandTotal } = useMemo(
    () => computeTaxTable(properties, selectedYear),
    [properties, selectedYear]
  );

  const taxTotal = Math.round(grandTotal * 0.1);
  const taxMonths = monthTotals.map((v) => Math.round(v * 0.1));

  // חודשים שיש בהם נתונים
  const activeMonths = monthTotals.map((v) => v > 0);
  const hasAnyData = grandTotal > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
              <Link href="/dashboard" className="hover:text-gray-600">לוח בקרה</Link>
              <span>/</span>
              <Link href="/dashboard/reports" className="hover:text-gray-600">דוחות</Link>
              <span>/</span>
              <span className="text-gray-600">דוח מס שנתי</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">דוח מס הכנסה שנתי</h1>
            <p className="text-sm text-gray-500 mt-0.5">מסלול 10% על תקבולי שכ&quot;ד</p>
          </div>
          <Link href="/dashboard/reports" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold text-sm">
            חזרה לדוחות
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 space-y-6">
        {error && <div className="p-4 bg-red-100 border border-red-300 text-red-700 rounded-xl">{error}</div>}

        {/* Year selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-gray-600">שנת מס:</span>
          <div className="flex flex-wrap gap-2">
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

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="text-xs font-semibold text-gray-400 uppercase mb-1">סה&quot;כ תקבולי שכ&quot;ד {selectedYear}</div>
            <div className="text-2xl font-bold text-green-600">{fmtFull(grandTotal)}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="text-xs font-semibold text-gray-400 uppercase mb-1">מס הכנסה לתשלום (10%)</div>
            <div className="text-2xl font-bold text-orange-600">{fmtFull(taxTotal)}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="text-xs font-semibold text-gray-400 uppercase mb-1">נכסים מניבים</div>
            <div className="text-2xl font-bold text-indigo-600">{rows.length}</div>
          </div>
        </div>

        {/* Main table */}
        {!hasAnyData ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-medium">אין תקבולי שכ&quot;ד שולמו ב-{selectedYear}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                תקבולים לפי נכס וחודש — {selectedYear}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">מוצגים רק חודשים שיש בהם תקבולים</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600 sticky right-0 bg-gray-50 z-10 min-w-[140px]">נכס</th>
                    {MONTHS_SHORT.map((m, i) =>
                      activeMonths[i] ? (
                        <th key={i} className="px-3 py-3 text-center font-semibold text-gray-600 min-w-[80px]">{m}</th>
                      ) : null
                    )}
                    <th className="px-4 py-3 text-center font-bold text-gray-700 min-w-[100px] border-r border-gray-200">סה&quot;כ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 sticky right-0 bg-white hover:bg-gray-50 z-10">
                        <div className="font-semibold text-gray-900">{row.title}</div>
                        <div className="text-xs text-gray-400">{row.city}</div>
                      </td>
                      {row.months.map((v, i) =>
                        activeMonths[i] ? (
                          <td key={i} className="px-3 py-3 text-center text-gray-700">
                            {fmt(v)}
                          </td>
                        ) : null
                      )}
                      <td className="px-4 py-3 text-center font-bold text-green-700 border-r border-gray-200">
                        {fmtFull(row.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  {/* שורת סיכום תקבולים */}
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td className="px-4 py-3 sticky right-0 bg-gray-50 z-10 font-bold text-gray-700">סה&quot;כ תקבולים</td>
                    {monthTotals.map((v, i) =>
                      activeMonths[i] ? (
                        <td key={i} className="px-3 py-3 text-center font-semibold text-gray-700">
                          {fmt(v)}
                        </td>
                      ) : null
                    )}
                    <td className="px-4 py-3 text-center font-bold text-gray-800 border-r border-gray-200">
                      {fmtFull(grandTotal)}
                    </td>
                  </tr>
                  {/* שורת מס הכנסה 10% */}
                  <tr className="bg-orange-50 border-t border-orange-200">
                    <td className="px-4 py-3 sticky right-0 bg-orange-50 z-10 font-bold text-orange-700">
                      מס הכנסה 10%
                    </td>
                    {taxMonths.map((v, i) =>
                      activeMonths[i] ? (
                        <td key={i} className="px-3 py-3 text-center font-semibold text-orange-600">
                          {fmt(v)}
                        </td>
                      ) : null
                    )}
                    <td className="px-4 py-3 text-center font-bold text-orange-700 text-base border-r border-orange-200">
                      {fmtFull(taxTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* הסבר */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-800 space-y-1">
          <p className="font-semibold">מסלול מס 10% — מה מוצג כאן?</p>
          <p>טבלה זו מציגה את כלל תקבולי שכ&quot;ד <strong>ששולמו בפועל</strong> בשנת {selectedYear}, לפי נכס וחודש.</p>
          <p>שורת &quot;מס הכנסה 10%&quot; מחשבת את חבות המס לפי מסלול המס המוקטן — 10% מסך התקבולים.</p>
          <p className="text-blue-600">בחרת במסלול אחר? כבה את החישוב האוטומטי <Link href="/dashboard/settings" className="underline font-semibold">בהגדרות</Link>.</p>
        </div>

        {/* טבלה חודשית מפורטת */}
        {hasAnyData && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">פירוט חודשי</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {monthTotals.map((total, i) => {
                if (total === 0) return null;
                const tax = Math.round(total * 0.1);
                return (
                  <div key={i} className="px-6 py-4 flex items-center gap-4">
                    <div className="w-20 text-sm font-semibold text-gray-700">{MONTHS_HE[i]}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">תקבולים</span>
                        <span className="font-semibold text-green-700">{fmtFull(total)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">מס 10%</span>
                        <span className="font-semibold text-orange-600">{fmtFull(tax)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t-2 border-gray-200 flex justify-between items-center">
              <span className="font-bold text-gray-700">סה&quot;כ שנתי</span>
              <div className="text-left space-y-0.5">
                <div className="text-sm text-green-700 font-bold">תקבולים: {fmtFull(grandTotal)}</div>
                <div className="text-sm text-orange-600 font-bold">מס 10%: {fmtFull(taxTotal)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
