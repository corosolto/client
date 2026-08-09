# Onboarding

## Local setup

```bash
git clone https://github.com/rubenmarcus/csbrasil.git
cd csbrasil
npm install
npm run dev
```

Áudio é opcional:

```bash
npm run fetch-audio
```

## Project shape

- `public/`: jogo vanilla JS + Three.js, zero build
- `src/`: site Astro + APIs SSR
- `supabase/`: schema e migrations do ranking
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

