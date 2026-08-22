# 13 - VISUAL v2.1: lajes, córrego, mansão, fauna e a fábrica de models

> Escrito em 18/08/2026 contra `feat/times-e-mapas-completo` @ `1bbe8bf`, com as frases
> **literais** do dono. Este é o documento de BOOT das frentes da v2.1.0 - todo subagente
> lê isto antes de tocar em qualquer arquivo.
>
> Estratégia aprovada pelo dono: branch **`v2.1.0`** como base; cada frente trabalha num
> worktree próprio e abre **PR contra `v2.1.0`** (nunca contra a main); o dono confere
> jogando no worktree da frente; `v2.1.0 → main` + bump `2.1.0` só quando o conjunto
> passar no playtest dele.

## A frase que define o ciclo

> *"num geral sinto que esta tudo 60-70% feito falta um up visual e os mapas mais
> complexos simplificar as rotas pra que os bots possam jogar pelos becos e tambem
> pelas lajes"*

Não é reescrita: é **up visual + clareza de rota + preencher buracos** no que já jogou
bem. O dono validou por jogo (17-18/08): *"o mapa do joa como mapa esta bom"*,
*"o corrego é o melhor meio termo de todos"*, *"o lajes e a regua de favela visualmente
... e o mais bonito de todos"* - os problemas listados abaixo são **específicos**, não
uma reprovação geral.

## O diagnóstico do dono, medido contra a árvore (18/08)

| Frase literal | Estado medido | Frente |
|---|---|---|
| *"a parte debaixo tem cantos intransponiveis se vc cai de cima voce nao sai nunca mais isso nao pode acontecer"* | **Não existe régua anti-trap.** LC1-6 mede circuito ≥92% do térreo; o canto preso mora nos 8% não cobertos. MAP6 só cobre queda ≥2 m sem guarda | **A** |
| *"os barracos embaixo estao ainda em caixas menores do tamanho real"* | Kit nativo 4,2 - 6,75 m; `escala-favela` (ESC1-5) consertou o córrego e **nunca rodou no lajes** | **A** |
| *"o caminho do mapa nao e muito claro"* + *"idealmente o lajes seria parecido com o primeiro mapa q tinha uma praca aberto no meio, varios becos tipo 2,3 vindo do respawn e as lajes"* | Beco-linear hoje (`MAIN_BECO` + 3 ramais); sem praça central | **A** |
| *"as casas das lajes teriam dois andares, as lajes em si e um andar debaixo com buraco tipo bunker, mas esse seria o 2 andar de 3, e nem todas seriam assim"* | `groundHeightAt` multinível JÁ existe (R27); falta a casa-bunker com vão no térreo | **A** |
| *"eu tinha usado o mint gg pra fazer jacare e capivara e nao vejo"* | GLBs existem, otimizados, revisados - **zero call-site**; no mapa são proxies procedurais (`map_corrego.js:569-701`) | **B** |
| *"faltou tambem usar os glbs de grama"* | **Nenhum GLB de vegetação no acervo**; córrego sem planta nenhuma | **B** |
| *"precisamos melhorar a agua, o threejs consegue fazer coisa muito melhor que isso"* | Planos `MeshStandardMaterial` empilhados, sem shader/onda/reflexo. Caminho: `onBeforeCompile` no material existente (zero-build preservado - **não existe addon Water no vendor e CDN é proibido**) | **B** |
| *"a piscina nao afunda"* | **Contrato atual proíbe**: colisor acima dos pés, mutante `agua-entravel`. **Decisão do dono 18/08: inverter** - piscina entrável com profundidade; régua reescrita junto (mutante vira `agua-bloqueada`) | **C** |
| *"o jardim esta bizarro"* | 72 clones de folhagem + maciços repetidos. **Decisão: refazer do zero com régua de variedade** | **C** |
| *"a pomba que nao esta com bracos avertos deveria ficar so na ponta das lajes ou no chao"* | `pigeon_flight.glb` estático (asas abertas por pose) voa em ~todos os mapas via `ambientlife.js:326-356` | **D** |
| *"faltou rigar o cachorro caramelo ... e outros animais tambem"* | Caramelo **tem** rig (12 clipes Quaternius). O buraco real: jacaré/capivara estáticos - pipeline Mint de animação é humanoid-only. Rota: **Quaternius CC0** (o caramelo prova o pipeline) | **D** |
| *"voce precisa fazer 30 models novos ... a caixa da agua ta horrivel, as roupas penduradas no corrego, quebrada e campinho tao ruins, na laje tao bons, fazer variacoes"* | Caixa d'água Tripo `f38947f5`; varal só existe como textura/procedural fora do lajes | **E** |
| *"fazer pixacoes variadas um pack com 150 pixacoes de sao paulo, rio de janeiro, voce tem que rodar pesquisa pra isso"* | Pool de 202 decals **sem metadado geográfico**; só `corrego_streetart_pixo.webp` menciona SP | **F** |

## Decisões do dono (18/08, todas confirmadas)

1. **Estratégia**: v2.1.0 como base dos PRs; NÃO fatiar os 78 commits existentes.
2. **Piscina da mansão**: entrável, com profundidade de verdade.
3. **Jardim**: refazer do zero com régua (dono valida por screenshot depois).
4. **Créditos Mint/imagegen**: aprovados **por frente**, conforme pedirem.
5. **Lixo de agente** (`graphify-out/`, `tmp/lenda-*`, `url_verification_cache.json`,
   logs): fora do índice da v2.1.0 + gitignore.

## As frentes (worktrees disjuntos por arquivo)

| # | Worktree | Toca | NÃO toca |
|---|---|---|---|
| A | `a-lajes` | `map_lajes_authored.js`, `map_lajes.js`(morto - deletar), `maps.js`(registro), réguas lajes | `game.js` fora de waypoints |
| B | `b-corrego` | `map_corrego.js`, `ambientlife.js`(call-site fauna córrego) | `map_lajes*` |
| C | `c-mansao` | `map_mansao.js`, `mansao-water-check.mjs` | `map_corrego*` |
| D | `d-fauna` | `ambientlife.js`, `models/ambient/`, configs de fauna dos mapas (só o bloco AMBIENCE) | água/geometria de mapa |
| E | `e-models` | `models/props/`, `mint-assets.json`, `FONTE.md` | `map_*.js` (entrega acervo) |
| F | `f-pixacao` | `references/graffiti/`, `tools/gen-graffiti-decals.mjs`, `textures.js`(bloco DECALS) | layouts (regen é do integrador) |

**Zona vermelha compartilhada**: `game.js`, `maps.js`, `constructor()/update()/_dom()` -
só a frente A, e por append. **Regens** (grafite, feet, docs, arch, map_check): NUNCA nas
frentes - o integrador roda na ordem certa a cada merge (BUG-02/BUG-60).

## Réguas ANTES (Lei 1 - sem número de antes, não há conserto)

| Frente | Régua nova (com mutação) |
|---|---|
| A | **anti-trap**: flood de fuga - toda célula andável alcançável do spawn tem caminho de VOLTA ao spawn; mutante sela um canto → vermelho. + ESC1-5 do `escala-favela` rodando no fy_lajes |
| B | censo de fauna do córrego lê o **GLB posicionado** (não o procedural); água: cláusula de que o material tem shader de onda (mutante remove `onBeforeCompile` → vermelho) |
| C | `mansao-water` INVERTIDA: piscina entrável com profundidade mínima (mutante `agua-bloqueada` volta o colisor → vermelho); jardim: teto de clones de folhagem (mutante clona → vermelho) |
| D | cláusula AR: **nenhuma pomba em voo** em mapa nenhum (mutante adiciona flight → vermelho); jacaré/capivara com clipes tocando (se rig existir) |
| E | cada model: FONTE.md + SHA no `mint-assets.json` + review adversarial `asset-review` |
| F | `grafite-editorial` estendido: todo decal novo tem `cidade:SP\|RJ`; veto de réplica de writer real (linha editorial - estilo, nunca assinatura) |

## Techs adotadas

- **BuildingGeneratorThreeJS** (MIT, 322★): gerador de prédio com kit de ~190 peças
  (varais, AC, telhado) + manifesto + placement seeded. Usar a **gramática de
  enfileiramento** (e peças MIT úteis, reskin favela) nas frentes A e E. Não copiar o
  visual de Hong Kong - copiar o algoritmo.
- **img2threejs** (Tripo/Mint image-to-3D): gerar props a partir das fotos de referência
  da pesquisa do F e do acervo `references/`.

## Ordem de execução

1. A, B, C, D em paralelo (worktrees independentes).
2. E alimenta B (grama) e A (varal/caixa d'água) com os primeiros lotes - priorizar:
   **grama → caixa d'água → varal** nessa ordem.
3. F roda pesquisa primeiro (estilo SP x RJ), geração depois.
4. Cada frente ao fechar: `check:fast` local sem vermelha nova → PR contra `v2.1.0` →
   dono joga no worktree → merge um a um com regens do integrador.

## Critério de aceite final (o dono define)

Screenshot 3:2 + playtest dele por frente. Nada fecha por placar de portão sozinho -
mas nenhuma vermelha nova entra no merge.
