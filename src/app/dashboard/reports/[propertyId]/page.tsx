"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const EXPENSE_CAT_HE: Record<string, string> = {
  Maintenance: "תחזוקה",
  Insurance: "ביטוח",
  Tax: "מס",
  Utilities: "שירותים",
  "Professional Fees": "שכ\"ט",
  Other: "אחר",
};

const PAYMENT_TYPE_HE: Record<string, string> = {
  Rent: "שכ\"ד",
  Deposit: "פיקדון",
  Return: "החזר",
  Other: "אחר",
};

const LEASE_STATUS_HE: Record<string, string> = {
  active: "פעיל",
  ended: "הסתיים",
  paused: "מושהה",
};

interface ReportData {
  id: string;
  title: string;
  city: string;
  propertyType: string;
  monthlyRent: number;
  totalExpenses: number;
  totalPaid: number;
  totalPending: number;
  netIncome: number;
  expensesByCategory: Record<string, number>;
  leases: any[];
  expenses: any[];
  payments: any[];
}

function fmt(n: number) {
  return `₪${Math.round(n).toLocaleString("he-IL")}`;
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function PropertyReportPage() {
  const { propertyId } = useParams() as { propertyId: string };
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((d) => {
        const found = (d.propertyStats || []).find((p: ReportData) => p.id === propertyId);
        if (found) setReport(found);
        else setError("הנכס לא נמצא");
      })
      .catch(() => setError("שגיאה בטעינת הדוח"))
      .finally(() => setLoading(false));
  }, [propertyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-xl text-gray-500">מייצר דוח...</div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/dashboard/reports" className="text-blue-600 hover:underline">חזרה לדוחות</Link>
        </div>
      </div>
    );
  }

  const maxCat = Math.max(...Object.values(report.expensesByCategory), 1);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
              <Link href="/dashboard" className="hover:text-gray-600">לוח בקרה</Link>
              <span>/</span>
              <Link href="/dashboard/reports" className="hover:text-gray-600">דוחות</Link>
              <span>/</span>
              <span className="text-gray-600">{report.title}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{report.title}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{report.city}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/properties/${propertyId}`}
              className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-semibold text-sm"
            >
              פרטי הנכס
            </Link>
            <Link
              href="/dashboard/reports"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold text-sm"
            >
              חזרה
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "שכ\"ד חודשי", value: report.monthlyRent > 0 ? fmt(report.monthlyRent) : "—", color: "text-green-600" },
            { label: "הכנסה כוללת", value: fmt(report.totalPaid), color: "text-blue-600" },
            { label: "הוצאות כוללות", value: fmt(report.totalExpenses), color: "text-red-500" },
            { label: "רווח נטו", value: fmt(report.netIncome), color: report.netIncome >= 0 ? "text-green-600" : "text-red-500" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="text-xs font-semibold text-gray-400 uppercase mb-1">{label}</div>
              <div className={`text-xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Expenses breakdown + Leases side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Expenses by category */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">הוצאות לפי קטגוריה</h2>
            {Object.keys(report.expensesByCategory).length === 0 ? (
              <p className="text-gray-400 text-sm">אין הוצאות רשומות</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(report.expensesByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, amount]) => (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-semibold text-gray-700">{EXPENSE_CAT_HE[cat] ?? cat}</span>
                        <span className="text-red-500 font-bold">{fmt(amount)}</span>
                      </div>
                      <Bar value={amount} max={maxCat} color="bg-orange-400" />
                    </div>
                  ))}
                <div className="pt-2 border-t border-gray-100 flex justify-between text-sm font-bold">
                  <span>סה"כ</span>
                  <span className="text-red-600">{fmt(report.totalExpenses)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Leases */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">חוזי שכירות</h2>
            {(report.leases || []).length === 0 ? (
              <p className="text-gray-400 text-sm">אין חוזים</p>
            ) : (
              <div className="space-y-3">
                {(report.leases || []).map((lease: any) => (
                  <div key={lease.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-gray-800">
                        {lease.tenant?.firstName} {lease.tenant?.lastName}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        lease.status === "active" ? "bg-green-100 text-green-700" :
                        lease.status === "ended" ? "bg-gray-100 text-gray-600" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {LEASE_STATUS_HE[lease.status] ?? lease.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(lease.startDate).toLocaleDateString("he-IL")} — {new Date(lease.endDate).toLocaleDateString("he-IL")}
                    </div>
                    <div className="text-sm font-semibold text-green-600 mt-1">{fmt(lease.monthlyRent)} / חודש</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Monthly rent schedule per lease */}
        {(report.leases || []).map((lease: any) => {
          const start = new Date(lease.startDate);
          const end = new Date(lease.endDate);
          const today = new Date();

          // Build list of all months in the lease
          const months: { key: string; label: string; due: Date }[] = [];
          const cur = new Date(start.getFullYear(), start.getMonth(), 1);
          while (cur <= end) {
            const due = new Date(cur.getFullYear(), cur.getMonth(), start.getDate());
            months.push({
              key: cur.toISOString().slice(0, 7),
              label: cur.toLocaleDateString("he-IL", { month: "short", year: "numeric" }),
              due,
            });
            cur.setMonth(cur.getMonth() + 1);
          }

          // Match payments to months
          const rentPayments: any[] = (report.payments || []).filter(
            (p: any) => p.leaseId === lease.id && p.paymentType === "Rent"
          );

          return (
            <div key={lease.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    לוח תקבולים — {lease.tenant?.firstName} {lease.tenant?.lastName}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(lease.startDate).toLocaleDateString("he-IL")} — {new Date(lease.endDate).toLocaleDateString("he-IL")}
                    {" · "}₪{Number(lease.monthlyRent).toLocaleString()} / חודש
                  </p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                  lease.status === "active" ? "bg-green-100 text-green-700" :
                  lease.status === "ended" ? "bg-gray-100 text-gray-600" :
                  "bg-yellow-100 text-yellow-700"
                }`}>
                  {LEASE_STATUS_HE[lease.status] ?? lease.status}
                </span>
              </div>
              <div className="p-4 flex flex-wrap gap-2">
                {months.map(({ key, label, due }) => {
                  const match = rentPayments.find((p: any) => (p.dueDate || "").slice(0, 7) === key);
                  const isPaid = match?.status === "paid" || !!match?.paidDate;
                  const isFuture = due > today;
                  const isOverdue = !isPaid && !isFuture;
                  return (
                    <div key={key} className={`flex flex-col items-center px-3 py-2 rounded-lg border text-xs font-semibold min-w-[68px] ${
                      isPaid ? "bg-green-50 border-green-300 text-green-700" :
                      isFuture ? "bg-gray-50 border-gray-200 text-gray-500" :
                      "bg-red-50 border-red-300 text-red-700"
                    }`}>
                      <span>{label}</span>
                      <span className="mt-0.5">
                        {isPaid ? "✅" : isFuture ? "🔲" : "❌"}
                      </span>
                      {isPaid && match?.paidDate && (
                        <span className="text-[10px] text-gray-400">
                          {new Date(match.paidDate).toLocaleDateString("he-IL", { day: "numeric", month: "numeric" })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {months.length === 0 && (
                <p className="px-6 py-4 text-gray-400 text-sm">אין חודשים בטווח החוזה</p>
              )}
            </div>
          );
        })}

        {/* תקבולים table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">תקבולים</h2>
            <div className="flex gap-4 text-sm">
              <span className="text-green-600 font-semibold">שולם: {fmt(report.totalPaid)}</span>
              {report.totalPending > 0 && (
                <span className="text-orange-500 font-semibold">ממתין: {fmt(report.totalPending)}</span>
              )}
            </div>
          </div>
          {(report.payments || []).length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-400">אין תקבולים</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">סוג</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">תאריך לתקבול</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">תאריך שולם</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">סכום</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">סטטוס</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...(report.payments || [])]
                    .sort((a: any, b: any) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
                    .map((pay: any) => (
                      <tr key={pay.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700">{PAYMENT_TYPE_HE[pay.paymentType] ?? pay.paymentType}</td>
                        <td className="px-4 py-3 text-gray-600">{new Date(pay.dueDate).toLocaleDateString("he-IL")}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {pay.paidDate ? new Date(pay.paidDate).toLocaleDateString("he-IL") : "—"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{fmt(pay.amount)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                            pay.status === "paid" ? "bg-green-100 text-green-700" :
                            pay.status === "overdue" ? "bg-red-100 text-red-600" :
                            "bg-yellow-100 text-yellow-700"
                          }`}>
                            {pay.status === "paid" ? "שולם" : pay.status === "overdue" ? "באיחור" : "ממתין"}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Expenses detail */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">פירוט הוצאות</h2>
          </div>
          {(report.expenses || []).length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-400">אין הוצאות</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">תיאור</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">קטגוריה</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">תאריך</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">סכום</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...(report.expenses || [])]
                    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((exp: any) => (
                      <tr key={exp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900">{exp.description}</td>
                        <td className="px-4 py-3 text-gray-600">{EXPENSE_CAT_HE[exp.category] ?? exp.category}</td>
                        <td className="px-4 py-3 text-gray-600">{new Date(exp.date).toLocaleDateString("he-IL")}</td>
                        <td className="px-4 py-3 font-semibold text-red-500">{fmt(exp.amount)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
