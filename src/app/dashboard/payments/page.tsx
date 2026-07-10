"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NumberInput } from "@/components/number-input";
import { isLeaseCurrentlyActive } from "@/lib/lease-status";
import { listRentMonths, coveredPropertyMonths, propertyMonthKey, todayStr } from "@/lib/domain/rent-schedule";
import { parsePartialPaid, parsePartialReason, getDebtAmount } from "@/lib/domain/partial-payment";
import { apiGet, queryKeys } from "@/lib/api-client";

const TYPE_HE: Record<string, string> = {
  Rent: "שכ״ד",
  Deposit: "פיקדון",
  Return: "החזר",
  Other: "אחר",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  late: "bg-red-100 text-red-700",
  overdue: "bg-red-100 text-red-700",
  partial: "bg-blue-100 text-blue-700",
  due: "bg-red-100 text-red-700",
  future: "bg-gray-100 text-gray-500",
};

const STATUS_HE: Record<string, string> = {
  pending: "ממתין",
  paid: "שולם",
  late: "באיחור",
  overdue: "באיחור",
  partial: "חלקי",
  due: "לתשלום",
  future: "ממתין",
};

interface Payment {
  id: string;
  payment_type: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  status: string;
  notes?: string;
  partial_paid_amount?: number | null;
  property?: { id: string; title: string };
  lease?: { id: string };
  isVirtual?: boolean;
  property_title?: string;
  lease_id?: string;
  property_id?: string;
}

interface Lease {
  id: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  status: string;
  properties?: { id: string; title: string };
  tenant?: { first_name: string; last_name: string };
}

interface Property {
  id: string;
  title: string;
}

function generateVirtualSlots(leases: Lease[], existingPayments: Payment[]): Payment[] {
  const today = todayStr();
  const slots: Payment[] = [];
  const covered = coveredPropertyMonths(existingPayments);

  for (const lease of leases) {
    if (!isLeaseCurrentlyActive(lease)) continue;
    const propId = lease.properties?.id;
    if (!propId) continue;

    for (const { monthKey, due_date } of listRentMonths(lease)) {
      const key = propertyMonthKey(propId, monthKey);
      if (covered.has(key)) continue;
      slots.push({
        id: `virtual-${lease.id}-${monthKey}`,
        isVirtual: true,
        lease_id: lease.id,
        property_id: propId,
        property_title: lease.properties?.title,
        payment_type: "Rent",
        amount: lease.monthly_rent,
        due_date,
        status: due_date <= today ? "due" : "future",
      });
      covered.add(key);
    }
  }
  return slots;
}

const ACTION_PRIORITY: Record<string, number> = { late: 0, overdue: 0, due: 1, partial: 2, pending: 3 };

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const paymentsQuery = useQuery({ queryKey: queryKeys.payments, queryFn: () => apiGet<Payment[]>("/api/payments") });
  const leasesQuery = useQuery({ queryKey: queryKeys.leases, queryFn: () => apiGet<Lease[]>("/api/leases") });
  const propertiesQuery = useQuery({ queryKey: queryKeys.properties, queryFn: () => apiGet<Property[]>("/api/properties") });

  const payments = useMemo(() => paymentsQuery.data ?? [], [paymentsQuery.data]);
  const leases = useMemo(() => leasesQuery.data ?? [], [leasesQuery.data]);
  const properties = useMemo(() => propertiesQuery.data ?? [], [propertiesQuery.data]);

  const isPending = paymentsQuery.isPending || leasesQuery.isPending || propertiesQuery.isPending;
  const failedQuery = [paymentsQuery, leasesQuery, propertiesQuery].find((q) => q.isError);

  const [filterProp, setFilterProp] = useState("");
  const [showPaid, setShowPaid] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState<string | null>(null);

  const [partialOpenId, setPartialOpenId] = useState<string | null>(null);
  const [partialAmount, setPartialAmount] = useState<number | undefined>(undefined);
  const [partialReason, setPartialReason] = useState("");
  const [savingPartial, setSavingPartial] = useState(false);

  // תקבול שהתקבל/עודכן משפיע גם על סגירת תזכורת "שק" (tasks) וגם על הוצאת מס אוטומטית (expenses) - השרת מטפל בזה
  const invalidateAfterPaymentChange = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.payments });
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses });
  };

  const virtualSlots = useMemo(() => generateVirtualSlots(leases, payments), [leases, payments]);
  const allItems = useMemo(
    () =>
      [...payments, ...virtualSlots].filter((p) => {
        const propId = p.property?.id ?? p.property_id;
        return !filterProp || propId === filterProp;
      }),
    [payments, virtualSlots, filterProp]
  );

  const actionItems = useMemo(
    () =>
      allItems
        .filter((p) => ["due", "late", "overdue", "pending", "partial"].includes(p.status))
        .sort((a, b) => {
          const pa = ACTION_PRIORITY[a.status] ?? 4;
          const pb = ACTION_PRIORITY[b.status] ?? 4;
          if (pa !== pb) return pa - pb;
          return a.due_date.localeCompare(b.due_date);
        }),
    [allItems]
  );

  const futureItems = useMemo(
    () => allItems.filter((p) => p.status === "future").sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [allItems]
  );

  const paidItems = useMemo(
    () => allItems.filter((p) => p.status === "paid").sort((a, b) => b.due_date.localeCompare(a.due_date)),
    [allItems]
  );

  const totalDue = useMemo(
    () =>
      actionItems
        .filter((p) => p.status === "due" || p.status === "late" || p.status === "overdue")
        .reduce((s, p) => s + p.amount, 0),
    [actionItems]
  );
  const totalDebt = useMemo(
    () => actionItems.filter((p) => p.status === "partial").reduce((s, p) => s + getDebtAmount(p), 0),
    [actionItems]
  );
  const totalPaidAmt = useMemo(() => paidItems.reduce((s, p) => s + p.amount, 0), [paidItems]);

  const togglePaid = async (payment: Payment) => {
    const nowPaid = payment.status !== "paid";
    const body = nowPaid
      ? { status: "paid", paid_date: new Date().toISOString() }
      : { status: "pending", paid_date: null };
    const res = await fetch(`/api/payments/${payment.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      invalidateAfterPaymentChange();
    }
  };

  const openPartial = (payment: Payment) => {
    setPartialAmount((payment.partial_paid_amount ?? parsePartialPaid(payment.notes)) || undefined);
    setPartialReason(parsePartialReason(payment.notes));
    setPartialOpenId(payment.id);
  };

  const savePartial = async (payment: Payment, isVirtual: boolean) => {
    const amt = partialAmount;
    if (!amt || amt <= 0 || amt >= payment.amount) return;
    setSavingPartial(true);
    try {
      // הסכום נשמר בעמודה ייעודית (partial_paid_amount) - notes מכיל רק את הסיבה
      // כטקסט חופשי, בלי קידוד. תאימות לאחור לרשומות ישנות ב-getReceivedAmount.
      if (isVirtual) {
        const res = await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            property_id: payment.property_id,
            lease_id: payment.lease_id,
            payment_type: "Rent",
            amount: payment.amount,
            due_date: payment.due_date,
            paid_date: new Date().toISOString(),
            status: "partial",
            partial_paid_amount: amt,
            notes: partialReason,
          }),
        });
        if (res.ok) {
          invalidateAfterPaymentChange();
        }
      } else {
        const res = await fetch(`/api/payments/${payment.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "partial",
            paid_date: new Date().toISOString(),
            partial_paid_amount: amt,
            notes: partialReason,
          }),
        });
        if (res.ok) {
          invalidateAfterPaymentChange();
        }
      }
    } finally {
      setSavingPartial(false);
      setPartialOpenId(null);
      setPartialAmount(undefined);
      setPartialReason("");
    }
  };

  const markVirtualPaid = async (slot: Payment) => {
    setCreatingPayment(slot.id);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: slot.property_id,
            lease_id: slot.lease_id,
          payment_type: "Rent",
          amount: slot.amount,
          due_date: slot.due_date,
          paid_date: new Date().toISOString(),
          status: "paid",
        }),
      });
      if (res.ok) {
        invalidateAfterPaymentChange();
      }
    } finally {
      setCreatingPayment(null);
    }
  };

  const renderCard = (p: Payment) => {
    const propTitle = p.property?.title ?? p.property_title ?? "";
    const isVirtual = p.isVirtual === true;
    const partialPaid = p.partial_paid_amount ?? parsePartialPaid(p.notes);
    const partialReasonText = parsePartialReason(p.notes);
    const remaining = partialPaid != null ? p.amount - partialPaid : null;
    const isPartialOpen = partialOpenId === p.id;
    const isPaid = p.status === "paid";
    const isFuture = p.status === "future";

    return (
      <div key={p.id} className={`bg-white rounded-xl px-4 py-3.5 shadow-sm border ${isPaid ? "border-gray-100 opacity-75" : isFuture ? "border-gray-100" : "border-gray-200"}`}>
        <div className="flex items-center gap-3">
          {/* Status dot */}
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
            p.status === "paid" ? "bg-emerald-400" :
            p.status === "due" || p.status === "late" || p.status === "overdue" ? "bg-red-500" :
            p.status === "partial" ? "bg-blue-400" :
            p.status === "future" ? "bg-gray-300" : "bg-amber-400"
          }`} />

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-gray-900">
                {TYPE_HE[p.payment_type] || p.payment_type}
              </span>
              {propTitle && <span className="text-xs text-gray-500">{propTitle}</span>}
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[p.status] || "bg-gray-100 text-gray-600"}`}>
                {STATUS_HE[p.status] || p.status}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-gray-400">
                {new Date(p.due_date).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })}
              </span>
              {p.paid_date && (
                <span className="text-xs text-gray-400">
                  · שולם <span className="num-ltr">{new Date(p.paid_date).toLocaleDateString("he-IL")}</span>
                </span>
              )}
            </div>
            {p.status === "partial" && partialPaid != null && (
              <p className="text-xs text-blue-600 mt-0.5">
                שולם <span className="num-ltr">₪{partialPaid.toLocaleString()}</span> · יתרה: <span className="num-ltr">₪{remaining!.toLocaleString()}</span>
                {partialReasonText && ` · ${partialReasonText}`}
              </p>
            )}
          </div>

          {/* Amount + actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className={`font-bold text-sm ${isPaid ? "text-emerald-700" : isFuture ? "text-gray-500" : "text-gray-900"}`}>
              ₪{p.amount.toLocaleString()}
            </span>
            {!isPaid && !isFuture && (
              <div className="flex gap-1.5">
                {isVirtual ? (
                  <>
                    <button onClick={() => markVirtualPaid(p)} disabled={creatingPayment === p.id}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50">
                      {creatingPayment === p.id ? "..." : "שולם"}
                    </button>
                    <button onClick={() => { setPartialOpenId(isPartialOpen ? null : p.id); setPartialAmount(undefined); setPartialReason(""); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${isPartialOpen ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-gray-300 text-gray-600 hover:bg-blue-50"}`}>
                      חלקי
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => togglePaid(p)}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700">
                      שולם
                    </button>
                    <button onClick={() => openPartial(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${isPartialOpen ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-gray-300 text-gray-600 hover:bg-blue-50"}`}>
                      חלקי
                    </button>
                  </>
                )}
              </div>
            )}
            {isPaid && !isVirtual && (
              <button onClick={() => togglePaid(p)}
                className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs font-semibold hover:bg-red-100 hover:text-red-700">
                בטל
              </button>
            )}
          </div>
        </div>

        {/* Partial payment form */}
        {isPartialOpen && (
          <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-2">
            <p className="text-xs font-semibold text-blue-700">רישום תשלום חלקי</p>
            <div className="flex gap-2 items-center">
              <div className="flex items-center gap-1 bg-white border border-blue-200 rounded-lg px-2 py-1.5">
                <span className="text-gray-500 text-xs">₪</span>
                <NumberInput
                  value={partialAmount}
                  onChange={setPartialAmount}
                  placeholder={`מתוך ${p.amount.toLocaleString()}`}
                  className="w-28 outline-none text-gray-900 text-xs"
                />
              </div>
              <input
                type="text"
                value={partialReason}
                onChange={(e) => setPartialReason(e.target.value)}
                placeholder="סיבה (אופציונלי)..."
                className="flex-1 bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-xs outline-none"
              />
            </div>
            {partialAmount && partialAmount > 0 && partialAmount < p.amount && (
              <p className="text-xs text-blue-600">יתרת חוב: ₪{(p.amount - partialAmount).toLocaleString()}</p>
            )}
            <div className="flex gap-2">
              <button onClick={() => savePartial(p, isVirtual)} disabled={savingPartial || !partialAmount || partialAmount <= 0 || partialAmount >= p.amount}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-40">
                {savingPartial ? "שומר..." : "אישור"}
              </button>
              <button onClick={() => setPartialOpenId(null)}
                className="px-3 py-1 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50">
                ביטול
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
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
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
            <span className="inline-block w-1.5 h-7 rounded-full tick-accent" />
            תקבולים
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">מה צריך לסמן</p>
        </div>
        {properties.length > 1 && (
          <select value={filterProp} onChange={(e) => setFilterProp(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="">כל הנכסים</option>
            {properties.map((prop) => (
              <option key={prop.id} value={prop.id}>{prop.title}</option>
            ))}
          </select>
        )}
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-rose-500 to-rose-700 text-white">
          <p className="text-xs text-white/80 font-semibold">לתשלום</p>
          <p className="text-xl font-extrabold mt-1 drop-shadow-sm">₪{totalDue.toLocaleString()}</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-amber-500 to-amber-700 text-white">
          <p className="text-xs text-white/80 font-semibold">יתרה חלקית</p>
          <p className="text-xl font-extrabold mt-1 drop-shadow-sm">₪{totalDebt.toLocaleString()}</p>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
          <p className="text-xs text-white/80 font-semibold">שולם</p>
          <p className="text-xl font-extrabold mt-1 drop-shadow-sm">₪{totalPaidAmt.toLocaleString()}</p>
        </div>
      </div>

      {/* Action items */}
      {actionItems.length === 0 ? (
        <div className="rounded-2xl py-10 text-center space-y-2 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-emerald-700/5">
          <div className="text-4xl">✅</div>
          <p className="text-emerald-300 font-semibold">הכל מעודכן!</p>
          <p className="text-xs text-emerald-400/80">אין תקבולים הממתינים לסימון</p>
        </div>
      ) : (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            דורשים טיפול ({actionItems.length})
          </h2>
          {actionItems.map(renderCard)}
        </section>
      )}

      {/* Future items */}
      {futureItems.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            צפויים ({futureItems.length})
          </h2>
          {futureItems.map(renderCard)}
        </section>
      )}

      {/* Paid items - collapsed */}
      {paidItems.length > 0 && (
        <section className="space-y-2">
          <button
            onClick={() => setShowPaid((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="text-[10px]">{showPaid ? "▼" : "▶"}</span>
            שולמו ({paidItems.length}) · <span className="num-ltr">₪{totalPaidAmt.toLocaleString()}</span>
          </button>
          {showPaid && (
            <div className="space-y-2">
              {paidItems.map(renderCard)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
