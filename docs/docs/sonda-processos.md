---
id: sonda-processos
title: 'Três desfechos: medir, reprovar e não conseguir medir'
sidebar_label: Sonda de processos
sidebar_position: 9
description: Por que um processo filho que morre antes de medir tem saída própria (78 = EX_CONFIG), como a sonda classifica infraestrutura vs conteúdo, e os limites declarados da heurística.
---

# Três desfechos, não dois (issue #1133)

Portão que roda um processo filho e lê só `status === 0` conhece dois desfechos:
passou e não passou. Mas existem **três**:

1. **ok** — medi, e o conteúdo está certo.
2. **reprovou** — medi, e o conteúdo está errado.
3. **não consegui medir** — o filho morreu antes de medir coisa alguma.

Colapsar (3) em (2) produz o pior tipo de saída de portão: um veredito confiante
sobre a coisa errada. Foi o que a SB7 fez em 2026-10-28. Numa worktree
recém-criada, sem `npm ci`, ela imprimia:

```
✗ SB7 módulos locais mudam de URL junto com o conteúdo
```

quando a causa real, duas camadas abaixo, era:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'astro'
  imported from tools/eval/serve.mjs
```

Ninguém tinha mexido em cache-bust; o que faltava era dependência. A régua
acusou o réu errado, e quem batia nisso ia procurar bug de versionamento de URL
por horas. Como a regra da casa é worktree por feature, **toda** lane nova pagava
o pedágio — e o caminho natural de quem paga pedágio demais é concluir que o
portão é chato e contorná-lo.

O colapso simétrico é pior: num arquivo de mutantes, que espera `status !== 0`
para declarar o mutante MORTO, um filho que morre por dependência ausente vira
mutante "detectado" — **verde mentiroso**, a régua declara que ainda morde sem
ter encostado no código.

## Por que SKIP não é verde, e também não é vermelho

- **SKIP como 0** é falso-verde: o portão desapareceria exatamente no ambiente
  mal configurado onde ele é mais necessário.
- **SKIP como 1** é o defeito original de volta: indistinguível de "o conteúdo
  está quebrado", bloqueia a lane por algo que não é defeito dela.

Então SKIP tem código próprio: **78**, o `EX_CONFIG` do `sysexits.h` ("configuration
error" — literalmente o caso: o ambiente está errado, o código não). Com um
terceiro código, cada consumidor decide a política sabendo sobre o que decide —
o runner pinta de amarelo e conta à parte; o CI trata como falha de
infraestrutura. A mensagem de SKIP carrega sempre a causa e o comando que
conserta.

## Uso (`tools/eval/sonda-filho.mjs`)

```js
import { sonda, pula } from './sonda-filho.mjs';

const r = sonda(['tools/eval/social-serve-check.mjs']);
if (!r.mediu) pula(r.causa, 'SB7');   // imprime o SKIP e sai com 78
const clausula = r.status === 0;      // aqui o status já significa conteúdo
```

Regras que o gate `eval:sondafilho` (`tools/eval/sonda-filho-check.mjs`) cobra:

- **Vermelho já medido vence SKIP.** `pula` sai com `process.exitCode || 78`:
  num loop de mutantes, sete `process.exitCode = 1` **antes** do `pula` quando um
  trial anterior mediu e reprovou. Casos provados com callers reais
  (treta-ui, amazonia-access): fail→skip sai **1**, skip limpo sai **78**,
  pass sai **0**.
- **A causa decide DEPOIS do `finally`.** `pula` usa `process.exit` e não roda
  o `finally` de cleanup: capture a causa numa variável dentro do `try` e chame
  `pula` após o bloco.
- **Todo filho tem guarda, não só o primeiro.** Se o primeiro mediu e um filho
  posterior morreu (OOM, kill transitório), isso também é "não mediu" — em
  especial nos casos verde (`assert.equal(status, 0)`) e falso-verde
  (`assert.notEqual(status, 0)` com `status === null/1` passa sem medir).

## O que é infraestrutura e o que é conteúdo

`causaNaoMedivel` olha a mensagem do filho:

| Sinal no texto | Classificação |
|---|---|
| `Cannot find package 'nome'` (especificador bare) | infra → SKIP, conserto `npm ci` |
| `Cannot find module './x.js'`, `'/caminho/x.js'`, `'file:///…'` ou `'C:\x.js'` | **conteúdo** — import quebrado no projeto, `npm ci` não conserta; é veredito medido |
| `ERR_DLOPEN_FAILED` (binário `.node` não carrega) | infra |
| ENOENT do executável, morte por sinal/timeout | infra |
| `status === null`, mesmo sem sinal/código | infra: o executor não forneceu um resultado completo |
| Erro real do executor (`resultado.error`, como ENOBUFS), inclusive junto de status 0 | infra: saída parcial não é medição |

A distinção é pelo **especificador real citado na mensagem**, não por whitelist
de nomes: `./`, `/`, `file:` e drive (`C:\`) são arquivo do projeto; o resto é pacote.

Erro do executor tem prioridade sobre o status: um filho pode tratar SIGTERM e
sair 0 depois de estourar `maxBuffer`, mas `spawnSync` ainda devolve ENOBUFS e saída
incompleta. A causa conserva sinal, código e indicação de timeout. O gate prova
esse caso com processos reais e com o caller TEXEL numa árvore privada: ele deve
sair 78, restaurar a fixture e não anunciar mutante morto. Saída 1 de conteúdo sem
erro do executor continua medida; vermelho anterior continua vencendo SKIP.

## Limites declarados da heurística (não prometa perfeito)

- **Texto citado como dado**: um filho que mediu, reprovou e *cita*
  `Cannot find package 'x'` na própria mensagem de erro ainda é classificado
  como SKIP. A heurística lê texto, não prova — fila em
  `tools/eval/sonda-filho-check.mjs` (SFS12) como comportamento declarado;
  melhorar isso exige atualizar esta doc e a cláusula juntas.
- Mensagem de módulo ausente **sem especificador capturável** entre aspas cai
  no lado infra.
- Filho que roda e sai 0 **sem erro do executor** nunca é SKIP, mesmo citando erro
  (erro citado em verde é dado; `resultado.error` real é falha da execução).

A régua destes contratos toda vive em `tools/eval/sonda-filho-check.mjs`;
a cronologia do PR que introduziu está em `docs/reports/` e no audit da missão.
