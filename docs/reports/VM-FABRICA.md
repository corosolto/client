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
4. Skins: braço (seção 4) e arma (receita por material; sem receita, a cor do `.mat` do Unity,
   **convertida de gama para linear** — lida crua, a AK saía cinza-clara).
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

- **Só na revisão:** `/?vmauthored=1&vmfabrica=ak,m4` (ou `=1` para todos de `VM_FABRICA`).
  Sem `ready`, `VM_LAUNCH` continua `false`; fora do parâmetro nada muda.
- Chave `fab#<arma>` → `/private-assets/viewmodels/fabrica/<arma>-fabrica.glb?v=<VM_FABRICA_BYTES>`.
- **Frame:** rotação e FOV **únicos** para todas as armas (`VM_FABRICA_FRAME`, o frame da AK K,
  que foi ajustado contra a golden) — a composição do pack é a mesma em todo chassi; só a
  **posição** do pacote é resolvida por chassi (`VM_FABRICA_POS`, gerado por
  `tools/fabrica/enquadrar.mjs`), para a arma ocupar o que a AK aprovada ocupa. Variante herda
  a posição do produto puro do chassi (`enquadramentoDe`). Curta usa o frame da PT-38 aprovada.
- **ADS pelo pack:** o eixo `SIGHT→MUZZLE` (linha de visada do AimPoint) vai ao eixo óptico, a
  **rolagem** é zerada por `SOCKET_FAB_UP` (o pack alinha a rotação inteira do AimPoint — sem
  isso AK/M4/KXG12 tombavam 16–24° no ADS) e a alça fica a `alivio` metros do olho
  (−`aimPointOffset.z` do Settings: AK 0,3; MX16A4 0,1; X18 0,2; KXG12 0,1).
- **Manga:** a extensão do `vmsleeve.js` fica **desligada** por produto (`manga:false`): o
  `SK_Arms_Mono` já traz a manga até o ombro. Provado por `eval:vm-manga-oca --fabrica` e
  `eval:vm-manga-tela --fabrica` (seção 6).
- **Mãos por time:** os materiais de braço se chamam `CoroSolto_FP_{Cloth,Glove,Hand}`; o
  sistema de mãos por time (`vmhands.js`, atlas pintados nas UVs do `SK_Arms_Mono`) tinge por
  cima, na mesma escala, como na AK K e na PT-38.
- Recuo: `recoil.json` da família do chassi (ak←AK, ar←MX16A4, pistol←X18, shotgun←KXG12).

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

## 7. Plano B — modo animador

Para variante sem clipe adequado no pack (a FAMAS bullpup de verdade, por exemplo), a zona de
contato precisa ser **re-autorada**, não trocada. As receitas genéricas dos PRs #639/#640 foram
trazidas para `tools/viewmodels/prep/` (`recarga-k.mjs` — recarga por quadros-chave com IK nas
duas mãos; `braco-estavel.mjs`, `saque-do-idle.mjs`, `pente-na-mao.mjs`, `municao-na-mao.mjs`,
`compacta-peca.mjs`, `vm-palco-offline.mjs`). O fluxo do modo animador:

1. partir do `base.blend` da fábrica (braço + arma fundidos, osso `Arma` no `ik_hand_gun`);
2. posar quadros-chave de `idle`, `shoot`, `reload_*`, `equip_rifle` por `bpy` (a mão esquerda
   é animada **relativa à arma**; a arma segue a mão direita pelo `ik_hand_gun`);
3. renderizar **pela câmera de autoria** (`tools/fabrica/blender/render.py`) — fora do quadro
   pode trapacear;
4. medir em laço: `tools/fabrica/reguas.mjs` (FB4) e as réguas de imagem.

**Truque do segundo pente** (recarga): duplicar o pente (`Mag2`) estacionado fora da tela, do
lado da mão esquerda; a mão pega o `Mag2` fora da tela, o pente velho sai e cai, e fora de vista
os dois voltam aos lugares — sem troca de pai no meio da animação (a causa dos pentes voando).
Nenhum produto do lote 1 usa: todos são o pack como autorado. Quando uma variante usar, a régua
`carregador` precisa aceitar "pente reserva fora da tela" (e continuar reprovando pente
flutuando ou sumindo **visível**) — com mutante.

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

## 9. Mapeamento das 26 armas

Decisão do dono: arma sem chassi próprio vira VARIANTE do chassi mais próximo. Contato é o que
decide "mais próximo": onde fica o pente em relação ao punho, onde a mão de apoio segura, que
mecanismo a recarga opera (medido em `tools/fabrica/chassis/*.json`).

| Arma | Chassi | Tipo | Observação |
|---|---|---|---|
| ak | AK | puro + skin AK-47 | lote 1 |
| akm | AK | variante (skin; soleira fixa) | mesmo contato |
| m92 | AK | variante (cano/guarda-mão curtos da M92 Mint) | Krinkov: AK encurtada |
| m4 | MX16A4 | puro | lote 1 |
| famas | MX16A4 | variante (alça e soleira Mint) | lote 1; **não é bullpup** (seção 10) |
| tavor | MX16A4 | variante (casca bullpup) | mesmo limite da FAMAS |
| md97 | MX16A4 | variante (IMBEL: guarda-mão e coronha) | AR-15 brasileiro |
| scar | Mk14EBR | variante (casca SCAR) | pente à frente, contato de fuzil de batalha |
| g3 | G3 | puro | |
| g3sg1 | G3 | variante (luneta, coronha) | |
| svd | SVD | puro | |
| sks | SVD | variante (madeira) | pente fixo da SKS = mudança de contato; alternativa Mk14 |
| awp | L96X | puro | a L96X é o Accuracy International que a AWP é |
| rem700 | L96X | variante | ferrolho com pente |
| m400 | L96X | variante | |
| mosin | Kar98K | variante (skin, cano) | recarga cartucho a cartucho; conferir chassi Kar98K |
| carbine | Kar98K | variante | alavanca ≠ ferrolho: gesto de contato diferente (plano B se o dono não aceitar) |
| mp5 | MPS5 | puro | |
| uzi | MPS5 | variante (casca UZI) | na UZI o pente é no punho — o MPS5 põe à frente; Kolibri é micropistola, não serve |
| p90 | PDW90 | puro | pose é o quadro 0 da inspeção |
| lmg | MGX5 | puro | cinto/caixa, sem pente destacável |
| shotgun | KXG12 | puro | lote 1; a M3 do jogo é bomba como a KXG12; Drake-12 é de dois canos |
| deagle | DGL50 | puro | |
| revolver38 | Viper-357 | puro | sem pose de braço no pack (quadro 0 da recarga) |
| pistol | X18 | puro + skin PT-38 | lote 1 |
| grenade | Grenade | pack (braço) | granada K atual; arremesso start/loop/end |
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

- **FAMAS não é bullpup.** O pente da FAMAS fica atrás do punho; no chassi MX16A4 ele fica à
  frente, e isso é zona de contato (a mão de apoio vai ao pente ali, a animação do pack é essa).
  A variante lê como FAMAS pela alça de transporte e pela soleira; o pente continua o do M4. Uma
  FAMAS fiel exige plano B (re-autorar a recarga) — trocar a zona livre não chega lá.
- **Mint:** 0 crédito gasto. A zona livre da FAMAS saiu da FAMAS Mint que o jogo já usa como
  modelo de mundo (`public/models/weapons/famas.glb`) — mesma identidade do mundo, sem custo.
- A recarga vazia da AK do pack deixa o pente velho **cair** à vista (15%); a régua `carregador`
  lê isso como "objeto no meio do ar". É o pack como autorado; fica para o crítico e o dono.
