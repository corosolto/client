# Mapas parados para retrabalho

Pedido do dono, 25/09/2026: sete mapas saem do jogo para serem refeitos no visual e na
jogabilidade, e **voltam** depois. Este documento é o contrato dessa parada.

## Quais

`mansao` (Mansão do Joá) · `parque_treta` (Parque da Treta) · `campomorro` (Campinho do
Morro) · `obras_prefeitura` (Obras da Prefeitura) · `upa_24h` (UPA 24h da Treta) ·
`atacadao_treta` (Atacadão da Treta) · `penitenciaria` (CARANDIRU).

A lista vive em **um lugar só**: `MAPAS_PARADOS`, em `public/js/maps.js`.

## A regra, em uma frase

O mapa parado continua no **registro** (e portanto continua medido) e sai da **lista
jogável** (menu, rotação, catálogo do site, grade do multiplayer). Ele só volta a abrir
com `?oficina=1`.

## Por que não apagar do registro

Porque apagar do registro apagaria junto a medição. Cerca de 50 réguas descobrem mapa por
`Object.keys(MAPS)` (via `tools/eval/harness.mjs`): `eval:mapcontrato`, `eval:grafite`,
CTF1/CTF2, MAP1/MAP2B/MAP5, `pickup`, `mantle`, `obb`, `spawn-settle`, `look`, os pacotes
de áudio. Tirar do registro é ficar sem instrumento exatamente nos mapas que vão ser
refeitos — e é pela régua que se sabe quando um deles está pronto para voltar.

Então a parada é de **exposição**, não de existência:

| | registro `MAPS` | `MAP_IDS_JOGAVEIS` | menu | catálogo do site | réguas |
|---|---|---|---|---|---|
| mapa no ar | sim | sim | sim | sim | sim |
| mapa parado | **sim** | não | só na oficina | não | **sim** |

## A oficina (`?oficina=1`)

A versão alternativa do jogo para refazer mapa por mapa:

```
http://localhost:4321/?oficina=1                    # menu com os parados de volta
http://localhost:4321/?oficina=1&map=upa_24h        # abre direto num deles
http://localhost:4321/?oficina=1&tela=maps&map=upa_24h   # cai na tela de mapas
```

Na oficina o cartão do mapa parado ganha o crachá **EM OBRAS**, em âmbar, ao lado de
OFICIAL/COMUNIDADE.

A oficina entra no `testMode`. Isso é deliberado: retrabalhar mapa é sessão de teste, e
sem essa trava cada volta de conserto viraria partida no ranking, linha de telemetria e
contagem em `/api/map-plays` — o mapa parado subiria nas estatísticas justamente enquanto
está fora do jogo.

## Fora da oficina, mapa parado não abre — e não abre calado

`?map=upa_24h` sem `?oficina=1` cai no `DEFAULT_MAP` **com aviso no console**. O mesmo
vale para o pin salvo por quem fixou o mapa antes da parada. Fallback silencioso é a
assinatura do defeito mais caro deste repositório (ver o cabeçalho de `ALIAS_MAPA` em
`maps.js`); trocar o mapa do jogador sem dizer nada seria repeti-lo.

Os aliases antigos (`fy_mansao`, `fy_campomorro`) continuam resolvendo. Eles não somem
porque há partida gravada no banco com esses ids.

## Como um mapa volta

1. Tire o id de `MAPAS_PARADOS` em `public/js/maps.js`. **Não há segundo lugar.**
2. Devolva a entrada ao catálogo do site (`src/data/jogo.ts` e a gêmea EN) se ele estiver
   lá — as contagens de `/mapas`, `/maps`, `sobre`, `about` e `og-card` derivam dela.
3. `npm run docs && npm run arch`.
4. `npm run eval:mapasparados` e `npm run eval:maprotate`.

## Réguas que guardam este contrato

- **`eval:mapasparados`** (`tools/eval/mapas-parados-check.mjs`) — MP1 o parado continua
  no registro; MP2 não está na lista jogável; MP3 o menu não itera `MAP_IDS` cru; MP4 a
  oficina devolve todos; MP5 a oficina é `testMode`; MP6 o catálogo do site não o anuncia;
  MP7 o mapa ainda constrói. Mutantes: `some-do-registro`, `vaza-no-menu`, `menu-cru`,
  `oficina-cega`, `sem-testmode`.
- **`eval:maprotate`** — ROT3 a fila percorre os jogáveis; ROT7 o parado não chega ao
  jogador por nenhuma das três portas (fila, `?map=`, pin salvo); ROT8 a oficina o abre.
  Mutante novo: `serve-parado`.
- **`eval:redesign`** UIR4 — o menu itera `MAPAS_MENU`, não `MAP_IDS`.
