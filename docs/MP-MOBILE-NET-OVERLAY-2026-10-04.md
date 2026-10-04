# Gauntlet MP: painel de rede no celular — 04/10/2026

## Objetivo e aceite

Liberar os controles de chat e pausa que o painel NET cobria visualmente na viewport móvel 844×390, preservando diagnóstico de FPS/ping/gap e a telemetria de qualidade. Aceite técnico: captura 844×390 sem sobreposição, desktop com painel completo, netcode e portão verdes, `SIM_HASH` igual. O objetivo maior permanece partida de dois humanos em redes distintas e pelo menos 90% de sessões boas/ótimas por sete dias comparáveis após release.

## Estado

- Checkout isolado `client/worktrees/mp-mobile-net-overlay-20261004`, branch `codex/mp-mobile-net-overlay-20261004`, base `03d9bb01aaa7e8f5c8f659d7c2c65745cd98418b` do PR #776. A lane de #776 ficou limpa e intocada.
- O cliente passa a renderizar a versão completa do painel e uma faixa compacta de FPS, ping e gap. CSS mostra a faixa no formato horizontal estreito, deslocada à esquerda dos botões de chat/pausa; viewport menor e retrato ocultam o painel para liberar a tela. A coleta e o envio de métricas continuam no mesmo `updateStats`.
- Captura móvel local com nó pareado: `artifacts/mp-mobile-overlay-20261004/mp-mobile-overlay-after-20261004-identidade-entrada.png` (SHA-256 `bd677278d153b2377081b614afedc3f55c1b96c282b8478d72896c6ae077365e`). A faixa fica acima e à esquerda dos botões; o painel anterior na captura `client/worktrees/mp-bot-orbit-20261004/artifacts/mp-gauntlet-20261004/two-browser/praca-mobile.png` cobria visualmente o canto. Artefatos ignorados pelo Git.
- Browser MP Praça 844×390: 17 verificações passaram, uma falhou por falta de qualquer impacto com material em tiros SCAR (TB8 0/0, inconclusiva para este layout). Identidade, pausa, espectador, protocolo v5, dez entidades e zero exceções passaram. Log `artifacts/mp-mobile-overlay-20261004/mp-mobile-overlay-browser-20261004.log`.
- `npm run eval:netcode`: 201/201; `node scripts/sim-hash.mjs --check`: `825872778636506f`, igual à base e à imagem backend candidata. `npm run docs` atualizou seis blocos gerados de contagem; são derivados do código desta lane.
- Revisão adversarial: a crítica visual A/B aprovou a posição compacta em relação a chat, placar, retrato, mira e minimapa, mas não pôde julgar todos os estados por capturas em momentos distintos. O caçador de regressões achou uma sobreposição real do compacto no título “PAUSA NA TRETA” na primeira captura de pausa. CSS agora oculta o painel NET durante a pausa; a segunda captura `artifacts/mp-mobile-overlay-20261004/mp-mobile-overlay-r2-20261004-identidade-pausa.png` (SHA-256 `604cb2cfe1d974e676b1d979f149708434f1635ce9b8850768103a464057eebe`) mostra o título completo. A captura de entrada `mp-mobile-overlay-r2-20261004-identidade-entrada.png` mantém a faixa fora dos botões.
- O segundo browser MP Praça 844×390 repetiu 17 verificações verdes (identidade, pausa, espectador, protocolo v5, zero exceções); TB8 teve 0 impactos com material para 0 possíveis, portanto não mede este ajuste. Log `artifacts/mp-mobile-overlay-20261004/mp-mobile-overlay-browser-r2-20261004.log`.
- Estado final: `npm run check:deploy` passou 46/46 em 91,3 s; `npm run build` passou. O navegador Escadão 1536×1024 manteve o painel NET completo, identidade e fluxo MP, com 16 verificações verdes; TB8 novamente teve 0/0 impactos materiais, sem relação com o painel. Captura `artifacts/mp-mobile-overlay-20261004/mp-mobile-overlay-desktop-20261004-identidade-entrada.png` (SHA-256 `ef3004f9ac4c139c6255476b590b86677ae85fc9e2b2aa316f039f03935966ef`) e log correspondente. Nenhuma exceção de página foi registrada.

## Próximo passo

Fazer checkpoint e PR empilhado sobre #776. Se aprovado para release, parear o backend ao SHA final de cliente e reconstruir a imagem antes do canário. Teste automatizado local não substitui humanos nem coorte de sete dias.
