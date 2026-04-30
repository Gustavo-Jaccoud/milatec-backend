#!/usr/bin/env bash
set -euo pipefail

echo "[audit-step-02] GET /project sem token (esperado 401)..."
status="$(curl --max-time 15 -s -o /dev/null -w "%{http_code}" "http://localhost:3000/project")"
echo "[audit-step-02] status=$status"
