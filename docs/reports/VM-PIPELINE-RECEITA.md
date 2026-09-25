# Receita reproduzível: como esta base constrói um viewmodel de 1ª pessoa

Este documento é read-only sobre o código: descreve o que existe hoje, com caminho e
comando reais, para que uma arma nova possa ser produzida sem redescobrir o pipeline por
tentativa e erro. Não substitui `docs/development/VIEWMODEL-1P-PROFISSIONAL.md` (o
contrato de aprovação visual) nem `docs/reports/VIEWMODEL-CONTINUATION-HANDOFF.md` (o
estado durável por família) — leia os dois antes de produzir algo novo.

## 0. Vocabulário e estado real de produção

- **Mint** — a malha de mundo da arma própria do Coro Solto (`public/models/weapons/<id>.glb`).
- **pack** — a arma genérica do pacote pago **KINEMATION FPSAnimationPack Ultimate**
  (`.unitypackage`, Fab Standard License, não redistribuível como fonte) que vem dentro
  do GLB de família doador.
- **família** — grupo de armas que compartilha doador (braços + arma genérica do pack).
  Mapeado em `tools/viewmodels/paid-pack-manifest.json` (`families`, 16 entradas: ak, ar,
  mp5, smg, p90, g3, marksman, svd, sniper, bolt, deagle, pistol, revolver, shotgun, lmg,
  grenade) e `weapons` (as 26 armas do jogo → família + qualidade do match
  `exact`/`close`/`proxy`).
- **assada / baked** — a Mint real é fundida dentro do GLB da família em tempo de
  autoria (Blender); o runtime só troca clipe. **encaixada** — o GLB de família carrega
  a arma genérica do pack; o runtime monta a malha Mint por cima em tempo de execução
  (`attachMintWeapon`).
- **legado** — o caminho anterior ao pack pago (`public/js/game.js` `_buildViewModels` +
  `public/js/vmweapon.js` caminho de `rw`/`alignHands` + `public/js/weapons.js`). É o que
  **realmente serve o jogador hoje**, porque em `public/js/data/vmconfig.js` **toda
  família tem `ready: false` exceto `grenade`** — o portão de rollout do caminho autorado
  (assado ou encaixado) está fechado em produção. `?vmready=ak,pistol` é o override de
  DEV; `?vmauthored=0` é o kill-switch total do autorado.
- **PRIVATE_ROOT** — binários licenciados nunca entram no repo. Raiz local:
  `/Users/ruben/csbrasil-private-assets/generated/viewmodels`, servida em
  `/private-assets/viewmodels/...`. Scripts do pipeline recusam escrever dentro do repo
  (`assert_private_output`/`assertPrivateOutput`).
- **CATALOG_VERSION** — query string de cache-busting (`authoredvm.js:15`,
  `'paid-aaa-2'`); bump manual sempre que o catálogo privado muda de conteúdo.

## 1. O pipeline completo — da malha até o GLB servido

Existem **dois pipelines irmãos** a partir do mesmo GLB de família, mais um pipeline
bespoke isolado para a faca. Todos os `.mjs`/`.py` abaixo estão em
`tools/viewmodels/` (raiz) e `tools/blender/viewmodels/` (scripts que rodam **dentro**
do Blender). O binário usado em todo lugar é:

```
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 \
  --python-exit-code 1 --python <script>.py -- <args>
```

### Passo 0 — extrair o pack licenciado

```sh
python3 tools/viewmodels/extract_paid_unitypackage.py --all
# ou por família: --family lmg --family svd ...   /   --list (só inspeciona)
```

- Lê `tools/viewmodels/paid-pack-manifest.json` (`source.package` = caminho do
  `.unitypackage`, um tar com diretórios GUID `pathname`+`asset`).
- Extrai só os prefixos necessários (`Character/`, `Prefabs/`,
  `Settings/Weapons|Player/`, `Animations/General|Jump/` + a pasta da família pedida)
  para fora do repo.
- Saída: árvore de assets extraídos + `paid-pack-inventory.json` (SHA-256 por arquivo,
  para reprodutibilidade/procedência).

### Passo 1 — orquestrador por família (Blender + Node)

```sh
python3 tools/viewmodels/build_paid_catalog.py --family ak --family lmg   # ou sem filtro: todas
```

Por família, roda em sequência:

1. **Blender** monta o GLB base:
   ```
   /Applications/Blender.app/Contents/MacOS/Blender -b \
     --python tools/blender/viewmodels/build_paid_family.py -- \
     --family ak --manifest tools/viewmodels/paid-pack-manifest.json
   ```
   Dentro do script (`build_paid_family.py`):
   - `reset_scene()` → importa `Character/SK_Arms_Mono.fbx` (braços+mãos doadores) como
     armature **`RIG_FP_ARMS`**, malhas renomeadas **`GEO_FP_<nome>`**; monta materiais de
     pele/luva/manga a partir de texturas Unity (`T_Arm01_*`, `T_Glove01_*`,
     `T_Cloth01_*`).
   - Importa `Weapon/<weaponHint>.FBX` (arma genérica do pack) como armature
     **`RIG_WEAPON_<FAMÍLIA>`**; raiz vira **`SOCKET_WEAPON_<FAMÍLIA>`**; malhas
     `GEO_WEAPON_<FAMÍLIA>_<nome>`.
   - **Ponto crítico (causa raiz da rodada 28/08, ver §6):** a arma tem que ser filha do
     **bone** `ik_hand_gun` (`parent_type="BONE"`, `parent_bone="ik_hand_gun"`), nunca do
     objeto armature — senão fica soldada no ar em rest pose enquanto os clipes animam o
     bone.
   - Só o clipe `idle` entra como Action via NLA nesta etapa (FBX ASCII do pack não
     importa os demais direto no Blender).
   - Cria a câmera única do viewmodel (fonte: `FPSPlayer.prefab`, pos local
     `(0.012, 1.654, 0.06)`, VFOV 80°, sensor vertical 24 mm).
   - Exporta GLB (`export_animation_mode="NLA_TRACKS"`, `export_image_format="WEBP"`,
     qualidade 82, `export_yup=True`) → `<familia>.glb` + `.blend` + `build-report.json`.

2. **Node** funde os clipes restantes:
   ```sh
   node tools/viewmodels/assemble_paid_family.mjs --family ak \
     --manifest tools/viewmodels/paid-pack-manifest.json
   ```
   - Abre o `<familia>.glb` via `@gltf-transform`, identifica os skins `RIG_FP_ARMS` e
     `RIG_WEAPON_<FAMÍLIA>`.
   - Para cada clipe (`reload_tactical`, `reload_empty`, `reload_start/loop/end`,
     `pump[_empty]`, `shoot`, `inspect`), converte o FBX bruto do pack com **Assimp**
     (`assimp export <fbx> <glb> -fglb2`), zera meshes/skins/materiais do resultado,
     recarrega com `GLTFLoader` (three.js), reamostra a 60 Hz e escreve os tracks direto
     nos ossos do GLB base por nome.
   - Saída: **`<familia>-runtime.glb`** (fora do repo) + `assembly-report.json`. Este GLB
     ainda tem `GEO_WEAPON_*` do pack visível — é o "encaixado", onde o runtime troca a
     malha por Mint (`attachMintWeapon`, §2).

Caso especial `grenade`: roda `build_paid_grenade.py` (que também importa um `.blend`
terceiro, `grenadepack1.blend`, fora do `.unitypackage`, via `bpy.data.libraries.load`)
+ `bind_paid_grenade.mjs` em vez dos dois scripts acima.

Ao final, `build_paid_catalog.py` agrega os relatórios de cada família em
`catalog.json` (schemaVersion, licença, 26 armas → família, 15 famílias construídas).

### Passo 2 — caminho "assado" (por ARMA, não por família)

```sh
node tools/viewmodels/bake_family.mjs --arma=ak [--render-only]
```

1. Blender (reexecuta `build_paid_family.build()` como módulo, cena viva):
   ```
   /Applications/Blender.app/Contents/MacOS/Blender -b --python-exit-code 1 \
     --python tools/blender/viewmodels/build_baked_family.py -- \
     --familia=ak --arma=ak --mint=public/models/weapons/ak.glb \
     --len=<cfg.len> --gripz=<cfg.gripZ|0.6> --residuo=x,y,z [--magbox=...]
   ```
   Importa a **Mint real**, alinha por bounding-box ao volume da arma genérica do pack
   (eixo do cano = maior dimensão), escala para `cfg.len`, separa o carregador por uma
   caixa `--magbox` em espaço-arma e pendura no bone `Mag`, cria os empties
   **`SOCKET_MINT_MUZZLE`**/**`SOCKET_MINT_SIGHT`** medidos na própria geometria,
   renderiza um contact sheet EEVEE **antes** de exportar (auto-checagem visual), e só
   então exporta `<arma>-baked.glb` (Mint + arma do pack ainda juntas).
2. Reexecuta `assemble_paid_family.mjs`, agora com
   `--input <arma>-baked.glb --output <arma>-baked-runtime.glb` (funde reload/fire/inspect
   sobre o GLB já assado).
3. `node tools/viewmodels/strip_baked_family.mjs <arma>-baked-runtime.glb` — remove as
   malhas `GEO_WEAPON_*` do pack (só os ossos ficam), troca texturas de braço por
   placeholder 1×1 (religadas depois via `shared/`), renomeia a animação de volta para
   `idle`, poda o GLB.

Saída: **`<arma>-baked-runtime.glb`**, um arquivo **por arma** — servido quando
`VM_WEAPON[<arma>].baked === true` em `vmconfig.js`.

**Duas lanes implementam este mesmo passo de forma independente, sem chamar
`bake_family.mjs`** (ver §3 e §6 para o porquê): `vm-lmg-final` recorta e skina a
própria malha Mint (peças reais, sem geometria procedural); `vm-prep-precisao`
faz cirurgia pura em Python (sem `bpy` no build final) e gera pente/cartucho
**procedurais** (`GEO_PROC_<bone>`) para mosin/sks, e casca própria coreografada por
osso para a SVD.

### Passo 3 — de-dup de texturas compartilhadas

```sh
node tools/viewmodels/optimize_paid_family.mjs [privateRoot]
```

Lê `catalog.json`; por família, extrai as 9 texturas de braço/luva/pano compartilhadas
(regex `T_(Arm|Cloth|Glove)01_(B|N|ORM)`) uma única vez para `shared/*.webp` (normal
2048px q80, base/ORM 1024px q85) e substitui cada ocorrência por um placeholder 1×1
religado por nome no runtime. Resolve o problema medido: 9 imagens duplicadas em todos
os GLBs (~300 MB redundantes; 23 MB reparseados a cada troca de arma) → família caiu
para 2,9–7,5 MiB, catálogo de 345 para 68 MB.

### Passo 4 — clipes genéricos compartilhados (uma vez só)

```sh
node tools/viewmodels/assemble_general_motions.mjs
```

Parte de `ak/ak.glb`, descarta mesh/material/skin/câmera/animações (vira só esqueleto)
e assa via Assimp+three.js os clipes universais (`idle_breath`, `walk`, `sprint`,
`sprint_tac`, `equip_rifle`, `unequip_rifle`, `unequip_pistol`, `pickup`) em
`shared/general-runtime.glb` — vale para qualquer família porque o rig é o mesmo.

### Passo 5 — dados de recoil (opcional, não é geometria)

```sh
node tools/viewmodels/extract_recoil_params.mjs [extractedDir] [privateRoot]
```

Lê os `.asset` YAML da Unity (`RecoilAnimData`) por família, amostra as curvas Hermite a
60 Hz, grava `recoil.json` (consumido por `vmrecoil.js`).

### Passo 6 — validação de fechamento

```sh
node tools/viewmodels/validate_paid_catalog.mjs [privateRoot]
```

Confere, sem redistribuir binário: 26 armas / 15 famílias mapeadas; `shared/` com
exatamente 9 texturas ≤6 MiB; `shared/general-runtime.glb` ≤12 MiB só-esqueleto com os 4
clipes gerais; cada `<familia>-runtime.glb` <8 MiB, texturas embutidas ≤300 KB, clipes
obrigatórios por família (`REQUIRED_SPECIAL` para shotgun/bolt/revolver; as demais
exigem `idle`+`reload_tactical`+`reload_empty`), skin `RIG_FP_ARMS` com **exatamente 67
joints**, **exatamente 1 câmera** autorada, e a **régua de socket** contra
`tools/viewmodels/vm-socket-baseline.json` (JSON commitado, medido manualmente uma vez,
não gerado por nenhum script): o nó da arma tem que ter `ik_hand_gun` como ancestral e
cair a ≤2 mm de `worldIdlePos` com o primeiro keyframe do `idle` aplicado; algum clipe de
reload precisa animar `ik_hand_gun` (senão a arma fica soldada). Também valida o pack de
granada e a integridade dos canais de animação (timestamps crescentes, sem duplicata,
valores finitos).

### Adjunto — medida no jogo real (não é build)

```sh
node tools/viewmodels/prep/vm-arsenal-frames.mjs --porta=8166 --aspecto=32 \
  --armas=lmg,m4,awp --modo=autorado|legado --tag=<nome>
```

Playwright headless contra um servidor já rodando; projeta vértices de mão/arma na
câmera do viewmodel e mede px de contato mão↔arma e diagonal aparente da arma, por
captura (`idle`, `ads`, `fire`, `reload-f015/035/060/085`). Alimenta
`tools/eval/vm-arsenal-check.mjs` (§5).

### Pipeline paralelo — faca (bespoke, fora do pack pago)

`knife.pipeline = "existing-self-contained"` no manifest. Não usa KINEMATION: reutiliza
o rig/mão/material já aprovados de `pistol-hires.glb`.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background \
  --python tools/blender/viewmodels/knife_melee/build.py
/Applications/Blender.app/Contents/MacOS/Blender --background \
  artifacts/viewmodels/knife-melee-pilot/knife-melee-pilot.blend \
  --python tools/blender/viewmodels/knife_melee/validate_blend.py
/Applications/Blender.app/Contents/MacOS/Blender --background \
  --python tools/blender/viewmodels/knife_melee/validate_glb.py
python3 tools/blender/viewmodels/knife_melee/contact_sheet.py
npm run eval:melee-vm
```

Combina a faca própria (`public/models/weapons/knife.glb`) com o mesh/rig de mãos de
`pistol-hires.glb`; produz câmera 3:2 e só as ações `Idle`/`Draw`/`Slash`/`Stab`. Um
GLB de referência externo (`~/Downloads/knife_animated.glb`) serve só de estudo de
ritmo — nenhuma malha/textura dele entra no `.blend` ou no GLB final.

## 2. Assada (baked) × Encaixada (attach em runtime)

| | **Encaixada** | **Assada / baked** |
|---|---|---|
| Config em `vmconfig.js` | `W('family')` — sem `baked` | `W('family', { baked: true, parts: {...} })` |
| GLB servido | `/private-assets/viewmodels/<família>/<família>-runtime.glb` | `/private-assets/viewmodels/<família>/<arma>-baked-runtime.glb` (**por arma**) |
| Chave da entry no runtime | a família (`entryKeyFor`, `authoredvm.js:194-198`) | `<família>#<arma>` |
| O que o GLB carrega | braços doadores + arma **genérica do pack** ainda visível (`GEO_WEAPON_*`) | braços doadores + a **Mint real** já fundida, com o pack removido/oculto |
| O que roda no `_loadFamily` (`authoredvm.js:343-358`) | `attachMintWeapon(entry, owner)` — matemática de encaixe completa | só `getObjectByName('MINT_WEAPON_<ARMA>')` e `getObjectByName('SOCKET_MINT_MUZZLE'/'SOCKET_MINT_SIGHT')`; **nenhuma montagem ao vivo** |
| O que roda no `setWeapon` (troca de arma, `authoredvm.js:406`) | `attachMintWeapon(entry, id)` de novo, a cada troca | nada (`if (... && !key.includes('#')) attachMintWeapon(...)` pula a entry assada) |
| Dependência de runtime | precisa que a Mint da arma já esteja em `_cache` (`hasWeapon(weaponId)`, `weapons.js`); se não estiver, cai em fallback (pack visível) até o GLB de mundo chegar | nenhuma — o socket já foi resolvido offline no Blender |
| Onde vivem os bugs de fallback (BUG-76) | aqui: `weaponModel(id)` caindo em `_cache.get('awp')`, pack escondido antes da hora | não se aplica — não há encaixe em runtime |
| Classe de trabalho para produzir | menor (só rodar `build_paid_family.py`+`assemble_paid_family.mjs` da família) | maior (Blender por ARMA: fit-transform, split de peças, sockets, autoverificação de câmera) |
| Recomendação atual | usar para cobertura rápida / famílias ainda não priorizadas | **é o caminho recomendado para o que vai a release** — runtime "burro" elimina toda a classe de bugs de encaixe/fallback documentada em BUG-76; é o padrão que as lanes recentes (`ak`, LMG, mosin/svd/sks) estão seguindo |

**Estado real hoje (main):** em `public/js/data/vmconfig.js`, só `ak` tem
`baked: true`; todas as demais entradas de `VM_WEAPON` são encaixadas. **E mais
importante: todas as famílias em `VM_FAMILY` têm `ready: false` exceto `grenade`** — ou
seja, nem o caminho assado nem o encaixado estão ativos para o jogador comum agora; o
jogo roda no caminho **legado** (`game.js`/`vmweapon.js`/`weapons.js`), que recebeu seu
próprio conserto contra o mesmo bug de substituição pela AWP em 08/09 (`hasWeapon(id)`
obrigatório em `mountRw`). Ativar uma família/arma nova exige, além de todo o pipeline
abaixo, o passo humano de virar `ready: true` — feito família por família, nunca em
lote (ver `docs/development/VIEWMODEL-1P-PROFISSIONAL.md`).

## 3. De onde vêm os braços/mãos — o "doador" — e como uma arma nova se pendura

- **Doador principal:** KINEMATION FPSAnimationPack Ultimate, um `.unitypackage`
  licenciado (Fab Standard License, não redistribuível como fonte) guardado fora do
  repo em `sources/fpsanimationpack_ultimate.unitypackage` (caminho completo no
  `manifest.source.package`). `hands.default = "tactical"` (única variante hoje),
  `hands.contract`: `sharedSkeleton`, `replaceableHands`, `replaceableSleeves`,
  `characterMaterialOverrides` — ou seja, o esqueleto é fixo entre variantes, só pele e
  panos trocam.
- **Nó raiz do doador:** armature **`RIG_FP_ARMS`**, malhas **`GEO_FP_<nome>`**, skin
  com **exatamente 67 joints** (checado por `validate_paid_catalog.mjs`). Este é o
  `preM1Ancestors` de todo socket de arma no `vm-socket-baseline.json`.
- **Osso-contrato:** **`ik_hand_gun`** — todo mount de arma (genérica do pack ou Mint
  assada) precisa ser filho deste **bone**, nunca do objeto armature. É a causa raiz
  documentada da arma "soldada no ar" quando isso é feito errado (§6).
- **Arma genérica do pack por família:** armature `RIG_WEAPON_<FAMÍLIA>`, raiz
  `SOCKET_WEAPON_<FAMÍLIA>` (ou, quando o FBX exporta a armature como raiz sem socket
  próprio, o fallback é o prefixo `RIG_WEAPON_*` — caso de `bolt`, `p90`, `shotgun`,
  `smg` no baseline), malhas `GEO_WEAPON_<FAMÍLIA>_<nome>`.
- **Como uma arma NOVA se pendura, caminho encaixado:** basta que a arma já exista como
  `weapons.<id>` no `paid-pack-manifest.json` apontando para uma `family` existente
  (com `match: "exact"/"close"/"proxy"` conforme a semelhança mecânica) — o runtime
  (`vmweapon.js`) encontra `SOCKET_WEAPON_*`/`RIG_WEAPON_*` dentro do GLB de família já
  construído e monta a Mint (`public/models/weapons/<id>.glb`) por cima, sem tocar
  Blender de novo.
- **Como uma arma NOVA se pendura, caminho assado:** a Mint real
  (`public/models/weapons/<id>.glb`) é importada no `.blend` da família, ajustada por
  bounding-box/eixo contra a arma genérica do pack, **fundida nos vértices** (não basta
  `transform_apply` — o import glTF deixa um empty pai; é preciso "queimar" a
  transformação no próprio vértice, comentário explícito em `lmg-build.py`), recortada
  em peças móveis (carregador/ferrolho/alavanca/tampa) por vertex group ou caixa medida
  em espaço-arma, e cada peça é **skinada 100% num osso real do doador** (`Mag`, `Bolt`,
  `Feed_Tray`, `Lever`, `Clip`, `CartridgeClip0..4`, conforme a mecânica). Novos empties
  `SOCKET_MINT_MUZZLE`/`SOCKET_MINT_SIGHT` são criados medindo a própria geometria da
  Mint (não copiados de lugar nenhum).
- **Doador alternativo (fora do pack pago):** a faca reaproveita o rig/mão/material já
  aprovados de `pistol-hires.glb`, sem tocar o KINEMATION — é o padrão a seguir quando
  a mecânica de uma arma nova não cabe em nenhuma família do manifesto (hoje só a faca
  está neste caminho).
- **Doador histórico, hoje fora da cadeia reproduzível:** um rig CC0 WRAD próprio
  (`tools/blender/source/fp-arms-source.blend` → `public/models/viewmodels/fp-arms.glb`,
  consumido por `public/js/fpsrig.js`) precedeu a integração do pack pago e foi
  descontinuado por copiar a aparência do CS/ter divergência de câmera Blender↔navegador
  (BUG-75, §6). Só serve de referência histórica em
  `docs/development/VIEWMODEL-1P-PROFISSIONAL.md`; não faz parte do pipeline atual.

## 4. Sockets e nomes de nó — o contrato, e quem lê cada um

| nome | onde é lido | função | para que serve |
|---|---|---|---|
| `RIG_FP_ARMS` | `vm-socket-baseline.json` (`preM1Ancestors`), `validate_paid_catalog.mjs` | ancestral obrigatório de todo socket de arma | prova que a arma está pendurada no braço certo, não solta na cena |
| `ik_hand_gun` | `build_paid_family.py` (parent_bone), `validate_paid_catalog.mjs` | osso que os clipes animam | toda arma (pack ou Mint) tem que ser filha deste bone |
| `SOCKET_WEAPON_<FAMÍLIA>` / `RIG_WEAPON_<FAMÍLIA>` (prefixo, regex) | `vmweapon.js:28-29` (`weaponSocketOf`) | raiz da arma do pack dentro do GLB genérico | é onde `vmweapon.js` pendura o `mint.holder` no caminho **encaixado** |
| `GEO_WEAPON_<FAMÍLIA>_<nome>` | `authored-identity-check.mjs` | malha da arma genérica do pack | tem que ficar **oculta** quando a Mint monta por cima (regra ID3/pack-visível) |
| `MINT_WEAPON_<ARMA>` (maiúsculo) | `authoredvm.js:346` | nó da malha da arma própria já assada dentro do GLB | caminho **assado**: é isso que o runtime procura em vez de montar algo |
| `SOCKET_MINT_MUZZLE` | `authoredvm.js:349` | ponto da boca do cano no caminho assado | flash/impacto/mira balística |
| `SOCKET_MINT_SIGHT` | `authoredvm.js:350` | ponto de mira/alça no caminho assado | alinhamento de ADS |
| `mint_weapon_<weaponId>` / `mint_part_<part>` (minúsculo) | `vmweapon.js:140,196` | nomes que o **próprio runtime atribui** ao clonar o wrap no caminho encaixado | não são lidos de asset — são gerados em runtime |
| `UTILITY_HE` / `UTILITY_FLASH` / `UTILITY_SMOKE` (regex `^UTILITY_(HE|FLASH|SMOKE)$`) | `authoredvm.js:253-256` | modelos de granada dentro do GLB `grenade` | ocultos por padrão, revelados por `throwUtility` |
| `GEO_PROC_<bone>` (ex. `GEO_PROC_Clip`, `GEO_PROC_CartridgeClip0..4`) | só convenção de asset (lane `vm-prep-precisao`); **não lido por nome em `authoredvm.js`/`vmweapon.js`** | pente/cartucho **procedural** (geometria gerada por código, não recortada da Mint) | usado quando seguir o canal de animação do doador desconectaria a peça real da mão |
| `CoroSolto_FP_(Hand\|Glove\|Cloth)` (regex de material) | `authoredvm.js:154` (`HAND_MATERIAL`) | separa `handMeshes` de `weaponMeshes`; usado por `bindSharedArmTextures`/`tintHandMaterial` | tingir pele/luva/manga por perfil de personagem |
| `CoroSolto_precisao_steel` / `_brass` | **não lido em código de produção** — só convenção de material da lane `vm-prep-precisao`, citada no relatório da lane | — | se importar essa lane, decidir se vira leitura por nome em alguma régua ou permanece só visual |

Resolução de GLB por arma e o fallback perigoso a evitar: `weaponModel(id)`
(`public/js/weapons.js:338`) faz `_cache.get(id) || _cache.get('awp')` — se a Mint da
arma pedida ainda não estiver em cache (arma não sorteada nesta partida), devolve
**silenciosamente** a malha da AWP com o nome certo. `hasWeapon(weaponId)`
(`weapons.js:252`, `_cache.has(...)`, sem fallback) é o guard obrigatório antes de
esconder o pack ou de montar qualquer wrap — é a causa raiz e o conserto do BUG-76
(§6).

## 5. Réguas — o que cada uma exige do asset

Fonte: `tools/eval/*.mjs` e `tools/viewmodels/*.mjs`. `check:vm` (`package.json`) roda
via `tools/eval/runner.mjs` (não para no primeiro erro):

```
npm run check:vm
# = eval:vmrecoil eval:melee-vm eval:vm-catalog eval:vm-serving eval:vm-identity
#   eval:vm-ads eval:vm-attach eval:vm-attach-legado
```

| régua | comando | o que mede | o que o asset precisa ter | limiares |
|---|---|---|---|---|
| `authored-vm-check.mjs` | `npm run eval:authored-vm` (está em `check:fast`, não em `check:vm`) | contrato estrutural do runtime (contagem de armas/famílias, URLs privadas, câmera exportada, kill-switch) | `vmconfig.js` com 26 armas/15 famílias/16 URLs | contagens exatas |
| `authored-identity-check.mjs` | `npm run eval:vm-identity` | a malha na mão é a Mint da própria arma, não a genérica nem a de outra arma; muzzle dentro do bbox | `GEO_WEAPON_*` oculto; wrap `mint_weapon_<id>`/`MINT_WEAPON_<ID>`; material `CoroSolto_FP_*` | ID3 muzzle no bbox+5cm; ID4 escala 0,8–1,2×; ID6 download <8 MiB; ID7 deriva <2cm/3,5s |
| `authored-ads-check.mjs` | `npm run eval:vm-ads` | ADS alinha sight/muzzle ao eixo da câmera, 16:9 e 3:2 | sockets `sight`/`muzzle` (assado) ou `metrics.sight/muzzle` (encaixado) | AD1 desvio NDC ≤0,035; AD2 área ≥2%; AD3 ângulo ≤2° |
| `authored-serving-check.mjs` | `npm run eval:vm-serving` | servidor real (Astro) entrega os GLBs de `ready:true`, `shared/*.webp`, `recoil.json`, `*-baked-runtime.glb` | arquivos existirem em `/private-assets/viewmodels/<família>/` | GLB família ≥100 KB; baked ≥500 KB |
| `validate_paid_catalog.mjs` | `npm run eval:vm-catalog` | fechamento do catálogo (ver §1 passo 6) | ver §1 | 67 joints, 1 câmera, ≤2mm do baseline, etc. |
| `vm-attach-fallback-check.mjs` | `npm run eval:vm-attach` / `eval:vm-attach-legado` | com o GLB de mundo bloqueado, a família continua com arma em quadro e nunca herda wrap de outra | `hasWeapon`/`attachMintWeapon` (autorado); `mountRw`/`alignHands` (legado) | mutantes `escondepack`, `forjawrap`, `montaalheia` têm que reprovar |
| `vmrecoil-sim.mjs` | `npm run eval:vmrecoil` | recuo procedural do pack por família, 5 tiros | `recoil.json`/`catalog.json`; famílias sniper/bolt precisam de clipe `shoot` assado | pico 1–12°; resíduo <0,15°/2mm após 0,9s |
| `melee-vm-check.mjs` | `npm run eval:melee-vm` | faca tem dono construído em `game.js`, GLB próprio versionado com câmera+clipes | `Idle/Draw/Slash/Stab` no GLB | ≥10 referências; mutante `sem-construtor` |
| `vm-arsenal-check.mjs` | **sem script npm** — `node tools/eval/vm-arsenal-check.mjs <frames.json>` (consome saída de `vm-arsenal-frames.mjs`) | mão/arma em quadro, contato mão↔arma, escala dentro da família, nos dois caminhos e aspectos | captura com `armaEmQuadro`/`maoEmQuadro`/`contato_px`/`arma_diag_px`/`fonte`/`assada` | mão ≥40; contato ≤10px fora do ADS; escala ≤1,35× na família |
| `viewmodel-family-contract.mjs` | **sem script npm** | toda arma de `WEAPON_IDS` pertence a exatamente 1 família, cada família tem piloto e ≥4 estados | `viewmodel-families.json` sincronizado | sem limiar numérico — só duplicidade/ausência; **declara que não avalia visual** |
| `ak-viewmodel-contract.mjs` | **sem script npm** | pipeline bespoke antigo (`ak-hires.glb`): câmera, ossos de dedo, curso do gatilho, oclusor | 15 ossos `*_metarig`, câmera nomeada, 1 skin | VFOV 58°±0,05; gatilho ≥4°/retorno ≤1°/contato ≤4,5mm |
| `vm-mint-audit.mjs` | `npm run eval:vm` | auditoria headless do caminho **legado** — reimplementa `weaponModel`+`vmFrame` e projeta vértices reais | GLB de mundo com 1 mesh/1 node, sem Draco | alimenta invariantes VM1–VM18 |
| `vmrig-test.mjs`, `vm-kick-sim.mjs`, `vm-solve.mjs`, `vm-frame-check.mjs` | sem script npm | ferramentas de solver/inspeção do enquadramento **legado**, sem asset novo | — | ADS ≤120ms; pico pitch ≤8°; coronha não cruza near plane |
| `vm-inspect-check.mjs` | sem script npm | `public/vm-inspect.html` aponta para arma publicada/existente | — | mutantes `fantasma`/`corpo` |
| `vmlab-hud-check.mjs` | `npm run eval:vmlabhud` | HUD de seleção de arma (UI, não malha) | — | HUD1–HUD6 |
| `lajes-authored-check.mjs` | `npm run eval:lajes-authored` | **não é arma** — portão do mapa Lajes | — | — |

**Atenção ao rodar a suíte:** `vm-arsenal-check.mjs`, `ak-viewmodel-contract.mjs`,
`viewmodel-family-contract.mjs`, `vm-mint-audit.mjs`, `vm-kick-sim.mjs`, `vm-solve.mjs`,
`vm-verify.mjs`, `vmrig-test.mjs`, `vm-frame-check.mjs`, `vm-inspect-check.mjs` **não
estão em nenhum script `npm`** — quem roda só `npm run check:vm` não mede arsenal nem
enquadramento legado. Rode-os manualmente com `node tools/eval/<arquivo>.mjs`.

## 6. Armadilhas já pagas

Por etapa do pipeline:

**Extração / doador**
- *Textura de braço duplicada em cada GLB.* `build_paid_family.py` embutia as mesmas 9
  texturas (18,3 MB) em cada um dos 16 GLBs (~300 MB redundantes; 23 MB reparseados a
  cada troca de arma). Conserto: `optimize_paid_family.mjs` (§1 passo 3).

**Assemble / bind da arma no rig doador**
- *Arma soldada no ar.* A arma era parenteada ao **objeto** armature com matriz de rest
  congelada, em vez de ao **bone** `ik_hand_gun` — os clipes animam o osso, a arma fica
  parada no espaço. Conserto: bone-parent com compensação de tail; delta de posição com
  idle aplicado ≤1e-6 m nas 15 famílias; baseline versionado + mutante em
  `validate_paid_catalog.mjs`.
- *`EXT_texture_webp` sem `source`.* O exportador glTF do **Blender 5.2** grava a
  extensão mas omite o campo `source` no nível da textura — a imagem perde referência.
  Conserto visto em `lmg-assemble.mjs` (~linha 305):
  `if (tex.source === undefined && webp && Number.isInteger(webp.source)) tex.source = webp.source;`
  — qualquer script que reexporte GLB do Blender 5.2 precisa da mesma correção
  pós-export.
- *Clipe de disparo assado sem baseline de idle.* Ao assar `shoot` sem manter a chave de
  todos os ossos do braço na pose idle, ossos sem chave nova voltam ao rest pose do
  doador — sintoma medido: `lmg/fire` com mão `0/306` e arma `306/306` (mão some só no
  disparo). Conserto: assar a pose idle completa primeiro, aplicar o recoil só em
  `ik_hand_gun`/`spine_03` por cima dela.
- *Import aninhado diverge do GLB exportado.* Reimportar no Blender um GLB já montado
  (peças skinned + Mint) para inspeção não reflete fielmente o asset exportado — sem
  causa raiz fechada; tratado como limite conhecido. Mitigação: medir contato/recarga a
  partir do jogo real (WebGL), não do reimport.
- *Warp temporal sem teto mascara má sincronia.* Esticar eventos do doador para casar
  com o áudio do jogo sem limite de taxa produz movimento antinatural. Conserto: taxa
  local ≤2,5×; acima disso a âncora é descartada, não forçada.

**Optimize / staging**
- *GLB antigo ao lado do novo na mesma raiz de staging.* Deixar `<arma>-runtime.glb`
  (não-baked) junto do `<arma>-baked-runtime.glb` novo faz a família carregar as duas
  coisas — sintoma: Mosin virou um objeto compacto com as mãos fora do quadro. "Era o
  staging, não o asset." Sempre remover runtimes antigos da raiz isolada antes de medir.
- *`bake_family.mjs` escreve num `PRIVATE_ROOT` fixo compartilhado.* A lane
  `vm-prep-precisao` evitou deliberadamente chamar esse script no build final por esse
  motivo, preferindo reimplementar o passo em Python puro contra um destino isolado
  (`assertPrivateOutput` recusa GLB dentro do repo, mas não impede colisão entre lanes
  no mesmo `PRIVATE_ROOT` compartilhado). Qualquer lane rodando em paralelo deveria
  redirecionar `privateRoot` para um caminho isolado, não usar o default.

**Runtime (attach / cache / fallback) — BUG-76**
- *Pack escondido antes de confirmar que existe Mint para o lugar.* `attachMintWeapon`
  chamava `hidePackGun(entry)` antes de resolver o `wrap` e saía por `if (!wrap) return
  null` — família ficava sem arma nenhuma pelo resto da sessão. Conserto:
  `hasWeapon(weaponId)` obrigatório antes de esconder o pack;
  `fallbackParaOPack`/`pedirModeloDeMundo` restauram e reencaixam quando o GLB chega.
- *Cache cai silenciosamente na AWP.* `weaponModel(id)` = `_cache.get(id) ||
  _cache.get('awp')` — arma não carregada ainda vira a malha da AWP com o nome certo
  (medido: `mint_weapon_m92` com malha `sniper_1`, escala errada). Conserto: `hasWeapon`
  obrigatório antes do wrap.
- *Caminho legado monta tudo uma vez no boot.* `game.js` `_buildViewModels` montava
  `rw` de TODAS as armas com o que estivesse em cache; `alignHands` mascarava a malha
  errada como "mão fora do quadro". Sintoma: 25/26 armas (inclusive a faca) montavam a
  AWP. Conserto: `hasWeapon(id)` obrigatório em `mountRw` + montagem tardia quando o GLB
  chega.
- *Câmera aprovada no Blender ≠ câmera do navegador.* `build_ak_hires_pilot.py` compõe
  com VFOV próprio, mas o export com `use_selection=True` seleciona só rig+meshes e
  descarta a câmera; `authoredvm.js` reconstruía a projeção pela regra HFOV 90, que em
  3:2 dá VFOV 67,38° — divergente. Ainda pendente como requisito formal (comparar
  matriz de projeção exportada em vez de recompor à mão em JS).

**Régua / medição**
- *Token de classificação por substring casa com o nó errado.* `arm` (substring) batia
  em `Armature` (pai de todo skinned mesh) — régua classificava a arma inteira como
  mão. Conserto: tokens ancorados (match exato/limite de palavra).
- *Frame de revisão atribuído à arma errada vira régua que mede a coisa errada.* Um
  script tratou um frame de HUD `AWP` como "caso primário da LMG" porque nenhuma
  verificação conferia a arma ativa antes de agrupar frames. Conserto:
  `vm-arsenal-frames.mjs` mede por captura já sabendo qual arma está ativa
  (inventário de malhas em `frames.json`).
- *Exceção legítima de "arma não desenha".* `sniper`/`bolt` escondem o viewmodel de
  propósito no ADS (luneta em tela cheia) — `awp/ads` mede 0 com ou sem defeito. A
  cláusula "arma não desenha = defeito" precisa de exceção declarada para esses estados.
- *Régua estrutural passa, revisão humana reprova.* Build, contagem de ossos e
  distância a socket são checagens auxiliares, não aprovação visual — a LMG "final" (
  `a3512af0`) passou em todas as réguas verdes e foi reprovada na revisão humana por
  mãos fora do quadro na recarga. É por isso que `vm-arsenal-frames.mjs` +
  `vm-arsenal-check.mjs` existem: medir presença em quadro ao longo do clipe, não só a
  estrutura estática do GLB.

## Para produzir uma arma nova, na ordem

1. **Decidir a família.** Se a mecânica já existe (rifle com carregador, pistola com
   slide, bolt-action, bomba, revólver...), adicione a entrada em
   `tools/viewmodels/paid-pack-manifest.json` (`weapons.<id> = { family: "<família>",
   match: "exact"|"close"|"proxy" }`). Se a mecânica não existe em nenhuma família (como
   a faca), planeje um pipeline bespoke próprio reaproveitando um rig JÁ aprovado (ver
   `tools/blender/viewmodels/knife_melee/`), não o CC0 WRAD descontinuado.
2. **Garantir o GLB de família.** Se a família ainda não foi construída:
   `python3 tools/viewmodels/extract_paid_unitypackage.py --family <família>` seguido de
   `python3 tools/viewmodels/build_paid_catalog.py --family <família>` (roda
   `build_paid_family.py` no Blender + `assemble_paid_family.mjs`).
3. **Escolher encaixada ou assada.** Para cobertura rápida, pare aqui: declare
   `W('<família>')` em `public/js/data/vmconfig.js` e siga para o passo 8. Para o que vai
   a release, prossiga assando (recomendação atual, §2).
4. **Assar:** `node tools/viewmodels/bake_family.mjs --arma=<id> --render-only` primeiro
   (confirma fit/sockets no contact sheet EEVEE antes de gastar tempo de export), depois
   sem `--render-only`. Se o `PRIVATE_ROOT` default estiver em uso por outra lane
   concorrente, reimplemente o passo isolando o destino (ver armadilha do
   `bake_family.mjs` compartilhado, §6) em vez de rodá-lo direto.
5. Rodar `strip_baked_family.mjs <arma>-baked-runtime.glb` para remover a malha do pack
   e os placeholders de textura.
6. Rodar `optimize_paid_family.mjs` (uma vez por família tocada) para reduzir as
   texturas de braço compartilhadas.
7. Rodar `validate_paid_catalog.mjs` — precisa fechar 100% (67 joints, 1 câmera, socket
   a ≤2mm do baseline, clipes obrigatórios) antes de seguir.
8. **Declarar em `vmconfig.js`:** adicionar/ajustar `VM_WEAPON[<id>]` (com `baked: true`
   e `parts` se houver peça separada) e manter `VM_FAMILY[<família>].ready: false` até a
   aprovação visual.
9. Copiar o(s) GLB(s) para `/private-assets/viewmodels/<família>/` no layout que
   `authoredvm.js` espera (`urlForKey`) e dar bump em `CATALOG_VERSION`
   (`authoredvm.js:15`).
10. **Rodar as réguas gerais**, na ordem: `npm run syntax`, `npm run check:vm`, e — como
    elas não estão no `check:vm` — manualmente: `node tools/eval/viewmodel-family-contract.mjs`,
    `node tools/eval/vm-mint-audit.mjs` (se mexeu no legado), e a coleta de arsenal:
    `node tools/viewmodels/prep/vm-arsenal-frames.mjs --porta=<porta> --aspecto=32
    --armas=<id> --modo=autorado` seguido de `node tools/eval/vm-arsenal-check.mjs
    <frames.json>` (repita em `--aspecto=169` e `--modo=legado`).
11. **Medir no jogo real, não só no Blender.** Os dois relatórios mais recentes
    (`docs/reports/VM-ENCAIXE-MINT-2026-09-07.md`,
    `docs/reports/VM-PRECISAO-VERIFICACAO-JOGO.md`) provam que aprovação por render
    offline não é suficiente: câmera diverge, staging com arquivo antigo ao lado do
    novo mascara o asset, e há defeito intermitente (`svd/reload-f015` some de tela em 2
    de 4 rodadas) que só aparece medindo várias vezes. Use `?vmready=<família>` para
    ligar sem tocar o repo, capture `idle`/`ads`/`fire`/`reload-f015/035/060/085` em 3:2
    e 16:9, e repita a captura mais de uma vez antes de confiar num "verde".
12. **Checar as armadilhas do §6 explicitamente:** textura `EXT_texture_webp` sem
    `source` depois de export no Blender 5.2; nenhum GLB antigo esquecido na mesma raiz
    de staging; `hasWeapon()` sempre antes de esconder o pack ou montar wrap; arma
    sempre filha do **bone** `ik_hand_gun`, nunca do objeto; warp de evento com teto
    ≤2,5×.
13. **Revisão visual adversarial humana** nas condições do
    `docs/development/VIEWMODEL-1P-PROFISSIONAL.md` (idle, equip, disparo completo,
    recarga completa, contato crítico, comparação Blender×navegador, gravação sem
    cortes). Nenhuma régua substitui isso.
14. Só depois da aprovação: virar `ready: true` para a família/arma em `vmconfig.js`,
    família por família — nunca em lote.
15. Atualizar o estado durável: `docs/reports/VIEWMODEL-CONTINUATION-HANDOFF.md`
    primeiro, depois `.serena/memories/viewmodel-program.md` se o estado global mudou.
    Caminho, hash, métrica e decisão — nunca logs/renders/binários grandes na memória.
