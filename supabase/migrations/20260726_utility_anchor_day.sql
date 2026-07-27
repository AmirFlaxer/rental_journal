-- עמודת anchor_day ל-property_utilities - יום החידוש בחודש, לתדירות annual.
-- לתדירות שנתית לא מספיק חודש-עוגן: ביטוח מתחדש בתאריך מלא (למשל 31.10),
-- ואילו anchor_month לבדו קובע רק את החודש.
-- nullable בכוונה: monthly/bimonthly נשארות מעוגנות ל-1 בחודש ולא משתמשות בעמודה.
-- ראו docs/superpowers/specs/2026-07-26-utility-reminders-design.md

ALTER TABLE property_utilities ADD COLUMN IF NOT EXISTS anchor_day int;

COMMENT ON COLUMN property_utilities.anchor_day IS
  'יום בחודש (1-31) לתדירות annual. null לשאר התדירויות.';
