-- ============================================================
-- Rental Journal - Supabase SQL Schema
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

  -- Index linkage (הצמדה למדד)
  linkage_type      text not null default 'none'
    check (linkage_type in ('none','usd','cpi')),
  linkage_frequency text not null default 'monthly'
    check (linkage_frequency in ('monthly','quarterly','semiannual')),
  base_amount       float,       -- שכ"ד בסיסי בעת חתימה
  base_date         timestamptz, -- תאריך בסיס לחישוב

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
  is_auto_tax     boolean     not null default false,
  source_payment_id text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- EXPENSES (המשך - עמודות מס אוטומטי)
-- הרץ ALTER אם הטבלה כבר קיימת:
--   ALTER TABLE expenses
--     ADD COLUMN IF NOT EXISTS is_auto_tax boolean NOT NULL DEFAULT false,
--     ADD COLUMN IF NOT EXISTS source_payment_id text;
-- ----------------------------------------------------------------

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
  partial_paid_amount float,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
-- הרץ ALTER אם הטבלה כבר קיימת:
--   ALTER TABLE payments ADD COLUMN IF NOT EXISTS partial_paid_amount float;

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
  source_payment_id   text        references payments(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- TASKS (המשך - קישור לתקבול מקור, לסגירת תזכורת שק אוטומטית)
-- הרץ ALTER אם הטבלה כבר קיימת:
--   ALTER TABLE tasks
--     ADD COLUMN IF NOT EXISTS source_payment_id text references payments(id) on delete set null;
-- ----------------------------------------------------------------

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
-- PUSH SUBSCRIPTIONS (מנויי Web Push)
-- ----------------------------------------------------------------
-- הערה: user_id כאן הוא text (הטבלה נוצרה ידנית), ולכן ה-policy משתמש ב-auth.uid()::text
create table if not exists push_subscriptions (
  id          serial      primary key,
  user_id     text        not null,
  endpoint    text        not null unique,
  p256dh      text        not null,
  auth        text        not null,
  created_at  timestamptz not null default now()
);

alter table push_subscriptions enable row level security;
create policy "push_subscriptions_owner" on push_subscriptions
  for all using (user_id = auth.uid()::text);

-- ----------------------------------------------------------------
-- INDEX RATES (שערי מדד והצמדה)
-- ----------------------------------------------------------------
create table if not exists index_rates (
  id          serial      primary key,
  type        text        not null check (type in ('usd','cpi')),
  period_date date        not null,
  value       float       not null,
  created_at  timestamptz not null default now(),
  unique (type, period_date)
);

-- index_rates נגישה לכולם לקריאה (ציבורי), כתיבה רק דרך service role (cron)
alter table index_rates enable row level security;
create policy "index_rates_read" on index_rates for select using (true);

-- ----------------------------------------------------------------
-- SUBSCRIPTIONS (תשתית freemium - כבויה כרגע, ENFORCE_QUOTA=false)
-- ----------------------------------------------------------------
create table if not exists subscriptions (
  id                       serial      primary key,
  user_id                  uuid        not null unique references auth.users(id) on delete cascade,
  plan                     text        not null default 'free',
  status                   text        not null default 'active',
  current_period_end       timestamptz,
  trial_end                timestamptz,
  provider                 text,
  provider_customer_id     text,
  provider_subscription_id text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
alter table subscriptions enable row level security;
create policy "subscriptions_read_own" on subscriptions for select using (user_id = auth.uid());

-- ----------------------------------------------------------------
-- FEEDBACK (פניות משתמשים מטופס האודות)
-- ----------------------------------------------------------------
create table if not exists feedback (
  id         serial      primary key,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  type       text        not null default 'other',
  message    text        not null,
  email      text,
  created_at timestamptz not null default now()
);
alter table feedback enable row level security;
create policy "feedback_insert_own" on feedback for insert with check (user_id = auth.uid());
create policy "feedback_read_own" on feedback for select using (user_id = auth.uid());

-- ----------------------------------------------------------------
-- PROPERTY UTILITIES (קונפיגורציית חשבונות שירות לפי נכס - מים/גז/חשמל/ארנונה/ועד בית/אחר)
-- ----------------------------------------------------------------
create table if not exists property_utilities (
  id             text        primary key default gen_random_uuid()::text,
  user_id        uuid        not null references auth.users(id) on delete cascade,
  property_id    text        not null references properties(id) on delete cascade,
  type           text        not null,
  custom_label   text,
  frequency      text        not null default 'monthly',
  anchor_month   int,
  responsibility text        not null default 'owner_pays',
  active         boolean     not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table property_utilities enable row level security;
create policy "property_utilities_owner" on property_utilities for all using (user_id = auth.uid());

-- ----------------------------------------------------------------
create table if not exists check_bounces (
  id          text        primary key default gen_random_uuid()::text,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  payment_id  text        references payments(id) on delete set null,
  lease_id    text        not null references leases(id) on delete cascade,
  bounced_at  date        not null,
  reason      text        not null
                check (reason in ('nsf','restricted','cancelled','other')),
  created_at  timestamptz not null default now()
);

create index if not exists check_bounces_lease_idx on check_bounces(lease_id);
create index if not exists check_bounces_payment_idx on check_bounces(payment_id);

alter table check_bounces enable row level security;
create policy "check_bounces_owner" on check_bounces for all using (user_id = auth.uid());

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
alter table check_bounces enable row level security;

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

-- Check bounces
create policy "check_bounces_owner" on check_bounces for all using (user_id = auth.uid());

-- ----------------------------------------------------------------
-- GRANTS - נדרש מ-30 אוקטובר 2026 (Supabase Data API change)
-- טבלאות ב-public חייבות GRANT מפורש כדי להיות נגישות ל-API
-- ----------------------------------------------------------------

-- index_rates - ציבורי לקריאה
grant select                            on public.index_rates       to anon;
grant select                            on public.index_rates       to authenticated;
grant select, insert, update, delete    on public.index_rates       to service_role;

-- טבלאות פרטיות - רק משתמשים מחוברים (RLS מגן על הנתונים)
grant select, insert, update, delete    on public.properties        to authenticated;
grant select, insert, update, delete    on public.tenants           to authenticated;
grant select, insert, update, delete    on public.leases            to authenticated;
grant select, insert, update, delete    on public.lease_documents   to authenticated;
grant select, insert, update, delete    on public.expenses          to authenticated;
grant select, insert, update, delete    on public.payments          to authenticated;
grant select, insert, update, delete    on public.tasks             to authenticated;
grant select, insert, update, delete    on public.property_assets   to authenticated;

grant select, insert, update, delete    on public.properties        to service_role;
grant select, insert, update, delete    on public.tenants           to service_role;
grant select, insert, update, delete    on public.leases            to service_role;
grant select, insert, update, delete    on public.lease_documents   to service_role;
grant select, insert, update, delete    on public.expenses          to service_role;
grant select, insert, update, delete    on public.payments          to service_role;
grant select, insert, update, delete    on public.tasks             to service_role;
grant select, insert, update, delete    on public.property_assets   to service_role;

-- ----------------------------------------------------------------
-- STORAGE BUCKET
-- צור bucket בשם lease-documents ב-Supabase Dashboard → Storage
-- ----------------------------------------------------------------
-- (אי אפשר לצור bucket דרך SQL, יש לצור ידנית)
