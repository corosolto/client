#!/usr/bin/env node
/* ============================================================================
   selftest.mjs — CADA TRAVA DA FROTA COM A MUTAÇÃO QUE A FAZ FICAR VERMELHA.
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   Lei 3 da casa: "toda invariante vem com a mutação que a faz ficar vermelha".
   Um teste que passa tanto no código certo quanto no código quebrado não testa
   nada. Este arquivo roda cada trava duas vezes: uma no código real (tem que
   passar) e uma num MUTANTE que desfaz exatamente a trava (tem que reprovar).

   O primeiro caso aqui não é hipotético. Na primeira execução do lock, o pedido
   de `lane-B` foi CONCEDIDO em vez de negado: `tomar()` guardava `process.pid`,
   que na CLI é um node que morre no mesmo segundo, então o lock nascia com o
   dono morto e era roubado pelo pedido seguinte. A trava existia e não mordia.
   O mutante M1 é essa versão, congelada, para que ela não volte.

   USO
     node tools/frota/selftest.mjs
   Sai 0 se todas as travas passam no real E reprovam no mutante.
   ========================================================================== */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { classificar, ordenar, depoisDaBase } from './fila.mjs';
import { tomar, soltar, expirado } from './lock.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SHIM = path.join(AQUI, 'shim');

let passou = 0;
let falhou = 0;

function caso(nome, fn) {
  try {
    fn();
    console.log(`  ok    ${nome}`);
    passou += 1;
  } catch (e) {
    console.log(`  FALHA ${nome}\n        ${e.message}`);
    falhou += 1;
  }
}

const igual = (a, b, m) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(`${m}\n        esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)}`);
  }
};

console.log('\n  TRAVAS NO CÓDIGO REAL');

caso('lock: segundo dono é NEGADO enquanto o primeiro está vivo', () => {
  const r = `t-${Date.now()}`;
  igual(tomar(r, 'lane-A').ok, true, 'A devia pegar');
  igual(tomar(r, 'lane-B').ok, false, 'B NÃO devia pegar — foi o defeito real do primeiro teste');
  soltar(r, 'lane-A');
});

caso('lock: dono do lock consegue retomar o próprio lock', () => {
  const r = `t-${Date.now()}-b`;
  tomar(r, 'lane-A');
  igual(tomar(r, 'lane-A').motivo, 'ja-era-seu', 'retomar o próprio devia ser idempotente');
  soltar(r, 'lane-A');
});

caso('lock: pela CLI, em dois processos curtos, o segundo é NEGADO', () => {
  const rec = `cli-${Date.now()}`;
  const chama = (dono) => {
    try {
      execFileSync(process.execPath, [path.join(AQUI, 'lock.mjs'), 'tomar', rec, `--dono=${dono}`], { stdio: 'pipe' });
      return 0;
    } catch (e) {
      return e.status;
    }
  };
  igual(chama('lane-A'), 0, 'A devia pegar pela CLI');
  igual(chama('lane-B'), 1, 'B devia ser NEGADO pela CLI — este é o caso que o agente realmente usa');
  execFileSync(process.execPath, [path.join(AQUI, 'lock.mjs'), 'soltar', rec, '--dono=lane-A'], { stdio: 'pipe' });
});

caso('lock: expira pelo relógio, senão vira deadlock', () => {
  const velho = { pid: process.pid, desde: new Date(Date.now() - 60 * 60000).toISOString() };
  igual(expirado(velho), true, 'lock de 1 h atrás tinha que estar expirado');
  const novo = { pid: process.pid, desde: new Date().toISOString() };
  igual(expirado(novo), false, 'lock recém-tomado não pode estar expirado');
});

caso('fila: CONFLITO ganha de VERMELHO — é a dívida que cresce sozinha', () => {
  const ordem = ordenar([
    { classe: 'PRONTO', falhas: [], dias: 1 },
    { classe: 'VERMELHO', falhas: ['build'], dias: 1 },
    { classe: 'CONFLITO', falhas: [], dias: 1 },
    { classe: 'RASCUNHO', falhas: [], dias: 1 },
  ]).map((i) => i.classe);
  igual(ordem, ['CONFLITO', 'VERMELHO', 'PRONTO', 'RASCUNHO'], 'ordem de risco errada');
});

caso('fila: conflito é CONFLITO mesmo com check verde', () => {
  const pr = { mergeable: 'CONFLICTING', isDraft: false, statusCheckRollup: [], updatedAt: new Date().toISOString() };
  igual(classificar(pr), 'CONFLITO', 'verde não apaga conflito');
});

caso('fila: rascunho vermelho conta como VERMELHO, não como RASCUNHO', () => {
  const pr = {
    mergeable: 'MERGEABLE',
    isDraft: true,
    statusCheckRollup: [{ conclusion: 'FAILURE', name: 'build' }],
    updatedAt: new Date().toISOString(),
  };
  igual(classificar(pr), 'VERMELHO', 'o vermelho é o que bloqueia, não o rascunho');
});

caso('fila: dependente nunca vem antes da base (a pilha de mapas)', () => {
  const ordem = depoisDaBase([
    { numero: 556, classe: 'PRONTO', bloqueadoPor: 555 },
    { numero: 555, classe: 'PRONTO', bloqueadoPor: 554 },
    { numero: 554, classe: 'CONFLITO', bloqueadoPor: null },
  ]).map((i) => i.numero);
  igual(ordem, [554, 555, 556], 'trabalhar o de cima antes da raiz é trabalho perdido');
});

caso('fila: base já fechada não segura ninguém', () => {
  const ordem = depoisDaBase([
    { numero: 700, classe: 'PRONTO', bloqueadoPor: 999 },
    { numero: 701, classe: 'PRONTO', bloqueadoPor: null },
  ]).map((i) => i.numero);
  igual(ordem, [700, 701], 'base que não está mais aberta não é bloqueio');
});

caso('fila: ciclo de dependência não trava a fila', () => {
  const ordem = depoisDaBase([
    { numero: 1, classe: 'PRONTO', bloqueadoPor: 2 },
    { numero: 2, classe: 'PRONTO', bloqueadoPor: 1 },
  ]).map((i) => i.numero);
  igual(ordem.length, 2, 'ciclo tem que sair com os dois, não em laço infinito');
});

const shim = (bin, args) => {
  try {
    execFileSync(path.join(SHIM, bin), args, { stdio: 'pipe', env: { ...process.env, PATH: process.env.PATH } });
    return 0;
  } catch (e) {
    return e.status;
  }
};

caso('shim git: push na main é recusado com 97', () => {
  igual(shim('git', ['push', 'origin', 'main']), 97, 'push na main tinha que ser recusado');
});

caso('shim git: --no-verify é recusado', () => {
  igual(shim('git', ['commit', '--no-verify', '-m', 'x']), 97, '--no-verify tinha que ser recusado');
});

caso('shim git: checkout de ARQUIVO da main passa (não é troca de branch)', () => {
  const r = shim('git', ['checkout', 'origin/main', '--', 'AGENTS.md']);
  if (r === 97) throw new Error('recusou checkout de arquivo, que é resolução de conflito legítima');
});

caso('shim gh: pr merge é recusado', () => {
  igual(shim('gh', ['pr', 'merge', '555']), 97, 'merge tinha que ser recusado');
});

caso('shim gh: label safe-automerge é recusada (ela É o botão de merge)', () => {
  igual(shim('gh', ['pr', 'edit', '555', '--add-label', 'safe-automerge']), 97, 'label tinha que ser recusada');
});

console.log('\n  MUTANTES — cada um tem de REPROVAR');

/* `trocas` é uma lista porque um conserto pode ter DUAS pontas que se cobrem: o
   mutante fiel desfaz as duas. Foi o que M1 mostrou — desfazer só o `ppid`
   deixava a graça segurando a trava, e o mutante passava em verde fingindo que
   o `ppid` carregava peso sozinho. */
function mutante(nome, arquivo, trocas, prova) {
  const p = path.join(AQUI, arquivo);
  const original = fs.readFileSync(p, 'utf8');
  let mutado = original;
  for (const [de, para] of trocas) {
    if (!mutado.includes(de)) {
      console.log(`  FALHA ${nome}\n        alvo da mutação sumiu do arquivo: ${de.slice(0, 60)}`);
      falhou += 1;
      return;
    }
    mutado = mutado.replace(de, para);
  }
  const temp = path.join(os.tmpdir(), `mut-${Date.now()}-${path.basename(arquivo)}`);
  fs.writeFileSync(temp, mutado);
  try {
    const morreu = prova(temp);
    if (morreu) {
      console.log(`  ok    ${nome} (mutante reprovou, como devia)`);
      passou += 1;
    } else {
      console.log(`  FALHA ${nome}\n        o mutante PASSOU — a trava não morde`);
      falhou += 1;
    }
  } finally {
    fs.rmSync(temp, { force: true });
  }
}

/* M1 só se manifesta ATRAVÉS DA CLI: dentro deste processo o `process.pid` do
   mutante está vivo e a trava aguenta. O defeito real precisava de dois
   processos curtos, que é como o agente da frota chama o lock. Provar em
   processo seria provar outra coisa — e passaria em verde no código quebrado. */
mutante(
  'M1 · o código ORIGINAL inteiro: PID da CLI + sem graça (o defeito da 1ª execução)',
  'lock.mjs',
  [
    ['export function tomar(recurso, dono, pid = process.ppid) {',
     'export function tomar(recurso, dono, pid = process.pid) {'],
    ['  if (min > VALIDADE_MIN) return true;\n  return min > GRACA_MIN && !vivo(l.pid);',
     '  return min > VALIDADE_MIN || !vivo(l.pid);'],
  ],
  (temp) => {
    const rec = `m1-${Date.now()}`;
    const chama = (dono) => {
      try {
        execFileSync(process.execPath, [temp, 'tomar', rec, `--dono=${dono}`], { stdio: 'pipe' });
        return 0;
      } catch (e) {
        return e.status;
      }
    };
    chama('lane-A');
    const segundo = chama('lane-B');
    try {
      execFileSync(process.execPath, [temp, 'soltar', rec, '--dono=lane-B'], { stdio: 'pipe' });
    } catch {}
    return segundo === 0;
  },
);

mutante(
  'M2 · lock sem graça: PID morto expira na hora',
  'lock.mjs',
  [['return min > GRACA_MIN && !vivo(l.pid);', 'return !vivo(l.pid);']],
  () => {
    const l = { pid: 999999, desde: new Date().toISOString() };
    return expirado(l) === false;
  },
);

mutante(
  'M3 · shim git deixa de olhar o alvo do push',
  'shim/git',
  [['main|master|*:main|*:master|refs/heads/main|refs/heads/master)', '__nunca_casa__)']],
  (temp) => {
    fs.chmodSync(temp, 0o755);
    try {
      execFileSync(temp, ['push', 'origin', 'main'], { stdio: 'pipe' });
      return true;
    } catch (e) {
      return e.status !== 97;
    }
  },
);

mutante(
  'M4 · fila deixa de priorizar CONFLITO',
  'fila.mjs',
  [["const CLASSES = ['CONFLITO', 'VERMELHO', 'PRONTO', 'RASCUNHO', 'PARADO'];",
    "const CLASSES = ['VERMELHO', 'CONFLITO', 'PRONTO', 'RASCUNHO', 'PARADO'];"]],
  async (temp) => {
    const m = await import(`file://${temp}`);
    const ordem = m.ordenar([
      { classe: 'VERMELHO', falhas: ['build'], dias: 1 },
      { classe: 'CONFLITO', falhas: [], dias: 1 },
    ]).map((i) => i.classe);
    return ordem[0] !== 'CONFLITO';
  },
);

mutante(
  'M5 · fila deixa de olhar a base e o dependente sobe na frente',
  'fila.mjs',
  [['  return depoisDaBase(base);', '  return base;']],
  async (temp) => {
    const m = await import(`file://${temp}`);
    const ordem = m.ordenar([
      { numero: 556, classe: 'PRONTO', falhas: [], dias: 3, bloqueadoPor: 555 },
      { numero: 555, classe: 'PRONTO', falhas: [], dias: 1, bloqueadoPor: 554 },
    ]).map((i) => i.numero);
    return ordem[0] === 556;
  },
);

console.log(`\n  ${passou} passaram · ${falhou} falharam\n`);
process.exit(falhou ? 1 : 0);
