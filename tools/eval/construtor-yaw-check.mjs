import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const hash = text => createHash('sha256').update(text).digest('hex');
const args = process.argv.slice(2);
const mutant = args.length === 1 && args[0] === '--mutante=seta-invertida' ? 'seta-invertida' : null;
try {
  if (args.length && !mutant) throw new Error('argumentos inválidos');
  const html = readFileSync(new URL('../../public/construtor.html', import.meta.url), 'utf8');
  const game = readFileSync(new URL('../../public/js/game.js', import.meta.url), 'utf8');
  const extract = (source, start, end) => {
    if (source.split(start).length !== 2 || source.split(end).length !== 2 || source.indexOf(end) <= source.indexOf(start))
      throw new Error('âncoras ausentes, duplicadas ou fora de ordem: ' + start);
    return source.slice(source.indexOf(start), source.indexOf(end));
  };
  const coordinates = extract(html, 'function cx()', 'const snap =');
  let mark = extract(html, 'function spawnMark(', '// ---- picking');
  const originalMarkSHA256 = hash(mark);
  let applied = 0;
  if (mutant) {
    for (const anchor of ['fx=-Math.sin', 'fz=-Math.cos'])
      if (mark.split(anchor).length !== 2) throw new Error('alvo de mutação não único: ' + anchor);
    mark = mark.replace('fx=-Math.sin', 'fx=Math.sin').replace('fz=-Math.cos', 'fz=Math.cos');
    applied = 1;
  }
  const spawnYaw = vm.runInNewContext('({' + extract(game, '  _spawnYaw(', '  _pickSpawn(') + '})._spawnYaw');
  let from, to;
  const ctx = { beginPath() {}, arc() {}, fill() {}, stroke() {},
    moveTo(x, y) { from = [x, y]; }, lineTo(x, y) { to = [x, y]; } };
  const scope = { cv: { width: 800, height: 600 }, view: { px: 15, pz: -24, scale: 7 }, ctx };
  vm.createContext(scope);
  vm.runInContext(coordinates + mark, scope);
  const THREE = await import('../../public/vendor/three.module.js');
  const camera = new THREE.PerspectiveCamera();
  const failed = [], cases = [];
  if (applied) console.log('YAW_APPLIED:' + mutant);
  for (const team of ['E', 'B']) for (const [index, yaw] of [0, Math.PI / 2, Math.PI, -Math.PI / 2, .7].entries()) {
    const id = team + index, spawn = { x: 3, z: -5, yaw };
    from = to = null;
    scope.spawnMark(spawn, '#fff');
    camera.rotation.set(0, spawnYaw.call({ world: { authoredSpawnYaw: true } }, spawn, team), 0);
    const direction = camera.getWorldDirection(new THREE.Vector3());
    const expected = scope.w2s(spawn.x + direction.x, spawn.z + direction.z);
    const dot = from && to ? (to[0] - from[0]) * (expected[0] - from[0]) + (to[1] - from[1]) * (expected[1] - from[1]) : NaN;
    if (!(dot > 0)) failed.push({ id, clause: 'orientacao-camera', type: 'AssertionError', dot: Number.isFinite(dot) ? dot : null });
    const botYaw = spawnYaw.call({ world: { authoredSpawnYaw: true } }, spawn, team, true);
    const bot = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), botYaw);
    if (!(bot.dot(direction) > .999999)) failed.push({ id, clause: 'bot-camera-authored', type: 'AssertionError' });
    cases.push(id);
  }
  const sourceUnchanged = hash(readFileSync(new URL('../../public/construtor.html', import.meta.url), 'utf8')) === hash(html)
    && hash(readFileSync(new URL('../../public/js/game.js', import.meta.url), 'utf8')) === hash(game);
  if (!sourceUnchanged) throw new Error('fonte mudou durante a medição');
  console.log('YAW_RESULT:' + JSON.stringify({ tool: 'construtor-yaw', mutant, applied, cases, failed,
    sourceUnchanged, htmlSHA256: hash(html), gameSHA256: hash(game), originalMarkSHA256, measuredMarkSHA256: hash(mark) }));
  process.exitCode = failed.length ? 1 : 0;
} catch (error) {
  console.error('YAW_INFRA:' + error.name + ':' + error.message);
  process.exitCode = 2;
}
