---
id: licenca
title: Licença, arte e marca
sidebar_label: Licença, arte e marca
sidebar_position: 7
description: A AGPL-3.0, aplicada em 07/08/2026, por que a troca de MIT para AGPL não pediu consentimento de quem contribuiu antes, e a separação código × arte × marca que permite vender skin sem trancar o código.
---

# Licença, arte e marca

Esta página responde três perguntas que costumam ser respondidas errado, e por arquivos
diferentes: **o que vale hoje**, **o que mudou em 07/08/2026 e por quê**, e **o que a
licença não resolve** — que é onde a conta erra com mais frequência.

:::danger Esta página não troca a licença
Ela **documenta**. Enquanto o `LICENSE` disser o que diz no bloco abaixo, é isso que vale —
aqui e em qualquer outro arquivo do repositório. Nenhum arquivo tem autoridade para
**declarar** licença diferente da que está no `LICENSE`.
:::

## O que vale hoje

{/* BEGIN:GERADO:licenca — não edite à mão, rode `npm run docs` */}

O código está sob **AGPL-3.0** (GNU Affero General Public License, versão 3) — é o que vale hoje, e a fonte é o arquivo `LICENSE` na raiz do repositório. Nenhum outro arquivo tem autoridade sobre isso.

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `título lido do texto do LICENSE, conferido contra o campo license do package.json`

{/* END:GERADO:licenca */}

## As superfícies: tudo que muda no mesmo commit

Trocar a licença **não é editar um arquivo**. O nome dela está repetido em cada lugar onde
o projeto responde "qual é a licença?" — para o desenvolvedor no GitHub, para o jogador no
rodapé, para o buscador no JSON-LD, para um LLM no `llms.txt`. A tabela abaixo é **medida**,
não enumerada à mão:

{/* BEGIN:GERADO:licenca_pontos — não edite à mão, rode `npm run docs` */}

| Superfície | Arquivo | Onde diz `AGPL-3.0` |
|---|---|---|
| licença canônica | `LICENSE` | linhas 1, 10, 42, 63 (+7)  |
| badge + seção de licenças | `README.md` | linhas 3, 343, 349, 350 (+1)  |
| termo que o contribuidor aceita | `CONTRIBUTING.md` | linhas 176, 179, 182  |
| rodapé do site | `src/layouts/Layout.astro` | linha 598  |
| JSON-LD do jogo | `src/pages/index.astro` | linha 297  |
| página `/sobre` | `src/pages/sobre.astro` | linhas 121, 124, 133  |
| `llms.txt` (resposta para LLM) | `public/llms.txt` | linhas 9, 46  |
| rodapé desta documentação | `docs/docusaurus.config.js` | — (não nomeia a licença)  |

**26 ocorrências** de `AGPL-3.0` em **7** das 8 superfícies declaradas. Trocar a licença é mudar **todas elas no mesmo commit**: metade trocada é pior que nenhuma, porque cada arquivo passa a responder uma coisa diferente para quem pergunta.

**Outros nomes de licença citados nessas superfícies:** `MIT` em `README.md` (linhas 349, 350, 351, 355), `MIT` em `CONTRIBUTING.md` (linhas 179, 180, 181), `MIT` em `src/pages/sobre.astro` (linha 123), `MIT` em `public/llms.txt` (linha 47), `MIT` em `docs/docusaurus.config.js` (linha 152). Citar não é declarar — essas linhas são histórico da migração ou crédito a dependência de terceiro. A regra continua a mesma: **só o `LICENSE` declara**, e hoje ele diz `AGPL-3.0`.

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `grep -n dos nomes de licença conhecidos, nas superfícies declaradas em tools/gen-docs.mjs`

{/* END:GERADO:licenca_pontos */}

:::note Por que esta tabela é gerada, e não uma lista
Duas listas escritas à mão já tentaram enumerar essas superfícies — a seção de licenças do
`README.md` e o degrau 3 do [`plans/08-RELEASE-PROFISSIONAL.md`](https://github.com/rubenmarcus/csbrasil/blob/main/plans/08-RELEASE-PROFISSIONAL.md).
**As duas esquecem o JSON-LD do jogo e o rodapé desta documentação.** Uma lista de onde a
licença aparece envelhece exatamente como qualquer outro número escrito à mão: no primeiro
commit que criar uma página nova. A lista de superfícies *a conferir* é decisão humana e mora
no topo do `tools/gen-docs.mjs`; **onde** cada uma nomeia a licença é medido a cada
`npm run docs`.
:::

## A migração MIT → AGPL-3.0, aplicada em 07/08/2026

O projeto nasceu **MIT** e é **AGPL-3.0** desde **07/08/2026**, aplicada no commit
[`3f7a9be`](https://github.com/rubenmarcus/csbrasil/commit/3f7a9be) — as oito superfícies
num commit só, como esta página exigia antes de a troca acontecer. A decisão reverte uma
recomendação anterior do próprio repositório (`plans/06 §1.2` defendia manter permissivo por
causa de Steamworks e de programas de crédito de IA).

O motivo da virada está no [`plans/08 §3`](https://github.com/rubenmarcus/csbrasil/blob/main/plans/08-RELEASE-PROFISSIONAL.md):
o projeto pretende **vender skins e mapas**, e venda de item muda o modelo de ameaça. A AGPL
**não impede** vender — você vende o direito de uso — mas ela é honesta sobre o que não
resolve: qualquer um pode publicar um fork com o gate de posse removido, **legalmente**. Essa
é a razão de a proteção real ser server-side, não a licença.

### Por que não foi preciso pedir consentimento a quem já tinha contribuído

Esta era a tarefa que a doc anunciava como bloqueante, e **ela estava mal formulada**. A
regra do consentimento vale para a direção **permissiva → permissiva** ou para relicenciar
contribuição de terceiro sob termos que a licença original não autoriza. Não é o caso aqui:

- **MIT é permissiva e compatível com a AGPL.** Ela autoriza sublicenciar e incorporar o
  código em obra distribuída sob outros termos, desde que o aviso de copyright original
  continue no pacote.
- Por isso **o que entrou antes de 07/08/2026 segue MIT dentro do conjunto**, e o conjunto é
  distribuído sob AGPL-3.0. Quem contribuiu antes **não perde nada e não precisou aprovar**.
- A direção **incompatível** seria a inversa — pegar código AGPL de terceiro e redistribuir
  sob MIT. Essa, sim, exigiria consentimento de cada autor, e é a razão de a troca ser
  **de mão única na prática**.

O mesmo texto vale no [`CONTRIBUTING.md`](https://github.com/rubenmarcus/csbrasil/blob/main/CONTRIBUTING.md)
e no `README.md`, e é lá que ele é normativo — aqui é explicação.

:::note Isto é a leitura do projeto, não parecer jurídico
Compatibilidade MIT → AGPL é consenso confortável e velho no ecossistema, mas se a sua
contribuição tem exigência específica de empregador ou de cliente, **pergunte antes de abrir
o PR** em vez de assumir.
:::

### Quem assina o histórico publicado

O levantamento continua útil por outro motivo — saber de quem é o código —, e ele é medido,
não estimado:

```bash
git shortlog -sne --no-merges origin/main   # quem assina o histórico publicado
gh pr list --state merged --limit 50        # o que entrou, e de quem
```

Em **2026-08-05**, o histórico publicado (`origin/main`) tem **dois contribuintes de terceiro
com trabalho mesclado**:

| Quem | O que entrou | Onde |
|---|---|---|
| `daltonfontes` | o mapa `fy_pool_day` ("Piscinão da Treta"), 1 commit | está nesta branch |
| **William Oliveira** (`@woliveiras`) | o **cliente Godot desktop**, 13 commits, PR #14 mesclado em 18/07/2026 | **`main` — não está nesta branch** |

:::caution O `git shortlog` da branch de trabalho NÃO enumera os contribuidores do projeto
O bloco de pessoas de [Como colaborar](./colaborar.md) mede o **HEAD**, e o HEAD é uma
branch. A `v2/alpha` saiu de `main` **antes** do merge do PR #14, então os 13 commits do
William não aparecem nela — e a doc anunciava três pessoas num repositório que tem quatro.
Para qualquer decisão sobre licença, **meça contra `origin/main`**, não contra a branch em
que você está trabalhando. Ver [Roadmap](https://github.com/rubenmarcus/csbrasil/blob/main/docs/ROADMAP.md),
seção sobre a divergência entre `main` e `v2/alpha`.
:::

O repositório é **público** e tem estrelas (`gh repo view --json stargazerCount`), o que quer
dizer que **já existem cópias do código sob MIT**, feitas antes de 07/08/2026. **Isso é
irreversível:** o histórico do git guarda a versão permissiva para sempre, e um fork feito
sob a licença antiga continua sob ela. A AGPL vale para o que sai daqui **de hoje em
diante** — ela não recolhe o que já saiu.

### Os pontos que mudaram juntos

Tudo isto foi no mesmo commit, e é a lista que qualquer troca futura tem que repetir:

1. o arquivo `LICENSE`;
2. o badge do topo do `README.md`;
3. a seção de licenças do `README.md` (bloco gerado — basta rodar `npm run docs`);
4. o termo que o contribuidor aceita, no `CONTRIBUTING.md`;
5. o rodapé do site (`src/layouts/Layout.astro`);
6. o JSON-LD do jogo (`src/pages/index.astro`) e a página `/sobre`;
7. o `public/llms.txt` e o rodapé desta documentação.

A tabela gerada acima é a versão sempre atual desta lista — os números de linha saem dela, e
não deste parágrafo. **Meia troca de licença é pior que nenhuma**, porque cada arquivo passa
a responder uma coisa diferente para quem pergunta.

:::caution O que a troca de licença NÃO faz sozinha: publicar
O commit trocou os arquivos. A doc publicada continuou dizendo `MIT` por três dias, porque
`docs/` é um site **buildado** — e ninguém tinha rodado o build depois da migração. Não
adianta trocar as oito superfícies num commit se a nona, a página que o público lê, é uma
cópia estática de antes:

```bash
cd docs && npm run build:site   # reescreve public/docs/ — é ISSO que vai para o ar
```

Pior ainda: o `tools/gen-docs.mjs` **não reconhecia** o `LICENSE` novo (o texto oficial da
AGPL não contém a sigla `AGPL-3.0` em lugar nenhum do cabeçalho) e, em vez de ficar
vermelho, devolveu `null` e escreveu prosa coerente em cima de nada. As duas coisas estão
consertadas: o nome sai do **título** da licença, é conferido contra o campo `license` do
`package.json`, e **não identificar reprova o `docs:check`** em vez de publicar um `null`.
:::

## A separação que quase ninguém sabe: código × arte × marca

Esta é a decisão do [`plans/08 §3`](https://github.com/rubenmarcus/csbrasil/blob/main/plans/08-RELEASE-PROFISSIONAL.md)
que torna o resto possível, e ela é **três licenças diferentes para três coisas diferentes**:

| Camada | O que é | Regime | Onde mora |
|---|---|---|---|
| **Código** | motor, mapas base, UI, o arnês inteiro | **aberto** (AGPL-3.0) | repositório público |
| **Arte paga** | skins, mapas e itens vendidos | **licença própria, proprietária** | **fora** do repositório público, sob autorização |
| **Marca** | "CORO SOLTO: Treta Suprema", o canarinho, a logomarca | **não licenciada** | de ninguém além do dono |

É isso que permite **vender skin sem trancar o código**. O código continua aberto e
auditável; o que se vende é arte, que nunca esteve sob a licença do código; e o nome não vai
junto — um fork legal do motor não é o CORO SOLTO, porque a marca não foi licenciada.

:::danger Isto é irreversível depois que existir a primeira arte paga
Os GLBs de personagem **já estão no repositório público** (a contagem está no bloco gerado de
[Começando](./comecando.md)). Se um deles virar item pago, relicenciar é retroativo e o
histórico do git guarda a versão livre para sempre.

**A decisão de onde a arte paga mora tem que ser tomada ANTES de a primeira arte paga
existir.** Depois, o custo não é editar um `LICENSE`: é aceitar que o item vendido já foi
distribuído de graça.
:::

E a verdade desconfortável, que fica escrita para não ser redescoberta a cada rodada: **o
jogador sempre pode fazer a própria tela mostrar qualquer skin, e tentar impedir isso custa
semanas e não funciona.** A fraude que importa é obter o arquivo sem pagar e aparecer com ele
**para os outros** — e essa é server-side, como o *entitlement*, que vive no Postgres sob
`service_role`. Gastar esforço no cliente é gastar no lugar errado.

## Terceiros que este projeto usa

- **Three.js** — MIT (© Three.js authors), vendorizado em `public/vendor/`.
- **Áudio** — o pacote **não é versionado**; as vozes e memes têm direitos incertos. Sons do
  CS 1.6 são propriedade da Valve e **não** são distribuídos aqui. Sem o pacote, o jogo usa
  sons sintetizados e roda normalmente.
- **Paródia independente**, sem afiliação com a Valve. *Counter-Strike* é marca da Valve
  Corporation.

Assets gerados por IA (mint.gg, Tripo3D, Meshy, OpenRouter) entram no repositório como
resultado, com o registro de procedência em `mint-assets.json` — ver
[Stack e ferramentas](./stack.md#geração-de-asset--o-que-é-gerado-por-ia-e-por-qual-serviço).

## Se você vai contribuir

O termo que vale está no [`CONTRIBUTING.md`](https://github.com/rubenmarcus/csbrasil/blob/main/CONTRIBUTING.md),
e ele é a fonte — esta página não o repete. O resumo operacional: você licencia sob a licença
que o `LICENSE` disser **no momento do seu PR** — hoje, **AGPL-3.0** —, qualquer troca futura
virá num commit único e anunciado, e se isso for decisivo para você, **pergunte antes de
abrir o PR**.
