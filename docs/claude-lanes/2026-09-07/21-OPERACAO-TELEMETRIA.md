# GLM 5.3 — produção, contagem online e telemetria

Crie worktree `operacao-telemetria-final` e branch `glm/operacao-telemetria-final` sobre `main`.
Audite antes de editar as lanes `agent-control-plane`, `mp-round-presence`,
`telemetry-reliability-client` e os relatórios operacionais. Reproduza o gate
`prod-watch / probe (deployment_status)` que falhou após 23 s e separe falha do probe, deploy,
Cloudflare, Vercel e backend GCP.

Verifique fonte real da contagem online, jogadores por rodada, frescor do admin, CORS, retries,
cache e estado de deploy. Preserve lacunas como `null`; não invente zero nem retrofill. Teste
árvore local, contrato API e casos de timeout/concurrency; não escreva em produção. Se correção
exigir backend ou SQL, entregue migração/runbook separada e mantenha segredo fora do Git.

Crie mutantes por sintoma, rode `ops:diag`/gates/build, commit, push e PR pequeno. Diferencie
tecnicamente verde, dados frescos e pronto para lançamento. Não faça deploy/rollback.

