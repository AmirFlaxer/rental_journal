import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  try {
    const session = await auth();

    if (session) {
      redirect("/dashboard");
    }
  } catch (error) {
    // Auth error during prerendering - continue with public page
    console.error("Auth error:", error);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center max-w-2xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Property Rental Manager
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Manage your rental properties efficiently. Track tenants, payments, expenses, and more.
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/auth/signin"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="px-8 py-3 bg-gray-200 text-gray-900 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            Sign Up
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">📋 Manage Properties</h3>
            <p className="text-gray-600">Keep track of all your rental properties in one place.</p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">👥 Tenant Information</h3>
            <p className="text-gray-600">Store and manage detailed information about your tenants.</p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">💰 Financial Reports</h3>
            <p className="text-gray-600">Track revenue, expenses, and generate detailed reports.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
