# GLM 5.3 — consolidar multiplayer com clientes reais

Audite primeiro, sem editar, as worktrees `multiplayer`, `mp-fix` e qualquer branch citada nos
ledgers atuais. Compare ancestry, PRs/commits já integrados e diffs; escolha uma única worktree
nova `multiplayer-consolidacao` e branch `glm/multiplayer-consolidacao` sobre `main`. Não reviva
implementação histórica já supersedida.

Defina a verdade autoritativa de presença, round, tiro/dano/morte, respawn, CTF, desconexão e
reconexão. Teste pelo menos dois clientes reais, concorrência, atraso, perda, duplicação e ordem
de mensagens; bots não provam multiplayer humano. Verifique persistência e telemetria sem
service keys no cliente. Escreva mutantes por protocolo e uma matriz de limites conhecidos.

Entregue apenas correções reproduzidas, com gates/build, commit, push e PR pequeno. Diferencie
simulação local, transporte real, backend GCP e produção. Não faça deploy, SQL ou release.

