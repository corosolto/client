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

## Push autorizado, ainda pendente de confirmação

O dono autorizou enviar os commits existentes. A primeira tentativa foi bloqueada
pelo hook: scripts npm selecionaram Node antigo apesar de `node -v` indicar 26.
`eval:apis` falhou por ausência de `stripTypeScriptTypes`; passou ao executar com
`PATH=/opt/homebrew/bin:$PATH`. Segunda tentativa: 80/81 portões passaram;
somente `eval:redesign` falhou, por âncoras antigas em UIR16/UIR32 que ignoravam o
wallpaper fixo do mapa. Corrigida a âncora e o mutante correspondente, sem mudar
runtime. Baseline passou; mutantes `loading-sem-wallpaper`, `loading-uma-faccao`
e `loading-wall-cover-unico` fizeram as invariantes esperadas ficarem vermelhas.
Revisão independente do diff local: sem achados. Repetir push com PATH corrigido.
Confirmar o SHA remoto antes de repetir o envio. Remoto observado antes dessa
conclusão: `4706b457f8cec9136e83ec77763e1329a1d9aded`.
Relatório completo da segunda tentativa preservado em
`/tmp/javaporcos-prepush-node26-20261030.log` (temporário, fora do Git).
O primeiro hook regravou `tools/eval/map_check.json`; somente essa alteração gerada
foi restaurada, pois a árvore estava limpa antes da execução.
`eval:javaporcoswall` ainda não executado: exige BASE local explícito e navegador.

## Restrições e próximo passo

Não ler `.env`, não usar assets NC, não pular hooks, não fazer force push.
Não alterar números de game feel sem o dono. Uma captura de browser por vez,
com lock e BASE explícito. Manter budgets e preservar demais mapas em map_check.
Depois do push: reproduzir patinação e AK preta no navegador; começar a régua
da passada. O código atual só oscila o corpo inteiro em `atualizaVisual`.
Verificar pacotes Mint antes de gerar novamente; Sketchfab depende de token
fornecido por ambiente, sem expor ou registrar seu valor.
