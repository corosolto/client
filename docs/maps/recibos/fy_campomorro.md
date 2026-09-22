<!-- Recibo da rodada de conserto de 13/09/2026. Índice: ../RODADA-CONSERTO.md -->

# fy_campomorro — recibo

## Aplicado
| item da receita | arquivo:linha | o que entrou |
|---|---|---|
| §3.1–3.9 materiais | `map_campomorro.js:103-121` | os 17 materiais do mapa nascem COM `map` (T.metal/T.concrete/T.concreteDark/T.crate/T.awning). Cor recalculada = cor antiga ÷ média da textura em linear — sem isso `map` escuro × cor média deixou poste/zinco/pórtico PRETOS (visto na captura da boca oeste, corrigido e recapturado) |
| §3.9 cal | `:264-266` | `map: T.concrete`, `vao:false` (arte autorada não leva banda de AO) |
| §3.9 marcos | `:443-447` | 3 marcos viram placa de comércio: T.billboard / T.signPastel / T.signBoteco; `userData.fieldLandmark` intacto (cláusula 3 marcos continua 3/3) |
| §3.9 matTufo | `:630-633` | `map` = clone de T.grass com repeat 0,22 (T.grass vem com repeat 30, feito para chão de 150 m) |
| §3.10 UV em metros | `:163-190` | `addBox` passa a usar `aoBoxGeo(w,h,d)` + `aoMat(mat)` (padrão de `map_corrego.js:197-212`, conserto que `textures.js:347` nomeia para ESTE mapa). `vao:false` é a saída para arte autorada |
| §3.10 (extra medido) | `:212-213`, `:509-510` | telha de fachada (11×32 m² a 55 px/m) e as duas águas do galpão (2×158 m² a **24,9 px/m — as duas piores superfícies do mapa**) também entram na UV em metros |
| `external()` × clone de AO | `:125-140` | `aoMat` CLONA o material, então a textura de rede chegava só no original. `external` passa a upgradar o par; `repeat` cai para 1 em wall/concrete/roof porque ali a UV já está em metros |
| §1.1 lona de patrocínio | `:343-376` | 10 painéis de 2,15 m nos MESMOS vãos que a tela declara em `:294-302`, occluder PURO (`collide:false`, sem colisor). `StaticBatch` → **1 draw call**; tom por painel gravado no atributo `color` (5 tons) |
| §1.2 rasgo do alambrado | `:371-373` | vão x[−12,1..−9,9] em z=−13,8 fica sem painel (alambrado arrombado da ficha) |
| §1.3 basculante | `:482-486` | a parede oeste-sul vira peitoril 0,35×1,10×3,70 (y 1,00–2,10) + verga 0,35×1,40×3,70 (y 2,80–4,20); vão de 0,70 m. Corpo continua barrado |
| §1.3 (correção não prevista) | `:519-522` | a torre de som sul cobria 3,45 m dos 3,7 m do vão novo — passou a 1,70 m de profundidade em z=−16,9. Sem isso o basculante media aberto e via um paredão de som |
| §1.5 q0,3 | `:399-402` | churrasqueira (−28,3; 18,6) · stall (−29,5; 21,8) · moto_cg (−31,8; 22,5) · pilha_pneus (−20,5; 25,5) |
| §1.6 q1,3 | `:404-411` | mesa_guardasol (−8,5; 23) · fusca (−3,5; 24,2) · trave velha de 3 caixas em (−17; 21,2) — `trave_futebol` NÃO existe no acervo |
| §1.7 faixa de serviço | `:413-423` | 8 props em z=±14,9/15,0 (pneus, dumpster, moto, botijão, kombi, cooler) |
| §1.8 veículos do anel | `:424-430` | ônibus (−14; −28,6) · kombi (6; 27,6) · fusca (−34,5; −3,5) · vw_9150 (22; 28,6), todos ENCOSTADOS NA GUIA |
| §2.1 postes de luz | `:437-441` | 4 mastros 0,34×10,60×0,34 + luminária, com `ry` 0,18/−0,18/−0,22/0,22 |
| §4.5 fumaça | `:863-882`, `:887` | `GPUParticles` ambiente `'fumaca'`, 1 partícula/0,6 s sobre a churrasqueira; entra no `update(dt)` |
| §4.6 caixa de som | `:431-432` | `caixa_som_baile` em (25,6; −15,1) fora do galpão, virada para o campo |
| §4.7 varal de bandeirinha | `:760-794` | 2 cordas com catenária + bandeirinhas em `InstBatch`, MESMO material de vento que a RC4 mede |
| §4.8 placa do mototáxi | `:433-435` | plano 0,62×0,40 com `T.signBoteco` |
| `ry` em `addBox` | `:174`, `:179-184` | rotação com AABB ENVOLVENTE da caixa girada (nunca menor que a massa) |
| props no preload | `:45-53` | +8 ids em `CAMPOMORRO_PROPS` (todos com GLB no acervo, conferido) |

## Medido (sonda própria em /tmp, antes → depois)
Instrumento: cópia byte a byte de `map-check.mjs` em `/tmp/campo/mc.mjs` (só o caminho do `harness` mudou, artefato vai para /tmp), réplica de `medirMundo()` do `mapa-novo-gate` em `/tmp/campo/gate.mjs`, `texel-check --json-out=/tmp`, e `/tmp/campo/expo.mjs` (réplica do bloco MAP2 com filtro de occluder por nome, para isolar cada peça). Baseline conferido idêntico ao `/tmp/map_check_all.json` e à receita antes da 1ª edição.

| métrica | antes | depois | teto/piso |
|---|---|---|---|
| MAP2 exposição E | 64,13% | **41,53%** | — |
| MAP2 exposição B | 14,97% | **15,44%** | — |
| razão E/B | 4,28× | **2,69×** | — |
| maior visada ao spawn E | 44,1 m | 44,1 m | (lane NE, geometria declarada) |
| observadores que veem E(−4,−3) | 242/377 | **139/352** | — |
| setores L / SE / SO | 72 / 57 / 35 | **27 / 22 / 20** | (receita previa 28 / 25) |
| lona SOZINHA (occluder removido por nome) | E 64,26% | **E 43,68%** | receita: 43,6% ✓ |
| basculante SOZINHO (sem a lona) | B 14,97% | **B 22,09%** | receita: 22,1% ✓ |
| MAP1 corpo dentro de sólido | 0 | **0** | =0 |
| pior penetração | 0 | 0 | ≤0,30 |
| MAP5 pior espaçamento | 6,67 m | **6,33 m** | ≤7 m (receita: 6,29) |
| MAP5 q0,3 / q1,3 | 6,67 / 6,46 | **3,93 / 3,91** | — |
| MAP5 pior razão prop / wp | 0,88 / 0,66 | 0,69 / 0,69 | — |
| MAP2B folga / área | 1,85 m / 48 m² | **1,85 m / 48 m²** | ≥1,5 / ≥40 (spawns intocados) |
| CTF1 altura do triângulo | 11,94 m | **11,94 m** | >4,5 (bandeiras intocadas) |
| MAP6 bordas sem guarda | 0 | **0** | =0 |
| occluders medidos / sem malha | 118 / 0 | **126 / 0** | `fracSemMalha` 0,0048 preservada |
| becos cegos | 0 | **0** | =0 |
| SUP1 materiais sem `map` | 71,7% (33/46) | **30,8% (16/52)** | ≤40% — os 16 restantes são os bichos do `createFavelaAmbience`, que não moram neste arquivo |
| SUP1 área chapada | 2849,3 m² | **5,8 m²** | — |
| SUP2 área sem textura | 13,24% | **0,03%** | ≤6% (receita: ~0,02%) |
| TEXEL mediana | 131,1 px/m | **128,0 px/m** | alvo 128 |
| TEXEL p05 | 47,3 px/m | **128,0 px/m** | ≥64 |
| TEXEL área abaixo do piso | 12,58% | **0,01%** | ≤10% |
| TEXEL dispersão p95 | 1,35× | **1,08×** | ≤1,5× |
| ALT1 h90 | 8,71 m (431 massas, 41 topos ≥9) | **9,24 m (462 massas, 49 ≥9)** | ≥9,0 — passa sem o casario em cota |
| ORT1 | 16,2% girada / 38 ângulos | **17,3% / 38** | ≥15% / ≥20 |
| malhas visíveis / nós desenháveis em root | 586 / 589 | **621 / 625** | +36 (10 lonas = 1, bandeirinhas = 1 InstBatch) |
| colliders / waypoints | 99 / 598 | **125 / 586** | — |

Réguas rodadas (nenhuma escreve artefato rastreado): `npm run eval:campo-contract` **APROVADO**, `softparticles-check` ok, `wind-check` ok, `menu-map-props-check` PASSA nas 3 cláusulas, `node --check` verde.

### eval:campo-contract — as 13 cláusulas
```
┌─ CAMPO-CONTRACT — centro aberto × galpão protegido
├─ E no campo: 4/4
├─ B no galpão: 4/4
├─ pior rota B→campo: 9.90 s / 25 s
├─ becos cegos: 0
├─ bocas com visada: 5/5
├─ abertura visual da captura oeste: 92% / 80%
├─ cover do centro: 2.91 s / 3 s
├─ galpão: hemi 1.16 · 3/2 luzes · 2/2 faixas
├─ acabamento: 2/2 superfícies · 4/4 batentes · 2/2 redes · 3/3 marcos
└─ APROVADO
```

### Verificação visual (mapview.html + Chromium, servidor estático em /tmp, capturas em /tmp/campo/)
- `shot_boca_oeste2.png` — a boca oeste NÃO virou túnel: campo, traves, lona e casario legíveis (responde à dúvida nº1 da §6 da receita: 2,15 m não fecha a leitura).
- `shot_overview2.png` / `shot_final_overview.png` — anel de lona fechado com tons variados, 4 postes contra o céu, ônibus/kombi/cooler/mesa nos lugares.
- `shot_galpao_interior.png` — o basculante aparece como fresta iluminada ao lado da torre de som.
- `shot_poste_lona.png` — bandeirinhas de festa junina no varal, lona, pneus, poste.
- `shot_bar_nw.png` — churrasqueira de tijolo, barraca com toldo, dois mototáxis: o "bar de esquina" lê.
- **Achado que só a figura pegou:** a 1ª captura mostrou poste, zinco e pórtico PRETOS — `map` escuro × cor média. Corrigido com a compensação de cor em linear e recapturado.
- **Basculante medido por raycast** (`/tmp/campo/basc.mjs`, varredura a cada 0,3 m): vão aberto em z[−19,7..−17,8] (1,9 m dos 3,7 m) e fechado pela torre de som no resto. É literalmente a "visão picada" da ficha; o decal mais alto do `grafitar` para em y=2,25, abaixo do olho do jogador no galpão (2,62).

## Não aplicado (e por quê)
- **§1.4 / §2.2–2.5 (casario em cota, torre da caixa d'água, laje +4,60 m, escadinha, parapeito, `stairs`/`levels`)** — fora do escopo desta rodada por instrução: é cota andável / `groundHeightAt` multinível. Consequência medida: E parou em 41,53% em vez dos 34,2% da receita, e ALT1 em 9,24 m em vez de 9,60 m (ainda assim acima do piso de 9,0).
- **§1.9 chicanes e a lane NE de 44 m** — a receita já mediu que custam 6 becos cegos e não movem a visada. Não tentei.
- **§1.10 banco de reservas** — intocado (margem de 0,39 m do cover de 2,91 s).
- **`trave_futebol`** — não existe no acervo (`public/models/props/`); a trave velha de §1.6 saiu em 3 caixas, mesmo fallback das traves do campo em `:253-262`.
- **`MAT.door` com `T.crate2`** (recipe §3.5) — trocado por `T.metal` com cor de chapa enferrujada: `crate2` imprime "CORREIOS" com fita amarela em 49 portas. O número de SUP1/SUP2 é o mesmo (o que conta é ter `map`).
- **Coordenadas de §1.5–1.8 deslocadas** — as da receita colidiam com geometria existente ou com corredor de waypoint: barraca (−25,5; 20,6) entrava na casa `CASAS[2]`; churrasqueira (−29,5; 18,6) entrava na casa `CASAS[1]`; trave (−13,5; 19,8) entrava na arquibancada de `:322`; kombi/moto com 4 m de profundidade em z=±14,4 atravessavam o poste do alambrado em z=±13,8; fusca (−34,3; −6) entrava na casa `CASAS[10]`; kombi (6; 26,2) entrava na casa `CASAS[4]`. Os deslocamentos mantiveram o quadrante e o efeito de MAP5 (6,33 m contra os 6,29 previstos), e becos cegos continuam 0.
- **Spawns, bandeiras e pickups** — nenhum tocado (12 pickups, nenhum movido nem coberto).
- **`node tools/eval/map-check.mjs`** — não rodado, como manda o contexto compartilhado.

## Pedido ao Main (arquivo compartilhado)
`tools/eval/mapa-novo-gate.mjs` — três dívidas de fy_campomorro passaram a verde e o próprio portão manda remover a entrada ("QUITADAS — REMOVA a entrada de DIVIDA"). É AVISO, não reprova, então dá para adiar:
- linha 175 `'ORT1:fy_campomorro': '0,0% de massa girada e 1 ângulo distinto — grade perfeita'` → medido **17,3% girada / 38 ângulos** (a entrada já estava obsoleta: o baseline de hoje media 16,2%/38).
- linha 194 `'SUP1:fy_campomorro': '50,0% dos materiais sem \`map\`'` → medido **30,8%** (teto 40%).
- linha 203 `'SUP2:fy_campomorro': '12,8% da área sem textura'` → medido **0,03%** (teto 6%).

Nenhum outro arquivo compartilhado precisou de patch: `CAMPOMORRO_PROPS` é exportado do próprio `map_campomorro.js` e `maps.js` já o consome.

## O que exige figura
1. **Cor da lona.** Ficou com `T.awning` (listrado vermelho/creme) e 5 tons por painel. Na captura lê como lona de patrocínio de várzea, mas a receita (§6.6) levanta sombrite preto como mais fiel. Escurece o anel inteiro — decisão de arte.
2. **Torre de som sul reduzida de 3,45 m para 1,70 m.** Foi a única forma de o basculante ser real; as duas torres agora são desiguais. Lê como "paredão remendado" na captura, mas é mudança num elemento autorado.
3. **Zinco e chapa ~1,7× mais escuros que antes.** A compensação de cor bate no branco: com `T.metal` (média sRGB 92) não dá para recuperar o albedo chapado de 0x777a76. Nas capturas lê como zinco de verdade; se o dono quiser mais claro, é textura de metal mais clara no `textures.js` (arquivo compartilhado), não cor no mapa.
4. **Assimetria em 2,69× (era 4,28×).** Sem o casario em cota da §1.4 não chega aos 2,22× da receita. Paridade (~1,0×) continua exigindo mexer no spawn E — decisão do dono, não da régua.
5. **`MAT.glass` com `map: T.metal`** — a dúvida nº5 da receita continua de pé; na captura o vidro do pórtico leste lê como vidro sujo, aceitável, mas é julgamento de arte.
6. **Laje do galpão e telha de fachada perderam ~18% de brilho** ao entrar na banda de AO de caixa flutuante (o mesmo tratamento que todo box do mapa recebe). Foi o preço de tirar 158 m² de telhado de 24,9 px/m.
