# Régua: como se escreve uma aqui, e como ela fica cega

Complemento da [`SKILL.md`](../SKILL.md), leis 1 e 2. A doutrina de invariante (severidade,
procedência de teto, `skip` × `put`) mora em `docs/docs/quality-gates.md` — aqui está só o que
é específico de **escrever a régua de um defeito recém-achado**.

Regra da casa: **bug que o dono reporta vira invariante permanente** em
`tools/eval/invariants.mjs`. Enquanto não virar, fica no `KNOWN-BUGS.md` com `Régua: nenhuma`.

---

## O que uma régua desta casa faz

**Ela ANDA. Ela não confere declaração.** Essa é a diferença que separa as réguas que pegaram
defeito das que passaram verde por anos.

- `tools/eval/ctfhud-check.mjs` recorta o corpo de `_hideCtfHud` e `_updateCtfHud` do `game.js`
  por casamento de chaves e **executa os dois** contra um elemento de mentira, em quatro
  cenários. Procurar `add('hidden')` no texto mediria a *forma* do código.
- `tools/eval/obb-check.mjs` varre uma grade de 5 cm em volta do prop chamando o **`_collide` de
  produção** — o mesmo do jogador e do bot — e compara com a caixa real.
- `tools/eval/select-inflate.mjs` abre o jogo no Chromium e chama o **mesmo**
  `buildCharacterModel(...)` da tela de seleção, com o mesmo `ctrl.update(...)` do loop do
  preview, porque metade da deformação que o dono vê é escrita depois do mixer, em JS, e não
  existe em clipe nenhum.
- `tools/eval/ctf-round-check.mjs` **anda o motor** em vez de ler a declaração — a régua anterior
  cobrava que a *partida* fechasse, e ela fechava, pela rede de segurança de 480 s.

Se a sua régua pode ficar verde com o defeito presente porque ela leu uma constante, ela é um
`grep` com cerimônia.

---

## Os sete modos de cegueira já medidos nesta base

Confira a sua régua contra esta lista antes de considerá-la pronta. Cada item aconteceu.

**1 · Lê a DECLARAÇÃO, não o USO.** Um mutante que desfazia inteiramente a correção do
enquadramento passava **20/22 VERDE** porque a invariante lia a declaração de uma constante.
Outros três buracos iguais foram achados depois.

**2 · Vacuidade.** Sem **inventário declarado**, apagar o alvo deixa a régua verde sem medir
nada: sem `ry` não sobra colisor girado e uma régua ingênua passa. Por isso
`tools/eval/obb-check.mjs:28-31` lista os props que **têm** que estar girados, e a falta de
qualquer um é vermelha.

**3 · Mede a lista DECLARADA em vez do que é desenhado.** O `decal-probe` dizia "0 sem parede
atrás" nos 5 mapas e o dono continuava vendo peça em lugar errado: a régua recebia a lista de
colisores e a bounding box do GLB. Medido contra a **malha**, 16 peças da Brasília estavam no ar
— o ministério é sobre pilotis e a caixa do prédio inteiro conta o vão aberto como parede.
Mesma família: a 3ª rodada do ônibus, onde a caixa declarada era mais gorda que a lataria
visível (guarda-sol, telhado, retrovisor).

**4 · Métrica errada para a pergunta.** `areaPct` não é régua de escala quando o **recorte** muda:
a arma entrava no quadro com 82,2 % da malha fora dele, então o que aparecia era um pedaço
ampliado — e a distância boca→mira, o número que o dono nomeou, não era medida por ninguém.

**5 · Percentil cego.** Defeito que mora acima do P97 é invisível para um P95 **por construção**.
O `ostentacao` marcava o 5º melhor de 44 com os dois braços virados em asa de morcego —
`tools/eval/select-inflate.mjs:20-25`. A saída foi contar ocorrências (`ruins/1e4`), não
percentil.

**6 · Não abre o caminho que o usuário vê.** A régua antiga do balão rodava
`['walk','run','idle','crouchwalk']`, e quem carrega arma de uma mão usa `idle1h` na tela de
seleção (`public/js/glbchars.js:404`) — clipe que ela nunca abriu.

**7 · Régua que se alimenta da própria saída.** A varredura de ponteiros lia o arquivo inteiro,
inclusive o bloco que ela mesma escrevia; o relatório passava a conter o ponteiro quebrado e a
execução seguinte o encontrava de novo. `tools/gen-docs.mjs:589-597`. Vermelho eterno ensina a
ignorar vermelho.

**Bônus, achado escrevendo a régua do BUG-00:** isenção por proximidade ("tem `function
quitToMenu` por perto") passava verde com a mutação colada logo abaixo da função; e buscar
`quitToMenu(` não pega `setTimeout(quitToMenu, …)`, que é justamente como se cria um caminho
automático sem escrever parênteses.

---

## A mutação

Sem ela o passo de medir não vale. Três exigências:

1. **Cada mutação acende a cláusula certa** — não basta "ficou vermelho".
2. **A mutação impossível é vermelha.** Se o código mudou de forma e o regex da mutação não casa
   mais, o script **sai 1** em vez de passar: `tools/eval/ctfhud-check.mjs:63-69`.
3. **Congele o teto durante a mutação.** Se o teto é derivado dos dados, o mutante piora as
   referências junto, o teto sobe e o teatro fica verde — `tools/eval/select-inflate.mjs:241`.

Declare também o que **não** morde e por quê. Resultado negativo medido não é buraco:
`tools/eval/select-inflate.mjs:58-69` documenta que `--mutate=ik` fica verde nos dois, com as duas
medições que explicam — a régua mede rasgo de pele, não plausibilidade de pose, e é de propósito.

---

## Esqueleto

```js
/* ============================================================================
   <nome>-check.mjs — <A PERGUNTA QUE ELA RESPONDE, EM UMA LINHA>
   ----------------------------------------------------------------------------
   POR QUE EXISTE
     <as palavras LITERAIS de quem reportou>

   CAUSA RAIZ (KNOWN-BUGS.md BUG-NN)
     <o que era, com arquivo:linha>

   O QUE ELA MEDE, E POR QUE ASSIM
     <por que não é regex / por que anda o motor / qual caminho de produção ela chama>

   MUTAÇÕES QUE FAZEM ELA FICAR VERMELHA (rodadas e medidas)
     --mutante=<x>   <o que reintroduz>  -> <qual cláusula acende, com número>

   O QUE NÃO MORDE, E POR QUÊ
     --mutante=<y>   <resultado negativo medido>

   Uso: node tools/eval/<nome>-check.mjs [--mutante=...] [--json]
   ============================================================================ */
```

Depois: entrada no `package.json` com a chave `//<script>` explicando **por que ela existe**,
e o passo dentro do `check:fast` — lembrando que ele é uma corrente de `&&` e que um passo
colocado depois de um vermelho existente nasce morto.

Régua de node puro que roda em segundos vai para o `check:fast`. Régua que precisa de browser ou
de minutos vai para o `check`, e o motivo fica escrito.
