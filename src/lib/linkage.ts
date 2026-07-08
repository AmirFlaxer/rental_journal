import { localDateStr } from "./domain/dates";

export type LinkageType = "none" | "usd" | "cpi";
export type LinkageFrequency = "monthly" | "quarterly" | "semiannual";

export interface IndexRate {
  type: LinkageType;
  period_date: string; // ISO date
  value: number;
}

// Returns the start of the current linkage period (the date used to pick the applicable rate)
export function getEffectivePeriodStart(date: Date, frequency: LinkageFrequency): Date {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-based
  if (frequency === "monthly") return new Date(y, m, 1);
  if (frequency === "quarterly") {
    const q = Math.floor(m / 3) * 3; // 0, 3, 6, 9
    return new Date(y, q, 1);
  }
  // semiannual: Jan or Jul
  return new Date(y, m >= 6 ? 6 : 0, 1);
}

// Pick the most recent rate whose period_date <= targetDate
export function pickRate(rates: IndexRate[], type: LinkageType, targetDate: Date): IndexRate | null {
  // localDateStr ולא toISOString - בדפדפן ישראלי (UTC+2/+3) toISOString מסיט חצות
  // מקומי ליום הקודם, ובתחילת חודש זה גורם לבחירת מדד של התקופה הקודמת בטעות.
  const target = localDateStr(targetDate);
  const matching = rates
    .filter((r) => r.type === type && r.period_date <= target)
    .sort((a, b) => b.period_date.localeCompare(a.period_date));
  return matching[0] ?? null;
}

export interface LinkageLease {
  linkage_type: LinkageType;
  linkage_frequency: LinkageFrequency;
  base_amount: number | null;
  base_date: string | null; // ISO date
  monthly_rent: number;
}

// Returns the effective rent for today given the available index_rates rows
export function calcEffectiveRent(lease: LinkageLease, rates: IndexRate[]): number {
  if (lease.linkage_type === "none" || !lease.base_amount || !lease.base_date) {
    return lease.monthly_rent;
  }

  const baseDate = new Date(lease.base_date);
  const baseRate = pickRate(rates, lease.linkage_type, baseDate);
  if (!baseRate) return lease.monthly_rent; // no data yet, fall back

  const periodStart = getEffectivePeriodStart(new Date(), lease.linkage_frequency);
  const currentRate = pickRate(rates, lease.linkage_type, periodStart);
  if (!currentRate) return lease.monthly_rent;

  return Math.round((lease.base_amount * currentRate.value) / baseRate.value);
}

export const LINKAGE_TYPE_LABELS: Record<LinkageType, string> = {
  none: "ללא הצמדה",
  usd: 'דולר ארה"ב',
  cpi: "מדד כללי (CPI)",
};

export const LINKAGE_FREQUENCY_LABELS: Record<LinkageFrequency, string> = {
  monthly: "חודשי",
  quarterly: "רבעוני",
  semiannual: "חצי-שנתי",
};
