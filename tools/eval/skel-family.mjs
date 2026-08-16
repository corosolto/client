#!/usr/bin/env node
/* ============================================================================
   skel-family.mjs — DE QUE ESQUELETO É CADA PERSONAGEM, E O CLIPE CASA COM ELE?
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   O dono disse: "todos personagens após o pagodeiro e os palhaços estão uma merda
   na postura". Duas famílias de personagem convivem nesta base:
     (a) rigados no Mint/Meshy       -> cada um tem um rig LIGEIRAMENTE diferente
     (b) rig-from-donor.mjs          -> esqueleto do `mst` TRANSPLANTADO, idêntico
   Os clipes compartilhados (models/anims/mixamo) foram assados contra UM rig só.
   Em (b) o clipe casa por construção. Em (a) não casa, e por isso existe o
   retarget por personagem (models/anims/<id>/, tools/retarget-glb.mjs).

   Este script NÃO opina. Ele mede, por personagem:
     • nº de nós / nº de juntas do skin                     -> assinatura de família
     • distância REST máxima e mediana contra o doador mst  -> "é o mesmo rig?"
     • se existe models/anims/<id>/ (retarget por char)
     • se o retarget era NECESSÁRIO (rig != mst) ou é NO-OP esperado (rig == mst)

   A pergunta que ele responde e que ninguém tinha respondido: existe personagem
   com esqueleto IDÊNTICO ao doador que MESMO ASSIM recebeu retarget por char?
   Nesses, o retarget só pode PIORAR — o clipe já casava.

   uso: node tools/eval/skel-family.mjs [--json]
   ============================================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { readGLB, buildScene, worldMats } from './tp-mount-probe.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const CHARDIR = path.join(ROOT, 'public/models/characters');
const ANIMDIR = path.join(ROOT, 'public/models/anims');

const ids = fs.readdirSync(CHARDIR).filter((f) => f.endsWith('.glb')).map((f) => f.replace(/\.glb$/, '')).sort();

// rest-pose world translation de cada junta, por nome
function restJoints(file) {
  const g = readGLB(file);
  const sc = buildScene(g);
  const W = worldMats(sc);
  const skin = (g.json.skins || [])[0];
  const out = new Map();
  const joints = skin ? skin.joints : sc.nodes.map((n) => n.i);
  for (const j of joints) {
    const n = sc.nodes[j];
    out.set(n.name, [W[j][12], W[j][13], W[j][14]]);
  }
  return { joints: out, nNodes: sc.nodes.length, nJoints: joints.length };
}

const donor = restJoints(path.join(CHARDIR, 'mst.glb'));

const rows = [];
for (const id of ids) {
  const r = restJoints(path.join(CHARDIR, `${id}.glb`));
  const ds = [];
  let missing = 0;
  for (const [name, p] of r.joints) {
    const q = donor.joints.get(name);
    if (!q) { missing++; continue; }
    ds.push(Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]));
  }
  ds.sort((a, b) => a - b);
  const med = ds.length ? ds[Math.floor(ds.length / 2)] : NaN;
  const max = ds.length ? ds[ds.length - 1] : NaN;
  const animDir = path.join(ANIMDIR, id);
  const hasPerChar = fs.existsSync(animDir) && fs.statSync(animDir).isDirectory()
    && fs.readdirSync(animDir).some((f) => f.endsWith('.glb'));
  // "mesmo rig do doador": nenhuma junta a mais de 1 mm de distância
  const sameAsDonor = ds.length > 0 && missing === 0 && max < 0.001;
  rows.push({ id, fam: `${r.nNodes}n/${r.nJoints}j`, nNodes: r.nNodes, nJoints: r.nJoints, medDist: med, maxDist: max, missing, hasPerChar, sameAsDonor });
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  const f = (v) => (Number.isFinite(v) ? v.toFixed(4) : '  --  ');
  console.log('id            familia    medDist  maxDist  faltam  perChar  ==mst');
  console.log('-'.repeat(72));
  for (const r of rows) {
    console.log(
      r.id.padEnd(14) + r.fam.padEnd(11)
      + f(r.medDist).padStart(7) + '  ' + f(r.maxDist).padStart(7)
      + String(r.missing).padStart(7) + '  ' + (r.hasPerChar ? 'sim' : ' - ').padStart(6)
      + '   ' + (r.sameAsDonor ? 'SIM' : ' - '));
  }
  console.log('-'.repeat(72));
  const suspeitos = rows.filter((r) => r.sameAsDonor && r.hasPerChar);
  console.log(`\nRETARGET DESNECESSARIO (rig == doador mas tem clipe por char): ${suspeitos.length}`);
  for (const r of suspeitos) console.log('  ' + r.id);
  const fams = {};
  for (const r of rows) fams[r.fam] = (fams[r.fam] || 0) + 1;
  console.log('\nfamilias:', JSON.stringify(fams));
}
