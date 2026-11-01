# Gates de consistência visual (#1179) — contrato dos validadores

Estado: R3 (31/10/2026). Fontes: `tools/eval/gate-accept.mjs` (predicados puros) +
`flashbang-check.mjs`, `movimento-mutant-check.mjs`, `lobby-arma-mao-check.mjs`,
`mira-alinhada-check.mjs`. Histórico: críticas R1/R2 em
`audits/2026-10-31-visual-consistency/`.

## Princípio

Medida ausente, não finita (NaN/Infinity), de subprocesso morto ou de matriz
incompleta **reprova ou é infra** — nunca aprova. O mutante não resgata cenário
faltante: veredito de mutante exige a matriz pronta.

## gate-accept.mjs

- `finite`/`naoFinitos`: finitude ANTES da comparação (NaN não viola `>` nem `<`).
- `cobertura(chaves, esperadas)`: dup/missing/extra — os três contam como erro.
- `lobbyFalhas(r, TETO, TETO_PEGADA)`:
  - caso com `erro` → inválido; `amostras` não-array → inválido;
  - **exatamente 8 amostras** por caso (0/1/7/9 → inválido; LA5 mede estabilidade
    em 4 s, um instante não mede nada);
  - campo não finito em qualquer amostra (pegada/palma/caixa/canoZ) → inválido;
  - tetos inalterados: LA1 10° (canarinho 20°, dívida declarada 29/10), LA2 0,10 m,
    LA3 0,02 m (+5 mm sobre o porte de jogo), LA4 0,594, LA5 2°/0,01 m.
- `miraVeredito(linhas, …)`:
  - matriz completa sem dup/missing/extra, sem `erro`, sem medida não finita
    (ang/px sempre; `massa` em TODA linha `first` — o collector a produz;
    third legitimamente não tem);
  - MA1: first+ADS com cano >1° ou fuga >4 px, ou (arma em linha de mira e
    `massa` >4 px). `massa` ausente/NaN em first invalida antes de MA1.

## flashbang-check.mjs (bloco 7, filhos)

`filho(qs, args, rowsEsperadas)` valida status/signal/error/schema ANTES do aceite:

- status 0 + JSON com `failed` vazio + total/rows coerentes (killswitch 3 rows,
  debug 1 row, `failed.length === total − passed`) → cláusulas podem passar;
- status 1 + `failed` não vazio + schema coerente → **RED semântico propagado**
  nas mesmas cláusulas (é o que faz o mutante `killswitch-morto` morder);
- status 42/null, signal, erro de spawn, JSON ilegível, schema/contagens
  incoerentes, status 0 com `failed` ou status 1 com `failed` vazio → **infra,
  exit 3** — nunca PASS, nunca RED semântico.

Nomes das cláusulas e conjuntos esperados dos 11 mutantes
(`flashbang-mutate.mjs`) inalterados.

## movimento-mutant-check.mjs

`--node=<bin>` preservado (seam do Node26); recusa `--node=` vazio, duplicado e
opção desconhecida (exit 2). Crash do filho (signal/error) é infra 3, nunca RED
semântico; status fora de {0,1} idem. Mutante morde com exatamente a cláusula
`90% da velocidade deve chegar em 0,14 a 0,24 s`.

## CLI (todos os gates)

Desconhecido, duplicado, vazio ou enum inválido → usage exit 2, ANTES de
servidor/browser. Aliases e documentação de uso originais preservados.

- lobby: `--mutante=sem-pulso` · `--json`
- mira: `--armas=` `--cams=` `--mutante=foco` `--qs=` `--json=<arq>` `--fotos=`
  `--porta=` ( `--json` grava as linhas APÓS a coleta e ANTES do veredito,
  preservando resultados inválidos como evidência)
- movimento: `[--node=<bin>]`

## mira: subida do servidor

Loop de prontidão espera 500 ms entre as 120 tentativas (removê-lo mata o
Astro durante o boot e vira falso infra). Servidor que morre antes de responder
é infra 3. Nenhuma captura antes da prontidão.


## R4 — integridade do resultado e argumentos

O pai da flash confere nomes únicos e exatos por modo, `pass` booleano em cada
row e deriva o resumo dessas rows; `passed` inteiro e lista `failed` precisam
coincidir exatamente, inclusive nomes. Resumo contraditório é infra3.
A mira exige `--chave=valor`, arma do catálogo e porta decimal1–65535; lobby
recusa sufixo/prototype no enum e `--json` duplicado. O wrapper de movimento
reserva RED1 às assertions das cláusulas medidas: falha de import/sintaxe ou
exceção antes da medição é infra3.
