---
id: comecando
title: O que é, e como rodar
sidebar_label: Começando
sidebar_position: 1
slug: /
description: O que é o CORO SOLTO, como rodar em 3 comandos e a estrutura real do repositório — conferida contra o código.
---

import useBaseUrl from '@docusaurus/useBaseUrl';

{/* Cabeçalho: o banner do canarinho girando, no formato largo em que ele foi feito
    (604×240, 24 quadros). Ele JÁ traz o letreiro — por isso a logomarca solta não
    aparece aqui; ela mora no rodapé, e o ícone do canarinho na navbar. Repetir o
    letreiro duas vezes na mesma dobra é ruído, não identidade. */}
<div className="cs-hero">
  <img
    className="cs-hero__bird"
    src={useBaseUrl('/img/canarinho-header.webp')}
    alt="CORO SOLTO: Treta Suprema — o canarinho, mascote do jogo, girando"
    width="604"
    height="240"
  />
</div>

# O que é, e como rodar

**CORO SOLTO: Treta Suprema** (ex-CS BRASIL) é um FPS de navegador escrito em
JavaScript vanilla sobre Three.js r160, no estilo do Counter-Strike 1.6: rounds,
bots, AWP, placar por Tab, rádio de voz. Roda num link, sem instalar nada.

Os números abaixo **não são escritos à mão**: eles são regerados por
`node tools/gen-docs.mjs` a partir do código, e `npm run docs:check` (dentro do
`check:fast`) reprova o quality gate quando qualquer um deles diverge da árvore. Antes disso
esta página envelhecia no primeiro commit — ver
[o que é gerado, e o que não é](./arquitetura.md#o-que-é-gerado-e-o-que-não-é).

{/* BEGIN:GERADO:numeros — não edite à mão, rode `npm run docs` */}

| O que | Quanto | Onde confere |
|---|---:|---|
| Código do jogo | 67.516 linhas em 165 arquivos | `git ls-files public/js/*.js \| xargs wc -l` |
| `game.js` | **9.086** linhas | `wc -l public/js/game.js` |
| `main.js` | 5.285 linhas | `wc -l public/js/main.js` |
| Armas com GLB | 27 | `git ls-files 'public/models/weapons/*.glb' \| wc -l` |
| GLBs de personagem | 74 | `git ls-files 'public/models/characters/*.glb' \| wc -l` |
| Props em GLB | 217 | `git ls-files 'public/models/props/*.glb' \| wc -l` |
| Clipes de animação versionados | 897 | `git ls-files public/models/anims \| wc -l` |
| Personagens jogáveis | 63, em 7 grupos | array `CHARACTERS` de `characters.js` |
| Mapas no menu | 12 | `MAPS` menos `MAPAS_PARADOS` |
| Arnêses visuais em HTML | 25 | `git ls-files 'public/*.html' \| wc -l` |
| Scripts do arnês | 900 | `git ls-files 'tools/eval/*.mjs' 'tools/eval/*.py' \| wc -l` |
| Scripts de pipeline | 120 | `git ls-files 'tools/*.mjs' \| wc -l` |
| Tarefas de entrada escritas | 26 | `git ls-files 'docs/issues/[0-9]*.md' \| wc -l` |
| Versão | `2.1.0-alpha.133` | `public/js/version.js` e `package.json` (batem) |

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `o comando da coluna direita de cada linha`

{/* END:GERADO:numeros */}

E as regras de partida que mais mudam de lugar, todas lidas das constantes de
`public/js/game.js`:

{/* BEGIN:GERADO:regras — não edite à mão, rode `npm run docs` */}

| Regra | Valor | Constante |
|---|---|---|
| Grupos · personagens | 7 · 63 (B 9 · C 9 · E 8 · F 9 · M 9 · P 10 · U 9) | `CHARACTERS` |
| Mapas no menu | 13 — 3 abrem em rodadas, **10 em captura** | `MAPS` menos `MAPAS_PARADOS` |
| Respawn | 2,2 s | `RESPAWN_DELAY` |
| Round | 99 s, 3 vitórias | `ROUND_TIME` / `ROUNDS_TO_WIN` |
| Captura | alvo = **todas as bandeiras do mapa**, 2 rodadas (rede de segurança 480 s) | `capsToWin = ctfPts.length` / `CTF_ROUNDS_TO_WIN` |
| Regeneração de vida | **DESLIGADA — `?regen=1` religa** | `REGEN` |
| Ranking / páginas `/u/` | **DESLIGADOS — é uma flag, volta numa linha** | `RANKING_ON` em `src/lib/site.ts` |

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `constantes de public/js/game.js · RANKING_ON de src/lib/site.ts`

{/* END:GERADO:regras */}

O menu aceita de **2×2 a 8×8** bots (o motor aceita de 1 a 8 por lado); o padrão é 4×4.

:::note Dois desses são escolha recente, não defeito
**A regeneração de vida foi desligada** em 05/08 (`REGEN = QS.get('regen') === '1'`). Ela
existia, estilo CoD — 6 s sem tomar dano e 22 HP/s —, e o dono a reportou como bug
(*"a vida do 1st player volta a 100, não sei porque"*) justamente porque era **invisível**:
sem ícone, sem som, sem linha nas configurações. Regra que o jogador não percebe é
indistinguível de defeito. Ela continua inteira atrás de `?regen=1`, com a simetria
jogador↔bot. **Quem religar tem que entregar o feedback junto** — e resolver o que ela
vinha tapando: sem cura, kit ou colete, cada vida depois do primeiro contato já estava
perdida.

**O ranking foi desligado** e trocado por telemetria anônima. `/ranking` e `/u/*`
respondem **200 com aviso + `noindex`** (não 404 — as URLs estão indexadas e vão voltar),
e `/api/leaderboard` responde `{disabled:true}`.
:::

:::caution O quality gate NÃO está verde, e isso é declarado
Quantas invariantes passam **não é derivável do código** — é o resultado de uma execução,
e depende até de qual insumo existe na máquina. Por isso esse placar não é repetido aqui:
ele mora no cabeçalho de
`KNOWN-BUGS.md`, colado
de uma execução real, com a lista das vermelhas, causa raiz e `arquivo:linha` de cada uma.
É esse arquivo que é mantido dia a dia.

Para o estado de hoje, rode — não repita número de cabeça:

```bash
npm run eval:vm && node tools/eval/invariants.mjs --json   # 10-12 min
```

**A ordem importa**: invariante de viewmodel medida com o JSON de ontem inventa vermelha
(ver [Como colaborar](./colaborar.md#rodar-o-quality-gate)).
:::

## Rodar em 3 comandos

```bash
git clone https://github.com/corosolto/client.git && cd client
npm install
npm run dev          # abre em http://localhost:4321 — essa página JÁ É o jogo
```

O pacote de áudio (`npm run fetch-audio`) é **opcional**: sem ele o jogo usa sons
sintetizados. A pasta `public/audio/` não é versionada.

### Linux, WebGL e modo compatibilidade

O jogo tenta WebGL2 e WebGL1, começando pela escolha padrão do navegador e reduzindo
antialias, preferência de GPU e stencil antes de desistir. Quando cai em WebGL1,
llvmpipe/SwiftShader ou outro degrau reduzido, ativa qualidade baixa apenas naquela
sessão: DPR 0,75, sem bloom/sombras e com retratos estáticos na seleção.

Use `?safe=1` para priorizar WebGL1 e o caminho de menor custo. Se nem esse modo abrir,
confira `chrome://gpu` ou a seção Graphics de `about:support`, ligue aceleração por
hardware e atualize Mesa/driver pelo gerenciador da distribuição. Uma página não pode
forçar um driver quando o navegador recusa criar até o contexto WebGL1.

### Alternativa sem Astro (zero dependência de build)

O arnês de avaliação traz um servidor estático de 24 linhas que serve `public/` e
mapeia `/` para o fonte da página do jogo:

```bash
node tools/eval/serve.mjs 8123   # http://localhost:8123
```

Ele existe exatamente porque `src/pages/index.astro` é HTML puro — dá pra servir o
arquivo cru sem passar pelo Astro (`tools/eval/serve.mjs:15`).

## A pegadinha que custa a primeira hora de todo mundo

**Não existe `public/index.html`.** Servir a pasta `public/` estaticamente te dá um
índice de diretório com `eval.html`, `mapview.html` e companhia — nenhum deles é o jogo.
O HTML do jogo é `src/pages/index.astro`, servido na **rota raiz** pelo Astro. Não há
rota `/game`.

A confirmação independente está no próprio arnês: `tools/eval/serve.mjs:15` precisa de um
caso especial `if (p === '/')` que lê `src/pages/index.astro` do disco, justamente porque
não há `index.html` em `public/` pra servir.

:::note Esta seção já foi uma lista de erros do README
Até 04/08/2026 ela existia porque o `README.md` da raiz mandava rodar
`cd public && python3 -m http.server` e falava num "jogo em `/game/`". As duas linhas
foram corrigidas — o README hoje diz o certo. O que sobrou é o fato em si, que continua
sendo a primeira pedra no caminho de quem chega.
:::

## Estrutura real do repositório

Duas zonas de código e uma terceira zona que é a razão desta doc existir (o arnês):

Nenhuma contagem aqui: a árvore diz **o que é cada coisa**, e os números vivem na tabela
gerada lá em cima. Misturar os dois é como o `ARCH.md` escrito à mão nasceu errado.

```
public/                 O JOGO — vanilla ES modules, ZERO build
  js/
    game.js               a classe Game (loop, bots, tiro, HUD) — o maior arquivo do repo
    main.js               menu, wiring de DOM, persistência
    vmattach.js springs.js weapons.js fparms.js handik.js   viewmodel/armas
    maps.js               o REGISTRO de mapas (quem não está aqui não é jogável)
    map_brasilia.js map_piscina.js map_havan.js
    map_ferrovelho.js map_quebrada.js                       os mapas registrados
    map_piscinao_ramos.js     "Piscinão" — existe no disco, FORA do registro
    mapprops.js map_decals.js                               props e grafite
    bloom.js textures.js vao.js stylize.js gpuparticles.js  gráficos/FX
    characters.js glbchars.js                               personagens
    audio.js version.js site-bg.js
  models/                 armas, personagens, props e clipes de animação em GLB
  vendor/                 Three.js vendorizado (sem CDN, sem npm no runtime)
  style.css               o HUD inteiro
  *.html                  arnêses visuais (eval, mapview, weapontest, vm-inspect…)

src/                    O SITE (Astro + adapter Vercel)
  pages/index.astro       ⚠ ISTO É O JOGO (HTML + import map + HUD)
  pages/sobre.astro       landing/FAQ com JSON-LD
  pages/personagens.astro  como-jogar.astro  ranking.astro  mapa.astro
  pages/u/[...path].astro  perfil público
  pages/api/*.ts          SSR: leaderboard, submit-match, register, badge, avatar
  layouts/Layout.astro    shell do site (não do jogo)
  lib/                    supabase, svg, geo, fmt

tools/
  eval/                   O ARNÊS — réguas, quality gate e sondas. Ver "Quality gates"
    invariants.mjs          o quality gate
    ref-measure.py          mede os frames de referência (a doutrina da casa)
    harness.mjs             sobe o Game real em node com DOM stubado
    ARCH.md BAR.md          mapa de conflito (gerado) e a régua visual
  gen-arch.mjs            gera e VALIDA o ARCH.md
  gen-docs.mjs            gera e VALIDA os blocos numéricos desta documentação
  gen-asset.mjs           gera prop 3D por texto (Tripo/Meshy)
  gen-image.mjs           gera arte 2D por texto (OpenRouter)

                        (banco: schema/migrations são PRIVADOS — fora do repo)
.github/workflows/ci.yml  o quality gate rodando em CI
```

Os mapas registrados hoje, e em que modo cada um abre:

{/* BEGIN:GERADO:mapas — não edite à mão, rode `npm run docs` */}

| Id | Nome no menu | Abre em | Arquivo em `public/js/` | Linhas |
|---|---|---|---|---:|
| `amazonia` | Treta na Amazônia | **captura** | `—` | — |
| `escadao` | Escadão (Morro) | **captura** | `—` | — |
| `praca_poderes` | Praça dos Três Poderes | rodadas | `—` | — |
| `piscina_treta` | Piscina da Treta | rodadas | `—` | — |
| `loja_h` | Loja H (Estacionamento) | **captura** | `—` | — |
| `ferro_velho` | Ferro Velho do Zé | **captura** | `—` | — |
| `quebrada` | Quebrada (Rua do Baile) | **captura** | `—` | — |
| `corrego` | Córrego (Favela de SP) | **captura** | `—` | — |
| `lajes` | Lajes (Comunidade) | **captura** | `—` | — |
| `posto_treta` | Posto da Treta | **captura** | `—` | — |
| `upa_24h` | UPA 24h da Treta | **captura** | `—` | — |
| `velho_oeste` | Sertão da Treta | **captura** | `—` | — |
| `invasao_javaporcos` | Cidade Invadida | rodadas | `—` | — |

**13 mapas no menu** — 3 abrem em rodadas e 10 em captura. `ctfMode` **abre** o mapa em captura, não prende: o jogador troca no menu (é a `MOD1`). Há 25 arquivos `map_*.js` em `public/js/`; mapas em `MAPAS_PARADOS` ficam fora do menu.

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `objeto MAPS menos MAPAS_PARADOS de public/js/maps.js`

{/* END:GERADO:mapas */}

### As duas zonas

Em uma linha cada: **`public/` é o jogo** (vanilla, ES modules, sem framework e sem
bundler) e **`src/` é o site** (Astro com SSR, onde framework é bem-vindo). O que cada
regra da fronteira paga, e por que ela é dura, está em
**[Stack e ferramentas](./stack.md#as-duas-zonas-e-por-que-a-fronteira-é-dura)** — uma
página só, para não haver duas versões da mesma fronteira.

O que você precisa saber **antes de editar** é a consequência: o jogo é carregado pela
página Astro via **import map com versão e hash do conteúdo** (`src/pages/index.astro`).

:::danger Preserve o manifesto publicado
`scripts/module-cache.mjs` deriva o hash dos módulos publicados sob `public/js/` e o import map
aplica essa revisão ao grafo inteiro. Não faça bump manual e não inclua bancadas que
`scripts/prune-dist.mjs` remove. `npm run eval:shaderbudget` (SB7) confere as duas propriedades.
:::

## Comandos que você vai usar

```bash
npm run dev            # site + jogo (Astro, :4321) — a rota / JÁ É o jogo
npm run build          # dist/client + dist/server
npm run eval:vm        # enquadramento do viewmodel — RODE ANTES das invariantes
npm run eval:invariants # as invariantes — node puro, 10-12 min
npm run eval:bots      # botsim 60 s por mapa, sementes fixas
npm run eval:mat       # material/luz/fog/textura nos mapas
npm run docs           # regenera os blocos numéricos desta documentação
node tools/eval/serve.mjs 8123   # servidor estático sem Astro
```

E os dois quality gates, com a lista exata do que cada um roda — direto do `package.json`:

{/* BEGIN:GERADO:scripts — não edite à mão, rode `npm run docs` */}

```bash
npm run check:fast   # node tools/eval/runner.mjs syntax eval:vm-presence eval:tpjumpownership eval:tplocalshot eval:tpbackpedal eval:tphandownership eval:characterkit eval:meshoptvm eval:perfilmobile eval:qamobile eval:toquecontroles eval:tpanim3p eval:emotes eval:emotepartida eval:postura eval:mapasobdemanda eval:glbpeso eval:assetrev eval:roundmunicao eval:cameraoclusao eval:pistolacadencia eval:fragrestock eval:formatomelhorde eval:penetration-geometry eval:bot-shot-direction eval:shared-shot eval:bot-pellets eval:duel-metrics eval:bot-crouch-geometry eval:weapon-profiles eval:weapon-matrix eval:recoil-contract eval:firing-cadence eval:ballistics-falloff eval:ranking-home-status eval:ranking-presentation eval:modgraph eval:convidaamigos eval:placaramigo eval:analytics eval:online eval:release eval:error-console eval:edgecache eval:webgl eval:webglguard eval:maprotate eval:mapasparados eval:shaderlog eval:shaderbudget eval:prune eval:vminspect eval:asset-pago-resil eval:faccao eval:mapid eval:mapjson eval:mapcontrato eval:piscina-trim eval:piscina-graffiti-batch eval:ferro-graffiti-quality eval:passosim eval:perfcampo eval:dificuldade eval:qualmapas eval:pickuparma eval:scrollarma eval:parquewheel eval:campo-contract eval:campomorro-molde eval:parquevida eval:parquecanopy eval:penitenciariavida eval:penitenciariafacade eval:penitenciariapickup eval:redesign eval:ui-v3 eval:resultado-arte eval:matchoptions eval:awpscope eval:tracer3p eval:charvoice eval:screenquery eval:lajes-cache docs:check arch:check audio:check eval:grafite-atual:prova eval:grafite-editorial eval:versaoorigem eval:autoReload eval:smoke eval:vm-teto eval:vm-placar eval:audioalcance eval:audioespacial eval:audioenvelope eval:audioproc eval:audiocapacidade eval:audiofablocal eval:audioeventos eval:audioannouncer eval:audiovoicemix eval:audioprivate eval:audioruntimeassets eval:menumusicreview audio:inventario:autoteste audio:shortlist:autoteste feet:check eval:vmlabhud eval:ctfhud eval:pause eval:ctfround eval:ctfwin eval:switchteam eval:mp-rotulo-lado eval:mp-cor-lado eval:pool-lado eval:troca-personagem eval:launchwatchdog eval:launchrace eval:spawn eval:regen eval:pegada eval:dmgdir eval:ctflabels anims:check anims:merge:check walls:check media:check menuwalls:check travessao:check eval:medianet eval:posters eval:grafitelayout eval:grafite-support eval:grafite-area-audit eval:upa-mint eval:grafite-art-inventory eval:grafite-mural-alpha eval:decal-ink eval:map-texture-upgrade eval:texture-quality-sampler eval:map-sampler eval:map-surface-upgrade eval:external-surface-binding eval:map-local-floor-finish eval:map-local-fabrication eval:map-surface-allocation eval:green-cover-pattern eval:prop-graffiti-wall eval:corrego-graffiti-mount eval:upa-structure eval:upa-return eval:shot-occlusion eval:shot-map-contract eval:shot-brasilia-quality eval:shot-visible-surface eval:shot-quality-inventory eval:simclock eval:backendhints eval:geoproxy changelog:check eval:velhooeste eval:penitenciaria eval:mutcega eval:autofix eval:deploygate eval:portaointeiro eval:mutantes-anunciados eval:wfsecret eval:wflocal eval:wftimeout eval:comentario eval:fixture eval:preload eval:docsautoria eval:netcode eval:hurtfx eval:sonda eval:noescolha eval:maqfraca eval:qualadapt eval:netcodecbin eval:movimento eval:botsim-golden eval:replaycam eval:abateshud eval:botfaca eval:escadao-home eval:escadao-spawn-egress eval:escadao-conflict-home eval:escadao-casa-central eval:escadao-casas-conflito eval:escadao-mirante-abrigo eval:escadao-structure eval:escadao-descent eval:escadao-details eval:corrego-contract eval:corrego-water eval:corrego-superficie eval:skylife ops:test eval:privacy ops:selftest eval:lajes-layout eval:lajes-rooftop eval:lajes-visual eval:lajes-ruas eval:lajes-identidade eval:lajes-roof-overlap eval:lajes-nav eval:lajes-ctf-surface eval:lajes-authored eval:lajes-spatial eval:lajes-gap eval:lajes-circuito eval:lajes-antitrap eval:lajes-vertical eval:lajes-bots eval:lajes-ambiencia eval:lajes-santos eval:lajes-game eval:mappreview eval:lajes-airspace eval:lajes-soundscape eval:lajes-spawn-space eval:sertao eval:sertao-spatial eval:sertao-interiors eval:sertao-wagon eval:sertao-fauna eval:sertao-occlusion eval:calango-quadruped eval:sertao-horizon eval:sertao-distant-birds eval:sertao-integration eval:sertao-livestock eval:sertao-sky-lifecycle eval:amazonia eval:chao eval:ombro eval:miticos-lobisomem eval:mansao eval:dautelemetria eval:mpRoomOptions eval:fxFlash eval:campinho-integration eval:parque eval:audiofurollback eval:atacadao eval:killstreak eval:mp-paridade eval:obras eval:vm-launch eval:chat eval:ui-chat eval:pos-cena eval:capturecodex eval:legal eval:brasao-versao eval:tprajada eval:mprecuo eval:check-sem-escrita eval:modoarmamp eval:trocaarmamp eval:pos-alvo eval:ibl-vm eval:botsentidos eval:ociosoteto eval:wfconcurrency eval:mapa-sp-pos-mp eval:personagem-escolhido eval:gauntlet-rodizio eval:telemetria-coorte eval:clans-sessao eval:mp-proximo eval:hub-identity eval:community-inbox eval:login-prompt eval:roster-skins eval:nick eval:nick32-cards eval:portaogatilho eval:mergequeue eval:wfcheckout eval:rotas eval:compartilhar eval:contagens-pr eval:economia eval:economia-jogo eval:headshot-hitbox eval:boca-cano eval:pichacao-parede eval:armadura eval:character-normal-quality eval:grafite-curation eval:map-material-finish eval:ferro-balcao eval:match-pickups eval:net-flash-disable eval:normal-only-fit-equivalence eval:tp-world-contract eval:skin-profile-flow eval:tp-identity eval:death-camera-consistency eval:visual-map-contracts eval:authored-locomotion eval:posto-board-support eval:flashbang mut:flashbang eval:movimento-fluidez eval:ads1p-public eval:preview-grip-phase eval:knife-skin-markings eval:campo-uv eval:sondafilho eval:shot-final-pose
```

`package.json` tem **658 scripts**; o motivo de cada um mora em `SCRIPTS.md` (migrado das chaves `//nome` em 18/08/2026) — é onde está o porquê.

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `node -p "Object.keys(require('./package.json').scripts)"`

{/* END:GERADO:scripts */}

O `check:fast` cobre as réguas de node puro; o CI (`.github/workflows/ci.yml`) roda o
mesmo conjunto mais os passos que exigem rede.

:::tip Use o `check:fast` no loop, o `portao-browser` antes do PR
O `portao-browser` gasta 10-12 min porque sobe o jogo cinco vezes. O `check:fast` cobre as réguas
que nasceram dos bugs mais recentes (menu de pausa, rodada de captura, regeneração,
manifesto de animação) e roda em cerca de um minuto.
:::

## Onde ir agora

A ordem da barra lateral **é** a ordem de leitura, e cada página entrega uma coisa:

1. **[Stack e ferramentas](./stack.md)** — com o que isso é feito, com a versão declarada
   de cada peça. É onde a fronteira `public/` × `src/` está explicada por inteiro.
2. **[Instrumentação de IA](./instrumentacao-ai.md)** — como o trabalho é feito aqui. Se
   você nunca colaborou com agentes num repositório, comece por essa.
3. **[O quality gate](./quality-gates.md)** — o que é uma invariante, como se escreve uma, as
   duas leis da casa e o teste de mutação da própria régua. **É a página mais útil do
   site.**
4. **[Arquitetura](./arquitetura.md)** — como N agentes editam o mesmo arquivo sem
   colidir, e a tabela de conflito. Leia antes de tocar em `game.js`.
5. **[Como colaborar](./colaborar.md)** — o que um PR precisa pra entrar, e as **tarefas
   de primeira contribuição** já escritas em
   [`docs/issues/`](https://github.com/corosolto/client/tree/main/docs/issues) (com um
   `abrir-issues.sh` pronto — elas ainda não foram abertas no GitHub).
6. **Licença** — o `LICENSE` na raiz declara (hoje AGPL-3.0); as superfícies que
   repetem o nome e mudam junto estão no `CONTRIBUTING.md`.
7. **[Estado atual](./estado.md)** — fontes vivas de produção, dados e dívida conhecida
   desde a última medição colada.

Para onde o projeto **vai** não está nesta documentação: é o
[`ROADMAP.md`](https://github.com/corosolto/client/blob/main/ROADMAP.md); os planos
executáveis por frente vivem em
[`plans/`](https://github.com/corosolto/client/tree/main/plans).
