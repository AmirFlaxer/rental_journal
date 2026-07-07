-- אבטחה: RLS על push_subscriptions - הטבלה נוצרה ידנית ולא הופיעה ב-supabase_schema.sql,
-- וללא RLS כל משתמש מחובר יכול לקרוא/לכתוב מנויי Push של כל המשתמשים.
-- בטוח להריץ גם אם ה-RLS כבר פעיל (idempotent).
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- הערה: עמודת user_id בטבלה זו היא מסוג text (נוצרה ידנית, לא uuid כמו בשאר הטבלאות),
-- ולכן נדרשת המרה auth.uid()::text כדי שההשוואה תעבוד.
DROP POLICY IF EXISTS "push_subscriptions_owner" ON push_subscriptions;
CREATE POLICY "push_subscriptions_owner" ON push_subscriptions
  FOR ALL USING (user_id = auth.uid()::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO service_role;
