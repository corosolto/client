# CHANGELOG: 27 versões sem entrada

**Dificuldade:** fácil · **Área:** documentação · **Tempo:** ~2 h · **Sem código**

## Contexto

O `CHANGELOG.md` pula de `[2.0.0-alpha.4]` (04/08) para `[2.0.0-alpha.32]` (07/08). As 27
versões do meio existiram como commit e como bump de `package.json`, mas **nunca como
entrada**.

Isso não é cosmético: o job `release` do `.github/workflows/ci.yml` monta as notas do
GitHub Release extraindo a seção `## [<versão>]`. Toda tag daquele intervalo sairia com
"Ver commits abaixo." — e o `/changelog` do site, que tem âncora e busca por versão, tem
27 buracos.

## O que fazer

1. `git log --no-merges v2.0.0-alpha.4..v2.0.0-alpha.32` e agrupar por versão, usando os
   commits `release: bump 2.0.0-alpha.N` como divisores.
2. Escrever a entrada de cada versão no formato das existentes: título com data, seções
   `### Adicionado / Corrigido / Mudado`, e **o porquê junto do quê** — é a regra da casa,
   e é o que faz o arquivo valer alguma coisa daqui a seis meses.
3. Não inventar: se um bump não tem mudança digna de nota, escreva a entrada com uma linha
   dizendo isso. Entrada honesta e curta é melhor que entrada inflada.

**Dica:** as mensagens de commit deste repositório são longas de propósito e quase sempre
já contêm o porquê. Boa parte do trabalho é recortar, não redigir.

## Critério de aceite

- [ ] Toda versão entre `alpha.5` e `alpha.31` tem seção própria
- [ ] `awk "/^## \[<versão>\]/{f=1;next}/^## \[/{f=0}f" CHANGELOG.md` devolve texto para
      qualquer uma delas (é exatamente o que o job `release` faz)
- [ ] `npm run eval:jsonld` continua verde (o `/changelog` gera JSON-LD do arquivo)

## Arquivos

`CHANGELOG.md`
