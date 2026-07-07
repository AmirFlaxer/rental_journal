"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiGet, queryKeys } from "@/lib/api-client";
import { getReceivedAmount } from "@/lib/domain/partial-payment";

const MONTHS_SHORT = [
  "ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני",
  "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳",
];

const MONTHS_HE = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
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
  notes?: string | null;
}

interface Property {
  id: string;
  title: string;
  city: string;
  payments: RawPayment[];
}

interface ReportsResponse { propertyStats: Property[]; }

const EMPTY_PROPERTIES: Property[] = [];

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
        // דוח מס לדיווח אמיתי - צריך לספור את הסכום שהתקבל בפועל, לא את הסכום
        // המלא. תשלום חלקי (status="partial") מקודד את הסכום שהתקבל ב-notes.
        months[monthIdx] += getReceivedAmount(pay);
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
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.reports,
    queryFn: () => apiGet<ReportsResponse>("/api/reports"),
  });

  const properties = data?.propertyStats ?? EMPTY_PROPERTIES;

  const availableYears = useMemo(() => deriveYears(properties), [properties]);

  const { rows, monthTotals, grandTotal } = useMemo(
    () => computeTaxTable(properties, selectedYear),
    [properties, selectedYear]
  );

  const taxTotal = Math.round(grandTotal * 0.1);
  const taxMonths = monthTotals.map((v) => Math.round(v * 0.1));
  const hasAnyData = grandTotal > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
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
          <div className="flex gap-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-semibold text-sm flex items-center gap-2"
            >
              🖨️ הדפס / PDF
            </button>
            <Link href="/dashboard/reports" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold text-sm">
              חזרה לדוחות
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 space-y-6">
        {isError && (
          <div className="p-4 bg-red-100 border border-red-300 text-red-700 rounded-xl flex items-center justify-between gap-3">
            <span>שגיאה בטעינת הנתונים</span>
            <button
              onClick={() => refetch()}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 flex-shrink-0"
            >
              נסה שוב
            </button>
          </div>
        )}

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
                    ? "bg-orange-500 text-white border-orange-500"
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="text-xs font-semibold text-gray-400 uppercase mb-1">סה&quot;כ תקבולי שכ&quot;ד {selectedYear}</div>
            <div className="text-2xl font-bold text-green-700">{fmtFull(grandTotal)}</div>
          </div>
          <div className="bg-orange-50 rounded-xl shadow-sm border border-orange-200 p-5">
            <div className="text-xs font-semibold text-orange-600 uppercase mb-1">מס הכנסה לתשלום (10%)</div>
            <div className="text-2xl font-bold text-orange-700">{fmtFull(taxTotal)}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="text-xs font-semibold text-gray-400 uppercase mb-1">נכסים מניבים</div>
            <div className="text-2xl font-bold text-gray-800">{rows.length}</div>
          </div>
        </div>

        {/* Main table */}
        {!hasAnyData ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-medium">אין תקבולי שכ&quot;ד שולמו ב-{selectedYear}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  תקבולים לפי נכס וחודש — {selectedYear}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">כל הסכומים בש&quot;ח · בסיס מזומן (תאריך פירעון)</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: "900px" }}>
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {/* עמודת נכס */}
                    <th className="px-4 py-3 text-right font-bold text-gray-700 sticky right-0 bg-gray-50 z-10 border-l border-gray-200" style={{ minWidth: "150px" }}>
                      נכס
                    </th>
                    {/* 12 חודשים */}
                    {MONTHS_SHORT.map((m, i) => (
                      <th key={i} className="px-2 py-3 text-center font-semibold text-gray-600 border-l border-gray-100" style={{ minWidth: "72px" }}>
                        {m}
                      </th>
                    ))}
                    {/* סה"כ */}
                    <th className="px-4 py-3 text-center font-bold text-gray-700 border-l border-gray-300 bg-gray-100" style={{ minWidth: "90px" }}>
                      סה&quot;כ
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 sticky right-0 bg-white hover:bg-gray-50 z-10 border-l border-gray-200">
                        <div className="font-semibold text-gray-900 text-sm">{row.title}</div>
                        <div className="text-xs text-gray-400">{row.city}</div>
                      </td>
                      {row.months.map((v, i) => (
                        <td key={i} className="px-2 py-3 text-center text-gray-700 border-l border-gray-100 tabular-nums">
                          {fmt(v)}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center font-bold text-green-700 border-l border-gray-300 bg-gray-50 tabular-nums">
                        {fmtFull(row.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  {/* שורת סה"כ תקבולים */}
                  <tr className="border-t-2 border-gray-300 bg-gray-100">
                    <td className="px-4 py-3 sticky right-0 bg-gray-100 z-10 font-bold text-gray-800 border-l border-gray-300">
                      סה&quot;כ תקבולים
                    </td>
                    {monthTotals.map((v, i) => (
                      <td key={i} className="px-2 py-3 text-center font-semibold text-gray-800 border-l border-gray-200 tabular-nums">
                        {fmt(v)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center font-bold text-gray-900 border-l border-gray-300 bg-gray-200 tabular-nums">
                      {fmtFull(grandTotal)}
                    </td>
                  </tr>

                  {/* שורת מס הכנסה 10% */}
                  <tr className="border-t border-orange-300 bg-orange-50">
                    <td className="px-4 py-3 sticky right-0 bg-orange-50 z-10 font-bold text-orange-800 border-l border-orange-200">
                      מס הכנסה 10%
                    </td>
                    {taxMonths.map((v, i) => (
                      <td key={i} className="px-2 py-3 text-center font-semibold text-orange-700 border-l border-orange-100 tabular-nums">
                        {fmt(v)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center font-bold text-orange-800 text-base border-l border-orange-300 bg-orange-100 tabular-nums">
                      {fmtFull(taxTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* הסבר */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-900 space-y-1">
          <p className="font-bold text-amber-800">מסלול מס 10% — מה מוצג כאן?</p>
          <p>טבלה זו מציגה את כלל תקבולי שכ&quot;ד <strong>ששולמו בפועל</strong> בשנת {selectedYear}, לפי נכס וחודש.</p>
          <p>שורת &quot;מס הכנסה 10%&quot; מחשבת את חבות המס לפי מסלול המס המוקטן — 10% מסך התקבולים.</p>
          <p className="text-amber-700">בחרת במסלול אחר? כבה את החישוב האוטומטי <Link href="/dashboard/settings" className="underline font-bold text-amber-800">בהגדרות</Link>.</p>
        </div>

        {/* פירוט חודשי */}
        {hasAnyData && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-bold text-gray-900">פירוט חודשי</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {monthTotals.map((total, i) => {
                if (total === 0) return null;
                const tax = Math.round(total * 0.1);
                return (
                  <div key={i} className="px-6 py-3 flex items-center gap-4">
                    <div className="w-20 text-sm font-semibold text-gray-700">{MONTHS_HE[i]}</div>
                    <div className="flex-1 flex justify-between text-sm">
                      <span className="text-gray-500">תקבולים: <span className="font-semibold text-gray-800">{fmtFull(total)}</span></span>
                      <span className="text-gray-500">מס 10%: <span className="font-semibold text-orange-700">{fmtFull(tax)}</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t-2 border-gray-200 flex justify-between items-center">
              <span className="font-bold text-gray-700">סה&quot;כ {selectedYear}</span>
              <div className="flex gap-6 text-sm">
                <span className="text-gray-700">תקבולים: <strong className="text-green-700">{fmtFull(grandTotal)}</strong></span>
                <span className="text-gray-700">מס 10%: <strong className="text-orange-700">{fmtFull(taxTotal)}</strong></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
