# VIEWMODEL DE 1ª PESSOA — um mês travado. O que foi feito, o que deu errado, e o que deu certo

> **Como usar:** cole o `00-CONTEXTO-CORO-SOLTO.md` primeiro, depois este arquivo inteiro.
> A seção final (§10) é o pedido de pesquisa.
>
> **Regra de honestidade deste documento:** todo número aqui foi medido por instrumento do
> próprio repositório ou lido do binário/commit, e cada um diz **de qual branch** veio. Onde
> não foi medido, está escrito "não medido" ou "sem procedência". Não adivinhe números por
> nós — se precisar de um, peça.
>
> **Revisão de 19/09/2026:** este arquivo foi auditado contra o repositório. Correções em
> relação à versão anterior: (a) a tabela de vértices da mão estava comparando arquivos
> inteiros, não mãos, e a conclusão estava invertida; (b) a "câmera descartada no export" é
> um parágrafo obsoleto — a câmera **é** exportada desde 28/08, o defeito atual é outro;
> (c) o "estado atual" descrevia uma branch de 09/09 — existe uma lane de 14/09 quatro dias
> à frente. Tudo isso está corrigido abaixo.

---

## 1. O que é o "viewmodel" aqui, em uma frase

É o conjunto **braços + mãos + arma + animação + câmera** que o jogador vê em primeira pessoa.
No contrato interno do projeto (`docs/development/VIEWMODEL-1P-PROFISSIONAL.md`) ele é
declarado como **uma unidade inseparável de 7 partes**:

1. braços e mãos próprios do jogo;
2. uma arma própria já existente no jogo (chamada de **"Mint"** — a malha de mundo do
   `public/models/weapons/<id>.glb`);
3. peças mecânicas separadas (carregador, ferrolho, slide, bomba, tambor, gatilho, culatra);
4. rig dedicado de primeira pessoa;
5. ações autoradas **com aquela geometria presente**;
6. **câmera de referência e projeção exportadas junto do asset**;
7. sockets nomeados (boca do cano, ejeção, mão forte, mão de apoio, carregador, mira).

O mesmo contrato lista explicitamente **o que NÃO é um molde profissional** — e é a lista de
tudo que já foi tentado e falhou:

- um braço genérico reposicionado por IK no navegador;
- uma animação doadora com a arma própria encaixada depois por PCA, escala ou offset;
- um rig que passa porque a palma está perto de um socket, mas deforma punho, dedos ou cotovelo;
- **uma câmera recriada no JavaScript com valores aproximados do Blender**;
- uma skin aplicada sobre geometria ou animação de outro jogo.

## 2. O estado atual — são DOIS estados, e é preciso dizer qual

O trabalho vive em branches paralelas. Há duas fotografias diferentes, e confundi-las foi o
erro da versão anterior deste documento.

### 2.1 O tronco da frente (`feat/fps-paid-viewmodels-aaa`, último commit 09/09)

- São **26 armas** no catálogo: `awp, ak, m4, mp5, shotgun, deagle, pistol, knife, m92, akm,
  g3, revolver38, md97, carbine, m400, mosin, rem700, svd, g3sg1, sks, lmg, scar, tavor,
  famas, uzi, p90`.
- **O catálogo autorado versionado é de 6 armas**: `ak`, `akm`, `knife`, `pistol` (presentes
  em 11 branches) + `awp-pilot` e `shotgun-pilot` (só em uma lane). Varredura de 17 branches
  + disco, 09–10/09 (`docs/reports/VM-MAPA-DAS-LANES.md`).
- **Nenhuma família está ligada para o jogador.** O portão de rollout é o campo `ready` em
  `public/js/data/vmconfig.js`; **só `grenade` é `ready: true`**. O jogador comum roda 100%
  no caminho **legado** (procedural/antigo).
- **Nenhuma família tem clipe de saque** (o branch `equip_rifle` do runtime está morto) e
  **13 de 16 famílias não têm clipe de disparo** (`docs/reports/VM-COMO-TESTAR.md`).
- 14 lanes paralelas trabalharam nisso. **Zero GLB de lane foi integrado a este tronco.**

### 2.2 A lane mais avançada (`claude/vm-unificado`, último commit 14/09, NÃO mesclada)

Está 422 commits à frente de `origin/main` e muda o quadro:

- **16 GLBs `*-hires.glb` versionados** em `public/models/viewmodels/coro/`, incluindo os
  três aprovados pelo dono nos bytes exatos da aprovação (ver §3).
- **`vmconfig.js` com TODAS as famílias `ready: true`** (zero `ready: false`).
- `docs/reports/VIEWMODEL-PLANO-PRODUCAO.md` (14/09): **13 armas no pipeline "golden"**
  (`ak m4 md97 scar famas m92 sks svd mosin lmg mp5 uzi p90`) com a mão aprovada e "escala
  convergida, erro 0,0%"; **7 ainda na família KINEMATION** (`awp shotgun carbine g3 pistol
  deagle revolver38`).
- `docs/reports/VM-DIAGNOSTICO-FECHAMENTO.md` (14/09): M92/SCAR/M4 (pentes), MD97 v12,
  MP5 v2, SVD (mão de apoio), Deagle e revólver v6 **integradas localmente com crítico
  independente**; shotgun (M3) **NÃO integrada** (luva atravessa guarda/porta na medição);
  Uzi e SKS pendentes de recarga e pega. E a ressalva da própria lane: *"Presença do GLB,
  `golden: true` e régua estrutural verde não significam aprovação. Aceite exige evidência nova
  no jogo em 3:2, crítico independente e Ruben jogando."* Há um "placar cego das 11 armas do
  dono" registrado em 14/09.
- Existe ainda `codex/viewmodels-catalog-final` com commits de 17–18/09 ("transição fora do
  mixer e cache-bust por bytes", "Onda 1 da retomada 17/09").

**E `origin/main` (17/09) tem ZERO GLB de viewmodel.** O jogador em produção nunca viu nada
disto. Tudo que se chama "pronto" nesta frente está em branch.

## 3. Por que "um mês travado" é um problema de INTEGRAÇÃO, não só de arte

Este é provavelmente o achado mais importante e o menos óbvio.

- `artifacts/` e `public/private-assets/` são **gitignorados no repositório inteiro**. Logo,
  os GLBs "finais" de família das lanes existem só no disco do worktree onde foram gerados e
  somem se o worktree for removido. Os doadores de animação CC0 (~40 GLBs) vivem em
  `~/Downloads`, **fora do repo** (`build_ak_hires_pilot.py:19` aponta para lá).
- Um commit chamado *"resgate: versionar 6 dias de viewmodels 1P que viviam só na working
  tree"* (`fc32ebb13`, 28/08) **copiou conteúdo em vez de mesclar as lanes**. Resultado: o
  tronco tem os arquivos (em versões velhas) **sem ter a ancestralidade**. O `git log` diz
  "não contém" enquanto o conteúdo parcial está lá. **Comparar por `git log` mente; só
  comparar por tamanho de blob revela a verdade.**
- Consequência, reconferida em 19/09 em 35 refs: **as três armas que o dono aprovou não estão
  no tronco da frente nem na `main`** — e são exatamente as três únicas que divergem:

| GLB | tronco (`feat/fps-paid-viewmodels-aaa`, `pr/464`) | versão aprovada (todas as 30+ lanes, `pr/468…584`) |
|---|---:|---:|
| `ak-hires.glb` | 2.347.396 B | **3.414.520 B** |
| `knife-hires.glb` | 1.057.476 B | **1.131.064 B** |
| `pistol-hires.glb` | 1.090.592 B | **1.090.704 B** |

Todos os demais GLBs de viewmodel são byte-idênticos entre tronco e lanes. O commit da AK
golden (`a23966970`, 31/08) não é ancestral nem do tronco nem da `main`. **Nada foi desfeito:
a entrega nunca chegou ao tronco** — ela está em `claude/vm-unificado`, esperando merge.

## 4. A linha do tempo dos erros — cada um com a causa raiz medida

### 4.1 Agosto/24 — BUG-75: "mãos genéricas que não parecem mãos"

Relato literal do dono: *"mãos genéricas que não se parecem nada com mãos, mal encaixe nas
armas, recarregar some com a arma ao invés de mostrá-la, péssimas animações, péssima
inclinação das armas"* (`KNOWN-BUGS.md`, BUG-75).

**Causa raiz:** o caminho servido criava `fpArm()` e `frontHand()` com **cápsulas** e prendia
essas peças diretamente em cada grupo de arma. O módulo que deveria fornecer braços rigados
estava **desligado por uma flag** (`FP_OFF = true`) e devolvia `null`. A recarga movimentava
apenas o **pivô global da arma** — não existia ação de mão indo ao carregador ou ao ferrolho.
Os cinco sintomas eram **um** defeito de arquitetura, não cinco offsets ruins.

### 4.2 Primeira correção — e a primeira régua cega

Entrou um rig FP CC0 (WRAD) com 30 ossos de dedo e IK por socket. A régua `eval:fp-rig`
(histórica — o script npm já não existe, sobrou `tools/eval/fp-rig-check.mjs`) deu **26/26
verde**, com mutantes `generico` e `recarga-global` reprovando.

**O dono reabriu:** *"parece o braço de uma pessoa deformada e não real"*.

**Por quê a régua não viu:** ela media **punho→socket** e a existência de fases inventadas em
JS. Ela **não media anatomia, silhueta, nem se mãos+arma+animação foram autoradas como um
único viewmodel**. Ficou **verde para a arquitetura errada**. Esta é a lição-mãe da frente.

### 4.3 Segunda correção — e o risco jurídico/estético

Passou-se a usar 18 GLBs doadores convertidos de pacotes CC0 do GoldSrc. A primeira
integração reutilizava **também as armas e texturas** — ou seja, entregava um **clone visual
do Counter-Strike**. Foi descartada.

Correção: o pacote CC0 é **doador de esqueleto, mãos e clipes mecânicos, nunca de aparência**.
Toda malha de arma doadora recebe `animationDonorOnly=true` e fica invisível; no mesmo osso
animado monta-se, por ID, o GLB próprio do jogo. Mutante `clone-cs` reprova se a arma doadora
reaparecer ou se uma textura de mão doadora sobreviver.

### 4.4 Agosto/24 → hoje — a divergência de câmera (AINDA ABERTA, mas não pelo motivo escrito no KNOWN-BUGS)

O dono reabriu de novo em 24/08: *"a bancada estrutural não é aprovação visual"* — screenshots
do jogo real mostram mãos e armas disformes e **enquadramento diferente do render do Blender**.

**O que o `KNOWN-BUGS.md` (linhas 1678–1683) ainda diz — e está obsoleto:** que o export usa
`use_selection=True`, deixa a câmera fora do GLB, e o JS recria a projeção pela regra HFOV 90
(VFOV 67,38° em 3:2). Isso foi verdade em 24/08. Desde `fc32ebb13` (28/08):

- `build_ak_hires_pilot.py:1461-1475` compõe com **VFOV 58°** (`sensor_fit VERTICAL`,
  `angle_y = 58°`, custom props `vertical_fov_deg = 58`, `reference_aspect = "3:2"`);
- `build_ak_hires_pilot.py:1524-1527` **seleciona a câmera antes do export e lança erro se
  ela não existir**;
- o `ak-hires.glb` (tronco e golden) **embute** `cameras[0].perspective.yfov = 58,00°` (lido
  do binário em 19/09);
- `public/js/authoredvm.js:230-236` **lança `embedded VIEWMODEL camera is missing`** se o GLB
  não trouxer câmera, e lê `authoredCamera.fov`.

**O defeito real, hoje:** `authoredvm.js:279` faz
`cameraFov: Math.max(cameraFov, frame.fov)` — e `FAMILY_FRAME.*.fov` é **84** para todas as
famílias. Logo os 58° autorados viram **84°**. Depois, `AuthoredViewModels.fov()`
(`authoredvm.js:378-387`) trata esse valor como válido em 16:9 e converte para o aspecto
corrente mantendo a **meia-tangente horizontal** constante. Resultado: **o navegador continua
não avaliando a composição aprovada no Blender** — mas o mecanismo é "clamp para o FOV da
família + reprojeção por aspecto", não "câmera perdida". O contrato exige que a câmera que
aprova o asset **seja** a do navegador e que a matriz de projeção seja comparada — **a
comparação ainda não existe** e o clamp contradiz o contrato.

### 4.5 Agosto/25–26 — os defeitos literais do piloto AK/AKM

Relatos do dono, e o que cada um ensinou (fonte: `KNOWN-BUGS.md` BUG-75, 25–26/08):

| relato literal | causa medida | régua que nasceu |
|---|---|---|
| *"o pente para no ar, e a arma que encaixa no pente e não o pente na arma"* | trajetória relativa arma↔carregador nunca amostrada | amostrar a animação real do GLB |
| *"quando atira o tamanho do pente diminui"* | escala do carregador instalado ≠ 1 durante `Shoot` | reprovar qualquer escala ≠ 1 no disparo |
| *"a mão de trás não está segurando no cabo de madeira"* | palma registrada no rifle e **só a cadeia do indicador era resolvida**; polegar, médio, anelar e mínimo continuavam na pose ABERTA do doador, formando uma plataforma sob o cabo | 5 cadeias envolvendo o cabo; 15 ossos da mão forte obrigatórios |
| *"o dedo fica no trigger mas não se movimenta"* | o alvo do indicador era **idêntico em todos os frames** de `Shoot` — o teste aceitava contato estático como disparo | curso ≥4°, retorno ≤1°; o GLB de 26/08 media 5,979°, a rodada final 5,1°; o mutante `--mutante-gatilho-estatico` **zera** o curso e a régua reprova |
| *"tem um buraco na frente, você vê um fundo azul quando olha pro céu"* | o mesh autorado terminava com **abertura interna** visível contra fundo claro | oclusor interno escuro obrigatório + mutante `--mutante-sem-oclusor-frontal` |
| *"quando clica pra mirar com zoom ela não fica mais de frente"* | o ADS herdava só a transformação genérica, sem alinhar o pacote autorado inteiro à linha óptica | ADS transforma o mount completo (arma+mãos); faixa de enquadramento com teto e piso |

Contato final medido do indicador ao gatilho: **0,722 mm**. Flash e boca coincidem em NDC.

### 4.6 Agosto/28 — a integração do pacote pago sem portão: 29 commits em 89 minutos

Foi integrado o **KINEMATION FPSAnimationPack Ultimate** (pacote Unity pago, Fab Standard
License). Reflog: 29 commits consecutivos entre 07:18 e 08:46 de 28/08, sem portão. A
integração trocou **25 de 26 armas pela malha genérica do pacote** e quebrou o resto. Quatro
causas, confirmadas lendo o binário dos GLBs **e o código**:

1. **Arma soldada no ar.** O script parenteava a arma ao **objeto** armature com matriz de
   rest congelada. Os clipes animam o **osso** `ik_hand_gun` — a arma ficava parada no espaço
   enquanto o braço se mexia. Conserto: bone-parent com compensação de tail; delta de posição
   ≤1e-6 m nas 15 famílias; baseline versionado + mutante.
2. **~300 MB redundantes de textura.** As mesmas 9 texturas de braço (18,3 MB) estavam
   embutidas em cada um dos 16 GLBs — **cada troca de arma baixava 23 MB**. Conserto: pasta
   `shared/` + placeholder 1×1 religado por nome. Família caiu para 2,9–7,5 MiB; catálogo de
   **345 para 68 MB**.
3. **Arma parada atirando.** 12 de 15 famílias sem clipe de disparo e o kick do caminho legado
   zerado. Conserto: recoil procedural a partir das curvas `RecoilAnimData` extraídas do
   pacote. Pico do AK medido no jogo **1,50°** contra 1,55° da simulação.
4. **`setAim()` era um no-op.** A mira simplesmente não fazia nada. Conserto: alça **medida**
   da arma própria alinhada ao eixo da câmera do viewmodel; desvio 0.000 em 16:9 e 3:2.

### 4.7 Setembro/07 — BUG-76, o bug que fez o dono reprovar "todas as lanes"

Este é o defeito mais caro da frente, porque **envenenou o julgamento humano**.

Três defeitos no mesmo caminho de código (`docs/reports/VM-ENCAIXE-MINT-2026-09-07.md`):

1. **Pack escondido sem malha para pôr no lugar.** A função de encaixe chamava
   `hidePackGun(entry)` **antes** de resolver o wrap e saía por `if (!wrap) return null`. Como
   a partida pré-carrega só as armas que sorteou, a família ficava **sem arma nenhuma pelo
   resto da sessão** — luva segurando o vazio.
2. **Wrap velho preso na mão.** Trocando para outra arma da MESMA família com o GLB ainda
   ausente, o wrap da arma anterior continuava visível: **a mão segurava a arma errada**.
3. **Substituição silenciosa pela AWP.** `weaponModel(id)` faz
   `_cache.get(id) || _cache.get('awp')`. Com a AWP carregada e a arma pedida não, o wrap saía
   **com o nome certo e a malha da sniper**. Medido: `mint_weapon_m92` com malha `sniper_1`,
   normalizada pelo comprimento declarado da Zastava. **Era a "arma gigante e errada" que o
   dono viu.** Atenção: **o fallback continua vivo em `public/js/weapons.js:338`**; o conserto
   (`4dc2025b7`) foi o guard `hasWeapon(id)` nos dois callsites (`vmweapon.js:170`,
   `game.js:1493`), não a remoção. Qualquer chamador novo reabre o bug.

**O que amarra os três: nenhum lança erro.** O jogo continua, o console fica limpo, e **qual
arma quebra muda a cada partida**. Por isso a revisão humana viu "todas as lanes quebradas" e
a investigação anterior diagnosticou "curva de mão da LMG" — diagnóstico **errado**: o frame
apontado como caso primário da LMG (`15.47.19`) **era a AWP** (confirmado em
`VM-MAPA-DAS-LANES.md` e nos commits de `glm/vm-lmg-final`). A reprovação da LMG usou 19
screenshots (`KNOWN-BUGS.md`, BUG-76).

Antes × depois (jogo real, 7 capturas por arma), "arma em quadro":

| arma | antes | depois |
|---|---|---|
| `awp` | 0/0 | 292/302 |
| `shotgun` | 0/0 | 300/302 |
| `revolver38` | 0/0 | 306/306 |

### 4.8 Setembro/08 — o mesmo bug no caminho legado, com alcance maior

O caminho legado (**o que realmente serve o jogador hoje**) montava a malha de **TODAS** as
armas uma vez só no boot, com o que estivesse em cache, e depois posicionava a mão pelo grip
da arma **pedida**. Resultado medido: **25 armas montavam a malha da AWP — inclusive a faca.**
Depois do conserto (`0f361d3e`): 0.

### 4.9 Setembro/09 — BUG-77 e BUG-78

- **BUG-77:** a peça separada (pente/ferrolho) ficava no tamanho **pré-normalização** — a AKM
  renderizava 20% maior (105,8 cm contra 88 declarados).
- **BUG-78:** o ajuste fino por arma (`trim.pos`) era **inerte**, porque a âncora do centro
  cancelava a translação. Com o trim finalmente valendo (commit `6b72c2674`), o contato
  mão↔arma caiu: `m92` 1,9→0,5 cm · `carbine` 1,7→0,4 · `tavor` 1,1–1,4→0,2–0,6 ·
  `sks` 1,5→0–0,5. Referência: a `ak` aprovada mede 0,2 cm em todas as capturas.

## 5. As cegueiras de INSTRUMENTO já pagas (isto vale ouro para a pesquisa)

Cada uma destas fez alguém acreditar num número errado por dias (código em
`tools/viewmodels/prep/vm-arsenal-frames.mjs` e `tools/eval/vm-arsenal-check.mjs`):

- **`entry.scene` pende de `vm.root`** — sem dedupe, a mesma malha era contada duas vezes.
- **Capturar 1,4 s depois da troca de arma** pega o equip **em voo**, não a pose estável.
- **Arma com luneta usa ADS em ALTERNÂNCIA** — soltar o botão não desmira; a captura media o
  estado errado.
- **Diagonal NA TELA não mede escala** — use diâmetro **3D**, que é invariante à pose.
- **Contato medido em PIXELS ordena errado** — use **centímetros em 3D**.
- **Orçamento GLOBAL de amostra** deixa arma de muitas malhas rala: use cota **por malha**,
  piso de 150 pontos. E **300 pontos põem o teto de contato dentro do ruído** (use 800).
- **Token por substring casa com o nó errado:** `arm` batia em `Armature` (pai de todo
  skinned mesh) — a régua classificava a **arma inteira** como mão. Ainda hoje `eMao` aceita
  `charging_handle` como mão (`VM-DIAGNOSTICO-FECHAMENTO.md`, achado 1).
- **Contar vértices por ARQUIVO e chamar de "mão"** — foi o erro da versão anterior deste
  documento (ver §6.2). Um GLB de família tem braços + mãos + arma genérica; um GLB golden tem
  mãos + mangas + arma própria + pente. Comparar totais é comparar coisas diferentes.
- **Diâmetro 3D de "mão" depende de qual malha a régua chama de mão.** A malha golden
  `Requests_Studio_Hands` é *as duas mãos + antebraços em bind pose*; a família separa
  `Hand-Tool1.008` de `Plane.004/005` (braços). O mesmo instrumento devolve números
  incomparáveis entre os dois pipelines.
- **Frame atribuído à arma errada vira régua que mede a coisa errada** (o caso da LMG × AWP).
- **Exceção legítima:** `sniper`/`bolt` **escondem o viewmodel de propósito** no ADS (luneta em
  tela cheia). "Arma não desenha" ali é o comportamento certo, não defeito.
- **GLB antigo ao lado do novo na mesma raiz de staging** faz a família carregar as duas
  coisas. Sintoma real: "a Mosin virou um objeto compacto com as mãos fora do quadro" —
  **era o staging, não o asset**.
- **Reimportar no Blender um GLB já montado não reflete o asset exportado** (causa não
  fechada). Mitigação: medir do jogo real (WebGL), nunca do reimport.
- **O exportador glTF do Blender 5.2** grava `EXT_texture_webp` **sem o campo `source`** — a
  imagem perde referência. Qualquer script que reexporte precisa da correção pós-export.
- **Régua estrutural passa, revisão humana reprova.** A LMG "final" passou em **todas** as
  réguas verdes e foi reprovada pelo dono por mãos fora do quadro na recarga.
- **Parágrafo de bug que ninguém fecha vira "fato" em todo documento derivado** — o caso da
  câmera (§4.4): o KNOWN-BUGS descreve um estado de 24/08 que o código de 28/08 já não tem.

## 6. ✅ O QUE DEU CERTO — AK, FACA E PISTOLA

Em 07/09/2026 o dono escreveu, literalmente: **"faca pistola e ak estao perfeitas"**.
São as três únicas aprovações humanas registradas da frente inteira até 09/09 (a lane
`vm-unificado` registra um "placar cego de 11 armas" em 14/09, ainda sem veredito final).

### 6.1 O denominador comum: são **pilotos hires bespoke**, não famílias genéricas

As três **não** saíram do pipeline do pacote pago. Cada uma é um **viewmodel autorado por
arma** — mãos, arma e animação construídas juntas, no Blender, para aquela arma — que é
exatamente o que o contrato `VIEWMODEL-1P-PROFISSIONAL.md` exige e que o pipeline de família
tentou atalhar.

A decisão foi formalizada em `GOLDEN-AK-DECISION.md` (31/08), aprovada por crítico
adversarial, e ela **descartou explicitamente o KINEMATION como fonte canônica**, porque ele
*"divide os quatro estados entre GLB da família, motions compartilhadas e recoil procedural"*.
**A fonte canônica é o piloto hires por arma.**

### 6.2 A AK — a "golden"

- Entrega: commit `a23966970` (31/08, em todas as lanes; **não** no tronco nem na main) com
  `GOLDEN-AK-DECISION.md`, `VIEWMODEL_CONTRACT.md`, +124 linhas no runtime e `ak-hires.glb`
  de **3.414.520 bytes**.
- É a **única arma no caminho "assado" (baked)**: a malha própria é **fundida dentro do GLB em
  tempo de autoria**, no Blender. O runtime fica "burro" — só procura o nó pronto. Isso
  **elimina de uma vez toda a classe de bugs do BUG-76** (encaixe em runtime, cache,
  fallback), porque não há encaixe em runtime nenhum.
- **O achado de 11/09** (`claude/vm-unificado`, `docs/VIEWMODELS.md` e
  `VIEWMODEL-PLANO-PRODUCAO.md §3b`): o defeito que o dono relatou como *"escala diferente das
  mãos/braços"* **não era escala — eram malhas de mão diferentes** entre a AK e o resto do
  arsenal. O dono confirmou em 11/09 que **a mão da AK é a certa**.

  Números **corretos**, lidos dos binários em 19/09 (a versão anterior deste documento
  comparava totais de arquivo e estava invertida):

| | malha | ossos do rig | vértices **só da mão/braço** | vértices do GLB inteiro |
|---|---|---:|---:|---:|
| **AK golden** (`ak-hires.glb`, 3.414.520 B) | `Requests_Studio_Hands` (luvas, 13.200) + `.001` (mangas, 5.088) — doador CC0 `ak-12animated.glb` | **77** | **18.288** | 24.818 (+ AK 4.869, pentes 783+782, alavanca 96) |
| **família KINEMATION** (ex.: `ak-baked-runtime.glb`) | `Hand-Tool1.008` (1.052) + `Plane.004` (2.836) + `Plane.005` (9.830) | **67** | **13.718** | 19.616 (baked) / 41.573 (`ak-runtime.glb`, com a AK-200 do pack de 27.855) |
| `ar-runtime.glb` (a família de MAIOR arquivo) | mesmos braços | 67 | 13.718 | 45.980 ← **este era o "45.980" da versão anterior** |

  Comparação de 11/09 da própria lane, contra os outros doadores de mão disponíveis:
  `Requests_Studio_Hands` 24.818 (arquivo) / 77 ossos · `free_fps_arms_gameready` 8.112 / 52 ·
  `fps_arms_gloved` 5.126 / 47 · `ARMS.blend` 4.555 / 43. Conclusão da lane: *"a aprovada
  ganha de 3 a 5× em geometria e 1,5× em ossos"*. **Ou seja: a mão aprovada é a de MAIS
  geometria e mais ossos, não a de menos.** Motivo adicional para mantê-la: a skin por time
  casa por **nome de material** (`CoroSolto_FP_Gloves`, `CoroSolto_*_Sleeves`) em
  `applyTeamHandMaterial` — trocar a mão quebra a skin.
- **Sobre o tamanho da mão em 3D:** a versão anterior dizia "AK 185 cm, demais 50–78 cm".
  **Sem procedência** — nenhum relatório, commit ou `frames.json` traz 185 cm; em todas as
  11 capturas 3:2 locais a `ak` mede `mao_diam3d_cm = 77,8`, igual a `akm`/`m92` (porque no
  tronco a `ak` roda a família KINEMATION, não a golden). O que é fato: no GLB golden o rig
  está escalado 2,39× e a malha de mãos tem bbox bruto de 3,70 m *incluindo os dois
  antebraços*; a régua atual não separa mão de antebraço. Qualquer "185 cm" seria bbox de
  malha, não tamanho de mão. **Não use esse número.**
- Enquadramento aprovado (em `a23966970` e nas lanes; o tronco ainda tem outro):
  `FAMILY_FRAME.ak = { x: 0.112, y: -0.068, z: -0.199, fov: 84, rotDeg: [0.6, -0.1, -5] }`.
- **Pendência declarada:** BUG-89 (comportamento em 16:9) segue aberto — o veredito do dono
  cobriu o recorte 3:2.

### 6.3 A faca — o pipeline bespoke fora do pacote pago

- Declarada no manifesto como `pipeline: "existing-self-contained"`. **Não usa KINEMATION.**
- Reutiliza o **rig, a mão e o material já aprovados da `pistol-hires.glb`** (rig de 52
  ossos, malha `armmesh_Mat_0`, câmera embutida de 29,24° VFOV) e combina com a faca própria
  do jogo. Câmera 3:2 e só as ações `Idle` / `Draw` / `Slash` / `Stab`.
- Um GLB externo de referência serve **só de estudo de ritmo** — nenhuma malha ou textura dele
  entra no arquivo final.
- Régua própria: `npm run eval:melee-vm`, com mutante `sem-construtor`.
- **Este é o padrão a seguir quando a mecânica de uma arma nova não cabe em nenhuma família:
  reaproveitar um rig JÁ APROVADO, não o doador genérico.**

### 6.4 A pistola

- **Correção de 19/09 (medida no jogo):** a pistola aprovada **não é o `pistol-hires.glb`**.
  Ela roda na **rota de família** — mãos KINEMATION (`pistol-runtime.glb`) + wrap da pistola
  própria + `FAMILY_FRAME.pistol = { fov: 55, rotDeg: [0, 15, -5] }` calibrado no navegador
  pelo dono (varredura 20°/15°/10°). `vmconfig`: `pistol: W('pistol', { baked: true,
  runtime: 'family' })`. O `pistol-hires.glb` (1.090.704 B, câmera de 34°) é o **piloto que
  entra 144× maior** e não é a rota ativa. Consequência para a pesquisa: das três aprovadas,
  só AK (58°) e faca (50°) têm câmera Blender; a pistola tem um frame calibrado à mão cujo
  fov 55 vale em 16:9 e vira 63,35° em 3:2.
- **Limitações declaradas pela própria lane, mesmo aprovada** (`VM-MAPA-DAS-LANES.md`): a
  composição é mais baixa que a referência (a caixa começa em y/H 0,70 na referência; a
  pistola mede 0,58) e **a pistola é pequena no quadro** — 0,73% de área, diagonal 12,6% contra
  44% da AK.
- **Regressão paga, que vale como aviso** (`BUG-VM-ESCALA-PISTOLA`, 11/09, em
  `claude/vm-unificado`): marcar `golden: true` na pistola a fez renderizar **144× maior** —
  arma de 3.743 cm, mão de 7.125 cm, contato de 14,1 cm. O piloto entra **sem a normalização
  da família**. Foi revertido para o caminho de família (22,9 cm / 0,10 cm). **Não remarcar
  sem calibrar escala.** Em 14/09 a pistola ainda é uma das 7 "na família".

### 6.5 O caminho que a lane já está executando (não é mais hipótese)

`claude/vm-unificado` levou 13 armas ao pipeline golden com **retarget por nome de osso** a
partir da mão aprovada e o melhor doador por classe de empunhadura:

| doador (em `~/Downloads`, fora do repo) | cobre |
|---|---|
| `ak-12animated` | rifles (4 ações: `Idle`, `Shoot`, `Reload`, `Equip`) |
| `fps_pistol_animated` | pistolas |
| `fps_animations_sniper_rifle` | snipers |
| `shotgun_animated` | escopetas |

São ~40 GLBs doadores em disco (`inspect_fps_glb_candidates.py` lista 10 candidatos),
**nenhum versionado** — o mesmo problema de procedência que §3 denuncia para os artifacts.

## 7. ❌ O QUE NÃO DEU CERTO — por arma

Estado em 09/09 (`VM-MAPA-DAS-LANES.md`, tronco), com a coluna do que `claude/vm-unificado`
mudou até 14/09:

| Arma | Estado em 09/09 | O que travou | `vm-unificado` 14/09 |
|---|---|---|---|
| `m4` | **REPROVADA** — a mais tentada e a que mais falhou | 4 iterações completas rejeitadas no portão visual + rodadas novas; a recarga seguia reprovada (*"está muito ruim"*). Resíduo: palma (6,625 mm) e polegar (4,555 mm) **atravessam o punho vertical** — limite material da malha da mão contra o cilindro do punho | integrada localmente (pente) com crítico; sem veredito do dono |
| `lmg` | **REPROVADA pelo dono** (07/09) | Passou em **todas** as réguas verdes e foi reprovada em revisão humana com 19 screenshots. Esclarecimento do dono: *"rifles e MGs já têm boa posição de arma — o que falta é as mãos no lugar certo"*. A métrica agregava as duas mãos e passava porque a **mão forte** tocava o punho, enquanto a **mão de apoio** não | no golden; vão de recarga 1,9 cm ainda aberto (caminho de animação) |
| `shotgun` | **REPROVADA** no portão visual | O cartucho perde contato com a mão / porta de carga; a captura de ADS não prova o estado sustentado | **NÃO integrada**: v8 aceita visualmente mas a luva atravessa guarda/porta na medição; receita de polegar só livre até t=.213 |
| `svd` | **CANDIDATA COM DEFEITO CONFIRMADO** | A lane autodeclarou `pronto:true` com gates verdes. Verificação **no jogo real**, fora da lane: *"viewmodel inteiro fora do quadro, de forma INTERMITENTE — 2 de 4 rodadas"*. O defeito que o dono reprovou, **só que intermitente, a forma mais cara de deixar passar** | integrada localmente (mão de apoio, cilindro sobre a luneta removido); vão de recarga 1,8–2,0 cm aberto |
| `mosin`, `sks` | candidatas aguardando | mesmo pacote da SVD, sob a mesma cautela | mosin no golden (vão 1,3 cm na recarga); SKS pendente de recarga e pega |
| `awp` | candidata, **nunca testada em runtime/browser** | evidência "asset-only". Ausência de reprovação ≠ aprovação | ainda na família |
| `rem700`, `g3sg1` | candidatas aguardando | gates verdes localmente, sem veredito do dono | sem registro |
| `m92`, `md97`, `carbine`, `scar`, `famas` | **SÓ RECEITA** em 09/09 | carabina tem alavanca e tubo sob o cano; FAMAS é bullpup (carregador **atrás** da mão forte); MD97 **não tem carregador no GLB bruto** | m92/scar/md97(v12)/famas no golden e integradas com crítico; carbine na família |
| `deagle`, `revolver38`, `mp5`, `uzi`, `p90`, `g3`, `m400`, `tavor` | **SEM LANE** em 09/09 | nenhum trabalho de nenhuma lane | deagle e revólver v6 integradas (peças móveis, tiro mecânico); mp5 v2 e p90 no golden; uzi pendente (doador nativo em investigação); g3 na família |

**Defeito estrutural que atinge quase todas** (`claude/vm-unificado`, `docs/VIEWMODELS.md:109`
— a régua `eval:vm-consistencia` **só existe nessa lane**): ela cobra que a arma tenha a peça
`parts.mag` separada onde a família anima o osso do carregador. Placar em 11/09: **2 de 24**
(só `ak` e `akm` declaram `parts`). **Esta é a causa de "puxa o carregador e ele não sai":** a
arma própria é uma malha **monolítica** (1 nó, sem peça nomeada) e o pente precisa ser
**recortado por caixa** no Blender. Em 14/09 a lane já recortou pentes para M92/SCAR/M4.

**Baseline de 11/09 (24 armas, 3:2, caminho autorado, `claude/vm-unificado`):**
- **tamanho aparente varia 2,8×** entre armas (px de diagonal ÷ cm declarado) —
  `VIEWMODEL-PLANO-PRODUCAO.md:291`. A "Onda C" da lane calibra por arma com alvo = a AK em
  **8,49 px/cm** e pronto = dispersão abaixo de ±10%. (Os percentuais por arma da versão
  anterior — p90 +80% etc. — não foram localizados em nenhum arquivo; não os use.)
- contato no idle (BUG-78, tronco, 09/09): `ak` 0,1–0,2 cm, `deagle` 0,3–0,5 cm; as demais
  ≤0,6 depois do trim.
- vão **só na recarga** segue aberto em `svd` (1,8–2,0 cm), `lmg` (1,9) e `mosin` (1,3) —
  commit `6b72c2674`. É caminho de **animação**; ajuste constante não resolve.

## 8. O pipeline atual, em resumo (para quem for propor mudança)

1. Extrair o pacote pago (`.unitypackage`) para fora do repo.
2. Blender monta o GLB base da **família**: importa braços/mãos doadores como `RIG_FP_ARMS`
   (exatamente **67 joints**), importa a arma genérica do pacote e a pendura no **bone**
   `ik_hand_gun`, cria a câmera do viewmodel, exporta.
3. Node funde os clipes restantes (reload tático/vazio, pump, shoot, inspect) convertendo FBX
   via Assimp, reamostrando a 60 Hz e escrevendo os tracks nos ossos por nome.
4. **Ou** (caminho da lane `vm-unificado`) "assar" **por arma**: importar a malha própria no
   `.blend`, alinhar por bounding-box, **fundir nos vértices**, recortar peças móveis por caixa
   medida e skinar cada peça 100% num osso real, criar sockets de boca e mira medidos na
   própria geometria, renderizar contact sheet antes de exportar; mão = `Requests_Studio_Hands`
   sempre, animação = melhor doador por classe, retarget por nome de osso.
5. De-dup de texturas compartilhadas; clipes genéricos compartilhados; parâmetros de recoil.
6. Validar: 67 joints (família) / 77 (golden), exatamente 1 câmera, socket a ≤2 mm do baseline
   versionado, clipes obrigatórios por família, integridade dos canais de animação.
7. Medir **no jogo real** com Playwright: projeta vértices de mão e arma na câmera do
   viewmodel e mede contato, diagonal aparente e espaçamento da amostra, em `idle`, `ads`,
   `fire` e 4 frames de recarga, em 3:2 e 16:9.
8. **Revisão visual adversarial humana** — e só então virar `ready: true`, família por família,
   nunca em lote. (A lane `vm-unificado` ligou todas de uma vez; o próprio documento dela diz
   que isso não é aprovação.)

**Obs. de ambiente relevante:** várias réguas de navegador ficam **fora** do `check:fast`
(`VM-PIPELINE-RECEITA.md` lista 10 sem script npm), e portão que não roda apodrece.

## 9. Pesquisa externa que JÁ foi feita (não repita)

Levantamento de 09/09/2026 (`docs/reports/VM-REFERENCIA-QUALIDADE.md`) sobre CS2 / CS 1.6 /
Valorant, com procedência marcada:

- **CS2:** `viewmodel_fov` default **60**, faixa 52–68 (fontes de comunidade divergem: 52 vs
  54); só afeta o tamanho aparente da arma, não o FOV do mundo. Offsets x/y/z existem, com
  presets Desktop/Sofá/Clássico. **Nenhuma fonte primária da Valve encontrada.**
- **Valorant:** FOV fixo em **103°** horizontal, não ajustável (decisão competitiva
  deliberada). ADS de Vandal/Phantom é zoom discreto de 1,25× — não é mira de ferro clássica.
- **Convenção de quadrante:** arma no inferior-direito, centro livre. **Consenso de design,
  sem especificação numérica publicada.**
- **ADS de sniper:** o viewmodel inteiro é **escondido** e substituído por overlay de tela
  cheia, em 1.6, CS2 e Valorant. É convenção do gênero.
- **Timings de comunidade:** CS2 AK draw ≈1,0 s, recarga ≈2,43–2,5 s. Valorant Vandal/Phantom
  equipar 1,0 s / recarregar 2,5 s; Bandit 0,75 / 1,5. **Nenhum dos dois jogos publica isso
  oficialmente.** (A lane `vm-unificado` já gravou timings CS 1.6 por família em
  `vmconfig.js` — campo `cs16: { draw, reload, shoot }`.)
- **Empunhadura (referência do mundo real, que é de onde a direção de arte AAA parte):**
  rifle = **C-clamp** (mão de apoio corre para a frente no handguard, polegar por cima);
  pistola = **thumbs-forward** (polegares lado a lado apontando à frente, base da palma
  preenchendo o vão do grip); escopeta = mão obrigatoriamente no fore-end.
- **"Mão solta":** não existe artigo com esse nome. O que existe é a moldura técnica —
  tutoriais de rig FPS descrevem **anexar a mão de apoio ao bone/IK-target da própria arma**
  exatamente para eliminar o sintoma; o erro clássico é a mão anexada ao **bone errado**
  (segue a câmera em vez da arma, ou vice-versa na troca).
- **"Smooth" vs. robótico:** o padrão é **chegar → ultrapassar (overshoot) → assentar
  (settle)**, cada estágio com amplitude e duração menores. O tell de robótico é interpolação
  linear sem ease, ausência de overshoot, e a mesma curva independente do peso da arma.

**RESULTADOS NEGATIVOS EXPLÍCITOS (buscamos e NÃO achamos):** fração de tela que a arma deve
ocupar (em nenhum dos três jogos, nem comunidade); ângulo do cano documentado; duração de
`inspect`; fator de escala aceitável entre armas da mesma família; tolerância em px para
contato mão↔arma. **Se a sua pesquisa achar qualquer um destes com fonte, é ouro puro.**

**Licenciamento de asset (já resolvido):** Poly Haven é CC0, seguro. Sketchfab e Fab exigem
checar o selo **por modelo** (CC-BY-NC / NC-SA / ND / SA **não servem** para jogo comercial
fechado). **GameBanana fica fora do pipeline comercial inteiramente** — é conteúdo extraído de
jogos comerciais hospedado sob notificação-e-remoção.

---

## 10. O QUE EU PRECISO DE VOCÊ (o pedido de pesquisa)

Você é um **diretor técnico de animação de FPS** com experiência real em viewmodels de
primeira pessoa. Não me dê um tutorial genérico de Blender. Considere que o time já sabe
modelar, rigar e medir — o que falta é **a decisão de arquitetura certa e o critério visual
que a valida**.

Responda com fontes sempre que possível, e **diga explicitamente quando não houver fonte**
(resultado negativo é resposta válida e útil aqui).

### Perguntas de primeira ordem

1. **A questão da mão — o que faz uma mão de 1ª pessoa "ler".** A mão que o dono aprovou
   (`Requests_Studio_Hands`, doador CC0, 77 ossos, 18.288 vértices em luvas+mangas) lê melhor
   que a mão do pacote pago KINEMATION (67 ossos, 13.718 vértices em mão+braços) e que os
   outros três doadores testados (8.112 / 5.126 / 4.555 vértices). Ou seja, aqui **mais
   geometria e mais ossos leram melhor** — mas ninguém sabe dizer se é a geometria, a
   silhueta, o material das luvas (a aprovada usa luva + manga, as outras pele nua ou luva
   sem manga), a proporção ou a pose de bind. **Na prática de FPS AAA, o que decide a leitura
   de uma mão de viewmodel?** Silhueta, contraste de valor luva/manga/arma, densidade de loops
   nos nós dos dedos, proporção exagerada de propósito, comprimento de antebraço no quadro?
   Existe literatura ou GDC talk sobre **exagero deliberado de proporção em mãos de
   viewmodel**? E como se MEDE "tamanho de mão" de forma comparável entre rigs cuja partição
   de malha é diferente (uma tem mãos+antebraços num mesh só; outra separa)?

2. **Assado (baked) vs. encaixado em runtime.** Nosso caso mostra que assar por arma elimina
   uma classe inteira de bugs (§4.7), e a lane atual está assando 13 armas uma a uma, com
   retarget por nome de osso a partir de uma mão única. Custa muito trabalho por arma. **Como
   os FPS comerciais resolvem isso em escala?** Um rig de mão único com arma anexada por
   socket em runtime, ou um asset autorado por arma? Qual é a prática real em CS2, Valorant,
   CoD, Battlefield, Escape from Tarkov, e o que muda entre eles?

3. **Mão de apoio, o defeito que nos derruba.** Nosso sintoma recorrente é a mão de apoio não
   encostar na peça certa (handguard, fore-end, pente) e o vão aparecer **só na recarga**
   (`svd` 1,8–2,0 cm, `lmg` 1,9, `mosin` 1,3). Ajuste constante não resolve — é caminho de
   animação. **Qual é a técnica de produção padrão:** IK com o alvo parenteado na arma,
   constraint por fase de animação, ou a mão autorada dentro do próprio clipe? Como se resolve
   quando a **arma muda de proporção** e o clipe é compartilhado entre armas da mesma família?

4. **Recorte de peça móvel em malha monolítica.** 22 das nossas 24 armas são um único nó, sem
   pente nomeado (`eval:vm-consistencia` 2/24). **Qual é o método de produção para separar
   pente/ferrolho/slide de uma malha monolítica de forma repetível e automatizável?** Recorte
   por caixa? Por vertex group semântico? Por segmentação geométrica? Existe ferramenta/addon
   estabelecido para isso?

5. **Câmera única, Blender ↔ navegador.** O asset é aprovado no Blender com VFOV 58° em 3:2 e
   a câmera **é** exportada no GLB (`yfov = 58°`). Mas o runtime faz
   `fov = max(cameraFov, 84)` e depois converte para o aspecto corrente mantendo a
   meia-tangente **horizontal** constante a partir de 16:9 — então o jogador nunca vê os 58°.
   **Qual é a forma canônica de consumir a câmera de viewmodel via glTF** de modo que a
   composição aprovada offline seja a que o jogador vê, e como se lida com **múltiplos
   aspectos (3:2, 16:9, ultrawide, celular)** sem reautorar a pose? Trava-se a meia-tangente
   vertical, a horizontal, ou reautora-se o offset por aspecto? Qual métrica de comparação
   (matriz de projeção, NDC de sockets) vira portão automático?

### Perguntas de segunda ordem

6. **Critério visual mensurável.** Já medimos: mão em quadro, arma em quadro, contato mão↔arma
   em cm 3D, diagonal aparente, escala dentro da família (dispersão de px/cm, alvo ±10%).
   **O que falta medir que realmente separa "profissional" de "amador"?** Existe alguma
   métrica publicada ou praticada (ocupação de tela, ângulo do cano vs. crosshair, velocidade
   angular do sway, curva de overshoot) que possa virar portão automático?

7. **Timing.** Não temos nenhuma régua de **duração** hoje — só capturamos instantes fixos.
   Quais durações e curvas (draw, recarga tática, recarga vazia, inspect) você recomendaria
   como faixa-alvo para um FPS de navegador com partidas de ~2 minutos, e como medi-las
   automaticamente num clipe glTF?

8. **Ordem de ataque e o portão de merge.** Situação real: 3 armas aprovadas pelo dono; uma
   lane não mesclada (422 commits à frente da main) já tem 16 GLBs golden versionados, 13
   armas migradas e **todas** as famílias `ready: true`; a `main` em produção tem zero
   viewmodel autorado; a shotgun e a uzi ainda não fecham; e a régua verde já enganou o time
   três vezes. **Se você tivesse que desbloquear isso em duas semanas, qual seria a
   sequência?** Mesclar e ligar só as 3 aprovadas? Ligar as 13 e aceitar defeito residual?
   Que portão de aceitação humano (quantas capturas, quais fases, quem julga) é razoável para
   um time de 1 pessoa + agentes, e existe referência de checklist de aprovação de viewmodel
   em estúdio?

9. **Referências concretas.** Aponte **breakdowns, GDC talks, threads de artistas, repositórios
   ou assets de referência** que mostrem um rig de viewmodel de primeira pessoa completo, com
   as quatro famílias de empunhadura (rifle, pistola, bolt-action, pump) e o contrato de
   sockets. Prefiro uma referência real e verificável a dez conselhos genéricos.

### O que NÃO preciso

- Tutorial de como abrir o Blender ou o que é um bone.
- Recomendação de comprar asset pronto genérico (já temos um, e foi ele que quebrou 25 armas).
- Conselho de "contratar um animador" sem dizer **o que** esse animador precisaria entregar.
- Números inventados. Prefiro "não encontrei fonte" a um valor plausível sem procedência.
