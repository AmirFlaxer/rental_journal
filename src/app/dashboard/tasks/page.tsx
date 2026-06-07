"use client";

import { useEffect, useState } from "react";
import { DateInput } from "@/components/date-input";

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

const CATEGORIES = ["Insurance", "Rent Collection", "Lease Renewal", "Maintenance", "Tax", "Gas", "Water", "Electricity", "Municipal Tax", "Other"];

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

/** יוצר תזכורות שק וירטואליות מחוזים פעילים */
function generateCheckReminders(leases: Lease[], dbTasks: Task[]): Task[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const virtual: Task[] = [];

  // בנה מפה leaseId → propertyId לצורך dedup בין חוזים של אותו נכס
  const leaseToProperty = new Map(leases.map((l) => [l.id, l.properties?.id ?? l.id]));

  // חודשים שכבר מכוסים ע"י משימת DB (לפי נכס+חודש)
  const coveredPropertyMonths = new Set<string>();
  for (const t of dbTasks) {
    if (t.category === "Rent Collection" && t.relatedEntityType === "lease" && t.relatedEntityId) {
      const propId = leaseToProperty.get(t.relatedEntityId);
      if (propId) coveredPropertyMonths.add(`${propId}-${t.dueDate.slice(0, 7)}`);
    }
  }

  for (const lease of leases) {
    const pm = lease.paymentMethod?.toLowerCase();
    if (lease.status === "ended" || lease.status === "paused") continue;
    if (pm && pm !== "check" && pm !== "checks") continue;
    const propId = lease.properties?.id;
    if (!propId) continue;

    const start = new Date(lease.startDate);
    const end = new Date(lease.endDate);
    const startDay = start.getDate();
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);

    while (true) {
      if (cur > new Date(end.getFullYear(), end.getMonth(), 1)) break;
      const year = cur.getFullYear();
      const month = cur.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      const day = Math.min(startDay, lastDay);
      const paymentDue = new Date(year, month, day);

      if (paymentDue >= today) {
        const reminderDate = new Date(paymentDue);
        reminderDate.setDate(reminderDate.getDate() - 1);
        const ry = reminderDate.getFullYear();
        const rm = String(reminderDate.getMonth() + 1).padStart(2, "0");
        const rd = String(reminderDate.getDate()).padStart(2, "0");
        const dueDateStr = `${ry}-${rm}-${rd}`;
        const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
        const propertyMonthKey = `${propId}-${monthKey}`;

        if (!coveredPropertyMonths.has(propertyMonthKey)) {
          const monthLabel = paymentDue.toLocaleDateString("he-IL", { month: "long", year: "numeric" });
          const propertyLabel = lease.properties?.title ?? "נכס";
          virtual.push({
            id: `virtual-check-${lease.id}-${monthKey}`,
            title: `הפקדת שק שכ"ד — ${propertyLabel} — ${monthLabel}`,
            category: "Rent Collection",
            dueDate: dueDateStr,
            priority: "normal",
            relatedEntityType: "lease",
            relatedEntityId: lease.id,
            isVirtual: true,
          });
          coveredPropertyMonths.add(propertyMonthKey);
        }
      }
      cur.setMonth(cur.getMonth() + 1);
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
  const [dbTasks, setDbTasks] = useState<Task[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    Promise.all([
      fetch("/api/tasks").then((r) => r.json()),
      fetch("/api/leases").then((r) => r.json()),
    ]).then(([t, l]) => {
      if (!Array.isArray(t)) { setLoading(false); return; }
      if (Array.isArray(l)) setLeases(l);

      // מחק כפילויות חוזה+חודש מה-DB (שנוצרו בבאג הקודם)
      const seen = new Map<string, Task>();
      const toDelete: string[] = [];
      for (const task of t as Task[]) {
        if (task.category === "Rent Collection" && task.relatedEntityType === "lease" && task.relatedEntityId) {
          const key = `${task.relatedEntityId}-${task.dueDate.slice(0, 7)}`;
          if (seen.has(key)) {
            // שמור את זה שהושלם, מחק את האחר
            const prev = seen.get(key)!;
            if (task.completedAt && !prev.completedAt) {
              toDelete.push(prev.id);
              seen.set(key, task);
            } else {
              toDelete.push(task.id);
            }
          } else {
            seen.set(key, task);
          }
        }
      }
      // מחק כפילויות ברקע
      toDelete.forEach((id) => fetch(`/api/tasks/${id}`, { method: "DELETE" }));
      const cleanedTasks = (t as Task[]).filter((task) => !toDelete.includes(task.id));
      setDbTasks(cleanedTasks);
    }).finally(() => setLoading(false));
  }, []);

  const pendingDb = dbTasks.filter((t) => !t.completedAt);
  const done = dbTasks.filter((t) => t.completedAt);

  const virtualCheck = generateCheckReminders(leases, dbTasks);

  // כל המשימות הפתוחות: DB + וירטואליות, עם ביטול כפילויות לפי נכס+חודש
  const leaseToPropertyId = new Map(leases.map((l) => [l.id, l.properties?.id ?? l.id]));
  const dedupedPending: Task[] = [];
  const seenPropertyMonth = new Set<string>();
  for (const t of [...pendingDb, ...virtualCheck].sort((a, b) => a.dueDate.localeCompare(b.dueDate))) {
    if (t.category === "Rent Collection" && t.relatedEntityType === "lease" && t.relatedEntityId) {
      const propId = leaseToPropertyId.get(t.relatedEntityId) ?? t.relatedEntityId;
      const key = `${propId}-${t.dueDate.slice(0, 7)}`;
      if (seenPropertyMonth.has(key)) continue;
      seenPropertyMonth.add(key);
    }
    dedupedPending.push(t);
  }
  const allPending = dedupedPending;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const relevant = allPending.filter((t) => isRelevant(t));
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
        setDbTasks((prev) => [data, ...prev]);
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
        setDbTasks((prev) => [...created, ...prev]);
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
    if (t.isVirtual) {
      // צור רשומת DB תחילה (ללא completedAt — schema לא מכיל שדה זה)
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
      if (!createRes.ok) return;
      const created = await createRes.json();
      // סמן כהושלם
      const completeRes = await fetch(`/api/tasks/${created.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedAt: new Date().toISOString() }),
      });
      if (completeRes.ok) {
        const completed = await completeRes.json();
        setDbTasks((prev) => [completed, ...prev]);
      }
      return;
    }
    const res = await fetch(`/api/tasks/${t.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completedAt: new Date().toISOString() }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDbTasks((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
    }
  };

  const reopen = async (id: string) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completedAt: null }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDbTasks((prev) => prev.map((x) => (x.id === id ? updated : x)));
    }
  };

  const remove = async (t: Task) => {
    if (t.isVirtual) return; // וירטואלי — אין מה למחוק
    await fetch(`/api/tasks/${t.id}`, { method: "DELETE" });
    setDbTasks((prev) => prev.filter((x) => x.id !== t.id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
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
    const propLite  = propColors?.lite ?? "#f1f5f9";
    const catBg = CAT_BG[t.category] ?? "#f3f4f6";
    const catFg = CAT_FG[t.category] ?? "#374151";
    return (
      <div
        className={`rounded-xl flex items-center gap-3 px-4 py-3.5 shadow-sm border border-gray-100 transition-opacity ${isDone ? "opacity-50" : ""}`}
        style={{
          background: isDone
            ? "#f9fafb"
            : `linear-gradient(to left, ${propDark}, ${propColor} 45%, ${propLite})`,
        }}
      >
        {/* Complete / Undo button */}
        {!isDone ? (
          <button
            onClick={() => complete(t)}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg font-bold text-sm text-white whitespace-nowrap"
            style={{ background: "#16a34a" }}
          >
            בוצע
          </button>
        ) : (
          <button
            onClick={() => reopen(t.id)}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg font-semibold text-sm whitespace-nowrap border"
            style={{ background: "#f0fdf4", color: "#166534", borderColor: "#86efac" }}
          >
            בטל
          </button>
        )}

        {/* Category icon — larger, colored bg */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm"
          style={{ background: catBg }}
        >
          {CAT_ICON[t.category] || "📌"}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-base leading-tight ${isDone ? "line-through text-gray-400" : "text-white"}`}>
            {t.title}
          </p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={isDone
                ? { background: catBg, color: catFg }
                : { background: "rgba(255,255,255,0.25)", color: "white" }
              }
            >
              {CAT_HE[t.category]}
            </span>
            {propertyName && (
              <span
                className="text-xs font-bold"
                style={{ color: isDone ? "#94a3b8" : "rgba(255,255,255,0.9)" }}
              >
                {propertyName}
              </span>
            )}
            {t.description && (
              <span className="text-xs" style={{ color: isDone ? "#9ca3af" : "rgba(255,255,255,0.7)" }}>
                {t.description}
              </span>
            )}
            {t.isVirtual && (
              <span className="text-xs" style={{ color: isDone ? "#9ca3af" : "rgba(255,255,255,0.6)" }}>
                אוטומטי
              </span>
            )}
          </div>
        </div>

        {/* Due date */}
        <div className="text-left shrink-0">
          <p className={`font-bold text-sm ${isOverdue ? "text-red-200" : isDone ? "text-gray-400" : "text-white"}`}>
            {isOverdue && "⚠ "}{dueLabel}
          </p>
        </div>

        {/* Priority badge */}
        {(() => {
          const liveBg =
            t.priority === "high"   ? "#ef4444" :
            t.priority === "normal" ? "rgba(255,255,255,0.22)" :
                                      "rgba(255,255,255,0.1)";
          const liveFg =
            t.priority === "high"   ? "white" :
            t.priority === "normal" ? "white" :
                                      "rgba(255,255,255,0.65)";
          return (
            <span
              className="text-xs px-2.5 py-1 rounded-lg font-bold flex-shrink-0"
              style={isDone
                ? { background: PRIORITY_BG[t.priority] ?? "#f1f5f9", color: PRIORITY_FG[t.priority] ?? "#475569" }
                : { background: liveBg, color: liveFg }
              }
            >
              {PRIORITY_HE[t.priority]}
            </span>
          );
        })()}

        {/* Delete */}
        {!t.isVirtual && (
          <button
            onClick={() => remove(t)}
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-base transition-colors"
            style={isDone
              ? { background: "#f3f4f6", color: "#9ca3af" }
              : { background: "rgba(0,0,0,0.25)", color: "white" }
            }
          >
            🗑
          </button>
        )}
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
