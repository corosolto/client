# ZCode GLM 5.3 — Deagle e revólver .38 offline

Trabalhe exclusivamente em
`/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/vm-prep-armas-curtas`,
branch `codex/vm-prep-armas-curtas`. Confirme branch, HEAD `961c70d2`, árvore
limpa e realpaths. A pistola aprovada é controle somente leitura; não a altere.

Leia integralmente `AGENTS.md`, `docs/LICOES.md`,
`docs/development/VIEWMODEL-1P-PROFISSIONAL.md` e
`../vm-astra-pistol/docs/reports/PROMPTS-PARALELOS-VIEWMODELS.md`. Siga as
“Instruções comuns” e “Frente Armas Curtas”.

Trabalhe sequencialmente dentro da lane: primeiro Deagle, depois revólver .38.
Faça inventário separado de asset, licença, rig, câmera, UV, sockets, peças,
clipes e tempos do Game. Produza candidatas offline separadas. Na Deagle valide
slide, carregador, disparo, recargas e retorno. No .38 valide tambor, eixo,
abertura, ejeção, municiamento, fechamento, disparo e retorno. Não transplante a
recarga de carregador da pistola/Deagle para o revólver.

Meça contato/interseção frame a frame, reimporte cada GLB e gere folhas 3:2/16:9,
closes e sequência contínua em Blender headless. Escreva
`docs/reports/VM-PREP-ARMAS-CURTAS.md`, scripts `curtas-*` e artefatos somente em
`artifacts/viewmodels/prep/armas-curtas/{deagle,revolver38}/`. Não abra browser ou
dev server. Não altere runtime, pistola aprovada, mãos/atlas/materiais centrais,
câmera/HUD, balanceamento ou fontes privadas. Mantenha `ready:false`.

Faça checkpoints pequenos por arma com `Agent: ZCode GLM 5.3` e `Signed-off-by`,
push e abra um PR draft próprio para a lane. Não faça merge ou release.

