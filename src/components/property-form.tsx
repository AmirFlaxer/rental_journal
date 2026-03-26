"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PropertyInput } from "@/lib/validations";

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
      setError(err instanceof Error ? err.message : "An error occurred");
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
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            Property Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Apartment in Tel Aviv"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            Property Type *
          </label>
          <select
            value={formData.propertyType}
            onChange={(e) => setFormData({ ...formData, propertyType: e.target.value as any })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Apartment">Apartment</option>
            <option value="House">House</option>
            <option value="Commercial">Commercial</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-gray-700 font-semibold mb-2">
            Address *
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Street address"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            City *
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) =>
              setFormData({ ...formData, city: e.target.value })
            }
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="City name"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            ZIP Code
          </label>
          <input
            type="text"
            value={formData.zipCode || ""}
            onChange={(e) =>
              setFormData({ ...formData, zipCode: e.target.value || undefined })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ZIP code"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            Bedrooms
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
            placeholder="Number of bedrooms"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            Bathrooms
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
            placeholder="Number of bathrooms"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            Square Meters
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
            step="0.01"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Square meters"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            Purchase Price
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
            step="0.01"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Purchase price"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-gray-700 font-semibold mb-2">
            Description
          </label>
          <textarea
            value={formData.description || ""}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value || undefined })
            }
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Property description"
          />
        </div>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-semibold"
        >
          {isLoading ? "Loading..." : isEditing ? "Update Property" : "Create Property"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400 font-semibold"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
