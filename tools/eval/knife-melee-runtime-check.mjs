/*
 * Contrato do piloto de faca no jogo real.
 *
 * O portão estrutural não substitui a inspeção dos frames: ele garante que o runtime
 * serve exatamente um pacote melee autocontido, usa a câmera exportada e conecta os
 * quatro estados ao Game. A evidência visual fica em asset-evidence/knife-melee-runtime.
 *
 * Mutações: sem-camera, sem-stab, rota-generica, sem-hook-ataque.
 */
import { existsSync, readFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url);
const at = (path) => new URL(path, ROOT);
const mutation = process.argv.find((arg) => arg.startsWith('--mutante='))?.split('=')[1] || '';
const failures = [];
const check = (ok, label, evidence) => {
  console.log(`${ok ? '✓' : '✗'} ${label}: ${evidence}`);
  if (!ok) failures.push(label);
};

const modulePath = at('public/js/meleevm.js');
const gamePath = at('public/js/game.js');
const assetPath = at('public/models/viewmodels/coro/melee/knife-hires.glb');
const evidenceRoot = 'tools/eval/asset-evidence/knife-melee-runtime/';
let moduleSource = existsSync(modulePath) ? readFileSync(modulePath, 'utf8') : '';
let gameSource = readFileSync(gamePath, 'utf8');
if (mutation === 'rota-generica') moduleSource = moduleSource.replace('/coro/melee/', '/coro/');
if (mutation === 'sem-hook-ataque') gameSource = gameSource.replace(/this\.vm\.melee\?\.attack\(\)/g, 'false');

check(existsSync(modulePath), 'MELEE1 controlador exclusivo existe', 'public/js/meleevm.js');
check(existsSync(assetPath), 'MELEE2 GLB canônico existe', 'public/models/viewmodels/coro/melee/knife-hires.glb');

const runtimeUrls = [...moduleSource.matchAll(/["'](\/models\/viewmodels\/[^"']+\.glb[^"']*)["']/g)].map((match) => match[1]);
check(runtimeUrls.length === 1 && runtimeUrls[0].includes('/coro/melee/knife-hires.glb'),
  'MELEE3 caminho exclusivo de família', runtimeUrls.join(', ') || 'nenhum URL');
check(!/(?:pistol|akm?|throw|grenade|smoke|frag)-hires\.glb/i.test(moduleSource),
  'MELEE4 piloto não replica outras famílias', 'somente knife-hires.glb');
check(/export class KnifeMeleeViewModel/.test(moduleSource),
  'MELEE5 API dedicada exportada', 'KnifeMeleeViewModel');
check(/applyMatrix4\(camera\.matrixWorld\.clone\(\)\.invert\(\)\)/.test(moduleSource),
  'MELEE6 composição nasce da câmera exportada', 'inversa da camera.matrixWorld');
check(/const REQUIRED_CLIPS = Object\.freeze\(\[[^\]]*['"]Idle['"][^\]]*['"]Draw['"][^\]]*['"]Slash['"][^\]]*['"]Stab['"]/s.test(moduleSource),
  'MELEE7 runtime exige os quatro estados', 'Idle/Draw/Slash/Stab');

let gltf = null;
if (existsSync(assetPath)) {
  const bytes = readFileSync(assetPath);
  const jsonLength = bytes.readUInt32LE(12);
  gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8').replace(/\0+$/, ''));
}
const cameras = mutation === 'sem-camera' ? [] : (gltf?.cameras || []);
const clips = (gltf?.animations || []).map((animation) => animation.name).filter((name) => !(mutation === 'sem-stab' && name === 'Stab'));
check(cameras.length === 1 && (gltf?.nodes || []).some((node) => Number.isInteger(node.camera)),
  'MELEE8 GLB carrega uma câmera ativa', `${cameras.length} câmera(s)`);
check(['Idle', 'Draw', 'Slash', 'Stab'].every((name) => clips.includes(name)),
  'MELEE9 GLB carrega os quatro clips', clips.join('/'));
const nodeNames = new Set((gltf?.nodes || []).map((node) => node.name));
const materialNames = new Set((gltf?.materials || []).map((material) => material.name));
check(nodeNames.has('coro_solto_hires_melee_hands') && nodeNames.has('R_wrist_026') && nodeNames.has('L_wrist_02') &&
      materialNames.has('CoroSolto_FP_Gloves'),
  'MELEE10 pacote reutiliza mãos/rig/material aprovados da pistola', 'mesh profissional + pulsos R/L + CoroSolto_FP_Gloves');
check((gltf?.skins || []).length === 1 && (gltf?.animations || []).every((animation) => animation.channels?.length > 0),
  'MELEE11 rig e clips têm canais reais', `${gltf?.skins?.length || 0} skin; ${gltf?.animations?.length || 0} clips`);
check(/const PACKAGE_SCALE = 0\.0265/.test(moduleSource) &&
      /approvedGloveMaterial\(material, this\.profile\)/.test(moduleSource) &&
      /CoroSolto_FP_Gloves/.test(moduleSource),
  'MELEE11B runtime preserva acabamento e composição revisada', '0.0265 + material pistol-pilot-14');
check(/meleeqa/.test(moduleSource) && /Draw: 2\.0, Slash: 4\.0, Stab: 4\.0/.test(moduleSource) &&
      /Draw: 0\.28, Slash: 0\.52, Stab: 0\.52/.test(moduleSource),
  'MELEE11C amostragem determinística não altera duração normal', 'slow-motion explícito; produção 0.28/0.52 s');

check(/import \{ KnifeMeleeViewModel \} from ['"]\.\/meleevm\.js['"]/.test(gameSource),
  'MELEE12 Game importa o controlador dedicado', 'game.js');
check(/new KnifeMeleeViewModel\(/.test(gameSource) && /this\.vm\.melee\?\.setWeapon\(w\)/.test(gameSource),
  'MELEE13 carga e visibilidade passam pelo caminho real', 'constructor + _applyVmVisibility');
check(/this\.vm\.melee(?:\?\.|\.)draw\(\)/.test(gameSource) && /this\.vm\.melee\?\.attack\(\)/.test(gameSource),
  'MELEE14 draw e ataque chegam ao mixer', '_switchWeapon + _tryShoot');
check(/this\.vm\.melee\?\.update\(dt\)/.test(gameSource),
  'MELEE15 mixer avança no update real', '_updatePlayer');
const evidenceFiles = ['idle.jpg', 'draw.jpg', 'slash.jpg', 'stab.jpg', 'return-idle.jpg',
  'production-return.jpg', 'contact-sheet.png', 'REPORT.md'];
check(evidenceFiles.every((name) => existsSync(at(evidenceRoot + name))),
  'MELEE16 evidência visual de browser está completa', evidenceFiles.join(', '));

if (failures.length) {
  console.error(`KNIFE-MELEE-RUNTIME: VERMELHO (${failures.length}) — ${failures.join(', ')}`);
  process.exit(1);
}
console.log('KNIFE-MELEE-RUNTIME: VERDE');
