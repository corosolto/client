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
- Pedido 1 validado localmente: rig procedural por indivíduo, com geometria de pesos
  compartilhada por modelo e quatro fases; apoio fica ancorado no mundo e consulta
  o chão. Descarte de corpos libera skeleton/boneTexture, sem descartar material
  ou geometria compartilhados. Os pedidos 2–7 ainda não foram implementados.

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
Captura 3:2 de diagnóstico concluída, saída em
`/tmp/javaporcos-evidence-20261030/`. Os quatro GLBs de fauna têm uma única malha,
sem skins ou animações; não confundir a oscilação do corpo com uma passada.

## Pedido 1 — evidência e decisões locais

Fonte geométrica: os quatro GLBs de `public/models/enemies/javaporcos/`, hashes no
`asset-manifest.json` ao lado. Pesos e amplitude usam a altura e distância entre
patas do próprio GLB; a fórmula vive em `public/js/javaporcos_passada.js`.
São parâmetros visuais do rig, sem alterar velocidade, dano ou cadência da horda.
A fase avança por distância percorrida, não por relógio.

Régua: executar `tools/eval/javaporcos-passada-check.mjs` com Node, BASE explícito
e `tools/eval/with-browser-lock.sh`. `TYPE` seleciona jovem/adulto/matriarca/
ariete; `STEP` escolhe deslocamento por quadro da sonda, sem mudar o jogo;
`OUT`, `--fotos` e `--perf` preservam artefatos. A tolerância numérica da régua verifica
contato e invariância do pé sob transformações de ponto flutuante, não autoriza
deslizamento perceptível. Duas patas precisam tocar o terreno e ficar imóveis em
todos os quadros medidos; o primeiro quadro de inicialização não é amostrado.

- Antes: 0/240 quadros; deslocamento dos pés/corpo = 1.000000.
- Primeira passada: rejeitada por esticar pernas nas fotos. Amplitude foi reduzida.
- Primeira régua: rejeitada na revisão porque ignorava altura do pé e parada.
- Jovem com régua reforçada: 240/240, razão 0.000000; parar não desloca XZ dos pés,
  patas suspensas acomodam no chão e retomada passou 120/120 quadros.
- Mutante `apoio-no-ar`: 0/240 e retomada 0/120; detecta falso apoio suspenso.
- `eval:javaporcos` e `eval:javaporcosperf` passaram com seus mutantes.
- Matriz reforçada dos quatro modelos: cada um passou 240/240 em movimento,
  parada sem deslocamento XZ, acomodação no chão e 120/120 na retomada.
- Sondas com passo menor e maior também passaram. Ensaio atualizado com 64 rigs
  reais: mediana ~0,1 ms e p95 ~0,2 ms, tanto rígido como animado, na resolução
  do relógio do navegador. Mede CPU da apresentação, não FPS completo do mapa.
- Mutante final `patina`: 0/240 e retomada 0/120; `apoio-no-ar` também reprovou.
- Sintaxe ES modules, comentários, grafo de módulos, docs e arquitetura passaram.
- Comando npm novo: `BASE=http://localhost:4321 npm run eval:javaporcospassada`;
  inclui baseline e ambos os mutantes sob um único lock de navegador.
- Revisão independente das duas correções: sem novos achados; não é aprovação
  visual humana nem revisão completa do PR.
- AK: área preta foi reproduzida no canvas, inclusive sem banner. Ocultar o root
  do viewmodel elimina a área preta. Diagnóstico do passe VM pendente no pedido 5.

Artefatos duráveis fora do Git: `artifacts/javaporcos-codex-20261030/`, com fotos,
JSON e logs selecionados; `manifest.json` contém tamanho e SHA-256 por arquivo.
Os resultados técnicos não equivalem a aprovação visual humana. Checkpoint do
pedido 1 pode ser encontrado por `git log -1 -- public/js/javaporcos_passada.js`.
Próximo: iniciar gravações reais de porco (pedido 2); pedidos 3–7 seguem pendentes.

## Restrições e próximo passo

Não ler `.env`, não usar assets NC, não pular hooks, não fazer force push.
Não alterar números de game feel sem o dono. Uma captura de browser por vez,
com lock e BASE explícito. Manter budgets e preservar demais mapas em map_check.
Depois do push: reproduzir patinação e AK preta no navegador; começar a régua
da passada. O código atual só oscila o corpo inteiro em `atualizaVisual`.
Verificar pacotes Mint antes de gerar novamente; Sketchfab depende de token
fornecido por ambiente, sem expor ou registrar seu valor.
