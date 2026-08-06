# Marco 2 — Semana e sessão

Status: concluído em 6 de agosto de 2026.

## Entregas

- Planejamento semanal de segunda a domingo.
- Blocos com tipo, horário, foco, notas e alertas de conflito.
- Confirmação e encerramento da semana.
- Sessões planejadas ou avulsas.
- Pausa, retomada, conclusão e cancelamento.
- Registro de concentração, aderência, aprendizado e próximo ajuste.
- Restrição de banco garantindo somente uma sessão ativa ou pausada.
- Telas responsivas de Semana e Sessão.
- Semanas confirmadas continuam totalmente editáveis até o encerramento.
- Alterar a segunda-feira desloca os blocos preservando dias e horários relativos.
- Datas exibidas em português e horários informados explicitamente no padrão de 24 horas (`HH:mm`).

## Atualização local

```bash
pnpm install
pnpm run db:generate
pnpm --filter api exec prisma migrate deploy
pnpm run dev
```

A migration preserva perfil, focos e ciclos existentes. Não execute o seed novamente.
