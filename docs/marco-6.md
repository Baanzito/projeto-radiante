# Marco 6 — Publicação pessoal segura

Status: implementado em 11 de agosto de 2026; aguardando validação local e implantação.

## Objetivo

Levar o Projeto Radiante para a internet sem transformar o aplicativo pessoal em uma API pública. O mesmo código continua funcionando em localhost, mas produção passa a exigir autenticação e configuração explícita.

## Entregas

- Login single-user por e-mail e senha.
- Senha armazenada somente como hash `scrypt`; não existe senha em texto puro no banco ou no Git.
- Sessão assinada em cookie `HttpOnly`, `Secure` em produção e `SameSite=Lax`.
- Limite de tentativas de login por endereço de origem.
- Todas as rotas privadas protegidas por um guard global.
- Health check e sessão de autenticação públicos.
- Callback do Google protegido pelo estado OAuth de uso único, sem depender do cookie.
- MCP somente leitura desativado em produção quando `MCP_ACCESS_TOKEN` não estiver configurado.
- API relativa `/api/v1` no Angular e proxy local para desenvolvimento.
- Angular e NestJS servidos pelo mesmo domínio em produção.
- Cabeçalhos de segurança, validação de origem e Swagger desabilitado por padrão em produção.
- `Dockerfile` multi-stage compatível com Cloud Run.
- Versão da aplicação atualizada para `0.7.0`.

Não há migration neste marco. Os dados dos Marcos 0–5 permanecem inalterados.

## Atualização e validação local

```bash
git pull
pnpm install
pnpm run db:generate
pnpm run dev
```

Por padrão, `AUTH_ENABLED=false` em `apps/api/.env`, portanto o fluxo local continua abrindo diretamente. O frontend agora usa `http://localhost:4200/api/v1`, redirecionado pelo proxy Angular para a API local.

Para testar o login local:

1. Gere o hash sem mostrar a senha no terminal:

   ```bash
   pnpm run auth:hash-password
   ```

2. Gere o segredo da sessão:

   ```bash
   openssl rand -base64 48
   ```

3. Configure `apps/api/.env`:

   ```env
   AUTH_ENABLED=true
   AUTH_EMAIL=seu-email
   AUTH_PASSWORD_HASH=resultado_do_comando
   AUTH_SESSION_SECRET=resultado_do_openssl
   AUTH_SESSION_TTL_HOURS=168
   ```

4. Reinicie `pnpm run dev` e abra `http://localhost:4200`.

Nunca inclua esses valores em commit, mensagem, print ou bundle.

## Arquitetura de publicação

```text
Navegador → Cloud Run (Angular + NestJS) → Neon PostgreSQL
                                      ├── OpenAI
                                      └── Google Calendar
```

Configuração recomendada:

- Cloud Run em `southamerica-east1`, cobrança por requisição, mínimo de zero e máximo de uma instância.
- Neon Free em AWS São Paulo.
- URL HTTPS fornecida pelo próprio Cloud Run; domínio próprio é opcional.
- Banco cloud separado do PostgreSQL local.
- Segredos cadastrados no Google Secret Manager, nunca como arquivos `.env` enviados ao build.

## Banco Neon

1. Crie um projeto na região AWS South America — São Paulo.
2. Guarde a URL direta para migrations e a URL com pool para a aplicação.
3. Com a URL direta somente no terminal local, aplique o histórico versionado:

   ```bash
   DATABASE_URL='URL_DIRETA_DO_NEON' pnpm --filter api exec prisma migrate deploy
   ```

4. Não execute o seed no banco cloud que receberá seu backup personalizado.

## Segredos de produção

Obrigatórios:

| Variável              | Uso                                           |
| --------------------- | --------------------------------------------- |
| `DATABASE_URL`        | Conexão pooled do Neon                        |
| `AUTH_EMAIL`          | Único e-mail autorizado                       |
| `AUTH_PASSWORD_HASH`  | Hash gerado pelo projeto                      |
| `AUTH_SESSION_SECRET` | Assinatura da sessão; mínimo de 32 caracteres |

Opcionais conforme a integração:

| Variável                     | Uso                                  |
| ---------------------------- | ------------------------------------ |
| `OPENAI_API_KEY`             | Análises do assistente               |
| `INTEGRATION_ENCRYPTION_KEY` | Criptografia das credenciais Google  |
| `GOOGLE_CLIENT_ID`           | OAuth do Google Calendar             |
| `GOOGLE_CLIENT_SECRET`       | OAuth do Google Calendar             |
| `MCP_ACCESS_TOKEN`           | Habilita o MCP read-only em produção |

Variáveis não secretas:

```env
NODE_ENV=production
AUTH_ENABLED=true
SERVE_WEB=true
API_HOST=0.0.0.0
APP_ORIGIN=https://URL_DO_CLOUD_RUN
GOOGLE_REDIRECT_URI=https://URL_DO_CLOUD_RUN/api/v1/integrations/google-calendar/callback
```

O Cloud Run fornece `PORT`; não fixe essa variável no código.

## Implantação manual no Cloud Run

A imagem já contém Prisma e as dependências necessárias. Em validações ou jobs baseados no container, execute os binários diretamente em `/app/apps/api/node_modules/.bin`; não rode `pnpm install` no container de runtime.

Pré-requisitos: Google Cloud CLI autenticada, projeto selecionado e faturamento habilitado.

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
```

Cadastre os segredos pelo console do Secret Manager. Em seguida, faça a primeira implantação com uma origem temporária:

```bash
gcloud run deploy projeto-radiante \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --min 0 \
  --max 1 \
  --cpu 1 \
  --memory 512Mi \
  --set-env-vars NODE_ENV=production,AUTH_ENABLED=true,SERVE_WEB=true,APP_ORIGIN=https://placeholder.invalid \
  --set-secrets DATABASE_URL=radiante-database-url:latest,AUTH_EMAIL=radiante-auth-email:latest,AUTH_PASSWORD_HASH=radiante-auth-password-hash:latest,AUTH_SESSION_SECRET=radiante-auth-session-secret:latest
```

`--allow-unauthenticated` permite que o navegador alcance a tela de login. Os dados continuam protegidos pela autenticação do próprio aplicativo.

Leia a URL criada e aplique a origem definitiva:

```bash
gcloud run services describe projeto-radiante \
  --region southamerica-east1 \
  --format='value(status.url)'

gcloud run services update projeto-radiante \
  --region southamerica-east1 \
  --update-env-vars APP_ORIGIN=https://URL_DO_CLOUD_RUN,GOOGLE_REDIRECT_URI=https://URL_DO_CLOUD_RUN/api/v1/integrations/google-calendar/callback
```

Depois dessa atualização, o login estará liberado na origem correta.

## Migração dos dados pessoais

1. No aplicativo local, abra **Dados** e baixe um backup JSON.
2. Entre no aplicativo online.
3. Abra **Dados**, aceite o aviso de mesclagem e restaure o backup.
4. Confira perfil, ciclos, semanas, partidas, coaching, revisões e auditoria.
5. Gere imediatamente um novo backup a partir do ambiente online.

Credenciais da OpenAI, Google e MCP não fazem parte do backup e devem ser configuradas novamente no servidor.

## Google Calendar

Após conhecer a URL definitiva, adicione ao cliente OAuth do Google exatamente:

```text
https://URL_DO_CLOUD_RUN/api/v1/integrations/google-calendar/callback
```

Depois configure os quatro valores Google/criptografia no Cloud Run e publique uma nova revisão. Alterar `INTEGRATION_ENCRYPTION_KEY` depois de conectar a conta invalida a credencial armazenada.

## Checklist de aceite

1. Aplicação local continua funcionando com autenticação desligada.
2. Login local funciona quando habilitado.
3. Uma requisição privada sem sessão retorna `401`.
4. Login inválido não cria cookie e tentativas excessivas retornam `429`.
5. Build Angular e NestJS são concluídos.
6. Container serve `/`, `/api/v1/health` e o fallback da PWA.
7. Swagger não está disponível em produção.
8. MCP sem token retorna `401` em produção.
9. Migrations são aplicadas no Neon antes da restauração.
10. Backup local é restaurado e conferido online.
11. Google Calendar usa o callback HTTPS definitivo.
12. Alertas de orçamento são configurados no Google Cloud e na OpenAI.

## Rollback

O banco local não é removido nem alterado pela publicação. Se a implantação falhar, continue usando `pnpm run dev` com o PostgreSQL local. No Cloud Run, uma revisão anterior pode ser reativada sem apagar o banco Neon.
