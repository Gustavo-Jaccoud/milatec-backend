$ErrorActionPreference = "Stop"

Write-Host "[audit-step-05] Consultando audit_logs..."
docker exec milatec-audit-postgres psql -U audit_user -d audit_db -c "SELECT event_type, actor_email, actor_role, actor_tenant_id, route, status_code FROM audit_logs ORDER BY created_at DESC LIMIT 50;"
