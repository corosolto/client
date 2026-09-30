# 0001. O cliente do jogo não tem build

Status: aceita (v1; reafirmada na v2)

## Contexto

O jogo nasceu para abrir num link de WhatsApp e estar jogando em
segundos. O custo de aquisição é a métrica: a alternativa medida na
época (cliente de engine externa, relatório de paridade de 07/2026)
pesava **39,5 MB de wasm** com boot de **1,3 s a 12,7 s**, contra
**~1,5 MB** e abertura instantânea do cliente atual.

## Decisão

`public/` é o jogo: ES modules servidos crus, Three.js vendorizado em
`public/vendor/`, importmap declarado em `src/pages/index.astro`.
Nenhum passo de build e nenhuma dependência de runtime no cliente.

## Consequências

- Não existe tree-shaking: código não importado pesa no download. O
  `knip.json` mantém o grafo sob régua (entradas: `public/js/main.js`
  mais os módulos carregados por HTML, importmap e páginas Astro).
- O arnês (`tools/eval/harness.mjs`) sobe a classe `Game` real em node
  puro, sem browser e sem bundler no meio. Um bundler quebraria o gate.
- Mudar isto (bundler, engine, SSR do jogo) exige ADR nova que trate o
  custo de aquisição com número medido, não com preferência.
