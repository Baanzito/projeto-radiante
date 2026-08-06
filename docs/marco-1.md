# Marco 1 — Perfil, focos e ciclos

Status: concluído em 6 de agosto de 2026.

## Entregas

- Edição integral do perfil competitivo e da janela padrão de treino.
- Biblioteca de áreas de foco com criação, edição, arquivamento e reativação.
- Ciclos de 7, 14 ou 30 dias com um foco principal e até dois secundários.
- Criação e edição de ciclos em rascunho ou ativos.
- Ativação com substituição explícita e preservação do ciclo anterior como cancelado.
- Conclusão do ciclo com avaliação e observações.
- Reutilização de ciclos concluídos ou cancelados como novos rascunhos.
- Restrição de banco garantindo no máximo um ciclo ativo por usuário.
- Respostas de erro padronizadas como Problem Details.
- Interface Angular responsiva para desktop e celular.
- Contratos documentados no Swagger.

## Regras protegidas

- Exatamente um foco principal por ciclo.
- No máximo dois focos secundários.
- Áreas de foco não podem se repetir no mesmo ciclo.
- Somente áreas existentes, pertencentes ao usuário local e ativas podem ser usadas.
- Um ciclo encerrado não pode ser editado.
- Outro ciclo ativo só é substituído mediante confirmação explícita.
- Somente o ciclo ativo pode ser concluído.
- A conclusão exige uma avaliação válida.
- Reutilizar um ciclo preserva integralmente o histórico original.
- Meta semanal máxima não pode ser menor que a mínima.
- Horário final padrão deve ser posterior ao inicial.

## Próximo marco

Marco 2 — Semana e sessão:

1. Planejamento semanal.
2. Blocos e alertas de conflito.
3. Sessões planejadas ou avulsas.
4. Pausa, retomada, conclusão e cancelamento.
5. Telas Semana e Sessão ativa.
