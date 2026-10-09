# Integração visual da Piscina — 09/10/2026

## Objetivo e definição de pronto

Consolidar sobre a `main` publicada as três frentes visuais aprovadas pelo dono:
água da Piscina (`#790`), props Mint (`#791`) e acabamento sem z-fighting
(`#800`). A frente fica pronta quando o topo contém os três heads exatos, preserva
o pôster já presente na `main`, passa a régua PZT normal e sua contraprova, fecha o
pre-push local e pode ser combinado com o topo do elenco político sem perder
conteúdo.

## Estado recuperável

- Worktree: `client/worktrees/visual-stack-20261009`
- Branch: `codex/visual-stack-20261009`
- Base: `f3576db59884e4b6b702a09fd45ef625f9a8ca93` (`v2.1.0-alpha.61`)
- Integração de `#790` + `#791`: `654a6fe48`
- Integração de `#800`: `f5eb1b41a`
- Push/merge remoto: não realizado nesta frente

## Proveniência e contenção

| PR | Head exato | Relação no topo |
|---|---|---|
| `#790` | `6fe0a9f1cc04968d847da99efbbeddb256050cdd` | ancestral por `#791` |
| `#791` | `b3428d2ab7d277d78edaefb28356ddbc0c8b8450` | ancestral direto do topo |
| `#800` | `4ec6563f0def6c2884a2d7c96d41db024201e2a8` | ancestral direto do topo |

`origin/main` também é ancestral do topo. Portanto, o pôster integrado antes desta
frente permanece na árvore; a integração não reaplica nem remove arquivos dele.

## Resolução de conflitos

Os conflitos ao trazer `#791` e `#800` ficaram em `AGENTS.md`, `README.md` e nas
páginas geradas em `docs/`. A resolução manteve a versão da `main` nesses arquivos.
O runtime e os assets foram combinados: `map_piscina.js`, `maps.js`, quatro GLBs,
`mint-assets.json`, procedência, otimizador, relatório e gate PZT.

A primeira execução do pre-push reprovou somente `DOCS1`, porque o novo script
`eval:piscina-trim` alterou as contagens geradas. `npm run docs` e
`node tools/gen-arch.mjs` foram executados; o delta gerado foi revisado antes de
entrar no checkpoint.

## Evidência e validação

- `git diff --check origin/main...HEAD`: verde.
- PZT normal: `PZT1`, `PZT2` e `PZT3` verdes.
- Mutante `--mutante=coplanar`: `PZT1` vermelho, saída `1`; `PZT2` e `PZT3`
  continuam verdes.
- Medidas: batente/vão `0,04 m`; travessão/vão `0,04 m`; moldura/parede
  `0,10 m`; faixa/parede `0,03 m`; faixa/decalque `0,05 m`.
- Evidência visual preservada em
  `docs/reports/evidence/piscina-trim-2026-10-09/`.
- Pre-push completo com Node 23: verde em `2.026 s`; `check:deploy` incluiu o
  PZT. O gate `eval:docsautoria` respondeu por `1.813,9 s` porque cada contraprova
  varreu cerca de 533 MB em `tools/` no volume externo.
- Simulação `git merge-tree --write-tree` contra o topo do elenco `bd1b3040f`:
  runtime e GLBs sem conflito. Conflitos limitados a 10 páginas geradas,
  `mint-assets.json` e `package.json`. As chaves de assets têm sobreposição zero;
  o package precisa unir os gates do elenco com `eval:piscina-trim` e então rodar
  `npm run docs`.
- Smoke real no navegador não foi iniciado: já existia uma instância headless de
  Chrome ativa na máquina e a regra do repositório permite um único agente no
  browser. A aprovação visual do dono e as capturas do `#800` permanecem a
  evidência humana; o candidato combinado deve executar o smoke uma vez.

## Próximo passo

Mesclar este topo no candidato do elenco, resolver os dois manifests de forma
aditiva, regenerar a documentação e executar uma única rodada de CI e smoke no
candidato combinado.
