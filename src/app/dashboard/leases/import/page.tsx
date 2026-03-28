"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { NumberInput } from "@/components/number-input";
import { PhoneInput } from "@/components/phone-input";
import { formatPhone } from "@/lib/phone";

type Step = "upload" | "review" | "complete";

interface ExtractedLease {
  // Property
  propertyAddress: string;
  propertyCity: string;

  // Primary tenant
  firstName: string;
  lastName: string;
  idNumber: string;
  phone: string;
  email: string;

  // Second tenant (couple/co-tenant)
  secondTenantFirstName: string;
  secondTenantLastName: string;
  secondTenantIdNumber: string;
  secondTenantPhone: string;
  secondTenantEmail: string;

  // Lease terms
  startDate: string;
  endDate: string;
  monthlyRent: number | undefined;
  depositAmount: number | undefined;
  terms: string;

  // Payment method
  paymentMethod: string;  // Cash, BankTransfer, Check
  checkBank: string;
  checkBranch: string;
  checkAccount: string;
  checkDepositReminder: boolean;
}

const EMPTY: ExtractedLease = {
  propertyAddress: "", propertyCity: "",
  firstName: "", lastName: "", idNumber: "", phone: "", email: "",
  secondTenantFirstName: "", secondTenantLastName: "", secondTenantIdNumber: "", secondTenantPhone: "", secondTenantEmail: "",
  startDate: "", endDate: "", monthlyRent: undefined, depositAmount: undefined, terms: "",
  paymentMethod: "", checkBank: "", checkBranch: "", checkAccount: "", checkDepositReminder: false,
};

function Field({ label, value, onChange, type = "text", required }: {
  label: string; value: string | number; onChange: (v: string) => void;
  type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}{required && <span className="text-red-500 mr-1">*</span>}</label>
      <input
        type={type}
        lang={type === "date" ? "he" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
      />
    </div>
  );
}

function PhoneField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      <PhoneInput value={value} onChange={onChange}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        placeholder="052-123 4567" />
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
      </div>
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

export default function ImportLeasePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [data, setData] = useState<ExtractedLease>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [hasSecond, setHasSecond] = useState(false);

  // ---- Step 1: Upload & Extract ----
  const handleExtract = async () => {
    if (!file) return;
    setExtracting(true);
    setExtractError("");
    try {
      if (!process.env.NEXT_PUBLIC_HAS_AI) {
        // Try AI extraction via a temporary upload
      }
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/leases/extract-temp", { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "שגיאה בחילוץ הנתונים");
      }
      const extracted = await res.json();
      setData({ ...EMPTY, ...flattenExtracted(extracted) });
      if (extracted.secondTenant?.firstName) setHasSecond(true);
      setStep("review");
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "שגיאה בחילוץ");
    } finally {
      setExtracting(false);
    }
  };

  function flattenExtracted(raw: any): Partial<ExtractedLease> {
    const t = raw.tenant || {};
    const t2 = raw.secondTenant || {};
    const l = raw.lease || {};
    const pay = raw.payment || {};
    const prop = raw.property || {};
    return {
      propertyAddress: prop.address || "",
      propertyCity: prop.city || "",
      firstName: t.firstName || "",
      lastName: t.lastName || "",
      idNumber: t.idNumber || "",
      phone: formatPhone(t.phone) || "",
      email: t.email || "",
      secondTenantFirstName: t2.firstName || "",
      secondTenantLastName: t2.lastName || "",
      secondTenantIdNumber: t2.idNumber || "",
      secondTenantPhone: formatPhone(t2.phone) || "",
      secondTenantEmail: t2.email || "",
      startDate: l.startDate || "",
      endDate: l.endDate || "",
      monthlyRent: l.monthlyRent || undefined,
      depositAmount: l.depositAmount || undefined,
      terms: l.terms || "",
      paymentMethod: pay.method || "",
      checkBank: pay.checkBank || "",
      checkBranch: pay.checkBranch || "",
      checkAccount: pay.checkAccount || "",
      checkDepositReminder: pay.method === "Check",
    };
  }

  const set = (field: keyof ExtractedLease) => (v: string) =>
    setData((prev) => ({ ...prev, [field]: v }));

  // ---- Step 2: Save ----
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");
    setSaving(true);
    try {
      // 1. Find or create property
      const propRes = await fetch("/api/properties");
      const props = await propRes.json();
      let propertyId: string | null = null;

      // Try to match by address
      if (data.propertyAddress) {
        const match = props.find((p: any) =>
          p.address.includes(data.propertyAddress) || data.propertyAddress.includes(p.address)
        );
        if (match) propertyId = match.id;
      }

      if (!propertyId) {
        // Show error — user needs to select/create property
        throw new Error("לא נמצא נכס תואם. נא לבחור נכס קיים או להוסיף נכס חדש תחילה.");
      }

      // 2. Create tenant
      const tenantRes = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          idNumber: data.idNumber || undefined,
          phone: data.phone || undefined,
          email: data.email || undefined,
        }),
      });
      if (!tenantRes.ok) {
        const d = await tenantRes.json();
        throw new Error(d.error || "שגיאה ביצירת דייר");
      }
      const tenant = await tenantRes.json();

      // 3. Create lease
      function calcMonths(start: string, end: string) {
        if (!start || !end) return 12;
        const s = new Date(start), e = new Date(end);
        e.setDate(e.getDate() + 1);
        const total = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
        const rem = e.getDate() - s.getDate();
        return Math.max(rem > 0 ? total + 1 : total, 1);
      }

      const leaseRes = await fetch("/api/leases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          tenantId: tenant.id,
          startDate: data.startDate,
          endDate: data.endDate,
          monthlyRent: data.monthlyRent ?? 0,
          depositAmount: data.depositAmount || undefined,
          leaseTerm: calcMonths(data.startDate, data.endDate),
          terms: data.terms || undefined,
          secondTenantFirstName: hasSecond && data.secondTenantFirstName ? data.secondTenantFirstName : undefined,
          secondTenantLastName: hasSecond && data.secondTenantLastName ? data.secondTenantLastName : undefined,
          secondTenantIdNumber: hasSecond && data.secondTenantIdNumber ? data.secondTenantIdNumber : undefined,
          secondTenantPhone: hasSecond && data.secondTenantPhone ? data.secondTenantPhone : undefined,
          secondTenantEmail: hasSecond && data.secondTenantEmail ? data.secondTenantEmail : undefined,
          paymentMethod: data.paymentMethod || undefined,
          checkBank: data.checkBank || undefined,
          checkBranch: data.checkBranch || undefined,
          checkAccount: data.checkAccount || undefined,
          checkDepositReminder: data.checkDepositReminder,
        }),
      });
      if (!leaseRes.ok) {
        const d = await leaseRes.json();
        throw new Error(d.error || "שגיאה ביצירת חוזה");
      }

      setStep("complete");
      setTimeout(() => router.push(`/dashboard/properties/${propertyId}`), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  // ---- Render ----
  if (step === "complete") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <div className="text-6xl">✅</div>
        <h2 className="text-2xl font-bold text-gray-900">החוזה נשמר בהצלחה!</h2>
        <p className="text-gray-500">מועבר לעמוד הנכס...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📥 ייבוא חוזה שכירות</h1>
        <p className="text-gray-500 text-sm mt-1">העלה חוזה PDF/DOCX — המערכת תחלץ אוטומטית את הנתונים לבדיקה ואישורך</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-sm">
        {[
          { key: "upload", label: "העלאה" },
          { key: "review", label: "בדיקה ואישור" },
          { key: "complete", label: "סיום" },
        ].map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            {i > 0 && <div className="w-8 h-px bg-gray-300" />}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium text-xs ${
              step === s.key ? "bg-indigo-600 text-white" :
              step === "review" && s.key === "upload"
                ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
            }`}>
              {step === "review" && s.key === "upload" && <span>✓</span>}
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center space-y-5">
          <div className="text-5xl">📄</div>
          <div>
            <p className="font-semibold text-gray-800">גרור קובץ לכאן או לחץ לבחירה</p>
            <p className="text-gray-400 text-sm mt-1">PDF או DOCX, עד 10MB</p>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          {file ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-medium">
              <span>📎</span>
              <span>{file.name}</span>
              <button onClick={() => setFile(null)} className="text-indigo-400 hover:text-indigo-700 mr-1">✕</button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700">
              בחר קובץ
            </button>
          )}

          {extractError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{extractError}</div>
          )}

          {file && (
            <div className="flex gap-3 justify-center">
              <button onClick={handleExtract} disabled={extracting}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-60">
                {extracting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    מחלץ נתונים...
                  </span>
                ) : "✨ חלץ נתונים מהחוזה"}
              </button>
              <button onClick={() => { setData(EMPTY); setStep("review"); }}
                className="px-6 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl font-semibold text-sm hover:bg-gray-50">
                הזנה ידנית
              </button>
            </div>
          )}

          {!file && (
            <button onClick={() => { setData(EMPTY); setStep("review"); }}
              className="text-sm text-gray-400 hover:text-gray-600 underline">
              הזנה ידנית ללא קובץ
            </button>
          )}
        </div>
      )}

      {/* Step 2: Review */}
      {step === "review" && (
        <form onSubmit={handleSave} className="space-y-5">
          {saveError && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{saveError}</div>
          )}

          {/* Property address */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <span className="text-lg">🏢</span>
              <h3 className="font-bold text-gray-800 text-sm">כתובת הנכס</h3>
            </div>
            <div className="p-5">
              <AddressAutocomplete
                address={data.propertyAddress}
                city={data.propertyCity}
                onAddressChange={set("propertyAddress")}
                onCityChange={set("propertyCity")}
              />
            </div>
          </div>

          <Section title="פרטי השוכר הראשי" icon="👤">
            <Field label="שם פרטי" value={data.firstName} onChange={set("firstName")} required />
            <Field label="שם משפחה" value={data.lastName} onChange={set("lastName")} required />
            <Field label="תעודת זהות" value={data.idNumber} onChange={set("idNumber")} />
            <PhoneField label="טלפון" value={data.phone} onChange={set("phone")} />
            <div className="md:col-span-2">
              <Field label="אימייל" value={data.email} onChange={set("email")} type="email" />
            </div>
          </Section>

          {/* Second tenant toggle */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">👥</span>
                <h3 className="font-bold text-gray-800 text-sm">שוכר/ת נוסף/ת (בן/בת זוג)</h3>
              </div>
              <button type="button" onClick={() => setHasSecond(!hasSecond)}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0"
                style={{ background: hasSecond ? "var(--accent)" : "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                <span className="inline-block h-4 w-4 rounded-full shadow"
                  style={{
                    background: hasSecond ? "#fff" : "var(--text-3)",
                    transform: hasSecond ? "translateX(1.4rem)" : "translateX(0.2rem)",
                    transition: "transform 0.2s",
                  }} />
              </button>
            </div>
            {hasSecond && (
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="שם פרטי" value={data.secondTenantFirstName} onChange={set("secondTenantFirstName")} />
                <Field label="שם משפחה" value={data.secondTenantLastName} onChange={set("secondTenantLastName")} />
                <Field label="תעודת זהות" value={data.secondTenantIdNumber} onChange={set("secondTenantIdNumber")} />
                <PhoneField label="טלפון" value={data.secondTenantPhone} onChange={set("secondTenantPhone")} />
              </div>
            )}
          </div>

          <Section title="תנאי השכירות" icon="📋">
            <Field label="תאריך התחלה" value={data.startDate} onChange={set("startDate")} type="date" required />
            <Field label="תאריך סיום" value={data.endDate} onChange={set("endDate")} type="date" required />
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">שכ״ד חודשי (₪)<span className="text-red-500 mr-1">*</span></label>
              <NumberInput value={data.monthlyRent} onChange={(v) => setData((prev) => ({ ...prev, monthlyRent: v }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">פיקדון (₪)</label>
              <NumberInput value={data.depositAmount} onChange={(v) => setData((prev) => ({ ...prev, depositAmount: v }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">תנאים מיוחדים</label>
              <textarea value={data.terms} onChange={(e) => set("terms")(e.target.value)} rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </Section>

          <Section title="אמצעי תקבול" icon="💳">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">שיטת תקבול</label>
              <select value={data.paymentMethod} onChange={(e) => set("paymentMethod")(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">-- בחר --</option>
                <option value="BankTransfer">העברה בנקאית</option>
                <option value="Check">שיקים</option>
                <option value="Cash">מזומן</option>
                <option value="CreditCard">כרטיס אשראי</option>
              </select>
            </div>
            {data.paymentMethod === "Check" && (
              <>
                <Field label="שם הבנק" value={data.checkBank} onChange={set("checkBank")} />
                <Field label="מספר סניף" value={data.checkBranch} onChange={set("checkBranch")} />
                <Field label="מספר חשבון" value={data.checkAccount} onChange={set("checkAccount")} />
                <div className="md:col-span-2 flex items-center gap-3">
                  <input type="checkbox" id="remChk" checked={data.checkDepositReminder}
                    onChange={(e) => setData((p) => ({ ...p, checkDepositReminder: e.target.checked }))}
                    className="w-4 h-4 accent-indigo-600" />
                  <label htmlFor="remChk" className="text-sm text-gray-700 font-medium cursor-pointer">
                    צור תזכורת חודשית להפקדת השיקים
                  </label>
                </div>
              </>
            )}
          </Section>

          <div className="flex gap-3 pb-6">
            <button type="submit" disabled={saving}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-60">
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  שומר...
                </span>
              ) : "✅ שמור חוזה"}
            </button>
            <button type="button" onClick={() => setStep("upload")}
              className="px-5 py-3 bg-white text-gray-600 border border-gray-200 rounded-xl font-semibold hover:bg-gray-50">
              חזור
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
