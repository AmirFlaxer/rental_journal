// לוגיקת-סיכום טהורה לבטחונות - "כמה אני מחזיק". בלי תופעות-לוואי.
import type { LeaseSecurity } from "@/types/database";

// סכום הפיקדונות הכספיים שעדיין מוחזקים (התחייבות להחזרה). לא הכנסה.
export function heldCashDepositTotal(
  items: Pick<LeaseSecurity, "kind" | "status" | "amount">[]
): number {
  return items
    .filter((s) => s.kind === "cash_deposit" && s.status === "held")
    .reduce((sum, s) => sum + (s.amount ?? 0), 0);
}

// ספירת בטחונות-הנייר המוחזקים (כל מה שאינו פיקדון כספי) - שקים ושטרות.
export function heldPaperCount(
  items: Pick<LeaseSecurity, "kind" | "status">[]
): number {
  return items.filter((s) => s.kind !== "cash_deposit" && s.status === "held").length;
}
