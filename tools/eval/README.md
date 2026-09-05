# `tools/eval/` — o arnês de medição

Este catálogo existe pra que ninguém precise abrir cada `.mjs` pra descobrir qual mede o quê —
e pra que os **geracionais aposentados** parem de ser reabertos por engano.

> **Regra deste diretório:** o que roda no CI e os arquivos `.md`/`.json`
> versionados são contrato. O resto é ferramenta de rodada — útil, mas
> descartável.

---

## Captura local dos viewmodels autorados

`golden-ak-runtime.mjs` captura o jogo com materiais reais, amostrando saque,
tiro e recarga pelo helper `lib/authored-pose-capture.mjs`. Avança o recuo em
subpassos, preserva o idle procedural e renderiza a pose antes da foto. Aceita
`--quadro-x/y/z/fov/pitch/yaw/roll` para comparar enquadramentos sem editar o
runtime; os valores e a matriz renderizada ficam no relatório.

`npm run eval:authored-capture -- --mutate` verifica dez contratos com
`AnimationMixer` e `VmRecoil` reais e oito regressões injetadas em cópias
temporárias. É uma régua Node do capturador, **não** aprovação visual ou do GLB;
a folha de contato e o gauntlet de pixels continuam necessários.
O bloco `rendered` registra HUD e pose no frame fotografado; `game.update` fica
congelado apenas durante o screenshot, com retomada em `finally`. Campos da
amostragem de fase não devem ser confundidos com o estado posterior do HUD.

`melee-runtime.mjs` é o capturador da faca (`--saida`, `--porta`, `--largura`,
`--altura`): usa `Game._switchWeapon/_tryKnifeAttack`, avança a simulação em
passos <=1/120 s e registra 19 fotos, estados, pesos e caixas projetadas. Não
usa a rota authored. `--quadro-z` compara profundidade do pacote só em memória;
`--mutante=sem-ataque` precisa reprovar os estados intermediários. É diagnóstico
de browser, não aprovação de contato, anatomia ou movimento contínuo.

`npm run eval:melee-vm` também executa `melee-motion-check.mjs`: sete cláusulas
com o controlador e AnimationMixer reais, fixture mínima sem assets privados.
Os mutantes `--mutante=sem-clamp` e `--mutante=evento-antigo` deste segundo
script recompõem o salto para bind pose e o evento obsoleto que cancela um ataque.

`node tools/eval/vm-contact-diagnostic-check.mjs --mutate` verifica oito
contratos do diagnóstico P4 e duas regressões. O gauntlet reporta distância
`null` e amostra insuficiente quando o filtro de visibilidade não permite medir
o contato: isso continua reprovando, mas não significa mão distante a >192 px.

## 1. Portões (rodam no CI, reprovam PR)

Todos rodam em **Node puro**, sem Chrome, e terminam em segundos. Todos saem
com código 1 em falha crítica.

| Arquivo | O que mede | Artefato |
|---|---|---|
| `invariants.mjs` | **O portão principal.** As invariantes permanentes: toda vez que o dono reporta um bug, ele vira uma invariante aqui e nunca mais volta. Regenera `vm_kick_sim.json` sozinho e LÊ `vm_mint_audit.json`. | `npm run eval:invariants` |
| `vm-mint-audit.mjs` | Enquadramento do viewmodel arma por arma, nos 26 GLBs reais. Mede a seção transversal perto de cada ponta em Z pra descobrir se a arma está de ré. | `vm_mint_audit.json` (**versionado — sem ele as invariantes VM1–VM6/VM9/VM10 viram PULADAS, que é portão verde por ausência de dado**) |
| `vm-kick-sim.mjs` | Coice do viewmodel: near plane + pitch em rajada. Prova que a coronha não atravessa a lente no pico. | `vm_kick_sim.json` |
| `botsim.mjs` | Navegação dos bots: 60 s × 5 mapas com sementes fixas. Roda a classe `Game` de verdade com os mapas de verdade. | `npm run eval:bots` |
| `texel-check.mjs` | **Densidade de texel (px/m) dos 10 mapas**, mediana ponderada por ÁREA, contra a banda 64–512 do BAR §1.8 e a dispersão de 1,5× da BAR-CONSISTENCIA §3.1. Sobe os mapas reais e resolve no disco a textura que o `TextureLoader` não carrega em node. TEXEL6 é a cláusula irmã: vigia se o conserto de densidade borrou textura marcada `ClampToEdge`. | `node tools/eval/texel-check.mjs [--json]` → `texel_check.json` |
| `texel-tetos.mjs` | Os limiares de densidade em UM lugar (BAR §1.8 / §3.1). Importado pelo check; `TEXEL_ALVO` é conferido contra `ALVO_PXM` do `public/js/vao.js` em tempo de execução, então os dois não podem divergir calados. | — |
| `texel-mutantes.mjs` | O teste do teste: injeta de volta cada defeito de densidade (UV fixa, tile gigante, anisotropia 1, canvas pequeno) e exige que a cláusula certa fique vermelha. Morre se o mutante não casar. | `node tools/eval/texel-mutantes.mjs` |
| `texel-custo.mjs` | O PREÇO da nitidez, **no Chrome real** (custo não se mede no stub): draw calls, triângulos, objetos de textura, programas e heap por mapa, em A/B contra um baseline. | `node tools/eval/texel-custo.mjs --saida=x.json [--contra=y.json]` |
| `release-check.mjs` | Release usa o nome CSBR e as notas nativas do GitHub, que preservam PRs e contribuidores. | `npm run eval:release` |
| `error-provenance-check.mjs` | Preserva erro externo no console/banco sem atribuí-lo ao jogo ou abrir issue automática. | `npm run eval:error-origin` |
| `shader-budget-check.mjs` | Deriva do GLB real o orçamento de varyings da urna e protege fog/triplanar no piso WebGL1. | `npm run eval:shaderbudget` |
| `map-rotation-check.mjs` | Sugestão inicial de mapa: link manda, escolha do carrossel fica, e quem não escolhe roda pelos 5 mapas. | `npm run eval:maprotate` |
| `../gen-arch.mjs` | (fora deste diretório) Gera e valida o `ARCH.md`. `--check` reprova se estiver desatualizado. | `npm run arch` |
| `gen-asset-pbr-check.mjs` | Impede o Meshy de baixar a etapa `preview` sem textura como artefato final; cobra `refine`, PBR e textura 2K. | `npm run eval:asset-gen` |

## 2. Documentos — leitura, não execução

| Arquivo | O que é |
|---|---|
| `ARCH.md` | **GERADO.** Índice do `game.js` por linha + tabela de conflito (quem pode editar qual região). O bloco entre `BEGIN:GERADO` e `END:GERADO` **não se edita à mão** — rode `npm run arch`. O texto fora dos marcadores é conhecimento humano e é preservado. |
| `BAR-CONSISTENCIA.md` | **A régua vigente.** 25 critérios de consistência e flow. Tem **precedência** sobre a `BAR.md`. |
| `BAR.md` | A régua de fidelidade visual (CS2/Valorant, o que é alcançável em Three.js r160, como os lugares brasileiros realmente são). |
| `RUBRIC.md` | Rubrica de avaliação usada pelos críticos do gauntlet. |
| `BASELINE-v2.json` | Baseline numérico da v2, pra comparação A/B. |

## 3. Verificadores de mapa, modo e UI

| Arquivo | O que mede |
|---|---|
| `map-check.mjs` | Geometria do mapa: colisores, spawns, alcançabilidade e ≥2 rotas CTF separadas por 6 m (`--mutante=rota-unica` prova o portão). |
| `probe-grafite.mjs` | Sonda descartável da passada viva de grafite: abre `mapview?grafite=vivo` e despeja âncoras (com `__grafiteDebug`), contadores de recusa e superfícies por mapa. Diagnóstico, não é régua. |
| `map-source-check.mjs` | Procedência por SHA e uso efetivo dos materiais/céus dos mapas novos (`--mutante=hash-falso` e `asset-desligado`). |
| `campo-contract-check.mjs` | Assimetria campo×galpão, convergência, visadas, cover, abertura `field-mouth` e iluminação declarada do interior. |
| `relevo-check.mjs` | Cota do chão na área ANDÁVEL (alagamento pelo `_freeSpot` real): amplitude, fração plana, declive, subida contínua a pé e silhueta. Só o `fy_campomorro` tem contrato; os demais saem informativos. Mutantes: `terreno-plano`, `silhueta-rasa`, `degrau-unico`. |
| `lajes-rooftop-check.mjs` + `lajes-gap-check.mjs` | Detalhe cultural, vãos nas malhas e bordas/linhas que tornam os saltos legíveis no frame. |
| `ambience-check.mjs` | Abre os GLBs reais de rato/pombo em `fy_lajes`, `fy_corrego` e `fy_escadao`; mede determinismo, reação a tiro pelo `Game`, degradação LOWQ, custo e largura/duração do traçante. `--fotos` captura 3:2; mutantes por cláusula. |
| `mansao-water-check.mjs` | **Piscina ENTRÁVEL com anti-trap** (BUG-67: decisão do dono 18/08 inverteu o contrato; `agua-bloqueada` volta a tampa e tem que ficar vermelho), espelho d'água NÃO entrável, frota GLB, jardim tropical e interior mobiliado. Mutantes: `agua-bloqueada`, `borda-alta`, `sem-parede`, `piscina-sem-cuba`, `piscina-cuba-curta` + os de frota/jardim/interior. |
| `mansao-garden-check.mjs` | Jardim da Mansão com variedade, composição e escala (BUG-67: "o jardim esta bizarro"): G1 teto de 30 instâncias por malha + tint/escala por instância + colônia same-mesh ≤8 em 6 m; G2 cadeia de pedras portão→porta, rota porta→piscina pelo A* do mapa e plantio fora do caminho; G3 dossel 0,50–2,60 m e árvores 3,0–6,8 m contra o jogador de 1,70 m. Mutantes: `clona-tudo`, `planta-no-caminho`, `planta-gigante`, `sem-pedras`. |
| `corrego-contract-check.mjs` + `escadao-contract-check.mjs` | Lentidão, escala/anatomia da fauna do Córrego e flancos/caveirão do Escadão, com mutantes por cláusula. |
| `mantle-check.mjs` | **Subir em beirada (mantling), nos 10 mapas.** MNT1 toda queda de mão única de escala humana é reversível a pé em ≤ 2 s; MNT2 toda beirada com apoio no topo é escalável, verificado **andando o `_updatePlayer`**; MNT3 o mantle não abre **nenhuma** célula nova — sem esta cláusula o conserto vira exploit. Node puro, ~4 s. O A/B é `SIM_QS='?mantle=0'` (o mesmo kill-switch do jogo). Mutantes: `beirada-baixa`, `beirada-alta`, `canal-fechado`. `npm run eval:mantle` |
| `map-evidence-contract-check.mjs` | Falha fechado se PNG, fonte, GLB, câmera ou viewport 3:2 divergir do manifest. A recaptura é `npm run capture:map-evidence`; `--plan` não abre browser. |
| `char-thumbnail-contract-check.mjs` | Arma canônica, SHA e dimensão 360×463 dos thumbnails dos pilotos registrados (`--mutante=arma-trocada`). |
| `char-hard-surface-check.mjs` | Materiais rígidos do Motoca, forma frontal e contrato de casca full-face contínua com visor único; mutantes recompõem lâmina, halo, aro e peças empilhadas. |
| `camera-grip-evidence-check.mjs` | SHA de Câmera/M4, walk/crouch e contato das duas mãos nos anchors da evidência Blender (`--mutante=arma-deslocada`). |
| `pilot-system-check.mjs` | Caneca/teclado do Programador; M4 do Designer; P90/gambiarra do Doidinho; cadastro, M4, pacote animado e sockets Hips/Spine01 dos props da Lenda. Mutantes causais por defeito. |
| `pilot-grip-evidence-check.mjs` | Recibos Blender do Programador/Designer/Lenda com M4 e Doidinho com P90: SHA, sockets, duas mãos em walk/crouch/3/4 e mutante visual real de arma deslocada. |
| `motoca-visual-check.mjs` | Máscara Blender 360×463 mede casca full-face/visor único, abertura/continuidade do capacete e corpo/suporte/brilho do telefone; mutantes de projeção. |
| `mint-asset-integrity-check.mjs` | Compara o GLB final ao `finalSha256` do registro Mint/Tripo/Meshy (`--mutante=sha-trocado`). |
| `gltf-validator-check.mjs` | Validador oficial Khronos nos artefatos finais tipados como `model/gltf-binary`; a enumeração é compartilhada com integridade (`--mutante=cabecalho` e `--mutante=inclui-imagem`). |
| `character-voice-contract-check.mjs` | Oito falas por slice, hooks por personagem, fallback e gerador seguro (`--mutante=fala-longa`). |
| `mode-check.mjs` | Rounds × CTF: o modo abre e termina em todos os mapas. |
| `ctf-verify.mjs` | Bandeiras alcançáveis a partir dos dois spawns. |
| `fv-verify.mjs` | Específico do Ferro Velho (A*/waypoints/LOS com o cânion BECO OESTE). |
| `pickup-check.mjs` | Itens coletáveis: posição e alcance. |
| `ui-check.mjs` | Elementos de HUD presentes e legíveis. |
| `mat-check.mjs` | Materiais: nada preto chapado, nada estourado. `npm run eval:mat` |
| `bot-routes.mjs`, `botdiag.mjs` | Diagnóstico de rota e de estado dos bots (complementam o `botsim`). |
| `stance-speed.mjs` | Velocidade por postura (andar/correr/agachar). |
| `loadout-test.mjs` | Loadout por personagem/facção. |
| `vertical-slice-abilities-check.mjs` | Mecânicas executáveis dos três slices: Stack Trace com LOS, carga/ping de rota do Motoca e interação de objetivo do Doidinho, incluindo mutantes. `npm run eval:slice-abilities` |

## 4. Viewmodel e rig — a família mais densa

| Arquivo | O que faz |
|---|---|
| `vmrig-test.mjs` | Rig do viewmodel a 240 Hz, em node puro. |
| `vm-frame-check.mjs` | Enquadramento por frame. |
| `vm-orto.mjs` | Área de tela ocupada pela arma (a métrica de "arma gigante"). |
| `vm-project.mjs`, `vm-solve.mjs` | Projeção e solução do enquadramento. |
| `vm-verify.mjs` | Verificação final do viewmodel. |
| `tp-mount-probe.mjs` | Mount de 3ª pessoa, com parser de GLB próprio. |
| `fparms-capture.mjs` | Captura dos braços de 1ª pessoa. |
| `mount-capture.mjs` | Captura do ponto de mount. |
| `weapon-capture.mjs` | Captura arma a arma. |
| `select-mount.mjs` | Contato e orientação da arma no caminho real da seleção; usa o shell mínimo de personagem do `serve.mjs`. |
| `select-inflate.mjs` | Deformação da skin depois de animação, curl e IK da seleção; `--fotos[=dir]` renderiza a pose medida e `--diagnose` atribui arestas ruins ao osso dominante. |
| `char-probe.mjs`, `char_probe.py`, `char_sim.py` | Sondas de personagem (proporção, escala, palma). |
| `mixamo-capture.mjs`, `mixamo-measure.mjs` | Clipes do pack Mixamo. |

## 5. Referência e cor

| Arquivo | O que faz |
|---|---|
| `ref-measure.py` | Mede as fotos de referência de `references/viewmodel/` (é de onde saiu o teto de área de tela da VM18b). |
| `ref-body.py`, `ref-overlay.py` | Proporção corporal e sobreposição com a referência. |
| `r3_color.py`, `r3_depth.py`, `r3_fog.py`, `r3_texsim.py`, `r3_vm.py`, `r3_sim.py` | Rodada R3: cor, profundidade, névoa, textura. |
| `tone_calib.py`, `tone_r3.py`, `tone_sat.py` | Calibração de tonemap e saturação. |
| `vao_a1.py`, `vao_predict.py` | Oclusão de ambiente. |
| `mat_shade.py` | Sombreamento de material. |
| `havan-planta.py` + `.png` | Planta baixa da Loja H. |
| `p0-pix.py` | Comparação pixel a pixel da rodada P0. |
| `vm_quake_measure.py` | Medição do look Quake 4 (o antecessor do look CS 1.6 atual). |

## 6. Infra

| Arquivo | O que faz |
|---|---|
| `serve.mjs` | Servidor estático pro harness. `npm run eval:serve` |
| `harness.mjs` | Base compartilhada dos capturadores com Chrome. |
| `measure.mjs` | Utilitários de medição. |
| `shot.mjs`, `vmshot.mjs` | Screenshot simples. |
| `gl-metrics.mjs`, `gl-shots.mjs` | Métricas de GPU e capturas. |
| `blind-capture.mjs` | Captura cega das 26 armas (o "0 erros" que fecha rodada). |
| `game-capture.mjs`, `map-capture.mjs`, `select-capture.mjs`, `bv-capture.mjs`, `vm-capture.mjs`, `walk-video.mjs` | Capturadores por cena. |
| `fx-test.mjs` | Efeitos (bloom, partículas). |

---

## 7. OBSOLETOS — duplicação geracional não aposentada

**Não abra estes para entender o sistema.** Cada um foi escrito para UMA rodada
específica de gauntlet, resolveu o que tinha que resolver e ficou. O
conhecimento deles já está ou nos portões da §1, ou nos comentários de causa
raiz dentro do `weapons.js`/`game.js`, ou no `CHANGELOG.md`. Ficam versionados
porque reproduzem medições históricas — não porque alguém deva rodá-los.

**Aposentados** (movidos para `tools/eval/aposentados/`, fora do `grep` de
quem busca no arnês ativo): as 5 gerações de `audio-probe*.mjs` (sondas da
rodada 4 — grafo WebAudio, eco, duck, pan/PropDelay). O que cada uma media
sobreviveu nos comentários de causa raiz do `audio.js` (master chain com
limiter anti-clip, `duckBus` sidechain, caps de bounce em ~80ms) e nos portões
`audio:check`/`assert:assets` — nenhuma delas é mais execução de portão.

**Aposentada — Rodada G2-R6 (pose e troca de arma)** (movida para
`tools/eval/aposentados/` em 2026-08-11, issue #43):
`g2r6-blackband.mjs` · `g2r6-bots.mjs` · `g2r6-bots2.mjs` · `g2r6-capture.mjs` ·
`g2r6-pose-tune.mjs` · `g2r6-switch-capture.mjs` · `g2r6-switch2.mjs`. O que
mediram sobreviveu: a pose e o framing da arma nos comentários de causa raiz do
`weapons.js`/`game.js`; o critério de troca (holster→draw, nunca duas armas no
quadro) no `BAR-CONSISTENCIA.md` §C14; e `g2r6-bots2` foi o predecessor do
`botsim.mjs`, que o substituiu (ver o cabeçalho do `botsim.mjs`).

**Aposentada — Rodada G2-R7 / R7b / R8 (framing e boca do cano)** (movida para
`tools/eval/aposentados/` em 2026-08-11, issue #43):
`g2r7-aksweep.mjs` · `g2r7-capture.mjs` · `g2r7-mzprobe.mjs` · `g2r7-orbit.mjs` ·
`g2r7-smoke.mjs` · `g2r7b-capture.mjs` · `g2r7b-mzmarks.mjs` · `g2r7b-smoke.mjs` ·
`g2r7b-sweep.mjs` · `g2r8-sweep.mjs`. Superadas pelo `vm-mint-audit.mjs`, que mede
em vez de varrer — é lá que o framing e a boca do cano viraram portão.
**Ficam onde estão** (não são obsoletos: `vmattach.js` os cita como proveniência
das offsets do viewmodel): `g2r7-mzmarks.mjs` (vmattach.js:18) e
`../g2r7-measure.mjs` em `tools/` (vmattach.js:15/20/27).

**Aposentada — Rodada G2-R14 (OOM e ADS)** (movida para
`tools/eval/aposentados/` em 2026-08-11, issue #43):
`g2r14-ads.mjs` · `g2r14-capture.mjs` · `g2r14-memprobe.mjs`. O `memprobe` foi o
que achou o OOM de 322 MB no boot; o problema morreu com a migração pros GLBs da
Mint, e o registro do episódio ficou no `CHANGELOG.md`.

**Rodada G2-UI:**
`g2ui-map-bot.mjs` · `g2ui-map-previews.mjs` · `g2ui-map-tp.mjs` ·
`g2ui-map-walk.mjs` · `g2ui-probe.mjs` · `g2ui-verify.mjs` ·
`g2-capture.mjs` · `g2-tune.mjs` · `../g2-gunspace.mjs` · `../g2-maskprobe.mjs`

**Aposentada — Menus P1 (3 gerações) + P0** (movida para
`tools/eval/aposentados/` em 2026-08-11, issue #43):
`p1-menu.mjs` · `p1-menu2.mjs` · `p1-menu3.mjs` · `p1-game.mjs` · `p0-armas.mjs`.
Capturas das telas de menu e da tela de armas de gerações antigas; a UI atual e
o que essas rodadas decidiram vivem no site/`main.js` e no `CHANGELOG.md`.

**Aposentada — Rodadas R7x (feel)** (movida para `tools/eval/aposentados/` em
2026-08-11, issue #43):
`r7-feel-capture.mjs` · `r75-capture.mjs` · `r76-capture.mjs` · `r77-capture.mjs`.
Eram capturas de tuning de game feel; o que decidiram sobreviveu nos comentários
de causa raiz do `game.js`/`springs.js` e no `CHANGELOG.md`.

**Look Quake 4** (o projeto escolheu o look CS 1.6 na v3.2.0):
`vm-quake-capture.mjs` · `vm-quake-scen.mjs` · `vm_quake_measure.py`

**Diagnósticos R2:** `r2_audit.py` · `r2_diag.py`

### Se for aposentar de verdade

Antes de apagar qualquer um, confira:

```bash
grep -rn "<nome-do-arquivo>" tools/ .github/ package.json
```

`invariants.mjs` importa `tp-mount-probe.mjs`, e vários capturadores importam
`harness.mjs` — obsoleto que é dependência de portão **não é obsoleto**.

---

## 8. Não versionar

`__pycache__/` estava versionado (12 `.pyc`) e agora está no `.gitignore`.
Se ele reaparecer no `git status`, é porque alguém removeu a regra.
