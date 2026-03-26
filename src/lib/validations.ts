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
  description: z.string().optional(),
  address: z.string().min(3, "Address is required"),
  city: z.string().min(2, "City is required"),
  zipCode: z.string().optional(),
  propertyType: z.enum(["Apartment", "House", "Commercial"]),
  bedrooms: z.number().int().positive().optional(),
  bathrooms: z.number().int().positive().optional(),
  squareMeters: z.number().positive().optional(),
  floor: z.number().int().min(0).optional(),
  apartmentNumber: z.string().optional(),
  numBalconies: z.number().int().min(0).optional(),
  balconySqm: z.number().positive().optional(),
  purchasePrice: z.number().positive().optional(),
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
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  monthlyRent: z.number().positive("Rent must be positive"),
  depositAmount: z.number().positive().optional(),
  leaseTerm: z.number().int().positive("Lease term must be positive"),
  terms: z.string().optional(),
});

// Expense Validations
export const expenseSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  category: z.enum(["Maintenance", "Insurance", "Tax", "Utilities", "Professional Fees", "Other"]),
  description: z.string().min(3, "Description is required"),
  amount: z.number().positive("Amount must be positive"),
  vendorName: z.string().optional(),
  recurring: z.boolean().optional(),
});

// Payment Validations
export const paymentSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  leaseId: z.string().optional(),
  paymentType: z.enum(["Rent", "Deposit", "Return", "Other"]),
  amount: z.number().positive("Amount must be positive"),
  dueDate: z.coerce.date(),
  paidDate: z.coerce.date().optional(),
  method: z.string().optional(),
  referenceNum: z.string().optional(),
});

// Task Validations
export const taskSchema = z.object({
  title: z.string().min(3, "Title is required"),
  description: z.string().optional(),
  category: z.enum(["Insurance", "Rent Collection", "Lease Renewal", "Maintenance", "Tax", "Other"]),
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
