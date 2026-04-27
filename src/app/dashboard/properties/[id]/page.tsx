"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import type { Lease, Expense, Payment, LeaseDocument } from "@/types/database";

interface Property {
  id: string;
  title: string;
  description?: string;
  address: string;
  city: string;
  zipCode?: string;
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  squareMeters?: number;
  floor?: number;
  apartmentNumber?: string;
  numBalconies?: number;
  numParkingSpots?: number;
  purchasePrice?: number;
  createdAt: string;
  leases: (Lease & { tenant?: { firstName: string; lastName: string }; leaseDocuments?: LeaseDocument[] })[];
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

  // Option activation
  const [activatingLeaseId, setActivatingLeaseId] = useState<string | null>(null);
  const [activateLoading, setActivateLoading] = useState(false);

  // Early termination modal
  const [terminateLease, setTerminateLease] = useState<(Lease & { tenant?: { firstName: string; lastName: string } }) | null>(null);
  const [termBy, setTermBy] = useState<"tenant" | "landlord">("tenant");
  const [termDate, setTermDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [termReason, setTermReason] = useState("");
  const [termLoading, setTermLoading] = useState(false);
  const [termResult, setTermResult] = useState<{ effectiveDate: string; noticeMonths: number } | null>(null);

  const loadProperty = () => {
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
  };

  useEffect(() => { if (propertyId) loadProperty(); }, [propertyId]);

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
      body: JSON.stringify({ requestedBy: termBy, requestDate: termDate, reason: termReason }),
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
    if (l.status !== "active") return false;
    const days = daysUntil(l.endDate);
    return days <= 90;
  });

  const activeLeases = property.leases.filter((l) => l.status === "active");
  const monthlyRent = activeLeases.reduce((s, l) => s + (l.monthlyRent || 0), 0);
  const totalExpenses = property.expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const typeHe = PROPERTY_TYPE_HE[property.propertyType] ?? property.propertyType;

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
                  <li>תאריך התחלה: <strong>{new Date(l.optionStart ?? l.endDate).toLocaleDateString("he-IL")}</strong></li>
                  <li>תאריך סיום: <strong>{new Date(l.optionEnd).toLocaleDateString("he-IL")}</strong></li>
                  {l.optionRent && <li>שכ"ד חדש: <strong>₪{Number(l.optionRent).toLocaleString()}</strong></li>}
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
              {terminateLease.tenant?.firstName} {terminateLease.tenant?.lastName}
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
                  תקופת הודעה: {termBy === "tenant" ? (terminateLease.tenantNoticeMonths ?? 1) : (terminateLease.landlordNoticeMonths ?? 1)} חודשים
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
              <p className="text-gray-500 mt-1">{property.address}, {property.city}{property.zipCode ? ` ${property.zipCode}` : ""}</p>
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
              const days = daysUntil(l.endDate);
              const isExpired = days <= 0;
              const canActivate = l.hasOption && !l.optionActivated && l.optionEnd;
              return (
                <div key={l.id} className={`flex items-center justify-between px-5 py-3 rounded-xl border text-sm font-semibold ${
                  isExpired ? "bg-red-50 border-red-300 text-red-800" : days <= 30 ? "bg-orange-50 border-orange-300 text-orange-800" : "bg-yellow-50 border-yellow-300 text-yellow-800"
                }`}>
                  <span>
                    {isExpired ? "⛔" : days <= 30 ? "🔴" : "🟡"}&nbsp;
                    חוזה {l.tenant?.firstName} {l.tenant?.lastName} —&nbsp;
                    {isExpired ? "פג תוקף לפני " + Math.abs(days) + " ימים" : `מסתיים בעוד ${days} ימים`}
                  </span>
                  <div className="flex gap-2">
                    {canActivate && (
                      <button onClick={() => setActivatingLeaseId(l.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-bold">
                        הפעל אופציה
                      </button>
                    )}
                    {!l.earlyTermProtection && (
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
            <div className="text-xs font-semibold text-gray-400 uppercase mb-1">שכ"ד חודשי</div>
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
              {property.apartmentNumber && (
                <div>
                  <span className="text-gray-500">דירה מס': </span>
                  <span className="font-semibold text-gray-800">{property.apartmentNumber}</span>
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
              {property.squareMeters != null && (
                <div>
                  <span className="text-gray-500">שטח: </span>
                  <span className="font-semibold text-gray-800">{property.squareMeters} מ"ר</span>
                </div>
              )}
              {property.numBalconies != null && (
                <div>
                  <span className="text-gray-500">מרפסות: </span>
                  <span className="font-semibold text-gray-800">{property.numBalconies}</span>
                </div>
              )}
              {property.numParkingSpots != null && (
                <div>
                  <span className="text-gray-500">חניות: </span>
                  <span className="font-semibold text-gray-800">{property.numParkingSpots}</span>
                </div>
              )}
              {property.purchasePrice != null && (
                <div className="col-span-2">
                  <span className="text-gray-500">מחיר רכישה: </span>
                  <span className="font-semibold text-gray-800">₪{property.purchasePrice.toLocaleString()}</span>
                </div>
              )}
              {property.zipCode && (
                <div>
                  <span className="text-gray-500">מיקוד: </span>
                  <span className="font-semibold text-gray-800">{property.zipCode}</span>
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
                    <th className="px-6 py-3 text-right font-semibold text-gray-600">שכ"ד</th>
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
                        {lease.tenant?.firstName} {lease.tenant?.lastName}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(lease.startDate).toLocaleDateString("he-IL")}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(lease.endDate).toLocaleDateString("he-IL")}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        ₪{Number(lease.monthlyRent).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          lease.status === "active"
                            ? "bg-green-100 text-green-700"
                            : lease.status === "ended"
                            ? "bg-gray-100 text-gray-600"
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {LEASE_STATUS_HE[lease.status] ?? lease.status}
                          {lease.hasOption && " | אופציה"}
                        </span>
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        {lease.leaseDocuments?.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {lease.leaseDocuments.map((doc) => (
                              <a
                                key={doc.id}
                                href={`/api/documents/${doc.id}`}
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                                title={doc.fileName}
                              >
                                <span>📎</span>
                                <span className="truncate max-w-[120px]">{doc.fileName}</span>
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 flex-wrap items-center">
                          {lease.hasOption && !lease.optionActivated && lease.optionEnd && lease.status === "active" && (
                            <button onClick={(e) => { e.stopPropagation(); setActivatingLeaseId(lease.id); }}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold hover:bg-blue-200">
                              🔄 אופציה
                            </button>
                          )}
                          {!lease.earlyTermProtection && lease.status === "active" && (
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

        {/* Check payment reminders */}
        {(() => {
          const checkLeases = activeLeases.filter((l) => ["checks", "check"].includes((l.paymentMethod ?? "").toLowerCase()));
          if (!checkLeases.length) return null;

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const reminders: { lease: typeof checkLeases[0]; month: string; dueDate: Date; paid: boolean }[] = [];
          checkLeases.forEach((lease) => {
            const startDay = new Date(lease.startDate).getDate();
            // Generate current month + next 2 months
            for (let offset = 0; offset < 3; offset++) {
              const due = new Date(today.getFullYear(), today.getMonth() + offset, startDay);
              // Skip if before lease start or after lease end
              if (due < new Date(lease.startDate) || due > new Date(lease.endDate)) continue;
              const monthLabel = due.toLocaleDateString("he-IL", { month: "long", year: "numeric" });
              const dueDateStr = due.toISOString().slice(0, 7); // YYYY-MM for matching
              const paid = property.payments.some((p) =>
                p.leaseId === lease.id &&
                p.paymentType === "Rent" &&
                p.status === "paid" &&
                p.dueDate?.slice(0, 7) === dueDateStr
              );
              reminders.push({ lease, month: monthLabel, dueDate: due, paid });
            }
          });

          if (!reminders.length) return null;

          return (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h2 className="text-base font-bold text-amber-800 mb-3">🔔 תזכורות שקים חודשיים</h2>
              <div className="space-y-2">
                {reminders.map((r, i) => (
                  <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm ${
                    r.paid ? "bg-green-50 border-green-200 text-green-700" :
                    r.dueDate <= today ? "bg-red-50 border-red-200 text-red-700" :
                    "bg-white border-amber-200 text-amber-800"
                  }`}>
                    <div>
                      <span className="font-semibold">{r.lease.tenant?.firstName} {r.lease.tenant?.lastName}</span>
                      <span className="mx-2 text-gray-400">·</span>
                      <span>{r.month}</span>
                      <span className="mx-2 text-gray-400">·</span>
                      <span>₪{Number(r.lease.monthlyRent).toLocaleString()}</span>
                    </div>
                    <span className="font-bold text-xs px-2 py-1 rounded-full">
                      {r.paid ? "✅ התקבל" : r.dueDate <= today ? "⚠️ לא התקבל" : "📅 עתידי"}
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
                  {property.expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{expense.category}</td>
                      <td className="px-4 py-3 text-gray-600">{expense.description}</td>
                      <td className="px-4 py-3 font-semibold text-orange-600">₪{expense.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(expense.date).toLocaleDateString("he-IL")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

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
                      <td className="px-4 py-3 font-medium">{payment.paymentType}</td>
                      <td className="px-4 py-3 font-semibold text-green-700">₪{payment.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(payment.dueDate).toLocaleDateString("he-IL")}</td>
                      <td className="px-4 py-3 text-gray-500">{payment.paidDate ? new Date(payment.paidDate).toLocaleDateString("he-IL") : "—"}</td>
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
