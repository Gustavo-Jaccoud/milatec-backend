# Resultados de Load Testing

## Contexto da execucao

- Data: 2026-06-10
- Ambiente: desenvolvimento (Docker)
- Base URL: `http://host.docker.internal:3000`
- Scripts atualizados: `request-pin`/`verify-pin`, `construction`, `delivery`
- Commit: nao coletado nesta rodada
- Responsavel: Hugo + Codex

## Rodada 1 - Baselines (ate 30 VUs)

| Script | p95 | error_rate | http_req_failed | Status |
|--------|-----|------------|-----------------|--------|
| `login.test.js` (request-pin) | 224ms | 0.00% | 0.00% | OK |
| `projects.test.js` | 522ms | 6.49%* | 0.00% | Latencia* |
| `construction.test.js` | 270ms | 0.61% | 0.00% | OK |
| `delivery.test.js` | 255ms | 0.44% | 0.00% | OK |

\* `projects.test.js` rodou logo apos o `full-load` (API ainda quente); em rodada isolada anterior passou com p95=286ms.

## Rodada 2 - Sobrecarga completa (full-load.test.js)

- Script: `full-load.test.js` (`ENABLE_AUTH_SCENARIO=false`)
- Endpoints: `project` + `construction` + `delivery` por iteracao
- Duracao: `8m`
- VUs maximos: `234`
- Requisicoes: `14505` (`30.22 req/s`)

### Metricas principais

- `http_req_duration p(95)`: `5.27s`
- `http_req_duration p(99)`: `19.45s`
- `http_req_failed`: `0.11%`
- `error_rate`: `0.11%`

### Status dos thresholds

- [ ] `p(95) < 500ms` (falhou)
- [ ] `p(99) < 1000ms` (falhou)
- [x] `error_rate < 1%`
- [x] `http_req_failed < 1%`

## Gargalos observados

- Sob spike (200 VUs), latencia explode para segundos em todos os endpoints de leitura.
- Timeouts de ate ~60s em algumas requisicoes durante pico (`max` ~60s).
- `full-load` triplicou carga por iteracao (3 endpoints); throughput subiu, mas latencia piorou vs rodada anterior.
- Integracoes externas (Airtable) e auditoria continuam como suspeitos de custo por request.

## Recomendacoes

- Aplicar paginacao/limit em listagens de `project` e reduzir payload retornado.
- Revisar filtros/consulta de dados para evitar operacoes pesadas sem indice/recorte.
- Introduzir cache para leitura frequente (curto TTL) no endpoint de listagem.
- Medir separadamente: baseline (ate 30 VUs) x stress/spike, para capacity planning gradual.

## Automacao do relatorio

Sim, e possivel automatizar totalmente.

### 1) Gerar resumo automatico dos JSONs

```powershell
node .\load_testing\generate-results.js
```

O script le:
- `load_testing/reports/login-summary.json`
- `load_testing/reports/projects-summary.json`
- `load_testing/reports/construction-summary.json`
- `load_testing/reports/delivery-summary.json`
- `load_testing/reports/full-summary.json`

E imprime um bloco Markdown com:
- p95/p99
- taxa de erro e falha HTTP
- throughput
- principais checks com falha

### 2) Capturar automaticamente trechos de impacto

Tambem e possivel (e recomendado) capturar apenas as metricas que degradaram e colar no `RESULTS.md`:
- `http_req_duration p(95/p99)`
- `checks_failed`
- checks por endpoint (ex.: `projects list < 500ms`)

Assim o relatorio final fica repetivel e sem trabalho manual.

## Resumo gerado automaticamente

<!-- AUTO_RESULTS_START -->
# Resumo automatico de load test

## login.test.js
- p95: 223.71ms
- p99: n/a
- erro (custom): 0.00%
- falha HTTP: 0.00%
- throughput: 0.02 req/s
- checks com impacto: nenhum

## projects.test.js
- p95: 522.45ms
- p99: n/a
- erro (custom): 6.49%
- falha HTTP: 0.00%
- throughput: 21.45 req/s
- checks com impacto:
- lista: tempo < 500ms: 223 falhas

## construction.test.js
- p95: 269.84ms
- p99: n/a
- erro (custom): 0.61%
- falha HTTP: 0.00%
- throughput: 22.57 req/s
- checks com impacto:
- lista: tempo < 500ms: 22 falhas

## delivery.test.js
- p95: 255.43ms
- p99: n/a
- erro (custom): 0.44%
- falha HTTP: 0.00%
- throughput: 22.84 req/s
- checks com impacto:
- lista: tempo < 500ms: 16 falhas

## full-load.test.js
- p95: 5271.72ms
- p99: n/a
- erro (custom): 0.11%
- falha HTTP: 0.11%
- throughput: 30.22 req/s
- checks com impacto:
- [projects] list 200: 9 falhas
- [projects] list < 500ms: 1284 falhas
- [construction] list 200: 3 falhas
- [construction] list < 500ms: 1210 falhas
- [delivery] list 200: 4 falhas
- [delivery] list < 500ms: 1166 falhas

<!-- AUTO_RESULTS_END -->
