# Validação de arquivo JSON de mapa — 25/10/2026

## Objetivo e pronto

Permitir que a pessoa da issue [#1088](https://github.com/corosolto/client/issues/1088)
valide o `.json` exportado do Construtor da Treta com um comando que existe no
repositório, sem editar o script. Aceite: arquivo válido sai 0, arena inválida
sai 1 com a regra violada, JSON ilegível sai 2, e os mutantes do gate existente
continuam a reprovar como esperado. A revisão visual 3:2 e o registro do mapa
no menu são gates posteriores.

## Estado e evidência

- Branch isolada `codex/mapjson-file-check-20261025`, base
  `feat/construtor-mapas-json-20261024@9b9459a4b8a8f5ab57928b4645ecf3c51f6a753d`.
  A branch base estava limpa e não tinha PR aberto na consulta de 25/10.
- `tools/eval/mapjson-check.mjs` aceita um caminho JSON posicional; sem argumento
  continua usando a fixture embutida. Arquivo e `--mutante` juntos são rejeitados.
  A documentação e o aceite da #1088 no arquivo de fonte usam o comando exato.
- Validação com Node 23 e dependências instaladas somente neste worktree:
  `npm run eval:mapjson` passou fixture e cinco mutantes; o arquivo de fixture
  passado por caminho saiu 0; cópia com spawn `x=999` saiu 1 com R3; JSON
  malformado saiu 2 com erro de parse; `node --check` e `git diff --check`
  passaram.
- Checkpoint de implementação: `07c401d3d0ba5dd5b8131e5f856cd7b63c963b13`.

## Fluxo real no editor local, 25/10, 08:56 UTC

- No mesmo checkout, `astro dev` serviu `/construtor.html` com HTTP 200.
  Chromium 151 em 1440×960 abriu o editor, alterou o nome, adicionou uma área
  de água, exibiu a validação verde, baixou o `.json` e abriu o preview 3D sem
  erro de página nem diálogo de falha.
- O arquivo exportado contém uma área `slow`, dois spawns por lado e três
  bandeiras. `node tools/eval/mapjson-check.mjs <arquivo exportado>` saiu 0:
  **94 nós, 598 arestas, loader com contrato completo**. O servidor local foi
  parado após a captura.
- Artefatos fora do Git:
  `/Volumes/Zenith/Projects/game/corosolto/analysis-media/2026-10-25-mapjson-editor-qa/arena_treta.json`
  (1.389 bytes; SHA-256 `2bff609b20a7fcef6090159c2b3fae63274ead57b11b5de5129d4eae52635134`)
  e `editor-preview-1440x960.png` no mesmo diretório (108.528 bytes; SHA-256
  `6d35852817995d96f106c02f9165245c3985b5d74c548ea91b72540abb643b25`).
  A imagem prova que o preview desenhou a arena simples; não aprova sua arte,
  balanceamento, jogabilidade humana ou publicação.

## Limites e próximo passo

O código não está na `main` nem em produção. O Construtor e sua documentação
também estão só na branch base; a issue #1088 já está atribuída a
`nunreasonable`. Não houve contato, PR, merge ou publicação nesta rodada.
Próximo passo: o responsável pela branch do construtor integrar ou reaplicar
o checkpoint de implementação antes de convidar a pessoa atribuída. Repetir
editor → exportação → CLI em clone limpo da `main` integrada; pedir à pessoa
atribuída uma arena própria pequena e revisar simetria, cobertura e captura 3:2.
