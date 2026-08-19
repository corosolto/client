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
 *  AR4  espécies-chave por bioma (v2.1, BUG-57): favela tem gato, campo tem
 *       galinha E vaca, córrego tem galinha de quintal — a fauna nova do
 *       acervo Quaternius CC0 não pode existir só num mapa
 *  AR5  NENHUM pombo em modo flight no registro inteiro (dono, 18/08: "a pomba
 *       que nao esta com bracos avertos deveria ficar so na ponta das lajes ou
 *       no chao") — pombo voando com GLB estático de asas abertas é o defeito
 *  AR6  TODO mapa devolve `sound` (vida 1, plans/22, dono 19/08: "cena comuns
 *       do dia-dia animais urbanos ... com audio inclusive"). Forma mínima:
 *       { loops: [{ src, pos:[x,y,z], radius, vol }] } e/ou { bioma: '...' } —
 *       o hook existe por mapa; arquivo faltando é dívida do audio-pack, não
 *       da régua (o soundscape cai em silêncio com warn, como a fauna sem GLB)
 *
 * USO
 *   node tools/eval/ambience-registry-check.mjs
 *   node tools/eval/ambience-registry-check.mjs --mutante=sem-ambience     # AR1/AR2
 *   node tools/eval/ambience-registry-check.mjs --mutante=fauna-em-solido  # AR3
 *   node tools/eval/ambience-registry-check.mjs --mutante=sem-gato         # AR4
 *   node tools/eval/ambience-registry-check.mjs --mutante=pomba-voa-de-novo # AR5
 *   node tools/eval/ambience-registry-check.mjs --mutante=sem-som          # AR6
 *   node tools/eval/ambience-registry-check.mjs --mutante=sem-fauna2       # AR4 (tatu/barata/papagaio)
 *
 * Horizonte/vida de céu por mapa é a parte 2 do BUG-57 (direção de arte por
 * bioma) e ganha cláusula própria quando o dono aprovar a primeira referência.
 */
import { THREE, MAPS, initTextures } from './harness.mjs';

const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || null;
const conhecidos = new Set(['sem-ambience', 'fauna-em-solido', 'sem-gato', 'pomba-voa-de-novo', 'sem-som', 'sem-fauna2']);
if (MUTANTE && !conhecidos.has(MUTANTE)) throw new Error(`mutante desconhecido: ${MUTANTE}`);

/* Mapa 100% interno (sem céu): pombo não entra; rato sim — UPA com rato é a sátira. */
const INTERNOS = new Set(['upa_24h']);

/* Espécie-chave por bioma (v2.1, frente D): gato de telhado na favela, galinha de
   quintal/campinho, vaca na várzea. Mapa novo desse bioma herda a cobrança. */
const BIOMA_FAUNA = {
  fy_lajes: ['cat'], quebrada: ['cat'], fy_corrego: ['cat', 'chicken', 'cockroach'],
  fy_campomorro: ['chicken', 'cow', 'armadillo'],
  /* fauna 2 (vida 1, plans/22): tatu no cerrado (campo/Brasília), barata urbana
     (córrego/atacadão), papagaio de poleiro (mansão/parque) */
  praca_poderes: ['armadillo'], atacadao_treta: ['cockroach'],
  fy_mansao: ['parrot'], parque_treta: ['parrot'],
};
const FAUNA2 = new Set(['armadillo', 'cockroach', 'parrot']);

const T = await initTextures();
const ids = Object.keys(MAPS);
const linhas = [];
let mutanteAplicou = ['pomba-voa-de-novo', 'sem-som', 'sem-fauna2'].includes(MUTANTE) ? false : null;
for (const id of ids) {
  const scene = new THREE.Scene();
  let W;
  try { W = MAPS[id].build(scene, T); } catch (e) { linhas.push({ id, erro: String(e?.message || e) }); continue; }
  /* AR6: hook de áudio ambiente (vida 1). Válido = loop posicional bem formado
     e/ou bioma declarado (a pool de one-shots mora no soundscape.js). */
  let sound = W.sound;
  if (MUTANTE === 'sem-som' && !mutanteAplicou && sound) { sound = null; mutanteAplicou = true; }
  const loopRuim = (sound?.loops || []).find((l) => typeof l?.src !== 'string'
    || !Array.isArray(l?.pos) || l.pos.length !== 3 || typeof l?.radius !== 'number' || l.radius <= 0);
  const somOk = !!sound && ((sound.loops?.length > 0 && !loopRuim) || typeof sound.bioma === 'string');
  let amb = W.ambience;
  if (MUTANTE === 'sem-ambience' && id === ids[0]) amb = null;
  if (!amb || !Array.isArray(amb.animals)) { linhas.push({ id, animals: null, somOk }); continue; }
  if (MUTANTE === 'sem-gato') {
    const antes = amb.animals.length;
    amb.animals = amb.animals.filter((a) => a.type !== 'cat');
    if (amb.animals.length < antes) mutanteAplicou = true;
  }
  if (MUTANTE === 'sem-fauna2') {
    const antes = amb.animals.length;
    amb.animals = amb.animals.filter((a) => !FAUNA2.has(a.type));
    if (amb.animals.length < antes) mutanteAplicou = true;
  }
  if (MUTANTE === 'pomba-voa-de-novo' && !mutanteAplicou) {
    const pombo = amb.animals.find((a) => a.type === 'pigeon');
    if (pombo) { pombo.mode = 'flight'; mutanteAplicou = true; }
  }
  const por = {};
  for (const a of amb.animals) por[a.type] = (por[a.type] || 0) + 1;
  const voando = amb.animals.filter((a) => a.mode === 'flight').length;
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
  linhas.push({ id, animals: amb.animals.length, por, emSolido, voando, somOk });
}

const ar1 = linhas.filter((r) => r.erro || r.animals === null || r.animals === 0);
const ar2 = linhas.filter((r) => {
  if (r.erro || !r.por) return false;
  const rato = r.por.rat || 0, pombo = r.por.pigeon || 0;
  return INTERNOS.has(r.id) ? rato < 2 : (rato < 1 || pombo < 1);
});
const ar3 = linhas.filter((r) => r.emSolido && r.emSolido.length);
const ar4 = linhas.filter((r) => !r.erro && (BIOMA_FAUNA[r.id] || []).some((especie) => !(r.por?.[especie] > 0)));
const ar5 = linhas.filter((r) => !r.erro && r.voando > 0);
const ar6 = linhas.filter((r) => !r.erro && !r.somOk);

console.log(`AMBIÊNCIA NO REGISTRO — ${ids.length} mapas${MUTANTE ? `  [mutante: ${MUTANTE}]` : ''}\n`);
for (const r of linhas) {
  if (r.erro) { console.log(`  x ${r.id.padEnd(17)} build lançou: ${r.erro}`); continue; }
  if (r.animals === null || r.animals === 0) { console.log(`  x ${r.id.padEnd(17)} SEM ambiência`); continue; }
  const pop = Object.entries(r.por).map(([k, v]) => `${k}:${v}`).join(' ');
  const solido = r.emSolido.length ? `  <- ${r.emSolido.length} EM SÓLIDO ${JSON.stringify(r.emSolido[0])}` : '';
  const voo = r.voando ? `  <- ${r.voando} EM VOO` : '';
  const mudo = r.somOk ? '' : '  <- MUDO';
  console.log(`  ${r.emSolido.length || r.voando || !r.somOk ? 'x' : 'ok'} ${r.id.padEnd(17)} ${String(r.animals).padStart(2)} animais  ${pop}${solido}${voo}${mudo}`);
}
const f4 = ar4.map((r) => `${r.id}(faltam ${BIOMA_FAUNA[r.id].filter((e) => !(r.por?.[e] > 0)).join('+')})`).join(', ');
const f5 = ar5.map((r) => `${r.id}:${r.voando}`).join(', ');
console.log(`\n  AR1 todo mapa tem ambiência       ${ar1.length ? `FALHA — ${ar1.map((r) => r.id).join(', ')}` : 'PASSA'}`);
console.log(`  AR2 população mínima por bioma    ${ar2.length ? `FALHA — ${ar2.map((r) => r.id).join(', ')}` : 'PASSA'}`);
console.log(`  AR3 fauna fora de sólido          ${ar3.length ? `FALHA — ${ar3.map((r) => r.id).join(', ')}` : 'PASSA'}`);
console.log(`  AR4 espécie-chave por bioma       ${ar4.length ? `FALHA — ${f4}` : 'PASSA'}`);
console.log(`  AR5 nenhuma pomba em voo          ${ar5.length ? `FALHA — ${f5} (mode flight sobreviveu; BUG-57 v2.1)` : 'PASSA'}`);
console.log(`  AR6 todo mapa tem som ambiente    ${ar6.length ? `FALHA — ${ar6.map((r) => r.id).join(', ')}` : 'PASSA'}`);

const MUTANTES = { 'sem-gato': ['AR4', ar4], 'sem-fauna2': ['AR4', ar4], 'pomba-voa-de-novo': ['AR5', ar5], 'sem-som': ['AR6', ar6] };
if (MUTANTES[MUTANTE]) {
  const [esperado, falhas] = MUTANTES[MUTANTE];
  const mordeu = falhas.length > 0;
  if (!mutanteAplicou) { console.error(`\nMUTANTE NÃO APLICOU: ${MUTANTE}`); process.exit(1); }
  if (!mordeu) { console.error(`\nMUTANTE SOBREVIVEU: ${MUTANTE} não acendeu ${esperado}`); process.exit(1); }
  const colaterais = [ar1.length && 'AR1', ar2.length && 'AR2', ar3.length && 'AR3',
    esperado !== 'AR4' && ar4.length && 'AR4', esperado !== 'AR5' && ar5.length && 'AR5',
    esperado !== 'AR6' && ar6.length && 'AR6'].filter(Boolean);
  if (colaterais.length) { console.error(`\nMUTANTE ${MUTANTE} acendeu cláusulas colaterais: ${colaterais.join(', ')}`); process.exit(1); }
  console.log(`\nMUTANTE MORDIDO: ${MUTANTE} -> ${esperado}`);
  process.exit(0);
}
process.exit(ar1.length || ar2.length || ar3.length || ar4.length || ar5.length || ar6.length ? 1 : 0);
