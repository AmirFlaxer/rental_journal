import { describe, it, expect, vi, afterEach } from "vitest";
import { effectiveLeaseStatus, isLeaseCurrentlyActive } from "@/lib/lease-status";

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
