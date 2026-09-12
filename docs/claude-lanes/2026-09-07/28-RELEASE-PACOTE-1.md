# GLM 5.3 — preparar o primeiro pacote de release

Prepare um relatório de release para o pacote prioritário: Time Míticos, mapas aprovados e
catálogo de viewmodels 1P/3P. Trabalhe em worktree nova `release-pacote-1` e branch
`glm/release-pacote-1` sobre `main`; não incorpore código até os PRs de origem estarem prontos.

Monte matriz exata de PR→commit→gate→evidência→aprovação humana→risco→rollback. Inclua conflitos,
checks instáveis, tamanho/cache de assets, áudio privado, mobile/desktop e coerência Cloudflare/
Vercel/GCP. Um item sem captura/partida real ou sem aprovação auditiva fica pendente, não verde.

Proponha ordem de integração com canário e rollback, mas não faça merge, tag, deploy, purge ou
release. Rode apenas validações locais/read-only. Commit/push e abra draft PR documental para o
dono revisar quando a matriz estiver completa.
