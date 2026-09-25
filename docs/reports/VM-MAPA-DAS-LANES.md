# Mapa das lanes de viewmodel — auditoria read-only (09/09/2026)

Auditoria das 14 lanes de viewmodel listadas para investigação, feita sem editar código,
sem rodar browser e sem commitar. Todas as datas/hashes abaixo foram lidos direto do
histórico git e dos arquivos em disco nos worktrees — nenhuma afirmação de relatório de
lane foi aceita sem checar o arquivo/commit correspondente.

## 0. Achado estrutural que precede tudo o resto

Antes de entrar lane por lane, dois fatos de infraestrutura mudam como ler qualquer
"GLB final" e qualquer tabela de status encontrada nas lanes:

1. **`artifacts/` e `public/private-assets/` são gitignorados no repositório inteiro**
   (`.gitignore:204-215`: *"`artifacts/` são 1,1 GB de contact sheets, grids de câmera e
   GLBs INTERMEDIÁRIOS"*). Isso vale em TODA lane. Ou seja: nenhum GLB "final" produzido
   por nenhuma das 14 lanes está versionado em git — eles só existem localmente, no disco
   do worktree onde foram gerados, e desaparecem se o worktree for removido. O caminho
   `public/private-assets/viewmodels/` citado no pedido de auditoria também é local: no
   worktree principal é um symlink para `/Users/ruben/csbrasil-private-assets/generated/`
   (um estoque de assets compartilhado, fora do git, e **não específico de branch**); em
   `vm-lmg-final` é um diretório local real, porém vazio; em outras lanes nem existe. Um
   GLB presente ali não prova que aquela lane o produziu.
2. O único caminho onde um GLB de viewmodel autorado **é** versionado em git é
   `public/models/viewmodels/**`. No branch alvo `feat/fps-paid-viewmodels-aaa` (tip
   `b18fcd833`), esse caminho contém exatamente 4 GLBs "hires": `coro/ak-hires.glb`
   (2.347.396 B), `coro/akm-hires.glb` (2.371.472 B), `coro/pistol-hires.glb`
   (1.090.592 B) e `coro/melee/knife-hires.glb` (1.057.476 B). Todos os quatro vêm do
   commit `fc32ebb13` ("resgate: versionar 6 dias de viewmodels 1P que viviam só na
   working tree"), de **28/08/2026 — anterior a todas as 14 lanes auditadas**.

**Consequência direta:** nenhuma das 14 lanes tem qualquer GLB integrado/commitado no
branch alvo. Tudo que essas lanes chamam de "final" é um checkpoint local, não commitado,
que precisa passar por uma etapa de integração que ainda não aconteceu para nenhuma arma.
O branch alvo em si tem PR próprio aberto e não mesclado: **PR #464**, `feat/fps-paid-
viewmodels-aaa` → `feat/wallpapers-brasileiros` (não `main` — confirmado via `gh pr view
464`), "feat: pipeline AAA de viewmodels pagos para as 26 armas".

Outro achado cross-cutting relevante: **BUG-76** (`KNOWN-BUGS.md:54`, RESOLVIDO 07/09) —
um bug de integração (não de nenhuma arma específica) fazia `attachMintWeapon` esconder a
arma antes de confirmar que existia malha, e `weaponModel(id)` caía em `_cache.get('awp')`
quando a arma pedida não estava carregada — ou seja, várias armas apareciam como "flutuando
sem mãos" ou com a malha errada (a da AWP) na revisão do dono **por um defeito de
integração, não do rig de cada arma**. Citação literal do dono no BUG-76: *"nao so LMG mas
todas lanes, eu ja testei ,pistola ,faca e ak e estao resolvidas, nao testei a M4A1"* — ou
seja, em 07/09 o dono confirmou pistola, faca e AK como resolvidas, mas não testou o M4A1.
O relatório `docs/reports/VM-LMG-FINAL.md` da própria lane LMG confirma que o frame que
inicialmente pareceu prova de defeito da LMG (`15.47.19`) era, na verdade, a **AWP**
renderizada no lugar errado — o mesmo BUG-76.

---

## 1. Tabela por lane

| # | Branch | Tip (hash · data) | Assunto do tip | À frente / atrás de `feat/fps-paid-viewmodels-aaa` | PR |
|---|---|---|---|---|---|
| 1 | `codex/vm-prep-rifles` | `ea022c3c0` · 07/09 | candidata offline final da recarga M4 com anelar/mínimo limpos e ferrolho explícito | 8 à frente / 200 atrás (merge-base `1d33cb7b`) | **#509 OPEN** |
| 2 | `codex/vm-prep-awp` | `d35c6658f` · 06/09 | confirma fechamento local da faca | 8 / 186 | nenhum |
| 3 | `codex/vm-prep-shotgun` | `d35c6658f` · 06/09 | (idêntico ao acima) | 8 / 186 | nenhum |
| 4 | `codex/vm-prep-armas-curtas` | `d35c6658f` · 06/09 | (idêntico ao acima) | 8 / 186 | nenhum |
| 5 | `codex/vm-prep-precisao` | `99a522684` · 07/09 | entrega final Mosin/SVD/SKS com gates verdes | 8 / 220 | **#513 OPEN** |
| 6 | `glm/vm-lmg-final` | `a8a9a8e89` · 08/09 | fix(viewmodels): preserva pega LMG no disparo | 8 / 196 | **#546 OPEN** ("REPROVADA em revisão humana") |
| 7 | `claude/vm-dmr-final` | `701e98e44` · 07/09 | separa comentário novo do legado e regenera docs | 8 / 193 | **#544 OPEN** |
| 8 | `glm/vm-controles-final` | `8b31f5dce` · 07/09 | registrar veredito do dono — "faca pistola e ak estao perfeitas" | 8 / 188 | **#549 OPEN** |
| 9 | `claude/vm-fable51-pistol` | `fd58f492b` · 04/09 | handoff da lane Fable 5.1 da pistola | 8 / 167 | nenhum |
| 10 | `vm-cs16-gabarito` | `6451ecaf5` · 01/09 | handoff da sessão pausada com o que falta arma por arma | 8 / 160 | **#468 OPEN** |
| 11 | `codex/vm-melee` | `0c370790c` · 27/08 | feat: integrar piloto aprovado de faca | base separada `75eb29ad06`: 56/2; **NÃO é ancestral** de `feat/fps-paid-viewmodels-aaa` (confirmado por `git merge-base --is-ancestor`) | nenhum |
| 12 | `codex/vm-heavy` | `062543b12` · 31/08 | preservar evidência runtime dos pesados | 56 / 5 (mesma base separada) | nenhum |
| 13 | `codex/vm-auto` | `a9fcaff60` · 27/08 | registrar evidência visual do retarget M4 | 56 / 11 (mesma base separada) | nenhum |
| 14 | `codex/vm-astra-pistol` | `d35c6658f` · 06/09 | confirma fechamento local da faca | 8 / 186 | nenhum |

**Achado sobre #2, #3, #4 e #14:** `codex/vm-prep-awp`, `codex/vm-prep-shotgun`,
`codex/vm-prep-armas-curtas` e `codex/vm-astra-pistol` apontam para o **mesmo commit
exato** `d35c6658f0c92519ad7074757e49882c535f5d87` (confirmado por `git rev-parse` e por
`git diff` vazio entre as quatro). Nenhuma delas tem um único commit divergente de arma
própria além da preparação compartilhada ("`docs(viewmodel): prepara frentes paralelas
sem disputar integracao`"). Nota importante sobre `codex/vm-astra-pistol`: apesar do nome,
o documento de orquestração (`VIEWMODEL-CATALOGO-ORQUESTRACAO.md`) a designa como **a lane
de integração runtime** (arma/mãos/animação/câmera/HUD), não uma lane de arma "pistola" —
e mesmo nesse papel de integradora ela está parada no commit de prep compartilhado, sem
nenhum commit de integração próprio registrado nesta auditoria.

---

## 2. Detalhe por lane

### 2.1 `codex/vm-prep-rifles`

- **Armas cobertas:** `m4` (única arma com candidata construída) + **receitas apenas**
  (sem candidata construída) para `scar`, `md97`, `m92`, `famas`, `carbine`.
- **GLB final:** não consta em caminho versionado. Candidatos locais (gitignorados) mais
  recentes: `artifacts/viewmodels/prep/rifles/m4-idle-grip-c4/m4-idle-grip.glb`
  (1.375.720 B, 06/09) e `artifacts/viewmodels/prep/rifles/m4-reload-final-zcode/
  m4-actions-runtime.glb` (1.446.948 B, 07/09) — apesar do nome de pasta "final", o
  próprio relatório declara a recarga **ainda reprovada**.
- **Relatório** (`docs/reports/VM-PREP-RIFLES.md`, 1.388 linhas):
  - PRONTO: nenhuma das 6 armas certificada. Citação verbatim: *"Preparação de M4, MD97,
    carabina, SCAR, FAMAS e M92, em 06/09/2026 ... nenhuma das seis armas está
    certificada."*
  - PENDENTE (idle M4): *"o candidato aguarda aprovação visual do dono, e a recarga segue
    reprovada pelas rodadas anteriores, com a pega da idle como base para reautorá-la
    depois."*
  - LIMITAÇÃO verbatim sobre as outras 5 armas: *"Os insumos existem, mas nenhuma das seis
    armas está certificada. Os GLBs próprios são estáticos; os pacotes B/C contêm
    fragmentos inadequados chamados `MINT_WEAPON_MAG_*`. A carabina tem alavanca e tubo
    sob o cano; FAMAS é bullpup; MD97 não tem carregador no GLB bruto. Portanto a receita
    M4 não pode ser aplicada automaticamente a esta família de configuração."*
  - LIMITAÇÃO sobre a mão na idle aprovada da M4: *"Palma (6,625 mm) e polegar (4,555 mm)
    ainda atravessam o punho vertical. Isso é limite material da malha da mão contra o
    cilindro do punho, não de autoria por junta."*
- **Reprovação humana:** múltiplas, todas sobre a M4 (nenhuma sobre as outras 5, que nunca
  chegaram a virar candidata para serem julgadas). Citação verbatim: *"Ruben reprovou o
  teste local: 'está muito ruim'."* Histórico extenso de reprovações de recarga (candidatas
  C1, C2, C3, tactical) — nenhuma aceita até o tip.
- **PR:** #509, OPEN.

### 2.2 `codex/vm-prep-awp` / `codex/vm-prep-shotgun` / `codex/vm-prep-armas-curtas`

- **Armas cobertas:** nenhuma. As três branches são idênticas ao commit de prep
  compartilhado `d35c6658f` — sem nenhum commit de AWP, shotgun, deagle, revolver38, m92 ou
  akm divergente. A tabela compartilhada `VIEWMODEL-INVENTARIO.md` (herdada, não produto
  destas lanes) registra `awp` e `shotgun` como `PARCIAL` na trilha de referência B/C — não
  é produção.
- **GLB final:** não consta. Existe apenas o asset legado `public/models/viewmodels/
  goldsrc/awp.glb` (776.792 B) e `goldsrc/m3.glb` (629.768 B, shotgun) — pré-existentes
  (commit `fc32ebb13`, 28/08), não entregas destas lanes.
- **Relatório dedicado:** não consta para nenhuma das três.
- **Reprovação humana:** não consta (nada foi tentado nestas branches especificamente).
  AWP e shotgun têm reprovação/evidência registradas em lane **separada**
  (`codex/vm-heavy`, ver 2.12).
- **PR:** nenhum, para as três.

### 2.3 `codex/vm-prep-precisao`

- **Armas cobertas:** `mosin`, `svd`, `sks`.
- **GLB final:** `artifacts/viewmodels/prep/precisao/final/mosin-baked-runtime.glb`
  (24.501.456 B), `svd-baked-runtime.glb` (24.297.360 B), `sks-baked-runtime.glb`
  (24.633.392 B) — todos de 07/09, todos locais/gitignorados, **não copiados** para
  `public/private-assets/` nem referenciados em nenhum `vmconfig.js` do branch alvo (que
  nem existe em `feat/fps-paid-viewmodels-aaa`).
- **Relatório** (`docs/reports/VM-PREP-PRECISAO.md`, 718 linhas):
  - PRONTO (autodeclarado): *"Resultado por arma — todos os gates verdes, `pronto:true`
    no `gates.json`"* para as três armas (T/M/C/F/A todos ✓).
  - PENDENTE/receita para o integrador: copiar os GLBs para `public/private-assets/
    viewmodels/<family>/`, rodar `optimize_paid_family.mjs`, ligar `ready:true` em
    `vmconfig.js` e **re-rodar os gates sobre os GLBs otimizados** — nada disso foi feito.
  - LIMITAÇÃO verbatim (seção "Limitações declaradas"): *"Julgamento visual é sobre
    renders offline com modelo de visão (não in-game); a prova de contato/oclusão é
    geométrica (gates + marcadores), o render é confirmação."*; *"Otimizador de texturas
    não executado aqui (deps ausentes na faixa de escrita)"*; pente da SVD é "casca própria
    de 66 tris" com coreografia "translacional (sem tilt no carrego)".
- **Verificação independente (achado crítico, fora da lane):** o próprio branch alvo tem
  `docs/reports/VM-PRECISAO-VERIFICACAO-JOGO.md`, escrito **depois** e **fora** desta lane,
  que testou os três GLBs no jogo real antes de qualquer `ready:true` e encontrou um
  defeito que o render offline não pegou. Citação verbatim: *"`svd/reload-f015`: viewmodel
  inteiro fora do quadro, de forma INTERMITENTE ... Reproduzido em 2 de 4 rodadas."* E o
  veredito: *"Não recomendo `ready:true` enquanto o `svd/reload-f015` não for entendido: é
  exatamente o defeito que o dono reprovou em 07/09 — arma sem mãos e sem arma na tela — só
  que intermitente, que é a forma mais cara de deixar passar."* Ou seja: **o `pronto:true`
  autodeclarado pela lane não resiste à checagem em jogo real** — exatamente o tipo de
  afirmação que esta auditoria foi instruída a não aceitar sem checar.
- **Reprovação humana:** não há reprovação registrada especificamente sobre Mosin/SVD/SKS
  (a comparação acima é com a reprovação da LMG, por analogia de sintoma).
- **PR:** #513, OPEN.

### 2.4 `glm/vm-lmg-final`

- **Arma coberta:** `lmg`.
- **GLB final:** candidato local mais recente `artifacts/viewmodels/prep/lmg/lmg-candidate/
  lmg-runtime-candidate.glb` (5.420.020 B, 08/09); a versão que chegou a ser marcada
  `ready:true` e depois revertida está preservada como `lmg-runtime-rejected.glb`
  (5.397.032 B, SHA `0f1df532…6104e9`). Nenhum dos dois está em caminho versionado.
- **Relatório** (`docs/reports/VM-LMG-FINAL.md`): título do próprio arquivo já é
  `"VM-LMG-FINAL — viewmodel LMG (METRALHA "TRETA PESADA") — REPROVADA em 07/09"`.
  - PRONTO: nada — `lmg.ready` está em `false` no tip.
  - PENDENTE, citação verbatim do estado mais recente (checkpoint de 08/09): *"Isso NÃO
    fecha a LMG ... a mão de apoio ainda não está legível em contato. A métrica atual
    agrega as duas mãos e pode passar porque a mão forte toca o punho; antes de nova
    correção é preciso separar mão de apoio/mão forte na régua. `lmg.ready:false`
    permanece, sem merge, release ou pedido de revisão humana."*
  - LIMITAÇÃO verbatim: *"Recarga tática: primeiro movimento em ~2,78 s (limitação do
    doador sem tampa girando)"*; *"Import Blender do GLB aninhado continua divergindo
    (defeito documentado da família)"*.
- **Reprovação humana — registrada e citada verbatim:** *"Ruben reprovou a versão declarada
  final (`a3512af0`, PR #546) após sessão de revisão com 19 screenshots ... Estado
  revertido no mesmo dia: `ready:false` de volta."* E o esclarecimento do dono: *"Ruben foi
  categórico: rifles e MGs já têm boa posição de arma — o que falta é as mãos no lugar
  certo."* Achado extra: o próprio relatório reconhece que o frame que a revisão apontou
  como prova do defeito da LMG (`15.47.19`) era, na verdade, a **AWP** renderizada no lugar
  errado (BUG-76), não a LMG.
- **PR:** #546, OPEN, título contém literalmente "REPROVADA em revisão humana".

### 2.5 `claude/vm-dmr-final`

- **Armas cobertas:** `rem700`, `g3sg1`.
- **GLB final:** `artifacts/viewmodels/dmr/rem700/cand1/rem700-baked-runtime.glb`
  (4.675.248 B) e `.../g3sg1/cand1/g3sg1-baked-runtime.glb` (4.036.664 B), ambos de 07/09,
  locais/gitignorados. Há também uma raiz de staging local completa em `local-server-8162`
  (servidor de teste da própria lane, não integrado ao branch alvo).
- **Relatório** (`docs/reports/VM-DMR-FINAL.md`, 242 linhas):
  - PRONTO (técnico, local): réguas verdes com mutantes para as duas armas; captura no jogo
    real feita dentro do staging próprio (`http://127.0.0.1:8163`), sem navegador aberto
    pela lane fora disso.
  - PENDENTE, citação verbatim: *"Aprovação visual do dono e crítico independente antes de
    qualquer `ready:true` ou promoção a produção; nada disto entra no repositório"* (do
    integrador). Também pendente: *"Jogo visual no navegador (3:2 e 16:9 reais, ADS com
    máscara de luneta, troca de arma durante recarga, rajada) ... decisão do dono."*
  - LIMITAÇÃO verbatim ("Resíduo honesto"): *"anelar/mínimo direitos do rem700 ~1,7/3,2 cm
    (punho da caçadora mais fino que o doador; gap lateral, não de dobra); pente-reserva do
    g3sg1 é o próprio pente Mint seguindo o bone Mag."*
- **Reprovação humana:** não consta reprovação — está em estado "aguardando revisão", não
  "reprovada".
- **PR:** #544, OPEN.

### 2.6 `glm/vm-controles-final`

- **Armas cobertas:** não é uma lane de produção de arma nova — é uma **auditoria** dos
  controles visuais já existentes de `ak`, `pistol` e `knife`. Nenhum GLB foi alterado.
- **GLB auditados (pré-existentes):** `public/models/viewmodels/coro/ak-hires.glb`
  (3.414.520 B conforme a auditoria — divergente do tamanho de 2.347.396 B lido nesta
  auditoria no tip atual do branch alvo; ver nota de reconciliação abaixo),
  `coro/melee/knife-hires.glb` (1.131.064 B — também divergente do 1.057.476 B do tip
  atual do branch alvo) e `public/private-assets/viewmodels/pistol/pistol-runtime.glb`
  (3.005.712 B, local).
  **Nota de reconciliação:** os tamanhos que a auditoria de controles cita para
  `ak-hires.glb` e `knife-hires.glb` são maiores que os commitados em `fc32ebb13` no branch
  alvo — ou seja, a lane de controles rodou sobre uma versão desses GLBs **mais nova** do
  que a que está em `feat/fps-paid-viewmodels-aaa` hoje, reforçando que nada disso está
  reconciliado/mesclado.
- **Relatório** (`docs/reports/VIEWMODEL-CONTROLES-AUDITORIA-2026-09-07.md`):
  - PRONTO — veredito do dono citado no próprio relatório: *"Ruben disse literalmente
    'faca pistola e ak estao perfeitas'."*
  - PENDENTE: *"O BUG-89 (AK em 16:9) trata de aspecto que o veredito não cobre
    explicitamente — permanece aberto."* Gauntlet 16:9 vermelho em AK (P1/P5) e pistola
    (P4, "dívida conhecida").
  - LIMITAÇÃO/o que NÃO foi verificado, verbatim: *"Contato 3D interno (penetração/
    empunhadura integral) ... continuam inconclusivas"*; *"Vídeos assistidos quadro a
    quadro (450 frames); a inspeção foi por folhas"*; *"Blends celulares/ultrawide e todo o
    arsenal fora dos três controles."*; *"Aprovação estética em nome do dono: os achados
    A–D são dele decidir."*
- **Aprovação humana (não reprovação):** commit `8b31f5dce`, "registrar veredito do dono".
- **PR:** #549, OPEN.

### 2.7 `claude/vm-fable51-pistol`

- **Arma coberta:** `pistol`.
- **GLB final:** não há pasta `final/`; GLB servido é
  `public/private-assets/viewmodels/pistol/pistol-runtime.glb` (3.005.712 B, 04/09) — local
  e compartilhado por symlink (não exclusivo desta branch).
- **Relatório** (`docs/reports/VIEWMODEL-FABLE51-PISTOL-HANDOFF.md` +
  `GOLDEN-PISTOL-DECISION.md`):
  - PRONTO: nenhum declarado pela lane. Citação verbatim: *"Quem aprova visualmente e
    declara golden é o Ruben; este arquivo não declara nada."* Estado técnico: "candidata
    técnica verde; revisão de gameplay do dono ainda pendente".
  - PENDENTE: decisão do dono entre aprovar a pistola nivelada, pedir outro pacote, ou
    rejeitar.
  - LIMITAÇÃO verbatim: *"Composição mais baixa que a referência. A caixa de H começa em
    y/H 0,70; VAL-1 (pistola) mede 0,58."*; *"A pistola é pequena no quadro (0,73%, diagonal
    12,6% contra 44% da AK)."*
- **Reprovação humana:** anterior a esta lane, citada em `GOLDEN-PISTOL-DECISION.md`: *"A
  captura rejeitada pelo dono em 01/09 mostrava somente dois antebraços cilíndricos e
  nenhuma pistola."*
- **PR:** nenhum.

### 2.8 `codex/vm-astra-pistol`

- **Arma/papel:** designada pela orquestração como a lane de **integração runtime**
  (arma/mãos/animação/câmera/HUD), não uma lane de arma "pistola" isolada. No entanto, o
  tip é idêntico ao commit de prep compartilhado `d35c6658f` — sem commit de integração
  próprio após o ponto de divergência nomeado (`7b121bfcb`, "prepara frentes paralelas").
  Os commits sobre pistola citados no histórico (yaw 15° aprovado, etc.) são anteriores ao
  ponto de divergência e pertencem à cadeia compartilhada, não a um trabalho exclusivo
  desta branch.
- **GLB final:** mesmo `pistol-runtime.glb` compartilhado citado em 2.7; nenhum GLB
  "final" próprio.
- **Relatório** (`docs/reports/VIEWMODEL-ASTRA-PISTOL-HANDOFF.md`):
  - PRONTO: yaw 15° aprovado — *"Ruben aprovou 15° e autorizou a próxima série.
    FAMILY_FRAME.pistol agora usa [0, 15, -5]."*
  - PENDENTE verbatim: *"Estado deste marco: captura validada; gauntlets 20°/15°/10° em
    sequência e crítica independente pendentes. Nenhuma candidata promovida."*
  - LIMITAÇÃO verbatim: *"Em 16:9 o filtro exige pente >2000 px e mão de apoio separada. As
    duas versões têm amostra insuficiente ... O portão continua vermelho, sem relaxamento
    de limiar."*
- **Reprovação humana:** não consta (o yaw foi aprovado, não reprovado).
- **PR:** nenhum.

### 2.9 `vm-cs16-gabarito`

- **Armas cobertas:** constrói as trilhas de **referência** B (GoldSrc/CC0) e C (retarget)
  para 19 das 26 armas: `ak, pistol, m4, m92, carbine, scar, famas, mosin, lmg, shotgun,
  deagle, revolver38, svd, sks, mp5, md97, awp, p90, uzi`. **Isto é uma trilha de
  calibração/QA, não a trilha de produção** (a trilha de produção é "A · KINEMATION", com o
  asset pago Mint). Relatório afirma: *"Nenhuma família nova ganhou `ready: true`."*
- **GLB final:** `public/private-assets/viewmodels/goldsrc-vm/*-runtime.glb` (19 arquivos,
  ex. `awp-runtime.glb` 639.532 B, `pistol-runtime.glb` 573.228 B, todos de 31/08) — são
  GLBs de referência, não de produção; não existe pasta `final/`.
- **Relatório** (`docs/reports/VIEWMODEL-HANDOFF-2026-09-01-NOITE.md` +
  `VIEWMODEL-INVENTARIO.md`):
  - PRONTO: `ak | GOLDEN_CONGELADA | nada — regressão verde`.
  - PENDENTE (verde técnico aguardando visual): `pistol`, e "verde no gauntlet, aguardando
    revisão visual" para `m4, m92, carbine, scar, famas, mosin, lmg, shotgun, deagle,
    revolver38`; `svd, sks, mp5, md97` "verde depois de `dbf1e73e`, reconfirmar na rodada
    completa".
  - REPROVADAS na trilha B, citação verbatim da tabela: `awp | reprova | P4: mão de apoio a
    32 px do pente (teto 24)`; `mp5 | reprova | P4: mão de apoio a 72 px do pente`;
    `p90 | reprova | P1 mãos não se separam · P4 mão a >192 px do pente`;
    `uzi | reprova | P6: primeiro quadro do saque a 700 px, precisa de ≥720`.
  - LIMITAÇÃO verbatim: *"As três reprovações de P4 são verdade do asset: a recarga do
    molde CS 1.6 não leva a mão de apoio até o pente nessas armas. Não invente pose no
    runtime para fechar o número."*
- **Reprovação humana:** não consta nesta lane especificamente (as reprovações acima são de
  régua/gate automatizado sobre a trilha de referência, não veredito do dono).
- **PR:** #468, OPEN.

### 2.10 `codex/vm-melee`

- **Arma coberta:** `knife`. Apenas 2 commits sobre uma base histórica bem mais antiga
  (`75eb29ad06`): *"criar piloto de faca melee"* e *"integrar piloto aprovado de faca"*.
  **Confirmado que NÃO está integrada** em `feat/fps-paid-viewmodels-aaa`
  (`git merge-base --is-ancestor 0c370790c feat/fps-paid-viewmodels-aaa` → falso).
- **GLB:** `public/models/viewmodels/coro/melee/knife-hires.glb` desta lane pesava
  1.057.476 B (27/08) — **já superado**: a cadeia compartilhada posterior (a que originou
  as demais lanes de setembro) evoluiu esse mesmo caminho para 1.131.064 B. Ou seja, existem
  hoje pelo menos duas versões divergentes e não reconciliadas do mesmo arquivo.
- **Relatório:** `tools/eval/asset-evidence/knife-melee-runtime/REPORT.md`. PRONTO
  (candidato, não aprovação): *"Esta prancha é candidata à aprovação, não uma aprovação
  automática."* LIMITAÇÃO verbatim: *"O builder depende do `pistol-hires.glb` aprovado ...
  A revisão do dono ainda é o gate de promoção. Não propagar para outras melees ou
  arremessáveis antes dela."* PENDENTE: revisão do dono, nunca registrada nesta lane.
- **Reprovação humana:** não consta nesta lane (candidato nunca chegou a ser julgado; é
  diferente da reprovação/aprovação da faca que aconteceu depois, na cadeia compartilhada e
  na auditoria de controles).
- **PR:** nenhum.

### 2.11 `codex/vm-heavy`

- **Armas cobertas:** `awp`, `shotgun` (pilotos "pesados"). Base histórica antiga
  `75eb29ad06`, 5 commits.
- **GLB:** `public/models/viewmodels/coro/heavy/awp-pilot.glb` (1.143.952 B, 27/08) e
  `.../shotgun-pilot.glb` (1.041.984 B, 27/08) — ver reprovação abaixo.
- **Relatório:** dois documentos em `artifacts/`, sem relatório formal PRONTO/PENDENTE em
  `docs/reports/`.
  - `artifacts/viewmodels/heavy/validation/visual_review.md` (mais antigo, mais otimista):
    descreve idle/fire/reload de AWP e shotgun como estáveis. LIMITAÇÃO verbatim: *"Esta
    frente é asset-only: não houve integração em runtime, ADS/HUD, teste em browser nem
    réplica para `g3sg1`, `mosin`, `rem700` e `svd`."*; *"As mãos são uma skin procedural
    low-poly ... ainda não usam a topologia high-res dos pilotos automáticos/pistola."*
  - `artifacts/viewmodels/heavy-project-hands/validation.json` (posterior, do commit
    "registrar reprovação visual da shotgun"): `"accepted": false, "gate": "browser visual
    comparison against pistol required"` para o `shotgun-pilot.glb`.
- **Reprovação humana/gate — shotgun:** commit `b0110cad1`, *"test(viewmodel): registrar
  reprovação visual da shotgun"*, com `validation.json` marcando `accepted: false` e
  arquivos `shotgun-reload-4-state-rejected*.png`. Investigação adicional conclui:
  *"Status: no candidate generated, no runtime integration."* — *"The sources are suitable
  for a controlled retarget experiment, but not yet for a candidate."*
- **AWP:** evidência positiva (asset-only), mas nunca testada em runtime/browser — não é
  uma aprovação, é ausência de reprovação registrada.
- **PR:** nenhum.

### 2.12 `codex/vm-auto`

- **Arma coberta:** `m4` (única). Base histórica antiga `75eb29ad06`, 11 commits — **4
  iterações sucessivas da M4, todas rejeitadas**.
- **GLB:** nenhuma candidata aprovada. Por iteração:
  - `public/models/viewmodels/coro-auto/m4-pilot.glb` (2.267.280 B) — QA: *"reworked pilot
    submitted for review; family propagation remains blocked ... Approval and family
    propagation remain pending external visual review."* (nunca aprovado)
  - `artifacts/viewmodels/coro-auto/m4-ar-pilot/candidate-m4-ar-pilot.glb`
    (1.261.348 B) — reprovado no gate visual (commit `6263c6758`).
  - `artifacts/viewmodels/coro-auto/m4-final/` — **sem GLB**: *"The generated candidate
    GLB was deleted from `public/models`. Only the builder, source-topology evidence, and
    rejected QA sheets are retained."*
  - `artifacts/viewmodels/coro-auto/m4-retarget-pilot/candidate-m4-retarget-pilot.glb`
    (1.236.772 B) — última tentativa, também reprovada.
- **Relatório:** 4 arquivos `visual_qa.md`, todos com veredito de reprovação. Últimos dois,
  verbatim:
  - *"Decision: rejected; no GLB integrated and no family propagation."* — Idle/Fire/
    Reload/ADS todos "fail".
  - *"Status: REPROVADO — não integrar e não propagar."* — *"dominant fingers cover the
    receiver and do not read as a firm grip"*; *"ADS is centered but visually obstructed by
    the rear sight/carry-handle assembly and hands."* Conclusão: *"The M4 remains blocked
    and no other automatic weapon may inherit these actions."*
- **Reprovação humana/gate:** 3 commits explícitos de reprovação (`0a2820568`,
  `6263c6758`, `d1db2b00e`) — as 4 tentativas de M4 falharam no gate visual, nenhuma
  passou.
- **PR:** nenhum.

---

## 3. Tabela ARMA × LANE × ESTADO (26 armas)

Legenda de estado: **APROVADA(dono)** = o dono já se manifestou favoravelmente, mas nada
foi integrado no branch alvo; **REPROVADA** = reprovação explícita (dono ou gate visual);
**CANDIDATA/AGUARDANDO** = trabalho técnico feito, sem veredito do dono ainda; **RECEITA
APENAS** = existe diagnóstico/especificação escrita, mas nenhuma candidata construída;
**PRÉ-EXISTENTE** = GLB commitado no branch alvo, de antes das 14 lanes, fora do escopo
desta auditoria; **SEM LANE** = nenhuma das 14 lanes fez trabalho real sobre esta arma.

| Arma | Lane(s) com trabalho real | Estado | GLB local existe? |
|---|---|---|---|
| `ak` | pré-existente (main, `fc32ebb13`) + auditada em `glm/vm-controles-final` | **APROVADA(dono)** ("perfeita", 07/09) — BUG-89 (16:9) aberto; não integrada como entrega de lane | sim (pré-existente) |
| `pistol` | `claude/vm-fable51-pistol`, `codex/vm-astra-pistol`, auditada em `glm/vm-controles-final` | **APROVADA(dono)** ("perfeita", 07/09) — mas 3 versões concorrentes não reconciliadas | sim |
| `knife` | `codex/vm-melee` (não integrado), auditada em `glm/vm-controles-final` | **APROVADA(dono)** ("perfeita", 07/09) — 2 versões divergentes do GLB não reconciliadas | sim |
| `m4` | `codex/vm-prep-rifles`, `codex/vm-auto` | **REPROVADA** (recarga; 4 tentativas antigas + rodadas novas, todas rejeitadas). Idle isolada é candidata aguardando dono | sim (candidatas, nenhuma aceita) |
| `awp` | `codex/vm-heavy` (`codex/vm-prep-awp` vazia) | **CANDIDATA/AGUARDANDO** (evidência positiva, asset-only, nunca testada em runtime/browser) | sim |
| `shotgun` | `codex/vm-heavy` (`codex/vm-prep-shotgun` vazia) | **REPROVADA** (gate visual explícito) | sim (rejeitado) |
| `mosin` | `codex/vm-prep-precisao` | **CANDIDATA/AGUARDANDO** — `pronto:true` autodeclarado, mas parte do pacote cuja irmã (SVD) falhou em verificação de jogo real | sim |
| `svd` | `codex/vm-prep-precisao` | **CANDIDATA COM DEFEITO CONFIRMADO** — `pronto:true` autodeclarado, verificação de jogo real achou viewmodel sumindo intermitentemente no reload; recomendação explícita é NÃO liberar `ready:true` | sim |
| `sks` | `codex/vm-prep-precisao` | **CANDIDATA/AGUARDANDO** — mesmo pacote da SVD, sem defeito próprio confirmado, mas sob a mesma cautela | sim |
| `rem700` | `claude/vm-dmr-final` | **CANDIDATA/AGUARDANDO** — gates verdes localmente, sem veredito do dono | sim |
| `g3sg1` | `claude/vm-dmr-final` | **CANDIDATA/AGUARDANDO** — idem rem700 | sim |
| `lmg` | `glm/vm-lmg-final` | **REPROVADA** explicitamente pelo dono (07/09), ainda `ready:false` em 08/09 | sim (rejeitado) |
| `akm` | nenhuma das 14 (pré-existente, commit `fc32ebb13`, ciclo de aprovação em ago/2026 registrado em BUG-75/KNOWN-BUGS.md) | **PRÉ-EXISTENTE**, fora do escopo das 14 lanes | sim (pré-existente) |
| `m92` | `codex/vm-prep-rifles` (só receita) | **RECEITA APENAS** — sem candidata construída | não |
| `md97` | `codex/vm-prep-rifles` (só receita) | **RECEITA APENAS** — GLB bruto "não tem carregador" | não |
| `carbine` | `codex/vm-prep-rifles` (só receita) | **RECEITA APENAS** — doador "tem alavanca e tubo sob o cano" | não |
| `scar` | `codex/vm-prep-rifles` (só receita) | **RECEITA APENAS** — "corpo largo e comando lateral" | não |
| `famas` | `codex/vm-prep-rifles` (só receita) | **RECEITA APENAS** — "carregador atrás da mão forte" | não |
| `deagle` | nenhuma (`codex/vm-prep-armas-curtas` vazia) | **SEM LANE** | não |
| `revolver38` | nenhuma (`codex/vm-prep-armas-curtas` vazia) | **SEM LANE** | não |
| `mp5` | nenhuma (só referência reprovada na trilha B de `vm-cs16-gabarito`) | **SEM LANE** de produção | não |
| `uzi` | nenhuma (só referência reprovada na trilha B) | **SEM LANE** de produção | não |
| `p90` | nenhuma (só referência reprovada na trilha B) | **SEM LANE** de produção | não |
| `g3` | nenhuma | **SEM LANE** — nunca mencionada em nenhum relatório de lane | não |
| `m400` | nenhuma | **SEM LANE** — nunca mencionada em nenhum relatório de lane | não |
| `tavor` | nenhuma | **SEM LANE** — nunca mencionada em nenhum relatório de lane | não |

### Contagem

- **26/26** armas do catálogo (`public/js/data/weapons.js`).
- **12** armas têm ao menos uma lane com trabalho real (mesmo que reprovado): `ak, pistol,
  knife, m4, awp, shotgun, mosin, svd, sks, rem700, g3sg1, lmg`.
- **11** dessas 12 têm um GLB candidato/local produzido por alguma lane (todas exceto `ak`,
  que não recebeu GLB novo de nenhuma das 14 — usa o pré-existente).
- **0** armas têm GLB de lane efetivamente commitado/integrado no branch alvo — os 4 GLBs
  versionados (`ak`, `akm`, `pistol`, `knife`) são todos de 28/08, anteriores a todas as 14
  lanes.
- **1** arma (`akm`) já tem GLB pré-existente fora do escopo das 14 lanes.
- **5** armas têm apenas receita/diagnóstico escrito, sem candidata construída: `m92, md97,
  carbine, scar, famas`.
- **8** armas não têm nenhum trabalho de nenhuma das 14 lanes: `deagle, revolver38, mp5,
  uzi, p90, g3, m400, tavor`.

---

## 4. As 5 pendências mais críticas (ordem de risco)

1. **Nada está integrado.** `feat/fps-paid-viewmodels-aaa` está 160–220 commits atrás de
   cada lane de setembro e não tem sequer `vmconfig.js`. As 3 aprovações do dono (AK,
   pistola, faca, 07/09) e os gates verdes de LMG/precisão/DMR não mudaram o branch alvo em
   nada — é preciso uma etapa de reconciliação/merge que não aconteceu para nenhuma arma.
2. **`svd/reload-f015`: defeito intermitente que passou pelo `pronto:true` da lane e só foi
   pego numa verificação de jogo real feita fora da lane.** É o mesmo tipo de sintoma que já
   reprovou a LMG (arma some da tela) e o dono está sensível a ele — recomendação explícita
   do verificador é não liberar `ready:true` até entender.
3. **LMG segue reprovada, sem correção fechada.** Última atualização (08/09) mede a mão de
   apoio "ainda não legível em contato" e recomenda separar mão-forte/mão-de-apoio na régua
   antes de nova tentativa — não há ETA nem dono do próximo passo declarado no relatório.
4. **M4 é a arma mais tentada (2 lanes, ~15 commits de tentativas) e a que mais reprovou** —
   4 iterações completas em `codex/vm-auto` (todas rejeitadas) e a recarga segue reprovada
   em `codex/vm-prep-rifles` apesar de meses de trabalho; só a idle isolada é candidata
   viável, aguardando o dono.
5. **13 das 26 armas não têm nenhuma candidata construída** (5 só com receita: m92, md97,
   carbine, scar, famas; 8 sem nenhum trabalho: deagle, revolver38, mp5, uzi, p90, g3, m400,
   tavor) — nenhuma das 14 lanes auditadas cobre essas armas apesar de a fila oficial
   (`VIEWMODEL-CATALOGO-ORQUESTRACAO.md`) as ter no roteiro desde 06/09.
