#!/usr/bin/env node
// Outdoor sustentado e papel preservado por geometria WORLD real.
// Contratos e contraprovas: docs/visual-consistency/POSTO-OUTDOOR.md.
const args = process.argv.slice(2);
const arg = (n) => { const a = args.find((x) => x === `--${n}` || x.startsWith(`--${n}=`)); return a === undefined ? '' : (a.includes('=') ? a.split('=').slice(1).join('=') : a); };
const MUTANTES = new Set(['sem-apoio', 'interrompido', 'oculto', 'colisor', 'perna-rgb', 'papel-fora', 'papel-fino']);
const MUT = arg('mutante');
const MAPA = arg('mapa') || new URL('../../public/js/map_posto.js', import.meta.url).href;
const desconhecidos = args.filter((a) => !a.startsWith('--mutante=') && !a.startsWith('--mapa='));
if (desconhecidos.length || (MUT && !MUTANTES.has(MUT))) { console.error(`uso: --mutante=${[...MUTANTES].join('|')} --mapa=<file-url>`); process.exit(2); }

let mod;
try {
  const { THREE, initTextures } = await import('./harness.mjs');
  mod = await import(MAPA);
  const scene = new THREE.Scene();
  const world = mod.buildPosto(scene, await initTextures());
  var ctx = { THREE, world };
} catch (e) {
  console.error(`ERRO-INFRA: mapa não subiu (${MAPA}): ${e && e.message}`);
  process.exit(3);
}
const { THREE, world } = ctx;

/* ---------------- coleta por nome: o mapa nomeia o que a régua acha ---------------- */
const achar = (pred) => { const out = []; world.root.traverse((n) => { if (pred(n)) out.push(n); }); return out; };
/* visibilidade real: cadeia de ancestors + layers (camada 0) + material (visible,
   colorWrite, opacity) — rgb que não chega à tela não é sustentação */
const visivel = (n) => {
  for (let o = n; o; o = o.parent) {
    if (o.visible === false) return false;
    if (!(o.layers.mask & 1)) return false;
  }
  const m = n.material;
  if (m) {
    const ms = Array.isArray(m) ? m : [m];
    if (!ms.some((x) => x && x.visible !== false && x.colorWrite !== false && !(x.transparent && x.opacity <= 0.01))) return false;
  }
  return true;
};
const bounds = (n) => new THREE.Box3().setFromObject(n);

const moldura = achar((n) => n.name === 'posto-outdoor-moldura')[0];
const suporte = achar((n) => n.name === 'posto-outdoor-suporte')[0];
const poster = achar((n) => typeof n.name === 'string' && n.name.startsWith('poster:'))[0];

/* ---------------- mutações em MEMÓRIA, no mundo já construído ---------------- */
if (MUT === 'sem-apoio' && suporte) suporte.removeFromParent();
if (MUT === 'interrompido') achar((n) => /^posto-outdoor-perna-/.test(n.name)).forEach((p) => { p.position.y += 1; });
if (MUT === 'oculto' && suporte) suporte.visible = false;

if (MUT === 'colisor') world.colliders.push({ minX: 26.9, maxX: 27.3, minY: 1.46, maxY: 2.9, minZ: -19, maxZ: -17 });
if (MUT === 'perna-rgb') { const p = achar((n) => /^posto-outdoor-perna-/.test(n.name))[0]; if (p) { p.material = p.material.clone(); p.material.visible = false; } }
if (MUT === 'papel-fora' && poster) poster.position.z += 100;
if (MUT === 'papel-fino' && poster) poster.scale.set(0.1, 1, 1);
world.root.updateMatrixWorld(true);

const bm = moldura ? bounds(moldura) : null;
const SUP1 = !!moldura && bm.min.y >= 1.4 && bm.max.y - bm.min.y >= 5;

const pernas = achar((n) => /^posto-outdoor-perna-/.test(n.name));
const tocaSolo = (b) => b.min.y <= 0.15;
const alcancaMoldura = (b) => bm && b.max.y >= bm.min.y - 0.05;
const sobMoldura = (b) => bm && b.max.x > bm.min.x && b.min.x < bm.max.x && b.max.z > bm.min.z && b.min.z < bm.max.z;
const pernasValidas = pernas.filter((p) => visivel(p)).filter((p) => { const b = bounds(p); return tocaSolo(b) && alcancaMoldura(b) && sobMoldura(b); });
const SUP2 = pernasValidas.length >= 2;

const vao = bm ? { minX: bm.min.x, maxX: bm.max.x, minY: 1.45, maxY: bm.min.y - 0.05, minZ: bm.min.z, maxZ: bm.max.z } : null;
const cruza = (a, b) => a.maxX > b.minX && a.minX < b.maxX && a.maxY > b.minY && a.minY < b.maxY && a.maxZ > b.minZ && a.minZ < b.maxZ;
const colisorNoVao = vao ? world.colliders.filter((c) => cruza(c, vao)) : [];
const SUP3 = !!vao && colisorNoVao.length === 0;

/* pontos do plano do poster transformados pelo matrixWorld: geometria FINAL posta */
const pontosPoster = poster ? (() => { const p = poster.geometry.attributes.position, out = []; for (let i = 0; i < p.count; i++) out.push(new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(poster.matrixWorld)); return out; })() : null;
const wbPoster = pontosPoster ? new THREE.Box3().setFromPoints(pontosPoster) : null;
const SUP4 = !!wbPoster && visivel(poster) && !!bm
  && pontosPoster.every((v) => v.y >= bm.min.y - 0.01 && v.y <= bm.max.y + 0.01 && v.z >= bm.min.z - 0.01 && v.z <= bm.max.z + 0.01)
  && (bm.min.x - wbPoster.max.x) >= 0.015 && (bm.min.x - wbPoster.max.x) <= 0.035;
const SUP5 = !!wbPoster && (() => { const w = wbPoster.max.z - wbPoster.min.z, h = wbPoster.max.y - wbPoster.min.y; return h > 0 && Math.abs(w / h - 1.338) <= 0.02; })();
const meshesSuporte = suporte ? achar((n) => n.isMesh && n.name).filter((n) => { for (let o = n; o; o = o.parent) if (o === suporte) return true; return false; }) : [];
const SUP6 = !!suporte && meshesSuporte.length >= 2 && meshesSuporte.length <= 4;

/* ---------------- veredito ---------------- */
const marca = MUT ? ` [mutante ${MUT}]` : '';
const fmt = (b) => b ? `[${b.min.x.toFixed(2)},${b.min.y.toFixed(2)},${b.min.z.toFixed(2)}→${b.max.x.toFixed(2)},${b.max.y.toFixed(2)},${b.max.z.toFixed(2)}]` : '—';
const r = [
  ['SUP1', SUP1, `moldura ${moldura ? fmt(bm) : 'ausente'}`],
  ['SUP2', SUP2, `${pernasValidas.length}/${pernas.length} pernas válidas (solo→moldura, sob o pé, visíveis)`],
  ['SUP3', SUP3, vao ? `nenhum colisor no vão ${fmt(new THREE.Box3(new THREE.Vector3(vao.minX, vao.minY, vao.minZ), new THREE.Vector3(vao.maxX, vao.maxY, vao.maxZ)))}${colisorNoVao.length ? ` — ${colisorNoVao.length} colisor(es) cruza(m)` : ''}` : 'moldura ausente'],
  ['SUP4', SUP4, wbPoster ? `papel ${fmt(wbPoster)}, face oeste x=${bm ? bm.min.x.toFixed(3) : '?'}, todos os cantos+vértices dentro` : 'poster ausente'],
  ['SUP5', SUP5, wbPoster ? `aspecto real z/y ${(wbPoster.max.z - wbPoster.min.z).toFixed(3)}/${(wbPoster.max.y - wbPoster.min.y).toFixed(3)}=${((wbPoster.max.z - wbPoster.min.z) / (wbPoster.max.y - wbPoster.min.y)).toFixed(3)} (±0,02 de 1,338)` : 'poster ausente'],
  ['SUP6', SUP6, `grupo suporte com ${meshesSuporte.length} meshes (2–4)`],
];
r.forEach(([id, ok, ev]) => console.log(`${id} ${ok ? 'PASSA' : 'FALHA'} — ${ev}${marca}`));
const falhas = r.filter((x) => !x[1]).length;
let cega = false;
if (MUT && !falhas) { console.log(`MUTAÇÃO '${MUT}' não acendeu cláusula — portão cego (lei 3)`); cega = true; }
if (cega) process.exit(4);
if (!falhas) console.log('POSTO-SUPPORT ✓ 6 cláusulas (moldura, pernas solo→moldura, sem colisor, papel, aspecto, agrupamento)');
process.exit(falhas ? 1 : 0);
