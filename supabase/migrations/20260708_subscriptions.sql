-- תשתית freemium (כבויה כרגע - ENFORCE_QUOTA=false ב-src/lib/plan.ts).
-- טבלת subscriptions: מקור האמת לתוכנית המשתמש (free/pro) לצורך אכיפת מכסת נכסים עתידית.
-- כתיבה רק דרך service_role (webhook עתידי מספק תשלום) - משתמש רגיל קורא בלבד את הרשומה שלו.
CREATE TABLE IF NOT EXISTS subscriptions (
  id                       serial      PRIMARY KEY,
  user_id                  uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan                     text        NOT NULL DEFAULT 'free',
  status                   text        NOT NULL DEFAULT 'active',
  current_period_end       timestamptz,
  trial_end                timestamptz,
  provider                 text,
  provider_customer_id     text,
  provider_subscription_id text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- קריאה עצמית בלבד; כתיבה רק דרך service_role (webhook עתידי)
DROP POLICY IF EXISTS "subscriptions_read_own" ON subscriptions;
CREATE POLICY "subscriptions_read_own" ON subscriptions FOR SELECT USING (user_id = auth.uid());

GRANT SELECT ON subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON subscriptions TO service_role;
