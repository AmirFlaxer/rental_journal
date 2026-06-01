"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPhone } from "@/lib/phone";
import { calcEffectiveRent, LINKAGE_TYPE_LABELS } from "@/lib/linkage";
import type { IndexRate, LinkageType, LinkageFrequency } from "@/lib/linkage";

interface Lease {
  id: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  status: string;
  leaseTerm: number;
  hasOption?: boolean;
  optionMonths?: number;
  paymentMethod?: string;
  linkageType?: LinkageType;
  linkageFrequency?: LinkageFrequency;
  baseAmount?: number;
  baseDate?: string;
  properties?: { id: string; title: string; city: string; address: string };
  tenant?: { firstName: string; lastName: string; phone?: string };
}

function daysUntilExpiry(lease: Lease): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(lease.endDate).getTime() - today.getTime()) / 86400000);
}

function leaseStatus(lease: Lease): "active" | "future" | "ended" {
  // חוזים שבוטלו/הסתיימו במפורש — תמיד לא בתוקף
  if (lease.status === "terminated" || lease.status === "expired" || lease.status === "ended") return "ended";
  // לכל היתר (כולל status="active") — קובעים לפי תאריכים ולא לפי שדה status:
  // חוזים ישנים עלולים להישאר status="active" אחרי שתוקפם פג (ה-cron לא תמיד רץ),
  // ולכן תאריך הסיום הוא מקור האמת. הנתונים עצמם נשמרים כהיסטוריה.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(lease.startDate);
  const end = new Date(lease.endDate);
  if (start > today) return "future";
  if (end < today) return "ended";
  return "active";
}

const STATUS_LABEL: Record<string, string> = {
  active: "בתוקף",
  future: "עתידי",
  ended: "לא בתוקף",
};

const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  future: "bg-blue-100 text-blue-700",
  ended: "bg-gray-100 text-gray-500",
};

const STATUS_DOT: Record<string, string> = {
  active: "bg-green-500",
  future: "bg-blue-400",
  ended: "bg-gray-400",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
}

export default function LeasesPage() {
  const router = useRouter();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [indexRates, setIndexRates] = useState<IndexRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "future" | "ended">("all");

  useEffect(() => {
    Promise.all([
      fetch("/api/leases").then((r) => r.json()),
      fetch("/api/index-rates").then((r) => r.json()),
    ]).then(([leasesData, ratesData]) => {
      if (Array.isArray(leasesData)) setLeases(leasesData);
      if (Array.isArray(ratesData)) setIndexRates(ratesData);
    }).finally(() => setLoading(false));
  }, []);

  const withStatus = leases.map((l) => ({ ...l, _status: leaseStatus(l) }));

  // איחוד כפילויות: חוזים עם אותו נכס ואותם תאריכים (חוזה שיובא יותר מפעם אחת,
  // או חידוש שנרשם בנפרד) מוצגים פעם אחת בלבד. שומרים נציג אחד לפי עדיפות
  // בתוקף > עתידי > הסתיים — בלי למחוק את הנתונים עצמם.
  const STATUS_RANK: Record<string, number> = { active: 0, future: 1, ended: 2 };
  const dupKey = (l: (typeof withStatus)[number]) =>
    `${l.properties?.id ?? l.id}|${(l.startDate ?? "").slice(0, 10)}|${(l.endDate ?? "").slice(0, 10)}`;
  const chosen = new Map<string, (typeof withStatus)[number]>();
  for (const lease of withStatus) {
    const existing = chosen.get(dupKey(lease));
    if (!existing || STATUS_RANK[lease._status] < STATUS_RANK[existing._status]) {
      chosen.set(dupKey(lease), lease);
    }
  }
  const deduped = withStatus.filter((l) => chosen.get(dupKey(l)) === l);

  const filtered = filter === "all" ? deduped : deduped.filter((l) => l._status === filter);

  const counts = {
    active: deduped.filter((l) => l._status === "active").length,
    future: deduped.filter((l) => l._status === "future").length,
    ended: deduped.filter((l) => l._status === "ended").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
            <span className="inline-block w-1.5 h-7 rounded-full bg-gradient-to-b from-pink-400 to-pink-600" />
            חוזים
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">כל חוזי השכירות שלך</p>
        </div>
        <Link
          href="/dashboard/leases/import"
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700"
        >
          + ייבוא חוזה
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "active", "future", "ended"] as const).map((f) => {
          const labels = { all: "הכל", active: "בתוקף", future: "עתידיים", ended: "🗂 ארכיון" };
          const count = f === "all" ? deduped.length : counts[f];
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {labels[f]}
              <span className={`mr-1.5 text-xs ${filter === f ? "opacity-70" : "text-gray-400"}`}>
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-20 text-center space-y-3">
          <div className="text-5xl">📄</div>
          <p className="text-gray-600 font-semibold text-lg">אין חוזים</p>
          <Link href="/dashboard/leases/import" className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700">
            + ייבא חוזה ראשון
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((lease) => {
            const st = lease._status;
            return (
              <div key={lease.id} onClick={() => router.push(`/dashboard/leases/${lease.id}/edit`)}
                className="bg-white rounded-2xl border border-gray-300 px-4 py-4 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-start gap-3">
                  {/* Status dot */}
                  <div className="mt-1.5 flex-shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[st]}`} />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900">
                        {lease.properties?.title ?? "נכס לא ידוע"}
                      </p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[st]}`}>
                        {STATUS_LABEL[st]}
                      </span>
                      {st === "active" && (() => {
                        const days = daysUntilExpiry(lease);
                        if (days > 60) return null;
                        return (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${days <= 14 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                            {days === 0 ? "מסתיים היום" : `עוד ${days} ימים`}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {lease.properties?.city && `${lease.properties.city} · `}
                      {lease.tenant ? `${lease.tenant.firstName} ${lease.tenant.lastName}` : "שוכר לא ידוע"}
                      {lease.tenant?.phone && ` · ${formatPhone(lease.tenant.phone)}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(lease.startDate)} – {formatDate(lease.endDate)}
                      {lease.hasOption && lease.optionMonths && (
                        <span className="mr-2 text-indigo-500">+ אופציה {lease.optionMonths} חודשים</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {lease.paymentMethod === "bank_transfer" ? "💳 העברה בנקאית" : "🧾 שקים"}
                    </p>
                  </div>

                  {/* Rent + arrow */}
                  <div className="text-right flex-shrink-0 flex flex-col items-end justify-center gap-1">
                    {lease.linkageType && lease.linkageType !== "none" ? (() => {
                      const effective = calcEffectiveRent(
                        { ...lease, linkageType: lease.linkageType!, linkageFrequency: lease.linkageFrequency ?? "monthly", baseAmount: lease.baseAmount ?? null, baseDate: lease.baseDate ?? null },
                        indexRates
                      );
                      const changed = effective !== lease.monthlyRent;
                      return (
                        <>
                          <p className="font-bold text-gray-900">₪{effective.toLocaleString()}</p>
                          {changed && <p className="text-xs text-gray-400 line-through">₪{lease.monthlyRent.toLocaleString()}</p>}
                          <p className="text-xs text-indigo-500">{LINKAGE_TYPE_LABELS[lease.linkageType!]}</p>
                        </>
                      );
                    })() : (
                      <p className="font-bold text-gray-900">₪{lease.monthlyRent.toLocaleString()}</p>
                    )}
                    <p className="text-xs text-gray-400">לחודש</p>
                    <span className="text-gray-400 text-lg leading-none">›</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
