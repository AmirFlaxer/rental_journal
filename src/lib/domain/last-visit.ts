// "מאז הביקור האחרון" - חותמת ביקור per-device ב-localStorage (בלי DB),
// וסיכום טהור של מה שקרה מאז. הכרטיס מוצג רק כשיש מה לדווח.
import { getReceivedAmount, type ReceivedAmountInput } from "./partial-payment";

const VISIT_KEY = "rj:last-visit";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function readAndStampVisit(storage: StorageLike, nowIso: string): string | null {
  const prev = storage.getItem(VISIT_KEY);
  storage.setItem(VISIT_KEY, nowIso);
  return prev;
}

export interface SincePayment extends ReceivedAmountInput {
  payment_type: string;
  paid_date?: string | null;
  due_date?: string;
}

export interface SinceTask {
  completed_at: string | null;
}

export interface SinceSummary {
  paymentsCount: number;
  paymentsSum: number;
  tasksDone: number;
  newOverdue: number;
}

export function summarizeSince(
  sinceIso: string,
  data: { payments: SincePayment[]; tasks: SinceTask[] },
  today: string
): SinceSummary | null {
  const sinceDay = sinceIso.slice(0, 10);

  const received = data.payments.filter(
    (p) => p.payment_type === "Rent" && p.paid_date && p.paid_date >= sinceDay
  );
  const tasksDone = data.tasks.filter((t) => t.completed_at && t.completed_at >= sinceIso).length;
  const newOverdue = data.payments.filter(
    (p) => p.status !== "paid" && p.due_date && p.due_date >= sinceDay && p.due_date < today
  ).length;

  const summary: SinceSummary = {
    paymentsCount: received.length,
    paymentsSum: received.reduce((s, p) => s + getReceivedAmount(p), 0),
    tasksDone,
    newOverdue,
  };
  const hasNews = summary.paymentsCount > 0 || summary.tasksDone > 0 || summary.newOverdue > 0;
  return hasNews ? summary : null;
}
