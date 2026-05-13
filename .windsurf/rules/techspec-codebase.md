---
trigger: model_decision
description: Usar sempre que precisar tomar decisao arquitetural ou tecnica
---

Antes de tomar decisoes arquiteturais, tecnicas ou de implementacao neste backend, consulte `documentos/techspec-codebase.md`.

Use essa documentacao como fonte de contexto para:

- reconhecer que o projeto e uma API NestJS/TypeScript em padrao Controller -> Service -> Provider;
- lembrar que Airtable e a fonte operacional principal para usuarios, obras, projetos e entregas;
- lembrar que PostgreSQL e usado apenas para auditoria em `audit_logs`;
- preservar o fluxo de autenticacao por email code + cache + JWT;
- preservar a regra de que rotas protegidas precisam de `@Roles`, pois os guards globais liberam rotas sem metadata de roles;
- manter novos endpoints dentro dos modulos de dominio e retornando sucesso com `ApiResponse` quando fizer sentido;
- registrar eventos de negocio por `AuditService` quando forem relevantes para auditoria;
- evitar mover regra de negocio para controllers;
- revisar os gotchas documentados antes de alterar auth, auditoria, Airtable ou filtros de empresa.

Ao implementar mudancas, mantenha a documentacao atualizada quando alterar stack, modulos, integracoes, rotas, fluxo de autenticacao, auditoria ou convencoes relevantes.
