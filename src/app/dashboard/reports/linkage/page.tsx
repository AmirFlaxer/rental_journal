"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, queryKeys } from "@/lib/api-client";
import { calcEffectiveRent, pickRate, type IndexRate, type LinkageType, type LinkageFrequency } from "@/lib/linkage";
import { localMonthKey } from "@/lib/domain/dates";
import { Icon } from "@/components/Icon";
import { formatCurrency } from "@/lib/domain/money";

interface Lease {
  id: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  status: string;
  linkage_type?: string;
  linkage_frequency?: LinkageFrequency;
  base_amount?: number | null;
  base_date?: string | null;
  properties?: { title: string; city: string };
  tenant?: { first_name: string; last_name: string };
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

const EMPTY_LEASES: Lease[] = [];
const EMPTY_RATES: IndexRate[] = [];

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
  // בסיס החישוב הוא base_amount/base_date של החוזה (כמו ב-leases/page.tsx) -
  // לא monthly_rent/start_date תמיד, אחרת ההצמדה מחושבת מבסיס שגוי אחרי עדכון.
  const base = lease.base_amount ?? lease.monthly_rent;
  const leaseBaseDate = new Date(lease.base_date ?? lease.start_date);
  leaseBaseDate.setDate(1);
  const today = new Date();
  today.setDate(1);
  const end = new Date(lease.end_date);
  end.setDate(1);
  const until = today < end ? today : end;

  if (type === "none") {
    return [{ period: localMonthKey(leaseBaseDate), rateValue: null, rent: base, diff: 0 }];
  }

  // Find base rate - use lease base date, or fall back to earliest available rate
  let baseRate = pickRate(rates, type, leaseBaseDate);
  let effectiveStart = leaseBaseDate;
  if (!baseRate) {
    const earliest = rates
      .filter((r) => r.type === type)
      .sort((a, b) => a.period_date.localeCompare(b.period_date))[0];
    if (!earliest) return [];
    baseRate = earliest;
    effectiveStart = new Date(earliest.period_date);
  }

  const rows: HistoryRow[] = [];
  const step = freqStep(frequency);
  // הלולאה מתחילה מתאריך הבסיס האפקטיבי של החוזה עצמו - לא מעוגלת אחורה
  // לתחילת רבעון/מחצית קלנדריים (זה יצר שורה ראשונה עם "שינוי" פיקטיבי
  // שקדם בפועל לחוזה).
  let cur = new Date(effectiveStart);
  cur.setDate(1);

  while (cur <= until) {
    const rate = pickRate(rates, type, cur);
    if (rate) {
      const rent = Math.round((base * rate.value) / baseRate.value);
      rows.push({
        period: localMonthKey(cur),
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
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>("");
  const [frequency, setFrequency] = useState<LinkageFrequency>("monthly");
  const [selectedType, setSelectedType] = useState<LinkageType | null>(null);
  const [refreshMsg, setRefreshMsg] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const {
    data: leasesData,
    isLoading: leasesLoading,
    isError: leasesError,
    refetch: refetchLeases,
  } = useQuery({
    queryKey: queryKeys.leases,
    queryFn: () => apiGet<Lease[]>("/api/leases"),
  });

  const {
    data: ratesData,
    isLoading: ratesLoading,
    isError: ratesError,
    refetch: refetchRates,
  } = useQuery({
    queryKey: queryKeys.indexRates,
    queryFn: () => apiGet<IndexRate[]>("/api/index-rates"),
  });

  const loading = leasesLoading || ratesLoading;
  const hasError = leasesError || ratesError;
  const rates = ratesData ?? EMPTY_RATES;

  // מציג את כל החוזים - פעילים קודם, אחר כך שאר הסטטוסים
  const leases = useMemo(() => {
    const all = leasesData ?? EMPTY_LEASES;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return [...all].sort((a, b) => {
      const aActive = new Date(a.start_date) <= today && new Date(a.end_date) >= today ? 0 : 1;
      const bActive = new Date(b.start_date) <= today && new Date(b.end_date) >= today ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
    });
  }, [leasesData]);

  // חוזה נבחר בפועל: selectedId אם נבחר במפורש, אחרת החוזה הראשון (ברירת מחדל) -
  // מחושב בזמן רנדר במקום setState בתוך useEffect, כדי למנוע רנדר מדורג מיותר.
  const effectiveSelectedId = selectedId || leases[0]?.id || "";

  const refreshRatesMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/index-rates/refresh");
      if (!res.ok) throw new Error();
      return res.json() as Promise<{ results?: { type: string; inserted: number }[] }>;
    },
    onSuccess: async (json) => {
      const total = (json.results ?? []).reduce((s, r) => s + r.inserted, 0);
      // שתי שכבות קאש חסמו את הרענון: fetchQuery מכבד את staleTime (דקה) ומחזיר
      // את הערך השמור בלי לפנות לשרת, ומעליו קאש ה-HTTP של הראוט (שעה). בלי
      // לעקוף את שתיהן הכפתור דיווח "נוספו N נקודות" בזמן שהמסך המשיך להציג
      // את המדדים הישנים.
      const updated = await queryClient.fetchQuery({
        queryKey: queryKeys.indexRates,
        queryFn: () => apiGet<IndexRate[]>("/api/index-rates", { fresh: true }),
        staleTime: 0,
      });
      setRefreshMsg(total > 0 ? `נוספו ${total} נקודות נתונים` : updated.length > 0 ? "קיימים נתונים בDB" : "השרתים החיצוניים לא החזירו נתונים");
    },
    onError: () => setRefreshMsg("שגיאה בעדכון המדדים"),
  });

  const lease = leases.find((l) => l.id === effectiveSelectedId);

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
          <p className="text-sm text-gray-500 mt-0.5">בחר חוזה ומסלול - תראה כיצד היה משתנה שכ&quot;ד לאורך הזמן</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 space-y-5">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : hasError ? (
          <div className="bg-white rounded-2xl border border-gray-200 py-16 text-center space-y-3">
            <p className="text-gray-500 font-medium">שגיאה בטעינת הנתונים</p>
            <button
              onClick={() => { refetchLeases(); refetchRates(); }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700"
            >
              נסה שוב
            </button>
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
                      const l = leases.find((x) => x.id === effectiveSelectedId);
                      if (!l) return <span className="text-gray-400">בחר חוזה...</span>;
                      const today = new Date(); today.setHours(0,0,0,0);
                      const isActive = new Date(l.start_date) <= today && new Date(l.end_date) >= today;
                      const tenantName = (l.tenant?.first_name || l.tenant?.last_name)
                        ? `${l.tenant.first_name ?? ""} ${l.tenant.last_name ?? ""}`.trim()
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
                          <span className="text-indigo-700 font-semibold">{formatCurrency((l.monthly_rent ?? 0))}</span>
                        </span>
                      );
                    })()}
                    <Icon name={dropdownOpen ? "caretUp" : "caretDown"} size={14} className="text-gray-400 mr-2" />
                  </button>

                  {/* options list */}
                  {dropdownOpen && (
                    <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {leases.map((l) => {
                        const today = new Date(); today.setHours(0,0,0,0);
                        const isActive = new Date(l.start_date) <= today && new Date(l.end_date) >= today;
                        const tenantName = (l.tenant?.first_name || l.tenant?.last_name)
                          ? `${l.tenant.first_name ?? ""} ${l.tenant.last_name ?? ""}`.trim()
                          : "ללא שוכר";
                        const startY = new Date(l.start_date).getFullYear();
                        const endY = new Date(l.end_date).getFullYear();
                        const isSelected = l.id === effectiveSelectedId;
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
                            <span className="text-indigo-700 font-semibold flex-shrink-0">{formatCurrency((l.monthly_rent ?? 0))}</span>
                            <span className="text-gray-400 text-xs flex-shrink-0">{startY}-{endY}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {lease && (
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(lease.start_date).toLocaleDateString("he-IL")} -{" "}
                    {new Date(lease.end_date).toLocaleDateString("he-IL")} ·{" "}
                    הצמדה נוכחית: {TYPE_LABELS[lease.linkage_type ?? "none"]}
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
                      onClick={() => refreshRatesMutation.mutate()}
                      disabled={refreshRatesMutation.isPending}
                      className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                    >
                      {refreshRatesMutation.isPending ? "מעדכן..." : <><Icon name="refresh" size={14} className="inline" /> עדכן מדדים</>}
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
                  בחר מסלול לפירוט חישוב
                </p>
                {(["none", "usd", "cpi"] as const).map((type) => {
                  // נפילה חזרה ל-monthly_rent/start_date כשלחוזה אין בסיס הצמדה מוגדר -
                  // אותו בסיס שבו משתמשת טבלת הפירוט (buildHistory). בלעדיה
                  // calcEffectiveRent מחזיר את שכ"ד המקורי לכל מסלול, וכל השורות
                  // הציגו "ללא שינוי (+0.0%)" - בדיוק ההשוואה שהמסך אמור להראות.
                  const effective = calcEffectiveRent(
                    {
                      linkage_type: type,
                      linkage_frequency: frequency,
                      base_amount: lease.base_amount ?? lease.monthly_rent,
                      base_date: lease.base_date ?? lease.start_date,
                      monthly_rent: lease.monthly_rent,
                    },
                    rates
                  );
                  const diff = effective - lease.monthly_rent;
                  const pct = lease.monthly_rent > 0 ? ((diff / lease.monthly_rent) * 100).toFixed(1) : "0.0";
                  const isCurrent = (lease.linkage_type ?? "none") === type;
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
                          {formatCurrency(effective)} / חודש
                        </span>
                        {type !== "none" && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : diff > 0 ? "bg-green-100 text-green-700"
                              : diff < 0 ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-500"
                          }`}>
                            {diff >= 0 ? "+" : ""}{diff !== 0 ? formatCurrency(Math.abs(diff)) : "ללא שינוי"} ({diff >= 0 ? "+" : ""}{pct}%)
                          </span>
                        )}
                        <span className={`text-sm ${isSelected ? "text-white/70" : "text-gray-400"}`}>
                          <Icon name={isSelected ? "caretUp" : "caretDown"} size={14} />
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
                      פירוט - {TYPE_LABELS[selectedType]} · {FREQ_LABELS[frequency]}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      בסיס: {formatCurrency(lease.monthly_rent)} ·{" "}
                      {new Date(lease.start_date).toLocaleDateString("he-IL")} עד היום
                    </p>
                  </div>
                </div>

                {history.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">
                    אין נתוני שערים לתקופה זו - לחץ &quot;רענן מדדים&quot; למעלה
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
                          <th className="px-4 py-3 text-right">שכ&quot;ד מחושב</th>
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
                                  : "-"}
                              </td>
                            )}
                            <td className="px-4 py-2.5 font-bold text-gray-900">
                              {formatCurrency(row.rent)}
                            </td>
                            <td className="px-4 py-2.5">
                              {row.diff === 0 ? (
                                <span className="text-gray-400">-</span>
                              ) : (
                                <span className={`font-semibold ${row.diff > 0 ? "text-green-600" : "text-red-500"}`}>
                                  {row.diff > 0 ? "+" : ""}{formatCurrency(row.diff)}
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
                            {formatCurrency(calcEffectiveRent(
                              { linkage_type: selectedType, linkage_frequency: frequency, base_amount: lease.base_amount ?? null, base_date: lease.base_date ?? null, monthly_rent: lease.monthly_rent },
                              rates
                            ))}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">שכ&quot;ד נוכחי</td>
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
