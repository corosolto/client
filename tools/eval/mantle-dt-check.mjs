/* Cobertura392b: QA portátil de dt50; não altera Game nem o contrato0.18m/60Hz.
   Braços frios, fixture/roster reais pareados, todas as amostras e mortes causais.
   Metas sintéticos de parser são separados dos recibos Game e do controle REALB60Hz. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const TOOL = 'mantle-dt-check.mjs';
const WORKER_PROTOCOL = 'DT50_392_RESULT:', FAIL_PROTOCOL = 'DT50_392_FAIL:';
const PAIR_PROTOCOL = 'DT50_392_PAIRS:';
const TIMES = '[times] E 4 × 4 B (pedido 4 × 4)';
const ROLES = ['A', 'B'], DT = { A: 1 / 60, B: 0.05 };
const MUTANTES = ['relogio-dt', 'alvo-deslocado', 'teleporte'];
const ESPERADA = { 'relogio-dt': 'MF50_REL', 'alvo-deslocado': 'MF50_COMUM', teleporte: 'MF50_COMUM' };
const POST = {
  'relogio-dt': `POST ${TOOL} mutante=relogio-dt aplicado relógio avança0.05 mas física integra1/60`,
  'alvo-deslocado': `POST ${TOOL} mutante=alvo-deslocado aplicado alvo z1 deslocado após begin real`,
  teleporte: `POST ${TOOL} mutante=teleporte aplicado posição intermediária no destino; relógio/terminal reais`,
  'baseline-60hz': `POST ${TOOL} controle=baseline-60hz aplicado baselineB REAL em1/60; mutantesB permanecem0.05`,
};
const CLAUSULAS = new Set(['MF_TRAJ', 'MF_SUBIDA', 'MF_POUSO', 'MF_CHAO', 'MF_ESTADO',
  'MF50_DT', 'MF50_FIX', 'MF50_TERM', 'MF50_REL', 'MF50_COMUM', 'MF50_POUSO', 'MF50_CHAO', 'MF50_ESTADO']);
const MF_POUSO_TOL = 1e-6; // A única tolerância espacial, já existente em MF_POUSO.
const SELF_PATH = fileURLToPath(import.meta.url);
const START = { x: -4.1, y: -1.53, z: -27.8 };
const INPUT = { ax: 0, az: -1, crouch: false, shift: false };
let THREE, bootGame, initTextures;
class InfraError extends Error { constructor(kind, msg) { super(msg); this.name = 'InfraError'; this.kind = kind; } }
const randomOriginal = Math.random;
const ESTADO = { modo: null, mutante: null, role: null, arm: null, verde: null, receipt: null };
let receiptFeito = false;
const eSemantico = (e) => e instanceof assert.AssertionError && CLAUSULAS.has(e.clausula) && !e.cleanupFault;
function finaliza(erro) {
  if (receiptFeito) { process.exitCode = 2; return; }
  receiptFeito = true;
  if (erro) {
    writeSync(2, FAIL_PROTOCOL + JSON.stringify({ tool: TOOL, modo: ESTADO.modo, mutante: ESTADO.mutante,
      tipo: erro?.name || 'Error', clausula: erro?.clausula || '', kind: erro?.kind || '',
      semantico: eSemantico(erro), cleanupFault: erro?.cleanupFault || null }) + '\n');
    writeSync(2, (erro?.stack ?? String(erro)) + '\n');
  } else if (ESTADO.role) {
    writeSync(1, WORKER_PROTOCOL + JSON.stringify({ role: ESTADO.role, coldProcess: true,
      rngRestoredIdentity: Math.random === randomOriginal, arm: ESTADO.arm }) + '\n');
  } else {
    if (ESTADO.receipt) writeSync(1, PAIR_PROTOCOL + JSON.stringify(ESTADO.receipt) + '\n');
    writeSync(1, ESTADO.verde + '\n');
  }
  process.exitCode = erro ? (eSemantico(erro) ? 1 : 2) : 0;
}
process.on('uncaughtException', (e) => finaliza(e));
process.on('unhandledRejection', (e) => finaliza(e));
const clausula = (tag, corpo) => {
  try { corpo(); } catch (e) { if (e instanceof assert.AssertionError) e.clausula = tag; throw e; }
};
const infra = (ok, kind, message) => { if (!ok) throw new InfraError(kind, message); };
function parseArgv() {
  const a = process.argv.slice(2);
  if (a.length === 0) return { modo: 'normal' };
  if (a.length === 1 && a[0] === '--autoteste') return { modo: 'autoteste' };
  if (a.length === 1 && a[0].startsWith('--mutante=') && MUTANTES.includes(a[0].slice(10)))
    return { modo: 'mutante', mutante: a[0].slice(10) };
  if (a.length === 1 && ROLES.includes(a[0])) return { modo: 'child', role: a[0] };
  if (a.length === 2 && a[0] === 'B' && a[1].startsWith('--mutante=') && MUTANTES.includes(a[1].slice(10)))
    return { modo: 'child', role: 'B', mutante: a[1].slice(10) };
  if (a.length === 2 && a[0] === 'B' && a[1] === '--controle=baseline-60hz')
    return { modo: 'child', role: 'B', controle: 'baseline-60hz' };
  throw new InfraError('cli', `uso: node tools/eval/${TOOL} [--autoteste|--mutante=<id>] | A | B [--mutante=<id>|--controle=baseline-60hz]`);
}
function preflight() {
  infra((process.version.startsWith('v22.') || process.version.startsWith('v26.')) && !process.env.NODE_OPTIONS && !process.env.SIM_QS && !process.execArgv.length,
    'env', 'Node22/26 sem NODE_OPTIONS/SIM_QS/execArgv obrigatório');
}
const plain = (o) => o !== null && typeof o === 'object' && Object.getPrototypeOf(o) === Object.prototype;
const finite = (n) => typeof n === 'number' && Number.isFinite(n);
const vec3 = (v) => Array.isArray(v) && v.length === 3 && v.every(finite);
const deepFinite = (o) => typeof o === 'number' ? finite(o) : o === null || ['string', 'boolean'].includes(typeof o)
  || (Array.isArray(o) ? o.every(deepFinite) : plain(o) && Object.values(o).every(deepFinite));
function snapshotEntity(p) {
  return { def: { id: p.def?.id ?? null, name: p.def?.name ?? null, team: p.def?.team ?? null },
    team: p.team ?? null, weapon: p.weapon ?? null, skill: p.skill ?? null,
    pos: p.pos?.toArray() ?? null, vel: p.vel?.toArray() ?? null, yaw: p.yaw ?? null,
    hp: p.hp ?? null, alive: p.alive ?? null, mag: p.mag ?? null,
    grounded: p.grounded ?? null, crouchF: p.crouchF ?? null,
    jumpBufferedUntil: p.jumpBufferedUntil ?? null, coyoteUntil: p.coyoteUntil ?? null, mantleAtivo: !!p.mantle };
}
async function carregaHarness() {
  try { ({ THREE, bootGame, initTextures } = await import('./harness.mjs')); }
  catch (e) { const erro = new InfraError('import', `harness: ${e?.name || 'Error'}: ${e?.message || e}`); erro.cause = e; throw erro; }
}
function rodaArm(role, mutante = null, controle = null) {
  const dt = controle ? DT.A : DT[role];
  let game = null, primario = null;
  try {
    game = bootGame('fy_corrego', { textures: initTextures(), ctf: true, seed: 12345 });
    const player = game.player, start = new THREE.Vector3(START.x, START.y, START.z);
    infra(game._mAlc && game._mapId === 'corrego', 'fixture', 'território/mapa resolvido divergente');
    const target = game._mantleTarget(start, 0, 1);
    infra(target && [target.x, target.y, target.z].every(finite), 'fixture', 'alvo natural inválido');
    const broadphase = game._mantleColliders(start.x, start.z).length;
    infra(broadphase < game.world.colliders.length, 'fixture', 'broadphase deixou de reduzir colisores');
    player.pos.copy(start); player.vel.set(0, 0, 0); player.yaw = Math.PI; player.grounded = true;
    player.crouchF = 0; player._spaceHeld = false; player.jumpBufferedUntil = 0; player.coyoteUntil = 0; player._mantleScanAt = 0;
    const roster = { player: snapshotEntity(player), bots: game.bots.map(snapshotEntity) };
    const setupPre = { mapPedido: 'fy_corrego', mapId: game._mapId, ctf: true, seed: 12345,
      colliders: game.world.colliders.length, broadphaseLocal: broadphase,
      players: game.players?.length ?? null, bots: game.bots.length, start: start.toArray(), dir: [0, 1], input: INPUT };
    infra(deepFinite(roster) && vec3(roster.player.pos) && vec3(roster.player.vel)
      && roster.bots.every((b) => vec3(b.pos) && finite(b.skill)), 'fixture', 'roster real incompleto/não finito');
    const stepDt = mutante === 'relogio-dt' ? DT.A : dt;
    if (controle) writeSync(2, POST[controle] + '\n');
    if (mutante === 'relogio-dt') writeSync(2, POST[mutante] + '\n');
    if (mutante === 'teleporte') {
      const real = game._stepMantle;
      game._stepMantle = function (p, tick) {
        const value = real.call(this, p, tick);
        if (p.mantle) p.pos.set(p.mantle.x1, p.mantle.y1, p.mantle.z1);
        return value;
      };
      writeSync(2, POST[mutante] + '\n');
    }
    const t0 = game.time, serie = [];
    let iniciou = false, beginMantle = null, beginFrame = -1, terminal = null, fimPor = 'limite60';
    let maxStepXZ = 0, maxStep3D = 0, deslocou = false;
    for (let frame = 0; frame < 60; frame++) {
      const antes = player.pos.clone(), mAntes = player.mantle, tAntes = mAntes ? mAntes.t : null;
      game.time = t0 + (frame + 1) * dt;
      const input = { ...INPUT, jump: frame === 0 };
      game._moveEntity(player, input, stepDt);
      const depois = player.pos.clone(), stepXZ = Math.hypot(depois.x - antes.x, depois.z - antes.z);
      maxStepXZ = Math.max(maxStepXZ, stepXZ); maxStep3D = Math.max(maxStep3D, depois.distanceTo(antes));
      if (player.mantle && !iniciou) {
        iniciou = true; beginFrame = frame; const m = player.mantle;
        // t é observado após o primeiro passo; origens/destino/duração pareados sem descartar t do recibo.
        beginMantle = { x0: m.x0, y0: m.y0, z0: m.z0, x1: m.x1, y1: m.y1, z1: m.z1, t: m.t, dur: m.dur };
        if (mutante === 'alvo-deslocado' && !deslocou) {
          deslocou = true; m.z1 -= 0.05; writeSync(2, POST[mutante] + '\n');
        }
      }
      if (mAntes && !player.mantle) terminal = { frame, tAntes, dur: mAntes.dur, tDepois: mAntes.t,
        ended: player.mantle === null && player.grounded === true };
      serie.push({ frame, dt, physicsDT: stepDt, tempoAcumulado: (frame + 1) * dt, input,
        pos: depois.toArray(), stepXZ, step3D: depois.distanceTo(antes), mantleF: player.mantleF ?? 0,
        mantleAtivo: !!player.mantle, grounded: player.grounded === true });
      if (iniciou && !player.mantle) { fimPor = 'fimMantle'; break; }
    }
    return { role, dt, requestedDT: DT[role], physicsDT: stepDt, mutante, controle,
      updates: serie.length, fimPor, serie, maxStepXZ, maxStep3D, beginMantle, beginFrame, terminal,
      naturalTarget: { x: target.x, y: target.y, z: target.z }, setupPre, roster,
      elapsed: game.time - t0, posFinal: player.pos.toArray(), erroPouso: player.pos.distanceTo(new THREE.Vector3(target.x, target.y, target.z)),
      groundedFinal: player.grounded === true, mantleFinal: player.mantle === null };
  } catch (e) { primario = e; throw e; }
  finally {
    try { if (game) game.dispose(); }
    catch (e) { if (primario) primario.cleanupFault = `${e?.name}: ${e?.message}`; else throw new InfraError('cleanup', String(e?.stack || e)); }
  }
}
function schemaEntity(e, bot = false) {
  return plain(e) && Object.keys(e).join(',') === 'def,team,weapon,skill,pos,vel,yaw,hp,alive,mag,grounded,crouchF,jumpBufferedUntil,coyoteUntil,mantleAtivo'
    && plain(e.def) && Object.keys(e.def).join(',') === 'id,name,team' && typeof e.def.name === 'string'
    && ['E', 'B'].includes(e.team) && typeof e.weapon === 'string' && vec3(e.pos)
    && (e.vel === null || vec3(e.vel)) && finite(e.yaw) && finite(e.hp) && (e.mag === null || finite(e.mag))
    && (e.skill === null || finite(e.skill)) && typeof e.alive === 'boolean'
    && (typeof e.grounded === 'boolean' || (bot && e.grounded === null))
    && (e.crouchF === null || finite(e.crouchF)) && (e.jumpBufferedUntil === null || finite(e.jumpBufferedUntil))
    && (e.coyoteUntil === null || finite(e.coyoteUntil)) && typeof e.mantleAtivo === 'boolean';
}
function schemaArm(a, role, mutante, controle) {
  infra(plain(a) && deepFinite(a) && a.role === role && a.mutante === mutante && a.controle === controle,
    'schema', 'papel/modo/campos finitos do braço divergentes');
  infra(finite(a.dt) && a.dt > 0 && finite(a.requestedDT) && finite(a.physicsDT) && a.physicsDT > 0
    && Number.isInteger(a.updates) && a.updates > 0 && a.updates <= 60 && Array.isArray(a.serie) && a.updates === a.serie.length,
    'schema', 'dts/contagem/série inválidos');
  infra(plain(a.beginMantle) && ['x0', 'y0', 'z0', 'x1', 'y1', 'z1', 't', 'dur'].every((k) => finite(a.beginMantle[k]))
    && a.beginMantle.dur > 0 && Number.isInteger(a.beginFrame) && a.beginFrame >= 0 && a.beginFrame < a.updates
    && plain(a.naturalTarget) && ['x', 'y', 'z'].every((k) => finite(a.naturalTarget[k]))
    && vec3(a.posFinal) && finite(a.maxStepXZ) && finite(a.maxStep3D) && finite(a.elapsed) && finite(a.erroPouso)
    && typeof a.groundedFinal === 'boolean' && typeof a.mantleFinal === 'boolean', 'schema', 'estado físico incompleto');
  infra(plain(a.setupPre) && plain(a.roster) && plain(a.roster.player) && Array.isArray(a.roster.bots)
    && a.setupPre.mapPedido === 'fy_corrego' && a.setupPre.mapId === 'corrego' && a.setupPre.ctf === true && a.setupPre.seed === 12345
    && JSON.stringify(a.setupPre.start) === JSON.stringify(Object.values(START))
    && JSON.stringify(a.setupPre.input) === JSON.stringify(INPUT)
    && JSON.stringify(a.setupPre.dir) === '[0,1]' && Number.isInteger(a.setupPre.bots) && a.setupPre.bots === a.roster.bots.length
    && schemaEntity(a.roster.player) && vec3(a.roster.player.vel)
    && a.roster.bots.every((b) => schemaEntity(b, true) && finite(b.skill) && finite(b.mag)), 'schema', 'fixture/roster incompletos');
  for (const [i, s] of a.serie.entries()) infra(plain(s) && s.frame === i && s.dt === a.dt && s.physicsDT === a.physicsDT
    && s.tempoAcumulado === (i + 1) * a.dt && vec3(s.pos) && finite(s.stepXZ) && finite(s.step3D) && finite(s.mantleF)
    && typeof s.mantleAtivo === 'boolean' && typeof s.grounded === 'boolean'
    && JSON.stringify(s.input) === JSON.stringify({ ...INPUT, jump: i === 0 }), 'schema', `amostra${i} incompleta/fora de ordem`);
}
function lines(s) {
  infra(typeof s === 'string' && s.endsWith('\n'), 'child', 'stream não terminado');
  return s.slice(0, -1).split('\n');
}
function stderrPermitido(text, marker) {
  const all = text === '' ? [] : lines(text), posts = all.filter((s) => s.startsWith('POST '));
  infra(marker ? posts.length === 1 && posts[0] === marker : posts.length === 0, 'child', 'POST ausente/duplicado/alheio');
  const warnings = all.filter((s) => !s.startsWith('POST '));
  const first = /^\(node:[1-9]\d*\) ExperimentalWarning: localStorage is not available because --localstorage-file was not provided\.$/;
  infra(warnings.length === 0 || (warnings.length <= 2 && first.test(warnings[0])
    && (warnings.length === 1 || warnings[1] === '(Use `node --trace-warnings ...` to show where the warning was created)')),
  'child', 'stderr contém linha não permitida');
}
function parseChild(role, r, mutante = null, controle = null) {
  infra(!r.error && !r.signal && r.status === 0, 'child', 'spawn/sinal/timeout/exit do worker');
  const out = lines(r.stdout), marker = mutante ? POST[mutante] : controle ? POST[controle] : null;
  infra(out.length === 2 && out[0] === TIMES && out[1].startsWith(WORKER_PROTOCOL), 'child', 'stdout deve ser TIMES+protocoloLAST, nada mais');
  stderrPermitido(r.stderr, marker);
  let d;
  try { const payload = out[1].slice(WORKER_PROTOCOL.length); d = JSON.parse(payload);
    infra(JSON.stringify(d) === payload, 'child', 'JSON não canônico/duplicado'); }
  catch (e) { throw new InfraError('child', `JSON inválido: ${e.message}`); }
  infra(plain(d) && Object.keys(d).join(',') === 'role,coldProcess,rngRestoredIdentity,arm'
    && d.role === role && d.coldProcess === true && d.rngRestoredIdentity === true, 'child', 'identidade do recibo');
  schemaArm(d.arm, role, mutante, controle); return d.arm;
}
const children = [];
function childArm(role, mutante = null, controle = null) {
  const args = [SELF_PATH, role, ...(mutante ? [`--mutante=${mutante}`] : controle ? [`--controle=${controle}`] : [])];
  const r = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 60000, maxBuffer: 4 * 1024 * 1024, env: process.env });
  const hash = (s) => createHash('sha256').update(s || '').digest('hex');
  children.push({ role, mutante, controle, argv: [process.execPath, ...args], status: r.status, signal: r.signal,
    error: r.error ? String(r.error.message) : null, stdoutRaw: r.stdout ?? null, stderrRaw: r.stderr ?? null,
    stdoutSHA256: hash(r.stdout), stderrSHA256: hash(r.stderr) });
  return { r, arm: parseChild(role, r, mutante, controle) };
}
function clausulasDT(A, B, mutante = null) {
  clausula('MF50_DT', () => assert(A.role === 'A' && B.role === 'B' && A.dt === DT.A && A.requestedDT === DT.A && A.physicsDT === DT.A
    && B.dt === DT.B && B.requestedDT === DT.B && B.physicsDT === (mutante === 'relogio-dt' ? DT.A : DT.B),
  'braços devem medir A1/60 eB0.05 reais; controles não podem substituir baseline'));
}
function parear(A, B) {
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  infra(equal(A.naturalTarget, B.naturalTarget) && equal(A.setupPre, B.setupPre) && equal(A.roster, B.roster)
    && ['x0', 'y0', 'z0', 'x1', 'y1', 'z1', 'dur'].every((k) => A.beginMantle[k] === B.beginMantle[k]),
  'pairing', 'fixture/roster/origem/destino/duração não idênticos');
}
function temposComuns(A, B) {
  const stride = DT.B / DT.A;
  infra(Number.isInteger(stride) && stride === 3, 'clock', 'razão de passos alterada');
  return B.serie.map((b, j) => {
    const i = stride * (j + 1) - 1, a = A.serie[i];
    infra(a && a.frame === i && b.frame === j, 'clock', 'amostra comum ausente; nenhumskip permitido');
    return { a: i, b: j, timeA: a.tempoAcumulado, timeB: b.tempoAcumulado,
      posA: a.pos, posB: b.pos, delta: Math.hypot(...a.pos.map((v, k) => v - b.pos[k])) };
  });
}
function clausulasA(A) {
  clausula('MF_TRAJ', () => assert(A.beginMantle && A.updates >= 18 && A.updates <= 28 && A.maxStep3D <= 0.18,
    'A: contrato60Hz de18..28quadros/passo0.18 não cumprido'));
  const cedo = A.serie[Math.floor(A.updates * 0.30)].pos, p = A.roster.player.pos, t = A.naturalTarget;
  clausula('MF_SUBIDA', () => assert((cedo[1] - p[1]) / (t.y - p[1]) >= Math.hypot(cedo[0] - p[0], cedo[2] - p[2]) / Math.hypot(t.x - p[0], t.z - p[2]) + 0.15,
    'A: corpo não sobe antes de avançar'));
  clausula('MF_POUSO', () => assert(A.erroPouso < MF_POUSO_TOL, 'A: pouso divergente'));
  clausula('MF_CHAO', () => assert.equal(A.groundedFinal, true));
  clausula('MF_ESTADO', () => assert.equal(A.mantleFinal, true));
}
function clausulasB(B, obterPares) {
  clausula('MF50_FIX', () => assert(B.beginMantle, 'B: não iniciou mantle'));
  clausula('MF50_TERM', () => assert(B.fimPor === 'fimMantle' && B.terminal?.ended === true, 'B: não terminou naturalmente'));
  clausula('MF50_REL', () => {
    const t = B.terminal, desde = (B.updates - B.beginFrame) * B.dt;
    assert(t && finite(t.dur) && t.dur > 0 && t.tDepois === t.dur && t.tAntes < t.dur
      && desde - t.dur >= 0 && desde - t.dur <= B.dt && B.elapsed === B.updates * B.dt,
    'B: duração/relógio físico divergem além de uma atualização');
  });
  // O relógio deve ser julgado antes de pedir amostras além do braçoA.
  const pares = typeof obterPares === 'function' ? obterPares() : obterPares;
  clausula('MF50_COMUM', () => assert(B.updates === 8 && pares.length === B.updates && pares.every((p) => p.delta <= MF_POUSO_TOL),
    'B: TODAS as posições comuns devem concordar comA (tol MF_POUSO)'));
  clausula('MF50_POUSO', () => assert(B.erroPouso < MF_POUSO_TOL, 'B: pouso divergente'));
  clausula('MF50_CHAO', () => assert.equal(B.groundedFinal, true));
  clausula('MF50_ESTADO', () => assert.equal(B.mantleFinal, true));
}
function morteEsperada(expected, fn) {
  let caught = null;
  try { fn(); } catch (e) { caught = e; }
  infra(eSemantico(caught) && caught.clausula === expected, 'mutante', `morte causal${expected} ausente oualheia`);
  return { tipo: caught.name, clausula: caught.clausula, nativeAssertion: true };
}
function casoMutante(A, mutante) {
  const { arm } = childArm('B', mutante);
  clausulasDT(A, arm, mutante); parear(A, arm);
  const death = morteEsperada(ESPERADA[mutante], () => clausulasB(arm, () => temposComuns(A, arm)));
  return { mutante, applied: true, actualDT: arm.dt, physicsDT: arm.physicsDT, death, arm };
}
function parserFixture(role) { // Dados SINTÉTICOS só para testar o parser, nunca evidência física.
  const dt = DT[role], n = role === 'A' ? 24 : 8, p = Object.values(START);
  const entity = { def: { id: 'synthetic', name: 'synthetic', team: 'E' }, team: 'E', weapon: 'ak', skill: 1,
    pos: p, vel: [0, 0, 0], yaw: Math.PI, hp: 100, alive: true, mag: 30, grounded: true,
    crouchF: 0, jumpBufferedUntil: 0, coyoteUntil: 0, mantleAtivo: false };
  return { role, dt, requestedDT: dt, physicsDT: dt, mutante: null, controle: null, updates: n, fimPor: 'fimMantle',
    serie: Array.from({ length: n }, (_, frame) => ({ frame, dt, physicsDT: dt, tempoAcumulado: (frame + 1) * dt,
      input: { ...INPUT, jump: frame === 0 }, pos: p, stepXZ: 0, step3D: 0, mantleF: 0, mantleAtivo: frame < n - 1, grounded: frame === n - 1 })),
    maxStepXZ: 0, maxStep3D: 0, beginMantle: { x0: START.x, y0: START.y, z0: START.z, x1: START.x, y1: 0, z1: -26.47, t: dt, dur: 0.393 },
    beginFrame: 0, terminal: { frame: n - 1, tAntes: 0.35, tDepois: 0.393, dur: 0.393, ended: true },
    naturalTarget: { x: START.x, y: 0, z: -26.47 },
    setupPre: { mapPedido: 'fy_corrego', mapId: 'corrego', ctf: true, seed: 12345, colliders: 303, broadphaseLocal: 9, players: null, bots: 1, start: p, dir: [0, 1], input: INPUT },
    roster: { player: entity, bots: [entity] }, elapsed: n * dt, posFinal: p, erroPouso: 0, groundedFinal: true, mantleFinal: true };
}
function metaNative() {
  const native = new assert.AssertionError({ message: 'controle nativo' }); native.clausula = 'MF50_COMUM';
  assert(eSemantico(native));
  const forged = new Error('forjado'); forged.name = 'AssertionError';
  for (const error of [forged, new TypeError('infra'), new ReferenceError('infra'), new SyntaxError('infra'), new InfraError('fixture', 'infra')]) {
    error.clausula = 'MF50_COMUM'; assert(!eSemantico(error), 'erroalheio não pode ser morte semântica');
  }
  const cleanup = new assert.AssertionError({ message: 'primário' }); cleanup.clausula = 'MF50_COMUM'; cleanup.cleanupFault = 'secundário';
  assert(!eSemantico(cleanup));
  for (const error of [forged, new TypeError('infra'), new ReferenceError('infra'), new SyntaxError('infra'),
    Object.assign(new assert.AssertionError({ message: 'morte causal alheia' }), { clausula: 'MF50_TERM' })]) {
    if (!(error instanceof assert.AssertionError)) error.clausula = 'MF50_COMUM';
    let recusado = null;
    try { morteEsperada('MF50_COMUM', () => { throw error; }); } catch (e) { recusado = e; }
    assert(recusado instanceof InfraError, 'morte alheia/forjada não prova trajetória');
  }
}
function metaParser(valid, role = 'B') {
  const clone = (r) => ({ ...r }); parseChild(role, valid);
  const bads = [{ ...valid, status: 1 }, { ...valid, status: 2 }, { ...valid, signal: 'SIGKILL' },
    { ...valid, error: new Error('spawn') }, { ...valid, error: Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }) },
    { ...valid, stdout: valid.stdout + 'lixo\n' }, { ...valid, stdout: valid.stdout + FAIL_PROTOCOL + '{}\n' },
    { ...valid, stdout: valid.stdout.split('\n').slice(1).join('\n') },
    { ...valid, stdout: valid.stdout.replace(TIMES, TIMES + '\n' + TIMES) },
    { ...valid, stdout: valid.stdout.replace(TIMES, '[times] outro') },
    { ...valid, stdout: valid.stdout.split('\n').reverse().join('\n') },
    { ...valid, stdout: '', stderr: valid.stdout }, { ...valid, stderr: valid.stderr + 'Error: alheio\n' },
    { ...valid, stderr: valid.stderr + `POST ${TOOL} mutante=teleporte aplicado falso\n` }];
  for (const bad of bads) {
    let e = null; try { parseChild(role, bad); } catch (error) { e = error; }
    assert(e instanceof InfraError, 'tamper de stream/spawn deve ser infra2');
  }
  const decoded = JSON.parse(valid.stdout.split('\n')[1].slice(WORKER_PROTOCOL.length));
  const botsWithoutGrounded = JSON.parse(JSON.stringify(decoded));
  for (const bot of botsWithoutGrounded.arm.roster.bots) bot.grounded = null;
  const nullBotRecord = { ...valid, stdout: TIMES + '\n' + WORKER_PROTOCOL + JSON.stringify(botsWithoutGrounded) + '\n' };
  const parsedNullBots = parseChild(role, nullBotRecord);
  assert(parsedNullBots.roster.bots.every((bot) => bot.grounded === null), 'parser deve preservar grounded null legítimo dos bots');
  for (const change of [
    (d) => { d.rngRestoredIdentity = false; }, (d) => { d.role = role === 'A' ? 'B' : 'A'; },
    (d) => { d.arm.serie[0].tempoAcumulado += 0.05; }, (d) => { d.arm.serie[0].pos[1] = null; },
    (d) => { d.arm.serie.splice(0, 1); }, (d) => { d.arm.serie[0].frame = 2; },
    (d) => { delete d.arm.roster.player.weapon; }, (d) => { d.arm.roster.bots.pop(); },
    (d) => { d.arm.roster.player.grounded = null; },
    (d) => { d.arm.setupPre.dir = [1, 0]; },
  ]) {
    const d = JSON.parse(JSON.stringify(decoded)); change(d);
    const bad = clone(valid); bad.stdout = TIMES + '\n' + WORKER_PROTOCOL + JSON.stringify(d) + '\n';
    let e = null; try { parseChild(role, bad); } catch (error) { e = error; }
    assert(e instanceof InfraError, 'schema/tempo adulterado deve ser infra2');
  }
  return bads.length + 10 + 1; // dez negativos de schema e um positivo grounded null de bot.
}
let falha = null;
try {
  const ARGS = parseArgv(); ESTADO.modo = ARGS.modo; ESTADO.mutante = ARGS.mutante ?? null; preflight();
  if (ARGS.modo === 'child') {
    ESTADO.role = ARGS.role; await carregaHarness(); ESTADO.arm = rodaArm(ARGS.role, ARGS.mutante ?? null, ARGS.controle ?? null);
  } else {
    metaNative();
    const payload = { role: 'B', coldProcess: true, rngRestoredIdentity: true, arm: parserFixture('B') };
    const syntheticTests = metaParser({ status: 0, error: null, signal: null, stdout: TIMES + '\n' + WORKER_PROTOCOL + JSON.stringify(payload) + '\n', stderr: '' });
    if (ARGS.modo === 'autoteste') ESTADO.verde = `VERDE ${TOOL}: metas sintéticos de parser/native${syntheticTests}`;
    else {
      const ca = childArm('A'), cb = childArm('B'), A = ca.arm, B = cb.arm;
      const actualTamperTests = metaParser(ca.r, 'A') + metaParser(cb.r, 'B');
      clausulasDT(A, B); parear(A, B); const pares = temposComuns(A, B); clausulasA(A); clausulasB(B, pares);
      const alvoMut = ARGS.modo === 'mutante' ? [ARGS.mutante] : MUTANTES;
      const mutantes = alvoMut.map((m) => casoMutante(A, m));
      const wrong = childArm('B', null, 'baseline-60hz').arm;
      const wrongDeath = morteEsperada('MF50_DT', () => clausulasDT(A, wrong));
      infra(mutantes.every((m) => m.actualDT === DT.B), 'control', 'contraprova não mantém mutantesB em0.05');
      ESTADO.receipt = { tool: TOOL, baseline: { A, B }, commonTimes: pares, mutantes,
        wrongBaselineControl: { realGame: true, requestedDT: DT.B, actualDT: wrong.dt, arm: wrong, death: wrongDeath,
          mutantsStillAt05: mutantes.map((m) => ({ name: m.mutante, dt: m.actualDT })) },
        parserTests: { synthetic: syntheticTests, actualRecordTamper: actualTamperTests }, children,
        scope: 'CPU real_moveEntity; metas rotulados; sem Gameupdate/browser/rede/humano' };
      ESTADO.verde = `VERDE ${TOOL}: A60Hz${A.updates}/B50ms${B.updates}; todos${pares.length}pares; mortes causais; controle REALB60Hz/MF50_DT`;
    }
  }
} catch (e) { falha = e; }
finally { Math.random = randomOriginal; }
if (Math.random !== randomOriginal) { const e = new InfraError('cleanup', 'Math.random não restaurado'); if (falha) e.cause = falha; falha = e; }
finaliza(falha);
