#!/usr/bin/env bash
set -euo pipefail

echo "[audit-step-04] GET /Ok (esperado 200)..."
status_ok="$(curl --max-time 15 -s -o /dev/null -w "%{http_code}" "http://localhost:3000/Ok")"
echo "[audit-step-04] /Ok status=$status_ok"

echo "[audit-step-04] GET /rota-inexistente (esperado 404)..."
status_not_found="$(curl --max-time 15 -s -o /dev/null -w "%{http_code}" "http://localhost:3000/rota-inexistente")"
echo "[audit-step-04] /rota-inexistente status=$status_not_found"
