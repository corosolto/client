#!/usr/bin/env node
import { chromium } from 'playwright';
import { classifyProfile404s, parseGuestAuthJson, parseProfileErrorJson } from './expected-guest-profile.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const arg = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
};
const baseUrl = arg('--url', 'http://127.0.0.1:4321');
const out = arg('--out', 'artifacts/ui-regression');
const selected = new Set((arg('--scenes', 'home-3x2,home-16x9,hub-map,settings,character,victory,hud')).split(','));
const JSON_BYTE_LIMIT = 16 * 1024;
const baseOrigin = new URL(baseUrl).origin;
const createApiWatch = () => ({ inflight: new Set(), authPending: 0, profilePending: 0, timedOut: false, authObservations: [], authByRequest: new Map(), profileCandidates: [], identityRecords: null });
const track = (watch, work, onDone) => {
  const promise = (async () => { try { await work(); } catch { watch.timedOut = true; } finally { if (onDone) onDone(); } })();
  watch.inflight.add(promise);
  promise.catch(() => {}).finally(() => watch.inflight.delete(promise));
};
const BODY_READ_TIMEOUT_MS = 5_000;
const withTimeout = async (promise, ms) => {
  let timer;
  try {
    return await Promise.race([promise, new Promise((resolve) => { timer = setTimeout(() => resolve(null), ms); })]);
  } finally { clearTimeout(timer); }
};
const drainInflight = async (watch, deadline) => {
  while (watch.inflight.size > 0) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) { watch.timedOut = true; return false; }
    let timer;
    const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve(null), remaining); });
    try {
      const completed = await Promise.race([Promise.allSettled([...watch.inflight]).then(() => true), timeout]);
      if (completed !== true) { watch.timedOut = true; return false; }
    } finally { clearTimeout(timer); }
  }
  return true;
};
const isJsonResponse = (response) => /^application\/json(?:\s*;|\s*$)/i.test(response.headers()['content-type'] || '');
const isOversized = (response) => {
  const raw = response.headers()['content-length'];
  if (raw === undefined) return false;
  const bytes = Number(raw);
  return !/^\d+$/.test(raw) || !Number.isSafeInteger(bytes) || bytes > JSON_BYTE_LIMIT;
};
const readAuthObservation = async (watch, response) => {
  const fail = () => ({ status: response.status(), authenticated: false, profileAbsent: false, jsonValid: false });
  if (!isJsonResponse(response) || isOversized(response)) return fail();
  let buffer;
  try { buffer = await withTimeout(response.body(), BODY_READ_TIMEOUT_MS); } catch { return fail(); }
  if (!buffer) { watch.timedOut = true; return fail(); }
  if (buffer.byteLength > JSON_BYTE_LIMIT) return fail();
  return { status: response.status(), ...parseGuestAuthJson(buffer.toString('utf8')) };
};
const readProfileCandidate = async (watch, response, request) => {
  const url = new URL(response.url());
  const params = url.searchParams;
  const actions = params.getAll('action');
  const ids = params.getAll('id');
  const candidate = {
    sameOrigin: url.origin === baseOrigin,
    pathname: url.pathname,
    method: request.method(),
    action: actions.length === 1 ? actions[0] : '',
    status: response.status(),
    errorCode: '',
    jsonValid: false,
    requestedId: ids.length === 1 ? ids[0] : '',
    unambiguous: actions.length === 1 && ids.length === 1 && [...params.keys()].every((key) => key === 'action' || key === 'id'),
  };
  if (url.pathname !== '/api/social' || request.method() !== 'GET' || !candidate.unambiguous) return candidate;
  if (!isJsonResponse(response) || isOversized(response)) return candidate;
  let buffer;
  try { buffer = await withTimeout(response.body(), BODY_READ_TIMEOUT_MS); } catch { return candidate; }
  if (!buffer) { watch.timedOut = true; return candidate; }
  if (buffer.byteLength > JSON_BYTE_LIMIT) return candidate;
  const parsed = parseProfileErrorJson(buffer.toString('utf8'));
  candidate.jsonValid = parsed.jsonValid;
  candidate.errorCode = parsed.errorCode;
  return candidate;
};
const scenes = [
  { name: 'home-3x2', size: [1200, 800], query: 'ui=legacy&tela=01&map=praca_poderes', screen: 'menu', ready: '#hub-ui', keys: ['#hub-ui', '.hub-header', '#map-preview', '#btn-jogar', '#hub-change-character', '.hub-footer'] },
  { name: 'home-16x9', size: [1280, 720], query: 'ui=legacy&tela=01&map=praca_poderes', screen: 'menu', ready: '#hub-ui', keys: ['#hub-ui', '.hub-header', '#map-preview', '#btn-jogar', '#hub-change-character', '.hub-footer'] },
  { name: 'hub-map', size: [1200, 800], query: 'ui=legacy&tela=01&map=praca_poderes', screen: 'menu', ready: '#hub-ui', keys: ['#hub-map-modal', '#hub-map-filters', '#hub-map-grid', '#hub-map-close'] },
  { name: 'settings', size: [1200, 800], query: 'ui=legacy&tela=07', screen: 'settings', ready: '#settings-panel', keys: ['#settings-panel', '.settings-wrap', '#set-quality', '#settings-back'] },
  { name: 'character', size: [1200, 800], query: 'ui=legacy&tela=personagem&time=E&char=mst', screen: 'character', ready: '#char-select', keys: ['#char-select', '#char-info-name', '#char-confirm', '#char-list', '#char-preview', '#char-preview-static'] },
  { name: 'victory', size: [1200, 800], query: 'ui=legacy&tela=vitoria&time=E&char=mst', screen: 'victory', ready: '#match-end.win', keys: ['#match-end', '#match-title', '#match-stats', '#me-hero'] },
  { name: 'hud', size: [1200, 800], query: 'ui=legacy&tela=hud&vmlab=1&map=praca_poderes&time=E&char=mst', screen: 'hud', ready: '#hud', keys: ['#hud', '#hud-top', '#crosshair', '#hp-num', '#hud-bottom-right', '#weapon-hud'] },
].filter((scene) => selected.has(scene.name));

await mkdir(out, { recursive: true });
const manifest = { version: 1, source: baseUrl, capturedAt: new Date().toISOString(), scenes: {} };
for (const scene of scenes) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const result = { viewport: scene.size, errors: [], assets404: [], expectedApiResponses: [], elements: {}, mediaReady: null, failed: null };
    const apiWatch = createApiWatch();
    manifest.scenes[scene.name] = result;
    let browser; let page;
    try {
      browser = await chromium.launch({
        headless: true,
        ...(process.env.UI_CHROME_BIN ? { executablePath: process.env.UI_CHROME_BIN } : {}),
        args: ['--mute-audio'],
      });
      page = await browser.newPage({ viewport: { width: scene.size[0], height: scene.size[1] }, deviceScaleFactor: 1 });
      page.on('pageerror', (error) => result.errors.push(String(error.message).slice(0, 300)));
      page.on('request', (request) => {
        try {
          const url = new URL(request.url());
          if (url.origin !== baseOrigin || request.method() !== 'GET' || url.pathname !== '/api/social-auth') return;
          if ([...url.searchParams.keys()].includes('action')) return;
          apiWatch.authPending += 1;
          apiWatch.authByRequest.set(request, { settled: false });
        } catch {}
      });
      page.on('requestfailed', (request) => {
        const record = apiWatch.authByRequest.get(request);
        if (!record || record.settled) return;
        record.settled = true;
        apiWatch.authPending = Math.max(0, apiWatch.authPending - 1);
        apiWatch.authObservations.push({ status: 0, authenticated: false, profileAbsent: false, jsonValid: false });
      });
      page.on('response', (response) => {
        let url;
        try { url = new URL(response.url()); } catch { return; }
        if (url.origin !== baseOrigin) return;
        const request = response.request();
        if (response.status() === 404) result.assets404.push(url.pathname);
        const authRecord = apiWatch.authByRequest.get(request);
        if (authRecord && !authRecord.settled && request.method() === 'GET' && url.pathname === '/api/social-auth') {
          authRecord.settled = true;
          apiWatch.authPending = Math.max(0, apiWatch.authPending - 1);
          track(apiWatch, () => readAuthObservation(apiWatch, response).then((observation) => apiWatch.authObservations.push(observation)));
          return;
        }
        if (response.status() !== 404) return;
        apiWatch.profilePending += 1;
        track(apiWatch, () => readProfileCandidate(apiWatch, response, request).then((candidate) => { apiWatch.profileCandidates.push(candidate); }), () => { apiWatch.profilePending = Math.max(0, apiWatch.profilePending - 1); });
      });
      await page.addInitScript(() => {
        let randomState = 0x4c534349;
        Math.random = () => {
          randomState ^= randomState << 13;
          randomState ^= randomState >>> 17;
          randomState ^= randomState << 5;
          return (randomState >>> 0) / 0x100000000;
        };
        localStorage.setItem('awpbr_nick', 'EMERSON');
        localStorage.setItem('cs_lang', 'pt');
        localStorage.setItem('cs_aviso_software', 'ok');
      });
      await page.goto(`${baseUrl}/?${scene.query}`, { waitUntil: 'commit', timeout: 45_000 });
      await page.waitForFunction((screen) => document.documentElement.dataset.inspectScreen === screen, scene.screen, { timeout: scene.name === 'hud' ? 180_000 : 90_000 });
      await page.locator(scene.ready).waitFor({ state: 'visible', timeout: 60_000 });
      if (scene.name === 'hub-map') {
        await page.locator('#hub-map-change').click();
        await page.locator('#hub-map-modal').waitFor({ state: 'visible', timeout: 20_000 });
      }
      if (scene.name === 'character') await page.getByRole('option', { name: 'Líder do MST' }).click();
      if (scene.name === 'hud') await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180_000 });
      if (scene.name.startsWith('home') || scene.name === 'character') {
        const media = (kind) => {
          const canvas = document.getElementById('char-preview');
          const image = document.getElementById('char-preview-static');
          const video = document.getElementById('char-preview-video');
          const character = canvas?.dataset.glb === '1'
            || (image && !image.classList.contains('hidden') && image.complete && image.naturalWidth > 0)
            || (video && !video.classList.contains('hidden') && video.readyState >= 2);
          const map = document.getElementById('map-thumb');
          return !!character && (kind === 'character' || (map?.complete && map.naturalWidth > 0));
        };
        await page.waitForFunction(media, scene.name === 'character' ? 'character' : 'home', { timeout: 60_000 }).catch(() => {});
        result.mediaReady = await page.evaluate(media, scene.name === 'character' ? 'character' : 'home');
      }
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);
      result.elements = await page.evaluate((keys) => Object.fromEntries(keys.map((selector) => {
        const element = document.querySelector(selector);
        if (!element) return [selector, { visible: false, missing: true }];
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const visible = box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        return [selector, { visible, rect: [box.x, box.y, box.width, box.height].map((v) => Math.round(v * 10) / 10), text: (element.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 100) }];
      })), scene.keys);
      const settle = async () => {
        const settleDeadline = Date.now() + 15_000;
        while ((apiWatch.authPending > 0 || apiWatch.profilePending > 0) && Date.now() < settleDeadline) {
          await drainInflight(apiWatch, settleDeadline);
          if (apiWatch.authPending > 0 || apiWatch.profilePending > 0) await page.waitForTimeout(250).catch(() => {});
        }
        await drainInflight(apiWatch, settleDeadline);
        if (apiWatch.authPending > 0 || apiWatch.profilePending > 0) apiWatch.timedOut = true;
      };
      await settle().catch(() => { apiWatch.timedOut = true; });
      await page.screenshot({ path: join(out, `${scene.name}.png`), animations: 'disabled', timeout: 45_000 });
      await page.addStyleTag({ content: `
        *,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;caret-color:transparent!important}
        #main-menu,#map-screen,#char-select,#match-end{background:#101014!important}
        .cs-wallpaper,.cs-vignette,.scanlines,.hub-character,#map-preview img,#char-preview,#char-preview-video,#char-preview-static,.ms-bg,#me-hero{visibility:hidden!important}
        #settings-panel{background:#101014!important;backdrop-filter:none!important}
        #hud{background:#101014!important}
        #radar,#round-time,#rounds-row,#round-banner{visibility:hidden!important}
        #hub-online-n,#hub-tip-text{visibility:hidden!important}
      ` });
      await page.screenshot({ path: join(out, `${scene.name}.stable.png`), animations: 'disabled', timeout: 45_000 });
      try {
        await settle().catch(() => { apiWatch.timedOut = true; });
        const socialCandidates = apiWatch.profileCandidates.filter((candidate) => candidate.pathname === '/api/social');
        const identities = new Map();
        for (const requestedId of new Set(socialCandidates.map((candidate) => candidate.requestedId))) {
          identities.set(requestedId, await page.evaluate((id) => {
            try {
              const anon = localStorage.getItem('cs_anon');
              const params = new URLSearchParams(location.search);
              return {
                ownGuestId: typeof anon === 'string' && anon.length > 0 && id === anon,
                explicitProfile: /^\/u\//i.test(location.pathname) || params.has('perfil') || Boolean(document.getElementById('community')?.dataset.profile),
              };
            } catch {
              return { ownGuestId: false, explicitProfile: true };
            }
          }, requestedId).catch(() => ({ ownGuestId: false, explicitProfile: true })));
        }
        apiWatch.identityRecords = socialCandidates.map((candidate) => {
          const identity = identities.get(candidate.requestedId) || { ownGuestId: false, explicitProfile: true };
          return {
            pathname: candidate.pathname,
            entry: {
              sameOrigin: candidate.sameOrigin,
              method: candidate.method,
              pathname: candidate.pathname,
              action: candidate.action,
              status: candidate.status,
              errorCode: candidate.errorCode,
              jsonValid: candidate.jsonValid,
              ownGuestId: identity.ownGuestId,
              explicitProfile: identity.explicitProfile,
            },
          };
        });
      } catch {
        apiWatch.timedOut = true;
      }
      result.attempts = attempt;
      break;
    } catch (error) {
      result.failed = String(error.message || error).replace(/\x1b\[[0-9;]*m/g, '').replace(/\s+/g, ' ').slice(0, 400);
      await page?.screenshot({ path: join(out, `${scene.name}.failure-${attempt}.png`), timeout: 10_000 }).catch(() => {});
      console.log(`${scene.name}: tentativa ${attempt} falhou: ${result.failed}`);
    } finally {
      await browser?.close().catch(() => {});
      await drainInflight(apiWatch, Date.now() + BODY_READ_TIMEOUT_MS);
      if (!result.failed && apiWatch.identityRecords) {
        const authState = {
          pending: (apiWatch.timedOut ? 1 : 0) + apiWatch.authPending + apiWatch.profilePending + apiWatch.inflight.size,
          observations: apiWatch.authObservations,
        };
        const classified = classifyProfile404s(apiWatch.identityRecords, result.assets404, authState);
        result.assets404 = classified.assets404;
        result.expectedApiResponses = classified.expected;
      }
      result.assets404 = [...new Set(result.assets404)].sort();
      if (!result.failed) {
        const expectedNote = result.expectedApiResponses.length ? `, ${result.expectedApiResponses.length} 404 de API esperados (visitante sem perfil)` : '';
        console.log(`${scene.name}: capturado na tentativa ${attempt} (${result.errors.length} erros JS, ${result.assets404.length} 404 locais${expectedNote})`);
      }
    }
  }
}
await writeFile(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
