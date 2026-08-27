/* ambience-registry-check.mjs — TODO MAPA DO REGISTRO TEM VIDA, não só o lajes.
 *
 * POR QUE EXISTE — pedido do dono, 17/08 (BUG-57), com estas palavras:
 *   "ele [lajes] tem ambiencia real coisa que nenhum dos outros mapas tem,
 *    horizonte, animais, animacoes no ceu, precismoa disso em todos os mapas"
 * A régua irmã (`eval:ambience`, browser) mede QUALIDADE da fauna em 3 mapas com
 * lista literal — o mesmo furo do gl-shots que deixou 5 mapas sem captura. Esta
 * varre o REGISTRO em node puro: mapa novo entra na cobrança sozinho.
 *
 * O QUE MEDE
 *  AR1  todo mapa do registro devolve `ambience` com animais instanciados
 *  AR2  população mínima por bioma: aberto ≥ 2 espécies (rato E pombo);
 *       interno (INTERNOS) ≥ 2 ratos — pombo dentro de prédio fechado é ruído
 *  AR3  nenhum animal nasce DENTRO de colisor (fauna dentro de parede é a
 *       classe LC5 do lajes-circuito, agora para bicho)
 *
 * USO
 *   node tools/eval/ambience-registry-check.mjs
 *   node tools/eval/ambience-registry-check.mjs --mutante=sem-ambience    # AR1/AR2
 *   node tools/eval/ambience-registry-check.mjs --mutante=fauna-em-solido # AR3
 *
 * Horizonte/vida de céu por mapa é a parte 2 do BUG-57 (direção de arte por
 * bioma) e ganha cláusula própria quando o dono aprovar a primeira referência.
 */
import { THREE, MAPS, initTextures } from './harness.mjs';

const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || null;
const conhecidos = new Set(['sem-ambience', 'fauna-em-solido']);
if (MUTANTE && !conhecidos.has(MUTANTE)) throw new Error(`mutante desconhecido: ${MUTANTE}`);

/* Mapa 100% interno (sem céu): pombo não entra; rato sim — UPA com rato é a sátira. */
const INTERNOS = new Set(['upa_24h']);

const T = await initTextures();
const ids = Object.keys(MAPS);
const linhas = [];
for (const id of ids) {
  const scene = new THREE.Scene();
  let W;
  try { W = MAPS[id].build(scene, T); } catch (e) { linhas.push({ id, erro: String(e?.message || e) }); continue; }
  let amb = W.ambience;
  if (MUTANTE === 'sem-ambience' && id === ids[0]) amb = null;
  if (!amb || !Array.isArray(amb.animals)) { linhas.push({ id, animals: null }); continue; }
  const por = {};
  for (const a of amb.animals) por[a.type] = (por[a.type] || 0) + 1;
  /* AR3: posição inicial dentro de colisor. Amostra o ponto do animal contra os AABBs;
     margem de 5 cm para encosto legítimo em parede. */
  const emSolido = [];
  for (const a of amb.animals) {
    const p = a.root?.position; if (!p) continue;
    const px = p.x, py = (p.y ?? 0) + 0.12, pz = p.z;
    for (const c of (W.colliders || [])) {
      if (typeof c.minX !== 'number') continue;
      if (px > c.minX + 0.05 && px < c.maxX - 0.05 && pz > c.minZ + 0.05 && pz < c.maxZ - 0.05
        && py > c.minY && py < c.maxY) { emSolido.push({ type: a.type, x: +px.toFixed(1), z: +pz.toFixed(1) }); break; }
    }
  }
  if (MUTANTE === 'fauna-em-solido' && emSolido.length === 0 && amb.animals.length && (W.colliders || []).length) {
    const c = W.colliders.find((k) => typeof k.minX === 'number' && k.maxY - k.minY > 0.5);
    if (c) emSolido.push({ type: 'mutante', x: (c.minX + c.maxX) / 2, z: (c.minZ + c.maxZ) / 2 });
  }
  linhas.push({ id, animals: amb.animals.length, por, emSolido });
}

const ar1 = linhas.filter((r) => r.erro || r.animals === null || r.animals === 0);
const ar2 = linhas.filter((r) => {
  if (r.erro || !r.por) return false;
  const rato = r.por.rat || 0, pombo = r.por.pigeon || 0;
  return INTERNOS.has(r.id) ? rato < 2 : (rato < 1 || pombo < 1);
});
const ar3 = linhas.filter((r) => r.emSolido && r.emSolido.length);

console.log(`AMBIÊNCIA NO REGISTRO — ${ids.length} mapas${MUTANTE ? `  [mutante: ${MUTANTE}]` : ''}\n`);
for (const r of linhas) {
  if (r.erro) { console.log(`  x ${r.id.padEnd(17)} build lançou: ${r.erro}`); continue; }
  if (r.animals === null || r.animals === 0) { console.log(`  x ${r.id.padEnd(17)} SEM ambiência`); continue; }
  const pop = Object.entries(r.por).map(([k, v]) => `${k}:${v}`).join(' ');
  const solido = r.emSolido.length ? `  <- ${r.emSolido.length} EM SÓLIDO ${JSON.stringify(r.emSolido[0])}` : '';
  console.log(`  ${r.emSolido.length ? 'x' : 'ok'} ${r.id.padEnd(17)} ${String(r.animals).padStart(2)} animais  ${pop}${solido}`);
}
console.log(`\n  AR1 todo mapa tem ambiência       ${ar1.length ? `FALHA — ${ar1.map((r) => r.id).join(', ')}` : 'PASSA'}`);
console.log(`  AR2 população mínima por bioma    ${ar2.length ? `FALHA — ${ar2.map((r) => r.id).join(', ')}` : 'PASSA'}`);
console.log(`  AR3 fauna fora de sólido          ${ar3.length ? `FALHA — ${ar3.map((r) => r.id).join(', ')}` : 'PASSA'}`);
process.exit(ar1.length || ar2.length || ar3.length ? 1 : 0);
