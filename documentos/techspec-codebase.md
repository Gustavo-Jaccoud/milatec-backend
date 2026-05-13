# Tech Spec: Milatec Backend

## 1. Visao Geral

O `milatec-backend` e uma API backend em NestJS/TypeScript para autenticar usuarios da MilaTec, expor dados operacionais de obras, projetos e entregas, e registrar eventos de auditoria. A API funciona como uma camada BFF/API REST sobre Airtable, usando o Airtable como fonte operacional principal e um PostgreSQL separado apenas para logs de auditoria.

O escopo de negocio visivel no codigo esta concentrado em tres dominios de consulta: `construction` para obras/orcamentos, `project` para projetos associados a obras, e `delivery` para entregas. A autenticacao e feita por login sem senha com codigo enviado por email, cache temporario em memoria e JWT para chamadas protegidas.

## 2. Stack Tecnologico

| Area | Tecnologia |
| --- | --- |
| Core | TypeScript 5.7, Node.js, NestJS 11 |
| Build/package | NPM, Nest CLI, TypeScript `nodenext` |
| Interface | REST HTTP com decorators NestJS; Swagger em `/docs` fora de producao |
| Banco operacional | Airtable via pacote `airtable` |
| Banco de auditoria | PostgreSQL 16 via `pg`, com Docker Compose dedicado |
| Auth | JWT via `@nestjs/jwt`, guards globais, decorator `@Roles` |
| Email | `@nestjs-modules/mailer`, Nodemailer, template Handlebars |
| Cache | `@nestjs/cache-manager` para codigo de verificacao |
| Testes | Jest, ts-jest, Supertest; smoke scripts para auditoria |
| Qualidade | ESLint flat config, Prettier |

Dependencias criticas:

- `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`: runtime NestJS.
- `@nestjs/config`: leitura de variaveis de ambiente.
- `@nestjs/jwt`: emissao e verificacao de JWT.
- `@nestjs/cache-manager` e `cache-manager`: cache temporario de codigo de login.
- `airtable`: consultas na base Airtable.
- `pg`: conexao direta com PostgreSQL de auditoria.
- `@nestjs-modules/mailer`, `nodemailer`, `handlebars`: envio de email com codigo de confirmacao.
- `@nestjs/swagger` e `swagger-ui-express`: documentacao interativa em ambiente nao produtivo.

## 3. Arquitetura e Padroes

### 3.1 Padroes Predominantes

| Modulo/Diretorio | Papel | Padrao Arquitetural | Notas |
| --- | --- | --- | --- |
| `src/main.ts` | Bootstrap HTTP | NestJS bootstrap + middleware/filter/interceptor global | Cria `requestId`, registra auditoria global e habilita Swagger fora de producao. |
| `src/app.module.ts` | Composicao raiz | Modular NestJS | Importa todos os modulos, configura mailer e registra guards globais. |
| `src/auth` | Autenticacao e autorizacao | Controller -> Service + Guards | Login por codigo de email, cache, JWT e auditoria explicita de login. |
| `src/user` | Resolucao de usuario | Service + model simples | Carrega contato no Airtable e converte para `User`. |
| `src/airtable` | Gateway externo | Provider de infraestrutura | Encapsula `airtable.base`, `getAll`, `getById` e consulta por email. |
| `src/construction` | Obras/orcamentos | Controller -> Service -> AirtableService | Consulta tabela `Orcamentos` com filtro por empresa. |
| `src/project` | Projetos | Controller -> Service -> AirtableService | Consulta tabela `Projetos`, incluindo filtro por obra/orcamento. |
| `src/delivery` | Entregas | Controller -> Service -> AirtableService | Consulta tabela `Entregas`, incluindo filtro por obra/orcamento. |
| `src/audit` | Auditoria transversal | Global Module + Repository | Insere eventos no Postgres e sanitiza metadados sensiveis. |
| `src/email` | Envio de codigo | Service + template | Usa `MailerService` e `CodeEmailTemplate.hbs`. |
| `scripts/audit-steps` | Validacao operacional | Smoke scripts | Exercitam cenarios de auditoria e consultam `audit_logs`. |
| `database/audit` | Infra de auditoria | SQL schema | Cria tabela `audit_logs` e indices. |

O desenho e predominantemente Layered/NestJS Modules. Nao ha Clean Architecture ou Hexagonal formal: os services de dominio chamam diretamente `AirtableService`, os modelos sao classes simples, e as regras de filtro ainda vivem dentro dos services.

### 3.2 Engines e Abstracoes Core

**AirtableService**

Gateway central para Airtable. Ele instancia `Airtable` no construtor com `AIRTABLE_API_KEY` e `AIRTABLE_BASE_ID`, e oferece:

- `getUserByEmail(email)`: consulta a tabela `Contatos`.
- `getAll(tableName, query)`: executa `select(...).all()` com campos e filtros opcionais.
- `getById(tableName, id)`: localiza um registro por ID Airtable.

**QueryAirtable**

Objeto simples usado para padronizar `fields` e `filterByFormula`. Ele e passado para `AirtableService.getAll`.

**AuthService**

Orquestra o login em duas etapas:

1. Busca usuario no Airtable por email.
2. Se nao ha codigo em cache, gera codigo de 5 caracteres, armazena no cache e envia email.
3. Se o codigo informado bate com o cache, emite JWT com `name`, `email`, `role` e `idEmpresa`.
4. Registra eventos `AUTH_LOGIN_FAILED` ou `AUTH_LOGIN_SUCCESS` no AuditService.

**AuditInterceptor**

Interceptor global para respostas bem-sucedidas. Registra `HTTP_ACCESS` com request id, usuario autenticado, rota, status, duracao, parametros e query.

**AuditExceptionFilter**

Filter global para excecoes. Converte excecoes em resposta JSON, classifica eventos como `AUTHN_DENIED`, `AUTHZ_DENIED` ou `HTTP_ERROR`, e grava detalhes no Postgres via `AuditService`.

**AuditRepository**

Repository de infraestrutura com `pg.Pool`. Ele aplica fallbacks para variaveis `AUDIT_DB_*`, insere em `audit_logs` e faz degrade silencioso com log caso a auditoria falhe.

**sanitizeValue**

Sanitizador recursivo para metadata de auditoria. Remove valores de chaves sensiveis como `password`, `token`, `authorization`, `cookie`, `code`, `refreshToken`, `accessToken`, `apiKey` e `secret`, e trunca strings longas.

## 4. Design de Codigo e Convencoes

### 4.1 Nomenclatura

| Tipo | Convencao observada |
| --- | --- |
| Modulos Nest | `*.module.ts`, classes `AuthModule`, `ProjectModule`, `AuditModule`. |
| Controllers | `*.controller.ts`, classes `AuthController`, `DeliveryController`. |
| Services | `*.service.ts`, classes `AuthService`, `AirtableService`. |
| Guards | `*.guard.ts`, classes `AuthGuard`, `RolesGuard`. |
| Decorators | `*.decorator.ts`, exemplo `roles.decorator.ts`. |
| DTOs | `*.dto.ts`, exemplo `LoginDto`, `ApiResponse`. |
| Modelos simples | `*.model.ts`, exemplo `User`. |
| Enums | `*.enum.ts`, exemplo `UserRole`. |
| Tipos | `*.types.ts`, exemplo `AuditLogEntry`. |
| Templates de email | `src/email/templates/*.hbs`. |
| Testes e2e | `test/*.e2e-spec.ts`. |

Os imports usam uma mistura de caminhos relativos e absolutos via `baseUrl`, por exemplo `src/user/user.service` e `./auth.service`. O projeto nao usa aliases dedicados como `@app/*`.

### 4.2 Padrao de Modulos

Cada dominio HTTP segue o padrao:

1. `XModule` importa dependencias como `AirtableModule`.
2. `XController` declara as rotas e aplica `@Roles`.
3. `XService` monta filtros Airtable, trata erros basicos e delega para `AirtableService`.
4. Respostas de listagem/detalhe sao embrulhadas em `ApiResponse`.

Exemplo de dominios:

- `construction`: tabela Airtable `Orcamentos`.
- `project`: tabela Airtable `Projetos`.
- `delivery`: tabela Airtable `Entregas`.

### 4.3 Autenticacao e Autorizacao

`AuthGuard` e `RolesGuard` sao registrados como `APP_GUARD`, portanto rodam globalmente. A exigencia real de token depende da presenca de metadata `@Roles` na rota ou controller:

- Rotas sem `@Roles` sao publicas.
- Rotas com `@Roles(UserRole.ADMIN, UserRole.USER)` exigem Bearer token valido.
- `RolesGuard` compara a role do JWT com as roles exigidas.

Rotas publicas atuais:

- `POST /auth/login`
- `GET /Ok`
- Swagger `/docs` em ambiente nao produtivo.

Rotas protegidas atuais:

- `GET /construction`
- `GET /construction/:id`
- `GET /project`
- `GET /project/:id`
- `GET /project/construction/:id`
- `GET /delivery`
- `GET /delivery/:id`
- `GET /delivery/construction/:id`

### 4.4 Tratamento de Erros

Padrao atual:

- Erros de autenticacao usam `UnauthorizedException`.
- Consultas de `construction`, `project` e `delivery` convertem falhas em `BadRequestException`.
- `AuditExceptionFilter` captura excecoes globalmente, registra auditoria e retorna JSON com `statusCode` e `message`.
- `AuditRepository.insert` captura falhas de banco e apenas loga o erro, evitando derrubar a requisicao por indisponibilidade de auditoria.

Nao ha um filtro global de erro de negocio separado, nem formato unico de erro equivalente ao `ApiResponse` usado em sucesso.

### 4.5 Validacao

`LoginDto` usa `class-validator` com `@IsEmail`, mas nao ha `ValidationPipe` global configurado em `main.ts`. Portanto, os decorators de validacao podem nao ser aplicados automaticamente ate que um pipe seja registrado.

### 4.6 Configuracao

Variaveis vistas no codigo:

- `PORT`: porta HTTP, fallback `3000`.
- `NODE_ENV`: controla Swagger; `production` desabilita `/docs`.
- `JWT_SECRET`: segredo JWT.
- `AIRTABLE_API_KEY`: chave Airtable.
- `AIRTABLE_BASE_ID`: base Airtable.
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`: SMTP do mailer.
- `AUDIT_DB_HOST`, `AUDIT_DB_PORT`, `AUDIT_DB_NAME`, `AUDIT_DB_USER`, `AUDIT_DB_PASSWORD`, `AUDIT_DB_SSL`: Postgres de auditoria.

No estado atual do working tree, `.env.example` aparece removido no Git. A versao rastreada anteriormente listava JWT, Airtable e auditoria, mas nao listava as variaveis `MAIL_*` usadas pelo `MailerModule`.

## 5. Integracoes Externas

| Sistema | Objetivo | Protocolo/Biblioteca | Uso no codigo |
| --- | --- | --- | --- |
| Airtable | Fonte operacional de usuarios, obras, projetos e entregas | API Airtable via pacote `airtable` | `src/airtable/airtable.service.ts` |
| PostgreSQL Audit DB | Persistencia de eventos de auditoria | TCP/Postgres via `pg` | `src/audit/audit.repository.ts` |
| SMTP | Envio de codigo de verificacao | Nodemailer via `@nestjs-modules/mailer` | `src/email/email.service.ts` |
| Swagger UI | Documentacao interativa da API | HTTP `/docs` | `src/main.ts` |

Tabelas Airtable referenciadas:

- `Contatos`
- `Orcamentos`
- `Projetos`
- `Entregas`

Campos Airtable relevantes encontrados:

- `Contatos`: `E-mail`, `Nome completo`, `Empresa`, `Ativo`.
- `Orcamentos`: `Orcamentos`, `Tipo de orcamento`, `Cidade da obra`, `EmpresaId`, `Etapa do negocio`.
- `Projetos`: `Orcamentos`, `Tipo de orcamento`, `Cidade da obra`, `OrcamentoId`, `Etapa do negocio`, `Projeto`, `ProjetoId`, `Etapa do Projeto`, `Quantidade`, `Valor total (Projeto)`, `Produto`.
- `Entregas`: `Entregas`, `Cidade da obra (from Orcamentos)`, `Data de entrega`, `Pedido produzido`, `OrcamentoId`, `EmpresaId`.

## 6. Pontos Criticos ("Gotchas")

1. **Airtable e banco operacional, Postgres e apenas auditoria.** Nao procurar repositories de negocio ou migrations para obras/projetos/entregas; os dados vem do Airtable.

2. **Filtros de tenant/empresa estao hardcoded.** `ConstructionService`, `ProjectService` e `DeliveryService` usam IDs fixos em `filterByFormula`. Para usuario comum, isso limita os dados retornados; para admin, o filtro e removido.

3. **Role de usuario e sempre `USER` no fluxo atual.** `UserService` cria `UserRole.USER` independentemente do contato Airtable. Sem ajuste, `ADMIN` nao nasce do Airtable.

4. **Rotas so exigem token quando usam `@Roles`.** Como os guards globais liberam rotas sem metadata de roles, qualquer rota nova sem `@Roles` ficara publica.

5. **`ValidationPipe` global nao esta configurado.** Decorators como `@IsEmail` em DTOs nao garantem validacao se nenhum pipe for aplicado.

6. **Auditoria depende de Postgres dedicado, mas nao bloqueia requisicoes.** Falhas de insert sao logadas no `Logger` e a aplicacao continua.

7. **Tempo de expiracao do codigo diverge da mensagem do email.** O cache usa `60000` ms, enquanto o template informa validade de 5 minutos.

8. **Swagger nao roda em producao.** Em `NODE_ENV=production`, `/docs` nao e registrado.

9. **Teste e2e inicial parece desatualizado.** O teste espera `GET /` retornando `Hello World!`, mas o controller atual expõe `GET /Ok` retornando `OK`.

10. **`.env.example` esta removido no working tree atual.** Isso reduz a rastreabilidade das variaveis necessarias para rodar o backend localmente.

11. **Nao ha camada de DTOs especificos por endpoint.** As respostas retornam diretamente os campos do Airtable, embrulhados por `ApiResponse`.

12. **Sanitizacao de metadata e sensivel ao nome exato da chave.** Chaves como `Authorization` com maiuscula nao entram no `Set` atual se nao forem normalizadas antes.

13. **`AirtableService.getAll` usa `.all()`.** Para tabelas grandes, isso pode paginar/baixar muitos registros e afetar latencia.

## 7. Mapa de Navegacao

| Necessidade | Caminho |
| --- | --- |
| Bootstrap, Swagger, interceptors e filters globais | `src/main.ts` |
| Composicao de modulos e guards globais | `src/app.module.ts` |
| Healthcheck publico | `src/app.controller.ts` |
| Login, codigo de email e JWT | `src/auth/auth.service.ts` |
| Endpoint de login | `src/auth/auth.controller.ts` |
| Guards e decorator de roles | `src/auth/guards/`, `src/auth/decorators/roles.decorator.ts` |
| Resolucao de usuario pelo Airtable | `src/user/user.service.ts` |
| Model e roles de usuario | `src/user/user.model.ts`, `src/user/user-role.enum.ts` |
| Gateway Airtable | `src/airtable/airtable.service.ts` |
| Query helper Airtable | `src/airtable/query.airtable.ts` |
| Obras/orcamentos | `src/construction/` |
| Projetos | `src/project/` |
| Entregas | `src/delivery/` |
| Resposta padrao de sucesso | `src/common/dtos/response.dto.ts` |
| Auditoria global | `src/audit/` |
| Schema Postgres de auditoria | `database/audit/init.sql` |
| Docker Compose da auditoria | `docker-compose.audit.yml` |
| Smoke tests de auditoria | `scripts/audit-steps/` |
| Email de codigo | `src/email/email.service.ts` |
| Template de email | `src/email/templates/CodeEmailTemplate.hbs` |
| Configuracao de build Nest | `nest-cli.json`, `tsconfig.json`, `tsconfig.build.json` |
| Dependencias e scripts NPM | `package.json` |

## 8. Guia de Padronizacao Pratico

### Para adicionar nova rota protegida

1. Criar ou reutilizar modulo de dominio em `src/<dominio>`.
2. Declarar controller com `@Controller('<rota>')`.
3. Adicionar `@Roles(UserRole.ADMIN, UserRole.USER)` ou regra mais restrita em toda rota que nao deve ser publica.
4. Delegar regra de negocio para service.
5. Retornar sucesso com `new ApiResponse(mensagem, data)`.
6. Tratar falhas conhecidas com excecoes Nest (`BadRequestException`, `NotFoundException`, `UnauthorizedException`, etc.).

### Para consultar dados do Airtable

1. Injetar `AirtableService`.
2. Criar `QueryAirtable` com `fields` explicitos e `filterByFormula`.
3. Usar `getAll(tabela, query)` ou `getById(tabela, id)`.
4. Evitar montar filtros diretamente em controllers.
5. Preferir centralizar IDs de empresa/tenant em configuracao ou derivar do usuario autenticado antes de ampliar o sistema.

### Para manter auditoria consistente

1. Deixar eventos HTTP comuns para `AuditInterceptor` e `AuditExceptionFilter`.
2. Registrar eventos de negocio explicitamente no service quando necessario, como o login faz.
3. Nunca inserir dados sensiveis em `metadata` sem confirmar que `sanitizeValue` cobre a chave.
4. Ao criar novo evento, adicionar o literal em `AuditEventType`.

### Para trabalhar com autenticacao

1. O payload JWT atual deve preservar `name`, `email`, `role` e `idEmpresa`, pois guards e auditoria dependem desses campos.
2. Nao criar rota protegida sem `@Roles`.
3. Se novas roles vierem do Airtable, ajustar `UserService` e revisar `RolesGuard`.
4. Se validar DTOs for necessario, configurar `ValidationPipe` global antes de depender de decorators de `class-validator`.

### Para testes

1. Atualizar `test/app.e2e-spec.ts` antes de confiar no e2e padrao.
2. Usar `npm run test` para unitarios quando houver specs em `src`.
3. Usar `npm run test:e2e` para e2e, apos revisar dependencias externas.
4. Usar `npm run audit:test` com API e Postgres de auditoria rodando para validar trilha de auditoria.
