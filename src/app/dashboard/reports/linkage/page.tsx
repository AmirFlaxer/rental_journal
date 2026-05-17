"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { calcEffectiveRent, type IndexRate, type LinkageFrequency } from "@/lib/linkage";

interface Lease {
  id: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  status: string;
  linkageType?: string;
  linkageFrequency?: LinkageFrequency;
  properties?: { title: string; city: string };
  tenant?: { firstName: string; lastName: string };
}

const FREQ_LABELS: Record<string, string> = {
  monthly: "חודשי",
  quarterly: "רבעוני",
  semiannual: "חצי-שנתי",
};

const TYPE_LABELS: Record<string, string> = {
  none: "ללא הצמדה",
  usd: 'דולר ארה"ב',
  cpi: "מדד כללי (CPI)",
};

export default function LinkageComparisonPage() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [rates, setRates] = useState<IndexRate[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [frequency, setFrequency] = useState<LinkageFrequency>("monthly");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/leases").then((r) => r.json()),
      fetch("/api/index-rates").then((r) => r.json()),
    ]).then(([leasesData, ratesData]) => {
      const active = Array.isArray(leasesData)
        ? leasesData.filter((l: Lease) => l.status === "active")
        : [];
      setLeases(active);
      if (active.length > 0) setSelectedId(active[0].id);
      if (Array.isArray(ratesData)) setRates(ratesData);
    }).finally(() => setLoading(false));
  }, []);

  const lease = leases.find((l) => l.id === selectedId);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-5 sm:px-6">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/dashboard" className="hover:text-gray-600">לוח בקרה</Link>
            <span>/</span>
            <Link href="/dashboard/reports" className="hover:text-gray-600">דוחות</Link>
            <span>/</span>
            <span className="text-gray-600">השוואת מסלולי הצמדה</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">השוואת מסלולי הצמדה</h1>
          <p className="text-sm text-gray-500 mt-0.5">מה היה שכ"ד היום לו החוזה היה צמוד מתחילתו — חישוב תיאורטי</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 space-y-5">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leases.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center text-gray-400">
            אין חוזים פעילים להשוואה
          </div>
        ) : (
          <>
            {/* Lease selector */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">בחר חוזה</label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {leases.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.properties?.title ?? "נכס"} —{" "}
                    {l.tenant ? `${l.tenant.firstName} ${l.tenant.lastName}` : "שוכר"} —{" "}
                    ₪{l.monthlyRent.toLocaleString()} לחודש
                  </option>
                ))}
              </select>

              {lease && (
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-gray-500">
                  <div>
                    <span className="font-semibold text-gray-700">תחילת חוזה: </span>
                    {new Date(lease.startDate).toLocaleDateString("he-IL")}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">סיום חוזה: </span>
                    {new Date(lease.endDate).toLocaleDateString("he-IL")}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">שכ"ד בסיס: </span>
                    ₪{lease.monthlyRent.toLocaleString()}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">הצמדה נוכחית: </span>
                    {TYPE_LABELS[lease.linkageType ?? "none"] ?? "ללא"}
                  </div>
                </div>
              )}
            </div>

            {/* Frequency selector */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-700 mb-3">תדירות עדכון</p>
              <div className="flex gap-2">
                {(["monthly", "quarterly", "semiannual"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrequency(f)}
                    className={`px-4 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                      frequency === f
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-indigo-600 border-indigo-300 hover:bg-indigo-50"
                    }`}
                  >
                    {FREQ_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>

            {/* Comparison */}
            {lease && (
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 p-6 space-y-3">
                <p className="text-xs text-indigo-500 mb-1">
                  מחושב מ-{new Date(lease.startDate).toLocaleDateString("he-IL")} · בסיס ₪{lease.monthlyRent.toLocaleString()}
                </p>

                {rates.length === 0 && (
                  <p className="text-xs text-indigo-400 italic">אין נתוני שערים — יש לרענן את המדדים תחילה</p>
                )}

                {(["none", "usd", "cpi"] as const).map((type) => {
                  const simLease = {
                    linkageType: type,
                    linkageFrequency: frequency,
                    baseAmount: lease.monthlyRent,
                    baseDate: lease.startDate,
                    monthlyRent: lease.monthlyRent,
                  };
                  const effective = calcEffectiveRent(simLease, rates);
                  const diff = effective - lease.monthlyRent;
                  const pct = lease.monthlyRent > 0 ? ((diff / lease.monthlyRent) * 100).toFixed(1) : "0.0";
                  const isCurrent =
                    (lease.linkageType ?? "none") === type &&
                    (type === "none" || (lease.linkageFrequency ?? "monthly") === frequency);

                  return (
                    <div
                      key={type}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                        isCurrent ? "bg-indigo-100 border-indigo-300" : "bg-white border-indigo-100"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isCurrent && (
                          <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">נוכחי</span>
                        )}
                        <span className="text-sm font-semibold text-gray-800">{TYPE_LABELS[type]}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-900 text-sm">
                          ₪{effective.toLocaleString("he-IL")}
                        </span>
                        {type !== "none" && (
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              diff > 0
                                ? "bg-green-100 text-green-700"
                                : diff < 0
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {diff >= 0 ? "+" : ""}
                            {diff !== 0
                              ? `₪${Math.abs(diff).toLocaleString("he-IL")}`
                              : "ללא שינוי"}{" "}
                            ({diff >= 0 ? "+" : ""}{pct}%)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                <p className="text-[11px] text-indigo-400 pt-1">* חישוב תיאורטי בלבד — לידיעה, ללא שינוי בחוזה</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
