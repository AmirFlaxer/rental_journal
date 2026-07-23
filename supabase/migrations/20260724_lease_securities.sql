-- טבלת lease_securities - בטחונות המוחזקים תחת חוזה
-- (שק/שטר ביטחון, שקי חשבונות שירות, פיקדון כספי). מעקב סטטוס ידני בלבד -
-- אין תזכורות, אין תנועת-כסף, אין נגיעה בדוחות.
-- ראו docs/superpowers/specs/2026-07-24-lease-securities-design.md

CREATE TABLE IF NOT EXISTS lease_securities (
  id            text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lease_id      text        NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  property_id   text        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  kind          text        NOT NULL
                  CHECK (kind IN ('cash_deposit','security_check','promissory_note','utility_check','other')),
  utility_type  text        CHECK (utility_type IN ('electricity','water','gas','municipal_tax')),
  amount        numeric,
  bank          text,
  branch        text,
  account       text,
  check_number  text,
  status        text        NOT NULL DEFAULT 'held'
                  CHECK (status IN ('held','returned','cashed')),
  received_date date,
  resolved_date date,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lease_securities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lease_securities_owner" ON lease_securities FOR ALL USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON lease_securities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON lease_securities TO service_role;
