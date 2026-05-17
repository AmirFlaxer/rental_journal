"use client";

import { useEffect, useState } from "react";
import { NumberInput } from "@/components/number-input";
import { isLeaseCurrentlyActive } from "@/lib/lease-status";

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
  partial: "bg-blue-100 text-blue-700",
  due: "bg-red-100 text-red-700",
  future: "bg-gray-100 text-gray-500",
};

const STATUS_HE: Record<string, string> = {
  pending: "ממתין",
  paid: "שולם",
  late: "באיחור",
  partial: "חלקי",
  due: "לתשלום",
  future: "ממתין",
};

function encodePartial(amount: number, reason: string) {
  return `__partial__:${amount}\n${reason}`.trim();
}
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
  isVirtual?: boolean;
  propertyTitle?: string;
  leaseId?: string;
  propertyId?: string;
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

interface Property {
  id: string;
  title: string;
}

function generateVirtualSlots(leases: Lease[], existingPayments: Payment[]): Payment[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const slots: Payment[] = [];

  const coveredPropertyMonths = new Set<string>();
  for (const p of existingPayments) {
    if (p.paymentType === "Rent") {
      const propId = p.property?.id ?? p.propertyId;
      if (propId && p.dueDate) coveredPropertyMonths.add(`${propId}-${p.dueDate.slice(0, 7)}`);
    }
  }

  for (const lease of leases) {
    if (!isLeaseCurrentlyActive(lease)) continue;
    const propId = lease.properties?.id;
    if (!propId) continue;

    const start = new Date(lease.startDate);
    const end = new Date(lease.endDate);
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    const startDay = start.getDate();

    while (cur <= endMonth) {
      const year = cur.getFullYear();
      const month = cur.getMonth() + 1;
      const monthKey = `${year}-${String(month).padStart(2, "0")}`;
      const key = `${propId}-${monthKey}`;

      if (!coveredPropertyMonths.has(key)) {
        const lastDay = new Date(year, month, 0).getDate();
        const day = Math.min(startDay, lastDay);
        const dueDate = `${monthKey}-${String(day).padStart(2, "0")}`;
        const isPast = new Date(dueDate) <= today;
        slots.push({
          id: `virtual-${lease.id}-${monthKey}`,
          isVirtual: true,
          leaseId: lease.id,
          propertyId: propId,
          propertyTitle: lease.properties?.title,
          paymentType: "Rent",
          amount: lease.monthlyRent,
          dueDate,
          status: isPast ? "due" : "future",
        });
        coveredPropertyMonths.add(key);
      }
      cur.setMonth(cur.getMonth() + 1);
    }
  }
  return slots;
}

const ACTION_PRIORITY: Record<string, number> = { late: 0, due: 1, partial: 2, pending: 3 };

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProp, setFilterProp] = useState("");
  const [showPaid, setShowPaid] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState<string | null>(null);

  const [partialOpenId, setPartialOpenId] = useState<string | null>(null);
  const [partialAmount, setPartialAmount] = useState<number | undefined>(undefined);
  const [partialReason, setPartialReason] = useState("");
  const [savingPartial, setSavingPartial] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/payments").then((r) => r.json()),
      fetch("/api/leases").then((r) => r.json()),
      fetch("/api/properties").then((r) => r.json()),
    ]).then(([pay, leas, props]) => {
      if (Array.isArray(pay)) setPayments(pay);
      if (Array.isArray(leas)) setLeases(leas);
      if (Array.isArray(props)) setProperties(props);
    }).finally(() => setLoading(false));
  }, []);

  const virtualSlots = generateVirtualSlots(leases, payments);
  const allItems = [...payments, ...virtualSlots].filter((p) => {
    const propId = p.property?.id ?? p.propertyId;
    return !filterProp || propId === filterProp;
  });

  const actionItems = allItems
    .filter((p) => ["due", "late", "pending", "partial"].includes(p.status))
    .sort((a, b) => {
      const pa = ACTION_PRIORITY[a.status] ?? 4;
      const pb = ACTION_PRIORITY[b.status] ?? 4;
      if (pa !== pb) return pa - pb;
      return a.dueDate.localeCompare(b.dueDate);
    });

  const futureItems = allItems
    .filter((p) => p.status === "future")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const paidItems = allItems
    .filter((p) => p.status === "paid")
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate));

  const totalDue = actionItems
    .filter((p) => p.status === "due" || p.status === "late")
    .reduce((s, p) => s + p.amount, 0);
  const totalDebt = actionItems
    .filter((p) => p.status === "partial")
    .reduce((s, p) => {
      const paid = parsePartialPaid(p.notes) ?? 0;
      return s + (p.amount - paid);
    }, 0);
  const totalPaidAmt = paidItems.reduce((s, p) => s + p.amount, 0);

  const togglePaid = async (payment: Payment) => {
    const nowPaid = payment.status !== "paid";
    const body = nowPaid
      ? { status: "paid", paidDate: new Date().toISOString() }
      : { status: "pending", paidDate: null };
    const res = await fetch(`/api/payments/${payment.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const updated = await res.json();
      setPayments((prev) => prev.map((p) => (p.id === payment.id ? updated : p)));
    }
  };

  const openPartial = (payment: Payment) => {
    setPartialAmount(parsePartialPaid(payment.notes) || undefined);
    setPartialReason(parsePartialReason(payment.notes));
    setPartialOpenId(payment.id);
  };

  const savePartial = async (payment: Payment, isVirtual: boolean) => {
    const amt = partialAmount;
    if (!amt || amt <= 0 || amt >= payment.amount) return;
    setSavingPartial(true);
    try {
      const notes = encodePartial(amt, partialReason);
      if (isVirtual) {
        const res = await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId: payment.propertyId,
            leaseId: payment.leaseId,
            paymentType: "Rent",
            amount: payment.amount,
            dueDate: payment.dueDate,
            paidDate: new Date().toISOString(),
            status: "partial",
            notes,
          }),
        });
        if (res.ok) {
          const created = await res.json();
          setPayments((prev) => [...prev, created]);
        }
      } else {
        const res = await fetch(`/api/payments/${payment.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "partial", paidDate: new Date().toISOString(), notes }),
        });
        if (res.ok) {
          const updated = await res.json();
          setPayments((prev) => prev.map((p) => (p.id === payment.id ? updated : p)));
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
          propertyId: slot.propertyId,
            leaseId: slot.leaseId,
          paymentType: "Rent",
          amount: slot.amount,
          dueDate: slot.dueDate,
          paidDate: new Date().toISOString(),
          status: "paid",
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setPayments((prev) => [...prev, created]);
      }
    } finally {
      setCreatingPayment(null);
    }
  };

  const renderCard = (p: Payment) => {
    const propTitle = p.property?.title ?? p.propertyTitle ?? "";
    const isVirtual = p.isVirtual === true;
    const partialPaid = parsePartialPaid(p.notes);
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
            p.status === "due" || p.status === "late" ? "bg-red-500" :
            p.status === "partial" ? "bg-blue-400" :
            p.status === "future" ? "bg-gray-300" : "bg-amber-400"
          }`} />

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-gray-900">
                {TYPE_HE[p.paymentType] || p.paymentType}
              </span>
              {propTitle && <span className="text-xs text-gray-500">{propTitle}</span>}
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[p.status] || "bg-gray-100 text-gray-600"}`}>
                {STATUS_HE[p.status] || p.status}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-gray-400">
                {new Date(p.dueDate).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })}
              </span>
              {p.paidDate && (
                <span className="text-xs text-gray-400">
                  · שולם {new Date(p.paidDate).toLocaleDateString("he-IL")}
                </span>
              )}
            </div>
            {p.status === "partial" && partialPaid != null && (
              <p className="text-xs text-blue-600 mt-0.5">
                שולם ₪{partialPaid.toLocaleString()} · יתרה: ₪{remaining!.toLocaleString()}
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">תקבולים</h1>
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
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-xs text-red-600 font-semibold">לתשלום</p>
          <p className="text-xl font-bold text-red-700 mt-1">₪{totalDue.toLocaleString()}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs text-amber-600 font-semibold">יתרה חלקית</p>
          <p className="text-xl font-bold text-amber-700 mt-1">₪{totalDebt.toLocaleString()}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <p className="text-xs text-emerald-600 font-semibold">שולם</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">₪{totalPaidAmt.toLocaleString()}</p>
        </div>
      </div>

      {/* Action items */}
      {actionItems.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl py-10 text-center space-y-2">
          <div className="text-4xl">✅</div>
          <p className="text-emerald-700 font-semibold">הכל מעודכן!</p>
          <p className="text-xs text-emerald-600">אין תקבולים הממתינים לסימון</p>
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
            שולמו ({paidItems.length}) · ₪{totalPaidAmt.toLocaleString()}
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
