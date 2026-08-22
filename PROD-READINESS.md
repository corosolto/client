# PROD-READINESS.md — auditoria de produção

> Gerado na sessão de limpeza + instrumentação. Último `check:fast` executado: **passou** (47/47) na revisão local.

## Versão e remote

- Versão local: `2.0.0-alpha.138` (`package.json`, `public/js/version.js`, `CHANGELOG.md`).
- Última tag local: `v2.0.0-alpha.138`.
- Único remote configurado: `origin https://github.com/corosolto/client.git`.
- Branch principal: `main` (auto-deploy na Vercel via git integration).

## Workflows de publicação e observação

| Workflow | Gatilho | O que faz |
|---|---|---|
| `.github/workflows/release.yml` | push em `main` | bump `alpha.N+1`, sync `version.js`, `CHANGELOG`, `gen-docs`, `gen-arch`, commit do bot, tag e GitHub Release. |
| `.github/workflows/deploy-prod.yml` | `workflow_dispatch` (manual por tag) | fallback Vercel: `vercel pull/build/deploy --prod` usando secrets. |
| `.github/workflows/prod-watch.yml` | cron a cada 15 min + `deployment_status` success | probe de coerência do edge, purge Cloudflare, health check do banco/telemetria. |
| `.github/workflows/staging.yml` | push em `staging` | smoke do Playwright contra `STAGING_URL` (só roda se o secret existir). |
| `.github/workflows/ci.yml` | PR para `main` | `npm ci` + `check:fast` + build + portões de release. |
| `.github/workflows/pr-gates.yml` | PR para `main` | checks adicionais (versão, DCO, etc). |

## Build e edge

- `vercel.json` roda `bash scripts/fetch-audio.sh`, `bash scripts/fetch-decals.sh`, `npm run strip:decalbg`, `npm run assert:assets`, `npm run check:deploy`, `npm run build`.
- Headers de cache: `/vendor/*` curto, `/models/*` e `/audio/a/*` longo/immutable, `og-image.png` 7 dias.
- CSP está declarado em `vercel.json`; import map e scripts são `self` + `unsafe-inline` + Cloudflare beacon.

## Preview de PR e a Vercel (21/08/2026)

Medido nos últimos 29 PRs: a Vercel reprovou **13 dos 14 PRs vindos de fork**, sempre com
`Authorization required to deploy.` - é a proteção de fork da própria Vercel, e nenhum
commit do colaborador a resolve.

**Quem bloqueia o PR é o `ci.yml`**, que já roda `npm run build` em `pull_request`. A
Vercel é conveniência, não portão - a régua `eval:deploygate` (DG1) guarda essa condição.

Dois ajustes ficam no **painel da Vercel**, fora do alcance do repositório, e precisam da
conta dona do projeto:

1. **Project → Git → Deploy Hooks / Fork Protection**: desligar o deploy automático de PR
   vindo de fork. Enquanto estiver ligado, todo PR externo nasce com um vermelho que o
   autor não tem como consertar.
2. **Settings → Git → Ignored Build Step**: opcional, para parar de gastar build em branch
   de PR interna. A produção continua publicando pela `main`.

O preview de fork **não pede aprovação a ninguém** desde 22/08, e sem expor o token:
o `preview-build.yml` compila o código do fork em `pull_request` — que num PR de fork
roda **sem acesso a `secrets`** —, e o `preview-deploy.yml` publica em `workflow_run`,
que roda no contexto base **com** o token e **não executa nada do PR** (`vercel deploy
--prebuilt` só envia arquivo). Quem tem o que roubar não roda código de terceiro; quem
roda código de terceiro não tem o que roubar.

O contrato está preso em `scripts/ci/workflow_security_check.py` (PRV1/PRV2/PRV3): nove
mutações, incluindo pôr `secrets.` no job que compila e um `actions/checkout` no que
publica.

## Blockers conhecidos para prod

1. **`npm run check` (full) não foi executado nesta sessão.** `check:fast` passou; `check` ainda inclui `eval:vm`, `invariants`, `kick`, `bots` e deve ser verde antes de publicar.
2. **13 dívidas no quality gate** (colado de `KNOWN-BUGS.md` em 2026-08-16): VM1, VM3, VM9, VM12, VM16, VM18, VM19, VM20, BOT8, CHR1, CHR3, CHR4, CTF1. Não reprovam o processo, mas estão no placar.
3. **Régua de produção fora do `check:fast`:** `eval:boot`, `eval:site`, `eval:cena`, `eval:select`, `eval:submitguard`, `eval:ctrlw` e `prod:coherence` exigem browser, build, rede ou insumos privados. Precisam ser verdes no próprio ambiente antes do deploy.
4. **Supabase / banco:** o repo não entrega `supabase/` (ignorado). Migrations pendentes e policies devem ser auditadas no dashboard ou no ambiente com acesso ao banco.
5. **FASE 4 (captura GPU real):** `tools/eval/gl-shots.mjs` foi adaptado para `CHROME_BIN` e `GL_SWIFTSHADER`; a bateria ainda está em execução/local e o report de diferença SwiftShader vs Metal será anexado quando concluído.

## Ações recomendadas antes de deploy

- [ ] Rodar `npm run check` inteiro.
- [ ] Rodar `npm run build` e `npm run eval:ssr`.
- [ ] Subir preview local e rodar `eval:boot`, `eval:site`, `eval:cena` com Chrome real.
- [ ] Verificar `prod:coherence` contra `https://www.csbrasil.online`.
- [ ] Confirmar migrations Supabase aplicadas e `prod-watch` health passando.
