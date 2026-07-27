import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  utilityAppliesThisPeriod,
  utilityDueDate,
  utilityMonthWindow,
  generateVirtualUtilityTasks,
  mapUtilityCategory,
  utilityTypeLabel,
  effectiveResponsibility,
  type PropertyUtilityLike,
  type DbTaskLike,
  type PropertyOccupancy,
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
    anchor_day: null,
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

describe("utilityAppliesThisPeriod - תדירות שנתית", () => {
  it("חל רק בחודש העוגן", () => {
    const insurance = makeUtility({ type: "insurance", frequency: "annual", anchor_month: 10, anchor_day: 31 });
    expect(utilityAppliesThisPeriod(insurance, new Date(2026, 9, 1))).toBe(true); // אוקטובר
    expect(utilityAppliesThisPeriod(insurance, new Date(2026, 8, 1))).toBe(false); // ספטמבר
    expect(utilityAppliesThisPeriod(insurance, new Date(2027, 9, 1))).toBe(true); // אוקטובר בשנה הבאה
  });

  it("בלי חודש עוגן אינו חל בכלל - לא ממציא מועד חידוש שרירותי", () => {
    const insurance = makeUtility({ type: "insurance", frequency: "annual", anchor_month: null });
    expect(utilityAppliesThisPeriod(insurance, new Date(2026, 9, 1))).toBe(false);
  });

  it("חודשי ודו-חודשי לא השתנו, והחודש נלקח מהתאריך שהועבר ולא מ'היום'", () => {
    expect(utilityAppliesThisPeriod(makeUtility({ frequency: "monthly" }), new Date(2026, 2, 1))).toBe(true);
    const bimonthly = makeUtility({ frequency: "bimonthly", anchor_month: 7 });
    expect(utilityAppliesThisPeriod(bimonthly, new Date(2026, 6, 1))).toBe(true);  // יולי
    expect(utilityAppliesThisPeriod(bimonthly, new Date(2026, 7, 1))).toBe(false); // אוגוסט
    expect(utilityAppliesThisPeriod(bimonthly, new Date(2026, 8, 1))).toBe(true);  // ספטמבר
  });
});

describe("utilityDueDate", () => {
  it("שנתי - היום בחודש הוא anchor_day", () => {
    const insurance = makeUtility({ type: "insurance", frequency: "annual", anchor_month: 10, anchor_day: 31 });
    expect(utilityDueDate(insurance, "2026-10")).toBe("2026-10-31");
  });

  it("שנתי - יום שלא קיים בחודש נחתך לסוף החודש", () => {
    const insurance = makeUtility({ type: "insurance", frequency: "annual", anchor_month: 2, anchor_day: 31 });
    expect(utilityDueDate(insurance, "2026-02")).toBe("2026-02-28");
    expect(utilityDueDate(insurance, "2028-02")).toBe("2028-02-29"); // שנה מעוברת
  });

  it("שנתי בלי anchor_day נופל ל-1 בחודש", () => {
    const insurance = makeUtility({ type: "insurance", frequency: "annual", anchor_month: 10, anchor_day: null });
    expect(utilityDueDate(insurance, "2026-10")).toBe("2026-10-01");
  });

  it("חודשי ודו-חודשי תמיד ה-1 בחודש", () => {
    expect(utilityDueDate(makeUtility({ frequency: "monthly" }), "2026-07")).toBe("2026-07-01");
    expect(utilityDueDate(makeUtility({ frequency: "bimonthly", anchor_month: 7 }), "2026-07")).toBe("2026-07-01");
  });
});

const occupiedP1: PropertyOccupancy[] = [{ property_id: "p1", occupied: true }];

describe("generateVirtualUtilityTasks", () => {
  it("owner_pays - כותרת 'תשלום {תווית} - {נכס}', due_date ה-1 בחודש הנוכחי", () => {
    const tasks = generateVirtualUtilityTasks(
      [makeUtility({ id: "u1", type: "water", responsibility: "owner_pays" })],
      [],
      new Date(),
      occupiedP1
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
      new Date(),
      occupiedP1
    );
    expect(tasks[0].title).toBe("העברת חשבון גז לשוכר - רוטשילד 1");
  });

  it("tenant_pays מסונן - לא נוצרת תזכורת", () => {
    const tasks = generateVirtualUtilityTasks(
      [makeUtility({ responsibility: "tenant_pays" })],
      [],
      new Date(),
      occupiedP1
    );
    expect(tasks).toHaveLength(0);
  });

  it("active=false מסונן - לא נוצרת תזכורת", () => {
    const tasks = generateVirtualUtilityTasks([makeUtility({ active: false })], [], new Date(), occupiedP1);
    expect(tasks).toHaveLength(0);
  });

  it("bimonthly שלא חל בחודש הנוכחי - לא נוצרת תזכורת", () => {
    const tasks = generateVirtualUtilityTasks(
      [makeUtility({ frequency: "bimonthly", anchor_month: 2 })], // 7-2=5, אי-זוגי
      [],
      new Date(),
      occupiedP1
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
    const tasks = generateVirtualUtilityTasks(utilities, [], new Date(), occupiedP1);
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
      new Date(),
      occupiedP1
    );
    expect(tasks[0].title).toBe("תשלום חשבון - רוטשילד 1");
  });

  it("dedup - task קיים באותו חודש (גם מושלם) חוסם יצירת וירטואלי תואם", () => {
    const dbTasks: DbTaskLike[] = [
      { category: "Water", related_entity_type: "property_utility", related_entity_id: "u1", due_date: "2026-07-01", completed_at: "2026-07-02" },
    ];
    const tasks = generateVirtualUtilityTasks([makeUtility({ id: "u1" })], dbTasks, new Date(), occupiedP1);
    expect(tasks).toHaveLength(0);
  });

  it("dedup - task קיים בחודש אחר לא חוסם", () => {
    const dbTasks: DbTaskLike[] = [
      { category: "Water", related_entity_type: "property_utility", related_entity_id: "u1", due_date: "2026-06-01", completed_at: null },
    ];
    const tasks = generateVirtualUtilityTasks([makeUtility({ id: "u1" })], dbTasks, new Date(), occupiedP1);
    expect(tasks).toHaveLength(1);
  });

  it("dedup בין חשבונות באותה ריצה - id כפול בקלט לא מייצר כפילות", () => {
    const tasks = generateVirtualUtilityTasks(
      [makeUtility({ id: "u1" }), makeUtility({ id: "u1" })],
      [],
      new Date(),
      occupiedP1
    );
    expect(tasks).toHaveLength(1);
  });
});

describe("ביטוח כסוג חשבון", () => {
  it("ממופה לקטגוריה Insurance - זהה לתזכורות הישנות, כך שהמיגרציה עקבית", () => {
    expect(mapUtilityCategory("insurance")).toBe("Insurance");
  });

  it("תווית עברית: ביטוח", () => {
    expect(utilityTypeLabel("insurance")).toBe("ביטוח");
  });

  it("שאר הסוגים לא זזו", () => {
    expect(mapUtilityCategory("water")).toBe("Water");
    expect(utilityTypeLabel("municipal_tax")).toBe("ארנונה");
  });
});

describe("effectiveResponsibility", () => {
  it("ביטוח תמיד על הבעלים - גם בנכס מאוכלס וגם אם הוגדר אחרת", () => {
    expect(effectiveResponsibility({ type: "insurance", responsibility: "tenant_pays" }, true)).toBe("owner_pays");
    expect(effectiveResponsibility({ type: "insurance", responsibility: "owner_forwards" }, true)).toBe("owner_pays");
    expect(effectiveResponsibility({ type: "insurance", responsibility: "owner_pays" }, false)).toBe("owner_pays");
  });

  it("נכס ריק - חשבון שהשוכר שילם ישירות עובר לבעלים", () => {
    expect(effectiveResponsibility({ type: "water", responsibility: "tenant_pays" }, false)).toBe("owner_pays");
    expect(effectiveResponsibility({ type: "electricity", responsibility: "owner_forwards" }, false)).toBe("owner_pays");
  });

  it("נכס מאוכלס - ההגדרה נשמרת כמו שהיא", () => {
    expect(effectiveResponsibility({ type: "water", responsibility: "tenant_pays" }, true)).toBe("tenant_pays");
    expect(effectiveResponsibility({ type: "water", responsibility: "owner_forwards" }, true)).toBe("owner_forwards");
    expect(effectiveResponsibility({ type: "municipal_tax", responsibility: "owner_pays" }, true)).toBe("owner_pays");
  });
});

describe("utilityMonthWindow", () => {
  it("נכס מאוכלס - החודש הנוכחי בלבד", () => {
    const window = utilityMonthWindow({ property_id: "p1", occupied: true }, FIXED_TODAY);
    expect(window).toEqual(["2026-07"]);
  });

  it("נכס בלי מידע אכלוס מתנהג כמאוכלס - ברירת מחדל שמרנית", () => {
    expect(utilityMonthWindow(undefined, FIXED_TODAY)).toEqual(["2026-07"]);
  });

  it("נכס ריק - מהחודש הנוכחי ועד סוף השנה הקלנדרית", () => {
    const window = utilityMonthWindow(
      { property_id: "p1", occupied: false, vacant_since: "2026-05-31" },
      FIXED_TODAY
    );
    expect(window).toEqual(["2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"]);
  });

  it("חוזה הבא חוסם את האופק - עד היום שלפני תחילתו", () => {
    const window = utilityMonthWindow(
      { property_id: "p1", occupied: false, vacant_since: "2026-06-30", next_lease_start: "2026-09-01" },
      FIXED_TODAY
    );
    expect(window).toEqual(["2026-07", "2026-08"]);
  });

  it("חוזה הבא שמתחיל באמצע חודש - אותו חודש עדיין נכלל", () => {
    const window = utilityMonthWindow(
      { property_id: "p1", occupied: false, next_lease_start: "2026-09-15" },
      FIXED_TODAY
    );
    expect(window).toEqual(["2026-07", "2026-08", "2026-09"]);
  });

  it("חוזה הבא שמתחיל החודש - חלון ריק", () => {
    const window = utilityMonthWindow(
      { property_id: "p1", occupied: false, next_lease_start: "2026-07-01" },
      FIXED_TODAY
    );
    expect(window).toEqual([]);
  });

  it("האופק מתגלגל: ריצה ב-1 בינואר מייצרת עד סוף השנה החדשה ולא מעבר", () => {
    const window = utilityMonthWindow(
      { property_id: "p1", occupied: false, vacant_since: "2025-11-30" },
      new Date(2027, 0, 1)
    );
    expect(window).toHaveLength(12);
    expect(window[0]).toBe("2027-01");
    expect(window[11]).toBe("2027-12");
  });
});

describe("generateVirtualUtilityTasks - אכלוס וחלון", () => {
  const occupied = (id: string): PropertyOccupancy => ({ property_id: id, occupied: true });
  const vacant = (id: string, extra: Partial<PropertyOccupancy> = {}): PropertyOccupancy => ({
    property_id: id,
    occupied: false,
    ...extra,
  });

  it("חשבון tenant_pays מייצר תזכורת בנכס ריק", () => {
    const util = makeUtility({ responsibility: "tenant_pays" });
    const result = generateVirtualUtilityTasks([util], [], FIXED_TODAY, [vacant("p1")]);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].title).toBe("תשלום מים - רוטשילד 1");
    expect(result[0].vacantProperty).toBe(true);
  });

  it("חשבון tenant_pays אינו מייצר תזכורת בנכס מאוכלס", () => {
    const util = makeUtility({ responsibility: "tenant_pays" });
    expect(generateVirtualUtilityTasks([util], [], FIXED_TODAY, [occupied("p1")])).toEqual([]);
  });

  it("נכס מאוכלס - חודש נוכחי בלבד, וללא תגית נכס ריק", () => {
    const util = makeUtility({ responsibility: "owner_pays" });
    const result = generateVirtualUtilityTasks([util], [], FIXED_TODAY, [occupied("p1")]);
    expect(result).toHaveLength(1);
    expect(result[0].due_date).toBe("2026-07-01");
    expect(result[0].vacantProperty).toBeFalsy();
  });

  it("נכס ריק - חשבון חודשי מייצר תזכורת לכל חודש עד סוף השנה", () => {
    const util = makeUtility({ responsibility: "owner_pays", frequency: "monthly" });
    const result = generateVirtualUtilityTasks([util], [], FIXED_TODAY, [vacant("p1")]);
    expect(result.map((t) => t.due_date)).toEqual([
      "2026-07-01", "2026-08-01", "2026-09-01", "2026-10-01", "2026-11-01", "2026-12-01",
    ]);
  });

  it("ביטוח שנתי - תזכורת אחת בחודש העוגן ובתאריך החידוש", () => {
    const insurance = makeUtility({
      type: "insurance", frequency: "annual", anchor_month: 10, anchor_day: 31,
      responsibility: "owner_pays",
    });
    const result = generateVirtualUtilityTasks([insurance], [], FIXED_TODAY, [vacant("p1")]);
    expect(result).toHaveLength(1);
    expect(result[0].due_date).toBe("2026-10-31");
    expect(result[0].title).toBe("חידוש ביטוח - רוטשילד 1");
    expect(result[0].category).toBe("Insurance");
  });

  it("ביטוח מיוצר גם בנכס מאוכלס אם חודש העוגן הוא החודש הנוכחי", () => {
    const insurance = makeUtility({
      type: "insurance", frequency: "annual", anchor_month: 7, anchor_day: 15,
      responsibility: "tenant_pays",
    });
    const result = generateVirtualUtilityTasks([insurance], [], FIXED_TODAY, [occupied("p1")]);
    expect(result).toHaveLength(1);
    expect(result[0].due_date).toBe("2026-07-15");
  });

  it("dedup - משימה אמיתית חוסמת את החודש שלה בלבד", () => {
    const util = makeUtility({ responsibility: "owner_pays", frequency: "monthly" });
    const dbTasks: DbTaskLike[] = [
      {
        category: "Water",
        related_entity_type: "property_utility",
        related_entity_id: "u1",
        due_date: "2026-09-01",
        completed_at: "2026-09-02",
      },
    ];
    const result = generateVirtualUtilityTasks([util], dbTasks, FIXED_TODAY, [vacant("p1")]);
    const months = result.map((t) => t.due_date.slice(0, 7));
    expect(months).not.toContain("2026-09");
    expect(months).toContain("2026-08");
    expect(months).toContain("2026-10");
  });

  it("החוזה הבא חוסם את זנב החלון", () => {
    const util = makeUtility({ responsibility: "owner_pays", frequency: "monthly" });
    const result = generateVirtualUtilityTasks([util], [], FIXED_TODAY, [
      vacant("p1", { next_lease_start: "2026-09-01" }),
    ]);
    expect(result.map((t) => t.due_date)).toEqual(["2026-07-01", "2026-08-01"]);
  });

  it("מזהי התזכורות ייחודיים לכל חודש - אחרת React מתלונן על key כפול", () => {
    const util = makeUtility({ responsibility: "owner_pays", frequency: "monthly" });
    const result = generateVirtualUtilityTasks([util], [], FIXED_TODAY, [vacant("p1")]);
    expect(new Set(result.map((t) => t.id)).size).toBe(result.length);
  });

  it("חשבון לא פעיל אינו מייצר כלום גם בנכס ריק", () => {
    const util = makeUtility({ active: false, responsibility: "tenant_pays" });
    expect(generateVirtualUtilityTasks([util], [], FIXED_TODAY, [vacant("p1")])).toEqual([]);
  });
});

// סקירת-ענף I1: תזכורת annual שלא סומנה לא אמורה להיעלם ברגע שחודש-העוגן חלף -
// היא ה"תזכורת השנתית" היחידה שהאפיון מגדיר כשווה שימור, ולכן חייבת להמשיך
// "לרדוף" עד שתסומן (dbTask) או שיגיע חודש-העוגן הבא בשנה שלאחר מכן.
describe("generateVirtualUtilityTasks - annual לא נעלם אחרי שחודש העוגן חלף", () => {
  const occupied = (id: string): PropertyOccupancy => ({ property_id: id, occupied: true });

  it("נכס מאוכלס, חודש-עוגן שכבר חלף השנה - התזכורת עדיין נוצרת", () => {
    // FIXED_TODAY = 8 ביולי 2026 (חודש 7), anchor_month=5 (מאי) - כבר חלף
    const insurance = makeUtility({
      type: "insurance", frequency: "annual", anchor_month: 5, anchor_day: 20,
      responsibility: "owner_pays",
    });
    const result = generateVirtualUtilityTasks([insurance], [], FIXED_TODAY, [occupied("p1")]);
    expect(result).toHaveLength(1);
    expect(result[0].due_date).toBe("2026-05-20");
  });

  it("נכס מאוכלס, חודש-עוגן עתידי - לא מוצגת מוקדם מדי (התנהגות קיימת נשמרת)", () => {
    // anchor_month=12 (דצמבר) - עתידי יחסית ל-יולי, אסור שיופיע כבר עכשיו
    const insurance = makeUtility({
      type: "insurance", frequency: "annual", anchor_month: 12, anchor_day: 1,
      responsibility: "owner_pays",
    });
    const result = generateVirtualUtilityTasks([insurance], [], FIXED_TODAY, [occupied("p1")]);
    expect(result).toHaveLength(0);
  });

  it("חודש-עוגן שחלף אך כבר מכוסה ע\"י משימת-DB אמיתית - לא מיוצרת וירטואלית כפולה", () => {
    const insurance = makeUtility({
      id: "ins1", type: "insurance", frequency: "annual", anchor_month: 5, anchor_day: 20,
      responsibility: "owner_pays",
    });
    const dbTasks: DbTaskLike[] = [
      { category: "Insurance", related_entity_type: "property_utility", related_entity_id: "ins1", due_date: "2026-05-20", completed_at: "2026-05-21" },
    ];
    const result = generateVirtualUtilityTasks([insurance], dbTasks, FIXED_TODAY, [occupied("p1")]);
    expect(result).toHaveLength(0);
  });
});
