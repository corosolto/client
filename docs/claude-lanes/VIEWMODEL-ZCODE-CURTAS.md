# ZCode GLM 5.3 — Deagle e revólver .38 finais

Leia primeiro `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/claude-lane-prompts/docs/claude-lanes/VIEWMODEL-ZCODE-CORRECAO-FINAL.md`. Entregue as duas armas completas,
com mãos, ações e integração local; não pare em candidatas offline.

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
`artifacts/viewmodels/prep/armas-curtas/{deagle,revolver38}/`. Integre GLBs finais,
mãos por time, ações, ADS/enquadramento, configurações e fallbacks na própria
branch. Não abra browser/dev server, não altere a pistola aprovada, não redesenhe
atlas/materiais centrais e não mude HUD global, balanceamento ou fontes privadas.

Faça checkpoints pequenos por arma com `Agent: ZCode GLM 5.3` e `Signed-off-by`,
push e abra um PR próprio com implementação e testes completos. Não faça merge ou release.
