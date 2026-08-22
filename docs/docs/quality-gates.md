---
id: quality-gates
title: 'O quality gate: invariantes, procedência e mutação'
sidebar_label: Quality gates
sidebar_position: 4
description: O que é uma invariante neste repo, como se escreve uma, as duas leis da casa com o caso real de cada uma, e o teste de mutação da própria régua.
---

# O quality gate: invariantes, procedência e mutação

O quality gate deste repositório é um arquivo: `tools/eval/invariants.mjs`. Ele roda em node puro
e sai com código 1 se qualquer invariante **crítica** falhar. É o que o CI executa em todo
PR (`.github/workflows/ci.yml`).

{/* BEGIN:GERADO:invariantes — não edite à mão, rode `npm run docs` */}

- `tools/eval/invariants.mjs`: **2.275 linhas**, **65 identificadores de invariante declarados** (`put()`), dos quais **28** têm caminho de `skip()` declarado.
- O arnês inteiro são **203 scripts** em `tools/eval/` (`.mjs` + `.py`), mais **54 scripts** de pipeline em `tools/`.
- Quantas invariantes rodam como **críticas** numa execução **não é derivável do fonte**: depende de qual insumo existe na máquina (o JSON do auditor de viewmodel, um GLB, uma pasta de anims). Esse número só sai rodando o quality gate — e o lugar dele é o cabeçalho do `KNOWN-BUGS.md`, atualizado com saída real.

Reproduza:

```bash
grep -o "put('[A-Z0-9_]*'"  tools/eval/invariants.mjs | sort -u | wc -l
grep -o "skip('[A-Z0-9_]*'" tools/eval/invariants.mjs | sort -u | wc -l
```

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `grep -o "put('[A-Z0-9_]*'" tools/eval/invariants.mjs | sort -u | wc -l`

{/* END:GERADO:invariantes */}

O terceiro item acima é a distinção que mais confunde quem chega: **identificador
declarado ≠ invariante avaliada.** Várias viram `skip` em vez de `put` quando falta o
insumo delas (o JSON do auditor de viewmodel, um GLB, uma pasta de anims). `skip` é
**quality gate verde por ausência de dado**, e é por isso que ele sempre carrega o motivo. Ver
"Severidade", abaixo.

Esta página é a mais útil do site. Se você só for ler uma, leia esta.

## Por que ele existe

Do cabeçalho do próprio arquivo, `tools/eval/invariants.mjs:5-19`:

> O dono passou 3 dias num ciclo em que cada rodada consertava uma coisa e quebrava
> outra, e a gente só descobria uma rodada depois. A causa não era falta de cuidado:
> era falta de RÉGUA. Um crítico (humano ou agente) julga screenshot; consistência e
> flow são propriedades do jogo **EM MOVIMENTO**, e quase todo defeito que ele reportou
> não é gosto — é invariante violada.

E a tradução, que é a coisa mais importante deste repositório inteiro:

| O que o dono disse | Qual invariante isso virou |
|---|---|
| "as mãos estão soltas no ar" | distância mão↔grip tem um teto |
| "a arma aponta pra baixo" | o cano tem um ângulo máximo |
| "no ADS não vejo a arma nem a mira" | a arma tem área mínima e máxima |
| "sniper sem zoom" | FOV mirando &lt; FOV de quadril |
| "várias armas com visual igual" | silhuetas têm que diferir |
| "o bot atira do nada" | dano exige LOS anterior |
| "tem 2 me eliminando" | 1 killfeed por morte |

`tools/eval/invariants.mjs:20-21`:

> **REGRA DE OURO: nada é commitado com invariante VERMELHA. E todo bug novo que o dono
> reportar vira uma invariante aqui — é assim que ele nunca volta.**

## O que é uma invariante aqui

Uma invariante é uma **propriedade do jogo que dá pra medir sem um humano olhando**, com
um teto ou uma faixa que tem procedência. Não é teste unitário: quase nenhuma invariante
testa uma função. Elas medem o **estado do jogo rodando de verdade**.

Três formas, todas presentes no arquivo:

**1. Lida do código-fonte.** Barata, roda em milissegundos, pega classes inteiras de bug.
Exemplo real, `tools/eval/invariants.mjs:1439-1446`:

```js
// ARM1 — toda arma com luneta precisa de zoom de verdade. "Snipers sem zoom"
// é reclamação literal; a solução NÃO é tirar a luneta, é fazer a certa.
const bloco = gsrc.slice(0, gsrc.indexOf('};', gsrc.indexOf('const WEAPONS')) + 2);
const linhas = bloco.split('\n').filter((l) => /^\s*\w+:\s*\{/.test(l));
const semZoom = linhas.filter((l) => /scope:\s*true/.test(l) && !/spreadScope/.test(l))
  .map((l) => l.trim().split(':')[0]);
put('ARM1', 'toda arma com scope:true declara spreadScope', semZoom.length === 0,
  semZoom.length ? semZoom.join(', ') : `${linhas.length} armas conferidas`);
```

**2. Medida no jogo real rodando em node.** `tools/eval/harness.mjs` sobe a classe `Game`
de verdade, com os mapas de verdade, com DOM/canvas stubado. É o **código de produção**
que é medido, não uma reimplementação — `tools/eval/botsim.mjs:8-9`: *"se o número
melhorar aqui, melhorou no jogo"*. Daqui saem BOT1–BOT8, MAP1–MAP3, CTF1, MAT1/MAT2,
FOG1, TEX1, VM14, MOD1/MOD2.

**3. Medida na geometria dos assets.** `vm-mint-audit.mjs` abre todos os GLBs de arma com um
parser de GLB próprio e projeta o viewmodel na tela. Daqui saem VM1–VM19.

O que **não** cabe aqui: invariante que exige pixel de browser. Essas estão marcadas
`browser` e são puladas, com o motivo dito — SwiftShader custa ~4 min por carga de mapa
nesta máquina (`tools/eval/invariants.mjs:99`).

### Severidade

`put(id, desc, ok, evid, sev)` aceita `'crit'` (padrão) ou `'warn'`
(`tools/eval/invariants.mjs:81-82`). Crítica vermelha reprova o PR. Warn é ruído medido que
alguém precisa olhar mas não bloqueia — é onde vivem BOT1/BOT2/BOT3/BOT6/BOT7, ARM4 e
ARM5. `skip()` é o terceiro estado, e ele é **perigoso**: quality gate verde por ausência de
dado. Por isso todo `skip` carrega o motivo.

## As duas leis da casa

### Lei 1 — Intenção que não vira invariante é otimizada para fora

**Fonte: `tools/eval/invariants.mjs:452-461`.** O caso, literal:

> a rodada anterior levou o quality gate de **16/21 para 19/21 sem afrouxar um teto sequer** e
> mesmo assim foi **REPROVADA** pelo dono, porque para fechar VM5/VM10 ela **ZEROU o
> `VM_OFF` y** e mudou o look em silêncio. Nenhuma invariante codificava "onde fica a
> boca do cano", então a métrica foi otimizada e a INTENÇÃO foi destruída. Lei de
> Goodhart, na íntegra. **INTENÇÃO QUE NÃO VIRA INVARIANTE É OTIMIZADA PARA FORA.**

Leia de novo o que aconteceu, porque é contraintuitivo: o agente **não trapaceou**. Ele
não afrouxou nenhum teto. Ele subiu o placar de verdade. E o resultado foi pior, porque
`VM_OFF[1]` é o termo que **domina a posição da arma na tela** — `public/js/game.js:555`
declara `VM_OFF = [0.03, -0.1000, 0]`, e `tools/eval/invariants.mjs:1163` mede a
sensibilidade: *"tirar o recuoZ move o grip 3,5 cm; tirar o VM_OFF move 23 cm"*.

Zerar esse termo fechou duas invariantes e apagou a decisão estética que o dono tinha
tomado — que não estava escrita em lugar nenhum que a régua pudesse ler.

**A correção não foi punir o agente. Foi escrever a intenção como invariante.** Hoje
existe a VM12 (`tools/eval/invariants.mjs:497`): *"look CS 1.6: boca do cano LOGO abaixo
da mira (y entre 0,50 e 0,62) nos 2 aspectos"*. Com ela no lugar, a mesma otimização
fica **vermelha**.

E a consequência operacional, do mesmo comentário:

> Quem quiser mudar o look tem que mudar **ESTE teto** explicitamente, num diff que o
> dono vê, em vez de mexer no `VM_OFF` e reportar "+3 invariantes".

:::tip O que isso significa pro seu PR
Se a sua mudança melhora o placar do quality gate, a primeira pergunta é: **o que eu mudei que
o quality gate não olha?** Se a resposta for "o look", "o feel" ou "a sensação", escreva a
invariante antes de mandar o PR — ou explique no PR por que ela não cabe.
:::

### Lei 2 — Teto sem procedência é opinião

**Fonte: `tools/eval/ref-measure.py:1-40`.** Essa docstring é a doutrina da casa. O caso:

Durante **três dias** o quality gate de armas foi resolvido contra números **asseridos**:

- A VM12 exigia *"boca do cano em y ≥ 0,66"*.
- O doc do `vmattach.js` dizia *"coronha INTEIRA no canto"*.

Nenhum dos dois foi medido em imagem nenhuma. Segundo `tools/eval/invariants.mjs:461-463`,
o piso 0,66 veio de um comentário do `public/js/vmattach.js` — *"a boca fica a ~0,66H"* —
que por sua vez veio de um vídeo assistido. (O comentário do quality gate aponta para
`vmattach.js:387-392`; hoje o texto está em `vmattach.js:395`, porque o arquivo andou. É
exatamente o motivo de o `ARCH.md` ser gerado — ver [Arquitetura](./arquitetura.md).)

O dono olhou o resultado e disse, literal (`ref-measure.py:14-17`):

> "está diferente do CS 1.6 e do Quake e do UT; nesses 3 a arma está sempre no canto
> inferior direito e a coronha sempre FORA; depois de 3 dias e uma pasta inteira de
> referência nem você nem o Kimi entendeu isso."

Aí os frames foram **medidos**. `tools/eval/ref-measure.py` faz segmentação por cor no
quadrante inferior-direito, pega a maior componente conexa, e escreve
`tools/eval/ref_viewmodel.json`. Resultado:

| Frame | Boca (x, y) | Área na tela | Ângulo do eixo | Cruza a borda direita? |
|---|---|---:|---:|---|
| `cs16_ak_dust.jpg` | 0,564 ; **0,513** | 9,76% | 28,0° | sim |
| `cs16_m4_dust.jpg` | 0,569 ; **0,598** | 9,78% | 34,8° | sim |
| `valorant_vandal.jpg` | 0,648 ; **0,587** | 13,09% | 4,6° | sim |

**Os dois números asseridos estavam errados:**

1. A boca do CS 1.6 fica em **0,513–0,598** — logo abaixo da mira (0,5), 1 a 10 pontos
   percentuais abaixo do centro. Não em 0,66–0,93. O piso errado estava mantendo a nossa
   arma **afundada** em 0,667–0,816 (`tools/eval/invariants.mjs:472-475`).
2. A coronha **SAI pela quina** nos 3 frames. Sair é o padrão, não o defeito
   (`ref_viewmodel.json` → `faixas.cruzaBordaDireita: true` nos 3).

E o dano colateral: com o teto falso, o solver da rodada anterior *"provou"* que 3% de
área era inviável. A prova estava certa **contra aquele teto** — e o teto é que era falso
(`tools/eval/invariants.mjs:476-478`).

A regra que ficou, `tools/eval/ref-measure.py:21-22`:

> **TETO DE INVARIANTE SÓ ENTRA COM PROCEDÊNCIA — arquivo de referência, pixel medido, e
> este script reproduzindo o número. Número sem imagem é opinião.**

Hoje as invariantes de enquadramento carregam a procedência no próprio texto: VM1 (faixa
0,50–0,60, ref 0,520–0,565), VM3 (22–42°, ref 28,0° e 34,8°), VM5 (6–16%, ref
9,76–13,09%), VM12 (0,50–0,62, ref 0,513–0,598), VM16 (fatia na borda direita 0,02–0,20,
ref 0,053–0,095).

:::note Procedência inclui admitir o que a imagem NÃO mede
`tools/eval/invariants.mjs:599-602` recusa criar um teto para "quanto da arma fica fora
do quadro", porque o que está fora é invisível na foto — não dá pra saber se a coronha do
AK termina 5 cm ou 50 cm além da borda. Os números continuam no JSON como **evidência,
sem gate**. Isso é procedência levada a sério: a régua diz onde ela para de saber.
:::

E o mesmo rigor morde quem escreveu a régua, no caso mais desconfortável possível: **as
fotos de referência de personagem chegaram, foram medidas, e foram REPROVADAS pela própria
régua.** `tools/eval/char-probe.mjs:25-45` conta o episódio inteiro — `references/funkeiros/`
tem 23 arquivos e `references/palhacos/` tem 21, todos passados pelo `ref-body.py`, com as
máscaras **olhadas** (`--masks`). O veredito, dito na cara pelo próprio comentário: são
selfies e closes; a segmentação heurística devolve a mão, um pedaço de jaqueta ou o cabelo
de outra pessoa no fundo, e a razão ombro/altura sai entre **0,42 e 3,78** quando um humano
mede 0,259. Sobra ~1 foto de corpo inteiro utilizável — não é amostra.

O `ref-body.py` exige **6 fotos aceitas** para um teto virar medido, e ele **diz por que
não virou**. Então o teto absoluto do CHR1 continua sendo **fallback publicado** (Drillis &
Contini 1966, via Winter), declarado como tal no campo `procedencia` do JSON e na coluna do
relatório.

Repare no que isso significa: ter a foto **não** é ter a medição. Foi mais fácil aceitar
que os dados eram ruins do que promover uma medição frágil a teto — e essa é a Lei 2
aplicada contra o interesse de quem escreveu a régua.

:::warning `references/` NÃO vem no clone — e isso é decisão, não descuido
`git ls-files references` devolve **zero**. Em 04/08/2026 a pasta inteira foi
destrackeada por decisão do dono ("podem ficar local o references porque vamos construir
local"): são as telas-alvo da UI e os frames de referência do viewmodel, e ficam só na
máquina dele.

O que **sobrevive ao clone são os NÚMEROS medidos delas**: `tools/eval/ref_ui.json` e
`tools/eval/ref_viewmodel.json` estão versionados. Esse é o contrato — se uma régua sua
precisar rodar em CI, ela lê o JSON, nunca o PNG. Régua que abre imagem de
`references/` fica vermelha em toda máquina que não seja a do dono, e vermelha por
ambiente é a pior espécie: ensina quem trabalha aqui a ignorar vermelho.
:::

## Teste de mutação da própria régua

Esta é a parte que quase nenhum projeto tem, e é onde este repositório é genuinamente
diferente.

**Um quality gate que não se mexe quando você quebra o código de propósito está cego.**

O jeito de descobrir isso é mutar: pegue o código corrigido, **desfaça a correção de
propósito**, rode o quality gate, e veja se ele fica vermelho. Se ficar verde, o quality gate não
está medindo o que você acha que ele mede.

### O caso: 20/22 verde com a correção removida

**Fonte: `tools/eval/invariants.mjs:910-920`.**

O contexto: `public/js/game.js:577` declara

```js
const vmOffY = (aspect) => VM_OFF[1] * ((16 / 9) / (aspect || 16 / 9));
```

É a correção de enquadramento vertical por aspecto — o motivo de a arma ficar no mesmo
lugar em 16:9 e em 3:2 (o dono joga em 3:2). Ela é **chamada** no argumento Y de
`this.vm.root.position.set(...)`, em `public/js/game.js:4873`.

O buraco, medido em 08/2026:

> a etapa `vmOff` conferia só `/this\.vm\.root\.position\.set\(\s*VM_OFF\[0\]/` — o termo
> X. O termo Y não era conferido por ninguém, e o auditor (`vm-mint-audit.mjs:196`,
> `loadOffYFn`) lê a **DECLARAÇÃO** `const vmOffY = (aspect) => ...` por regex **sem nunca
> perguntar se alguém a CHAMA**.
>
> Resultado: trocando no `game.js` a chamada `vmOffY(...)` por `VM_OFF[1]` no argumento Y
> — isto é, **removendo por inteiro a correção de enquadramento vertical por aspecto** — o
> quality gate inteiro seguia **VERDE (20/22, com VM9, VM10, VM12 e VM15 todas verdes)**. Um
> quality gate que não distingue o build corrigido do build sem a correção não está medindo
> nada.

Repare no mecanismo do erro, porque ele se repete em qualquer linguagem: **a invariante
lia a *declaração* de uma constante, e não o *uso*.** Declarar e não chamar é o jeito mais
barato de uma correção sumir com o quality gate verde.

O conserto foi cirúrgico e vale copiar. A AUD1 hoje separa os três argumentos do
`position.set(...)` com um **varredor de parênteses** — não `split(',')`, que cortaria
dentro da chamada de função — e exige **nominalmente** que o argumento Y chame `vmOffY(`.
E fecha o outro caminho junto (`tools/eval/invariants.mjs:1148-1151`): a fórmula do
`vmOffY` é **lida do `game.js` e avaliada** em 16/9, e tem que dar exatamente `VM_OFF[1]`.

> Os dois cheques juntos cobrem os dois jeitos de a correção sumir: **apagar a CHAMADA**
> (mutação medida em 08/2026) ou **adulterar a FÓRMULA**.

### Não foi um caso isolado — foram três

O mesmo buraco apareceu em outros dois lugares, e cada um virou uma etapa nova da AUD1:

| Mutação | Placar com a correção desfeita | Causa do falso verde | Onde |
|---|---|---|---|
| Trocar `vmOffY(...)` por `VM_OFF[1]` no argumento Y | **20/22 verde** | a invariante lia a declaração, não o uso | `invariants.mjs:910-920` |
| Trocar `g.rotation.set(pit, yaw, t.roll)` por `g.rotation.set(0, 0, t.roll)` | verde | a tabela `VM_FRAME.cls` continua com os ângulos, e os três espelhos continuam batendo **entre si** | `invariants.mjs:932-944` |
| Apagar `* (weaponCFG(id).vm ?? 1)` da escala do mesh | **28/37 verde, AUD1 inclusive** ("pior Δescala 0.0004") | as duas pontas leem `vm` de `weapons.js`; **o `game.js` nunca é perguntado** — era o auditor conferindo a si mesmo | `invariants.mjs:971-975` |
| Mutar `this._adsPose['pistol']` | **20/22 verde** | o ADS não tinha invariante nenhuma | `invariants.mjs:1185` |

O padrão comum das quatro é o mesmo, e é o que você deve procurar na sua invariante:

:::danger O padrão do falso verde
**A régua está conferindo uma cópia da regra em vez do jogo.** Seja porque lê a declaração
e não o uso, seja porque compara dois espelhos que leem a mesma fonte, seja porque a
tabela de parâmetros continua correta enquanto ninguém a aplica. Se as duas pontas da sua
comparação puderem ficar consistentes **sem passar pelo código de produção**, sua
invariante está cega.
:::

`tools/eval/mat-check.mjs:18-27` resolve isso da forma mais direta possível: o corpo do
`fixVmMaterials` é **recortado do `game.js` e executado** sobre um material-sonda. Se o
código mudar, a régua muda junto. *"uma régua que carrega uma CÓPIA da regra mente no dia
em que a regra muda."*

### Mutação como coisa de primeira classe: `ui-check.mjs`

O arnês de UI tem uma **tabela de mutações versionada**, e cada uma declara qual quality gate
tem que ficar vermelho. `tools/eval/ui-check.mjs:1046-1050`:

> Cada mutação DESFAZ um dos consertos desta rodada (ou fura um quality gate de propósito) e diz
> qual quality gate TEM que ficar vermelho. **Uma régua que não reprova a versão anterior do
> próprio arquivo não é régua, é decoração.**

Rodar uma:

```bash
MUT=ui1_ctf_scrim_fraco node tools/eval/ui-check.mjs   # espera UI1 VERMELHA
MUT=ui3_prompt_na_mira  node tools/eval/ui-check.mjs   # espera UI3 VERMELHA
MUT=ui2_prompt_eterno   node tools/eval/ui-check.mjs   # espera UI2 VERMELHA
MUT=ui4_ctf_sem_relogio node tools/eval/ui-check.mjs   # espera UI4 VERMELHA
```

As 7 mutações estão em `tools/eval/ui-check.mjs:1051-1134`. Duas mecânicas: `css` reescreve
o `public/style.css` **lido em memória** (nunca em disco — outros agentes estão editando o
arquivo agora), e `sim` monkey-patcha o objeto `Game` já bootado. Se a mutação `css` não
casar com nada, o script sai com código 2 dizendo *"o CSS mudou de forma"* — porque uma
mutação que não aplica também é um falso verde (`ui-check.mjs:1164`).

## Como escrever uma invariante

Checklist, na ordem:

1. **Comece pela frase do defeito.** Literal, com as palavras de quem reclamou. Todo
   arnês desta base começa assim, e não é estilo: é o que impede a invariante de medir
   outra coisa. Ver o cabeçalho de `tools/eval/map-check.mjs:5-12` — cinco frases do dono,
   cinco invariantes.
2. **Traduza para uma grandeza mensurável.** "os jogadores estão SUBMERSOS EMBAIXO DA
   ESTÁTUA" → *existe geometria visível do mapa cujo topo passa de 0,30 m acima do chão
   local naquele ponto* (MAP1). Note que a definição operacional inclui **por que 0,30 m**:
   é o degrau que o corpo sobe; acima disso não é "passar por cima", é "estar dentro".
3. **Ache a procedência do teto.** Arquivo de referência + pixel medido + script que
   reproduz. Se não existir, **diga que é fallback** e cite a fonte publicada, como o C1
   faz. Nunca invente o número.
4. **Meça o código de produção, não uma cópia dele.** Importe o módulo real, recorte a
   função do arquivo e execute, ou exija nominalmente a chamada no texto do fonte.
5. **Mute e confirme que fica vermelha.** Desfaça a correção que você acabou de fazer e
   rode o quality gate. Se ficar verde, sua invariante está cega — volte pro passo 4. Se der pra
   automatizar, registre a mutação numa tabela, como o `ui-check.mjs` faz.
6. **Escreva a evidência, não só o booleano.** O quarto argumento do `put()` é o que
   alguém vai ler daqui a três meses: `"0,504 a 0,619 da altura em 52 medidas | 0 fora da
   faixa"` é útil; `"ok"` não é.
7. **Escreva o comentário de procedência acima dela.** Em português, dizendo o que
   aconteceu quando o número estava errado. É esse comentário que impede a próxima rodada
   de refazer o erro.

### Anti-padrões que já custaram caro aqui

| Anti-padrão | O que deu |
|---|---|
| Ler a declaração de uma constante em vez do uso | 20/22 verde com a correção removida |
| Dois espelhos que leem a mesma fonte | 28/37 verde, "pior Δescala 0.0004", com o knob desligado |
| Adaptador de formato quebrado em silêncio | VM1–VM6 ficaram **PULADAS desde que o auditor existe** — 6 invariantes de viewmodel que nunca rodaram uma vez (`invariants.mjs:121-127`) |
| Medir o vão contra o chão local errado | pickup dentro da piscina reportava vão **0,0000 — VERDE** (`pickup-check.mjs:20-23`) |
| "waypoint ≤ 3 m" como proxy de alcance | 74 falsos-positivos e verde em bolsão fechado (`pickup-check.mjs:34-42`) |
| Piso sem teto | "boca ≥ 0,66" aceita a boca em 0,95 (arma no porão) — foi assim que chegamos a 0,816 (`invariants.mjs:432-434`) |
| Medir num mundo onde o defeito não pode acontecer | `eval:site` cobre `/ranking` e **checa corpo**, e passou um dia inteiro verde com a página servindo **200 com 0 bytes** em produção: ele sobe um `astro dev` local, onde `public/js` existe e o `ENOENT` não ocorre (BUG-49) |
| Aceitar status como prova de página viva | o mesmo BUG-49: `status === 200` chamava de saudável uma casca vazia. Corpo agora é cobrado por **tamanho** |
| Número medido que ninguém reprova | `gl-metrics.mjs` media calls/triângulos desde a rodada 3 e nenhuma cláusula lia o resultado; o teto só existia como prosa num comentário. o estacionamento da Loja H (`loja_h`) chegou a 4.347 calls antes de alguém olhar |
| Policiar artefato em vez de fonte | `mapa-id-check` varria `public/docs/` (saída do Docusaurus) e ficava vermelha quando o bundle publicado estava uma geração atrás de um rename — vermelho sem defeito |
| Régua que se acusa | a mesma: ela precisa citar os ids antigos para cobrá-los, e se varria a si mesma. Nove ocorrências, todas dela |

## Esta página é a doutrina. O passo a passo é uma skill

O que fazer, na ordem, quando alguém reporta um defeito — reproduzir, medir antes de
consertar, refutar o palpite óbvio, mutar a régua, rodar o quality gate na ordem certa e reportar
o que **não** foi verificado — está em `.claude/skills/bug-hunt/SKILL.md`, com o caso real
que comprou cada regra. Ela é escrita para agente **e** para gente, e aponta de volta para
esta página em vez de repeti-la.

## Portões que NÃO cabem no `check`, e por quê

Três réguas exigem insumo que o portão rápido não tem — navegador, ou o build pronto. Elas
ficam de fora de propósito e são passo de pré-deploy, junto do `eval:boot`. Cada uma nasceu
de um defeito que os portões existentes não podiam ver:

| Comando | O que mede | O buraco que fechou |
|---|---|---|
| `npm run eval:ssr` | toda página `prerender = false` entrega **corpo**, medido no artefato do build, entrando no diretório da função (o cwd de produção) | `/mapa`, `/ranking` e `/u/*` serviram **200 com 0 bytes** por um dia. O `eval:site` mede um `astro dev` local, onde o defeito não pode acontecer |
| `npm run eval:cena` | teto de draw calls e triângulos por frame, **por mapa** | o número era medido desde a rodada 3 e ninguém reprovava. Descobriu que o mapa da Quebrada custa 1.8 k calls e roda a metade do fps dos outros |
| `npm run eval:mapid` | nenhum id no estilo Counter-Strike sobrevive, todo id antigo resolve, e toda prévia existe em disco | renomear id sem renomear a imagem deixa cartaz quebrado no menu: 404 no navegador, **nada** no build |

O teto do `eval:cena` mora em `tools/eval/cena-tetos.mjs`, importado tanto pela régua de
navegador quanto pelas cláusulas `CENA` do `invariants.mjs` — um limiar, dois leitores. Dois
números para o mesmo conceito é o instrumento discordando de si, e isso já custou uma rodada
inteira aqui.

## Rodar o quality gate

```bash
node tools/eval/invariants.mjs           # tudo que roda sem browser
node tools/eval/invariants.mjs --json    # saída pra máquina
npm run check                            # syntax + quality gate + vm + coice + bots
npm run check:fast                       # segundos — rode este primeiro, sempre

# pré-deploy: exigem navegador ou build, e por isso ficam fora dos de cima
npm run eval:boot                        # o jogo ABRE?
npm run build && npm run eval:ssr        # página SSR entrega corpo?
npm run eval:cena                        # custo de cena dentro do teto?
```

Fontes atuais de produção, dados e dívida conhecida: [Estado atual](./estado.md).
