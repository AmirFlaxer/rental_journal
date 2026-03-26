"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PropertyForm } from "@/components/property-form";
import { PropertyInput } from "@/lib/validations";

interface Property extends PropertyInput {
  id: string;
}

export default function EditPropertyPage() {
  const params = useParams();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/properties/${propertyId}`);
        if (response.ok) {
          const data = await response.json();
          setProperty(data);
        } else if (response.status === 404) {
          setError("Property not found");
        } else {
          setError("Failed to load property");
        }
      } catch (err) {
        setError("An error occurred");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (propertyId) {
      fetchProperty();
    }
  }, [propertyId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900">עריכת נכס</h1>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-red-600 text-lg">{error || "הנכס לא נמצא"}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">עריכת נכס</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-8">
          <PropertyForm initialData={property} isEditing={true} />
        </div>
      </main>
    </div>
  );
}
