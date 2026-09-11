# Viewmodels — o documento único

**Atualizado:** 11/09/2026 · **Base:** `claude/vm-unificado`

Este arquivo substitui **19 documentos** que somavam 4.448 linhas em
`docs/reports/`. Nenhum deles cobria julho, e todos foram escritos de 31/08 em
diante — cada trilha nova documentando a si mesma sem o inventário da anterior.
O problema nunca foi falta de documento: foi espalhamento.

Três camadas, e elas têm públicos diferentes:

- **A — Briefing.** O que ler antes de tocar em viewmodel. Se você só tem cinco
  minutos, leia a A.
- **B — Memória.** Como chegamos aqui, de julho até hoje.
- **C — Referência.** O maquinário: fontes, ferramentas, formatos, tetos.

> **Regra deste arquivo:** número derivável do código **não se escreve aqui**.
> Aponta-se `arquivo:linha` ou o comando que o gera. Um `SKILL.md` desta casa
> afirmou por semanas que o `game.js` tinha 3.234 linhas enquanto ele dobrava de
> tamanho. Número de **evento** (medido tal dia, por tal comando) pode ficar —
> com a data e o comando.

---

# CAMADA A — BRIEFING

## A.1 · As quatro trilhas, e por que três caíram

O jogo já tentou quatro maneiras de pôr uma arma na sua mão. **Antes de propor a
quinta, leia por que cada uma caiu.**

| trilha | liga com | o que prometia | veredito |
|---|---|---|---|
| **Legado procedural** | padrão | mãos de cápsula calibradas na arma-caixa | vive só como fallback; a mão cai torta na arma Mint |
| **GoldSrc** (trilha B) | `?vmfonte=goldsrc`, `?cs16=1` | molde CC0 do CS 1.6 + arma Mint | **mecânica e enquadramento OK, braço de baixa resolução** — permanece como controle |
| **Retarget** | `?vmfonte=retarget`, `?rt=1` | pose GoldSrc assada no rig moderno | **reprovada no gate visual** (M4, 27/08): o bake transfere pose incompatível e diverge no runtime |
| **KINEMATION assado** | `ready:true` por família | pack pago, 23 famílias, idle+recargas | **descartada como fonte canônica** (31/08): divide os quatro estados entre GLB de família, motions compartilhadas e recoil procedural |
| **Piloto hires** ← **vigente** | `golden:true` por arma | doador CC0 dá mãos+rig+ações; nossa arma é encaixada | **aprovada pelo dono** na AK (07/09) |

O parâmetro de cada trilha está em `public/js/authoredvm.js:24-35`.

> **A KINEMATION não é lixo — é controle.** Ela serve 7 armas hoje e foi o que
> permitiu o dono testar 26 armas e achar os defeitos de 11/09. O que ela não é:
> a fonte canônica.

## A.2 · O princípio que governa a produção

> **A mão vem de UMA fonte — a aprovada. A animação vem do melhor doador de cada
> classe, por retargeting.**

Porque o defeito que o dono relatou em 11/09 foi *"escala diferente das
mãos/braços"*, e a causa não era escala: eram **malhas diferentes**.

| fonte de braço | verts | ossos | materiais |
|---|---:|---:|---|
| **`Requests_Studio_Hands`** (aprovada) | 24.818 | 77 | `CoroSolto_FP_Gloves` + `CoroSolto_*_Sleeves` |
| `free_fps_arms_gameready_-_rigged` | 8.112 | 52 | `FPS_Arm`, `FPS_Hand` |
| `fps_arms_gloved` | 5.126 | 47 | `sleeves`, `gloves` |
| `ARMS.blend` | 4.555 | 43 | corpo Mixamo, não braço FP |

E há um motivo que não é qualidade: a **skin de mão por time** casa por **nome de
material** em `applyTeamHandMaterial` (`public/js/authoredvm.js:271`). Trocar a
fonte de mão quebra a skin por time até alguém renomear os materiais da fonte nova.

## A.3 · As armadilhas medidas — não repita

| armadilha | o que acontece | quando custou |
|---|---|---|
| **Comparar tamanho de arquivo em vez de sha256** | dois GLB com os mesmos 3.414.520 bytes e hashes diferentes; a AK aprovada foi sobrescrita | 11/09 |
| **`golden:true` sem calibrar escala** | o piloto entra **144×** maior (arma 3.743 cm, mão 7.125 cm) | 11/09, `BUG-VM-ESCALA-PISTOLA` |
| **Afrouxar a guarda da coronha** | bissecta casca, abre o receptor e desconecta a empunhadura | guarda em `build_ak_hires_pilot.py` |
| **Validar enquadramento só em 16:9** | o dono joga em **3:2** | custou uma rodada inteira |
| **Girar a arma para "expor identidade"** | "mira num lugar, a arma aponta pro outro"; yaw ≤ 0,09 | veredito do dono |
| **Preload de todas as viewmodels** | crash "Aw Snap" (OOM); hoje é lazy-load | não desfazer |
| **`reskin-glb.mjs` duas vezes** | **não é idempotente** — repintar com os mesmos parâmetros piorou o `padati` em 12% | — |
| **Duas capturas headless em paralelo** | derruba o boot e falsifica a medição | — |
| **Turno morto deixa mutante na árvore** | `eval:docsautoria` injeta linha intrusa e restaura; morto no meio, ela fica | 11/09 |

## A.4 · As réguas que existem

| régua | mede | mutante |
|---|---|---|
| `eval:vm-consistencia` | `parts.mag` onde a família anima osso de peça | `semparts`, `caixavazia`, `caixatudo` |
| `eval:vm-serving` | todo GLB declarado responde 200 no servidor real | sim |
| `eval:vm-attach` / `-legado` | encaixe mão↔arma nos dois caminhos | sim |
| `eval:vm-catalog` | o catálogo pago bate com o disco | — |
| `eval:vm-identity`, `eval:vm-ads` | identidade por arma e centro da alça no ADS | — |
| `eval:melee-vm` | faca: movimento, contato, continuidade de mão, atlas, enquadramento | — |
| `vm-arsenal-frames.mjs` + `vm-arsenal-check.mjs` | captura no jogo real e reprova arma que não desenha, mão fora do quadro, mão que não encosta | `semarma`, `semmao`, `semcontato`, `escala`, `tamanho` |

## A.5 · Estado em 11/09/2026

| | |
|---|---|
| armas no arsenal jogável | **20** (`public/js/weapons.js`) |
| servidas pelo piloto hires (`golden`) | **13** |
| servidas pela família KINEMATION | 7 |
| escala, erro médio | **0,0%** nas 13 |
| `eval:vm-consistencia` | **2/24** — as caixas de pente são a dívida nº 1 |
| recusadas pelo builder | `carbine` `g3` `awp` `shotgun` |
| declaradas no `vmconfig` e ausentes de `weapons.js` | `tavor` `g3sg1` `m400` `akm` ← resíduo do enxugamento de 31/08 |

---

# CAMADA B — MEMÓRIA

564 commits de arma/viewmodel entre 17/07 e 11/09/2026.

## B.1 · O arsenal nasce — 17 a 21/07

O jogo começou com **armas de caixa**. Em 17/07 entra o primeiro mapa com armas
no chão (`d2aa95fb1`) e o primeiro defeito de viewmodel registrado: *"arma travava
inclinada ao trocar de arma no meio da recarga"* (`db3e1385a`).

**19/07 é o dia que define a frente.** Num único dia:

- `c008812c5` — personagens 3D reais, **GLB riggado via Mint**, no lugar dos bonecos de caixa
- `4a6f5a425` — **mãos FPS herdam pele e manga do personagem selecionado**
- `adab1e6d8` — arsenal real: 8 armas GLB
- `50ae9833d` — **as 22 armas jogáveis (CS 1.6)**
- `912c17f25` — o viewmodel do jogador passa a usar as armas reais
- `6091dccad` — ADS por FOV, generalizado
- `7debb98db` — bots empunham com as **DUAS mãos** (clips Meshy de rifle)

> **A skin de mão por time é de 19/07.** O pedido que o dono repetiu em 11/09
> ("quero skins de mãos diferentes por time") já estava implementado no segundo
> dia do arsenal. Ele não pediu coisa nova — pediu que não se perdesse.

Dois registros de julho que envelheceram bem demais:

- `e9ee86bdf` — *"Os Guerreiros procedural (**Mint falhou 2x na malha**)"*. A
  primeira falha de geração registrada; a saída foi procedural.
- `64599131d` — *"reverte Frutiger Aero … **arma gigante** … foot-sliding"*.
  **19/07.** O mesmo defeito de escala que o dono relatou em 11/09.

Em 20–21/07 entram Zastava M92 e HK G3 via Mint (`d2356a4a5`), sons CC0 do
Freesound (`4b8b0ea3a`), e o **curl bones por dedo** — falloff pulso→ponta, dedos
fechando no grip nos 17 personagens sobre rigs Meshy de 24 ossos (`7a36aaa5c`).

## B.2 · Medição e bancada — agosto

`415b40234` (04/08) é emblemático: *"liga o ViewModelRig, que estava **testado e
nunca importado**"* (BUG-04). Código com régua verde que o jogo nunca executou.

Em 05/08 as 26 armas passam a ser **renderizadas do GLB do jogo, não geradas por
IA** (`a3116ea5b`) — a página `/armas` deixa de mentir sobre o que existe.

Em 09/08 nasce a bancada: `dev.html` para afinar arma em primeira pessoa
(`fbf73333f`) e o modo `?vmlab=1`, que aplica no jogo a pose afinada no editor
(`308b6a538`). É a primeira vez que se pode comparar A/B sem adivinhar.

## B.3 · Mãos faccionais e os primeiros pilotos — 22 a 27/08

- 22/08 — `061fbb9ff` especifica **mãos faccionais** no viewmodel; `9e452d582`
  **registra a reprovação do piloto de mãos**.
- 27/08 — pilotos de M4 (`66e62d4d7`), pesados (`b1aec7e1c`) e faca melee
  (`3f32fe56b`); a faca é **aprovada e integrada** (`0c370790c`).
- 27/08 — `7da35fdab` gera o candidato M4 **por retarget** e `0a2820568`
  **o reprova no gate visual**. É o fim da trilha retarget como arquitetura final.

## B.4 · O pack pago, em um dia — 28/08

Cerca de **20 commits em 28/08** constroem o pipeline KINEMATION inteiro:
extração privada do Unity (`bd6deb780`), braços com animação (`6db38616e`),
famílias auto-contidas (`6427aaab8`), recargas normalizadas a 60 fps
(`6368f3993`), catálogo automatizado (`7ea2a3f55`), runtime lazy (`ad4d88b82`),
contrato de runtime (`c75ecacb5`).

É a fundação que hoje serve 7 armas — e que em 31/08 seria descartada como fonte
*canônica*, sem deixar de ser controle.

## B.5 · CS 1.6 e o enxugamento — 29 a 31/08

- 29/08 — `24e51dac3` traz a **âncora CS 1.6 medida nas 14 famílias**.
- 30/08 — `6c78f6b5e` abre a **trilha B**: molde GoldSrc CC0 com arma Mint. Em
  dois dias ela cobre as 26 armas (`55f49829a`).
- 31/08 — `84f691d1b`: **o arsenal enxuga de 26 para 20** — saem 6 duplicatas.
  É a origem de `tavor`, `g3sg1`, `m400` e `akm` continuarem no `vmconfig` sem
  existir em `weapons.js`, descompasso que só foi notado em **11/09**.

## B.6 · A AK golden — 31/08

`a23966970` entrega a AK golden no runtime: `GOLDEN-AK-DECISION.md`,
`VIEWMODEL_CONTRACT.md`, +124 linhas em `authoredvm.js` e o `ak-hires.glb`.

A decisão escolhe o **piloto dedicado** — um rig, braços de alta resolução,
geometria própria, câmera exportada, quatro ações no mesmo arquivo — e descarta
GoldSrc (anatomia), retarget (bake incompatível) e KINEMATION (estados divididos).

No mesmo dia, `b0110cad1` **registra a reprovação visual da shotgun**.

## B.7 · A pistola e a auditoria — 01 a 07/09

01/09 traz a decisão da pistola X18 (`fa5559ee3`) e uma lição de régua:
`368068362` — *"a régua **para de cobrar pente de arma sem pente**"*. Régua que
cobra o que não existe reprova para sempre.

07/09 — o dono joga a lane de auditoria e dá o veredito: **"faca pistola e ak
estao perfeitas"** (`8b31f5dce`).

## B.8 · Os dez dias perdidos — 31/08 a 10/09

A entrega da AK golden (`a23966970`) ficou em **11 branches de lane** e em
**nenhuma** das duas que importam: nem o trunk, nem a `main`.

A causa: `fc32ebb13`, *"resgate: versionar 6 dias de viewmodels 1P que viviam só
na working tree"*, **copiou conteúdo em vez de mesclar as lanes**. O trunk ficou
com os arquivos em versão pré-aprovação e **sem a ancestralidade** — então o
`git log` respondia "não contém" enquanto o conteúdo parcial estava lá.

> **Nesta frente, comparar por `git log` mente. Compare por tamanho de blob — e,
> desde 11/09, por sha256.**

## B.9 · Hoje — 10 e 11/09

- Merge das duas linhas (`claude/vm-unificado`): 30 commits da lane + 7 do trunk,
  9 conflitos resolvidos por união.
- Quatro camadas de ambiente destravadas: symlink `private-assets` ausente
  (15 famílias em 404, jogo caindo no legado **em silêncio**), Playwright global
  quebrado (**141 scripts** do repo dependem dele), regex do
  `authored-serving-check` que só casava IP, e `astro dev` só em IPv6.
- 13 armas reconstruídas no rig da AK, escala convergida em **três rodadas** de
  calibração (a uzi de 114 → 50 → 38 cm).
- Uma regressão minha, achada pela própria captura: a pistola a 144×.
- Uma regressão minha que o **dono** achou: a AK aprovada sobrescrita porque eu
  comparei tamanho e não hash.

---

# CAMADA C — REFERÊNCIA TÉCNICA

*(em preenchimento — pesquisa de maquinário em curso)*

## C.1 · As fontes de asset

| fonte | o que dá | onde |
|---|---|---|
| **mint.gg** | personagens e props riggados; as armas do arsenal | `public/models/weapons/*.glb`, `FONTE.md` |
| **Meshy** | clips de empunhadura dos bots (rigs de 24 ossos) | — |
| **KINEMATION Ultimate** | 23 famílias FP: idle + 2 recargas por família, e os compartilhados (`equip_rifle`, walk, sprint, pickup) | `fpsanimationpack_ultimate.unitypackage` |
| **CS 1.6 fonte** | 30 armas com `draw`/`idle1`/`reload`/`lhand` em SMD — o gabarito de **cadência** | `cs16_widescreen_src.zip` |
| **Doadores CC0** | 45 GLB riggados; 6 com duas malhas de mão | `~/Downloads` |

O `cs16` de cada família em `public/js/data/vmconfig.js` sai do gabarito, via
`tools/viewmodels/cs16-timings.json` e `extract_cs16_timings.py`.

## C.2 · O pipeline do piloto hires

```
build_ak_hires_pilot.py --doador <CC0.glb> --arma <mint.glb> --comprimento <cm>
    → artifacts/viewmodels/hires/<arma>/ak-hires-pilot.glb   (+ renders)
publicar-hires.mjs --de=<dir>
    → public/models/viewmodels/coro/<arma>-hires.glb  +  golden:true no vmconfig
```

O doador contribui topologia de mão em alta resolução, rig, estrutura de ações e
normal map de manga. A geometria do doador é apagada; a nossa arma é encaixada no
espaço do rig dele.

`--comprimento` é `len × vm` de `weapons.js` — e o `vm` carrega vereditos
anteriores do dono (a AWP tem `vm: 0.78` com o comentário *(dono: "gigantesca")*).

## C.3 · O pipeline da família KINEMATION

```
build_paid_family.py --family <fam>   (Blender: braços + arma + câmera + idle)
bake_family.mjs --arma=<fam>          (orquestra os estágios seguintes)
assemble_paid_family.mjs              (assa os reloads ASCII e mescla por nome de osso)
assemble_general_motions.mjs          (os compartilhados, UMA vez, em shared/)
optimize_paid_family.mjs              (de-dup de textura: 300 MB redundantes → shared/)
```

Saída em `~/csbrasil-private-assets/generated/viewmodels/`, servida pelo symlink
`public/private-assets/viewmodels` — que é **gitignored** e precisa existir na
máquina, senão tudo cai no legado em silêncio.

## C.4 · Captura, medição e vídeo

| ferramenta | o que faz |
|---|---|
| `tools/viewmodels/prep/vm-arsenal-frames.mjs` | captura no jogo real, arma por arma; `--modo=legado\|autorado`, `--aspecto=32\|169` |
| `tools/eval/vm-arsenal-check.mjs` | o portão sobre o `frames.json` |
| `tools/eval/vm-cs16-video.mjs` | **vídeo de 10s da máquina de 6 estados** (idle→tiro→recarga→saque), no jogo real |
| `tools/still2video.mjs` | sequência de stills → vídeo |
| `public/dev.html`, `weapontest.html` | bancadas de afinação e medição de orientação |

Pré-requisitos locais: symlink `private-assets`, Playwright **global**, ffmpeg.
O `astro dev` sobe só em IPv6 por padrão — os arnêses batem em `127.0.0.1`, então
suba com `--host 0.0.0.0`.
