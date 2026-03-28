-- ============================================================
-- Rental Journal – Supabase SQL Schema
-- הרץ את הסקריפט הזה ב: Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable UUID extension (כבר מופעל ב-Supabase בדרך כלל)
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------
-- PROPERTIES
-- ----------------------------------------------------------------
create table if not exists properties (
  id              text        primary key default gen_random_uuid()::text,
  user_id         uuid        not null references auth.users(id) on delete cascade,
  title           text        not null,
  description     text,
  address         text        not null,
  house_number    text,
  city            text        not null,
  zip_code        text,
  country         text        not null default 'Israel',
  property_type   text        not null,
  bedrooms        int,
  bathrooms       int,
  square_meters   float,
  floor           int,
  apartment_number text,
  num_balconies   int,
  num_parking_spots int not null default 0,
  purchase_price  float,
  mortgage_info   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- TENANTS
-- ----------------------------------------------------------------
create table if not exists tenants (
  id                text        primary key default gen_random_uuid()::text,
  user_id           uuid        not null references auth.users(id) on delete cascade,
  first_name        text        not null,
  last_name         text        not null,
  email             text,
  phone             text,
  id_number         text,
  nationality       text,
  address           text,
  employment_info   text,
  emergency_contact text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- LEASES
-- ----------------------------------------------------------------
create table if not exists leases (
  id              text        primary key default gen_random_uuid()::text,
  user_id         uuid        not null references auth.users(id) on delete cascade,
  property_id     text        not null references properties(id) on delete cascade,
  tenant_id       text        not null references tenants(id) on delete cascade,

  start_date      timestamptz not null,
  end_date        timestamptz not null,
  renewal_date    timestamptz,

  monthly_rent    float       not null,
  deposit_amount  float,
  lease_term      int         not null,
  terms           text,
  status          text        not null default 'active',

  -- Option clause
  has_option        boolean     not null default false,
  option_months     int,
  option_rent       float,
  option_start      timestamptz,
  option_end        timestamptz,
  option_terms      text,
  option_activated  boolean     not null default false,

  -- Early termination
  early_term_protection   boolean not null default false,
  tenant_notice_months    int,
  landlord_notice_months  int,

  -- Second tenant
  second_tenant_first_name  text,
  second_tenant_last_name   text,
  second_tenant_id_number   text,
  second_tenant_phone       text,
  second_tenant_email       text,

  -- Payment method
  payment_method        text,
  check_bank            text,
  check_branch          text,
  check_account         text,
  check_deposit_reminder boolean not null default false,

  -- Termination tracking
  termination_requested_by    text,
  termination_request_date    timestamptz,
  termination_effective_date  timestamptz,
  termination_reason          text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- LEASE DOCUMENTS
-- ----------------------------------------------------------------
create table if not exists lease_documents (
  id          text        primary key default gen_random_uuid()::text,
  lease_id    text        not null references leases(id) on delete cascade,
  file_name   text        not null,
  stored_name text        not null,
  mime_type   text        not null,
  size_bytes  int         not null,
  uploaded_at timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- EXPENSES
-- ----------------------------------------------------------------
create table if not exists expenses (
  id              text        primary key default gen_random_uuid()::text,
  user_id         uuid        not null references auth.users(id) on delete cascade,
  property_id     text        not null references properties(id) on delete cascade,
  category        text        not null,
  description     text        not null,
  amount          float       not null,
  date            timestamptz not null default now(),
  due_date        timestamptz,
  invoice_number  text,
  vendor_name     text,
  recurring       boolean     not null default false,
  recurring_freq  text,
  paid_by         text        not null default 'landlord',
  bill_transferred      boolean   not null default false,
  bill_transferred_date timestamptz,
  linked_asset_id text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- PAYMENTS
-- ----------------------------------------------------------------
create table if not exists payments (
  id              text        primary key default gen_random_uuid()::text,
  user_id         uuid        not null references auth.users(id) on delete cascade,
  property_id     text        not null references properties(id) on delete cascade,
  lease_id        text        references leases(id),
  payment_type    text        not null,
  amount          float       not null,
  due_date        timestamptz not null,
  paid_date       timestamptz,
  status          text        not null default 'pending',
  method          text,
  reference_num   text,
  check_number    text,
  check_date      timestamptz,
  deposit_reminder boolean    not null default false,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- TASKS
-- ----------------------------------------------------------------
create table if not exists tasks (
  id                  text        primary key default gen_random_uuid()::text,
  user_id             uuid        not null references auth.users(id) on delete cascade,
  title               text        not null,
  description         text,
  category            text        not null,
  due_date            timestamptz not null,
  completed_at        timestamptz,
  priority            text        not null default 'normal',
  status              text        not null default 'pending',
  related_entity_type text,
  related_entity_id   text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- PROPERTY ASSETS
-- ----------------------------------------------------------------
create table if not exists property_assets (
  id              text        primary key default gen_random_uuid()::text,
  user_id         uuid        not null references auth.users(id) on delete cascade,
  property_id     text        not null references properties(id) on delete cascade,
  name            text        not null,
  category        text        not null,
  brand           text,
  model           text,
  serial_number   text,
  purchase_date   timestamptz,
  warranty_until  timestamptz,
  condition       text        not null default 'good',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- מאפשר לכל משתמש לגשת רק לנתונים שלו
-- ----------------------------------------------------------------
alter table properties    enable row level security;
alter table tenants       enable row level security;
alter table leases        enable row level security;
alter table lease_documents enable row level security;
alter table expenses      enable row level security;
alter table payments      enable row level security;
alter table tasks         enable row level security;
alter table property_assets enable row level security;

-- Properties
create policy "properties_owner" on properties for all using (user_id = auth.uid());

-- Tenants
create policy "tenants_owner" on tenants for all using (user_id = auth.uid());

-- Leases
create policy "leases_owner" on leases for all using (user_id = auth.uid());

-- Lease documents (גישה דרך lease)
create policy "lease_documents_owner" on lease_documents for all
  using (exists (select 1 from leases where leases.id = lease_documents.lease_id and leases.user_id = auth.uid()));

-- Expenses
create policy "expenses_owner" on expenses for all using (user_id = auth.uid());

-- Payments
create policy "payments_owner" on payments for all using (user_id = auth.uid());

-- Tasks
create policy "tasks_owner" on tasks for all using (user_id = auth.uid());

-- Property assets
create policy "property_assets_owner" on property_assets for all using (user_id = auth.uid());

-- ----------------------------------------------------------------
-- STORAGE BUCKET
-- צור bucket בשם lease-documents ב-Supabase Dashboard → Storage
-- ----------------------------------------------------------------
-- (אי אפשר לצור bucket דרך SQL, יש לצור ידנית)
