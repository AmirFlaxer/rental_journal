"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { DateInput } from "@/components/date-input";
import { NumberInput } from "@/components/number-input";

const today = () => new Date().toISOString().slice(0, 10);

const CATEGORIES = [
  { value: "Maintenance",       label: "תחזוקה ותיקונים" },
  { value: "Insurance",         label: "ביטוח" },
  { value: "Tax",               label: "מסים וארנונה" },
  { value: "Utilities",         label: "חשבונות שירותים" },
  { value: "Professional Fees", label: "שכ\"ט מקצועי" },
  { value: "Other",             label: "אחר" },
];

export default function AddExpensePage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [category, setCategory] = useState("Maintenance");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [date, setDate] = useState(today());
  const [vendorName, setVendorName] = useState("");
  const [paidBy, setPaidBy] = useState<"landlord" | "tenant">("landlord");
  const [recurring, setRecurring] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState("monthly");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          category,
          description,
          amount: amount ?? 0,
          date,
          vendorName: vendorName || undefined,
          paidBy,
          recurring,
          recurringFreq: recurring ? recurringFreq : undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "שגיאה ביצירת ההוצאה");
      }
      router.push(`/dashboard/properties/${propertyId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "אירעה שגיאה");
    } finally {
      setIsLoading(false);
    }
  };

  const inp = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">הוספת הוצאה</h1>
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

            {/* Category */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">קטגוריה *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inp}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">תיאור *</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                required minLength={3} className={inp} placeholder="תיאור ההוצאה..." />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">סכום (₪) *</label>
              <NumberInput value={amount} onChange={setAmount}
                className={inp} placeholder="לדוג' 500" />
            </div>

            {/* Date */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">תאריך *</label>
              <DateInput value={date} onChange={(v) => setDate(v)} required />
            </div>

            {/* Vendor */}
            <div>
              <label className="block text-gray-700 font-semibold mb-1">שם ספק / נותן שירות</label>
              <input type="text" value={vendorName} onChange={(e) => setVendorName(e.target.value)}
                className={inp} placeholder="שם חברה או איש מקצוע..." />
            </div>

            {/* Paid by */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">שולם על ידי</label>
              <div className="flex gap-3">
                {[
                  { value: "landlord", label: "המשכיר" },
                  { value: "tenant",   label: "השוכר" },
                ].map((opt) => (
                  <button key={opt.value} type="button"
                    onClick={() => setPaidBy(opt.value as "landlord" | "tenant")}
                    className={`flex-1 py-2 rounded-lg font-semibold text-sm border transition-colors ${
                      paidBy === opt.value
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recurring */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <input type="checkbox" id="recurring" checked={recurring}
                  onChange={(e) => setRecurring(e.target.checked)}
                  className="w-4 h-4 accent-orange-500 cursor-pointer" />
                <label htmlFor="recurring" className="text-gray-700 font-semibold cursor-pointer">הוצאה חוזרת</label>
              </div>
              {recurring && (
                <select value={recurringFreq} onChange={(e) => setRecurringFreq(e.target.value)} className={inp}>
                  <option value="monthly">חודשי</option>
                  <option value="bi-monthly">דו-חודשי</option>
                  <option value="quarterly">רבעוני</option>
                  <option value="yearly">שנתי</option>
                </select>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={isLoading}
              className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-semibold">
              {isLoading ? "שומר..." : "הוסף הוצאה"}
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
