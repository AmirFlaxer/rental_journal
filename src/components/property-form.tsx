"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PropertyInput } from "@/lib/validations";
import { israeliSettlements } from "@/data/israeli-settlements";

interface PropertyFormProps {
  initialData?: PropertyInput & { id?: string };
  isEditing?: boolean;
  onSubmit?: (data: PropertyInput) => Promise<void>;
}

export function PropertyForm({
  initialData,
  isEditing = false,
  onSubmit,
}: PropertyFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<PropertyInput>(
    initialData || {
      title: "",
      description: "",
      address: "",
      city: "",
      zipCode: "",
      propertyType: "Apartment",
      bedrooms: undefined,
      bathrooms: undefined,
      squareMeters: undefined,
      floor: undefined,
      apartmentNumber: undefined,
      numBalconies: undefined,
      balconySqm: undefined,
      purchasePrice: undefined,
    }
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Autocomplete state
  const [settlementQuery, setSettlementQuery] = useState(initialData?.city || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const autocompleteRef = useRef<HTMLDivElement>(null);


  // Filter settlements as user types
  useEffect(() => {
    if (settlementQuery.length >= 1) {
      const filtered = israeliSettlements.filter((s) =>
        s.startsWith(settlementQuery)
      ).slice(0, 10);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [settlementQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSettlementSelect = (settlement: string) => {
    setSettlementQuery(settlement);
    setFormData({ ...formData, city: settlement });
    setShowSuggestions(false);
  };

  const handleSettlementInput = (value: string) => {
    setSettlementQuery(value);
    setFormData({ ...formData, city: value });
  };

  const openPostalCodeSite = () => {
    const city = formData.city || "";
    const street = formData.address || "";
    const url = `https://www.israelpost.co.il/zipcode.nsf/demozip?openform&city=${encodeURIComponent(city)}&street=${encodeURIComponent(street)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        const method = isEditing ? "PUT" : "POST";
        const url = isEditing
          ? `/api/properties/${initialData?.id}`
          : "/api/properties";

        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || `Failed to ${isEditing ? "update" : "create"} property`);
        }

        const result = await response.json();
        router.push(`/dashboard/properties/${result.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "אירעה שגיאה");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* שם הנכס */}
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            שם הנכס *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="לדוג', דירה בתל אביב"
          />
        </div>

        {/* סוג נכס */}
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            סוג נכס *
          </label>
          <select
            value={formData.propertyType}
            onChange={(e) => setFormData({ ...formData, propertyType: e.target.value as any })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Apartment">דירה</option>
            <option value="House">בית</option>
            <option value="Commercial">מסחרי</option>
          </select>
        </div>

        {/* כתובת */}
        <div className="md:col-span-2">
          <label className="block text-gray-700 font-semibold mb-2">
            כתובת (רחוב ומספר) *
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="רחוב ומספר"
          />
        </div>

        {/* ישוב - autocomplete */}
        <div ref={autocompleteRef} className="relative">
          <label className="block text-gray-700 font-semibold mb-2">
            ישוב *
          </label>
          <input
            type="text"
            value={settlementQuery}
            onChange={(e) => handleSettlementInput(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            required
            autoComplete="off"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="הקלד שם ישוב..."
          />
          {showSuggestions && (
            <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto mt-1">
              {suggestions.map((s) => (
                <li
                  key={s}
                  onMouseDown={() => handleSettlementSelect(s)}
                  className="px-4 py-2 cursor-pointer hover:bg-blue-50 text-gray-800"
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* מיקוד */}
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            מיקוד
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.zipCode || ""}
              onChange={(e) => setFormData({ ...formData, zipCode: e.target.value || undefined })}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="מיקוד"
              maxLength={7}
            />
            <button
              type="button"
              onClick={openPostalCodeSite}
              className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 text-sm font-semibold whitespace-nowrap"
              title="פתח אתר דואר ישראל לחיפוש מיקוד"
            >
              🔍 חפש
            </button>
          </div>
          <p className="text-xs mt-1 text-gray-500">לחץ חפש לפתיחת אתר דואר ישראל</p>
        </div>

        {/* קומה */}
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            קומה
          </label>
          <input
            type="number"
            value={formData.floor ?? ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                floor: e.target.value !== "" ? parseInt(e.target.value) : undefined,
              })
            }
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="מספר קומה"
          />
        </div>

        {/* מספר דירה */}
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            מספר דירה
          </label>
          <input
            type="text"
            value={formData.apartmentNumber || ""}
            onChange={(e) =>
              setFormData({ ...formData, apartmentNumber: e.target.value || undefined })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="מספר דירה"
          />
        </div>

        {/* חדרי שינה */}
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            חדרי שינה
          </label>
          <input
            type="number"
            value={formData.bedrooms || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                bedrooms: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="מספר חדרי שינה"
          />
        </div>

        {/* חדרי אמבטיה */}
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            חדרי אמבטיה
          </label>
          <input
            type="number"
            value={formData.bathrooms || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                bathrooms: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="מספר חדרי אמבטיה"
          />
        </div>

        {/* מטרים רבועים */}
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            שטח הדירה (מ"ר)
          </label>
          <input
            type="number"
            value={formData.squareMeters || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                squareMeters: e.target.value ? parseFloat(e.target.value) : undefined,
              })
            }
            min="0"
            step="0.5"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder='מ"ר'
          />
        </div>

        {/* מספר מרפסות */}
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            מספר מרפסות
          </label>
          <input
            type="number"
            value={formData.numBalconies ?? ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                numBalconies: e.target.value !== "" ? parseInt(e.target.value) : undefined,
              })
            }
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="מספר מרפסות"
          />
        </div>

        {/* גודל מרפסת */}
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            גודל מרפסת (מ"ר לכל מרפסת)
          </label>
          <input
            type="number"
            value={formData.balconySqm || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                balconySqm: e.target.value ? parseFloat(e.target.value) : undefined,
              })
            }
            min="0"
            step="0.5"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder='מ"ר'
          />
        </div>

        {/* מחיר רכישה */}
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            מחיר רכישה
          </label>
          <input
            type="number"
            value={formData.purchasePrice || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                purchasePrice: e.target.value ? parseFloat(e.target.value) : undefined,
              })
            }
            min="0"
            step="1000"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder='מחיר רכישה בש"ח'
          />
        </div>

        {/* תיאור */}
        <div className="md:col-span-2">
          <label className="block text-gray-700 font-semibold mb-2">
            תיאור
          </label>
          <textarea
            value={formData.description || ""}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value || undefined })
            }
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="תיאור הנכס"
          />
        </div>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-semibold"
        >
          {isLoading ? "טוען..." : isEditing ? "עדכן נכס" : "צור נכס"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400 font-semibold"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}
