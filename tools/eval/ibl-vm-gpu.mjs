/* ibl-vm-gpu.mjs — o IBL do viewmodel existe de verdade na GPU, e só nele?
 *
 * Complemento de ibl-vm-check.mjs (node). O texel do env map e o envMap que o shader recebe
 * só existem com WebGL de verdade: o PMREM saía preto com o pós ligado até o #832.
 *
 *   IG1  `_envRT` tem texels não nulos (mais da metade);
 *   IG2  cada material PBR visível da vmScene chegou ao shader com envMap, em cada arma;
 *   IG3  nenhum material da cena do mapa chegou ao shader com envMap (material que também
 *        está na mão, como a arma igual no chão, fica de fora: o three troca o programa
 *        por cena) e `scene.environment` é nulo.
 *
 * Lê `renderer.properties` depois de quadros reais, então mede o que a GPU usou.
 * Mutação de runtime: `--mutante=env0` sobe com `?env=0` (sem IBL) e tem que reprovar.
 *
 *   BASE=http://localhost:<porta> node tools/eval/ibl-vm-gpu.mjs [mapa] [armas]
 *   (GPU real: ANGLE Metal. Use tools/eval/with-browser-lock.sh.)
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE;
if (!BASE) { console.error('BASE obrigatório (ex.: BASE=http://localhost:9632)'); process.exit(1); }
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (!['', 'env0'].includes(MUTANTE)) { console.error(`mutante desconhecido: ${MUTANTE}`); process.exit(1); }
const MAPA = args[0] || 'praca_poderes';
const ARMAS = (args[1] || 'pistol,ak,awp').split(',');

const b = await chromium.launch({ args: ['--use-angle=metal', '--headless=new', '--mute-audio'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addInitScript(() => localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'high', camView: 'first', menuMusic: false })));
const p = await ctx.newPage();
await p.goto(`${BASE}/?debug=1&map=${MAPA}&auto=E&adaptativa=0${MUTANTE === 'env0' ? '&env=0' : ''}`, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 300000 });
await p.waitForTimeout(1500);

const env = await p.evaluate(() => {
  const g = window.__game, rt = g._envRT;
  if (!rt) return { texels: 0, frac: 0 };
  const w = rt.width, h = rt.height, buf = new Uint16Array(w * h * 4);
  g.renderer.readRenderTargetPixels(rt, 0, 0, w, h, buf);
  let nz = 0; for (let i = 0; i < w * h; i++) if (buf[i * 4] || buf[i * 4 + 1] || buf[i * 4 + 2]) nz++;
  return { texels: nz, frac: nz / (w * h) };
});
const porArma = [];
for (const arma of ARMAS) {
  await p.evaluate((w) => { const g = window.__game; if (g.player.weapon !== w) g._switchWeapon(w); }, arma);
  await p.waitForTimeout(1500);
  porArma.push(await p.evaluate((arma) => {
    const g = window.__game, props = g.renderer.properties;
    const vmMats = new Set();
    let vmPbr = 0, vmSem = 0;
    g.vmScene.traverseVisible((o) => {
      if (!o.isMesh) return;
      for (const m of [].concat(o.material || [])) {
        vmMats.add(m);
        if (!m.isMeshStandardMaterial) continue;
        vmPbr++; if (!props.get(m).envMap) vmSem++;
      }
    });
    let cenaPbr = 0, cenaCom = 0;
    g.scene.traverseVisible((o) => {
      if (!o.isMesh) return;
      for (const m of [].concat(o.material || [])) {
        if (vmMats.has(m) || !m.isMeshStandardMaterial) continue;
        cenaPbr++; if (props.get(m).envMap) cenaCom++;
      }
    });
    return { arma, empunhada: g.player.weapon, vmPbr, vmSem, cenaPbr, cenaCom, cenaEnv: !!g.scene.environment };
  }, arma));
}
await b.close();

const res = [
  ['IG1', 'env map com texels não nulos', env.frac > 0.5, `${env.texels} texels (${(100 * env.frac).toFixed(1)}%)`],
  ['IG2', 'material PBR da mão chega ao shader com envMap', porArma.every((a) => a.vmPbr > 0 && a.vmSem === 0),
    porArma.map((a) => `${a.empunhada} ${a.vmPbr - a.vmSem}/${a.vmPbr}`).join(' · ')],
  ['IG3', 'material da cena do mapa chega ao shader sem envMap', porArma.every((a) => a.cenaCom === 0 && !a.cenaEnv),
    porArma.map((a) => `${a.empunhada} ${a.cenaCom}/${a.cenaPbr} com envMap, environment=${a.cenaEnv}`).join(' · ')],
];
console.log(`ibl-vm-gpu ${MAPA}${MUTANTE ? ` (mutante ${MUTANTE})` : ''}`);
for (const [id, desc, ok, evid] of res) console.log(`${ok ? '✓' : '✗'} ${id}  ${desc} (${evid})`);
const falhou = res.some(([, , ok]) => !ok);
if (MUTANTE) {
  console.log(falhou ? `✓ mutante ${MUTANTE} ficou vermelho` : `✗ mutante ${MUTANTE} PASSOU, régua cega`);
  process.exit(falhou ? 0 : 1);
}
process.exit(falhou ? 1 : 0);
