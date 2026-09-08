# Degrau #547 — anisotropia das fábricas locais

Base: `origin/codex/mapas-stack-545-v2` (`efda5185`). Escopo: somente
`applyAniso()` em `textures.js` e as fábricas `CanvasTexture` de Ferro Velho,
Piscina, Obras e Loja H. Não inclui a corroboração de áudio, documentos
gerados, nem qualquer autoria do #548.

## Régua e mutações

O baseline em #545 tinha `TEXEL4` vermelho em 106 superfícies horizontais:
Ferro Velho 79, Piscina 13, Obras 8 e Loja H 6 (anisotropia default 1, abaixo
do mínimo 4). A restauração deixa `TEXEL4=0` nos quatro mapas. O mutante
temporário `applyAniso(t) { return t; }`, aplicado e restaurado antes dos
gates, devolve exatamente 79/13/8/6 falhas `TEXEL4`; os quatro JSONs estão em
`artifacts/mapas-stack-547-v2/gates/mutante-sem-applyAniso-*.json`.

O probe isolado da função comum confirmou os três contratos: default `8`,
`?q=low` `4`, e `?texel=0` `1`. Assim, o kill-switch não foi burlado para
fechar a régua.

`TEXEL` completo não fica verde neste degrau: são dívidas anteriores e não
foram recalibradas. Ferro Velho preserva `TEXEL3b`; Piscina preserva
`TEXEL2/3/3b/5`; Obras preserva `TEXEL2`; Loja H preserva `TEXEL3/3b`.
O único antes/depois atribuído aqui é a coluna `TEXEL4`.

## Gates técnicos

Verdes: `mapcontrato` (Ferro 296 nós/1482 arestas; Piscina 74/300; Obras
314/1923; Loja H 634/5124), `spawn` (276 colocações), `ctfround`, `ctfwin`,
`shaderbudget`, `mapjson` e `preload`. `cena` foi repetido na porta 8147
porque 4321 era outro Astro; seu recibo atualizado fica em
`tools/eval/cena_probe.json` e mede Ferro/Loja, mas não é aprovação visual
nem substitui as capturas dos quatro mapas.

## Runtime local e matriz competitiva

Servidor: `node tools/eval/serve.mjs 8146`. URL exemplo:
`http://127.0.0.1:8146/?debug=1&auto=P,mst&map=ferro_velho&perfilauto=0&ctf=1`.
Use `map=piscina_treta`, `map=obras_prefeitura` ou `map=loja_h` para os demais.
As oito capturas Chrome/WebGL 1200×800 (3:2) e os recibos ficam fora do Git
em `artifacts/mapas-stack-547-v2/runtime/`.

| mapa | 5×5 / 8×8 | spawns | cápsula | rotas / collider / occluder | LOS E×B |
|---|---|---:|---|---|---|
| Ferro Velho | live, 9 / 15 bots | 4 / 4 | livre | 296 / 99 / 12 | 16/16 livres |
| Piscina | live, 9 / 15 bots | 4 / 4 | livre | 74 / 92 / 92 | 16/16 livres |
| Obras | live, 9 / 15 bots | 4 / 4 | livre | 314 / 55 / 67 | 16/16 livres |
| Loja H | live, 9 / 15 bots | 4 / 4 | livre | 634 / 193 / 36 | 16/16 livres |

LOS usa o `_losClear` real entre olhos dos 4 spawns E e 4 B; rota vem do
contrato de mapa. Não mede equilíbrio de combate. Não houve overlay. A única
`pageerror` foi `SUPPORT_URL_BR is not defined`; o servidor de avaliação
também respondeu 404 para áudio/API/decals que não estão nele, portanto esses
recursos não são atribuídos a este diff.

## Roteiro humano e limite

Em cada mapa, comparar 5×5 e 8×8 em movimento baixo/rasante: Ferro (pátio,
beco e galpão), Piscina (bordas da água, vestiário e trampolim), Obras
(canteiros sul/norte e obra central) e Loja H (pátios e interior). Testar
troca de time, passagem entre os quatro spawns e tiro/oclusão entre covers.
As capturas provam boot e estado de amostrador; revisão humana visual adversarial
continua obrigatória e não é substituída por esses gates.

O crítico adversarial independente não encontrou costura, shimmering ou regressão
inequívoca de anisotropia nos frames; ainda assim reprovou a suficiência da
evidência visual: os frames são únicos, no começo do round, com banner, arma e
bots cobrindo o espaço. Indicou piso/fachadas muito desfocados no Ferro Velho,
piso/divisórias de baixo contraste na Piscina, areia uniforme e placa/banner
dominantes em Obras, e Loja H enquadrada em uma parede plana. São observações
de composição e legibilidade, não defeitos atribuídos a este diff. Falta uma
rodada humana em movimento, com ângulos rasantes e distância progressiva.
