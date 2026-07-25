// fetcher אחיד לצד לקוח - לשימוש עם TanStack Query.
// זורק שגיאה על תשובה לא תקינה כדי ש-useQuery יעבור למצב error.

/**
 * @param opts.fresh - לעקוף את קאש ה-HTTP של הדפדפן. נחוץ אחרי פעולה שכתבה לשרת
 *   ורוצים לראות את התוצאה מיד: /api/index-rates מוגש עם max-age של שעה, ולכן
 *   רענון המדדים דיווח על הצלחה בזמן שהמסך המשיך להציג את הנתונים הישנים.
 */
export async function apiGet<T>(path: string, opts?: { fresh?: boolean }): Promise<T> {
  const res = await fetch(path, opts?.fresh ? { cache: "no-store" } : undefined);
  if (!res.ok) {
    let message = "שגיאת שרת";
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // תשובה לא-JSON - נשארים עם ההודעה הגנרית
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

// מפתחות query אחידים - כל הדפים חייבים להשתמש באלה כדי שה-cache ישותף בין מסכים
export const queryKeys = {
  properties: ["properties"] as const,
  leases: ["leases"] as const,
  payments: ["payments"] as const,
  expenses: ["expenses"] as const,
  tasks: ["tasks"] as const,
  tenants: ["tenants"] as const,
  reports: ["reports"] as const,
  indexRates: ["index-rates"] as const,
  propertyUtilities: ["property-utilities"] as const,
  leaseSecurities: ["lease-securities"] as const,
};
