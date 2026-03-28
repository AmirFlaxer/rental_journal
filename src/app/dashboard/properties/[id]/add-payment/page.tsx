"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { DateInput } from "@/components/date-input";
import { NumberInput } from "@/components/number-input";

interface Lease {
  id: string;
  tenant?: { firstName: string; lastName: string };
  monthlyRent: number;
  status: string;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function AddPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;

  const [leases, setLeases] = useState<Lease[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [leaseId, setLeaseId] = useState("");
  const [paymentType, setPaymentType] = useState("Rent");
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [dueDate, setDueDate] = useState(today());
  const [paidDate, setPaidDate] = useState(today());
  const [isPaid, setIsPaid] = useState(false);
  const [method, setMethod] = useState("BankTransfer");
  const [referenceNum, setReferenceNum] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch(`/api/properties/${propertyId}`)
      .then((r) => r.json())
      .then((d) => {
        const active = (d.leases || []).filter((l: Lease) => l.status === "active");
        setLeases(active);
        if (active.length === 1) {
          setLeaseId(active[0].id);
          setAmount(active[0].monthlyRent);
        }
      });
  }, [propertyId]);

  // Auto-fill amount when lease selected
  const handleLeaseChange = (id: string) => {
    setLeaseId(id);
    const lease = leases.find((l) => l.id === id);
    if (lease && paymentType === "Rent") setAmount(lease.monthlyRent);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          leaseId: leaseId || undefined,
          paymentType,
          amount: amount ?? 0,
          dueDate,
          paidDate: isPaid ? paidDate : undefined,
          status: isPaid ? "paid" : "pending",
          method: method || undefined,
          referenceNum: referenceNum || undefined,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "שגיאה ביצירת התקבול");
      }
      router.push(`/dashboard/properties/${propertyId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "אירעה שגיאה");
    } finally {
      setIsLoading(false);
    }
  };

  const inp = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">רישום תקבול</h1>
          <Link href={`/dashboard/properties/${propertyId}`}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold text-sm">
            ביטול
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 sm:px-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">{error}</div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">

            {/* Lease */}
            {leases.length > 0 && (
              <div>
                <label className="block text-gray-700 font-semibold mb-1">חוזה / דייר</label>
                <select value={leaseId} onChange={(e) => handleLeaseChange(e.target.value)} className={inp}>
                  <option value="">— ללא חוזה ספציפי —</option>
                  {leases.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.tenant?.firstName} {l.tenant?.lastName} — ₪{Number(l.monthlyRent).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Type */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">סוג תקבול</label>
              <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className={inp}>
                <option value="Rent">שכר דירה</option>
                <option value="Deposit">פיקדון</option>
                <option value="Return">החזר</option>
                <option value="Other">אחר</option>
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">סכום (₪) *</label>
              <NumberInput value={amount} onChange={setAmount}
                className={inp} placeholder="לדוג' 7500" />
            </div>

            {/* Due date */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">תאריך לתקבול *</label>
              <DateInput value={dueDate} onChange={(v) => setDueDate(v)} required />
            </div>

            {/* Paid toggle */}
            <div className="flex items-center gap-3">
              <input type="checkbox" id="isPaid" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)}
                className="w-4 h-4 accent-green-600 cursor-pointer" />
              <label htmlFor="isPaid" className="text-gray-700 font-semibold cursor-pointer">התקבל</label>
            </div>

            {/* Paid date */}
            {isPaid && (
              <div>
                <label className="block text-gray-700 font-semibold mb-1">תאריך קבלה</label>
                <DateInput value={paidDate} onChange={(v) => setPaidDate(v)} />
              </div>
            )}

            {/* Method */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">שיטת תקבול</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={inp}>
                <option value="BankTransfer">העברה בנקאית</option>
                <option value="Check">שק</option>
                <option value="Cash">מזומן</option>
                <option value="BIT">ביט</option>
                <option value="Paybox">פייבוקס</option>
                <option value="Other">אחר</option>
              </select>
            </div>

            {/* Reference */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">אסמכתא / מספר שק</label>
              <input type="text" value={referenceNum} onChange={(e) => setReferenceNum(e.target.value)}
                className={inp} placeholder="מספר אסמכתא..." />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">הערות</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                rows={2} className={inp} placeholder="הערות נוספות..." />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={isLoading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold">
              {isLoading ? "שומר..." : "רשום תקבול"}
            </button>
            <Link href={`/dashboard/properties/${propertyId}`}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold">
              ביטול
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
