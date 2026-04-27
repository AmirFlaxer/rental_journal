// TypeScript types for all Supabase tables
// - Row types (snake_case) = raw DB rows, used inside API route handlers before camelKeys()
// - Model types (camelCase) = after camelKeys() transform, used in UI and API responses

export interface Property {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  address: string;
  houseNumber?: string | null;
  city: string;
  zipCode?: string | null;
  country: string;
  propertyType: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareMeters?: number | null;
  floor?: number | null;
  apartmentNumber?: string | null;
  numBalconies?: number | null;
  numParkingSpots: number;
  purchasePrice?: number | null;
  mortgageInfo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  idNumber?: string | null;
  nationality?: string | null;
  address?: string | null;
  employmentInfo?: string | null;
  emergencyContact?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LinkageType = "none" | "usd" | "cpi";
export type LinkageFrequency = "monthly" | "quarterly" | "semiannual";
export type LeaseStatus = "active" | "terminated" | "expired";
export type PaymentMethod = "bank_transfer" | "check" | "cash" | "other";

export interface Lease {
  id: string;
  userId: string;
  propertyId: string;
  tenantId: string;

  startDate: string;
  endDate: string;
  renewalDate?: string | null;

  monthlyRent: number;
  depositAmount?: number | null;
  leaseTerm: number;
  terms?: string | null;
  status: LeaseStatus;

  // Option clause
  hasOption: boolean;
  optionMonths?: number | null;
  optionRent?: number | null;
  optionStart?: string | null;
  optionEnd?: string | null;
  optionTerms?: string | null;
  optionActivated: boolean;

  // Early termination
  earlyTermProtection: boolean;
  tenantNoticeMonths?: number | null;
  landlordNoticeMonths?: number | null;

  // Second tenant
  secondTenantFirstName?: string | null;
  secondTenantLastName?: string | null;
  secondTenantIdNumber?: string | null;
  secondTenantPhone?: string | null;
  secondTenantEmail?: string | null;

  // Payment method
  paymentMethod?: PaymentMethod | null;
  checkBank?: string | null;
  checkBranch?: string | null;
  checkAccount?: string | null;
  checkDepositReminder: boolean;

  // Termination tracking
  terminationRequestedBy?: string | null;
  terminationRequestDate?: string | null;
  terminationEffectiveDate?: string | null;
  terminationReason?: string | null;

  // Index linkage
  linkageType: LinkageType;
  linkageFrequency: LinkageFrequency;
  baseAmount?: number | null;
  baseDate?: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface LeaseDocument {
  id: string;
  leaseId: string;
  fileName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export type ExpenseCategory =
  | "maintenance"
  | "repair"
  | "insurance"
  | "tax"
  | "management"
  | "utilities"
  | "other";

export interface Expense {
  id: string;
  userId: string;
  propertyId: string;
  category: ExpenseCategory | string;
  description: string;
  amount: number;
  date: string;
  dueDate?: string | null;
  invoiceNumber?: string | null;
  vendorName?: string | null;
  recurring: boolean;
  recurringFreq?: string | null;
  paidBy: string;
  billTransferred: boolean;
  billTransferredDate?: string | null;
  linkedAssetId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = "pending" | "paid" | "overdue" | "partial";

export interface Payment {
  id: string;
  userId: string;
  propertyId: string;
  leaseId?: string | null;
  paymentType: string;
  amount: number;
  dueDate: string;
  paidDate?: string | null;
  status: PaymentStatus;
  method?: string | null;
  referenceNum?: string | null;
  checkNumber?: string | null;
  checkDate?: string | null;
  depositReminder: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type TaskPriority = "low" | "normal" | "high" | "urgent";
export type TaskStatus = "pending" | "done";

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  category: string;
  dueDate: string;
  completedAt?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AssetCondition = "new" | "good" | "fair" | "poor";

export interface PropertyAsset {
  id: string;
  userId: string;
  propertyId: string;
  name: string;
  category: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  purchaseDate?: string | null;
  warrantyUntil?: string | null;
  condition: AssetCondition;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type IndexRateType = "usd" | "cpi";

export interface IndexRate {
  id: number;
  type: IndexRateType;
  periodDate: string;
  value: number;
  createdAt: string;
}

// Joined / enriched types used in API responses

export interface LeaseWithRelations extends Lease {
  tenant?: Tenant;
  property?: Property;
  documents?: LeaseDocument[];
}

export interface PropertyWithLeases extends Property {
  leases?: Lease[];
}

// ----------------------------------------------------------------
// Raw DB Row types (snake_case) — used inside API route handlers
// before camelKeys() transformation
// ----------------------------------------------------------------

export interface LeaseRow {
  id: string;
  user_id: string;
  property_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  renewal_date?: string | null;
  monthly_rent: number;
  deposit_amount?: number | null;
  lease_term: number;
  terms?: string | null;
  status: string;
  has_option: boolean;
  option_months?: number | null;
  option_rent?: number | null;
  option_start?: string | null;
  option_end?: string | null;
  option_terms?: string | null;
  option_activated: boolean;
  early_term_protection: boolean;
  tenant_notice_months?: number | null;
  landlord_notice_months?: number | null;
  second_tenant_first_name?: string | null;
  second_tenant_last_name?: string | null;
  second_tenant_id_number?: string | null;
  second_tenant_phone?: string | null;
  second_tenant_email?: string | null;
  payment_method?: string | null;
  check_bank?: string | null;
  check_branch?: string | null;
  check_account?: string | null;
  check_deposit_reminder: boolean;
  termination_requested_by?: string | null;
  termination_request_date?: string | null;
  termination_effective_date?: string | null;
  termination_reason?: string | null;
  linkage_type: string;
  linkage_frequency: string;
  base_amount?: number | null;
  base_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseRow {
  id: string;
  user_id: string;
  property_id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  due_date?: string | null;
  invoice_number?: string | null;
  vendor_name?: string | null;
  recurring: boolean;
  recurring_freq?: string | null;
  paid_by: string;
  bill_transferred: boolean;
  bill_transferred_date?: string | null;
  linked_asset_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentRow {
  id: string;
  user_id: string;
  property_id: string;
  lease_id?: string | null;
  payment_type: string;
  amount: number;
  due_date: string;
  paid_date?: string | null;
  status: string;
  method?: string | null;
  reference_num?: string | null;
  check_number?: string | null;
  check_date?: string | null;
  deposit_reminder: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyRow {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  address: string;
  house_number?: string | null;
  city: string;
  zip_code?: string | null;
  country: string;
  property_type: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  square_meters?: number | null;
  floor?: number | null;
  apartment_number?: string | null;
  num_balconies?: number | null;
  num_parking_spots: number;
  purchase_price?: number | null;
  mortgage_info?: string | null;
  created_at: string;
  updated_at: string;
  // joined relations
  leases?: LeaseRow[];
  expenses?: ExpenseRow[];
  payments?: PaymentRow[];
}
