# playtester (persona: Mandrake 🎮)

O que só uma partida de verdade pega: por mapa ativo, roda uma partida curta
com bots **no arnês da casa** (`eval:serve` na 8123 + Chrome headless com WebGL
por SwiftShader — o mesmo padrão do `graffiti-census`; nenhum arnês paralelo) e
mede as três classes que régua estática não alcança.

**Dirigibilidade provada, não suposta** (16/08): a navegação é a do smoke
(`?map=<id>&debug=1&nav=1` → perfil → jogar → time → personagem → inimigo),
a partida chega a `window.__game.state === 'live'` em headless e as métricas
saem de `__game` (combatants/pickups/groundHeightAt/_mapId) com
`page.evaluate`.

## O que mede cada partida (`duracao_s` no config, 90s)

| métrica | como | classe |
|---|---|---|
| pickup não alcançado | nenhum combatente vivo chegou a `pickup_raio_m` de um pickup não-tomado em toda a partida | PRs #256/#257 |
| spawn em geometria | `player.pos.y` abaixo do `groundHeightAt(x,z)` além da tolerância no primeiro sample | o que eu sinto na espinha |
| FPS médio e p95 | medidos DENTRO da página (rAF) | regressão relativa |

**FPS em SwiftShader não tem GPU**: o número absoluto não vale nada; o que
vale é a regressão percentual contra a baseline — sempre no mesmo ambiente.

## Baseline e reclamação

- Primeira rodada de cada mapa = baseline (`estado/baseline.json`), **zero
  reclamação**.
- Rodada seguinte: só PIORA é regressão (melhora não é); limiar de fps no
  config (`fps_regressao_pct`, 25%).
- Regressão → issue com mapa, tabela baseline/agora e o log da rodada em
  `estado/relatorios/` (amostra de posição por combatente — o replay barato).
- Relatório de toda rodada salvo, com ou sem regressão.

## Uso

```sh
cd bots/playtester
bun rodada.mjs rodada            # todos os mapas do config
bun rodada.mjs rodada quebrada   # um mapa
bun rodada.mjs selftest
GH_DRY_RUN=1 bun rodada.mjs rodada   # issue salva, não enviada
```

Credencial: `GH_PAT_FALA` (advisory — reclama, não bloqueia).

## Cron sugerido

Noturno, depois do caca-bug (uma rodada de 5 mapas ≈ 5 × partida + navegação;
browser único por vez, na regra da casa).

## Limites declarados

- Playwright global + Chrome (canal `chrome`) — mesmo requisito do census.
- Se o mapa não sobe (timeout), a rodada registra e segue: partida que não
  começa é defeito de outra régua, não calúnia desta.
- Bots do jogo jogam sozinhos; o "jogador" é o nick do bot parado no spawn —
  a cobertura de pickup é dos combatantes, jogador incluso quando vivo.
