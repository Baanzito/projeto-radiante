# Marco 5 — IA e integrações

Status: concluído e validado localmente; integrado à `main` em 11 de agosto de 2026.

## Entregas

- Adaptador `AiCoachProvider` com implementação pela Responses API da OpenAI.
- Resumos estruturados de sessão e semana, sempre vinculados às evidências locais usadas.
- Propostas de ajuste da semana armazenadas como prévia, sem alteração automática.
- Confirmação ou rejeição explícita das propostas e histórico preservado.
- Auditoria de gerações, decisões, sincronizações e consultas MCP.
- Google Calendar unidirecional, idempotente e restrito a semanas confirmadas ou encerradas.
- Credenciais Google criptografadas com AES-256-GCM antes de chegar ao PostgreSQL.
- OAuth com estado de uso único e validade de dez minutos.
- Servidor MCP Streamable HTTP com seis ferramentas exclusivamente de leitura.
- Tela **Assistente** com estados configurado/desativado, resultados de sincronização e auditoria.
- Backup JSON ampliado com recomendações e auditoria; credenciais externas nunca entram no backup.
- API versionada em `0.6.0` e migration aditiva.

## Regras de controle

### IA

A OpenAI só é chamada quando o usuário pressiona uma ação na tela. Não há análises em segundo plano. O backend envia uma seleção estruturada de sessão, semana, métricas e feedbacks; segredos e credenciais nunca fazem parte do prompt.

A resposta usa JSON Schema estrito e passa por uma segunda validação local com Zod. Cada resultado contém:

- resumo;
- forças observadas;
- padrões;
- próximas ações;
- evidências com tipo e identificador de origem;
- confiança;
- indicação de hipótese inicial;
- proposta opcional.

Resumos não escrevem no domínio. Uma proposta semanal permanece em `GENERATED` até o usuário escolher **Revisar e aplicar** e confirmar a prévia. Só então intenção e metas da semana são atualizadas em transação e o antes/depois é auditado. Sem três evidências independentes, a resposta deve ser rotulada como hipótese inicial.

As respostas são criadas com `store: false`. O histórico exibido no aplicativo é a cópia estruturada salva no PostgreSQL local.

### Google Calendar

O sentido da integração é sempre:

```text
Projeto Radiante → Google Calendar
```

Alterações feitas no Google não retornam ao aplicativo. Uma sincronização:

1. exige uma semana `CONFIRMED` ou `CLOSED`;
2. cria um identificador estável por bloco para evitar duplicações;
3. atualiza eventos que mudaram;
4. ignora eventos idênticos;
5. remove do calendário eventos de blocos cancelados;
6. registra erros por bloco sem alterar ou bloquear os dados locais.

### MCP

Endpoint local: `http://127.0.0.1:3000/api/v1/mcp`

Transporte: Streamable HTTP sem estado.

Ferramentas disponíveis:

- `consultar_perfil`
- `consultar_semana_atual`
- `consultar_dashboard`
- `consultar_partidas_recentes`
- `consultar_feedbacks_coach`
- `consultar_revisoes_semanais`

Todas recebem a anotação `readOnlyHint`. Não existem ferramentas MCP para criar, editar, confirmar ou excluir dados. Cada consulta gera um evento de auditoria.

A API continua vinculada a `127.0.0.1`. Antes de usar um túnel seguro, defina `MCP_ACCESS_TOKEN`; o endpoint passará a exigir `Authorization: Bearer <token>`. Não exponha a porta local diretamente na internet.

## Configuração da OpenAI

Em `apps/api/.env`:

```env
OPENAI_API_KEY=sua_chave
OPENAI_MODEL=gpt-5.6-luna
```

O modelo é configurável porque disponibilidade e custo dependem da conta. Reinicie `pnpm run dev` depois de mudar o arquivo. A chave fica somente no backend e nunca deve ser prefixada com `NG_APP_` ou colocada no frontend.

Sem a chave, todo o restante do aplicativo continua funcionando e a tela mostra a integração como desativada.

## Configuração do Google Calendar

No Google Cloud:

1. Crie ou selecione um projeto.
2. Habilite a Google Calendar API.
3. Configure a tela de consentimento OAuth.
4. Crie um cliente OAuth do tipo **Aplicativo da Web**.
5. Adicione exatamente esta URI de redirecionamento:

   ```text
   http://127.0.0.1:3000/api/v1/integrations/google-calendar/callback
   ```

Gere uma chave local de 32 bytes:

```bash
openssl rand -base64 32
```

Depois preencha `apps/api/.env`:

```env
INTEGRATION_ENCRYPTION_KEY=resultado_do_comando
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:3000/api/v1/integrations/google-calendar/callback
```

Reinicie a API, abra **Assistente**, escolha **Conectar Google Calendar** e conclua o consentimento na nova aba. A permissão solicitada é somente `calendar.events`.

Não altere `INTEGRATION_ENCRYPTION_KEY` enquanto uma conta estiver conectada. Se a chave for perdida, desconecte/remova a integração e autorize novamente.

## Atualização local

Não execute o seed novamente: ele não é necessário para o Marco 5 e seu perfil já possui dados personalizados.

```bash
git pull
pnpm install
pnpm run db:generate
pnpm --filter api exec prisma migrate deploy
pnpm run dev
```

A migration cria somente tabelas e enums de recomendações, auditoria, OAuth, contas de integração e mapeamento de eventos. Os dados dos Marcos 0–4 são preservados.

## Fluxo de validação

1. Aplique a migration e abra o aplicativo sem configurar credenciais externas.
2. Confirme que todas as telas anteriores continuam funcionando e **Assistente** mostra OpenAI e Google desativados.
3. Configure `OPENAI_API_KEY`, reinicie a API e atualize o status.
4. Gere um resumo semanal e confira resumo, padrões, ações, evidências e confiança.
5. Gere uma proposta e confirme que a semana não mudou antes de **Revisar e aplicar**.
6. Rejeite uma proposta e confirme que ela permanece no histórico como rejeitada.
7. Gere outra proposta, revise a prévia, confirme e verifique a alteração da semana.
8. Configure o Google, conecte a conta e sincronize uma semana confirmada.
9. Edite um bloco, sincronize novamente e confira que o mesmo evento foi atualizado, sem duplicação.
10. Cancele um bloco, sincronize e confira que o evento correspondente foi removido.
11. Revise a auditoria das ações de IA, Google e MCP.
12. Baixe um backup JSON e confirme que recomendações/auditoria estão presentes e credenciais não.

## Endpoints

- `GET /api/v1/ai/status`
- `GET /api/v1/ai/recommendations`
- `POST /api/v1/ai/sessions/:id/summary`
- `POST /api/v1/ai/weekly-plans/:id/summary`
- `POST /api/v1/ai/weekly-plans/:id/proposal`
- `POST /api/v1/ai/recommendations/:id/confirm`
- `POST /api/v1/ai/recommendations/:id/reject`
- `GET /api/v1/audit-events`
- `GET /api/v1/integrations/status`
- `GET /api/v1/integrations/google-calendar/auth-url`
- `GET /api/v1/integrations/google-calendar/callback`
- `POST /api/v1/integrations/google-calendar/sync/:weeklyPlanId`
- `DELETE /api/v1/integrations/google-calendar`
- `ALL /api/v1/mcp`

## Verificações automatizadas

- Proposta gerada sem escrever na semana.
- Aplicação somente pelo comando explícito de confirmação.
- Auditoria transacional com antes/depois.
- Criptografia autenticada e rejeição de chave inválida.
- Bloqueio de sincronização de semana em rascunho.
- Integrações opcionais desativadas sem impedir o workspace local.
- MCP declarado e implementado somente leitura.
