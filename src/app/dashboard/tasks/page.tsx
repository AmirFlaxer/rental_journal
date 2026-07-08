"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DateInput } from "@/components/date-input";
import { listRentMonths, propertyMonthKey, todayStr } from "@/lib/domain/rent-schedule";
import { apiGet, queryKeys } from "@/lib/api-client";

const CAT_HE: Record<string, string> = {
  Insurance: "ביטוח",
  "Rent Collection": "גביית שכ״ד",
  "Lease Renewal": "חידוש חוזה",
  Maintenance: "תחזוקה",
  Tax: "מס הכנסה",
  Gas: "גז",
  Water: "מים וביוב",
  Electricity: "חשמל",
  "Municipal Tax": "ארנונה",
  Other: "אחר",
};

const CAT_ICON: Record<string, string> = {
  Insurance: "🛡️",
  "Rent Collection": "💰",
  "Lease Renewal": "📋",
  Maintenance: "🔧",
  Tax: "📊",
  Gas: "🔥",
  Water: "💧",
  Electricity: "⚡",
  "Municipal Tax": "🏛️",
  Other: "📌",
};

// צבעי רקע עדינים לכל קטגוריה
const CAT_BG: Record<string, string> = {
  "Rent Collection": "#d1fae5",
  "Lease Renewal":   "#e0e7ff",
  Insurance:         "#ede9fe",
  Maintenance:       "#fed7aa",
  Tax:               "#fef3c7",
  Gas:               "#fee2e2",
  Water:             "#e0f2fe",
  Electricity:       "#fef9c3",
  "Municipal Tax":   "#f1f5f9",
  Other:             "#fae8ff",
};
const CAT_FG: Record<string, string> = {
  "Rent Collection": "#065f46",
  "Lease Renewal":   "#3730a3",
  Insurance:         "#4c1d95",
  Maintenance:       "#7c2d12",
  Tax:               "#78350f",
  Gas:               "#7f1d1d",
  Water:             "#075985",
  Electricity:       "#713f12",
  "Municipal Tax":   "#334155",
  Other:             "#701a75",
};
// פלטת צבעים לנכסים — שלוש רמות עוצמה לכל גוון (כהה / בסיס / בהיר)
const PROP_PALETTE      = ["#6366f1","#ec4899","#f97316","#10b981","#3b82f6","#8b5cf6","#eab308","#06b6d4"];
const PROP_PALETTE_DARK = ["#3730a3","#be185d","#c2410c","#065f46","#1d4ed8","#6d28d9","#a16207","#0e7490"];
const PROP_PALETTE_LITE = ["#e0e7ff","#fce7f3","#ffedd5","#d1fae5","#dbeafe","#ede9fe","#fef9c3","#cffafe"];

const CAT_GROUP: { label: string; items: string[] }[] = [
  { label: "ניהול חוזה", items: ["Rent Collection", "Lease Renewal", "Insurance"] },
  { label: "חשבונות תקופתיים", items: ["Gas", "Water", "Electricity", "Municipal Tax"] },
  { label: "כללי", items: ["Maintenance", "Tax", "Other"] },
];

const PRIORITY_HE: Record<string, string> = { low: "נמוכה", normal: "רגילה", high: "גבוהה" };
const PRIORITY_BG: Record<string, string> = { low: "#f1f5f9", normal: "#e0e7ff", high: "#fee2e2" };
const PRIORITY_FG: Record<string, string> = { low: "#475569", normal: "#4338ca", high: "#b91c1c" };

interface Task {
  id: string;
  title: string;
  description?: string;
  category: string;
  dueDate: string;
  completedAt?: string;
  priority: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  isVirtual?: boolean;
}

interface Lease {
  id: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  status?: string | null;
  paymentMethod?: string;
  properties?: { id: string; title: string };
  tenant?: { firstName: string; lastName: string };
}

/**
 * יוצר תזכורות שק וירטואליות (לתצוגה בלבד, לא נשמרות ב-DB) מחוזים פעילים בשיטת שיקים.
 * השם כולל "Virtual" בכוונה כדי לא להתבלבל עם src/lib/check-reminders.ts השרתי -
 * שם עוסק בסגירה/פתיחה מחדש של תזכורות DB אמיתיות מול תשלומים בפועל
 * (closeCheckReminderForPayment / reopenCheckReminderForPayment).
 * הפונקציה כאן היא רק תחזית UI לחודשים שעדיין אין להם תזכורת ב-DB,
 * כדי שהמסך יציג אותם גם לפני שנוצרת התזכורת "האמיתית".
 */
function generateVirtualCheckTasks(leases: Lease[], dbTasks: Task[]): Task[] {
  const today = todayStr();
  const virtual: Task[] = [];

  // בנה מפה leaseId → propertyId לצורך dedup בין חוזים של אותו נכס
  const leaseToProperty = new Map(leases.map((l) => [l.id, l.properties?.id ?? l.id]));

  // חודשים שכבר מכוסים ע"י משימת DB שאינה פגת-תוקף (לפי נכס+חודש)
  // משימה פגת-תוקף לא חוסמת — ייתכן שנוצרה עם תאריך שגוי (באג UTC)
  const todayMonth = today.slice(0, 7);
  const coveredPropertyMonths = new Set<string>();
  for (const t of dbTasks) {
    if (t.category === "Rent Collection" && t.relatedEntityType === "lease" && t.relatedEntityId) {
      const propId = leaseToProperty.get(t.relatedEntityId);
      // מכסה חודש נוכחי או עתידי — גם אם dueDate הוא אתמול (תזכורת יום לפני התשלום)
      if (propId && t.dueDate.slice(0, 7) >= todayMonth) {
        coveredPropertyMonths.add(propertyMonthKey(propId, t.dueDate.slice(0, 7)));
      }
    }
  }

  for (const lease of leases) {
    const pm = lease.paymentMethod?.toLowerCase();
    if (lease.status === "ended" || lease.status === "paused") continue;
    if (pm && pm !== "check" && pm !== "checks") continue;
    const propId = lease.properties?.id;
    if (!propId) continue;

    for (const slot of listRentMonths(lease)) {
      if (slot.dueDate < today) continue;
      const key = propertyMonthKey(propId, slot.monthKey);
      if (coveredPropertyMonths.has(key)) continue;

      const monthLabel = new Date(`${slot.dueDate}T00:00:00`).toLocaleDateString("he-IL", { month: "long", year: "numeric" });
      const propertyLabel = lease.properties?.title ?? "נכס";
      virtual.push({
        id: `virtual-check-${lease.id}-${slot.monthKey}`,
        title: `הפקדת שק שכ"ד — ${propertyLabel} — ${monthLabel}`,
        category: "Rent Collection",
        dueDate: slot.dueDate,
        priority: "normal",
        relatedEntityType: "lease",
        relatedEntityId: lease.id,
        isVirtual: true,
      });
      coveredPropertyMonths.add(key);
    }
  }

  return virtual;
}

// "רלוונטי" = פג מועד או עד 30 יום קדימה
function isRelevant(t: Task) {
  const due = new Date(t.dueDate);
  due.setHours(0, 0, 0, 0);
  const in30 = new Date();
  in30.setHours(0, 0, 0, 0);
  in30.setDate(in30.getDate() + 30);
  return due <= in30;
}

function formatDue(dateStr: string, isOverdue: boolean) {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (isOverdue) {
    const days = Math.abs(diffDays);
    return days === 0 ? "היום (פג מועד)" : `לפני ${days} ימים`;
  }
  if (diffDays === 0) return "היום";
  if (diffDays === 1) return "מחר";
  if (diffDays <= 7) return `בעוד ${diffDays} ימים`;
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  const tasksQuery = useQuery({ queryKey: queryKeys.tasks, queryFn: () => apiGet<Task[]>("/api/tasks") });
  const leasesQuery = useQuery({ queryKey: queryKeys.leases, queryFn: () => apiGet<Lease[]>("/api/leases") });
  const dbTasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const leases = useMemo(() => leasesQuery.data ?? [], [leasesQuery.data]);
  const isPending = tasksQuery.isPending || leasesQuery.isPending;
  const failedQuery = [tasksQuery, leasesQuery].find((q) => q.isError);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDone, setShowDone] = useState(true);
  const [showFuture, setShowFuture] = useState(true);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Other",
    dueDate: "",
    priority: "normal",
  });
  // Recurring state
  const [recurring, setRecurring] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState(1); // months between occurrences
  const [linkedLeaseId, setLinkedLeaseId] = useState("");
  const [continueAfterLease, setContinueAfterLease] = useState(false);
  const [recurringEndDate, setRecurringEndDate] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // באנר שגיאה inline לרשימה (במקום alert) — נעלם אוטומטית או בסגירה ידנית
  const [listError, setListError] = useState("");
  const listErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showListError = (msg: string) => {
    if (listErrorTimer.current) clearTimeout(listErrorTimer.current);
    setListError(msg);
    listErrorTimer.current = setTimeout(() => setListError(""), 4000);
  };

  // אישור מחיקה דו-שלבי: לחיצה ראשונה הופכת את הכפתור ל"בטוח?", מתאפס אחרי 3 שניות
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const confirmDeleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestDelete = (id: string) => {
    if (confirmDeleteTimer.current) clearTimeout(confirmDeleteTimer.current);
    setConfirmDeleteId(id);
    confirmDeleteTimer.current = setTimeout(() => setConfirmDeleteId(null), 3000);
  };
  useEffect(() => () => {
    if (listErrorTimer.current) clearTimeout(listErrorTimer.current);
    if (confirmDeleteTimer.current) clearTimeout(confirmDeleteTimer.current);
  }, []);

  // ניקוי כפילויות/יתומות של תזכורות שק — מתבצע בשרת (POST /api/tasks/cleanup),
  // לא בצד לקוח: אם /api/leases נכשל רגעית, אין סכנה שכל תזכורות ה-Rent Collection
  // ייחשבו יתומות וימחקו בטעות (באג שהיה בגרסה הקודמת של הניקוי כאן).
  // רץ פעם אחת ב-mount; ה-ref מונע הרצה כפולה ב-Strict Mode של פיתוח.
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/tasks/cleanup", { method: "POST" });
      if (!res.ok) return null;
      return res.json() as Promise<{ deleted: number }>;
    },
    onSuccess: (res) => {
      if (res && res.deleted > 0) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
      }
    },
  });
  const cleanupRan = useRef(false);
  useEffect(() => {
    if (cleanupRan.current) return;
    cleanupRan.current = true;
    cleanupMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingDb = dbTasks.filter((t) => !t.completedAt);
  const done = dbTasks.filter((t) => t.completedAt);

  // ממוין ב-useMemo כי לולאת השרשור-חוזים רצה בכל render, וללא זה גם בכל הקלדה בטופס
  const virtualCheck = useMemo(() => generateVirtualCheckTasks(leases, dbTasks), [leases, dbTasks]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // כל המשימות הפתוחות: DB + וירטואליות, עם ביטול כפילויות לפי נכס+חודש
  const leaseToPropertyId = new Map(leases.map((l) => [l.id, l.properties?.id ?? l.id]));
  const dedupedPending: Task[] = [];
  const seenPropertyMonth = new Set<string>();
  for (const t of [...pendingDb, ...virtualCheck].sort((a, b) => {
    // משימה לא-פגת-תוקף קודמת לפגת-תוקף באותו חודש (לתיקון באג UTC שיצר תאריכים שגויים ב-DB)
    const aOver = new Date(a.dueDate) < today;
    const bOver = new Date(b.dueDate) < today;
    if (aOver !== bOver) return aOver ? 1 : -1;
    return a.dueDate.localeCompare(b.dueDate);
  })) {
    if (t.category === "Rent Collection" && t.relatedEntityType === "lease" && t.relatedEntityId) {
      const propId = leaseToPropertyId.get(t.relatedEntityId) ?? t.relatedEntityId;
      const key = `${propId}-${t.dueDate.slice(0, 7)}`;
      if (seenPropertyMonth.has(key)) continue;
      seenPropertyMonth.add(key);
    }
    dedupedPending.push(t);
  }
  const allPending = dedupedPending;

  const relevant = allPending
    .filter((t) => isRelevant(t))
    .sort((a, b) => {
      const aOver = new Date(a.dueDate) < today;
      const bOver = new Date(b.dueDate) < today;
      if (aOver !== bOver) return aOver ? -1 : 1; // overdue ראשון
      return a.dueDate.localeCompare(b.dueDate);   // אחר כך הכי מוקדם
    });
  const future = allPending.filter((t) => !isRelevant(t));
  const overdueCount = allPending.filter((t) => new Date(t.dueDate) < today).length;

  const resetForm = () => {
    setForm({ title: "", description: "", category: "Other", dueDate: "", priority: "normal" });
    setRecurring(false);
    setRecurringFreq(1);
    setLinkedLeaseId("");
    setContinueAfterLease(false);
    setRecurringEndDate("");
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError("");
    setSaving(true);

    try {
      if (!recurring) {
        // Single task
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            relatedEntityType: linkedLeaseId ? "lease" : undefined,
            relatedEntityId: linkedLeaseId || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "שגיאה");
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
      } else {
        // Recurring — calculate all dates
        const occurrences: string[] = [];
        let cur = new Date(form.dueDate);

        // Determine end boundary
        let endBoundary: Date | null = null;
        if (linkedLeaseId && !continueAfterLease) {
          const lease = leases.find((l) => l.id === linkedLeaseId);
          if (lease) endBoundary = new Date(lease.endDate);
        }
        if (recurringEndDate) {
          endBoundary = new Date(recurringEndDate);
        }

        const SAFETY_CAP = 60; // max 5 years
        while (occurrences.length < SAFETY_CAP) {
          if (endBoundary && cur > endBoundary) break;
          occurrences.push(cur.toISOString().slice(0, 10));
          const next = new Date(cur);
          next.setMonth(next.getMonth() + recurringFreq);
          cur = next;
          // If no boundary at all, cap at 24
          if (!endBoundary && occurrences.length >= 24) break;
        }

        const basePayload = {
          ...form,
          relatedEntityType: linkedLeaseId ? "lease" : undefined,
          relatedEntityId: linkedLeaseId || undefined,
        };

        const results = await Promise.all(
          occurrences.map((dateStr) =>
            fetch("/api/tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...basePayload, dueDate: dateStr }),
            }).then((r) => r.json())
          )
        );
        const created = results.filter((r) => r.id);
        if (created.length > 0) queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
      }

      setShowForm(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setSaving(false);
    }
  };

  const complete = async (t: Task) => {
    const key = t.isVirtual ? `virtual-${t.dueDate}-${t.relatedEntityId}` : t.id;
    setCompletingId(key);
    try {
      if (t.isVirtual) {
        const createRes = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: t.title,
            category: t.category,
            dueDate: t.dueDate,
            priority: t.priority,
            relatedEntityType: t.relatedEntityType,
            relatedEntityId: t.relatedEntityId,
          }),
        });
        if (!createRes.ok) { showListError("שגיאה ביצירת משימה"); return; }
        const created = await createRes.json();
        const completeRes = await fetch(`/api/tasks/${created.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completedAt: new Date().toISOString() }),
        });
        if (completeRes.ok) {
          queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
        } else { showListError("שגיאה בסימון כבוצע"); }
        return;
      }
      const res = await fetch(`/api/tasks/${t.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedAt: new Date().toISOString() }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
      } else { showListError("שגיאה בסימון כבוצע"); }
    } finally {
      setCompletingId(null);
    }
  };

  const reopen = async (id: string) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completedAt: null }),
    });
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    }
  };

  const remove = async (t: Task) => {
    if (t.isVirtual) return; // וירטואלי — אין מה למחוק
    await fetch(`/api/tasks/${t.id}`, { method: "DELETE" });
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
  };

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

  // Lease ID → property title + color lookup
  const leasePropertyMap = new Map(
    leases.map((l) => [l.id, l.properties?.title ?? null])
  );

  // צבע ייחודי לכל נכס — שלוש רמות לכל גוון
  const uniquePropIds = [...new Set(leases.map((l) => l.properties?.id).filter(Boolean) as string[])];
  const propIdxByPropId = new Map(uniquePropIds.map((id, i) => [id, i % PROP_PALETTE.length]));
  const propColorsByLeaseId = new Map(
    leases.map((l) => {
      const idx = l.properties?.id ? (propIdxByPropId.get(l.properties.id) ?? 0) : 0;
      return [l.id, {
        base: PROP_PALETTE[idx],
        dark: PROP_PALETTE_DARK[idx],
        lite: PROP_PALETTE_LITE[idx],
      }];
    })
  );

  const TaskRow = ({ t, isDone }: { t: Task; isDone: boolean }) => {
    const isOverdue = !isDone && new Date(t.dueDate) < today;
    const dueLabel = isDone
      ? new Date(t.dueDate).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })
      : formatDue(t.dueDate, isOverdue);
    const propertyName =
      t.relatedEntityType === "lease" && t.relatedEntityId
        ? leasePropertyMap.get(t.relatedEntityId) ?? null
        : null;
    const propColors = t.relatedEntityId ? propColorsByLeaseId.get(t.relatedEntityId) : undefined;
    const propColor = propColors?.base ?? "#94a3b8";
    const propDark  = propColors?.dark ?? "#64748b";
    // צבעי הקטגוריה עצמם (CAT_BG/CAT_FG) נשארים כפי שהם - קידוד צבע לפי קטגוריה, כמו PROP_PALETTE.
    // רק ה-fallback (למקרה קטגוריה לא ממופה) עבר ממשתני-CSS קשיחים למשתני עיצוב, כדי שלא "יברח" לבן על רקע כהה
    const catBg = CAT_BG[t.category] ?? "var(--bg-elevated)";
    const catFg = CAT_FG[t.category] ?? "var(--text-2)";
    const shadow = "0 1px 3px rgba(0,0,0,0.4)";
    const livePriBg = t.priority === "high" ? "#dc2626" : t.priority === "normal" ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.18)";
    const livePriFg = t.priority === "high" ? "white" : t.priority === "normal" ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.75)";
    const isConfirmingDelete = confirmDeleteId === t.id;

    return (
      <div
        className={`rounded-xl shadow-sm border transition-opacity ${isDone ? "opacity-60 border-gray-100" : "border-transparent"}`}
        style={{ background: isDone ? "var(--bg-elevated)" : `linear-gradient(135deg, ${propDark} 0%, ${propColor} 100%)` }}
      >
        {/* שורה עליונה: אייקון + כותרת + תאריך + מחיקה */}
        <div className="flex items-center gap-2.5 px-3 pt-3 pb-1">
          {/* Category icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: isDone ? catBg : "rgba(255,255,255,0.18)", boxShadow: isDone ? "none" : "inset 0 1px 0 rgba(255,255,255,0.3)" }}
          >
            {CAT_ICON[t.category] || "📌"}
          </div>

          {/* Title */}
          <p
            className={`flex-1 min-w-0 font-bold text-sm leading-snug truncate ${isDone ? "line-through text-gray-400" : "text-white"}`}
            style={isDone ? {} : { textShadow: shadow }}
          >
            {t.title}
          </p>

          {/* Due date */}
          <p
            className="flex-shrink-0 font-bold text-xs text-right"
            style={isDone ? { color: "var(--text-3)" } : isOverdue ? { color: "#fde047", textShadow: shadow } : { color: "white", textShadow: shadow }}
          >
            {isOverdue && "⚠ "}{dueLabel}
          </p>

          {/* Delete — אישור דו-שלבי: לחיצה ראשונה הופכת ל"בטוח?", מתאפס אחרי 3 שניות */}
          {!t.isVirtual && (
            isConfirmingDelete ? (
              <button
                type="button"
                onClick={() => { setConfirmDeleteId(null); remove(t); }}
                className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                style={{ background: "#dc2626" }}
              >
                בטוח?
              </button>
            ) : (
              <button
                type="button"
                onClick={() => requestDelete(t.id)}
                className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sm transition-opacity hover:opacity-80"
                style={isDone ? { background: "var(--bg-surface)", color: "var(--text-3)" } : { background: "rgba(0,0,0,0.3)", color: "rgba(255,255,255,0.9)" }}
              >
                🗑
              </button>
            )
          )}
        </div>

        {/* שורה תחתונה: קטגוריה+נכס משמאל, עדיפות+בוצע מימין */}
        <div className="flex items-center justify-between gap-2 px-3 pb-3">
          {/* שמאל: badges */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
              style={isDone ? { background: catBg, color: catFg } : { background: "rgba(0,0,0,0.3)", color: "rgba(255,255,255,0.95)" }}
            >
              {CAT_HE[t.category]}
            </span>
            {propertyName && (
              <span
                className="text-xs font-semibold truncate"
                style={{ color: isDone ? "var(--text-3)" : "rgba(255,255,255,0.9)", textShadow: isDone ? "none" : shadow }}
              >
                {propertyName}
              </span>
            )}
            {t.description && (
              <span className="text-xs truncate" style={{ color: isDone ? "var(--text-3)" : "rgba(255,255,255,0.75)" }}>
                {t.description}
              </span>
            )}
            {t.isVirtual && (
              <span className="text-xs flex-shrink-0" style={{ color: isDone ? "var(--text-3)" : "rgba(255,255,255,0.65)" }}>
                אוטומטי
              </span>
            )}
          </div>

          {/* ימין: עדיפות + כפתור פעולה */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className="text-xs px-2 py-0.5 rounded-lg font-bold"
              style={isDone
                ? { background: PRIORITY_BG[t.priority] ?? "var(--bg-elevated)", color: PRIORITY_FG[t.priority] ?? "var(--text-2)" }
                : { background: livePriBg, color: livePriFg }
              }
            >
              {PRIORITY_HE[t.priority]}
            </span>
            {/* Complete / Undo */}
            {!isDone ? (
              <button
                type="button"
                onClick={() => complete(t)}
                disabled={completingId !== null}
                className="px-3 py-1 rounded-lg font-bold text-xs text-white disabled:opacity-60"
                style={{ background: "#16a34a", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }}
              >
                {completingId !== null ? "..." : "בוצע ✓"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => reopen(t.id)}
                className="px-3 py-1 rounded-lg font-semibold text-xs border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-colors"
              >
                בטל
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
            <span className="inline-block w-1.5 h-7 rounded-full bg-gradient-to-b from-pink-400 to-pink-600" />
            תזכורות
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {relevant.length} רלוונטיות · {future.length} עתידיות
            {overdueCount > 0 && <span className="text-red-600 font-semibold"> · {overdueCount} פג מועד</span>}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700"
        >
          + תזכורת חדשה
        </button>
      </div>

      {/* באנר שגיאה — inline במקום alert, נעלם אוטומטית אחרי כמה שניות או בסגירה ידנית */}
      {listError && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm flex items-center justify-between gap-3">
          <span>{listError}</span>
          <button
            type="button"
            onClick={() => setListError("")}
            className="flex-shrink-0 text-xs font-bold opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Add form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">תזכורת חדשה</h2>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">כותרת *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  placeholder="תיאור המשימה"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">קטגוריה</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    {CAT_GROUP.map((g) => (
                      <optgroup key={g.label} label={g.label}>
                        {g.items.map((c) => (
                          <option key={c} value={c}>{CAT_ICON[c]} {CAT_HE[c]}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">עדיפות</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="low">נמוכה</option>
                    <option value="normal">רגילה</option>
                    <option value="high">גבוהה</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">תאריך יעד *</label>
                <DateInput
                  value={form.dueDate}
                  onChange={(v) => setForm({ ...form, dueDate: v })}
                  required
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">קשור לנכס / חוזה (אופציונלי)</label>
                <select value={linkedLeaseId} onChange={(e) => { setLinkedLeaseId(e.target.value); setContinueAfterLease(false); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="">— ללא שיוך —</option>
                  {leases.filter((l) => l.status !== "ended").map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.properties?.title} · {l.tenant?.firstName} {l.tenant?.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">הערות</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                  placeholder="הערות נוספות..."
                />
              </div>

              {/* Recurring section */}
              <div className="pt-1 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold text-gray-600">תזכורת חוזרת</label>
                  <button type="button" onClick={() => setRecurring(!recurring)}
                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0"
                    style={{ background: recurring ? "var(--accent)" : "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                    <span className="inline-block h-4 w-4 rounded-full shadow"
                      style={{
                        background: recurring ? "#fff" : "var(--text-3)",
                        transform: recurring ? "translateX(1.4rem)" : "translateX(0.2rem)",
                        transition: "transform 0.2s",
                      }} />
                  </button>
                </div>

                {recurring && (
                  <div className="space-y-3 rounded-xl p-3" style={{ background: "var(--bg-elevated)" }}>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">תדירות</label>
                      <select value={recurringFreq} onChange={(e) => setRecurringFreq(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                        <option value={1}>כל חודש</option>
                        <option value={2}>כל חודשיים</option>
                        <option value={3}>כל רבעון (3 חודשים)</option>
                        <option value={6}>כל חצי שנה</option>
                        <option value={12}>כל שנה</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">קשור לחוזה (אופציונלי)</label>
                      <select value={linkedLeaseId} onChange={(e) => { setLinkedLeaseId(e.target.value); setContinueAfterLease(false); }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                        <option value="">— ללא חוזה ספציפי —</option>
                        {leases.filter((l) => l.status !== "ended").map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.properties?.title} · {l.tenant?.firstName} {l.tenant?.lastName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {linkedLeaseId && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={continueAfterLease}
                          onChange={(e) => setContinueAfterLease(e.target.checked)}
                          className="w-4 h-4 accent-pink-600" />
                        <span className="text-xs text-gray-600">המשך גם לאחר סיום החוזה</span>
                      </label>
                    )}

                    {(!linkedLeaseId || continueAfterLease) && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">
                          עד תאריך
                          {!linkedLeaseId && <span className="text-gray-400 font-normal mr-1">(ללא תאריך = 24 תזכורות)</span>}
                        </label>
                        <DateInput value={recurringEndDate} onChange={setRecurringEndDate} className="w-full" />
                      </div>
                    )}

                    {form.dueDate && (
                      <p className="text-xs" style={{ color: "var(--accent)" }}>
                        תזכורת ראשונה: {new Date(form.dueDate).toLocaleDateString("he-IL")}
                        {(() => {
                          let count = 0;
                          let cur = new Date(form.dueDate);
                          let end: Date | null = null;
                          if (linkedLeaseId && !continueAfterLease) {
                            const l = leases.find((x) => x.id === linkedLeaseId);
                            if (l) end = new Date(l.endDate);
                          }
                          if (recurringEndDate) end = new Date(recurringEndDate);
                          while (count < 60) {
                            if (end && cur > end) break;
                            count++;
                            const next = new Date(cur);
                            next.setMonth(next.getMonth() + recurringFreq);
                            cur = next;
                            if (!end && count >= 24) break;
                          }
                          return ` · סה"כ ${count} תזכורות`;
                        })()}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "שומר..." : recurring ? "צור תזכורות" : "שמור"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50">
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Relevant tasks */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <span className="inline-block w-1 h-4 rounded-full bg-gradient-to-b from-pink-400 to-pink-600" />
          <h2 className="font-semibold text-gray-600 text-sm">רלוונטיות</h2>
          {overdueCount > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">{overdueCount} פג מועד</span>
          )}
          <span className="text-xs text-gray-400">({relevant.length})</span>
        </div>
        {relevant.length === 0 ? (
          <div className="bg-white rounded-xl py-10 text-center space-y-2 shadow-sm">
            <div className="text-3xl">✅</div>
            <p className="text-gray-500 font-medium text-sm">אין תזכורות רלוונטיות להיום</p>
          </div>
        ) : (
          relevant.map((t) => <TaskRow key={t.id} t={t} isDone={false} />)
        )}
      </div>

      {/* Future tasks */}
      <div className="space-y-2">
        <button
          onClick={() => setShowFuture((v) => !v)}
          className="w-full flex items-center justify-between px-1 py-0.5"
        >
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-600 text-sm">עתידיות</h2>
            <span className="text-xs text-gray-400">({future.length})</span>
          </div>
          <span className="text-gray-400 text-xs">{showFuture ? "▲" : "▼"}</span>
        </button>
        {showFuture && (
          future.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-gray-400 text-sm">אין תזכורות עתידיות</p>
            </div>
          ) : (
            future.map((t) => <TaskRow key={t.id} t={t} isDone={false} />)
          )
        )}
      </div>

      {/* Done tasks */}
      {done.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowDone((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-emerald-700/5 transition-colors hover:from-emerald-500/20"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">✅</span>
              <h2 className="font-bold text-sm text-emerald-300">הושלמו</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                {done.length}
              </span>
            </div>
            <span className="text-sm font-semibold text-emerald-400">
              {showDone ? "סגור ▲" : "הצג ▼"}
            </span>
          </button>
          {showDone && (
            <div className="space-y-2">
              {done.map((t) => <TaskRow key={t.id} t={t} isDone={true} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
