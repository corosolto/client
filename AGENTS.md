# AGENTS.md — porta de entrada

Você acabou de chegar num repositório onde **documentação errada é o defeito mais caro que
existe**. Este arquivo não repete o que já está escrito em outro lugar: ele diz **as regras
que valem antes da primeira linha de código** e **para onde ir** para cada assunto.

Se você se pegar escrevendo aqui um fato que já mora em outro arquivo, pare e escreva um
link. Já foram encontrados quatro lugares diferentes com o mesmo número escrito à mão, todos
desatualizados. Duplicar é criar o quinto.

---


## Antes de escrever régua ou mexer em asset: `docs/LICOES.md`

14 lições, cada uma com o caso real e o número que a comprou. Elas existem porque
sem esse arquivo todo agente novo redescobre os mesmos buracos — e paga de novo.

Atalhos por tarefa:
- **escrever régua** → lições 1-4 e a skill `regua`
- **mexer em asset ou build** → 5, 11, 12, 14
- **gerar arte com pessoa real** → 9
- **portão VERDE e o dono dizendo que está errado** → 1 e 3 (o caso mais importante
  desta base, e o mais mal resolvido)

## O que é este projeto

FPS de navegador em **Three.js vanilla, zero build**, em `public/`, servido por um site
**Astro com SSR** na raiz (`src/`), com **Supabase** para ranking e telemetria. Sátira
cultural brasileira, jogável num link, sem instalar nada.

A v1 chegou a mil jogadores por dia com gráfico nível Minecraft. A v2 persegue a
**jogabilidade, a uniformidade e a animação do CS 1.6** — o alvo é **consistência**, não
fidelidade de CoD. O dono se chama Ruben, responde em português, joga em **3:2** e revisa
olhando screenshot. **Ele acerta com mais frequência do que a métrica:** quando ele diz que
algo está errado e o quality gate está verde, o defeito é do quality gate.

## As duas zonas

<!-- BEGIN:GERADO:zonas — não edite à mão, rode `npm run docs` -->

| Zona | O que é | Tamanho medido | Regra |
|---|---|---|---|
| `public/` | o **jogo** | 42 arquivos `.js`, 30.748 linhas · Three.js `r160` vendorizado | ES modules servidos crus, **zero build**, sem dependência de runtime |
| `src/` | o **site** | 18 páginas `.astro`, 19 rotas `/api` · Astro `^7.1.1` | framework é bem-vindo; `service_role` só no servidor |
| `tools/` | o **arnês** | 180 scripts em `tools/eval/`, 54 em `tools/` | node puro: sobe o jogo real sem browser |

**Não existe `public/index.html`.** O HTML do jogo é `src/pages/index.astro`, servido na rota `/`. Servir `public/` estaticamente entrega os arnêses visuais, **não o jogo** — é a pegadinha que custa a primeira hora de todo mundo.

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `git ls-files 'src/pages/**/*.astro' 'src/pages/api/*.ts' public/index.html`

<!-- END:GERADO:zonas -->

**`public/` não pode ganhar dependência de runtime nem passo de build.** Isso não é
conservadorismo: é o que permite `tools/eval/harness.mjs` subir a classe `Game` real em node
puro em segundos — que é o que faz o quality gate existir. Um bundler no meio quebraria a régua
junto com a portabilidade. Three.js é vendorizado em `public/vendor/`; não adicione CDN.

**Mexeu em `public/js/*.js`? Preserve o cache-bust por conteúdo** — o import map de
`src/pages/index.astro` e o arnês usam o manifesto recursivo de `scripts/module-cache.mjs`.
`public/js/version.js` continua sincronizado com `package.json` pelo release.

O porquê completo de cada regra da fronteira está em
[`docs/docs/stack.md`](docs/docs/stack.md).

---

## As leis da casa

Não são estilo. Cada uma custou dias; os casos completos estão em
[`docs/docs/quality-gates.md`](docs/docs/quality-gates.md).

**Comentários no código têm orçamento quase zero.** Não narre o que a linha faz nem cole o
histórico da investigação. Só comente uma invariante, compatibilidade ou risco que os nomes não
consigam expressar, em no máximo duas linhas, apontando para a issue ou doc quando precisar de
contexto. Evidência, antes/depois e cronologia ficam em `KNOWN-BUGS.md` ou `docs/`.

**1 · Régua antes do conserto.** Escreva a medição, prove que ela **reprova** o estado atual,
só então conserte. Intenção que não vira invariante é otimizada para fora: uma rodada levou o
quality gate de 16/21 para 19/21 sem afrouxar um teto sequer e foi reprovada, porque para fechar
duas invariantes destruiu em silêncio uma decisão estética que nenhuma régua codificava.

**2 · Teto sem procedência é opinião.** Todo número novo cita **arquivo de referência +
pixel medido + o script que reproduz**. Três dias foram gastos perseguindo dois números
asseridos que a referência contradizia. O padrão de qualidade desta base é a docstring de
`tools/eval/ref-measure.py` — leia antes de propor qualquer teto.

**3 · Toda invariante vem com a mutação que a faz ficar vermelha.** Um quality gate que não se mexe
quando você quebra o código de propósito está cego. Caso real: um mutante que desfazia
inteiramente a correção do enquadramento passava **20/22 VERDE**, porque a invariante lia a
*declaração* de uma constante e não o *uso*. Outros três buracos iguais foram achados depois.
Se ela não morde, ela não existe.

**4 · Gere a figura e OLHE.** Número sem imagem já enganou este projeto quatro vezes. Se a
mudança é visível, capture, olhe, e **descreva o que você viu** — não o que você esperava
ver.

**Corolário que vale para você especificamente: quem constrói nunca dá a nota.** Um agente
lê o próprio resultado através da justificativa que ele mesmo construiu. Antes de considerar
uma frente pronta, rode um crítico adversarial com contexto limpo. O ciclo inteiro está em
[`docs/docs/instrumentacao-ai.md`](docs/docs/instrumentacao-ai.md) e em
`.claude/skills/gauntlet-fps/SKILL.md`.

**Vai consertar um defeito? As quatro leis acima viram passo a passo na skill `bug-hunt`**
(`.claude/skills/bug-hunt/SKILL.md`), com o caso real de cada uma e o fluxo operacional —
onde registrar, em que ordem rodar o quality gate, e como reportar o que **não** foi verificado.
Ela vale para agente e para gente. Como a `gauntlet-fps`, ela nasceu aqui e vive em
`.claude/skills/` porque `.agents/skills/` é gitignored (skill de terceiro, fixada por hash).

**Todo commit leva o trailer `Agent:`** (ex.: `Agent: Kimi Code`; humano leva
`Agent: humano`) — é o que sustenta o "cada commit diz qual" do README. Você não
digita: o `.githooks/prepare-commit-msg` preenche pela assinatura do ambiente, e
`AGENTE="Claude Code (Opus 5)"` tem precedência quando você quer nomear o modelo.
O `commit-msg` **recusa** commit sem o trailer e commit acima de 15 arquivos ou
800 linhas sem um `Commit-grande:` dizendo por quê. A convenção completa, com a
medição que comprou o teto, mora em `CONTRIBUTING.md`.

---

## Onde está cada coisa

Um assunto, um arquivo. Se você precisa da informação, é daqui que você sai.

| Você quer… | Vá para | Observação |
|---|---|---|
| o estado de hoje, em ≤100 linhas | [`STATUS.md`](STATUS.md) | comece por aqui |
| contexto, leis e o que fazer em ordem | [`HANDOFF.md`](HANDOFF.md) | auto-contido, assume que você não viu nada |
| **defeitos com evidência** | [`KNOWN-BUGS.md`](KNOWN-BUGS.md) | `arquivo:linha`, régua e reprodução por bug — **e o placar real do quality gate** |
| a ordem de trabalho de uma sessão | [`PROMPT.md`](PROMPT.md) | o que atacar primeiro, e por quê |
| **índice símbolo→linha do `game.js`** e a tabela de conflito | [`tools/eval/ARCH.md`](tools/eval/ARCH.md) | **GERADO** (`npm run arch`) — leia **antes** de tocar em `game.js` |
| o que cada script do arnês mede | [`tools/eval/README.md`](tools/eval/README.md) | inclui quais estão obsoletos |
| a régua visual vigente | [`tools/eval/BAR-CONSISTENCIA.md`](tools/eval/BAR-CONSISTENCIA.md) | **tem precedência** sobre a `BAR.md` |
| para onde o projeto vai | [`docs/ROADMAP.md`](docs/ROADMAP.md) | aponta para os planos, não os duplica |
| o plano de release, degrau a degrau | [`docs/historico/plans/08-RELEASE-PROFISSIONAL.md`](docs/historico/plans/08-RELEASE-PROFISSIONAL.md) | com o corte defendido |
| como abrir um PR que passa | [`CONTRIBUTING.md`](CONTRIBUTING.md) | linha editorial, higiene, processo |
| investigar e consertar um defeito | [`.claude/skills/bug-hunt/SKILL.md`](.claude/skills/bug-hunt/SKILL.md) | as leis viram passo a passo, com o caso real de cada uma |
| podar over-engineering de um diff; entrevistar antes de codar | `.agents/skills/` (`ponytail-review`, `grill-me`, `handoff`, `to-spec`) | terceiras, gitignored, fixadas por hash — fontes em `.agents/skills/THIRD-PARTY.md` |
| a documentação de dev inteira | [`docs/docs/`](docs/docs/) | site Docusaurus; `docs/INDICE.md` indexa os `.md` soltos |
| licença, arte paga e marca | [`docs/LICENCA.md`](docs/LICENCA.md) | as **decisões** e o porquê; quem declara é o `LICENSE`, e a tabela de superfícies vive no `CONTRIBUTING.md` |
| fronteira de segurança do backend | [`docs/seguranca.md`](docs/seguranca.md) | leia antes de mexer em `/api/*` ou `supabase/` |
| tarefas boas de primeira contribuição | [`docs/issues/`](docs/issues/) | uma por arquivo, com critério de aceite |
| por que uma decisão antiga é como é | [`docs/historico/`](docs/historico/) | arquivo morto: **não** descreve o estado atual |

---

## O quality gate, e a ordem que importa

<!-- BEGIN:GERADO:scripts — não edite à mão, rode `npm run docs` -->

```bash
npm run check        # npm run syntax && npm run audio:check && npm run eval:medianet && npm run eval:ctfhud && npm run eval:vm && npm run eval:invariants && npm run eval:kick && npm run eval:bots
npm run check:fast   # node tools/eval/runner.mjs syntax eval:release eval:telemetry eval:identity eval:error-console eval:error-origin eval:webgl eval:webglguard eval:maprotate eval:shaderlog eval:shaderbudget eval:botbrain eval:prune eval:vminspect eval:faccao eval:mapid eval:mapjson eval:mapcontrato eval:parquewheel eval:redesign eval:matchoptions eval:charvoice eval:screenquery docs:check arch:check audio:check feet:check eval:vmlabhud eval:ctfhud eval:pause eval:ctfround eval:ctfwin eval:spawn eval:regen eval:pegada eval:dmgdir eval:ctflabels anims:check anims:merge:check walls:check media:check menuwalls:check travessao:check eval:medianet eval:posters eval:grafitelayout eval:simclock eval:velhooeste eval:penitenciaria
```

`package.json` tem **107 scripts**. Vários trazem uma chave `//nome` logo acima com o motivo de existirem — é onde mora o porquê.

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `node -p "Object.keys(require('./package.json').scripts)"`

<!-- END:GERADO:scripts -->

> ### `npm run eval:vm` roda ANTES de `invariants.mjs`. Sempre.
>
> As invariantes de viewmodel **leem** o `tools/eval/vm_mint_audit.json` que o `eval:vm`
> **escreve**. Rodar as invariantes com esse JSON velho mede o viewmodel de ontem e
> **inventa vermelha**: com o JSON em `V0=80°` contra o `game.js` em `V0=42°`, a VM5 acusava
> **26/26 armas fora**; depois de regenerar, **3/26**. A ordem do `npm run check` já está
> corrigida — o cuidado é para quando você chamar `node tools/eval/invariants.mjs` na mão.
> É o **BUG-02** do [`KNOWN-BUGS.md`](KNOWN-BUGS.md).

O `check:fast` usa `tools/eval/runner.mjs`: **todos os passos rodam mesmo quando um deles
fica vermelho**, e o código de saída só é decidido no placar final. Isso evita que um defeito
conhecido esconda um quality gate novo. Leia a chave `//check:fast` do `package.json` antes de
acrescentar um passo.

**O placar do quality gate não mora neste arquivo, e não deve morar em nenhum outro além de um.**
Quantas invariantes passam **não é derivável do fonte** — depende de qual insumo existe na
máquina. O número vive colado de uma execução real no cabeçalho do
[`KNOWN-BUGS.md`](KNOWN-BUGS.md).

---

## Concorrência: quando paralelizar e quando não

**Sistema interconectado se mexe sequencialmente, por um agente só.** Arma + mão + animação
+ ADS + mira + HUD são um sistema: fan-out paralelo nele já produziu **13 regressões numa
única rodada**.

Fora desse sistema, o paralelismo é seguro **e medido** — desde que as frentes tenham faixas
de linha disjuntas:

- A partição é declarada por **símbolo**, nunca por linha (`tools/gen-arch.mjs`), e o script
  resolve símbolo → linha a cada execução. A tabela de conflito resultante está em
  [`tools/eval/ARCH.md`](tools/eval/ARCH.md). **Consulte antes de editar.**
- Em `game.js`, **edite por trecho — nunca sobrescreva o arquivo inteiro.** Uma ferramenta
  que reescreve o arquivo apaga o trabalho de quem está na outra faixa, agora.
- `constructor()`, `update()` e `_dom()` são **zona vermelha, append-only**: qualquer frente
  pode precisar deles. Acrescente no fim; não reorganize.
- **Um único agente roda browser.** Duas capturas headless em paralelo derrubam o boot e
  produzem "countdown travado" que parece bug e é carga.

Mecanismo completo: [`docs/docs/arquitetura.md`](docs/docs/arquitetura.md).

---

## Vetos do dono

Estes não se negociam. Se você acha que um deles está errado, **traga a medição** — não o
contorne.

- **Não reduza o número de armas no chão.** *"não pode deixar todas, porque é a única forma
  do usuário escolher armas — hoje não temos menu de compra."*
- **Não afrouxe teto de invariante para fechar placar.** Se achar que um teto está errado,
  meça na referência e **mostre o pixel**.
- **`AUD1` tem que ficar verde.** É a invariante que garante que o auditor mede o que o jogo
  desenha. Foi ela que pegou o quality gate mentindo. Se você mexer no caminho do viewmodel,
  **estenda a `AUD1` junto e prove com mutação**.
- **Nada de asset com copyright, nada de pessoa real, nada de gore.** É linha editorial e é
  proteção contra takedown — ver [`CONTRIBUTING.md`](CONTRIBUTING.md).
- **Segredo nunca no git.** `service_role` e `.env` só na Vercel.

---

## Como não estragar esta documentação

**Número derivável do código não se escreve à mão em lugar nenhum deste repositório.** Ele
vira bloco gerado por `node tools/gen-docs.mjs`, entre marcadores, e `npm run docs:check`
(dentro do `check:fast`) reprova quando ele diverge da árvore.

```bash
npm run docs          # regenera todos os blocos
npm run docs:check    # sai 1 se algum estiver velho — é o que roda no quality gate
npm run arch          # regenera o índice e a tabela de conflito do game.js
```

Precisa de um número que ainda não é gerado? **Estenda o gerador** e ponha o marcador. Se
não der para gerar, escreva a frase **sem o número** — ou cite o comando que o produz. Esta
é a regra que existe porque um `SKILL.md` afirmava 3.234 linhas de `game.js` quando o arquivo
já tinha o dobro; corrigir à mão dura exatamente um commit.

E o resto — o porquê, a decisão, o caso que gerou a regra — é conhecimento humano, mora em
**um** arquivo só, e os outros apontam para ele.
