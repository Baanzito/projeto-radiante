# Projeto Radiante

Aplicativo local-first para planejar e acompanhar treino deliberado no VALORANT.

## Stack

- Angular PWA
- NestJS
- PostgreSQL
- Prisma
- pnpm workspaces
- Docker Compose para o banco local
- OpenAI Responses API, Google Calendar e MCP como integrações opcionais

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

O frontend estará em `http://localhost:4200` e a API em `http://127.0.0.1:3000/api/v1`.

## Verificação

```bash
pnpm run check
```

O endpoint `GET /api/v1/health` verifica a aplicação e a conexão com o banco. O MVP também disponibiliza:

- `GET/PUT /api/v1/profile`
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

## Estado

Marco 5: assistente estruturado com confirmação, auditoria, Google Calendar unidirecional e MCP somente leitura. As integrações são opcionais; sem credenciais, o MVP local permanece completo.

Configuração e validação detalhadas: [Marco 5](docs/marco-5.md).
