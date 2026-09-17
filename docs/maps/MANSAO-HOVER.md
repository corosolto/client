# Prévia em vídeo do Joá no hover

O card da Mansão do Joá na tela de mapas passa a tocar vídeo quando o ponteiro
(ou o foco de teclado) para em cima, como já acontecia no Lajes. O componente é o
mesmo — `public/js/map_preview.js` —, então todas as guardas dele valem de graça:
nada é baixado no boot, `prefers-reduced-motion` e `saveData` impedem a carga, aba
oculta pausa, e sair do card devolve o poster.

## O que mudou

| Arquivo | Papel |
| --- | --- |
| `public/video/map-previews/mansao.webm` | 12 s, 960×640, VP9, 1,59 MB — pixels do próprio jogo |
| `public/video/map-previews/mansao.capture.json` | recibo: câmera, qualidade, SHA-256 da mídia e das fontes servidas |
| `public/js/map_preview.js` | `VIDEO_MAPS` virou export e ganhou `mansao` |
| `public/js/main.js` | o card liga a prévia por `VIDEO_MAPS.has(id)` — antes era `id === 'lajes'` cravado |
| `tools/eval/mansao-preview-capture.mjs` | grava o vídeo do mapa servido |
| `tools/eval/map-preview-browser-check.mjs` | régua de browser, varre TODO id do allow-list |
| `tools/eval/map-preview-check.mjs` | ganhou MP12 (mídia real) e MP13 (card pelo allow-list) |

## Como o vídeo foi gravado

```
npm run dev -- --port 8191            # a branch servindo ela mesma
BASE=http://127.0.0.1:8191 npm run capture:mansaopreview
```

Sobe o jogo em `?map=mansao`, pausa a partida, esconde bots e viewmodel, força
960×640 e roda um arco fechado de 12 s em volta da propriedade (câmera `[26,18,40]`
mirando `[0,0,-6]`, FOV 57, ±0,16 rad). O `captureStream` sai do canvas WebGL, então
o HUD não entra no quadro. `g.world.update()` é chamado quadro a quadro de propósito:
é lá que a água do Joá anda — sem isso a onda congela no vídeo.

Não há geração 2D, composição externa nem áudio. O recibo grava o SHA-256 do
`map_mansao.js` servido: se o mapa mudar depois da captura, dá para provar que o
vídeo está velho em vez de discutir de memória.

## As réguas e os mutantes

`npm run eval:mappreview` (já roda no `check:fast`) — 13 contratos. Os dois novos:

- **MP12** — todo id de `VIDEO_MAPS` tem `.webm` real (assinatura EBML, > 200 KB) e
  poster de repouso. Mutante `--mutante=video-ausente` põe `upa_24h` no allow-list e
  a régua reprova: *"upa_24h está no allow-list de vídeo mas não tem …/upa_24h.webm"*.
- **MP13** — `main.js` liga o card pelo allow-list. Mutante `--mutante=card-fixo`
  devolve o `id === 'lajes'` cravado e a régua reprova: *"card de mapa preso a um id
  fixo: mapa novo no allow-list entraria sem hover"*. Esse era o buraco real: dava
  para pôr o mapa no allow-list, ter o vídeo no disco e o card continuar estático.

`BASE=http://127.0.0.1:8191 npm run eval:mappreview:browser` — o que o jsdom não
alcança: o webm **decodifica** no Chrome e o card monta a prévia. Varre o allow-list
inteiro, então mapa novo entra sozinho. Medida desta branch:

```
PASS lajes  {"pedidoSoNoHover":true,"tocou":true,"parouAoSair":true,"quadro":"960x640","mudo":true}
PASS mansao {"pedidoSoNoHover":true,"tocou":true,"parouAoSair":true,"quadro":"960x640","mudo":true}
```

Mutantes `--mutante=sem-allowlist` e `--mutante=video-quebrado` derrubam os dois
mapas (exit 1). O mutante **não** inverte a expectativa: a régua sempre exige prévia
viva, então rodar com mutante ter que ficar vermelho é justamente a prova.

## Para o próximo mapa

1. `BASE=… node tools/eval/<mapa>-preview-capture.mjs` (copiar o do Joá e trocar a câmera).
2. Acrescentar o id em `VIDEO_MAPS`, em `public/js/map_preview.js`.
3. `npm run eval:mappreview && BASE=… npm run eval:mappreview:browser`.

Não precisa tocar em `main.js` nem nas réguas — as duas varrem o allow-list.

## Pendência conhecida

O poster de repouso (`public/img/map-previews/mansao.jpg`) é o da entrega do mapa:
enquadramento frontal da portaria, céu azul de meio-dia. O vídeo mostra o fim de
tarde que o LOOK do Joá renderiza hoje, de cima. Funciona, mas o hover troca de
horário junto com o movimento. Para casar os dois basta regravar o poster na mesma
sessão da captura:

```
BASE=http://127.0.0.1:8191 POSTER=1 npm run capture:mansaopreview
```

Ficou de fora de propósito: mudar o poster muda a arte do card em todas as telas, e
essa é decisão do dono do mapa, não da régua.
