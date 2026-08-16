# csbrasil-bot

## Modelo inicial

O projeto usa a conta `csbrasil-bot` via GitHub Actions.

Secret esperado no repositório:

- `CSBRASIL_BOT_TOKEN`

Permissões mínimas recomendadas para o token:

- Contents
- Pull requests
- Issues
- Metadata

## Workflows operados pelo bot

- triagem de issue
- classificação de PR
- automerge seguro
- comentário de classificação de PR
- sugestão de duplicata para `crash-auto`
- bootstrap de draft PR a partir de issue elegível via `/bot-fix`
- sweep periódico/manual das issues abertas

## Regras

- o bot pode comentar, etiquetar e mergear PRs explicitamente elegíveis
- o bot não decide sozinho sobre gameplay, backend, anti-cheat ou mapas
- o bot só mergea PR com label `safe-automerge` e checks verdes
- PR com pendência do CodeRabbit recebe `needs-coderabbit-resolution` e fica fora de automerge até um maintainer aplicar `coderabbit-resolved`
- em crashes automáticos, o bot sugere duplicatas; ele não fecha sozinho nesta fase
- para abrir PR de issue, o gatilho é um comentário de maintainer `/bot-fix`
- PR nova pode ser reencaminhada automaticamente para a branch de integração/release configurada
- PR nova recebe assignee do próprio autor quando fizer sentido

## Secrets

- `CSBRASIL_BOT_TOKEN`: obrigatório para labels, comentários e merge bot
- `STAGING_URL`: opcional; quando presente, habilita smoke contra staging

## Variables

- `PR_DEFAULT_BASE_BRANCH`: opcional; default `staging`
  - se uma PR abrir contra `main`, o bot pode reencaminhar para essa branch
  - exemplos: `staging`, `staging/v2.0.0-alpha.42`, `release/v2.0.0-alpha.42`

## Fluxo de issue -> PR

1. issue aberta
2. bot revisa, etiqueta e comenta
3. se elegível, maintainer comenta `/bot-fix`
4. bot cria branch `bot/issue-<n>` e abre draft PR bootstrap
5. daí a PR pode ser continuada por humano ou por um futuro fix-bot

## O que o bot corrige hoje

Hoje o bot não altera código sozinho. Ele faz três coisas:

- classifica issue e PR
- identifica issue pequena/determinística como `bot-fixable`
- abre branch e PR draft com `/bot-fix`
- em PR nova, aplica labels de roteamento, tenta assinar o autor como assignee e pode trocar a base branch

Isso é intencional. Sem chave de modelo e policy de execução, ligar push de código direto em IA aumenta risco operacional.

## Evolução para correção automática por IA

A próxima etapa é separar em dois estágios:

1. `csbrasil-bot` orquestra GitHub
2. um worker de IA pega a branch bootstrap e produz commits pequenos

Opções práticas:

- Codex/Claude/Kimi/OpenCode rodando em runner self-hosted
- serviço externo que recebe issue + branch e devolve commit/push
- agente manual assistido: workflow abre a PR e um operador dispara o agente na branch

Guardrails mínimos:

- só permitir `bot-fixable`
- sempre basear em `main`
- exigir CI/smoke verde
- manter draft por padrão
- nunca automergir gameplay, backend, anti-cheat ou mapa
