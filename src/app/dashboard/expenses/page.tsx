"use client";

import { useEffect, useState } from "react";
import { DateInput } from "@/components/date-input";
import { NumberInput } from "@/components/number-input";

const CAT_HE: Record<string, string> = {
  Maintenance: "תחזוקה",
  Insurance: "ביטוח",
  Tax: "מס",
  Utilities: "שירותים",
  "Professional Fees": 'שכ"ט',
  Other: "אחר",
};

const CAT_ICON: Record<string, string> = {
  Maintenance: "🔧",
  Insurance: "🛡️",
  Tax: "📋",
  Utilities: "💡",
  "Professional Fees": "👔",
  Other: "📦",
};

const FREQ_HE: Record<string, string> = {
  monthly: "חודשי",
  "bi-monthly": "דו-חודשי",
  quarterly: "רבעוני",
  yearly: "שנתי",
};

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  vendorName?: string;
  notes?: string;
  recurring: boolean;
  recurringFreq?: string;
  paidBy: string;
  properties: { id: string; title: string; city: string };
}

interface Property {
  id: string;
  title: string;
  city: string;
}

const CATEGORIES = ["Maintenance", "Insurance", "Tax", "Utilities", "Professional Fees", "Other"];

const emptyForm = () => ({
  propertyId: "",
  category: "Maintenance",
  description: "",
  amount: "",
  vendorName: "",
  notes: "",
  date: new Date().toISOString().split("T")[0],
  recurring: false,
  recurringFreq: "monthly",
  paidBy: "landlord",
});

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState("");
  const [filterProp, setFilterProp] = useState("");
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/expenses").then((r) => r.json()),
      fetch("/api/properties").then((r) => r.json()),
    ]).then(([exp, props]) => {
      if (Array.isArray(exp)) setExpenses(exp);
      if (Array.isArray(props)) setProperties(props);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = expenses.filter((e) => {
    if (filterCat && e.category !== filterCat) return false;
    if (filterProp && e.properties?.id !== filterProp) return false;
    return true;
  });

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setError("");
    setShowForm(true);
  };

  const openEdit = (e: Expense) => {
    setEditingId(e.id);
    setForm({
      propertyId: e.properties?.id ?? "",
      category: e.category,
      description: e.description,
      amount: String(e.amount),
      vendorName: e.vendorName ?? "",
      notes: e.notes ?? "",
      date: e.date.slice(0, 10),
      recurring: e.recurring,
      recurringFreq: e.recurringFreq ?? "monthly",
      paidBy: e.paidBy ?? "landlord",
    });
    setError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
    setError("");
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError("");
    setSaving(true);
    try {
      const body = {
        propertyId: form.propertyId,
        category: form.category,
        description: form.description,
        amount: parseFloat(form.amount),
        vendorName: form.vendorName || undefined,
        notes: form.notes || undefined,
        date: form.date,
        recurring: form.recurring,
        recurringFreq: form.recurring ? form.recurringFreq : undefined,
        paidBy: form.paidBy,
      };

      if (editingId) {
        const res = await fetch(`/api/expenses/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "שגיאה");
        setExpenses((prev) => prev.map((e) => (e.id === editingId ? data : e)));
      } else {
        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "שגיאה");
        setExpenses((prev) => [data, ...prev]);
      }
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">הוצאות</h1>
          <p className="text-sm text-gray-500 mt-0.5">מעקב הוצאות לכל הנכסים</p>
        </div>
        <button onClick={openNew} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700">
          + הוצאה חדשה
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white">
          <option value="">כל הקטגוריות</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{CAT_HE[c]}</option>
          ))}
        </select>
        <select value={filterProp} onChange={(e) => setFilterProp(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white">
          <option value="">כל הנכסים</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
        {(filterCat || filterProp) && (
          <button onClick={() => { setFilterCat(""); setFilterProp(""); }}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">נקה סינון ✕</button>
        )}
        <div className="mr-auto px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-sm font-semibold">
          סה״כ: ₪{total.toLocaleString()}
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? "עריכת הוצאה" : "הוצאה חדשה"}</h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">נכס *</label>
                <select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
                  required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="">בחר נכס...</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.title} — {p.city}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">קטגוריה *</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{CAT_HE[c]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">תאריך *</label>
                  <DateInput value={form.date} onChange={(v) => setForm({ ...form, date: v })} required className="w-full" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">תיאור *</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="תיאור ההוצאה" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">סכום (₪) *</label>
                  <NumberInput
                    value={form.amount !== "" ? parseFloat(form.amount) : undefined}
                    onChange={(v) => setForm({ ...form, amount: v !== undefined ? String(v) : "" })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">ספק</label>
                  <input type="text" value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="שם הספק" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">שולם על ידי</label>
                  <select value={form.paidBy} onChange={(e) => setForm({ ...form, paidBy: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="landlord">בעל הדירה</option>
                    <option value="tenant">שוכר</option>
                  </select>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.recurring}
                      onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
                      className="w-4 h-4 rounded" />
                    <span className="text-sm text-gray-700">הוצאה חוזרת</span>
                  </label>
                </div>
              </div>
              {form.recurring && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">תדירות חזרה</label>
                  <select value={form.recurringFreq} onChange={(e) => setForm({ ...form, recurringFreq: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="monthly">חודשי</option>
                    <option value="bi-monthly">דו-חודשי</option>
                    <option value="quarterly">רבעוני</option>
                    <option value="yearly">שנתי</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">הערות</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                  placeholder="למשל: אחריות 12 חודשים, לפנות לאבי 050-0000000" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? "שומר..." : editingId ? "עדכן הוצאה" : "שמור הוצאה"}
                </button>
                <button type="button" onClick={closeForm}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50">
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expenses list */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="text-4xl">💸</div>
            <p className="text-gray-500 font-medium">אין הוצאות</p>
            <button onClick={openNew} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700">
              + הוסף הוצאה ראשונה
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((e) => (
              <div key={e.id} className="px-5 py-4 hover:bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                    {CAT_ICON[e.category] || "📦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{e.description}</p>
                    <p className="text-xs text-gray-400">
                      {e.properties?.title} · {CAT_HE[e.category]}
                      {e.vendorName && ` · ${e.vendorName}`}
                      {e.paidBy === "tenant" && " · שוכר"}
                      {e.recurring && ` · חוזרת ${e.recurringFreq ? FREQ_HE[e.recurringFreq] || e.recurringFreq : ""}`}
                    </p>
                    {e.notes && <p className="text-xs text-gray-500 mt-0.5 truncate">📝 {e.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-rose-700">₪{e.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{new Date(e.date).toLocaleDateString("he-IL")}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(e)}
                      className="px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      ✏️
                    </button>
                    {confirmDeleteId === e.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(e.id)} disabled={deleting}
                          className="px-2 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 disabled:opacity-50">
                          {deleting ? "..." : "מחק"}
                        </button>
                        <button onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold">
                          ביטול
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDeleteId(e.id)}
                        className="px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
