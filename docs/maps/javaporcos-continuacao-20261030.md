# Continuação — Javaporcos, 30/10/2026

## Objetivo e aceite

Executar na ordem os sete pedidos do prompt da raiz
`PROMPT-CODEX-JAVAPORCOS-2026-10-30.md`: passada sem patinar;
gravações reais de porco; lojas reviradas contando para domínio;
pasto/mata maiores; AK47 com material correto em primeira pessoa;
time Javaporcos e wallpapers rotativos; introdução da praga pulável.
Concluir cada mudança com régua que reprove antes, mutante, A/B medido,
verificação visual no jogo real e commit por assunto. Manter tudo no PR #1160.

## Estado verificado

- Worktree `worktrees/modo-javalis-20261028`, branch `v2/invasao-javaporcos`.
- HEAD inicial `c2076a5e7524d4143f67dc57716961075e84aaee`.
- Rodada 5 presente no histórico: iluminação, rodapé, lâmpada, cupinzeiro e lixo.
- `node tools/eval/javaporcos-mapa-check.mjs` passou integralmente neste HEAD.
- Link privado de viewmodels presente. `worktrees/` não rastreado é preexistente.
- Nenhuma das sete correções foi implementada nesta retomada.

## Push concluído

O dono autorizou enviar os commits existentes. A primeira tentativa foi bloqueada
pelo hook: scripts npm selecionaram Node antigo apesar de `node -v` indicar 26.
`eval:apis` falhou por ausência de `stripTypeScriptTypes`; passou ao executar com
`PATH=/opt/homebrew/bin:$PATH`. Segunda tentativa: 80/81 portões passaram;
somente `eval:redesign` falhou, por âncoras antigas em UIR16/UIR32 que ignoravam o
wallpaper fixo do mapa. Corrigida a âncora e o mutante correspondente, sem mudar
runtime. Baseline passou; mutantes `loading-sem-wallpaper`, `loading-uma-faccao`
e `loading-wall-cover-unico` fizeram as invariantes esperadas ficarem vermelhas.
Revisão independente do diff local: sem achados. Correção em `4acda7bf2`.
Terceira tentativa: 81/81 portões passaram (359,8 s); push retornou zero.
`git ls-remote` confirmou `4acda7bf2257842b1e4aa03d7e0f2cc679f77064` no remoto.
Os commits existentes e a correção da régua foram enviados, sem pular hooks.
Relatório completo da segunda tentativa preservado em
`/tmp/javaporcos-prepush-node26-20261030.log` (temporário, fora do Git).
O primeiro hook regravou `tools/eval/map_check.json`; somente essa alteração gerada
foi restaurada, pois a árvore estava limpa antes da execução.
`eval:javaporcoswall` passou no navegador com BASE=http://localhost:4321 e browser
lock: JW1 arte do modo, JW2 rotação normal em outro mapa, JW3 HTTP 200 image/webp.
Servidor preexistente PID 35025 pertence a esta worktree (cwd confirmado); HTTP 200.
Captura 3:2 de diagnóstico em execução, saída em
`/tmp/javaporcos-evidence-20261030/`. Os quatro GLBs de fauna têm uma única malha,
sem skins ou animações; não confundir a oscilação do corpo com uma passada.

## Restrições e próximo passo

Não ler `.env`, não usar assets NC, não pular hooks, não fazer force push.
Não alterar números de game feel sem o dono. Uma captura de browser por vez,
com lock e BASE explícito. Manter budgets e preservar demais mapas em map_check.
Depois do push: reproduzir patinação e AK preta no navegador; começar a régua
da passada. O código atual só oscila o corpo inteiro em `atualizaVisual`.
Verificar pacotes Mint antes de gerar novamente; Sketchfab depende de token
fornecido por ambiente, sem expor ou registrar seu valor.
