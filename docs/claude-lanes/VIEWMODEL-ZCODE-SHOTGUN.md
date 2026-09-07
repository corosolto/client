# ZCode GLM 5.3 — escopeta final, com mãos e mecanismos

Leia primeiro `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/claude-lane-prompts/docs/claude-lanes/VIEWMODEL-ZCODE-CORRECAO-FINAL.md`. Entregue a escopeta completa e
integrada na própria branch, não apenas candidata offline.

Trabalhe exclusivamente em
`/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-prep-shotgun`, branch
`codex/vm-prep-shotgun`. Confirme branch, HEAD `961c70d2`, árvore limpa e
realpaths. A worktree antiga `/Users/ruben/csbrasil/worktrees/vm-heavy` é somente
leitura: contém uma shotgun reprovada e builders históricos; não continue nela,
não faça cherry-pick cego e não sobrescreva seus artefatos.

Leia integralmente `AGENTS.md`, `docs/LICOES.md`,
`docs/development/VIEWMODEL-1P-PROFISSIONAL.md` e
`../vm-astra-pistol/docs/reports/PROMPTS-PARALELOS-VIEWMODELS.md`. Siga as
“Instruções comuns” e “Frente Escopeta”. Leia a história da `vm-heavy` apenas
para não repetir candidatos já rejeitados e registre hashes do que consultar.

Investigue a arma própria, rig, câmera, clipes, peças e tempos do Game. Produza a
versão final nesta worktree. Separe bomba, mão de apoio, recuo,
extração/ejeção, avanço, disparo, recarga cartucho a cartucho, interrupção e
retorno ao idle. Prove que a mão acompanha a bomba e que cada cartucho entra na
porta correta; não aceite uma animação que apenas abaixa/esconde a arma.

Meça contato e interseção frame a frame, reimporte a GLB e gere folhas 3:2/16:9,
ângulo oposto e sequência contínua com Blender headless. Escreva
`docs/reports/VM-PREP-SHOTGUN.md`, scripts `shotgun-*` e artefatos apenas em
`artifacts/viewmodels/prep/shotgun/`. Integre a GLB final, mãos por time, todas as
ações, enquadramento e configuração da escopeta na própria branch. Não abra
browser/dev server, não redesenhe atlas/materiais centrais e não altere HUD global,
balanceamento ou fontes privadas.

Faça commits pequenos com `Agent: ZCode GLM 5.3` e `Signed-off-by`, push e abra PR
próprio com implementação e testes completos. Não faça merge ou release.
