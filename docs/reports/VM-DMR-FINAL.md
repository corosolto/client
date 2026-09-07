# Lane vm-dmr-final — Remington 700 e G3SG1

Data: 07/09/2026. Branch `claude/vm-dmr-final`, worktree
`/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-dmr-final`,
base técnica aceita `d35c6658` (tip da integradora `codex/vm-astra-pistol`:
faca fechada localmente, luvas revisadas — a mesma base das lanes prep de
AWP/escopeta/armas curtas).

## Objetivo e definição de pronto desta lane

Viewmodels finais de 1ª pessoa para **Rem700** e **G3SG1**, com os dois
mecanismos investigados e autorados SEPARADAMENTE, mãos/braços de todos os
times, ações completas, contato verificado, ADS/luneta, enquadramento 3:2/16:9
e integração local opt-in. Pronto técnico = réguas verdes com mutantes que
mordem + inspeção visual dos frames críticos registrada abaixo. **Não é
aprovação de produção**: game visual no navegador, contato fino e aprovação do
dono seguem pendentes, como em toda lane desta frente.

## Contexto de arsenal (decisão do dono preservada)

Rem700 e G3sg1 saíram do arsenal em `84f691d1` (30/08) como duplicatas de
viewmodel. Esta lane **não restaura** as armas: a integração local (8162) só
as traz de volta com o parâmetro `?vmdmr=<arma>`; sem o parâmetro o jogo é a
base intacta. A recarga em bloco do jogo não muda; balanceamento pré-corte
(`84f691d1^`) é usado apenas no staging.

## Mecanismos — investigados separadamente

Evidência: `artifacts/viewmodels/dmr/inspect/{arma}/` (vistas ortográficas +
close do receiver + JSON de medidas) e `artifacts/viewmodels/dmr/donadores/`.

### Rem700 ("CAÇADOR") — ferrolho + alimentação coerente

- Malha Mint única (6.868 vértices), cano no eixo X bruto (+X = boca),
  Y = cima, Z = lado. Luneta sobre rail com torre; **sem carregador
  destacável** — magazine interno com soleira, nada protrai abaixo da coronha
  (visto no topo e nos closes do receiver).
- Ferrolho: maçã redonda + haste retilínea a ~55-60% do comprimento a partir
  da boca, protrai num dos lados; porta de ejeção rasa atrás do anel dianteiro
  da luneta.
- **Doador `bolt` (Kar98K, KINEMATION)**: clipes reais `shoot` (1,2 s —
  inclui o ciclo de ferrolho), `reload_start/loop/end/empty` — a recarga em
  laço **thumba cartucho a cartucho de um clip de 5 no magazine interno**,
  com bones próprios (`Bolt`, `Clip`, `CartridgeClip0-4`, `Cartridge`).
- Coerência: a caçadora tem `mag: 5` e o clip do doador tem exatamente
  **5 cartuchos**; o estilo `bolt_loop` do runtime toca
  `reload_start + N×reload_loop + reload_end` por munição faltante
  (`authoredvm.js` reload). Ferrolho separado como peça móvel segue o bone
  `Bolt`; o clip e os 5 cartuchos do doador entram como props rígidos nos
  bones próprios.

### G3SG1 ("FRITZ") — carregador/ação, SEM movimento de ferrolho

- Malha Mint única (6.882 vértices), cano no eixo X bruto (+X = boca),
  **Z = cima, Y = lado** (convenção invertida vs rem700 — capturada na
  montagem por eixos por arma). Luneta em pedestal, **alavanca de armar
  frontal-superior**, **carregador reto destacável** à frente do guarda-mato,
  quebra-chama com ranhuras.
- **Doador `g3` (G3, KINEMATION)**: `reload_tactical` (2,107 s) e
  `reload_empty` (3,107 s) — troca de carregador; **sem clipe de shoot**
  (semi-auto: recuo procedural, como 12 das 15 famílias).
- Coerência: o carregador Mint separado segue o bone `Mag`; nenhum clipe de
  ferrolho existe no pacote e a régua **reprova** se `shoot`/`reload_*` de
  ferrolho aparecerem no GLB do g3sg1 (mutante + lista de proibidos).

## Pipeline construído (prefixo `dmr-` em `tools/viewmodels/prep/`)

1. `dmr-inspect.py` — inspeciona cada Mint separadamente (vistas, closes,
   medidas normalizadas pelo CFG histórico pré-corte).
2. `dmr-donor.py` — inventário dos doadores bolt/g3 (bones de arma, ações,
   raw-clips com durações, render do idle do .blend).
3. `dmr-build.py` — estágios `montar` (cópia do .blend doador + registro da
   Mint sobre o doador por cano/cima/lado/grip no hand_r + props do doador
   separados + clipes importados), `partes` (seleção geométrica medida:
   maçã do ferrolho |z|>0.09 na janela do receiver; carregador z<−0.048 entre
   x −0.27..0.03), `sockets`, `assar` (vértices no espaço do rig + skin),
   `render` (frames críticos 3:2/16:9 pela câmera exportada), `extrair`
   (mini-GLB rígido em coordenadas de mundo), `exportar` (GLB Blender — ver
   lição abaixo).
4. `dmr-assemble.py` — **splice glTF-level**: base = GLB de família da
   produção (bolt-runtime/g3-runtime: braços, rigs, clipes, câmera, atlas),
   remove o mesh da arma doadora e anexa Mint/peça/props como **nós rígidos
   filhos dos bones** com `local = inv(mundo_do_pai) @ mundo_da_peça`.
   Sockets calculados dos vértices reais do mini (boca = extremo fino do
   cano; mira = ponto mais alto e mais à retaguarda — óculo da luneta).
5. `dmr-verify.mjs` — régua de runtime com o MESMO three/GLTFLoader do jogo
   (`public/vendor`), sem npm/browser.
6. `dmr-teams.py` — renders dos 6 estilos de mão (E/B/C/F/U/neutral com as
   cores de `TEAM_HANDS`) + contact sheets.
7. `dmr-stage.py` — staging opt-in 8162.

### Lição de export registrada

O exporter glTF do Blender 5.2 **não preserva** o attachment bone-parent com
`parent_inverse` compensando a escala 0.01 do rig (nós saem com escala ×100+
e translações de milhares; o skin de malhas ligadas tardiamente ao rig de
arma aninhado colapsa num ponto). A saída usada é a mesma da produção
assemblada em nível glTF: meshes rígidas anexadas por hierarquia de nós, uma
por bone — o Blender fica só na autoria/verificação, o glTF final é montado
sobre o GLB de família que o jogo já serve.

## Réguas e evidência

`node tools/viewmodels/prep/dmr-verify.mjs` (three vendorizado, CPU):

- Contrato: nó `MINT_WEAPON_<ID>`, `SOCKET_MINT_MUZZLE/SIGHT` dentro da caixa
  da arma, câmera embutida FOV 80, materiais `CoroSolto_FP_*` (tintáveis por
  time no runtime), comprimento real 1,15/1,12 m.
- Mecanismo: excursão da peça no clipe-mestre (ferrolho no `shoot` ≥3 cm;
  carregador no `reload_tactical` ≥8 cm); clipes por arma (rem700:
  idle/shoot/reload_start/loop/end/empty; g3sg1: idle/reload_tactical/
  reload_empty); **clipes de ferrolho são proibidos no g3sg1**.
- ADS/luneta: eixo boca→óculo colinear ao cano (<12°).
- **Mutantes que mordem (Lições 3 e 8)**: remove_clipe, renomeia_mint,
  tira_camera, desloca_socket, congela_peca — todos vermelhos, com assert de
  aplicação.
- Estado: `DMR_VERIFY_OK` nas duas armas.

Hashes de insumos/produtos: `artifacts/viewmodels/dmr/hashes.json`.
Controle dos doadores (SHA-256):

| Arma | Base (família) | GLB baked (SHA-256) |
|---|---|---|
| rem700 | bolt-runtime `a6b2a701…` | `57f09376…3678d60a36` |
| g3sg1 | g3-runtime `51dfcacd…` | `5a82d29d…f1db05` |

Contact sheets: `artifacts/viewmodels/dmr/<arma>/cand1/contact-sheet-{3x2,16x9}.png`
(idle → shoot → alimentação → fechamento do ferrolho; idle → troca de pente).
Frames 3:2/16:9 por clipe em `cand1/frames/`; times em `cand1/times/`.

## Inspeção visual dos frames críticos (olhados, não presumidos)

- rem700 idle: diagonal clássica inferior-direita→centro, luneta legível,
  direita no punho com indicador no gatilho, esquerda sob o guarda-mão com
  dedos envolvendo a coronha. Sem dupla arma, sem peça solta.
- rem700 shoot 0,6 s: conjunto recuou/desceu (coice + ciclo), cartucho de
  latão ejetando visível, mão direita em trânsito grip↔ferrolho.
- rem700 reload_loop 0,3 s: **clip com 5 cartuchos na mão esquerda sobre a
  ação aberta, ferrolho levantado**, cartucho sendo pressionado.
- rem700 reload_end 1,55 s: ferrolho fechado e travado, mãos de volta.
- g3sg1 idle: luneta em cima, carregador reto embaixo à frente do guarda-mato,
  orientação correta (não rolada — os eixos invertidos da Mint foram
  corrigidos na montagem).
- g3sg1 reload_tactical 1,0 s: carregador fora do poço seguindo a mão.
- **Limites vistos com honestidade**: (1) o ferrolho do rem700 é a peça
  maçã+haste — o corpo cilíndrico interno fica estático (costura aceita nesta
  candidata; o doador faz igual no próprio Kar98K renderizado); (2) o
  carregador do g3sg1 usa a geometria Mint — o "pente reserva" na mão durante
  a troca não tem malha própria nesta candidata; (3) closes de contato
  dedo-a-dedo (padrão M4 C4) não foram reautorados — os contatos vêm do doador
  e foram conferidos por render, não por BVH; (4) a alavanca de armar do
  g3sg1 é parte da malha estática (o bone `ChargingHandle` do doador existe
  para uma rodada futura).

## Integração local (staging 8162)

`python3 tools/viewmodels/prep/dmr-stage.py` materializa
`artifacts/viewmodels/dmr/local-server-8162` (padrão `rifles-m4-stage.py`):
código do jogo com as cópias editadas `weapons.js` (arsenal filtrado por
`?vmdmr=`), `data/weapons.js` (stats pré-corte inertes), `data/vmconfig.js`
(`rem700: W('bolt', baked)`, `g3sg1: W('g3', baked)` sob a opção) e
`authoredvm.js` (baked DMR usa a câmera exportada sem offsets de família).
GLBs servidos por symlink dos artefatos. Servidor ativo (astro 7.1.1):

- rem700: http://127.0.0.1:8162/?debug=1&auto=E&vmweapon=rem700&map=brasilia&armaslazy=0&vmready=bolt&vmdmr=rem700
- g3sg1: http://127.0.0.1:8162/?debug=1&auto=E&vmweapon=g3sg1&map=brasilia&armaslazy=0&vmready=g3&vmdmr=g3sg1

Smoke: index 200, GLBs 200 (bytes conferidos), `js/*` editados 200, sintaxe
node OK. **Nenhum navegador foi aberto por esta lane** — o jogo visual é do
dono.

## Reprodução

```sh
cd worktrees/vm-dmr-final
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 \
  --python-exit-code 1 --python tools/viewmodels/prep/dmr-inspect.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 \
  --python-exit-code 1 --python tools/viewmodels/prep/dmr-donor.py
for arma in rem700 g3sg1; do
  /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 \
    --python-exit-code 1 --python tools/viewmodels/prep/dmr-build.py -- $arma tudo
  /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 \
    --python-exit-code 1 --python tools/viewmodels/prep/dmr-build.py -- $arma extrair
  /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 \
    --python-exit-code 1 --python tools/viewmodels/prep/dmr-build.py -- $arma render
done
python3 tools/viewmodels/prep/dmr-assemble.py
export PATH=/opt/homebrew/bin:$PATH && node tools/viewmodels/prep/dmr-verify.mjs
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 \
  --python-exit-code 1 --python tools/viewmodels/prep/dmr-teams.py
python3 tools/viewmodels/prep/dmr-stage.py
```

## Pendências explícitas

1. Jogo visual no navegador (3:2 e 16:9 reais, ADS com máscara de luneta,
   troca de arma durante recarga, rajada) — links acima, decisão do dono.
2. Contato fino dedo-a-dedo e afinação das peças (padrão da M4 aprovada) para uma
   candidata C2, se o dono aprovar a composição C1.
3. `equip_rifle` vem do pack compartilhado (general-runtime) — saque próprio
   por arma é rodada futura.
4. Aprovação visual do dono e crítico independente antes de qualquer
   `ready:true` ou promoção a produção; nada disto entra no repositório do
   jogo (staging opt-in em artifacts).
