# Instruções para agentes de código

Leia `docs/especificacao-mvp-v0.1.md` antes de alterar regras de negócio.

## Escopo atual

- Implemente somente o marco solicitado.
- Preserve o funcionamento local-first e single-user.
- Não adicione autenticação, Riot API, MCP, Google Calendar ou OpenAI antes do marco correspondente.
- Nunca coloque segredos no frontend, no Git ou nos logs.

## Convenções

- Use pnpm e os scripts da raiz.
- Backend: NestJS, Prisma e PostgreSQL.
- Frontend: Angular standalone e PWA.
- Datas persistidas em UTC; timezone inicial `America/Sao_Paulo`.
- Regras de negócio ficam nos serviços do backend, não apenas na interface.
- Atualize testes, OpenAPI e documentação quando o contrato mudar.
- Não edite arquivos gerados em `apps/api/src/generated/prisma`.

## Verificação mínima

Execute antes de concluir uma mudança:

```bash
pnpm run format:check
pnpm run build
pnpm run test
```
