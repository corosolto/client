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

## Regras

- o bot pode comentar, etiquetar e mergear PRs explicitamente elegíveis
- o bot não decide sozinho sobre gameplay, backend, anti-cheat ou mapas
- o bot só mergea PR com label `safe-automerge` e checks verdes
- em crashes automáticos, o bot sugere duplicatas; ele não fecha sozinho nesta fase

## Secrets

- `CSBRASIL_BOT_TOKEN`: obrigatório para labels, comentários e merge bot
- `STAGING_URL`: opcional; quando presente, habilita smoke contra staging
