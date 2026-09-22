# Integração sequencial Mosin, SVD e SKS

## Objetivo e definição de pronto

Integrar, nesta ordem, Mosin, SVD e SKS a partir dos GLBs finais do checkpoint
`99a522684aa5612b7ebffc71c4f82e80e9475a4b`, sem alterar a AK aprovada nem famílias fora
do escopo. Cada arma só pode receber `ready:true` depois de: otimização no destino privado
desta worktree; gates T/M/C/F/A no GLB otimizado; jogo real em 3:2 e 16:9 cobrindo idle,
equip, disparo, recargas aplicáveis, ADS, muzzle, troca/cancelamento e enquadramento; e
revisão independente em contexto limpo. O pacote final deve ter checkpoints recuperáveis,
push e um único PR. Merge, deploy e force-push estão fora da autorização.

## Lane e autoridades

- Worktree: `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-integracao-precisao`
- Branch: `codex/vm-integracao-precisao`
- Base atualizada: `origin/main` em `f7c97d1411cb43685107a1c0569e73b7e3e72290`
- Fonte aprovada: worktree `vm-prep-precisao`, checkpoint `99a522684aa5612b7ebffc71c4f82e80e9475a4b`
- Relatório fonte: `docs/reports/VM-PREP-PRECISAO.md`

## Marcos validados

1. Antes da primeira escrita, `git worktree list --porcelain` confirmou que o destino não
   existia e que a fonte estava em `99a52268`; a fonte estava limpa e rastreando
   `origin/codex/vm-prep-precisao`.
2. `origin/main` foi atualizado e a worktree exclusiva foi criada em `f7c97d14`. Branch,
   HEAD e status foram reconferidos; a árvore nasceu limpa.
3. Os GLBs fonte foram localizados em `artifacts/viewmodels/prep/precisao/final/` com hashes:
   Mosin `814d4974227e3a476593f11074fd06dee3e5de0c788835d634d29ee853e1c0bc`, SVD
   `dc65b1ff6fd0f568c10bdf4180360edc9b54b1021058edeecc64e615fa09e981`, SKS
   `d4d427547082775d23d5ea8d623c638b4283e7a56620c7fe810350b436f829f7`.

## Estado aceito, rejeitado e bloqueios

- Aceito: os GLBs fonte e a prova offline T/M/C/F/A do checkpoint; eles ainda não são prova
  runtime nem foram validados depois da otimização.
- Rejeitado: promover `ready:true` apenas pelas métricas offline ou pelos renders do builder.
- Descoberta de integração: `origin/main` atual não contém `public/js/data/vmconfig.js`,
  `public/js/authoredvm.js` ou `tools/viewmodels/optimize_paid_family.mjs`; o jogo usa o
  caminho procedural/estático em `public/js/game.js` e `public/js/vmattach.js`. O pipeline
  aprovado está numa linha divergente cujo merge-base com main é `fca68a887d8287eb950ac76d19fdbbc806d2c292`.
- Bloqueio atual: definir e provar a menor incorporação da rota autorada sobre main sem trazer
  as centenas de commits divergentes nem reintroduzir famílias fora do escopo.

## Próxima ação concreta

Rastrear os commits e dependências mínimas da rota autorada, comparar com o runtime atual e
implantar primeiro a Mosin com fallback legado intacto. Só depois otimizar, reexecutar os
gates e iniciar a captura runtime exclusiva.
