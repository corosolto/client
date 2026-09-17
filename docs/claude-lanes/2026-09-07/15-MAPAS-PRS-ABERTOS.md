# GLM 5.3 — integrar e revisar os PRs de mapas já implementados

Trabalhe um PR por vez em sua worktree existente. Não repita os consertos já presentes:

- #526 Sertão, `sertao-casas`, HEAD observado `58923044`: casas dos spawns, colisão da carroça,
  janelas e pôr do sol já implementados; resolver conflito e validar partida/captura.
- #529 Escadão, `escadao-casas-conflito`, HEAD `6412880a`: janela, piso e entradas já feitos;
  preservar/classificar `tools/eval/asset-evidence/maps/` não rastreado.
- #530 Quebrada/Campinho, `campo-morro-release`, HEAD `73dfc45b`: cobertura/rotas já feitas;
  resolver conflito e revisão humana. Não confundir com o mapa independente Campinho #437.
- #533 Mansão do Joá, `joa-recuperacao`, HEAD `640da258`: CTF por camada e vãos já corrigidos;
  resolver conflito, Vercel e validar interior/jardim/mezanino/praia.
- #467 Córrego, `fix/corrego-rota-baixa`: aguardar/refazer checks e validar a rota baixa.
- #539 Lajes, `lajes-visual`, branch `docs/lajes-bug141-estado`: resolver somente o conflito
  documental do BUG-141 e classificar artefato local; desempenho #517 já foi mesclado.

Para cada PR: atualize de `main` sem apagar diff, resolva conflitos semanticamente, rode gate
direcionado + mutante + suíte integrada + build. Gere capturas 3:2 e faça percurso real local.
Atualize o PR com evidência, limitações e flags de revisão humana. Não faça merge ou release.

