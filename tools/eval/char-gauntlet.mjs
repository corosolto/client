/* char-gauntlet.mjs — GAUNTLET VISUAL DE PERSONAGENS × ARMAS.
   ----------------------------------------------------------------------------
   Captura stills multi-ângulo de CADA personagem segurando CADA arma
   representativa, pelo MESMO caminho da tela de seleção que o dono vê
   (buildCharacterModel preview + 60 frames de ctrl.update), e mede o
   mount numérico leve (frenteZ/canoZ/roll/dMaoR/dMaoL herdados do
   select-mount). Com --judge, roda o vision-judge (rubrica `char`) por
   personagem na arma de vitrine — o VLM produz EVIDÊNCIA (scores 0-5 +
   defeitos), nunca veredito; o gosto final é humano na contact sheet
   (mesmo contrato da RUBRIC.md §E).

   Uso:
     node tools/eval/char-gauntlet.mjs --label=baseline \
        [--ids=canarinho,dollynho] [--weapons=ak,deagle,knife] \
        [--judge] [--judge-todas-armas] [--sem-servidor]

   - Porta 9123 (lane 9100-9900 do AGENTS.md). Rode sob
     with-browser-lock.sh quando outra pista de browser estiver de pé.
   - Saída: artifacts/gauntlet/<label>/<id>__<wid>__<ang>.png +
     manifest.json (+ verdicts.json com --judge).
   - Zero é a régua numérica: este script é EVIDÊNCIA. Exit 1 só em erro
     de infra (servidor/browser/GLB que não carregou). */
import { execSync, spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const arg = (n, d = '') => {
  const a = process.argv.find((x) => x.startsWith(`--${n}=`));
  return a ? a.split('=').slice(1).join('=') : d;
};
const LABEL = arg('label', 'baseline');
const IDS = arg('ids').split(',').filter(Boolean);
const WEAPONS = arg('weapons', 'ak,deagle,knife').split(',').filter(Boolean);
const JUDGE = process.argv.includes('--judge');
const JUDGE_TODAS = process.argv.includes('--judge-todas-armas');
const SEM_SERVIDOR = process.argv.includes('--sem-servidor');
const PORTA = process.env.PORTA || '9123';
const BASE = process.env.BASE || `http://127.0.0.1:${PORTA}`;
const OUT_DIR = join(ROOT, 'artifacts', 'gauntlet', LABEL);
mkdirSync(OUT_DIR, { recursive: true });

const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;

const servidor = SEM_SERVIDOR ? null : spawn('node', ['tools/eval/serve.mjs', PORTA], { stdio: 'ignore' });
process.on('exit', () => servidor?.kill());
if (servidor) {
  let pronto = false;
  for (let i = 0; i < 60 && !pronto; i++) {
    try { pronto = (await fetch(`${BASE}/eval-character.html`)).ok; } catch { /* subindo */ }
    if (!pronto) await new Promise((r) => setTimeout(r, 500));
  }
  if (!pronto) throw new Error(`servidor não respondeu em ${BASE}`);
}

const browser = await chromium.launch({
  ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' }),
  args: ['--headless=new', '--mute-audio', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 560, height: 760 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(`${BASE}/eval-character.html?debug=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });

/* Setup ÚNICO de cena/render na página — reusado por todos os combos. */
await page.evaluate(() => {
  const s = document.createElement('style');
  s.textContent = 'body{margin:0;background:#202226}canvas{display:block}';
  document.head.appendChild(s);
  window.__gauntlet = {};
});

const alvos = IDS.length ? IDS : await page.evaluate(async () => {
  const G = await import('./js/glbchars.js');
  const C = await import('./js/characters.js');
  return C.CHARACTERS.filter((c) => G.GLB_CHARS.has(c.id)).map((c) => c.id);
});

const resultados = [];
let erros = 0;
for (const id of alvos) {
  for (const wid of WEAPONS) {
    const r = await page.evaluate(async ([cid, w]) => {
      const THREE = await import('three');
      const G = await import('./js/glbchars.js');
      const C = await import('./js/characters.js');
      const X = window.__gauntlet;
      if (!X.renderer) {
        const canvas = document.createElement('canvas');
        document.body.appendChild(canvas);
        X.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
        X.renderer.setSize(560, 760, false);
        X.renderer.outputColorSpace = THREE.SRGBColorSpace;
        X.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        X.scene = new THREE.Scene();
        X.scene.background = new THREE.Color(0x2a2d31);
        X.scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a3630, 1.15));
        const dir = new THREE.DirectionalLight(0xffffff, 1.7);
        dir.position.set(2.5, 4.2, 2.2);
        X.scene.add(dir);
        const fill = new THREE.DirectionalLight(0xbfd0ff, 0.5);
        fill.position.set(-2.5, 1.6, -1.5);
        X.scene.add(fill);
        const grid = new THREE.GridHelper(4, 8, 0x606468, 0x3c4045);
        grid.position.y = 0.002;
        X.scene.add(grid);
        X.cam = new THREE.PerspectiveCamera(37, 560 / 760, 0.05, 30);
        X.model = null;
      }
      const def = C.CHARACTERS.find((c) => c.id === cid);
      if (!def) return { id: cid, wid: w, erro: 'sem definição' };
      try {
        await G.preloadCharacterAssets([cid]);
        if (!G.hasModel(cid)) return { id: cid, wid: w, erro: 'sem GLB' };
        if (X.model) { X.scene.remove(X.model.group); X.model = null; }
        X.model = G.buildCharacterModel(def, { weaponId: w, preview: true });
        if (!X.model) return { id: cid, wid: w, erro: 'build null' };
        X.scene.add(X.model.group);
        for (let i = 0; i < 60; i++) X.model.ctrl.update(1 / 60, 0, false, 0);
        X.scene.updateMatrixWorld(true);

        /* métricas numéricas leves (mesma receita do select-mount) */
        const m = X.model, tp = m.ctrl.tpMount, model = tp.model;
        const toM = (v) => model.worldToLocal(v.clone());
        const gun = tp.mount.children[0];
        const bb = new THREE.Box3().setFromObject(gun);
        const qG = gun.getWorldQuaternion(new THREE.Quaternion());
        const qM = model.getWorldQuaternion(new THREE.Quaternion());
        const cano = new THREE.Vector3(0, 0, 1).applyQuaternion(qG).applyQuaternion(qM.invert()).normalize();
        const centroM = toM(tp.mount.getWorldPosition(new THREE.Vector3()));
        let maoR = null, maoL = null;
        model.traverse((o) => {
          if (!o.isBone) return;
          if (!maoR && o.name === 'RightHand') maoR = o;
          if (!maoL && o.name === 'LeftHand') maoL = o;
        });
        const dMaoR = maoR ? +bb.distanceToPoint(maoR.getWorldPosition(new THREE.Vector3())).toFixed(3) : null;
        let dMaoL = null;
        if (m.ctrl.ikL) {
          const alvo = new THREE.Vector3().copy(m.ctrl.ikL.fore);
          m.ctrl.ikL.gun.localToWorld(alvo);
          dMaoL = +alvo.distanceTo(maoL ? maoL.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3()).toFixed(3);
        }
        const topo = new THREE.Vector3(0, 1, 0).applyQuaternion(qG);
        const perp = (v) => v.clone().addScaledVector(cano, -v.dot(cano));
        const tP = perp(topo), yP = perp(new THREE.Vector3(0, 1, 0));
        const rollDeg = tP.length() < 1e-4 || yP.length() < 1e-4 ? null
          : +(Math.acos(Math.min(1, Math.max(-1, tP.normalize().dot(yP.normalize())))) * 180 / Math.PI).toFixed(1);

        /* capturas: frente, 3/4 e close na empunhadura */
        const cam = X.cam;
        const shot = (azDeg, dist, eyeH, tgtH, fov) => {
          const az = azDeg * Math.PI / 180;
          cam.fov = fov; cam.aspect = 560 / 760; cam.updateProjectionMatrix();
          cam.position.set(Math.sin(az) * dist, eyeH, Math.cos(az) * dist);
          cam.lookAt(0, tgtH, 0);
          X.renderer.render(X.scene, cam);
          return X.renderer.domElement.toDataURL('image/png');
        };
        const frente = shot(0, 3.0, 1.1, 0.92, 37);
        const tresQuartos = shot(38, 3.0, 1.1, 0.92, 37);
        const mp = tp.mount.getWorldPosition(new THREE.Vector3());
        const azC = 28 * Math.PI / 180;
        cam.fov = 30; cam.aspect = 560 / 760; cam.updateProjectionMatrix();
        cam.position.set(mp.x + Math.sin(azC) * 1.15, mp.y + 0.12, mp.z + Math.cos(azC) * 1.15);
        cam.lookAt(mp.x, mp.y + 0.02, mp.z);
        X.renderer.render(X.scene, cam);
        const maos = X.renderer.domElement.toDataURL('image/png');
        /* RECARGA (relato do dono, 31/10 — "animação de recarregar esquisita, braço vai
           pra trás"): dispara o overlay procedural no pico do envelope (t = dur/2) e
           captura o close da mão-L no pente. Só arma de 2 mãos (pistola recarrega 1h). */
        let recarga = null;
        if (w !== 'knife') {
          m.ctrl.reload(1.2);
          for (let i = 0; i < 36; i++) m.ctrl.update(1 / 60, 0, false, 0);
          X.scene.updateMatrixWorld(true);
          const mp2 = tp.mount.getWorldPosition(new THREE.Vector3());
          cam.position.set(mp2.x + Math.sin(azC) * 1.25, mp2.y + 0.1, mp2.z + Math.cos(azC) * 1.25);
          cam.lookAt(mp2.x, mp2.y, mp2.z);
          X.renderer.render(X.scene, cam);
          recarga = X.renderer.domElement.toDataURL('image/png');
        }
        const png = { frente, tres_quartos: tresQuartos, maos };
        if (recarga) png.recarga = recarga;
        return {
          id: cid, wid: w,
          num: {
            frenteZ: +centroM.z.toFixed(3), canoZ: +cano.z.toFixed(3), rollDeg,
            dMaoR, dMaoL, oneHanded: !!m.ctrl.oneHanded, ikL: !!m.ctrl.ikL,
          },
          png,
        };
      } catch (e) {
        return { id: cid, wid: w, erro: String(e && e.message || e).slice(0, 200) };
      }
    }, [id, wid]);

    if (r.erro) {
      erros++;
      console.error(`✗ ${id} × ${wid}: ${r.erro}`);
      resultados.push({ id, wid, erro: r.erro });
      continue;
    }
    const arquivos = {};
    for (const [ang, b64] of Object.entries(r.png)) {
      const f = `${id}__${r.wid}__${ang}.png`;
      writeFileSync(join(OUT_DIR, f), Buffer.from(b64.split(',')[1], 'base64'));
      arquivos[ang] = f;
    }
    resultados.push({ id: r.id, wid: r.wid, num: r.num, arquivos });
    console.log(`✓ ${r.id} × ${r.wid}  frenteZ=${r.num.frenteZ} canoZ=${r.num.canoZ} roll=${r.num.rollDeg} dMaoR=${r.num.dMaoR} dMaoL=${r.num.dMaoL ?? '—'}${r.num.oneHanded ? ' 1h' : ''}`);
  }
}
await browser.close();
servidor?.kill();

writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify({ label: LABEL, weapons: WEAPONS, geradoEm: new Date().toISOString(), resultados }, null, 2));

/* ---- julgamento visual (evidência, nunca veredito) ---- */
if (JUDGE) {
  const porChar = new Map();
  for (const r of resultados) {
    if (r.erro) continue;
    if (!JUDGE_TODAS) {
      // arma de vitrine: a que a tela de seleção mostra pra este char
      const atual = porChar.get(r.id);
      const ehVitrine = !atual || r.wid !== 'knife'; // knife não é vitrine de ninguém
      if (!atual || (ehVitrine && atual.wid === 'knife')) porChar.set(r.id, r);
    } else {
      porChar.set(`${r.id}__${r.wid}`, r);
    }
  }
  const verdictos = [];
  for (const [chave, r] of porChar) {
    const imgs = Object.values(r.arquivos).map((f) => join(OUT_DIR, f)).join(',');
    const outJson = join(OUT_DIR, `judge__${chave}.json`);
    const p = spawnSync('node', ['tools/eval/vision-judge.mjs', `--images=${imgs}`, '--rubric=char', `--out=${outJson}`], { encoding: 'utf8', timeout: 300000 });
    if (p.status !== 0) {
      verdictos.push({ chave, erro: (p.stderr || '').slice(0, 200) });
      console.error(`✗ judge ${chave}`);
      continue;
    }
    const j = JSON.parse(readFileSync(outJson, 'utf8'));
    verdictos.push({ chave, nota: j.nota_geral, defeitos: j.defeitos, criterios: j });
    console.log(`○ judge ${chave}: nota ${j.nota_geral} · ${j.defeitos?.length || 0} defeitos`);
  }
  verdictos.sort((a, b) => (a.nota ?? 99) - (b.nota ?? 99));
  writeFileSync(join(OUT_DIR, 'verdicts.json'), JSON.stringify(verdictos, null, 2));
  console.log('\n=== RANKING (pior → melhor) ===');
  for (const v of verdictos.slice(0, 20)) {
    console.log(`${String(v.nota ?? '?').padStart(3)}  ${v.chave.padEnd(24)} ${((v.defeitos || [])[0] || '').slice(0, 90)}`);
  }
}

console.log(`\nGAUNTLET '${LABEL}': ${resultados.length - erros}/${resultados.length} combos capturados, ${erros} erros → ${OUT_DIR}`);
process.exit(erros ? 1 : 0);
