# Praça dos Três Poderes — ledger da frente visual/jogabilidade (Claude, 06/09/2026)

Ledger vivo desta frente. Fatos, números e caminhos; sem celebração. Atualizado a cada
checkpoint. Evidência volumosa fica em `artifacts/praca-poderes/` (fora do Git, por tamanho);
o que cabe em texto fica aqui.

## Objetivo e definição de pronto

**Objetivo:** subir a qualidade visual e a jogabilidade do `praca_poderes` (mapa padrão do
jogo, 1.897 partidas em produção somando o alias antigo do id (ver `ALIAS_MAPA`), lido de
`/api/map-plays` em 06/09/2026) com evidência: baseline em 3:2, réguas que reprovam antes e aprovam depois,
mutação que prova que a régua morde, e comparação A/B nas mesmas câmeras.

**Pronto significa:**
1. baseline 3:2 capturada no jogo real servido pelo Astro (não `public/`), com poses fixas
   reproduzíveis (`tools/eval/praca-evidence-capture.mjs`);
2. cada defeito atacado tem régua VERMELHA antes do conserto e VERDE depois, com mutante
   que a devolve ao vermelho;
3. A/B nas mesmas poses, olhado e descrito (não só numerado);
4. corpo real (`Game._updatePlayer`/`_collide` no navegador) percorre spawn → bandeiras →
   spawn nos dois times sem travar, sem cabeça dentro de malha visível;
5. custo de cena dentro do teto de `tools/eval/cena-tetos.mjs` (praca_poderes: 350 calls /
   740 k tris) medido no navegador;
6. portões pertinentes do `package.json` verdes (`syntax`, `eval:mapcontrato`, `eval:texel`
   para o mapa, `docs:check`, `arch:check`, `check:fast`), sem afrouxar teto;
7. crítico adversarial de contexto limpo (`asset-review`) sem P0/P1 aberto;
8. nada publicado: sem push, PR, merge ou deploy sem autorização.

## Isolamento

- Worktree próprio: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/praca-poderes-claude`
  (mesmo banco Git de `/Users/ruben/csbrasil/client`).
- Branch: `claude/praca-poderes-visual`, criada de `origin/main` em `a551204f`
  (`v2.0.0-alpha.224`). Nada foi escrito na lane primária
  (`feat/fps-paid-viewmodels-aaa`) nem nos checkouts de outros agentes.
- Servidor: Astro real em `http://127.0.0.1:8177` (`npx astro dev --host 127.0.0.1 --port 8177`).
  Portas 8131/8145-8149/8156-8160/8191-8192 já estavam ocupadas por outras frentes e não
  foram tocadas.
- `node_modules` é symlink para o checkout principal; `public/img/decals` e `public/audio`
  (gitignored) foram copiados do acervo local só onde faltavam.

## Frentes vizinhas (para não colidir)

Levantado em `git worktree list` + PRs abertos em 06/09/2026:

| Mapa | Quem | Onde | Estado |
|---|---|---|---|
| Escadão | Codex | `codex/escadao-main` (worktree `escadao-visual`) | integrando sobre alpha.223, commits às 04h |
| Lajes | Codex | `codex/lajes-visual` | V5, commits às 04h |
| Amazônia | Codex | `codex/amazonia-visual` | commits às 04h |
| Sertão (`velho_oeste`) | Codex | `codex/sertao-astra`, PR #511 | commits às 04h |
| Córrego | — | PR #467 (30/08) + `feat/lote-ceu` (01/09), BUG-79 aberto | parado |
| Posto/Obras/Atacadão/Piscina/Penitenciária/Parque/Mansão/Gelo/Campo | — | PRs `map2/*` de 26-27/08, base 318 commits atrás da main, todos em conflito | parados |
| **Praça dos Três Poderes** | **esta frente** | sem lane, sem PR `map2/*`, último toque na main em 12/08 | — |

Escolha: Praça é o mapa padrão (`DEFAULT_MAP`), o 2º mais jogado, nunca capturado no
`docs/maps/MAP_AUDIT.md` (nota inferida do código), e o único entre os mais jogados sem
nenhuma frente aberta. Piscina é o 1º mais jogado (2.978 partidas) mas tem re-autoria de
layout pendente no PR #447.

## Método encontrado no repositório (síntese)

- Leis da casa: régua antes do conserto; teto com procedência; mutação que faz a régua
  reprovar; gerar a figura e olhar; quem constrói não dá a nota (`AGENTS.md`, `docs/LICOES.md`).
- Réguas de mapa em node puro via `tools/eval/harness.mjs` (`map-check`, `pickup-check`,
  `botsim`, `texel-check`, contratos por mapa); réguas que dependem de asset carregado ou
  de pixel rodam no navegador (`cena-check`, `graffiti-census`, sondas de runtime do Codex).
- Padrão de evidência do Codex (Escadão/Lajes): 8 câmeras 1536×1024, sonda de runtime com
  `_updatePlayer`/`_collide` reais, raios por ombro para headroom, A/B interceptando o
  builder do SHA baseline, crítico limpo, mutantes por cláusula, relatório em
  `docs/reports/*` e evidência em `artifacts/<frente>/`.
- Régua visual vigente: `tools/eval/BAR-CONSISTENCIA.md` (consistência > fidelidade; um
  matiz por mapa; ≤ 4 objetos / 2 famílias na banda 0–5 m; texel uniforme ±50 %; nada de
  specular no cenário; C21–C25 para espaço de jogo).
- Limitação: `references/mapas/world/` (dossiê + PNGs citados no `MAP_AUDIT.md`) NÃO existe
  em nenhum checkout desta máquina (gitignored; provavelmente arquivado no sparsebundle de
  01/09). Ancoragem desta frente: fotos CC do Wikimedia Commons em
  `references/praca-poderes/` (só análise; não redistribuir) + `BAR-CONSISTENCIA.md`.

## Baseline (06/09/2026, alpha.224)

Captura: `BASE=http://127.0.0.1:8177 node tools/eval/praca-evidence-capture.mjs artifacts/praca-poderes/baseline`
— 14 poses 1500×1000 (3:2), jogo real, `state === 'live'` em 34,8 s, + 5 vistas altas
(`top-*.png`, `obl-leste.png`). Erros de console: só CORS de telemetria remota
(`/api/map-plays`, `/api/pick`, `/api/online`) — limitação conhecida do arnês local, não do mapa.

Réguas em node (sem alteração no mapa):

| Régua | Resultado |
|---|---|
| `map-check praca_poderes` | 47 nós dentro, 0 submersos; spawn B exposição 89,8 % / E 84,3 % (esplanada: aberto por desenho); CTF2 ≥ 4 rotas separadas; MAP5 prop 0× nos 8 quadrantes externos (flancos sob pilotis) — teto só cobrado na Loja H por decisão declarada |
| `pickup-check praca_poderes` | 50 pickups, 0 sem alcance, 0 abaixo do piso, 0 flutuando |
| `botsim 60 praca_poderes` | stuck 6,5 % · eff 0,324 · latFlips 4,0/min (na faixa dos outros mapas do golden) |
| `texel-check --mapa=praca_poderes` | **VERMELHA** (TEXEL3b): mediana 66 px/m (piso 64), 6 % da área abaixo do piso, pior estrutural 13,6 px/m, maior 1.261 px/m = 19× a mediana |
| `cena-check --medir` (navegador, GPU real) | 314 calls / 651 k tris / 127,6 fps (teto 350 / 740 k) |

O que as capturas mostram (descrito do pixel, não do código):

1. **Água do espelho lê como faixa preta** (`espelho-dagua-norte.png`, recorte ampliado):
   a lâmina (`MAT.agua`, `MeshStandardMaterial` 0x2f6ea0, metalness 0,55) entre os
   parapeitos aparece azul-marinho quase preto, sem reflexo do céu. Na referência
   (`references/praca-poderes/planalto-fachada-*.jpg`, espelho do Planalto) a água é clara,
   espelho do céu e da fachada. O Córrego já usa a água viva compartilhada (`water.js`,
   `createWater`) — a Praça é a única lâmina d'água do jogo fora desse caminho.
2. **Horizonte vazio a leste/oeste** (`piloti-leste-corredor.png`, `ministerio-empena.png`):
   das rotas de flanco sob os pilotis (rota real, CTF2) e dos vãos entre blocos o jogador
   vê a pista do Eixo e depois um plano de cerrado até a névoa, sem nenhuma silhueta. Na
   referência (`esplanada-2018-ccby2.jpg`) atrás dos ministérios há anexos, arvoredo denso
   e a cidade. É o "distant world" (§29 do dossiê) que o `MAP_AUDIT` já apontava como risco.
3. **Texel abaixo do piso nas pistas do Eixo** (57,7 px/m: repeat 8×40 sobre 21×300 m dá
   97 px/m no eixo x e 34 px/m no eixo z) e **guia/balizador a 968–1.261 px/m** (624
   instâncias de 0,2 m com canvas 512): é o 19× que deixa a régua vermelha.
   **Bandeira** 180×126 px sobre 13×9,4 m (13,6 px/m) — vista a ≥ 60 m, impacto baixo.
4. **Texto pixelado nas caixas de madeira** ("CUIDADO", `onibus-de-oeste.png`): canvas 128 px
   sobre caixa de 2 m (80 px/m, dentro da banda 64–512, mas os glifos foram desenhados
   pequenos e a 1 m viram blocos). Registrado; não é o pior número.
5. **Piso da lane escuro** é decisão documentada e medida (`map_brasilia.js:315-318`,
   C3/C4: ≥ 6 pontos de L* abaixo das paredes brancas) — preservada.
6. Poses `planalto-de-frente`/`stf-de-frente` em (±10, 0, 52) nasceram dentro do
   embasamento do Planalto/STF: erro da pose, não prova de bug; a sonda de corpo abaixo
   decide se o lugar é alcançável andando.

## Plano da rodada 1 (conjunto delimitado)

| # | Defeito | Régua (antes → depois) | Conserto |
|---|---|---|---|
| R1 | texel desbalanceado (pistas < piso, guia 19×) | `eval:texel --mapa=praca_poderes` vermelha → verde; mutante `texel-mutantes.mjs` | repeat anisotrópico das pistas; guia/balizador com repeat na banda; bandeira em canvas maior |
| R2 | água do espelho = faixa preta | régua nova `praca-contract-check` cláusula PA-AGUA (mesh `aguaViva` sob `world.root`, ShaderMaterial, na lista `scene.userData.waters`) + medição de L* na pose `espelho-dagua-norte` | `createWater` compartilhado (mesmo caminho do Córrego), escala de profundidade da bacia |
| R3 | horizonte vazio dos flancos | régua nova PA-HORIZ: raios horizontais dos waypoints de flanco para ±x têm que encontrar malha visível entre 60 e 300 m em ≥ 60 % (hoje 0 %) | anexos + arvoredo distantes fora dos bounds, 2 draw calls instanciados, sem colisor |
| R4 | corpo/colisão/headroom | sonda de runtime no navegador (rotas spawn→bandeiras→spawn nos 2 times, headroom por ombro, retorno) | só se a sonda achar defeito |

Custo: R3 precisa caber em 36 calls / 89 k tris de folga do teto.

## Rodada 1 — o que foi feito (06/09/2026)

### R4 · sonda de corpo (feita primeiro, porque decide se o resto vale)

`tools/eval/praca-runtime-probe.mjs` (navegador, `Game._updatePlayer`/`_collide` reais, GLBs
carregados; padrão da `escadao-runtime-probe` do Codex reduzido ao que a Praça tem).
Cláusulas PR1 (waypoints), PR1b (grade de 1 m alcançável a pé por `_retaAndavel`), PR2 (rotas
spawn → bandeiras → spawn nos dois times pelo A* do mapa), PR3 (passeio aleatório, semente
fixa). Mutantes `cabeca` (laje a 1,25 m sobre a lane → PR1/PR2/PR3 vermelhas, 21/325/44
raios) e `parede` (colisor invisível na lane → 4 travamentos) provados ANTES de qualquer
conserto.

| Medida | Antes | Depois |
|---|---|---|
| malhas visíveis / waypoints vivos | 270 / 313 (em node o grafo tem 554 nós: GLB não carrega — LIÇÃO 3) | 274 / 313 |
| rotas de bandeira (8 pernas, 404 m) | 8/8, 0 travamentos, 0 contatos | idem |
| passeio (12 × 6 saltos) | 0 travamentos | idem |
| grade 1 m alcançável | 7.926 células | 7.926 |
| células com malha na faixa peito→olho | **31** (29 na soleira do espelho a z≈77; 2 na caixa SEDEX de cima) | **0** |
| células com malha na faixa do joelho (informação) | 1 (saia da tenda em −5,3/−26 — pegada de corpo pelo peito é decisão do dono, `PEGADA_CORPO`) | 1 |

Achados reais que a sonda entregou (não estavam em nenhuma régua):
- **Caixa SEDEX flutuando**: `[11, 3.6, 1]` era uma caixa de 1,6 m no AR ao lado da de baixo
  (só a aresta encostava) — `baseline/caixas-leste.png` mostra coluna e céu embaixo dela.
  Conserto: volume menor (1,3 m) em cima da de baixo, mesma rotação, centro a ≤ 15 cm.
- **Soleira do espelho no ombro**: mármore 0,92 m sobre granito 0,70 m = beiral de 11 cm a
  1,05 m sem colisor. Conserto: soleira 1 cm para dentro do granito (mesma solução do
  Codex no Escadão, "capeamento 2 cm para dentro").

### R2 · água do espelho

`tools/eval/praca-contract-check.mjs` PA1 (vermelha antes: "nenhum mesh aguaViva"). A lâmina
passou a ser `createWater` de `water.js` (o mesmo caminho do Córrego; `corrego-water-check`
continua verde), bacia com fundo de granito, escala de profundidade 0,6 m, onda quase parada,
sol/céu/névoa copiados do que o próprio mapa declara (sem entrada no `look.js`, que mudaria
céu e bloom). `world.update` novo avança o relógio da onda. Kill-switch `?agua=0`.
Mutantes `agua-velha` e `sol` vermelhos. Capturas: `baseline/espelho-dagua-norte.png` (faixa
azul-marinho quase preta) → `after/espelho-dagua-norte.png` (faixa clara, reflexo do céu);
`after/espelho-de-perto.png` (lâmina azul-clara com ondulação, fundo visível, espuma na
borda).

### Crítico adversarial nº 1 (contexto limpo, 06/09) — o que ele reprovou e o que mudou

Nota geral 4/10. Achados aceitos e consertados:
- **Copas de árvore** liam como mancha cinza (L* 41 contra anexo 42, ΔL* 1), com a aresta do
  plano cruzado de perfil, exatamente na mira do vão entre ministérios (C18). Tentei massa
  chapada de um tom só (MeshBasic + névoa): L* 54 contra 51 — a névoa deste mapa iguala tudo a
  60-90 m. **Árvores removidas**; ficam anexos + prismas (PA2 continua 93 %).
- **Água mais clara que o céu** em `espelho-de-perto` (L* 70 contra céu 61-65): cores-base
  mais escuras para a exposição ACES do jogo e fundo de granito → L* 58 (medido com
  `lstar.mjs` no PNG). Ele também apontou que em `espelho-dagua-norte` "nada mudou" — e tinha
  razão pelo motivo errado: naquela pose a água não é visível (o olho a 1,62 m não vê a lâmina
  a 0,55 m por cima do parapeito de 1,17 m); a faixa escura é o granito do parapeito oposto.
  Registro honesto: minha leitura inicial "água = faixa preta" também estava parcialmente
  errada — a água mesmo (visível só junto do parapeito) era azul-marinho, L* 25.
- **Decal "REINOS" solto no ar** depois de apoiar a caixa: era peça do layout assado velho
  colada na posição antiga da caixa. Regerar o layout (obrigatório: F2 do
  `graffiti-layout-check`) resolve — e expôs o item abaixo.
- **Capturas com bots/arma**: `b.pos.y = -80` não bastava (respawn); agora os bots morrem sem
  respawn e a `vmScene` inteira é escondida. Baseline recapturada com as edições em stash
  (`baseline-limpo/`), depois do "depois" no relógio, mas do código de `origin/main`.
- **Soleira sem prova visual**: a prova é a sonda (31 → 0 células), não o pixel; registrado.

### Regeneração do layout de grafite (efeito colateral obrigatório)

`gen-graffiti-layout.mjs praca_poderes` produz 296 peças; o layout assado de 17/08 tinha 366.
As 28 que sumiram ficavam na face interna do embasamento do Planalto/STF (1,45 m): a passada de
hoje só aceita parede ≥ 1,8 m (`MIN_ALT_PAREDE`, "caixa não é parede") — rodando a passada em
`origin/main` puro dá 294, ou seja, o layout commitado já não correspondia à passada. Para o
jogador do spawn norte não perder a parede pichada que hoje vê, as lambes/tags entram À MÃO
pelo `decal()` do próprio mapa (com `paredeAtras` contra a malha), 4,6 m de passo.
**Defeito do gerador (não consertado aqui, Codex já corrigiu na lane do Escadão):** ao rodar
só um mapa ele APAGA os outros cinco (o parse de "layout anterior" falha por ler até o último
`}` do arquivo, que é do `GRAFITE_FP`). Fiz a fusão à mão (só a entrada `praca_poderes` e o
hash dela mudam; 2.550 peças no total).

### Flakiness pré-existente do `cena-check` (não é desta frente)

Em 3 de 5 execuções o `cena-check` leu **0 calls / 0 tris** com 400-3.400 erros: tempestade de
`RangeError: exponentialRampToValueAtTime ... (0)` em `Sfx._env` (`public/js/audio.js:333`,
`peak = 0`), que aborta o frame no meio do loop. Reproduzido em `origin/main` puro (1 de 2
execuções). Candidato a `KNOWN-BUGS` da frente de áudio; a medição válida desta frente é a
que leu 308-314 calls.

### R3 · horizonte dos flancos

PA2 (vermelha antes: 4/468 raios = 1 %). Bloco "HORIZONTE" em `map_brasilia.js`: 14 anexos
(caixas brancas com faixas de janela), 10 prismas altos a ~130 m. Fora dos bounds, sem
colisor/occluder/sombra, 2 draw calls instanciados. Kill-switch `?horizonte=0`. Depois:
437/468 raios = **93 %**; mutante `horizonte` volta a 1 %. Capturas: `piloti-leste-corredor.png`
e `ministerio-empena.png` antes/depois. O arvoredo (duas versões) saiu depois da crítica — ver
acima.

### R1 · texel (reduzido ao que é visível e barato)

`eval:texel` está vermelha em TODOS os 13 mapas (dispMax de 3,6× a 639×); a Praça é das
melhores (disp95 1,49×). O 19× da Praça é o `MAT.guia` triplanar: a régua lê o `map` de
fallback por UV (declaração), não o `uTriScale` que o shader usa — limitação da régua, não
do mapa; registrado, não "consertado" para passar. O que era visível e barato entrou:
pistas do Eixo repeat 8×40 → 8×114 (34 → ~97 px/m ao longo da pista) e bandeira em canvas
5× (13,6 → 68 px/m). Área abaixo do piso 6 % → 1 %, p05 58 → 66.

### Custo de cena (navegador, GPU real, `cena-check`)

| | calls | tris | fps |
|---|---|---|---|
| antes | 314 / 350 | 650.995 / 740.000 | 127,6 |
| depois (final, sem arvoredo) | 314 / 350 | ≈ 650 k / 740.000 | 124-139 |

(o plano de água Standard virou shader + 2 instanciados + ~7 lambes; ruído de medição ±10 calls.)

## Commits

(ver `git log claude/praca-poderes-visual` — preenchido no checkpoint)

## Resultados aceitos / rejeitados

- ACEITO (por régua + captura): caixa apoiada; soleiras do espelho e do Planalto/STF
  recuadas; água viva no espelho (L* 25 → 58 de perto); anexos + prismas no horizonte dos
  flancos (PA2 1 % → 93 %); lambes da plataforma à mão; asfalto isotrópico; bandeira nítida.
- REJEITADO pelo crítico e retirado: arvoredo distante (cutout e massa chapada).
- REJEITADO (não feito, de propósito): mexer no piso escuro da lane (decisão C3/C4
  documentada); "consertar" o 19× da texel-check ajustando o `map` de fallback do triplanar
  (seria enganar a régua); povoar os flancos com cobertura (MAP5 isenta a Praça por decisão
  declarada: "o vazio é o assunto do mapa").

## Bloqueios e limitações

- `texel-check` mede materiais triplanar pela UV de fallback (guia 968–1.261 px/m, fundo da
  bacia 31,8 px/m) — número de declaração, não de uso. Cabe ao dono da régua decidir se ela
  lê `uTriScale`; não mexi em `tools/eval/texel-check.mjs` (instrumento compartilhado por
  13 mapas, LIÇÃO 2).

- Dossiê `references/mapas/world/` ausente na máquina (ver acima).
- `g.vm.root.visible = false` não esconde o viewmodel nas capturas (a AK aparece em todas);
  não afeta a comparação porque é idêntico em A e B, mas cobre ~15 % do quadrante inferior
  direito.
- Telemetria remota bloqueada por CORS no servidor local: 10 erros de console por partida,
  todos fora do mapa.

## Próximo passo

Sonda de runtime (R4) para fechar a baseline de corpo; depois R1 → R2 → R3, cada um com
régua vermelha antes.
