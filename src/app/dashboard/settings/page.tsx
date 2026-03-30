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

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwError, setPwError] = useState("");

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
