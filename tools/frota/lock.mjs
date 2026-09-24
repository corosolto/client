#!/usr/bin/env node
/* ============================================================================
   lock.mjs — O RECURSO QUE SÓ UM AGENTE PODE TER POR VEZ.
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   A lei da casa diz "um único agente roda browser": duas capturas headless em
   paralelo derrubam o boot e produzem "countdown travado" que parece bug e é
   carga. Com a frota rodando 24/7 em várias worktrees, essa lei deixa de ser
   uma frase no AGENTS.md e precisa de um mecanismo — senão a terceira lane que
   acorda de madrugada vai capturar por cima da segunda e reprovar as duas.

   Vive fora da árvore (em ~/.csbrasil-frota/) porque o lock é da MÁQUINA, não
   do repositório: todas as worktrees dividem a mesma GPU e o mesmo Chromium.

   ROUBO DE LOCK
   Turno morre (limite de token, máquina reinicia) segurando o lock, e aí o
   recurso fica preso para sempre. Por isso o lock guarda PID + instante: se o
   dono não existe mais, ou passou de VALIDADE_MIN, o próximo o toma e registra
   o roubo. Lock sem validade é deadlock com passos extras.

   USO
     node tools/frota/lock.mjs tomar browser --dono=lane-561
     node tools/frota/lock.mjs soltar browser --dono=lane-561
     node tools/frota/lock.mjs ver
   Sai com 0 se conseguiu, 1 se o recurso está com outro. O chamador decide.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const RAIZ = path.join(os.homedir(), '.csbrasil-frota', 'locks');
const VALIDADE_MIN = 25;

/* O PID sozinho não serve como prova de vida aqui. Cada `lock.mjs tomar` é um
   processo node que morre no mesmo segundo, então um lock tomado pela CLI já
   nasceria com o dono morto e seria roubado pelo pedido seguinte — foi o que o
   primeiro teste negativo mostrou. A morte do PID só libera depois da graça:
   antes dela vale o relógio, que é o que cobre o turno inteiro. */
const GRACA_MIN = 3;

const arquivo = (recurso) => path.join(RAIZ, `${recurso}.json`);

function vivo(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function ler(recurso) {
  try {
    return JSON.parse(fs.readFileSync(arquivo(recurso), 'utf8'));
  } catch {
    return null;
  }
}

export function expirado(l, agora = Date.now()) {
  if (!l) return true;
  const min = (agora - new Date(l.desde).getTime()) / 60000;
  if (min > VALIDADE_MIN) return true;
  return min > GRACA_MIN && !vivo(l.pid);
}

export function tomar(recurso, dono, pid = process.ppid) {
  fs.mkdirSync(RAIZ, { recursive: true });
  const atual = ler(recurso);
  if (atual && atual.dono === dono) return { ok: true, motivo: 'ja-era-seu' };
  if (atual && !expirado(atual)) return { ok: false, motivo: 'ocupado', por: atual.dono };
  const roubado = atual ? atual.dono : null;
  fs.writeFileSync(
    arquivo(recurso),
    JSON.stringify({ recurso, dono, pid, desde: new Date().toISOString() }, null, 2),
  );
  return { ok: true, motivo: roubado ? 'roubado' : 'livre', de: roubado };
}

export function soltar(recurso, dono) {
  const atual = ler(recurso);
  if (!atual) return { ok: true, motivo: 'ja-estava-livre' };
  if (atual.dono !== dono && !expirado(atual)) {
    return { ok: false, motivo: 'nao-e-seu', por: atual.dono };
  }
  fs.rmSync(arquivo(recurso), { force: true });
  return { ok: true, motivo: 'solto' };
}

const ehPrincipal = process.argv[1] && process.argv[1].endsWith('lock.mjs');

if (ehPrincipal) {
  const [acao, recurso] = process.argv.slice(2);
  const dono =
    process.argv.find((a) => a.startsWith('--dono='))?.split('=')[1] ?? `pid-${process.pid}`;

  if (acao === 'ver') {
    fs.mkdirSync(RAIZ, { recursive: true });
    const nomes = fs.readdirSync(RAIZ).map((f) => f.replace(/\.json$/, ''));
    if (!nomes.length) console.log('  nenhum lock tomado');
    for (const n of nomes) {
      const l = ler(n);
      console.log(`  ${n.padEnd(12)} ${l.dono.padEnd(20)} ${expirado(l) ? 'EXPIRADO' : 'ativo'}  desde ${l.desde}`);
    }
    process.exit(0);
  }

  if (!acao || !recurso) {
    console.error('uso: lock.mjs <tomar|soltar|ver> <recurso> [--dono=...]');
    process.exit(2);
  }

  const r = acao === 'tomar' ? tomar(recurso, dono) : soltar(recurso, dono);
  console.log(`${r.ok ? 'OK' : 'NEGADO'} ${recurso} — ${r.motivo}${r.por ? ` (com ${r.por})` : ''}${r.de ? ` (de ${r.de})` : ''}`);
  process.exit(r.ok ? 0 : 1);
}
