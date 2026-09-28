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
