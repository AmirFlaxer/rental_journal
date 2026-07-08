// fetcher אחיד לצד לקוח - לשימוש עם TanStack Query.
// זורק שגיאה על תשובה לא תקינה כדי ש-useQuery יעבור למצב error.

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path);
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
};
