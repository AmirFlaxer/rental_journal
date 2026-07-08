-- טבלת feedback - שמירת פניות משתמשים (דיווח באגים / בקשות פיצ'ר) מדף /dashboard/about
-- בנוסף לשליחה הקיימת ב-mailto, כדי שתהיה לנו היסטוריה ב-DB

CREATE TABLE IF NOT EXISTS feedback (
  id         serial      PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       text        NOT NULL DEFAULT 'other',
  message    text        NOT NULL,
  email      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_insert_own" ON feedback FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "feedback_read_own" ON feedback FOR SELECT USING (user_id = auth.uid());

GRANT SELECT, INSERT ON feedback TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON feedback TO service_role;
