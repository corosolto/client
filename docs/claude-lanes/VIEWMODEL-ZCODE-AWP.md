# ZCode GLM 5.3 — AWP offline

Trabalhe exclusivamente em
`/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-prep-awp`, branch
`codex/vm-prep-awp`. Confirme branch, HEAD `961c70d2`, árvore limpa e realpaths
antes de escrever. Não trabalhe em AWP dentro de Precisão: Mosin, SVD e SKS são
outra lane. A mecânica de penetração do PR #535 também é outra frente e somente
leitura; esta tarefa trata do viewmodel em primeira pessoa.

Leia integralmente `AGENTS.md`, `docs/LICOES.md`,
`docs/development/VIEWMODEL-1P-PROFISSIONAL.md` e
`../vm-astra-pistol/docs/reports/PROMPTS-PARALELOS-VIEWMODELS.md`. Siga as
“Instruções comuns” e “Frente AWP”. Leia os ledgers indicados ali na integradora
somente leitura.

Faça inventário reproduzível da AWP própria, doadores, rig, câmera, partes móveis,
clipes e tempos do Game. Produza uma primeira candidata offline somente nesta
worktree: pega, apoio, luneta, ferrolho, ejeção, recarga e retorno ao idle devem
ser tratados separadamente. Não invente carregador, pente ou gesto que o asset
não suporte. Meça contato frame a frame por superfície e interseção; valide
reimportação da GLB e preserve estrutura/hashes alheios. Gere folhas 3:2/16:9,
closes e sequência contínua com Blender headless, sem browser/dev server.

Escreva `docs/reports/VM-PREP-AWP.md`, scripts novos `awp-*` e artefatos somente em
`artifacts/viewmodels/prep/awp/`. Não altere runtime servido, mãos/atlas/materiais
compartilhados, câmera/HUD, balanceamento ou assets privados de origem. Mantenha
`ready:false` e registre o julgamento visual humano como pendente.

Faça commit pequeno com `Agent: ZCode GLM 5.3` e `Signed-off-by`, push e abra um
PR draft próprio contra a base técnica adequada, explicando que é candidata
offline e que a integração final será sequencial. Não faça merge ou release.

