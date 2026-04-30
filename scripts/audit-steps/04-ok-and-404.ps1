$ErrorActionPreference = "Stop"

Write-Host "[audit-step-04] GET /Ok (esperado 200)..."
$statusOk = & curl.exe --max-time 15 -s -o nul -w "%{http_code}" "http://localhost:3000/Ok"
Write-Host "[audit-step-04] /Ok status=$statusOk"

Write-Host "[audit-step-04] GET /rota-inexistente (esperado 404)..."
$statusNotFound = & curl.exe --max-time 15 -s -o nul -w "%{http_code}" "http://localhost:3000/rota-inexistente"
Write-Host "[audit-step-04] /rota-inexistente status=$statusNotFound"
