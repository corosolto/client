import { spawnSync } from 'node:child_process';

// Reutiliza a página da missão; não cria nem encerra TaskSpace de outro agente.
export function capturarGrafiteEgo({ base, id, space, page = 'p2', block = '' }) {
  if (!Number.isSafeInteger(space) || space <= 0 || !/^p\d+$/.test(page)) throw Error('Ego exige space positivo e página existente pN');
  if (block && !/^[\w/.-]+(?:\\\.)[\w.-]+$/.test(block)) throw Error('Ego: GRAFITE_DERRUBA aceita um nome de arquivo literal com ponto escapado');
  const blocked = block ? ['*' + block.replaceAll('\\.', '.') + '*'] : [];
  const target = new URL('/mapview.html', base);
  target.searchParams.set('map', id); target.searchParams.set('grafite', 'vivo');
  const input = JSON.stringify({ space, page, url: target.href, base: new URL(base).origin, blocked });
  const script = `
const input = ${input};
const task = await taskSpace(input.space), page = task.page(input.page);
await page.cdp('egoAutomated.disable');
await page.cdp('Network.enable'); await page.cdp('Runtime.enable');
await page.cdp('Network.setCacheDisabled', { cacheDisabled: true });
await page.events();
await page.cdp('Network.setBlockedURLs', { urls: input.blocked });
let result;
try {
  await page.goto(input.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.MAPEVAL?.ready === true, undefined, { timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 60000 });
  result = await page.evaluate(() => ({ g: window.__grafite, actualMap: window.__mapId }));
  const events = await page.events(), requests = new Map(), faltas = [];
  for (const e of events) {
    const p = e.params || {};
    if (e.method === 'Network.requestWillBeSent' && p.request?.url?.startsWith(input.base + '/')) requests.set(p.requestId, p.request.url);
    if (e.method === 'Network.responseReceived' && p.response?.url?.startsWith(input.base + '/') && p.response.status >= 400) faltas.push(p.response.status + ': ' + p.response.url);
    if (e.method === 'Network.loadingFailed' && requests.has(p.requestId)) faltas.push('falhou: ' + requests.get(p.requestId) + ' (' + p.errorText + ')');
    if (e.method === 'Runtime.exceptionThrown') {
      const text = p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || '?';
      if (!text.includes('chrome-extension://') || text.includes(input.base + '/')) faltas.push('pageerror: ' + text.slice(0, 400));
    }
    if (e.method === 'Runtime.consoleAPICalled') {
      const text = (p.args || []).map(a => a.value || a.description || '').join(' ');
      if (/load failed/.test(text)) faltas.push('console: ' + text.slice(0, 400));
    }
  }
  result.faltas = [...new Set(faltas)];
} finally { await page.cdp('Network.setBlockedURLs', { urls: [] }); }
console.log('GRAFITE_RESULT=' + JSON.stringify(result));
`;
  const run = spawnSync(process.env.EGO_BROWSER_BIN || 'ego-browser', ['nodejs'], {
    input: script, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 240000,
  });
  if (run.error || run.status !== 0) throw Error(`Ego bake falhou: ${run.error?.message || (run.stderr || '').slice(-1200)}`);
  const output = run.stdout + '\n' + run.stderr;
  const line = output.split('\n').find(line => line.startsWith('GRAFITE_RESULT='));
  if (!line) throw Error('Ego não devolveu medição; layout preservado');
  return JSON.parse(line.slice('GRAFITE_RESULT='.length));
}
