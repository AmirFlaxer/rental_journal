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
  houseNumber: z.string().nullish(),
  city: z.string().min(2, "City is required"),
  zipCode: z.string().nullish(),
  propertyType: z.enum(["Apartment", "House", "Commercial"]),
  bedrooms: z.number().int().min(0).nullish(),
  bathrooms: z.number().int().min(0).nullish(),
  squareMeters: z.number().min(0).nullish(),
  floor: z.number().int().min(0).nullish(),
  apartmentNumber: z.string().nullish(),
  numBalconies: z.number().int().min(0).nullish(),
  numParkingSpots: z.number().int().min(0).nullish(),
  purchasePrice: z.number().min(0).nullish(),
});

// Tenant Validations
export const tenantSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  idNumber: z.string().optional(),
});

// Lease Validations
export const leaseSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  tenantId: z.string().min(1, "Tenant is required"),
  secondTenantFirstName: z.string().nullish(),
  secondTenantLastName: z.string().nullish(),
  secondTenantIdNumber: z.string().nullish(),
  secondTenantPhone: z.string().nullish(),
  secondTenantEmail: z.string().email().nullish().or(z.literal("")).transform(v => v || null),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  monthlyRent: z.number().positive("Rent must be positive"),
  depositAmount: z.number().min(0).nullish(),
  leaseTerm: z.number().int().positive("Lease term must be positive"),
  terms: z.string().nullish(),
  status: z.enum(["active", "ended", "paused"]).nullish(),
  hasOption: z.boolean().nullish(),
  optionMonths: z.number().int().positive().nullish(),
  optionRent: z.number().positive().nullish(),
  optionStart: z.coerce.date().nullish(),
  optionEnd: z.coerce.date().nullish(),
  optionTerms: z.string().nullish(),
  earlyTermProtection: z.boolean().nullish(),
  tenantNoticeMonths: z.number().int().min(1).nullish(),
  landlordNoticeMonths: z.number().int().min(1).nullish(),
  paymentMethod: z.string().nullish(),
  // Index linkage
  linkageType: z.enum(["none", "usd", "cpi"]).default("none"),
  linkageFrequency: z.enum(["monthly", "quarterly", "semiannual"]).default("monthly"),
  baseAmount: z.number().positive().nullish(),
  baseDate: z.coerce.date().nullish(),
});

// Expense Validations
export const expenseSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  category: z.enum(["Maintenance", "Insurance", "Tax", "Utilities", "Professional Fees", "Other"]),
  description: z.string().min(3, "Description is required"),
  amount: z.number().positive("Amount must be positive"),
  vendorName: z.string().optional(),
  date: z.coerce.date().optional(),
  recurring: z.boolean().optional(),
  recurringFreq: z.enum(["monthly", "bi-monthly", "quarterly", "yearly"]).optional(),
  paidBy: z.enum(["landlord", "tenant"]).optional(),
  notes: z.string().nullish(),
});

// Payment Validations
export const paymentSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  leaseId: z.string().optional(),
  paymentType: z.enum(["Rent", "Deposit", "Return", "Other"]),
  amount: z.number().positive("Amount must be positive"),
  dueDate: z.coerce.date(),
  paidDate: z.coerce.date().nullish(),
  method: z.string().optional(),
  referenceNum: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["paid", "pending", "overdue"]).optional(),
});

// Task Validations
export const taskSchema = z.object({
  title: z.string().min(3, "Title is required"),
  description: z.string().optional(),
  category: z.enum(["Insurance", "Rent Collection", "Lease Renewal", "Maintenance", "Tax", "Gas", "Water", "Electricity", "Municipal Tax", "Other"]),
  dueDate: z.coerce.date(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  relatedEntityType: z.string().optional(),
  relatedEntityId: z.string().optional(),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type PropertyInput = z.infer<typeof propertySchema>;
export type TenantInput = z.infer<typeof tenantSchema>;
export type LeaseInput = z.infer<typeof leaseSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
