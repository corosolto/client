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
  Confirmar cada sinal contra os frames antes de corrigir.

## O que fazer (ordem)

1. **Régua antes do conserto** (LICOES 1): duas réguas novas que REPROVAM o
   GLB reprovado — (a) visibilidade das mãos/luva ao longo de TODOS os clipes
   (amostragem por frame no jogo real, via `tools/eval/vm-cs16-frames.mjs`
   estendido ou equivalente); (b) presença da arma no quadro (fração de
   conteúdo no quadrante inferior-direito acima de piso em todos os frames de
   ação). Cada régua com mutante que morde. Reproduzir os números dos
   screenshots primeiro.
2. Corrigir o que as réguas + screenshots apontarem: caminhos de mão das
   recargas rebaseadas saindo do quadro; arma abandonando a tela em plena
   recarga (frames 05/16); conferir mão de apoio na alça/guarda-mão no idle.
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
