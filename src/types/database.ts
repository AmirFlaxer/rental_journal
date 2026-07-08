// טיפוסי DB - נגזרים מהסכימה המיוצרת (src/types/supabase.ts, נוצר ע"י npm run gen:types).
// snake_case בכל השכבות: DB, API JSON, ודפי הלקוח. אין המרת מפתחות.
// צמצומי enum נעשים כאן בלבד, עם Omit - לא מגדירים עמודות ידנית.
import type { Database } from "./supabase";

type TableRow<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type { Database };

// ---- enums דומייניים (צמצום מעל string של הסכימה) ----
export type LinkageType = "none" | "usd" | "cpi";
export type LinkageFrequency = "monthly" | "quarterly" | "semiannual";
// active/ended נכתבים ע"י האפליקציה היום; paused/terminated/expired ערכי מורשת
// שנשמרים בשורות ישנות (חוזים ישנים לא נדרסים - לוגיקה מטפלת, לא הדאטה)
export type LeaseStatus = "active" | "ended" | "paused" | "terminated" | "expired";
export type PaymentMethod = "bank_transfer" | "check" | "cash" | "other";
export type ExpenseCategory =
  | "maintenance"
  | "repair"
  | "insurance"
  | "tax"
  | "management"
  | "utilities"
  | "other";
export type PaymentStatus = "pending" | "paid" | "overdue" | "partial";
export type TaskPriority = "low" | "normal" | "high" | "urgent";
export type TaskStatus = "pending" | "done";
export type AssetCondition = "new" | "good" | "fair" | "poor";
export type IndexRateType = "usd" | "cpi";
export type PropertyUtilityType =
  | "water"
  | "gas"
  | "electricity"
  | "municipal_tax"
  | "house_committee"
  | "other";
export type PropertyUtilityFrequency = "monthly" | "bimonthly";
export type PropertyUtilityResponsibility = "owner_pays" | "owner_forwards" | "tenant_pays";

// ---- טיפוסי ישויות (snake_case, נגזרים מהסכימה) ----
export type Property = TableRow<"properties">;
export type Tenant = TableRow<"tenants">;

export type Lease = Omit<
  TableRow<"leases">,
  "status" | "linkage_type" | "linkage_frequency" | "payment_method"
> & {
  status: LeaseStatus;
  linkage_type: LinkageType;
  linkage_frequency: LinkageFrequency;
  payment_method: PaymentMethod | null;
};

export type LeaseDocument = TableRow<"lease_documents">;

export type Expense = Omit<TableRow<"expenses">, "category"> & {
  category: ExpenseCategory | string;
};

export type Payment = Omit<TableRow<"payments">, "status"> & {
  status: PaymentStatus;
};

// הערה: העמודה status מיושנת - לעולם לא מתעדכנת ע"י האפליקציה בפועל.
// completed_at הוא מקור האמת היחיד למשימה פתוחה (null) מול שהושלמה (תאריך).
export type Task = Omit<TableRow<"tasks">, "priority" | "status"> & {
  priority: TaskPriority;
  status: TaskStatus;
};

export type PropertyAsset = Omit<TableRow<"property_assets">, "condition"> & {
  condition: AssetCondition;
};

export type IndexRate = Omit<TableRow<"index_rates">, "type"> & {
  type: IndexRateType;
};

export type PropertyUtility = Omit<
  TableRow<"property_utilities">,
  "type" | "frequency" | "responsibility"
> & {
  type: PropertyUtilityType;
  frequency: PropertyUtilityFrequency;
  responsibility: PropertyUtilityResponsibility;
};

// ---- טיפוסים מועשרים לתשובות API (מפתחות join נשארים כשמם) ----
export type LeaseWithRelations = Lease & {
  tenant?: Tenant;
  property?: Property;
  documents?: LeaseDocument[];
};

export type PropertyWithLeases = Property & {
  leases?: Lease[];
  expenses?: Expense[];
  payments?: Payment[];
};
