"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Lease, Expense, Payment, LeaseDocument, PropertyUtility, PropertyUtilityType, PropertyUtilityFrequency, PropertyUtilityResponsibility } from "@/types/database";
import { isLeaseCurrentlyActive } from "@/lib/lease-status";
import { listRentMonths } from "@/lib/domain/rent-schedule";
import { isoMonthKey, isoDateParts, localMonthKey } from "@/lib/domain/dates";
import { utilityTypeLabel } from "@/lib/domain/utility-schedule";
import { apiGet, queryKeys } from "@/lib/api-client";

const EXPENSE_CAT_HE: Record<string, string> = {
  Maintenance: "תחזוקה",
  Insurance: "ביטוח",
  Tax: "מס",
  Utilities: "שירותים",
  "Professional Fees": 'שכ"ט',
  Other: "אחר",
};

const PAYMENT_TYPE_HE: Record<string, string> = {
  Rent: 'שכ"ד',
  Deposit: "פיקדון",
  Return: "החזר",
  Other: "אחר",
};

// חשבונות שירות - תוויות עבריות. תווית "אחר" נלקחת מ-utilityTypeLabel (customLabel).
const UTILITY_TYPE_OPTIONS: { value: PropertyUtilityType; label: string; icon: string }[] = [
  { value: "water", label: "מים", icon: "💧" },
  { value: "gas", label: "גז", icon: "🔥" },
  { value: "electricity", label: "חשמל", icon: "⚡" },
  { value: "municipal_tax", label: "ארנונה", icon: "🏛️" },
  { value: "house_committee", label: "ועד בית", icon: "🏢" },
  { value: "other", label: "אחר", icon: "📌" },
];
const UTILITY_TYPE_ICON: Record<PropertyUtilityType, string> = Object.fromEntries(
  UTILITY_TYPE_OPTIONS.map((o) => [o.value, o.icon])
) as Record<PropertyUtilityType, string>;

const UTILITY_FREQUENCY_HE: Record<PropertyUtilityFrequency, string> = {
  monthly: "חודשי",
  bimonthly: "דו-חודשי",
};

const UTILITY_RESPONSIBILITY_OPTIONS: { value: PropertyUtilityResponsibility; label: string; hint: string }[] = [
  { value: "owner_pays", label: "המשכיר משלם", hint: "יוצר תזכורת תשלום בכל מחזור" },
  { value: "owner_forwards", label: "מגיע למשכיר - להעביר לשוכר", hint: "יוצר תזכורת להעברת החשבון לשוכר" },
  { value: "tenant_pays", label: "השוכר משלם ישירות", hint: "ללא תזכורת - באחריות השוכר" },
];
const UTILITY_RESPONSIBILITY_HE: Record<PropertyUtilityResponsibility, string> = Object.fromEntries(
  UTILITY_RESPONSIBILITY_OPTIONS.map((o) => [o.value, o.label])
) as Record<PropertyUtilityResponsibility, string>;

const UTILITY_MONTH_HE = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

interface UtilityFormState {
  id: string | null;
  type: PropertyUtilityType;
  customLabel: string;
  frequency: PropertyUtilityFrequency;
  anchorMonth: number;
  responsibility: PropertyUtilityResponsibility;
}

interface Property {
  id: string;
  title: string;
  description?: string;
  address: string;
  city: string;
  zip_code?: string;
  property_type: string;
  bedrooms?: number;
  bathrooms?: number;
  square_meters?: number;
  floor?: number;
  apartment_number?: string;
  num_balconies?: number;
  num_parking_spots?: number;
  purchase_price?: number;
  created_at: string;
  leases: (Lease & { tenant?: { first_name: string; last_name: string }; lease_documents?: LeaseDocument[] })[];
  expenses: Expense[];
  payments: Payment[];
}

const PROPERTY_TYPE_HE: Record<string, string> = {
  Apartment: "דירה",
  House: "בית",
  Commercial: "מסחרי",
};

const LEASE_STATUS_HE: Record<string, string> = {
  active: "פעיל",
  ended: "הסתיים",
  terminated: "הסתיים",
  expired: "פג תוקף",
  paused: "מושהה",
};

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export default function PropertyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [selectedExpenseYear, setSelectedExpenseYear] = useState<number | null>(null);

  // Option activation
  const [activatingLeaseId, setActivatingLeaseId] = useState<string | null>(null);
  const [activateLoading, setActivateLoading] = useState(false);

  // Early termination modal
  const [terminateLease, setTerminateLease] = useState<(Lease & { tenant?: { first_name: string; last_name: string } }) | null>(null);
  const [termBy, setTermBy] = useState<"tenant" | "landlord">("tenant");
  const [termDate, setTermDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [termReason, setTermReason] = useState("");
  const [termLoading, setTermLoading] = useState(false);
  const [termResult, setTermResult] = useState<{ effectiveDate: string; noticeMonths: number } | null>(null);

  // חשבונות שירות - נטענים בנפרד דרך TanStack Query (משותף עם דף התזכורות)
  const queryClient = useQueryClient();
  const utilitiesQuery = useQuery({
    queryKey: queryKeys.propertyUtilities,
    queryFn: () => apiGet<PropertyUtility[]>("/api/property-utilities"),
    retry: false, // הטבלה אולי עוד לא קיימת בפרודקשן - לא לנסות שוב, להציג מיד הודעה עדינה
  });
  const [utilityForm, setUtilityForm] = useState<UtilityFormState | null>(null); // null = הטופס סגור
  const [utilitySaving, setUtilitySaving] = useState(false);
  const [utilityFormError, setUtilityFormError] = useState("");
  const [utilityListError, setUtilityListError] = useState("");
  const utilityListErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // אישור מחיקה דו-שלבי (כמו בדף התזכורות): לחיצה ראשונה הופכת לכפתור "בטוח?", מתאפס אחרי 3 שניות
  const [confirmDeleteUtilityId, setConfirmDeleteUtilityId] = useState<string | null>(null);
  const confirmDeleteUtilityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (utilityListErrorTimer.current) clearTimeout(utilityListErrorTimer.current);
    if (confirmDeleteUtilityTimer.current) clearTimeout(confirmDeleteUtilityTimer.current);
  }, []);

  const loadProperty = useCallback(() => {
    setIsLoading(true);
    fetch(`/api/properties/${propertyId}`)
      .then((r) => {
        if (r.status === 404) throw new Error("הנכס לא נמצא");
        if (!r.ok) throw new Error("שגיאה בטעינת הנכס");
        return r.json();
      })
      .then(setProperty)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [propertyId]);

  // טעינת הנכס בטעינה ראשונית ובכל שינוי propertyId. setIsLoading(true) בתוך
  // loadProperty נקרא באופן סינכרוני בכוונה כדי להציג מצב טעינה מיידי; loadProperty
  // גם נקרא ידנית (לא מ-effect) אחרי מחיקה/עדכון כדי לרענן את הנכס, ולכן לא ניתן
  // להעביר את הלוגיקה לגמרי החוצה מה-effect בלי לשכפל קוד. הסיכון בשינוי הדפוס
  // (לולאת רנדורים / איבוד מצב טעינה) גדול מהתועלת בהשתקת האזהרה.
  useEffect(() => { if (propertyId) loadProperty(); }, [propertyId, loadProperty]);

  const handleDelete = async () => {
    const res = await fetch(`/api/properties/${propertyId}`, { method: "DELETE" });
    if (res.ok) router.push("/dashboard");
    else setError("שגיאה במחיקת הנכס");
  };

  const handleActivateOption = async (leaseId: string) => {
    setActivateLoading(true);
    const res = await fetch(`/api/leases/${leaseId}/activate-option`, { method: "POST" });
    const d = await res.json();
    setActivatingLeaseId(null);
    setActivateLoading(false);
    if (res.ok) loadProperty();
    else setError(d.error || "שגיאה בהפעלת האופציה");
  };

  const handleTerminate = async () => {
    if (!terminateLease) return;
    setTermLoading(true);
    const res = await fetch(`/api/leases/${terminateLease.id}/terminate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requested_by: termBy, request_date: termDate, reason: termReason }),
    });
    const d = await res.json();
    setTermLoading(false);
    if (res.ok) {
      setTermResult({ effectiveDate: d.effectiveDate, noticeMonths: d.noticeMonths });
      loadProperty();
    } else {
      setError(d.error || "שגיאה בסיום החוזה");
      setTerminateLease(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-xl text-gray-500">טוען...</div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow p-10 text-center max-w-md">
          <p className="text-red-600 text-lg mb-4">{error || "הנכס לא נמצא"}</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline font-semibold">
            חזרה ללוח הבקרה
          </Link>
        </div>
      </div>
    );
  }

  // Leases with urgency indicators
  const alertLeases = property.leases.filter((l) => {
    if (!isLeaseCurrentlyActive(l)) return false;
    const days = daysUntil(l.end_date);
    return days <= 90;
  });

  const activeLeases = property.leases.filter((l) => isLeaseCurrentlyActive(l));
  const monthlyRent = activeLeases.reduce((s, l) => s + (l.monthly_rent || 0), 0);
  const totalExpenses = property.expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const typeHe = PROPERTY_TYPE_HE[property.property_type] ?? property.property_type;

  // חשבונות שירות של הנכס הנוכחי בלבד (ה-query מחזיר את כל החשבונות של המשתמש)
  const propertyUtilities = (utilitiesQuery.data ?? []).filter((u) => u.property_id === property.id);

  const showUtilityListError = (msg: string) => {
    if (utilityListErrorTimer.current) clearTimeout(utilityListErrorTimer.current);
    setUtilityListError(msg);
    utilityListErrorTimer.current = setTimeout(() => setUtilityListError(""), 4000);
  };

  const openNewUtilityForm = () => {
    setUtilityFormError("");
    setUtilityForm({
      id: null,
      type: "water",
      customLabel: "",
      frequency: "monthly",
      anchorMonth: new Date().getMonth() + 1,
      responsibility: "owner_pays",
    });
  };

  const openEditUtilityForm = (u: PropertyUtility) => {
    setUtilityFormError("");
    setUtilityForm({
      id: u.id,
      type: u.type,
      customLabel: u.custom_label ?? "",
      frequency: u.frequency,
      anchorMonth: u.anchor_month ?? new Date().getMonth() + 1,
      responsibility: u.responsibility,
    });
  };

  const handleUtilitySubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!utilityForm) return;
    setUtilityFormError("");
    setUtilitySaving(true);
    try {
      const payload = {
        property_id: property.id,
        type: utilityForm.type,
        custom_label: utilityForm.type === "other" ? (utilityForm.customLabel.trim() || null) : null,
        frequency: utilityForm.frequency,
        anchor_month: utilityForm.frequency === "bimonthly" ? utilityForm.anchorMonth : null,
        responsibility: utilityForm.responsibility,
      };
      const res = await fetch(
        utilityForm.id ? `/api/property-utilities/${utilityForm.id}` : "/api/property-utilities",
        {
          method: utilityForm.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה בשמירת חשבון השירות");
      queryClient.invalidateQueries({ queryKey: queryKeys.propertyUtilities });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
      setUtilityForm(null);
    } catch (err) {
      setUtilityFormError(err instanceof Error ? err.message : "שגיאה בשמירת חשבון השירות");
    } finally {
      setUtilitySaving(false);
    }
  };

  const requestDeleteUtility = (id: string) => {
    if (confirmDeleteUtilityTimer.current) clearTimeout(confirmDeleteUtilityTimer.current);
    setConfirmDeleteUtilityId(id);
    confirmDeleteUtilityTimer.current = setTimeout(() => setConfirmDeleteUtilityId(null), 3000);
  };

  const handleDeleteUtility = async (id: string) => {
    setConfirmDeleteUtilityId(null);
    const res = await fetch(`/api/property-utilities/${id}`, { method: "DELETE" });
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: queryKeys.propertyUtilities });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    } else {
      showUtilityListError("שגיאה במחיקת חשבון השירות");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Option activation confirm modal */}
      {activatingLeaseId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-3">הפעלת אופציה</h3>
            <p className="text-gray-600 mb-2">האופציה תעדכן את החוזה:</p>
            {(() => {
              const l = property.leases.find((x) => x.id === activatingLeaseId);
              if (!l) return null;
              return (
                <ul className="text-sm text-gray-700 mb-6 space-y-1 bg-gray-50 rounded-lg p-3">
                  <li>תאריך התחלה: <strong>{new Date(l.option_start ?? l.end_date).toLocaleDateString("he-IL")}</strong></li>
                  <li>תאריך סיום: <strong>{l.option_end ? new Date(l.option_end).toLocaleDateString("he-IL") : "-"}</strong></li>
                  {l.option_rent && <li>שכ&quot;ד חדש: <strong>₪{Number(l.option_rent).toLocaleString()}</strong></li>}
                </ul>
              );
            })()}
            <div className="flex gap-3">
              <button onClick={() => handleActivateOption(activatingLeaseId)} disabled={activateLoading}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50">
                {activateLoading ? "מפעיל..." : "הפעל אופציה"}
              </button>
              <button onClick={() => setActivatingLeaseId(null)}
                className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold">
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Termination result modal */}
      {termResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">בקשת הסיום נרשמה</h3>
            <p className="text-gray-600 mb-1">תקופת הודעה: <strong>{termResult.noticeMonths} חודשים</strong></p>
            <p className="text-gray-600 mb-6">תאריך סיום יעיל: <strong>{new Date(termResult.effectiveDate).toLocaleDateString("he-IL")}</strong></p>
            <button onClick={() => setTermResult(null)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
              סגור
            </button>
          </div>
        </div>
      )}

      {/* Early termination modal */}
      {terminateLease && !termResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-1">סיום מוקדם</h3>
            <p className="text-gray-500 text-sm mb-4">
              {terminateLease.tenant?.first_name} {terminateLease.tenant?.last_name}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">מי מבקש לסיים?</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setTermBy("tenant")}
                    className={`flex-1 py-2 rounded-lg font-semibold text-sm border ${termBy === "tenant" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300"}`}>
                    השוכר
                  </button>
                  <button type="button" onClick={() => setTermBy("landlord")}
                    className={`flex-1 py-2 rounded-lg font-semibold text-sm border ${termBy === "landlord" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300"}`}>
                    המשכיר
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  תקופת הודעה: {termBy === "tenant" ? (terminateLease.tenant_notice_months ?? 1) : (terminateLease.landlord_notice_months ?? 1)} חודשים
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">תאריך הבקשה</label>
                <input type="date" lang="he" value={termDate} onChange={(e) => setTermDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">סיבה (אופציונלי)</label>
                <input type="text" value={termReason} onChange={(e) => setTermReason(e.target.value)}
                  placeholder="סיבת הסיום..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleTerminate} disabled={termLoading}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50 text-sm">
                {termLoading ? "שומר..." : "אשר סיום"}
              </button>
              <button onClick={() => setTerminateLease(null)}
                className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold text-sm">
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-3">מחיקת נכס</h3>
            <p className="text-gray-600 mb-6">האם למחוק את הנכס? פעולה זו אינה הפיכה.</p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
              >
                מחק
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Utility form modal - חשבון שירות (הוספה/עריכה) */}
      {utilityForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-sm w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {utilityForm.id ? "עריכת חשבון שירות" : "הוספת חשבון שירות"}
            </h3>
            <form onSubmit={handleUtilitySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">סוג חשבון</label>
                <select
                  value={utilityForm.type}
                  onChange={(e) => setUtilityForm({ ...utilityForm, type: e.target.value as PropertyUtilityType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {UTILITY_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.icon} {o.label}</option>
                  ))}
                </select>
              </div>

              {utilityForm.type === "other" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">שם החשבון</label>
                  <input
                    type="text"
                    value={utilityForm.customLabel}
                    onChange={(e) => setUtilityForm({ ...utilityForm, customLabel: e.target.value })}
                    placeholder="למשל: אינטרנט"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">תדירות</label>
                <div className="flex gap-2">
                  {(["monthly", "bimonthly"] as const).map((f) => (
                    <button key={f} type="button"
                      onClick={() => setUtilityForm({ ...utilityForm, frequency: f })}
                      className={`flex-1 py-2 rounded-lg font-semibold text-sm border ${
                        utilityForm.frequency === f ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300"
                      }`}>
                      {UTILITY_FREQUENCY_HE[f]}
                    </button>
                  ))}
                </div>
              </div>

              {utilityForm.frequency === "bimonthly" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">חודש עוגן</label>
                  <select
                    value={utilityForm.anchorMonth}
                    onChange={(e) => setUtilityForm({ ...utilityForm, anchorMonth: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {UTILITY_MONTH_HE.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">החודש שבו נוחת החשבון - קובע את מחזור הדו-חודשי</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">אחריות לתשלום</label>
                <div className="space-y-2">
                  {UTILITY_RESPONSIBILITY_OPTIONS.map((o) => (
                    <button key={o.value} type="button"
                      onClick={() => setUtilityForm({ ...utilityForm, responsibility: o.value })}
                      className={`w-full text-right px-3 py-2 rounded-lg border text-sm transition-colors ${
                        utilityForm.responsibility === o.value ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300"
                      }`}>
                      <div className="font-semibold">{o.label}</div>
                      <div className={`text-xs mt-0.5 ${utilityForm.responsibility === o.value ? "text-blue-100" : "text-gray-400"}`}>
                        {o.hint}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {utilityFormError && <p className="text-red-600 text-sm">{utilityFormError}</p>}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={utilitySaving}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 text-sm">
                  {utilitySaving ? "שומר..." : "שמירה"}
                </button>
                <button type="button" onClick={() => setUtilityForm(null)}
                  className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold text-sm">
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">
                  לוח בקרה
                </Link>
                <span className="text-gray-300">/</span>
                <span className="text-gray-600 text-sm">נכסים</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{property.title}</h1>
              <p className="text-gray-500 mt-1">{property.address}, {property.city}{property.zip_code ? ` ${property.zip_code}` : ""}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Link
                href={`/dashboard/properties/${property.id}/edit`}
                className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-semibold text-sm"
              >
                ✏️ עריכה
              </Link>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 font-semibold text-sm"
              >
                🗑️ מחיקה
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 space-y-6">

        {/* Lease alerts */}
        {alertLeases.length > 0 && (
          <div className="space-y-2">
            {alertLeases.map((l) => {
              const days = daysUntil(l.end_date);
              const isExpired = days <= 0;
              const canActivate = l.has_option && !l.option_activated && l.option_end;
              return (
                <div key={l.id} className={`flex items-center justify-between px-5 py-3 rounded-xl border text-sm font-semibold ${
                  isExpired ? "bg-red-50 border-red-300 text-red-800" : days <= 30 ? "bg-orange-50 border-orange-300 text-orange-800" : "bg-yellow-50 border-yellow-300 text-yellow-800"
                }`}>
                  <span>
                    {isExpired ? "⛔" : days <= 30 ? "🔴" : "🟡"}&nbsp;
                    חוזה {l.tenant?.first_name} {l.tenant?.last_name} —&nbsp;
                    {isExpired ? "פג תוקף לפני " + Math.abs(days) + " ימים" : `מסתיים בעוד ${days} ימים`}
                  </span>
                  <div className="flex gap-2">
                    {canActivate && (
                      <button onClick={() => setActivatingLeaseId(l.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-bold">
                        הפעל אופציה
                      </button>
                    )}
                    {!l.early_term_protection && (
                      <button onClick={() => { setTerminateLease(l); setTermBy("tenant"); setTermDate(new Date().toISOString().slice(0,10)); setTermReason(""); }}
                        className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-bold">
                        סיום מוקדם
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="text-xs font-semibold text-gray-400 uppercase mb-1">סוג נכס</div>
            <div className="text-xl font-bold text-gray-800">{typeHe}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="text-xs font-semibold text-gray-400 uppercase mb-1">שכ&quot;ד חודשי</div>
            <div className="text-xl font-bold text-green-600">
              {monthlyRent > 0 ? `₪${monthlyRent.toLocaleString()}` : "—"}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="text-xs font-semibold text-gray-400 uppercase mb-1">הוצאות</div>
            <div className="text-xl font-bold text-red-500">
              {totalExpenses > 0 ? `₪${totalExpenses.toLocaleString()}` : "—"}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <div className="text-xs font-semibold text-gray-400 uppercase mb-1">חוזים פעילים</div>
            <div className="text-xl font-bold text-blue-600">{activeLeases.length}</div>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Property details */}
          <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">פרטי הנכס</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <span className="text-gray-500">סוג: </span>
                <span className="font-semibold text-gray-800">{typeHe}</span>
              </div>
              <div>
                <span className="text-gray-500">ישוב: </span>
                <span className="font-semibold text-gray-800">{property.city}</span>
              </div>
              {property.floor != null && (
                <div>
                  <span className="text-gray-500">קומה: </span>
                  <span className="font-semibold text-gray-800">{property.floor}</span>
                </div>
              )}
              {property.apartment_number && (
                <div>
                  <span className="text-gray-500">דירה מס&apos;: </span>
                  <span className="font-semibold text-gray-800">{property.apartment_number}</span>
                </div>
              )}
              {property.bedrooms != null && (
                <div>
                  <span className="text-gray-500">חדרי שינה: </span>
                  <span className="font-semibold text-gray-800">{property.bedrooms}</span>
                </div>
              )}
              {property.bathrooms != null && (
                <div>
                  <span className="text-gray-500">חדרי אמבטיה: </span>
                  <span className="font-semibold text-gray-800">{property.bathrooms}</span>
                </div>
              )}
              {property.square_meters != null && (
                <div>
                  <span className="text-gray-500">שטח: </span>
                  <span className="font-semibold text-gray-800">{property.square_meters} מ&quot;ר</span>
                </div>
              )}
              {property.num_balconies != null && (
                <div>
                  <span className="text-gray-500">מרפסות: </span>
                  <span className="font-semibold text-gray-800">{property.num_balconies}</span>
                </div>
              )}
              {property.num_parking_spots != null && (
                <div>
                  <span className="text-gray-500">חניות: </span>
                  <span className="font-semibold text-gray-800">{property.num_parking_spots}</span>
                </div>
              )}
              {property.purchase_price != null && (
                <div className="col-span-2">
                  <span className="text-gray-500">מחיר רכישה: </span>
                  <span className="font-semibold text-gray-800">₪{property.purchase_price.toLocaleString()}</span>
                </div>
              )}
              {property.zip_code && (
                <div>
                  <span className="text-gray-500">מיקוד: </span>
                  <span className="font-semibold text-gray-800">{property.zip_code}</span>
                </div>
              )}
            </div>
            {property.description && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-xs font-semibold text-gray-400 uppercase mb-1">תיאור</div>
                <p className="text-gray-700 text-sm">{property.description}</p>
              </div>
            )}
          </div>

          {/* Actions panel */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-bold text-gray-500 uppercase mb-3">הוספה</h2>
              <div className="space-y-2">
                <Link
                  href={`/dashboard/properties/${property.id}/add-lease`}
                  className="flex items-center gap-2 w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm"
                >
                  <span>📋</span> הוסף חוזה שכירות
                </Link>
                <Link
                  href={`/dashboard/properties/${property.id}/add-expense`}
                  className="flex items-center gap-2 w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-semibold text-sm"
                >
                  <span>🧾</span> הוסף הוצאה
                </Link>
                <Link
                  href={`/dashboard/properties/${property.id}/add-payment`}
                  className="flex items-center gap-2 w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm"
                >
                  <span>💰</span> הוסף תקבול
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-sm font-bold text-gray-500 uppercase mb-3">צפייה</h2>
              <div className="space-y-2">
                <a
                  href="#leases"
                  className="flex items-center justify-between w-full px-4 py-2.5 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 font-medium text-sm"
                >
                  <span>חוזים</span>
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{property.leases.length}</span>
                </a>
                <a
                  href="#expenses"
                  className="flex items-center justify-between w-full px-4 py-2.5 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 font-medium text-sm"
                >
                  <span>הוצאות</span>
                  <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">{property.expenses.length}</span>
                </a>
                <a
                  href="#payments"
                  className="flex items-center justify-between w-full px-4 py-2.5 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 font-medium text-sm"
                >
                  <span>תקבולים</span>
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{property.payments.length}</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Leases table */}
        <div id="leases" className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">חוזים</h2>
            <Link
              href={`/dashboard/properties/${property.id}/add-lease`}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm"
            >
              + חוזה חדש
            </Link>
          </div>
          {property.leases.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400">
              אין חוזים עדיין
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right font-semibold text-gray-600">דייר</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-600">התחלה</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-600">סיום</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-600">שכ&quot;ד</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-600">סטטוס</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-600">מסמכים</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-600">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {property.leases.map((lease) => (
                    <tr key={lease.id}
                      onClick={() => router.push(`/dashboard/leases/${lease.id}/edit`)}
                      className="hover:bg-blue-50 cursor-pointer transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {lease.tenant?.first_name} {lease.tenant?.last_name}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(lease.start_date).toLocaleDateString("he-IL")}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(lease.end_date).toLocaleDateString("he-IL")}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        ₪{Number(lease.monthly_rent).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          isLeaseCurrentlyActive(lease)
                            ? "bg-green-100 text-green-700"
                            : (lease.status === "terminated" || lease.status === "expired")
                            ? "bg-gray-100 text-gray-600"
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {LEASE_STATUS_HE[lease.status] ?? lease.status}
                          {lease.has_option && " | אופציה"}
                        </span>
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        {(lease.lease_documents?.length ?? 0) > 0 ? (
                          <div className="flex flex-col gap-1">
                            {lease.lease_documents?.map((doc) => (
                              <a
                                key={doc.id}
                                href={`/api/documents/${doc.id}`}
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                                title={doc.file_name}
                              >
                                <span>📎</span>
                                <span className="truncate max-w-[120px]">{doc.file_name}</span>
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 flex-wrap items-center">
                          {lease.has_option && !lease.option_activated && lease.option_end && isLeaseCurrentlyActive(lease) && (
                            <button onClick={(e) => { e.stopPropagation(); setActivatingLeaseId(lease.id); }}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold hover:bg-blue-200">
                              🔄 אופציה
                            </button>
                          )}
                          {!lease.early_term_protection && isLeaseCurrentlyActive(lease) && (
                            <button onClick={(e) => { e.stopPropagation(); setTerminateLease(lease); setTermBy("tenant"); setTermDate(new Date().toISOString().slice(0,10)); setTermReason(""); }}
                              className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold hover:bg-red-200">
                              🚪 סיום
                            </button>
                          )}
                          <span className="text-gray-400 text-lg mr-auto">›</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Utilities section - חשבונות שירות */}
        <div id="utilities" className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">חשבונות שירות</h2>
            <button
              onClick={openNewUtilityForm}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-sm"
            >
              + הוסף חשבון
            </button>
          </div>

          {utilityListError && (
            <div className="mx-6 mt-4 px-4 py-2 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm">
              {utilityListError}
            </div>
          )}

          {utilitiesQuery.isError ? (
            <p className="px-6 py-8 text-gray-400 text-center text-sm">
              חשבונות שירות עדיין לא זמינים - יש להריץ מיגרציה כדי להפעיל את התכונה.
            </p>
          ) : propertyUtilities.length === 0 ? (
            <p className="px-6 py-8 text-gray-400 text-center">אין חשבונות שירות מוגדרים</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {propertyUtilities.map((u) => {
                const label = utilityTypeLabel(u.type, u.custom_label);
                const isConfirmingDelete = confirmDeleteUtilityId === u.id;
                return (
                  <div key={u.id} className="flex items-center justify-between px-6 py-3 gap-3 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-gray-900">
                        {UTILITY_TYPE_ICON[u.type]} {label}
                      </span>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold">
                        {UTILITY_FREQUENCY_HE[u.frequency]}
                        {u.frequency === "bimonthly" && u.anchor_month ? ` · עוגן ${UTILITY_MONTH_HE[u.anchor_month - 1]}` : ""}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                        {UTILITY_RESPONSIBILITY_HE[u.responsibility] ?? u.responsibility}
                      </span>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => openEditUtilityForm(u)}
                        className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-200"
                      >
                        ✏️ עריכה
                      </button>
                      <button
                        onClick={() => (isConfirmingDelete ? handleDeleteUtility(u.id) : requestDeleteUtility(u.id))}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                          isConfirmingDelete ? "bg-red-600 text-white hover:bg-red-700" : "bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700"
                        }`}
                      >
                        {isConfirmingDelete ? "בטוח?" : "🗑️ מחיקה"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Check payment reminders */}
        {(() => {
          const checkLeases = activeLeases.filter((l) => ["checks", "check"].includes((l.payment_method ?? "").toLowerCase()));
          if (!checkLeases.length) return null;

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // חלון תזכורות: החודש הנוכחי + שני החודשים הבאים
          const windowKeys = new Set(
            [0, 1, 2].map((offset) => localMonthKey(new Date(today.getFullYear(), today.getMonth() + offset, 1)))
          );

          const reminders: { lease: typeof checkLeases[0]; month: string; dueDate: Date; status: "paid" | "partial" | "unpaid" }[] = [];
          checkLeases.forEach((lease) => {
            // listRentMonths מחשב את לוח החיובים הנכון (מוצמד לתאריך תחילת החוזה,
            // בלי הסטת יום/חודש מ-toISOString) - במקום לבנות ידנית מ-Date מקומי
            listRentMonths(lease).forEach((slot) => {
              if (!windowKeys.has(slot.monthKey)) return;
              const { year, month, day } = isoDateParts(slot.due_date);
              const due = new Date(year, month - 1, day);
              const monthLabel = due.toLocaleDateString("he-IL", { month: "long", year: "numeric" });
              const match = property.payments.find((p) =>
                p.lease_id === lease.id &&
                p.payment_type === "Rent" &&
                p.due_date &&
                isoMonthKey(p.due_date) === slot.monthKey
              );
              // תשלום חלקי הוא מצב שלישי - לא "התקבל"
              const status: "paid" | "partial" | "unpaid" =
                match?.status === "paid" ? "paid" : match?.status === "partial" ? "partial" : "unpaid";
              reminders.push({ lease, month: monthLabel, dueDate: due, status });
            });
          });

          if (!reminders.length) return null;

          return (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h2 className="text-base font-bold text-amber-800 mb-3">🔔 תזכורות שקים חודשיים</h2>
              <div className="space-y-2">
                {reminders.map((r, i) => (
                  <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm ${
                    r.status === "paid" ? "bg-green-50 border-green-200 text-green-700" :
                    r.status === "partial" ? "bg-blue-50 border-blue-200 text-blue-700" :
                    r.dueDate <= today ? "bg-red-50 border-red-200 text-red-700" :
                    "bg-white border-amber-200 text-amber-800"
                  }`}>
                    <div>
                      <span className="font-semibold">{r.lease.tenant?.first_name} {r.lease.tenant?.last_name}</span>
                      <span className="mx-2 text-gray-400">·</span>
                      <span>{r.month}</span>
                      <span className="mx-2 text-gray-400">·</span>
                      <span>₪{Number(r.lease.monthly_rent).toLocaleString()}</span>
                    </div>
                    <span className="font-bold text-xs px-2 py-1 rounded-full">
                      {r.status === "paid" ? "✅ התקבל" : r.status === "partial" ? "🔶 חלקי" : r.dueDate <= today ? "⚠️ לא התקבל" : "📅 עתידי"}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-amber-600 mt-3">
                לרישום קבלת שק — <Link href={`/dashboard/properties/${property.id}/add-payment`} className="underline font-semibold">הוסף תקבול</Link>
              </p>
            </div>
          );
        })()}

        {/* Expenses section */}
        {(() => {
          const expenseYears = Array.from(
            new Set(property.expenses.map((e) => new Date(e.date).getFullYear()))
          ).sort((a, b) => b - a);

          const filteredExpenses = selectedExpenseYear
            ? property.expenses.filter((e) => new Date(e.date).getFullYear() === selectedExpenseYear)
            : property.expenses;

          const yearTotal = filteredExpenses.reduce((s, e) => s + e.amount, 0);

          return (
            <div id="expenses" className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">הוצאות</h2>
                <Link href={`/dashboard/properties/${property.id}/add-expense`}
                  className="px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-semibold text-sm">
                  + הוסף הוצאה
                </Link>
              </div>
              {property.expenses.length === 0 ? (
                <p className="px-6 py-8 text-gray-400 text-center">אין הוצאות רשומות</p>
              ) : (
                <>
                  {expenseYears.length > 1 && (
                    <div className="px-6 py-3 border-b border-gray-100 flex gap-2 flex-wrap">
                      <button
                        onClick={() => setSelectedExpenseYear(null)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                          selectedExpenseYear === null
                            ? "bg-orange-500 text-white border-orange-500"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        הכל
                      </button>
                      {expenseYears.map((y) => (
                        <button
                          key={y}
                          onClick={() => setSelectedExpenseYear(y)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                            selectedExpenseYear === y
                              ? "bg-orange-500 text-white border-orange-500"
                              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                        <tr>
                          <th className="px-4 py-3 text-right">קטגוריה</th>
                          <th className="px-4 py-3 text-right">תיאור</th>
                          <th className="px-4 py-3 text-right">סכום</th>
                          <th className="px-4 py-3 text-right">תאריך</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredExpenses.map((expense) => (
                          <tr key={expense.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{EXPENSE_CAT_HE[expense.category] ?? expense.category}</td>
                            <td className="px-4 py-3 text-gray-600">{expense.description}</td>
                            <td className="px-4 py-3 font-semibold text-orange-600">₪{expense.amount.toLocaleString()}</td>
                            <td className="px-4 py-3 text-gray-500">{new Date(expense.date).toLocaleDateString("he-IL")}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                        <tr>
                          <td colSpan={2} className="px-4 py-3 font-bold text-gray-700">
                            סה&quot;כ{selectedExpenseYear ? ` ${selectedExpenseYear}` : ""}
                          </td>
                          <td className="px-4 py-3 font-bold text-orange-600">₪{yearTotal.toLocaleString()}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* Payments section */}
        <div id="payments" className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">תקבולים</h2>
            <Link href={`/dashboard/properties/${property.id}/add-payment`}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm">
              + הוסף תקבול
            </Link>
          </div>
          {property.payments.length === 0 ? (
            <p className="px-6 py-8 text-gray-400 text-center">אין תקבולים רשומים</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-right">סוג</th>
                    <th className="px-4 py-3 text-right">סכום</th>
                    <th className="px-4 py-3 text-right">לתקבול</th>
                    <th className="px-4 py-3 text-right">שולם</th>
                    <th className="px-4 py-3 text-right">סטטוס</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {property.payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{PAYMENT_TYPE_HE[payment.payment_type] ?? payment.payment_type}</td>
                      <td className="px-4 py-3 font-semibold text-green-700">₪{payment.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(payment.due_date).toLocaleDateString("he-IL")}</td>
                      <td className="px-4 py-3 text-gray-500">{payment.paid_date ? new Date(payment.paid_date).toLocaleDateString("he-IL") : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          payment.status === "paid" ? "bg-green-100 text-green-700" :
                          payment.status === "overdue" ? "bg-red-100 text-red-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {payment.status === "paid" ? "שולם" : payment.status === "overdue" ? "באיחור" : "ממתין"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
