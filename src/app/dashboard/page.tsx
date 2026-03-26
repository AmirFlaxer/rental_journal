"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Property {
  id: string;
  title: string;
  address: string;
  city: string;
  bedrooms?: number;
  bathrooms?: number;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/properties");
        if (response.ok) {
          const data = await response.json();
          setProperties(data);
        } else {
          setError("Failed to load properties");
        }
      } catch (err) {
        setError("An error occurred while loading properties");
        console.error("Failed to fetch properties:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (session?.user?.id) {
      fetchProperties();
    }
  }, [session?.user?.id]);

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">טוען...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">לוח בקרה</h1>
            <div className="flex items-center gap-4">
              <span className="text-gray-700">{session?.user?.name}</span>
              <Link
                href="/api/auth/signout"
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                התנתקות
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-600 text-sm font-medium">סה"כ נכסים</div>
            <div className="text-3xl font-bold text-gray-900">{properties.length}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-600 text-sm font-medium">דיירים פעילים</div>
            <div className="text-3xl font-bold text-gray-900">--</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-600 text-sm font-medium">הכנסה חודשית</div>
            <div className="text-3xl font-bold text-gray-900">--</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-600 text-sm font-medium">תשלומים ממתינים</div>
            <div className="text-3xl font-bold text-gray-900">--</div>
          </div>
        </div>

        {/* Properties Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">הנכסים שלך</h2>
            <Link
              href="/dashboard/properties/new"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + הוסף נכס
            </Link>
          </div>

          {properties.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-600 mb-4">עדיין אין נכסים. צור אחד כדי להתחיל!</p>
              <Link
                href="/dashboard/properties/new"
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                צור את הנכס הראשון שלך
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">שם הנכס</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">כתובת</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">עיר</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {properties.map((property) => (
                    <tr key={property.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-900">{property.title}</td>
                      <td className="px-6 py-4 text-gray-600">{property.address}</td>
                      <td className="px-6 py-4 text-gray-600">{property.city}</td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/properties/${property.id}`}
                          className="text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          צפה
                        </Link>
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
