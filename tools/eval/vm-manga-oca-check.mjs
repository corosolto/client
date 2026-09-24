#!/usr/bin/env node
/**
 * Régua da MANGA OCA (crítico cego r2, 23/09: shotgun, sks, lmg "manga termina em cone oco").
 *
 * A manga KINEMATION (`CoroSolto_FP_Cloth`) nasce aberta junto ao ombro, ~3 cm atrás da
 * câmera embutida. O frame por arma (FAMILY_FRAME/VM_FRAME, z<0) empurra o pacote para a
 * frente e traz essa boca para dentro do quadro. Esta régua passa cada produto K pelo
 * `cameraSpacePackage` REAL do runtime, pousa os clipes do GLB (+ arco de saque) com o
 * mount do runtime e projeta a PONTA da manga — os laços abertos, ou o último anel da
 * extensão (`userData.sleeveEnds`) — nas duas proporções. Qualquer vértice da ponta à frente
 * do near plane e dentro do quadro reprova a arma.
 *
 * Mutantes: `--mutante=sem-extensao` (tira a extensão do runtime) e `--mutante=extensao-curta`
 * (extensão de 5 cm) têm de ficar vermelhos.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

globalThis.self ??= globalThis;
globalThis.Image = class { constructor() { this.onload = null; this.width = 1; this.height = 1; } set src(v) { queueMicrotask(() => this.onload?.()); } };
globalThis.ImageData ??= class { constructor(data, width, height) { Object.assign(this, { data, width, height }); } };
const quiet = (fn) => (...args) => !/Couldn't load texture|THREE\.GLTFLoader/.test(String(args[0] || '')) && fn(...args);
console.warn = quiet(console.warn);
console.error = quiet(console.error);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=');
const mutante = arg('mutante') || '';
const only = (arg('armas') || '').split(',').filter(Boolean);
if (mutante && !['sem-extensao', 'extensao-curta'].includes(mutante)) throw new Error(`mutante desconhecido ${mutante}`);
const ASSETS = path.resolve(process.env.CSBRASIL_VM_ASSET_ROOT
  ? path.join(process.env.CSBRASIL_VM_ASSET_ROOT, 'viewmodels') : path.join(ROOT, 'public/private-assets/viewmodels'));
const ASPECTS = { '3x2': 1440 / 960, '16x9': 1440 / 810 };
const NEAR = 0.01;

async function runtimeModule(file, replacements, extra) {
  const base = pathToHref(path.join(ROOT, file));
  let source = fs.readFileSync(path.join(ROOT, file), 'utf8');
  for (const [from, to] of replacements) {
    if (!source.includes(from)) throw new Error(`mutação não achou a expressão de produção: ${from}`);
    source = source.replace(from, to);
  }
  source = source.replace(/from (['"])([^'"]+)\1/g, (_, q, spec) => `from ${q}${spec.startsWith('.') ? new URL(spec, base).href : import.meta.resolve(spec)}${q}`);
  return import(`data:text/javascript;base64,${Buffer.from(source + extra).toString('base64')}`);
}
function pathToHref(p) { return new URL(`file://${p}`).href; }

const replacements = mutante === 'sem-extensao' ? [['extendSleeveOpenings(object, { space: mount, pose: { root: scene, clip: idleClip } });', ';']]
  : mutante === 'extensao-curta' ? [['extendSleeveOpenings(object, { space: mount, pose: { root: scene, clip: idleClip } });', 'extendSleeveOpenings(object, { space: mount, pose: { root: scene, clip: idleClip }, length: 0.05 });']] : [];
const { cameraSpacePackage } = await runtimeModule('public/js/authoredvm.js', replacements, '\nexport { cameraSpacePackage };');
const { VM_WEAPON, VM_FABRICA } = await import(pathToHref(path.join(ROOT, 'public/js/data/vmconfig.js')));
// --fabrica: produtos da fábrica (tools/fabrica), chave fab#<arma>, manga SEM a extensão do runtime
// quando a ficha diz `manga:false` — é o que prova que o braço inteiro do pack dispensa o vmsleeve.
const FABRICA = process.argv.includes('--fabrica');
const { sleeveOpenings, SLEEVE_MATERIAL } = await import(pathToHref(path.join(ROOT, 'public/js/vmsleeve.js')));

const loader = new GLTFLoader();
const parse = (file) => {
  const b = fs.readFileSync(file);
  return loader.parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '');
};
let general = null;
const generalFile = path.join(ASSETS, 'shared/general-runtime.glb');
if (fs.existsSync(generalFile)) general = await parse(generalFile);

const materialsOf = (o) => (Array.isArray(o.material) ? o.material : [o.material]);
function sleeveEnds(mesh) {
  if (mesh.userData.sleeveEnds) return mesh.userData.sleeveEnds;
  const { loops, representative } = sleeveOpenings(mesh.geometry);
  return loops.flat().map((w) => representative[w]);
}
const fovFor = (entry, aspect) => {
  const v0 = entry.cameraFov * Math.PI / 180;
  const halfH = Math.atan(Math.tan(v0 / 2) * (entry.cameraAspect || 16 / 9));
  return 2 * Math.atan(Math.tan(halfH) / aspect);
};

const rows = [];
const weapons = FABRICA
  ? Object.entries(VM_FABRICA).filter(([id]) => !only.length || only.includes(id)).map(([id, c]) => [id, { ...c, family: c.familia }])
  : Object.entries(VM_WEAPON).filter(([id, c]) => c.baked && !c.golden && (!only.length || only.includes(id)));
for (const [weapon, config] of weapons) {
  const name = config.runtime === 'family' ? `${config.family}-runtime.glb` : `${weapon}-baked-runtime.glb`;
  const file = FABRICA ? path.join(ASSETS, 'fabrica', `${weapon}-fabrica.glb`) : path.join(ASSETS, config.family, name);
  if (!fs.existsSync(file)) { rows.push({ weapon, ok: false, erro: `ausente ${file}` }); continue; }
  const gltf = await parse(file);
  const parent = new THREE.Group();
  const entry = cameraSpacePackage(gltf, { id: 'regua', faction: 'E' }, parent, config.family, `${FABRICA ? 'fab' : config.family}#${weapon}`);
  const sleeves = entry.handMeshes.filter((m) => materialsOf(m).some((mat) => SLEEVE_MATERIAL.test(mat?.name || '')));
  const ends = sleeves.map((mesh) => ({ mesh, idx: sleeveEnds(mesh) }));
  const clips = [...gltf.animations];
  if (!clips.some((c) => /equip/i.test(c.name)) && general) {
    const equip = general.animations.find((c) => c.name === 'equip_rifle');
    if (equip) clips.push(equip);
  }
  const mixer = new THREE.AnimationMixer(entry.scene);
  const rot = entry.frame.rotDeg || [0, 0, 0];
  const poses = [{ drawY: 0, drawRx: 0, tag: '' }, { drawY: -(entry.frame.drawDrop ?? 0.22), drawRx: 0.24, tag: '+saque0' }];
  let worst = { visiveis: 0 };
  let amostras = 0;
  const v = new THREE.Vector3();
  for (const clip of clips) {
    mixer.stopAllAction();
    const action = mixer.clipAction(clip);
    action.reset().play();
    for (let s = 0; s <= 8; s += 1) {
      mixer.setTime(clip.duration * s / 8);
      for (const pose of poses) {
        if (pose.tag && !/equip|idle/i.test(clip.name)) continue;
        entry.mount.rotation.set(rot[0] * Math.PI / 180 + pose.drawRx, rot[1] * Math.PI / 180, rot[2] * Math.PI / 180);
        entry.mount.position.set(entry.frame.x, entry.frame.y + pose.drawY, entry.frame.z);
        parent.updateMatrixWorld(true);
        for (const [tag, aspect] of Object.entries(ASPECTS)) {
          const half = Math.tan(fovFor(entry, aspect) / 2);
          let visiveis = 0;
          for (const { mesh, idx } of ends) {
            for (const i of idx) {
              v.fromBufferAttribute(mesh.geometry.attributes.position, i);
              mesh.applyBoneTransform(i, v);
              v.applyMatrix4(mesh.matrixWorld);
              const depth = -v.z;
              if (depth <= NEAR) continue;
              const x = v.x / (depth * half * aspect), y = v.y / (depth * half);
              if (Math.abs(x) <= 1 && Math.abs(y) <= 1) visiveis += 1;
            }
          }
          amostras += 1;
          if (visiveis > worst.visiveis) worst = { visiveis, clip: clip.name + pose.tag, t: +(s / 8).toFixed(3), aspecto: tag };
        }
      }
    }
    action.stop();
  }
  const pontas = ends.reduce((n, e) => n + e.idx.length, 0);
  rows.push({ weapon, ok: pontas > 0 && worst.visiveis === 0, mangas: sleeves.length, pontas, amostras, pior: worst });
}
const ok = rows.length > 0 && rows.every((r) => r.ok);
if (process.argv.includes('--tabela')) {
  for (const r of rows) console.log(`${r.ok ? 'OK   ' : 'FALHA'} ${r.weapon.padEnd(11)} ${r.erro || `mangas ${r.mangas} ponta ${r.pontas} vért · pior ${r.pior.visiveis} no quadro${r.pior.clip ? ` (${r.pior.clip} t=${r.pior.t} ${r.pior.aspecto})` : ''}`}`);
}
console.log(JSON.stringify({ regua: 'vm-manga-oca', fabrica: FABRICA, mutante: mutante || null, ok, falhas: rows.filter((r) => !r.ok).map((r) => r.weapon) }));
process.exitCode = ok ? 0 : 1;
