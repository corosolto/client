#!/usr/bin/env node
/* ============================================================================
   tarefas.mjs — A CLASSE DO PR DECIDE A MISSÃO. NÃO EXISTE REGISTRO A MANTER.
   ----------------------------------------------------------------------------
   POR QUE EXISTE (e por que não é um lanes.json escrito à mão)
   A tentação óbvia é um registro de lanes com worktree, dono, tarefa e estado,
   mantido à mão. Esse registro mente em 48 h: o PR sai do conflito, a worktree
   é podada, a main anda, e o registro continua mandando o agente rebasear o que
   já foi rebaseado. Registro desatualizado é pior que registro nenhum, porque
   um agente confia nele.

   Aqui a missão é DERIVADA do estado real a cada turno: a `fila.mjs` lê o
   GitHub e o git, classifica, e a classe escolhe o texto da missão. O único
   estado persistido é o ledger — que é histórico, não configuração, e por isso
   não apodrece.

   AS MISSÕES
     CONFLITO   rebase sobre a main e devolver verde. Primeiro sempre, porque é
                a única dívida que fica mais cara enquanto você não mexe nela.
     VERMELHO   a régua vermelha vira verde SEM afrouxar teto. Afrouxar teto é
                a fraude clássica desta base — a rodada que foi de 16/21 para
                19/21 e foi reprovada.
     RASCUNHO   terminar o que falta e tirar do rascunho.
     PRONTO     nada a fazer: registrar AGUARDANDO DONO e encerrar.
     PARADO     não despacha. Só o dono decide entre retomar e fechar.
   ========================================================================== */

const COMUM = `
ANTES DE QUALQUER COISA
1. Leia \`AGENTS.md\` inteiro. As leis da casa não são estilo — cada uma custou dias.
2. Rode \`git status\` e \`git log --oneline -5\`. O ledger acima diz o que já foi
   feito; o git diz o que está de pé AGORA. Onde os dois discordarem, o git ganha.
3. NÃO recomece o que o ledger diz que já foi feito. Continue de onde parou.

COMO TERMINAR O TURNO (obrigatório, mesmo se não conseguiu nada)
  node tools/frota/ledger.mjs escrever <LANE> <ESTADO> "<o que tentou · o que mediu · o que ficou de pé · próximo passo>"
Estados: ANDAMENTO | AGUARDANDO DONO | BLOQUEADO | TURNO FECHADO
`;

const MISSOES = {
  CONFLITO: (i) => `
MISSÃO: tirar o PR #${i.numero} do conflito e devolvê-lo verde.

O conflito com a main cresce sozinho — cada merge na main te empurra para longe.
Por isso esta classe vem antes de todas as outras.

PASSOS
1. \`git fetch origin main\` e \`git rebase origin/main\` (ou merge, se o histórico
   desta branch já foi publicado e rebase reescreveria commit de outro agente —
   nesse caso merge e diga no ledger por quê).
2. Em CADA conflito, resolva pela INTENÇÃO das duas pontas, não pegando um lado
   inteiro. Se o conflito for em arquivo GERADO (bloco entre BEGIN:GERADO), não
   resolva à mão: regenere com o script que o gera (\`npm run arch\`, \`npm run docs\`).
3. Se o conflito exigir decisão de produto — duas autorias visuais disputando o
   mesmo mapa, dois tetos diferentes para a mesma régua — PARE. Escreva BLOQUEADO
   no ledger com a pergunta exata. Não escolha por conta própria.
4. Depois de resolver: \`npm run check:deploy\`. Verde antes de push.
5. \`git push --force-with-lease\` (nunca \`--force\` puro: outra lane pode ter
   empurrado enquanto você resolvia).

PRONTO É: \`gh pr view ${i.numero} --json mergeable\` responder MERGEABLE e os checks
voltarem verdes. Aí escreva AGUARDANDO DONO no ledger. NÃO mescle, NÃO aplique
label \`safe-automerge\`.`,

  VERMELHO: (i) => `
MISSÃO: fazer a régua vermelha do PR #${i.numero} ficar verde — sem afrouxar teto.

CHECKS VERMELHOS: ${i.falhas.join(', ')}

O check \`build\` desta casa é o portão de invariantes. Ele não falha por infra:
falha porque uma régua crítica está reprovando de verdade. Descubra QUAL:
  gh run view --log-failed --job <id do job>   (pegue o id em \`gh pr checks ${i.numero}\`)
e procure a linha "CRÍTICAS: N/56 passam ← XXX VERMELHAS".

PASSOS
1. Identifique a sigla da régua vermelha (ex.: MAP2B, VM14) e leia o que ela mede
   em \`tools/eval/\`. Entenda o que ela cobra ANTES de mexer em qualquer código.
2. Reproduza local: \`npm run check:deploy\` (ou a régua isolada). Você tem que ver
   o vermelho na sua máquina. Vermelho que só existe no CI é outro bug.
3. Conserte a CAUSA. Proibido: subir o teto, mover a régua para KNOWN-RED.json,
   pular o caso. Uma rodada desta base foi de 16/21 para 19/21 sem afrouxar teto
   nenhum e AINDA ASSIM foi reprovada, por destruir em silêncio uma decisão
   estética que nenhuma régua codificava. Afrouxar teto é pior que isso.
4. Se a régua estiver ERRADA (mede o que não devia), isso é um achado — escreva
   BLOQUEADO no ledger com a evidência. Não a conserte no mesmo PR.
5. Se a mudança é visível, gere a figura e OLHE. Descreva no ledger o que você
   VIU, não o que esperava ver. Precisa de browser? Tome o lock antes (trava 7).

PRONTO É: os checks vermelhos verdes, sem teto afrouxado e sem sigla nova em
KNOWN-RED.json. Então AGUARDANDO DONO.`,

  RASCUNHO: (i) => `
MISSÃO: terminar o PR #${i.numero} e tirá-lo de rascunho.

Ele está verde e sem conflito — está em rascunho porque falta trabalho, não
porque falta conserto. Descubra o que falta:
1. \`gh pr view ${i.numero}\` — o corpo do PR costuma listar o que ficou pendente.
2. Procure na branch por TODO, FIXME, "falta", "pendente", "handoff".
3. Se o PR é de frente visual, o que falta quase sempre é a EVIDÊNCIA: captura
   inspecionada. Gere, olhe, descreva o que viu, anexe no PR.

PRONTO É: o que o corpo do PR prometeu, entregue e medido. Aí
\`gh pr ready ${i.numero}\` e AGUARDANDO DONO. NÃO mescle.`,

  PRONTO: (i) => `
MISSÃO: nenhuma. O PR #${i.numero} está verde, sem conflito e fora de rascunho.

Ele espera decisão do dono, e nesta rodada o dono decidiu que nada entra na main
sem ele. Escreva no ledger AGUARDANDO DONO com o número do PR e encerre o turno.
Não mescle, não aplique label, não reabra a discussão.`,

  PARADO: (i) => `
MISSÃO: nenhuma — só relatório. O PR #${i.numero} está há ${i.dias} dias sem commit.

Abandono é decisão do dono, não sua. Escreva no ledger BLOQUEADO com uma linha
dizendo o que o PR entrega e se o trabalho dele já foi feito por outro PR
(procure por título parecido em \`gh pr list\`). Encerre o turno.`,
};

export function briefing(item, lane, worktree) {
  const missao = MISSOES[item.classe];
  if (!missao) throw new Error(`classe sem missão: ${item.classe}`);
  return [
    `LANE: ${lane}`,
    `WORKTREE: ${worktree}`,
    `PR: #${item.numero} — ${item.titulo}`,
    `BRANCH: ${item.branch}`,
    `CLASSE: ${item.classe}`,
    '',
    missao(item).trim(),
    '',
    COMUM.trim().replaceAll('<LANE>', lane),
  ].join('\n');
}

export { MISSOES };
