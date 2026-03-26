"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Property {
  id: string;
  title: string;
  description?: string;
  address: string;
  city: string;
  zipCode?: string;
  country: string;
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  squareMeters?: number;
  purchasePrice?: number;
  mortgageInfo?: string;
  createdAt: string;
  updatedAt: string;
  leases: any[];
  expenses: any[];
  payments: any[];
}

export default function PropertyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/dashboard");
      } else {
        setError("Failed to delete property");
      }
    } catch (err) {
      setError("An error occurred while deleting");
    }
  };

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
            <h1 className="text-3xl font-bold text-gray-900">Property Details</h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-red-600 text-lg mb-4">{error || "Property not found"}</p>
            <Link
              href="/dashboard"
              className="text-blue-600 hover:text-blue-800 font-semibold"
            >
              Back to Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const monthlyRent = property.leases
    .filter((l: any) => l.status === "active")
    .reduce((sum: number, lease: any) => sum + (lease.monthlyRent || 0), 0);

  const totalExpenses = property.expenses.reduce(
    (sum: number, exp: any) => sum + (exp.amount || 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{property.title}</h1>
              <p className="text-gray-600 mt-2">
                {property.address}, {property.city}
              </p>
            </div>
            <div className="flex gap-4">
              <Link
                href={`/dashboard/properties/${property.id}/edit`}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
              >
                Edit
              </Link>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold"
              >
                Delete
              </button>
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400 font-semibold"
              >
                Back
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Delete Property
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this property? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Property Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-600 text-sm font-medium">Type</div>
            <div className="text-2xl font-bold text-gray-900">{property.propertyType}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-600 text-sm font-medium">Monthly Rent</div>
            <div className="text-2xl font-bold text-gray-900">
              ${monthlyRent.toLocaleString()}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-600 text-sm font-medium">Total Expenses</div>
            <div className="text-2xl font-bold text-gray-900">
              ${totalExpenses.toLocaleString()}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-600 text-sm font-medium">Active Leases</div>
            <div className="text-2xl font-bold text-gray-900">
              {property.leases.filter((l: any) => l.status === "active").length}
            </div>
          </div>
        </div>

        {/* Property Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Details</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-gray-600 font-semibold">Address</dt>
                <dd className="text-gray-900">{property.address}</dd>
              </div>
              <div>
                <dt className="text-gray-600 font-semibold">City</dt>
                <dd className="text-gray-900">{property.city}</dd>
              </div>
              {property.zipCode && (
                <div>
                  <dt className="text-gray-600 font-semibold">ZIP Code</dt>
                  <dd className="text-gray-900">{property.zipCode}</dd>
                </div>
              )}
              {property.bedrooms && (
                <div>
                  <dt className="text-gray-600 font-semibold">Bedrooms</dt>
                  <dd className="text-gray-900">{property.bedrooms}</dd>
                </div>
              )}
              {property.bathrooms && (
                <div>
                  <dt className="text-gray-600 font-semibold">Bathrooms</dt>
                  <dd className="text-gray-900">{property.bathrooms}</dd>
                </div>
              )}
              {property.squareMeters && (
                <div>
                  <dt className="text-gray-600 font-semibold">Square Meters</dt>
                  <dd className="text-gray-900">{property.squareMeters}</dd>
                </div>
              )}
              {property.purchasePrice && (
                <div>
                  <dt className="text-gray-600 font-semibold">Purchase Price</dt>
                  <dd className="text-gray-900">${property.purchasePrice.toLocaleString()}</dd>
                </div>
              )}
              {property.description && (
                <div>
                  <dt className="text-gray-600 font-semibold">Description</dt>
                  <dd className="text-gray-900">{property.description}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Links</h2>
            <div className="space-y-2">
              <Link
                href={`/dashboard/properties/${property.id}/leases`}
                className="block px-4 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-semibold"
              >
                View Leases
              </Link>
              <Link
                href={`/dashboard/properties/${property.id}/expenses`}
                className="block px-4 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-semibold"
              >
                View Expenses
              </Link>
              <Link
                href={`/dashboard/properties/${property.id}/payments`}
                className="block px-4 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-semibold"
              >
                View Payments
              </Link>
              <Link
                href={`/dashboard/properties/${property.id}/add-lease`}
                className="block px-4 py-2 bg-green-50 text-green-600 rounded hover:bg-green-100 font-semibold"
              >
                + Add Lease
              </Link>
              <Link
                href={`/dashboard/properties/${property.id}/add-expense`}
                className="block px-4 py-2 bg-green-50 text-green-600 rounded hover:bg-green-100 font-semibold"
              >
                + Add Expense
              </Link>
            </div>
          </div>
        </div>

        {/* Leases Section */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Leases</h2>
          </div>
          {property.leases.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-600">
              No leases yet. <Link href={`/dashboard/properties/${property.id}/add-lease`} className="text-blue-600 hover:underline">Add one</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Tenant</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">End Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Rent</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {property.leases.map((lease: any) => (
                    <tr key={lease.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-900">{lease.tenant?.firstName} {lease.tenant?.lastName}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(lease.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(lease.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-gray-900">${lease.monthlyRent}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          lease.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {lease.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
