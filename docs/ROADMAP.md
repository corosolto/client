# Roadmap — CORO SOLTO: Treta Suprema

> Para onde o projeto vai, **o que mudou de direção** e **o que está esperando decisão**.
> Produção: <https://www.csbrasil.online>
>
> **Este arquivo não duplica plano.** O roadmap executável, degrau a degrau e com o corte
> defendido, é [`plans/08-RELEASE-PROFISSIONAL.md`](../plans/08-RELEASE-PROFISSIONAL.md).
> Aqui ficam a direção, o recorte da v2 e o registro do que foi substituído — que é
> justamente o que um plano não guarda.
>
> **Baseline histórico de 2026-08-05.** A análise de divergência entre `v2/alpha` e
> `origin/main` abaixo explica decisões daquele momento; não é o backlog nem o estado
> atual. Para prioridade use as issues abertas, e para estado use `STATUS.md`. Todo
> número desta página traz o comando que o reproduz.

---

## O recorte da v2, na frase do dono

> *"entregar o que temos com consistência + código do repo limpo + docs pra devs e SDKs +
> form de feedback + botão de doações + proteção de arte autoral já é um grande passo.
> conforme o jogo for se espalhando podemos entre agosto e setembro trabalhar formas de
> monetizá-lo"*

Quatro coisas ficam decididas por essa frase, e vale escrevê-las separadas:

1. **O release não é feature nova.** É o que já existe, consistente, no ar e apresentável.
2. **Monetização é agosto/setembro**, depois de o jogo se espalhar — não é escopo do release.
3. **"Proteção de arte autoral" entra AGORA**, porque é a única peça da monetização que fica
   **irreversível** se for feita depois. Ver
   [Licença, arte e marca](LICENCA.md).
4. **Docs para devs e SDKs** é entrega, não documentação de apoio: é o que transforma
   contribuição em algo que não depende do dono explicar.

---

## Os princípios que não mudam

1. **Fricção zero é o superpoder.** O jogo abre num link e está jogando em segundos. É a
   razão da tração até aqui e a mecânica que viraliza no WhatsApp. Nenhuma decisão pode
   custar isso no cliente web.
2. **Web é o cliente canônico.** É onde a jogabilidade e o conteúdo são tunados.
3. **Conteúdo é dado, não código** — ainda uma direção, ainda não feita. Ver abaixo.
4. **Sátira 100% ficcional.** Arquétipos originais e marcas parodiadas, sem pessoas reais,
   sem gore. É linha editorial **e** proteção contra takedown.
5. **Feito com IA, aberto a todos.** A barreira de contribuição é baixa de propósito — mas a
   régua não é.

## O alvo de qualidade

**CS 1.6 / CS 1.3, não CS 2.** O que se persegue é **consistência**: uniformidade visual, de
movimento e de animação. A frase que fecha o argumento é do dono: *"sem padrão visual,
consistência gráfica e de movimentos e animações não adiantaria de nada"*.

O gap é **craft** — material, animação, game feel, level design —, não engine: o Three.js já
supera a capacidade daquela era. Por isso o portão mede acabamento, proporção e enquadramento,
e não frames por segundo.

---

## O roadmap executável: os degraus do `plans/08`

O plano vivo é [`plans/08-RELEASE-PROFISSIONAL.md`](../plans/08-RELEASE-PROFISSIONAL.md), e
ele tem o detalhe, os números medidos e as perguntas abertas para o dono. O índice, só para
você saber o que existe:

| # | Degrau | Nota |
|---|---|---|
| 0 | **Produção** — push, migrations `011`/`012`, deploy | **bloqueia todos os outros**; é o mais barato e o mais valioso |
| 1 | **Peso** — tirar `fpvm/` do `public/` | uma tarde, quase todo `git mv` |
| 2 | **Consistência** — o bug dos personagens | tem incerteza real: depende de rigs externos |
| 3 | **Segurança** — fronteira escrita, licença, onde a arte paga mora | documento antes de código |
| 4 | **Para devs + apoie** — link no jogo, `FUNDING.yml`, abrir as issues | pequeno e independente |
| 5 | **Telemetria** — `team` e `character` no payload | delta de 2 campos |
| 6 | **Ranking** — SP no release, MP na v2.1 | ver a contradição abaixo |
| 7 | **Quebrada** — rua, becos, escada e laje | a laje jogável exige A\* em camadas |
| 8 | **Multiplayer mínimo** — WebRTC, sala por código, sem ranking | **o único destacável**: se atrasar, corte |
| 9 | **Páginas + AEO** | o visual do jogo sai do `index.astro` para o `Layout` |
| 10 | **Release no GitHub** com capa | bloqueado por um `awk`, não por arte |

**O corte defendido no plano: degraus 0, 1, 2, 4, 5 e 10.** Isso é um release profissional de
verdade — está no ar, é seguro, os personagens estão certos, tem porta para a comunidade e
para o apoio, mede o que interessa, e tem release bonito no GitHub. Multiplayer e ranking MP
saem depois, com post próprio.

**Não há total em dias, e o motivo é medido:** uma estimativa anterior deu 3-5 dias para
multiplayer e dois dias depois ele não tinha começado, com o plano que a sustentava revogado.
Repetir o número seria repetir o erro com mais confiança.

---

## Conteúdo como dado — a direção de maior alavancagem, ainda não começada

Hoje mapas, armas e personagens são **código**: cada `map_*.js` é geometria declarada à mão, e
os maiores rivalizam em tamanho com os módulos de sistema. Cada contribuição de conteúdo é um
PR de código arriscado.

A direção é migrar para **JSON com loader único** — geometria, colisores, occluders, spawns,
pickups e waypoints — com **waypoints validados por teste**, que é o defeito que já quebrou
PRs de mapa (grafo desconexo, aresta unidirecional). Isso transforma *"um PR de código
hand-coded arriscado"* em *"abre um JSON e cria conteúdo"*.

**Estado: não começou.** Não existe pasta `shared/` nem formato declarado; o que existe é a
intenção, escrita desde a primeira versão deste arquivo. Quem quiser o trabalho de maior
alavancagem do projeto, é este — e ele começa por uma issue de acordo sobre o formato, não
por código. Ver [Como colaborar](docs/colaborar.md).

---

## A divergência entre `main` e `v2/alpha` — e o risco de merge

Esta seção existe porque o risco é **real, sério e não estava escrito em lugar nenhum**.

```bash
git fetch origin main
git rev-list --count v2/alpha..origin/main          # 17
git shortlog -sne --no-merges v2/alpha..origin/main # 13 commits de William Oliveira
git diff --shortstat HEAD...origin/main -- godot specs tests .vscode
#   403 files changed, 29534 insertions(+)
```

Medido em **2026-08-05**: existem **17 commits em `origin/main` que não estão na `v2/alpha`**,
e **403 arquivos / 29.534 linhas** que existem só do lado da `main` — `godot/`, `specs/`,
`tests/`, `.vscode/`, `playwright.config.mjs` e `vercel.godot-preview.json`.

> **Isto não gera conflito — e é exatamente por isso que é perigoso.**
>
> Arquivo que existe **de um lado só** não produz marcador de conflito. Um merge normal
> (`--no-ff`) **preserva** esses arquivos; um **squash**, um `-X ours`, ou um
> `push --force` da `v2/alpha` por cima da `main` **apagam 29 mil linhas em silêncio** — e a
> maior parte delas é trabalho de um contribuidor de terceiro.
>
> A `v2/alpha` **nunca teve upstream** (`git rev-parse --abbrev-ref v2/alpha@{upstream}` →
> `fatal: no upstream configured`), e o degrau 0 do plano começa justamente com o primeiro
> push. É o momento exato em que esse erro é cometido.

**As três proteções, e o estado de cada uma:**

| Proteção | Estado |
|---|---|
| mesclar com `git merge --no-ff` — **nunca squash**, para preservar a autoria dos commits | escrita aqui desde a primeira versão deste arquivo; **continua valendo** |
| `CODEOWNERS` dando `godot/` ao autor | **não existe** — `git ls-tree -r origin/main \| grep -i codeowners` devolve vazio |
| conferir a árvore **depois** do merge (`git ls-tree --name-only main \| grep godot`) | manual; nenhuma régua cobre |

## O cliente Godot desktop: não foi abandonado, está do outro lado da divergência

O que é fácil concluir errado, e o que está medido:

- **PR #11** (@woliveiras) propunha o Godot **reorganizando a raiz do repositório**. Foi
  **fechado sem merge**: a auditoria da época (`docs/historico/RELATORIO-ANALISE.md` §4)
  recusou a **direção** — trocar o cliente web custaria o superpoder do produto (link → jogando
  em segundos) — e recomendou aproveitar as ideias.
- **PR #14 foi MESCLADO** em `main` em **18/07/2026** (merge `57a5187`): o mesmo cliente
  Godot, **isolado em `godot/`**, sem tocar no cliente web. São **382 arquivos** e **13
  commits** de William Oliveira.
- A `v2/alpha` saiu de `main` **antes** desse merge, então `godot/` **não existe nesta
  branch**. Não é abandono: é divergência.

**O estado honesto:** existe na `main`, não está na branch de trabalho da v2, e **precisa de
decisão do dono no merge** — manter, mover para repositório próprio, ou arquivar com
agradecimento. Nenhuma dessas três é "deixar acontecer sozinho", e a única errada é a que
acontece por descuido de merge.

O contrato original continua valendo e é a única proteção escrita que existe: o cliente Godot
vive em `godot/`, o `public/` + Astro seguem canônicos e intocados, o `vercel.json` continua
apontando para o build do Astro, e o merge é `--no-ff`.

---

## O que este arquivo dizia antes, e o que vale hoje

Roadmap que lista coisa morta desorienta mais que roadmap curto. O que mudou, com onde está a
decisão nova:

| Assunto | O que este arquivo dizia | O que vale hoje |
|---|---|---|
| **Estrutura do plano** | "Fases 1 a 4" | **substituída** pelos degraus 0-10 do `plans/08` — a numeração antiga não corresponde a nada em execução |
| **Arquitetura de dois clientes** com `shared/*.json` | fonte da verdade compartilhada entre web e Godot | **nunca começou** (`ls shared` → não existe). A direção "conteúdo como dado" sobrevive; o contrato entre engines não é escopo enquanto o Godot estiver do outro lado da divergência |
| **Multiplayer com servidor autoritativo** | Fase 3, "salas via WebRTC num servidor autoritativo leve" | **contraditado por decisão posterior**: WebRTC **P2P**, com o servidor criado pelo próprio usuário. O `plans/03` defende o contrário no próprio título — ele precisa ser **reescrito**, não seguido |
| **Ranking global sempre ligado** | Fase 3/4 | **desligado hoje** (`RANKING_ON`), trocado por telemetria anônima. Volta em duas categorias: SP no release, MP na v2.1 — e **partida P2P não pode submeter no `submit_match`** |
| **Licença permissiva** (`plans/06 §1.2`) | recomendada por causa de Steamworks e crédito de IA | **revertida**: decisão registrada de migrar para AGPL-3.0, ainda não aplicada — [Licença, arte e marca](LICENCA.md) |
| **Cliente Godot** | trilha paralela a começar quando a Fase 2 existir | **existe e está mesclado na `main`** — ver a seção acima |
| Fix do Vercel Analytics, `/mapa` com tabela | Fase 4 | `/mapa` existe; o resto entra no degrau 9. **Não re-verificado** nesta revisão |

---

## Onde continuar

| Você quer | Vá para |
|---|---|
| o plano executável, com números e perguntas abertas | [`plans/08-RELEASE-PROFISSIONAL.md`](../plans/08-RELEASE-PROFISSIONAL.md) |
| o estado medido do portão | [Estado medido](docs/estado.md) e [`KNOWN-BUGS.md`](../KNOWN-BUGS.md) |
| a ordem de trabalho de hoje | [`PROMPT.md`](../PROMPT.md) |
| ideias soltas, não priorizadas | [`IDEAS.md`](IDEAS.md) |
| licença, arte paga e marca | [Licença, arte e marca](LICENCA.md) |
