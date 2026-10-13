# Onboarding

## Local setup

```bash
git clone https://github.com/corosolto/client.git
cd client
npm ci
npm run dev
```

Confira o requisito de Node no [quickstart do README](../README.md#rodar-localmente).
O jogo abre em `http://localhost:4321/`; comece pelo singleplayer para testar sem
configurar um servidor multiplayer. Credenciais de serviços são opcionais para
esse teste local.

Áudio é opcional:

```bash
npm run fetch-audio
```

## Project shape

- `public/`: jogo vanilla JS + Three.js, zero build
- `src/`: site Astro + APIs SSR
- `public/js/apibase.js`: destino das APIs do backend; o schema privado não vem no clone
- `.github/workflows/`: CI, smoke, bots e automações

## Before opening a PR

1. rode `npm run build`
2. se mexeu em UI/jogo, rode o smoke local ou siga o checklist manual
3. descreva risco e validação no template de PR
4. linke a issue

## Sensitive areas

Precisam de revisão humana mesmo quando os checks passam:

- `public/js/game.js`
- mapas e colisão
- `src/pages/api/*`
- `supabase/schema.sql`
- anti-cheat / submit-match
