$ErrorActionPreference = "Stop"

Write-Host "[audit-step-02] GET /project sem token (esperado 401)..."
$status = & curl.exe --max-time 15 -s -o nul -w "%{http_code}" "http://localhost:3000/project"
Write-Host "[audit-step-02] status=$status"
