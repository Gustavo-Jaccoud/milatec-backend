$ErrorActionPreference = "Stop"

Write-Host "[audit-step-01] Limpando audit_logs..."
docker exec milatec-audit-postgres psql -U audit_user -d audit_db -c "TRUNCATE TABLE audit_logs;"

Write-Host "[audit-step-01] Concluido."
