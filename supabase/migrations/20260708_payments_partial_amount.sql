-- העברת סכום תשלום חלקי מקידוד טקסטואלי ב-notes (__partial__:<amount>\n<reason>)
-- לעמודת DB אמיתית. backfill לרשומות ישנות כדי לא לאבד נתונים - notes נשאר כמו
-- שהוא (לא מוחקים את הקידוד הישן), הקריאה באפליקציה מעדיפה את העמודה החדשה
-- ונופלת חזרה לפענוח notes רק כשהעמודה ריקה.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS partial_paid_amount float;

UPDATE payments SET partial_paid_amount = substring(notes from '__partial__:([0-9.]+)')::float
  WHERE partial_paid_amount IS NULL AND status = 'partial' AND notes LIKE '\_\_partial\_\_:%';
