"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { isLeaseCurrentlyActive } from "@/lib/lease-status";
import { listRentMonths, coveredPropertyMonths, propertyMonthKey, todayStr } from "@/lib/domain/rent-schedule";
import { getDebtAmount, getReceivedAmount } from "@/lib/domain/partial-payment";
import { monthCashflow, cashflowTrendPct } from "@/lib/domain/cashflow";
import { buildAttentionItems } from "@/lib/domain/attention";
import { readAndStampVisit, summarizeSince } from "@/lib/domain/last-visit";
import { weekGroupLabel } from "@/lib/domain/dates";
import { apiGet, queryKeys } from "@/lib/api-client";

interface Property {
  id: string;
  title: string;
  address: string;
  city: string;
  property_type: string;
  leases?: { status: string; start_date: string; end_date: string; monthly_rent: number }[];
}

interface Lease {
  id: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  status: string;
  properties?: { id: string; title: string };
}

interface Payment {
  id: string;
  status: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  notes?: string;
  payment_type: string;
  lease?: { id: string };
  property?: { id: string; title?: string };
  isVirtual?: boolean;
  partial_paid_amount?: number | null;
  created_at?: string;
}

interface Expense {
  id: string;
  amount: number;
  date: string;
}

interface Task {
  id: string;
  title: string;
  due_date: string;
  completed_at: string | null;
}

const TYPE_HE: Record<string, string> = { Apartment: "דירה", House: "בית", Commercial: "מסחרי" };

function pendingPaymentsSummary(leases: Lease[], dbPayments: Payment[]): { count: number; amount: number } {
  const today = todayStr();
  let count = 0;
  let amount = 0;

  // תקבולי DB לא-משולמים: תשלום חלקי נספר לפי יתרת החוב הפתוחה, לא הסכום המלא
  for (const p of dbPayments) {
    if (p.status !== "paid") { count++; amount += getDebtAmount(p); }
  }

  // dedup לפי נכס+חודש (כמו payments/debts) - לא חוזה+חודש, כדי שלא יימנה חיוב
  // כפול כששני חוזים לאותו נכס מתחלפים
  const covered = coveredPropertyMonths(dbPayments);

  for (const lease of leases) {
    if (!isLeaseCurrentlyActive(lease)) continue;
    const propId = lease.properties?.id;
    if (!propId) continue;

    for (const { monthKey, due_date } of listRentMonths(lease)) {
      if (due_date > today) continue;
      const key = propertyMonthKey(propId, monthKey);
      if (covered.has(key)) continue;
      count++;
      amount += lease.monthly_rent;
      covered.add(key);
    }
  }

  return { count, amount };
}

export default function Dashboard() {
  const propertiesQuery = useQuery({ queryKey: queryKeys.properties, queryFn: () => apiGet<Property[]>("/api/properties") });
  const leasesQuery = useQuery({ queryKey: queryKeys.leases, queryFn: () => apiGet<Lease[]>("/api/leases") });
  const paymentsQuery = useQuery({ queryKey: queryKeys.payments, queryFn: () => apiGet<Payment[]>("/api/payments") });
  const expensesQuery = useQuery({ queryKey: queryKeys.expenses, queryFn: () => apiGet<Expense[]>("/api/expenses") });
  const tasksQuery = useQuery({ queryKey: queryKeys.tasks, queryFn: () => apiGet<Task[]>("/api/tasks") });

  const properties = useMemo(() => propertiesQuery.data ?? [], [propertiesQuery.data]);
  const leases = useMemo(() => leasesQuery.data ?? [], [leasesQuery.data]);
  const payments = useMemo(() => paymentsQuery.data ?? [], [paymentsQuery.data]);
  const expenses = useMemo(() => expensesQuery.data ?? [], [expensesQuery.data]);
  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);

  const isPending = propertiesQuery.isPending || leasesQuery.isPending || paymentsQuery.isPending || expensesQuery.isPending || tasksQuery.isPending;
  const failedQuery = [propertiesQuery, leasesQuery, paymentsQuery, expensesQuery, tasksQuery].find((q) => q.isError);

  const activeLeases = useMemo(
    () => properties.flatMap((p) => p.leases || []).filter(isLeaseCurrentlyActive),
    [properties]
  );
  const monthlyIncome = useMemo(() => activeLeases.reduce((s, l) => s + l.monthly_rent, 0), [activeLeases]);
  const pendingSummary = useMemo(() => pendingPaymentsSummary(leases, payments), [leases, payments]);
  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  const today = todayStr();
  const thisMonth = today.slice(0, 7);
  const prevMonth = (() => {
    const [y, m] = thisMonth.split("-").map(Number);
    return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  })();

  const cashflow = useMemo(() => monthCashflow(payments, expenses, thisMonth), [payments, expenses, thisMonth]);
  const trendPct = useMemo(
    () => cashflowTrendPct(cashflow, monthCashflow(payments, expenses, prevMonth)),
    [cashflow, payments, expenses, prevMonth]
  );

  const openTasks = useMemo(() => tasks.filter((t) => t.completed_at === null), [tasks]);
  const attention = useMemo(
    () => buildAttentionItems({
      payments, activeLeases: leases.filter(isLeaseCurrentlyActive), openTasks, today,
    }),
    [payments, leases, openTasks, today]
  );

  // חותמת ביקור - נקראת ומוטבעת פעם אחת per mount; עוטפים ב-try/catch כי
  // localStorage יכול להיכשל (Safari private mode וכד') - כשל אחסון לא מפיל את הדף
  const [lastVisit] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return readAndStampVisit(window.localStorage, new Date().toISOString());
    } catch {
      return null;
    }
  });
  const sinceSummary = useMemo(
    () => (lastVisit ? summarizeSince(lastVisit, { payments, tasks }, today) : null),
    [lastVisit, payments, tasks, today]
  );

  // פיד: תקבולים ששולמו, חדשים ראשונים, עד 6, מקובצים לפי שבוע
  const feedGroups = useMemo(() => {
    const paid = payments
      .filter((p) => p.paid_date)
      .sort((a, b) => (b.paid_date! < a.paid_date! ? -1 : 1))
      .slice(0, 6);
    const groups = new Map<string, Payment[]>();
    for (const p of paid) {
      const label = weekGroupLabel(p.paid_date!, today);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(p);
    }
    return [...groups.entries()];
  }, [payments, today]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (failedQuery) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <p className="text-red-600 text-sm">{(failedQuery.error as Error).message}</p>
        <button onClick={() => failedQuery.refetch()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700">
          נסה שוב
        </button>
      </div>
    );
  }

  const { count: pendingCount } = pendingSummary;

  const incomeExpenseStats = [
    { label: "הכנסה חודשית", value: monthlyIncome > 0 ? `₪${monthlyIncome.toLocaleString()}` : "—", subValue: monthlyIncome > 0 ? `₪${Math.round(monthlyIncome * 0.9).toLocaleString()} לאחר מס` : undefined, icon: "💰", gradient: "from-emerald-500 to-emerald-700", href: "/dashboard/reports" },
    { label: "הוצאות כוללות", value: totalExpenses > 0 ? `₪${totalExpenses.toLocaleString()}` : "₪0", icon: "💸", gradient: "from-rose-500 to-rose-700", href: "/dashboard/expenses" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
          <span className="inline-block w-1.5 h-7 rounded-full tick-accent" />
          שלום 👋
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          {new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/leases/import"
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all">
          <span aria-hidden="true">📥</span> ייבוא חוזה
        </Link>
        <Link href="/dashboard/properties/new"
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 border border-gray-200 transition-all">
          <span aria-hidden="true">🏢</span> נכס חדש
        </Link>
        <Link href="/dashboard/reports"
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 border border-gray-200 transition-all">
          <span aria-hidden="true">📊</span> דוחות
        </Link>
        <Link href="/dashboard/reports/tax"
          className="flex items-center gap-2 px-5 py-2.5 bg-orange-50 text-orange-700 rounded-xl font-semibold text-sm hover:bg-orange-100 border border-orange-200 transition-all">
          <span aria-hidden="true">📋</span> דוח מס שנתי
        </Link>
      </div>

      {/* מאז הביקור האחרון */}
      {sinceSummary && (
        <div className="rounded-2xl p-4 space-y-2" style={{ background: "var(--accent-dim)", border: "1px solid rgba(124,131,255,0.32)" }}>
          <p className="text-sm font-bold" style={{ color: "var(--accent-hover)" }}>
            <span aria-hidden="true">🗞️</span> מאז הביקור האחרון
          </p>
          <ul className="text-sm space-y-1">
            {sinceSummary.paymentsCount > 0 && (
              <li className="flex justify-between">
                <span>{sinceSummary.paymentsCount} תקבולי שכ&quot;ד נכנסו</span>
                <span className="font-bold text-emerald-700 num-ltr">₪{sinceSummary.paymentsSum.toLocaleString()} ✓</span>
              </li>
            )}
            {sinceSummary.tasksDone > 0 && (
              <li className="flex justify-between"><span>{sinceSummary.tasksDone} תזכורות סומנו כבוצעו</span><span className="text-emerald-700">✓</span></li>
            )}
            <li className="flex justify-between">
              <span>חובות חדשים</span>
              {sinceSummary.newOverdue > 0
                ? <span className="font-bold text-red-700">{sinceSummary.newOverdue}</span>
                : <span className="text-emerald-700">אין</span>}
            </li>
          </ul>
        </div>
      )}

      {/* דורש טיפול */}
      {attention.length > 0 && (
        <div className="bg-white rounded-2xl p-4 space-y-2 border border-amber-700/30" style={{ borderInlineStartWidth: 3, borderInlineStartColor: "#b45309" }}>
          <p className="text-sm font-bold text-amber-700"><span aria-hidden="true">📌</span> דורש טיפול ({attention.length})</p>
          {attention.map((item) => (
            <Link key={item.id} href={item.href}
              className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5 hover:bg-gray-100 transition-colors">
              <span className="text-sm font-semibold text-gray-800">{item.label}</span>
              <span className="text-xs font-bold text-gray-500 num-ltr">{item.sub}</span>
            </Link>
          ))}
        </div>
      )}

      {/* מספר-גיבור: תזרים החודש */}
      <div className="text-center py-2">
        <p className="text-sm text-gray-600">תזרים החודש, אחרי מס</p>
        <p className="text-5xl font-bold text-gray-900 num-ltr py-1">₪{Math.round(cashflow).toLocaleString()}</p>
        {trendPct !== null && (
          <p className={`text-sm font-semibold ${trendPct >= 0 ? "text-emerald-700" : "text-red-700"}`}>
            <span aria-hidden="true" className="text-xs">{trendPct >= 0 ? "▲" : "▼"}</span>{" "}
            {trendPct >= 0 ? "עלייה" : "ירידה"} של {Math.abs(trendPct)}% מהחודש שעבר
          </p>
        )}
      </div>

      {/* KPI קטנים - כרטיסי נייר, קטנים מובהקות מהגיבור */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "נכסים", value: properties.length, href: "/dashboard/properties" },
          { label: "חוזים פעילים", value: activeLeases.length, href: "/dashboard/leases" },
          { label: "תקבולים ממתינים", value: pendingCount, href: "/dashboard/payments" },
        ].map((k) => (
          <Link key={k.label} href={k.href} className="bg-white rounded-xl px-3 py-3 text-center hover:shadow-md transition-shadow">
            <p className="text-xl font-bold text-gray-900">{k.value}</p>
            <p className="text-xs text-gray-500">{k.label}</p>
          </Link>
        ))}
      </div>

      {/* כרטיסי הכנסה/הוצאות - גרדיאנטים סמנטיים, טקסט לבן (נשמרים) */}
      <div className="grid grid-cols-2 gap-3">
        {incomeExpenseStats.map((s) => (
          <Link key={s.label} href={s.href} className={`relative overflow-hidden bg-gradient-to-br ${s.gradient} text-white rounded-2xl p-4 flex flex-col gap-1.5 hover:brightness-110 transition-all`}>
            <span className="absolute -top-2 -left-2 text-5xl opacity-15 select-none" aria-hidden="true">{s.icon}</span>
            <div className="text-xl font-extrabold relative drop-shadow-sm">{s.value}</div>
            {"subValue" in s && s.subValue && (
              <div className="text-xs font-semibold text-white/80 relative">{s.subValue}</div>
            )}
            <div className="text-xs text-white/75 font-semibold relative">{s.label}</div>
          </Link>
        ))}
      </div>

      {/* תנועות אחרונות - מקובצות לפי שבוע */}
      {feedGroups.length > 0 && (
        <div className="space-y-1">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2.5">
            <span className="inline-block w-1 h-5 rounded-full tick-accent" />
            תנועות אחרונות
          </h2>
          {feedGroups.map(([label, group]) => (
            <div key={label}>
              <p className="text-xs font-semibold text-gray-400 tracking-wide mt-3 mb-1.5">{label}</p>
              {group.map((p) => (
                <div key={p.id} className="bg-white rounded-xl flex items-center justify-between px-4 py-3 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{p.payment_type === "Rent" ? "שכ\"ד" : p.payment_type} - {p.property?.title ?? "נכס"}</p>
                  </div>
                  <p className="text-sm font-bold text-emerald-700 num-ltr">₪{getReceivedAmount(p).toLocaleString()}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Properties */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2.5">
            <span className="inline-block w-1 h-5 rounded-full tick-accent" />
            הנכסים שלי
          </h2>
          <Link href="/dashboard/properties/new"
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700">
            + הוסף נכס
          </Link>
        </div>

        {properties.length === 0 ? (
          <div className="bg-white rounded-2xl px-6 py-14 text-center space-y-4">
            <div className="text-5xl" aria-hidden="true">🏠</div>
            <p className="text-gray-500 font-medium">עדיין אין נכסים</p>
            <p className="text-gray-400 text-sm">התחל בהוספת נכס או בייבוא חוזה</p>
            <div className="flex gap-3 justify-center pt-2">
              <Link href="/dashboard/leases/import"
                className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700">
                <span aria-hidden="true">📥</span> ייבוא חוזה
              </Link>
              <Link href="/dashboard/properties/new"
                className="px-5 py-2 bg-white text-gray-700 rounded-xl font-semibold text-sm border border-gray-200 hover:bg-gray-50">
                <span aria-hidden="true">🏢</span> הוסף נכס
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {properties.map((p) => {
              const active = (p.leases || []).filter(isLeaseCurrentlyActive);
              const rent = active.reduce((s, l) => s + l.monthly_rent, 0);
              return (
                <Link key={p.id} href={`/dashboard/properties/${p.id}`}
                  className="bg-white rounded-xl flex items-center justify-between px-4 py-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0">
                      {TYPE_HE[p.property_type]?.charAt(0) || "נ"}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{p.title}</p>
                      <p className="text-sm text-gray-400">{p.address}, {p.city}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {rent > 0 && (
                      <div className="text-right">
                        <p className="font-semibold text-emerald-700">₪{rent.toLocaleString()}</p>
                        <p className="text-gray-400 text-xs">לחודש</p>
                      </div>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      active.length > 0 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {active.length > 0 ? `${active.length} חוזה פעיל` : "פנוי"}
                    </span>
                    <span className="text-gray-400">‹</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
