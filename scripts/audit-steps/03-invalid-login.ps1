$ErrorActionPreference = "Stop"

Write-Host "[audit-step-03] POST /auth/login invalido (esperado 401)..."
$body = @{ email = "invalido@teste.com"; code = "00000" } | ConvertTo-Json

try {
  Invoke-RestMethod -Method Post -Uri "http://localhost:3000/auth/login" -ContentType "application/json" -Body $body | Out-Null
  $status = 200
} catch {
  $status = $_.Exception.Response.StatusCode.value__
}

Write-Host "[audit-step-03] status=$status"
