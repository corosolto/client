#!/usr/bin/env node
/* Régua do lobby Flávio no navegador Ego do dono. O launcher oficial escolhe este
   caminho somente quando EGO_TASK_SPACE está presente; sem ele, Playwright fica intacto. */
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { MUT, TELAS, TOQUE, escapeFailures, idiomaVerdict, inspectLobbyDOM, inspectModalDOM, jogarVerdict, lobbyFailures, modalFailures, telaVerdicts } from './lobby-flavio-common.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:9428';
const BASE_URL = new URL(BASE);
const OUT = resolve(process.env.OUT || 'runs/lobby-flavio-ego');
const EGO_TASK_SPACE = Number(process.env.EGO_TASK_SPACE);
const EGO_PAGE = process.env.EGO_PAGE || 'p2';
const ownProfile = (name) => ['rubenmarcus.dev', 'ruben marcus'].includes(String(name || '').toLowerCase());


const isLoopback = (hostname) => ['127.0.0.1', 'localhost', '[::1]', '::1'].includes(hostname);
function validar() {
  if (!['http:', 'https:'].includes(BASE_URL.protocol) || BASE_URL.username || BASE_URL.password || BASE_URL.pathname !== '/' || !isLoopback(BASE_URL.hostname)) throw Error(`BASE deve ser origem loopback sem credenciais (${BASE})`);
  if (!Number.isSafeInteger(EGO_TASK_SPACE) || EGO_TASK_SPACE <= 0) throw Error('EGO_TASK_SPACE deve ser inteiro positivo');
  if (!/^p\d+$/.test(EGO_PAGE)) throw Error(`EGO_PAGE inválido (${EGO_PAGE}): use pN`);
  if (process.env.EGO_TASK_SPACE === undefined) throw Error('launcher Ego chamado sem EGO_TASK_SPACE');
}

let input = {
  id: EGO_TASK_SPACE,
  label: EGO_PAGE,
  base: new URL(BASE).origin,
  out: OUT,
};

const readRequestBody = (req) => new Promise((resolve, reject) => {
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => resolve(Buffer.concat(chunks)));
  req.on('error', reject);
});

async function fetchLoopback(url, options) {
  let target = url;
  for (let redirects = 0; ; redirects++) {
    const response = await fetch(target, { ...options, redirect: 'manual' });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get('location');
    if (!location) return response;
    target = new URL(location, target);
    if (target.origin !== BASE_URL.origin) throw Error(`redirect externo recusado: ${target.origin}`);
    if (redirects >= 3) throw Error('redirect loopback excedeu limite');
  }
}

async function abrirProxyMutante() {
  const errors = [];
  const receipts = [];
  let active = '';
  let boundHost = '';
  const server = createServer(async (req, res) => {
    try {
      const requestTarget = String(req.url || '');
      if (!requestTarget.startsWith('/') || requestTarget.startsWith('//') || req.headers.host !== boundHost) throw Error('request target/host fora da origem loopback configurada');
      const url = new URL(requestTarget, BASE_URL);
      if (url.origin !== BASE_URL.origin) throw Error(`origem upstream inesperada: ${url.origin}`);
      const requested = url.searchParams.get('__ego_mutante');
      if (requested) {
        if (!Object.hasOwn(MUT, requested)) throw Error(`mutante desconhecido: ${requested}`);
        active = requested;
      }
      url.searchParams.delete('__ego_mutante');
      const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await readRequestBody(req);
      const requestHeaders = Object.fromEntries(Object.entries(req.headers).filter(([key]) => !['host', 'connection', 'keep-alive', 'transfer-encoding', 'cookie', 'authorization', 'proxy-authorization'].includes(key)));
      const upstream = await fetchLoopback(url, { method: req.method, headers: requestHeaders, body });
      const raw = Buffer.from(await upstream.arrayBuffer());
      let output = raw;
      const spec = MUT[active];
      const path = spec ? spec[0].source.replaceAll('\\', '') : '';
      const mutateThis = !!spec && url.pathname.includes(path);
      const headers = {};
      upstream.headers.forEach((value, key) => {
        if (!['content-length', 'content-encoding', 'transfer-encoding', 'connection', 'set-cookie', 'www-authenticate'].includes(key)) headers[key] = value;
      });
      if (mutateThis) {
        const before = raw.toString('utf8');
        const after = spec[1](before);
        if (after === before) throw Error(`mutante ${active} não aplicou em ${url.pathname}`);
        output = Buffer.from(after, 'utf8');
        headers['x-ego-mutated'] = '1';
        headers['x-ego-before-sha256'] = createHash('sha256').update(raw).digest('hex');
        headers['x-ego-after-sha256'] = createHash('sha256').update(output).digest('hex');
        receipts.push({ mutante: active, url: url.pathname, beforeSha256: headers['x-ego-before-sha256'], afterSha256: headers['x-ego-after-sha256'] });
      }
      headers['content-length'] = String(output.length);
      res.writeHead(upstream.status, headers);
      res.end(output);
    } catch (e) {
      errors.push(String(e?.message || e));
      res.writeHead(502, { 'content-type': 'text/plain' });
      res.end('Ego mutator proxy failed');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  boundHost = `127.0.0.1:${port}`;
  return { server, errors, receipts, base: `http://${boundHost}` };
}

function egoScript() {
  return `
const input = ${JSON.stringify(input)};
const mutantes = ${JSON.stringify(Object.fromEntries(Object.entries(MUT).map(([k, [re, fn, alvo, grupo]]) => [k, [re.source, alvo, grupo]])))};
const telasCfg = ${JSON.stringify(TELAS)};
const toqueMin = ${TOQUE};
const inspectLobbyDOM = ${inspectLobbyDOM.toString()};
const inspectModalDOM = ${inspectModalDOM.toString()};
const lobbyFailures = ${lobbyFailures.toString()};
const modalFailures = ${modalFailures.toString()};
const escapeFailures = ${escapeFailures.toString()};
const telaVerdicts = ${telaVerdicts.toString()};
const jogarVerdict = ${jogarVerdict.toString()};
const idiomaVerdict = ${idiomaVerdict.toString()};
const ownProfile = ${ownProfile.toString()};
const fs = await import('node:fs');
const page = (() => { let p; return async () => p ||= await (async () => {
  const spaces = await listTaskSpaces();
  const profile = spaces.find((s) => s.id === input.id);
  if (!profile || profile.ownership !== 'agent' || !ownProfile(profile.profileName)) throw Error('TaskSpace Ego deve pertencer ao agente no perfil CORO SOLTO');
  const task = await taskSpace(input.id);
  const tabs = await task.tabs();
  const tab = tabs.find((t) => t.label === input.label);
  if (!tab || tab.openedBy !== 'agent' || !['about:blank', 'chrome://newtab/'].includes(tab.url)) throw Error('EGO_PAGE deve ser uma página vazia aberta pelo agente nesta tarefa');
  const selected = task.page(input.label);
  await selected.cdp('egoAutomated.disable');
  await selected.cdp('Network.enable');
  await selected.cdp('Network.setCacheDisabled', { cacheDisabled: true });
  await selected.cdp('Runtime.enable');
  await selected.cdp('Page.enable');
  return selected;
})(); })();
const p = await page();
const base = input.base;
const original = {};
await p.goto(base + '/robots.txt', { waitUntil: 'domcontentloaded', timeout: 120000 });
for (const key of ['csbr-mode-ann-seen', 'cs-javaporcos-cidade-anuncio-v1', 'cs-passe-anuncio', 'cs_privacy']) original[key] = await p.evaluate((k) => localStorage.getItem(k), key);
const errors = [], pageErrors = [];
let mutations = 0;
const reqs = new Map();
const drain = async () => {
  for (const e of await p.events()) {
    const x = e.params || {};
    if (e.method === 'Network.requestWillBeSent' && x.request) reqs.set(x.requestId, x.request.url);
    if (e.method === 'Network.loadingFailed' && reqs.has(x.requestId)) errors.push('falhou: ' + reqs.get(x.requestId) + ' (' + x.errorText + ')');
    if (e.method === 'Network.responseReceived' && x.response) {
      const headers = Object.fromEntries(Object.entries(x.response.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
      if (headers['x-ego-mutated'] === '1') mutations++;
      if (x.response.status >= 400 && String(x.response.url).startsWith(base + '/')) errors.push(x.response.status + ': ' + x.response.url);
    }
    if (e.method === 'Runtime.exceptionThrown') {
      const d = x.exceptionDetails || {};
      const text = d.exception?.description || d.text || '?';
      if (!String(text).includes('chrome-extension://') || String(text).includes(base + '/')) pageErrors.push(String(text).split('\\n')[0].slice(0, 400));
    }
  }
};
const shot = async (path) => { const r = await p.cdp('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path, Buffer.from(r.data, 'base64'), { flag: 'wx' }); };
const setViewport = async (w, h, touch) => {
  await p.cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: touch ? 2 : 1, mobile: !!touch });
  await p.cdp('Emulation.setTouchEmulationEnabled', touch ? { enabled: true, maxTouchPoints: 1 } : { enabled: false });
};
const inputTap = async (x, y, touch) => {
  if (touch) {
    await p.cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    await p.cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await p.cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await p.cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  }
};
const goto = async (url, mutante = '') => {
  const before = mutations;
  const target = new URL(url);
  if (mutante) target.searchParams.set('__ego_mutante', mutante);
  await p.goto(target.href, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await drain();
  return before;
};
const preparar = async () => {
  await p.evaluate(() => {
    localStorage.setItem('csbr-mode-ann-seen', JSON.stringify(['operacao_flavio']));
    localStorage.setItem('cs-javaporcos-cidade-anuncio-v1', '1');
    localStorage.setItem('cs-passe-anuncio', 'sessao-da-treta-s1/1');
    localStorage.setItem('cs_privacy', JSON.stringify({version:'corosolto-analytics-v1',analytics:false,updatedAt:new Date(0).toISOString()}));
  });
};
const lobby = async ({ w, h, touch = false, lang = 'pt', mutante = '' }) => {
  await setViewport(w, h, touch);
  await preparar();
  const url = base + '/?lang=' + lang;
  const mutationBefore = await goto(url, mutante);
  await p.evaluate(() => { const s = document.createElement('style'); s.textContent = 'astro-dev-toolbar{display:none!important;pointer-events:none!important}'; document.head.appendChild(s); });
  await p.waitForFunction(() => !document.getElementById('tp-splash-jogar')?.disabled, null, { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(1500);
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => { const s = document.getElementById('boot-splash'); return !s || s.classList.contains('gone'); }, null, { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(2500);
  await drain();
  if (mutante && mutations - mutationBefore !== 1) throw Error('mutante ' + mutante + ' não foi aplicado exatamente uma vez nesta navegação (aplicado=' + (mutations - mutationBefore) + ')');
};
const abrirCard = async (touch) => {
  const b = await p.evaluate(() => {
    const e = document.getElementById('tp-lobby-flavio');
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  if (!b) return false;
  await p.evaluate(() => { document.activeElement?.blur(); document.getElementById('tp-lobby-flavio').addEventListener('mousedown', (e) => e.preventDefault(), { once: true }); });
  await inputTap(b.x + b.width / 2, b.y + b.height / 2, touch);
  return p.waitForFunction(() => document.querySelector('dialog[data-historia="operacao_flavio"]')?.open, null, { timeout: 8000 }).then(() => true, () => false);
};
const inspectLobby = () => p.evaluate(inspectLobbyDOM);
const inspectModal = () => p.evaluate(inspectModalDOM);
const telas = async (mutante, cap) => {
  const e1 = [], e2 = [], e3 = [], e6 = [];
  for (const [w, h, touch] of telasCfg) {
    const tag = w + 'x' + h;
    await lobby({ w, h, touch, mutante });
    if (cap) await shot(input.out + '/lobby-' + tag + '.png');
    const c = await inspectLobby();
    const l = lobbyFailures(c, tag, w, h, touch, toqueMin);
    e1.push(...l.e1); e6.push(...l.e6);
    if (!(await abrirCard(touch))) { e2.push(tag + ': o card não abre a história'); continue; }
    await p.waitForFunction(() => document.querySelector('dialog[data-historia] .cs-modes-bg')?.complete, null, { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(500);
    if (cap) await shot(input.out + '/historia-' + tag + '.png');
    e2.push(...modalFailures(await inspectModal(), tag));
    for (const key of ['Tab', 'Tab', 'Tab', 'Shift+Tab']) {
      await p.keyboard.press(key);
      if (!(await p.evaluate(() => { const a = document.activeElement; return !!a?.closest('dialog[data-historia]') || a === document.body; }))) { e2.push(tag + ': ' + key + ' levou o foco para fora do diálogo'); break; }
    }
    await p.keyboard.press('y'); await p.waitForTimeout(300);
    const gaveta = await p.evaluate(() => document.getElementById('tp-resenha')?.hasAttribute('data-aberta'));
    await p.keyboard.press('Escape'); await p.waitForTimeout(600);
    const s = await p.evaluate(() => ({ aberto: !!document.querySelector('dialog[open]'), foco: document.activeElement?.id || document.activeElement?.tagName }));
    e3.push(...escapeFailures(gaveta, s, tag));
  }
  return telaVerdicts(e1, e2, e3, e6, telasCfg.length);
};
const jogar = async (mutante, cap) => {
  await lobby({ w: 1536, h: 960, mutante });
  if (!(await abrirCard(false))) return [jogarVerdict(false, {})];
  await p.click('dialog[data-historia] [data-jogar]');
  const ok = await p.waitForFunction(() => window.__game?._mapId, null, { timeout: 120000 }).then(() => true, () => false);
  const r = await p.evaluate(() => ({ mapa: window.__game?._mapId, modal: !!document.querySelector('dialog[open]') }));
  if (cap) await shot(input.out + '/jogar-1536x960.png');
  return [jogarVerdict(ok, r)];
};
const idioma = async (mutante, cap) => {
  await lobby({ w: 1536, h: 960, lang: 'en', mutante });
  const rotulo = await p.evaluate(() => document.getElementById('tp-lobby-flavio')?.textContent || '');
  const abriu = await abrirCard(false);
  if (cap && abriu) { await p.waitForFunction(() => document.querySelector('dialog[data-historia] .cs-modes-bg')?.complete, null, { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(500); await shot(input.out + '/historia-en-1536x960.png'); }
  const t = abriu ? await p.evaluate(() => document.querySelector('dialog[data-historia]').innerText) : '';
  return [idiomaVerdict(rotulo, t, abriu)];
};
const grupos = { telas, jogar, idioma };
const useMutantes = ${JSON.stringify(process.argv.includes('--mutantes'))};
const runs = useMutantes ? Object.entries(mutantes).map(([m, [, alvo, grupo]]) => [m, alvo, grupo]) : [['', '', '']];
let exit = 0;
for (const [mut, alvo, grupo] of runs) {
  try {
    const checks = useMutantes ? await grupos[grupo](mut, false) : [...await telas('', true), ...await jogar('', true), ...await idioma('', true)];
    if (useMutantes) { const c = checks.find((x) => x.id === alvo); if (!c || c.ok) exit = 1; console.log((!c || c.ok ? 'CEGO  ' : 'MORDE ') + alvo + ' (' + mut + ')  ' + (c?.msg || 'veredito ausente')); }
    else { for (const c of checks) console.log((c.ok ? 'VERDE   ' : 'VERMELHO') + ' ' + c.id + '  ' + c.msg); if (checks.some((c) => !c.ok)) exit = 1; console.log('\\nlobby-flavio (Ego): ' + checks.filter((c) => c.ok).length + '/' + checks.length + ' (capturas em ' + input.out + ')'); }
  } catch (e) { console.error('Ego: execução sem veredito — ' + String(e?.message || e).split('\\n')[0]); exit = 1; }
}
for (const [key, value] of Object.entries(original)) await p.evaluate(([k, v]) => { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); }, [key, value]);
await p.cdp('Network.setCacheDisabled', { cacheDisabled: false });
await p.goto('about:blank');
await p.cdp('Emulation.clearDeviceMetricsOverride');
await p.cdp('Emulation.setTouchEmulationEnabled', { enabled: false });
await p.cdp('Network.disable');
await p.cdp('Runtime.disable');
await p.cdp('Page.disable');
// HTTP failures remain evidence; the official lobby verdict is LFB1–LFB6,
// not a network test. A script exception still invalidates Ego transport.
fs.writeFileSync(input.out + '/events-' + (useMutantes ? 'mutantes' : 'nominal') + '.json', JSON.stringify({ network: errors, pageErrors, mutations }, null, 2), { flag: 'wx' });
if (pageErrors.length) { console.error('Ego page exceptions: ' + pageErrors.join(' | ')); exit = 1; }
process.exit(exit);

`;
}
const MAX_OUTPUT = 32 * 1024 * 1024;
function runEgo(script) {
  return new Promise((resolve) => {
    const child = spawn('ego-browser', ['nodejs'], { stdio: ['pipe', 'pipe', 'pipe'] });
    const out = [], err = [];
    let outBytes = 0, errBytes = 0, failure = null, timer;
    const collect = (chunks, which) => (chunk) => {
      const bytes = chunk.byteLength;
      if (which === 'stdout') outBytes += bytes; else errBytes += bytes;
      if ((which === 'stdout' ? outBytes : errBytes) > MAX_OUTPUT) {
        failure ||= Error(`ego-browser ${which} excedeu ${MAX_OUTPUT} bytes`);
        child.kill('SIGTERM');
      } else chunks.push(chunk);
    };
    child.stdout.on('data', collect(out, 'stdout'));
    child.stderr.on('data', collect(err, 'stderr'));
    child.once('error', (e) => { failure ||= e; });
    timer = setTimeout(() => { failure ||= Error('ego-browser excedeu 1800 s'); child.kill('SIGTERM'); }, 1800000);
    child.once('close', (status, signal) => {
      clearTimeout(timer);
      resolve({ status, signal, error: failure, stdout: Buffer.concat(out).toString('utf8'), stderr: Buffer.concat(err).toString('utf8') });
    });
    child.stdin.end(script);
  });
}

validar();
if (!process.argv.includes('--mutantes')) mkdirSync(OUT, { recursive: false });
let proxy = null;
if (process.argv.includes('--mutantes')) {
  proxy = await abrirProxyMutante();
  input = { ...input, base: proxy.base };
}
const run = await runEgo(egoScript());
if (proxy) await new Promise((resolve) => proxy.server.close(resolve));
if (proxy) {
  writeFileSync(`${OUT}/ego-http-mutations.json`, JSON.stringify(proxy.receipts, null, 2), { flag: 'wx' });
  const expectedReceipts = Object.values(MUT).reduce((n, [, , , grupo]) => n + (grupo === 'telas' ? TELAS.length : 1), 0);
  if (proxy.receipts.length !== expectedReceipts || proxy.receipts.some((r) => !/^[a-f0-9]{64}$/.test(r.beforeSha256) || !/^[a-f0-9]{64}$/.test(r.afterSha256) || r.beforeSha256 === r.afterSha256)) {
    console.error(`Ego mutator proxy recibos incompletos/divergentes: ${proxy.receipts.length}/${expectedReceipts}`);
    process.exit(78);
  }
}
const output = `${run.stdout || ''}
${run.stderr || ''}`;
process.stdout.write(output);
if (proxy?.errors.length) {
  console.error(`Ego mutator proxy falhou: ${proxy.errors.join(' | ')}`);
  process.exit(78);
}
if (run.error || run.status !== 0) {
  console.error(`Ego reprovou (status ${run.status ?? run.signal}): ${run.error?.message || 'ver recibos/saída acima'}`);
  process.exit(78);
}
if (process.argv.includes('--mutantes')) {
  const expected = new Map(Object.entries(MUT).map(([name, [, , check]]) => [name, check]));
  const lines = output.split('\n').filter(line => /^(MORDE|CEGO)\s+/.test(line));
  const valid = lines.every(line => {
    const match = /^MORDE\s+(LFB[1-6])\s+\(([^)]+)\)(?:\s|$)/.exec(line);
    if (!match || expected.get(match[2]) !== match[1]) return false;
    expected.delete(match[2]);
    return true;
  });
  if (!valid || expected.size) {
    console.error(`Ego não devolveu uma rejeição no check previsto de cada mutante: faltam ${[...expected.keys()].join(', ')}; linhas: ${lines.join(' | ')}`);
    process.exit(78);
  }
} else if (!output.includes('lobby-flavio (Ego):')) {
  console.error('Ego não devolveu o veredito do lobby');
  process.exit(78);
}
process.exit(0);
