#!/usr/bin/env bash
set -euo pipefail

echo "[audit-step-03] POST /auth/login invalido (esperado 401)..."
status="$(curl --max-time 15 -s -o /dev/null -w "%{http_code}" -H "Content-Type: application/json" -d '{"email":"invalido@teste.com","code":"00000"}' "http://localhost:3000/auth/login")"
echo "[audit-step-03] status=$status"
