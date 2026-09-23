# Viewmodel K — grupo C (malha/compartilhado): manga oca, AKM e recarga da LMG

**Data:** 23/09/2026 · **Branch:** `vm/fix-mesh` · **Base:** `vm/launch-k` (`1b5858568`, PR #629) ·
**Origem:** fila `artifacts/review-L1/FILA-CORRECAO.md` (crítico cego r2, 10/10 reprovadas).

Retrato datado. O estado vivo é o que as réguas citadas imprimem.

## 1. Manga oca (shotgun, sks, lmg e mais 17) — conserto único no runtime

**Causa medida.** A manga KINEMATION (`CoroSolto_FP_Cloth`) termina aberta: nos produtos de
fuzil, no deltoide, a poucos centímetros **atrás** da câmera embutida (sks: laço em
z = +0,03 m, raio 0,096 m); na lmg e na shotgun, cortada no cotovelo (`lmg-final.mjs` apara a
manga proximal de propósito) e à frente da câmera. O `FAMILY_FRAME`/`VM_FRAME` empurra o pacote
inteiro para a frente (sks z −0,369, lmg −0,409, p90 −0,600) para caber o tamanho da AK, e a boca
aberta da manga entra no quadro. Não é textura, `side` de material nem near plane: é geometria
aberta levada para dentro do frustum pelo enquadramento.

**Régua antes do conserto.** `npm run eval:vm-manga-oca` (`tools/eval/vm-manga-oca-check.mjs`)
passa cada produto K pelo `cameraSpacePackage` real, pousa todos os clipes do GLB (+ `equip_rifle`
do general e o arco de saque) com o mount do runtime e projeta a ponta da manga nas duas proporções.
Estado da base: **20/24 reprovadas** (awp, m4, mp5, shotgun, deagle, m92, g3, revolver38, md97,
carbine, m400, mosin, rem700, lmg, scar, tavor, famas, svd, g3sg1, sks).

**Conserto.** `public/js/vmsleeve.js`, chamado uma vez em `cameraSpacePackage` para toda malha de
manga K: acha os laços abertos, prolonga cada boca para trás da câmera (+z do mount, 0,9 m além do
plano da câmera) em quatro anéis cuja pele passa do osso da borda para o tronco (`spine_03`) e fecha
a ponta. O repouso de cada anel é resolvido na pose do `idle` (a pose padrão dos nós deixa o braço
1,9 m abaixo da câmera). Vale para os 24 produtos e para qualquer re-assado futuro dos outros
agentes, sem re-hash de asset. AK golden e trilhas goldsrc/retarget ficam de fora (UV e rig
próprios).

**Depois:** 24/24 verdes; mutantes `sem-extensao` (20 vermelhas) e `extensao-curta` (8 vermelhas)
mordem.

**Consequência para a revisão:** muda a imagem de TODAS as armas K que mostram o braço. Onde o
frame empurra o pacote para longe (sks, svd, uzi, p90, lmg), o braço agora sai do quadro como um
tubo contínuo e grosso — sem cone oco, mas o tamanho da manga continua sendo do enquadramento
(Codex / vm-reguas), não da malha.

## 2. Arquivos compartilhados versionados por bytes

`shared/T_*.webp` (9), `shared/general-runtime.glb` e `recoil.json` saíam com `?v=paid-aaa-3`
fixo (classe BUG-157). Agora `public/js/data/vmsharedver.js`, gerado por
`node tools/viewmodels/gen-vmsharedver.mjs` a partir dos bytes locais, versiona cada um; as trilhas
`goldsrc-vm`/`retarget-vm` entram no mesmo mapa quando existirem no catálogo. `vm-cache-assets.mjs`
chama os três carregadores reais com o portão de node aberto e cobra URL = hash; `--mutantes` roda
os 9 mutantes (dois novos: `shared-congelado`, `shared-reexportado`), todos vermelhos. O
`eval:vm-cache` do `package.json` continua sem `--mutantes`: fora da máquina com catálogo os
mutantes de bytes não têm arquivo para morder.

Resta um `?v=` fixo fora do meu escopo: `game.js` carrega `grenade/grenades-world.glb?v=paid-aaa-1`.

## 3. AKM "apontada pro alto" — override removido; premissa de malha pequena refutada

- O `rotDeg [15,-16,-5]` + `fov 60` de `vmframe.js` foi apagado: a AKM volta ao ângulo da família
  `ak` (horizontal, como M92 e AK).
- **A malha não é pequena para as mãos.** Com a mesma pose de braço (produtos AKM e M92 têm
  `hand_r`/`hand_l` idênticos), a AKM mede 0,88 m (= `CFG.len`) contra 0,684 m da M92, e os sockets
  `grip_r`/`support_l` caem na palma das duas mãos no idle. O 0,50× do `vm-frame` é artefato do
  percentil de 2 % sobre vértices: a coronha da AKM passa atrás do plano da câmera e é esparsa em
  vértices. Com o mesmo frame da M92: percentil 0 → 1,614×; 0,5 % → 1,388×; 2 % → 0,500× (M92:
  1,080 / 1,106 / 0,987). O `rotDeg` antigo fechava a régua levantando o cano — a régua estava sendo
  jogada, não a arma consertada.
- **`eval:vm-frame` fica vermelho para a akm** (0,573× / 0,551× no frame da família) — declarado, não
  escondido. Proposta para vm-reguas: medir silhueta visível (rasterizada/recortada à tela) em vez de
  percentil de vértice.
- Opção B para o dono, **não ligada**: `tools/viewmodels/prep/scale-weapon-about-socket.mjs` reescala
  a arma em torno de `grip_r` (grip fixo em todo quadro). A 1,4× a arma fica maior na tela, mas o
  `support_l` vai 18 cm à frente da mão esquerda (era 6 cm, a distância pulso→palma). Capturas lado a
  lado em `artifacts/fix-mesh/akm-opcao-escala1.4/` e `depois-akm-familia/`.

## 4. LMG — recarga de fita sem tampa, caixa nem fita

**Causa medida.** Tampa, bandeja, alavanca, trilho, seletor e caixa (com a fita pendurada) são
ossos irmãos de `neutral_bone` sob `RIG_WEAPON_LMG`, mas o transform local deles está num espaço sem
o offset que `neutral_bone` carrega. O desvio `E = N·inv(Nb)·Pb·inv(P)` é **idêntico nas seis peças**
(translação 39,6/−61,9/6,9 cm + rotação): no idle, a tampa fica 0,41 m à direita, 0,33 m abaixo e
atrás da câmera — fora do quadro em toda a recarga. O `lmg-final-verify` media rotação local da tampa
no rig e passava.

**Régua antes do conserto.** `tools/eval/vm-lmg-tampa-tela-check.mjs`: vértices de cada peça
projetados em 1440×960 com o mount do runtime. Base: tampa a 0,499 m do corpo, 0 % da tampa, caixa e
fita no quadro nas duas recargas. `--mutante=produto-velho` mede o produto do catálogo e fica
vermelho.

**Conserto.** `tools/viewmodels/prep/lmg-part-parent-fix.mjs` insere o nó `LMG_PARTS_BIND_FIX`
(matriz E) entre o rig e as peças; animação intacta. Depois: tampa assenta no corpo (0,000 m),
100 % de tampa/caixa/fita no quadro, tampa se move 157–161 px na tela. `eval:vm-lmg-final` e
`eval:vm-lmg-lifecycle` verdes com o novo hash (`heavy-candidates.json`, `vmbytes.js`).

**Enquadramento 0,72× (dono decide).** Opção B `z = −0,375` → 0,877× (3:2) / 0,837× (16:9), braço
0,72×; passa do teto da faixa própria da lmg (0,85) em 3:2. Capturas: `artifacts/fix-mesh/
depois-final/lmg-*` (0,72×, atual) e `artifacts/fix-mesh/lmg-opcao-b-z0375/` (0,877×). Nada mudou em
`FAMILY_FRAME.lmg`.

## Portões

Rodados com `CSBRASIL_VM_ASSET_ROOT` apontando para o overlay privado desta frente.

| Portão | Resultado |
|---|---|
| `eval:vm-manga-oca` + 2 mutantes | 24/24 · mutantes vermelhos |
| `vm-lmg-tampa-tela-check` + mutante | verde · mutante vermelho |
| `eval:vm-rig`, `eval:vm-foundation`, `eval:vm-launch` | verdes |
| `eval:vm-cache` (+ `vm-cache-assets --mutantes`, 9/9) | verde |
| `eval:vm-autorado-vivo --todas` | 25/25 com mão visível |
| `eval:vm-lmg-final`, `eval:vm-lmg-lifecycle` | verdes |
| `eval:vm-rifle-akm` | verde |
| `eval:vm-rifle-akm-lifecycle` | vermelho **pré-existente** ("família AK continua ready:false", igual na base) |
| `eval:vm-frame` | vermelho: pistola (pré-existente, outro agente) + **akm** (item 3) |
| `eval:vm-dmr-assets`, `eval:vm-dmr-lifecycle`, `eval:vm-smg-mp5`, `eval:vm-shotgun-final` | verdes |
