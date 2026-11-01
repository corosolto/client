/* Modelo real em cache já veste o pickup no boot.
   Prova e limites: docs/visual-consistency/PICKUP-CACHE.md. */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FAMILIAS = ['awp', 'ak', 'm4', 'shotgun', 'mp5', 'deagle', 'pistol'];
const MAPA = 'piscina_treta';       // 22 pickups: 10 rifles + 8 pistols + 4 deck (map_piscina.js)
const ESPERA = 22;
const GAP_TOL = 0.05;               // MESMA tolerância do VM14/pickup-check; nada de teto novo
const ROLL = 0.12;                  // mapPickup roll do refreshPickupModels
const ANCORA = '    this.refreshPickupModels();\n';

const args = process.argv.slice(2);
let modo = 'nominal';
if (args.length === 1 && args[0] === '--autoteste') modo = 'autoteste';
else if (args.length === 1 && args[0] === '--mutante=sem-refresh') modo = 'mutante';
else if (args.length > 0) {
  console.error(`uso: node tools/eval/pickup-initial-model-check.mjs [--mutante=sem-refresh|--autoteste] — recebido: ${JSON.stringify(args)}`);
  process.exit(2);
}

if (modo === 'autoteste') {
  const roda = (a) => spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...a], { encoding: 'utf8', maxBuffer: 1 << 20, timeout: 30000 });
  const nom = roda([]);
  let j;
  try { j = JSON.parse(nom.stdout.trim().split('\n').pop()); } catch { console.error('nominal: saída inválida'); process.exit(3); }
  if (nom.error || nom.status !== 0 || j.status !== 'GREEN') {
    console.error(`nominal não está verde: exit=${nom.status}, status=${j.status}`); process.exit(1);
  }
  const mut = roda(['--mutante=sem-refresh']);
  let jm;
  try { jm = JSON.parse(mut.stdout.trim().split('\n').pop()); } catch { console.error('mutante: saída inválida'); process.exit(3); }
  if (mut.error || mut.status !== 1 || jm.status !== 'RED' || JSON.stringify(jm.falhas) !== '["PIM2","PIM4"]') {
    console.error(`mutante sem-refresh não acendeu PIM2: exit=${mut.status}, status=${jm.status}, falhas=${jm.falhas}`); process.exit(1);
  }
  const cli = roda(['--mutante=inexistente']);
  if (cli.status !== 2) { console.error(`flag desconhecida não reprovou com exit 2 (exit=${cli.status})`); process.exit(1); }
  console.log(`✓ nominal GREEN (${j.tempo_ms}ms) · mutante sem-refresh RED em ${jm.falhas.join(',')} · CLI inválida exit 2`);
  process.exit(0);
}

/* ── infra: harness + GLB real (parse local, textura stub 1px — padrão tp-world) ── */
let h, THREE, GLTFLoader, weapons;
try {
  ({ THREE } = await import('./harness.mjs'));
  h = await import('./harness.mjs');
  ({ GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js'));
  weapons = await import(pathToFileURL(path.join(ROOT, 'public/js/weapons.js')).href);
} catch (e) { console.error(`infra na preparação do harness: ${e.message}`); process.exit(3); }
GLTFLoader.prototype.load = function (url, done, progress, fail) {
  const l = new GLTFLoader();
  l.register(() => ({
    name: 'EXT_texture_webp',
    async loadTexture() {
      const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
      t.needsUpdate = true;
      return t;
    },
  }));
  Promise.resolve().then(async () => {
    const bytes = fs.readFileSync(path.resolve(ROOT, 'public', url.split('?')[0]));
    done(await l.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), ''));
  }).catch((e) => fail?.(e));
};
try {
  await weapons.preloadWeapons(FAMILIAS);
  const ausentes = FAMILIAS.filter((id) => !weapons.hasWeapon(id));
  if (ausentes.length) {
    // cache ausente NÃO é verde: sem GLB real a medição não mede o produto
    console.error(`infra: GLB de arma não carregou (${ausentes.join(',')}) — verifique identidade do GLTFLoader no shim`);
    process.exit(3);
  }
} catch (e) { console.error(`infra no preload das armas: ${e.message}`); process.exit(3); }

/* ── fonte do produto (mutável em memória; o do disco é intocado) ── */
let src;
try { src = fs.readFileSync(path.join(ROOT, 'public/js/game.js'), 'utf8'); }
catch (e) { console.error(`infra na leitura do game.js: ${e.message}`); process.exit(3); }
if (modo === 'mutante') {
  if (src.split(ANCORA).length !== 2) { console.error('mutante: chamada do constructor não é âncora única'); process.exit(3); }
  src = src.replace(ANCORA, '');
}
const { gameClasseDe } = await import(pathToFileURL(path.join(ROOT, 'tools/eval/match-pickup-mode-check.mjs')).href);
console.info = () => {};
let Game;
try { Game = await gameClasseDe(src, `pickup-init-${modo}`); }
catch (e) { console.error(`infra na classe variante: ${e.message}`); process.exit(3); }

function boot(economia) {
  const P = h.CHARACTERS.find((c) => c.team === 'E');
  h.seedRandom(12345);
  globalThis.location.search = '';
  return new Game({
    renderer: h.renderer, textures: h.initTextures(), sfx: h.sfx,
    settings: { bots: 4, quality: 'low', difficulty: 'normal' },
    playerCharId: P.id, playerTeam: 'E', playerFaction: P.team, enemyFaction: 'B',
    nickname: 'SIM', mapId: MAPA, ctf: false, testMode: true, onQuit() {}, onMatchEnd() {},
    economia,
  });
}

function fingerprint(mesh) {
  let verts = 0;
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  mesh.updateWorldMatrix(true, true);
  mesh.traverse((o) => {
    const pos = o.isMesh && o.geometry?.attributes?.position;
    if (!pos) return;
    verts += pos.count;
    for (let i = 0; i < pos.count; i += Math.max(1, Math.ceil(pos.count / 500))) {
      box.expandByPoint(v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld));
    }
  });
  const sz = box.getSize(new THREE.Vector3());
  return `${verts}:${sz.x.toFixed(3)}x${sz.y.toFixed(3)}x${sz.z.toFixed(3)}`;
}

const t0 = Date.now();
const falhas = [];
const linhas = [];
const g = boot(false);
try {
  const pks = g.world.pickups || [];
  const c1 = pks.length === ESPERA;
  if (!c1) falhas.push('PIM1');
  linhas.push(`${c1 ? 'ok ' : 'XX '} PIM1 contagem: ${pks.length} (esperado ${ESPERA}) em ${MAPA}`);

  const semFonte = pks.filter((p) => !p.mesh || p.mesh.userData.weaponSource !== p.weapon);
  const c2 = semFonte.length === 0;
  if (!c2) falhas.push('PIM2');
  linhas.push(`${c2 ? 'ok ' : 'XX '} PIM2 fonte real no boot: ${pks.length - semFonte.length}/${pks.length} com weaponSource === weapon (${semFonte.length} sem — é a caixa literal do mapa)`);

  const gaps = [];
  for (const pk of pks) {
    if (!pk.mesh) { gaps.push(Infinity); continue; }
    pk.mesh.updateWorldMatrix(true, true);
    const b = new THREE.Box3().setFromObject(pk.mesh);
    const chao = g.world.groundHeightAt(pk.x, pk.z);
    gaps.push(b.min.y - chao);
  }
  const pior = gaps.length ? Math.max(...gaps.map(Math.abs)) : Infinity;
  const c3 = gaps.length === ESPERA && pior <= GAP_TOL;
  if (!c3) falhas.push('PIM3');
  linhas.push(`${c3 ? 'ok ' : 'XX '} PIM3 assentamento: pior |gap| ${isFinite(pior) ? pior.toFixed(4) : 'n/a'} m (teto VM14 ${GAP_TOL} m)`);

  const mausRoll = pks.filter((p) => !p.mesh || Math.abs(p.mesh.rotation.z - ROLL) > 1e-6 || p.mesh.visible !== true);
  const c4 = mausRoll.length === 0;
  if (!c4) falhas.push('PIM4');
  linhas.push(`${c4 ? 'ok ' : 'XX '} PIM4 pose/visibilidade: ${pks.length - mausRoll.length}/${pks.length} com roll ${ROLL} e visible`);

  const fps = new Map();
  for (const pk of pks) if (!fps.has(pk.weapon)) fps.set(pk.weapon, fingerprint(pk.mesh));
  const vals = [...fps.values()];
  const c5 = fps.size === FAMILIAS.length && new Set(vals).size === vals.length;
  if (!c5) falhas.push('PIM5');
  linhas.push(`${c5 ? 'ok ' : 'XX '} PIM5 geometria real distinta: ${new Set(vals).size}/${vals.length} famílias com fingerprint único`);
} finally { g.dispose?.(); }

const ge = boot(true);
try {
  const c6 = (ge.world.pickups || []).length === 0;
  if (!c6) falhas.push('PIM6');
  linhas.push(`${c6 ? 'ok ' : 'XX '} PIM6 economia ligada: ${ge.world.pickups.length} pickups (esperado 0)`);
} finally { ge.dispose?.(); }

for (const l of linhas) console.log(l);
const tempo = Date.now() - t0;
console.log(JSON.stringify({ status: falhas.length ? 'RED' : 'GREEN', falhas, tempo_ms: tempo }));
process.exit(falhas.length ? 1 : 0);
