# R1100: bindings reais na fixture de fauna

O CI A4 falhou em treze casos porque o recorte de `main.js` executado no VM chamava
`ehMapaJavaporcos` sem esse binding. A triagem RO R1097 confirmou a mesma omissão no BD.
O caminho de início da partida também precisava do identificador `currentMap`.

Escopo: `tests/map-fauna-curated.test.mjs` importa o helper real de
`public/js/maps.js` e fornece helper e ID canônico ao contexto. O ID usa a mesma
busca por identidade de `MAPS` já usada pelo `planoPreload` da fixture. As assertions,
os casos, o código de produto e o controlador de mutantes permanecem byte a byte.

## Antes e depois

Base: `bd6945dcf75f8dbe7506fba0684e1861bf033566`, branch própria
`codex/fauna-vm-bindings-r1100-20261101`. Node22.23.4, dependências próprias por
`npm ci`, sem compartilhar `node_modules` com outros checkouts.

- Antes, uma execução de `node --test --test-reporter=tap tests/map-fauna-curated.test.mjs`:
  188 casos, 175 PASS e 13 FAIL (casos10 a22), todos com
  `ehMapaJavaporcos is not defined`; exit1, 13,166s, zero cancelados ou pulados.
- Depois, uma execução de `npm run eval:map-fauna-curated`: exit0 em14,312s.
  O controlador real verificou quatro nominais e seis mutantes:
  `fauna-gates`, `stale-map`, `ignore-seq`, `ignore-map`, `no-late-fauna`, `fauna-first`.
  Seu stdout de sucesso resume as suítes e não publica os contadores TAP internos.
- Nas duas execuções, zero timeout/stderr e nenhum processo no grupo próprio após a saída.

Uma chamada OMP `zai/glm-5.3`, low/max2000, tools0/MCPfalse/retry0/fallback0,
propôs o diff mínimo. RAW e ANSWER foram selados0444 antes da leitura Native.
Resposta com stop, 2099 tokens de entrada e647 de saída, custo declarado
US$0,0057854. Root definiu o contrato; GLM propôs; Codex conferiu a fonte e
aplicou. Trabalho de autoria, sem crédito de crítico independente.

Evidência externa persistente em
`audits/2026-10-31-visual-consistency/FAUNA-VM-BINDINGS-R1100-*`:
BASELINE/CONTROLLER JSON e stdout/stderr separados, PRE-READ-SEAL,
RAW/ANSWER, ADJUDICATION, REPORT e MANIFEST. A triagem hospedada está em
`JAVA-CI-A4-TRIAGE-R1097-*` no mesmo diretório de auditoria.

## Continuidade

O checkpoint contém somente a fixture e este ledger. `public/` inteiro e
`package.json` permanecem iguais ao BD; o literal SIM_HASH713a9105f2c02115 é
preservado. Nenhum build, browser, fullgate, push ou operação GH foi feito nesta
lease. A skill aponta `docs/LICOES.md`, ausente neste ponto fixo; as regras vigentes
AGENTS, bug-hunt/regua e quality-gates foram consultadas, com a validação limitada
aos dois comandos autorizados por Root.

Root decide adoção/publicação e CI novo. A missão integral visual/PR/release segue
aberta; Flavio1158 excluído, UI/social depois, Game/Ego3:2/mobile/MP humano e
aceite artístico pendentes. Próximo passo: integrar o checkpoint e medir o novo CI.
