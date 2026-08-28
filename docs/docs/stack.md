---
id: stack
title: Stack e ferramentas
sidebar_label: Stack e ferramentas
sidebar_position: 2
description: Three.js/WebGL sem build, Astro na Vercel, Supabase, o pipeline de geração de asset (mint.gg, Tripo3D, Meshy, OpenRouter), Playwright, gltf-transform e as skills de agente — cada um com a versão lida do package.json.
---

# Stack e ferramentas

Esta página responde à pergunta *"com o que isso é feito?"* — e responde com a **versão
declarada**, não com a lembrada. A tabela abaixo é gerada por `node tools/gen-docs.mjs`
a partir do `package.json`, do `docs/package.json` e do próprio Three.js vendorizado.

{/* BEGIN:GERADO:stack — não edite à mão, rode `npm run docs` */}

| Camada | Ferramenta | Versão |
|---|---|---|
| Motor 3D (WebGL) | **Three.js**, vendorizado | `r160` |
| Jogo | ES modules vanilla, **zero build** | 64 arquivos |
| Site | **Astro** com SSR | `^7.1.1` |
| Hospedagem | adapter **Vercel** | `^11.0.6` |
| Banco | **Postgres gerenciado** (RLS; schema privado, fora do repo) | `^2.110.7` |
| Browser nas réguas | **Playwright** | `^1.62.1` |
| Pipeline de GLB | **gltf-transform** | `^4.4.1` |
| Compressão de malha | **meshoptimizer** | `^1.2.0` |
| Imagem (build e API) | **sharp** · **resvg** | `^0.35.3` · `^2.6.2` |
| Esta documentação | **Docusaurus** | `3.6.3` |
| Runtime de CI | **Node** | `22` |

Three.js sai de `public/vendor/three.module.js` (**sem CDN, sem npm no runtime**). Astro e Vercel de `package.json` + `astro.config.mjs` + `vercel.json`. Dos scripts de `tools/`, **146** importam Playwright, **63** importam gltf-transform e **5** importam meshoptimizer.

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `dependencies/devDependencies do package.json · REVISION de public/vendor/three.module.js`

{/* END:GERADO:stack */}

## As duas zonas, e por que a fronteira é dura

O repositório tem **duas aplicações com regras opostas**, e quase todo mal-entendido de
quem chega nasce de tratá-las como uma só.

### `public/` — o JOGO: Three.js, WebGL, zero build

O jogo é **JavaScript vanilla com ES modules servidos crus**. Não há bundler, não há
transpiler, não há passo de build. O browser baixa `public/js/game.js` como está no
repositório.

Isso é **decisão de projeto, não preguiça**, e ela paga em três lugares:

1. **O jogo roda arrastando a pasta pra qualquer host estático.** Não depende do Astro,
   não depende da Vercel, não depende de npm no runtime. É o que torna viável entregar em
   portal (CrazyGames, itch) sem reescrever nada.
2. **O arnês consegue subir a classe `Game` em node puro.** `tools/eval/harness.mjs`
   importa o **código de produção** com DOM e canvas stubados, e mede o jogo real em
   segundos. Um bundler no meio quebraria isso — e sem isso não existe quality gate.
3. **`node --check` em cada arquivo é um teste de sintaxe completo** (`npm run syntax`),
   porque o arquivo que o node parseia é byte a byte o que o browser executa.

O preço, que também é real: **cache**. Sem build não há hash no nome do arquivo, então a
invalidação é manual — o `?v=` do import map. A regra e o que ela já custou estão em
[Começando](./comecando.md#as-duas-zonas), num lugar só.

**Three.js é vendorizado** em `public/vendor/three.module.js` (mais `vendor/addons/`).
Sem CDN e sem dependência de runtime: o import map aponta para o arquivo local. Não
adicione CDN nem pacote de runtime sem abrir issue.

**WebGL é o alvo, e máquina fraca é requisito.** Existe caminho `quality: 'low'` sem
pós-processamento e kill-switch por querystring em toda mudança arriscada (`?bloom=0`,
`?ao=0`, `?fxaa=0`, `?water=0`). Toda mudança de gráfico que exija render extra tem que
declarar o custo medido.

### `src/` — o SITE: Astro com SSR na Vercel

O site é [Astro](https://astro.build) com o adapter da Vercel. `astro.config.mjs` está em
`output: 'static'` **com adapter**, e as rotas que precisam de servidor optam por
`export const prerender = false` uma a uma — é o caso de `/ranking`, `/u/*`,
`/sitemap.xml` e de todas as rotas `/api/*`.

Aqui framework é bem-vindo. As regras que valem:

- a `service_role` do Supabase vive **só no servidor** e nunca chega ao browser;
- `site` no `astro.config.mjs` está **com `www`**, e todo canonical sai daí;
- `vercel.json` carrega os headers de segurança (CSP, HSTS, nosniff, Referrer-Policy,
  Permissions-Policy) e o cache de CDN.

E a pegadinha que custa a primeira hora de todo mundo: **`src/pages/index.astro` É o
jogo**, servido na rota `/`. Não existe `public/index.html`.

### Banco — Postgres gerenciado, RLS e telemetria

O ranking e a telemetria vivem num Postgres gerenciado. Schema e migrations são
privados (fora do repo — decisão de segurança); o runtime só usa as envs.
ofuscação opcional que foi entregue pronta e **deliberadamente não aplicada**.

A segurança não vem de esconder a `anon` key — ela é pública por design. Vem das
*policies*, dos grants por coluna e do rate limit contado no Postgres
(`src/lib/ratelimit.ts` + RPC `rl_take`), não em memória de lambda.

Identidade de jogador usa UID estável para selecionar a conta e token para
autenticar a sessão; nick é atributo de exibição. Clientes e bancos antigos têm
fallback temporário por `nick + token`, documentado em `docs/seguranca.md`.

Hoje a `anon` key **não sai do servidor**: existia um `GET /api/config` que a entregava
ao browser "pro client ligar OAuth/storage", mas nenhum cliente chegou a usar, e a rota
foi removida (issue #41). Se OAuth entrar na mesa, ela volta — com rate limit.

**O ranking está desligado hoje** (`RANKING_ON` em `src/lib/site.ts`) e foi trocado por
telemetria anônima. É flag, não remoção — detalhes em [Estado atual](./estado.md).

:::note Nada disso é obrigatório pra rodar o jogo
Sem as variáveis do Supabase o site sobe igual: as rotas de ranking respondem
`503 not_configured` e as páginas mostram o aviso. O jogo em `public/` **não usa nenhuma
delas**. Ver `.env.example`.
:::

## Geração de asset — o que é gerado por IA, e por qual serviço

Quase todo asset 3D e 2D deste jogo é **gerado**, não modelado à mão. O fluxo real, não o
hipotético:

{/* BEGIN:GERADO:assets — não edite à mão, rode `npm run docs` */}

| Serviço | O que gera | Script | Chave |
|---|---|---|---|
| **mint.gg** (Mint MCP) | personagens rigados, packs, animação | ferramentas MCP; o registro do que foi gerado é `mint-assets.json` | conta do dono, via MCP |
| **Tripo3D** | props 3D por texto (padrão) | `tools/gen-asset.mjs --provider tripo` | `TRIPO_API_KEY` |
| **Meshy** | props 3D por texto (alternativa) e rig | `tools/gen-asset.mjs --provider meshy` | `MESHY_API_KEY` |
| **OpenRouter** | arte 2D (cartaz de facção, wallpaper, splash) | `tools/gen-image.mjs` | `OPENROUTER_API_KEY` |

`mint-assets.json` registra **65 assets** gerados via Mint (19 `openrouter-image-concept` · 2 `openrouter-concept-tripo-blender-model` · 5 `imagegen-concept` · 30 `mint-model` · 2 `tripo3d-task` · 2 `openrouter-concept-meshy-model` · 5 `mint-asset-pack`), cada um com `assetId`, `chatUrl` e notas do que deu errado na tentativa anterior.

As três chaves de API vivem em `.env` na raiz — **gitignored, modo 600, nunca em `argv`** (argv vaza no `ps` de qualquer processo da máquina). Sem elas o jogo roda igual: o pipeline de geração é offline, o resultado é que entra no repositório.

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `git grep -l SDK -- tools/ | grep .mjs · mint-assets.json`

{/* END:GERADO:assets */}

### Personagens: mint.gg

Os personagens jogáveis são GLB rigados gerados pelo **Mint** (mint.gg), pelas ferramentas
MCP — `start_model_generation` com `riggable_character` em T-pose e mãos vazias, depois
`animate_generated_model` para sair com esqueleto.

Dois fatos não óbvios que economizam dinheiro e rodada:

- **O modelo base do Mint não vem rigado.** O esqueleto só aparece no passo de animação.
  O caminho barato para um personagem novo é: gerar a base → rigar com **um** clipe →
  usar o `rigged_character_glb` dele → reaproveitar os clipes compartilhados.
- **Os rigs Meshy compartilham os mesmos nomes de osso** (`Hips`, `Spine`, `Head`,
  `RightHand`…), então um pack de clipes gerado uma vez casa por nome em qualquer rig da
  família. É por isso que `public/models/anims/` tem clipe compartilhado e clipe próprio
  ao mesmo tempo, e por isso existe o manifesto `index.json` (`npm run anims`) — sem ele o
  jogo pedia clipe de quem não tem e enchia o console de 404.

`mint-assets.json` é o registro do que foi gerado: `assetId`, `chatUrl` e uma nota do que
deu errado na tentativa anterior. **Sem esse registro não dá para revisar nem regerar** —
o asset vira um binário sem procedência no meio do repositório.

### Props 3D: Tripo3D e Meshy

`tools/gen-asset.mjs` gera um prop por texto, baixa o GLB e grava **já otimizado** em
`public/models/props/`:

```bash
node tools/gen-asset.mjs --prompt "caixa de som de baile" --id caixa_som
node tools/gen-asset.mjs --provider meshy --prompt "carro tunado" --id carro_tunado
node tools/gen-asset.mjs --resume <task_id> --id caixa_som   # tarefa já paga
```

Tripo é o padrão; Meshy é a alternativa. `--face-limit` (padrão 12000), `--raw-only` para
pular a otimização e `--timeout` completam as opções.

**Mapa não precisa disso.** Os mapas registrados são geometria procedural em Three.js —
rua, barraco, beco, calçada e rotunda são caixa e plano, que é o que `map_*.js` já faz. O
que vem de GLB são **props**.

### Arte 2D: OpenRouter

`tools/gen-image.mjs` é o irmão 2D: gera cartaz de facção, wallpaper e splash por texto
(+ imagens de referência), e entrega o arquivo **já enquadrado e comprimido** para a caixa
em que a tela vai desenhá-lo.

O recorte mora no script de propósito. Placa de facção é uma caixa `245×620` com
`background-size: cover`; arte em paisagem entra nela mostrando ~26% da largura — foi
assim que quatro cartazes de elenco viraram quatro retratos de UM personagem. O gerador
não oferece essa proporção, então quem publica é quem fecha a conta: gera no aspecto mais
próximo e recorta pelo centro até a proporção **real** da caixa. Assim o que se olha antes
de commitar é byte a byte o que o jogador vê.

### As chaves

`TRIPO_API_KEY`, `MESHY_API_KEY` e `OPENROUTER_API_KEY` são lidas de um `.env` na raiz —
**gitignored, modo 600**. Três regras que os dois scripts compartilham, cada uma com
motivo:

1. **A chave nunca vem de `argv`.** Argumento de linha de comando vaza no `ps` de qualquer
   processo da máquina.
2. **O header `Authorization` só sai para o host da própria API.** O GLB pronto vem de um
   CDN de terceiro (link assinado); mandar a chave junto no download entregaria credencial
   para um host que não é o do provedor. Há allowlist, e `redirect: 'error'` impede que um
   3xx carregue o header para outro domínio.
3. **Nada é impresso sem passar por `redact()`.**

:::caution Essas três chaves não estão no `.env.example`
O `.env.example` cobre só Supabase e o pacote de áudio. As chaves de geração de asset
existem apenas no `.env` do dono. Quem clonar e quiser gerar asset precisa criá-las à mão
com os nomes acima — está documentado aqui e no cabeçalho de cada script, não no exemplo.
:::

## Otimização de GLB: gltf-transform e meshoptimizer

Todo GLB que entra no repositório passa por `@gltf-transform` (`dedup`, `prune`,
`textureCompress` com **sharp** para WebP) e, no caminho estático, por **meshoptimizer**.

O motivo é um teto real: **250 MB na CrazyGames**. GLB cru de personagem chega em 4-5 MB,
dominado por textura PNG 2K — e a otimização é quase toda de textura, não de malha.

Os scripts de pipeline vivem em `tools/`: `optimize-props.mjs`, `optimize-static.mjs`,
`optimize-fpvm.mjs`, `optimize-tribos.mjs`, mais os de rig (`rig-from-donor.mjs`,
`reskin-glb.mjs`, `retarget-glb.mjs`) e os de inspeção (`inspect-glb.mjs`,
`inspect-anim.mjs`, `bones.mjs`).

## Playwright — todo arnês que precisa de browser

Régua que depende de **pixel** roda em Chromium via Playwright. É o caso de
`tools/eval/*-capture.mjs`, `telas-*.mjs`, `select-inflate.mjs`, `crash-watch.mjs` e
`fv-verify.mjs`, entre outros.

Duas coisas que você precisa saber antes de rodar qualquer um:

- **Custa caro.** Render por software (SwiftShader) roda o jogo a ~0,3 FPS; uma captura
  in-game custa minutos por mapa/aspecto. Foi exatamente esse custo que empurrou o quality gate
  para node puro — e é por isso que as invariantes de pixel (`PX1`–`PX4`) estão
  **puladas**, com o motivo dito.
- **Uma sessão por vez.** Duas capturas headless em paralelo derrubam o boot e produzem
  "countdown travado" que parece bug e é carga. Um único agente roda browser.

Alguns arnêses precisam do servidor no ar: `npm run eval:serve &` antes.

## Skills de agente

Este repositório versiona **skills** — instruções empacotadas que um agente carrega antes
de trabalhar. Elas vivem em `.agents/skills/`, e `.claude/skills/` são symlinks para lá.

{/* BEGIN:GERADO:skills — não edite à mão, rode `npm run docs` */}

| Contagem | Quanto | O que significa |
|---|---:|---|
| Declaradas no `skills-lock.json` | 39 | com `source`, `skillPath` e `computedHash` — skill de terceiro que mudar de conteúdo é detectável |
| Versionadas (chegam em quem clona) | 10 | `git ls-files .agents/skills` |
| …dessas, com `SKILL.md` no git | 10 | é o que um clone limpo consegue ler |

**As contagens divergem de propósito, e a diferença é o fato:** a maioria das skills é de terceiro, fixada por hash no lock e baixada sob demanda. Quem clonar o repositório recebe o lock inteiro e só uma parte do conteúdo. Publicar só uma das contagens esconderia exatamente o que o contribuidor precisa saber.

`.claude/skills/` são **symlinks** para `.agents/skills/` — uma cópia só, dois nomes, porque o Claude Code lê de `.claude/` e outros arnêses leem de `.agents/`.

⚠️ Nenhuma skill nativa encontrada em `.claude/skills/`.

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `git ls-files .agents/skills · git ls-files .claude/skills · skills-lock.json`

{/* END:GERADO:skills */}

A grande maioria é de terceiro e cobre Three.js (materiais, iluminação, shaders,
pós-processamento, carregamento de glTF, geometria, animação) e game design. Elas são
contexto opcional: nada no jogo depende delas.

### O gauntlet loop

A skill que **não** é de terceiro é a `gauntlet-fps`, e ela codifica o ciclo de trabalho
desta casa:

> **crítico adversarial → construtores em paralelo → captura medida → verificação A/B →
> caçador de regressões**

**Quando usar:** melhorar, avaliar ou revisar qualquer parte do jogo — gráficos,
fidelidade de mapa, feel de arma, menu, HUD, bots, movimento — e quando algo é reportado
como feio, estranho ou "não parece profissional". **Quando não usar:** tarefa mecânica de
uma linha, ou pergunta conceitual que não mexe no jogo.

O ciclo inteiro — as três regras, o problema que cada uma resolve e o caso medido de cada
uma — tem página própria: **[Instrumentação de IA](./instrumentacao-ai.md)**. Esta seção
existe só para dizer que a skill existe e quando acioná-la.

## A documentação

Esta doc é um **Docusaurus separado**, em `docs/`, com o próprio `package.json` e o
próprio `node_modules`. Nada aqui é importado pelo jogo nem pelo site.

```bash
cd docs && npm install && npm start   # http://localhost:3000/docs/
cd docs && npm run build              # docs/build/
cd docs && npm run build:site         # buildar PARA DENTRO de public/docs/
```

`baseUrl` é `/docs/` porque a saída pode ser buildada para `public/docs/`, e o Astro copia
`public/` inteiro para `dist/client/`.

:::tip Todo número desta página é gerado
As tabelas acima saem de `node tools/gen-docs.mjs` e são conferidas por
`npm run docs:check`, dentro do `check:fast`. O mecanismo — o que entra num bloco gerado, o
que fica escrito à mão, e como colar um bloco novo — está em
[Arquitetura](./arquitetura.md#o-que-é-gerado-e-o-que-não-é).
:::
