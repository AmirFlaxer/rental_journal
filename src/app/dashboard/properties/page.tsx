"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const TYPE_HE: Record<string, string> = { Apartment: "דירה", House: "בית", Commercial: "מסחרי" };
const TYPE_ICON: Record<string, string> = { Apartment: "🏢", House: "🏠", Commercial: "🏪" };

interface Property {
  id: string;
  title: string;
  address: string;
  city: string;
  propertyType: string;
  bedrooms?: number;
  squareMeters?: number;
  leases?: { status: string; monthlyRent: number }[];
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/properties")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setProperties(data); })
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/properties/${id}`, { method: "DELETE" });
      if (res.ok) setProperties((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setDeleting(null);
      setConfirmId(null);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">הנכסים שלי</h1>
          <p className="text-sm text-gray-500 mt-0.5">{properties.length} נכסים</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/leases/import"
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50"
          >
            📥 ייבוא חוזה
          </Link>
          <Link
            href="/dashboard/properties/new"
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700"
          >
            + נכס חדש
          </Link>
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 py-20 text-center space-y-4">
          <div className="text-5xl">🏠</div>
          <p className="text-gray-500 font-medium">עדיין אין נכסים</p>
          <p className="text-sm text-gray-400">הוסף נכס או ייבא חוזה שכירות</p>
          <div className="flex gap-3 justify-center pt-2">
            <Link href="/dashboard/leases/import" className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700">
              📥 ייבוא חוזה
            </Link>
            <Link href="/dashboard/properties/new" className="px-5 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50">
              🏢 הוסף נכס
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {properties.map((p) => {
            const active = (p.leases || []).filter((l) => l.status === "active");
            const rent = active.reduce((s, l) => s + l.monthlyRent, 0);
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all">
                <Link href={`/dashboard/properties/${p.id}`} className="block">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                      {TYPE_ICON[p.propertyType] || "🏠"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{p.title}</p>
                      <p className="text-sm text-gray-400 truncate">{p.address}, {p.city}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>{TYPE_HE[p.propertyType]}</span>
                        {p.bedrooms && <span>· {p.bedrooms} חד'</span>}
                        {p.squareMeters && <span>· {p.squareMeters} מ"ר</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    {rent > 0 ? (
                      <span className="text-sm font-bold text-emerald-700">₪{rent.toLocaleString()} / חודש</span>
                    ) : (
                      <span className="text-sm text-gray-400">אין חוזה פעיל</span>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      active.length > 0 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {active.length > 0 ? `${active.length} חוזה פעיל` : "פנוי"}
                    </span>
                  </div>
                </Link>

                {/* Actions */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                  <Link href={`/dashboard/properties/${p.id}/edit`}
                    className="text-xs text-gray-400 hover:text-indigo-600 font-medium">
                    ✏️ עריכה
                  </Link>
                  {confirmId === p.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">למחוק את הנכס?</span>
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={deleting === p.id}
                        className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
                      >
                        {deleting === p.id ? "מוחק..." : "כן, מחק"}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-200"
                      >
                        ביטול
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(p.id)}
                      className="text-xs text-gray-400 hover:text-red-600 font-medium"
                    >
                      🗑️ מחיקה
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
