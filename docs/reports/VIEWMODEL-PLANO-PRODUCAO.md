# Plano de produção dos viewmodels — inventário medido e ordem de trabalho

**Data:** 11/09/2026
**Estado:** proposto, aguardando decisão do dono
**Base:** `claude/vm-unificado` · servidor de teste `localhost:4361`

Este documento existe porque a frente de viewmodel já foi refeita três vezes por
falta de um inventário do que existe. Tudo abaixo é medido, com o comando que
reproduz. Nada aqui é estimativa.

---

## 1 · O que temos hoje, no jogo

| caminho | armas | fonte do braço | estado |
|---|---|---|---|
| **golden** (`coro/<arma>-hires.glb`) | 13 | `Requests_Studio_Hands` (doador `ak-12animated`) | escala convergida, erro 0,0% |
| **família** (`private-assets/<fam>/`) | 7 | `Hand-Tool1` (KINEMATION) | serve, mas é a fonte que a casa descartou |
| sem viewmodel autorado | 0 | — | — |

As 13 no golden: `ak` `m4` `md97` `scar` `famas` `m92` `sks` `svd` `mosin` `lmg`
`mp5` `uzi` `p90`.

As 7 na família: `awp` `shotgun` `carbine` `g3` `pistol` `deagle` `revolver38`.

> `GOLDEN-AK-DECISION.md` (31/08, aprovada por crítico adversarial) descartou o
> KINEMATION como fonte canônica. O dono confirmou em 11/09 que a mão da AK é a
> certa. O destino das 7 é o golden.

**Dívidas medidas, todas com régua no ar:**

- `eval:vm-consistencia` — **2/24**: só `ak` e `akm` declaram `parts.mag`. Nas
  outras a animação puxa o osso e a geometria não segue: a mão puxa o nada.
- Enquadramento: o builder aplica em todas os deslocamentos de câmera da AK.
- `BUG-VM-ESCALA-PISTOLA` — o piloto da pistola entra 144× maior; ela segue na família.

---

## 2 · O acervo, inventariado

`/Volumes/Zenith/Archives/downloads/Downloads` — 8,9 GB, 917 itens.

### 2.1 · KINEMATION Ultimate (`fpsanimationpack_ultimate.unitypackage`, 516 MB)

**É uma versão MAIOR do pack já em uso:** 23 famílias contra as 18 extraídas.

Novas: **`ASVal`** · **`Drake-12`** · **`Kolibri`** · **`M1911`** · **`RPG`**

`Drake-12` é shotgun e `M1911` é pistola — duas das que o builder recusa hoje.

```sh
tar xzf fpsanimationpack_ultimate.unitypackage -C <dir>
for f in $(find <dir> -name pathname); do cat "$f"; echo; done | sort -u
```

### 2.2 · CS 1.6 fonte (`cs16_widescreen_src.zip`, 9,5 MB)

**771 arquivos: 400 `.smd`, 39 `.qc`, 255 `.bmp`.** É o código-fonte dos
viewmodels originais — 30 armas, cada uma com `draw.smd`, `idle1.smd`,
`reload.smd`, `lhand.smd` e o template da malha.

`v_ak47 v_aug v_awp v_deagle v_elite v_famas v_fiveseven v_g3sg1 v_galil
v_glock18 v_knife v_m249 v_m3 v_m4a1 v_mac10 v_mp5 v_p228 v_p90 v_scout v_sg550
v_sg552 v_tmp v_ump45 v_usp v_xm1014` (+ granadas, C4, escudo)

É o gabarito de **cadência**, que o repo já consome por
`tools/viewmodels/cs16-timings.json` e `extract_cs16_timings.py`. O `cs16` de
cada família no `vmconfig.js` sai daqui.

### 2.3 · ARMS.rar (81 MB)

`ARMS.blend` + texturas `Ch08_1001/1002` (Diffuse, Glossiness, Normal) —
nomenclatura Mixamo. É um rig de braços em Blender, ainda não avaliado contra o
`Requests_Studio_Hands` do doador aprovado.

### 2.4 · Doadores GLB com rig — 45 de 69

Os que têm **duas malhas de mão**, que é a estrutura do golden:

| doador | clipes | ossos | MB |
|---|---:|---:|---:|
| **`ak-12animated`** (o do golden) | 4 | 77 | 13,6 |
| `m4a1_animated_low_poly` | 4 | 80 | 1,1 |
| `animated_shotgun` | 7 | 89 | 11,1 |
| `lmg_animated` | 1 | 50 | 10,1 |
| `fps_animated_carbine` | 1 (3 mãos) | 50 | 7,6 |
| `m16_a2_assault_rifle_-_animated` | 1 (3 mãos) | 60 | 8,0 |

Os de mais clipes, sem par de mãos: `uzi__first_person_animations_2026_remake`
(**13 clipes**, 1072 ossos), `desert_eagle__first_person_animations` (9, 1068),
`pistol_animated` (7), `ak74u__free_animation` (7),
`fps_animations_sniper_rifle` (6), `m4a1-s_cs2__first_person_animations` (5).

---

## 3 · Onde o método atual trava

`build_ak_hires_pilot.py` recusa 4 armas:

```
carbine   stock mask too small: 0 verts / 0 shells
shotgun   stock mask too small: 0 verts / 0 shells
awp       stock mask too small: 32 verts / 1 shells
g3        stock mask too small: 167 verts / 31 shells
```

Ele alinha a arma pela **coronha**, apagando as cascas atrás de `x < -0.240`. A
guarda existe para nunca bissectar uma casca — o comentário dela diz que isso
"abre o receptor e desconecta a empunhadura". Afrouxá-la é fraude de placar.

**Diagnóstico:** o alinhamento por coronha é uma suposição sobre a silhueta da
AK. Bullpup (`tavor`), carabina curta, shotgun de bomba e sniper de ferrolho não
a satisfazem por construção.

---

## 4 · Ordem de trabalho proposta

Em ordem de **impacto ÷ custo**, com a régua de cada passo.

### Onda A — extrair o pack Ultimate (custo baixo, destrava 5 famílias)

Extrair as 5 novas e reconstruir `shotgun` com `Drake-12` e `pistol`/`deagle`
com `M1911`. É o caminho já automatizado (`bake_family.mjs`), e resolve duas das
quatro recusas sem tocar no builder.

**Pronto é:** `eval:vm-serving` verde com as famílias novas.

### Onda B — as 22 caixas de pente (a queixa nº 1 do dono)

Derivação já validada: o perfil de profundidade por fatia recupera a caixa
aprovada da AK (saliência em `x ∈ [0,020 · 0,060]`, `y` até −0,147). Aplicar arma
a arma e conferir a fração de vértices contra a referência (ak 1,87%, akm 0,91%).

**Pronto é:** `eval:vm-consistencia` de 2/24 para 24/24, com os mutantes ainda
mordendo.

### Onda C — enquadramento por arma

O builder aplica `cameraLateralShift` e `cameraVerticalShift` da AK em todas.
Calibrar por arma com `vm-frame-calibra.mjs`, alvo = a AK em 8,49 px/cm.

**Pronto é:** dispersão de px/cm abaixo de ±10% entre as 20 armas do arsenal.

### Onda D — alinhamento sem coronha (destrava `carbine`, `g3`, `awp`)

Trocar o alinhamento por coronha por alinhamento pelo **eixo do cano + ponto de
empunhadura**, que toda arma tem. É a mudança estrutural do builder, e a única que
exige medir contra as 13 já convergidas para provar que não as regride.

**Pronto é:** as 13 saem byte a byte iguais às atuais, e as 3 novas passam.

### Onda E — revisão humana, arma a arma

Nada acima substitui isto. A AK só virou golden depois que o dono jogou.

---

## 5 · O que este plano NÃO propõe, e por quê

- **Não propõe usar o `ARMS.blend`** antes de compará-lo ao
  `Requests_Studio_Hands`. Trocar a mão que o dono aprovou exige medição e
  aprovação, não conveniência.
- **Não propõe reautorar animação à mão.** O pack e o CS 1.6 já trazem
  `draw/idle/reload` por arma; o gargalo nunca foi animação.
- **Não propõe afrouxar a guarda da coronha.**
- **Não propõe publicar sem hash.** Em 11/09 a AK aprovada foi sobrescrita porque
  a verificação comparava **tamanho** e não **sha256** — dois arquivos diferentes
  tinham os mesmos 3.414.520 bytes. Toda publicação daqui em diante compara hash.
