import { describe, it, expect, vi, afterEach } from "vitest";
import { effectiveLeaseStatus, isLeaseCurrentlyActive, computeOccupancySummary } from "@/lib/lease-status";

// כל הבדיקות מקפיאות את "היום" ל-15/1/2026 (12:00 בצהריים) כדי לקבל תוצאה דטרמיניסטית -
// effectiveLeaseStatus קורא ל-new Date() פנימית בלי אפשרות להזריק תאריך.
afterEach(() => {
  vi.useRealTimers();
});

describe("effectiveLeaseStatus", () => {
  it("חוזה פעיל בטווח התאריכים", () => {
    vi.setSystemTime(new Date(2026, 0, 15, 12));
    const status = effectiveLeaseStatus({ status: "active", start_date: "2025-06-01", end_date: "2026-12-31" });
    expect(status).toBe("active");
  });

  it("חוזה שעדיין לא התחיל (future)", () => {
    vi.setSystemTime(new Date(2026, 0, 15, 12));
    const status = effectiveLeaseStatus({ status: "active", start_date: "2026-02-01", end_date: "2026-12-31" });
    expect(status).toBe("future");
  });

  it("חוזה שתאריך הסיום שלו כבר עבר, גם אם status עדיין 'active' (cron לא רץ)", () => {
    vi.setSystemTime(new Date(2026, 0, 15, 12));
    const status = effectiveLeaseStatus({ status: "active", start_date: "2025-01-01", end_date: "2025-12-31" });
    expect(status).toBe("expired");
  });

  it("status מפורש 'ended'/'terminated' גובר על התאריכים", () => {
    vi.setSystemTime(new Date(2026, 0, 15, 12));
    expect(
      effectiveLeaseStatus({ status: "ended", start_date: "2025-01-01", end_date: "2027-01-01" })
    ).toBe("ended");
    expect(
      effectiveLeaseStatus({ status: "terminated", start_date: "2025-01-01", end_date: "2027-01-01" })
    ).toBe("ended");
  });

  it("status='paused' ממופה גם הוא ל-'ended'", () => {
    vi.setSystemTime(new Date(2026, 0, 15, 12));
    const status = effectiveLeaseStatus({ status: "paused", start_date: "2025-01-01", end_date: "2027-01-01" });
    expect(status).toBe("ended");
  });

  it("גבול - היום הוא יום הסיום (end_date) - עדיין נחשב active", () => {
    vi.setSystemTime(new Date(2026, 0, 15, 12));
    const status = effectiveLeaseStatus({ status: "active", start_date: "2025-01-01", end_date: "2026-01-15" });
    expect(status).toBe("active");
  });

  // באג UTC שנחשף ע"י הבדיקה ותוקן: ההשוואה הישנה new Date("YYYY-MM-DD") (חצות UTC)
  // מול חצות מקומי גרמה לחוזה שמתחיל "היום" להיות מוצג future כל היום הראשון.
  // התיקון: השוואת מחרוזות תאריך מקומיות.
  it("גבול - היום הוא יום ההתחלה (start_date) - נחשב active", () => {
    vi.setSystemTime(new Date(2026, 0, 15, 12));
    const status = effectiveLeaseStatus({ status: "active", start_date: "2026-01-15", end_date: "2026-12-31" });
    expect(status).toBe("active");
  });
});

describe("isLeaseCurrentlyActive", () => {
  it("true כש-effectiveLeaseStatus הוא active", () => {
    vi.setSystemTime(new Date(2026, 0, 15, 12));
    expect(
      isLeaseCurrentlyActive({ status: "active", start_date: "2025-06-01", end_date: "2026-12-31" })
    ).toBe(true);
  });

  it("false כש-effectiveLeaseStatus הוא future", () => {
    vi.setSystemTime(new Date(2026, 0, 15, 12));
    expect(
      isLeaseCurrentlyActive({ status: "active", start_date: "2026-02-01", end_date: "2026-12-31" })
    ).toBe(false);
  });
});

// היום קבוע כ-"2026-07-27" בכל הבדיקות (todayIso בפרמטר, לא new Date() פנימי)
describe("computeOccupancySummary", () => {
  // status="active" ותאריך-סיום שעבר (cron שלא רץ) - expired, לא ended - ולכן
  // עדיין נספר ב-endedDates. זה התרחיש הנפוץ בפועל (ראה docstring ב-effectiveLeaseStatus).
  it("נכס ריק - חוזה עם תאריך-סיום שעבר קובע vacant_since, בלי חוזה עתידי next_lease_start הוא null", () => {
    const summary = computeOccupancySummary(
      [{ status: "active", start_date: "2026-01-01", end_date: "2026-06-30" }],
      "2026-07-27"
    );
    expect(summary).toEqual({ occupied: false, vacant_since: "2026-06-30", next_lease_start: null });
  });

  it("חוזה עתידי שלא בוטל חוסם את האופק (next_lease_start)", () => {
    const summary = computeOccupancySummary(
      [
        { status: "active", start_date: "2026-01-01", end_date: "2026-06-30" },
        { status: "active", start_date: "2026-09-01", end_date: "2027-08-31" },
      ],
      "2026-07-27"
    );
    expect(summary.next_lease_start).toBe("2026-09-01");
  });

  // סקירת-ענף I2: חוזה עתידי שנחתם ואז בוטל (status="terminated") לא אמור להמשיך
  // לחסום את האופק כאילו הנכס עומד להתאכלס - next_lease_start צריך להתעלם ממנו.
  it("חוזה עתידי שבוטל (terminated) לא חוסם את האופק", () => {
    const summary = computeOccupancySummary(
      [
        { status: "active", start_date: "2026-01-01", end_date: "2026-06-30" },
        { status: "terminated", start_date: "2026-09-01", end_date: "2027-08-31" },
      ],
      "2026-07-27"
    );
    expect(summary.occupied).toBe(false);
    expect(summary.next_lease_start).toBeNull();
  });

  // הקצה השני של אותו תיקון: חוזה עבר שסומן במפורש כ"הסתיים/בוטל" (ולא רק
  // expired לפי תאריך) לא נספר גם ב-endedDates - "שתי הרשימות" מסוננות לפי סטטוס
  // (ראה סקירת-ענף I2). ללא חוזה נוסף, vacant_since נופל ל-null.
  it("חוזה עבר שסומן ended במפורש לא נספר ב-vacant_since", () => {
    const summary = computeOccupancySummary(
      [{ status: "ended", start_date: "2026-01-01", end_date: "2026-06-30" }],
      "2026-07-27"
    );
    expect(summary.vacant_since).toBeNull();
  });

  it("נכס מאוכלס - occupied true, ואין חסימת-אופק מהחוזה הפעיל עצמו", () => {
    const summary = computeOccupancySummary(
      [{ status: "active", start_date: "2026-01-01", end_date: "2026-12-31" }],
      "2026-07-27"
    );
    expect(summary).toEqual({ occupied: true, vacant_since: null, next_lease_start: null });
  });

  it("אין חוזים בכלל - הכל null, לא מאוכלס", () => {
    expect(computeOccupancySummary([], "2026-07-27")).toEqual({
      occupied: false,
      vacant_since: null,
      next_lease_start: null,
    });
  });
});
