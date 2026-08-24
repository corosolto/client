# HANDOFF — sessão Devin de 17/08 (merge da main + ambiência + tiro)

Repo: `/Users/ruben/game`, branch `feat/times-e-mapas-completo` (**local, nada foi pushed**).
Leia nesta ordem: `AGENTS.md` → `KNOWN-BUGS.md` (BUG-55..59) → issue corosolto/ROADMAP#26 →
este arquivo. Um único browser por vez; servidor de eval em `node tools/eval/serve.mjs 8124`
(pode já estar no ar). **Não afrouxe teto para fechar placar. Régua antes do conserto.**

## O que esta sessão ENTREGOU (commitado, não refaça)

1. **Checkpoint do WIP da R27** em 3 commits (lajes/grafites/infra) + wave 3 do BUG-54:
   `eval:occluders` **0/0/0 nos 10 mapas** (mansão 158→0, campomorro 64→0 — o TERRENO do
   morro agora para bala). VM14 verde (2 armas do canal do córrego → cabeceiras das pontes).
2. **Grafites fechados**: lajes voltou a grafitar (a chamada morreu na troca para
   `map_lajes_authored.js`), or-hom-* (pessoa real) fora do pool, 5 or-* legítimos restaurados,
   layout reassado com `GRAFITE_FP`.
3. **Merge da main**: alpha.83 → **alpha.147** (189 commits, 65 conflitos). Registro com
   **17 mapas** (nossos 5 + posto/upa/obras/atacadão/parque/velho_oeste/penitenciária).
   Uniões deliberadas — ver corpo do commit `0040c73`. `check:fast` pós-merge **73/82**.
4. **Ambiência nos 17 mapas** (BUG-57 parte 1): régua nova `eval:ambience-registry`
   (AR1 todo mapa tem ambience · AR2 população por bioma, UPA interna = só rato ·
   AR3 fauna fora de sólido; mutantes `sem-ambience|fauna-em-solido`) + fauna autoral
   por bioma nos 14 que faltavam. Está no `check:fast` após `eval:mapcontrato`.
5. **Todo tiro traçado** (pedido do dono): jogador saiu do 1-em-3; AM8b nova em
   `ambience-check` (3 `_tryShoot` = 3 rastros; mutante `tracer-um-em-tres` MORDIDO).

## Em ANDAMENTO — commite primeiro (working tree tem isso pronto e verde)

**PUNCH do tiro** (dono: "feel fraco, sem punch"; escolheu feedback, não fire-rate):
- `game.js`: const `PUNCH`/`PUNCH_ZOOM`/`PUNCH_DECAY` (~l.343); `_punchF` acumula em
  `_tryShoot`; pulso de `camera.zoom` (~1,4%, decai 13/s) no bloco do FOV (~l.4999) —
  canal próprio, NÃO briga com a rampa ADS nem com o recuo medido; flash/luz de boca
  ×1,3/×1,35 em `_flash`. Kill-switch `?punch=0`.
- `audio.js`: duck(0.3, 0.09) no caminho synth do tiro próprio (sample já fazia).
- `tools/eval/vm-kick-sim.mjs`: `loadRates` lê `public/js/data/weapons.js` (a main moveu
  a tabela WEAPONS pra lá — o instrumento cegou no merge). `eval:kick` verde, 26 armas,
  0 reprovações. **Medido**: tiro → `camera.zoom = 1.0063` no frame (probe browser).
- Evidência: `tools/eval/asset-evidence/punch-flash-frame.png` (flash de 50 ms não sai
  em screenshot async — a prova do pulso é numérica; o feel é o DONO que valida em jogo).

Sugestão de mensagem: `feat(tiro): punch por disparo — pulso de zoom, flash maior e duck
do mix (?punch=0)` + trailer `Commit-grande:` se o hook reclamar.

## PRÓXIMOS PASSOS (ordem)

1. Commitar o punch (acima) e rodar `npm run check:fast` — esperado 73/82 + ambience-registry
   verde; os 9 vermelhos conhecidos: shaderbudget SB7, mapid, redesign (BUG-59), arch/feet se
   não regenerar, camera-grip, char-thumbnail, asset-integrity, devport (ambiente).
2. **O dono precisa JOGAR** e validar: punch (`?punch=0` para A/B), traçantes, fauna nos
   mapas novos. Nada disso fecha por placar.
3. **BUG-55** (escala de barracos, lajes+córrego): escrever a régua ANTES (altura de
   porta/pé-direito vs jogador 1,70 m — `references/favela/lajes-rio/FONTE.md`).
4. **BUG-57 parte 2**: horizonte (`makeHorizon`) + vida de céu por bioma nos 17; e
   jacaré+capivara no Mint para o córrego (pipeline `csbrasil`/`faction-pipeline`).
5. **BUG-58**: simplificar o lajes (menos ramais, menor) — o teto de 241 ilhados em
   `map-contrato-check.mjs` DESCE junto.
6. **BUG-59 / branch de místicos**: mídia do redesign (avatar/webm/vitória-derrota) para
   os 18 personagens novos + remodelar models errados (UIA1/UIA4/UIR1 do eval:redesign).
7. Fatiar a branch por conteúdo (ROADMAP#18) e o bump **2.1.0** quando o conjunto fechar.

## Armadilhas desta árvore (aprendidas hoje)

- `eval:vm` ANTES de `invariants.mjs` (BUG-02). `check:fast` usa runner (não corta no 1º erro).
- A main moveu WEAPONS para `public/js/data/weapons.js` e `update(dt)` virou
  `update(dt, render)` — instrumento que greppa assinatura antiga cega CALADO (2 casos hoje).
- `plans/` é diretório VIVO aqui (specs do lajes/ambiência); a main tinha movido para
  `docs/historico/` e o spec:check quebrou — já restaurado.
- KNOWN-BUGS tem numeração em colisão com a main: entradas dela levam sufixo `(main)`.
- Layout de grafite: regenerar com `npm run grafite <mapa>` após mexer em geometria;
  `GRAFITE_FP` é cobrado pelo `eval:grafitelayout`.
- Commits grandes: o hook pede `--trailer "Commit-grande: <motivo>"`.
