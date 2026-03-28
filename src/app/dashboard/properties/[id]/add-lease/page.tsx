"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { DateInput } from "@/components/date-input";

interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}

function validateIsraeliId(id: string): boolean {
  if (!/^\d{9}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let d = parseInt(id[i]) * ((i % 2) + 1);
    if (d > 9) d -= 9;
    sum += d;
  }
  return sum % 10 === 0;
}

type TenantMode = "existing" | "new";

export default function AddLeasePage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;

  const [tenantMode, setTenantMode] = useState<TenantMode>("existing");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Lease fields
  const [tenantId, setTenantId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [leaseTerm, setLeaseTerm] = useState("12");
  const [terms, setTerms] = useState("");

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState("BankTransfer");

  // Deposit payment options
  const [createDepositPayment, setCreateDepositPayment] = useState(false);
  const [depositPaidDate, setDepositPaidDate] = useState("");
  const [depositStatus, setDepositStatus] = useState<"paid" | "pending">("pending");

  // New tenant fields
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newIdNumber, setNewIdNumber] = useState("");
  const [idError, setIdError] = useState("");

  useEffect(() => {
    fetch("/api/tenants")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTenants(data);
          if (data.length === 0) setTenantMode("new");
        }
      })
      .finally(() => setLoadingTenants(false));
  }, []);

  // Auto-set endDate to startDate + 1 year - 1 day when startDate changes
  useEffect(() => {
    if (startDate) {
      const s = new Date(startDate);
      s.setFullYear(s.getFullYear() + 1);
      s.setDate(s.getDate() - 1);
      setEndDate(s.toISOString().slice(0, 10));
    }
  }, [startDate]);

  // Auto-calculate lease term from dates (end is inclusive, partial month rounds up)
  useEffect(() => {
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      e.setDate(e.getDate() + 1); // shift to exclusive
      const totalMonths = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
      const remainingDays = e.getDate() - s.getDate();
      const months = Math.max(remainingDays > 0 ? totalMonths + 1 : totalMonths, 1);
      setLeaseTerm(String(months));
    }
  }, [startDate, endDate]);

  const handleIdChange = (val: string) => {
    setNewIdNumber(val);
    if (val.length === 9) {
      setIdError(validateIsraeliId(val) ? "" : "תעודת זהות לא תקינה");
    } else if (val.length > 0) {
      setIdError(val.length < 9 ? "" : "תעודת זהות חייבת להיות 9 ספרות");
    } else {
      setIdError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate ID if provided
    if (tenantMode === "new" && newIdNumber && !validateIsraeliId(newIdNumber)) {
      setError("תעודת הזהות שהוזנה אינה תקינה");
      return;
    }

    setIsLoading(true);
    try {
      let resolvedTenantId = tenantId;

      if (tenantMode === "new") {
        const tenantRes = await fetch("/api/tenants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: newFirstName,
            lastName: newLastName,
            phone: newPhone || undefined,
            idNumber: newIdNumber || undefined,
          }),
        });
        if (!tenantRes.ok) {
          const d = await tenantRes.json();
          throw new Error(d.error || "שגיאה ביצירת דייר");
        }
        resolvedTenantId = (await tenantRes.json()).id;
      }

      if (!resolvedTenantId) throw new Error("יש לבחור דייר");

      const leaseRes = await fetch("/api/leases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          tenantId: resolvedTenantId,
          startDate,
          endDate,
          monthlyRent: parseFloat(monthlyRent),
          depositAmount: depositAmount ? parseFloat(depositAmount) : undefined,
          leaseTerm: parseInt(leaseTerm),
          terms: terms || undefined,
          paymentMethod,
        }),
      });

      if (!leaseRes.ok) {
        const d = await leaseRes.json();
        throw new Error(d.error || "שגיאה ביצירת חוזה");
      }

      const lease = await leaseRes.json();

      // Create deposit payment if requested
      if (createDepositPayment && depositAmount) {
        const depositRes = await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId,
            leaseId: lease.id,
            paymentType: "Deposit",
            amount: parseFloat(depositAmount),
            dueDate: startDate,
            paidDate: depositStatus === "paid" && depositPaidDate ? depositPaidDate : undefined,
            status: depositStatus,
            notes: "פיקדון",
          }),
        });
        if (!depositRes.ok) {
          // Non-fatal: lease was created; warn but continue
          console.warn("Failed to create deposit payment");
        }
      }

      router.push(`/dashboard/properties/${propertyId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "אירעה שגיאה");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">הוספת חוזה שכירות</h1>
            <Link
              href={`/dashboard/properties/${propertyId}`}
              className="px-4 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400 font-semibold"
            >
              ביטול
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Tenant section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">דייר</h2>

            {!loadingTenants && tenants.length > 0 && (
              <div className="flex gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setTenantMode("existing")}
                  className={`px-4 py-2 rounded font-semibold border ${
                    tenantMode === "existing"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  דייר קיים
                </button>
                <button
                  type="button"
                  onClick={() => setTenantMode("new")}
                  className={`px-4 py-2 rounded font-semibold border ${
                    tenantMode === "new"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  דייר חדש
                </button>
              </div>
            )}

            {loadingTenants ? (
              <p className="text-gray-500">טוען דיירים...</p>
            ) : tenantMode === "existing" ? (
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- בחר דייר --</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                    {t.phone ? ` | ${t.phone}` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">שם פרטי *</label>
                  <input
                    type="text"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">שם משפחה *</label>
                  <input
                    type="text"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">טלפון</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    pattern="^0\d{8,9}$"
                    title="מספר טלפון ישראלי (10 ספרות, מתחיל ב-0)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0501234567"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">תעודת זהות</label>
                  <input
                    type="text"
                    value={newIdNumber}
                    onChange={(e) => handleIdChange(e.target.value.replace(/\D/g, ""))}
                    maxLength={9}
                    inputMode="numeric"
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      idError ? "border-red-400" : "border-gray-300"
                    }`}
                    placeholder="9 ספרות"
                  />
                  {idError && <p className="text-xs text-red-500 mt-1">{idError}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Lease details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">פרטי החוזה</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">תאריך התחלה *</label>
                <DateInput
                  value={startDate}
                  onChange={(v) => setStartDate(v)}
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">תאריך סיום *</label>
                <DateInput
                  value={endDate}
                  onChange={(v) => setEndDate(v)}
                  required
                  min={startDate}
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">שכירות חודשית (₪) *</label>
                <input
                  type="number"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(e.target.value)}
                  required
                  min="1"
                  step="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="לדוג' 7500"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">פיקדון (₪)</label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  min="0"
                  step="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="לדוג' 15000"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  משך החוזה (חודשים) *
                  {startDate && endDate && (
                    <span className="text-gray-400 font-normal text-xs mr-2">מחושב אוטומטית</span>
                  )}
                </label>
                <input
                  type="number"
                  value={leaseTerm}
                  onChange={(e) => setLeaseTerm(e.target.value)}
                  required
                  min="1"
                  step="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">שיטת תקבול</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="BankTransfer">העברה בנקאית</option>
                  <option value="Check">שק</option>
                  <option value="Cash">מזומן</option>
                  <option value="BIT">ביט</option>
                  <option value="Paybox">פייבוקס</option>
                  <option value="Other">אחר</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-700 font-semibold mb-1">תנאים נוספים</label>
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="תנאים מיוחדים, הערות..."
                />
              </div>
            </div>
          </div>

          {/* Deposit payment */}
          {depositAmount && parseFloat(depositAmount) > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="createDeposit"
                  checked={createDepositPayment}
                  onChange={(e) => setCreateDepositPayment(e.target.checked)}
                  className="w-4 h-4 accent-green-600 cursor-pointer"
                />
                <label htmlFor="createDeposit" className="text-gray-900 font-semibold cursor-pointer">
                  צור רשומת תקבול עבור הפקדון (₪{parseFloat(depositAmount).toLocaleString()})
                </label>
              </div>

              {createDepositPayment && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">סטטוס הפקדון</label>
                    <select
                      value={depositStatus}
                      onChange={(e) => setDepositStatus(e.target.value as "paid" | "pending")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">ממתין לתקבול</option>
                      <option value="paid">שולם</option>
                    </select>
                  </div>
                  {depositStatus === "paid" && (
                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">תאריך תקבול הפקדון</label>
                      <DateInput
                        value={depositPaidDate}
                        onChange={(v) => setDepositPaidDate(v)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isLoading || !!idError}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-semibold"
            >
              {isLoading ? "שומר..." : "צור חוזה"}
            </button>
            <Link
              href={`/dashboard/properties/${propertyId}`}
              className="px-6 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400 font-semibold"
            >
              ביטול
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
