CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL,
  request_id TEXT,
  actor_email TEXT,
  actor_role TEXT,
  actor_tenant_id TEXT,
  target_tenant_id TEXT,
  http_method TEXT,
  route TEXT,
  entity TEXT,
  status_code INT,
  duration_ms INT,
  ip TEXT,
  user_agent TEXT,
  error_name TEXT,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_created_at
  ON audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_event_created
  ON audit_logs (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_actor_created
  ON audit_logs (actor_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_route_created
  ON audit_logs (route, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_status_created
  ON audit_logs (status_code, created_at DESC);
