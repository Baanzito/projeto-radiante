# Marco 3 — Partidas e reflexão

Status: concluído em 6 de agosto de 2026.

## Entregas

- Cadastro manual de partidas ligado à sessão ativa.
- Etapa essencial com data/hora em 24 horas, modo, agente, mapa, resultado e placar.
- Estatísticas opcionais: K/D/A, ACS, headshot, RR, first kills/deaths e notas.
- Edição das partidas enquanto a sessão permanece aberta.
- Reflexão rápida com clareza de decisão, resposta às calls, leitura de padrões, travamentos e conflitos de tarefas.
- Evidências opcionais de comunicação, movimento, ECO, mira, padrões e adaptações.
- Reflexão idempotente: salvar novamente atualiza o registro existente.
- Lista de reflexões pendentes disponível mesmo depois do encerramento da sessão.
- Regras de banco para escalas de 1 a 5, contagens não negativas e uma reflexão por partida.
- API versionada em `0.4.0` e testes unitários, de interface e E2E.

## Atualização local

Com o PostgreSQL do projeto em execução, atualize a branch e rode:

```bash
pnpm install
pnpm run db:generate
pnpm --filter api exec prisma migrate deploy
pnpm run dev
```

A migration cria somente as tabelas `Match` e `MatchReflection`, seus enums, índices e restrições. Os dados dos marcos anteriores são preservados; não execute o seed novamente.

## Fluxo de validação

1. Abra **Sessão** e inicie uma sessão ranked avulsa ou planejada.
2. Clique em **Adicionar partida** e salve apenas os campos essenciais.
3. Preencha a reflexão rápida ou clique em **Salvar depois**.
4. Registre mais duas partidas sem sair da tela da sessão.
5. Confira que uma reflexão adiada aparece em **Reflexões pendentes**.
6. Encerre a sessão e confirme que a pendência continua acessível.

## Endpoints

- `GET/POST /api/v1/matches`
- `GET/PATCH /api/v1/matches/:id`
- `GET/PUT /api/v1/matches/:id/reflection`
- `GET /api/v1/reflections/pending`
