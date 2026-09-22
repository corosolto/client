<!-- Recibo da rodada de conserto de 13/09/2026. Índice: ../RODADA-CONSERTO.md -->

# fy_lajes — recibo

## Aplicado

| item da receita | arquivo:linha | o que entrou |
|---|---|---|
| 3.2 madeira texturada | `map_lajes_authored.js:127-128, 135-136` | `tex_madeira.webp` (512²) em `MAT.wood` (repeat 1,69×0,54 = convés 6,77×2,15 ÷ 4) e `MAT.woodDark` (1,2×0,10 = corrimão 4,8×0,38 ÷ 4) |
| 3.3 zinco no metal | `:129, 136` | `tex_zinco.webp` em `MAT.metal`, repeat 0,43×0,53 (portão 1,7×2,1 ÷ 4) |
| 3.4 porta/janela cega | `:140` | `MAT.charcoal` deixa de ser cor pura: `map: corrugated` + `color 0x2a2724`. Nenhum material NOVO nasceu sem `map` |
| 1.1-1.4 4 passarelas cobertas | `:762-785` (`addPassarela`) | por tábua de spawn: 2 muros 6,77×1,90×0,14 em lateral ±1,145 (topo 7,10) + telha de zinco 6,77×0,14×2,43 em y 7,10. **Colisor GIRADO** `{cx,cz,hx,hz,ry,cos,sin}` no padrão do corrimão `:740`; telha sem colisor (corpo não alcança 7,1 m), occluder sim |
| 1.5/1.6 platibanda central | `:786-792` | `addBox(3.8, 1.9, .14, wallMat(MAT.brick,3.8,1.9), 0, ROOF_H, ∓28.40)` — ±1,9 m do eixo exatos. Guarda de 0,44 m dos cantos e das bocas intacta (`:895`) |
| 1.7 20 muros de divisa | `:913-955` | 1,90 m × 0,18 sobre os 10 vãos internos das 8 lajes laterais, colisor girado, `ry` ±1…10°. O portão **não é constante**: é a pegada de cada tábua que cruza a linha, subtraída do vão (`plankSpanX`, `:920`) — a tábua interna devolve os 1,80 m em x=±10,3 e a WN-MN devolve a boca do mirante |
| 3.6 ORT1 FERRAGEM | `:1161-1165` | 44 ferros de espera 0,04×1,25×0,04 nas duas quinas internas de cada `ROOF_PART`, `ry = (5 + i·23 mod 80)°`, 1 `InstancedMesh` |
| 3.6 ORT1 TELHA | `:1166-1174` | 22 telhas 1,15×0,05×0,85 encostadas nas 20 divisas + nas 2 platibandas, 1 `InstancedMesh` |
| 3.6 ORT1 antenas novas | `:1175-1186` | 10 antenas em (∓12,3; −27/−13/0/12/24), **em batch** — 5 draw calls no total contra os 70 que 10 `addAntenna` soltos custariam |

Todas as peças novas nascem com `wallMat(MAT.brick…)`/`MAT.corrugated`/`MAT.metal`, isto é, com `map` (item 4.3 e a margem de 1,3 pp do SUP1).

## Medido (sonda própria em `/tmp/lajes_probe.mjs`, antes → depois)

A sonda reproduz o baseline oficial **byte a byte** antes de medir o depois: cel 8.646, occ 971, exp 1,0/1,0, visada 67,4/67,5, massas 1.010, h90 5,96, ORT1 23/15, SUP1 67/173, pares 7.526/100%/70,3 — todos idênticos a `/tmp/map_check_all.json` e à receita. `map-check.mjs` NÃO foi rodado.

| métrica | antes | depois | teto/piso |
|---|---|---|---|
| MAP1 corpo dentro de sólido | 0 (pior 0 m) | **0 (pior 0 m)** | 0 |
| MAP2 exposição E | 100,0% | **0,0%** | alvo 0 |
| MAP2 exposição B | 100,0% | **0,0%** | alvo 0 |
| MAP2 maior visada de spawn E/B | 67,4 / 67,5 m | **0,0 / 0,0 m** | — |
| MAP2 observadores que enxergam (soma dos 8 spawns) | todos | **0** (lista de vazamentos vazia) | — |
| MAP2B pior área contígua | 46,3 m² | **43,2 m²** | ≥40 |
| MAP2B pior folga até parede | 2,10 m | 2,10 m | ≥1,20 |
| células andáveis (grade 0,25 m, flood do spawn) | 8.646 | **8.408 (−2,75%)** | — |
| AT1: células com volta ao spawn (grade 0,50 m) | 6.759 / 100,0% | **6.701 / 100,0%, 0 bolsões** | 100% |
| pares de plateau ≥12 m com visada limpa | 7.526 / **100,0%** | 7.310 / **29,3%** | — |
| maior visada limpa de plateau | 70,3 m | **55,7 m** | — |
| visada limpa p90 / p50 por ponto | 100% / 100% | **49,6% / 34,3%** | — |
| occluders | 971 | 1.005 (+34: 12 passarela, 2 platibanda, 20 divisa) | — |
| colisores | 825 | 855 (+30) | — |
| malhas / draw calls | 1.857 | **1.898** | teto 2.038 (`fy_mansao`) |
| triângulos | 32.574 | 34.814 | — |
| materiais | 174 | 178 | — |
| SUP1 materiais chapados | 67/173 = **38,7%** | 63/177 = **35,6%** | ≤40 |
| SUP2 (contabilidade do `mapa-novo-gate`, que já pula o proxy) | 1.242 m² / 14.478 = **8,6%** | 167 m² / 15.059 = **1,1%** | ≤6 |
| ALT1 massas / h90 / massas ≥9 m | 1.010 / 5,96 / 57 | 1.116 / 6,45 / 57 | h90 ≥9 (**segue vermelho**) |
| ORT1 massas giradas / ângulos distintos | 23 = 2,3% / **15** | 123 = **11,0%** / **36** | ≥15% e >20 ângulos (**ângulos verde, fração vermelha**) |

Onde foram as 238 células: 121 na laje CN (spawn E), 86 na laje CS (spawn B), 31 nas lajes laterais/tábuas. **0 células ganhas, 0 regiões perdidas** (AT1 100%, LC2 1 componente cobrindo 100%). Decomposição medida: platibanda sozinha −59 e exposição só 25,5%/25,1% (ela NÃO resolve sozinha); passarelas −203; divisas −4.

### As 7 réguas (rodadas todas; nenhuma escreve artefato rastreado)

| régua | antes | depois |
|---|---|---|
| `eval:lajes-rooftop` | APROVADO (exit 0) | **APROVADO (exit 0)** |
| `eval:lajes-spatial` | OK, LS4 50 cortes p50 1,76 p90 2,16 | **OK, LS4 50 cortes p50 1,76 p90 2,16** (LS1-LS6 idênticos) |
| `eval:lajes-gap` | LAJES-TÁBUAS OK, 13/13 ancoradas | **OK, 13/13 ancoradas, deck 5,20** |
| `eval:lajes-circuito` | LC1-LC6 ✓ | **LC1-LC6 ✓**, LC2 1 componente / 100,0% de 12.826 |
| `eval:lajes-antitrap` | AT1 ✓ 100,0% | **AT1 ✓ 100,0%, 0 bolsões** |
| `eval:lajes-visual` | **não roda** | **não roda** |
| `eval:lajes-authored` | **não roda** | **não roda** |

`lajes-circuito` e `lajes-antitrap` saem com exit 1 **antes e depois**, pela mesma causa e só por ela: `overlay não gravado: Cannot find package 'sharp'`. Todas as cláusulas passam.
`lajes-visual` e `lajes-authored` abortam no import (`Cannot find package '@gltf-transform/core'`) **antes e depois** — nenhuma linha da régua chega a executar.

`node --check public/js/map_lajes_authored.js` verde depois de cada bloco e no estado final. Nada commitado. Nenhum arquivo além de `public/js/map_lajes_authored.js` tocado (`git status --porcelain` = ` M public/js/map_lajes_authored.js`).

### Verificação visual (mapview.html, servidor estático do FixCampoMorro em :8231, leitura apenas)

5 poses capturadas: POV do spawn E (platibanda + as duas passarelas fechando a linha, bocas invisíveis de frente), aproximação de z=−18 (a laje de spawn some por trás da parede), passarela vista da NW, divisa com portão na tábua interna, e aérea do mapa inteiro (as lajes deixaram de ser um plateau único). As telhas encostadas e as antenas novas leem como comunidade; a escala do tijolo é a mesma dos muros de perímetro e das escadas que já existiam (`wallMat` inalterado).

## Não aplicado (e por quê)

1. **`z` da platibanda: ∓28,40 e não os ∓28,56 da receita.** Com ∓28,56 a faixa morta do colisor (0,38 m) cai em cima da saída do funil das passarelas e o pescoço de passagem vira **0,40 m**: a AT1 reprovou com **5.475 células em 1 bolsão** (medido, exit 1 por FALHA e não por `sharp`). Com a platibanda sobre a fáscia, fora da laje, AT1 volta a 100,0% e a exposição continua 0,0%/0,0%. As outras três variáveis (largura ±1,9, altura 1,90, guarda de 0,44 m) ficaram como a receita mediu.
2. **Passarela com o comprimento cheio de 6,77 m.** Encurtar 0,8 m devolve 61 células (8.408 → 8.469) mantendo exposição 0, mas o vazamento volta a 1,4 m de corte (E 0,33%, visada 57,3 m): a margem some. Preferi a régua da receita à célula.
3. **`CAIXOTE` (24 engradados no beco) — fora.** Custo medido por aritmética sobre a faixa morta: ~124 células no corredor mais apertado do mapa e até 24 cortes da LS4 caindo de 1,76 para ~1,34 m, e mesmo assim o ORT1 não vira (precisa das torres e dos postes que estão fora desta rodada). Vale a pena quando 2.1/2.3/2.4 entrarem juntos.
4. **`TELHA` tombada 65°, não 55°.** A 55° a chapa avança 0,49 m da face do muro, sai da faixa morta de 0,38 m e passa a exigir colisor: ~220 células. A 65° ela cabe inteira dentro da faixa que o muro já nega ao corpo — `collide:false` deixa de ser mentira. `ry` limitado a 4…10° pelo mesmo motivo (acima de 10° a ponta sai da faixa).
5. **2.1/2.2 (8 torres de ferro + 16 bases), 2.3/2.4 (12 postes + 33 vãos de fiação) e a costura da escada** — excluídos pelo enunciado. É por isso que **ALT1 (h90 6,45, teto 9,0) e a fração do ORT1 (11,0%, teto 15%) seguem vermelhos**: o pacote que a receita dimensiona para eles (+16 giradas das bases, +45 dos postes/fiação, +40 massas ≥9 m) está fora. A metade dos ângulos do ORT1 já ficou verde: 15 → **36** distintos.
6. **`map_lajes.js` e a cláusula `semCasca`** — não toquei, é decisão do dono.
7. **Passo 1 da receita (`texel-check.mjs` pular `proxyGLB`)** — é régua, não mapa; não é minha.

## Pedido ao Main (arquivo compartilhado)

Nenhum patch em arquivo compartilhado. Duas observações de ambiente, que valem para todo mundo nesta rodada:
- `npm ls @gltf-transform/core sharp` está faltando: **`eval:lajes-visual` e `eval:lajes-authored` não executam uma linha sequer** (abortam no import) e `lajes-circuito`/`lajes-antitrap` saem com exit 1 mesmo com todas as cláusulas verdes. Isso é anterior à minha edição e vale para o quality gate inteiro — quem ler só o exit code vai achar que o fy_lajes tem 4 réguas vermelhas.
- O `tools/eval/map-check.mjs` mudou de 874 para 1.136 linhas durante a rodada (outro builder). Não rodei nem editei; as linhas que cito da régua são do arquivo como estava quando li.

## O que exige figura

1. **A trincheira de spawn.** O número fecha (0,0%/0,0%, MAP2B 43,2 m²), e a captura mostra que a laje de spawn virou pátio fechado por platibanda de 1,90 m com duas passarelas cobertas. O que eu não sei julgar sozinho é se isso mata a leitura de sacada que `:894-895` protegia de propósito — a decisão original era "nasci numa laje aberta", e agora é "nasci atrás de um muro". As setas de rota (`:1119-1122`) e os marcadores de ala continuam visíveis de dentro; a sensação, não.
2. **A passarela lê como passarela ou como túnel?** Muro cheio dos dois lados + telha de uma água. Tábua vazada mudaria a occlusão e eu teria que re-medir a exposição inteira.
3. **Os 20 muros de divisa flutuam sobre o poço de luz** entre as partes de laje (o `wallWithRelief` de baixo para em 4,35-4,95 m e o muro novo começa em 5,20). Fechar essa fresta de 0,25-0,85 m custa massa nova sem juntar com nada — as três paredes não são coplanares. Da laje não se vê; de baixo, talvez.
4. **44 ferragens + 22 telhas** são cenário ou lixo visual na silhueta? É a pergunta que a própria receita deixou aberta e continua aberta.
5. **A escala do tijolo.** O `wallMat` dá ~1,7-1,9 m por repetição da textura, então o tijolo baiano lê com uns 50 cm de fiada em toda parede do mapa. As peças novas seguem exatamente a convenção existente (perímetro, poço da escada, guardas), então não é regressão minha — mas se o dono quiser tijolo em escala real, é uma linha em `wallMat` que restila o mapa inteiro e mexe no texel de todas as paredes.
