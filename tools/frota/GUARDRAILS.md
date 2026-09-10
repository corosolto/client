# Travas da frota — injetadas em todo turno, sem exceção

Este texto entra literalmente no prompt de cada agente da frota, antes da tarefa.
Ele não é conselho: é o contrato do turno. Um turno que viola qualquer item abaixo
é descartado, e o `runner.mjs` marca a lane como `VIOLACAO` no ledger.

## 1 · A main é do dono

A frota **prepara**, o dono **integra**. Nesta rodada o dono decidiu que nada entra
na main sem ele.

- **Nunca** `git push` para `main`, `git merge` na `main`, `gh pr merge`, `gh pr close`.
- **Nunca** aplicar a label `safe-automerge` — ela é o botão de merge do dono, e o
  `csbrasil-bot-automerge` mescla sozinho quando ela aparece.
- Terminou e ficou verde? Escreva no ledger `AGUARDANDO DONO` com o número do PR.
  Não peça, não insista, não reaplique.

## 2 · Você só existe dentro da sua worktree

O caminho da sua worktree está no seu briefing. Não saia dele: outra lane está
editando o mesmo arquivo em outra worktree agora.

- `cd` para fora da worktree é violação, inclusive para "só olhar".
- Não crie, mova nem remova worktree de ninguém.

## 3 · `--no-verify` é violação

Os hooks (`commit-msg`, `pre-push`) cobram o trailer `Agent:`, o teto de tamanho do
commit, co-autoria de IA e o scanner de credencial. Se um hook recusou, ele está
certo e você está errado. Conserte a causa.

- `PREPUSH=0` também é violação.
- Commit acima de 15 arquivos ou 800 linhas exige `Commit-grande:` dizendo por quê.

## 4 · Credencial nunca entra no índice

Nem em fonte, doc, fixture, comentário, mensagem de commit ou ledger. Nem token de
teste, nem URL assinada, nem id de deploy efêmero. Achou um? Tire do staging,
registre só provedor + tipo + caminho, e **pare** — rotação é decisão do dono.

## 5 · Régua antes do conserto, e a mutação que a prova

Lei 1 e 3 da casa. Escreva a medição, prove que ela **reprova** o estado atual, só
então conserte. Se você não conseguiu deixar a régua vermelha de propósito, ela não
existe — e um turno que "consertou" sem régua vermelha antes é um turno perdido.

## 6 · Quem constrói nunca dá a nota

Você não aprova o próprio trabalho. Frente visual (mapa, viewmodel, personagem,
HUD) só fica pronta com captura inspecionada e aprovação **humana** registrada.
No fim do turno escreva o que você **viu** na figura, não o que esperava ver.

## 7 · Um único agente roda browser

Antes de qualquer captura headless, tome o lock:
`node tools/frota/lock.mjs tomar browser` — se ele negar, faça outra coisa e tente
no próximo turno. Duas capturas em paralelo derrubam o boot e produzem "countdown
travado" que parece bug e é carga. Solte com `node tools/frota/lock.mjs soltar browser`.

## 8 · `game.js` se edita por trecho

Nunca reescreva o arquivo inteiro — isso apaga o trabalho de quem está na outra
faixa, agora. Consulte `tools/eval/ARCH.md` e fique na faixa de símbolo da sua
frente. `constructor()`, `update()` e `_dom()` são append-only.

## 9 · O turno termina no ledger, sempre

Mesmo turno que não conseguiu nada. O próximo agente lê o ledger e o `git status`
para continuar — ele **não** recomeça. Escreva: o que tentou, o que mediu, o que
ficou de pé, e qual é o próximo passo concreto.

## 10 · Na dúvida, pare e registre

Sem worktree? Conflito que exige decisão de produto? Régua que contradiz o
briefing? Escreva `BLOQUEADO` no ledger com a pergunta exata para o dono e encerre
o turno. Chutar custa mais caro que esperar.
