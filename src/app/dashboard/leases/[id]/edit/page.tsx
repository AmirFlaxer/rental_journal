"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { DateInput } from "@/components/date-input";
import { NumberInput } from "@/components/number-input";
import { PhoneInput } from "@/components/phone-input";
import { formatPhone } from "@/lib/phone";
import { calcEffectiveRent, type IndexRate, type LinkageFrequency } from "@/lib/linkage";

interface LeaseDocument {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

interface ExtractedData {
  tenant: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    idNumber?: string;
    email?: string;
  };
  lease: {
    startDate?: string;
    endDate?: string;
    monthlyRent?: number;
    depositAmount?: number;
    terms?: string;
  };
}

function toDateInput(val: string | null | undefined) {
  if (!val) return "";
  return new Date(val).toISOString().slice(0, 10);
}

function calcMonths(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  e.setDate(e.getDate() + 1); // end is inclusive → shift to exclusive
  const totalMonths = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  const remainingDays = e.getDate() - s.getDate();
  // If partial month remains, round up
  return Math.max(remainingDays > 0 ? totalMonths + 1 : totalMonths, 1);
}

function normalizePaymentMethod(pm: string | null | undefined): string {
  if (!pm) return "checks";
  switch (pm.toLowerCase()) {
    case "check": case "checks": return "checks";
    case "banktransfer": case "bank_transfer": return "bank_transfer";
    case "cash": return "cash";
    case "bit": return "bit";
    case "paybox": return "paybox";
    default: return "checks";
  }
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0"
      style={{ background: on ? "var(--accent)" : "var(--bg-elevated)", border: "1px solid var(--border)" }}>
      <span className="inline-block h-5 w-5 rounded-full shadow transition-transform"
        style={{
          background: on ? "#fff" : "var(--text-3)",
          transform: on ? "translateX(1.4rem)" : "translateX(0.2rem)",
          transition: "transform 0.2s",
        }} />
    </button>
  );
}

export default function EditLeasePage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };

  const [isFetching, setIsFetching] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Documents
  const [documents, setDocuments] = useState<LeaseDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extraction
  const [extractingDocId, setExtractingDocId] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [extractDocName, setExtractDocName] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [tenantName, setTenantName] = useState("");

  // Lease fields
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [monthlyRent, setMonthlyRent] = useState<number | undefined>(undefined);
  const [depositAmount, setDepositAmount] = useState<number | undefined>(undefined);
  const [leaseTerm, setLeaseTerm] = useState("12");
  const [terms, setTerms] = useState("");
  const [status, setStatus] = useState("active");

  // Option fields
  const [hasOption, setHasOption] = useState(false);
  const [optionMonths, setOptionMonths] = useState("");
  const [optionRent, setOptionRent] = useState<number | undefined>(undefined);
  const [optionStart, setOptionStart] = useState("");
  const [optionEnd, setOptionEnd] = useState("");
  const [optionTerms, setOptionTerms] = useState("");

  // Second tenant
  const [hasSecondTenant, setHasSecondTenant] = useState(false);
  const [secondTenantFirstName, setSecondTenantFirstName] = useState("");
  const [secondTenantLastName, setSecondTenantLastName] = useState("");
  const [secondTenantIdNumber, setSecondTenantIdNumber] = useState("");
  const [secondTenantPhone, setSecondTenantPhone] = useState("");
  const [secondTenantEmail, setSecondTenantEmail] = useState("");

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState("checks");
  const [checkBank, setCheckBank] = useState("");
  const [checkBranch, setCheckBranch] = useState("");
  const [checkAccount, setCheckAccount] = useState("");

  // Index linkage
  const [linkageType, setLinkageType] = useState<"none" | "usd" | "cpi">("none");
  const [linkageFrequency, setLinkageFrequency] = useState<"monthly" | "quarterly" | "semiannual">("monthly");
  const [baseAmount, setBaseAmount] = useState<number | undefined>(undefined);
  const [baseDate, setBaseDate] = useState<string | undefined>(undefined);

  // Comparison panel
  const [compRates, setCompRates] = useState<IndexRate[]>([]);
  const [compFrequency, setCompFrequency] = useState<LinkageFrequency>("monthly");

  // Termination protection fields
  const [earlyTermProtection, setEarlyTermProtection] = useState(false);
  const [tenantNoticeMonths, setTenantNoticeMonths] = useState("1");
  const [landlordNoticeMonths, setLandlordNoticeMonths] = useState("1");

  useEffect(() => {
    fetch("/api/index-rates")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { if (Array.isArray(data)) setCompRates(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/leases/${id}`)
      .then((r) => { if (!r.ok) throw new Error("שגיאה בטעינת החוזה"); return r.json(); })
      .then((lease) => {
        setPropertyId(lease.propertyId);
        setTenantId(lease.tenantId);
        setStartDate(toDateInput(lease.startDate));
        setEndDate(toDateInput(lease.endDate));
        setMonthlyRent(lease.monthlyRent);
        setDepositAmount(lease.depositAmount || undefined);
        setLeaseTerm(String(lease.leaseTerm));
        setTerms(lease.terms || "");
        setStatus(lease.status || "active");
        setHasOption(lease.hasOption || false);
        const months = lease.optionMonths ? String(lease.optionMonths) : "12";
        setOptionMonths(lease.optionMonths ? String(lease.optionMonths) : "");
        setOptionRent(lease.optionRent || undefined);
        setOptionTerms(lease.optionTerms || "");

        // חישוב תאריכי אופציה: אם null בDB — חשב מתאריך הסיום
        const endStr = toDateInput(lease.endDate);
        let optStart = toDateInput(lease.optionStart);
        let optEnd   = toDateInput(lease.optionEnd);
        if (lease.hasOption && !optStart && endStr) {
          const d = new Date(endStr);
          d.setDate(d.getDate() + 1);
          optStart = d.toISOString().slice(0, 10);
        }
        if (lease.hasOption && !optEnd && optStart) {
          const d = new Date(optStart);
          const m = parseInt(months) || 12;
          d.setMonth(d.getMonth() + m);
          d.setDate(d.getDate() - 1);
          optEnd = d.toISOString().slice(0, 10);
        }
        setOptionStart(optStart);
        setOptionEnd(optEnd);
        setPaymentMethod(normalizePaymentMethod(lease.paymentMethod));
        setCheckBank(lease.checkBank || "");
        setCheckBranch(lease.checkBranch || "");
        setCheckAccount(lease.checkAccount || "");
        setLinkageType(lease.linkageType || "none");
        setLinkageFrequency(lease.linkageFrequency || "monthly");
        setBaseAmount(lease.baseAmount || undefined);
        setBaseDate(lease.baseDate ? toDateInput(lease.baseDate) : undefined);
        setEarlyTermProtection(lease.earlyTermProtection || false);
        setTenantNoticeMonths(lease.tenantNoticeMonths ? String(lease.tenantNoticeMonths) : "1");
        setLandlordNoticeMonths(lease.landlordNoticeMonths ? String(lease.landlordNoticeMonths) : "1");
        if (lease.tenant) setTenantName(`${lease.tenant.firstName} ${lease.tenant.lastName}`);
        if (lease.secondTenantFirstName) {
          setHasSecondTenant(true);
          setSecondTenantFirstName(lease.secondTenantFirstName || "");
          setSecondTenantLastName(lease.secondTenantLastName || "");
          setSecondTenantIdNumber(lease.secondTenantIdNumber || "");
          setSecondTenantPhone(formatPhone(lease.secondTenantPhone) || "");
          setSecondTenantEmail(lease.secondTenantEmail || "");
        }
        if (lease.leaseDocuments) setDocuments(lease.leaseDocuments);
      })
      .catch((e) => setError(e.message))
      .finally(() => setIsFetching(false));
  }, [id]);

  // Auto-calculate lease term from dates
  useEffect(() => {
    const m = calcMonths(startDate, endDate);
    if (m > 0) setLeaseTerm(String(m));
  }, [startDate, endDate]);

  // Auto-fill option start = endDate + 1 day
  useEffect(() => {
    if (hasOption && endDate && !optionStart) {
      const d = new Date(endDate);
      d.setDate(d.getDate() + 1);
      setOptionStart(d.toISOString().slice(0, 10));
    }
  }, [hasOption, endDate]);

  // Auto-calculate option end from option start + 1 year - 1 day (default), or from months
  useEffect(() => {
    if (optionStart) {
      const d = new Date(optionStart);
      if (optionMonths) {
        d.setMonth(d.getMonth() + parseInt(optionMonths));
        d.setDate(d.getDate() - 1);
      } else {
        d.setFullYear(d.getFullYear() + 1);
        d.setDate(d.getDate() - 1);
      }
      setOptionEnd(d.toISOString().slice(0, 10));
    }
  }, [optionStart, optionMonths]);

  const handleExtract = async (doc: LeaseDocument) => {
    setExtractingDocId(doc.id);
    setExtractDocName(doc.fileName);
    setExtractedData(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}/extract`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "שגיאה בחילוץ הנתונים");
      }
      const data: ExtractedData = await res.json();
      setExtractedData(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "שגיאה בחילוץ הנתונים");
      setExtractingDocId(null);
    }
  };

  const applyExtractedData = () => {
    if (!extractedData) return;
    const { tenant, lease } = extractedData;
    if (lease.startDate) setStartDate(lease.startDate);
    if (lease.endDate) setEndDate(lease.endDate);
    if (lease.monthlyRent) setMonthlyRent(lease.monthlyRent);
    if (lease.depositAmount) setDepositAmount(lease.depositAmount);
    if (lease.terms) setTerms(lease.terms);
    // Store tenant extracted data for display — cannot change tenantId here
    setExtractedData(null);
    setExtractingDocId(null);
    // Show extracted tenant info as a note if present
    if (tenant.firstName || tenant.lastName) {
      const name = [tenant.firstName, tenant.lastName].filter(Boolean).join(" ");
      alert(`נתוני השכירות הוחלו בהצלחה.\n\nשם השוכר בחוזה: ${name}${tenant.idNumber ? `\nת.ז.: ${tenant.idNumber}` : ""}${tenant.phone ? `\nטלפון: ${formatPhone(tenant.phone)}` : ""}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/leases/${id}/upload`, { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "שגיאה בהעלאה");
      }
      const doc = await res.json();
      setDocuments((prev) => [doc, ...prev]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "שגיאה בהעלאת הקובץ");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm("למחוק את המסמך?")) return;
    const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    if (res.ok) {
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    }
  };

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch(`/api/leases/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          tenantId,
          startDate,
          endDate,
          monthlyRent: monthlyRent ?? 0,
          depositAmount: depositAmount || undefined,
          leaseTerm: parseInt(leaseTerm),
          terms: terms || undefined,
          status,
          paymentMethod,
          checkBank: paymentMethod === "standing_order" ? checkBank || undefined : undefined,
          checkBranch: paymentMethod === "standing_order" ? checkBranch || undefined : undefined,
          checkAccount: paymentMethod === "standing_order" ? checkAccount || undefined : undefined,
          hasOption,
          optionMonths: hasOption && optionMonths ? parseInt(optionMonths) : undefined,
          optionRent: hasOption && optionRent ? optionRent : undefined,
          optionStart: hasOption && optionStart ? optionStart : undefined,
          optionEnd: hasOption && optionEnd ? optionEnd : undefined,
          optionTerms: hasOption && optionTerms ? optionTerms : undefined,
          earlyTermProtection,
          tenantNoticeMonths: !earlyTermProtection && tenantNoticeMonths ? parseInt(tenantNoticeMonths) : undefined,
          landlordNoticeMonths: !earlyTermProtection && landlordNoticeMonths ? parseInt(landlordNoticeMonths) : undefined,
          secondTenantFirstName: hasSecondTenant && secondTenantFirstName ? secondTenantFirstName : null,
          secondTenantLastName: hasSecondTenant && secondTenantLastName ? secondTenantLastName : null,
          secondTenantIdNumber: hasSecondTenant && secondTenantIdNumber ? secondTenantIdNumber : null,
          secondTenantPhone: hasSecondTenant && secondTenantPhone ? secondTenantPhone : null,
          secondTenantEmail: hasSecondTenant && secondTenantEmail ? secondTenantEmail : null,
          linkageType,
          linkageFrequency,
          baseAmount: linkageType !== "none" ? (baseAmount || monthlyRent) : undefined,
          baseDate: linkageType !== "none" ? (baseDate || startDate) : undefined,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "שגיאה בעדכון החוזה");
      }
      router.push(`/dashboard/properties/${propertyId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "אירעה שגיאה");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-xl text-gray-500">טוען חוזה...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">עריכת חוזה</h1>
            {tenantName && <p className="text-gray-500 text-sm mt-0.5">דייר: {tenantName}</p>}
          </div>
          {propertyId && (
            <Link href={`/dashboard/properties/${propertyId}`}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold text-sm">
              ביטול
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 space-y-6">
        {error && <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-xl">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Lease details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">פרטי החוזה</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">תאריך התחלה *</label>
                <DateInput value={startDate} onChange={(v) => setStartDate(v)} required />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">תאריך סיום *</label>
                <DateInput value={endDate} onChange={(v) => setEndDate(v)} required min={startDate} />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">שכירות חודשית (₪) *</label>
                <NumberInput value={monthlyRent} onChange={setMonthlyRent}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">פיקדון (₪)</label>
                <NumberInput value={depositAmount} onChange={setDepositAmount}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  משך (חודשים) *
                  <span className="text-gray-400 font-normal text-xs mr-1">מחושב אוטומטית</span>
                </label>
                <input type="text" inputMode="numeric" value={leaseTerm} onChange={(e) => setLeaseTerm(e.target.value.replace(/\D/g, ""))} required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">סטטוס</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="active">פעיל</option>
                  <option value="ended">הסתיים</option>
                  <option value="paused">מושהה</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">אמצעי תשלום שכ״ד</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="checks">שיקים</option>
                  <option value="bank_transfer">העברה בנקאית</option>
                  <option value="standing_order">הוראת קבע</option>
                  <option value="cash">מזומן</option>
                  <option value="bit">ביט</option>
                  <option value="paybox">פייבוקס</option>
                  <option value="other">אחר</option>
                </select>
                {paymentMethod === "standing_order" && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">שם בנק</label>
                      <input value={checkBank} onChange={(e) => setCheckBank(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="לאומי / פועלים..." />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">סניף</label>
                      <input value={checkBranch} onChange={(e) => setCheckBranch(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="מספר סניף" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">מספר חשבון</label>
                      <input value={checkAccount} onChange={(e) => setCheckAccount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="מספר חשבון" />
                    </div>
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-700 font-semibold mb-1">תנאים נוספים</label>
                <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="תנאים מיוחדים..." />
              </div>
            </div>
          </div>

          {/* Index linkage */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">הצמדת שכר דירה</h2>
            <div className="flex flex-wrap gap-3 mb-3">
              {(["none", "usd", "cpi"] as const).map((type) => (
                <button key={type} type="button" onClick={() => setLinkageType(type)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    linkageType === type
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}>
                  {type === "none" ? "ללא הצמדה" : type === "usd" ? 'דולר ארה"ב' : "מדד כללי (CPI)"}
                </button>
              ))}
            </div>
            {linkageType !== "none" && (
              <div>
                <label className="block text-xs text-gray-500 mb-2">תדירות עדכון</label>
                <div className="flex gap-3">
                  {(["monthly", "quarterly", "semiannual"] as const).map((freq) => (
                    <button key={freq} type="button" onClick={() => setLinkageFrequency(freq)}
                      className={`px-3 py-1.5 rounded border text-sm transition-colors ${
                        linkageFrequency === freq
                          ? "bg-blue-100 text-blue-700 border-blue-400"
                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                      }`}>
                      {freq === "monthly" ? "חודשי" : freq === "quarterly" ? "רבעוני" : "חצי-שנתי"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">הסכום הבסיסי ותאריך הבסיס לא ישתנו בעריכה</p>
              </div>
            )}
          </div>

          {/* Linkage comparison panel */}
          {monthlyRent && startDate && (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-indigo-900">השוואת מסלולי הצמדה — תיאורטי</h2>
                  <p className="text-xs text-indigo-500 mt-0.5">
                    מה היה שכ&quot;ד היום לו החוזה היה צמוד מתחילתו ({new Date(startDate).toLocaleDateString("he-IL")})
                  </p>
                </div>
                <div className="flex gap-1 text-xs">
                  {(["monthly", "quarterly", "semiannual"] as const).map((f) => (
                    <button key={f} type="button" onClick={() => setCompFrequency(f)}
                      className={`px-2.5 py-1 rounded-lg border transition-colors font-medium ${
                        compFrequency === f
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-indigo-600 border-indigo-300 hover:bg-indigo-50"
                      }`}>
                      {f === "monthly" ? "חודשי" : f === "quarterly" ? "רבעוני" : "חצי-שנתי"}
                    </button>
                  ))}
                </div>
              </div>

              {compRates.length === 0 ? (
                <p className="text-xs text-indigo-400 italic">
                  אין נתוני שערים בDB — הרץ את ה-cron או קרא ל-/api/index-rates/refresh כדי לטעון נתונים
                </p>
              ) : (
                <div className="space-y-2">
                  {(["none", "usd", "cpi"] as const).map((type) => {
                    const simLease = {
                      linkageType: type,
                      linkageFrequency: compFrequency,
                      baseAmount: monthlyRent,
                      baseDate: startDate,
                      monthlyRent,
                    };
                    const effective = calcEffectiveRent(simLease, compRates);
                    const diff = effective - monthlyRent;
                    const pct = monthlyRent > 0 ? ((diff / monthlyRent) * 100).toFixed(1) : "0.0";
                    const isActive = linkageType === type && linkageFrequency === compFrequency;

                    return (
                      <div key={type} className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                        isActive
                          ? "bg-indigo-100 border-indigo-300"
                          : "bg-white border-indigo-100"
                      }`}>
                        <div className="flex items-center gap-2">
                          {isActive && <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">נוכחי</span>}
                          <span className="text-sm font-semibold text-gray-800">
                            {type === "none" ? "ללא הצמדה" : type === "usd" ? 'דולר ארה"ב' : "מדד כללי (CPI)"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="font-bold text-gray-900">
                            ₪{effective.toLocaleString("he-IL")}
                          </span>
                          {type !== "none" && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              diff > 0 ? "bg-green-100 text-green-700" :
                              diff < 0 ? "bg-red-100 text-red-700" :
                              "bg-gray-100 text-gray-500"
                            }`}>
                              {diff >= 0 ? "+" : ""}{diff > 0 ? `₪${diff.toLocaleString("he-IL")}` : diff < 0 ? `-₪${Math.abs(diff).toLocaleString("he-IL")}` : "ללא שינוי"}
                              {" "}({diff >= 0 ? "+" : ""}{pct}%)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-[11px] text-indigo-400 mt-3">* חישוב תיאורטי בלבד — לידיעה, ללא שינוי בחוזה</p>
            </div>
          )}

          {/* Tenant info card */}
          {tenantId && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">פרטי השוכר הראשי</h2>
                <a href={`/dashboard/tenants/${tenantId}/edit`}
                  className="px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors"
                  style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
                  עריכת פרטים ›
                </a>
              </div>
              <p className="text-sm" style={{ color: "var(--text-2)" }}>{tenantName || "—"}</p>
            </div>
          )}

          {/* Second tenant */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">שוכר שני</h2>
                <p className="text-sm text-gray-500">למשל: זוג שמשכיר יחד</p>
              </div>
              <Toggle on={hasSecondTenant} onToggle={() => setHasSecondTenant(!hasSecondTenant)} />
            </div>
            {hasSecondTenant && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">שם פרטי *</label>
                  <input value={secondTenantFirstName} onChange={(e) => setSecondTenantFirstName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="שם פרטי" />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">שם משפחה *</label>
                  <input value={secondTenantLastName} onChange={(e) => setSecondTenantLastName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="שם משפחה" />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">תעודת זהות</label>
                  <input value={secondTenantIdNumber} onChange={(e) => setSecondTenantIdNumber(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="9 ספרות" />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">טלפון</label>
                  <PhoneInput value={secondTenantPhone} onChange={setSecondTenantPhone}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="052-123 4567" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-gray-700 font-semibold mb-1">אימייל</label>
                  <input type="email" value={secondTenantEmail} onChange={(e) => setSecondTenantEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="example@email.com" dir="ltr" />
                </div>
              </div>
            )}
          </div>

          {/* Option */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">אופציה להארכת חוזה</h2>
                <p className="text-sm text-gray-500">האם לחוזה יש אופציה לחידוש?</p>
              </div>
              <Toggle on={hasOption} onToggle={() => setHasOption(!hasOption)} />
            </div>
            {hasOption && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">תחילת אופציה</label>
                  <DateInput value={optionStart} onChange={(v) => setOptionStart(v)} />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">משך האופציה (חודשים)</label>
                  <input type="text" inputMode="numeric" value={optionMonths} onChange={(e) => setOptionMonths(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="לדוג' 12" />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">סיום אופציה
                    <span className="text-gray-400 font-normal text-xs mr-1">מחושב אוטומטית</span>
                  </label>
                  <DateInput value={optionEnd} onChange={(v) => setOptionEnd(v)} />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">שכירות באופציה (₪)</label>
                  <NumberInput value={optionRent} onChange={setOptionRent}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="אם שונה מהחוזה" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-gray-700 font-semibold mb-1">תנאי האופציה</label>
                  <textarea value={optionTerms} onChange={(e) => setOptionTerms(e.target.value)} rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="לדוג': הודעה 60 יום מראש..." />
                </div>
              </div>
            )}
          </div>

          {/* Early termination */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">סיום מוקדם</h2>
                <p className="text-sm text-gray-500">הגנה מפני סיום לפני תאריך</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">{earlyTermProtection ? "מוגן — אין סיום מוקדם" : "מותר סיום מוקדם"}</span>
                <Toggle on={earlyTermProtection} onToggle={() => setEarlyTermProtection(!earlyTermProtection)} />
              </div>
            </div>

            {!earlyTermProtection && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">הודעה מצד השוכר (חודשים)</label>
                  <input type="text" inputMode="numeric" value={tenantNoticeMonths} onChange={(e) => setTenantNoticeMonths(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <p className="text-xs text-gray-400 mt-1">כמה חודשים מראש חייב השוכר להודיע</p>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">הודעה מצד המשכיר (חודשים)</label>
                  <input type="text" inputMode="numeric" value={landlordNoticeMonths} onChange={(e) => setLandlordNoticeMonths(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <p className="text-xs text-gray-400 mt-1">כמה חודשים מראש חייב המשכיר להודיע</p>
                </div>
              </div>
            )}
          </div>

          {/* Documents */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">מסמכי חוזה</h2>

            {uploadError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm">{uploadError}</div>
            )}

            <div className="flex items-center gap-3 mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileUpload}
                className="hidden"
                id="doc-upload"
              />
              <label
                htmlFor="doc-upload"
                className={`px-4 py-2 rounded-lg font-semibold text-sm cursor-pointer border transition-colors ${
                  uploading
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-white text-blue-700 border-blue-400 hover:bg-blue-50"
                }`}
              >
                {uploading ? "מעלה..." : "📎 העלה מסמך"}
              </label>
              <span className="text-xs text-gray-400">PDF או DOCX עד 10MB</span>
            </div>

            {documents.length === 0 ? (
              <p className="text-sm text-gray-400 italic">אין מסמכים מצורפים</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between py-2.5 gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-lg flex-shrink-0">{doc.mimeType === "application/pdf" ? "📄" : "📝"}</span>
                      <div className="min-w-0">
                        <a
                          href={`/api/documents/${doc.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 hover:underline text-sm font-medium truncate block"
                        >
                          {doc.fileName}
                        </a>
                        <span className="text-xs text-gray-400">
                          {formatBytes(doc.sizeBytes)} · {new Date(doc.uploadedAt).toLocaleDateString("he-IL")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleExtract(doc)}
                        disabled={extractingDocId === doc.id}
                        className="px-3 py-1 text-xs font-semibold rounded-lg border border-purple-400 text-purple-700 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-wait transition-colors"
                        title="שאוב נתונים מהמסמך"
                      >
                        {extractingDocId === doc.id ? "⏳ מחלץ..." : "✨ שאוב נתונים"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="text-red-400 hover:text-red-600 text-sm"
                        title="מחק מסמך"
                      >
                        🗑
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-4">
            <button type="submit" disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold">
              {isLoading ? "שומר..." : "עדכן חוזה"}
            </button>
            {propertyId && (
              <Link href={`/dashboard/properties/${propertyId}`}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold">
                ביטול
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* Extraction confirmation modal */}
      {extractedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5" dir="rtl">
            <div>
              <h2 className="text-xl font-bold text-gray-900">נתונים שחולצו מהמסמך</h2>
              <p className="text-sm text-gray-500 mt-1">{extractDocName}</p>
            </div>

            {/* Tenant info */}
            {Object.values(extractedData.tenant).some(Boolean) && (
              <div className="bg-purple-50 rounded-xl p-4">
                <h3 className="font-semibold text-purple-900 mb-2">פרטי השוכר</h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {extractedData.tenant.firstName && (
                    <><dt className="text-gray-500">שם פרטי</dt><dd className="font-medium">{extractedData.tenant.firstName}</dd></>
                  )}
                  {extractedData.tenant.lastName && (
                    <><dt className="text-gray-500">שם משפחה</dt><dd className="font-medium">{extractedData.tenant.lastName}</dd></>
                  )}
                  {extractedData.tenant.idNumber && (
                    <><dt className="text-gray-500">ת.ז.</dt><dd className="font-medium">{extractedData.tenant.idNumber}</dd></>
                  )}
                  {extractedData.tenant.phone && (
                    <><dt className="text-gray-500">טלפון</dt><dd className="font-medium">{formatPhone(extractedData.tenant.phone)}</dd></>
                  )}
                  {extractedData.tenant.email && (
                    <><dt className="text-gray-500">אימייל</dt><dd className="font-medium">{extractedData.tenant.email}</dd></>
                  )}
                </dl>
                <p className="text-xs text-purple-600 mt-2">* פרטי השוכר מוצגים לעיונך — לא ישונו בחוזה הנוכחי</p>
              </div>
            )}

            {/* Lease info */}
            {Object.values(extractedData.lease).some(Boolean) && (
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="font-semibold text-blue-900 mb-2">פרטי השכירות</h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {extractedData.lease.startDate && (
                    <><dt className="text-gray-500">תאריך התחלה</dt><dd className="font-medium">{extractedData.lease.startDate}</dd></>
                  )}
                  {extractedData.lease.endDate && (
                    <><dt className="text-gray-500">תאריך סיום</dt><dd className="font-medium">{extractedData.lease.endDate}</dd></>
                  )}
                  {extractedData.lease.monthlyRent && (
                    <><dt className="text-gray-500">שכ"ד חודשי</dt><dd className="font-medium">₪{extractedData.lease.monthlyRent.toLocaleString()}</dd></>
                  )}
                  {extractedData.lease.depositAmount && (
                    <><dt className="text-gray-500">פיקדון</dt><dd className="font-medium">₪{extractedData.lease.depositAmount.toLocaleString()}</dd></>
                  )}
                  {extractedData.lease.terms && (
                    <><dt className="text-gray-500 col-span-2">תנאים</dt><dd className="font-medium col-span-2 text-xs">{extractedData.lease.terms}</dd></>
                  )}
                </dl>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={applyExtractedData}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
              >
                החל נתוני שכירות על הטופס
              </button>
              <button
                onClick={() => { setExtractedData(null); setExtractingDocId(null); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
