# Marco 0 — Fundação

Status: concluído em 6 de agosto de 2026.

## Entregas

- Monorepo pnpm com `apps/web` e `apps/api`.
- Angular PWA responsiva com tela de diagnóstico da fundação.
- API NestJS versionada em `/api/v1`.
- Swagger em `/api/docs`.
- PostgreSQL 16 configurado no Docker Compose.
- Prisma 7 com driver adapter PostgreSQL.
- Schema e migration inicial para:
  - `User`
  - `PlayerProfile`
  - `FocusArea`
  - `TrainingCycle`
  - `CycleFocus`
- Seed idempotente com perfil de Diego, nove áreas de foco e ciclo inicial de 14 dias.
- `GET /api/v1/health`.
- `GET /api/v1/profile`.
- Testes unitários, E2E da API e teste do dashboard Angular.
- Instruções para agentes em `AGENTS.md`.
- README de instalação e execução local.

## Validações executadas

- Prettier: aprovado.
- ESLint do backend: aprovado.
- Prisma schema: válido.
- Build NestJS: aprovado.
- Build Angular/PWA: aprovado.
- Testes backend: 4 aprovados.
- Testes E2E: 2 aprovados.
- Testes frontend: 1 aprovado.

O Docker não está disponível no ambiente de construção. A configuração do PostgreSQL, a migration e o seed foram gerados e validados estaticamente; a execução integrada com o container deverá ser confirmada na máquina local seguindo o README.

## Próximo marco

Marco 1 — Perfil, focos e ciclos:

1. Atualização do perfil local.
2. CRUD de áreas de foco.
3. Criação, ativação e conclusão de ciclos.
4. Invariantes de um ciclo ativo, um foco principal e até dois secundários.
5. Interface completa do ciclo ativo.
