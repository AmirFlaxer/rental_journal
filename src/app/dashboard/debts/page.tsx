"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { isLeaseCurrentlyActive } from "@/lib/lease-status";
import { listRentMonths, coveredPropertyMonths, propertyMonthKey, todayStr } from "@/lib/domain/rent-schedule";
import { parsePartialPaid, parsePartialReason, getDebtAmount } from "@/lib/domain/partial-payment";
import { diffDays } from "@/lib/domain/dates";
import { apiGet, queryKeys } from "@/lib/api-client";

interface Payment {
  id: string;
  paymentType: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: string;
  notes?: string;
  partialPaidAmount?: number | null;
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
  partialPaidAmount?: number | null;
  propertyId?: string;
  propertyTitle: string;
  isVirtual: boolean;
  leaseId?: string;
  propertyIdForCreate?: string;
}

function buildDebtList(payments: Payment[], leases: Lease[]): DebtItem[] {
  const today = todayStr();
  const items: DebtItem[] = [];

  // Existing payments with debt (only past-due)
  for (const p of payments) {
    if (p.status === "paid") continue;
    if (p.dueDate.slice(0, 10) > today) continue;
    items.push({
      id: p.id,
      dueDate: p.dueDate,
      amount: p.amount,
      debtAmount: getDebtAmount(p),
      status: p.status,
      notes: p.notes,
      partialPaidAmount: p.partialPaidAmount,
      propertyTitle: p.property?.title ?? "",
      propertyId: p.property?.id,
      isVirtual: false,
    });
  }

  // Virtual overdue slots (past due, no payment record)
  // dedup לפי נכס+חודש — מונע כפילות כשיש שני חוזים פעילים לאותו נכס
  const covered = coveredPropertyMonths(payments);

  for (const lease of leases) {
    if (!isLeaseCurrentlyActive(lease)) continue;
    const propId = lease.properties?.id;
    if (!propId) continue;

    for (const { monthKey, dueDate } of listRentMonths(lease)) {
      if (dueDate > today) continue;
      const key = propertyMonthKey(propId, monthKey);
      if (covered.has(key)) continue;
      items.push({
        id: `virtual-${lease.id}-${monthKey}`,
        dueDate,
        amount: lease.monthlyRent,
        debtAmount: lease.monthlyRent,
        status: "due",
        propertyTitle: lease.properties?.title ?? "",
        propertyId: propId,
        isVirtual: true,
        leaseId: lease.id,
        propertyIdForCreate: propId,
      });
      covered.add(key);
    }
  }

  return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

const STATUS_HE: Record<string, string> = {
  pending: "ממתין",
  partial: "חלקי",
  late: "באיחור",
  overdue: "באיחור",
  due: "לתשלום",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  partial: "bg-blue-100 text-blue-700",
  late: "bg-red-100 text-red-700",
  overdue: "bg-red-100 text-red-700",
  due: "bg-red-100 text-red-700",
};

export default function DebtsPage() {
  const paymentsQuery = useQuery({ queryKey: queryKeys.payments, queryFn: () => apiGet<Payment[]>("/api/payments") });
  const leasesQuery = useQuery({ queryKey: queryKeys.leases, queryFn: () => apiGet<Lease[]>("/api/leases") });

  const payments = useMemo(() => paymentsQuery.data ?? [], [paymentsQuery.data]);
  const leases = useMemo(() => leasesQuery.data ?? [], [leasesQuery.data]);

  const isPending = paymentsQuery.isPending || leasesQuery.isPending;
  const failedQuery = [paymentsQuery, leasesQuery].find((q) => q.isError);

  const debts = useMemo(() => buildDebtList(payments, leases), [payments, leases]);
  const totalDebt = useMemo(() => debts.reduce((s, d) => s + d.debtAmount, 0), [debts]);

  // Group by property
  const byProperty = useMemo(() => {
    const grouped: Record<string, { title: string; items: DebtItem[]; total: number }> = {};
    for (const d of debts) {
      const key = d.propertyId ?? d.propertyTitle;
      if (!grouped[key]) grouped[key] = { title: d.propertyTitle, items: [], total: 0 };
      grouped[key].items.push(d);
      grouped[key].total += d.debtAmount;
    }
    return grouped;
  }, [debts]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        {/* ספינר אדום בכוונה — עקבי עם ערכת הצבע הסמנטית של המסך (חובות = אדום/rose:
            hero, סכומים, badges). שאר המסכים שאינם עוסקים בחוב/מס משתמשים ב-border-indigo-600 (accent). */}
        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (failedQuery) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <p className="text-red-600 text-sm">{(failedQuery.error as Error).message}</p>
        <button onClick={() => failedQuery.refetch()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700">
          נסה שוב
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
          <span className="inline-block w-1.5 h-7 rounded-full tick-accent" />
          דוח חובות
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">תשלומים שלא התקבלו במלואם</p>
      </div>

      {/* Total */}
      <div className="relative overflow-hidden rounded-2xl p-5 flex items-center justify-between bg-gradient-to-br from-rose-500 to-rose-700 text-white">
        <span className="absolute -top-4 -left-3 text-7xl opacity-15 select-none">🔴</span>
        <div className="relative">
          <p className="text-sm font-semibold text-white/80">סה״כ חוב פתוח</p>
          <p className="text-3xl font-extrabold mt-1 drop-shadow-sm">₪{totalDebt.toLocaleString()}</p>
        </div>
        <div className="text-right text-sm text-white/80 space-y-0.5 relative">
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
                  const partialPaid = d.partialPaidAmount ?? parsePartialPaid(d.notes);
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
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                          <span>מועד: {new Date(d.dueDate).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })}</span>
                          {(() => {
                            const days = diffDays(todayStr(), d.dueDate);
                            if (days <= 0) return null;
                            return (
                              <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${days > 60 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                                {days} ימים איחור
                              </span>
                            );
                          })()}
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
