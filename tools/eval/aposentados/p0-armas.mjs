/* P0 — VERIFICACAO TECNICA da volta de armas (G3-R1 / pipeline MINT_VM).
   Por que este script existe: a regua nova (BAR-CONSISTENCIA.md) diz que uma melhoria
   visual que quebra o jogo e REGRESSAO. Entao aqui nao se avalia beleza: mede-se, arma a
   arma e nos DOIS aspectos (16:9 e 3:2), se (a) a arma aparece, (b) cai no quadrante
   inferior direito, (c) o cano fica PARALELO ao eixo de mira (o bug "miro no meio do mapa
   e a arma aponta pra baixo"), (d) no ADS da pra ver arma E mira, (e) a sniper tem luneta,
   (f) nenhuma mao fica solta no ar (erro do IK em metros).

   Estrategia de custo: carregar mapa sob SwiftShader custa ~5 min. Entao UMA sessao por
   aspecto, jogo PAUSADO e avancado a mao (window.__step), trocando a arma via window.__game.

   RESILIENCIA (a 1a rodada morreu no 7o disparo): o processo do renderizador estoura de
   memoria depois de ~12 min de captura sob SwiftShader. Entao o script (1) RETOMA — pula
   toda arma que ja tem os 4 PNG no disco — e (2) se a pagina morrer, abre outra e continua
   de onde parou, ate MAX_TRY tentativas por aspecto.

   Uso: node tools/eval/p0-armas.mjs [outDir] [lista,de,armas] [aspecto]
*/
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = process.argv[2] || '/root/shots/p0';
const WLIST = (process.argv[3] || 'ak,awp,mp5,uzi,p90,deagle,revolver38,md97,svd,sks,knife').split(',');

const MAP = process.env.MAP || 'fy_ferrovelho';
const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const ASPECTS = { '169': [1600, 900], '32': [1500, 1000] };
const MAX_TRY = 3;
mkdirSync(OUT, { recursive: true });
mkdirSync(`${OUT}/_ref`, { recursive: true });

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

// Os 3 404 de /audio/ sao conhecidos e nao contam como erro (instrucao da tarefa).
const isNoise = (t) => /\/audio\//.test(t) || (/404 \(Not Found\)/.test(t) && /Failed to load resource/.test(t));

const jread = (f, d) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : d);
const report = jread(`${OUT}/_probe.json`, []);
const metrics = jread(`${OUT}/_metrics.json`, []);
const allErrs = jread(`${OUT}/_errs.json`, []);
const done = (w, a) => ['hip', 'ads'].every((s) => existsSync(`${OUT}/${w}-${a}-${s}.png`) && existsSync(`${OUT}/_ref/${w}-${a}-${s}.png`))
  && report.some((r) => r.aspect === a && r.w === w);
const save = () => {
  writeFileSync(`${OUT}/_probe.json`, JSON.stringify(report, null, 2));
  writeFileSync(`${OUT}/_metrics.json`, JSON.stringify(metrics, null, 2));
  writeFileSync(`${OUT}/_errs.json`, JSON.stringify(allErrs, null, 2));
};

// Codigo injetado na pagina: congela o jogo, expoe passo manual, render puro e a sonda
// geometrica. Tudo em VIEW SPACE (a vmCamera fica na origem, identidade).
const INIT = () => {
  const g = window.__game;
  g.paused = true;
  window.__step = (n = 1, dt = 0.016) => { for (let i = 0; i < n; i++) { g.paused = false; g.update(dt); g.paused = true; } };
  // renderer.render esta "patchado" pelo bloom e ja desenha a vmScene por cima — este e o
  // mesmo caminho do update(), usado pra tirar a referencia SEM a arma.
  window.__renderOnly = () => g.renderer.render(g.scene, g.camera);
  g.player.pitch = 0;
  g.player.vel.set(0, 0, 0);
  window.__probe = (id) => {
    const g = window.__game, cam = g.vmCamera, mdl = g.vm.models[id];
    const anyV = g.vm.grip && (g.vm.grip[id] || g.vm.grip.ak);
    const V3 = anyV ? anyV.constructor : null;
    const r = {
      id, rootVisible: !!g.vm.root.visible, mdlVisible: !!(mdl && mdl.visible),
      meshes: 0, scopeMask: +(g._scopeMask || 0).toFixed(3), aimF: +(g._aimF || 0).toFixed(3),
      adsF: +((g.vm.adsF || 0)).toFixed(3), fov: +g.camera.fov.toFixed(2),
      scoped: !!g.player.scoped,
      crosshairDisplay: getComputedStyle(document.getElementById('crosshair')).display,
      scopeOn: document.getElementById('scope-overlay').classList.contains('on'),
      scopeOpacity: document.getElementById('scope-overlay').style.opacity || '',
      scopeDisplay: getComputedStyle(document.getElementById('scope-overlay')).display,
      hudWeapon: (document.getElementById('wpn-name') || {}).textContent || null,
    };
    if (!mdl || !V3) return r;
    let minx = 9, maxx = -9, miny = 9, maxy = -9, minz = 9, maxz = -9;
    mdl.updateWorldMatrix(true, true);
    mdl.traverse((o) => {
      if (!o.isMesh) return;
      for (let p = o; p; p = p.parent) if (!p.visible) return;
      if (!o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox; if (!bb) return;
      r.meshes++;
      for (let i = 0; i < 8; i++) {
        const v = new V3(i & 1 ? bb.max.x : bb.min.x, i & 2 ? bb.max.y : bb.min.y, i & 4 ? bb.max.z : bb.min.z);
        v.applyMatrix4(o.matrixWorld);
        minz = Math.min(minz, v.z); maxz = Math.max(maxz, v.z);
        const q = v.clone().project(cam);
        minx = Math.min(minx, q.x); maxx = Math.max(maxx, q.x);
        miny = Math.min(miny, q.y); maxy = Math.max(maxy, q.y);
      }
    });
    if (r.meshes) {
      r.ndc = [minx, miny, maxx, maxy].map((n) => +n.toFixed(3));
      r.viewZ = [+minz.toFixed(3), +maxz.toFixed(3)];   // negativo = na frente da lente
    }
    // direcao do CANO: eixo +Z local do 'rw' em world(=view). O alvo e (0,0,-1).
    const rw = mdl.getObjectByName('rw');
    if (rw) {
      rw.updateWorldMatrix(true, false);
      const e = rw.matrixWorld.elements;
      const n = Math.hypot(e[8], e[9], e[10]) || 1;
      const d = [e[8] / n, e[9] / n, e[10] / n];
      r.barrel = d.map((x) => +x.toFixed(4));
      r.barrelDeg = +(Math.acos(Math.max(-1, Math.min(1, -d[2]))) * 180 / Math.PI).toFixed(2);
      r.barrelDownDeg = +(Math.asin(Math.max(-1, Math.min(1, -d[1]))) * 180 / Math.PI).toFixed(2);
      const met = rw.userData && rw.userData.metrics;
      if (met) {
        const mw = rw.localToWorld(met.muzzle.clone().divideScalar(met.norm || 1));
        r.muzzleView = [+mw.x.toFixed(3), +mw.y.toFixed(3), +mw.z.toFixed(3)];
        const mq = mw.clone().project(cam);
        r.muzzleNdc = [+mq.x.toFixed(3), +mq.y.toFixed(3)];
      }
    } else r.barrel = null;
    // MAOS: erro do IK em metros (efetor -> alvo). >0.01 m reprova no criterio C7.
    const arms = g.vm.arms;
    if (arms && arms.gripError) {
      const ge = arms.gripError();
      r.gripErrR = ge.r == null ? null : +ge.r.toFixed(4);
      r.gripErrL = ge.l == null ? null : +ge.l.toFixed(4);
      r.armsVisible = !!arms.group.visible;
    } else r.armsVisible = null;
    return r;
  };
};

// UMA sessao cobre os DOIS aspectos: carregar mapa custa ~5 min sob SwiftShader, entao em
// vez de recarregar so pra mudar o viewport, trocamos o tamanho da janela e deixamos o
// onResize/_vmFrame recalcularem. Bonus: o A/B 16:9 x 3:2 sai do MESMO estado de mundo,
// que e exatamente o que o criterio C6 (enquadramento estavel por aspecto) pede.
// Captura com teto de tempo generoso e UMA repeticao: sob SwiftShader o 1o frame depois de
// um resize ou de uma troca de FOV pode levar minutos, e perder a rodada inteira por causa
// disso custa ~14 min de recarga de mapa.
async function shot(page, path) {
  for (let i = 0; i < 2; i++) {
    try { await page.screenshot({ path, timeout: 300000 }); return true; }
    catch (e) { if (i) throw e; console.log(`    (recapturando ${path.split('/').pop()}: ${e.message.split('\n')[0]})`); }
  }
  return false;
}

async function runAll(browser, todo) {
  const page = await browser.newPage({ viewport: ASPECTS['169'][0] ? { width: ASPECTS['169'][0], height: ASPECTS['169'][1] } : { width: 1600, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('[pageerror] ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text()); });
  const left = [...todo];
  let curW = 0;
  const t0 = Date.now();
  try {
    await page.goto(`${BASE}/?debug=1&map=${MAP}&auto=B,bozo`, { waitUntil: 'domcontentloaded', timeout: 240000 });
    await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 900000 });
    const tLive = (Date.now() - t0) / 1000;
    console.log(`[live] ${tLive.toFixed(1)}s`);
    // metricas assim que fica jogavel (antes de qualquer captura) — se a pagina morrer
    // depois, o numero de carga/heap ja esta salvo.
    const m0 = await page.evaluate(() => {
      const g = window.__game, i = g.renderer.info;
      const res = performance.getEntriesByType('resource');
      const bytes = res.reduce((s, e) => s + (e.transferSize || e.encodedBodySize || 0), 0);
      return {
        calls: i.render.calls, tris: i.render.triangles, textures: i.memory.textures,
        geometries: i.memory.geometries, programs: i.programs ? i.programs.length : null,
        heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
        state: g.state, reqs: res.length, netMB: +(bytes / 1048576).toFixed(1),
        armsGlb: res.filter((e) => /arms_.*\.glb/.test(e.name)).map((e) => e.name.split('/').pop()),
        glbMB: +(res.filter((e) => /\.glb/.test(e.name)).reduce((s, e) => s + (e.transferSize || e.encodedBodySize || 0), 0) / 1048576).toFixed(1),
      };
    });
    for (const aName of Object.keys(ASPECTS)) {
      const prev = metrics.findIndex((x) => x.aspect === aName);
      const rec = { map: MAP, aspect: aName, tLive, ...m0 };
      if (prev >= 0) metrics[prev] = rec; else metrics.push(rec);
    }
    save();
    await page.evaluate(INIT);

    while (left.length) {
      const w = left[0];
      await page.evaluate((wid) => {
        const g = window.__game;
        if (!g.player.ammo[wid]) g.player.ammo[wid] = { mag: 30, res: 90 };
        g._scope(false, true);
        g._switchWeapon(wid);
        g.player.drawUntil = 0; g.player.reloadUntil = 0;
        window.__step(5, 0.06);   // assenta draw/spring antes de medir
      }, w);
      for (const [aName, [W, H]] of Object.entries(ASPECTS)) {
        if (curW !== W) {
          await page.setViewportSize({ width: W, height: H });
          curW = W;
          // Trocar o tamanho da janela obriga o SwiftShader a refazer surface e programas —
          // a 1a captura depois disso levava >120 s e derrubava a rodada inteira. Entao:
          // passa frames (o onResize/_vmFrame so recalculam dentro do _updatePlayer) e
          // queima uma captura de aquecimento antes de valer.
          await page.evaluate(() => window.__step(3, 0.06));
          await shot(page, '/tmp/p0-warm.png');
        }
        await page.evaluate(() => window.__step(2, 0.06));
        const hip = await page.evaluate((wid) => window.__probe(wid), w);
        await shot(page, `${OUT}/${w}-${aName}-hip.png`);
        await page.evaluate(() => { window.__game.vm.root.visible = false; window.__renderOnly(); });
        await shot(page, `${OUT}/_ref/${w}-${aName}-hip.png`);
        // ADS: ADS_T = 0.11 s, entao ~0.5 s cobre a rampa inteira com folga
        await page.evaluate(() => { const g = window.__game; g.vm.root.visible = true; g._scope(true); window.__step(9, 0.06); });
        const ads = await page.evaluate((wid) => window.__probe(wid), w);
        await shot(page, `${OUT}/${w}-${aName}-ads.png`);
        await page.evaluate(() => { window.__game.vm.root.visible = false; window.__renderOnly(); });
        await shot(page, `${OUT}/_ref/${w}-${aName}-ads.png`);
        await page.evaluate(() => { const g = window.__game; g.vm.root.visible = true; g._scope(false, true); window.__step(4, 0.06); });
        const old = report.findIndex((r) => r.aspect === aName && r.w === w);
        const row = { aspect: aName, w, hip, ads };
        if (old >= 0) report[old] = row; else report.push(row);
        save();
        console.log(`  [${aName}] ${w} hip barrel=${hip.barrelDeg} gripR=${hip.gripErrR} gripL=${hip.gripErrL} | ads fov=${ads.fov} mask=${ads.scopeMask} ch=${ads.crosshairDisplay} vm=${ads.rootVisible}`);
      }
      // renderer.info so vale DEPOIS de um render completo do mundo (o read logo apos o
      // 'live' pegava calls=1). Atualiza a cada arma; o ultimo valor fica no arquivo.
      const inf = await page.evaluate(() => {
        const i = window.__game.renderer.info;
        return { calls: i.render.calls, tris: i.render.triangles, textures: i.memory.textures, geometries: i.memory.geometries, programs: i.programs ? i.programs.length : null, heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null };
      });
      for (const m of metrics) Object.assign(m, inf);
      left.shift();
    }
  } catch (e) {
    errs.push('[fatal] ' + e.message.split('\n')[0]);
    console.log(`  FALHOU em ${left[0]}: ${e.message.split('\n')[0]}`);
  }
  const real = errs.filter((t) => !isNoise(t));
  allErrs.push({ total: errs.length, ruido: errs.length - real.length, reais: real });
  save();
  try { await page.close(); } catch { /* pagina ja morta */ }
  return left;
}

{
  let todo = WLIST.filter((w) => Object.keys(ASPECTS).some((a) => !done(w, a)));
  for (let t = 1; t <= MAX_TRY && todo.length; t++) {
    console.log(`tentativa ${t} — faltam ${todo.length}: ${todo.join(',')}`);
    const browser = await chromium.launch({
      executablePath: process.env.CHROME_BIN || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio',
        '--no-sandbox', '--disable-dev-shm-usage'],
    });
    todo = await runAll(browser, todo);
    try { await browser.close(); } catch { /* ja caiu */ }
  }
  if (todo.length) console.log(`NAO CAPTURADAS: ${todo.join(',')}`);
}
save();
console.log('METRICS', JSON.stringify(metrics));
await new Promise((r) => setTimeout(r, 500));
process.exit(0);
