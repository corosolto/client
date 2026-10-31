# Movimento — continuação PR1155

Objetivo completo: Operação Flávio com GLM/OMP, resolução dos47PRs, HQ atualizado e anúncios/pilotos manuais. Javaporcos pertence ao outro terminal. Sem merge em main, deploy, migração remota, upload ou publicação presumidos.

2026-10-31T02:54:06.425322+00:00 — Branchrea/gameplay-piloto-20261028, HEADpré-mergee3ef1903e. Merge origin/main4c9dc88b41a2423476fa5f3ffce703386231d80f: Game auto-merge sem conflito; conflitos somente versão e ARCH. Versão preservada da mainalpha129, SIM_HASH gerado pelo scripts/sim-hash.mjs --write:11b8d83a8d344744 (não hash manual/release). ARCH/docs via geradores normais.

Validação pós-merge saiu0: docs:check, arch:check, node--checkGame, eval:mantle (3cláusulas/18mapas), eval:movimento (2trajetórias golden idênticas), eval:netcodecbin (30ok/0falhas). Logs /tmp/corosolto-1155-{simhash,arch,docs,docs-check,arch-check,mantle,movimento,netcodec}.log. Nenhum teto afrouxado, nenhuma tabela golden regravada nesta sincronização.

Pendências: QA real do movimento/mantle, pushnormal/CI/CodeRabbit/crítico final; release pareado1155→1154→backend183. Backend183 ainda pinado em a938d3614e6b3418eaf4b125ad2806e24240a9eb, commit não integrado; não ativar/site/nó divergentes. Tuning48/12 difere da base92/23 e exige janela coordenada. Typo morto _mantleReach da régua foi registrado por GLM11; runtime usa _mAlc. Sem defeito runtime reproduzido, não alterado por hipótese.

Próximo: salvar checkpoint da fusão, sincronizar1154 a partir deste ponto, revalidar acoplamento e conferir QA/CI/revisão antes de propor integração.
