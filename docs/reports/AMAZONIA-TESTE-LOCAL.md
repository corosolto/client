# Amazônia: teste local com o menu da main

Abra <http://127.0.0.1:8157/?map=amazonia&perfilauto=0&lang=pt-BR>.
Saia da abertura com Enter, escolha SINGLE PLAYER, confirme o setup/nick e clique
JOGAR. Escolha facção, personagem e adversário. A seleção foi exercitada no Chrome
até uma partida real, sem `auto=` nem desvio das telas de seleção.

## Origem do preview

Snapshot de `origin/main` em `695557906bcf6a8a3a80e8baf4c434d17d492944`
(alpha.223), com o builder da revisão local `a829b4b6` e suas dependências de mapa.
Está em `artifacts/amazonia-visual/main-preview/`, dentro da worktree autorizada.
Não é uma nova worktree Git; não houve merge, rebase, push ou alteração da original.
A branch `codex/amazonia-visual` continua baseada no PR439.

`index.astro`, `main.js`, `style.css` e `characters.js` coincidem byte a byte com
essa main. Foram acrescentados o registro/LOOK da Amazônia, builder, céu, thumbnail,
três props e nove animais. `ambientlife.js` vem do PR: sua diferença para a main
adiciona a fauna amazônica. Os demais módulos de runtime são da main. Dependências
npm usam o node_modules desta mesma worktree; versões do lock são iguais, salvo o
validador GLTF adicional da revisão. Packs ausentes são links locais para os packs
já restaurados nesta worktree, preservando os manifestos rastreados da main.

Manifesto e hashes: `artifacts/amazonia-visual/main-preview-manifest.json`.
Preparação: `artifacts/amazonia-visual/prepare-main-preview.py` (recusa sobrescrever
preview existente). Smoke: `artifacts/amazonia-visual/menu-smoke.mjs`.
Evidência: `menu-main.json`, `menu-main-factions.png`, `menu-main-characters.png` e
`menu-main-game.png`, nesse mesmo diretório de artefatos. Resultado: cinco facções
da main renderizadas; Time B → personagem → adversário → `state=live`,
`_mapId=amazonia`, mundo Amazônia presente, sem pageerror nem aviso de falha de boot.
Qualidade low, 1536×1024, APIs/serviços externos bloqueados no browser de teste.
Isso valida a navegação local, não multiplayer, desempenho ou aceite visual.

## Se o servidor parar

```sh
cd /Users/ruben/csbrasil/worktrees/amazonia-visual/artifacts/amazonia-visual/main-preview
ASTRO_DEV_BACKGROUND=0 /opt/homebrew/opt/node/bin/node node_modules/astro/bin/astro.mjs dev --host 127.0.0.1 --port 8157 --ignore-lock
```

Use a porta apenas se estiver livre; não encerre servidores de outras frentes.
O snapshot não recebe mudanças futuras da branch automaticamente. Recrie o preview
em uma rodada posterior e registre os novos hashes antes de comparar resultados.

## Correção da orientação anterior

A porta 8146 usa `tools/eval/serve.mjs`, um servidor para avaliação que não renderiza
o `FACTIONS.map` do Astro. O HTML da branch nessa porta conserva expressões de
template nos cards e não serve para validar seleção. As capturas anteriores usavam
`auto=B,sertanejo`: são evidência do mapa, não de navegação pelo menu.

A porta 8156 usa Astro sobre a branch do PR e renderiza seus dez cards; seu menu
é o da base do PR, não o da main. O mesmo fluxo até `state=live` também passou
nessa porta, sem pageerror (`menu-astro.json`). Quatro facções continuam marcadas
EM PRODUÇÃO conforme o catálogo dessa branch. Para o menu da main, use 8157.
