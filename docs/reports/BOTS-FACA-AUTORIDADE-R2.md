# Bots em rodada de faca e autoridade de combate — R2

Data: 10/09/2026  
Worktree: `worktrees/bot-knife-round-r2`  
Branch: `codex/bot-knife-round-r2`  
Base cliente: `origin/main@2115d5e2c29eefb4491ae63b0f1600c200a750bb` (`v2.0.0-alpha.246`)  
Backend auditado sem edição: `corosolto/backend origin/main@17ebd8fb28f15b34a9379f9e8210aeae4633b7b3`

## Objetivo e definição de pronto

Reproduzir o feedback sobre bots em rodada de faca e verificar seleção de arma, perseguição,
distância de ataque, troca indevida, objetivos CTF, virada de rodada, reconexão e contadores.
Pronto exige defeito causal medido, mutante que o devolva, correção mínima, ausência de
regressão em armas normais/CTF/netcode e instrução local reproduzível. Esta lane não altera
viewmodels, materiais, mapas, banco, deploy ou produção.

## Diagnóstico

A correção de 06/09 já funciona: em `praca_poderes`, seed 4242, 4×4 e 60 s, os bots fecham
distância, usam `knife`, não geram traçante/fogacho/som de tiro e conseguem abates. A matriz
8×8 também não encontrou bot parado em nenhum dos 16 mapas.

O defeito residual estava na distância. `WEAPONS.knife.range` declara **2,40 m**, mas os dois
gates do ataque do bot aceitavam `alcance + 0.6`. Antes da correção, a régua fortalecida ficou
vermelha com **13 golpes fora do máximo de 2,48 m** e pico de **2,98 m**. O jogador não recebe
essa margem em `_meleeHit`, portanto o bot tinha 25% mais alcance.

A troca manual indevida já está bloqueada por `_switchWeapon` + `_pickupAllowed`; o mutante
`troca` demonstra que BF1 detecta a regressão. BF5 agora prende também a virada: todos seguem
com faca, `roundKills` zera, `matchKills` recebe o round uma vez, abates individuais persistem
e nenhum rack/drop de arma aparece.

## Correção

`public/js/game.js` usa agora o alcance declarado sem margem tanto no gate que permite atacar
quanto em `_botMelee`. Não mudou velocidade, pathfinding, dano, cadência, hitbox, modo normal,
CTF ou código visual.

`tools/eval/botfaca-check.mjs` passou a cobrar:

- BF1: player e bots com faca, slots de arma proibida recusados;
- BF2: perseguição, contato, golpes e abates;
- BF3: golpe no máximo a 2,48 m (2,40 m + 8 cm de discretização), sem FX de tiro;
- BF4: histerese de fuzil preservada no modo normal;
- BF5: arma, inventário e contadores corretos após `_startRound`.

Mutantes negativos: `recuo`, `tracante`, `corredor`, `alcance` e `troca`.

## Evidência 8×8 em todos os mapas

Cada cenário rodou 45 s virtuais a 60 Hz, seed 4242, qualidade baixa, 8×8, modo `knife`.

| Mapa | Contato mínimo | Golpes | Abates | Golpe máximo | Arma errada |
|---|---:|---:|---:|---:|---:|
| amazonia | 1,22 m | 34 | 15 | 2,36 m | 0 |
| escadao | 1,24 m | 51 | 24 | 2,37 m | 0 |
| praca_poderes | 1,21 m | 25 | 12 | 2,37 m | 0 |
| piscina_treta | 1,20 m | 62 | 31 | 2,40 m | 0 |
| loja_h | 1,22 m | 28 | 12 | 2,36 m | 0 |
| ferro_velho | 1,20 m | 68 | 32 | 2,38 m | 0 |
| quebrada | 1,23 m | 31 | 13 | 2,36 m | 0 |
| corrego | 1,14 m | 36 | 15 | 2,39 m | 0 |
| lajes | 1,23 m | 28 | 12 | 2,36 m | 0 |
| posto_treta | 1,18 m | 53 | 26 | 2,37 m | 0 |
| upa_24h | 1,24 m | 39 | 18 | 2,38 m | 0 |
| obras_prefeitura | 1,21 m | 50 | 23 | 2,39 m | 0 |
| atacadao_treta | 1,22 m | 40 | 18 | 2,39 m | 0 |
| parque_treta | 1,19 m | 42 | 19 | 2,40 m | 0 |
| velho_oeste | 1,24 m | 34 | 15 | 2,38 m | 0 |
| penitenciaria | 1,21 m | 36 | 16 | 2,40 m | 0 |

Total: **657 golpes, 301 abates, 0 armas erradas, máximo 2,40 m**.

## Objetivos CTF

Uma sonda adicional rodou 8×8/90 s em modo faca. Bots chegaram aos anéis em todos os cinco
mapas representativos e produziram progresso/capturas reais:

| Mapa | Caps E/B máximos | Pontos com dono | Menor distância de ponto |
|---|---:|---:|---:|
| amazonia | 1/1 | 2 | 0,09 m |
| escadao | 3/1 | 4 | 0,24 m |
| piscina_treta | 2/2 | 3 | 0,28 m |
| ferro_velho | 2/4 | 4 | 0,05 m |
| penitenciaria | 1/2 | 3 | 0,25 m |

## Autoridade, reconexão e contadores

O multiplayer não oferece atualmente uma configuração `knife-only`: as salas autoritativas
expõem `rounds` ou `ctf` e usam arsenal normal. Portanto não foi criada uma semântica nova de
“rodada de faca” no servidor nesta lane.

No backend atual, o contrato de arma já é autoritativo em protocolo v4. `Room.applyInput`
aceita troca apenas dentro de `_inventory`; pickup exige rack/drop válido e distância; o
snapshot devolve arma, slots, pente, reserva, recarga e `ackSeq`. O mutante
`--mutante=confiar-arma` devolve a confiança no id enviado pelo cliente e é detectado.

Resultados pareando backend `17ebd8f` com cliente `2115d5e2`:

- `eval:authority`: 15/15; mutante de confiança detectado;
- `eval:mp-rounds`: 10/10;
- `eval:eventos`: 28/28;
- `game/smoke.mjs`: 86/86, incluindo slot abandonado devolvido à IA, morte/respawn do mesmo
  jogador, apelido preservado e snapshot ainda marcado como humano;
- `eval:netcode`: 178/178 no cliente, incluindo kills individuais vindos do snapshot,
  transições de round, troca de vaga e reconexão;
- `eval:netcodecbin`: 18/18.

Não houve alteração no backend.

No cliente, `npm run build` terminou com `[build] Complete!`, `check:deploy` passou **39/39**,
`eval:abateshud` e seus quatro mutantes ficaram corretos, `eval:ctfround`/`eval:ctfwin`
passaram nos 16 mapas e `eval:botsim-golden` preservou `velho_oeste`, `upa_24h` e
`piscina_treta`.

## Como testar localmente

```bash
cd /Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/bot-knife-round-r2
export PATH=/opt/homebrew/bin:/Users/ruben/.bun/bin:$PATH
npm ci
npm run dev -- --host 127.0.0.1 --port 4407
```

Abrir `http://127.0.0.1:4407/`, escolher **Single Player**, configurar **SÓ FACA** e 8×8.
Verificar: todos nascem com faca; 1/2 não equipa arma; bots perseguem até contato, golpeiam
sem traçante/fogacho, continuam lutando após respawn e mantêm o comportamento após a próxima
rodada. Repetir em **CAPTURE THE FLAG** e observar bots chegando/segurando os anéis.

O servidor dessa worktree foi iniciado e a raiz respondeu HTTP 200 (84.575 bytes). Para
encerrá-lo depois do playtest: `npx astro dev stop` dentro da worktree.

Gates reproduzíveis:

```bash
npm run eval:botfaca
for m in recuo tracante corredor alcance troca; do
  node tools/eval/botfaca-check.mjs --mutante="$m" && exit 1 || true
done
npm run eval:abateshud
npm run eval:ctfround
npm run eval:ctfwin
npm run eval:netcode
npm run eval:netcodecbin
npm run eval:botsim-golden
npm run build
npm run check:deploy
```

## Estado e próximo passo

Correção e gates locais prontos para PR draft. A validação automatizada prova distância,
combate, objetivos, contadores e autoridade; ainda falta o playtest humano no URL acima para
avaliar sensação de contato/cadência. Não houve merge, deploy ou mudança em produção.
