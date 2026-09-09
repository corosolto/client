# Inventário técnico offline dos assets de arma (09/09)

Levantamento OFFLINE — sem browser, sem editar código, sem commit — das duas famílias de
arquivo que o viewmodel autorado consome:

- **A) Modelos de mundo**: `public/models/weapons/*.glb` — a malha que o wrap Mint encaixa
  no socket e que o caminho legado também usa.
- **B) Runtimes de família**: `public/private-assets/viewmodels/<família>/<família>-runtime.glb`
  e os `*-baked-runtime.glb` — braços/mãos + arma + clipes.

O mapa arma→família vem de `public/js/data/vmconfig.js` (`VM_WEAPON`/`VM_FAMILY`); os
aliases de modelo e a config `len/gripZ/vm/rot` vêm de `public/js/weapons.js`.

**Método**: script Node que lê o chunk JSON de cada GLB (magic+version+length nos 12
primeiros bytes; o 1º chunk começa em 12 com `[tamanho u32LE][tipo "JSON"][dados]` — dados a
partir do byte 20) e importa `weapons.js`/`vmconfig.js` ao vivo para pegar `WEAPON_IDS`,
`weaponCFG(id)` e `VM_FAMILY`/`VM_WEAPON` direto do código, sem retranscrever nada à mão.

**Reprodução**: `node vm-inventario-assets.mjs` (imprime os 5 achados em stderr e o dump
completo em JSON em stdout); `node make-report-tables.mjs` gera as tabelas abaixo a partir
desse JSON. Ambos em
`/private/tmp/claude-504/-Volumes-Zenith-Projects-game-corosolto-csbrasil-client/ad8874d3-f819-46b1-9635-ac5a102267c1/scratchpad/`.

---

## Achado 1 — armas sem modelo de mundo próprio

**0 de 26.** Todas as armas de `WEAPON_IDS` (as mesmas 26 do enunciado, incluindo a faca)
têm um `.glb` próprio em `public/models/weapons/`; `MODEL_ALIAS` (lido do literal-fonte de
`weapons.js`) está vazio (`{}`) — ou seja, nenhuma arma hoje depende de malha emprestada de
outra, nem cai no fallback por arquivo ausente.

Nota sobre o **BUG-76** citado no enunciado: conferido em `KNOWN-BUGS.md`, ele já está
**RESOLVIDO (07/09)** e a causa raiz não era arquivo-de-mundo ausente em disco — era
`weaponModel(id)` caindo em `_cache.get('awp')` quando a arma sorteada ainda não tinha sido
*pré-carregada* na sessão (`preloadWeapons`), servindo a malha da AWP/M92 no lugar da arma
certa. Esse caminho de fallback (cache frio, não arquivo ausente) segue existindo no código
(`_cache.get(MODEL_ALIAS[id] || id) || _cache.get('awp')`, `weapons.js:338`) — só não há hoje
nenhuma arma que o dispare por falta de arquivo.

## Achado 2 — materiais com `metallicFactor=1` sem `baseColorTexture`

**0 candidatos**, tanto nos 26 modelos de mundo quanto nos 18 arquivos de runtime de
família.

- **Modelos de mundo**: as 26 armas têm exatamente 1 material cada, e as 26 têm
  `metallicFactor` e `roughnessFactor` no default glTF (ambos = 1, campo omitido no JSON)
  **e** `baseColorTexture` + `metallicRoughnessTexture` presentes — ou seja, o `1` é só o
  multiplicador do canal metálico da textura PBR, não um flat "cromado" sem textura.
- **Runtimes de família**: 157 materiais no total; 102 não têm `baseColorTexture` (cor via
  `baseColorFactor` sólido — comum em luva/pano/miras) e 55 têm `metallicFactor=1`, mas a
  **interseção das duas condições é zero** — nenhum material combina as duas coisas.

## Achado 3 — braços em runtime (`GEO_FP_SK_*`)

**16 de 16 famílias têm braços.** Todo `<família>-runtime.glb` traz exatamente os mesmos 3
nós `GEO_FP_SK_Cloth_01`, `GEO_FP_SK_Glove_01`, `GEO_FP_SK_Hand`. Nenhuma família está sem.

Achado lateral (não pedido, mas parte da varredura `SOCKET_*`): 4 das 16 famílias — `smg`,
`p90`, `bolt`, `shotgun` — **não têm nó `SOCKET_*`** no runtime; a arma pendura direto em
`GEO_WEAPON_*`/`RIG_WEAPON_*`, sem socket nomeado. `MINT_*` só aparece em
`ak-baked-runtime.glb` (2 nós) — é convenção exclusiva do pipeline assado da AK.

## Achado 4 — clipes de animação por família

Todas as 16 famílias têm `idle`. Além disso, do script:

- **Sem `reload` (nem `pump`): 1/16** — `grenade` (ela usa `throw_start/loop/end`, não
  recarrega; é o comportamento esperado, não um buraco).
- **Sem `shoot`/`fire`: 13/16** — só `bolt`, `pistol` e `sniper` têm clipe de tiro; as
  outras 12 armas de fogo + a `grenade` não. Bate exatamente com o comentário already no
  código (`authoredvm.js`: "Recuo procedural em TODO tiro (12/15 famílias não têm clipe de
  fire)" — 12 das 15 famílias de arma de fogo, mais a granada que não se aplica = 13/16).
- **Sem `equip`/`draw`/`deploy`/`holster`: 16/16** — **nenhuma família tem clipe de equip**.
  `authoredvm.js:573` procura `entry.clips.has('equip_rifle')` para sacar fuzis com clipe
  autoral, mas nenhum dos 16 `*-runtime.glb` contém esse clipe hoje — o branch está morto e
  todo saque cai no arco procedural (comentário do próprio código confirma para pistola:
  "o pack não traz equip de pistola"; a varredura mostra que também não traz para fuzil).

Tabela completa (nome do clipe + duração aproximada, do `accessor.max` do sampler de tempo)
na seção de tabelas, abaixo.

## Achado 5 — discrepância de escala (`CFG.len` × bbox medida)

**Achado principal: a comparação literal não mede o que parece medir.** As 26 armas medem
**exatamente o mesmo valor** de bbox bruto no maior eixo — `0.998046875` m, idêntico bit a
bit nas 26 — porque a Mint normaliza cada malha-fonte para ~1 unidade no maior eixo antes de
exportar (comentário `weapons.js:2`). O runtime consome esse mesmo valor bruto como
denominador de `s = cfg.len / zlen` (`weapons.js:352`) para produzir o tamanho **final** em
jogo, que é `cfg.len` por construção. Ou seja: "declarado × bbox bruto" testa a saúde da
normalização de exportação, não um bug de escala do jogo.

Com o limiar de 20% pedido, **10 de 26** armas "destoam": `mp5` (51,2%), `deagle` (232,7%),
`pistol` (283,9%), `knife` (232,7%), `m92` (31,3%), `revolver38` (315,9%), `tavor` (38,6%),
`famas` (31,3%), `uzi` (112,4%), `p90` (91,9%). Isso é **esperado pelo pipeline**: armas
curtas (pistola, faca, revólver) têm `len` real bem abaixo de ~1 m, então a distância até o
`0,998` normalizado é sempre grande — não indica malha errada.

**Métrica que de fato correlaciona com "arma lê grande/pequena na tela"**: a razão
altura/comprimento do bbox bruto (`dy / maior eixo`), que é a mesma usada pelos comentários
do próprio `weapons.js` para justificar os ajustes de `vm` da `uzi` (0,69) e da `m92`
(0,479) — o script mediu **exatamente os mesmos valores** (`uzi` 0,6947, `m92` 0,4795),
validando o método. Armas com aspecto alto (`pistol` 0,76, `revolver38` 0,68, `uzi` 0,69,
`deagle` 0,59) são as que mais dependem do knob `vm` para não ficarem desproporcionais — e
todas elas já têm `vm` declarado em `CFG` hoje.

---

## Tabelas

### 1. Modelos de mundo — existência e metadados

| Arma | Arquivo | Existe | Bytes | Nós | Malhas | Vértices | Materiais | Imagens | WebP |
|---|---|---|---|---|---|---|---|---|---|
| awp | awp.glb | sim | 272 KB | 1 | 1 | 6455 | 1 | 3 | sim |
| ak | ak.glb | sim | 275 KB | 1 | 1 | 5877 | 1 | 3 | sim |
| m4 | m4.glb | sim | 314 KB | 1 | 1 | 7468 | 1 | 3 | sim |
| mp5 | mp5.glb | sim | 279 KB | 1 | 1 | 6782 | 1 | 3 | sim |
| shotgun | shotgun.glb | sim | 236 KB | 1 | 1 | 5017 | 1 | 3 | sim |
| deagle | deagle.glb | sim | 268 KB | 1 | 1 | 6061 | 1 | 3 | sim |
| pistol | pistol.glb | sim | 220 KB | 1 | 1 | 5742 | 1 | 3 | sim |
| knife | knife.glb | sim | 212 KB | 1 | 1 | 5231 | 1 | 3 | sim |
| m92 | m92.glb | sim | 1050 KB | 1 | 1 | 6811 | 1 | 3 | **não** |
| akm | akm.glb | sim | 271 KB | 1 | 1 | 6944 | 1 | 3 | sim |
| g3 | g3.glb | sim | 892 KB | 1 | 1 | 6914 | 1 | 3 | **não** |
| revolver38 | revolver38.glb | sim | 239 KB | 1 | 1 | 5966 | 1 | 3 | sim |
| md97 | md97.glb | sim | 279 KB | 1 | 1 | 6462 | 1 | 3 | sim |
| carbine | carbine.glb | sim | 243 KB | 1 | 1 | 5311 | 1 | 3 | sim |
| m400 | m400.glb | sim | 329 KB | 1 | 1 | 7609 | 1 | 3 | sim |
| mosin | mosin.glb | sim | 282 KB | 1 | 1 | 6478 | 1 | 3 | sim |
| rem700 | rem700.glb | sim | 308 KB | 1 | 1 | 6868 | 1 | 3 | sim |
| lmg | lmg.glb | sim | 352 KB | 1 | 1 | 7466 | 1 | 3 | sim |
| scar | scar.glb | sim | 333 KB | 1 | 1 | 7017 | 1 | 3 | sim |
| tavor | tavor.glb | sim | 299 KB | 1 | 1 | 6868 | 1 | 3 | sim |
| famas | famas.glb | sim | 283 KB | 1 | 1 | 6532 | 1 | 3 | sim |
| uzi | uzi.glb | sim | 268 KB | 1 | 1 | 6597 | 1 | 3 | sim |
| p90 | p90.glb | sim | 252 KB | 1 | 1 | 6121 | 1 | 3 | sim |
| svd | svd.glb | sim | 635 KB | 1 | 1 | 6444 | 1 | 3 | **não** |
| g3sg1 | g3sg1.glb | sim | 443 KB | 1 | 1 | 6882 | 1 | 3 | **não** |
| sks | sks.glb | sim | 631 KB | 1 | 1 | 6969 | 1 | 3 | **não** |

`m92`, `g3`, `svd`, `g3sg1` e `sks` são os únicos 5 sem `EXT_texture_webp` — são também os 5
maiores arquivos (443 KB a 1050 KB, contra 212–352 KB dos demais): 5 candidatos óbvios a
converter para WebP se o objetivo for reduzir o peso do pacote de modelos de mundo.

### 2. Materiais dos modelos de mundo

| Arma | Material | metallicFactor | roughnessFactor | baseColorTexture | metallicRoughnessTexture |
|---|---|---|---|---|---|
| awp | sniper Material | 1 | 1 | sim | sim |
| ak | assault_ak Material | 1 | 1 | sim | sim |
| m4 | assault_m4 Material | 1 | 1 | sim | sim |
| mp5 | smg Material | 1 | 1 | sim | sim |
| shotgun | shotgun Material | 1 | 1 | sim | sim |
| deagle | deagle Material | 1 | 1 | sim | sim |
| pistol | pistol Material | 1 | 1 | sim | sim |
| knife | knife Material | 1 | 1 | sim | sim |
| m92 | Wood Booster Draco Material | 1 | 1 | sim | sim |
| akm | akm Material | 1 | 1 | sim | sim |
| g3 | Olive Steel G3 Material | 1 | 1 | sim | sim |
| revolver38 | revolver38 Material | 1 | 1 | sim | sim |
| md97 | md97 Material | 1 | 1 | sim | sim |
| carbine | carbine Material | 1 | 1 | sim | sim |
| m400 | m400scope Material | 1 | 1 | sim | sim |
| mosin | mosin Material | 1 | 1 | sim | sim |
| rem700 | rem700 Material | 1 | 1 | sim | sim |
| lmg | lmg Material | 1 | 1 | sim | sim |
| scar | scar Material | 1 | 1 | sim | sim |
| tavor | tavor Material | 1 | 1 | sim | sim |
| famas | famas Material | 1 | 1 | sim | sim |
| uzi | uzi Material | 1 | 1 | sim | sim |
| p90 | p90 Material | 1 | 1 | sim | sim |
| svd | Walnut Scope Dragunov Material | 1 | 1 | sim | sim |
| g3sg1 | Matte Scope Marksman Material | 1 | 1 | sim | sim |
| sks | Scoped Bayonet Carbine Material | 1 | 1 | sim | sim |

### 3. Escala — `CFG.len` × bbox bruto do GLB de mundo

| Arma | len declarado (m) | bbox bruto (maior eixo, m) | diff % | aspecto altura/comprimento |
|---|---|---|---|---|
| awp | 1.15 | 0.998047 | 13.2% | 0.2603 |
| ak | 0.88 | 0.998047 | 13.4% | 0.3033 |
| m4 | 0.84 | 0.998047 | 18.8% | 0.3464 |
| mp5 | 0.66 | 0.998047 | 51.2% **>20%** | 0.3581 |
| shotgun | 1.00 | 0.998047 | 0.2% | 0.2016 |
| deagle | 0.30 | 0.998047 | 232.7% **>20%** | 0.5890 |
| pistol | 0.26 | 0.998047 | 283.9% **>20%** | 0.7613 |
| knife | 0.30 | 0.998047 | 232.7% **>20%** | 0.1781 |
| m92 | 0.76 | 0.998047 | 31.3% **>20%** | 0.4795 |
| akm | 0.88 | 0.998047 | 13.4% | 0.2994 |
| g3 | 1.10 | 0.998047 | 9.3% | 0.2564 |
| revolver38 | 0.24 | 0.998047 | 315.9% **>20%** | 0.6751 |
| md97 | 1.05 | 0.998047 | 4.9% | 0.2368 |
| carbine | 0.98 | 0.998047 | 1.8% | 0.2055 |
| m400 | 0.92 | 0.998047 | 8.5% | 0.3659 |
| mosin | 1.20 | 0.998047 | 16.8% | 0.2524 |
| rem700 | 1.15 | 0.998047 | 13.2% | 0.2877 |
| lmg | 1.10 | 0.998047 | 9.3% | 0.3190 |
| scar | 0.90 | 0.998047 | 10.9% | 0.2955 |
| tavor | 0.72 | 0.998047 | 38.6% **>20%** | 0.4168 |
| famas | 0.76 | 0.998047 | 31.3% **>20%** | 0.3816 |
| uzi | 0.47 | 0.998047 | 112.4% **>20%** | 0.6947 |
| p90 | 0.52 | 0.998047 | 91.9% **>20%** | 0.4442 |
| svd | 1.15 | 0.998047 | 13.2% | 0.2094 |
| g3sg1 | 1.12 | 0.998047 | 10.9% | 0.2838 |
| sks | 1.02 | 0.998047 | 2.2% | 0.2250 |

Ver a leitura correta desta tabela no Achado 5 — a coluna "diff %" é um artefato da
normalização de exportação (constante 0,998047 nas 26 linhas), não uma medida de defeito.

### 4. Runtimes de família — arquivos

| Família | Arquivo | Symlink | Bytes | Nós | Malhas | Vértices | Materiais | Imagens | WebP | Clipes |
|---|---|---|---|---|---|---|---|---|---|---|
| ak | ak-runtime.glb | não | 4111 KB | 79 | 4 | 41573 | 10 | 9 | sim | 3 |
| ak | ak-baked-runtime.glb | não | 2553 KB | 84 | 5 | 19616 | 4 | 6 | sim | 3 |
| ar | ar-runtime.glb | não | 4500 KB | 85 | 4 | 45980 | 17 | 9 | sim | 3 |
| mp5 | mp5-runtime.glb | não | 3640 KB | 83 | 4 | 29492 | 10 | 9 | sim | 3 |
| smg | smg-runtime.glb | não | 3676 KB | 87 | 4 | 28646 | 5 | 9 | sim | 3 |
| p90 | p90-runtime.glb | não | 7672 KB | 134 | 4 | 44193 | 8 | 9 | sim | 4 |
| g3 | g3-runtime.glb | não | 3620 KB | 83 | 4 | 29657 | 15 | 9 | sim | 3 |
| marksman | marksman-runtime.glb | não | 4237 KB | 82 | 4 | 40313 | 12 | 9 | sim | 3 |
| svd | svd-runtime.glb | não | 3846 KB | 81 | 4 | 34158 | 13 | 9 | sim | 3 |
| sniper | sniper-runtime.glb | não | 3917 KB | 82 | 4 | 23641 | 5 | 9 | sim | 4 |
| bolt | bolt-runtime.glb | não | 4167 KB | 85 | 4 | 22016 | 5 | 9 | sim | 6 |
| deagle | deagle-runtime.glb | não | 2958 KB | 81 | 4 | 21498 | 4 | 9 | sim | 3 |
| pistol | pistol-runtime.glb | não | 2935 KB | 83 | 4 | 22150 | 12 | 9 | sim | 4 |
| pistol | pistol-baked-runtime.glb | **sim** | 2935 KB | 83 | 4 | 22150 | 12 | 9 | sim | 4 |
| revolver | revolver-runtime.glb | não | 3381 KB | 88 | 4 | 18654 | 9 | 9 | sim | 2 |
| shotgun | shotgun-runtime.glb | não | 3437 KB | 81 | 4 | 26650 | 5 | 9 | sim | 6 |
| lmg | lmg-runtime.glb | não | 6651 KB | 105 | 4 | 38601 | 5 | 9 | sim | 3 |
| grenade | grenade-runtime.glb | não | 2515 KB | 83 | 14 | 26296 | 6 | 18 | sim | 4 |

`pistol-baked-runtime.glb` é um **symlink** para `pistol-runtime.glb` (não é um bake
distinto — é um alias de compatibilidade de URL para o caminho `${family}#${weapon}` do
código, `authoredvm.js:200`). `ak-baked-runtime.glb` é a única família com um bake de
verdade e conteúdo diferente do `-runtime.glb` (menos vértices, menos materiais, 2 nós
`MINT_*` exclusivos).

### 5. Nós especiais por família (runtime principal)

| Família | GEO_WEAPON_* | GEO_FP_SK_* (braços) | SOCKET_* | MINT_* | Braços? |
|---|---|---|---|---|---|
| ak | 1 | 3 | 1 | 0 | sim |
| ar | 1 | 3 | 1 | 0 | sim |
| mp5 | 1 | 3 | 1 | 0 | sim |
| smg | 1 | 3 | 0 | 0 | sim |
| p90 | 1 | 3 | 0 | 0 | sim |
| g3 | 1 | 3 | 1 | 0 | sim |
| marksman | 1 | 3 | 1 | 0 | sim |
| svd | 1 | 3 | 1 | 0 | sim |
| sniper | 1 | 3 | 1 | 0 | sim |
| bolt | 1 | 3 | 0 | 0 | sim |
| deagle | 1 | 3 | 1 | 0 | sim |
| pistol | 1 | 3 | 1 | 0 | sim |
| revolver | 1 | 3 | 1 | 0 | sim |
| shotgun | 1 | 3 | 0 | 0 | sim |
| lmg | 1 | 3 | 1 | 0 | sim |
| grenade | 0 | 3 | 0 | 0 | sim |

### 6. Clipes de animação por família

| Família | Clipes (nome: duração aprox. em s) | Faltando (idle/reload/shoot/equip) |
|---|---|---|
| ak | idle: 0.12; reload_tactical: 2.533; reload_empty: 3.067 | shoot, equip |
| ar | idle: 1.12; reload_tactical: 2.667; reload_empty: 3.167 | shoot, equip |
| mp5 | idle: 1.12; reload_tactical: 3; reload_empty: 4 | shoot, equip |
| smg | idle: 1.12; reload_tactical: 3; reload_empty: 4.333 | shoot, equip |
| p90 | idle: 6.633; reload_tactical: 3.267; reload_empty: 3.7; inspect: 6.617 | shoot, equip |
| g3 | idle: 0.12; reload_tactical: 2.633; reload_empty: 3.883 | shoot, equip |
| marksman | idle: 0.12; reload_tactical: 2.683; reload_empty: 3.333 | shoot, equip |
| svd | idle: 0.24; reload_tactical: 3.167; reload_empty: 3.5 | shoot, equip |
| sniper | idle: 0.24; reload_tactical: 3.333; reload_empty: 4.667; shoot: 1.667 | equip |
| bolt | idle: 0.933; reload_empty: 4.667; reload_start: 1.267; reload_loop: 0.767; reload_end: 1.967; shoot: 1.5 | equip |
| deagle | idle: 0.44; reload_tactical: 2.667; reload_empty: 3.667 | shoot, equip |
| pistol | idle: 0.467; reload_tactical: 2.317; reload_empty: 2.583; shoot: 0.45 | equip |
| revolver | idle: 8.84; reload_empty: 7.333 | shoot, equip |
| shotgun | idle: 0.44; reload_start: 0.8; reload_loop: 0.767; reload_end: 1.167; pump_empty: 2.5; pump: 0.667 | shoot, equip |
| lmg | idle: 0.12; reload_tactical: 6.167; reload_empty: 6.867 | shoot, equip |
| grenade | idle: 0.1; throw_start: 1.533; throw_loop: 3.367; throw_end: 1.033 | reload, shoot, equip |

`inspect` (p90) não é uma das 4 categorias pedidas — é um clipe extra sem uso identificado
no código (`clipKey`/`CLIP_ALIASES` de `authoredvm.js` não referenciam `inspect`).

---

## Scripts

- `vm-inventario-assets.mjs` — parser de GLB + cruzamento com `weapons.js`/`vmconfig.js`;
  imprime os achados 1–5 em stderr e o dump completo em JSON em stdout.
- `make-report-tables.mjs` — gera as 6 tabelas acima a partir do JSON do script anterior.

Ambos em
`/private/tmp/claude-504/-Volumes-Zenith-Projects-game-corosolto-csbrasil-client/ad8874d3-f819-46b1-9635-ac5a102267c1/scratchpad/`.
