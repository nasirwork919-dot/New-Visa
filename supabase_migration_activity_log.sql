-- Migration: Create activity_log table
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS activity_log (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  action      TEXT        NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  description TEXT,
  actor_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name  TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_created_at   ON activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_type  ON activity_log (entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_actor_id     ON activity_log (actor_id);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all activity
CREATE POLICY "Authenticated users can read activity_log"
  ON activity_log FOR SELECT TO authenticated USING (true);

-- Authenticated users can write activity
CREATE POLICY "Authenticated users can insert activity_log"
  ON activity_log FOR INSERT TO authenticated WITH CHECK (true);
