"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type LLMProvider = "gemini" | "anthropic" | "ollama";

const PROVIDERS: { value: LLMProvider; label: string; desc: string }[] = [
  { value: "gemini", label: "Google Gemini", desc: "חינמי · 1,500 בקשות/יום · מומלץ" },
  { value: "anthropic", label: "Anthropic Claude", desc: "בתשלום · דורש ANTHROPIC_API_KEY" },
  { value: "ollama", label: "Ollama (מקומי)", desc: "ללא עלות · רץ על המחשב שלך בלבד" },
];

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSuccess, setNameSuccess] = useState("");
  const [nameError, setNameError] = useState("");

  const [llmProvider, setLlmProvider] = useState<LLMProvider>("gemini");
  const [llmSaving, setLlmSaving] = useState(false);
  const [llmSuccess, setLlmSuccess] = useState("");
  const [llmError, setLlmError] = useState("");

  const [autoTaxEnabled, setAutoTaxEnabled] = useState(true);
  const [taxSaving, setTaxSaving] = useState(false);
  const [taxSuccess, setTaxSuccess] = useState("");
  const [taxError, setTaxError] = useState("");

  const [pushStatus, setPushStatus] = useState<"unsupported" | "denied" | "granted" | "default" | "loading">("loading");
  const [pushSaving, setPushSaving] = useState(false);
  const [pushMsg, setPushMsg] = useState("");

  const [cleanupRunning, setCleanupRunning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{ deleted: number; label: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPushStatus("unsupported");
    } else {
      setPushStatus(Notification.permission as "denied" | "granted" | "default");
    }
  }, []);

  const handleTogglePush = async () => {
    setPushMsg("");
    if (pushStatus === "granted") {
      // unsubscribe
      setPushSaving(true);
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setPushStatus("default");
        setPushMsg("ההתראות בוטלו");
      } catch {
        setPushMsg("שגיאה בביטול ההתראות");
      } finally {
        setPushSaving(false);
      }
      return;
    }

    // subscribe
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushMsg("הדפדפן אינו תומך בהתראות");
      return;
    }
    setPushSaving(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus(permission as "denied" | "default");
        setPushMsg("לא אושרה הרשאת התראות");
        return;
      }
      setPushStatus("granted");

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const keyRes = await fetch("/api/push/subscribe");
      const { publicKey } = await keyRes.json() as { publicKey: string };

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setPushMsg("התראות הופעלו בהצלחה");
    } catch (err) {
      setPushMsg(err instanceof Error ? err.message : "שגיאה בהפעלת התראות");
    } finally {
      setPushSaving(false);
    }
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? "");
        setName((data.user.user_metadata?.name as string) ?? "");
      }
    });
    fetch("/api/settings/llm-provider")
      .then((r) => r.json())
      .then((d) => { if (d.provider) setLlmProvider(d.provider as LLMProvider); });
    fetch("/api/settings/tax")
      .then((r) => r.json())
      .then((d) => { setAutoTaxEnabled(d.autoTaxEnabled !== false); });
  }, []);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError("");
    setNameSuccess("");
    if (name.trim().length < 2) {
      setNameError("השם חייב להכיל לפחות 2 תווים");
      return;
    }
    setNameSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ data: { name: name.trim() } });
      if (error) throw new Error(error.message);
      setNameSuccess("השם עודכן בהצלחה");
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "שגיאה בעדכון השם");
    } finally {
      setNameSaving(false);
    }
  };

  const handleSaveLLM = async (provider: LLMProvider) => {
    setLlmError("");
    setLlmSuccess("");
    setLlmSaving(true);
    try {
      const res = await fetch("/api/settings/llm-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (!res.ok) throw new Error("שגיאה בשמירה");
      setLlmProvider(provider);
      setLlmSuccess("הספק עודכן בהצלחה");
    } catch {
      setLlmError("שגיאה בשמירת הספק");
    } finally {
      setLlmSaving(false);
    }
  };

  const handleToggleTax = async (enabled: boolean) => {
    setTaxError("");
    setTaxSuccess("");
    setTaxSaving(true);
    try {
      const res = await fetch("/api/settings/tax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoTaxEnabled: enabled }),
      });
      if (!res.ok) throw new Error("שגיאה בשמירה");
      setAutoTaxEnabled(enabled);
      setTaxSuccess(enabled ? "חישוב מס אוטומטי הופעל" : "חישוב מס אוטומטי כובה");
    } catch {
      setTaxError("שגיאה בשמירת ההגדרה");
    } finally {
      setTaxSaving(false);
    }
  };

  const handleCleanupOrphanTasks = async () => {
    setCleanupRunning(true);
    setCleanupResult(null);
    try {
      const [tasksRes, leasesRes] = await Promise.all([
        fetch("/api/tasks").then((r) => r.json()),
        fetch("/api/leases").then((r) => r.json()),
      ]);
      if (!Array.isArray(tasksRes) || !Array.isArray(leasesRes)) throw new Error("שגיאה בטעינת נתונים");

      const leaseIds = new Set((leasesRes as { id: string }[]).map((l) => l.id));
      const toDelete: string[] = [];
      const seen = new Map<string, string>();

      for (const task of tasksRes as { id: string; category: string; relatedEntityType?: string; relatedEntityId?: string; dueDate: string; completedAt?: string }[]) {
        if (task.category !== "Rent Collection" || task.relatedEntityType !== "lease" || !task.relatedEntityId) continue;

        // יתומים — חוזה לא קיים
        if (!leaseIds.has(task.relatedEntityId)) {
          toDelete.push(task.id);
          continue;
        }

        // כפילויות — אותו חוזה+חודש
        const key = `${task.relatedEntityId}-${task.dueDate.slice(0, 7)}`;
        if (seen.has(key)) {
          const prevId = seen.get(key)!;
          const prevTask = (tasksRes as { id: string; completedAt?: string }[]).find((t) => t.id === prevId);
          if (task.completedAt && !prevTask?.completedAt) {
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
      setCleanupResult({ deleted: toDelete.length, label: "משימות תזכורת שק יתומות/כפולות" });
    } catch {
      setCleanupResult({ deleted: -1, label: "שגיאה בניקוי" });
    } finally {
      setCleanupRunning(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    if (newPassword.length < 8) {
      setPwError("הסיסמה חייבת להכיל לפחות 8 תווים");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("הסיסמאות אינן תואמות");
      return;
    }
    setPwSaving(true);
    try {
      const supabase = createClient();
      // Re-authenticate with current password first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("משתמש לא מזוהה");

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) throw new Error("הסיסמה הנוכחית שגויה");

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);

      setPwSuccess("הסיסמה עודכנה בהצלחה");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "שגיאה בעדכון הסיסמה");
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">הגדרות חשבון</h1>
        <p className="text-sm text-gray-500 mt-0.5">{email}</p>
      </div>

      {/* Name */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-base font-bold text-gray-800">שם מוצג</h2>
        <form onSubmit={handleSaveName} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">שם מלא</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="הכנס שם מלא"
            />
          </div>
          {nameError && <p className="text-sm text-red-600">{nameError}</p>}
          {nameSuccess && <p className="text-sm text-green-600">{nameSuccess}</p>}
          <button
            type="submit"
            disabled={nameSaving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {nameSaving ? "שומר..." : "עדכן שם"}
          </button>
        </form>
      </div>

      {/* AI Provider */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">ספק AI לחילוץ חוזים</h2>
          <p className="text-xs text-gray-500 mt-0.5">בחר את מנוע ה-AI לשימוש בעת חילוץ נתונים מקובץ חוזה</p>
        </div>
        <div className="space-y-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => handleSaveLLM(p.value)}
              disabled={llmSaving}
              className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-right transition-colors ${
                llmProvider === p.value
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
              }`}
            >
              <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                llmProvider === p.value ? "border-indigo-600 bg-indigo-600" : "border-gray-300"
              }`} />
              <div>
                <p className={`text-sm font-semibold ${llmProvider === p.value ? "text-indigo-700" : "text-gray-800"}`}>{p.label}</p>
                <p className="text-xs text-gray-500">{p.desc}</p>
              </div>
            </button>
          ))}
        </div>
        {llmError && <p className="text-sm text-red-600">{llmError}</p>}
        {llmSuccess && <p className="text-sm text-green-600">{llmSuccess}</p>}
      </div>

      {/* Tax settings */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">חישוב מס הכנסה אוטומטי</h2>
          <p className="text-xs text-gray-500 mt-0.5">בעת רישום תקבול שכ&quot;ד כ&quot;שולם&quot; — תיווצר הוצאת מס אוטומטית בגובה 10%</p>
        </div>
        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50">
          <div>
            <p className="text-sm font-semibold text-gray-800">מסלול 10% על תקבולים</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {autoTaxEnabled
                ? "פעיל — הוצאת מס נוצרת אוטומטית עם כל תקבול"
                : "כבוי — לא נוצרות הוצאות מס אוטומטיות"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleToggleTax(!autoTaxEnabled)}
            disabled={taxSaving}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
              autoTaxEnabled ? "bg-indigo-600" : "bg-gray-300"
            }`}
            role="switch"
            aria-checked={autoTaxEnabled}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                autoTaxEnabled ? "-translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        <p className="text-xs text-gray-400">
          בחרת במסלול אחר (מסלול רגיל / 10% בעל הכנסות)? כבה את האפשרות הזו ונהל את המס בעצמך.
        </p>
        <a href="/dashboard/reports/tax"
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl text-sm font-semibold hover:bg-orange-100 transition-colors">
          📋 פתח דוח מס שנתי
        </a>
        {taxError && <p className="text-sm text-red-600">{taxError}</p>}
        {taxSuccess && <p className="text-sm text-green-600">{taxSuccess}</p>}
      </div>

      {/* Push Notifications */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">התראות Push</h2>
          <p className="text-xs text-gray-500 mt-0.5">קבל התראה כשחוזה עומד לפוג או יש תזכורת הפקדת שק</p>
        </div>
        {pushStatus === "unsupported" ? (
          <p className="text-sm text-gray-500">הדפדפן אינו תומך בהתראות Push</p>
        ) : (
          <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50">
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {pushStatus === "granted" ? "התראות פעילות" : pushStatus === "denied" ? "התראות חסומות בדפדפן" : "התראות כבויות"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {pushStatus === "denied"
                  ? "יש לאפשר התראות ידנית בהגדרות הדפדפן"
                  : pushStatus === "granted"
                  ? "תקבל התראה ב-30 ו-7 ימים לפני סיום חוזה"
                  : "לחץ להפעלה"}
              </p>
            </div>
            {pushStatus !== "denied" && (
              <button
                type="button"
                onClick={handleTogglePush}
                disabled={pushSaving || pushStatus === "loading"}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                  pushStatus === "granted" ? "bg-indigo-600" : "bg-gray-300"
                }`}
                role="switch"
                aria-checked={pushStatus === "granted"}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                    pushStatus === "granted" ? "-translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            )}
          </div>
        )}
        {pushMsg && (
          <p className={`text-sm ${pushMsg.includes("שגיאה") || pushMsg.includes("לא") ? "text-red-600" : "text-green-600"}`}>
            {pushMsg}
          </p>
        )}
      </div>

      {/* Maintenance */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-gray-800">תחזוקה</h2>
          <p className="text-xs text-gray-500 mt-0.5">פעולות ניקוי חד-פעמיות לנתונים מיותרים שנצברו</p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50">
            <div>
              <p className="text-sm font-semibold text-gray-800">ניקוי תזכורות שק יתומות / כפולות</p>
              <p className="text-xs text-gray-500 mt-0.5">מוחק משימות "הפקדת שק" שהחוזה שלהן נמחק או שנוצרו כפולות בריצות ישנות</p>
            </div>
            <button
              type="button"
              onClick={handleCleanupOrphanTasks}
              disabled={cleanupRunning}
              className="flex-shrink-0 mr-4 px-4 py-2 rounded-xl text-sm font-semibold border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-50 transition-colors"
            >
              {cleanupRunning ? "מנקה..." : "נקה"}
            </button>
          </div>
          {cleanupResult && (
            <p className={`text-sm font-medium ${cleanupResult.deleted < 0 ? "text-red-600" : "text-green-700"}`}>
              {cleanupResult.deleted < 0
                ? cleanupResult.label
                : cleanupResult.deleted === 0
                  ? "לא נמצאו פריטים לניקוי"
                  : `נמחקו ${cleanupResult.deleted} ${cleanupResult.label}`}
            </p>
          )}
        </div>
      </div>

      {/* Password */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-base font-bold text-gray-800">שינוי סיסמה</h2>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">סיסמה נוכחית</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="הכנס סיסמה נוכחית"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">סיסמה חדשה</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="לפחות 8 תווים"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">אימות סיסמה חדשה</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="הכנס שוב את הסיסמה החדשה"
            />
          </div>
          {pwError && <p className="text-sm text-red-600">{pwError}</p>}
          {pwSuccess && <p className="text-sm text-green-600">{pwSuccess}</p>}
          <button
            type="submit"
            disabled={pwSaving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {pwSaving ? "מעדכן..." : "שנה סיסמה"}
          </button>
        </form>
      </div>
    </div>
  );
}
