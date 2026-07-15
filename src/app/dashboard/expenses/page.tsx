"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, queryKeys } from "@/lib/api-client";
import { DateInput } from "@/components/date-input";
import { NumberInput } from "@/components/number-input";
import { Icon } from "@/components/Icon";
import type { IconName } from "@/lib/icons";

const CAT_HE: Record<string, string> = {
  Maintenance: "תחזוקה",
  Insurance: "ביטוח",
  Tax: "מס",
  Utilities: "שירותים",
  "Professional Fees": 'שכ"ט',
  Other: "אחר",
};

const CAT_ICON: Record<string, IconName> = {
  Maintenance: "maintenance",
  Insurance: "insurance",
  Tax: "tax",
  Utilities: "electricity",
  "Professional Fees": "professionalFees",
  Other: "other",
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
  vendor_name?: string;
  notes?: string;
  recurring: boolean;
  recurring_freq?: string;
  paid_by: string;
  properties: { id: string; title: string; city: string };
}

interface Property {
  id: string;
  title: string;
  city: string;
}

const CATEGORIES = ["Maintenance", "Insurance", "Tax", "Utilities", "Professional Fees", "Other"];

const emptyForm = () => ({
  property_id: "",
  category: "Maintenance",
  description: "",
  amount: "",
  vendor_name: "",
  notes: "",
  date: new Date().toISOString().split("T")[0],
  recurring: false,
  recurring_freq: "monthly",
  paid_by: "landlord",
});

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState("");
  const [filterProp, setFilterProp] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const {
    data: expenses = [],
    isLoading: expensesLoading,
    isError: expensesError,
    refetch: refetchExpenses,
  } = useQuery({
    queryKey: queryKeys.expenses,
    queryFn: () => apiGet<Expense[]>("/api/expenses"),
  });

  const {
    data: properties = [],
    isLoading: propertiesLoading,
    isError: propertiesError,
    refetch: refetchProperties,
  } = useQuery({
    queryKey: queryKeys.properties,
    queryFn: () => apiGet<Property[]>("/api/properties"),
  });

  const loading = expensesLoading || propertiesLoading;
  const loadError = expensesError || propertiesError;

  const saveMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string | null; body: Record<string, unknown> }) => {
      const res = await fetch(id ? `/api/expenses/${id}` : "/api/expenses", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses });
    },
    onSettled: () => setConfirmDeleteId(null),
  });

  const availableYears = Array.from(
    new Set(expenses.map((e) => new Date(e.date).getFullYear()))
  ).sort((a, b) => b - a);

  const filtered = expenses.filter((e) => {
    if (filterCat && e.category !== filterCat) return false;
    if (filterProp && e.properties?.id !== filterProp) return false;
    if (filterYear && new Date(e.date).getFullYear() !== parseInt(filterYear)) return false;
    if (search) {
      const q = search.toLowerCase();
      const text = `${e.description} ${e.vendor_name ?? ""} ${e.properties?.title ?? ""}`.toLowerCase();
      if (!text.includes(q)) return false;
    }
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
      property_id: e.properties?.id ?? "",
      category: e.category,
      description: e.description,
      amount: String(e.amount),
      vendor_name: e.vendor_name ?? "",
      notes: e.notes ?? "",
      date: e.date.slice(0, 10),
      recurring: e.recurring,
      recurring_freq: e.recurring_freq ?? "monthly",
      paid_by: e.paid_by ?? "landlord",
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
    try {
      const body = {
        property_id: form.property_id,
        category: form.category,
        description: form.description,
        amount: parseFloat(form.amount),
        vendor_name: form.vendor_name || undefined,
        notes: form.notes || undefined,
        date: form.date,
        recurring: form.recurring,
        recurring_freq: form.recurring ? form.recurring_freq : undefined,
        paid_by: form.paid_by,
      };
      await saveMutation.mutateAsync({ id: editingId, body });
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <p className="text-gray-500 font-medium">שגיאה בטעינת הנתונים</p>
        <button
          onClick={() => { refetchExpenses(); refetchProperties(); }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2.5">
            <span className="inline-block w-1.5 h-7 rounded-full tick-accent" />
            הוצאות
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">מעקב הוצאות לכל הנכסים</p>
        </div>
        <button onClick={openNew} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700">
          + הוצאה חדשה
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לפי תיאור, ספק, נכס..."
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white min-w-[200px]"
        />
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
        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white">
          <option value="">כל השנים</option>
          {availableYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        {(filterCat || filterProp || filterYear) && (
          <button onClick={() => { setFilterCat(""); setFilterProp(""); setFilterYear(""); }}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">נקה סינון <Icon name="cancel" size={14} /></button>
        )}
        <div className="mr-auto px-3.5 py-1.5 bg-gradient-to-br from-rose-500 to-rose-700 text-white rounded-lg text-sm font-bold drop-shadow-sm">
          סה״כ: ₪{total.toLocaleString()}
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{editingId ? "עריכת הוצאה" : "הוצאה חדשה"}</h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600"><Icon name="cancel" size={18} /></button>
            </div>
            {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">נכס *</label>
                <select value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })}
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
                  <input type="text" value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="שם הספק" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">שולם על ידי</label>
                  <select value={form.paid_by} onChange={(e) => setForm({ ...form, paid_by: e.target.value })}
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
                  <select value={form.recurring_freq} onChange={(e) => setForm({ ...form, recurring_freq: e.target.value })}
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
                <button type="submit" disabled={saveMutation.isPending}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50">
                  {saveMutation.isPending ? "שומר..." : editingId ? "עדכן הוצאה" : "שמור הוצאה"}
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
            <div className="flex justify-center"><Icon name="expenses" size={36} className="text-gray-300" /></div>
            <p className="text-gray-500 font-medium">אין הוצאות</p>
            <button onClick={openNew} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700">
              + הוסף הוצאה ראשונה
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((e) => {
              const isDeleting = deleteMutation.isPending && deleteMutation.variables === e.id;
              return (
                <div key={e.id} className="px-5 py-4 hover:bg-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-rose-500/25 to-rose-700/15 ring-1 ring-rose-500/30 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                      <Icon name={CAT_ICON[e.category] ?? "other"} size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{e.description}</p>
                      <p className="text-xs text-gray-400">
                        {e.properties?.title} · {CAT_HE[e.category]}
                        {e.vendor_name && ` · ${e.vendor_name}`}
                        {e.paid_by === "tenant" && " · שוכר"}
                        {e.recurring && ` · חוזרת ${e.recurring_freq ? FREQ_HE[e.recurring_freq] || e.recurring_freq : ""}`}
                      </p>
                      {e.notes && <p className="text-xs text-gray-500 mt-0.5 truncate flex items-center gap-1"><Icon name="note" size={12} /> {e.notes}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-rose-700">₪{e.amount.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">{new Date(e.date).toLocaleDateString("he-IL")}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => openEdit(e)}
                        className="px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Icon name="edit" size={16} />
                      </button>
                      {confirmDeleteId === e.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(e.id)} disabled={isDeleting}
                            className="px-2 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 disabled:opacity-50">
                            {isDeleting ? "..." : "מחק"}
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold">
                            ביטול
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(e.id)}
                          className="px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Icon name="delete" size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
