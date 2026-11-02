/* Wrapper do mutante de fluidez (#1179 P2-2): nominal verde + probe causal + cláusula
   exata; crash/sinal/status 42 nunca é aceito. Exit: 0 ok · 1 RED semântico · 2 uso · 3 infra. */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CHECK = 'tools/eval/movimento-fluidez-check.mjs';
const CLAUSULA_ACEL = '90% da velocidade deve chegar em 0,14 a 0,24 s';
const OUTRAS = ['soltar deve dissipar', 'contra-strafe deve estabilizar'];

const argv = process.argv.slice(2);
const nodes = argv.filter((a) => a.startsWith('--node='));
const nodeBin = nodes.at(-1)?.slice(7) || process.execPath;
if (argv.some((a) => !a.startsWith('--node=')) || nodes.length > 1 || nodes.some((a) => a.length === 7)) {
  console.error('uso: node tools/eval/movimento-mutant-check.mjs [--node=<bin>]');
  process.exit(2);
}

const run = (extra) => {
  const r = spawnSync(nodeBin, [CHECK, ...extra], { encoding: 'utf8', cwd: ROOT });
  return { status: r.status, signal: r.signal ?? null, stdout: r.stdout || '', stderr: r.stderr || '', erro: r.error?.message || null };
};
const infraRun = (tag, r) => { console.error(`infra: ${tag} não executou (${r.erro ?? `signal ${r.signal}`})\n${r.stderr.slice(-600)}`); process.exit(3); };

/* 1. nominal: tem que estar verde antes de o mutante dizer qualquer coisa */
const nom = run([]);
if (nom.erro || nom.signal !== null) infraRun('nominal', nom);
if (nom.status === null || ![0, 1].includes(nom.status)) {
  console.error(`infra: nominal saiu com status inesperado ${nom.status}\n${nom.stderr.slice(-600)}`);
  process.exit(3);
}
if (nom.status !== 0) {
  const medido = nom.stderr + nom.stdout;
  if (!medido.includes('AssertionError') || ![CLAUSULA_ACEL, ...OUTRAS].some((c) => medido.includes(c))) {
    console.error(`infra: nominal falhou antes de uma cláusula medida\n${medido.slice(-600)}`);
    process.exit(3);
  }
  console.error(`RED semântico: nominal não verde\n${nom.stderr.slice(-600)}`);
  process.exit(1);
}
console.log(nom.stdout.trim());

/* 2. probe causal: o hook __mutAccel muda o comportamento da Game REAL */
const { bootGame, initTextures } = await import(pathToFileURL(path.join(ROOT, 'tools/eval/harness.mjs')));
const game = bootGame('praca_poderes', { textures: initTextures(), ctf: true, seed: 12345 });
const probe = (mut) => {
  const p = game.player;
  p.pos.set(0, 0, 0); p.vel.set(0, 0, 0); p.yaw = 0; p.grounded = true; p.crouchF = 0; p.weapon = 'ak'; p._spaceHeld = false;
  game.__mutAccel = mut;
  for (let i = 0; i < 3; i++) game._moveEntity(p, { ax: 0, az: -1, crouch: false, shift: false, jump: false }, 1 / 60);
  return Math.hypot(p.vel.x, p.vel.z);
};
const v0 = probe(0), v44 = probe(44);
if (!(v44 > v0 * 1.5 && v44 >= game._maxSp * 0.75 && v0 < game._maxSp * 0.6)) {
  console.error(`RED semântico: hook __mutAccel sem efeito (v0=${v0.toFixed(2)}, v44=${v44.toFixed(2)}, max=${game._maxSp})`);
  process.exit(1);
}
console.log(`probe __mutAccel aplicado: 3 frames v0=${v0.toFixed(2)} m/s → v44=${v44.toFixed(2)} m/s (max ${game._maxSp})`);

/* 3. mutante: falha com a cláusula exata de aceleração e nenhuma outra */
const mut = run(['--mutante=acel-dura']);
if (mut.erro || mut.signal !== null) infraRun('mutante', mut);
const sem = mut.stdout + mut.stderr;
if (mut.status === null || ![0, 1].includes(mut.status)) {
  console.error(`infra: mutante saiu com status inesperado ${mut.status} — nunca aceito como detecção\n${sem.slice(-600)}`);
  process.exit(3);
}
if (mut.status === 0) {
  console.error('RED semântico: mutante sobreviveu (régua cega)\n' + mut.stdout.slice(-600));
  process.exit(1);
}
if (!sem.includes('AssertionError') || !sem.includes(CLAUSULA_ACEL) || OUTRAS.some((c) => sem.includes(c))) {
  if (!sem.includes('AssertionError') || ![CLAUSULA_ACEL, ...OUTRAS].some((c) => sem.includes(c))) {
    console.error(`infra: mutante falhou antes de uma cláusula medida\n${sem.slice(-600)}`);
    process.exit(3);
  }
  console.error(`RED semântico: falha não é exatamente a cláusula de aceleração\n${sem.slice(-600)}`);
  process.exit(1);
}
console.log(`MUTANTE MORDE: acel-dura reprova exatamente "${CLAUSULA_ACEL}"`);
process.exit(0);
