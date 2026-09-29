# 0006. Documentação interna não vive neste repo

Status: aceita (09/2026)

## Contexto

O repositório é público e acumulava material de trabalho interno:
ledger de defeitos com 3,1 mil linhas, ~150 relatórios de rodada,
handoffs de sessão, planos já executados, especificação de engine
recusada e estado de ferramenta de agente rastreado. Nada disso servia
ao contribuidor e todo ele era baixado por quem clonava.

## Decisão

Este repo versiona o que o contribuidor precisa: código do jogo e do
site, site de docs (`docs/docs/`), boas primeiras tarefas
(`docs/issues/`), licença, segurança, onboarding, processo de PR e os
ledgers que gates e tooling leem (`docs/audio/proveniencia.json`,
`docs/runbooks/operacao-autonoma.md`). Documentação interna de trabalho
não é versionada aqui; o dono mantém o próprio acervo fora.

## Consequências

- Contribuidor reporta defeito por issue com a frase literal do
  sintoma; triagem e evidência são problema do mantenedor.
- Branches criadas antes desta decisão carregam docs internas: quem
  mergear depois dela precisa tirá-las antes, senão voltam para a
  `main`.
- Histórico git anterior continua público por conter estes arquivos;
  sanitizá-lo é decisão separada (rewrite + force push), ainda não
  tomada.
