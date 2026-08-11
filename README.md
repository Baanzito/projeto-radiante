# Projeto Radiante

Aplicativo pessoal, local-first e preparado para publicação segura, voltado ao planejamento e acompanhamento de treino deliberado no VALORANT.

## Stack

- Angular PWA
- NestJS
- PostgreSQL
- Prisma
- pnpm workspaces
- Docker Compose para o banco local
- OpenAI Responses API, Google Calendar e MCP como integrações opcionais
- Login single-user e container de produção para Cloud Run

## Pré-requisitos

- Node.js 20.19 ou superior
- pnpm 10 ou superior
- Docker Desktop ou Docker Engine com Compose

## Primeira execução

1. Crie os arquivos locais de ambiente:

   ```bash
   cp .env.example .env
   cp apps/api/.env.example apps/api/.env
   ```

2. Instale as dependências:

   ```bash
   pnpm install
   ```

3. Inicie o PostgreSQL:

   ```bash
   docker compose up -d postgres
   ```

4. Gere o Prisma Client, aplique a migration e carregue o seed:

   ```bash
   pnpm run db:generate
   pnpm run db:migrate
   pnpm run db:seed
   ```

5. Inicie frontend e backend:

   ```bash
   pnpm run dev
   ```

O frontend estará em `http://localhost:4200`. As chamadas para `/api/v1` são encaminhadas pelo proxy Angular à API em `http://127.0.0.1:3000`.

O login permanece desligado no desenvolvimento local. Para validá-lo antes da publicação, gere um hash com `pnpm run auth:hash-password` e siga [as instruções do Marco 6](docs/marco-6.md#atualização-e-validação-local).

## Verificação

```bash
pnpm run check
```

O endpoint `GET /api/v1/health` verifica a aplicação e a conexão com o banco. O MVP também disponibiliza:

- `GET/PUT /api/v1/profile`
- `GET /api/v1/auth/session`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET/POST/PATCH /api/v1/focus-areas`
- `GET/POST/PATCH /api/v1/training-cycles`
- `POST /api/v1/training-cycles/:id/activate`
- `POST /api/v1/training-cycles/:id/complete`
- `POST /api/v1/training-cycles/:id/reuse`
- `GET/POST /api/v1/matches`
- `GET/PATCH /api/v1/matches/:id`
- `GET/PUT /api/v1/matches/:id/reflection`
- `GET /api/v1/reflections/pending`
- `GET/POST/PATCH /api/v1/coach-sessions`
- `POST/PATCH /api/v1/coach-feedbacks`
- `GET /api/v1/dashboard/summary`
- `GET/POST/PATCH /api/v1/weekly-reviews`
- `GET /api/v1/exports/json`
- `GET /api/v1/exports/csv/:dataset`
- `POST /api/v1/exports/restore`
- `GET/POST /api/v1/ai/*`
- `GET /api/v1/audit-events`
- `GET /api/v1/integrations/status`
- `GET/POST/DELETE /api/v1/integrations/google-calendar/*`
- `ALL /api/v1/mcp` (somente leitura)

O contrato completo e os DTOs podem ser consultados no Swagger em `http://127.0.0.1:3000/api/docs`.

## Estrutura

- `apps/web`: Angular PWA.
- `apps/api`: API NestJS e schema Prisma.
- `docs`: especificação funcional e técnica.

Leia [a especificação do MVP](docs/especificacao-mvp-v0.1.md) antes de implementar novos marcos.

## Publicação

O build de produção reúne Angular e NestJS no mesmo container. O caminho recomendado usa Cloud Run com escala a zero e Neon PostgreSQL:

- [Marco 6 — publicação pessoal segura](docs/marco-6.md)
- `Dockerfile` na raiz do repositório
- autenticação obrigatória por padrão quando `NODE_ENV=production`
- migrations aplicadas separadamente com `prisma migrate deploy`

## Estado

Marco 6: login pessoal, API protegida, build integrado, container Cloud Run e roteiro de migração para Neon. O modo local e as integrações do Marco 5 permanecem disponíveis.

Configuração e validação detalhadas: [Marco 6](docs/marco-6.md).
