# 5.0 Testes de Sobrecarga (Load Testing)

## Ferramenta

Foi adotado **k6** por ser simples para projeto inicial, versionável em JavaScript e com suporte nativo a thresholds.

## Estrutura atual

```
load_testing/
├── auth-setup.js
├── config.js
├── login.test.js
├── projects.test.js
├── construction.test.js
├── delivery.test.js
├── full-load.test.js
├── generate-results.js
├── run-tests.sh
├── RESULTS.md
└── README.md
```

## Endpoints cobertos (backend atual)

### Autenticacao
- `POST /auth/request-pin` — baseline de envio de PIN (`login.test.js`)
- `POST /auth/verify-pin` — usado no `setup` para obter JWT (`auth-setup.js`)
- `POST /auth/login` — legado; nao usado nos testes de carga

### Leitura protegida
- `GET /project`
- `GET /construction`
- `GET /delivery`

> Criacao/escrita nao foi incluida para evitar falso negativo em endpoints nao implementados.

## Thresholds adotados

- Tempo de resposta: `p(95) < 500ms`
- Taxa de erro: `< 1%`
- Complementar: `p(99) < 1000ms`

## Cenarios de teste

- `login.test.js`: baseline de `request-pin` (respeita cooldown de 60s por e-mail).
- `projects.test.js`: baseline de leitura de projetos com token.
- `construction.test.js`: baseline de leitura de obras com token.
- `delivery.test.js`: baseline de leitura de entregas com token.
- `full-load.test.js`: mistura de ramp-up, spike e taxa constante (projects + construction + delivery).

## Variaveis de ambiente

- `BASE_URL` (default: `http://localhost:3000`)
- `AUTH_TOKEN` (JWT para rotas protegidas; evita fluxo de PIN)
- `LOGIN_EMAIL` (e-mail cadastrado para fluxo de PIN)
- `LOGIN_PIN` (PIN de 4 digitos; `LOGIN_CODE` aceito como alias legado)
- `LOGIN_EMAILS` (opcional: lista separada por virgula para paralelizar `request-pin`)
- `PIN_RESEND_COOLDOWN_SEC` (default: `65`, alinhado ao cooldown do backend)
- `ENABLE_AUTH_SCENARIO` (`true|false`, default `false` no `full-load`)

### Fluxo automatico de autenticacao no setup

Implementado em `auth-setup.js`:

1. Se `AUTH_TOKEN` existir, ele e usado diretamente.
2. Caso contrario:
   - `POST /auth/request-pin` com `email`
   - `POST /auth/verify-pin` com `email + pin` para obter `accessToken`
3. Se `LOGIN_PIN` nao for informado, o teste falha cedo orientando a capturar o PIN (logs `[DEV_AUTH_CODE]` em desenvolvimento).

### Observacao sobre `request-pin` sob carga

O backend aplica cooldown de 60s por e-mail. Com um unico `LOGIN_EMAIL`, `login.test.js` usa `sleep(65)` entre iteracoes. Para carga paralela de auth, informe varios e-mails cadastrados em `LOGIN_EMAILS`.

No `full-load`, mantenha `ENABLE_AUTH_SCENARIO=false` para evitar distorcer metricas por cooldown/rate-limit de PIN.

## Execucao

No Bash/Git Bash:

```bash
chmod +x ./load_testing/run-tests.sh
./load_testing/run-tests.sh all http://localhost:3000
```

No PowerShell (Windows), execute via Docker:

```powershell
$env:BASE_URL="http://host.docker.internal:3000"
$env:AUTH_TOKEN="<TOKEN>"
$env:LOGIN_EMAIL="seu-email@teste.com"
$env:LOGIN_PIN="1234"

docker run --rm -i -v "${PWD}:/work" -w /work grafana/k6 run load_testing/projects.test.js `
  --env BASE_URL=$env:BASE_URL `
  --env AUTH_TOKEN=$env:AUTH_TOKEN `
  --summary-export=load_testing/reports/projects-summary.json
```

Os artefatos sao salvos em `load_testing/reports/`.

## Execucao via Docker (Windows/PowerShell)

Pre-requisitos:
- Docker Desktop em execucao
- API rodando localmente em `:3000`

### 1) Rodar baseline de projetos

```powershell
docker run --rm -i -v "${PWD}:/work" -w /work grafana/k6 run load_testing/projects.test.js --env BASE_URL=http://host.docker.internal:3000 --env AUTH_TOKEN="<TOKEN>" --summary-export=load_testing/reports/projects-summary.json
```

### 2) Rodar baseline de auth (request-pin)

```powershell
docker run --rm -i -v "${PWD}:/work" -w /work grafana/k6 run load_testing/login.test.js --env BASE_URL=http://host.docker.internal:3000 --env LOGIN_EMAIL="seu-email@teste.com" --summary-export=load_testing/reports/login-summary.json
```

### 3) Rodar sobrecarga completa (sem cenario de auth)

```powershell
docker run --rm -i -v "${PWD}:/work" -w /work grafana/k6 run load_testing/full-load.test.js --env BASE_URL=http://host.docker.internal:3000 --env AUTH_TOKEN="<TOKEN>" --env ENABLE_AUTH_SCENARIO=false --summary-export=load_testing/reports/full-summary.json
```

### 4) Gerar/atualizar relatorio consolidado

```powershell
node .\load_testing\generate-results.js --write
```

## Relatorio automatico (RESULTS.md)

```powershell
node .\load_testing\generate-results.js --write
```

## Como evoluir depois do MVP

- Adicionar cenarios separados por perfil (admin x user).
- Cobrir endpoints de detalhe (`GET /:id`, `GET /construction/:id`).
- Automatizar execucao no CI em janela noturna ou manual.
