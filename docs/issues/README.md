# Tarefas boas pra primeira contribuição

26 issues escritas pra serem **coladas direto no GitHub**. Cada arquivo é uma
issue completa: contexto, o que fazer, critério de aceite e quais arquivos
tocar. Nenhuma delas depende de conhecimento tácito que não esteja escrito.

**Como usar:** copie o conteúdo do `.md`, abra a issue, cole. O título é a
primeira linha (`# …`).

**Ou de uma vez só**, com o [`gh`](https://cli.github.com/) autenticado:

```bash
bash docs/issues/abrir-issues.sh --dry-run   # imprime título + labels, não abre nada
bash docs/issues/abrir-issues.sh --labels    # cria as 8 labels usadas
bash docs/issues/abrir-issues.sh             # abre as 26
```

O script **não foi executado por ninguém**: o repositório é público e é do dono,
e abrir issue é ação irreversível com o nome dele. Ele é idempotente — procura
issue com o mesmo título antes de criar, então rodar duas vezes não duplica — e
o corpo de cada issue termina apontando para o `.md`, que continua sendo a
fonte.

## Por tempo disponível

| Tenho… | Pegue |
|---|---|
| 30 min | [01](01-hreflang-e-og-locale.md) · [11](11-api-config-morta.md) |
| 1 h | [06](06-skip-link-e-foco.md) · [07](07-404-personalizada.md) · [08](08-vendorizar-leaflet.md) · [09](09-atomizar-city-daily.md) · [10](10-validar-charset-do-nick.md) · [14](14-changelog-anchors.md) |
| 30 min | [17](17-layout-de-grafite-pode-citar-arquivo-que-nao-existe.md) · [21](21-flags-de-viewmodel-somem-em-producao-sem-aviso.md) |
| 1 h | [18](18-poda-do-build-nao-tem-regua.md) · [19](19-aspecto-de-6-cartazes-esta-errado.md) |
| 2-3 h | [16](16-censo-de-grafite-so-mede-na-altura-do-olho.md) · [20](20-changelog-das-27-versoes-sem-entrada.md) |
| 2-3 h | [02](02-sitemap-index.md) · [03](03-og-image-por-pagina.md) · [04](04-pagina-faccao.md) · [05](05-tabela-comparativa-armas.md) · [12](12-skills-lock-verificar-hash.md) · [13](13-aposentar-evals-obsoletos.md) · [15](15-teste-de-fumaca-do-site.md) |

## Por área

| Área | Issues |
|---|---|
| **SEO / conteúdo** | 01, 02, 03, 04, 14 |
| **UI / front** | 05, 06, 07, 14 |
| **Segurança / backend** | 08, 09, 10, 11 |
| **Qualidade / CI / limpeza** | 12, 13, 15 |

## A lista

| # | Título | Dificuldade |
|---|---|---|
| 01 | [`hreflang` e alternate para o host sem `www`](01-hreflang-e-og-locale.md) | fácil |
| 02 | [Partir o sitemap em índice acima de 5.000 URLs](02-sitemap-index.md) | média |
| 03 | [`og:image` própria para `/mapas` e `/armas`](03-og-image-por-pagina.md) | média |
| 04 | [Uma página por facção: `/faccoes/<id>`](04-pagina-faccao.md) | fácil |
| 05 | [Tabela comparativa de armas com ordenação](05-tabela-comparativa-armas.md) | fácil |
| 06 | [Skip link, foco visível e contraste](06-skip-link-e-foco.md) | fácil |
| 07 | [Página 404 personalizada](07-404-personalizada.md) | fácil |
| 08 | [Vendorizar o Leaflet e tirar o unpkg da CSP](08-vendorizar-leaflet.md) | média |
| 09 | [Corrigir a condição de corrida em `city_daily`](09-atomizar-city-daily.md) | média |
| 10 | [Validar os caracteres do nick](10-validar-charset-do-nick.md) | fácil |
| 11 | [Decidir o destino de `GET /api/config`](11-api-config-morta.md) | fácil |
| 12 | [Verificar os hashes do `skills-lock.json`](12-skills-lock-verificar-hash.md) | média |
| 13 | [Aposentar de verdade os evals obsoletos](13-aposentar-evals-obsoletos.md) | fácil |
| 14 | [Âncoras por versão no `/changelog`](14-changelog-anchors.md) | fácil |
| 15 | [Teste de fumaça das rotas do site no CI](15-teste-de-fumaca-do-site.md) | média |

## Antes de abrir o PR

Leia [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md) e rode:

```bash
npm run check        # portão completo (bloqueante)
npm run build        # o site tem que buildar
```

**Nenhuma destas 15 issues exige tocar em `public/js/*.js`** — de propósito.
Esse é o código onde os agentes de gameplay trabalham em paralelo e onde a
tabela de conflito do `tools/eval/ARCH.md` manda. A única que chega perto é a
10, e ela diz explicitamente pra combinar antes.

## Leva de 07/08 (16-21)

Saíram todas de defeito **medido** durante a rodada de arte urbana e do Bloco 1 da
trilha — nenhuma é especulação:

- **[16](16-censo-de-grafite-so-mede-na-altura-do-olho.md)** — a régua de cobertura mede
  só a 1,6 m, então a faixa de empena da passada é invisível para ela.
- **[17](17-layout-de-grafite-pode-citar-arquivo-que-nao-existe.md)** — o layout assado
  pode citar PNG que saiu do pacote; hoje isso é um `console.warn` e peças somem caladas.
- **[18](18-poda-do-build-nao-tem-regua.md)** — nada confere que os 154 MB de viewmodel
  ficaram fora do publicado.
- **[19](19-aspecto-de-6-cartazes-esta-errado.md)** — 6 dos 26 cartazes têm proporção
  declarada errada (um deles 46% fora): a arte está esticada na parede AGORA.
- **[20](20-changelog-das-27-versoes-sem-entrada.md)** — só documentação, boa para
  primeira contribuição sem tocar em código.
- **[21](21-flags-de-viewmodel-somem-em-producao-sem-aviso.md)** — efeito colateral
  declarado da poda do build, sem mensagem para quem esbarra nele.

## Leva de automação e arnês (22-26)

O que estas cinco têm em comum: são **mecanismo**, não conserto. Cada uma fecha um buraco
onde hoje o projeto depende de alguém lembrar de fazer a coisa certa — e memória de pessoa
não é mecanismo.

- **[22](22-o-layout-de-grafite-pode-envelhecer-em-silencio.md)** — o layout de grafite é
  assado; mexer no mapa sem regerar deixa tinta colada onde a parede estava ontem, e nenhum
  portão vê.
- **[23](23-as-reguas-de-navegador-estao-fora-do-portao.md)** — o `npm run check` inteiro
  roda em node, que é cego para GLB. Foi essa cegueira que deixou 238 decalques morrerem
  calados.
- **[24](24-o-ratchet-de-dividas-so-cresce.md)** — nada impede o `KNOWN-RED.json` de
  crescer. Ratchet que anda para os dois lados é lista de desculpas.
- **[25](25-feedback-nao-notifica-ninguem.md)** — o form grava no banco e não avisa
  ninguém. Descoberto do jeito mais direto: o dono enviou e não recebeu nada.
- **[26](26-mutation-testing-automatizado.md)** — a T4 da trilha. Régua que parou de morder
  continua imprimindo verde, e hoje só um humano lembrando descobre isso.
