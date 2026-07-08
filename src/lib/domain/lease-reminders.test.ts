import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  generateVirtualLeaseRenewalTasks,
  type LeaseLike,
  type DbTaskLike,
} from "@/lib/domain/lease-reminders";

// "היום" מוקפא ל-8 ביולי 2026 - תואם לתאריך המתועד בסביבת העבודה
const FIXED_TODAY = new Date(2026, 6, 8);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_TODAY);
});

afterEach(() => {
  vi.useRealTimers();
});

function makeLease(overrides: Partial<LeaseLike> = {}): LeaseLike {
  return {
    id: "l1",
    end_date: "2026-10-06", // daysToEnd=90 מ-8/7/2026
    status: "active",
    properties: { id: "p1", title: "רוטשילד 1" },
    ...overrides,
  };
}

describe("generateVirtualLeaseRenewalTasks - חלון 90 יום", () => {
  it("לא מיוצר כשנשארו יותר מ-90 יום", () => {
    const tasks = generateVirtualLeaseRenewalTasks(
      [makeLease({ end_date: "2026-10-10" })], // daysToEnd=94
      [],
      new Date()
    );
    expect(tasks).toHaveLength(0);
  });

  it("מיוצר בדיוק ב-90 יום, עדיפות normal", () => {
    const tasks = generateVirtualLeaseRenewalTasks(
      [makeLease({ end_date: "2026-10-06" })], // daysToEnd=90
      [],
      new Date()
    );
    expect(tasks).toHaveLength(1);
    expect(tasks[0].priority).toBe("normal");
    expect(tasks[0].title).toBe("סיום חוזה מתקרב - רוטשילד 1");
  });

  it("חוזה שהסתיים (daysToEnd<0) לא מיוצר", () => {
    const tasks = generateVirtualLeaseRenewalTasks(
      [makeLease({ end_date: "2026-07-07" })], // daysToEnd=-1
      [],
      new Date()
    );
    expect(tasks).toHaveLength(0);
  });

  it("daysToEnd=0 (מסתיים היום) עדיין מיוצר, דחוף", () => {
    const tasks = generateVirtualLeaseRenewalTasks(
      [makeLease({ end_date: "2026-07-08" })], // daysToEnd=0
      [],
      new Date()
    );
    expect(tasks).toHaveLength(1);
    expect(tasks[0].priority).toBe("high");
    expect(tasks[0].title).toBe("דחוף: סיום חוזה מתקרב - רוטשילד 1");
  });
});

describe("generateVirtualLeaseRenewalTasks - הסלמת עדיפות בגבולות 75/60", () => {
  it("76 יום - normal (מעל 75)", () => {
    const tasks = generateVirtualLeaseRenewalTasks(
      [makeLease({ end_date: "2026-09-22" })], // daysToEnd=76
      [],
      new Date()
    );
    expect(tasks[0].priority).toBe("normal");
    expect(tasks[0].title).not.toContain("דחוף");
  });

  it("75 יום - high (הגבול נכלל בטווח 60-75)", () => {
    const tasks = generateVirtualLeaseRenewalTasks(
      [makeLease({ end_date: "2026-09-21" })], // daysToEnd=75
      [],
      new Date()
    );
    expect(tasks[0].priority).toBe("high");
    expect(tasks[0].title).not.toContain("דחוף"); // עדיין לא <60
  });

  it("60 יום - high, עדיין לא דחוף בכותרת", () => {
    const tasks = generateVirtualLeaseRenewalTasks(
      [makeLease({ end_date: "2026-09-06" })], // daysToEnd=60
      [],
      new Date()
    );
    expect(tasks[0].priority).toBe("high");
    expect(tasks[0].title).not.toContain("דחוף");
  });

  it("59 יום - high + 'דחוף' בכותרת (מתחת ל-60)", () => {
    const tasks = generateVirtualLeaseRenewalTasks(
      [makeLease({ end_date: "2026-09-05" })], // daysToEnd=59
      [],
      new Date()
    );
    expect(tasks[0].priority).toBe("high");
    expect(tasks[0].title).toBe("דחוף: סיום חוזה מתקרב - רוטשילד 1");
    expect(tasks[0].description).toBe("מסתיים בעוד 59 ימים");
  });
});

describe("generateVirtualLeaseRenewalTasks - סינון סטטוס ו-dedup", () => {
  it("חוזה ended לא מייצר תזכורת", () => {
    const tasks = generateVirtualLeaseRenewalTasks(
      [makeLease({ status: "ended", end_date: "2026-08-01" })],
      [],
      new Date()
    );
    expect(tasks).toHaveLength(0);
  });

  it("חוזה paused לא מייצר תזכורת", () => {
    const tasks = generateVirtualLeaseRenewalTasks(
      [makeLease({ status: "paused", end_date: "2026-08-01" })],
      [],
      new Date()
    );
    expect(tasks).toHaveLength(0);
  });

  it("dedup לפי lease.id + end_date - task קיים (גם מושלם) חוסם", () => {
    const dbTasks: DbTaskLike[] = [
      {
        category: "Lease Renewal",
        related_entity_type: "lease_renewal",
        related_entity_id: "l1",
        due_date: "2026-10-06",
        completed_at: "2026-07-08",
      },
    ];
    const tasks = generateVirtualLeaseRenewalTasks(
      [makeLease({ end_date: "2026-10-06" })],
      dbTasks,
      new Date()
    );
    expect(tasks).toHaveLength(0);
  });

  it("הארכת חוזה (end_date חדש) מייצרת מחזור חדש - ה-dbTask הישן לא חוסם", () => {
    const dbTasks: DbTaskLike[] = [
      {
        category: "Lease Renewal",
        related_entity_type: "lease_renewal",
        related_entity_id: "l1",
        due_date: "2026-10-06", // המחזור הישן, מכוסה
        completed_at: "2026-07-08",
      },
    ];
    // החוזה הוארך ל-end_date חדש - daysToEnd=75 מהתאריך המוקפא
    const tasks = generateVirtualLeaseRenewalTasks(
      [makeLease({ end_date: "2026-09-21" })],
      dbTasks,
      new Date()
    );
    expect(tasks).toHaveLength(1);
    expect(tasks[0].due_date).toBe("2026-09-21");
  });
});
