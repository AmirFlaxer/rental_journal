"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api-client";

export default function MaintenancePage() {
  const queryClient = useQueryClient();

  const cleanupTasksMutation = useMutation({
    mutationFn: async () => {
      const [tasksRes, leasesRes] = await Promise.all([
        fetch("/api/tasks").then((r) => r.json()),
        fetch("/api/leases").then((r) => r.json()),
      ]);
      if (!Array.isArray(tasksRes) || !Array.isArray(leasesRes)) throw new Error("שגיאה בטעינת נתונים");

      const leaseMap = new Map((leasesRes as { id: string; start_date: string }[]).map((l) => [l.id, l]));
      const toDelete: string[] = [];
      const seen = new Map<string, string>();

      for (const task of tasksRes as { id: string; category: string; related_entity_type?: string; related_entity_id?: string; due_date: string; completed_at?: string }[]) {
        if (task.category !== "Rent Collection" || task.related_entity_type !== "lease" || !task.related_entity_id) continue;

        if (!leaseMap.has(task.related_entity_id)) {
          toDelete.push(task.id);
          continue;
        }

        const lease = leaseMap.get(task.related_entity_id)!;
        const expectedDay = parseInt((lease.start_date ?? "").slice(8, 10));
        const taskDay = parseInt((task.due_date ?? "").slice(8, 10));
        if (!task.completed_at && expectedDay > 0 && taskDay !== expectedDay) {
          toDelete.push(task.id);
          continue;
        }

        const key = `${task.related_entity_id}-${task.due_date.slice(0, 7)}`;
        if (seen.has(key)) {
          const prevId = seen.get(key)!;
          const prevTask = (tasksRes as { id: string; completed_at?: string }[]).find((t) => t.id === prevId);
          if (task.completed_at && !prevTask?.completed_at) {
            toDelete.push(prevId);
            seen.set(key, task.id);
          } else {
            toDelete.push(task.id);
          }
        } else {
          seen.set(key, task.id);
        }
      }

      await Promise.all(toDelete.map((id) => fetch(`/api/tasks/${id}`, { method: "DELETE" })));
      return { deleted: toDelete.length, label: "משימות תזכורת שק יתומות/כפולות/שגויות" };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    },
  });

  const cleanupLeasesMutation = useMutation({
    mutationFn: async () => {
      const [leasesRes, propsRes] = await Promise.all([
        fetch("/api/leases").then((r) => r.json()),
        fetch("/api/properties").then((r) => r.json()),
      ]);
      if (!Array.isArray(leasesRes) || !Array.isArray(propsRes)) throw new Error("שגיאה");
      const propIds = new Set((propsRes as { id: string }[]).map((p) => p.id));
      const orphans = (leasesRes as { id: string; properties?: { id: string } }[])
        .filter((l) => !l.properties?.id || !propIds.has(l.properties.id));
      await Promise.all(orphans.map((l) => fetch(`/api/leases/${l.id}`, { method: "DELETE" })));
      return { deleted: orphans.length, label: "חוזים יתומים (ללא נכס)" };
    },
    onSuccess: () => {
      // מחיקת חוזים יתומים משפיעה גם על משימות/תזכורות שהיו קשורות אליהם
      queryClient.invalidateQueries({ queryKey: queryKeys.leases });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
    },
  });

  const leaseAuditMutation = useMutation({
    mutationFn: async () => {
      const [leasesRes, propsRes] = await Promise.all([
        fetch("/api/leases").then((r) => r.json()),
        fetch("/api/properties").then((r) => r.json()),
      ]);
      if (!Array.isArray(leasesRes) || !Array.isArray(propsRes)) throw new Error("שגיאה");

      const today = new Date(); today.setHours(0, 0, 0, 0);
      const isActive = (l: { start_date: string; end_date: string; status?: string | null }) => {
        if (l.status === "ended" || l.status === "paused") return false;
        return new Date(l.start_date) <= today && new Date(l.end_date) >= today;
      };

      type Lease = { id: string; start_date: string; end_date: string; status?: string | null; properties?: { id: string; title: string } };
      const activeByProp = new Map<string, Lease[]>();
      for (const l of leasesRes as Lease[]) {
        if (!isActive(l) || !l.properties?.id) continue;
        const arr = activeByProp.get(l.properties.id) ?? [];
        arr.push(l);
        activeByProp.set(l.properties.id, arr);
      }

      const issues: string[] = [];
      for (const [, leases] of activeByProp) {
        if (leases.length > 1) {
          const title = leases[0].properties?.title ?? "נכס";
          issues.push(`${title}: ${leases.length} חוזים פעילים במקביל`);
        }
      }

      const propIds = new Set((propsRes as { id: string }[]).map((p) => p.id));
      const orphanCount = (leasesRes as Lease[]).filter((l) => !l.properties?.id || !propIds.has(l.properties.id)).length;
      if (orphanCount > 0) issues.push(`${orphanCount} חוזים ללא נכס (יתומים)`);

      return { issues: issues.length ? issues : ["לא נמצאו בעיות"] };
    },
  });

  const cleanupResult = cleanupTasksMutation.isError
    ? { deleted: -1, label: "שגיאה בניקוי" }
    : cleanupTasksMutation.data ?? null;

  const leaseCleanupResult = cleanupLeasesMutation.isError
    ? { deleted: -1, label: "שגיאה בניקוי" }
    : cleanupLeasesMutation.data ?? null;

  const leaseAuditResult = leaseAuditMutation.isError
    ? { issues: ["שגיאה בבדיקה"] }
    : leaseAuditMutation.data ?? null;

  const actions = [
    {
      title: "ניקוי תזכורות שק",
      desc: "מוחק תזכורות 'הפקדת שק' יתומות, כפולות, או עם תאריך שגוי",
      icon: "🧹",
      onClick: () => cleanupTasksMutation.mutate(),
      running: cleanupTasksMutation.isPending,
      result: cleanupResult,
      btnLabel: "נקה",
      color: "orange",
    },
    {
      title: "ניקוי חוזים יתומים",
      desc: "מוחק חוזים שהנכס שלהם נמחק",
      icon: "📄",
      onClick: () => cleanupLeasesMutation.mutate(),
      running: cleanupLeasesMutation.isPending,
      result: leaseCleanupResult,
      btnLabel: "נקה",
      color: "orange",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/dashboard" className="hover:text-gray-600">לוח בקרה</Link>
            <span>/</span>
            <span className="text-gray-600">תחזוקה</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">תחזוקה</h1>
          <p className="text-sm text-gray-500 mt-0.5">ניקוי נתונים מיותרים שנצברו</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {actions.map((a) => (
          <div key={a.title} className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{a.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{a.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={a.onClick}
                disabled={a.running}
                className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-50 transition-colors"
              >
                {a.running ? "מנקה..." : a.btnLabel}
              </button>
            </div>
            {a.result && (
              <p className={`text-sm font-medium mt-2 ${a.result.deleted < 0 ? "text-red-600" : "text-green-700"}`}>
                {a.result.deleted < 0 ? a.result.label : a.result.deleted === 0 ? "לא נמצאו פריטים לניקוי" : `נמחקו ${a.result.deleted} ${a.result.label}`}
              </p>
            )}
          </div>
        ))}

        {/* Audit */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔍</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">בדיקת תקינות חוזים</p>
                <p className="text-xs text-gray-500 mt-0.5">מאתר נכסים עם יותר מחוזה פעיל אחד במקביל</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => leaseAuditMutation.mutate()}
              disabled={leaseAuditMutation.isPending}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
              {leaseAuditMutation.isPending ? "בודק..." : "בדוק"}
            </button>
          </div>
          {leaseAuditResult && (
            <div className={`text-sm rounded-xl p-3 mt-2 space-y-1 ${leaseAuditResult.issues[0] === "לא נמצאו בעיות" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-800"}`}>
              {leaseAuditResult.issues.map((issue, i) => (
                <p key={i} className="font-medium">{leaseAuditResult.issues[0] === "לא נמצאו בעיות" ? "✓ " : "⚠ "}{issue}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
