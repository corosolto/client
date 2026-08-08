# Runbook: CDN na frente da Vercel (Cloudflare) — e a fase R2

Escrito depois do alerta "Edge Requests spike" de 07/08/2026 (99K requests em 2h
contra 16K típicos, rotas quentes `/audio/a/*.wav` hasheados do pack v4). O
diagnóstico completo está na seção final; a operação é a seção 1.

## O que isto resolve

Hoje cada tiro (sample de voz/SFX), cada GLB e cada imagem batem no edge da
Vercel e contam como Edge Request. Com a Cloudflare proxying o domínio, o
tráfego cacheável é absorvido pelo PoP dela em São Paulo — mais perto do
jogador BR que o edge da Vercel — e **não conta** como Edge Request. Custo:
plano free.

## 1. Cloudflare na frente do domínio (fase A — fazer primeiro)

Operação de ~1h, sem mudança de código. Quem executa precisa de acesso ao
registrador do domínio e de criar a conta Cloudflare.

1. Criar conta Cloudflare (free) → "Add a site" → `csbrasil.online`.
2. A Cloudflare importa os registros DNS atuais. Conferir que `www` (CNAME
   para a Vercel) e o apex ficaram com a nuvem **laranja (proxied)**.
3. No registrador, trocar os nameservers pelos dois que a Cloudflare indicar.
   Propagação: minutos a horas.
4. Na Vercel, nada muda — o domínio continua atribuído ao projeto. SSL:
   modo **Full (strict)** na Cloudflare (a Vercel emite certificado
   normalmente por trás).
5. **Cache Rules** (Rules → Cache Rules):
   - `www.csbrasil.online/audio/*`, `/models/*`, `/img/*`, `/vendor/*`,
     `/wasm/*`, `/fonts/*`, `/js/*` → *Cache Everything*, Edge TTL 1 mês,
     *Browser TTL: respect origin*.
   - Bypass (não cachear): `/api/*`, `/ranking`, `/mapa`, `/u/*`, sitemaps.
     São SSR (`/_render`) e precisam de dado fresco.
6. Speed → ativar Brotli, HTTP/3, Early Hints.
7. **Atenção ao deploy**: `/js/*` e o HTML mudam a cada release (o `?v=` do
   import map é o versionamento). Como o HTML não é cacheado, o `?v=` novo
   gera MISS natural nos módulos — não precisa purge manual. Se um dia
   cachear HTML, aí sim: purge tudo a cada deploy.

### Verificação

```bash
# duas vezes seguidas — a segunda tem que vir com cf-cache-status: HIT
curl -sI https://www.csbrasil.online/audio/a/<hash-de-um-arquivo-real>.wav | grep -i 'cf-cache\|cache-control'
```

- `cache-control` deve vir `public, max-age=31536000, immutable` para
  `/audio/a/*` (regra do `vercel.json`, 07/08/2026).
- No dia seguinte, o dashboard da Vercel deve mostrar queda acentuada de
  Edge Requests; o da Cloudflare mostra o tráfego absorvido.

### Purge do edge — quando e como (a lição do BUG-39)

A regra `assets_jogo` segura `/js/*` no edge por **1 mês** com
`override_origin`. Em 08/08 isso derrubou o site inteiro: o import map ainda
usava `?v=2` fixo e o edge montou a página com módulos de deploys diferentes
(cache split-brain — ver KNOWN-BUGS.md, BUG-39). Desde então o `?v=` sai do
`pkg.version` (`src/pages/index.astro:20-56`), então release nova = URL nova e
o mix não deveria mais acontecer. Se acontecer, ou depois de qualquer deploy
de emergência:

```bash
# precisa de CF_API_TOKEN (Zone → Cache Purge → Edit) ou CF_EMAIL + CF_GLOBAL_KEY
ZONE_ID=$(curl -sS -H "Authorization: Bearer $CF_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones?name=csbrasil.online" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).result[0].id))")
curl -sS -X POST -H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json" \
  --data '{"prefixes":["www.csbrasil.online/js/","www.csbrasil.online/style.css"]}' \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache"
```

Depois do purge, a prova de que o edge ficou coerente é
`npm run prod:coherence` (o mesmo probe que o `prod-watch.yml` roda a cada
15 min e que o `crash-fix.yml` roda depois do purge automático pós-deploy).

## 2. Fase B — host externo de assets (R2) — só quando o tráfego justificar

Não executar junto com a fase A. Critério para puxar: a fase A não segurar
(edge requests ou banda da Vercel voltando a crescer), ou o deploy de
~586 MB ficar lento demais.

Resumo do desenho (detalhes no plano aprovado em 07/08/2026):

1. Bucket Cloudflare R2 (egress zero) + `assets.csbrasil.online`.
2. `scripts/push-assets.sh` (a escrever) sincronizando `public/audio`,
   `public/models`, `public/img` via `rclone`.
3. Shim `asset(path)` no jogo prefixando o host de assets quando definido,
   com fallback para path local (dev continua igual). Pontos de path hoje:
   `public/js/audio.js:28`, `main.js:187`, `game.js:1907`, `glbchars.js`,
   `weapons.js`, `mapprops.js`, `fparms.js`. O CSP atual já permite
   `media-src/img-src/connect-src https:` — não precisa mexer.
4. `fetch-audio.sh` vira sync pro R2 fora do build; `assert:assets` passa a
   validar o manifesto remoto.

## Diagnóstico (o que foi medido em 07/08/2026)

- `public/` = 586 MB: `models/` 305 MB (mas `fpvm/` 154 MB **não vai para o
  jogador normal** — viewmodels Tripo só carregam com `?tripovm=1`, ver
  `fparms.js:106`), `audio/` 195 MB, `img/` 62 MB.
- O alerta da Vercel é de **contagem de requests, não de banda**: os
  `/audio/a/*.wav` mais quentes somam 2,8 MB no total. Cada tiro/kill toca um
  sample via `new Audio()` (`audio.js:37`) = 1 request na primeira vez.
- `/_render` (3,6K no alerta) **não é bug**: é a function SSR única do Astro
  servindo `/ranking`, `/mapa`, `/u/*` e os `/api/*` (heartbeat, presence,
  telemetria) — tráfego legítimo do jogo.
- O que já era: preload de personagens/props/armas atrás da tela de loading
  (`main.js:542-551`) — não faltava preload de modelos.
- O que foi feito no código: `vercel.json` ganhou regra
  `/audio/a/*` → `immutable` 1 ano (os nomes são sha1 do conteúdo — ver
  `scripts/build-audio-pack.mjs`), antes era 1 dia e revalidava diariamente.
- O que foi **descartado depois de medir**: converter wav→ogg (só 2,8 MB de
  wav no pack — não muda nada) e prefetch de todos os samples de voz
  (multiplicaria os requests — o oposto do objetivo).
- "Mais lento online que local" com 400 jogadores/dia não é concorrência: é
  latência por arquivo na primeira visita (dezenas de GLBs + samples) e
  revalidação diária do áudio. A fase A + o header immutable atacam as duas.
