# Gauntlet MP: rota circular dos bots na Praça — 04/10/2026

## Objetivo e aceite

Investigar e corrigir [#682](https://github.com/corosolto/client/issues/682) na sala MP 5×5 da Praça dos Três Poderes. Aceite requer trilhas autoritativas e de snapshots a cada 100–150 ms, vídeo 3:2, ausência de volta curta sem alvo **com movimento efetivo**, regressão que fique vermelha sem a correção e partida visual com duas pessoas. Não confundir a órbita do servidor com interpolação do cliente.

## Estado

- Branch isolada `codex/mp-bot-orbit-20261004` em `client/worktrees/mp-bot-orbit-20261004`, derivada do PR empilhado #775 (`6334e8a5f`). A lane #755 ocupada por outro contribuidor não foi editada.
- Alteração em `public/js/game.js`: quando o A* devolve apenas o nó atual para um destino distante e existem nós banidos, sondar saídas banidas adjacentes com a mesma física de colisão do bot; reabrir **uma** saída só se ela produzir rota. Não limpar todos os banimentos. A régua backend pode desligar essa recuperação com `__mutBotExit`. Novo `SIM_HASH=825872778636506f`; cliente e backend existentes ainda não estão pareados com esse hash.

## Evidência e decisões

- Um `Room` autoritativo com dez bots na Praça, snapshots e estado de rota amostrados a cada 100 ms por 120 s, reproduziu a órbita. Na semente 4242, bot 5 fez 2 janelas de volta sem alvo; de 109–120 s percorreu 44,21 m, mas saiu apenas 3,24 m do ponto inicial; 105/110 amostras tinham rota `[287]`. Os banimentos `[286,334,236]` deixavam alcançáveis só `[287,262,312]`, sem ligação para o destino 441. O nó 286 era novamente caminhável a partir da posição atual. Trilha bruta local: `/tmp/mp-bot-praca-room-4242-baseline-20261004.jsonl`.
- Com a correção, o mesmo bot teve 0 janelas sem alvo, 9/110 amostras com rota de um nó; de 109–120 s percorreu 30,21 m e deslocou-se 27,01 m, seguindo pelo nó 286. Trilha: `/tmp/mp-bot-praca-room-4242-fixed-20261004.jsonl`. A diferença demonstra avanço, e não mera imobilidade.
- Oito sementes de 120 s no mesmo `Room` 5×5: janelas sem alvo no total passaram de 4 para 1 (semente 4242: 3→1, 8675309: 1→0; demais 0→0). A janela restante da semente 4242 é de outro bot e teve trocas de alvo; ela exige diagnóstico próprio, não é a rota `[287]`.
- `botsim-golden` passou; `bot-moving-loops-check` passou, incluindo controles de círculo, ida e volta, teleporte e alvo. Logs `/tmp/mp-bot-orbit-golden-20261004.log` e `/tmp/mp-bot-orbit-loops-check-20261004.log`.
- A nova régua `game/bot-route-exit-check.mjs` do backend usa `Room` 5×5, snapshots a 30 Hz, amostras a 100 ms e exige avanço líquido: 1200 amostras/1001 janelas, 0 voltas sem alvo, caminho 30,21 m e avanço 27,01 m no trecho crítico. O mutante sem saída reprova com 2 voltas, 44,21 m de caminho e avanço de apenas 3,24 m. Ela entra no portão backend e no build da imagem pareada.
- O navegador 3:2 entrou na sala MP real da Praça, negociou snapshot v5 a 30 Hz com dez entidades e sem exceção. A régua geral terminou 16/17: `TB8` não obteve nenhum impacto com material (0 de 0) enquanto o jogador usava AWP, logo **não validou poeira de tiro**; isto não diagnostica a rota dos bots. Captura `/tmp/mp-bot-orbit-praca-3x2-20261004.png`, log `/tmp/mp-bot-orbit-praca-browser-20261004.log`. A captura mostra a visão do jogador, não um vídeo de acompanhamento do bot.
- `npm run docs:check`, `npm run arch:check`, `npm run build`, sintaxe do jogo e `git diff --check` passaram com Node 23.6.0. O pre-push rejeitou o primeiro commit por comentário de seis linhas (teto dois); o comentário foi condensado, docs regenerados e hash atualizado para `825872778636506f`. Repetir o portão no novo HEAD.

## Próximo passo

Registrar commits e PRs empilhados, validar o portão backend, produzir vídeo da partida 3:2 com trilha de servidor e cliente, revisar a janela restante e jogar com duas pessoas. Recriar imagem backend fixada no SHA final antes de um release; depois medir a coorte por sete dias. A meta de 90% permanece não demonstrada.
