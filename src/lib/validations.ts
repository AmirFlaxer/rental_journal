import { z } from "zod";

// User Validations
export const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Property Validations
export const propertySchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().nullish(),
  address: z.string().min(2, "Address is required"),
  house_number: z.string().nullish(),
  city: z.string().min(2, "City is required"),
  zip_code: z.string().nullish(),
  property_type: z.enum(["Apartment", "House", "Commercial"]),
  bedrooms: z.number().int().min(0).nullish(),
  bathrooms: z.number().int().min(0).nullish(),
  square_meters: z.number().min(0).nullish(),
  floor: z.number().int().min(0).nullish(),
  apartment_number: z.string().nullish(),
  num_balconies: z.number().int().min(0).nullish(),
  num_parking_spots: z.number().int().min(0).nullish(),
  purchase_price: z.number().min(0).nullish(),
});

// Tenant Validations
export const tenantSchema = z.object({
  first_name: z.string().min(2, "First name is required"),
  last_name: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  id_number: z.string().optional(),
});

// Lease Validations
export const leaseSchema = z.object({
  property_id: z.string().min(1, "Property is required"),
  tenant_id: z.string().min(1, "Tenant is required"),
  second_tenant_first_name: z.string().nullish(),
  second_tenant_last_name: z.string().nullish(),
  second_tenant_id_number: z.string().nullish(),
  second_tenant_phone: z.string().nullish(),
  second_tenant_email: z.string().email().nullish().or(z.literal("")).transform(v => v || null),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  monthly_rent: z.number().positive("Rent must be positive"),
  deposit_amount: z.number().min(0).nullish(),
  lease_term: z.number().int().positive("Lease term must be positive"),
  terms: z.string().nullish(),
  status: z.enum(["active", "ended", "paused"]).nullish(),
  has_option: z.boolean().nullish(),
  option_months: z.number().int().positive().nullish(),
  option_rent: z.number().positive().nullish(),
  option_start: z.coerce.date().nullish(),
  option_end: z.coerce.date().nullish(),
  option_terms: z.string().nullish(),
  early_term_protection: z.boolean().nullish(),
  tenant_notice_months: z.number().int().min(1).nullish(),
  landlord_notice_months: z.number().int().min(1).nullish(),
  payment_method: z.string().nullish(),
  // Index linkage
  linkage_type: z.enum(["none", "usd", "cpi"]).default("none"),
  linkage_frequency: z.enum(["monthly", "quarterly", "semiannual"]).default("monthly"),
  base_amount: z.number().positive().nullish(),
  base_date: z.coerce.date().nullish(),
});

// Expense Validations
export const expenseSchema = z.object({
  property_id: z.string().min(1, "Property is required"),
  category: z.enum(["Maintenance", "Insurance", "Tax", "Utilities", "Professional Fees", "Other"]),
  description: z.string().min(3, "Description is required"),
  amount: z.number().positive("Amount must be positive"),
  vendor_name: z.string().optional(),
  date: z.coerce.date().optional(),
  recurring: z.boolean().optional(),
  recurring_freq: z.enum(["monthly", "bi-monthly", "quarterly", "yearly"]).optional(),
  paid_by: z.enum(["landlord", "tenant"]).optional(),
  notes: z.string().nullish(),
});

// Payment Validations
export const paymentSchema = z.object({
  property_id: z.string().min(1, "Property is required"),
  lease_id: z.string().optional(),
  payment_type: z.enum(["Rent", "Deposit", "Return", "Other"]),
  amount: z.number().positive("Amount must be positive"),
  due_date: z.coerce.date(),
  paid_date: z.coerce.date().nullish(),
  method: z.string().optional(),
  reference_num: z.string().optional(),
  notes: z.string().optional(),
  // מיושר עם PaymentStatus ב-types/database.ts
  status: z.enum(["paid", "pending", "overdue", "partial"]).optional(),
});

// Task Validations
export const taskSchema = z.object({
  title: z.string().min(3, "Title is required"),
  description: z.string().optional(),
  category: z.enum(["Insurance", "Rent Collection", "Lease Renewal", "Maintenance", "Tax", "Gas", "Water", "Electricity", "Municipal Tax", "Other"]),
  due_date: z.coerce.date(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  related_entity_type: z.string().optional(),
  related_entity_id: z.string().optional(),
});

// עדכון משימה - partial מ-taskSchema (עדכון חלקי, למשל רק priority) + completed_at
// (סימון "בוצע" / ביטול השלמה). zod מסנן שדות לא מוכרים (כמו user_id) אוטומטית.
export const taskUpdateSchema = taskSchema.partial().extend({
  completed_at: z.coerce.date().nullish(),
});

// Property Utility Validations - קונפיגורציית חשבונות שירות לפי נכס
export const propertyUtilitySchema = z.object({
  property_id: z.string().min(1, "Property is required"),
  type: z.enum(["water", "gas", "electricity", "municipal_tax", "house_committee", "other"]),
  custom_label: z.string().nullish(),
  frequency: z.enum(["monthly", "bimonthly"]).default("monthly"),
  anchor_month: z.number().int().min(1).max(12).nullish(),
  responsibility: z.enum(["owner_pays", "owner_forwards", "tenant_pays"]).default("owner_pays"),
  active: z.boolean().optional(),
});

// Feedback Validations
export const feedbackSchema = z.object({
  type: z.enum(["bug", "feature", "other"]).default("other"),
  message: z.string().min(1, "Message is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type PropertyInput = z.infer<typeof propertySchema>;
export type TenantInput = z.infer<typeof tenantSchema>;
export type LeaseInput = z.infer<typeof leaseSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type PropertyUtilityInput = z.infer<typeof propertyUtilitySchema>;
export type FeedbackInput = z.infer<typeof feedbackSchema>;
