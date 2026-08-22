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
| Código do jogo | 40.549 linhas em 59 arquivos | `git ls-files public/js/*.js \| xargs wc -l` |
| `game.js` | **6.891** linhas | `wc -l public/js/game.js` |
| `main.js` | 2.729 linhas | `wc -l public/js/main.js` |
| Armas com GLB | 27 | `git ls-files 'public/models/weapons/*.glb' \| wc -l` |
| GLBs de personagem | 63 | `git ls-files 'public/models/characters/*.glb' \| wc -l` |
| Props em GLB | 151 | `git ls-files 'public/models/props/*.glb' \| wc -l` |
| Clipes de animação versionados | 681 | `git ls-files public/models/anims \| wc -l` |
| Personagens jogáveis | 62, em 10 facções | array `CHARACTERS` de `characters.js` |
| Mapas no registro | 17 | objeto `MAPS` de `maps.js` |
| Arnêses visuais em HTML | 16 | `git ls-files 'public/*.html' \| wc -l` |
| Scripts do arnês | 292 | `git ls-files 'tools/eval/*.mjs' 'tools/eval/*.py' \| wc -l` |
| Scripts de pipeline | 77 | `git ls-files 'tools/*.mjs' \| wc -l` |
| Tarefas de entrada escritas | 26 | `git ls-files 'docs/issues/[0-9]*.md' \| wc -l` |
| Versão | `2.0.0-alpha.159` | `public/js/version.js` e `package.json` (batem) |

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `o comando da coluna direita de cada linha`

{/* END:GERADO:numeros */}

E as regras de partida que mais mudam de lugar, todas lidas das constantes de
`public/js/game.js`:

{/* BEGIN:GERADO:regras — não edite à mão, rode `npm run docs` */}

| Regra | Valor | Constante |
|---|---|---|
| Facções · personagens | 10 · 62 (B 9 · C 9 · E 8 · F 9 · M 9 · N 3 · O 2 · R 1 · T 3 · U 9) | `CHARACTERS` |
| Mapas no menu | 17 — 2 abrem em rodadas, **15 em captura** | `MAPS` / `ctfMode` |
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
[`KNOWN-BUGS.md`](https://github.com/rubenmarcus/csbrasil/blob/main/KNOWN-BUGS.md), colado
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
git clone https://github.com/rubenmarcus/csbrasil.git && cd csbrasil
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
| `praca_poderes` | Praça dos Três Poderes | rodadas | `map_brasilia.js` | 1.834 |
| `piscina_treta` | Piscina da Treta | rodadas | `map_piscina.js` | 874 |
| `loja_h` | Loja H (Estacionamento) | **captura** | `map_havan.js` | 2.013 |
| `ferro_velho` | Ferro Velho do Zé | **captura** | `map_ferrovelho.js` | 1.921 |
| `quebrada` | Quebrada (Rua do Baile) | **captura** | `map_quebrada.js` | 1.656 |
| `fy_escadao` | Escadão (Morro) | **captura** | `map_escadao.js` | 813 |
| `fy_campomorro` | Campo do Morro | **captura** | `map_campomorro.js` | 713 |
| `fy_lajes` | Lajes (Comunidade) | **captura** | `map_lajes_authored.js` | 1.263 |
| `fy_corrego` | Córrego (Favela de SP) | **captura** | `map_corrego.js` | 1.258 |
| `fy_mansao` | Mansão do Joá | **captura** | `map_mansao.js` | 951 |
| `posto_treta` | Posto da Treta | **captura** | `map_posto.js` | 506 |
| `upa_24h` | UPA 24h da Treta | **captura** | `map_upa.js` | 302 |
| `obras_prefeitura` | Obras da Prefeitura | **captura** | `map_obras.js` | 257 |
| `atacadao_treta` | Atacadão da Treta | **captura** | `map_atacadao.js` | 276 |
| `parque_treta` | Parque da Treta | **captura** | `map_parque.js` | 426 |
| `velho_oeste` | Velho Oeste da Treta | **captura** | `map_velho_oeste.js` | 449 |
| `penitenciaria` | Penitenciária da Treta | **captura** | `map_penitenciaria.js` | 264 |

**17 mapas registrados** — 2 abrem em rodadas e 15 em captura. `ctfMode` **abre** o mapa em captura, não prende: o jogador troca no menu (é a `MOD1`). Há 20 arquivos `map_*.js` em `public/js/` — arquivo no disco **não** implica mapa jogável.

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `objeto MAPS de public/js/maps.js`

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
npm run check:fast   # node tools/eval/runner.mjs syntax eval:release eval:telemetry eval:identity eval:error-console eval:error-origin eval:webgl eval:webglguard eval:maprotate eval:shaderlog eval:shaderbudget eval:botbrain eval:prune eval:vminspect eval:faccao eval:mapid eval:mapjson eval:mapcontrato eval:ambience-registry eval:parquewheel eval:redesign eval:matchoptions eval:charvoice eval:screenquery docs:check arch:check audio:check eval:audio-provenance feet:check eval:vmlabhud eval:ctfhud eval:pause eval:ctfround eval:ctfwin eval:spawn eval:regen eval:pegada eval:dmgdir eval:ctflabels anims:check anims:merge:check walls:check media:check menuwalls:check travessao:check eval:medianet eval:posters eval:grafitelayout eval:simclock eval:backendhints changelog:check eval:velhooeste eval:penitenciaria eval:charhard eval:charpbr eval:motoca-visual eval:camera-grip eval:pilot-system eval:pilot-grip eval:char-thumbnail eval:asset-integrity eval:gltf-validator eval:props-acervo eval:propsuv1 eval:character-voice eval:audio-pack-character-voice eval:cinematic-ui eval:grafite-editorial eval:map-source eval:map-new eval:campo-contract eval:lajes-rooftop eval:lajes-visual eval:lajes-authored eval:lajes-spatial eval:lajes-gap eval:lajes-circuito eval:lajes-antitrap eval:mansao-water eval:mansao-garden eval:corrego-contract eval:corrego-water eval:look eval:mansao-ocean eval:wind eval:softparticles eval:escala-favela eval:escadao-contract eval:slice-abilities eval:faction-registry eval:mapview eval:devport spec:check skills:check eval:pickuparma eval:comentario eval:fixture
```

`package.json` tem **182 scripts**; o motivo de cada um mora em `SCRIPTS.md` (migrado das chaves `//nome` em 18/08/2026) — é onde está o porquê.

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `node -p "Object.keys(require('./package.json').scripts)"`

{/* END:GERADO:scripts */}

O `npm run check` é o mesmo conjunto que o CI roda em `.github/workflows/ci.yml`.

:::tip Use o `check:fast` no loop, o `check` antes do PR
O `check` gasta 10-12 min porque sobe o jogo cinco vezes. O `check:fast` cobre as réguas
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
   [`docs/issues/`](https://github.com/rubenmarcus/csbrasil/tree/main/docs/issues) (com um
   `abrir-issues.sh` pronto — elas ainda não foram abertas no GitHub).
6. **Licença** — o `LICENSE` na raiz declara (hoje AGPL-3.0); as superfícies que
   repetem o nome e mudam junto estão no `CONTRIBUTING.md`.
7. **[Estado atual](./estado.md)** — fontes vivas de produção, dados e dívida conhecida
   desde a última medição colada.

Para onde o projeto **vai** não está nesta documentação: é o
[`docs/ROADMAP.md`](https://github.com/rubenmarcus/csbrasil/blob/main/docs/ROADMAP.md), e o
plano executável é o
[`plans/08`](https://github.com/rubenmarcus/csbrasil/blob/main/plans/08-RELEASE-PROFISSIONAL.md).
