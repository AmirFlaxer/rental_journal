"use client";

import { useEffect, useState } from "react";
import { DateInput } from "@/components/date-input";

const CAT_HE: Record<string, string> = {
  Insurance: "ביטוח",
  "Rent Collection": "גביית שכ״ד",
  "Lease Renewal": "חידוש חוזה",
  Maintenance: "תחזוקה",
  Tax: "מס",
  Other: "אחר",
};

const CAT_ICON: Record<string, string> = {
  Insurance: "🛡️",
  "Rent Collection": "💰",
  "Lease Renewal": "📋",
  Maintenance: "🔧",
  Tax: "📊",
  Other: "📌",
};

const PRIORITY_HE: Record<string, string> = { low: "נמוכה", normal: "רגילה", high: "גבוהה" };
const PRIORITY_COLOR: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-red-100 text-red-700",
};

const CATEGORIES = ["Insurance", "Rent Collection", "Lease Renewal", "Maintenance", "Tax", "Other"];

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
  status: string;
  paymentMethod?: string;
  properties?: { id: string; title: string };
  tenant?: { firstName: string; lastName: string };
}

/** יוצר תזכורות שק וירטואליות מחוזים פעילים */
function generateCheckReminders(leases: Lease[], dbTasks: Task[]): Task[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const virtual: Task[] = [];

  for (const lease of leases) {
    if (lease.status !== "active") continue;
    // ברירת מחדל: שקים
    if (lease.paymentMethod && lease.paymentMethod !== "checks") continue;

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
        const dueDateStr = reminderDate.toISOString().split("T")[0];
        const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

        // בדוק אם קיימת כבר משימה בDB לחוזה+חודש זה
        const existing = dbTasks.find(
          (t) =>
            t.relatedEntityType === "lease" &&
            t.relatedEntityId === lease.id &&
            t.category === "Rent Collection" &&
            t.dueDate.slice(0, 7) === dueDateStr.slice(0, 7)
        );
        if (existing) {
          cur.setMonth(cur.getMonth() + 1);
          continue;
        }

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
  const [showDone, setShowDone] = useState(false);
  const [showFuture, setShowFuture] = useState(true);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Other",
    dueDate: "",
    priority: "normal",
  });
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

  // כל המשימות הפתוחות: DB + וירטואליות, עם ביטול כפילויות לפי חוזה+חודש
  const dedupedPending: Task[] = [];
  const seenLeaseMonth = new Set<string>();
  for (const t of [...pendingDb, ...virtualCheck].sort((a, b) => a.dueDate.localeCompare(b.dueDate))) {
    if (t.category === "Rent Collection" && t.relatedEntityType === "lease" && t.relatedEntityId) {
      const key = `${t.relatedEntityId}-${t.dueDate.slice(0, 7)}`;
      if (seenLeaseMonth.has(key)) continue;
      seenLeaseMonth.add(key);
    }
    dedupedPending.push(t);
  }
  const allPending = dedupedPending;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const relevant = allPending.filter((t) => isRelevant(t));
  const future = allPending.filter((t) => !isRelevant(t));
  const overdueCount = allPending.filter((t) => new Date(t.dueDate) < today).length;

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setDbTasks((prev) => [data, ...prev]);
      setShowForm(false);
      setForm({ title: "", description: "", category: "Other", dueDate: "", priority: "normal" });
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

  const TaskRow = ({ t, isDone }: { t: Task; isDone: boolean }) => {
    const isOverdue = !isDone && new Date(t.dueDate) < today;
    const dueLabel = formatDue(t.dueDate, isOverdue);

    return (
      <div className={`flex items-center gap-4 px-5 py-4 hover:bg-slate-50 ${isDone ? "opacity-60" : ""}`}>
        <button
          onClick={() => isDone ? reopen(t.id) : complete(t)}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            isDone ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300 hover:border-emerald-400"
          }`}
        >
          {isDone && <span className="text-xs">✓</span>}
        </button>
        <div className="text-xl flex-shrink-0">{CAT_ICON[t.category] || "📌"}</div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${isDone ? "line-through text-gray-400" : "text-gray-900"}`}>{t.title}</p>
          <p className="text-xs text-gray-400">
            {CAT_HE[t.category]}
            {t.description && ` · ${t.description}`}
            {t.isVirtual && <span className="text-indigo-400"> · אוטומטי</span>}
          </p>
        </div>
        <div className="text-right text-xs shrink-0">
          <p className={`font-medium ${isOverdue ? "text-red-600" : isDone ? "text-gray-400" : "text-gray-500"}`}>
            {isOverdue && "⚠ "}{dueLabel}
          </p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_COLOR[t.priority] || "bg-gray-100 text-gray-600"}`}>
          {PRIORITY_HE[t.priority] || t.priority}
        </span>
        {!t.isVirtual && (
          <button onClick={() => remove(t)} className="text-gray-300 hover:text-red-500 text-sm">🗑</button>
        )}
      </div>
    );
  };

  const SectionHeader = ({
    title, count, badge, open, onToggle,
  }: { title: string; count: number; badge?: string; open?: boolean; onToggle?: () => void }) => (
    <div
      className={`px-5 py-3 border-b border-gray-100 flex items-center justify-between ${onToggle ? "cursor-pointer hover:bg-slate-50" : ""}`}
      onClick={onToggle}
    >
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-gray-700 text-sm">{title}</h2>
        {badge && (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">{badge}</span>
        )}
        <span className="text-xs text-gray-400">({count})</span>
      </div>
      {onToggle && <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>}
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">תזכורות</h1>
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
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
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
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{CAT_HE[c]}</option>
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
                <label className="block text-xs font-semibold text-gray-500 mb-1">הערות</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                  placeholder="הערות נוספות..."
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "שומר..." : "שמור"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50">
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Relevant tasks */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <SectionHeader
          title="רלוונטיות"
          count={relevant.length}
          badge={overdueCount > 0 ? `${overdueCount} פג מועד` : undefined}
        />
        {relevant.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <div className="text-4xl">✅</div>
            <p className="text-gray-500 font-medium">אין תזכורות רלוונטיות להיום</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {relevant.map((t) => <TaskRow key={t.id} t={t} isDone={false} />)}
          </div>
        )}
      </div>

      {/* Future tasks */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <SectionHeader
          title="עתידיות"
          count={future.length}
          open={showFuture}
          onToggle={() => setShowFuture((v) => !v)}
        />
        {showFuture && (
          future.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-gray-400 text-sm">אין תזכורות עתידיות</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {future.map((t) => <TaskRow key={t.id} t={t} isDone={false} />)}
            </div>
          )
        )}
      </div>

      {/* Done tasks */}
      {done.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <SectionHeader
            title="הושלמו"
            count={done.length}
            open={showDone}
            onToggle={() => setShowDone((v) => !v)}
          />
          {showDone && (
            <div className="divide-y divide-gray-100 border-t border-gray-100">
              {done.map((t) => <TaskRow key={t.id} t={t} isDone={true} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
