#!/usr/bin/env node
/* M4 e SCAR equipadas com skins do passe usam gold#; antes, pecasDaPintura
   não reconhecia seus corpos. Executa a seleção e aplicação reais nos GLBs reais.
   node tools/eval/passe-viewmodel-skin-check.mjs [--mutante=sem-corpos|maos]
   Não substitui captura visual nem prova de shader no navegador. */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import './harness.mjs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from '../../public/vendor/meshopt_decoder.module.js';
import { WEAPON_SKINS } from '../../public/js/data/weapon-skin-definitions.js';
import * as THREE from 'three';

if (process.argv.includes('--mutations')) {
  for (const [mutation, message] of [['sem-corpos', 'corpo primeiro e peças completas'], ['maos', 'mãos sem pintura']]) {
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), `--mutante=${mutation}`], { encoding: 'utf8' });
    if (result.status === 0 || !result.stderr.includes(`FALHA arma-04: ${message}`)) throw Error(`Mutante ${mutation} não detectado: ${result.stderr}`);
  }
  console.log('PASS: 2 mutantes de viewmodel detectados');
  process.exit(0);
}
const arg = process.argv.slice(2);
if (arg.length > 1 || (arg.length && !['--mutante=sem-corpos', '--mutante=maos'].includes(arg[0]))) throw Error('Uso: --mutante=sem-corpos|maos');
const url = new URL('../../public/js/authoredvm.js', import.meta.url);
let source = fs.readFileSync(url, 'utf8');
function substituir(antes, depois) {
  if (antes === depois || source.split(antes).length !== 2) throw Error('INFRA: mutação/exportação não aplicada: ' + antes);
  source = source.replace(antes, depois);
}
substituir('function cameraSpacePackage(', 'export function cameraSpacePackage(');
if (arg[0] === '--mutante=sem-corpos') {
  substituir("  'gold#m4': 'coro_solto_project_ak_body',\n  'gold#scar': 'coro_solto_project_ak_body',\n", '');
}
if (arg[0] === '--mutante=maos') {
  substituir('const irmas = [...(entry.weaponMeshes || []), ...(corpo.userData?.mintParts || [])];', 'const irmas = [...(entry.weaponMeshes || []), ...(corpo.userData?.mintParts || []), ...(entry.handMeshes || [])];');
}
source = source.replace(/from (['"])([^'"]+)\1/g, (_, q, p) => `from ${q}${p.startsWith('.') ? new URL(p, url).href : import.meta.resolve(p)}${q}`)
  .replace(/import\((['"])(\.\.?\/[^'"]+)\1\)/g, (_, q, p) => `import(${q}${new URL(p, url).href}${q})`);
const runtime = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
await MeshoptDecoder.ready;
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
loader.register(parser => { parser.loadTexture = async () => new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); return { name: 'EXT_texture_webp', loadTexture: parser.loadTexture }; });
const spec = { m4: ['arma-04', 'arma-09', 'arma-14'], scar: ['arma-05', 'arma-10', 'arma-15'] };
const names = ['coro_solto_project_ak_body', 'coro_solto_project_ak_charging_handle', 'coro_solto_project_ak_magazine', 'coro_solto_project_ak_replacement_magazine'];
const materials = mesh => Array.isArray(mesh.material) ? mesh.material : [mesh.material];
let checks = 0, failures = 0;
function check(label, condition) { checks++; if (!condition) { failures++; console.error('FALHA ' + label); } }
for (const [weapon, ids] of Object.entries(spec)) {
  for (const id of ids) {
    const skin = WEAPON_SKINS[id];
    check(`${id}: definição do passe não vendável`, skin?.runtimeEnabled && !skin.storeEnabled && skin.passe?.season === 'sessao-da-treta-s1' && skin.targetWeapons.includes(weapon));
    const bytes = fs.readFileSync(fileURLToPath(new URL(`../../public/models/viewmodels/coro/${weapon}-hires.glb`, import.meta.url)));
    const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const profile = { id: 'player', weaponSkins: { [weapon]: id } };
    const visual = runtime.cameraSpacePackage(gltf, profile, new THREE.Group(), 'ar', `gold#${weapon}`);
    const entry = { ...visual, key: `gold#${weapon}`, golden: true };
    check(`${id}: seleção do runtime usa golden`, runtime.authoredBootFamilies([weapon], profile.weaponSkins).includes(`gold#${weapon}`));
    const plain = new runtime.AuthoredViewModels(new THREE.Group(), null, {});
    plain._applyWeaponSkin(entry, weapon);
    check(`${id}: sem skin equipada não pinta`, entry.weaponMeshes.every(mesh => !mesh.userData.weaponSkin));
    const hands = entry.handMeshes.map(mesh => ({ mesh, materials: materials(mesh).slice() }));
    check(`${id}: mãos presentes`, hands.length > 0);
    check(`${id}: quatro peças nominais presentes`, names.every(name => entry.weaponMeshes.filter(mesh => mesh.name === name).length === 1));
    const pieces = runtime.pecasDaPintura(entry);
    check(`${id}: corpo primeiro e peças completas`, pieces[0]?.name === names[0] && names.every(name => pieces.some(mesh => mesh.name === name)));
    const vm = new runtime.AuthoredViewModels(new THREE.Group(), null, profile);
    vm._applyWeaponSkin(entry, weapon);
    check(`${id}: corpo, ferrolho e pentes pintados`, names.every(name => { const mesh = entry.weaponMeshes.find(m => m.name === name); return mesh?.userData.weaponSkin === id && materials(mesh).every(m => m?.userData.weaponSkin === id); }));
    check(`${id}: mãos sem pintura`, hands.every(({ mesh, materials: original }) => !mesh.userData.weaponSkin && materials(mesh).every((m, i) => m === original[i] && !m.userData.weaponSkin)));
    const paintedMaterials = entry.weaponMeshes.map(mesh => materials(mesh).slice());
    vm._applyWeaponSkin(entry, weapon);
    check(`${id}: aplicação repetida é idempotente`, entry.weaponMeshes.every((mesh, i) => materials(mesh).every((m, j) => m === paintedMaterials[i][j])));
    check(`${id}: corpo ambíguo recusado`, runtime.pecasDaPintura({ ...entry, weaponMeshes: [...entry.weaponMeshes, entry.weaponMeshes.find(m => m.name === names[0])] }).length === 0);
  }
}
console.log(`Passe viewmodel: ${checks - failures}/${checks} verificações; ${failures} falhas.`);
if (failures) process.exitCode = 1;
