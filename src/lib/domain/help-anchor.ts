export type HelpSectionId =
  | "intro" | "properties" | "leases" | "payments" | "expenses"
  | "debts" | "reports" | "tasks" | "settings";

const PATHNAME_ANCHORS: { prefix: string; anchor: HelpSectionId }[] = [
  { prefix: "/dashboard/properties", anchor: "properties" },
  { prefix: "/dashboard/leases", anchor: "leases" },
  { prefix: "/dashboard/payments", anchor: "payments" },
  { prefix: "/dashboard/expenses", anchor: "expenses" },
  { prefix: "/dashboard/debts", anchor: "debts" },
  { prefix: "/dashboard/reports", anchor: "reports" },
  { prefix: "/dashboard/tasks", anchor: "tasks" },
  { prefix: "/dashboard/settings", anchor: "settings" },
];

export function chapterAnchorFor(pathname: string): HelpSectionId {
  const match = PATHNAME_ANCHORS.find((p) => pathname.startsWith(p.prefix));
  return match ? match.anchor : "intro";
}
