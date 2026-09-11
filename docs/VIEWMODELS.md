# Viewmodels — o documento único

**Atualizado:** 11/09/2026 · **Base:** `claude/vm-unificado`

Substitui **19 documentos** que somavam 4.448 linhas em `docs/reports/`. Todos
escritos de 31/08 em diante; nenhum cobria julho. O problema nunca foi falta de
documento — foi espalhamento.

- **A — Briefing.** O que ler antes de tocar em viewmodel. Se tem cinco minutos, leia a A.
- **B — Memória.** Como chegamos aqui.
- **C — Referência.** O maquinário.

> **Regra deste arquivo:** número derivável do código **não se escreve aqui** —
> aponta-se `arquivo:linha`. Um `SKILL.md` desta casa afirmou por semanas que o
> `game.js` tinha 3.234 linhas enquanto o arquivo dobrava. Número de **evento**
> (medido tal dia, por tal comando) fica, com data e comando.

---

# CAMADA A — BRIEFING

## A.1 · O que sobreviveu a tudo

Quatro pipelines de arma morreram desde julho. **As 26 armas Mint de 19–24/07
são a única coisa que sobreviveu inteira** — ao Quaternius, ao Tripo-herói, ao
GoldSrc, ao KINEMATION.

> Elas são a identidade do jogo. Todo o resto é **esqueleto emprestado ao redor
> delas** — e essa é a lei que governa a frente: *"pacote CC0 é doador, nunca
> aparência"* (`KNOWN-BUGS.md:2251`).

## A.2 · As seis trilhas, e por que cinco caíram

| trilha | nasceu | estado | motivo |
|---|---|---|---|
| **Procedural / legado** — cápsulas em `_buildViewModels` | 31/07 | **fallback ativo** quando `ready:false` | *"mãos genéricas que não se parecem nada com mãos"* (BUG-75) |
| **`fpsrig.js`** CC0 WRAD + IK por socket | 24/08 | descartada **no mesmo dia** | régua verde para arquitetura errada: media punho→socket, não anatomia |
| **KINEMATION / pack pago** | 28/08 | **viva** — serve 7 armas | mãos modernas, mas 12/15 famílias sem draw nem fire |
| **GoldSrc** (`?vmfonte=goldsrc`, `?cs16=1`) | 30/08 | **controle**, nunca produto | braços de **596 triângulos** — *"um cone marrom sem dedos"* |
| **Retarget** (`?rt=1`) | 31/08 | **bloqueada** | fechar o C5 custa metade da diagonal da arma; a manga cobre o cano |
| **Piloto hires / golden** ← **vigente** | 31/08 | canônica; 13 armas em 11/09 | um rig, câmera exportada, quatro clips no mesmo arquivo |

Precedência em `entryKeyFor` (`public/js/authoredvm.js:240`):
`retarget > goldsrc > golden > baked > família`.

## A.3 · O princípio que governa a produção

> **A mão vem de UMA fonte — a aprovada. A animação vem do melhor doador de cada
> classe, por retargeting.**

O defeito que o dono relatou em 11/09 — *"escala diferente das mãos/braços"* —
não era escala: eram **malhas diferentes**.

| fonte de braço | verts | ossos | materiais |
|---|---:|---:|---|
| **`Requests_Studio_Hands`** (aprovada) | 24.818 | 77 | `CoroSolto_FP_Gloves` + `CoroSolto_*_Sleeves` |
| `free_fps_arms_gameready_-_rigged` | 8.112 | 52 | `FPS_Arm`, `FPS_Hand` |
| `fps_arms_gloved` | 5.126 | 47 | `sleeves`, `gloves` |
| `ARMS.blend` | 4.555 | 43 | corpo Mixamo, não braço FP |

E há um motivo que não é qualidade: a **skin por time** casa por **nome de
material** em `applyTeamHandMaterial` (`authoredvm.js:271`). Trocar a fonte
quebra a skin por time. **O requisito do dono é argumento contra a troca.**

**Corolário:** `carbine`, `g3`, `awp` e `shotgun` não falham por defeito delas —
falham porque estavam sendo forçadas no molde de uma AK.

## A.4 · As sete lições que esta frente pagou caro

1. **Régua verde para arquitetura errada é pior que régua vermelha.** `eval:fp-rig`
   media punho→socket e passava 26/26 com braços de pessoa deformada.
2. **Distância na tela mente; distância 3D não.** A mesma arma mediu 624 px e
   878 px em rodadas diferentes (BUG-77).
3. **O mutante precisa reintroduzir o ESTADO do defeito, não uma paródia dele.**
4. **Régua que não morde em entrada não mensurável é verde celo.** BUG-87: entrada
   sem Mint agora REPROVA sob mutante.
5. **Compensação empilhada esconde a causa.** `weaponScale: 1.30` + `supportGrip`
   + frame `[-7°,30°,-15°]` eram três curativos sobre **uma** rotação de socket
   de +90° em X.
6. **Comparar tamanho não é comparar hash.** 11/09: dois GLB com os mesmos
   3.414.520 bytes e sha256 diferentes; **o dono viu jogando**.
7. **Construir não é aprovar, e servir não é alcançar.** A AK golden ficou de
   31/08 a 11/09 pronta e fora do trunk; AKM e pistola ficaram completas e
   invisíveis por falta de uma marca `golden: true`.

## A.5 · Armadilhas, com o dia em que custaram

| armadilha | efeito |
|---|---|
| `reskin-glb.mjs` rodado duas vezes | **não é idempotente** — `padati` 254,9 → 286 (+12%) |
| `quantize`/`simplify` em malha skinned | explode no GPU real, **passa no headless** |
| `simplify` com `error: 0.02` em estrutura fina | destrói sights, rail e dedos (saga `arms_rifle`, 28/07) |
| Preload de todas as viewmodels | crash OOM: **322 MB de heap no boot** |
| Validar enquadramento só em 16:9 | o dono joga em **3:2** |
| Girar a arma para "expor identidade" | *"mira num lugar, a arma aponta pro outro"* |
| Duas capturas headless em paralelo | derruba o boot e falsifica a medição |
| Turno morto no meio do portão | deixa o mutante do `eval:docsautoria` na árvore |
| Prompt com "AK-47" ou calibre | **400 content policy** no Tripo — descreva a silhueta |
| `?v=` não bumpado | o import map serve módulo velho; "a correção não chegava" |

## A.6 · Estado em 11/09/2026

| | |
|---|---|
| arsenal jogável | **20** armas (`weapons.js`), 27 GLB em disco |
| servidas pelo piloto hires | **13** |
| servidas pela família KINEMATION | 7 |
| escala das 13, erro médio | **0,0%** |
| `eval:vm-consistencia` | **2/24** — dívida nº 1 |
| aprovadas pelo dono | AK, pistola, faca (07/09, verbal) |
| recusadas pelo builder | `carbine` `g3` `awp` `shotgun` |
| no vmconfig e ausentes de `weapons.js` | `tavor` `g3sg1` `m400` `akm` |

**Abertos:** BUG-04 (`ViewModelRig` nunca importado), BUG-85, BUG-88, BUG-89,
`BUG-VM-ESCALA-PISTOLA`, enquadramento por arma, `svd/reload-f015` intermitente.

---

# CAMADA B — MEMÓRIA

564 commits de arma/viewmodel entre 17/07 e 11/09/2026.

## B.1 · Antes do GLB — caixas e Quaternius (17–20/07)

O jogo começou com **armas de caixa**. O fallback procedural ainda existe e é o
que a régua `ARM2` cobra (`tools/eval/armas-check.mjs:11`): *"`weaponModel()` cai
em `buildRifle()` quando o GLB não está em memória, e isso não aparece em erro
nenhum — some calado dentro da cena."*

A primeira tentativa de arma real foi o pack **Quaternius CC0** (OBJ/FBX/Blend,
222 arquivos, 35 MB), commitado em 20/07 e **removido em 06/08** — *"não
referenciado"*, confirmado pelo dono.

## B.2 · A gênese Mint — 26 armas em quatro lotes e seis dias (19–24/07)

| lote | commit | quando | armas |
|---|---|---|---|
| 1 | `adab1e6d8` | **19/07 01:41** | `awp ak m4 mp5 shotgun deagle pistol knife` |
| 2 | `fffafd7ff` | 19/07 **01:59** | `t56 akm revolver38 md97 carbine m400 mosin rem700` |
| 3 | `12604c7b4` | 19/07 **02:22** | `lmg scar tavor famas uzi p90` — *"22 modelos"* |
| 4 | `d2356a4a5` | 20/07 | `m92` (Zastava, substitui `t56`) e `g3` — **1ª vez que "Mint" aparece num commit de arma** |
| 5 | `85eb32bc9` | 24/07 04:27 | `svd` e `g3sg1` |
| 6 | `c11798450` | 24/07 **04:31** | `sks` — fim do `MODEL_ALIAS` |

**Três lotes em 41 minutos.** O arsenal inteiro do jogo nasceu numa madrugada.

### A dívida de procedência

**`public/models/weapons/FONTE.md` nunca existiu.** É a única pasta grande de
modelo do repositório sem arquivo de procedência — as armas foram geradas antes
de a régua `eval:props-acervo` nascer, na v2.1. **Nenhuma das 26 tem `assetId`,
`chatUrl`, prompt ou SHA registrados** no `mint-assets.json`.

O que sobreviveu como impressão digital foram os **nomes de material dentro dos
próprios binários** — o título que o mint.gg deu a cada asset:

| arma | material no GLB |
|---|---|
| `m92` | **`Wood Booster Draco Material`** |
| `g3` | **`Olive Steel G3 Material`** |
| `svd` | **`Walnut Scope Dragunov Material`** |
| `g3sg1` | **`Matte Scope Marksman Material`** |
| `sks` | **`Scoped Bayonet Carbine Material`** |
| `mp5`, `awp` | `smg Material`, `sniper Material` — nome de **classe**, não de arma |

E a assinatura comum: **as 26 têm bbox de `0.998047 m` no maior eixo** — mesma
normalização, mesmo pipeline, 1 mesh / 1 node, sem Draco.

> **A única arma com recibo completo é o mosquete** — e ela veio do **Tripo**, não
> do Mint: `assetId`, `modelVersion v3.1-20260211`, 50 créditos, prompt versionado
> e SHA final no `mint-assets.json`. É também **a única que quebrou o
> normalizador**, porque veio com convenção de eixo diferente (`rot: [-90,0,0]`
> leva Z→Y) e renderizou **7,856 m na vertical** — a coluna de madeira no meio da
> tela. Dali nasceu `weapon-scale-check.mjs`.

## B.3 · A era Tripo-herói — o viewmodel antes do viewmodel (28–31/07)

Antes do viewmodel atual existiu outro, hoje apagado: **armas-herói** com braços e
arma numa peça só, geradas no Tripo a 30 créditos cada.

A saga registrada em `docs/historico/HANDOFF-KIMI.md` é um curso de erros:

- **Pose:** *"o modelo arms+rifle do Tripo é pose LOW-READY e 8 iterações de
  framing não salvaram. **Prompt de pose importa mais que detalhe de malha.**"*
- **Moderação:** *"**'AK-47' e calibre explícito disparam moderação** — descrever a
  silhueta ('classic wooden assault rifle with curved magazine') passa."*
- **Geometria:** *"'detailed geometry' do Tripo = **~1M verts, inutilizável pra
  browser**; `simplify` do meshopt destrói malhas com estruturas finas em
  QUALQUER ratio; **quantize NÃO reduz índice**."*
- **O viés do gerador:** a UZI foi revertida ao kit procedural depois de duas
  gerações — *"o tell é estrutural, nenhum framing cria. **Tripo text-to-3D tem
  viés forte de 'SMG genérica moderna'**."*

**A era morreu de OOM em 31/07:** o preload baixava 13 `arms_*.glb` de uma vez —
**322 MB de heap no boot**, pistola sozinha com texturas 4K = 255 MB de GPU.

## B.4 · 31/07 — a virada que definiu a doutrina

`d9d1c0791` — *"P0: viewmodel volta pros 26 GLBs da Mint"*. O corpo do commit é o
documento fundador:

> *"A 1ª pessoa usava **8 GLBs-herói da Tripo + kit procedural**, enquanto a 3ª
> pessoa já usava os **26 GLBs da Mint, um por arma**. Agora o viewmodel usa os
> mesmos 26 (**250–900 KB no lugar de 18 MB por arma**)."*
> *"enquadramento **DERIVADO de len/gripZ/vm já medidos**, não tabelado por arma"*
> *"o bug do 3:2 morre **por construção**, e não por tuning"*

E as palavras do dono que provocaram a virada:

> *"as armas ganharam realismo mas perderam identidade… o mais importante é a
> **CONSISTÊNCIA** de jogo… **Às vezes é melhor ter um valor visual mais simples,
> mas mais consistente pro jogo.**"*

No mesmo handoff, o erro de método admitido: *"rodaram-se 3 gauntlets de
fidelidade medindo L\* em frame parado enquanto o jogo estava quebrado em
movimento… **fan-out de 8 agentes num sistema de coerência produziu 13 regressões
numa rodada**"* — a origem da lei de concorrência do `AGENTS.md`.

## B.5 · A tabela de armas — onde a memória do projeto vive

`public/js/weapons.js` tem 365 linhas, **~180 delas de comentário-decisão**. É o
arquivo mais denso de memória do repositório. Quatro campos por arma: `len`
(comprimento real), `rot` (cano → +Z), `gripZ` (onde a mão pega), `vm`
(multiplicador só do viewmodel).

O `rot` foi verificado **objetivamente**, arma a arma: *"mede a seção transversal
perto de cada ponta Z — **o cano é FINO, a coronha GROSSA**; se a ponta +Z não é a
mais fina, a arma está invertida. A leitura à olho falhava nas bullpups; **a
medição não**."*

Três decisões do dono que viraram número:

- **`awp: vm 0.78`** — *(dono: "gigantesca")*
- **`m92: vm 0.90`, 24 linhas de comentário** — *"É A ARMA QUE O DONO NOMEOU POR
  TAMANHO: 'a ak 47 e a zastava toma a tela inteira'."* Medida: **14,50% de tela**
  contra teto de **13,09%**; era a única acima do teto, e a AK (11,54%) estava
  dentro. Causa: **a maior razão altura/comprimento do arsenal** (0,479).
- **`uzi: len 0.60 → 0.47`** — *"'a uzi do hipster está gigante, maior que o corpo
  dele'. O mount NÃO estava errado — a sonda mediu fator **1,00**. O problema é a
  PROPORÇÃO do GLB: razão 0,69, a mais 'alta' do arsenal."*

> **A zastava e a uzi são as mesmas duas armas que o dono nomeou de novo em
> 11/09.** Elas voltaram porque a correção morava em `weapons.js` e o piloto hires
> não a lia.

E o bloco `MAG` (75 linhas), o defeito que **é do asset**: *"em `md97.glb` e
`mp5.glb` a Mint entregou a arma com o **poço de carregador VAZIO**"* — o md97 tem
um vazio de malha exatamente onde o poço deveria estar. O código monta um pente
procedural ali, e o próprio comentário declara a dívida: *"**enquanto nenhuma
régua ler isto, nada impede alguém de apagar este bloco e passar verde**."*

## B.6 · BUG-75 — a espinha dorsal (24/08)

> *"mãos genéricas que não se parecem nada com mãos, mal encaixe nas armas,
> recarregar some com a arma, péssimas animações, péssima inclinação"*

Diagnóstico (`KNOWN-BUGS.md:2207`): `fpArm()`/`frontHand()` criam **cápsulas**;
`buildFPArms()` devolve `null` porque `FP_OFF = true`; a recarga move só o pivô
global. *"**Os cinco sintomas são o mesmo defeito de arquitetura, não cinco
offsets ruins.**"*

A primeira tentativa (`fpsrig.js`) passou **26/26** na régua e foi reaberta pelo
dono: *"parece o braço de uma pessoa deformada e nao real"*. O veredito sobre a
régua é a lição mais citada desta frente:

> *"A régua anterior mede punho→socket e existência de fases inventadas em JS. Ela
> **não mede anatomia, silhueta nem se mãos+arma+animação foram autoradas como um
> único viewmodel**; portanto ficou verde para a arquitetura errada."*

## B.7 · O pack pago em um dia — 28/08

**29 commits em ~90 minutos, sem portões**, trocaram 25/26 armas pela malha
genérica do pack. Quatro causas, todas medidas lendo o binário:

| causa | conserto | prova |
|---|---|---|
| arma parenteada no **objeto** armature, não no bone | bone-parent com compensação | delta ≤ **1e-6 m** nas 15 famílias |
| as mesmas **9 texturas (18,3 MB)** em 16 GLBs — troca de arma baixava 23 MB | `shared/` + placeholder 1×1 | catálogo **345 → 68 MB** |
| sem clipe de fire em **12/15** famílias | `vmrecoil.js` com curvas do pack | pico AK **1,50°** medido vs 1,55° simulado |
| `setAim()` no-op | alça **medida** alinhada ao eixo da vmCamera | desvio **0.000** em 16:9 e 3:2 |

## B.8 · GoldSrc e retarget — controle, não produto (30–31/08)

A trilha GoldSrc prometia o que ninguém mais dava: *"**a animação do pente tira o
pente DE VERDADE**"*. Saiu de **0/19 para 12/19** limpas em um dia, e produziu a
régua mais honesta do conjunto — `vm-goldsrc-check.mjs`, que *"existe porque em
30/08 a tela estava errada e as réguas estavam verdes: **três armas sem mãos, a
shotgun sem a própria recarga, o pente preso em 16 de 26 e a mira dentro do
cano**"*.

O defeito de raiz mais caro dela: **o pacote do molde não media metro** (~23
unidades/metro). *"Ele explica por que 'o mount não recua' tinha sido desligado:
em 23 unidades por metro, um coice de 2 cm era invisível."*

E as quatro reprovações que ficaram, declaradas como verdade do asset: *"a recarga
do molde CS 1.6 **não leva a mão de apoio até o pente** nessas armas. **Não invente
pose no runtime para fechar o número.**"*

A trilha retarget morreu com número: fechar o critério custa **metade da diagonal
da arma** e multiplica por cinco a massa de braço — *"o cano some atrás da manga"*.

## B.9 · A AK golden — 31/08

`a23966970`. A decisão escolhe o **piloto dedicado** e descarta as três
alternativas. A frase mais importante é o **custo aceito**:

> *"A primeira AK recebeu ajuste manual e builder específico. Isso **adia a
> generalização**, mas elimina offsets concorrentes e torna Blender, GLB e jogo
> uma cadeia única."*

Liberação: mutantes vermelhos, **GLB reimportado, servido e produto do build com o
mesmo SHA-256**, e crítico adversarial de contexto limpo dando APROVA — depois de
uma revisão anterior ter **reprovado sincronismo e cadeia de hash**.

## B.10 · O veredito do dono — 07/09

> **"faca pistola e ak estao perfeitas"**

Registrado em `8b31f5dce`, sobre o conteúdo `d35c6658`.

## B.11 · Os dez dias perdidos — 31/08 a 10/09

A entrega da AK golden ficou em **11 branches de lane** e em **nenhuma** das duas
que importam: nem o trunk, nem a `main`.

Causa: `fc32ebb13` — *"resgate: versionar 6 dias de viewmodels 1P que viviam só na
working tree"* — **copiou conteúdo em vez de mesclar as lanes**. O trunk ficou com
os arquivos em versão pré-aprovação e **sem ancestralidade**: o `git log`
respondia "não contém" enquanto o conteúdo parcial estava lá.

> **Nesta frente, comparar por `git log` mente. Compare por blob — e, desde 11/09,
> por sha256.**

Uma auditoria de 09/09 já tinha medido o tamanho do problema: **26 armas, 12 com
trabalho real, ZERO com GLB de lane integrado**. E o registro mais irônico: o
frame que "provava" o defeito da LMG **era a AWP renderizada no lugar errado**.

## B.12 · 10 e 11/09 — a unificação

- **Merge das duas linhas** — 30 commits da lane + 7 do trunk, 9 conflitos por união.
- **Quatro camadas de ambiente destravadas:** symlink `private-assets` ausente
  (15 famílias em 404, jogo caindo no legado **em silêncio**), Playwright global
  quebrado (**141 scripts** dependem dele), regex do serving-check que só casava
  IP, `astro dev` só em IPv6.
- **`golden` era uma marca, não um asset:** AKM e pistola estavam completas e
  inalcançáveis porque só a `ak` tinha `golden: true`.
- **As 16 famílias já existiam** — *"não faltava trabalho, faltava a última
  milha"*. O `equip_rifle` que o handoff dava como ausente estava no
  `shared/general-runtime.glb`.
- **A escala, em três rodadas:** uzi 114 → 50 → 38 cm; erro médio **0,0%**.
  *"O `scar` mal se mexer entre v2 e v3 é a prova de que a correção não chuta: ela
  só move quem errou, na medida do erro."*
- **Duas regressões minhas:** a pistola a 144× (achada pela captura) e **a AK
  aprovada sobrescrita** — porque comparei tamanho e não hash. **O dono viu
  jogando.**

---

# CAMADA C — REFERÊNCIA TÉCNICA

## C.1 · Os geradores, e a regra editorial

| serviço | o que gera | como |
|---|---|---|
| **mint.gg** | personagens rigados, props, as 26 armas | **MCP interativo** — não há script. O MCP vive em `.kimi-code/mcp.json`, não no `.claude/` |
| **Tripo3D** | props por texto; o mosquete | `tools/gen-asset.mjs --provider tripo` |
| **Meshy** | props alternativos e **auto-rig** (5 créditos) | `rig-meshy.mjs` |
| **OpenRouter** | **toda** arte 2D e música | `tools/gen-image.mjs` |

**Regra do dono (19/08, `AGENTS.md:59`):** *"Mint é SÓ para 3D; toda arte 2D sai
pelo OpenRouter; música NÃO é Mint"* — o pipeline de animação do Mint é
humanoid-only e a música dele não agradou.

**As três regras de chave** (`gen-asset.mjs:14`): nunca de `argv` (*"argv vaza no
`ps` de qualquer processo"*) · `Authorization` só para o host da própria API, com
`redirect:'error'` para um 3xx não levar o header ao CDN · nada impresso sem
`redact()`.

O registro de procedência é o `mint-assets.json` (65 assets), guardado por duas
réguas: `eval:asset-integrity` (sha256 do artefato × disco) e
`eval:gltf-validator` (**validador oficial Khronos** — *"zero erro de carregamento
não é conformidade"*).

## C.2 · O acervo, inventariado em 11/09

| fonte | conteúdo |
|---|---|
| **KINEMATION Ultimate** (516 MB) | **23 famílias** contra 18 extraídas. Novas: `ASVal` `Drake-12` `Kolibri` `M1911` `RPG` |
| **CS 1.6 fonte** | 771 arquivos: **400 SMD, 39 QC**, 30 armas com `draw`/`idle1`/`reload`/`lhand` |
| **ARMS.rar** | `ARMS.blend` — corpo Mixamo, **não** braço FP |
| **Doadores CC0** | 45 GLB com rig; 6 com **duas malhas de mão** |

Doadores de mais clipes: `uzi remake` (13, com **Aim_In/Aim_Out**),
`desert_eagle` (9), `animated_shotgun` (7 + pump completo), `pistol_animated` (7),
`fps_animations_sniper_rifle` (6, com **Shot_sight**), `m4a1-s CS2` (5).

## C.3 · Os dois pipelines vivos

**Piloto hires (canônico):**
```
build_ak_hires_pilot.py --doador <CC0> --arma <mint> --comprimento <cm>
publicar-hires.mjs --de=<dir>     → coro/<arma>-hires.glb + golden:true
```
`--comprimento` é `len × vm`. O doador dá mão, rig e ações; **sua geometria é
apagada** — *"geometria ou material visual do doador é proibido"*
(`VIEWMODEL_CONTRACT.md:37`).

**Família KINEMATION (controle):**
```
extract_paid_unitypackage.py → build_paid_family.py → assemble_paid_family.mjs
→ assemble_general_motions.mjs → optimize_paid_family.mjs
```
Servida pelo symlink `public/private-assets/viewmodels` — **gitignored**; sem ele
tudo cai no legado calado.

## C.4 · O contrato normativo

`VIEWMODEL_CONTRACT.md` (220 linhas) fixa o que não se negocia:

| invariante | valor |
|---|---|
| unidade | 1 unidade = 1 metro |
| escala raiz do rig golden | **2,392897** — *"não varia entre clips nem é reaplicada no JS"* |
| olho do jogador | 1,62 m |
| câmera do mundo | VFOV 70° |
| **câmera do viewmodel** | `AK_Hires_FP_Camera`, **VFOV 58°, exportada dentro do GLB** — *"não existe um segundo enquadramento escrito à mão"* |
| aspecto normativo | **3:2** |
| contato palma↔arma | **≤ 1 cm** por amostra — *"distância global entre 'alguma mão' e 'alguma arma' não vale como prova"* |
| cadência | draw 1,0 s · idle 3,333 s · fire 0,433 s · reload 2,5 s |

E os **cinco portões**, onde o quinto é *"crítico adversarial de contexto limpo.
**Quem constrói não libera.**"* — com a cláusula que fecha tudo:

> *"Um portão verde contra uma reprovação visual **abre defeito na régua**."*

## C.5 · Otimização — e por que cada teto é o que é

| ferramenta | política |
|---|---|
| `optimize-armas.mjs` | **textura-only**; VRAM **259 → 164 MB**. *"A arma na mão é a coisa mais olhada do jogo"* — geometria intocada |
| `optimize-fpvm.mjs` | `simplify` com **`error: 0.0005`** — **40× menor** que o de prop estático |
| `optimize-static.mjs` | `error: 0.02` — **só** prop grosso; este valor destrói sights e dedos |
| `optimize-tribos.mjs` | *"NUNCA quantize/simplify — malha skinned explode no GPU real, **invisível no headless**"* |
| `vram-check.mjs` | o portão: *"textura em disco engana"* — 3,3 MB viram **259 MB** descomprimidos |

**O teto que manda em tudo:** **250 MB e 1.500 arquivos na CrazyGames**. O
`public/` versionado está em ~352 MB, e `scripts/prune-dist.mjs` poda 154 MB de
viewmodel Tripo morto — com **lista fechada e literal**, nunca glob: *"poda
dirigida por padrão num script que roda `rmSync(recursive)` é como se apaga a
pasta errada."*

## C.6 · Formatos: o que a régua prescreve × o que o código faz

| formato | estado real |
|---|---|
| **GLB** | universal, é a unidade de entrega |
| **WebP** (`EXT_texture_webp`) | **é o que existe**: 48 dos 62 GLB, + 13 JPEG |
| **Meshopt** | só como **simplificador**, não como codec de buffer |
| **KTX2 / Basis** | **ZERO ocorrências** — prescrito em `BAR.md` e `RUBRIC.md`, ausente no elenco |
| **DRACO** | **não usado** — prescrito em papel, ausente no código |

E o gap é de runtime também: `setDRACOLoader`, `setKTX2Loader` e
`setMeshoptDecoder` **não aparecem em `public/js/`**. O repo **escreve a
divergência em vez de escondê-la** — a refutação está em
`char-pbr-check.mjs:12`, que derruba um diagnóstico anterior: *"o diagnóstico
dizia que 53 dos 62 eram imedíveis porque a textura estaria em KTX2. Medido:
`KHR_texture_basisu` aparece **ZERO vezes**. Nenhum personagem é imedível."*

## C.7 · Captura, medição e vídeo

| ferramenta | o que faz |
|---|---|
| `gl-shots.mjs` | a bateria do Gauntlet: menu + in-game, **todos os mapas × 2 aspectos × 4 ângulos** |
| `vm-arsenal-frames.mjs` | captura no jogo real, arma por arma |
| **`vm-cs16-video.mjs`** | **vídeo de 10 s da máquina de 6 estados** (idle→tiro→recarga→saque), no jogo real |
| `vm-gauntlet.mjs` | sonda de cores no jogo: P1–P7, 10 mutantes |
| `ref-measure.py` | **o padrão de qualidade da casa** — mede a referência em pixel |
| `blind-capture.mjs` | captura **cega** das 26: embaralha com PRNG e guarda o gabarito em `key.txt` separado |
| `dev.html`, `weapontest.html` | bancadas de afinação e de orientação |

**`ref-measure.py` merece leitura integral.** Ele nasceu porque três dias de
portão foram gastos contra números **asseridos**: VM12 exigia a boca em `y ≥ 0,66`
e o doc dizia "coronha INTEIRA no canto". **Nenhum dos dois foi medido em imagem
nenhuma.** Medido: a boca no CS 1.6 fica em `y = 0,51–0,60`, e **a coronha SAI
pela quina** — sair é o padrão, não o defeito. Dali veio a lei 2.

## C.8 · As cegueiras de instrumento, e onde cada uma mora

O repo guarda a cegueira **no arquivo que a sofreu**, não num doc separado:

| arquivo | cegueira |
|---|---|
| `gl-shots.mjs:68` | a lista de mapas ficou em 5 enquanto o jogo foi a 10 — *"mapa que não é fotografado não é criticado, e o que não é criticado regride calado"* |
| `ref-measure.py:32` | o ângulo sai por **PCA** e mede o eixo da massa, **não a linha do cano** |
| `ref-measure.py:37` | *"a primeira versão vazou para a areia do dust e reportou borda 0,499 em vez de 0,564"* |
| `vm-arsenal-frames.mjs:59` | `arm` cru como token classificou **a arma inteira como mão** |
| `vm-arsenal-frames.mjs:105` | 300 pontos de amostra punham o teto **dentro do ruído**; hoje são 800 |
| `weapontest.html:44` | *"my eye kept misreading small/dark renders — this removes the guesswork"* |
| `qa_runtime_glb.py:1` | *"a cena de build e o arquivo exportado divergiram"* — só renderizar o **arquivo** prova o que o jogador vê |
| `authored-serving-check.mjs:5` | 403 silencioso no symlink; o `check:vm` rodava por **outro servidor** e ficava verde |
| `bug-hunt` BUG-28 | no headless ninguém chama `updateMatrixWorld()` — **92 de 92 occluders** com matriz identidade |

## C.9 · Os pisos e tetos, com procedência

De `tools/eval/vm-arsenal-check.mjs`:
```
PISO_MAO        = 40      // quebrada mede 0
TETO_CONTATO_CM = 1.0     // ak aprovada = 0,2 em TODAS as capturas
RAZAO_ESCALA    = 1.35    // m92 861÷ak 553 = 1,56 reprovou
TOL_TAMANHO     = 0.08    // 21 das 25 batem dentro de 2%
UMA_MAO  = {pistol, deagle, revolver38, knife}
LUNETA   = {sniper, bolt}   // escondem o vm no ADS: 0 é legítimo
```

E a referência externa, medida em imagem por `ref-measure.py`:

| frame | boca (x, y) | área | ângulo |
|---|---|---|---|
| `cs16_ak_dust.jpg` | 0,564 ; 0,513 | 9,76% | 28,0° |
| `cs16_m4_dust.jpg` | 0,569 ; 0,598 | 9,78% | 34,8° |
| `valorant_vandal.jpg` | 0,648 ; 0,587 | 13,09% | 4,6° |

## C.10 · A proporção que explica o projeto

**393 arquivos** em `tools/eval/` · **77 scripts** Blender · um contrato de
viewmodel de 220 linhas — contra **dois** scripts de geração.

> A infraestrutura cara desta casa não é a de **gerar**. É a de **medir e de
> olhar**. O gargalo declarado é *"quem constrói não dá a nota"*, e quase todo o
> maquinário existe para produzir a figura que o crítico externo vai olhar **no
> tamanho em que ela é servida**.

## C.11 · Duas dívidas estruturais, declaradas

1. **As 26 armas não têm procedência registrada.** Sem prompt, `chatUrl`,
   `assetId` ou SHA em lugar nenhum. Ela existe só em mensagens de commit e em
   cinco nomes de material dentro dos binários.
2. **O bloco `MAG` conserta em código um buraco do asset que nenhuma régua
   enxerga** — e isso está escrito dentro dele: *"enquanto nenhuma régua ler
   isto, nada impede alguém de apagar este bloco e passar verde."*
