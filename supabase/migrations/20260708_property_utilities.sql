-- טבלת property_utilities - קונפיגורציית חשבונות שירות לפי נכס (מים/גז/חשמל/ארנונה/ועד בית/אחר)
-- משמשת ליצירת תזכורות מחזוריות וירטואליות (ראו docs/superpowers/specs/2026-07-08-property-utilities-design.md)

CREATE TABLE IF NOT EXISTS property_utilities (
  id             text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id    text        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  type           text        NOT NULL,
  custom_label   text,
  frequency      text        NOT NULL DEFAULT 'monthly',
  anchor_month   int,
  responsibility text        NOT NULL DEFAULT 'owner_pays',
  active         boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE property_utilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property_utilities_owner" ON property_utilities FOR ALL USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON property_utilities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON property_utilities TO service_role;
