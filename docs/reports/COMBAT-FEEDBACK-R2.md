# Feedback de combate R2: headshot estável e sequência de abates

## Objetivo e definição de pronto

Revalidar o efeito de câmera relatado no headshot e entregar um contador de sequência
legível, próprio do CSBrasil. O contador precisa nascer apenas de abate confirmado, funcionar
em single-player e multiplayer, e zerar em morte, troca de round e reconexão. O total de
abates da partida permanece separado.

Worktree: `worktrees/combat-feedback-r2`
Branch: `codex/combat-feedback-r2`
Base: `origin/main@2115d5e2c29eefb4491ae63b0f1600c200a750bb`

## Diagnóstico antes da mudança

O PR #536 já havia removido a replay orbital e o hit-stop. Em `origin/main`, a régua
`eval:replaycam` ficou verde: posição, rotação e FOV da câmera variaram zero após o headshot,
e o relógio avançou 2,000 s em 2,000 s reais. Os mutantes `orbita`, `hitstop`, `esconde` e
`sem-kill` ficaram vermelhos.

A lacuna real era outra: o HUD tinha apenas `#kill-count`, o total pessoal da partida. A
primeira execução de `killstreak-check.mjs` falhou por ausência de `#kill-streak`, algarismo,
rótulo, regra visual e vínculo de estado. O motor calculava `mk.life`, mas esse dado não era
mostrado e a mesma receita era duplicada entre `game.js` e `netgame.js`.

## Implementação

- `#kill-streak` fica no centro inferior, com três marcas inclinadas, cor lima e recorte do
  HUD do jogo. A referência de Valorant fica restrita à função de dar retorno central e
  imediato; não há asset, nome, forma ou layout copiado.
- `ABATES` continua mostrando `player.kills`, o total da partida. `SEQUÊNCIA` mostra
  `mk.life`, os abates desde a última morte dentro do round atual.
- `_playerKillFeedback` concentra progressão, tier, áudio e atualização visual. O SP chama
  depois de um `_kill` real. O MP chama quando o evento autoritativo identifica o jogador
  local como autor; o acerto previsto não altera a sequência.
- `_resetKillSequence` é usado pela morte local/remota e pelas transições de round. O
  primeiro snapshot após entrar/reconectar assenta o total autoritativo sem inventar uma
  sequência histórica.

## Gates causais

`npm run eval:killstreak` mede:

- KS1: DOM dentro do HUD, rótulo e anúncio acessível;
- KS2: número de pelo menos 24 px e âncora própria;
- KS3: dois abates do jogador em SP viram sequência 2; abate de aliado não conta;
- KS4: morte e round zeram e ocultam;
- KS5: previsão e snapshot inicial/reconexão não contam;
- KS6: evento autoritativo MP conta uma vez e a morte/round do servidor zeram.

Os mutantes `total`, `previsto`, `sem-round`, `sem-morte`, `sem-mp` e `reconnect` devem
reprovar. `eval:replaycam` agora passa pelo caminho real de `_damage` e também exige que o
feedback visual/sonoro continue existindo.

## Validação e evidência visual

- `npm run eval:killstreak`: verde em SP/MP; os seis mutantes (`total`, `previsto`,
  `sem-round`, `sem-morte`, `sem-mp`, `reconnect`) reprovaram.
- `npm run eval:replaycam`: câmera Δ0,000 m, rotação Δ0,000 rad, FOV Δ0,000° e relógio
  2,000 s em 2,000 s reais; os quatro mutantes (`orbita`, `hitstop`, `esconde`,
  `sem-kill`) reprovaram.
- `npm run eval:abateshud`, `npm run eval:netcode` (178 cláusulas),
  `npm run eval:netcodecbin` (18 cláusulas) e `npm run eval:mutcega`: verdes.
- `npm run check:deploy`: 40/40 gates verdes. `npm run build`: verde.
- Chrome real, WebGL2, sem `pageerror`, em jogo servido com sequência 3 visível:
  `artifacts/combat-feedback-r2/kill-streak-3x2.png` (1536×1024) e
  `artifacts/combat-feedback-r2/kill-streak-16x9.png` (1600×900). O recibo fica em
  `artifacts/combat-feedback-r2/capture.json`. As capturas mostram `ABATES 3` separado de
  `3 SEQUÊNCIA` e foram inspecionadas visualmente.

As chamadas externas de telemetria (`pick`, `map-plays`, `online`) falharam no navegador
local; não houve erro de página e isso não alterou o fluxo SP nem a captura. Nenhum merge,
deploy, mapa, viewmodel, asset ou banco faz parte desta lane.

## Teste local

```bash
cd /Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/combat-feedback-r2
export PATH=/opt/homebrew/bin:$PATH
npm ci
npm run dev -- --host 127.0.0.1 --port 4408
```

Abra `http://127.0.0.1:4408/?debug=1&auto=P,mst&map=praca_poderes&perfilauto=0`.
O servidor desta validação foi deixado ativo nessa URL. Faça dois ou mais abates na mesma
vida para ver `SEQUÊNCIA`; morrer ou iniciar outro round deve esconder e zerar o painel.
