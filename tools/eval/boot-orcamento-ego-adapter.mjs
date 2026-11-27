const OWN_PROFILES = new Set(['rubenmarcus.dev', 'ruben marcus']);
const isBlank = (url) => ['about:blank', 'chrome://newtab/'].includes(url);
const resourceType = (type) => String(type || 'other').toLowerCase();

class EgoRequest {
  constructor(event) {
    this._event = event;
    this._failure = null;
  }
  url() { return this._event.params.request.url; }
  method() { return this._event.params.request.method; }
  resourceType() { return resourceType(this._event.params.type); }
  failure() { return this._failure; }
}

class EgoResponse {
  constructor(page, request, event) {
    this._page = page;
    this._request = request;
    this._event = event;
    this._body = null;
  }
  request() { return this._request; }
  url() { return this._event.params.response.url; }
  status() { return this._event.params.response.status; }
  headers() {
    const headers = this._event.params.response.headers || {};
    return Object.fromEntries(Object.entries(headers).map(([name, value]) => [String(name).toLowerCase(), value]));
  }
  async body() {
    this._body ||= this._page.bodyFor(this._request._event.params.requestId);
    return this._body;
  }
  async text() { return (await this.body()).toString('utf8'); }
}

class EgoFrame {
  constructor(page, frameId) { this._page = page; this._frameId = frameId; }
  url() { return this._page._frameUrls.get(this._frameId) || ''; }
}

class EgoConsoleMessage {
  constructor(event) { this._event = event; }
  type() { return String(this._event.params.type || 'log'); }
  text() { return (this._event.params.args || []).map((arg) => arg.value ?? arg.description ?? '').join(' '); }
}

class EgoCDP {
  constructor(page) { this._page = page; this._listeners = new Map(); }
  on(method, listener) { const rows = this._listeners.get(method) || []; rows.push(listener); this._listeners.set(method, rows); }
  off(method, listener) { const rows = this._listeners.get(method) || []; const index = rows.indexOf(listener); if (index >= 0) rows.splice(index, 1); }
  async send(method, params = {}) {
    const effective = method === 'Network.enable'
      ? { maxTotalBufferSize: 64 * 1024 * 1024, maxResourceBufferSize: 8 * 1024 * 1024, ...params }
      : params;
    const value = await this._page._raw.cdp(method, effective);
    if (method === 'Runtime.evaluate') await this._page.drain();
    return value;
  }
  dispatch(event) { for (const listener of this._listeners.get(event.method) || []) listener(event.params || {}); }
}

class EgoPage {
  constructor(raw) {
    this._raw = raw;
    this._listeners = new Map();
    this._requests = new Map();
    this._finished = new Map();
    this._bodyPromises = new Map();
    this._frameUrls = new Map();
    this._mainFrame = new EgoFrame(this, 'main');
    this._cdps = new Set();
    this._transportError = null;
    this._batch = null;
    this._closed = false;
    this._pumping = true;
    this._pumpPromise = this._pump().catch(error => { this._transportError = error; });
  }
  on(event, listener) { const rows = this._listeners.get(event) || []; rows.push(listener); this._listeners.set(event, rows); }
  off(event, listener) { const rows = this._listeners.get(event) || []; const index = rows.indexOf(listener); if (index >= 0) rows.splice(index, 1); }
  _emit(event, value) { for (const listener of this._listeners.get(event) || []) listener(value); }
  _readBatch() {
    if (this._transportError) throw this._transportError;
    if (!this._batch) {
      this._batch = this._raw.events().then(events => {
        for (const event of events) this._dispatch(event);
      }).finally(() => { this._batch = null; });
    }
    return this._batch;
  }
  async _pump() {
    while (this._pumping) {
      await this._readBatch();
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  _dispatch(event) {
    const params = event.params || {};
    for (const cdp of this._cdps) cdp.dispatch(event);
    if (event.method === 'Page.frameNavigated') {
      const frameId = params.frame?.id || 'main';
      const frameUrl = params.frame?.url || '';
      const frame = params.frame?.parentId ? new EgoFrame(this, frameId) : this._mainFrame;
      this._frameUrls.set(frameId, frameUrl);
      if (!params.frame?.parentId) this._frameUrls.set('main', frameUrl);
      this._emit('framenavigated', frame);
      return;
    }
    if (event.method === 'Runtime.consoleAPICalled') {
      this._emit('console', new EgoConsoleMessage(event));
      return;
    }
    if (event.method === 'Runtime.exceptionThrown') {
      const details = params.exceptionDetails || {};
      const error = new Error(details.exception?.description || details.text || 'Runtime exception');
      error.name = details.exception?.className || 'Error';
      this._emit('pageerror', error);
      return;
    }
    if (event.method === 'Network.requestWillBeSent' && params.request) {
      const request = new EgoRequest(event);
      if (!this._requests.has(params.requestId)) {
        this._requests.set(params.requestId, request);
        this._emit('request', request);
      }
      return;
    }
    const request = this._requests.get(params.requestId);
    if (!request) return;
    if (event.method === 'Network.responseReceived' && params.response) {
      const response = new EgoResponse(this, request, event);
      this._emit('response', response);
      return;
    }
    if (event.method === 'Network.loadingFinished') {
      this._finished.set(params.requestId, event);
      return;
    }
    if (event.method === 'Network.loadingFailed') {
      request._failure = { errorText: params.errorText || 'loadingFailed' };
      this._finished.set(params.requestId, event);
      this._emit('requestfailed', request);
    }
  }
  async bodyFor(requestId) {
    if (this._bodyPromises.has(requestId)) return this._bodyPromises.get(requestId);
    const promise = (async () => {
      const deadline = Date.now() + 30000;
      while (!this._finished.has(requestId) && Date.now() < deadline) await this._raw.waitForTimeout(5);
      if (!this._finished.has(requestId)) throw Error('Network.getResponseBody antes de loadingFinished: ' + requestId);
      const finished = this._finished.get(requestId);
      if (finished.method === 'Network.loadingFailed') throw Error('corpo indisponível após loadingFailed: ' + requestId);
      const result = await this._raw.cdp('Network.getResponseBody', { requestId });
      return Buffer.from(result.body, result.base64Encoded ? 'base64' : 'utf8');
    })();
    this._bodyPromises.set(requestId, promise);
    return promise;
  }
  async drain() {
    await this._batch;
    await this._readBatch();
    if (this._transportError) throw this._transportError;
  }
  async goto(url, options) {
    const dest = new URL(url);
    if (dest.protocol !== 'http:' || dest.hostname !== '127.0.0.1' || !dest.port || dest.username || dest.password) {
      throw Error('Boot Ego só pode navegar para sua fixture loopback');
    }
    return this._raw.goto(url, options);
  }
  async waitForFunction(fn, arg, options) {
    await this._raw.waitForFunction(fn, arg ?? null, options);
    return { jsonValue: () => this.evaluate(fn, arg) };
  }
  async waitForTimeout(ms) { return this._raw.waitForTimeout(ms); }
  async evaluate(fn, arg) { const value = await this._raw.evaluate(fn, arg ?? null); await this.drain(); return value; }
  isClosed() { return this._closed; }
  async close() { if (!this._closed) { this._closed = true; this._pumping = false; await this._pumpPromise; } }
  mainFrame() { return this._mainFrame; }
  async newCDPSession() { const cdp = new EgoCDP(this); this._cdps.add(cdp); return cdp; }
}

class EgoContext {
  constructor(page) { this._page = page; this._scripts = []; this._closed = false; }
  async addInitScript(fn) {
    const source = `(${fn.toString()})();`;
    const result = await this._page._raw.cdp('Page.addScriptToEvaluateOnNewDocument', { source });
    this._scripts.push(result.identifier);
  }
  async newPage() { return this._page; }
  async newCDPSession(page) { return page.newCDPSession(); }
  async close() {
    if (this._closed) return;
    this._closed = true;
    for (const identifier of this._scripts.splice(0)) await this._page._raw.cdp('Page.removeScriptToEvaluateOnNewDocument', { identifier }).catch(() => {});
    await this._page.close();
    await this._page._raw.cdp('Network.disable');
    await this._page._raw.goto('about:blank', { waitUntil: 'commit', timeout: 30000 });
    await this._page._raw.cdp('Emulation.clearDeviceMetricsOverride');
    await this._page._raw.cdp('Emulation.setAutomationOverride', { enabled: false });
    if (this._page._transportError) throw this._page._transportError;
  }
}

export async function createEgoBrowser(config) {
  if (!Number.isSafeInteger(config.space) || config.space <= 0 || !/^p\d+$/.test(config.page)) throw Error('Ego config TaskSpace/Page inválido');
  const spaces = await listTaskSpaces();
  const space = spaces.find((item) => item.id === config.space);
  if (!space || space.ownership !== 'agent' || !OWN_PROFILES.has(String(space.profileName || '').toLowerCase())) throw Error('TaskSpace Ego deve pertencer ao agente no perfil CORO SOLTO');
  const task = await taskSpace(config.space);
  const tabs = await task.tabs();
  const tab = tabs.find((item) => item.label === config.page);
  if (!tab || tab.openedBy !== 'agent' || !isBlank(tab.url)) throw Error('EGO_PAGE deve ser uma página vazia aberta pelo agente');
  const raw = task.page(config.page);
  await raw.cdp('egoAutomated.disable');
  await raw.cdp('Runtime.enable');
  await raw.cdp('Page.enable');
  let context;
  return {
    async newContext({ viewport, deviceScaleFactor }) {
      if (context && !context._closed) throw Error('Ego boot precisa de contextos serializados');
      await raw.cdp('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor, mobile: false });
      // Playwright Chromium exposes navigator.webdriver on test pages. Preserve
      // that signal so aggregate metrics don't POST during the read-only gate.
      await raw.cdp('Emulation.setAutomationOverride', { enabled: true });
      await raw.events();
      context = new EgoContext(new EgoPage(raw));
      return context;
    },
    async close() { await context?.close(); },
  };
}
