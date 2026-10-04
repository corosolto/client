# Continuidade — auditoria visual e bot de regressão da UI

## Objetivo e pronto quando

Pedido do dono em 04/10/2026: produzir (1) relatório com capturas reais e comparação com UI de jogos AAA, (2) proposta e roadmap de melhoria visual geral, e (3) bot de CI que classifique regressões. A entrega desta rodada fica pronta com relatório verificável, capturas locais, workflow e classificador implementados, mutação conhecida detectada e limites de execução declarados. A implementação das fases visuais propostas pertence às etapas futuras do roadmap.

## Checkout e proveniência

- Branch de trabalho: `codex/ui-roadmap-regression-20261004`, worktree isolado `client/worktrees/ui-roadmap-regression`. Base da branch: `12510a25a`; checkpoint de relatório e bot: `79aaecd92`.
- Base: `origin/main@8e4a64ab0` (`v2.1.0-alpha.34`). Não usar o checkout `client` existente, que tinha mudanças de viewmodel em andamento.
- Em 04/10, `origin/main` avançou para `12510a25a` (`alpha.35`); o diff de UI auditada é vazio. A branch isolada foi atualizada para essa base após as capturas, preservando a proveniência das imagens em `alpha.34`.
- Servidor local de auditoria: Astro em `127.0.0.1:4321`; Chrome nativo em modo headless; Node 23.6.0 local.
- Capturas ignoradas pelo Git: `artifacts/ui-audit-20261004/` (seleção para o relatório) e `artifacts/ui-regression/` (capturas brutas, estáveis, manifests e diffs). O script reproduz capturas de CI com Chromium instalado pelo Playwright.
- Mosaico `artifacts/ui-audit-20261004/visao-geral.png`: 1600×1400; SHA-256 `ffb634acd40de10b52c9522a956d7e755e0c5851e73e5f6ca65c9f001c9bf12a`. Pasta de screenshots: cerca de 15 MiB.

## Marcos e decisões

1. **Auditoria de interface concluída.** Home 3:2 e 16:9, modal de mapas, seleção de personagem, configurações, HUD e vitória foram capturados. O relatório liga cada tela à imagem e descreve o que se vê. A home levou cerca de dez segundos adicionais para mostrar mapa/personagem nesta máquina; a captura tardia é a referência de avaliação, sem inferir latência de produção.
2. **Referência visual delimitada.** Documentação oficial de VALORANT, Counter-Strike 2 e Warzone sustenta princípios de hierarquia, legibilidade e estado. O relatório não pede cópia estética nem apresenta uma partida local como aprovação de gameplay multiplayer.
3. **Resultado rejeitado.** Capturas com `nav=1` usam manequim procedural de inspeção por contrato; não servem para julgar a arte real do personagem. Uma captura de HUD com overlay de erro de viewmodel privado também não foi usada como captura principal.
4. **Bot implementado.** Captura da base e do head no mesmo runner, classificação `SEM_REGRESSAO`, `REVISAR`, `REGRESSAO` ou `INCONCLUSIVO`, com resumo, JSON, PNGs e diffs no artefato do Actions. Novos 404 de caminhos versionáveis são regressão; ausências de assets ignorados pelo Git ficam registradas, sem gerar falso vermelho pela ordem variável de carregamento. Mídias animadas são ocultadas só na captura de comparação, e ficam visíveis na captura completa para revisão humana.

## Validação e pendências

- `npm ci --ignore-scripts` passou neste worktree. `actionlint` passou depois do ajuste do workflow. A primeira captura completa de sete telas passou sem erro JS; todas abriram. Home e personagem tiveram `mediaReady=true`. Alguns assets privados/ignorados dão 404 herdado, descritos no relatório.
- `tools/ui-regression/selftest.mjs` passou após o rebase: sem mutação → `SEM_REGRESSAO` (exit 0), CTA oculto → `REGRESSAO` (exit 1), novo 404 versionável → `REGRESSAO` (exit 1), asset ignorado ausente → `SEM_REGRESSAO` (exit 0), imagem alterada → `REVISAR` (exit 0), baseline indisponível → `INCONCLUSIVO` (exit 1). A CI executa esse autoteste.
- A primeira repetição revelou instabilidade real do teste: home 3:2 não ficou visível em 20 s, seleção de personagem variou e 404 de assets ignorados chegaram em momentos diferentes. Correções: 60 s e até duas tentativas com `*.failure-N.png`, mapa fixo, clique explícito no personagem e classificação de 404 conforme o Git.
- `artifacts/ui-regression/final-a/` vs. `final-b/`: **`SEM_REGRESSAO` nas sete telas**, exit 0; diferenças estáveis 0% em seis telas e 0,1% no HUD. Home/character tiveram `mediaReady=true` em ambas; nenhum erro JavaScript de página. Resultado em `artifacts/ui-regression/final-comparison/{summary.md,report.json}`. Ambas foram capturadas antes do rebase, na base visual `8e4a64ab0`.
- `npm run eval:screenquery` passou (SQ1–SQ8). `npm run eval:redesign` passou (UIA/UIR, exit 0). `npm ci --ignore-scripts` no lockfile `alpha.35`, `actionlint` e `node --check` dos três scripts passaram.
- O primeiro pre-push bloqueou `check:deploy`: 44/46 portas passaram; `docs:check` e `eval:docsautoria` falharam porque o novo capturador elevou de 231 para 232 a contagem gerada de scripts que importam Playwright. `npm run docs` atualizou somente `README.md` e as duas páginas de stack. `npm run docs:check` e `npm run eval:docsautoria` passaram após essa atualização. Repetir o pre-push antes de publicar.
- O workflow ainda não foi executado num runner GitHub nesta branch. Não interpretar teste local como job verde publicado.
- Avaliação artística final e gameplay humano 3:2 continuam com o dono. As fases de redesenho da UI ainda não foram implementadas.

## Próximo passo concreto

Publicar a branch em PR rascunho, observar a primeira execução do workflow no GitHub e ajustar diferenças específicas de Chromium/Linux se surgirem. A revisão humana das capturas 3:2 e a aprovação artística seguem pendentes; não iniciar fases de redesign sem esse aceite.
