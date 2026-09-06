# Escadão atualizado sobre a main — 06/09/2026

O menu quebrado vinha do servidor parcial `tools/eval/serve.mjs` na porta 8148.
Além disso, a branch visual estava 317 commits atrás da main. A versão jogável
agora usa Astro real e a main `69555790` (alpha.223), na branch
`codex/escadao-main`, dentro da mesma worktree `escadao-visual`.

A branch anterior permanece recuperável em `codex/escadao-visual` / `072e6d71`.
Não foi feita uma mesclagem das 243 mudanças locais antigas: o porte trouxe
somente Escadão, sete props Mint, preview, registros e seus testes. `game.js`,
`main.js`, `index.astro`, `ambientlife.js` e `mapprops.js` permanecem como na main.
Checkpoints: assets `6a02dd1c`; integração e testes `6ea53653`.

## Reprodução e correções

- HTML anterior: uma ocorrência literal de `FACTIONS.map` e uma de
  `String(index + 1)`. Astro real: zero. A régua `escadao-menu-check.mjs --html=...`
  reprova o HTML anterior. A imagem do usuário corresponde a essa falha.
- Fluxo real validado sem `auto`: mapa, nick em perfil isolado, facção, personagem,
  adversário, partida e movimento com W. Cinco cartões completos, 18 props
  carregados, zero erro JavaScript e zero asset visual com HTTP de erro.
- Crítico independente achou cinco nós isolados no fundo da rua; a Deagle em
  (-10,38) era inalcançável para os bots. Conexão pelo vão x=-8,5 corrigiu o grafo
  sem mover arma ou geometria: 370/370 nós e oito rotas de spawn até a arma.
  Mutação remove a conexão e volta a isolar a Deagle. O crítico também conferiu
  as novas arestas finais com `_walkReach` real.
- Registrado Escadão no fingerprint de grafite. O gerador agora usa esse registro
  e lê apenas a declaração de layout, preservando os outros mapas. Regeneração
  local resultou em 272 peças; comparação estrutural confirma que somente
  Escadão mudou nos dados e fingerprints dos mapas.

## Evidências

Diretório: `artifacts/escadao-visual/main-sync/`.

| Verificação | Resultado | Artefato |
|---|---|---|
| Menu até partida | PASS | `menu-final/menu.json`, `factions.png`, `game.png` |
| Corpo, circulação e LOS | 8/8 | `runtime-final/runtime.json` |
| Anéis de captura | 3/3 | `ring/runtime.json` |
| Grafo e mutação | PASS | `graph-red/`, `graph-green/`, `graph-mutant/` |
| Contrato global dos mapas | PASS | `map-contract-green.log` |
| Rotas Escadão | 7/7 | `routes.log` |
| Fachadas e escala | PASS | `facades.log`, `scale.log` |
| Grafite | PASS | `graffiti-green.log` |
| Build | PASS | `build.log` |

O primeiro `check:fast` passou 78/83. Quatro falhas eram registro do mapa/grafite e
blocos de documentação ainda não regenerados; checks afetados são repetidos no
fechamento. `audio:check` acusa o manifest local defasado: 350 arquivos privados,
275 órfãos. Esse material não foi adicionado ao Git nem publicado.

A captura automática adicional de 13 vistas foi recusada por falhas de rede nos
endpoints remotos `/api/map-plays`, `/api/pick` e `/api/online`. Imagens estão
preservadas para diagnóstico, sem declarar essa captura aprovada. O fluxo
funcional do menu e o runtime local passaram separadamente.

A régua SSR legada espera `dist/server/entry.mjs` dentro de `_render.func`, mas o
build Astro atual emite outro caminho. Ela não executou; o sucesso do build e do
menu Astro local não equivale a aprovação dessa régua ou do deploy.

## Testar

Abra <http://127.0.0.1:8148/?map=escadao&lang=pt> no Chrome. Entre em Single Player,
confirme Escadão, informe seu nick e escolha facção, personagem e adversário.
Servidor Astro vinculado apenas a 127.0.0.1; nenhuma outra porta foi encerrada.

A galeria R3 anterior continua como evidência histórica. FPS exclusivo, orçamento
AM7 e integração/publicação do PR permanecem pendentes. Não houve push ou deploy.
