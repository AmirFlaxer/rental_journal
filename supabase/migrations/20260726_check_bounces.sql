-- טבלת check_bounces - אירועי החזרת שק מהבנק.
-- אירוע ולא סטטוס: שק חלופי שגם חוזר יוצר שורה נוספת, כך שהשרשרת המלאה
-- נשמרת ומשמשת ראיה לביטול חוזה ופינוי.
-- payment_id הוא ON DELETE SET NULL בכוונה - ההיסטוריה שורדת מחיקת תקבול.
-- ראו docs/superpowers/specs/2026-07-26-bounced-checks-design.md

CREATE TABLE IF NOT EXISTS check_bounces (
  id          text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id  text        REFERENCES payments(id) ON DELETE SET NULL,
  lease_id    text        NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  bounced_at  date        NOT NULL,
  reason      text        NOT NULL
                CHECK (reason IN ('nsf','restricted','cancelled','other')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS check_bounces_lease_idx ON check_bounces(lease_id);
CREATE INDEX IF NOT EXISTS check_bounces_payment_idx ON check_bounces(payment_id);

ALTER TABLE check_bounces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "check_bounces_owner" ON check_bounces FOR ALL USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON check_bounces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON check_bounces TO service_role;
