# Projeto Radiante

Aplicativo local-first para planejar e acompanhar treino deliberado no VALORANT.

## Stack

- Angular PWA
- NestJS
- PostgreSQL
- Prisma
- pnpm workspaces
- Docker Compose para o banco local

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

O endpoint `GET /api/v1/health` verifica a aplicação e a conexão com o banco. O endpoint `GET /api/v1/profile` retorna o perfil local criado pelo seed.

## Estrutura

- `apps/web`: Angular PWA.
- `apps/api`: API NestJS e schema Prisma.
- `docs`: especificação funcional e técnica.

Leia [a especificação do MVP](docs/especificacao-mvp-v0.1.md) antes de implementar novos marcos.

## Estado

Marco 0: fundação local, banco, seed, perfil e health check.
