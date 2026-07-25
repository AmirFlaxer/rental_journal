import type { IconName } from "@/lib/icons";

export type NavItem = { href: string; label: string; icon: IconName; exact?: boolean };

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "לוח בקרה", icon: "dashboard", exact: true },
  { href: "/dashboard/properties", label: "נכסים", icon: "properties" },
  { href: "/dashboard/leases", label: "חוזים", icon: "leases", exact: true },
  { href: "/dashboard/leases/import", label: "ייבוא חוזה", icon: "leaseImport" },
  { href: "/dashboard/expenses", label: "הוצאות", icon: "expenses" },
  { href: "/dashboard/payments", label: "תקבולים", icon: "payments" },
  { href: "/dashboard/reports", label: "דוחות", icon: "reports" },
  { href: "/dashboard/reports/tax", label: "דוח מס", icon: "taxReport" },
  { href: "/dashboard/debts", label: "חובות", icon: "debts" },
  { href: "/dashboard/tasks", label: "תזכורות", icon: "tasks" },
  { href: "/dashboard/about", label: "אודות", icon: "about" },
  { href: "/dashboard/maintenance", label: "תחזוקה", icon: "maintenance" },
];

/**
 * האם פריט הניווט הוא הפעיל עבור הנתיב הנוכחי.
 *
 * startsWith לבדו הדליק שני פריטים יחד: ב-/dashboard/reports/tax נצבעו גם
 * "דוחות" וגם "דוח מס". הכלל כאן הוא "ההתאמה הארוכה ביותר מנצחת" - פריט פעיל
 * רק אם אין פריט אחר, ספציפי ממנו, שגם הוא מתאים לנתיב. כך /dashboard/reports/linkage
 * עדיין מדליק את "דוחות" (אין לו פריט משלו), אבל /dashboard/reports/tax לא.
 *
 * ההשוואה היא לפי מקטעי-נתיב שלמים, כדי ש-/dashboard/reports לא יתאים ל-/dashboard/reports-x.
 */
export function isNavItemActive(pathname: string, item: NavItem, allItems: NavItem[]): boolean {
  if (!matchesPath(pathname, item)) return false;
  return !allItems.some(
    (other) => other.href.length > item.href.length && matchesPath(pathname, other)
  );
}

function matchesPath(pathname: string, item: NavItem): boolean {
  if (pathname === item.href) return true;
  if (item.exact) return false;
  return pathname.startsWith(`${item.href}/`);
}

export const MOBILE_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "בקרה", icon: "dashboard", exact: true },
  { href: "/dashboard/properties", label: "נכסים", icon: "properties" },
  { href: "/dashboard/leases", label: "חוזים", icon: "leases", exact: true },
  { href: "/dashboard/payments", label: "תקבולים", icon: "payments" },
  { href: "/dashboard/tasks", label: "תזכורות", icon: "tasks" },
];
