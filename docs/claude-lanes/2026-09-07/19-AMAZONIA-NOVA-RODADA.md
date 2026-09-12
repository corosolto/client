# Claude Opus 5 — Amazônia: regressão 8x8, escadas e visão do rio

O PR #527 foi mesclado; não reutilize seu prompt como se estivesse aberto. Crie worktree
`amazonia-pos527` e branch `claude/amazonia-pos527` sobre `main` atual. Reproduza a queixa do
dono: single player 8x8 ainda trava; cabanas próximas ao spawn têm escadas viradas para o lado
errado e visão do rio bloqueada; madeiras de palafita podem pairar.

Meça frametime/update/draw calls e perfil de bots em 5x5 e 8x8, low/med, antes de otimizar.
Preserve densidade da mata, mas abra corredores visuais específicos do spawn ao rio. Oriente as
escadas para o respawn, assente apoios no terreno e valide navegação/colisão/LOS/CTF. Não reduza
times, fauna ou árvores para maquiar o custo sem prova do gargalo.

Crie mutantes para escada, apoio, LOS e limite de desempenho; capture 3:2 e percurso. Rode gates,
build, commit, push e PR novo. Registre hardware e método; FPS isolado não prova causa.

