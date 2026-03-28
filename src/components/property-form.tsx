"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PropertyInput } from "@/lib/validations";
import { AddressAutocomplete } from "@/components/address-autocomplete";

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
      houseNumber: "",
      city: "",
      zipCode: "",
      propertyType: "Apartment",
      bedrooms: undefined,
      bathrooms: undefined,
      squareMeters: undefined,
      floor: undefined,
      apartmentNumber: undefined,
      numBalconies: undefined,
      numParkingSpots: 0,
      purchasePrice: undefined,
    }
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");


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

        {/* כתובת, עיר, מיקוד */}
        <AddressAutocomplete
          address={formData.address}
          houseNumber={formData.houseNumber || ""}
          city={formData.city}
          zipCode={formData.zipCode}
          onAddressChange={(v) => setFormData({ ...formData, address: v })}
          onHouseNumberChange={(v) => setFormData({ ...formData, houseNumber: v || undefined })}
          onCityChange={(v) => setFormData({ ...formData, city: v })}
          onZipChange={(v) => setFormData({ ...formData, zipCode: v || undefined })}
          className="md:col-span-2"
        />

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

        {/* מספר חניות */}
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            מספר חניות
          </label>
          <input
            type="number"
            value={formData.numParkingSpots ?? 0}
            onChange={(e) =>
              setFormData({
                ...formData,
                numParkingSpots: e.target.value !== "" ? parseInt(e.target.value) : 0,
              })
            }
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
