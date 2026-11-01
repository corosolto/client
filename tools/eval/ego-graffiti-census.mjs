import { spawnSync } from 'node:child_process';

// Censo real de grafite no navegador do dono (Ego), sem Playwright: interceptação de
// mutante é só CDP Fetch. Detalhes e limites: docs/visual-consistency/GRAFITE-CENSO.md.
const MUTANTES_CONHECIDOS = new Set(['', 'sem-layout-piscina', 'peca-no-ar', 'demais']);

export function censoEgo({ base, id, space, page = 'p2', mutante = '', censo, muta, pollMaxMs = 120000 }) {
  if (!/^https?:\/\//.test(String(base || ''))) throw Error(`Ego censo: BASE inválido (${base})`);
  if (!id || /[/?#]/.test(id)) throw Error(`Ego censo: id de mapa inválido (${id})`);
  if (!Number.isSafeInteger(space) || space <= 0) throw Error('Ego censo: EGO_TASK_SPACE deve ser inteiro positivo');
  if (!/^p\d+$/.test(page)) throw Error('Ego censo: EGO_PAGE deve ser uma página existente pN');
  if (!MUTANTES_CONHECIDOS.has(mutante)) throw Error(`Ego censo: mutante desconhecido (${mutante}) — distinto de detecção`);
  if (typeof censo !== 'string' || !/^async\s*\(/.test(censo.trim())) throw Error('Ego censo: fonte do CENSO ausente');
  if (typeof muta !== 'string') throw Error('Ego censo: fonte do mutador ausente');

  const target = new URL('/mapview.html', base);
  target.searchParams.set('map', id);
  const input = JSON.stringify({ space, page, url: target.href, base: new URL(base).origin, id, mutante, censo, muta, pollMaxMs });
  const script = `
const input = ${input};
const mutaFn = (id, mutante, layout) => (${muta})(id, mutante, layout);
const task = await taskSpace(input.space), page = task.page(input.page);
await page.cdp('egoAutomated.disable');
await page.cdp('Network.enable'); await page.cdp('Runtime.enable');
await page.cdp('Network.setCacheDisabled', { cacheDisabled: true });
await page.events();
let bodyB64 = null, armado = false;
if (input.mutante) {
  const resp = await fetch(input.base + '/js/graffiti_layout.js');
  if (!resp.ok) throw new Error('layout fonte respondeu ' + resp.status);
  const source = await resp.text();
  const enc = (source.match(/^export const GRAFITE = (.+);$/m) || [])[1];
  if (!enc) throw new Error('layout de grafite não reconhecido');
  const layout = JSON.parse(enc);
  if (mutaFn(input.id, input.mutante, layout)) {
    const novo = source.replace(/^export const GRAFITE = .+;$/m, 'export const GRAFITE = ' + JSON.stringify(layout) + ';');
    bodyB64 = Buffer.from(novo, 'utf8').toString('base64');
  }
}
/* Um único coletor para TODOS os eventos desde a navegação, inclusive os lotes do
   pump do Fetch: erro de asset durante o carregamento não pode escapar da prova. */
const erros = [], reqs = new Map(), ativos = new Map(); let movRede = Date.now();
const coletor = (e) => {
  const p = e.params || {};
  if (e.method === 'Network.requestWillBeSent' && p.request && String(p.request.url).startsWith(input.base + '/')) {
    reqs.set(p.requestId, p.request.url); ativos.set(p.requestId, p.request.url); movRede = Date.now();
  }
  if (e.method === 'Network.responseReceived' && p.response && String(p.response.url).startsWith(input.base + '/') && p.response.status >= 400)
    erros.push(p.response.status + ': ' + p.response.url);
  if (e.method === 'Network.loadingFailed' && reqs.has(p.requestId)) {
    erros.push('falhou: ' + reqs.get(p.requestId) + ' (' + p.errorText + ')'); ativos.delete(p.requestId); movRede = Date.now();
  }
  if (e.method === 'Network.loadingFinished' && reqs.has(p.requestId)) { ativos.delete(p.requestId); movRede = Date.now(); }
  if (e.method === 'Runtime.exceptionThrown') {
    const text = (p.exceptionDetails && p.exceptionDetails.exception && p.exceptionDetails.exception.description) || (p.exceptionDetails && p.exceptionDetails.text) || '?';
    if (!text.includes('chrome-extension://') || text.includes(input.base + '/')) erros.push('pageerror: ' + text.slice(0, 400));
  }
  if (e.method === 'Runtime.consoleAPICalled') {
    const text = (p.args || []).map((a) => a.value || a.description || '').join(' ');
    if (/load failed/.test(text)) erros.push('console: ' + text.slice(0, 400));
  }
};
let result;
try {
  if (bodyB64) {
    await page.cdp('Fetch.enable', { patterns: [{ urlPattern: '*graffiti_layout.js*', requestStage: 'Request' }] });
    armado = true;
  }
  let aplicado = 0;
  const navega = page.goto(input.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const prazo = Date.now() + 30000;
  while (armado && aplicado === 0 && Date.now() < prazo) {
    for (const e of await page.events()) {
      coletor(e);
      const p = e.params || {};
      if (e.method === 'Fetch.requestPaused') {
        if (String(p.request && p.request.url || '').includes('/js/graffiti_layout.js')) {
          await page.cdp('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200,
            responseHeaders: [{ name: 'content-type', value: 'text/javascript' }], body: bodyB64 });
          aplicado++;
        } else {
          await page.cdp('Fetch.failRequest', { requestId: p.requestId, errorText: 'BlockedByClient' });
        }
      }
    }
    if (aplicado === 0) await new Promise((r) => setTimeout(r, 200));
  }
  if (armado && aplicado === 0) throw new Error('mutante não aplicado: graffiti_layout.js não interceptado');
  await navega;
  await page.waitForFunction(() => window.MAPEVAL && window.MAPEVAL.ready === true, undefined, { timeout: 120000 });
  /* MAPEVAL.ready não é fim da carga (loaders seguem): exigir 1,5 s de silêncio de rede
     da BASE antes de medir; console irrelevante não renova a espera. */
  const prazoNet = Date.now() + 30000;
  let silencioMs = 0, silencioOk = false;
  while (Date.now() < prazoNet) {
    for (const e of await page.events()) coletor(e);
    if (ativos.size === 0 && Date.now() - movRede >= 1500) { silencioMs = Date.now() - movRede; silencioOk = true; break; }
    await new Promise((r) => setTimeout(r, 300));
  }
  if (!silencioOk) throw new Error('carga da BASE não silenciou em 30s (1,5 s de silêncio não alcançado) — pendentes: ' + [...ativos.values()].slice(0, 3).join(', '));
  const sonda = '(() => { if (!window.__censoJob) { window.__censoJob = (' + input.censo + ')()'
    + '.then((r) => { window.__censo = { ok: true, r }; }, (e) => { window.__censo = { ok: false, err: String((e && e.message) || e) }; }); }'
    + ' return window.__censo || { pendente: true }; })()';
  let job = { pendente: true };
  const fim = Date.now() + input.pollMaxMs;
  while (job.pendente && Date.now() < fim) {
    job = await page.evaluate(sonda);
    for (const e of await page.events()) coletor(e);
    if (job.pendente) await new Promise((r) => setTimeout(r, 1000));
  }
  if (job.pendente) throw new Error('censo não terminou em ' + input.pollMaxMs + 'ms');
  if (!job.ok) throw new Error('censo falhou na página: ' + job.err);
  const actualMap = await page.evaluate('window.__mapId');
  for (const e of await page.events()) coletor(e);
  result = { censo: job.r, actualMap, erros: [...new Set(erros)], mutanteAplicado: aplicado, silencioMs };
} finally {
  if (armado) await page.cdp('Fetch.disable');
}
console.log('CENSO_RESULT=' + JSON.stringify(result));
`;
  const run = spawnSync(process.env.EGO_BROWSER_BIN || 'ego-browser', ['nodejs'], {
    input: script, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 300000,
  });
  // ego-browser escreve console da página em stderr: o marcador pode vir em qualquer um.
  const output = (run.stdout || '') + '\n' + (run.stderr || '');
  if (run.error || run.status !== 0) throw Error(`Ego censo falhou: ${run.error?.message || output.slice(-1200)}`);
  const line = output.split('\n').find((l) => l.startsWith('CENSO_RESULT='));
  if (!line) throw Error('Ego censo não devolveu CENSO_RESULT (job sem prova, não é baseline válido)');
  const r = JSON.parse(line.slice('CENSO_RESULT='.length));
  if (r.actualMap !== id) throw Error(`Ego censo: mapa carregado (${r.actualMap}) difere do pedido (${id})`);
  if (r.erros && r.erros.length) throw Error('Ego censo: erros de página — ' + r.erros.slice(0, 5).join(' | '));
  const c = r.censo || {};
  for (const k of ['pecas', 'placas', 'pintadas']) {
    if (!Number.isInteger(c[k]) || c[k] < 0) throw Error(`Ego censo: contagem ${k} inválida (${c[k]}) — falha distinta de detecção`);
  }
  if (c.placas === 0 && c.waypoints === 0) throw Error('Ego censo: mapa sem waypoints nem placas — montagem suspeita');
  return c;
}
