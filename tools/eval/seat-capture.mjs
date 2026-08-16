/* seat-capture.mjs — CAPTURA da pose ASSENTADA da seleção, sem passar pelo menu.
   Existe porque o select-capture.mjs navega o menu real (nick → JOGAR → time → lista) e o
   fluxo mudou (o #nick-input fica oculto até interação) — a captura morria no seletor.
   Este monta o personagem pelo MESMO caminho do preview (buildCharacterModel com
   `preview: true` + ctrl.update 60 quadros, o assentamento do pvSetChar) e renderiza em
   cena isolada: serve de evidência A/B pro porte de exibição (KNOWN-BUGS BUG-25, 3º ciclo).
   Exige o servidor do arnês no ar: `npm run eval:serve &`.
   Uso: node tools/eval/seat-capture.mjs <outDir> <id1,id2,...>  */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2];
const LIST = (process.argv[3] || 'mandrake').split(',');
const BASE = process.env.BASE || 'http://localhost:8123';
mkdirSync(OUT, { recursive: true });

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 560, height: 720 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(`${BASE}/?debug=1`, { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(1200);

for (const id of LIST) {
  for (const [tag, ang] of [['frente', 0], ['tresq', 0.7]]) {
    const ok = await page.evaluate(async ([cid, ang]) => {
      const THREE = await import('three');
      const G = await import('./js/glbchars.js');
      const C = await import('./js/characters.js');
      const def = C.CHARACTERS.find((c) => c.id === cid);
      if (!def) return 'sem def';
      await G.preloadCharacterAssets([cid]);
      if (!G.hasModel(cid)) return 'sem GLB';
      const wid = C.charWeapon(cid);
      const m = G.buildCharacterModel(def, { weaponId: wid, preview: true });
      if (!m) return 'build falhou';
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1c1c22);
      scene.add(new THREE.AmbientLight(0xffffff, 1.1));
      const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(2, 4, 3);
      scene.add(sun);
      scene.add(m.group);
      // assentamento idêntico ao preview (main.js): 60 quadros parado
      for (let i = 0; i < 60; i++) m.ctrl.update(1 / 60, 0, false, 0);
      m.group.rotation.y = ang;
      const cv = document.createElement('canvas'); cv.width = 560; cv.height = 720;
      cv.id = 'seatcv'; cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999';
      document.body.appendChild(cv);
      const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
      r.setSize(560, 720, false);
      const cam = new THREE.PerspectiveCamera(35, 560 / 720, 0.1, 50);
      cam.position.set(0, 1.05, 3.4); cam.lookAt(0, 0.95, 0);
      r.render(scene, cam);
      return 'ok';
    }, [id, ang]);
    if (ok !== 'ok') { console.log(`${id}: ${ok}`); continue; }
    const el = await page.$('#seatcv');
    await el.screenshot({ path: `${OUT}/${id}_${tag}.png` });
    await page.evaluate(() => document.getElementById('seatcv').remove());
    console.log(`${id}_${tag}.png`);
  }
}
await browser.close();
