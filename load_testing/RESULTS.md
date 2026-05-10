# Resultados de Load Testing

## Contexto da execucao

- Data: 2026-05-10
- Ambiente: desenvolvimento
- Base URL: `http://host.docker.internal:3000` (execucao via Docker)
- Commit: nao coletado nesta rodada
- Responsavel: Hugo + Codex

## Rodada 1 - Baseline de leitura (projects.test.js)

- Script: `projects.test.js`
- Duracao: `2m40s`
- VUs maximos: `30`

## Metricas principais

- `http_req_duration p(95)`: `244.23ms`
- `http_req_duration p(99)`: `485.65ms`
- `http_req_failed`: `0.00%`
- `error_rate`: `0.93%`
- `http_reqs`: `3728` (`23.20 req/s`)

## Status dos thresholds

- [x] `p(95) < 500ms`
- [x] `error_rate < 1%`
- [x] `http_req_failed < 1%`

## Rodada 2 - Sobrecarga completa (full-load.test.js)

- Script: `full-load.test.js` (`ENABLE_AUTH_SCENARIO=false`)
- Duracao: ~`8m`
- VUs maximos: `234`

### Metricas principais

- `http_req_duration p(95)`: `2.96s`
- `http_req_duration p(99)`: `6.2s`
- `http_req_failed`: `0.00%`
- `error_rate`: `0.00%`
- `http_reqs`: `9018` (`19.88 req/s`)

### Status dos thresholds

- [ ] `p(95) < 500ms` (falhou)
- [x] `error_rate < 1%`
- [x] `http_req_failed < 1%`

## Gargalos observados

- Sob carga alta, latencia cresce fortemente (p95 em segundos), apesar de sem falhas HTTP.
- Principal impacto concentrado em leitura de `GET /project` (cauda longa de resposta).
- Logs de auditoria e integracoes externas podem aumentar custo por request em cenarios de pico.

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
- `load_testing/reports/projects-summary.json`
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

## projects.test.js
- p95: 244.23ms
- p99: n/a
- erro (custom): 0.94%
- falha HTTP: 0.00%
- throughput: 23.21 req/s
- checks com impacto:
- lista: tempo < 500ms: 35 falhas

## full-load.test.js
- p95: 2969.92ms
- p99: n/a
- erro (custom): 0.00%
- falha HTTP: 0.00%
- throughput: 19.89 req/s
- checks com impacto:
- [projects] list < 500ms: 1692 falhas

<!-- AUTO_RESULTS_END -->
