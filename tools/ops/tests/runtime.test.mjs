/* public/js/ops.js num DOM stubado: os eventos que o navegador dispararia são
   simulados à mão e o snapshot tem de refletir cada um — sem browser, em ms. */
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function listeners() {
  const ls = {};
  return {
    ls,
    addEventListener(tipo, fn) { (ls[tipo] ||= []).push(fn); },
    removeEventListener() {},
    emit(tipo, ev) { for (const fn of ls[tipo] || []) fn(ev); },
  };
}

async function sobe({ comObserver = true } = {}) {
  const win = listeners();
  const doc = listeners();
  const raf = [];
  let agora = 0;
  const storage = {};
  Object.assign(doc, { hidden: false, getElementById: () => null, querySelector: () => null });
  globalThis.window = globalThis;
  globalThis.document = doc;
  globalThis.location = { href: 'http://jogo/', search: '', origin: 'http://jogo' };
  globalThis.performance = { now: () => agora };
  globalThis.localStorage = { getItem: (k) => storage[k] ?? null, setItem: (k, v) => { storage[k] = v; }, removeItem: (k) => { delete storage[k]; } };
  globalThis.requestAnimationFrame = (fn) => { raf.push(fn); return raf.length; };
  globalThis.addEventListener = win.addEventListener;
  globalThis.removeEventListener = win.removeEventListener;
  globalThis.URLSearchParams = URLSearchParams;
  let observador = null;
  if (comObserver) globalThis.PerformanceObserver = class { constructor(cb) { this.cb = cb; observador = this; } observe() {} emite(entradas) { this.cb({ getEntries: () => entradas }); } };
  else delete globalThis.PerformanceObserver;
  delete globalThis.__game; delete globalThis.__CS_MAIN_LOADED; delete globalThis.__CS_MAIN_READY__; delete globalThis.__CS_MAIN_FAILED; delete globalThis.__csbOps;
  const migalhas = [];
  globalThis.__migalha = (t) => migalhas.push(t);
  const mod = await import(`../../../public/js/ops.js?t=${Date.now()}${Math.random()}`);
  const pumpFrames = (n, dtMs) => { for (let i = 0; i < n; i++) { agora += dtMs; const fila = raf.splice(0); for (const fn of fila) fn(agora); } };
  return { mod, win, doc, migalhas, storage, avancar: (ms) => { agora += ms; }, pumpFrames, observador: () => observador };
}

test('boot: main_ready vira marco e fase menu; erros e promessas contam', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  try {
    const { mod, win, migalhas } = await sobe();
    globalThis.__CS_MAIN_LOADED = 1;
    mock.timers.tick(300);
    globalThis.__CS_MAIN_READY__ = true;
    mock.timers.tick(300);
    const s1 = mod.snapshot();
    assert.equal(s1.fase, 'menu');
    assert.ok(s1.marcos.main_loaded != null && s1.marcos.main_ready != null);
    assert.ok(migalhas.some((m) => /main pronto/.test(m)));
    win.emit('error', { message: 'ReferenceError: x is not defined' });
    win.emit('error', { target: { src: 'http://jogo/models/weapons/ak.glb', tagName: 'IMG' } });
    win.emit('unhandledrejection', {});
    const s2 = mod.snapshot();
    assert.equal(s2.erros.total, 1, 'só ErrorEvent com message conta como exceção');
    assert.equal(s2.erros.promessas, 1);
    assert.equal(s2.recursos.falhas.length, 1);
    assert.equal(s2.recursos.falhas[0].caminho, '/models/weapons/ak.glb');
    assert.equal(s2.recursos.falhas[0].status, 'erro');
  } finally { mock.timers.reset(); }
});

test('partida: live liga o FPS, travadas e congeladas contam, fim resume', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  try {
    const { mod, migalhas, pumpFrames, win } = await sobe();
    globalThis.__game = { state: 'countdown', _mapId: 'praca_poderes', ctf: false };
    mock.timers.tick(1000);
    globalThis.__game.state = 'live';
    mock.timers.tick(1000);
    let s = mod.snapshot();
    assert.equal(s.fase, 'partida');
    assert.equal(s.partida.mapa, 'praca_poderes');
    assert.equal(s.partida.modo, 'rounds');
    assert.equal(s.partida.inicios, 1);
    pumpFrames(1, 16);
    pumpFrames(60, 16);          // 1 s a 60 fps
    pumpFrames(1, 150);          // uma travada
    pumpFrames(1, 1200);         // um congelamento
    pumpFrames(32, 33);          // ~1 s a 30 fps
    s = mod.snapshot();
    assert.equal(s.fps.amostras, 3, `esperava 3 amostras (60 fps, 1 congelada, 30 fps), veio ${s.fps.amostras}`);
    assert.equal(s.fps.travadas, 2);
    assert.equal(s.fps.congeladas, 1);
    assert.ok(s.fps.p50 >= 30 && s.fps.p50 <= 33, `p50 fora do esperado: ${s.fps.p50}`);
    assert.equal(s.fps.min, 1, 'o segundo congelado entra como 1 fps');
    win.emit('error', { message: 'TypeError na partida' });
    globalThis.__game.state = 'matchEnd';
    mock.timers.tick(1000);
    s = mod.snapshot();
    assert.equal(s.fase, 'fim');
    assert.equal(s.partida.fins, 1);
    assert.equal(s.partida.erros, 1);
    assert.ok(migalhas.some((m) => /fps p50=/.test(m)), 'resumo de fps vira migalha');
    assert.ok(migalhas.some((m) => /congelou/.test(m)));
  } finally { mock.timers.reset(); }
});

test('recursos: PerformanceObserver com responseStatus ≥ 400 vira falha; contexto WebGL conta', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  try {
    const { mod, observador, win } = await sobe();
    observador().emite([
      { name: 'http://jogo/js/main.js?v=1', responseStatus: 200, initiatorType: 'script' },
      { name: 'http://jogo/models/props/opala.glb?v=1', responseStatus: 404, initiatorType: 'fetch' },
    ]);
    win.emit('webglcontextlost', {});
    win.emit('webglcontextrestored', {});
    const s = mod.snapshot();
    assert.equal(s.recursos.total, 2);
    assert.deepEqual(s.recursos.falhas.map((f) => [f.caminho, f.status]), [['/models/props/opala.glb', 404]]);
    assert.deepEqual(s.webgl, { perdidos: 1, restaurados: 1 });
    assert.match(mod.brief(), /gl=1/);
  } finally { mock.timers.reset(); }
});

test('abandono: esconder a aba grava a fase no storage e a próxima sessão lê', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  try {
    const a = await sobe();
    globalThis.__game = { state: 'live', _mapId: 'quebrada', ctf: true };
    mock.timers.tick(1000);
    a.doc.hidden = true;
    a.doc.emit('visibilitychange', {});
    const gravado = JSON.parse(a.storage.cs_ops_last);
    assert.equal(gravado.abandono.fase, 'partida');
    assert.equal(gravado.partida.modo, 'ctf');
    const b = await sobe();
    assert.equal(b.mod.snapshot().ultimaSessao, null, 'storage novo por sessão de teste');
    globalThis.localStorage.setItem('cs_ops_last', a.storage.cs_ops_last);
    assert.equal(b.mod.snapshot().ultimaSessao.abandono.fase, 'partida');
  } finally { mock.timers.reset(); }
});

test('sem PerformanceObserver o módulo sobe e ainda vê falha por evento', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  try {
    const { mod, win } = await sobe({ comObserver: false });
    win.emit('error', { target: { href: 'http://jogo/style.css', tagName: 'LINK' } });
    assert.equal(mod.snapshot().recursos.falhas.length, 1);
    assert.equal(typeof globalThis.__csbOps.snapshot, 'function');
  } finally { mock.timers.reset(); }
});

/* A chave do abandono é do ops.js e de mais ninguém: varre TODO o JS servido e todo o
   src/ (não uma lista de arquivos) — um `localStorage.clear()` novo em qualquer módulo
   apagaria a última sessão sem erro nenhum (LICOES §5). */
test('storage: cs_ops_last só existe no ops.js e nenhum módulo limpa o localStorage inteiro', () => {
  const raiz = fileURLToPath(new URL('../../../', import.meta.url));
  const arquivos = [];
  for (const dir of ['public/js', 'src']) {
    for (const f of readdirSync(`${raiz}${dir}`, { recursive: true })) {
      if (/\.(js|mjs|ts|astro)$/.test(String(f))) arquivos.push(`${dir}/${f}`);
    }
  }
  assert.ok(arquivos.includes('public/js/ops.js') && arquivos.includes('public/js/main.js'), 'a varredura não achou ops.js/main.js');
  const usam = arquivos.filter((a) => readFileSync(`${raiz}${a}`, 'utf8').includes('cs_ops_last'));
  assert.deepEqual(usam, ['public/js/ops.js'], `cs_ops_last aparece fora do ops.js: ${usam.join(', ')}`);
  const limpam = arquivos.filter((a) => /localStorage\.clear\s*\(/.test(readFileSync(`${raiz}${a}`, 'utf8')));
  assert.deepEqual(limpam, [], `localStorage.clear() em: ${limpam.join(', ')}`);
});

test('abandono: a ocultação da aba grava UMA vez por sessão; pagehide sempre regrava', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  try {
    const a = await sobe();
    let gravacoes = 0;
    const setItem = globalThis.localStorage.setItem;
    globalThis.localStorage.setItem = (k, v) => { gravacoes++; setItem(k, v); };
    a.doc.hidden = true; a.doc.emit('visibilitychange', {});
    a.doc.hidden = false; a.doc.emit('visibilitychange', {});
    a.doc.hidden = true; a.doc.emit('visibilitychange', {});
    assert.equal(gravacoes, 1, 'alternar a aba não pode regravar a cada ocultação');
    a.win.emit('pagehide', {});
    assert.equal(gravacoes, 2);
    assert.equal(JSON.parse(a.storage.cs_ops_last).abandono.motivo, 'pagehide');
  } finally { mock.timers.reset(); }
});

test('fps: matchEnd desliga a amostragem (placar e menu não entram); aba de volta não conta congelamento', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  try {
    const a = await sobe();
    globalThis.__game = { state: 'live', _mapId: 'quebrada', ctf: true };
    mock.timers.tick(1000);
    a.pumpFrames(70, 16);            // 1,12 s a 60 fps → 1 amostra
    assert.equal(a.mod.snapshot().fps.amostras, 1);
    // escondeu por 3 s e voltou (dentro da janela dt<5 s do passoFps): o primeiro frame NÃO é congelamento
    a.doc.hidden = true; a.doc.emit('visibilitychange', {});
    a.avancar(3000);
    a.doc.hidden = false; a.doc.emit('visibilitychange', {});
    a.pumpFrames(1, 16);
    a.pumpFrames(70, 16);
    const s1 = a.mod.snapshot();
    assert.equal(s1.fps.congeladas, 0, 'dt do tempo escondido virou congelamento');
    assert.equal(s1.fps.travadas, 0);
    globalThis.__game.state = 'matchEnd';
    mock.timers.tick(1000);
    const antes = a.mod.snapshot().fps.amostras;
    a.pumpFrames(120, 16);
    assert.equal(a.mod.snapshot().fps.amostras, antes, 'depois de matchEnd o placar/menu não podem entrar nas amostras "só em partida"');
  } finally { mock.timers.reset(); }
});

test('migalhas: o ops.js gasta no máximo 5 das 20 do coletor, mesmo com muitas falhas de carga', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  try {
    const a = await sobe();
    globalThis.__CS_MAIN_READY__ = true; mock.timers.tick(300);
    a.observador().emite(Array.from({ length: 12 }, (_, i) => ({ name: `http://jogo/img/decals/${i}.png`, responseStatus: 404, initiatorType: 'img' })));
    globalThis.__game = { state: 'live', _mapId: 'q', ctf: false }; mock.timers.tick(1000);
    for (let i = 0; i < 4; i++) a.pumpFrames(1, 1500);
    globalThis.__game.state = 'matchEnd'; mock.timers.tick(1000);
    assert.ok(a.migalhas.length <= 5, `ops.js mandou ${a.migalhas.length} migalhas: ${a.migalhas.join(' | ')}`);
    assert.equal(a.mod.snapshot().recursos.falhas.length, 12, 'o snapshot guarda tudo; só a migalha é racionada');
  } finally { mock.timers.reset(); }
});
