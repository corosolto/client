# Qualidade multiplayer — 29/09/2026

## Objetivo e critério de conclusão

Investigar o alerta do game admin de 29/09 (99/114 sessões medidas e 172/209 rounds
fora da meta nos últimos sete dias) e reduzir atraso percebido e amostras inválidas.
Conclusão exige código validado, cliente e nós com a mesma versão de simulação,
canário em cada região e round real com dois humanos autenticados. Os números de
produção precisam ser medidos novamente após o rollout; portões locais não os substituem.

## Diagnóstico reproduzido

- `game/index.js` aceitava 256 KiB pendentes por WebSocket antes de descartar um
  snapshot. Em BR, `/metrics` registrava 224.876 frames binários e 65.616.884 bytes
  desde o boot (~292 bytes/frame). O limite antigo podia guardar centenas de posições
  antigas num cliente congestionado. O teste `game/protocol-check.mjs` falhou antes da
  mudança com 1 byte pendente.
- `public/js/netgame.js` enviava amostras de FPS, RTT, intervalo de snapshots e
  correção a cada 10 s também com aba oculta ou jogo pausado. O teste
  `tools/eval/netcode-check.mjs` falhou antes da mudança para esses dois casos.
- A telemetria das sessões não distingue pausa/visibilidade anteriores ao conserto.
  Por isso não é possível atribuir todo o alerta ao cliente ou prometer queda de
  87% com os dados atuais. RTT entre regiões continua limitado pela distância.
- Em 29/09, o site anunciava `v2.1.0-alpha.13`, enquanto `/health` dos nós BR,
  EU e US indicava servidor `b692b682` e cliente `37824be5` sem `clientVersion`.
  O backend atual já implementa o contrato de versão; a imagem em produção ainda
  precisa de rollout coordenado.

## Implementado e validado nesta lane

- Cliente: ignora amostras de qualidade com jogo pausado ou aba oculta; reinicia
  a janela de FPS/correção e espera 10 s de jogo visível antes de reportar.
- Backend, em worktree separada `csbrasil-backend/worktrees/mp-quality-20260929`:
  snapshots substituíveis só entram num socket sem bytes pendentes; eventos
  autoritativos continuam no canal confiável. A régua de dispersão passou a
  comparar o impacto com o raio real do tiro.
- Réguas: cliente 187/187; servidor `game/smoke.mjs` 118/118, incluindo 29,3 Hz
  em conexão local saudável; mutantes de limiar antigo e sem backpressure foram
  detectados. `npm run check:deploy` passou 46/46 após regenerar os seis blocos
  de contagem de linhas com `npm run docs`. A primeira tentativa havia sido
  interrompida por dependências parciais neste worktree; a segunda apontou os
  blocos gerados, e a terceira passou. Os testes rodaram com Node 23 local.

## Estado e próximo passo

- Cliente: branch `codex/mp-quality-20260929`, base `0860b5c295d741b3ad8c6fdd3135f742fe7fe5ca`.
- Backend: branch `codex/mp-quality-20260929`, base `dbcc333ff3f76767bc1794f66057dd1529865fc9`.
- Código do cliente: `6a79d90d5977197aca9361b899fd578323d8caa8`, em
  [cliente #714](https://github.com/corosolto/client/pull/714) (draft). Código
  do backend: `9261a59abb9fcaaa2c5c4568103142aee430ac15`, em
  [backend #45](https://github.com/corosolto/backend/pull/45) (draft). O backend
  fixa o commit do cliente no `Dockerfile`.
- O push normal do cliente foi bloqueado pelo hook que executou `check:deploy`
  com Node 16 do PATH local; a execução anterior com Node 23 passou 46/46.
  O mesmo commit foi publicado com `PREPUSH=0`, conforme a opção do hook.
- Próximo passo: revisar os PRs e construir/validar a imagem do nó. Depois do
  merge coordenado, canário US → EU → BR somente
  com nó vazio, confirmar `/health`, versão, snapshots e uma partida real por
  região; medir novamente os percentis e sessões fora da meta no admin.
