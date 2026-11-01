# CI independente no #1188

Objetivo integral de mapas/personagens/1P/3P/skins, merges e release continua com o root. Esta lane trata somente o finding `PRRT_kwDOTbwe3M6yTxcf`; Operação Flávio e lanes alheias intocadas.

Base QA `21f264c519aac547148ea1bab3c5c64d847e8290`; branch `codex/ci-independent-1188-20261031`. Dependências por symlink somente leitura à QA. AGENTS, bug-hunt/regua, KNOWN-BUGS/progress, LICOES/progress e quality-gates lidos. ARCH regenerado sem diff rastreado.

2026-10-31: baseline nativo anterior à edição reproduziu 8/8 grupos pulados por falha em cada economia. GLM-5.3 OMP R1 encerrou exit0, produziu workflow e gate; gate R1 rejeitado por semântica/injeção incompletas. Codex assumiu único writer após GLM encerrar e corrigiu o instrumento. R2 contra workflow exato da QA21 ficou RED por consumidores omitidos, candidato passou: 10 grupos ×18 cenários, 14/14 verificações focais/mutantes e 4/4 falsificações extras rejeitadas. O modelo é local, não um run hosted.

Produto: npm ci com id deps, dez grupos com !cancelled e deps.outcome success; sem engolir falha. eval:shot-final-pose acrescentado ao grupo por pedido do root; package correspondente pertence à lane AK e **precisa ser integrado primeiro**. Sem alteração em game/package ou agregador. Relatório e artefatos: `CI-INDEPENDENT-REVIEW-20261031.md`, prefixo externo `CI-INDEPENDENT-R2-*`.

Próximo: root cherry-picka o checkpoint desta lane sobre a QA com comando AK já definido, roda eval:portaointeiro e as réguas afetadas, pede review do head atual, trata threads e obtém CI. Ainda não houve push, publicação, resolução de thread ou aceite integral da missão. Não usar declarações do log GLM como prova final.
