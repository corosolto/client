#!/usr/bin/env node
/* Browser/DOM regression ruler for the 19/10/2026 user gauntlet. The document,
 * modules and CSS come from the local app; every API is a deterministic fixture and
 * every non-local request is blocked.
 *
 * Usage:
 *   BASE=http://127.0.0.1:4339 node tools/eval/user-gauntlet-web-check.mjs
 *   node tools/eval/user-gauntlet-web-check.mjs --mutantes
 *   node tools/eval/user-gauntlet-web-check.mjs --mutante=<name>
 *   node tools/eval/user-gauntlet-web-check.mjs --help
 *
 * Mutants: anon-bootstrap-hidden, anon-expired-hidden, ranking-url-stale,
 * ranking-back-empty, online-1024-hidden, online-390-hidden,
 * online-error-visible, footer-text, footer-rect, footer-unlabelled,
 * privacy-avatar-missing, privacy-checkbox-44, level-duplicate,
 * level-false-positive.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = new URL(process.env.BASE || 'http://127.0.0.1:4339');
const TIMEOUT = Number(process.env.GAUNTLET_TIMEOUT || 60_000);
const requestedMutant = process.argv.find((arg) => arg.startsWith('--mutante='))?.split('=')[1] || '';
const requestedOnly = process.argv.find((arg) => arg.startsWith('--only='))?.split('=')[1] || '';
if (requestedOnly && !/^WG(?:[1-9]|1[0-4])$/.test(requestedOnly)) throw new Error(`cláusula desconhecida: ${requestedOnly}`);
const runMutants = process.argv.includes('--mutantes');
const MUTANTS = Object.freeze({
  'anon-bootstrap-hidden': 'WG1',
  'anon-expired-hidden': 'WG2',
  'ranking-url-stale': 'WG3',
  'ranking-back-empty': 'WG4',
  'online-1024-hidden': 'WG5',
  'online-390-hidden': 'WG6',
  'online-error-visible': 'WG7',
  'footer-text': 'WG8',
  'footer-rect': 'WG9',
  'footer-unlabelled': 'WG10',
  'privacy-avatar-missing': 'WG11',
  'privacy-checkbox-44': 'WG12',
  'level-duplicate': 'WG13',
  'level-false-positive': 'WG14',
});

if (process.argv.includes('--help')) {
  console.log('Usage: BASE=http://127.0.0.1:4339 node tools/eval/user-gauntlet-web-check.mjs [--mutantes|--mutante=<name>]');
  console.log(`Mutants: ${Object.keys(MUTANTS).join(', ')}`);
  process.exit(0);
}
if (requestedMutant && !Object.hasOwn(MUTANTS, requestedMutant)) throw new Error(`mutante desconhecido: ${requestedMutant}`);
if (requestedMutant && runMutants) throw new Error('use --mutantes ou --mutante=<name>, não ambos');

const npmRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
const playwright = await import(pathToFileURL(`${npmRoot}/playwright/index.js`).href);
const chromium = playwright.chromium || playwright.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});

const PLAYER_ID = '19191919-1919-4919-8919-191919191919';
const OWNER_ID = '20202020-2020-4020-8020-202020202020';
const HANDLE = 'web_fixture';
const OWNER_HANDLE = 'owner_fixture';
const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const profile = (owner = false) => ({
  id: owner ? OWNER_ID : PLAYER_ID,
  handle: owner ? OWNER_HANDLE : HANDLE,
  public_handle: owner ? OWNER_HANDLE : HANDLE,
  url: `/u/${owner ? OWNER_HANDLE : HANDLE}`,
  nick: owner ? 'Dona Fixture' : 'Pessoa Fixture',
  visibility: 'public', activity_visible: true, source: 'server_verified', account_verified: false,
  avatar_url: owner ? PIXEL : null, bio: 'Perfil público da régua.',
  points: 2050, career_points: 2050, position: owner ? 3 : 7, kills: 20, deaths: 4, kd: 5,
  matches: 4, wins: 2, losses: 2, round_wins: 2, round_losses: 2, rounds: 4,
  level: 2, next_level_points: 1950, play_seconds: 600, verified_play_seconds: 600,
  settings: { profile: 'public', presence: 'friends', activity: 'public', share_character: true },
  socials: [], favorites: [{ map: 'Favela', mode: 'rounds', character: 'canarinho', faction: 'E', rounds: 2 }],
  history: [{ started_at: '2026-10-19T12:00:00.000Z', map: 'Favela', mode: 'rounds', kills: 5, deaths: 1, complete: true }],
  achievements: [], top_weapons: [], last_character: null,
});
const rankingPlayer = { ...profile(false), public_handle: HANDLE, left_points: 10, right_points: 4 };
const ownerState = {
  profile: profile(true), friends: [], notifications: [], invites: [], feed: [], blocks: [],
  live: [{ id: PLAYER_ID, nick: 'Pessoa Fixture', node: 'br', code: 'LIVE19', map: 'Favela', mode: 'rounds' }],
  messages_enabled: false,
};

const json = (route, value, status = 200) => route.fulfill({
  status, contentType: 'application/json; charset=utf-8', body: JSON.stringify(value),
});

async function installFixtures(context, scenario = {}) {
  const localOrigin = BASE.origin;
  let shellCount = 0;
  await context.addInitScript(({ stats }) => {
    localStorage.setItem('cs_lang', 'pt');
    localStorage.setItem('cs_treta_intro', '1');
    localStorage.setItem('awpbr_nick', 'REGUA');
    if (stats) localStorage.setItem('awpbr_stats', JSON.stringify(stats));
  }, { stats: scenario.stats || null });
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.resourceType() === 'document' && /^\/u\/[^/]+(?:\/privacidade)?\/?$/.test(url.pathname)) {
      const wanted = url.pathname.includes(OWNER_HANDLE) ? OWNER_ID : PLAYER_ID;
      const response = await fetch(new URL('/comunidade?fixture_shell=1', BASE));
      const original = await response.text();
      const body = original.replace(/(<section\s+id="community")/, `$1 data-profile="${wanted}"`);
      if (body === original) throw new Error('FIXTURE NÃO APLICOU: shell /u sem data-profile substituível');
      shellCount++;
      return route.fulfill({ status: response.status, contentType: 'text/html; charset=utf-8', body });
    }

    if (url.pathname === '/js/main.js') {
      const original = readFileSync(path.join(ROOT, 'public/js/main.js'), 'utf8');
      if (!original.includes('async function recordMatchStats(s)') || !original.includes('function playerXp(st)')) {
        throw new Error('FIXTURE NÃO APLICOU: hooks de nível mudaram de forma');
      }
      const body = `${original}\nwindow.__USER_GAUNTLET__={recordMatchStats,playerXp};\n`;
      return route.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body });
    }
    if (url.pathname === '/js/audio.js') {
      const original = readFileSync(path.join(ROOT, 'public/js/audio.js'), 'utf8');
      if (!original.includes('export class Sfx')) throw new Error('FIXTURE NÃO APLICOU: Sfx ausente');
      const body = `${original}\n{const f=Sfx.prototype.levelUp;if(typeof f==='function')Sfx.prototype.levelUp=function(...a){window.__gauntletLevelSounds=(window.__gauntletLevelSounds||0)+1;return f.apply(this,a)}}\n`;
      return route.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body });
    }

    if (url.pathname.startsWith('/api/')) {
      const action = url.searchParams.get('action') || '';
      let body = {};
      try { body = request.postDataJSON() || {}; } catch { /* fixture request without JSON */ }
      if (url.pathname === '/api/presence') return json(route, { ok: true });
      if (url.pathname === '/api/online') return scenario.onlineError
        ? json(route, { error: 'fixture_offline' }, 503) : json(route, { online: scenario.online ?? 7 });
      if (url.pathname === '/api/social-auth' && action === 'providers') return json(route, { providers: [], email: false, password: false });
      if (url.pathname === '/api/social-auth') {
        if (scenario.authMode === 'bootstrap-fail') return json(route, { error: 'social_unavailable' }, 503);
        if (scenario.authMode === 'owner' || scenario.authMode === 'session-expired') return json(route, { authenticated: true, profile: { id: OWNER_ID, nick: 'Dona Fixture' } });
        return json(route, { authenticated: false, profile: null });
      }
      if (url.pathname === '/api/social') {
        if (action === 'profile') {
          const id = url.searchParams.get('id');
          return json(route, { profile: profile(id === OWNER_ID || id === OWNER_HANDLE) });
        }
        if (action === 'ranking') {
          const team = url.searchParams.get('team');
          if (!['all', 'E', 'B'].includes(team)) return json(route, { players: [], total: 0, own: null });
          return json(route, { players: [{ ...rankingPlayer, points: team === 'E' ? 77 : rankingPlayer.points }], total: 1, own: null });
        }
        if (body.action === 'profile_view') return json(route, { views: 1 });
        if (scenario.authMode === 'session-expired' && request.method() === 'GET' && !action) return json(route, { error: 'session_expired' }, 401);
        if (scenario.authMode === 'owner' && request.method() === 'GET' && !action) return json(route, ownerState);
        return json(route, { ok: true });
      }
      if (url.pathname === '/api/leaderboard') return json(route, { players: [rankingPlayer] });
      return json(route, { error: 'fixture_unhandled', path: url.pathname }, 404);
    }

    if (url.origin !== localOrigin) return route.abort('blockedbyclient');
    return route.continue();
  });
  return () => shellCount;
}

async function openPage({ path = '/', viewport = { width: 1024, height: 768 }, scenario = {} } = {}) {
  const context = await browser.newContext({ viewport });
  const shellCount = await installFixtures(context, scenario);
  const page = await context.newPage();
  await page.goto(new URL(path, BASE).href, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
  await page.waitForSelector('#hub-ui:not([hidden])', { timeout: TIMEOUT });
  await page.evaluate(() => { for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close(); });
  return { context, page, shellCount };
}

const result = (id, name, ok, detail) => ({ id, name, ok: Boolean(ok), detail });
const visible = (node) => Boolean(node && node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden' && getComputedStyle(node).display !== 'none');

async function anonymousClause(id, authMode, mutant) {
  const { context, page, shellCount } = await openPage({ path: `/u/${HANDLE}`, scenario: { authMode } });
  try {
    await page.waitForFunction((nick) => [...document.querySelectorAll('#social-content > .tp-perfil, #social-content > .social-card')]
      .some((node) => node.textContent.includes(nick) && node.getClientRects().length && getComputedStyle(node).display !== 'none'), 'Pessoa Fixture', { timeout: 12_000 }).catch(() => {});
    await page.waitForFunction(() => { const text = document.getElementById('social-status')?.textContent.trim() || ''; return text && text !== 'Carregando a turma…'; }, null, { timeout: 12_000 }).catch(() => {});
    if (mutant === (authMode === 'bootstrap-fail' ? 'anon-bootstrap-hidden' : 'anon-expired-hidden')) {
      const applied = await page.evaluate(() => {
        const surfaces = [...document.querySelectorAll('#social-content > .tp-perfil, #social-content > .social-card')]
          .filter((node) => node.getClientRects().length && getComputedStyle(node).display !== 'none');
        for (const surface of [...document.querySelectorAll('#social-content > .tp-perfil, #social-content > .social-card')]) surface.remove();
        return surfaces.length > 0;
      });
      if (!applied) throw new Error(`MUTANTE NÃO APLICOU: ${mutant}`);
    }
    const measured = await page.evaluate(({ nick, handle }) => {
      const surface = [...document.querySelectorAll('#social-content > .tp-perfil, #social-content > .social-card')]
        .find((node) => node.getClientRects().length && getComputedStyle(node).display !== 'none' && node.textContent.includes(nick));
      return {
        shell: location.pathname === `/u/${handle}`,
        profile: Boolean(surface),
        publicActivity: Boolean(document.getElementById('social-content')?.textContent.includes('Favela')),
        retryOnly: document.getElementById('social-content')?.textContent.trim() === 'TENTAR DE NOVO',
      };
    }, { nick: 'Pessoa Fixture', handle: HANDLE });
    const ok = shellCount() === 1 && measured.shell && measured.profile && measured.publicActivity && !measured.retryOnly;
    return result(id, authMode === 'bootstrap-fail' ? 'perfil público anônimo sobrevive à falha do bootstrap da conta' : 'perfil público anônimo sobrevive à sessão expirada', ok,
      `shell=${shellCount()} perfil=${measured.profile} atividade=${measured.publicActivity} retryOnly=${measured.retryOnly} url=${measured.shell ? `/u/${HANDLE}` : page.url()}`);
  } finally { await context.close(); }
}

async function rankingClauses(mutant) {
  const { context, page } = await openPage({ path: '/comunidade/ranking', scenario: {} });
  try {
    const team = page.locator('#social-content select[data-ranking-filter="team"]');
    await team.waitFor({ timeout: TIMEOUT });
    const teamValues = await team.locator('option').evaluateAll((options) => options.map((option) => option.value));
    if (teamValues.join(',') !== 'all,E,B') throw new Error(`filtro de time inválido: ${teamValues.join(',')}`);
    await team.selectOption('E');
    await page.waitForFunction(() => [...document.querySelectorAll('#social-content .social-table tbody tr')].some((row) => row.textContent.includes('77')), null, { timeout: 12_000 });
    const link = page.locator(`#social-content .ranking-player a[href="/u/${HANDLE}"]`).first();
    await link.waitFor({ timeout: TIMEOUT });
    await link.click();
    await page.waitForFunction((nick) => document.getElementById('social-content')?.textContent.includes(nick), 'Pessoa Fixture', { timeout: 12_000 }).catch(() => {});
    if (mutant === 'ranking-url-stale') await page.evaluate(() => history.replaceState(history.state, '', '/comunidade/ranking'));
    const afterClick = await page.evaluate(({ handle, nick }) => ({
      path: location.pathname,
      profile: document.getElementById('social-content')?.textContent.includes(nick),
      canonical: location.pathname === `/u/${handle}` && !location.search,
    }), { handle: HANDLE, nick: 'Pessoa Fixture' });
    const clickResult = result('WG3', 'clique no ranking abre perfil e grava o handle canônico', afterClick.profile && afterClick.canonical,
      `perfil=${afterClick.profile} caminho=${afterClick.path}${await page.evaluate(() => location.search)}`);
    await page.goBack({ waitUntil: 'domcontentloaded', timeout: 15_000 }).catch(() => {});
    await page.waitForFunction(() => location.pathname === '/comunidade/ranking' && Boolean(document.querySelector('#social-content .social-table .ranking-player')), null, { timeout: 12_000 }).catch(() => {});
    if (mutant === 'ranking-back-empty') {
      const applied = await page.evaluate(() => { const table = document.querySelector('#social-content .social-table'); table?.remove(); return Boolean(table); });
      if (!applied) throw new Error('MUTANTE NÃO APLICOU: ranking-back-empty');
    }
    const afterBack = await page.evaluate(() => ({ path: location.pathname, ranking: Boolean(document.querySelector('#social-content .social-table .ranking-player')) }));
    const backResult = result('WG4', 'Back restaura a lista do ranking', afterBack.path === '/comunidade/ranking' && afterBack.ranking,
      `caminho=${afterBack.path} ranking=${afterBack.ranking}`);
    return [clickResult, backResult];
  } finally { await context.close(); }
}

async function onlineClause(id, width, mutant) {
  const error = id === 'WG7';
  const { context, page } = await openPage({ viewport: { width, height: width === 390 ? 844 : 768 }, scenario: { online: 7, onlineError: error } });
  try {
    if (!error) await page.waitForFunction(() => document.getElementById('hub-online-n')?.textContent === '7', null, { timeout: 12_000 }).catch(() => {});
    if (mutant === `online-${width}-hidden`) await page.addStyleTag({ content: '.hub-online{display:none!important}' });
    if (mutant === 'online-error-visible') await page.addStyleTag({ content: '.hub-online{display:flex!important}' });
    const measured = await page.evaluate(() => { const box = document.querySelector('.hub-online'); return { shown: Boolean(box && box.getClientRects().length && getComputedStyle(box).display !== 'none'), text: document.getElementById('hub-online-n')?.textContent || '' }; });
    const ok = error ? !measured.shown : measured.shown && measured.text === '7';
    return result(id, error ? 'contador do topo some quando a fonte falha' : `contador do topo mostra 7 em ${width}px`, ok,
      `visível=${measured.shown} texto="${measured.text}"`);
  } finally { await context.close(); }
}

async function footerClauses(mutant) {
  const { context, page } = await openPage({ viewport: { width: 390, height: 844 }, scenario: {} });
  try {
    await page.waitForSelector('#hub-footer-social .mf-social a', { timeout: TIMEOUT });
    if (mutant === 'footer-text') await page.evaluate(() => document.querySelector('#hub-footer-social .mf-social a')?.append(' INSTAGRAM'));
    if (mutant === 'footer-rect') await page.addStyleTag({ content: '#hub-footer-social .mf-social a:first-child{width:54px!important;height:28px!important}' });
    if (mutant === 'footer-unlabelled') await page.evaluate(() => document.querySelector('#hub-footer-social .mf-social a')?.removeAttribute('aria-label'));
    const links = await page.evaluate(() => [...document.querySelectorAll('#hub-footer-social .mf-social a')].map((a) => {
      const r = a.getBoundingClientRect();
      const ownText = [...a.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join('').trim();
      return { ownText, width: Math.round(r.width), height: Math.round(r.height), label: a.getAttribute('aria-label') || '', svg: Boolean(a.querySelector('svg')), shown: Boolean(a.getClientRects().length) };
    }));
    const all = links.length > 0 && links.every((link) => link.shown);
    return [
      result('WG8', 'redes do rodapé continuam somente ícones', all && links.every((link) => link.svg && !link.ownText), links.map((link) => `texto="${link.ownText}" svg=${link.svg}`).join('; ')),
      result('WG9', 'redes do rodapé continuam controles quadrados', all && links.every((link) => Math.abs(link.width - link.height) <= 1 && link.width >= 28), links.map((link) => `${link.width}x${link.height}`).join(', ')),
      result('WG10', 'redes do rodapé têm nome acessível', all && links.every((link) => link.label.trim().length > 0), links.map((link) => link.label || 'SEM NOME').join(', ')),
    ];
  } finally { await context.close(); }
}

async function privacyClauses(mutant) {
  const { context, page, shellCount } = await openPage({ path: `/u/${OWNER_HANDLE}/privacidade`, scenario: { authMode: 'owner' } });
  try {
    await page.waitForFunction(() => document.getElementById('social-content')?.textContent.includes('Seu perfil, suas regras.'), null, { timeout: 12_000 }).catch(() => {});
    if (mutant === 'privacy-avatar-missing') {
      const applied = await page.evaluate(() => { const image = document.querySelector('#social-content img.social-avatar'); image?.remove(); return Boolean(image); });
      if (!applied) throw new Error('MUTANTE NÃO APLICOU: privacy-avatar-missing');
    }
    if (mutant === 'privacy-checkbox-44') await page.addStyleTag({ content: '#social-content input[type=checkbox]{width:44px!important;height:44px!important}' });
    const measured = await page.evaluate((src) => {
      const image = [...document.querySelectorAll('#social-content img')].find((img) => img.src === src || img.getAttribute('src') === src);
      const label = [...document.querySelectorAll('#social-content label')].find((node) => /último personagem/i.test(node.textContent));
      const box = label?.querySelector('input[type=checkbox]');
      const r = box?.getBoundingClientRect();
      const style = box ? getComputedStyle(box) : null;
      return { avatar: Boolean(image && image.getClientRects().length), checked: box?.checked, width: r ? Math.round(r.width) : 0, height: r ? Math.round(r.height) : 0,
        css: style ? `${style.width}/${style.height}/${style.minHeight}/${style.maxHeight}/${style.padding}` : '' };
    }, PIXEL);
    return [
      result('WG11', 'privacidade do dono mantém o avatar atual visível', shellCount() === 1 && measured.avatar, `shell=${shellCount()} avatar=${measured.avatar}`),
      result('WG12', 'checkbox de compartilhar personagem mede 20x20', measured.checked === true && measured.width === 20 && measured.height === 20, `marcado=${measured.checked} ${measured.width}x${measured.height} css=${measured.css}`),
    ];
  } finally { await context.close(); }
}

async function levelTransition(startXp, mutant) {
  const initial = startXp === 1950
    ? { kills: 19, headshots: 0, wins: 0, matches: 1, deaths: 0, bestStreak: 0 }
    : { kills: 18, headshots: 0, wins: 0, matches: 1, deaths: 0, bestStreak: 0 };
  const { context, page } = await openPage({ path: '/?debug=1', scenario: { stats: initial } });
  try {
    await page.waitForFunction(() => Boolean(window.__USER_GAUNTLET__), null, { timeout: TIMEOUT });
    const values = await page.evaluate(async ({ mutate, start }) => {
      window.__gauntletLevelSounds = 0;
      const before = window.__USER_GAUNTLET__.playerXp(JSON.parse(localStorage.getItem('awpbr_stats')));
      await window.__USER_GAUNTLET__.recordMatchStats({ won: false, kills: 0, deaths: 0, headshots: 2, bestStreak: 0, roundsP: 0, roundsB: 0, team: 'E', seconds: 1, character: 'canarinho' });
      if (mutate === 'level-duplicate') {
        const popup = document.querySelector('[data-level-up]');
        if (!popup) throw new Error('MUTANTE NÃO APLICOU: level-duplicate');
        popup.after(popup.cloneNode(true)); window.__gauntletLevelSounds++;
      }
      if (mutate === 'level-false-positive') {
        const popup = document.createElement('div'); popup.dataset.levelUp = '2'; popup.textContent = 'NÍVEL 2'; document.body.append(popup); window.__gauntletLevelSounds++;
      }
      const after = window.__USER_GAUNTLET__.playerXp(JSON.parse(localStorage.getItem('awpbr_stats')));
      const popups = [...document.querySelectorAll('[data-level-up]')].filter((node) => node.getClientRects().length && getComputedStyle(node).display !== 'none');
      return { expectedStart: start, before, after, popups: popups.length, popupText: popups.map((node) => node.textContent.trim()).join(' | '), sounds: window.__gauntletLevelSounds || 0 };
    }, { mutate: mutant, start: startXp });
    return values;
  } finally { await context.close(); }
}

async function levelClauses(mutant) {
  const crossing = await levelTransition(1950, mutant === 'level-duplicate' ? mutant : '');
  const below = await levelTransition(1850, mutant === 'level-false-positive' ? mutant : '');
  return [
    result('WG13', '1950→2050 emite exatamente um popup e um som', crossing.before === 1950 && crossing.after === 2050 && crossing.popups === 1 && crossing.sounds === 1,
      `${crossing.before}→${crossing.after} popups=${crossing.popups} sons=${crossing.sounds} texto="${crossing.popupText}"`),
    result('WG14', '1850→1950 não emite popup nem som', below.before === 1850 && below.after === 1950 && below.popups === 0 && below.sounds === 0,
      `${below.before}→${below.after} popups=${below.popups} sons=${below.sounds}`),
  ];
}

async function measure(mutant = '') {
  const target = mutant ? MUTANTS[mutant] : requestedOnly;
  const out = [];
  const include = (...ids) => !target || ids.includes(target);
  if (include('WG1')) out.push(await anonymousClause('WG1', 'bootstrap-fail', mutant));
  if (include('WG2')) out.push(await anonymousClause('WG2', 'session-expired', mutant));
  if (include('WG3', 'WG4')) out.push(...(await rankingClauses(mutant)).filter((item) => include(item.id)));
  if (include('WG5')) out.push(await onlineClause('WG5', 1024, mutant));
  if (include('WG6')) out.push(await onlineClause('WG6', 390, mutant));
  if (include('WG7')) out.push(await onlineClause('WG7', 1024, mutant));
  if (include('WG8', 'WG9', 'WG10')) out.push(...(await footerClauses(mutant)).filter((item) => include(item.id)));
  if (include('WG11', 'WG12')) out.push(...(await privacyClauses(mutant)).filter((item) => include(item.id)));
  if (include('WG13', 'WG14')) out.push(...(await levelClauses(mutant)).filter((item) => include(item.id)));
  return out;
}

let exitCode = 0;
try {
  if (runMutants) {
    for (const [mutant, target] of Object.entries(MUTANTS)) {
      const rows = await measure(mutant);
      const clause = rows.find((row) => row.id === target);
      const bit = Boolean(clause && !clause.ok);
      console.log(`${bit ? 'MORDE' : 'CEGO '} ${target} --mutante=${mutant}${clause ? ` · ${clause.detail}` : ''}`);
      if (!bit) exitCode = 1;
    }
  } else {
    const rows = await measure(requestedMutant);
    for (const row of rows) console.log(`${row.ok ? 'VERDE   ' : 'VERMELHO'} ${row.id} ${row.name} · ${row.detail}`);
    const green = rows.filter((row) => row.ok).length;
    console.log(`user gauntlet web: ${green}/${rows.length}${requestedMutant ? ` (--mutante=${requestedMutant})` : ''}`);
    exitCode = rows.every((row) => row.ok) ? 0 : 1;
  }
} finally {
  await browser.close();
}
process.exit(exitCode);
