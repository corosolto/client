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

## Regras

- o bot pode comentar, etiquetar e mergear PRs explicitamente elegíveis
- o bot não decide sozinho sobre gameplay, backend, anti-cheat ou mapas
- o bot só mergea PR com label `safe-automerge` e checks verdes
- em crashes automáticos, o bot sugere duplicatas; ele não fecha sozinho nesta fase
- para abrir PR de issue, o gatilho é um comentário de maintainer `/bot-fix`

## Secrets

- `CSBRASIL_BOT_TOKEN`: obrigatório para labels, comentários e merge bot
- `STAGING_URL`: opcional; quando presente, habilita smoke contra staging

## Fluxo de issue -> PR

1. issue aberta
2. bot revisa, etiqueta e comenta
3. se elegível, maintainer comenta `/bot-fix`
4. bot cria branch `bot/issue-<n>` e abre draft PR bootstrap
5. daí a PR pode ser continuada por humano ou por um futuro fix-bot
