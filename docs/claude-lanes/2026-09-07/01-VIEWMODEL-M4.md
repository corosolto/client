# GLM 5.3 — continuar M4 final

Use exclusivamente `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-prep-rifles`,
branch `codex/vm-prep-rifles`, PR #509. O HEAD observado foi `f63e730f`. Preserve antes de
qualquer ação estes arquivos não rastreados: `tools/viewmodels/prep/rifles-m4-reload-final.py`,
`rifles-m4-reload-final-export.py`, `rifles-m4-reload-final-verify.py` e
`rifles-m4-reload-final-verify.mjs`. Leia também o diagnóstico do PR #534 na worktree
`vm-m4-reload-evidence`; ele é evidência, não base para merge.

Entregue a M4 final com braços/mãos, idle, equip, tiro, recarga tática e vazia, contato físico,
carregador, ferrolho/charging handle, ADS e enquadramento 3:2/16:9. Audite o que os quatro
scripts realmente fazem antes de rodá-los. A recarga deve preservar mão no carregador durante
retirada/inserção, manga sem inflação e arma estável. Integre na rota local autorada da branch,
sem editar outras famílias ou reescrever `game.js` inteiro.

Crie régua temporal e espacial, mutantes que soltem contato e alterem timing, reimporte o GLB,
rode gates de viewmodel/build e gere contact sheets de todas as ações. Faça checkpoint, push e
atualize o PR #509. Depois atualize o #534 como resolvido ou supersedido, sem copiar seu diff.
Não pare em candidata offline e não declare aprovação visual do dono.

