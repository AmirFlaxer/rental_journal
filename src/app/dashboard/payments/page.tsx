"use client";

import { useEffect, useState } from "react";
import { NumberInput } from "@/components/number-input";

const TYPE_HE: Record<string, string> = {
  Rent: "שכ״ד",
  Deposit: "פיקדון",
  Return: "החזר",
  Other: "אחר",
};

const STATUS_HE: Record<string, string> = {
  pending: "ממתין",
  paid: "שולם",
  late: "באיחור",
  partial: "חלקי",
  due: "לתשלום",
  future: "ממתין",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  late: "bg-red-100 text-red-700",
  partial: "bg-blue-100 text-blue-700",
  due: "bg-red-100 text-red-700",
  future: "bg-gray-100 text-gray-500",
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

  for (const lease of leases) {
    if (lease.status !== "active") continue;
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
      const existing = existingPayments.find(
        (p) => p.lease?.id === lease.id && p.paymentType === "Rent" && p.dueDate.slice(0, 7) === monthKey
      );
      if (!existing) {
        const dueDate = `${monthKey}-${String(day).padStart(2, "0")}`;
        const isPast = new Date(dueDate) <= today;
        slots.push({
          id: `virtual-${lease.id}-${monthKey}`,
          isVirtual: true,
          leaseId: lease.id,
          propertyId: lease.properties?.id,
          propertyTitle: lease.properties?.title,
          paymentType: "Rent",
          amount: lease.monthlyRent,
          dueDate,
          status: isPast ? "due" : "future",
        });
      }
      cur.setMonth(cur.getMonth() + 1);
    }
  }
  return slots;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProp, setFilterProp] = useState("");
  const [showVirtual, setShowVirtual] = useState(true);
  const [creatingPayment, setCreatingPayment] = useState<string | null>(null);

  // Partial payment state
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

  const allItems: Payment[] = [
    ...payments,
    ...(showVirtual ? virtualSlots : []),
  ].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const filtered = allItems.filter((p) => {
    if (filterStatus && p.status !== filterStatus) return false;
    const propId = p.property?.id ?? p.propertyId;
    if (filterProp && propId !== filterProp) return false;
    return true;
  });

  const totalPaid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amount, 0);
  const totalDue = virtualSlots.filter((p) => p.status === "due").reduce((s, p) => s + p.amount, 0);

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
    const existing = parsePartialPaid(payment.notes);
    setPartialAmount(existing || undefined);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">תקבולים</h1>
        <p className="text-sm text-gray-500 mt-0.5">מעקב תקבולים לכל הנכסים</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <p className="text-xs text-emerald-600 font-semibold">שולם</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">₪{totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs text-amber-600 font-semibold">ממתין (רשום)</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">₪{totalPending.toLocaleString()}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-xs text-red-600 font-semibold">לתשלום (לא נרשם)</p>
          <p className="text-2xl font-bold text-red-700 mt-1">₪{totalDue.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white">
          <option value="">כל הסטטוסים</option>
          {Object.entries(STATUS_HE).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={filterProp} onChange={(e) => setFilterProp(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white">
          <option value="">כל הנכסים</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
        <button onClick={() => setShowVirtual((v) => !v)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            showVirtual ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-gray-200 text-gray-500"
          }`}>
          {showVirtual ? "✓ לוח חוזה מוצג" : "הצג לוח חוזה"}
        </button>
        {(filterStatus || filterProp) && (
          <button onClick={() => { setFilterStatus(""); setFilterProp(""); }}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">נקה ✕</button>
        )}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <div className="text-4xl">💳</div>
            <p className="text-gray-500 font-medium">אין תקבולים</p>
            <p className="text-sm text-gray-400">תקבולים נוצרים בעת הוספת חוזה שכירות</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((p) => {
              const propTitle = p.property?.title ?? p.propertyTitle ?? "";
              const isVirtual = p.isVirtual === true;
              const partialPaid = parsePartialPaid(p.notes);
              const partialReasonText = parsePartialReason(p.notes);
              const remaining = partialPaid != null ? p.amount - partialPaid : null;
              const isPartialOpen = partialOpenId === p.id;

              return (
                <div key={p.id} className={`px-5 py-4 ${isVirtual ? "bg-gray-50/50" : "hover:bg-slate-50"}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                      isVirtual ? "bg-gray-100" : "bg-blue-100"
                    }`}>
                      {isVirtual ? "🗓️" : "💳"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold ${isVirtual ? "text-gray-500" : "text-gray-900"}`}>
                        {TYPE_HE[p.paymentType] || p.paymentType}
                        {isVirtual && <span className="text-xs font-normal text-gray-400 mr-1"> · לפי חוזה</span>}
                      </p>
                      <p className="text-xs text-gray-400">
                        {propTitle}
                        {p.paidDate && ` · שולם ${new Date(p.paidDate).toLocaleDateString("he-IL")}`}
                      </p>
                      {p.status === "partial" && partialPaid != null && (
                        <p className="text-xs text-blue-600 font-medium mt-0.5">
                          שולם ₪{partialPaid.toLocaleString()} · יתרת חוב: ₪{remaining!.toLocaleString()}
                          {partialReasonText && ` · ${partialReasonText}`}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${isVirtual ? "text-gray-500" : "text-gray-900"}`}>
                        ₪{p.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(p.dueDate).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_COLOR[p.status] || "bg-gray-100 text-gray-600"}`}>
                      {STATUS_HE[p.status] || p.status}
                    </span>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {isVirtual ? (
                        <>
                          <button onClick={() => markVirtualPaid(p)} disabled={creatingPayment === p.id}
                            className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap">
                            {creatingPayment === p.id ? "..." : "שולם"}
                          </button>
                          <button onClick={() => { setPartialOpenId(isPartialOpen ? null : p.id); setPartialAmount(undefined); setPartialReason(""); }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border ${
                              isPartialOpen ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-gray-300 text-gray-600 hover:bg-blue-50"
                            }`}>
                            חלקי
                          </button>
                        </>
                      ) : (
                        <>
                          {p.status !== "paid" && (
                            <>
                              <button onClick={() => togglePaid(p)}
                                className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 whitespace-nowrap">
                                שולם
                              </button>
                              <button onClick={() => openPartial(p)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border ${
                                  isPartialOpen ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-gray-300 text-gray-600 hover:bg-blue-50"
                                }`}>
                                חלקי
                              </button>
                            </>
                          )}
                          {p.status === "paid" && (
                            <button onClick={() => togglePaid(p)}
                              className="px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold hover:bg-red-100 hover:text-red-700 whitespace-nowrap">
                              בטל
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Partial payment form */}
                  {isPartialOpen && (
                    <div className="mt-3 mr-14 p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-2">
                      <p className="text-xs font-semibold text-blue-700">רישום תשלום חלקי</p>
                      <div className="flex gap-2 items-center">
                        <div className="flex items-center gap-1 bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-sm">
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
                          placeholder="סיבה לתשלום חלקי..."
                          className="flex-1 bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-xs outline-none"
                        />
                      </div>
                      {partialAmount && partialAmount > 0 && partialAmount < p.amount && (
                        <p className="text-xs text-blue-600">
                          יתרת חוב: ₪{(p.amount - parseFloat(partialAmount)).toLocaleString()}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => savePartial(p, isVirtual)} disabled={savingPartial || !partialAmount || parseFloat(partialAmount) <= 0 || parseFloat(partialAmount) >= p.amount}
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
            })}
          </div>
        )}
      </div>
    </div>
  );
}
