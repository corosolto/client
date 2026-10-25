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

## Limites e próximo passo

O código não está na `main` nem em produção. O Construtor e sua documentação
também estão só na branch base; a issue #1088 já está atribuída a
`nunreasonable`. Não houve contato, PR, merge ou publicação nesta rodada.
Próximo passo: o responsável pela branch do construtor integrar ou reaplicar
este commit antes de convidar a pessoa atribuída a executar a tarefa. Depois,
testar o fluxo visual editor → exportação → comando em clone limpo e uma arena
real pequena. Registrar o SHA do commit abaixo após o checkpoint.
