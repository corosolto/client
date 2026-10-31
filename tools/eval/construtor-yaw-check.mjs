import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../../public/vendor/three.module.js';

const html = readFileSync(new URL('../../public/construtor.html', import.meta.url), 'utf8');
const game = readFileSync(new URL('../../public/js/game.js', import.meta.url), 'utf8');
const coordinates = html.slice(html.indexOf('function cx()'), html.indexOf('const snap ='));
let mark = html.slice(html.indexOf('function spawnMark('), html.indexOf('// ---- picking'));
const mutant = process.argv.includes('--mutante=seta-invertida');
if (mutant) {
  const changed = mark.replace('fx=-Math.sin', 'fx=Math.sin').replace('fz=-Math.cos', 'fz=Math.cos');
  assert.notEqual(changed, mark, 'mutante deve alterar a função real');
  mark = changed;
  console.log('Mutante seta-invertida aplicado à função real');
}
const yawSource = game.slice(game.indexOf('  _spawnYaw('), game.indexOf('  _pickSpawn('));
const spawnYaw = vm.runInNewContext('({' + yawSource + '})._spawnYaw');
let from, to;
const ctx = { beginPath() {}, arc() {}, fill() {}, stroke() {},
  moveTo(x, y) { from = [x, y]; }, lineTo(x, y) { to = [x, y]; } };
const scope = { cv: { width: 800, height: 600 }, view: { px: 15, pz: -24, scale: 7 }, ctx };
vm.createContext(scope);
vm.runInContext(coordinates + mark, scope);
const camera = new THREE.PerspectiveCamera();
let checks = 0;
for (const team of ['E', 'B']) for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2, .7]) {
  const spawn = { x: 3, z: -5, yaw };
  scope.spawnMark(spawn, '#fff');
  camera.rotation.set(0, spawnYaw.call({ world: { authoredSpawnYaw: true } }, spawn, team), 0);
  const direction = camera.getWorldDirection(new THREE.Vector3());
  const expected = scope.w2s(spawn.x + direction.x, spawn.z + direction.z);
  const dot = (to[0] - from[0]) * (expected[0] - from[0]) + (to[1] - from[1]) * (expected[1] - from[1]);
  assert.ok(dot > 0, `seta deve apontar para onde a câmera nasce: ${team}, yaw=${yaw}, dot=${dot}`);
  const botYaw = spawnYaw.call({ world: { authoredSpawnYaw: true } }, spawn, team, true);
  const bot = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), botYaw);
  assert.ok(bot.dot(direction) > .999999, 'bot e câmera compartilham orientação authored');
  checks++;
}
console.log(`CONSTRUTOR YAW VERDE: ${checks} orientações medidas na função de desenho e câmera reais`);
