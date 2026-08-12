# Quality gates

## Required checks

- `pr-fast`
- `smoke-web` quando a PR toca jogo/UI/site
- `dco` para toda contribuição via PR

## Labels

- `safe-automerge`: só para PR pequena, reversível e fora de gameplay/backend
- `needs-staging`: PR precisa passar por staging fixa antes de merge
- `needs-human-gameplay`: mudança em jogo/mapa/render/HUD
- `needs-human-backend`: mudança em API/Supabase/anti-cheat
- `bot-fixable`: docs, manifests, changelog, pequenos fixes determinísticos
- `covered-by-pr`: issue já atacada por PR aberta

## Merge policy

Pode entrar em automerge:

- docs
- changelog
- workflows pequenos
- manifestos e pequenos ajustes de CSS/texto

Não entra em automerge:

- gameplay
- render/WebGL
- mapas
- personagens
- anti-cheat
- backend/ranking

## Staging

Use a branch `staging` para validar combinações de PRs antes de produção.
O workflow de staging deve apontar para `STAGING_URL`.

## Crash triage

Issues `crash-auto` devem ser agrupadas por assinatura de erro antes de
virarem fila humana. O bot só sugere duplicata; o fechamento continua humano.

## Bot-fix workflow

Issues com label `bot-fixable` podem receber comentário de maintainer:

```text
/bot-fix
```

Isso faz o `csbrasil-bot` abrir uma draft PR bootstrap a partir da `main`.
