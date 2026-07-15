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

export const MOBILE_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "בקרה", icon: "dashboard", exact: true },
  { href: "/dashboard/properties", label: "נכסים", icon: "properties" },
  { href: "/dashboard/leases", label: "חוזים", icon: "leases", exact: true },
  { href: "/dashboard/payments", label: "תקבולים", icon: "payments" },
  { href: "/dashboard/tasks", label: "תזכורות", icon: "tasks" },
];
