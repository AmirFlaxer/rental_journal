"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { calcEffectiveRent, pickRate, getEffectivePeriodStart, type IndexRate, type LinkageType, type LinkageFrequency } from "@/lib/linkage";

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

interface HistoryRow {
  period: string;       // "2025-01"
  rateValue: number | null;
  rent: number;
  diff: number;
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

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  d.setDate(1);
  return d;
}

function freqStep(freq: LinkageFrequency): number {
  return freq === "monthly" ? 1 : freq === "quarterly" ? 3 : 6;
}

function buildHistory(
  lease: Lease,
  type: LinkageType,
  frequency: LinkageFrequency,
  rates: IndexRate[]
): HistoryRow[] {
  const base = lease.monthlyRent;
  const leaseStart = new Date(lease.startDate);
  leaseStart.setDate(1);
  const today = new Date();
  today.setDate(1);
  const end = new Date(lease.endDate);
  end.setDate(1);
  const until = today < end ? today : end;

  if (type === "none") {
    return [{ period: leaseStart.toISOString().slice(0, 7), rateValue: null, rent: base, diff: 0 }];
  }

  // Find base rate — use lease start date, or fall back to earliest available rate
  let baseRate = pickRate(rates, type, leaseStart);
  let effectiveStart = leaseStart;
  if (!baseRate) {
    const earliest = rates
      .filter((r) => r.type === type)
      .sort((a, b) => a.periodDate.localeCompare(b.periodDate))[0];
    if (!earliest) return [];
    baseRate = earliest;
    effectiveStart = new Date(earliest.periodDate);
  }

  const rows: HistoryRow[] = [];
  const step = freqStep(frequency);
  let cur = getEffectivePeriodStart(effectiveStart, frequency);

  while (cur <= until) {
    const rate = pickRate(rates, type, cur);
    if (rate) {
      const rent = Math.round((base * rate.value) / baseRate.value);
      rows.push({
        period: cur.toISOString().slice(0, 7),
        rateValue: rate.value,
        rent,
        diff: rent - base,
      });
    }
    cur = addMonths(cur, step);
  }

  return rows;
}

function fmtPeriod(p: string, freq: LinkageFrequency): string {
  const [y, m] = p.split("-");
  const months = ["ינו'", "פבר'", "מרץ", "אפר'", "מאי", "יוני", "יולי", "אוג'", "ספט'", "אוק'", "נוב'", "דצמ'"];
  const mi = parseInt(m) - 1;
  if (freq === "quarterly") return `רבעון ${Math.floor(mi / 3) + 1}/${y}`;
  if (freq === "semiannual") return `${mi < 6 ? "ח' א'" : "ח' ב'"} ${y}`;
  return `${months[mi]} ${y}`;
}

export default function LinkageComparisonPage() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [rates, setRates] = useState<IndexRate[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [frequency, setFrequency] = useState<LinkageFrequency>("monthly");
  const [selectedType, setSelectedType] = useState<LinkageType | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleRefreshRates = async () => {
    setRefreshing(true);
    setRefreshMsg("");
    try {
      const res = await fetch("/api/index-rates/refresh");
      if (!res.ok) throw new Error();
      const json = await res.json() as { results?: { type: string; inserted: number }[] };
      const total = (json.results ?? []).reduce((s, r) => s + r.inserted, 0);
      const data = await fetch("/api/index-rates").then((r) => r.json());
      if (Array.isArray(data)) setRates(data);
      setRefreshMsg(total > 0 ? `נוספו ${total} נקודות נתונים` : data.length > 0 ? "קיימים נתונים בDB" : "השרתים החיצוניים לא החזירו נתונים");
    } catch {
      setRefreshMsg("שגיאה בעדכון המדדים");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/leases").then((r) => r.json()),
      fetch("/api/index-rates").then((r) => r.json()),
    ]).then(([leasesData, ratesData]) => {
      const all: Lease[] = Array.isArray(leasesData) ? leasesData : [];
      // מציג את כל החוזים — פעילים קודם, אחר כך שאר הסטטוסים
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const sorted = [...all].sort((a, b) => {
        const aActive = new Date(a.startDate) <= today && new Date(a.endDate) >= today ? 0 : 1;
        const bActive = new Date(b.startDate) <= today && new Date(b.endDate) >= today ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      });
      setLeases(sorted);
      if (sorted.length > 0) setSelectedId(sorted[0].id);
      if (Array.isArray(ratesData)) setRates(ratesData);
    }).finally(() => setLoading(false));
  }, []);

  const lease = leases.find((l) => l.id === selectedId);

  const history: HistoryRow[] = lease && selectedType
    ? buildHistory(lease, selectedType, frequency, rates)
    : [];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-5 sm:px-6">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/dashboard" className="hover:text-gray-600">לוח בקרה</Link>
            <span>/</span>
            <Link href="/dashboard/reports" className="hover:text-gray-600">דוחות</Link>
            <span>/</span>
            <span className="text-gray-600">השוואת מסלולי הצמדה</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">השוואת מסלולי הצמדה</h1>
          <p className="text-sm text-gray-500 mt-0.5">בחר חוזה ומסלול — תראה כיצד היה משתנה שכ"ד לאורך הזמן</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 space-y-5">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leases.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center text-gray-400">
            אין חוזים להשוואה
          </div>
        ) : (
          <>
            {/* Lease + frequency selectors */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">בחר חוזה</label>
                <div className="relative">
                  {/* trigger */}
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((o) => !o)}
                    className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right"
                  >
                    {(() => {
                      const l = leases.find((x) => x.id === selectedId);
                      if (!l) return <span className="text-gray-400">בחר חוזה...</span>;
                      const today = new Date(); today.setHours(0,0,0,0);
                      const isActive = new Date(l.startDate) <= today && new Date(l.endDate) >= today;
                      const tenantName = (l.tenant?.firstName || l.tenant?.lastName)
                        ? `${l.tenant.firstName ?? ""} ${l.tenant.lastName ?? ""}`.trim()
                        : "ללא שוכר";
                      return (
                        <span className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {isActive ? "פעיל" : "סגור"}
                          </span>
                          <span className="font-medium text-gray-900">{l.properties?.title ?? "נכס"}</span>
                          <span className="text-gray-400">·</span>
                          <span className="text-gray-700">{tenantName}</span>
                          <span className="text-gray-400">·</span>
                          <span className="text-indigo-700 font-semibold">₪{(l.monthlyRent ?? 0).toLocaleString()}</span>
                        </span>
                      );
                    })()}
                    <span className="text-gray-400 mr-2">{dropdownOpen ? "▲" : "▼"}</span>
                  </button>

                  {/* options list */}
                  {dropdownOpen && (
                    <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {leases.map((l) => {
                        const today = new Date(); today.setHours(0,0,0,0);
                        const isActive = new Date(l.startDate) <= today && new Date(l.endDate) >= today;
                        const tenantName = (l.tenant?.firstName || l.tenant?.lastName)
                          ? `${l.tenant.firstName ?? ""} ${l.tenant.lastName ?? ""}`.trim()
                          : "ללא שוכר";
                        const startY = new Date(l.startDate).getFullYear();
                        const endY = new Date(l.endDate).getFullYear();
                        const isSelected = l.id === selectedId;
                        return (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => { setSelectedId(l.id); setSelectedType(null); setDropdownOpen(false); }}
                            className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-right hover:bg-indigo-50 transition-colors ${isSelected ? "bg-indigo-50" : ""}`}
                          >
                            <span className={`flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded ${isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                              {isActive ? "פעיל" : "סגור"}
                            </span>
                            <span className="font-medium text-gray-900 flex-shrink-0">{l.properties?.title ?? "נכס"}</span>
                            <span className="text-gray-400 flex-shrink-0">·</span>
                            <span className="text-gray-700 truncate">{tenantName}</span>
                            <span className="text-gray-400 flex-shrink-0 mr-auto">·</span>
                            <span className="text-indigo-700 font-semibold flex-shrink-0">₪{(l.monthlyRent ?? 0).toLocaleString()}</span>
                            <span className="text-gray-400 text-xs flex-shrink-0">{startY}-{endY}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {lease && (
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(lease.startDate).toLocaleDateString("he-IL")} –{" "}
                    {new Date(lease.endDate).toLocaleDateString("he-IL")} ·{" "}
                    הצמדה נוכחית: {TYPE_LABELS[lease.linkageType ?? "none"]}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">תדירות עדכון</label>
                <div className="flex gap-2 flex-wrap items-center justify-between">
                  <div className="flex gap-2">
                    {(["monthly", "quarterly", "semiannual"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => { setFrequency(f); setSelectedType(null); }}
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
                  <div className="flex items-center gap-2">
                    {rates.length === 0 && (
                      <span className="text-xs text-amber-600 italic">אין נתוני שערים</span>
                    )}
                    <button
                      type="button"
                      onClick={handleRefreshRates}
                      disabled={refreshing}
                      className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                    >
                      {refreshing ? "מעדכן..." : "↻ עדכן מדדים"}
                    </button>
                    {refreshMsg && <span className={`text-xs font-semibold ${refreshMsg.includes("שגיאה") ? "text-red-500" : "text-green-600"}`}>{refreshMsg}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison type selector */}
            {lease && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-2">
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  בחר מסלול לפירוט חישוב ←
                </p>
                {(["none", "usd", "cpi"] as const).map((type) => {
                  const effective = calcEffectiveRent(
                    { linkageType: type, linkageFrequency: frequency, baseAmount: lease.monthlyRent, baseDate: lease.startDate, monthlyRent: lease.monthlyRent },
                    rates
                  );
                  const diff = effective - lease.monthlyRent;
                  const pct = lease.monthlyRent > 0 ? ((diff / lease.monthlyRent) * 100).toFixed(1) : "0.0";
                  const isCurrent = (lease.linkageType ?? "none") === type;
                  const isSelected = selectedType === type;

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedType(isSelected ? null : type)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-right transition-all ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                          : isCurrent
                          ? "bg-indigo-50 border-indigo-300 hover:bg-indigo-100"
                          : "bg-gray-50 border-gray-200 hover:bg-indigo-50 hover:border-indigo-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isCurrent && !isSelected && (
                          <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">נוכחי</span>
                        )}
                        <span className={`text-sm font-semibold ${isSelected ? "text-white" : "text-gray-800"}`}>
                          {TYPE_LABELS[type]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-bold text-sm ${isSelected ? "text-white" : "text-gray-900"}`}>
                          ₪{effective.toLocaleString("he-IL")} / חודש
                        </span>
                        {type !== "none" && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : diff > 0 ? "bg-green-100 text-green-700"
                              : diff < 0 ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-500"
                          }`}>
                            {diff >= 0 ? "+" : ""}{diff !== 0 ? `₪${Math.abs(diff).toLocaleString()}` : "ללא שינוי"} ({diff >= 0 ? "+" : ""}{pct}%)
                          </span>
                        )}
                        <span className={`text-sm ${isSelected ? "text-white/70" : "text-gray-400"}`}>
                          {isSelected ? "▲" : "▼"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Detail table */}
            {selectedType && lease && (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      פירוט — {TYPE_LABELS[selectedType]} · {FREQ_LABELS[frequency]}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      בסיס: ₪{lease.monthlyRent.toLocaleString()} ·{" "}
                      {new Date(lease.startDate).toLocaleDateString("he-IL")} עד היום
                    </p>
                  </div>
                </div>

                {history.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">
                    אין נתוני שערים לתקופה זו — לחץ &quot;רענן מדדים&quot; למעלה
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs font-semibold text-gray-500">
                        <tr>
                          <th className="px-4 py-3 text-right">תקופה</th>
                          {selectedType !== "none" && (
                            <th className="px-4 py-3 text-right">
                              {selectedType === "usd" ? "שער דולר" : "מדד"}
                            </th>
                          )}
                          <th className="px-4 py-3 text-right">שכ"ד מחושב</th>
                          <th className="px-4 py-3 text-right">שינוי מהבסיס</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {[...history].reverse().map((row) => (
                          <tr key={row.period} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 font-medium text-gray-700">
                              {fmtPeriod(row.period, frequency)}
                            </td>
                            {selectedType !== "none" && (
                              <td className="px-4 py-2.5 text-gray-600">
                                {row.rateValue !== null
                                  ? selectedType === "usd"
                                    ? `$${row.rateValue.toFixed(3)}`
                                    : row.rateValue.toFixed(2)
                                  : "—"}
                              </td>
                            )}
                            <td className="px-4 py-2.5 font-bold text-gray-900">
                              ₪{row.rent.toLocaleString("he-IL")}
                            </td>
                            <td className="px-4 py-2.5">
                              {row.diff === 0 ? (
                                <span className="text-gray-400">—</span>
                              ) : (
                                <span className={`font-semibold ${row.diff > 0 ? "text-green-600" : "text-red-500"}`}>
                                  {row.diff > 0 ? "+" : ""}₪{row.diff.toLocaleString("he-IL")}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                        <tr>
                          <td colSpan={selectedType !== "none" ? 2 : 1} className="px-4 py-3 text-xs text-gray-400">
                            * חישוב תיאורטי בלבד
                          </td>
                          <td className="px-4 py-3 font-bold text-indigo-700">
                            ₪{calcEffectiveRent(
                              { linkageType: selectedType, linkageFrequency: frequency, baseAmount: lease.monthlyRent, baseDate: lease.startDate, monthlyRent: lease.monthlyRent },
                              rates
                            ).toLocaleString("he-IL")}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">שכ"ד נוכחי</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
