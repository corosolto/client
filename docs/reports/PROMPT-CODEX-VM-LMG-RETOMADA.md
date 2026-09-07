# Prompt de retomada — frente LMG para Codex (pós-reprovação, 07/09)

Pedido de Ruben: entregar a correção da LMG ao Codex. Este prompt segue o padrão
de `PROMPTS-PARALELOS-VIEWMODELS.md` e é auto-contido. Responda em português.

## Onde você assume

- Worktree exclusiva: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-lmg-final`.
- Branch: `glm/vm-lmg-final` (mantenha o nome; commits anteriores são a
  história da frente: `eeec7a7b` candidata, `a3512af0` versão reprovada,
  seguidos do revert documentado). Não faça reset/rebase; continue em commits.
- Base original: `d35c6658`. PR: #546 (aberto).
- Estado atual: `lmg.ready:false`, `CATALOG_VERSION=paid-aaa-3`, raízes servidas
  JÁ RESTAURADAS para o runtime pré-lane (backups `.pre-lmg-final.bak`
  preservados ao lado). O GLB reprovado está em
  `A/lmg-candidate/lmg-runtime-rejected.glb` (SHA `0f1df532…6104e9`).
- Leia antes de agir: `AGENTS.md`, `docs/LICOES.md` (1–4), o relatório
  `docs/reports/VM-LMG-FINAL.md` (seção REPROVADA) e este prompt.

## Evidência primária: a reprovação

- Screenshots do Ruben (somente leitura): `~/Documents/screen/`, hoje
  14:03–15:52. Cópia + folha de contato:
  `artifacts/viewmodels/prep/lmg/review-2026-09-07/`.
- Triagem determinística já feita (`tools/viewmodels/prep/lmg-review-measure.py`,
  reutilizável): **luva/braço some nos frames 09–12/15–17** (87–820 px vs
  2.500–4.700 nos bons) e **arma fora do quadro nos frames 05 e 16**
  (quadrante quase preto). Textura confirmada presente (34–147 mil cores).
  Confirmar cada sinal contra os frames antes de corrigir. **Caso de teste
  primário (apontado pelo Ruben): frame `15.47.19` (frame 10 da cópia) — em
  plena recarga a arma flutua a ~20% da tela SEM mãos/braços visíveis; a
  régua de visibilidade deve reprová-lo antes e aprová-lo depois.**

## Diretriz do dono (07/09, pós-reprovação)

**Rifles e MGs já têm boa posição de arma; o que falta é as mãos no lugar
certo.** Consequências práticas: NÃO recalcibrar `FAMILY_FRAME`/`VM_WEAPON`
nem tocar na câmera; TODA a correção é nos caminhos de mão dos clipes
(visibilidade em quadro + contato com a superfície da arma), guiada por
réguas determinísticas (números por frame), nunca por análise de imagem
não determinística.

## Ordem de trabalho do dono (07/09, verbatim da sessão — é o seu contrato)

> Primeiro reproduza cada falha com regressão vermelha usando a primeira coleta
> em sessão limpa, troca/equip repetida, fire, ADS e recargas. Crie mutantes
> que provem que os gates mordem. Corrija contato da mão de apoio, orientação
> do punho e dedos, escala aparente e framing preservando a posição boa da
> arma e sem deformar no ADS. Elimine a divergência primeira versus segunda
> coleta na origem da inicialização/crossfade. Valide no jogo real, não apenas
> Blender/GLB isolado: frames 3:2 e 16:9 de idle, primeiro equip, segundo
> equip, ADS, fire e recargas; medidas de contato e escala aparente em pixels.
> Não enfraqueça gates nem declare pronto com tolerâncias que aceitem os
> screenshots reprovados. Preserve mecanismo, timings, materiais e texturas
> que já passaram. Atualize o relatório/ledger com a rejeição humana e as
> novas evidências. Rode build/gates, commit, push e atualize a PR #546. Só
> declare final se todos os defeitos acima estiverem objetivamente eliminados;
> revisão humana continua obrigatória.

## Ferramenta pronta para a coleta vermelha

`tools/viewmodels/prep/lmg-frames-game.mjs` (parse OK, ainda não executado até
o fim): driver Playwright no jogo real com medidas EM-PÁGINA por frame — mãos
em quadro (vértices skinados da luva projetados), contato luva↔arma em px,
bbox/diagonal da arma. Cenários: **primeira coleta em sessão limpa** (timings
0,06/0,15/0,3/0,55/1,02 s do equip), idle, ADS (`setAim`), fire (`shoot`),
segunda coleta (`_switchWeapon('knife')` → volta) e recargas em scrub pausado.
Uso: servidor em cima (ex. `node tools/eval/serve.mjs 8166`) e
`node tools/viewmodels/prep/lmg-frames-game.mjs --porta=8166 --aspecto=32|169
--tag=<nome>`; saída em `A/game-frames/<tag>-<aspecto>/frames.json` + PNGs.
**Estado do estágio:** `A/local-server-8165/public/…/lmg/lmg-runtime.glb` está
servindo o GLB REPROVADO (copiado de `lmg-runtime-rejected.glb`) — pronto para
a coleta vermelha; as raízes compartidas seguem no runtime pré-lane (seguras).

## O que fazer (ordem)

1. **Régua antes do conserto** (LICOES 1): régua nova que REPROVA o GLB
   reprovado — **mãos visíveis e em contato ao longo de TODOS os frames de
   TODOS os clipes**: por frame, (a) massa de luva dentro do quadro acima de
   piso (calibrar o piso pelos frames bons dos screenshots: 2,5–4,7 mil px
   vs 87–820 nos ruins); (b) distância mínima luva↔arma em quadro (contato),
   na linha da `lmg-contact.py` mas amostrada por clipe inteiro. Com mutante
   que morde (remover os tracks de mão → régua vermelha). Reproduzir os
   números dos screenshots antes de tocar em qualquer curve.
2. Corrigir os caminhos de mão: os tracks de braço das recargas rebaseadas
   levam as mãos para fora do quadro (arma flutuando no `15.47.19`). As
   ferramentas da casa para isto já existem: `applySupportPose`/
   `bakeMagazineGrip` do `tools/viewmodels/assemble_paid_family.mjs`
   (fixam a pose da mão de apoio com janelas de blend durante a recarga) e a
   metodologia dedo-a-dedo da frente rifles (`rifles-m4-idle-grip.py`,
   `rifles-m4-actions-*`). Adaptar para cinto/caixa: mão de apoio ancora na
   arma/caixa em vez de sair do quadro; mão forte nunca larga o punho.
3. Revalidar com a suíte existente (verify/contato com mutantes, syntax/docs/
   arch, build com node_modules compartilhado por symlink — permitido nesta
   lane) e com captura de jogo real na 8165 (`node tools/eval/serve.mjs 8165`
   na raiz da worktree; NÃO use 8160/8162/8163 de outras lanes).
4. Só considerar `ready:true` de novo com aprovação visual explícita do Ruben
   sobre os frames que ele reprovou — e o deploy nas raízes compartilhadas
   acompanha a aprovação, com novo `.bak`.

## Limites e armadilhas

- Escala/leitura: preservar o enquadramento calibrado (razãoEscala 1,006 na
  captura da casa); a LMG tem histórico de "caixão preto gigante".
- Lentidão não é peso: eventos da recarga a 0,9/3,1/4,3 s com taxa local ≤2,5×
  (régua já existe no `lmg-verify.mjs`).
- Import Blender do GLB aninhado DIVERGE (defeito documentado da família):
  contato se mede no blend autoral ou em three, capturas vêm do jogo real.
- Export glTF do Blender 5.2 omite `source` no topo das texturas
  (`EXT_texture_webp`): o `lmg-assemble.mjs` já contorna; não regredir.
- Não pare em "candidata aguardando revisão" sem as réguas de (1) verdes — foi
  exatamente a ausência delas que produziu a reprovação.
- `python3` com numpy/PIL: `/usr/local/bin/python3`. Blender:
  `/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2
  --python-exit-code 1`.

## Entrega

Commits pequenos com `Signed-off-by` + `Agent:` verdadeiro do Codex; push com
`PREPUSH=0` (convenção das lanes); atualizar o PR #546 e o
`docs/reports/VM-LMG-FINAL.md` a cada marco. Merge/release continuam decisão do
dono.
