import { describe, it, expect, vi, afterEach } from "vitest";
import { pickRate, calcEffectiveRent, getEffectivePeriodStart, type IndexRate } from "@/lib/linkage";

const cpiRates: IndexRate[] = [
  { type: "cpi", period_date: "2025-01-01", value: 100 },
  { type: "cpi", period_date: "2025-02-01", value: 101 },
  { type: "cpi", period_date: "2025-03-01", value: 102.5 },
  { type: "cpi", period_date: "2025-04-01", value: 104.2 },
];
const usdRates: IndexRate[] = [{ type: "usd", period_date: "2025-02-01", value: 3.7 }];
const allRates = [...cpiRates, ...usdRates];

describe("pickRate", () => {
  it("תאריך יעד בדיוק על period_date - נבחר אותו מדד ולא מוסט יום אחורה", () => {
    const rate = pickRate(allRates, "cpi", new Date(2025, 1, 1)); // 2025-02-01 בדיוק
    expect(rate?.period_date).toBe("2025-02-01");
    expect(rate?.value).toBe(101);
  });

  it("תאריך יעד באמצע התקופה - נבחר המדד האחרון שלפניו", () => {
    const rate = pickRate(allRates, "cpi", new Date(2025, 1, 15)); // 15 בפברואר
    expect(rate?.period_date).toBe("2025-02-01");
  });

  it("אין מדד לפני תאריך היעד - מחזיר null", () => {
    const rate = pickRate(allRates, "cpi", new Date(2024, 11, 1)); // דצמבר 2024
    expect(rate).toBeNull();
  });

  it("מסנן לפי type - לא מערבב usd ו-cpi", () => {
    const rate = pickRate(allRates, "usd", new Date(2025, 2, 1));
    expect(rate?.type).toBe("usd");
    expect(rate?.value).toBe(3.7);
  });
});

describe("getEffectivePeriodStart", () => {
  it("תדירות חודשית - תחילת החודש הנוכחי", () => {
    expect(getEffectivePeriodStart(new Date(2025, 4, 15), "monthly")).toEqual(new Date(2025, 4, 1));
  });

  it("תדירות רבעונית - תחילת הרבעון (אוגוסט שייך לרבעון שמתחיל ביולי)", () => {
    expect(getEffectivePeriodStart(new Date(2025, 7, 15), "quarterly")).toEqual(new Date(2025, 6, 1));
  });

  it("תדירות חצי-שנתית - ינואר או יולי", () => {
    expect(getEffectivePeriodStart(new Date(2025, 2, 10), "semiannual")).toEqual(new Date(2025, 0, 1));
    expect(getEffectivePeriodStart(new Date(2025, 8, 10), "semiannual")).toEqual(new Date(2025, 6, 1));
  });
});

describe("calcEffectiveRent", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("לא-צמוד (linkage_type=none) - מחזיר תמיד את monthly_rent הגולמי", () => {
    const rent = calcEffectiveRent(
      { linkage_type: "none", linkage_frequency: "monthly", base_amount: 5000, base_date: "2025-01-15", monthly_rent: 5000 },
      cpiRates
    );
    expect(rent).toBe(5000);
  });

  it("חוסר בנתוני בסיס (base_amount/base_date ריקים) - fallback ל-monthly_rent", () => {
    const rent = calcEffectiveRent(
      { linkage_type: "cpi", linkage_frequency: "monthly", base_amount: null, base_date: null, monthly_rent: 5000 },
      cpiRates
    );
    expect(rent).toBe(5000);
  });

  it("חישוב שכ\"ד צמוד - יחס מדדים כפול הסכום הבסיסי, מעוגל", () => {
    // "היום" מוקפא ל-10/4/2025 כדי שה-period הנוכחי (חודשי) יהיה 2025-04-01 (מדד 104.2)
    vi.setSystemTime(new Date(2025, 3, 10));
    const rent = calcEffectiveRent(
      { linkage_type: "cpi", linkage_frequency: "monthly", base_amount: 5000, base_date: "2025-01-15", monthly_rent: 4800 },
      cpiRates
    );
    // בסיס: מדד 2025-01-01=100 (המדד האחרון <= base_date). נוכחי: מדד 2025-04-01=104.2
    // 5000 * 104.2 / 100 = 5210
    expect(rent).toBe(5210);
  });

  it("עיגול לפי Math.round כשהיחס לא עגול", () => {
    vi.setSystemTime(new Date(2025, 2, 5)); // מרץ - period נוכחי 2025-03-01, מדד 102.5
    const rent = calcEffectiveRent(
      { linkage_type: "cpi", linkage_frequency: "monthly", base_amount: 5000, base_date: "2025-01-15", monthly_rent: 4800 },
      cpiRates
    );
    // 5000 * 102.5 / 100 = 5125 (עגול גם ללא עיגול, אז בודקים ערך שאינו עגול טבעית)
    expect(rent).toBe(5125);
  });

  it("תדירות רבעונית - נבחר מדד תחילת הרבעון, לא מדד החודש הנוכחי עצמו", () => {
    const ratesWithMayJune: IndexRate[] = [
      ...cpiRates, // ...עד 2025-04-01=104.2
      { type: "cpi", period_date: "2025-05-01", value: 105 },
      { type: "cpi", period_date: "2025-06-01", value: 106 },
    ];
    // "היום" ב-15/6 - הרבעון הנוכחי (Q2: אפריל-יוני) מתחיל באפריל, לכן נבחר מדד אפריל (104.2)
    // ולא מדד יוני (106) למרות שהוא המדד "הכי עדכני" הזמין
    vi.setSystemTime(new Date(2025, 5, 15));
    const rent = calcEffectiveRent(
      { linkage_type: "cpi", linkage_frequency: "quarterly", base_amount: 5000, base_date: "2025-01-15", monthly_rent: 4800 },
      ratesWithMayJune
    );
    // בסיס: מדד ינואר=100. נוכחי: מדד תחילת הרבעון (אפריל)=104.2 -> 5000*104.2/100=5210
    expect(rent).toBe(5210);
  });

  it("חוסר מדד למדד הנוכחי (period מוקדם מכל המדדים הקיימים) - fallback ל-monthly_rent", () => {
    // "היום" ב-2020 - מוקדם מכל שורות המדד במערך (שמתחיל ב-2025-01-01) - אין מדד נוכחי
    vi.setSystemTime(new Date(2020, 0, 1));
    const rent = calcEffectiveRent(
      { linkage_type: "cpi", linkage_frequency: "monthly", base_amount: 5000, base_date: "2025-01-15", monthly_rent: 4800 },
      cpiRates
    );
    expect(rent).toBe(4800);
  });

  it("חוסר מדד לתאריך הבסיס עצמו (base_date לפני כל המדדים) - fallback ל-monthly_rent", () => {
    vi.setSystemTime(new Date(2025, 3, 10));
    const rent = calcEffectiveRent(
      { linkage_type: "cpi", linkage_frequency: "monthly", base_amount: 5000, base_date: "2020-01-01", monthly_rent: 4800 },
      cpiRates
    );
    expect(rent).toBe(4800);
  });
});
