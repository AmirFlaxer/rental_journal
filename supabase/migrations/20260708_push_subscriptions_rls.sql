-- אבטחה: RLS על push_subscriptions - הטבלה נוצרה ידנית ולא הופיעה ב-supabase_schema.sql,
-- וללא RLS כל משתמש מחובר יכול לקרוא/לכתוב מנויי Push של כל המשתמשים.
-- בטוח להריץ גם אם ה-RLS כבר פעיל (idempotent).
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subscriptions_owner" ON push_subscriptions;
CREATE POLICY "push_subscriptions_owner" ON push_subscriptions
  FOR ALL USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO service_role;
