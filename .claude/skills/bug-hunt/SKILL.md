---
name: bug-hunt
description: Investiga e conserta defeito no CS BRASIL / CORO SOLTO com o método que esta base pagou caro para aprender — régua antes do conserto, mutação que prova a régua, figura no tamanho em que ela é servida, e refutação do palpite óbvio antes de agir nele. Use SEMPRE que alguém reportar que algo está quebrado, errado, sumido, travando, não aparece, não toca, reinicia sozinho, "tá bugado", "não funciona", "voltou a acontecer"; quando for reproduzir, isolar, medir ou consertar um defeito; quando for escrever régua nova para um bug; e quando for abrir, atualizar ou fechar item do `KNOWN-BUGS.md`. Use também quando o quality gate estiver VERDE e a pessoa insistir que está errado — esse caso é o mais importante e o mais mal resolvido. NÃO use para melhorar o que já funciona (isso é a `gauntlet-fps`), nem para feature nova, nem para pergunta conceitual que não mexe no jogo.
---

# Caça ao defeito — CS BRASIL / CORO SOLTO

Serve para agente e para gente. Nada aqui é "reproduza, isole, conserte" — isso todo mundo já
sabe e não previne nada. O que está escrito abaixo é o que **este repositório** aprendeu
errando, cada regra com o caso real que a comprou e o ponteiro para conferir.

Se você seguir só uma linha deste arquivo, que seja esta:

> **O número que prova o defeito vem ANTES do conserto. Sem ele você não sabe se consertou —
> você sabe que mexeu.**

## Antes de tocar em qualquer coisa

Leia, nesta ordem, e não pule:

1. **[`KNOWN-BUGS.md`](../../../KNOWN-BUGS.md)** — o defeito já pode estar lá, com causa raiz,
   `arquivo:linha` e o que já foi refutado. O cabeçalho tem o placar real do quality gate, colado de
   uma execução de verdade.
2. **`docs/docs/quality-gates.md`** — as duas leis da casa e o teste de mutação. É a página
   mais útil do site. Não repito o conteúdo dela aqui; eu aponto.
3. **[`AGENTS.md`](../../../AGENTS.md)** — as regras que valem antes da primeira linha de
   código, e o roteamento para o resto.
4. `tools/eval/ARCH.md` — **rode `npm run arch` antes de ler**, ou você lê o índice de ontem.
   É de lá que sai a tabela de conflito: quem pode editar qual faixa de `game.js`.

**A entrada do `KNOWN-BUGS.md` pode estar velha, e estava.** Em 05/08, seguindo esta skill,
três defeitos listados como abertos já estavam consertados no código, com régua e tudo:
BUG-01 (a guarda de modo mora em `public/js/game.js:4358`, `_hideCtfHud` em `:4337`, o
`dispose()` chama em `:6411`, e existe `tools/eval/ctfhud-check.mjs` no `npm run check`),
BUG-03 (`public/js/game.js:5625-5639`) e BUG-04 (`public/js/game.js:12` importa o
`ViewModelRig`; ele é instanciado em `:1881`). Confira o código antes de "consertar" o que já
está consertado — e atualize a entrada quando descobrir isso.

---

## As nove leis, cada uma com o caso que a comprou

### 1 · Régua antes do conserto

Escreva a medição **primeiro**, veja ela ficar vermelha, só então mexa no código. Sem o número
de antes você não tem A/B, e sem A/B a correção é fé.

> **Caso real.** BUG-21, o ônibus da Brasília. A primeira rodada mediu bem e consertou: parede
> fantasma de 2,33 m → 0,68 m. Foi reprovada assim mesmo — *"devia ser possível andar"*. Só com
> a régua andando (`tools/eval/obb-check.mjs`, grade de 5 cm chamando o `_collide` **de
> produção**) o número virou 0,000 m. 0,68 m é meio passo, e meio passo se sente.

Corolário que vale mais que a lei: **quando o dono diz que está errado e o quality gate está verde, o
defeito é do quality gate** ([`AGENTS.md`](../../../AGENTS.md), seção "O que é este projeto"). Na 3ª
rodada do mesmo ônibus o `obb-check` estava VERDE e ele continuava certo: a régua comparava o
colisor com a **caixa declarada**, e a caixa declarada nascia do `Box3` do GLB inteiro, em toda
altura — guarda-sol, telhado de barraca e retrovisor contavam como parede na altura do peito.
Régua verde não é prova de que ele está enganado; é hipótese de que ela mede a coisa errada.

### 2 · Toda correção vem com a mutação que deixa a régua vermelha

Régua que não pode falhar não mede nada. Depois de escrever a medição, **quebre o código de
propósito** e exija vermelho. Se ficar verde, a régua é teatro e a correção não está guardada.

> **Caso real.** Um mutante que desfazia inteiramente a correção do enquadramento passava
> **20/22 VERDE**, porque a invariante lia a *declaração* de uma constante e não o *uso*. Outros
> três buracos iguais foram achados depois.

Como se escreve isso aqui: `tools/eval/ctfhud-check.mjs:28-31` (a mutação apaga a guarda de modo
e o script **sai 1 se a mutação passar** — a régua denuncia a si mesma) e
`tools/eval/obb-check.mjs:33-36` (duas mutações nomeadas, `--mutante=aabb` e `--mutante=semry`).
Anatomia completa e os quatro modos de cegueira já medidos: [`references/reguas.md`](references/reguas.md).

### 3 · Gere a figura e OLHE — no tamanho em que ela é servida

Número sem imagem já enganou este projeto quatro vezes. E olhar o asset no tamanho do asset é
teatro: o defeito mora no recorte que o usuário recebe.

> **Caso real, 05/08.** As miniaturas de `/armas`: **23 das 26** tinham mediana de luminância da
> tinta reprovando (uzi em 7 de 255, 78 % dos pixels indistinguíveis do fundo da página) —
> `tools/eval/weapon-shots.mjs:117`. Elas estavam *desenhadas*. Nenhuma métrica de texto, de
> build ou de HTTP teria contado: os 26 arquivos respondiam 200.
>
> **Mesmo dia, mesmo defeito, outro recorte.** A pistola do canarinho no header "não existia".
> Ela aparecia nos 24 quadros do `.webp` de 604×240 — mas o `.brand-bird`
> (`src/layouts/Layout.astro:254-259`) serve uma janela reduzida para 60 px de altura, e ali a
> arma tem ~8 px, preta sobre marrom escuro. A régua que fechou isso mede o recorte servido:
> `tools/eval/header-bird-check.mjs`.

### 4 · Refute o palpite óbvio antes de agir nele

O palpite óbvio é óbvio porque é barato, não porque é certo. Meça-o e publique o resultado
negativo — resultado negativo medido vale tanto quanto conserto.

> **Caso real.** BUG-03: o próprio `KNOWN-BUGS.md` prescrevia *"mover a chamada para dentro do
> `if`"*. Foi medido (9 sementes × 4 mapas × 180 s) e **piora**: 2,6 → 3,8 episódios de bot mudo.
> O motivo está escrito em `public/js/game.js:5625-5639` — a chamada todo frame também é FILA, e
> atrás do `if` vira DISPUTA no instante do gatilho. O que separa os casos não é ONDE a chamada
> mora, é QUEM pode pegar o token.
>
> **Segundo caso.** As miniaturas pretas: varrer exposição era o caminho natural e não era a
> causa — eram 3 direcionais e nenhum ambiente. Com IBL: 23/26 → 3/26; com o piso de bounce:
> 0/26. O modo de falha estava documentado desde antes em `public/js/game.js:1457`
> (*"SEM ambiente … metalness 1,0 lê como silhueta preta"*).
>
> **Terceiro caso.** BUG-31: `plans/02-BOTS-E-MODELS.md:285` mandava rodar `retarget-glb.mjs` nos
> palhaços. Rodado, medido, **no-op**: 0,13° de desvio máximo por osso. Gerar 88 GLB para não
> mudar um vértice teria custado peso morto contra o teto de 250 MB da CrazyGames.

### 5 · O sintoma raramente é o defeito

O que o usuário descreve é onde ele estava, não onde está o defeito. Traduza o sintoma numa
propriedade mensurável antes de procurar culpado.

> *"o jogo reiniciou sozinho e foi pro menu principal"* (cinco vezes) → **não havia caminho
> automático nenhum**. O clique era real: o menu de pausa nascia clicável no mesmo frame, com
> 0,00 % de canvas exposto sob o cursor, e no centro da tela +100 px estava `REINICIAR PARTIDA`,
> +150 px `SAIR PRO MENU`. É o BUG-00.
>
> *"não está tocando música no fim do round, pelo menos pro funkeiro"* → **`%2520`**. O gerador
> de manifest codificava o caminho e o `audio.js/_sample()` já fazia `encodeURI` — duas
> codificações na mesma string, `%20` virava `%2520`, o `Audio` falhava **em silêncio**. Pegou o
> funkeiro porque 5 das 20 faixas de round dele têm espaço ou acento no nome; quem tinha nome
> limpo continuou tocando, e o defeito parecia "problema dos funkeiros". A regra que ficou está
> em `tools/gen-audio-manifest.mjs:59-72`: **quem grava o caminho não codifica, quem monta URL
> codifica. Um lado só.**
>
> *"a vida do 1st player volta a 100, não sei porque"* → não era bug: era a regeneração fora de
> combate, funcionando como escrita. **O defeito de verdade era ela ser invisível** — sem ícone,
> som, vinheta ou linha nas configurações. Regra que o jogador não percebe é indistinguível de
> defeito.

### 6 · Falha silenciosa tem assinatura — procure a assinatura

Quando a correção "não pegou", não repita a execução: procure a evidência de que ela não rodou.
Byte idêntico, contagem idêntica, timestamp idêntico.

> **Caso real, 05/08.** O `envMap` da pistola do header não aplicou, e o sintoma foi bonito: o
> `.webp` saiu com **exatamente os mesmos 98.064 bytes** do arquivo commitado. Nem um pixel.
> Causa: o `PMREMGenerator` produz um render target do **contexto WebGL que o criou**, e a
> ferramenta criava um `WebGLRenderer` novo por quadro. Um renderer para a execução inteira →
> 98.872 bytes.
>
> **A outra assinatura clássica desta base é o `catch` vazio.** 88 requisições 404 por partida
> (8 personagens × 11 clipes) eram engolidas por um `catch` de `glbchars.js`: o jogo funcionava e
> o console mentia. E `public/models/anims/` sem manifesto não dá erro — dá T-pose.

### 7 · Cuidado com o arnês: o defeito pode ser da medição

Antes de acusar a página, o mapa ou o motor, pergunte se o instrumento estava olhando.

> **Caso real.** 4 miniaturas "faltando" no bloco FUZIL DE BATALHA de `/armas`: o defeito era da
> **captura**. Rolar 600 px a cada 40 ms passa longe do `IntersectionObserver` do Chrome e 17 das
> 26 imagens nunca chegavam a ser pedidas. Com 300 px / 120 ms e espera por
> `images.every(complete)`: 0 faltando, e os 26 arquivos respondiam 200 no `dist`. (`git show a88a00a`)
>
> **Caso estrutural, ainda aberto: BUG-28.** No headless não há `WebGLRenderer.render()`, então
> ninguém chama `scene.updateMatrixWorld()` — e **92 dos 92 occluders** do `fy_pool_day` ficam
> com a matriz na identidade. Toda métrica de bot que dependa de linha de visão no headless está
> medida contra geometria empilhada na origem. No navegador isso nunca aparece.
>
> **E `botsim ... all` compartilha o cursor do `Math.random` entre mapas** pelo cache preguiçoso
> de texturas: um mapa que não foi tocado se moveu 0,2. Comparação de `botsim all` só vale como
> sequência inteira.

### 8 · O cache-bump

Mexeu em `public/js/*.js`? **Bump o `?v=` nos dois lados** — `public/js/version.js` e o import map
de `src/pages/index.astro`. Sem isso o navegador serve o módulo velho e a correção não existe
para quem joga.

> **Caso real.** Um bump com a mensagem *"40 commits não chegavam ao navegador"*, e mais três no
> mesmo dia 04/08. Reproduza a frequência:
> `git log --format='%h %ad %s' --date=format:'%d/%m %H:%M' -- public/js/version.js`
>
> Na tela de seleção o mesmo laço mordeu de novo: o clamp já estava na árvore e o `?v=` não
> tinha subido — o defeito "não consertou" era o arquivo velho sendo servido.

Isto tem primo: **o Chrome ignora `?v=` no banco de favicons.** Se o ícone não muda, é aba
anônima ou limpar dados do site, não é arquivo para mexer.

### 9 · Sistema interconectado se mexe sequencialmente

Arma + mão + animação + ADS + mira + HUD são **um** sistema. Fan-out paralelo nele já produziu
**13 regressões numa única rodada** ([`CONTRIBUTING.md`](../../../CONTRIBUTING.md), "Regras de
código"). Um agente, uma frente, em ordem.

Fora desse sistema o paralelismo é seguro **e medido**, desde que as frentes tenham faixas
disjuntas — e a partição se declara por **símbolo**, nunca por linha (`npm run arch`).

---

## O fluxo operacional

Oito passos. O 2 e o 5 são os que separam conserto de mexida.

**0 · Registre antes de investigar.** Abra a entrada no [`KNOWN-BUGS.md`](../../../KNOWN-BUGS.md)
com as **palavras literais** de quem reportou. A palavra dele é o dado; a sua paráfrase já é
interpretação. Sem evidência ainda, a entrada nasce em *Relatados, ainda não reproduzidos*, com
`Régua: nenhuma`.

**1 · Reproduza, e diga em que instrumento.** Navegador (`tools/eval/crash-watch.mjs`), motor em
node (`tools/eval/harness.mjs`), ou nenhum dos dois — e nesse caso diga que não reproduziu.

**2 · Meça: o número que prova o defeito.** Escreva a régua **antes** do conserto e veja o
vermelho. Se não existe régua, ela é o primeiro entregável. Formato:
[`references/reguas.md`](references/reguas.md).

**2b · Se a medição de ANTES vier VERDE, pare — você tem outro defeito.** Isto acontece muito e
não é motivo para forçar um conserto. São três casos, e cada um tem saída própria:

- *A entrada está velha e o defeito já foi consertado.* Confira o código, feche a entrada com
  `~~tachado~~ · RESOLVIDO dd/mm` e o `arquivo:linha` da correção. Em 05/08, três entradas
  listadas como abertas estavam nesse estado.
- *O defeito é LATENTE: existe no código e não tem efeito no dado de hoje.* Não escreva régua
  que passa verde antes e depois — ela não mede nada (lei 2). Reclassifique de "o jogador vê"
  para latente, e escreva a régua de modo que a **mutação forneça a condição que falta** (o mapa,
  o arquivo, a resolução que hoje não existe).

  > **Caso real, 05/08, e ele tem um segundo tempo que é a lição de verdade.** BUG-06: o alvo
  > de capturas do CTF era constante em vez de derivar do número de bandeiras. A medição de
  > antes, construindo cada mapa pelo `tools/eval/harness.mjs` e contando `ctfPoints`: os 3
  > mapas com `ctfMode` têm 4 bandeiras cada, e a correção prescrita na entrada
  > (`Math.floor(n / 2) + 1`) dá **exatamente o mesmo 3** que já estava lá. Conclusão registrada:
  > defeito latente, régua ficaria verde dos dois lados.
  >
  > **Estava errado — e a aritmética não era o problema.** O dono jogou e disse: *"na loja H
  > está com 3 capturas quando a vitória tem que ser as 4. tem que ser todas sempre."* O que a
  > medição tinha refutado era a **regra proposta na entrada**, não o defeito. Com a regra certa
  > (`capsToWin = ctfPts.length`, `public/js/game.js:4067`) o defeito é imediato, visível e
  > mensurável: a rodada fechava na 3ª de 4 bandeiras. Régua nova:
  > `tools/eval/ctf-win-check.mjs`, com `--mutante=constante` reproduzindo o que ele viu.
  >
  > **A moral, e é a mais cara desta seção:** "a régua de antes veio verde" tem uma quarta saída
  > que a lista acima não cobria — **a regra que você ia codificar pode ser a errada**. Antes de
  > carimbar "latente", confira a regra com quem define o comportamento. Verde pode ser resposta
  > certa para a pergunta errada.
- *A régua está medindo a coisa errada.* É o corolário da lei 1. Se alguém insiste que está
  errado, essa é a hipótese mais provável — não a de que ele se enganou.
- *A REGRA que você ia codificar é a errada.* A conta fecha e mesmo assim o comportamento está
  errado, porque o critério nunca foi o certo. É o caso do BUG-06, logo acima.

**3 · Refute o palpite óbvio.** Meça-o e escreva o resultado negativo na entrada. É o passo que
mais economiza tempo e o mais pulado.

**4 · Conserte na causa, não no sintoma.** O antes/depois e a causa raiz ficam na entrada do
`KNOWN-BUGS.md`. No código, prefira nomes claros; se uma invariante não couber neles, use no
máximo duas linhas e aponte para a entrada, sem copiar a investigação.

**5 · Mute a régua.** Reintroduza o defeito e exija vermelho na cláusula certa. Sem isso o passo
2 não vale.

**6 · Rode o quality gate, na ordem.** Detalhe abaixo.

**7 · Feche a entrada com o antes × depois medido**, o nome da régua nova, o comando que a roda,
e as mutações com o número de cada uma. E anote o **custo declarado**: o que piorou junto.

**8 · Reporte, inclusive o que você NÃO verificou.** Gabaritos:
[`references/gabaritos.md`](references/gabaritos.md).

---

## O quality gate, e a ordem que importa

```bash
npm run check:fast   # segundos — rode este primeiro, sempre
npm run check        # o quality gate completo (o de invariantes leva ~10-12 min)
npm run build        # o site tem que buildar
npm run check:seo    # se mexeu em src/ ou em public/llms.txt
```

A composição exata de cada um sai do `package.json` (que também guarda a chave `//check` e
`//check:fast` com o **porquê** de cada passo) e está publicada como bloco gerado em
[`AGENTS.md`](../../../AGENTS.md). Não copie a lista para lugar nenhum — ela muda.

Três armadilhas de quality gate, todas já pagas:

- **`eval:vm` roda ANTES de `eval:invariants`.** As invariantes de viewmodel leem um JSON que o
  `eval:vm` gera. Com o JSON congelado, VM5 acusava 26/26 armas fora; regenerado, 3/26. O
  `npm run check` já está na ordem certa — o cuidado é para quando você chamar
  `node tools/eval/invariants.mjs` à mão. É o BUG-02.
- **`check:fast` é uma corrente de `&&`.** Passo novo colocado depois de um passo que já está
  vermelho **nasce morto**: roda zero vezes e ninguém percebe. Caso real de 05/08: com o
  `anims:check` vermelho no meio da corrente (BUG-15, `public/models/anims/` não versionado),
  **sete quality gates atrás dele rodavam zero vezes**. Ele foi para o fim da corrente — sem afrouxar
  nada, e continuando vermelho. Leia a chave `//check:fast` do `package.json` antes de
  acrescentar um passo.
- **Vermelho que não corresponde a defeito ensina a ignorar vermelho.** Se uma régua fica
  vermelha por edição de prosa ou por commit, o defeito é dela.

E o veto do dono: **não afrouxe teto de invariante para fechar placar.** Se achar que um teto
está errado, meça na referência e mostre o pixel.

---

## Sessões longas: sanduíche de raciocínio e detector de loop

Dois padrões que esta base já praticava informalmente e agora nomeia — a fonte é o caso da
LangChain em que mudanças **só de harness** tiraram um agente do rank 30 para o top 5 sem
trocar o modelo ([write-up](https://blog.langchain.com/improving-deep-agents-with-harness-engineering/)).

**Sanduíche de raciocínio.** Delibere fundo em dois pontos, e só neles: o **planejamento**
(antes de tocar no código — qual régua, qual hipótese, qual faixa do `game.js`) e a
**verificação** (antes de declarar pronto — mutação vermelha, figura olhada, o que não foi
verificado). No meio, execute enxuto. Quem delibera no meio da execução é o drive-by
refactor. Esta skill já é o sanduíche: os passos 0-3 são o planejamento, os 5-8 são a
verificação; o nome existe para você perceber quando saiu dele.

**Detector de loop.** Se a mesma ação falhou três vezes com a mesma assinatura — mesmo
erro, mesma saída, mesmo vermelho — você não está investigando, está girando. Pare e mude
de estratégia: troque de instrumento (navegador ↔ harness em node), suba um nível de
abstração, ou escale para o dono com o que você já mediu. A lei 6 é o antídoto: quem
procura a assinatura da falha não repete a execução que já falhou.

---

## Números: um lugar só, e gerado

Número **derivável do código** não se escreve à mão em nenhum arquivo deste repositório — vira
bloco gerado por `node tools/gen-docs.mjs`, e `npm run docs:check` (dentro do `check:fast`)
reprova quando diverge.

> **Caso real, e é por isso que este arquivo tem tão pouco número:** o `SKILL.md` da
> `gauntlet-fps` afirmava que o `game.js` tinha 3.234 linhas quando o arquivo já tinha 6.427
> (`tools/gen-docs.mjs:5-10`). Corrigir 3.234 para 6.427 dura até o próximo commit.

Para consultar sem escrever: `node tools/gen-docs.mjs --json` imprime **todos** os fatos medidos,
cada um com o comando que o reproduz.

A distinção que resolve a dúvida na hora de escrever:

| Tipo | Exemplo | O que fazer |
|---|---|---|
| Número de **estado** (o repo tem N disso hoje) | linhas de `game.js`, quantidade de armas, mapas, personagens, invariantes | bloco gerado, ou aponte para onde ele já é gerado |
| Número de **evento** (isto foi medido nesta execução, nesta data) | "2,33 m → 0,68 m", "98.064 bytes", "23 das 26 daquela rodada" | escreva, **com data e com o comando que reproduz** |
| Placar do quality gate | quantas invariantes passam | **não é derivável**: depende de qual insumo existe na máquina. Vive colado no cabeçalho do `KNOWN-BUGS.md`, de execução real |

**Duas coisas que este arquivo não tem, e é melhor você saber:** ele **não recebe bloco gerado**
(a tabela `COLOCACAO` de `tools/gen-docs.mjs` declara em quais arquivos cada bloco aparece, e não
inclui este), e ele **não entra na varredura de ponteiros** do mesmo script, que hoje cobre
`README/STATUS/HANDOFF/KNOWN-BUGS/AGENTS/docs/docs` e só o `SKILL.md` da `gauntlet-fps`
(`tools/gen-docs.mjs:584-586`). Consequência prática: aqui número de estado não se escreve —
aponta-se; e os `arquivo:linha` desta skill são conferidos à mão. Se você mexer no
`COLOCACAO` ou nessa lista, inclua este arquivo nos dois.

---

## Armadilhas específicas desta base

| Armadilha | O que acontece |
|---|---|
| Servir `public/` estático para testar | Você recebe os arnêses visuais, **não o jogo**. O jogo é a rota `/`, e o HTML dele é `src/pages/index.astro`. |
| Adicionar dependência ou passo de build em `public/` | Quebra o `tools/eval/harness.mjs`, que sobe a classe `Game` real em node puro — é ele que faz o quality gate existir. |
| Validar enquadramento de arma só em 16:9 | O dono joga em **3:2**. Já custou uma rodada inteira. |
| `//` em CSS | Não é comentário. O parser engole o bloco seguinte — já matou um `@keyframes` inteiro. |
| Duas capturas headless em paralelo | Derruba o boot e falsifica a medição. Um agente só roda browser. |
| Rodar `reskin-glb.mjs` de novo "porque é inócuo" | **Não é idempotente**: repintar com os mesmos parâmetros piorou o `padati` em 12 %. |
| Régua que passa por vacuidade | Sem inventário declarado, apagar o alvo deixa a régua verde sem medir nada — `tools/eval/obb-check.mjs:28-31`. |
| Percentil alto em defeito pequeno | Defeito que mora acima do P97 é invisível para um P95 **por construção** — `tools/eval/select-inflate.mjs:20-25`. |
| Comparar `botsim all` item a item | Os mapas compartilham o cursor de `Math.random`. Só vale como sequência inteira. |

---

## Referências

- [`references/reguas.md`](references/reguas.md) — anatomia de uma régua desta casa, os quatro
  modos de cegueira já medidos, e o esqueleto com mutação.
- [`references/gabaritos.md`](references/gabaritos.md) — gabarito da entrada do `KNOWN-BUGS.md` e
  do relatório final, incluindo como declarar o que **não** foi verificado.
- `docs/docs/quality-gates.md` — as duas leis, a procedência de teto e o teste de mutação.
- [`KNOWN-BUGS.md`](../../../KNOWN-BUGS.md) · [`AGENTS.md`](../../../AGENTS.md) ·
  [`CONTRIBUTING.md`](../../../CONTRIBUTING.md).
- `gauntlet-fps` — a skill irmã. Ela **melhora o que funciona**; esta conserta o que está
  quebrado. Se o pedido é "deixe melhor", é lá.
