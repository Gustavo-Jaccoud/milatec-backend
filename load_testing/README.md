# 5.0 Testes de Sobrecarga (Load Testing)

## Ferramenta

Foi adotado **k6** por ser simples para projeto inicial, versionável em JavaScript e com suporte nativo a thresholds.

## Estrutura atual

```
load_testing/
├── config.js
├── login.test.js
├── projects.test.js
├── full-load.test.js
├── run-tests.sh
├── RESULTS.md
└── README.md
```

## Endpoints cobertos (backend atual)

- `POST /auth/login`
- `GET /project`

> Observacao: o controller atual de `project` expoe leitura; criacao nao foi incluida para evitar falso negativo em endpoint nao implementado.

## Thresholds adotados

- Tempo de resposta: `p(95) < 500ms`
- Taxa de erro: `< 1%`
- Complementar: `p(99) < 1000ms`

## Cenarios de teste

- `login.test.js`: baseline de autenticacao (ramp-up simples).
- `projects.test.js`: baseline de leitura de projetos com token.
- `full-load.test.js`: mistura de ramp-up, spike e taxa constante.

## Variaveis de ambiente

- `BASE_URL` (default: `http://localhost:3000`)
- `AUTH_TOKEN` (JWT para rotas protegidas)
- `LOGIN_EMAIL` (email de teste para login)
- `LOGIN_CODE` (codigo de verificacao para obter `accessToken`)
- `ENABLE_AUTH_SCENARIO` (`true|false`, default `false`)

### Fluxo automatico de login no setup

- Se `AUTH_TOKEN` existir, ele sera usado diretamente.
- Se `AUTH_TOKEN` nao existir, o `setup` faz:
  - `POST /auth/login` com `email` para disparar o codigo.
  - `POST /auth/login` com `email + code` para obter `accessToken`.
- Se `LOGIN_CODE` nao for informado, o teste falha cedo com mensagem orientando a rerodar apos sua logica capturar o codigo.
- No `full-load`, mantenha `ENABLE_AUTH_SCENARIO=false` para testes focados em endpoints protegidos sem distorcer taxa de erro por MFA/codigo de login.

## Execucao

No Bash/Git Bash:

```bash
chmod +x ./load_testing/run-tests.sh
./load_testing/run-tests.sh full http://localhost:3000
```

No PowerShell (Windows), execute direto com k6:

```powershell
$env:BASE_URL="http://localhost:3000"
$env:AUTH_TOKEN=""
$env:LOGIN_EMAIL="seu-email@teste.com"
$env:LOGIN_CODE="ABCDE"
k6 run .\load_testing\full-load.test.js --summary-export=.\load_testing\reports\full-summary.json
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

### 2) Rodar sobrecarga completa (sem cenário de auth)

```powershell
docker run --rm -i -v "${PWD}:/work" -w /work grafana/k6 run load_testing/full-load.test.js --env BASE_URL=http://host.docker.internal:3000 --env AUTH_TOKEN="<TOKEN>" --env ENABLE_AUTH_SCENARIO=false --summary-export=load_testing/reports/full-summary.json
```

### 3) Gerar/atualizar relatório consolidado

```powershell
node .\load_testing\generate-results.js --write
```

## Relatorio automatico (RESULTS.md)

Gerar apenas no terminal (stdout):

```powershell
node .\load_testing\generate-results.js
```

Gerar e atualizar automaticamente a secao no arquivo `load_testing/RESULTS.md`:

```powershell
node .\load_testing\generate-results.js --write
```

Fluxo recomendado apos cada rodada:

```powershell
# 1) Executar teste
docker run --rm -i -v "${PWD}:/work" -w /work grafana/k6 run load_testing/projects.test.js --env BASE_URL=http://host.docker.internal:3000 --env AUTH_TOKEN="<TOKEN>" --summary-export=load_testing/reports/projects-summary.json

# 2) (Opcional) Executar full-load
docker run --rm -i -v "${PWD}:/work" -w /work grafana/k6 run load_testing/full-load.test.js --env BASE_URL=http://host.docker.internal:3000 --env AUTH_TOKEN="<TOKEN>" --env ENABLE_AUTH_SCENARIO=false --summary-export=load_testing/reports/full-summary.json

# 3) Atualizar relatorio
node .\load_testing\generate-results.js --write
```

## Como evoluir depois do MVP

- Adicionar cenarios separados por perfil (admin x user).
- Cobrir novos endpoints criticos (construction, delivery).
- Automatizar execucao no CI em janela noturna ou manual.
