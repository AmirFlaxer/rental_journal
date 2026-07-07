-- קישור תזכורת לתקבול שסגר אותה (סגירת תזכורת שק אוטומטית עם אישור תקבול)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS source_payment_id text REFERENCES payments(id) ON DELETE SET NULL;
