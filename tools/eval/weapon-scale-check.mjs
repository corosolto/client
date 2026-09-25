// RÉGUA DE ESCALA DAS ARMAS — o modelo servido tem que ter o TAMANHO que ele declara.
//
// DEFEITO QUE ESTA RÉGUA NASCEU PARA MORDER (12/08): o mosquete do Bandeirante declarava
// `len: 1.45` em weapons.js e renderizava 7,856 m NA VERTICAL — a coluna de madeira gigante
// no meio da tela. Causa: `weaponModel()` normalizava a escala SÓ pelo eixo Z
// (`zlen = box.max.z - box.min.z`), assumindo que o `rot` da tabela já tinha posto o cano em
// +Z. O mosquete usava `rot: [-90,0,0]` (Tripo v3.1), que leva Z→Y: o normalizador passou a
// medir a SEÇÃO TRANSVERSAL (0,176 m) em vez do cano (0,982 m), pediu escala 8,2× e bateu no
// teto `Math.min(8, ...)` — daí o Z final de 1,411 em vez de 1,45 e o Y de 7,856.
//
// O QUE ELA MEDE, arma a arma, no bbox real de `weaponModel(id)` (Box3.setFromObject, a
// MESMA conta que o weapons.js usa para normalizar — se a régua e o código discordassem de
// convenção, a régua não estaria medindo o que o código decide):
//
//   A) EIXO+COMPRIMENTO  |dz − cfg.len| ≤ TOL
//      O contrato do weaponModel é "cano apontando +Z, comprimento real = len". Um `rot`
//      que deixe o cano fora de Z derruba esta, porque o span em Z vira a seção transversal.
//   B) SEM GIGANTE       max(dx,dy,dz) ≤ cfg.len + TOL
//      Nenhum eixo pode passar do comprimento declarado. É esta que pega a coluna de 7,856 m.
//      Ela é o valor MEDIDO do normalizador por maior-eixo: com o `rot` errado E o
//      normalizador por maior-eixo, a arma fica torta mas NÃO fica gigante (mutante `rot`);
//      com o `rot` errado E o normalizador só-Z, ela fica gigante (mutante `ambos`).
//
// USO
//   node tools/eval/weapon-scale-check.mjs [--mutante=rot|zlen|ambos] [--json=arquivo.json]
//   BASE=http://localhost:8123 (padrão)   — precisa do tools/eval/serve.mjs de pé.
//
// MUTANTES (prova de que a régua morde; injetam o defeito de volta SEM tocar no arquivo —
// a fonte mutada é servida por interceptação de rede, o repo fica limpo):
//   rot    devolve o `rot: [-90,0,0]` do mosquete           → A vermelha (dz vira a seção)
//   zlen   devolve a normalização só-Z                      → NO-OP com os `rot` atuais (ver
//          o laudo abaixo): com todos os canos em +Z, `max(dx,dy,dz)` É `dz`. Fica VERDE de
//          propósito, e a régua GRITA isso em vez de deixar passar como se tivesse mordido.
//   ambos  devolve os dois = o defeito original             → A e B vermelhas, 7,856 m no Y
// Um mutante que não encontra o padrão no fonte sai com código 2 (MUTANTE INERTE): mutação
// que passa de largo devolve verde, e esse verde seria lido como "o guarda funciona".
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const SRC = path.join(ROOT, 'public/js/weapons.js');
const BASE = process.env.BASE || 'http://localhost:8123';
const TOL = 0.02;   // metros

const args = process.argv.slice(2);
const arg = (n) => { const a = args.find(x => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : null; };
const MUT = arg('mutante');
const JSONOUT = arg('json');
if (MUT && !['rot', 'zlen', 'ambos'].includes(MUT)) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

/* ---------- mutação da fonte (só em memória; servida por route interception) ---------- */
function mutate(src, kind) {
  let out = src, hits = 0;
  if (kind === 'rot' || kind === 'ambos') {
    // devolve o rot quebrado do mosquete: [0,0,0] -> [-90,0,0]
    const re = /(mosquete:\s*\{[^}\n]*?rot:\s*)\[\s*0\s*,\s*0\s*,\s*0\s*\]/;
    if (!re.test(out)) { console.error('MUTANTE INERTE: não achei `mosquete: { ... rot: [0,0,0] }` em weapons.js'); process.exit(2); }
    out = out.replace(re, '$1[-90, 0, 0]'); hits++;
  }
  if (kind === 'zlen' || kind === 'ambos') {
    // devolve a normalização só-Z
    const re = /const zlen = Math\.max\(dx, dy, dz\) \|\| 1;/;
    if (!re.test(out)) { console.error('MUTANTE INERTE: não achei `const zlen = Math.max(dx, dy, dz) || 1;` em weapons.js'); process.exit(2); }
    out = out.replace(re, 'const zlen = dz || 1;'); hits++;
  }
  if (!hits) { console.error('MUTANTE INERTE: nenhuma substituição aplicada'); process.exit(2); }
  return out;
}

/* ---------- ids: os 26 jogáveis (WEAPON_IDS) + os de só-apresentação (mosquete) ---------- */
const srcText = readFileSync(SRC, 'utf8');
const mDisp = srcText.match(/const DISPLAY_MODEL_IDS = \[([^\]]*)\]/);
if (!mDisp) { console.error('não achei DISPLAY_MODEL_IDS em weapons.js — a régua mediria 26 e o mosquete escaparia'); process.exit(2); }
const DISPLAY_IDS = mDisp[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);

/* ---------- browser (mesmo padrão do tools/eval/weapon-capture.mjs) ---------- */
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: process.env.GPU === '1' ? ['--headless=new'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new'],
});
const page = await browser.newPage({ viewport: { width: 320, height: 240 } });
page.on('pageerror', e => console.error('[pageerror]', e.message));

if (MUT) {
  const body = mutate(srcText, MUT);
  await page.route('**/js/weapons.js*', r => r.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body }));
}
// cache-buster: mexer em .js sem bumpar o ?v= faz o navegador servir módulo velho.
await page.goto(`${BASE}/weapontest.html?w=ak&_cb=${Date.now()}`, { waitUntil: 'load' });
await page.waitForFunction(() => window.WT_READY, null, { timeout: 90000 });

const rows = await page.evaluate(async ({ display }) => {
  const THREE = await import('three');
  const W = await import('./js/weapons.js');
  await W.preloadWeapons();
  const ids = [...W.WEAPON_IDS, ...display];
  const out = [];
  for (const id of ids) {
    const cfg = W.weaponCFG(id);
    if (!W.hasWeapon(id)) { out.push({ id, missing: true, len: cfg.len }); continue; }
    const wm = W.weaponModel(id);
    if (!wm) { out.push({ id, missing: true, len: cfg.len }); continue; }
    wm.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(wm);
    out.push({
      id, len: cfg.len, rot: cfg.rot.slice(),
      dx: b.max.x - b.min.x, dy: b.max.y - b.min.y, dz: b.max.z - b.min.z,
    });
  }
  return out;
}, { display: DISPLAY_IDS });
await browser.close();

/* ---------- veredito ---------- */
const R = (n) => n.toFixed(3);
let bad = 0;
const report = [];
console.log(`RÉGUA DE ESCALA DAS ARMAS  (tol ${TOL} m)${MUT ? `   [MUTANTE=${MUT}]` : ''}`);
console.log('  A) |dz − len| ≤ tol        cano em +Z, comprimento real');
console.log('  B) max(dx,dy,dz) ≤ len+tol nenhum eixo maior que o comprimento declarado');
console.log('id            len     dx      dy      dz     maxEixo  eixo  errA    veredito');
for (const r of rows) {
  if (r.missing) { bad++; console.log(`${r.id.padEnd(12)} ${R(r.len)}   —       —       —       —       —     —       VERMELHA (modelo não carregou)`); report.push({ ...r, ok: false }); continue; }
  const mx = Math.max(r.dx, r.dy, r.dz);
  const eixo = mx === r.dx ? 'X' : (mx === r.dy ? 'Y' : 'Z');
  const errA = Math.abs(r.dz - r.len);
  const okA = errA <= TOL;
  const okB = mx <= r.len + TOL;
  const ok = okA && okB;
  if (!ok) bad++;
  const why = ok ? 'ok' : `VERMELHA${okA ? '' : ' A'}${okB ? '' : ' B'}`;
  console.log(`${r.id.padEnd(12)} ${R(r.len)}   ${R(r.dx)}   ${R(r.dy)}   ${R(r.dz)}   ${R(mx)}    ${eixo}     ${R(errA)}   ${why}`);
  report.push({ ...r, max: mx, eixo, errA, okA, okB, ok });
}
if (JSONOUT) writeFileSync(JSONOUT, JSON.stringify({ tol: TOL, mutante: MUT || null, rows: report }, null, 2));
console.log(`\n${bad ? `VERMELHA: ${bad}/${rows.length} arma(s) fora do contrato` : `VERDE: ${rows.length}/${rows.length} armas dentro do contrato`}`);
if (MUT && !bad) {
  console.log(`AVISO: o mutante "${MUT}" NÃO deixou a régua vermelha. Se isso não estiver documentado`);
  console.log('       como no-op no cabeçalho deste arquivo, a régua não está mordendo esse defeito.');
}
process.exit(bad ? 1 : 0);
