# Marco 3 — Partidas e reflexão

Status: escopo ampliado em 6 de agosto de 2026.

## Entregas

- Cadastro manual de partidas ligado à sessão ativa.
- Etapa essencial com data/hora em 24 horas, modo, agente, mapa, resultado e placar.
- Estatísticas opcionais: K/D/A, ACS, headshot, RR, first kills/deaths e notas.
- Histórico paginado de partidas, acessível fora da sessão ativa.
- Identificação da sessão de origem e do bloco planejado em cada partida.
- Edição posterior da partida sem reabrir nem alterar o estado da sessão original.
- Resumo no estilo tracker com taxa de vitória, K/D/A, K/D, ACS, headshot, first kills/deaths e RR.
- Médias de clareza de decisão, resposta às calls e leitura de padrões.
- Reflexão rápida com clareza de decisão, resposta às calls, leitura de padrões, travamentos e conflitos de tarefas.
- Evidências opcionais de comunicação, movimento, ECO, mira, padrões e adaptações.
- Reflexão idempotente: salvar novamente atualiza o registro existente.
- Lista de reflexões pendentes disponível mesmo depois do encerramento da sessão.
- Regras de banco para escalas de 1 a 5, contagens não negativas e uma reflexão por partida.
- API versionada em `0.4.0` e testes unitários, de interface e E2E.
- Visão geral com resumos navegáveis de Perfil, Focos, Ciclo, Semana, Sessão e Partidas.

## Histórico de partidas

A tela **Partidas** lista os registros do mais recente para o mais antigo. Cada linha exibe:

- resultado e placar;
- data/hora, modo, agente e mapa;
- K/D/A, ACS, headshot e variação de RR quando informados;
- nome do bloco planejado ou tipo da sessão avulsa;
- data da sessão de origem;
- ações para editar a partida e preencher ou revisar a reflexão.

Uma partida já vinculada a uma sessão concluída pode ser editada. A edição preserva o `sessionId` e não altera o estado da sessão. Partidas novas continuam podendo ser adicionadas somente a uma sessão `IN_PROGRESS` ou `PAUSED`.

## Definições das médias

Os agregados são calculados no backend para manter a mesma regra em qualquer cliente:

| Indicador                      | Cálculo                                                                                |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| Taxa de vitória                | Vitórias divididas por vitórias + derrotas + empates; remake e desconhecido ficam fora |
| Kills, deaths e assists médios | Média somente entre partidas que possuem o campo informado                             |
| K/D                            | Soma de kills dividida pela soma de deaths nas partidas que possuem ambos os campos    |
| ACS, HS, FK e FD médios        | Média somente entre partidas que possuem o campo informado                             |
| Saldo de RR                    | Soma de todas as variações de RR informadas                                            |
| RR médio                       | Média somente entre partidas com variação de RR informada                              |
| Processo                       | Média de cada escala entre partidas com reflexão preenchida                            |

Campos opcionais ausentes nunca são convertidos em zero. A interface mostra a quantidade total de partidas, sessões vinculadas e reflexões para contextualizar a amostra.

## Visão geral

A Visão geral possui atalhos resumidos para todas as telas do marco atual:

- **Perfil:** rank e RR atuais.
- **Focos:** quantidade de áreas ativas.
- **Ciclo:** nome do ciclo ativo ou ausência de ciclo.
- **Semana:** quantidade de blocos e status do planejamento.
- **Sessão:** sessão ativa e número de partidas nela.
- **Partidas:** total registrado e taxa de vitória.

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
7. Abra **Partidas** e confira as médias, o histórico e a sessão de origem.
8. Edite uma partida da sessão encerrada e confirme que o vínculo permanece o mesmo.
9. Volte para **Visão geral** e valide os resumos navegáveis de todas as telas.

## Endpoints

- `GET/POST /api/v1/matches`
- `GET /api/v1/matches/summary`
- `GET/PATCH /api/v1/matches/:id`
- `GET/PUT /api/v1/matches/:id/reflection`
- `GET /api/v1/reflections/pending`

### Extensão da resposta de partida

Além de `sessionId`, cada partida retorna `session` com:

- `id`, `type` e `status`;
- `startedAt` e `endedAt`;
- `plannedBlockTitle`, quando a sessão nasceu de um bloco planejado.

Partidas sem vínculo retornam `session: null`.
