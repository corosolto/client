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
- Pre-push completo após regeneração: pendente neste checkpoint intermediário.
- Smoke real no navegador: pendente; será tentado após o pre-push, sem substituir
  a aprovação visual já dada pelo dono.

## Próximo passo

Repetir o pre-push com Node 23, simular a combinação com o topo atual de `#773` e,
se não houver conflito material, entregar o SHA final desta branch para a integração
única e o CI remoto.
