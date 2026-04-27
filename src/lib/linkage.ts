export type LinkageType = "none" | "usd" | "cpi";
export type LinkageFrequency = "monthly" | "quarterly" | "semiannual";

export interface IndexRate {
  type: LinkageType;
  periodDate: string; // ISO date
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
  const target = targetDate.toISOString().slice(0, 10);
  const matching = rates
    .filter((r) => r.type === type && r.periodDate <= target)
    .sort((a, b) => b.periodDate.localeCompare(a.periodDate));
  return matching[0] ?? null;
}

export interface LinkageLease {
  linkageType: LinkageType;
  linkageFrequency: LinkageFrequency;
  baseAmount: number | null;
  baseDate: string | null; // ISO date
  monthlyRent: number;
}

// Returns the effective rent for today given the available index_rates rows
export function calcEffectiveRent(lease: LinkageLease, rates: IndexRate[]): number {
  if (lease.linkageType === "none" || !lease.baseAmount || !lease.baseDate) {
    return lease.monthlyRent;
  }

  const baseDate = new Date(lease.baseDate);
  const baseRate = pickRate(rates, lease.linkageType, baseDate);
  if (!baseRate) return lease.monthlyRent; // no data yet, fall back

  const periodStart = getEffectivePeriodStart(new Date(), lease.linkageFrequency);
  const currentRate = pickRate(rates, lease.linkageType, periodStart);
  if (!currentRate) return lease.monthlyRent;

  return Math.round((lease.baseAmount * currentRate.value) / baseRate.value);
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
