# Continuação — rotas CTF de Córrego (04/10/2026)

## Objetivo e pronto

Restaurar pelo menos duas rotas separadas de cada spawn até cada bandeira em Córrego após o release alpha.46, preservando a escala, o piso, o colisor e a largura navegável das três pontes baixas aprovadas no PR #761. Pronto exige a régua PON1–PON5 verde, CTF2 verde no `map-check` de Córrego, SIM_HASH correto, CI da PR verde e verificação de paridade site/nós se a mudança for publicada. A revisão humana do mapa continua um gate separado.

## Checkout e diagnóstico

- Worktree `client/worktrees/corrego-ctf-routes-20261004`, branch `codex/corrego-ctf-routes-20261004`, base `origin/main@70eec315c01657570115ef5b1416c0b7e5ee544c` (alpha.46). Alterações limitadas a navegação de Córrego, régua específica, hash e blocos gerados.
- O `pr-fast` do cliente multiplayer #755, run `37206153891`, reprovou `CTF2`: E→R, E→C, E→P e B→B tinham só uma rota. A reprodução na main alpha.46 via `map-check.mjs fy_corrego` deu as mesmas quatro falhas. O release anterior alpha.45 tinha CTF2 verde.
- A mudança do PR #761 alinhou as bandas z de navegação às pontes reais: norte/sul ±1,5 m e central ±0,9 m. Alargar apenas a banda para ±1,6/±1,0 restaura as rotas, mas deixa a navegação 0,1 m fora da madeira e foi rejeitado como correção. Acrescentar waypoints transversais **dentro** de cada tabuleiro também restaura 2+ rotas, sem alterar geometria, colisão ou escala. `linha` filtra nós bloqueados e `segClear` filtra arestas impassáveis.

## Correção e validação

- Uma linha transversal de waypoints por ponte, do x interno esquerdo ao direito; nenhuma alteração na malha ou nos limiares físicos. A régua `corrego-ponte-check` agora cobra PON5 no grafo real para as oito relações spawn→bandeira. Antes da linha, PON5 falhou exatamente nos quatro pares; depois, passou 8/8. A CTF2 de `map-check.mjs fy_corrego` voltou a mínimo 2 rotas (E→R 2, E→C 2, E→P 2, E→B 4; B→R 4, B→C 2, B→P 2, B→B 2). Esse comando ainda pode sair vermelho por dívidas MAP1/MAP6 do mapa e não é declarado portão inteiro verde.
- `scripts/sim-hash.mjs --write` calculou `SIM_HASH=414e5ed74af13502` após encurtar o comentário (o hash inclui os bytes do arquivo fonte). `docs:check` passou com 25 blocos; `eval:corrego-contract`, `eval:corrego-water`, `eval:corrego-superficie`, `eval:corrego-ponte`, `corrego-rotas-check`, `corrego-tatico-check` e `eval:mp-paridade` passaram. O `map-check.mjs fy_corrego` confirmou CTF2 verde, mas ainda registra dívidas MAP1/MAP6 preexistentes; o JSON gerado pelo ensaio foi restaurado para não entrar no patch. O primeiro pre-push bloqueou só CM1 por comentário novo acima de duas linhas; o comentário foi reduzido, `gen-arch` e docs regenerados. Próximo: repetir pre-push, abrir PR isolada e aguardar CI. Não publicar a hotfix sem confirmar a sequência site/nós e o estado dos jogadores.

## Checkpoint da PR

- Pre-push repetido e verde em 103 s; código no commit `b6c76731401c099469145fb7c242794b7624953f`, draft PR #764, mergeable, CI em andamento. A régua PON5 agora só imprime o resumo de oito relações quando todas passam; validação local verde. Próximo: enviar esse ajuste de mensagem, aguardar CI do HEAD final e atualizar o texto da PR. Se os portões ficarem verdes, coordenar release com zero jogadores e sincronização BR/US/EU, então rebasear #755 e repinar #56.

## Relação com o gauntlet multiplayer

Esta hotfix é independente da correção de Escadão, RTT e chat do draft #755. O objetivo maior continua ≥90% de sessões medidas como boas/ótimas por sete dias comparáveis, com partida de dois humanos/aparelhos e revisão visual 3:2. O CTF2 vermelho é um bloqueio de CI e um risco real de navegação de bots, não uma explicação suficiente para o RTT/FPS/gap históricos.
