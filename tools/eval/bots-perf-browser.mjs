/* BOTS-PERF NO CHROME — quadro real com 12 bots na Operação Flávio, CPU 4× mais lenta.
   Relato do dono (08/11): "trava muito se tiver mais de 4 bots". Medido nesta máquina
   (M-series, Chrome headless com GPU Metal; CPU emulada 4× para chegar perto do PC do dono):
   antes, 12 bots na Flávio davam p50 333 ms e p95 533 ms por quadro; a régua cobra o depois.
   Mede quadro por rAF, long tasks, GC (queda de heap) e consultas de programa do three por
   quadro (getProgram → customProgramCacheKey), que eram o lixo de render que crescia por bot.
   Uso:
     node tools/eval/bots-perf-browser.mjs                       # régua (veredito)
     node tools/eval/bots-perf-browser.mjs --mutante=ia-antiga   # LOS/colisão/occluder antigos: VERMELHA
     node tools/eval/bots-perf-browser.mjs --mutante=render-antigo  # sombra/halo/luz antigos: VERMELHA
     node tools/eval/bots-perf-browser.mjs --mutantes            # controle + os dois mutantes
     node tools/eval/bots-perf-browser.mjs --medir --maps=operacao_flavio,lajes,amazonia --bots=4,8,12 [--cpu=4] [--profile] [--alloc]
   Servidor: sobe tools/eval/serve.mjs na --porta (9613) ou usa --base/BASE. Rode com
   tools/eval/with-browser-lock.sh (um browser por vez). */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const SELF = fileURLToPath(import.meta.url);
const option = (name, fallback) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const MUTANTES = {
  // Volta LOS sem memo e sem parada no 1º acerto, _collide linear e occluder sem índice (?occindex=0).
  'ia-antiga': { query: 'occindex=0', ganchos: { semMemoLos: true, colideLinear: true, losTodos: true } },
  // Volta depth de sombra único, halos/sombras de contato em 2 passadas e luz fora das camadas.
  'render-antigo': { query: 'skindepth=0&halosingle=0&luzcamadas=0', ganchos: {} },
};
const mutante = option('mutante', '');
if (mutante && !MUTANTES[mutante]) throw new Error(`mutante desconhecido: ${mutante}`);

if (process.argv.includes('--mutantes')) {
  const rodar = (args) => spawnSync(process.execPath, [SELF, ...args, ...process.argv.slice(2).filter(a => a !== '--mutantes')], { encoding: 'utf8', maxBuffer: 1 << 24, timeout: 900000 });
  const base = rodar([]);
  process.stdout.write(base.stdout);
  if (base.status !== 0) { console.error(`controle tinha de passar\n${base.stderr.slice(-2000)}`); process.exit(1); }
  for (const nome of Object.keys(MUTANTES)) {
    const r = rodar([`--mutante=${nome}`]);
    process.stdout.write(r.stdout);
    if (r.status !== 1 || !r.stdout.includes(`Mutação aplicada: ${nome}`) || !r.stdout.includes('FALHA')) {
      console.error(`✗ mutante ${nome} não reprovou (status ${r.status})\n${r.stderr.slice(-2000)}`); process.exit(1);
    }
    console.log(`✓ mutante ${nome} reprovou`);
  }
  process.exit(0);
}

const medirMatriz = process.argv.includes('--medir');
const porta = option('porta', '9613');
const baseExterna = option('base', process.env.BASE || '');
const base = baseExterna || `http://127.0.0.1:${porta}`;
const out = option('out', 'artifacts/bots-perf');
const maps = medirMatriz ? option('maps', 'operacao_flavio,lajes,amazonia').split(',') : ['operacao_flavio'];
const counts = medirMatriz ? option('bots', '4,8,12').split(',').map(Number) : [12];
const seconds = Number(option('seconds', medirMatriz ? '20' : '15'));
const quality = option('quality', 'med');
const profile = process.argv.includes('--profile'), alloc = process.argv.includes('--alloc');
const tag = option('tag', mutante || (medirMatriz ? 'run' : 'regua')), cpuRate = Number(option('cpu', medirMatriz ? '1' : '4'));
const width = 1280, height = 720;
if (!counts.every(n => Number.isInteger(n) && n >= 2 && n <= 15) || !(seconds >= 5 && seconds <= 120) || !(cpuRate >= 1 && cpuRate <= 8)) throw Error('Argumentos inválidos');
mkdirSync(out, { recursive: true });

const pct = (s, p) => s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : null;

async function medir(browser, map, bots) {
  const allyBots = Math.floor((bots - 1) / 2), enemyBots = bots - allyBots;
  const { query = '', ganchos = {} } = MUTANTES[mutante] || {};
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(({ allyBots, enemyBots, quality }) => {
    localStorage.setItem('awpbr_settings', JSON.stringify({ quality, allyBots, enemyBots, vol: 0, speech: false, menuMusic: false }));
    let s = 4321; Math.random = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
    window.__longTasks = [];
    new PerformanceObserver(l => { for (const e of l.getEntries()) window.__longTasks.push(e.duration); }).observe({ type: 'longtask', buffered: true });
  }, { allyBots, enemyBots, quality });
  // adaptativa=0: a escada de qualidade não pode mudar o preset no meio da amostra.
  await page.goto(`${base}/?debug=1&auto=E&map=${map}&perfilauto=0&adaptativa=0${query ? `&${query}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 }).catch(async (e) => {
    console.error('não ficou live:', await page.evaluate(() => ({ st: window.__game?.state, has: !!window.__game })).catch(() => null), errors.slice(0, 5));
    throw e;
  });
  await page.waitForTimeout(4000);   // GLBs, shaders e sombra chegam assíncronos
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  if (cpuRate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });
  await page.evaluate((ganchos) => {
    const g = window.__game;
    if (ganchos.semMemoLos && g.objective) g.objective.__mutSemMemoLos = true;
    if (ganchos.colideLinear) g.__mutColideLinear = true;
    if (ganchos.losTodos) g.__mutLosTodos = true;
    const blindar = () => { g.player.hp = 1e9; g.timeLeft = 1e6; g.ctfMatchLeft = 1e6; };
    blindar(); setInterval(blindar, 500);
    const frames = [], heap = [], stats = {}, draw = { frames: 0, calls: 0, tris: 0, maxCalls: 0 };
    for (const name of ['update', '_updateBot', '_losClear', '_updateHud', '_updateRadar', '_updateFx', '_updatePickups']) {
      const fn = g[name]; if (!fn) continue;
      const row = stats[name] = { calls: 0, ms: 0, max: 0 };
      g[name] = function (...args) {
        const t = performance.now();
        try { return fn.apply(this, args); } finally { const d = performance.now() - t; row.calls++; row.ms += d; if (d > row.max) row.max = d; }
      };
    }
    // Consulta de programa = getProgram do three (chama customProgramCacheKey uma vez por consulta).
    let mat; g.scene.traverse(o => { if (!mat && o.isMesh && o.material && !Array.isArray(o.material)) mat = o.material; });
    let proto = Object.getPrototypeOf(mat);
    while (proto && !Object.prototype.hasOwnProperty.call(proto, 'customProgramCacheKey')) proto = Object.getPrototypeOf(proto);
    const chave = proto.customProgramCacheKey, contas = { programa: 0 };
    proto.customProgramCacheKey = function () { contas.programa++; return chave.call(this); };
    // info acumula o quadro inteiro (sombra, bloom, VM); lido e zerado no rAF que roda depois do main.
    const r = g.renderer;
    r.info.autoReset = false; r.info.reset();
    window.__longTasks.length = 0;
    let last = performance.now(), progs = r.info.programs?.length || 0;
    const spikes = [], prog0 = progs;
    const loop = t => {
      const dt = t - last; frames.push(dt); last = t; heap.push(performance.memory.usedJSHeapSize);
      draw.frames++; draw.calls += r.info.render.calls; draw.tris += r.info.render.triangles; draw.maxCalls = Math.max(draw.maxCalls, r.info.render.calls); r.info.reset();
      const p = r.info.programs?.length || 0;
      if (dt > 50) spikes.push([+dt.toFixed(1), p - progs, +((t - window.__perfBots.start) / 1000).toFixed(2)]);
      progs = p;
      if (window.__perfBots) requestAnimationFrame(loop);
    };
    window.__perfBots = { frames, heap, stats, draw, spikes, prog0, contas, start: performance.now(), rendered0: g._rafFrames || 0 };
    requestAnimationFrame(loop);
  }, ganchos);
  const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  let cpu = null;
  if (profile) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 250 }); await cdp.send('Profiler.start'); }
  if (alloc) { await cdp.send('HeapProfiler.enable'); await cdp.send('HeapProfiler.startSampling', { samplingInterval: 16384, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true }); }
  await page.waitForTimeout(seconds * 1000);
  if (profile) cpu = (await cdp.send('Profiler.stop')).profile;
  const heapProf = alloc ? (await cdp.send('HeapProfiler.stopSampling')).profile : null;
  const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  const res = await page.evaluate(() => {
    const g = window.__game, m = window.__perfBots; window.__perfBots = null;
    const f = m.frames.slice(1).sort((a, b) => a - b);
    let gcs = 0, alloc = 0;
    for (let i = 1; i < m.heap.length; i++) { const d = m.heap[i] - m.heap[i - 1]; if (d < -256 * 1024) gcs++; else if (d > 0) alloc += d; }
    const elapsed = (performance.now() - m.start) / 1000;
    return { elapsed, frames: f.length, rendered: (g._rafFrames || 0) - m.rendered0, f,
      longTasks: window.__longTasks.slice(), gcs, allocMBs: alloc / 1048576 / elapsed, spikes: m.spikes,
      programsNew: (g.renderer.info.programs?.length || 0) - m.prog0, programaPorQuadro: m.contas.programa / Math.max(1, m.draw.frames),
      stats: m.stats, draw: m.draw, actualBots: g.bots.length, alive: g.bots.filter(b => b.alive).length,
      quality: g.settings.quality, gpu: g.renderer.__csWebgl, state: g.state, map: g._mapId };
  });
  const f = res.f; delete res.f;
  Object.assign(res, { p50: pct(f, .5), p95: pct(f, .95), p99: pct(f, .99), max: f.at(-1), over33: f.filter(t => t > 33.4).length, over50: f.filter(t => t > 50).length,
    longTaskCount: res.longTasks.length, longTaskMs: res.longTasks.reduce((a, b) => a + b, 0), cpuRate });
  delete res.longTasks;
  const d = k => (m1[k] - m0[k]);
  res.cdp = { scriptS: d('ScriptDuration'), taskS: d('TaskDuration'), layoutS: d('LayoutDuration'), styleS: d('RecalcStyleDuration'), layouts: d('LayoutCount'), styles: d('RecalcStyleCount') };
  res.errors = errors.slice(0, 5);
  const name = `${tag}-${map}-${bots}`;
  if (cpu) { writeFileSync(`${out}/${name}.cpuprofile`, JSON.stringify(cpu)); res.top = resumoPerfil(cpu); }
  if (heapProf) res.allocTop = resumoAlloc(heapProf, res.elapsed);
  writeFileSync(`${out}/${name}.json`, JSON.stringify(res, null, 2));
  await context.close();
  return { name, res };
}

// Tempo próprio e inclusivo por função (url:linha), a partir das amostras do Profiler.
function resumoPerfil(p) {
  const byId = new Map(p.nodes.map(n => [n.id, n])), parent = new Map();
  for (const n of p.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const self = new Map(), incl = new Map(), dts = p.timeDeltas, total = (p.endTime - p.startTime) / 1000;
  const key = n => `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber + 1}`;
  for (let i = 0; i < p.samples.length; i++) {
    const dt = (dts[i + 1] ?? 0) / 1000, n = byId.get(p.samples[i]);
    self.set(key(n), (self.get(key(n)) || 0) + dt);
    const seen = new Set();
    for (let id = n.id; id != null; id = parent.get(id)) { const k = key(byId.get(id)); if (!seen.has(k)) { seen.add(k); incl.set(k, (incl.get(k) || 0) + dt); } }
  }
  const top = (m, k) => [...m].sort((a, b) => b[1] - a[1]).slice(0, k).map(([n, ms]) => [n, +ms.toFixed(1), +(ms / total * 100).toFixed(1)]);
  return { totalMs: total, self: top(self, 40), inclusive: top(incl, 60) };
}

// Bytes alocados: `folha` = função que alocou; `jogo` = quadro mais próximo fora do three (quem pediu).
function resumoAlloc(p, seconds) {
  const folha = new Map(), jogo = new Map();
  const nome = f => `${f.functionName || '(anon)'} ${f.url.split('/').pop().split('?')[0]}:${f.lineNumber + 1}`;
  const walk = (n, dono) => {
    const proprio = n.callFrame.url && !n.callFrame.url.includes('three.module') && !n.callFrame.url.includes('/vendor/') ? nome(n.callFrame) : dono;
    folha.set(nome(n.callFrame), (folha.get(nome(n.callFrame)) || 0) + n.selfSize);
    jogo.set(proprio, (jogo.get(proprio) || 0) + n.selfSize);
    for (const c of n.children || []) walk(c, proprio);
  };
  walk(p.head, '(root)');
  const top = m => [...m].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => [k, +(v / 1048576 / seconds).toFixed(2)]);
  return { folha: top(folha), jogo: top(jogo) };
}

const servidor = baseExterna ? null : spawn(process.execPath, ['tools/eval/serve.mjs', porta], { stdio: 'ignore' });
process.on('exit', () => servidor?.kill());
if (servidor) {
  let pronto = false;
  for (let i = 0; i < 120 && !pronto; i++) {
    try { pronto = (await fetch(base)).ok; } catch { /* subindo */ }
    if (!pronto) await new Promise(r => setTimeout(r, 500));
  }
  if (!pronto) throw new Error(`servidor não respondeu em ${base}`);
}

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio', '--enable-precise-memory-info'] });
const linhas = [];
try {
  if (mutante) console.log(`Mutação aplicada: ${mutante}`);
  for (const map of maps) for (const bots of counts) {
    const { name, res } = await medir(browser, map, bots);
    linhas.push(res);
    console.log(JSON.stringify({ name, cpu: cpuRate, bots: res.actualBots, p50: +res.p50.toFixed(1), p95: +res.p95.toFixed(1), p99: +res.p99.toFixed(1), max: +res.max.toFixed(1),
      longTasks: res.longTaskCount, gcs: res.gcs, allocMBs: +res.allocMBs.toFixed(1), programa: +res.programaPorQuadro.toFixed(1), drawCalls: Math.round(res.draw.calls / Math.max(1, res.draw.frames)),
      updMs: +(res.stats.update.ms / res.stats.update.calls).toFixed(2), botMsFrame: +(res.stats._updateBot.ms / Math.max(1, res.stats.update.calls)).toFixed(2),
      gpu: res.gpu?.renderer?.slice?.(0, 40), progs: res.programsNew, spikes: res.spikes.length, errors: res.errors.length }));
  }
} finally { await browser.close(); }

if (!medirMatriz) {
  /* Orçamento derivado das medições de 08/11 nesta régua (Flávio, 12 bots, CPU 4×, 1280×720):
     antes p95 533 ms e 126 consultas de programa/quadro; depois ver o veredito abaixo. */
  const ORCAMENTO_P95_MS = Number(option('teto-p95', '100'));
  const ORCAMENTO_PROGRAMA = 40;
  const r = linhas[0];
  const falhas = [];
  if (r.actualBots < 12) falhas.push(`partida com ${r.actualBots} bots (esperado ≥ 12)`);
  if (r.gpu?.software === true || r.gpu?.api !== 'webgl2') falhas.push(`GPU não representativa: ${JSON.stringify(r.gpu)}`);
  if (r.errors.length) falhas.push(`erros de página: ${r.errors.join(' | ')}`);
  if (r.frames < seconds * 5) falhas.push(`amostra curta: ${r.frames} quadros`);
  if (r.p95 > ORCAMENTO_P95_MS) falhas.push(`p95 ${r.p95.toFixed(1)} ms > ${ORCAMENTO_P95_MS} ms`);
  if (r.programaPorQuadro > ORCAMENTO_PROGRAMA) falhas.push(`${r.programaPorQuadro.toFixed(1)} consultas de programa por quadro > ${ORCAMENTO_PROGRAMA}`);
  console.log(`Flávio · ${r.actualBots} bots · CPU ${cpuRate}× · p50 ${r.p50.toFixed(1)} · p95 ${r.p95.toFixed(1)} · p99 ${r.p99.toFixed(1)} ms · long tasks ${r.longTaskCount} · programa/quadro ${r.programaPorQuadro.toFixed(1)}`);
  for (const f of falhas) console.log(`✗ ${f}`);
  console.log(falhas.length ? `FALHA · ${falhas.length} cobrança(s)` : 'PASSA');
  process.exit(falhas.length ? 1 : 0);
}
