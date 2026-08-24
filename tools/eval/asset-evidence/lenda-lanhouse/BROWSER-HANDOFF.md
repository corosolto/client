# Lenda da Lan House — handoff exclusivo do agente de browser

Este pacote não é uma aprovação visual. A integração offline terminou; thumbnail e caminho
real continuam deliberadamente pendentes para um agente com contexto limpo e uso exclusivo
do browser.

## Artefatos canônicos que a captura deve provar

- personagem: `lenda-lanhouse`, SHA no `integration-receipt.json`;
- arma: `m4`, derivada de `CHAR_WEAPON` (nunca passada manualmente);
- viewport do jogo: `1536×1024` (3:2);
- mapa/posição determinísticos: `quebrada`, `x=0`, `z=0`;
- cinco estados: `close`, `medium`, `grip`, `walk`, `crouch`;
- thumbnail canônico: `public/img/chars/lenda-lanhouse.webp`, 360×463, revisado também
  numa cópia de evidência a **150 px de largura**. Não substituir o arquivo canônico pela
  cópia reduzida.

`close` e `medium` mostram a M4 em pose rifle-ready para julgar coronha, headset, torre,
cabos e folga de ombro/ADS em curta e média distância. Isso é evidência de terceira pessoa;
não alegar que prova o ADS literal do viewmodel de primeira pessoa.

## Execução, com um único browser

Com o jogo real já servido em `BASE`:

```bash
BASE=http://localhost:8123 node tools/capture-char-thumbnail.mjs lenda-lanhouse public/img/chars/lenda-lanhouse.webp
BASE=http://localhost:8123 node tools/capture-character-game.mjs lenda-lanhouse T tools/eval/asset-evidence/lenda-lanhouse/browser quebrada 0 0
```

Depois, sem recapturar:

```bash
node tools/eval/char-thumbnail-contract-check.mjs
node tools/eval/character-game-evidence-contract-check.mjs \
  --evidence=tools/eval/asset-evidence/lenda-lanhouse/browser \
  --char=lenda-lanhouse
```

O mutante causal de arma deve parar antes de criar screenshots. Rode em destino descartável:

```bash
BASE=http://localhost:8123 node tools/capture-character-game.mjs \
  lenda-lanhouse T /tmp/lenda-lanhouse-mutant quebrada 0 0 \
  --mutante=arma-aleatoria
```

## Revisão visual obrigatória

Olhar os cinco PNGs em 1536×1024 e a thumbnail a 150 px. Confirmar, sem usar o laudo do
builder como justificativa:

1. a M4 existe nos pixels e as duas mãos alcançam a arma em `close`, `medium` e `grip`;
2. headset, fichas, mouse de bolinha/cabo e cabo azul permanecem legíveis, sem flutuar;
3. a torre acompanha o tronco e não invade cabeça, câmera nem coronha;
4. `walk` não solta props e `crouch` mantém silhueta rifle-ready, mãos separadas e piso;
5. a thumbnail continua identificável a 150 px e não corta headset, torre ou pés.

Se for necessária prova literal do ADS de primeira pessoa, capture-a como evidência adicional
do viewmodel M4; ela não substitui nenhum dos cinco estados do personagem e pertence ao
sistema de viewmodel, não ao asset da Lenda.
