# Marco 4 — Coaching, dashboard e revisão

Status: implementado em 6 de agosto de 2026; aguardando validação local.

## Entregas

- Registro de aulas de coaching com data/hora em 24 horas, duração, coach e resumo.
- Feedbacks independentes por aula, com categoria, prioridade, evidência, ação sugerida e estado.
- Conversão de feedback em um foco novo ou conexão a uma área de foco existente.
- Dashboard semanal que combina tempo planejado/realizado, rankeds conscientes, resultados e métricas de processo.
- Identificação de padrões recorrentes a partir das reflexões das partidas.
- Revisão semanal gerada a partir de uma fotografia dos dados, complementada pela conclusão pessoal.
- Histórico imutável depois que a revisão é aplicada.
- Histórico de ciclos concluídos ou cancelados com reutilização segura.
- Backup completo em JSON e exportações CSV temáticas.
- Restauração por mesclagem: registros com o mesmo identificador são atualizados, sem remover dados locais adicionais.
- API versionada em `0.5.0`, migration aditiva e novas restrições de banco.

## Regras principais

### Coaching

O texto da aula funciona como contexto. Cada orientação acompanhável deve ser registrada como um feedback separado. Um feedback pode permanecer aberto, entrar em prática, ser validado ou descartado.

Ao transformar um feedback em foco, o usuário pode:

- conectá-lo a uma área ativa já existente; ou
- criar uma nova área usando a categoria do próprio feedback.

Nos dois casos, o feedback passa para **Em prática**. Um feedback já conectado não pode ser convertido novamente.

### Dashboard e revisão

O painel seleciona a semana que contém o dia atual; quando ela não existe, usa o planejamento mais recente. As métricas são calculadas no backend para que qualquer cliente use a mesma regra.

| Indicador           | Regra                                                          |
| ------------------- | -------------------------------------------------------------- |
| Tempo planejado     | Soma dos blocos não cancelados                                 |
| Tempo realizado     | Sessões concluídas menos pausas                                |
| Ranked consciente   | Competitiva com reflexão preenchida                            |
| Resultado           | Vitórias, derrotas e soma do RR informado                      |
| Processo            | Médias das escalas e soma dos comportamentos observados        |
| Padrões recorrentes | Contagens negativas maiores que zero, ordenadas por frequência |

Gerar uma revisão cria ou atualiza a fotografia da semana. A fotografia não inventa uma conclusão: o usuário registra sua leitura, os padrões e a proposta seguinte. Depois de **Aplicar ao histórico**, a revisão não pode mais ser editada.

### Backup e restauração

O JSON contém os dados funcionais do usuário local e uma versão de formato. A restauração aceita somente o formato suportado e o identificador do perfil local esperado. Ela executa em transação e faz `upsert` em ordem de dependência.

A restauração não apaga registros que existam apenas no banco de destino. Antes de escolher o arquivo, a interface exige que o usuário confirme que registros com o mesmo identificador serão atualizados.

Os CSVs disponíveis são:

- partidas;
- reflexões;
- sessões;
- planejamentos semanais;
- feedbacks de coaching;
- revisões semanais.

## Atualização local

Antes de atualizar, é prudente manter uma cópia do volume Docker atual. Depois, com o PostgreSQL em execução, rode:

```bash
git pull
pnpm install
pnpm run db:generate
pnpm --filter api exec prisma migrate deploy
pnpm run dev
```

A migration cria somente `CoachSession`, `CoachFeedback` e `WeeklyReview`, além dos respectivos enums, índices e restrições. Os dados existentes são preservados. Não execute o seed novamente, pois seu perfil local já está personalizado.

## Fluxo de validação

1. Abra **Coaching**, registre uma aula do Glym e adicione dois feedbacks.
2. Converta um feedback em um foco novo e conecte o outro a um foco existente.
3. Valide um feedback e confirme que os estados permanecem depois de recarregar a página.
4. Garanta que a semana atual possui sessões concluídas e partidas com reflexão.
5. Abra **Evolução** e compare tempo, rankeds, RR e médias com os registros da semana.
6. Gere uma revisão, escreva sua conclusão e proposta, salve e aplique ao histórico.
7. Baixe um backup JSON e um CSV de partidas em **Dados**.
8. Faça uma alteração simples, restaure o JSON e confirme a mesclagem dos registros.
9. Reinicie `pnpm run dev` e confirme que coaching, revisão e histórico continuam disponíveis.

## Endpoints

- `GET/POST /api/v1/coach-sessions`
- `GET/PATCH /api/v1/coach-sessions/:id`
- `POST /api/v1/coach-sessions/:id/feedbacks`
- `PATCH /api/v1/coach-feedbacks/:id`
- `POST /api/v1/coach-feedbacks/:id/convert-to-focus`
- `GET /api/v1/dashboard/summary`
- `GET/POST /api/v1/weekly-reviews`
- `GET/PATCH /api/v1/weekly-reviews/:id`
- `POST /api/v1/weekly-reviews/:id/apply`
- `GET /api/v1/exports/json`
- `GET /api/v1/exports/csv/:dataset`
- `POST /api/v1/exports/restore`

## Verificações automatizadas

- Schema Prisma validado.
- Builds NestJS e Angular aprovados.
- 30 testes unitários do backend aprovados.
- 11 testes E2E da API aprovados.
- 10 testes de interface aprovados.
- Formatação integral aprovada.
