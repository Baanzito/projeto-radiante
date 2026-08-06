# Como rodar o Projeto Radiante no Windows 11

Este guia usa PowerShell e Docker Desktop diretamente no Windows. Execute os comandos a partir da raiz do repositório, onde ficam `package.json` e `docker-compose.yml`.

## 1. Pré-requisitos

Instale:

- Git for Windows;
- Node.js `20.19.0` ou superior;
- Docker Desktop configurado para usar WSL 2.

Durante a instalação do Docker Desktop, mantenha habilitada a opção baseada em WSL 2. Reinicie o Windows caso o instalador solicite e abra o Docker Desktop antes de continuar.

Abra um novo PowerShell e valide o ambiente:

```powershell
git --version
node --version
npm --version
docker --version
docker compose version
```

O Docker Desktop precisa indicar que o engine está em execução.

### Instalar o pnpm

O projeto fixa o pnpm `11.7.0`. Instale essa versão:

```powershell
npm install --global pnpm@11.7.0
pnpm --version
```

Se `pnpm` não for reconhecido, feche e abra o PowerShell após a instalação.

## 2. Abrir o projeto

Se o repositório já estiver no computador, navegue até ele:

```powershell
cd C:\caminho\para\projeto-radiante
```

Evite manter o projeto em uma pasta sincronizada pelo OneDrive, pois a sincronização pode interferir no `node_modules` e nos arquivos gerados pelo Prisma.

## 3. Criar os arquivos de ambiente

Na primeira execução, copie os exemplos:

```powershell
Copy-Item .env.example .env
Copy-Item apps\api\.env.example apps\api\.env
```

Os valores padrão usam:

- PostgreSQL em `localhost:5434`;
- API em `127.0.0.1:3000`;
- frontend em `localhost:4200`;
- timezone `America/Sao_Paulo`.

Os arquivos `.env` são locais. Não coloque segredos neles que possam acabar em commits, capturas de tela ou logs compartilhados.

## 4. Instalar as dependências

```powershell
pnpm install --frozen-lockfile
```

Use pnpm neste repositório. Não execute `npm install`, pois isso cria um lockfile diferente e pode deixar o workspace inconsistente.

## 5. Iniciar o PostgreSQL

Com o Docker Desktop aberto:

```powershell
docker compose up -d postgres
docker compose ps
```

O serviço `postgres` deve aparecer como `running` ou `healthy`. Na primeira execução, o Docker precisa baixar a imagem `postgres:16-alpine`.

## 6. Preparar o banco

Gere o Prisma Client, aplique as migrations existentes e carregue os dados iniciais:

```powershell
pnpm run db:generate
pnpm --filter api exec prisma migrate deploy
pnpm run db:seed
```

Execute o seed na primeira preparação de um banco vazio. Em atualizações normais do projeto, não é necessário rodá-lo novamente.

## 7. Iniciar a aplicação

```powershell
pnpm run dev
```

Esse comando mantém frontend e API ativos no mesmo terminal. Aguarde as mensagens de compilação e acesse:

- aplicação: `http://localhost:4200`;
- health check: `http://127.0.0.1:3000/api/v1/health`;
- documentação OpenAPI: `http://127.0.0.1:3000/api/docs`.

Mantenha o terminal aberto enquanto estiver usando a aplicação. Para encerrar frontend e API, pressione `Ctrl+C` uma vez e confirme se o PowerShell perguntar.

## 8. Rotina diária

Depois da primeira instalação, normalmente bastam:

```powershell
docker compose up -d postgres
pnpm run dev
```

Para parar somente o banco:

```powershell
docker compose stop postgres
```

## 9. Atualizar o projeto

Após receber alterações com novas dependências ou migrations:

```powershell
pnpm install --frozen-lockfile
pnpm run db:generate
pnpm --filter api exec prisma migrate deploy
pnpm run check
```

## 10. Verificar a instalação

O comando abaixo valida formatação, builds e testes:

```powershell
pnpm run check
```

Os testes E2E podem ser executados separadamente:

```powershell
pnpm run test:e2e
```

## Solução de problemas

### `pnpm` não é reconhecido

Reinstale a versão do projeto e abra um novo PowerShell:

```powershell
npm install --global pnpm@11.7.0
pnpm --version
```

### O PowerShell bloqueou a execução de scripts

Se aparecer uma mensagem sobre `PSSecurityException` ou scripts desabilitados, permita scripts locais somente para o usuário atual:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Feche e abra o PowerShell. Essa alteração não exige liberar a política para toda a máquina.

### Docker não está respondendo

Abra o Docker Desktop e aguarde o engine iniciar. Depois valide:

```powershell
docker info
docker compose ps
```

Se o Docker informar problema com WSL 2, abra o PowerShell como administrador, atualize o WSL e reinicie o computador:

```powershell
wsl --update
wsl --status
```

### `EADDRINUSE` nas portas `3000` ou `4200`

Esse erro indica que outra API ou outro frontend já está rodando. Não execute `pnpm run dev` duas vezes. Localize o processo:

```powershell
Get-NetTCPConnection -LocalPort 3000,4200 -State Listen |
  Select-Object LocalPort, OwningProcess
```

Consulte o processo antes de encerrá-lo:

```powershell
Get-Process -Id <PID>
```

Se for uma execução antiga do próprio projeto:

```powershell
Stop-Process -Id <PID>
```

Substitua `<PID>` pelo número mostrado no primeiro comando e tente `pnpm run dev` novamente.

### A porta `5434` já está em uso

Altere `POSTGRES_PORT` no arquivo `.env` da raiz e a porta da `DATABASE_URL` em `apps\api\.env`. Os dois valores precisam ser iguais. Exemplo com a porta `5435`:

```dotenv
POSTGRES_PORT=5435
DATABASE_URL=postgresql://radiante:radiante_dev@localhost:5435/projeto_radiante?schema=public
```

Depois recrie somente o container:

```powershell
docker compose down
docker compose up -d postgres
```

O volume do banco é preservado por esses comandos.

### Prisma não consegue acessar o banco

Confira o container e seus logs:

```powershell
docker compose ps
docker compose logs postgres
```

Confirme também que `apps\api\.env` existe e que sua `DATABASE_URL` usa a mesma porta configurada no `.env` da raiz.

## PowerShell ou WSL?

Este guia assume Node, pnpm e Git instalados no Windows e comandos executados no PowerShell. Também é possível desenvolver inteiramente dentro do WSL, mas evite misturar o Node do Windows com o pnpm do WSL na mesma instalação do projeto. Ao usar WSL, mantenha o repositório no sistema de arquivos Linux e habilite a integração da distribuição no Docker Desktop.
