/* campo-uv-finish-check.mjs — régua UV do acabamento Campo (guardas 4 m + fim 2 m + lock).
   Contrato completo, procedência e mutações: docs/visual-consistency/CAMPO-UV-FINISH.md */
import { pathToFileURL } from 'node:url';
import { THREE, initTextures } from './harness.mjs';

const USO = 'uso: campo-uv-finish-check.mjs [--mutar=guardrepeat20x3|removerguardUV|guardperiod2m|removerfimUV|removerlock|uv-rank1|face-ausente|repeat-nao-finito|inventario-compensado] [--fonte=<dir>]';
const args = process.argv.slice(2);
const vistos = new Set();
let MUTANTE = null, FONTE = null;
for (const a of args) {
  const nome = a.startsWith('--') && a.includes('=') ? a.slice(0, a.indexOf('=')) : a;
  if (nome !== '--mutar' && nome !== '--fonte') { console.error(`argumento desconhecido: ${a}\n${USO}`); process.exit(2); }
  if (vistos.has(nome)) { console.error(`argumento duplicado: ${a}\n${USO}`); process.exit(2); }
  const val = a.includes('=') ? a.slice(a.indexOf('=') + 1) : '';
  if (!val) { console.error(`valor ausente: ${a}\n${USO}`); process.exit(2); }
  if (nome === '--mutar') MUTANTE = val; else FONTE = val;
  vistos.add(nome);
}
if (MUTANTE && !['guardrepeat20x3', 'removerguardUV', 'guardperiod2m', 'removerfimUV', 'removerlock', 'uv-rank1', 'face-ausente', 'repeat-nao-finito', 'inventario-compensado'].includes(MUTANTE)) {
  console.error(`mutante desconhecido: ${MUTANTE}\n${USO}`); process.exit(2);
}

// Tiles/m; Float32 nominal fica a menos de 1e-5 do período métrico.
const GUARD_TILE = 4, FIM_TILE = 2, TOL = 1e-5;

async function sobe() {
  const mod = FONTE
    ? await import(pathToFileURL(`${FONTE}/map_campomorro.js`).href)
    : await import(new URL('../../public/js/map_campomorro.js', import.meta.url).href);
  const T = await initTextures();
  const scene = new THREE.Scene();
  const W = mod.buildCampoMorro(scene, T);
  if (!W?.root || !Array.isArray(W?.colliders)) throw new Error('build devolveu mundo sem root/colliders');
  W.root.updateMatrixWorld(true);
  return W;
}

const guardsDe = (W) => {
  const gs = [];
  W.root.traverse((o) => { if (o.userData?.guardaBorda) gs.push(o); });
  return gs;
};
const fimDe = (W) => {
  const fs = [];
  W.root.traverse((o) => { if (o.userData?.favelaFinish === 'campo') fs.push(o); });
  return fs;
};

// Triângulos efetivamente desenhados, incluindo drawRange e materiais por grupo.
const triangulos = (mesh) => {
  const g = mesh.geometry, total = g.index?.count ?? g.attributes.position.count;
  const inicio = Math.max(0, g.drawRange.start), fim = Math.min(total, inicio + g.drawRange.count);
  const ranges = Array.isArray(mesh.material) ? g.groups.filter(v => mesh.material[v.materialIndex]?.visible !== false) : [{start: 0, count: total}];
  const out = [];
  if (!Array.isArray(mesh.material) && mesh.material.visible === false) return out;
  for (const r of ranges) for (let t = Math.max(inicio, r.start); t + 2 < Math.min(fim, r.start + r.count); t += 3)
    out.push([0, 1, 2].map(k => g.index ? g.index.getX(t + k) : t + k));
  return out;
};

// SVD do Jacobiano UV numa base tangente ortonormal; detecta colapso e cisalhamento.
const singulares = (mesh) => {
  const g = mesh.geometry, uv = g.attributes.uv, pos = g.attributes.position, res = [];
  for (const ids of triangulos(mesh)) {
    const p = ids.map(i => new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld));
    const a = p[1].clone().sub(p[0]), b = p[2].clone().sub(p[0]), l1 = a.length();
    const x2 = b.dot(a) / l1, y2 = Math.sqrt(Math.max(0, b.lengthSq() - x2 * x2));
    const du1 = uv.getX(ids[1]) - uv.getX(ids[0]), dv1 = uv.getY(ids[1]) - uv.getY(ids[0]);
    const du2 = uv.getX(ids[2]) - uv.getX(ids[0]), dv2 = uv.getY(ids[2]) - uv.getY(ids[0]);
    if (![l1,y2,du1,dv1,du2,dv2].every(Number.isFinite) || l1 < 1e-9 || y2 < 1e-9) { res.push(null); continue; }
    const j00 = du1/l1, j10 = dv1/l1, j01 = (du2-j00*x2)/y2, j11 = (dv2-j10*x2)/y2;
    const A = j00*j00+j01*j01, B = j00*j10+j01*j11, C = j10*j10+j11*j11;
    const delta = Math.hypot(A-C, 2*B);
    res.push([Math.sqrt(Math.max(0,(A+C+delta)/2)), Math.sqrt(Math.max(0,(A+C-delta)/2))]);
  }
  return res;
};

const q = (v) => Math.round(v * 1e4) / 1e4;

const medeGuards = (W) => {
  const guards = guardsDe(W);
  const facesPorMesh = new Set(), dens = [];
  let repeatErr = null, lockErr = null, tris = 0;
  const nrm = new THREE.Vector3();
  for (const g of guards) {
    if (g.material?.map) {
      const r = g.material.map.repeat;
      if (![r.x,r.y].every(Number.isFinite) || Math.abs(r.x - 1) > 1e-6 || Math.abs(r.y - 1) > 1e-6)
        repeatErr ??= `repeat ${q(r.x)}x${q(r.y)} ≠ 1x1`;
    } else repeatErr ??= 'guarda sem map';
    if (g.geometry.userData?.texelEscalada !== true) lockErr ??= 'guarda sem texelEscalada';
    const nor = g.geometry.attributes.normal;
    const seen = new Set(), porFace = new Map(), tt = triangulos(g), unicos = new Set();
    for (const ids of tt) {
      unicos.add([...ids].sort((a,b)=>a-b).join(","));
      nrm.fromBufferAttribute(nor,ids[0]);
      const face=`${Math.round(nrm.x*8)},${Math.round(nrm.y*8)},${Math.round(nrm.z*8)}`;
      porFace.set(face,(porFace.get(face)||0)+1);
    }
    for (const ids of tt) for (const i of ids) {
      nrm.fromBufferAttribute(nor, i);
      seen.add(`${Math.round(nrm.x * 8)},${Math.round(nrm.y * 8)},${Math.round(nrm.z * 8)}`);
    }
    if (seen.size !== 6 || tt.length !== 12 || unicos.size !== 12 || porFace.size !== 6 || [...porFace.values()].some(n=>n!==2)) facesPorMesh.add(`faces=${seen.size},tris=${tt.length},unicos=${unicos.size},porFace=${[...porFace.values()]}`);
    for (const s of singulares(g)) dens.push(s);
  }
  return { n: guards.length, guards, facesErr: facesPorMesh.size ? [...facesPorMesh] : null, repeatErr, lockErr, dens };
};

const medeFim = (W) => {
  const fims = fimDe(W);
  if (fims.length !== 1) return { n: fims.length, fims };
  const f = fims[0];
  const dens = [], grupos = f.geometry.groups?.length ?? 0;
  let lock = f.geometry.userData?.texelEscalada === true;
  for (const s of singulares(f)) dens.push(s);
  const uv = f.geometry.attributes.uv;
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (let i = 0; i < uv.count; i++) {
    u0 = Math.min(u0, uv.getX(i)); u1 = Math.max(u1, uv.getX(i));
    v0 = Math.min(v0, uv.getY(i)); v1 = Math.max(v1, uv.getY(i));
  }
  return { n: 1, fims, mesh: f, lock, grupos, dens, uvSpan: [u1 - u0, v1 - v0] };
};

/* snapshot estrutural: AABBs de guardas, bbox do fim, contagens — nada de UV. */
const snapEstrutural = (W) => {
  const box = new THREE.Box3();
  const gs = guardsDe(W).map((g) => {
    box.setFromObject(g);
    return [q(box.min.x), q(box.min.y), q(box.min.z), q(box.max.x), q(box.max.y), q(box.max.z)];
  });
  const fim = fimDe(W)[0];
  let fb = null;
  if (fim) { box.setFromObject(fim); fb = [q(box.min.x), q(box.min.y), q(box.min.z), q(box.max.x), q(box.max.y), q(box.max.z)]; }
  const mats = guardsDe(W).map((g) => (g.matrixWorld.elements.slice().map(q)).join(',')).sort();
  return { guards: gs.sort(JSON.stringify), fimBBox: fb, colliders: W.colliders.length, occluders: W.occluders.length, mats };
};

const avaliar = (W, rotulo) => {
  const cl = [];
  const put = (id, ok, msg) => { cl.push({ id, ok, msg }); console.log(`  [${rotulo}] ${id} ${ok ? 'PASSA' : 'FALHA'} — ${msg}`); };

  const mg = medeGuards(W);
  const densOk = (arr, alvo, etiqueta) => {
    let pior = 0, nulos = 0, ex = null;
    for (const d of arr) {
      if (!d || !d.every(Number.isFinite)) { nulos++; continue; }
      for (const s of d) { const e = Math.abs(s - alvo); if (e > pior) { pior = e; ex = s; } }
    }
    return { ok: arr.length > 0 && nulos === 0 && pior <= TOL, msg: `${arr.length} tris ${etiqueta}: ${nulos} nulo/degenerado, pior |s−${alvo}|=${q(pior)}${ex !== null ? ` (s=${q(ex)})` : ''}, teto ${TOL}`, pior, nulos };
  };

  const r1 = densOk(mg.dens, 1 / GUARD_TILE, `guardas (tile ${GUARD_TILE} m)`);
  put('CU-1', mg.n === 40 && !mg.repeatErr,
    `${mg.n}/40 guardas; repeat muralha ${mg.repeatErr ?? '1x1'}${mg.facesErr ? `; normais≠6faces: ${mg.facesErr.join(',')}` : ''}`);
  put('CU-2', !mg.lockErr, mg.lockErr ?? '40 guardas com geometry.userData.texelEscalada=true (lock anti 2ª escala do vao.js)');
  put('CU-3', r1.ok && mg.dens.length === 480 && !mg.facesErr, r1.msg + `; esperado 480 triângulos/6 faces por guarda, facesErr=${mg.facesErr}`);

  const mf = medeFim(W);
  if (mf.n !== 1) { for (const id of ['CU-4', 'CU-5', 'CU-6']) put(id, false, `${mf.n} malhas favelaFinish=campo (esperado 1)`); }
  else {
    const r2 = densOk(mf.dens, 1 / FIM_TILE, `acabamento mesclado (tile ${FIM_TILE} m)`);
    put('CU-4', mf.lock && mf.grupos === 0, `lock pós-merge=${mf.lock}, groups=${mf.grupos} (mergeParts descarta userData: o lock é do caller Campo)`);
    put('CU-5', r2.ok && mf.dens.length === 2424, r2.msg + '; esperado 2424 triângulos desenhados');
    put('CU-6', mf.uvSpan[0] > 2 && mf.uvSpan[1] > 2,
      `período do UV mesclado: u=${q(mf.uvSpan[0])} tiles, v=${q(mf.uvSpan[1])} tiles — reset 0–1 por caixa colapsaria ambos em 1.0`);
  }
  return cl;
};

let W1, W2;
try {
  W1 = await sobe();
  W2 = await sobe();
} catch (e) {
  console.error(`infraestrutura: build não subiu — ${String(e?.message || e)}`);
  process.exit(3);
}

const antes = { guards: guardsDe(W1).map((g) => g.matrixWorld.clone()), snap: snapEstrutural(W1) };
const nominal = avaliar(W1, 'nominal');

const deterministico = JSON.stringify(snapEstrutural(W2)) === JSON.stringify(antes.snap);
const bijecao = (() => {
  const gs = guardsDe(W1), box = new THREE.Box3();
  let semCollider = 0, semOccluder = 0;
  for (const g of gs) {
    box.setFromObject(g);
    const tem = W1.colliders.some((c) => Math.abs(c.minX - box.min.x) < 1e-3 && Math.abs(c.maxX - box.max.x) < 1e-3
      && Math.abs(c.minZ - box.min.z) < 1e-3 && Math.abs(c.maxZ - box.max.z) < 1e-3
      && Math.abs(c.minY - box.min.y) < 1e-3 && Math.abs(c.maxY - box.max.y) < 1e-3);
    if (!tem) semCollider++;
    if (!W1.occluders.includes(g)) semOccluder++;
  }
  const fim = fimDe(W1)[0];
  const fimColisao = fim ? W1.colliders.some((c) => { const b = new THREE.Box3().setFromObject(fim); return c.minX === b.min.x && c.maxX === b.max.x && c.minZ === b.min.z && c.maxZ === b.max.z; }) : false;
  return { ok: gs.length === 40 && semCollider === 0 && semOccluder === 0 && !fimColisao, msg: `${gs.length} guardas, ${semCollider} sem collider, ${semOccluder} sem occluder, fim com collider=${fimColisao}` };
})();
console.log(`  [estrutural] CU-7 ${deterministico && bijecao.ok ? 'PASSA' : 'FALHA'} — determinismo=${deterministico}, ${bijecao.msg}`);
const clausulas = [...nominal, { id: 'CU-7', ok: deterministico && bijecao.ok, msg: bijecao.msg }];
const nominalVerde = clausulas.every((c) => c.ok);

if (MUTANTE) {
  if (!nominalVerde) {
    console.error(`nominal não-VERDE: mutante não aplicado (régua exige nominal verde antes de qualquer mutante)`);
    process.exit(1);
  }
  const gs = guardsDe(W1), fim = fimDe(W1)[0];
  if (MUTANTE === 'guardrepeat20x3') {
    for (const g of gs) g.material.map.repeat.set(20, 3);
  } else if (MUTANTE === 'removerguardUV') {
    for (const g of gs) {
      const uv = g.geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (i / uv.count) % 1 <= 0.5 ? 0 : 1, i % 2);
      uv.needsUpdate = true;
    }
  } else if (MUTANTE === 'guardperiod2m') {
    for (const g of gs) {
      const uv = g.geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * 2);
      uv.needsUpdate = true;
    }
  } else if (MUTANTE === 'removerfimUV') {
    const uv = fim.geometry.attributes.uv, idx = fim.geometry.index;
    for (let t = 0; t < idx.count; t += 3) {
      const ids = [idx.getX(t), idx.getX(t + 1), idx.getX(t + 2)];
      let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
      for (const i of ids) { u0 = Math.min(u0, uv.getX(i)); u1 = Math.max(u1, uv.getX(i)); v0 = Math.min(v0, uv.getY(i)); v1 = Math.max(v1, uv.getY(i)); }
      const du = u1 - u0 || 1, dv = v1 - v0 || 1;
      for (const i of ids) uv.setXY(i, (uv.getX(i) - u0) / du, (uv.getY(i) - v0) / dv);
    }
    uv.needsUpdate = true;
  } else if (MUTANTE === 'uv-rank1') {
    for (const g of gs) {
      const pos=g.geometry.attributes.position, uv=g.geometry.attributes.uv;
      for (const ids of triangulos(g)) {
        const p0=new THREE.Vector3().fromBufferAttribute(pos,ids[0]);
        for (const i of ids) uv.setXY(i,new THREE.Vector3().fromBufferAttribute(pos,i).distanceTo(p0)/4,0);
      }
    }
  } else if (MUTANTE === 'face-ausente') {
    gs[0].geometry=gs[0].geometry.clone();
    gs[0].geometry.setDrawRange(0,gs[0].geometry.index.count-6);
  } else if (MUTANTE === 'inventario-compensado') {
    for (const g of gs.slice(0,2)) g.geometry=g.geometry.clone();
    const a=gs[0].geometry,b=gs[1].geometry,ai=Array.from(a.index.array),bi=Array.from(b.index.array);
    a.setIndex(ai.slice(3)); b.setIndex([...bi,...bi.slice(0,3)]);
  } else if (MUTANTE === 'repeat-nao-finito') {
    gs[0].material.map.repeat.x=NaN;
  } else if (MUTANTE === 'removerlock') {
    delete fim.geometry.userData.texelEscalada;
  }
  // coordenadas/matrizes imutáveis: mutante só pode tocar UV/userData/material
  const intactas = gs.every((g, i) => g.matrixWorld.equals(antes.guards[i])) && JSON.stringify(snapEstrutural(W1)) === JSON.stringify(antes.snap);
  console.log(`  [mutante:${MUTANTE}] matrizes/AABBs intactas pós-mutação: ${intactas}`);
  if (!intactas) { console.error('infraestrutura: mutante vazou para posição/escala — aborta'); process.exit(3); }
  const pos = avaliar(W1, `mut:${MUTANTE}`);
  for (const c of [...pos, clausulas[6]]) console.log(`${c.id} ${c.ok ? 'PASSA' : 'FALHA'} — protocolo`);
  const vermelhas = pos.filter((c) => !c.ok).map((c) => c.id);
  console.log(`\nCAMPO-UV-FINISH mutante ${MUTANTE}: cláusulas vermelhas = [${vermelhas.join(', ') || 'NENHUMA'}]`);
  process.exit(vermelhas.length ? 1 : 0);
}

for (const c of clausulas) console.log(`${c.id} ${c.ok ? 'PASSA' : 'FALHA'} — protocolo`);
const verde = nominalVerde;
console.log(`\nCAMPO-UV-FINISH ${verde ? 'VERDE' : 'VERMELHA'} · ${clausulas.filter((c) => c.ok).length}/${clausulas.length}`);
process.exit(verde ? 0 : 1);
