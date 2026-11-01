# Saque autorado — continuação R944

Objetivo: honrar a política `timing: gameplay` já declarada no ramo `equip_rifle` e no arco `drawDrop`, preservando Game, arma, curvas, GLBs, FOV, AK e HAND_DEBT. Root é o único operador de publicação.

Base: `fc94596e3a80cf9c7d7ee4461382b5ac5f56f62c`; branch `codex/pistol-draw-timing-r944-20261101`, worktree própria homônima. W821/push R941 e S4/R928 não são editados. O SHA deste checkpoint está no Git e no manifesto externo `A/PISTOL-DRAW-R944-MANIFEST.json`, evitando uma referência circular.

## Marcos validados em 01/11/2026

R933 reproduziu com Game, callbacks e controller reais: `.33` bloqueado; `.35` consome `12→11` e encaminha hitscan 34, embora antes do tiro o corpo estivesse fora do frustum. O Game pedia `.34 s`, mas o controller tocava Equip em `1 s`. Fonte: `A/PISTOL-DEPLOY-R933-REPORT.md` e manifesto.

O censo anterior ao patch leu resolvers/configurações e metadados dos GLBs/General reais: naquela execução, 26 armas e 40 rotas, com 35 durações afetadas pela política já declarada. `gold#ak` conserva `1 s`; as três rotas fábrica curtas continuam no fallback e a faca tem controlador próprio. Só `fab#uzi` declara `drawDrop` entre as rotas afetadas atuais. Dados completos: `A/PISTOL-DRAW-R944-CENSUS.json` e `CENSUS-FRAMES.json`. Isto não aprova visualmente os retimings.

A regressão permanente foi executada antes de alterar o runtime: exit 1, quatro RED causais (B1 taxa, B2 arco, G3 clipe não terminado, G4 corpo fora do frustum), stderr vazio. O patch move a política existente para antes do ramo e compartilha `drawDuration` entre clipe e arco; o fallback conserva sua expressão literal.

Depois: nominal 11/11 PASS; `clip-cs16` morde B1/B2/G3/G4, `drop-cs16` somente B2 e `non-gameplay` B3/B4. Âncoras únicas, mutações em memória e conjuntos de falhas exatos; quatro processos exit 0 sem stderr. Tempos e logs: `A/PISTOL-DRAW-R944-FOCAL.json`.

Na mesma fixture Game, `.33` continua bloqueado com Equip/draw ativo; `.35` chega a Idle antes do clique, com 1.064 triângulos do corpo não descartados pelo frustum. Depois, munição `12→11`, Shoot e hitscan 34. O relógio de deploy não mudou. A fixture usa o controller criado pelo Game e `_md`/`_mu`/`_tryShoot`/hitscan reais. A única ponte específica de carga injeta a entrada do GLB público exato porque `NODE_RUNTIME` impede `_loadFamily`; não é prova do download nem da pintura no navegador.

`eval:authored-draw-timing` está na cadeia `eval:authored-transition` → `check:vm`. O alias composto passou; contexto Game nominal/mutantes e cadência existentes passaram. Evidência: `A/PISTOL-DRAW-R944-EXISTING-FOCALS.json`. Sintaxe e `git diff --check` passaram.

Shader SB1–6 PASS; SB7 não medido (exit 78: `astro` ausente nesta worktree). A chamada direta ao `moduleCacheManifest` confirma inclusão de `authoredvm.js` e revisão por conteúdo `b2169ac98020 → 93273827daf3`; isso não substitui o probe HTTP/Astro pendente.

## Regras, decisões e limites

Foram lidos AGENTS/ARCH, CONTRIBUTING, as skills locais bug-hunt/régua, quality-gates e a fonte real `R/progress/docs/LICOES.md` (o caminho antigo `docs/LICOES.md` não existe nesta worktree). A faixa isolada, baseline RED, mutantes e cadeia real atendem ao escopo autoral. O `KNOWN-BUGS.md` compartilhado foi consultado; por posse, a continuidade desta lease fica neste arquivo e em A, sem escrita em progress alheio.

Aceito: correção causal CPU da política de tempo. Rejeitado: limitar por id, editar Game/balanço/pose/modelo/FOV, apagar HAND_DEBT, inferir cor/pintura de seleção de rota ou aprovar arte pelo frustum. O teste genérico de arco usa um clip/rig pequeno sintético; a geometria pistol do teste Game é a pública real. AK e assinatura `f468adc9279d` da dívida pistol permanecem.

Pendente: crítico independente de todo o diff; gates completos e publicação sob Root; Game real 3:2, sensação de movimento, pintura, contato/anatomia, mobile e MP. Root proibiu browser/render/globalgate nesta lease e manteve exclusividade headless; nenhuma dessas provas foi fabricada ou repetida. Não há aprovação visual ou de release.

Próximo passo concreto: Root recebe o checkpoint DCO/Agent e os pins de `A/PISTOL-DRAW-R944-MANIFEST.json`, obtém a crítica independente e decide a integração. Investigações de skin ficam para outra lease; nada foi alterado nessa fronteira.
