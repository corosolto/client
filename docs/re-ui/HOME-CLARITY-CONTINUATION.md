# Home clara e Ranking público — 28/09/2026

## Objetivo e pronto

Na home padrão: limitar a largura dos controles em telas largas, mostrar os links sociais, tornar perfil/personagem/modos/rounds obviamente clicáveis e trocar a dica genérica por orientação contextual. Restaurar o Ranking público único com leitura consistente entre home, `/ranking`, perfil e badge. Auditar PRs abertos antes de qualquer merge.

## Lane e estado

- Worktree: `worktrees/home-clarity-ranking`; branch `codex/home-clarity-ranking` criada de `origin/main@ddd0f2f4e` (`v2.1.0-alpha.8`). A árvore principal e a lane ADS não foram alteradas.
- Home: `src/pages/index.astro`, `public/style.css`, `public/js/main.js`. O wallpaper segue preenchendo a tela; cabeçalho, rodapé, mapa e personagem usam uma área central de até 1600 px. Os ícones sociais existentes foram movidos do rodapé legado ao hub; perfil, personagem e opções têm chamadas visíveis. A aba Ranking oferece cadastro de nick quando falta identidade.
- Validação local: `npm run syntax`, `npm run build` e `npm run eval:redesign` passaram. Navegador local confirmou ícones, cartões e links de cadastro; inspeção visual final em 1536×1024 (3:2) mostrou controles legíveis e sem corte, além de geometria a 390×844. `check:deploy` passou 46/46 após regenerar índices de documentação e voltou a passar 46/46 (Node 23, 160,5 s) após a revisão adversarial. Uma tentativa intermediária pelo Node 16 antigo do PATH falhou em nove gates incompatíveis com esse runtime; a repetição usou `/opt/homebrew/bin` primeiro. PR/CI pendentes.
- Revisão adversarial encontrou quatro problemas, corrigidos: pontos ausentes da tabela da home, convite de nick escondido por valor local não registrado, texto de convite incompatível com flag OFF e cartões de modo confundidos com quantidade de rounds. O CSS fornece uma única seta por cartão.

## Ranking e limites observados

- Cliente PR #663 e backend PR #34 já estão mergeados. Migration 037 está aplicada. Os três nós receberam código de ranking conforme `docs/ranking/RELEASE-CONTINUATION.md` e backend `HANDOFF.md`, mas o estado exato deve ser verificado antes da ativação.
- Em 28/09, domínio público: `/ranking` HTTP 200 com aviso OFF; `/api/leaderboard` HTTP 200 `{"disabled":true}`. API Cloud Run revisão `00040-786` recebe 100% de tráfego com `RANKING_ON=false`. O canário ON retorna 500 perfis; nenhum desses 500 tem `points > kills`. A Vercel Production mantém variável `RANKING_ON` configurada e chave SSR protegida; não foi alterada nesta lane.
- Ainda falta uma prova de bônus em rodada real com dois perfis autenticados distintos e prova de uma partida SP atribuída a nick registrado. A captura do dono mostrava `SEM NICK`; não atribuir as requisições de submit observadas ao seu perfil. Não apresentar bônus MP como validado em produção.

## PRs inspecionados

- #705: 1 linha de changelog, não draft, mergeable; checks verdes na inspeção.
- #701: limpeza de 72 arquivos, não draft, mergeable e checks verdes; alto escopo, revisar exclusões antes de merge.
- #704: ADS e recoil, draft; build/portão recentes pendentes. Usuário aprovou a sensação do ADS, mas não há revisão final de todos os casos.
- #689: tipografia do hub, draft; evidência local, ainda pede revisão visual humana. Toca `public/style.css` e deve ser coordenado com este PR.
- #690: upload de avatar, draft; falta teste integrado de upload/persistência.
- #678, #665, #660: conflitos com main. #702/#703: drafts separados.

## Próximo passo

1. Passar `check:deploy`, revisar a home no navegador e publicar PR desta lane.
2. Montar canário Production sem alias com Ranking ON, validar SSR, API, perfil e badge sem expor chave; integrar a UI com main após CI.
3. Obter prova real de pontuação SP e de bônus MP ou registrar explicitamente a lacuna antes do corte público; verificar a frota e os dois serviços ao ligar as flags.
4. Revalidar PRs candidatos contra a main após o merge desta UI; não mesclar #701/#689/#690 só por `MERGEABLE`.

## Marco: PR e canário de Ranking — 28/09/2026

- Commit `f091e5b73` publicado em PR cliente #709, mergeable; `check:deploy` 46/46 no checkpoint e pre-push 46/46. CI do PR ainda estava em execução na última consulta, com `smoke`, DCO e um build verdes.
- Candidato Vercel Production `dpl_4aVX5LAQKcrPcyJWoCuJ5oPmqvAP`, URL `csbrasil-d10v1lasy-rubenmarcus-projects.vercel.app`, foi construído com `RANKING_ON=true` e `--skip-domain`. **Nenhum domínio público customizado foi promovido**; somente o alias do projeto apareceu no inspect.
- Verificação autenticada do candidato: home 200 com a cópia ON, `/ranking` 200 exibindo pontos e links de perfil; `/u/c070b419-d2bf-4eef-a5c1-e351d7c92d38/Junin` 200 com título de 25720 pontos; badge correspondente PNG 840×440, SHA-256 `5e8209285f3d0b6d12036b6ddf1da8026985af55281e09b98b997db2a7a71877`. API canário `ranking-on-canary` devolveu top 2 com `points=kills`.
- Cloud Run público `csbrasil-backend-00040-786` ainda recebe 100% e `RANKING_ON=false`. O canário ON `00036-pej` segue com 0%. A prova positiva de bônus MP real segue ausente; não declarar esse caminho validado.
- Nova revisão de configuração `csbrasil-backend-00044-ror` foi criada com `RANKING_ON=true`, tag `ranking-release-check` e **0% de tráfego**. Usa o mesmo digest de imagem `sha256:55bc3547...` da revisão pública `00040-786`; a API tagged respondeu health `ok:true`, `operationalFresh:true` e leaderboard com pontos. O público continuou em `00040-786` 100% após a criação.
- Rollback conhecido do cliente: deployment Production anterior `dpl_B7xhZVP1CeXPYTDEo7dgXK9PSYkE`, com aliases `www.csbrasil.online` e `csbrasil.online`. Revalidar o alias antes de promover, pois há outras lanes ativas.
- PRs cliente: #705 é mudança de uma linha no changelog, checks verdes e mergeable; #701 é limpeza ampla de 72 arquivos com checks verdes, requer revisão semântica; #704, #689, #690, #702 e #703 são drafts; #678, #665 e #660 conflitam. Backend #25, #29 e #30 são mergeable sem checks anexados, exigem revisão própria.

Próximo passo concreto: aguardar CI #709, revisar resultado e integrar a home; decidir a promoção coordenada das duas flags e verificar o domínio público. Não misturar o canário privado com prova de pontuação MP humana.

### CI remoto completo

PR #709 em `f091e5b73` passou portão de navegador (19 min, inclusive Sertão LG1–LG8), ambos os builds (15m47s e 1m55s), smoke, DCO, análises e Vercel Preview; `mergeStateStatus=CLEAN`, sem checks falhos. Pronto para merge da home. A atualização deste ledger ainda está só no worktree, porque um novo commit no PR reiniciaria os portões longos.

### Merge da home e início do corte público

- PR #709 foi mesclado em `main` no merge commit `7c6d213b8b` às 19:05 UTC; release criou `1054bbc46` e tag `v2.1.0-alpha.9`. Deployment automático público `dpl_5TBkL6HqTiubWsXj7nqefhHMAzsK` ficou Ready. Inspeção de navegador em `www.csbrasil.online` a 1536×1024 confirmou layout, seleção de modo, CTAs e os três links sociais.
- API Cloud Run revisão `00044-ror`, canário ON testado e com mesmo digest que `00040-786`, recebeu 100% do tráfego. Health público `ok:true`, `operationalFresh:true`; leaderboard público direto e via `/api/leaderboard` no site retorna pontos. Reversão operacional: encaminhar 100% para `00040-786`.
- Vercel Production `RANKING_ON` foi atualizado para `true`. Um deployment limpo de `origin/main@1054bbc46` foi iniciado com `--prod --skip-domain` a partir de `worktrees/ranking-launch-alpha9`; URL candidata `csbrasil-8lp328oym-rubenmarcus-projects.vercel.app`, build ainda em andamento. Deployment público anterior à promoção: `dpl_5TBkL6HqTiubWsXj7nqefhHMAzsK`.

Próximo passo: validar candidato alpha.9 ON (`/ranking`, perfil, badge, home), promover para os domínios públicos, verificar SSR e API ponta a ponta. Registrar explicitamente que o bônus MP real entre duas pessoas continua sem prova positiva.

### Ranking público ligado e verificado — 28/09/2026

- Deployment Production alpha.9 `dpl_5RfjWweT2cNBNTrDhbdfB7HXaDyS` foi construído a partir de `1054bbc46`, com `RANKING_ON=true`, validado sem domínio e promovido. `vercel inspect www.csbrasil.online` resolveu esse ID depois da promoção.
- No domínio público: `/ranking` mostrou pontos e perfis; `/u/c070b419-d2bf-4eef-a5c1-e351d7c92d38/Junin` mostrou 25720 pontos; `/api/badge/<id>.png` respondeu PNG 840×440 com SHA-256 `5e8209285f3d0b6d12036b6ddf1da8026985af55281e09b98b997db2a7a71877`; `/api/leaderboard` via site trouxe pontos. Browser em 1536×1024 confirmou a home com tabela `PONTOS` e dez linhas carregadas, CTA de nick, links sociais e dica contextual. `csbrasil.online/ranking` devolve 308 para `www`.
- API pública permanece em revisão `csbrasil-backend-00044-ror` 100%, health `ok:true`, `operationalFresh:true`. Rollback de cliente: promover `dpl_5TBkL6HqTiubWsXj7nqefhHMAzsK` (alpha.9 anterior, OFF), ajustar Vercel Production `RANKING_ON=false`; rollback de backend: 100% para `00040-786`. Revalidar estado externo antes de qualquer rollback.
- **Limite remanescente:** o caminho de bônus MP real com dois perfis humanos distintos não foi observado; todos os pontos visíveis no topo continuam iguais aos abates. Gates sintéticos e contrato do servidor passaram, mas isso não é prova de rodada humana. Também não se atribui a partida anterior do dono ao nick `RUBEN`.
- PRs abertos após o merge: #705 (uma linha de changelog, checks verdes, mergeable) é candidato direto; #704 ADS e #703 Amazônia viraram conflitos, drafts; #701 limpeza ampla virou conflito, requer revisão semântica; #689 tipografia e #690 avatar seguem drafts mergeable; #702 draft mergeable; #678/#665/#660 conflitam. Backend #25/#29/#30 mergeable mas sem checks anexados, não declarados prontos.

Definição de pronto deste objetivo: home e Ranking padrão publicados e rotas públicas verificadas. O bônus humano MP e os demais PRs seguem como trabalho separado; não anunciar esse bônus como medido.
