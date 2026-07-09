// "דורש טיפול" - הכרטיס הראשון בדשבורד. פונקציה טהורה: הקורא מספק
// חוזים פעילים בלבד (isLeaseCurrentlyActive) ומשימות פתוחות בלבד (completed_at === null).
import { getDebtAmount } from "./partial-payment";

export interface AttentionPayment {
  id: string;
  status: string;
  due_date: string;
  amount: number;
  notes?: string | null;
  partial_paid_amount?: number | null;
  property?: { title?: string };
}

export interface AttentionLease {
  id: string;
  end_date: string;
  properties?: { title?: string };
}

export interface AttentionTask {
  id: string;
  title: string;
  due_date: string;
}

export interface AttentionItem {
  id: string;
  kind: "overdue" | "task" | "lease_ending";
  label: string;
  sub: string;
  href: string;
}

const TASK_HORIZON_DAYS = 7;
const LEASE_HORIZON_DAYS = 90;

// הפרש ימים בין שני תאריכי YYYY-MM-DD בזמן מקומי (בלי מלכודת UTC)
function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const a = new Date(fy, fm - 1, fd).getTime();
  const b = new Date(ty, tm - 1, td).getTime();
  return Math.round((b - a) / 86400000);
}

export function buildAttentionItems(input: {
  payments: AttentionPayment[];
  activeLeases: AttentionLease[];
  openTasks: AttentionTask[];
  today: string;
}): AttentionItem[] {
  const { payments, activeLeases, openTasks, today } = input;
  const items: AttentionItem[] = [];

  for (const p of payments) {
    if (p.status === "paid" || p.due_date >= today) continue;
    items.push({
      id: `overdue-${p.id}`,
      kind: "overdue",
      label: `תקבול באיחור - ${p.property?.title ?? "נכס"}`,
      sub: `₪${getDebtAmount(p).toLocaleString()}`,
      href: "/dashboard/debts",
    });
  }

  for (const t of openTasks) {
    const days = daysBetween(today, t.due_date);
    if (days < 0 || days > TASK_HORIZON_DAYS) continue;
    items.push({
      id: `task-${t.id}`,
      kind: "task",
      label: t.title,
      sub: days === 0 ? "היום" : `בעוד ${days} ימים`,
      href: "/dashboard/tasks",
    });
  }

  for (const l of activeLeases) {
    const days = daysBetween(today, l.end_date);
    if (days < 0 || days > LEASE_HORIZON_DAYS) continue;
    items.push({
      id: `lease-${l.id}`,
      kind: "lease_ending",
      label: `חוזה ${l.properties?.title ?? "נכס"} מסתיים`,
      sub: days === 0 ? "מסתיים היום" : `בעוד ${days} ימים`,
      href: "/dashboard/leases",
    });
  }

  const rank: Record<AttentionItem["kind"], number> = { overdue: 0, task: 1, lease_ending: 2 };
  return items.sort((a, b) => rank[a.kind] - rank[b.kind]);
}
