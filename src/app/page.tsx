import { auth as getAuth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const session = await getAuth();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center max-w-2xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          מנהל נכסים להשכרה
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          נהל את נכסי ההשכרה שלך בקלות. עקוב אחר דיירים, תקבולים, הוצאות ועוד.
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/auth/signin"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            התחברות
          </Link>
          <Link
            href="/auth/signup"
            className="px-8 py-3 bg-gray-200 text-gray-900 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            הרשמה
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">📋 ניהול נכסים</h3>
            <p className="text-gray-600">עקוב אחר כל נכסי ההשכרה שלך במקום אחד.</p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">👥 פרטי דיירים</h3>
            <p className="text-gray-600">שמור ונהל מידע מפורט על הדיירים שלך.</p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">💰 דוחות כספיים</h3>
            <p className="text-gray-600">עקוב אחר הכנסות, הוצאות וצור דוחות מפורטים.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
