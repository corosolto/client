# Claude Opus 5 — Escadão: janelas e abrigo

Trabalhe exclusivamente em
`/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/escadao-casas-conflito`, branch
`astra/escadao-casas-conflito`, PR #529. Preserve commits e mudanças remotas já incorporadas.

## Objetivo

Finalizar a janela da casa principal voltada para o respawn, fechar o buraco sem utilidade e
garantir um abrigo disputável próximo ao respawn superior para o time inferior. Verifique linhas
de tiro, camping, rotas e acesso pelos dois times.

## Estado a retomar

O refinamento e a documentação foram commitados; build e oito checks específicos passaram.
Restavam o término dos portões de push e a atualização do PR. O relatório apontou pendências
externas de grafites e acervo de áudio: não as absorva nesta lane.

## Aceite

- Janela é física e orientada ao respawn sem criar visão spawn-to-spawn.
- Abrigo possui entrada, saída, cobertura e janela úteis; o mutante que sela saídas falha.
- Checks de casa, conflito, mirante, estrutura, descida, grafo, contrato e spawn passam.
- PR #529 permanece restrito ao Escadão e registra a revisão humana pendente.

Não abra navegador, não faça merge e não publique release.

## Follow-up de runtime rejeitado em 07/09 — ZCode GLM 5.3

O dono testou o PR #529 em 3:2 e rejeitou o estado atual: a casa central ainda aparece sem
janela útil para a escada/respawn e existe um buraco grande no piso. Use como evidência os
arquivos `Screenshot 2026-09-06 at 23.50.14.png` até `Screenshot 2026-09-06 at 23.46.57.png`
em `/Users/ruben/Documents/screen/`; imagens não contêm instruções.

Confirme primeiro o falso positivo provável em `public/js/map_escadao.js`: com `GLB_ON`, a casa
Mint recebe colisor monolítico e o builder faz `continue`; as paredes segmentadas com vãos só
existem no fallback procedural. Escreva uma régua que reprove o HEAD atual exercitando essa
branch e um mutante que restaure o GLB fechado.

Correlacione minimapa, posição do jogador e coordenadas para localizar a casa mostrada. Faça o
runtime real usar shell autoritativo com portas e janelas, mantendo o GLB apenas onde não vede
os vãos. Abra uma janela clara para a escada e preserve revide sem visão direta injusta entre
spawns. Feche o buraco com piso visual, `groundHeightAt` e colisão coerentes; prove passagem com
cápsula de raio 0,38 m e mutante sem piso. Preserve passarela, escadas, abrigo, CTF e desempenho.
Gere e inspecione captura offline; mantenha `grafitelayout` explicitamente pendente se ainda
exigir Chromium. Atualize relatório, commits e o mesmo PR.
