"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { PhoneInput } from "@/components/phone-input";
import { formatPhone } from "@/lib/phone";

export default function EditTenantPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };

  const [isFetching, setIsFetching] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [leasePropertyId, setLeasePropertyId] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [idNumber, setIdNumber] = useState("");

  useEffect(() => {
    fetch(`/api/tenants/${id}`)
      .then((r) => { if (!r.ok) throw new Error("שגיאה בטעינת השוכר"); return r.json(); })
      .then((tenant) => {
        setFirstName(tenant.firstName || "");
        setLastName(tenant.lastName || "");
        setEmail(tenant.email || "");
        setPhone(formatPhone(tenant.phone) || "");
        setIdNumber(tenant.idNumber || "");
        // Find property to redirect back
        if (tenant.leases?.length > 0) {
          setLeasePropertyId(tenant.leases[0].propertyId || "");
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setIsFetching(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tenants/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email: email || undefined,
          phone: phone || undefined,
          idNumber: idNumber || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "שגיאה בשמירת פרטי השוכר");
      }
      if (leasePropertyId) {
        router.push(`/dashboard/properties/${leasePropertyId}`);
      } else {
        router.back();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "אירעה שגיאה");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--bg-base)" }}>
        <p style={{ color: "var(--text-2)" }}>טוען...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-2xl mx-auto px-4 py-5 sm:px-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-1)" }}>עריכת פרטי שוכר</h1>
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2 rounded-lg font-semibold text-sm"
            style={{ background: "var(--bg-elevated)", color: "var(--text-2)" }}>
            ביטול
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6">
        {error && (
          <div className="mb-4 p-4 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="rounded-xl p-6 space-y-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-lg font-bold mb-2" style={{ color: "var(--text-1)" }}>פרטים אישיים</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text-2)" }}>שם פרטי *</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-1)" }} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text-2)" }}>שם משפחה *</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} required
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-1)" }} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text-2)" }}>טלפון</label>
                <PhoneInput value={phone} onChange={setPhone}
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-1)" }}
                  placeholder="052-123 4567" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text-2)" }}>תעודת זהות</label>
                <input value={idNumber} onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric" maxLength={9}
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-1)" }}
                  placeholder="9 ספרות" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-1" style={{ color: "var(--text-2)" }}>אימייל</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-1)" }}
                  placeholder="example@email.com" dir="ltr" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button type="submit" disabled={isLoading}
              className="px-6 py-2 rounded-lg font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--accent)" }}>
              {isLoading ? "שומר..." : "שמור שינויים"}
            </button>
            <button type="button" onClick={() => router.back()}
              className="px-6 py-2 rounded-lg font-semibold"
              style={{ background: "var(--bg-elevated)", color: "var(--text-2)" }}>
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
