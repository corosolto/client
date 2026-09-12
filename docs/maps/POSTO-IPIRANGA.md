# A estação do Posto da Treta virou GLB

A marquise, as três ilhas de bomba e a loja de conveniência do Posto da Treta eram
caixas procedurais (`addBox`) desde que o mapa nasceu. Agora são um modelo só,
`posto_ipiranga.glb`, com cobertura de verdade, bombas com visor, loja, muro do lote
e totem — a marca desenhada na textura é "Ipirango", paródia, no mesmo idioma do
Loja H e do Zé Capivara.

## De onde veio e o que precisou de conserto

Arquivo de terceiro, baixado do **Fab** (não é asset gerado — a procedência e a
pendência de licença estão em `public/models/props/FONTE.md`). O export vinha com
dois defeitos que **não dão erro nenhum no console**:

| Defeito no arquivo cru | O que acontece no jogo |
| --- | --- |
| cor declarada em `texCoord: 0`, mas o unwrap bom está no UV1 | estação entra **cinza**, como se não tivesse textura |
| `alphaMode: BLEND` em quatro materiais opacos | estação entra **translúcida**, parecendo fantasma |

Os dois primeiros renders desta frente pegaram exatamente isso: um posto branco e
vazado no meio do mapa. A ingestão conserta na fonte, e ainda descarta o chão, a
calçada e a grama que o modelo trazia (brigavam em z com o asfalto do mapa e faziam
um degrau de 1,3 m na beirada) e pousa a cena em y=0, centrada na origem.

```
node tools/ingest-posto-ipiranga.mjs <glb-cru> /tmp/props_raw/posto_ipiranga.glb
node tools/optimize-props.mjs          # dedup + WebP 1024 + prune
npm run eval:posto
```

3,67 MB → **509 KB**, 4.273 triângulos, 3 draw calls, 33,3 × 7,74 × 38,8 m.

## Como ele entra no mapa

`placeProp('posto_ipiranga', { x: 2, targetH: 7.74 })`. O `targetH` é a altura REAL
medida do arquivo, então a escala sai 1,000 — é isso que "1:1" quer dizer aqui, e a
régua de metros do repo continua valendo. O deslocamento de +2 em x devolve as ilhas
ao corredor central de sempre (x = 4), onde a bandeira MARQUISE mora.

O GLB não traz colisor nenhum e colisor girado está proibido (BUG-21), então a
pegada é declarada à mão em `map_posto.js`, medida célula a célula na altura do
peito: loja, muro oeste, muro norte, três ilhas e o totem.

## O que a mudança quebrou (e a régua pegou)

Duas das três bandeiras de CTF ficaram **dentro** de colisor quando a estação nova
entrou, e nada reclamava — a rodada é que ficaria impossível:

- `PÁTIO SUL` estava em (-10, -12), que agora é o miolo da **loja**;
- `MARQUISE` estava em (4, 0), que agora é o **pilar central** da cobertura.

O trio novo — (12, -12), (0, 0), (-12, 12) — tem simetria de rotação de 180° em
torno do centro, que é o padrão de CTF quando o meio do mapa é assimétrico como esta
estação.

## A régua

`npm run eval:posto` (já no `check:fast`):

| | O que mede | Mutante que prova |
| --- | --- | --- |
| POSTO1 | altura do arquivo == `ALT` declarado (escala 1,000) e pousado em y=0 | `--mutante=escala-errada` |
| POSTO2 | UV único por primitiva e nenhum material translúcido | `--mutante=dois-uvs`, `--mutante=blend` |
| POSTO3 | toda célula sólida do modelo acima de 1 m tem colisor declarado | `--mutante=sem-colisor-loja` |
| POSTO4 | nenhum spawn, bandeira ou waypoint dentro de colisor | `--mutante=spawn-na-loja` |

POSTO3 ignora de propósito o que fica abaixo de 1 m: o meio-fio da ilha e a rampa de
serviço do posto têm 0,73 m, e o mapa **não** colide meio-fio ("não trava tiro", diz
a nota original do `map_posto.js`). Sem esse corte a régua cobraria parede onde o
mapa quer degrau.

Medido nesta branch: `eval:posto` 4/4, e `eval:spawn`, `eval:ctfround`, `eval:ctfwin`,
`eval:ctflabels`, `eval:botsim-golden` e `eval:movimento` seguem verdes com as
bandeiras novas.
