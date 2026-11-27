import { setTimeout as sleep } from 'node:timers/promises';

// The test owns only this tab, never the signed-in browser or other tabs.
export async function abrirOperacaoEgo(api, { base, errors, failed, glbs }) {
  const { id, label } = api.target;
  if (!Number.isSafeInteger(id) || id < 1 || !/^p\d+$/.test(label)) throw Error('EGO_TASK_SPACE/EGO_PAGE inválidos');
  const space = (await api.listTaskSpaces()).find(s => s.id === id);
  if (space?.ownership !== 'agent' || !['rubenmarcus.dev', 'ruben marcus'].includes(space.profileName?.toLowerCase())) {
    throw Error('TaskSpace Ego deve pertencer ao agente no perfil CORO SOLTO');
  }
  const task = await api.taskSpace(id);
  const tab = (await task.tabs()).find(t => t.label === label);
  if (tab?.openedBy !== 'agent' || !['about:blank', 'chrome://newtab/'].includes(tab.url)) {
    throw Error('Use uma página vazia aberta pelo agente nesta tarefa');
  }
  const page = task.page(label);
  const domains = [];
  let pumping = false, metrics = false, init = null, loop = null, eventError = null;
  async function enable(domain, params) {
    await page.cdp(`${domain}.enable`, params);
    domains.push(domain);
  }
  async function drain() {
    for (const { method, params } of await page.events()) {
      if (method === 'Runtime.exceptionThrown') {
        const d = params.exceptionDetails;
        errors.push(String(d.exception?.description || d.text));
      }
      if (method === 'Network.responseReceived') {
        const { status, url } = params.response;
        if (status >= 400) failed.push([status, url]);
        if (status === 200 && url.includes('.glb')) glbs.push(url);
      }
    }
  }
  async function close() {
    pumping = false;
    await loop;
    const failures = [];
    const attempt = async fn => { try { await fn(); } catch (e) { failures.push(e); } };
    if (eventError) failures.push(eventError);
    await attempt(drain);
    // Remove the fixture before leaving the served page and collect unload errors.
    if (init) await attempt(() => page.cdp('Page.removeScriptToEvaluateOnNewDocument', { identifier: init }));
    await attempt(() => page.goto('about:blank'));
    await attempt(drain);
    if (domains.includes('Network')) await attempt(() => page.cdp('Network.setCacheDisabled', { cacheDisabled: false }));
    for (const domain of domains.reverse()) await attempt(() => page.cdp(`${domain}.disable`));
    if (metrics) await attempt(() => page.cdp('Emulation.clearDeviceMetricsOverride'));
    if (failures.length) throw new AggregateError(failures, `falha ao encerrar transporte Ego: ${failures.map(e => e.message).join('; ')}`);
  }
  try {
    await page.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    metrics = true;
    await enable('Runtime');
    await enable('Network');
    await page.cdp('Storage.clearDataForOrigin', { origin: base, storageTypes: 'local_storage,session_storage,indexeddb,cache_storage,service_workers' });
    await page.cdp('Network.setCacheDisabled', { cacheDisabled: true });
    await page.events();
    pumping = true;
    loop = (async () => {
      try { while (pumping) { await drain(); await sleep(35); } }
      catch (e) { eventError = e; }
    })();
    return { close, page: {
      async addInitScript(fn) {
        ({ identifier: init } = await page.cdp('Page.addScriptToEvaluateOnNewDocument', { source: `(${fn.toString()})()` }));
      },
      async addStyleTag({ content }) {
        await page.evaluate(css => {
          const style = document.createElement('style');
          style.textContent = css;
          document.head.append(style);
        }, content);
      },
      goto: (...args) => page.goto(...args),
      waitForFunction: (...args) => page.waitForFunction(...args),
      waitForTimeout: (...args) => page.waitForTimeout(...args),
      evaluate: (...args) => page.evaluate(...args),
      screenshot: (...args) => page.screenshot(...args),
    } };
  } catch (primary) {
    try { await close(); } catch (cleanup) { throw new AggregateError([primary, cleanup], `${primary.message}; ${cleanup.message}`); }
    throw primary;
  }
}
