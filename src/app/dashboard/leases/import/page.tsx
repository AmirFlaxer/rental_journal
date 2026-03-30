"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { NumberInput } from "@/components/number-input";
import { PhoneInput } from "@/components/phone-input";
import { formatPhone } from "@/lib/phone";

type Step = "upload" | "review" | "complete";

interface ExtractedLease {
  // Property
  propertyAddress: string;
  propertyHouseNumber: string;
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
  paymentMethod: string;
  checkBank: string;
  checkBranch: string;
  checkAccount: string;
  checkDepositReminder: boolean;

  // Option
  hasOption: boolean;
  optionMonths: string;
  optionRent: number | undefined;
  optionStartDate: string;
  optionEndDate: string;
  optionTerms: string;
}

const EMPTY: ExtractedLease = {
  propertyAddress: "", propertyHouseNumber: "", propertyCity: "",
  firstName: "", lastName: "", idNumber: "", phone: "", email: "",
  secondTenantFirstName: "", secondTenantLastName: "", secondTenantIdNumber: "", secondTenantPhone: "", secondTenantEmail: "",
  startDate: "", endDate: "", monthlyRent: undefined, depositAmount: undefined, terms: "",
  paymentMethod: "", checkBank: "", checkBranch: "", checkAccount: "", checkDepositReminder: false,
  hasOption: false, optionMonths: "", optionRent: undefined, optionStartDate: "", optionEndDate: "", optionTerms: "",
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

  // Property resolution
  const [allProperties, setAllProperties] = useState<any[]>([]);
  const [matchedProperty, setMatchedProperty] = useState<any | null>(null);
  const [propertyAction, setPropertyAction] = useState<"use-existing" | "create-new">("create-new");

  // SSE progress state
  const [progressStep, setProgressStep] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [llmTokens, setLlmTokens] = useState("");
  const [thinkingTokens, setThinkingTokens] = useState("");

  // Count non-null leaf fields extracted so far from the partial JSON stream
  const extractedFieldCount = useMemo(() => {
    if (!llmTokens) return 0;
    // Match: "key": "non-empty-string" | number | true/false  (not null, not {, not [)
    const strings = (llmTokens.match(/": "[^"]+"/g) || []).length;
    const numbers = (llmTokens.match(/": [1-9][0-9]*/g) || []).length;
    const bools   = (llmTokens.match(/": true/g) || []).length;
    return strings + numbers + bools;
  }, [llmTokens]);

  const TOTAL_FIELDS = 31; // approximate total leaf fields in the schema

  // Load properties when entering review step, try to match by address
  useEffect(() => {
    if (step !== "review") return;
    fetch("/api/properties")
      .then((r) => r.json())
      .then((props: any[]) => {
        if (!Array.isArray(props)) return;
        setAllProperties(props);
        const addr = data.propertyAddress.trim().toLowerCase();
        const city = data.propertyCity.trim().toLowerCase();
        const match = props.find((p) => {
          const pAddr = (p.address || "").toLowerCase();
          const pCity = (p.city || "").toLowerCase();
          return (addr && pAddr.includes(addr)) || (addr && addr.includes(pAddr)) ||
                 (city && pCity === city && addr && pAddr.includes(addr.split(" ")[0]));
        }) ?? null;
        setMatchedProperty(match);
        setPropertyAction(match ? "use-existing" : "create-new");
      })
      .catch(() => {});
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Step 1: Upload & Extract ----
  const handleExtract = async () => {
    if (!file) return;
    setExtracting(true);
    setExtractError("");
    setProgressStep(0);
    setProgressText("");
    setLlmTokens("");
    setThinkingTokens("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/leases/extract-temp", { method: "POST", body: fd });
      if (!res.body) throw new Error("שגיאה בחילוץ הנתונים");

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let extracted: any = null;

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const jsonStr = trimmed.slice(5).trim();
          let evt: any;
          try { evt = JSON.parse(jsonStr); } catch { continue; }

          if (evt.type === "status") {
            setProgressStep(evt.step ?? 0);
            setProgressText(evt.text ?? "");
          } else if (evt.type === "thinking") {
            setThinkingTokens((prev) => prev + (evt.text ?? ""));
          } else if (evt.type === "token") {
            setLlmTokens((prev) => prev + (evt.text ?? ""));
          } else if (evt.type === "result") {
            extracted = evt.data;
            break outer;
          } else if (evt.type === "error") {
            throw new Error(evt.text || "שגיאה בחילוץ");
          }
        }
      }

      if (!extracted) throw new Error("לא התקבלו נתונים מהשרת");
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
    const opt = raw.option || {};

    // Prefer explicit houseNumber from LLM; fallback: split trailing number from address
    const fullAddr: string = prop.address || "";
    const houseMatch = fullAddr.match(/^(.*?)\s+(\d+[א-ת]?)$/);
    const streetName = prop.houseNumber ? fullAddr : (houseMatch ? houseMatch[1].trim() : fullAddr);
    const houseNum = prop.houseNumber || (houseMatch ? houseMatch[2] : "");

    return {
      propertyAddress: streetName,
      propertyHouseNumber: houseNum,
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
      checkDepositReminder: pay.method === "checks",
      hasOption: opt.hasOption || false,
      optionMonths: opt.optionMonths ? String(opt.optionMonths) : "",
      optionRent: opt.optionRent || undefined,
      optionStartDate: opt.optionStartDate || "",
      optionEndDate: opt.optionEndDate || "",
      optionTerms: opt.optionTerms || "",
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
      // 1. Resolve property: use existing or create new
      let propertyId: string;

      if (propertyAction === "use-existing" && matchedProperty) {
        propertyId = matchedProperty.id;
      } else {
        // Create new property from extracted data
        if (!data.propertyAddress || !data.propertyCity) {
          throw new Error("חסרה כתובת הנכס — מלא רחוב ועיר לפני השמירה");
        }
        const title = `${data.propertyAddress}${data.propertyHouseNumber ? " " + data.propertyHouseNumber : ""}, ${data.propertyCity}`;
        const newProp = await fetch("/api/properties", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            address: data.propertyAddress,
            houseNumber: data.propertyHouseNumber || undefined,
            city: data.propertyCity,
            propertyType: "Apartment",
          }),
        });
        if (!newProp.ok) {
          const d = await newProp.json();
          throw new Error(d.error || "שגיאה ביצירת נכס");
        }
        const prop = await newProp.json();
        propertyId = prop.id;
      }

      // 1b. Archive any active lease on this property
      const existingLeases = (allProperties.find((p: any) => p.id === propertyId)?.leases || []) as any[];
      const activeLeases = existingLeases.filter((l: any) => l.status === "active");
      await Promise.all(activeLeases.map((l: any) =>
        fetch(`/api/leases/${l.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "ended" }),
        })
      ));

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
          hasOption: data.hasOption || undefined,
          optionMonths: data.hasOption && data.optionMonths ? Number(data.optionMonths) : undefined,
          optionRent: data.hasOption ? data.optionRent : undefined,
          optionStart: data.hasOption && data.optionStartDate ? data.optionStartDate : undefined,
          optionEnd: data.hasOption && data.optionEndDate ? data.optionEndDate : undefined,
          optionTerms: data.hasOption && data.optionTerms ? data.optionTerms : undefined,
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

          {file && !extracting && (
            <div className="flex gap-3 justify-center">
              <button onClick={handleExtract} disabled={extracting}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-60">
                ✨ חלץ נתונים מהחוזה
              </button>
              <button onClick={() => { setData(EMPTY); setStep("review"); }}
                className="px-6 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl font-semibold text-sm hover:bg-gray-50">
                הזנה ידנית
              </button>
            </div>
          )}

          {extracting && (
            <div className="w-full max-w-md mx-auto space-y-4 text-right" dir="rtl">
              {/* Step indicators */}
              <div className="flex flex-col gap-2">
                {[
                  { n: 1, label: "קריאת הקובץ" },
                  { n: 2, label: "חילוץ טקסט" },
                  { n: 3, label: "ניתוח בינה מלאכותית" },
                  { n: 4, label: "עיבוד תוצאות" },
                ].map(({ n, label }) => {
                  const active = progressStep === n;
                  const done = progressStep > n;
                  return (
                    <div key={n} className={`flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-all
                      ${active ? "bg-indigo-50 text-indigo-800 border border-indigo-200" :
                        done ? "text-emerald-600" : "text-gray-400"}`}>
                      <span className="text-base">
                        {done ? "✓" : active ? (
                          <span className="inline-block w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        ) : "○"}
                      </span>
                      <span>{label}</span>
                      {active && progressText && (
                        <span className="text-xs text-indigo-500 mr-auto">{progressText}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Waiting indicator when LLM hasn't started outputting yet */}
              {progressStep === 3 && !llmTokens && !thinkingTokens && (
                <div className="text-center text-xs text-gray-400 animate-pulse py-1">
                  ממתין לתגובת המודל...
                </div>
              )}

              {/* Thinking tokens box (Qwen3 reasoning, if thinking mode is on) */}
              {thinkingTokens && !llmTokens && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 text-right">💭 המודל חושב...</p>
                  <div className="bg-gray-800 text-gray-400 rounded-xl p-3 text-xs font-mono text-left overflow-y-auto max-h-24 whitespace-pre-wrap" dir="ltr">
                    {thinkingTokens}
                  </div>
                </div>
              )}

              {/* Field extraction progress bar (once JSON tokens arrive) */}
              {progressStep === 3 && llmTokens && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>פרטים שחולצו</span>
                    <span className="font-semibold text-indigo-700">
                      {extractedFieldCount} / ~{TOTAL_FIELDS}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((extractedFieldCount / TOTAL_FIELDS) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* JSON token stream box */}
              {llmTokens && (
                <div className="bg-gray-900 text-green-400 rounded-xl p-3 text-xs font-mono text-left overflow-y-auto max-h-36 whitespace-pre-wrap" dir="ltr">
                  {llmTokens}
                </div>
              )}
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
              <h3 className="font-bold text-gray-800 text-sm">נכס</h3>
            </div>
            <div className="p-5 space-y-4">
              <AddressAutocomplete
                address={data.propertyAddress}
                houseNumber={data.propertyHouseNumber}
                city={data.propertyCity}
                onAddressChange={set("propertyAddress")}
                onHouseNumberChange={set("propertyHouseNumber")}
                onCityChange={set("propertyCity")}
              />

              {/* Property resolution status */}
              {matchedProperty && (
                <div className="rounded-xl border p-3 space-y-2"
                  style={{ borderColor: propertyAction === "use-existing" ? "var(--accent)" : "var(--border)", background: "var(--bg-elevated)" }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <span>🏠</span>
                      <span className="font-semibold">{matchedProperty.title}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">נכס קיים</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setPropertyAction("use-existing")}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                        propertyAction === "use-existing" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                      }`}>
                      השתמש בנכס קיים
                    </button>
                    <button type="button" onClick={() => setPropertyAction("create-new")}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                        propertyAction === "create-new" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                      }`}>
                      צור נכס חדש
                    </button>
                  </div>
                  {propertyAction === "use-existing" && (matchedProperty.leases || []).some((l: any) => l.status === "active") && (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                      ⚠️ לנכס זה יש חוזה פעיל — הוא יועבר לארכיון ולא יימחק
                    </p>
                  )}
                </div>
              )}

              {!matchedProperty && data.propertyAddress && data.propertyCity && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800 flex items-center gap-2">
                  <span>➕</span>
                  <span>יווצר נכס חדש: <strong>{data.propertyAddress} {data.propertyHouseNumber}, {data.propertyCity}</strong></span>
                </div>
              )}

              {/* Manual property selection if needed */}
              {allProperties.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">או בחר נכס קיים ידנית</label>
                  <select
                    value={propertyAction === "use-existing" && matchedProperty ? matchedProperty.id : ""}
                    onChange={(e) => {
                      const selected = allProperties.find((p) => p.id === e.target.value);
                      if (selected) { setMatchedProperty(selected); setPropertyAction("use-existing"); }
                      else { setMatchedProperty(null); setPropertyAction("create-new"); }
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                    <option value="">-- צור נכס חדש --</option>
                    {allProperties.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.title} — {p.city}</option>
                    ))}
                  </select>
                </div>
              )}
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
              <select value={data.paymentMethod}
                onChange={(e) => {
                  const m = e.target.value;
                  setData((p) => ({ ...p, paymentMethod: m, checkDepositReminder: m === "checks" ? true : p.checkDepositReminder }));
                }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">-- בחר --</option>
                <option value="bank_transfer">העברה בנקאית</option>
                <option value="standing_order">הוראת קבע</option>
                <option value="checks">שיקים</option>
                <option value="cash">מזומן</option>
                <option value="bit">ביט</option>
                <option value="paybox">פייבוקס</option>
              </select>
            </div>
            {/* Bank details — only for standing order */}
            {data.paymentMethod === "standing_order" && (
              <>
                <Field label="שם הבנק" value={data.checkBank} onChange={set("checkBank")} />
                <Field label="מספר סניף" value={data.checkBranch} onChange={set("checkBranch")} />
                <Field label="מספר חשבון" value={data.checkAccount} onChange={set("checkAccount")} />
              </>
            )}
            {/* Reminder — only for checks */}
            {data.paymentMethod === "checks" && (
              <div className="md:col-span-2 flex items-center gap-3">
                <input type="checkbox" id="remChk" checked={data.checkDepositReminder}
                  onChange={(e) => setData((p) => ({ ...p, checkDepositReminder: e.target.checked }))}
                  className="w-4 h-4 accent-indigo-600" />
                <label htmlFor="remChk" className="text-sm text-gray-700 font-medium cursor-pointer">
                  צור תזכורת חודשית להפקדת השיקים
                </label>
              </div>
            )}
          </Section>

          {/* Option section */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔄</span>
                <h3 className="font-bold text-gray-800 text-sm">אופציה להארכת חוזה</h3>
              </div>
              <button type="button" onClick={() => setData((p) => ({ ...p, hasOption: !p.hasOption }))}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0"
                style={{ background: data.hasOption ? "var(--accent)" : "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                <span className="inline-block h-4 w-4 rounded-full shadow"
                  style={{
                    background: data.hasOption ? "#fff" : "var(--text-3)",
                    transform: data.hasOption ? "translateX(1.4rem)" : "translateX(0.2rem)",
                    transition: "transform 0.2s",
                  }} />
              </button>
            </div>
            {data.hasOption && (
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="מספר חודשי אופציה" value={data.optionMonths} onChange={set("optionMonths")} />
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">שכ״ד באופציה (₪)</label>
                  <NumberInput value={data.optionRent} onChange={(v) => setData((p) => ({ ...p, optionRent: v }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
                </div>
                <Field label="תחילת אופציה" value={data.optionStartDate} onChange={set("optionStartDate")} type="date" />
                <Field label="סיום אופציה" value={data.optionEndDate} onChange={set("optionEndDate")} type="date" />
                <div className="md:col-span-2">
                  <Field label="תנאי אופציה" value={data.optionTerms} onChange={set("optionTerms")} />
                </div>
              </div>
            )}
          </div>

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
