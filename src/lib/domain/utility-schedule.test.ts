import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  utilityAppliesThisPeriod,
  generateVirtualUtilityTasks,
  type PropertyUtilityLike,
  type DbTaskLike,
} from "@/lib/domain/utility-schedule";

// "היום" מוקפא ל-8 ביולי 2026 (חודש 7) - תואם לתאריך המתועד בסביבת העבודה
const FIXED_TODAY = new Date(2026, 6, 8);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_TODAY);
});

afterEach(() => {
  vi.useRealTimers();
});

function makeUtility(overrides: Partial<PropertyUtilityLike> = {}): PropertyUtilityLike {
  return {
    id: "u1",
    property_id: "p1",
    property_title: "רוטשילד 1",
    type: "water",
    custom_label: null,
    frequency: "monthly",
    anchor_month: null,
    responsibility: "owner_pays",
    active: true,
    ...overrides,
  };
}

describe("utilityAppliesThisPeriod", () => {
  it("monthly - תמיד חל, לא משנה מה anchor_month", () => {
    expect(utilityAppliesThisPeriod(makeUtility({ frequency: "monthly" }), new Date())).toBe(true);
    expect(
      utilityAppliesThisPeriod(makeUtility({ frequency: "monthly", anchor_month: 3 }), new Date())
    ).toBe(true);
  });

  it("bimonthly - חל בחודש שבו (currentMonth - anchor_month) זוגי", () => {
    // חודש נוכחי = 7 (יולי). anchor=1: 7-1=6, זוגי - חל
    expect(
      utilityAppliesThisPeriod(makeUtility({ frequency: "bimonthly", anchor_month: 1 }), new Date())
    ).toBe(true);
    // anchor=5: 7-5=2, זוגי - חל
    expect(
      utilityAppliesThisPeriod(makeUtility({ frequency: "bimonthly", anchor_month: 5 }), new Date())
    ).toBe(true);
  });

  it("bimonthly - לא חל בחודש שבו (currentMonth - anchor_month) אי-זוגי", () => {
    // anchor=2: 7-2=5, אי-זוגי - לא חל
    expect(
      utilityAppliesThisPeriod(makeUtility({ frequency: "bimonthly", anchor_month: 2 }), new Date())
    ).toBe(false);
    // anchor=6: 7-6=1, אי-זוגי - לא חל
    expect(
      utilityAppliesThisPeriod(makeUtility({ frequency: "bimonthly", anchor_month: 6 }), new Date())
    ).toBe(false);
  });

  it("bimonthly בלי anchor_month - נחשב תמיד חל", () => {
    expect(
      utilityAppliesThisPeriod(makeUtility({ frequency: "bimonthly", anchor_month: null }), new Date())
    ).toBe(true);
  });
});

describe("generateVirtualUtilityTasks", () => {
  it("owner_pays - כותרת 'תשלום {תווית} - {נכס}', due_date ה-1 בחודש הנוכחי", () => {
    const tasks = generateVirtualUtilityTasks(
      [makeUtility({ id: "u1", type: "water", responsibility: "owner_pays" })],
      [],
      new Date()
    );
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      id: "virtual-util-u1-2026-07",
      title: "תשלום מים - רוטשילד 1",
      category: "Water",
      due_date: "2026-07-01",
      priority: "normal",
      related_entity_type: "property_utility",
      related_entity_id: "u1",
      isVirtual: true,
    });
  });

  it("owner_forwards - כותרת 'העברת חשבון {תווית} לשוכר - {נכס}'", () => {
    const tasks = generateVirtualUtilityTasks(
      [makeUtility({ id: "u2", type: "gas", responsibility: "owner_forwards" })],
      [],
      new Date()
    );
    expect(tasks[0].title).toBe("העברת חשבון גז לשוכר - רוטשילד 1");
  });

  it("tenant_pays מסונן - לא נוצרת תזכורת", () => {
    const tasks = generateVirtualUtilityTasks(
      [makeUtility({ responsibility: "tenant_pays" })],
      [],
      new Date()
    );
    expect(tasks).toHaveLength(0);
  });

  it("active=false מסונן - לא נוצרת תזכורת", () => {
    const tasks = generateVirtualUtilityTasks([makeUtility({ active: false })], [], new Date());
    expect(tasks).toHaveLength(0);
  });

  it("bimonthly שלא חל בחודש הנוכחי - לא נוצרת תזכורת", () => {
    const tasks = generateVirtualUtilityTasks(
      [makeUtility({ frequency: "bimonthly", anchor_month: 2 })], // 7-2=5, אי-זוגי
      [],
      new Date()
    );
    expect(tasks).toHaveLength(0);
  });

  it("מיפוי קטגוריות: water/gas/electricity/municipal_tax/house_committee/other", () => {
    const utilities: PropertyUtilityLike[] = [
      makeUtility({ id: "a", type: "water" }),
      makeUtility({ id: "b", type: "gas" }),
      makeUtility({ id: "c", type: "electricity" }),
      makeUtility({ id: "d", type: "municipal_tax" }),
      makeUtility({ id: "e", type: "house_committee" }),
      makeUtility({ id: "f", type: "other", custom_label: "אינטרנט" }),
    ];
    const tasks = generateVirtualUtilityTasks(utilities, [], new Date());
    const byId = Object.fromEntries(tasks.map((t) => [t.related_entity_id, t]));
    expect(byId.a.category).toBe("Water");
    expect(byId.b.category).toBe("Gas");
    expect(byId.c.category).toBe("Electricity");
    expect(byId.d.category).toBe("Municipal Tax");
    expect(byId.e.category).toBe("Other");
    expect(byId.f.category).toBe("Other");
    expect(byId.f.title).toBe("תשלום אינטרנט - רוטשילד 1");
  });

  it("other בלי custom_label - נופל ל'חשבון'", () => {
    const tasks = generateVirtualUtilityTasks(
      [makeUtility({ type: "other", custom_label: null })],
      [],
      new Date()
    );
    expect(tasks[0].title).toBe("תשלום חשבון - רוטשילד 1");
  });

  it("dedup - task קיים באותו חודש (גם מושלם) חוסם יצירת וירטואלי תואם", () => {
    const dbTasks: DbTaskLike[] = [
      { category: "Water", related_entity_type: "property_utility", related_entity_id: "u1", due_date: "2026-07-01", completed_at: "2026-07-02" },
    ];
    const tasks = generateVirtualUtilityTasks([makeUtility({ id: "u1" })], dbTasks, new Date());
    expect(tasks).toHaveLength(0);
  });

  it("dedup - task קיים בחודש אחר לא חוסם", () => {
    const dbTasks: DbTaskLike[] = [
      { category: "Water", related_entity_type: "property_utility", related_entity_id: "u1", due_date: "2026-06-01" },
    ];
    const tasks = generateVirtualUtilityTasks([makeUtility({ id: "u1" })], dbTasks, new Date());
    expect(tasks).toHaveLength(1);
  });

  it("dedup בין חשבונות באותה ריצה - id כפול בקלט לא מייצר כפילות", () => {
    const tasks = generateVirtualUtilityTasks(
      [makeUtility({ id: "u1" }), makeUtility({ id: "u1" })],
      [],
      new Date()
    );
    expect(tasks).toHaveLength(1);
  });
});
