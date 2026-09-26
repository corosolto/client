# Fábrica de armas — viewmodel em primeira pessoa a partir do pack KINEMATION

**Branch:** `vm/fabrica` (sobre `vm/integracao-k`, #638) · **Estágio 1** · 23–24/09/2026.
Retrato datado: o estado vivo é o que `node tools/fabrica/qa.mjs` imprime.

## 1. O princípio (decisão do dono, 23/09)

A inconsistência das rodadas anteriores nasceu na **zona de contato**: braços e animações
KINEMATION com a arma do pack trocada por malha Mint — mão flutuando, pente voando, arma
invertida. A fábrica mantém, por arma, o pack **como autorado** nessa zona:

| Zona | O que é | De onde vem |
|---|---|---|
| **Contato** | punho, gatilho, lugar da mão de apoio, pente + poço, ferrolho/alavanca/bomba | pack: `SK_Arms_Mono` + a arma daquele chassi + a pose e as recargas dele (`A_FP_*` e `A_W_*`) |
| **Livre** | coronha, cano, casca do guarda-mão, miras, alça, acessórios | variável: peça rígida presa ao osso raiz da arma |
| **Identidade** | cor, material, nome | skins (`tools/fabrica/skins/`) |

**Política revogada.** Desde 24/08 (BUG-75) o pack era "doador, nunca aparência": a arma
KINEMATION ficava escondida (`hidePackGun`) e a Mint era encaixada por cima. O dono revogou
isso em 23/09: as armas do pack aparecem como autoradas; a identidade do jogo vem de skin,
nome e variante de zona livre. Nos produtos da fábrica `attachMintWeapon`/`hidePackGun`
nunca rodam (a chave `fab#<arma>` tem `#`, e o ramo da fábrica monta os sockets sem
encaixe). Nenhuma régua existente exige esconder a arma para esses produtos — elas iteram
`VM_WEAPON`; a régua de imagem `cobertura` reprovaria um produto da fábrica com a arma
escondida (área de arma zero). Nota no BUG-75 do `KNOWN-BUGS.md`.

## 2. Ponta a ponta

```
ficha.json ──► lib/plano.mjs ──► blender/montar.py ──► clipes.mjs ──► otimização ──► overlay privada
   │               (ficha + chassi)   (braço+arma+idle      (clipes do pack   (dedup/resample/    + manifesto
   │                                   +skins+zona livre     com nomes do      webp ≤1024;         + vmfabrica.js
   │                                   +câmera+sockets)      jogo)             sem meshopt)
   └─ chassi: tools/fabrica/chassis/<CHASSI>.json (chassi.mjs + blender/chassi.py)
```

```bash
node tools/fabrica/chassi.mjs AK                 # mede o chassi (uma vez por chassi)
node tools/fabrica/build.mjs tools/fabrica/fichas/ak.json
node tools/fabrica/enquadrar.mjs ak --aplicar    # posição do pacote contra a AK golden
node tools/fabrica/qa.mjs ak                     # gauntlet: réguas, capturas, crítico, regressão
```

Um build leva 4–12 s. É reprodutível: o mesmo insumo gera o mesmo sha256 (as cinco do lote 1 foram
reconstruídas e saíram byte a byte iguais), e o manifesto `tools/fabrica/fabrica-candidates.json`
grava o sha256 de cada insumo (FBX do pack, ficha, chassi, skin, peça de zona livre).

**Onde fica cada coisa.** Pack extraído (privado, nunca commitado):
`~/csbrasil-private-assets/sources/kinemation-fpspack/tree/…` (`tar -xzf` do `.unitypackage`,
cada GUID renomeado para o `pathname`). Trabalho: `…/generated/viewmodels-fabrica/trabalho/<id>/`
(plano, `base.blend`, `base.glb`, clipes crus, relatórios). Produto servido:
`…/generated/viewmodels-fabrica/overlay/viewmodels/fabrica/<id>-fabrica.glb`; a overlay é
hardlink da `viewmodels-integracao-k/overlay` mais os produtos da fábrica, e o worktree a
enxerga por `public/private-assets/viewmodels`.

### 2.1 Montagem (`blender/montar.py`)

1. `SK_Arms_Mono.fbx` + a pose do chassi (`A_FP_*_Pose`/`Idle`) como trilha `idle`.
2. A arma do chassi. A raiz do **arquivo** FBX é soldada na cabeça do `ik_hand_gun` (é o que o
   prefab do Unity faz: `Instantiate(prefab, weaponBone)`). Quando o FBX não tem vazio de raiz
   (KXG12_fixed), a fábrica cria o equivalente — sem isso a solda apagava a rotação de 180°
   da armadura e a escopeta montava **de trás para a frente** (achado de 23/09; a régua FB3
   tem esse caso como mutante).
3. **Um skin só.** Os ossos da arma entram no esqueleto do braço sob um osso novo `Arma`
   (o "Handle" do tutorial: filho do `ik_hand_gun`, toda peça rígida pesa 100% nele; pente,
   ferrolho, bomba e gatilho mantêm o osso do pack). O exportador glTF espalhava a arma quando
   ela era uma armadura pendurada num vazio preso a osso: ossos a ~80 cm e vértice sem peso
   colapsado na raiz. O `ak-runtime.glb` antigo do catálogo tem o mesmo defeito.
4. Skins: braço (seção 4) e arma (receita por material; sem receita, o `.mat` do Unity — cor
   **convertida de gama para linear** e textura pelo GUID). O `.mat` de cada material do FBX sai
   do mapa do próprio Unity: `externalObjects` do `.meta` do FBX (nome → `.mat`), depois
   `m_Materials` do prefab (slot → `.mat`), e só por último o nome igual. Sem isso KXG12, L96X,
   PDW90, MGX5 e DGL50 saíam cinza (o nome no FBX — `MG6`, `KSG_Body` — não é o do `.mat`).
5. Zona livre (variante): apaga vértices rígidos em caixas da ficha — **nunca** vértice de osso
   móvel nem dentro das caixas da zona de contato do chassi (+1 cm); importa as peças, recorta,
   posiciona na âncora e pesa 100% no osso `Arma`.
6. Sockets: `SOCKET_FAB_SIGHT` (AimPoint do prefab), `SOCKET_FAB_MUZZLE` (40 cm adiante na
   linha de visada), `SOCKET_FAB_UP` (10 cm acima: rolagem do ADS), `SOCKET_FAB_BARREL` (boca
   medida: flash e traçante), `SOCKET_WEAPON_<ID>` (raiz).
7. Câmera de autoria `VIEWMODEL_CAMERA` = câmera do `FPSPlayer.prefab` (Unity (0,012; 1,654;
   0,06), VFOV 80°), convertida para o Blender como x=−x, y=−z, z=y.

### 2.2 Clipes (`clipes.mjs`)

| Clipe do jogo | Fonte |
|---|---|
| `idle` | pose do chassi |
| `reload_tactical`, `reload_empty`, `reload_start/loop/end`, `pump`, `pump_empty` | pack (braço `A_FP_*` + arma `A_W_*`) |
| `shoot` | pack onde existe (X18, Kar98K, L96X, MGX5, DGL50, Viper-357); nos outros é **coice procedural** do runtime (`vmrecoil.js` com as curvas `RecoilAnimData` do pack, `recoil.json`); a KXG12 toca a bomba |
| `equip_rifle` | geral `A_FP_Rifle_Equip` (fuzil, ferrolho, smg, lmg, escopeta); pistola usa o arco de saque do runtime (o pack só tem `A_FP_Pistol_UnEquip`) |
| `inspect` | ausente (o pack só tem inspeção na PDW90) |
| câmera `A_Cam_*` | não usada no estágio 1 (o shake de câmera do jogo continua o `camShake` da família) |

Três armadilhas do pack, cada uma virou código com comentário:

- **Braço:** os FBX de braço são ASCII (o Blender não abre). Assimp → GLB, reamostrado a 60 Hz,
  raiz FBX dobrada nos ossos de topo (herdado do `assemble_paid_family`).
- **Arma, referencial:** o importador FBX do Blender inventa a orientação de cada osso por
  arquivo, e o GLB do clipe sai com a armadura em Y-up. O rebase local antigo aplicava o
  deslocamento no referencial errado — o slide e o pente do X18 voavam. A fábrica mede a
  **deformação** de cada osso no espaço da armadura da fonte, leva ao osso `Arma` pela conversão
  Y-up (conferida pelas cabeças dos ossos: resíduo 0 cm nos quatro chassis; Kabsch só como
  recurso, porque ossos colineares — AK, KXG12 — não determinam rotação) e reaplica sobre o
  repouso do alvo.
- **Arma, tempo:** os FBX de arma do pack misturam 30 fps (KXG12, MX16A4) e 60 fps (AK, X18). O
  conversor antigo forçava 60 fps (clipe pela metade) e o montador esticava tudo para caber no
  braço. A fábrica mantém o fps do arquivo e toca braço e arma cada um no seu comprimento — como
  os dois animadores do Unity (`AC_FPS_Character` e `AC_FPS_Weapon`, velocidade 1). Com isso as
  durações batem com o braço em ±1 quadro (AK 2,550/2,533 s; MX16A4 2,700/2,667 s); só o X18 é
  autorado mais curto na arma (1,467 × 2,317 s), e fica assim.

### 2.3 Runtime (`public/js/authoredvm.js`, `data/vmconfig.js`, `data/vmfabrica.js`)

- **Só na revisão:** `/?vmauthored=1&vmfabrica=m4,g3` (ou `=1` para todos de `VM_FABRICA`). A
  `ak` não está em `VM_FABRICA`: o dono manteve a golden aprovada (24/09).
  Sem `ready`, `VM_LAUNCH` continua `false`; fora do parâmetro nada muda.
- Chave `fab#<arma>` → `/private-assets/viewmodels/fabrica/<arma>-fabrica.glb?v=<VM_FABRICA_BYTES>`.
- **Frame:** rotação e FOV **únicos** para todas as armas (`VM_FABRICA_FRAME`, o frame da AK K,
  que foi ajustado contra a golden) — a composição do pack é a mesma em todo chassi; só a
  **posição** do pacote é resolvida por chassi (`VM_FABRICA_POS`, gerado por
  `tools/fabrica/enquadrar.mjs`), para a arma ocupar o que a AK aprovada ocupa. Variante herda
  a posição do produto puro do chassi (`enquadramentoDe`). Curta usa o frame da PT-38 aprovada.
  Lote 2: o `enquadrar.mjs` também conta os vértices da **ponta da manga** no quadro, em todos os
  clipes (9 frações cada), e penaliza; quando só uma lente mais fechada tira a manga sem encolher
  a arma, o chassi ganha `fov` próprio (awp 44°, mosin 50°). A LMG tem guinada 0 (a pose do
  MGX5 fica achatada com os 7,69° únicos).
- **ADS pelo pack:** o eixo `SIGHT→MUZZLE` (linha de visada do AimPoint) vai ao eixo óptico, a
  **rolagem** é zerada por `SOCKET_FAB_UP` (o pack alinha a rotação inteira do AimPoint — sem
  isso AK/M4/KXG12 tombavam 16–24° no ADS) e a alça fica a `alivio` metros do olho
  (−`aimPointOffset.z` do Settings: AK 0,3; MX16A4 0,1; X18 0,2; KXG12 0,1).
- **Manga:** a extensão do `vmsleeve.js` fica **desligada** por produto (`manga:false`): o
  `SK_Arms_Mono` já traz a manga até o ombro. Provado por `eval:vm-manga-oca --fabrica` e
  `eval:vm-manga-tela --fabrica` (seção 6).
  No lote 2 a extensão foi ligada para esconder a boca da manga e o crítico cego viu um **tubo
  rosa translúcido** do antebraço cruzando a câmera da escopeta; o `vm-manga-tela` não pegou
  (lacuna da régua: ela mede a boca, não a extensão atravessando o olho). Voltou `manga:false`
  em todos, e a boca sai do quadro pelo enquadramento.
- **Mãos por time:** os materiais de braço se chamam `CoroSolto_FP_{Cloth,Glove,Hand}`; o
  sistema de mãos por time (`vmhands.js`, atlas pintados nas UVs do `SK_Arms_Mono`) tinge por
  cima, na mesma escala, como na AK K e na PT-38.
- Recuo: `recoil.json` da família do chassi (ak←AK, ar←MX16A4, pistol←X18, shotgun←KXG12).
  Na escala do pack o coice de quadril saía ilegível (0,9–2,9% da diagonal da arma; a golden AK
  dá 3,6% só no mount). `recoilScale` por produto leva todas a 4–7%, medido por
  `tools/fabrica/captura/coice.mjs` (centro da arma como ponto fixo do mount, pela vmCamera,
  5 tiros); a deagle **desce** para 0,45 (47% → 18%, o mesmo 0,45 da deagle golden). O cache do
  recuo era por família e deixava ak↔akm com a escala da arma anterior: a chave é família@escala.

## 3. A ficha

```jsonc
{
  "id": "famas",                 // produto (= arma do jogo)
  "arma": "famas",
  "chassi": "MX16A4",            // tools/fabrica/chassis/MX16A4.json
  "skinBraco": "coro-ak",        // tools/fabrica/skins/braco-coro-ak.json
  "skinArma": "famas",           // tools/fabrica/skins/arma-famas.json (null = cores do pack)
  "clipes": {                    // nome do jogo → "pack:<clipe>" | "geral:rifle_equip" | "procedural" | "ausente"
    "reload_tactical": "pack:reload_tactical", "shoot": "procedural", "inspect": "ausente"
  },
  "removerZonaLivre": [ { "nome": "coronha-m4", "min": [-5, 17.5, -17], "max": [5, 43, 5] } ],   // cm, raiz da arma
  "zonaLivre": [ {
    "peca": "alca", "fonte": "public/models/weapons/famas.glb",
    "recorte": { "min": [-0.26, -1, 0.055], "max": [0.17, 1, 1] },       // m, no GLB da peça
    "centrar": ["max", "center", "min"],                                  // origem da peça no recorte
    "ancora": { "pos": [0, 9.0, 0.8], "rotDeg": [0, 0, 90], "escala": 0.758 }  // ou "trilhoSuperior" etc.
  } ],
  "mira": { "raizCm": [0, 8.0, 10.4] },   // opcional: linha de visada da variante (substitui o AimPoint)
  "enquadramentoDe": "m4",                // opcional: variante herda a posição do produto puro
  "idleArma": "reload_start",             // opcional: pose de idle da ARMA do pack ("pack" = A_W_*_Pose/Idle;
                                          //   "<clipe>" = quadro 0 dele — Kar98K guarda a munição assim)
  "ocultar": [ { "osso": "Gauge", "clipe": "reload_loop", "de": 0.73, "ate": 0.88 } ],
                                          // opcional: peça do pack escondida (escala ~0) numa janela do clipe
  "alinharTempo": ["reload_loop"],        // opcional: arma no comprimento do braço (clipe em laço)
  "recuo": { "familia": "ar" }
}
```

### 3.1 Como acrescentar uma arma

1. `node tools/fabrica/chassi.mjs <CHASSI>` se o chassi ainda não tem ficha (`tools/fabrica/lib/chassis-pack.mjs` diz qual FBX é a arma e qual é a pose).
2. Escreva `tools/fabrica/fichas/<arma>.json` (copie a do chassi puro mais próximo).
3. Variante: `node tools/fabrica/blender/perfil.py` desenha o chassi (`--fbx`) e a peça (`--glb`) com grade em cm — é daí que saem as caixas de remoção, o recorte, a âncora e a escala. A zona de contato do chassi é protegida mesmo que a caixa a cubra (o relatório conta os vértices protegidos).
4. `node tools/fabrica/build.mjs tools/fabrica/fichas/<arma>.json`, depois `node tools/fabrica/enquadrar.mjs <arma> --aplicar` (produto puro).
5. Some a arma a `VM_FABRICA` em `public/js/data/vmconfig.js` (família, chassi, `alivio` do Settings).
6. `node tools/fabrica/qa.mjs <arma>`; o crítico cego julga o pacote `artifacts/fabrica-lote1/critico/<arma>/`.

## 4. Braço

Uma skin para todas as armas: `braco-coro-ak` — manga azul Mandrake e luva escura da AK
aprovada (fatores de cor e rugosidade de `CoroSolto_FP_Gloves`/`CoroSolto_Mandrake_Sleeves` da
`coro/ak-hires.glb`) com o relevo do próprio pack (os UVs do `SK_Arms_Mono` não são os do rig
da golden). É a **base neutra**: no jogo, o sistema de mãos por time pinta por cima (é o que o
dono pediu: mãos diferentes por time, na mesma escala). A página do lote mostra a AK golden
(rig A) ao lado da AK do pack para o dono decidir entre manter a golden ou padronizar.

## 5. Chassis

`tools/fabrica/chassis/<CHASSI>.json` (20 chassis do pack, medidos): tudo em cm no
referencial da raiz do FBX da arma, na pose de idle do pack.

- **Eixos conferidos:** frente = lado da boca (o extremo longe da palma forte); cima = o lado em
  que o AimPoint cai no alto da arma (a heurística "pente abaixo da palma" virava G3, Mk14, SVD,
  MPS5 e M1911, cujo punho desce mais que o pente).
- **Linha de visada:** AimPoint do prefab (`Prefabs/<arma>.prefab`), com conferência de altura
  contra o topo da arma (AK 5,28 × 5,29 cm; MX16A4 5,0 × 5,6; X18 1,45 × 1,49; KXG12 7,8 × 8,2).
- **Zona de contato:** palma forte e palma de apoio (média de `hand_*` e `*_01_*`) com a caixa
  da malha a 7 cm; caixa de cada osso móvel (vértices com peso dominante nele).
- **Âncoras da zona livre:** `boca` (extremo estático no eixo do cano), `coronha` (12 cm atrás
  da palma forte), `trilhoSuperior` (topo sobre o poço do pente), `guardaMao` (caixa entre a mão
  de apoio e a boca), `mira` (AimPoint).
- Também: settings (`fireRate`, `aimFov`, `adsBlend`, `aimPointOffset`, `ikOffset`), câmera do
  `FPSPlayer.prefab`, clipes do pack por nome do jogo e texturas por GUID.

Conferência pendente (fora do lote 1): **Kar98K** (a malha vem dentro de `A_W_Kar98K_Pose.FBX`;
mira −2,5 cm contra topo 17,5 cm — o FBX de pose traz o clipe de munição no alto) e **Kolibri**
(é a micropistola de 2,7 mm, 8 cm de comprimento, não submetralhadora).

## 6. QA — o gauntlet da fábrica (`tools/fabrica/qa.mjs`)

Por arma, nas duas proporções (3:2 do dono e 16:9):

| Etapa | Régua | O que prova |
|---|---|---|
| produto | `tools/fabrica/reguas.mjs` FB1–FB4 | cache por bytes, estrutura (skin, clipes, câmera, sockets, mãos), orientação (boca longe do olho), palma forte na arma — mutantes `cache-velho`, `sem-socket`, `invertida`, `mao-solta` mordem |
| manga | `eval:vm-manga-oca --fabrica`, `eval:vm-manga-tela --fabrica` | a manga inteira do pack dispensa o `vmsleeve` |
| imagem | `vm-reguas-check` (#636) mira, cobertura, pistola-ref, mãos, carregador — `VM_PALCO_QS=vmfabrica=<id>` | o quadro que o jogador vê |
| repetição | `eval:vm-carregador-repete` (#641) | a amostra do carregador não depende de render entre passo e medida |
| figura | `tools/fabrica/captura/kcap.mjs` (3:2 e 16:9) + vídeo (`arsenal-video-capture`) | idle, ADS, tiro, recarga, inspeção, depois de saque e ADS assentarem |
| crítico | pacote `critico/<id>/` para o agente `critico-visual-vm` | quem constrói não dá a nota |
| regressão | `eval:vm-cache`, `eval:vm-launch`, `eval:vm-rig`, `eval:vm-orientacao`, `eval:vm-manga-oca`, `eval:vm-placar` | o arsenal que já existia continua igual |

A dívida de `tools/eval/vm-reguas-divida.json` é dos produtos antigos: **não** desculpa produto
da fábrica (o `qa.mjs` conta DÍVIDA como vermelho).

Resultado do lote 1: seção 8.

## 7. Plano B — modo animador (FAMAS e TAVOR bullpup, 24/09)

Para arma cuja zona de contato o pack não tem (bullpup: pente **atrás** do punho), a zona de
contato é **re-autorada**, não trocada. Produtos: `famas` e `tavor` (`fichas/famas.json`,
`fichas/tavor.json`, chaves em `tools/fabrica/animador/<arma>.json`). Do chassi MX16A4 ficam o
braço `SK_Arms_Mono`, a pose da mão forte no punho, a câmera, o saque geral e o coice
procedural; o resto é novo:

```
ficha (malhaPropria + animador) ──► montar.py (malha do jogo no osso Arma, peças móveis por ilha)
   ──► animador.py (idle re-posado + reload_* por chave, IK analítico, 2º pente, régua do laço)
   ──► clipes.mjs (saque do pack + correção idle_pack⁻¹·idle na mão de apoio) ──► otimização
```

- **Malha própria** (`ficha.malhaPropria`, `montar.py malha_propria`): a malha da arma do pack sai
  inteira; entra o modelo de mundo do jogo (`public/models/weapons/<arma>.glb`, 0 crédito Mint),
  soldado, posto na raiz do FBX (`posCm`/`rotDeg`/`escala`: a palma forte do MX16A4 cai no meio
  do punho da arma nova) e pesado 100% no osso `Arma`. Peças móveis = ilhas cuja caixa cabe na
  caixa pedida (contagem de vértices conferida): pente → `Mag`, alavanca da FAMAS →
  `ChargingHandle`, retém da TAVOR (paleta atrás do pente) → `BoltRelease`; o pivô do osso vai ao
  alto da peça. `material` troca o metálico 1 do modelo de mundo (cromado no viewmodel) por
  polímero, mantendo a textura base. `mira` e `boca` são da arma nova (linha de visada da alça).
- **Animador** (`blender/animador.py`): FK próprio sobre o repouso do rig (sem depsgraph; mesmo
  insumo → mesmos quadros), IK analítico de dois ossos nas duas mãos com o giro do antebraço
  dividido ao meio. Por quadro: (1) apresentação da arma — giro em eixos de câmera em torno da
  palma forte + translação (`arma`); (2) mão forte presa ao punho pela relação do idle; (3) mão de
  apoio por chaves (`mao`: `idle`, `armaCm` na raiz da arma, `camCm` na **câmera do jogo**,
  `poco` = segurando o pente a `[dx,dy,dz]` cm do encaixe, `fecho` dos dedos); (4) mecanismos
  (`mecanismos`: deslocamento em cm na raiz); (5) pentes (`pentes`: `arma` com `deslocCm`, `mao`, `largado` (fica onde a mão soltou),
  `cai` com velocidade/giro e gravidade, `escondido`). Todas as chaves de todos os ossos são
  gravadas (trilha NLA sem osso solto).
- **Idle re-posado:** o idle do pack com a mão de apoio levada ao guarda-mão da arma nova
  (`idle.maoApoio.palmaCm`); a trilha original vira `idle_pack` e o `clipes.mjs` aplica a mesma
  correção local (`idle_pack⁻¹·idle`) ao saque geral, que termina no idle novo; `idle_pack` sai do
  produto.
- **Câmera do jogo:** o build passa ao animador o frame da arma (`VM_FABRICA_FRAME` +
  `VM_FABRICA_POS` + `VM_FABRICA[arma].frame`); a câmera do jogo é a de autoria ∘ inverso do
  mount do `authoredvm.js`. É nela que `camCm` e o "fora da tela" (3:2 e 16:9) são medidos —
  a câmera de autoria do pack fica ~26 cm atrás, sobre o pente do bullpup, e engana.
  `render.py --frame=<json>` desenha pela mesma câmera (`trabalho/<id>/frame-jogo.json`).
- **Truque do segundo pente:** `Mag2` é cópia do pente num osso irmão, **coincidente** com o pente
  no repouso (invisível: mesma malha no mesmo lugar em todo clipe do pack). Na recarga: o reserva
  some coincidente, reaparece na mão **fora da tela**, sobe à vista, bate/empurra o pente velho
  (que cai com gravidade até sair do quadro), encaixa; fora de vista o velho volta ao encaixe
  escondido (escala 0 só enquanto viaja) e cresce dentro do reserva. Nenhuma troca de pai.
- **Régua do laço** (`animador.json`, o build **falha** nela): por quadro, palma de apoio e
  palma forte à arma, erro do IK e, por pente, visível / na tela (câmera do jogo, 3:2 e 16:9) /
  distância à palma; reprova pente que **some na tela** fora da coincidência e pente que **surge
  na tela** fora da coincidência.
- **Régua de imagem `carregador` com reserva** (`vm-reguas.mjs`, `CARREGADOR_PECA` com
  `reserva: 'Mag2'` para famas/tavor no modo fábrica): mede os dois pentes por amostra. Vale:
  no encaixe (mesmo fora do quadro — no quadril do bullpup o poço fica sob a câmera), na mão,
  caindo, fora do quadro. Reprova: objeto no meio do ar, mão de apoio na tela sem pente na mão e
  sem pente no encaixe, pente que some/surge na tela fora da coincidência, recarga sem pente na
  mão. Mutantes `reserva-solta` e `reserva-some` (famas) têm de reprovar.

Iterar: `tools/fabrica/captura/quadros.mjs` (jogo real: idle, ADS, tiro, recargas em frações,
saque, folha de contato) e `render.py --frame` (Blender, sem navegador).

### 7.1 Lote bullpup (24/09) — resultado

Produtos (overlay privada `…/generated/viewmodels-fabrica-bullpup/overlay/viewmodels/fabrica/`;
hardlink da overlay da fábrica + os dois produtos), reprodutíveis (rebuild byte a byte igual):
famas `29f877cdb2` 2,16 MiB · tavor `403658a972` 2,16 MiB (sobre `vm/fabrica` com o lote 2). Recarga 2,4 s (FAMAS) e 2,3 s (TAVOR),
o tempo de `weapons.js`: o runtime toca o clipe em ≈1×.

Réguas (`node tools/fabrica/qa.mjs famas,tavor --lote=fabrica-bullpup`), 3:2 / 16:9:

| arma | produto FB1–4 | manga-oca | manga-tela | mira | cobertura | mãos | carregador (reserva) | repete |
|---|---|---|---|---|---|---|---|---|
| famas | ✓ | ✓ | ✓ 5% | ✓✓ 21 px | ✓✓ 0,94/0,96× AK, braço 1,01× | ✓✓ 0,09 | ✓✓ | ✓ |
| tavor | ✓ | ✓ | ✓ 9% | ✓✓ 17 px | ✓✓ 0,93/0,96× AK, braço 1,29× | ✓✓ 0,08 | ✓✓ | ✓ |

Mutantes: `cache-velho`, `sem-socket`, `invertida`, `mao-solta` (produto) e `reserva-solta`,
`reserva-some`, `pente-pisca` (carregador com reserva) — os sete mordem. Regressão: `eval:vm-cache`,
`eval:vm-launch`, `eval:vm-orientacao`, `eval:vm-manga-oca`, `eval:vm-placar` verdes; placar do
#636 re-medido nas 26 armas (16:9: p90 carregador vermelho→verde, produto antigo sem reserva; 3:2: awp
cobertura oscila 0,93↔0,95×, verde);
`eval:vm-rig` vermelho igual na base ("ak: produto ausente", §8). Sob carga (load ~35) a régua
`mira` 16:9 mediu duas vezes o quadril como ADS (230 px, +67°, socket 0,96 NDC) — a mesma
assinatura intermitente da M4 no lote 1; re-medida com a máquina mais leve: verde.

Crítico cego (três rodadas, contexto limpo, só pixel):

| rodada | famas | tavor | o que mudou depois |
|---|---|---|---|
| r1 | RESSALVA — aro da FAMAS 80 px abaixo da cruz no ADS; pente nunca visto fora da arma | RESSALVA — pente nunca visto fora; pente "tábua" (malha Mint) | mira 9,6→9,3; reserva mostrado ao lado do poço |
| r2 | RESSALVA — dois pentes juntos (reserva chega antes de o velho sair); guinada ~60° com a coronha enorme | RESSALVA — idem | vazia: velho cai primeiro; tática: a mão tira o velho e volta com o reserva; menos guinada |
| r3 | **RESSALVA** — recarga com a arma de lado, boca a ~55 px da cruz e coronha no terço direito; o reserva entra pela frente do punho antes de encaixar; saque-15 sem mão | **RESSALVA** — na recarga a TAVOR fica grande (~125–130% da AK) e em vazia-075 (retém) corpo e mão passam perto da cruz; no ADS não aparece mão | — (limite de três voltas) |

O crítico registra como certo nas duas: idle a ~1° do eixo da AK, mão de apoio no guarda-mão,
**pente atrás do punho** (bullpup de verdade), pente velho sai inteiro e cai visível na vazia,
na tática a mão tira o velho e traz o novo, sem pente duplo nem peça solta; ADS da TAVOR com o
aro na cruz. Não decidiu o ADS da FAMAS (topo da massa a ~15 px; um anel abaixo a ~45 px que
pode ser o protetor da massa). Fora do viewmodel: o HUD enche o pente já aos ~25% da recarga.

Revisão antes do push (contexto limpo) achou e ficou consertado: o Mag2 contava como "corpo da
arma" na régua (repouso nunca reprovava por deslocamento), o caminho com reserva não tinha
fantasma nem gravava o estado (o `vm-carregador-repete` comparava vazio), "surge na tela" só
valia com a mão de apoio na tela, e a câmera do jogo usava a ordem de Euler do Blender (0,88°).
Aberto: as checagens de tela do animador usam o centro da peça; `FABRICA_PRIVADO` é o único
isolamento entre worktrees (sem ele o build escreve na overlay do lote 1).

**O plano B serve para outras variantes?** Sim, como ferramenta: montar (malha própria por
ilhas) → animador (IK, câmera do jogo, segundo pente, régua do laço) → réguas verdes saiu em
três voltas por arma, e o crítico nunca reprovou. O que ele não entrega sozinho é a
coreografia: as chaves são autoradas à mão e o gosto (quanto girar a arma, onde a mão entra)
leva voltas de crítico; a malha de mundo low-poly limita o acabamento (o pente da TAVOR). Para
carabina de alavanca e UZI (pente no punho) o mesmo fluxo vale; conta ~1 dia por arma.

## 8. Lote 1

Produtos (overlay privada `…/viewmodels-fabrica/overlay/viewmodels/fabrica/`), reprodutíveis
(rebuild byte a byte igual): ak `fc35d572e2` 3,58 MiB · m4 `c500cfe632` 3,97 MiB · famas
`0a30d2d41b` 3,97 MiB · shotgun `46990c2d6f` 2,89 MiB · pistol `4c9e3a1a29` 2,60 MiB.

Réguas (`node tools/fabrica/qa.mjs todas`, 24/09). ✓ verde · ✗ vermelho · · n/a. Célula = 3:2 / 16:9.

| arma | produto FB1–4 | manga-oca | manga-tela | mira | cobertura | pistola-ref | mãos | carregador |
|---|---|---|---|---|---|---|---|---|
| ak | ✓ | ✓ | ✓ | ✓✓ 2 px | ✓✓ 0,90× AK | ·· | ✓✓ 0,10 | ✗✗ |
| m4 | ✓ | ✓ | ✓ | ✓ ✗* 2 px | ✓✓ 0,89× | ·· | ✓✓ 0,08 | ✓✓ |
| famas | ✓ | ✓ | ✓ | ✗✗ 26 px, eixo −23° | ✓✓ 0,91× | ·· | ✓✓ 0,08 | ✓✓ |
| shotgun | ✓ | ✗ | ✓ | ✓✓ 3 px | ✓✓ 0,96× | ·· | ✓✓ 0,04 | ✗✗ |
| pistol | ✓ | ✓ | ✓ | ✓✓ 1 px | ✓✓ 0,99× PT-38 | ✓✓ 0,99× | ·· | ✓ ✗† |

- **ak carregador:** a recarga vazia do pack deixa o pente velho cair à vista (15%: 2,8 palmas da
  mão, fora do encaixe) — "objeto no meio do ar" para a régua; é o pack como autorado.
- **\* m4 mira 16:9:** intermitente — 1 de 3 medições reprovou, sempre com a mesma assinatura
  (234 px, eixo +64°, socket da alça a 0,83 NDC): é o quadril medido como ADS (a arma ainda não
  tinha entrado em mira no quadro amostrado). As outras duas: 2 px, +1°.
- **famas mira:** massa a 26 px (dentro do teto de 30), mas a régua lê a arma tombada 23–26° no
  ADS: a linha de visada da FAMAS passa por cima da alça, 10 cm acima do cano, e o que aparece no
  ADS é a alça em perspectiva.
- **shotgun manga-oca:** 1 vértice da boca da manga entra na borda do quadro em `reload_loop` 62%
  (3:2); com a extensão do `vmsleeve` desligada. **shotgun carregador:** o cartucho (osso `Gauge`)
  fica a 1,3 palma da mão aos 43% da recarga tática, na tela.
- **† pistol carregador 16:9:** "tira no ar" — a mesma régua instável já registrada para a PT-38
  aprovada (fila R1); em 3:2 verde e `eval:vm-carregador-repete` verde.
- `eval:vm-carregador-repete` (#641): verde nas cinco (diferença 0,000 palma com e sem render).
- Mutantes do produto: `cache-velho`, `sem-socket`, `invertida`, `mao-solta` — os quatro mordem.

**Regressão do arsenal** (o que já existia): placar do #636 re-medido nas 26 armas depois das
mudanças — 16:9 igual (0 de 130 células mudou), 3:2 com duas melhoras (carregador de shotgun e
deagle, coerentes com a pose fresca do #641); `eval:vm-placar`, `eval:vm-cache`,
`eval:vm-launch` (VL6), `eval:vm-orientacao` e `eval:vm-manga-oca` verdes. `eval:vm-rig`
vermelho **igual na base** `vm/integracao-k` sem as mudanças ("ak: produto ausente" — o
catálogo da integração não tem o `ak/ak-runtime.glb` que a régua procura); não é desta branch.

### 8.1 Crítico cego (agente `critico-visual-vm`, só pixel, contexto limpo, duas rodadas)

| arma | rodada 2 | o que ele viu |
|---|---|---|
| m4 | **APROVADA** | eixo 30,3° × 30,1° da AK; recarga tira o pente inteiro, traz o novo na mão e encaixa; aro do ADS na cruz |
| pistol | **APROVADA** | "indistinguível da PT-38 aprovada" em idle, ADS e queda do pente |
| shotgun | RESSALVA | a mão direita abre sobre a janela sem cartucho (f60); no ADS quase não aparece mão; na recarga a arma cruza a tela para a esquerda |
| famas | REPROVADA | "é uma M4 com a alça da FAMAS": pente à frente do punho — o limite declarado (seção 10) |
| ak | REPROVADA | não é a AK aprovada (é o AK-200 do pack, com skin) e o pente velho fica de pé no ar aos 15% da recarga vazia |

A rodada 1 foi descartada para ADS/tiro: a captura (`kcap`) entrava em ADS pelo botão direito do
mouse, que não funciona sem pointer lock — ADS igual ao idle. A rodada 2 julgou o ADS pelos
quadros das réguas; as capturas de tiro de M4, FAMAS, escopeta e pistola ainda saem em ADS e o
tiro dessas quatro **não foi julgado**. A rodada 1 também viu uma "peça laranja solta" na M4: é
uma arma no chão do mapa (a máscara de viewmodel do carregador da M4 está verde).

**AK:** a pergunta é do dono — manter a golden (braço diferente das outras) ou padronizar no pack;
se padronizar, a recarga vazia do AK-200 deixa o pente velho à vista, e o jeito limpo é o plano B
(truque do segundo pente) só para essa recarga.

## 8.2 Lote 2 (24–25/09)

Decisões do dono antes do lote: a `ak` fica a golden aprovada (fora de `VM_FABRICA`); o chassi AK
do pack vira a `akm`; FAMAS e Tavor vão para o plano B em `vm/fabrica-bullpup` (outro agente).
Produtos novos: akm, g3, svd, awp, mosin, mp5, p90, lmg, deagle, revolver38. A granada já é o
pack como autorado (produto K, `ready`) e não foi refeita.

**Resultado (25/09).** Réguas de imagem mira · cobertura · pistola-ref · mãos · carregador
(✓ verde, ✗ vermelho, · n/a); célula = 3:2 / 16:9. Crítico cego = última rodada da arma.

| arma | chassi | 3:2 | 16:9 | crítico | o que pesa |
|---|---|---|---|---|---|
| m4 (lote 1) | MX16A4 | ✓✓·✓✓ | ✓✓·✓✓ | APROVADA | quadro do lote 1 mantido |
| shotgun | KXG12 | ✓✓·✓✓ | ✓✓·✓✓ | APROVADA | era RESSALVA no lote 1 (cartucho oculto na volta + cartucho amarelo) |
| pistol (lote 1) | X18 | ✓✓✓·✓ | ✓✓✓·✗ | APROVADA | 16:9 carregador = dívida R1 da PT-38 |
| akm | AK | ✓✓·✓✗ | ✓✓·✓✗ | RESSALVA | o AK-200 solta o pente velho à vista (plano B); mão direita deformada em f075 |
| g3 | G3 | ✓✓·✓✓ | ✓✓·✓✓ | RESSALVA | coice com metade da amplitude da AK; mão de apoio por cima do guarda-mão |
| svd | SVD | ·✓·✓✓ | ·✓·✓✓ | RESSALVA | pente velho solto ao lado da culatra em f020 |
| mp5 | MPS5 | ✓✓·✓✓ | ✓✓·✓✓ | RESSALVA | coice empurra de lado, cano pouco sobe |
| p90 | PDW90 | ✗✓·✓✓ | ✗✓·✓✓ | RESSALVA | pente some sob a mão (pack); mira lida pela massa, reflex na cruz |
| lmg | MGX5 | ✗✓·✓· | ✗✓·✓· | RESSALVA | cinto velho não sai (pack); mira lida pela massa, óptica na cruz |
| deagle | DGL50 | ✓✓✓·✓ | ✓✓✓·✓ | RESSALVA | 135–140% da PT-38 (a Desert Eagle é maior; decisão do dono) |
| awp | L96X | ·✓·✓✓ | ·✓·✓✓ | REPROVADA | recarga do pack: arma aponta pro alto, mão grande sobre o ferrolho, sem luneta no modelo |
| mosin | Kar98K | ·✓·✓✓ | ·✓·✓✓ | REPROVADA | recarga do pack: fuzil gira de lado atravessando a mira; cartucho não lido |
| revolver38 | Viper-357 | ✓✓✓·· | ✓✓✓·· | REPROVADA | f010: mão direita sobe aberta até a cruz (pack); mãos grandes no ADS |

Os três REPROVADOS são recargas **do pack como autorado** (a fábrica pura não muda a zona de
contato): ficam para variante/plano B com o dono. Vereditos por rodada em
`artifacts/fabrica-lote2/critico-r{2,3,4}/` e `critico/<id>/veredito.txt`.

**Regressão do arsenal:** placar das 26 armas re-medido depois do lote 2 nas duas proporções:
0 falha; células vermelhas com dono 57 → 56. `eval:vm-cache`, `vm-launch`, `vm-orientacao`,
`vm-manga-oca`, `vmrecoil`, `vm-catalog` verdes; `eval:vm-rig` vermelho igual na base ("ak: produto
ausente").

**O que o lote 2 ensinou**

- **Manga × pente.** Sem a extensão do `vmsleeve`, a boca da manga do `SK_Arms_Mono` entra no
  quadro quando o pacote vai para longe; com o pacote perto, a troca do pente de L96X, SVD e G3
  acontece abaixo da borda (régua `carregador`: "tira no ar"). Não existe quadro que resolva os
  dois nesses três chassis (varredura de `enquadrar.mjs --medir`). Ficaram no quadro longe com
  `manga:true`, onde a extensão não fura a câmera. Shotgun e p90, onde a extensão virou um tubo
  rosa na frente da câmera, ficaram perto e sem manga.
- **Lacuna da `vm-manga-tela`.** Ela mede a boca da manga na tela; o tubo da extensão
  atravessando o olho (shotgun, p90) passou verde. Só o crítico viu.
- **Coice.** Na escala do pack o recuo procedural sai ilegível: o crítico via o `fire` igual ao
  idle. A golden mede 11% da diagonal (mount 3,6% + clipe de tiro; `captura/coice.mjs --total`).
  Uma escala só também não serve: o kickback (metros) cresce junto e a arma vem para o rosto,
  com a boca descendo. `recoilScale` gira o cano (~7° no quadril) e `recoilLoc` (novo,
  `VmRecoil.setFamily(…, locScale)`, padrão = a mesma escala, K intacto) fica ~1,5. O `kcap`
  captura o `fire` no pico do giro.
- **ADS das curtas.** O `aimPointOffset` da X18 (0,2 m) deixava a pistola ~1,9× a PT-38 aprovada
  no ADS; a 0,38 m ela fica do tamanho dela (`mira` e `pistola-ref` verdes).
- **Cartucho da escopeta.** O cartucho do pack é vermelho e some contra a manga vermelha; a
  skin `escopeta` pinta só o `KSG_Ammo` de amarelo latão.
- **Réguas com óptica.** A `mira` mede a massa da arma; na MGX5 (óptica alta) e na PDW90 (reflex
  em cima do carregador) a massa fica 35–60 px abaixo da cruz com o aro da óptica **na** cruz
  (figura em `artifacts/fabrica-lote2/reguas-3x2/lmg-ads.png`). O socket da alça lê 0,000 NDC.
- **Pente fora da tela, como autorado.** A recarga vazia da PDW90 leva o carregador para baixo da
  borda entre 31% e 38% em qualquer quadro testado; o crítico lê "pente some". O AK-200 (akm)
  deixa o pente velho cair à vista (15%). Os dois são o pack como autorado: plano B (truque do
  segundo pente), fora da fábrica pura.

## 8.3 Rodada final (25–26/09)

Decisões do dono: a deagle fica grande (faixa própria 0,80–1,45 da PT-38 em `PISTOLA_FAIXA_ARMA`,
no vocabulário do crítico e no `vm-frame-calibra`); m92/g3sg1 herdam o vermelho de carregador do
chassi; awp, mosin, revolver38, akm e carbine são plano B em `vm/fabrica-variantes` (#653); FAMAS e
TAVOR entraram por merge de `vm/fabrica-bullpup` (produtos idênticos byte a byte na nossa overlay).

**AK = golden, agora de verdade.** A decisão de 24/09 não estava aplicada: desde o 1aecd3063 a
'ak' não tinha `golden:true` e o jogo servia o produto K (`ak#ak`; achado no #661). Voltou a
`gold#ak` (coro/ak-hires.glb, 3b6ca23d…); o selo de depuração diz a fonte ('vm: AUTORADO ak (ak) ·
gold'), `eval:vm-launch` VL7 reprova qualquer outra rota (mutante `ak-servida-pelo-k`),
`eval:authored-vm` exige a AK como única golden (mutante `ak-k`) e `eval:vm-rig` passa a tratar a
golden como fonte (sem "produto ausente").

**Réguas novas (com mutante)**

- `mira` — **janela de óptica/reflex** (`janelaDeOptica`, vm-analise): a lente da MGX5 e da PDW90 é
  malha opaca, então o aro não vira buraco e a régua lia a massa (35–60 px com a lente na cruz).
  Cortes da silhueta de cima em todas as profundidades: a lente recuada ≥ 3 mm atrás do aro vira
  buraco. p90/lmg 1 px; catálogo K igual ao placar (famas K 64 → 45 px, segue vermelha). Mutante
  `janela-fora` morde; `sockets-acima` e `sem-ads` seguem mordendo. `npm run eval:vm-mira-janela`.
- `manga-tela` — **extensão do vmsleeve na tela**: o tubo que o crítico viu era a extensão aparecendo
  (manga 9% da tela, verde). O vmsleeve marca a base dos vértices e o raster conta a extensão; na
  fábrica o teto é 0,5% da tela. Mutante `p90-tubo` (extensão ligada, z −0,383) morde com 3,5%.
  `npm run eval:vm-manga-tela-fabrica`. awp da fábrica fica como dívida do #653.
- Sondas: `captura/rolagem.mjs` (rolagem em torno do cano e eixo do cano na tela, contra a M4
  aprovada), `captura/coice.mjs --total`, `captura/sonda-mira.mjs`.
- `kcap`: bots escondidos antes de cada render (o visual é `mesh.group` + halo), recarga em 12
  frações (0,125 e 0,35 pegam o pente velho caindo). `entrarAds` espera o ADS assentar (sob carga
  o placar lia o quadril como ADS).

**Resultado** (réguas 3:2 / 16:9: mira · cobertura · pistola-ref · mãos · carregador)

| arma | chassi | 3:2 | 16:9 | crítico final | rodadas |
|---|---|---|---|---|---|
| m4 | MX16A4 | ✓✓·✓✓ | ✓✓·✓✓ | APROVADA | lote 2 r4 |
| pistol | X18 | ✓✓✓·✓ | ✓✓✓·✗ | APROVADA | lote 2 r4 (16:9 = dívida R1 da PT-38) |
| shotgun | KXG12 | ✓✓·✓✓ | ✓✓·✓✓ | APROVADA | lote 2 r4 |
| mp5 | MPS5 | ✓✓·✓✓ | ✓✓·✓✓ | APROVADA | r1 |
| svd | SVD | ·✓·✓✓ | ·✓·✓✓ | APROVADA | r1 |
| p90 | PDW90 | ✓✓·✓✓ | ✓✓·✓✓ | APROVADA | r1 |
| deagle | DGL50 | ✓✓✓·✓ | ✓✓✓·✓ | APROVADA | r2 |
| g3 | G3 | ✓✓·✓✓ | ✓✓·✓✓ | RESSALVA | r3: coice vai para a frente no pico; braço de apoio esticado (pose do pack) |
| famas | MX16A4 + malha | ✓✓·✓✓ | ✓✓·✓✓ | RESSALVA | r3: tiro afunda no pico; eixo no limite (régua: −0°) |
| tavor | MX16A4 + malha | ✓✓·✓✓ | ✓✓·✓✓ | RESSALVA | r3: eixo no limite no olho (régua: +3°) |
| lmg | MGX5 | ✓✓·✓· | ✓✓·✓· | REPROVADA r3 → corrigida | cinta reta no idle (pose de repouso do FBX); idle agora pelo quadro 0 do tiro do pack, cinta pende — sem 4ª rodada |

Polimento: coice por produto (`recoilScale` gira o cano, `recoilLoc` o kickback: a MP5 empurrava
de lado com 4,5 cm de kickback); G3 com a rolagem da M4 (6,4°) e ADS a 0,22 m; FAMAS/TAVOR com a
recarga menos puxada para a cruz, ADS a 0,28 m (mão aparece) e o pente velho escorregando 10 cm
antes de cair; LMG mais longe (0,90× AK, braço 0,60×). O que sobra é do pack como autorado: a mão
de apoio da G3 na ponta do guarda-mão, a caixa da MGX5 (a velha não sai à vista) e a batida na
alavanca da G3 que a g3sg1 herda (não é trivial: é a recarga do pack; fica com o #653).

## 9. Mapeamento das 26 armas

Decisão do dono: arma sem chassi próprio vira VARIANTE do chassi mais próximo. Contato é o que
decide "mais próximo": onde fica o pente em relação ao punho, onde a mão de apoio segura, que
mecanismo a recarga opera (medido em `tools/fabrica/chassis/*.json`).

| Arma | Chassi | Tipo | Observação |
|---|---|---|---|
| ak | — | **fica a golden aprovada** (rig A) | decisão do dono 24/09 |
| akm | AK | puro + skin AK-47 | lote 2 (o AK-200 do pack) |
| m92 | AK | variante (cano/guarda-mão curtos da M92 Mint) | Krinkov: AK encurtada |
| m4 | MX16A4 | puro | lote 1 |
| famas | MX16A4 + malha própria | **plano B** (§7): FAMAS do jogo, pente atrás do punho | lote bullpup; a variante de zona livre do lote 1 foi reprovada |
| tavor | MX16A4 + malha própria | **plano B** (§7): TAVOR do jogo, retém atrás do pente | lote bullpup |
| md97 | MX16A4 | variante (IMBEL: guarda-mão e coronha) | AR-15 brasileiro |
| scar | Mk14EBR | variante (casca SCAR) | pente à frente, contato de fuzil de batalha |
| g3 | G3 | puro | lote 2 |
| g3sg1 | G3 | variante (luneta, coronha) | |
| svd | SVD | puro | lote 2 |
| sks | SVD | variante (madeira) | pente fixo da SKS = mudança de contato; alternativa Mk14 |
| awp | L96X | puro | lote 2; a L96X é o Accuracy International que a AWP é |
| rem700 | L96X | variante | ferrolho com pente |
| m400 | L96X | variante | |
| mosin | Kar98K | puro | lote 2; recarga cartucho a cartucho; idle da arma = quadro 0 da reload_start |
| carbine | Kar98K | variante | alavanca ≠ ferrolho: gesto de contato diferente (plano B se o dono não aceitar) |
| mp5 | MPS5 | puro | lote 2 |
| uzi | MPS5 | variante (casca UZI) | na UZI o pente é no punho — o MPS5 põe à frente; Kolibri é micropistola, não serve |
| p90 | PDW90 | puro | lote 2; pose = quadro 0 da inspeção |
| lmg | MGX5 | puro | lote 2; alívio 0,3 m e guinada 0 |
| shotgun | KXG12 | puro | lotes 1–2; cartucho oculto na espera do laço |
| deagle | DGL50 | puro | lote 2 |
| revolver38 | Viper-357 | puro | lote 2; sem pose de braço no pack (quadro 0 da recarga) |
| pistol | X18 | puro + skin PT-38 | lote 1 |
| grenade | Grenade | já é pack como autorado | a granada K atual (SK_Arms_Mono + arremesso do pack, `ready`) — não refeita |
| knife | — | fica a aprovada | o pack não tem faca |

**Estimativa para as 26.** Medido no lote 1: build 4–12 s; enquadramento ~2 s; `qa.mjs` por
arma ~6–8 min de máquina (réguas nas duas proporções, capturas, vídeo), com um navegador de
cada vez. Produto puro (13: ak, m4, g3, svd, awp, mp5, p90, lmg, shotgun, deagle, revolver38,
pistol, grenade): ~30 min de agente cada. Variante (12: akm, m92, famas, tavor, md97, scar,
g3sg1, sks, rem700, m400, mosin, carbine, uzi): 1,5–3 h cada (recorte, âncora, mira, duas ou
três voltas de régua/crítico). Total: **~30–40 h de agente**, isto é, 3–4 dias de rodadas
sequenciais (o navegador é serial). Plano B (tavor/famas bullpup de verdade, carbine de
alavanca, uzi com pente no punho) fica fora da conta: 1–2 dias por arma.

## 10. Limites ditos sem rodeio

- **FAMAS do lote 1 não era bullpup** (pente do M4 à frente do punho; crítico: "uma M4 com a alça
  da FAMAS"). Substituída pelo plano B (§7): malha do jogo com o pente atrás do punho e recarga
  re-autorada. O preço do plano B: a recarga é autorada por chave (não é captura de movimento do
  pack) e a arma é o modelo de mundo do jogo (low-poly, textura 512 px).
- **Mint:** 0 crédito gasto. A zona livre da FAMAS saiu da FAMAS Mint que o jogo já usa como
  modelo de mundo (`public/models/weapons/famas.glb`) — mesma identidade do mundo, sem custo.
- A recarga vazia da AK do pack deixa o pente velho **cair** à vista (15%); a régua `carregador`
  lê isso como "objeto no meio do ar". É o pack como autorado; fica para o crítico e o dono.
