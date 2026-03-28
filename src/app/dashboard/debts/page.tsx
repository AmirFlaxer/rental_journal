"use client";

import { useEffect, useState } from "react";

function parsePartialPaid(notes?: string): number | null {
  if (!notes) return null;
  const m = notes.match(/^__partial__:(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}
function parsePartialReason(notes?: string): string {
  if (!notes) return "";
  return notes.replace(/^__partial__:\d+(?:\.\d+)?\n?/, "").trim();
}

interface Payment {
  id: string;
  paymentType: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: string;
  notes?: string;
  property?: { id: string; title: string };
  lease?: { id: string };
}

interface Lease {
  id: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  status: string;
  properties?: { id: string; title: string };
  tenant?: { firstName: string; lastName: string };
}

interface DebtItem {
  id: string;
  dueDate: string;
  amount: number;
  debtAmount: number;
  status: string;
  notes?: string;
  propertyId?: string;
  propertyTitle: string;
  isVirtual: boolean;
  leaseId?: string;
  propertyIdForCreate?: string;
}

function buildDebtList(payments: Payment[], leases: Lease[]): DebtItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const items: DebtItem[] = [];

  // Existing payments with debt (only past-due)
  for (const p of payments) {
    if (p.status === "paid") continue;
    if (new Date(p.dueDate) > today) continue;
    const partialPaid = parsePartialPaid(p.notes);
    const debtAmount = p.status === "partial" && partialPaid != null
      ? p.amount - partialPaid
      : p.amount;
    items.push({
      id: p.id,
      dueDate: p.dueDate,
      amount: p.amount,
      debtAmount,
      status: p.status,
      notes: p.notes,
      propertyTitle: p.property?.title ?? "",
      propertyId: p.property?.id,
      isVirtual: false,
    });
  }

  // Virtual overdue slots (past due, no payment record)
  for (const lease of leases) {
    if (lease.status !== "active") continue;
    const start = new Date(lease.startDate);
    const end = new Date(lease.endDate);
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    const startDay = start.getDate();

    while (cur <= today) {
      if (cur > new Date(end.getFullYear(), end.getMonth(), 1)) break;
      const year = cur.getFullYear();
      const month = cur.getMonth() + 1;
      const monthKey = `${year}-${String(month).padStart(2, "0")}`;
      const lastDay = new Date(year, month, 0).getDate();
      const day = Math.min(startDay, lastDay);
      const dueDate = `${monthKey}-${String(day).padStart(2, "0")}`;

      if (new Date(dueDate) <= today) {
        const existing = payments.find(
          (p) => p.lease?.id === lease.id && p.paymentType === "Rent" && p.dueDate.slice(0, 7) === monthKey
        );
        if (!existing) {
          items.push({
            id: `virtual-${lease.id}-${monthKey}`,
            dueDate,
            amount: lease.monthlyRent,
            debtAmount: lease.monthlyRent,
            status: "due",
            propertyTitle: lease.properties?.title ?? "",
            propertyId: lease.properties?.id,
            isVirtual: true,
            leaseId: lease.id,
            propertyIdForCreate: lease.properties?.id,
          });
        }
      }
      cur.setMonth(cur.getMonth() + 1);
    }
  }

  return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

const STATUS_HE: Record<string, string> = {
  pending: "ממתין",
  partial: "חלקי",
  late: "באיחור",
  due: "לתשלום",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  partial: "bg-blue-100 text-blue-700",
  late: "bg-red-100 text-red-700",
  due: "bg-red-100 text-red-700",
};

export default function DebtsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/payments").then((r) => r.json()),
      fetch("/api/leases").then((r) => r.json()),
    ]).then(([pay, leas]) => {
      if (Array.isArray(pay)) setPayments(pay);
      if (Array.isArray(leas)) setLeases(leas);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const debts = buildDebtList(payments, leases);
  const totalDebt = debts.reduce((s, d) => s + d.debtAmount, 0);

  // Group by property
  const byProperty: Record<string, { title: string; items: DebtItem[]; total: number }> = {};
  for (const d of debts) {
    const key = d.propertyId ?? d.propertyTitle;
    if (!byProperty[key]) byProperty[key] = { title: d.propertyTitle, items: [], total: 0 };
    byProperty[key].items.push(d);
    byProperty[key].total += d.debtAmount;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">דוח חובות</h1>
        <p className="text-sm text-gray-500 mt-0.5">תשלומים שלא התקבלו במלואם</p>
      </div>

      {/* Total */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-red-700">סה״כ חוב פתוח</p>
          <p className="text-3xl font-bold text-red-700 mt-1">₪{totalDebt.toLocaleString()}</p>
        </div>
        <div className="text-right text-sm text-red-600 space-y-0.5">
          <p>{debts.length} רשומות חוב</p>
          <p>{Object.keys(byProperty).length} נכסים</p>
        </div>
      </div>

      {debts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-20 text-center space-y-3">
          <div className="text-5xl">✅</div>
          <p className="text-gray-600 font-semibold text-lg">אין חובות פתוחים</p>
          <p className="text-sm text-gray-400">כל התשלומים עד היום שולמו</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byProperty).map(([key, group]) => (
            <div key={key} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <p className="font-bold text-gray-800">{group.title || "נכס לא ידוע"}</p>
                <p className="font-bold text-red-600">₪{group.total.toLocaleString()}</p>
              </div>
              <div className="divide-y divide-gray-100">
                {group.items.map((d) => {
                  const partialPaid = parsePartialPaid(d.notes);
                  const reason = parsePartialReason(d.notes);
                  return (
                    <div key={d.id} className="flex items-center gap-4 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">
                          שכ״ד{" "}
                          {new Date(d.dueDate).toLocaleDateString("he-IL", { month: "long", year: "numeric" })}
                          {d.isVirtual && <span className="text-xs font-normal text-gray-400 mr-1"> · לא נרשם</span>}
                        </p>
                        {d.status === "partial" && partialPaid != null && (
                          <p className="text-xs text-blue-600 mt-0.5">
                            שולם ₪{partialPaid.toLocaleString()}
                            {reason && ` · ${reason}`}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">
                          מועד: {new Date(d.dueDate).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-700">₪{d.debtAmount.toLocaleString()}</p>
                        {d.status === "partial" && (
                          <p className="text-xs text-gray-400">מתוך ₪{d.amount.toLocaleString()}</p>
                        )}
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_COLOR[d.status] || "bg-gray-100 text-gray-600"}`}>
                        {STATUS_HE[d.status] || d.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
