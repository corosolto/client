/* Nick de 32 caracteres largos não estoura a interface (pedido do dono, 14/10/2026).
   Sobe o jogo real, põe "W"x32 em cada superfície que mostra nick e mede: texto que passa da
   própria caixa sem elipse, caixa que passa do contêiner e caixa fora da tela.
   Superfícies: menu, formulário do nick, ranking do hub e da comunidade, saudação da conta,
   placar, killfeed, painel de morte e chat de sala. Telas: 1440x900, 390x844 e 844x390 com toque.
   Uso: BASE=http://localhost:<porta> OUT=<pasta> [TELAS=desktop,390x844] node tools/eval/nick32-layout.mjs
   Mutantes (MUTANTE=), cada um tem de reprovar: saudacao-sem-quebra, killfeed-sem-elipse,
   morte-sem-quebra, chat-sem-quebra. */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE;
if (!BASE) throw new Error('BASE=http://localhost:<porta> obrigatório (a 8123 é de outra sessão)');
const OUT = process.env.OUT || '/tmp/nick32';
const MUTANTE = process.env.MUTANTE || '';
const W32 = 'W'.repeat(32);
mkdirSync(OUT, { recursive: true });

const PLAYER_ID = (i) => `00000000-0000-4000-8000-0000000000${String(i).padStart(2, '0')}`;
const players = Array.from({ length: 10 }, (_, i) => ({
  id: PLAYER_ID(i + 1), nick: i % 2 ? 'M'.repeat(32) : W32, public_handle: i % 3 ? null : `fixture_${i}`,
  points: 9000 - i * 700, kills: 400 - i * 20, kd: 1.5, position: i + 1, career_points: 9000 - i * 700,
  left_points: 10, right_points: 20, account_verified: i % 2 === 0, socials: [],
}));
const auth = {
  authenticated: true, account_verified: true, newsletter: { status: 'unsubscribed' },
  profile: { id: PLAYER_ID(1), nick: W32, handle: 'fixture_w', handle_locked: true, bio: '', socials: [], profile_visibility: 'public' },
};

const falhas = [];
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});

async function nova({ toque, ...viewport }, { social = false } = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: !!toque, hasTouch: !!toque });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('  [pageerror]', e.message.slice(0, 160)));
  await page.addInitScript((n) => { try { localStorage.setItem('awpbr_nick', n); localStorage.setItem('cs_aviso_software', 'ok'); } catch {} }, W32);
  await page.route('**/api/leaderboard*', (r) => r.fulfill({ json: { players } }));
  // serve.mjs não encaminha /.astro/ ao Astro: o toolbar de dev falha o import e a página abre a tela de erro de boot por cima do jogo
  await page.route(/\/\.astro\//, (r) => r.fulfill({ body: 'export default {};', contentType: 'text/javascript' }));
  await page.addInitScript(() => addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '#launch-error{display:none!important}'; document.head.append(s); }));
  if (social) {
    await page.route('**/api/social-auth*', (r) => r.fulfill({ json: auth }));
    await page.route(/\/api\/social(\?|$)/, (r) => {
      const a = new URL(r.request().url()).searchParams.get('action');
      if (a === 'ranking') return r.fulfill({ json: { players, own: { position: 1, points: 9000 } } });
      return r.fulfill({ json: { profile: { ...auth.profile, url: '/u/fixture_w', bio: '', settings: { share_character: false, profile: 'public', presence: 'friends', invites: 'friends', activity: 'friends', messages: 'friends' } }, friends: [], requests: [], notifications: [], invites: [], blocks: [], activity: [], feed: [], conversations: [], players: [] } });
    });
  }
  return { ctx, page };
}

const MEDIR = (alvos) => {
  const out = [], vw = innerWidth;
  for (const [sel, contSel, opcional] of alvos) {
    const els = [...document.querySelectorAll(sel)].filter((el) => el.getClientRects().length && (el.tagName === 'INPUT' ? el.value : el.textContent).trim());
    if (!els.length) { if (!opcional) out.push({ sel, motivo: 'superfície não renderizou' }); continue; }
    for (const el of els) {
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      const cont = contSel ? el.closest(contSel) : el.parentElement;
      const c = cont.getBoundingClientRect();
      const elide = cs.textOverflow === 'ellipsis' && cs.overflowX !== 'visible';
      if (el.tagName !== 'INPUT' && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0 && !elide) out.push({ sel, motivo: `texto passa da caixa sem elipse (${el.scrollWidth}>${el.clientWidth})` });
      if (r.right > c.right + 1 || r.left < c.left - 1) out.push({ sel, motivo: `caixa passa do contêiner ${contSel || 'pai'} (${Math.round(r.left)}..${Math.round(r.right)} vs ${Math.round(c.left)}..${Math.round(c.right)})` });
      if (r.right > vw + 1 || r.left < -1) out.push({ sel, motivo: `fora da tela (${Math.round(r.left)}..${Math.round(r.right)} vw=${vw})` });
    }
  }
  return out;
};

async function medir(page, nome, alvos, tela) {
  const r = await page.evaluate(MEDIR, alvos);
  const arquivo = `${OUT}/${tela}-${nome}.png`;
  await page.screenshot({ path: arquivo });
  for (const f of r) falhas.push(`${tela} ${nome}: ${f.sel} ${f.motivo}`);
  console.log(`  ${r.length ? 'XX' : 'ok'}   ${tela} ${nome}${r.length ? ': ' + r.map((f) => `${f.sel} ${f.motivo}`).join(' | ') : ''}`);
}

/* 390x844 sem toque: com toque e em pé o jogo só pede para deitar o celular, então a largura de
   390 é medida como janela estreita. O celular deitado (844x390, com toque) é como se joga. */
const TELAS = process.env.TELAS ? process.env.TELAS.split(',') : null;
for (const [tela, viewport] of [['desktop', { width: 1440, height: 900 }], ['390x844', { width: 390, height: 844 }], ['celular-deitado', { width: 844, height: 390, toque: true }]].filter(([t]) => !TELAS || TELAS.includes(t))) {
  console.log(`== ${tela} ${viewport.width}x${viewport.height}`);
  { // menu, ranking do hub
    const { ctx, page } = await nova(viewport);
    await page.goto(`${BASE}/?tela=menu`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => document.getElementById('hub-nick')?.textContent.length >= 32, null, { timeout: 120000 });
    await page.waitForTimeout(1500);
    await medir(page, 'menu', [['#hub-nick, #pp-nick', null, viewport.width < 500]], tela);   // em 390 o hub mostra só o avatar
    await page.evaluate(() => document.querySelector('[data-hub-tab="ranking"]').click());
    await page.waitForFunction(() => document.querySelectorAll('.ranking-player').length >= 10, null, { timeout: 120000 }).catch(() => {});
    await page.waitForTimeout(800);
    await medir(page, 'ranking-hub', [['.ranking-player a, .ranking-player > div > span', 'td']], tela);
    await ctx.close();
  }
  { // comunidade: ranking e formulário do nick (tela "SEU PERFIL, SUAS REGRAS")
    const { ctx, page } = await nova(viewport, { social: true });
    await page.goto(`${BASE}/?tela=menu`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForSelector('[data-hub-tab="comunidade"]', { timeout: 120000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => document.querySelector('[data-hub-tab="comunidade"]').click());
    await page.waitForSelector('.social-tabs button[data-tab="ranking"]', { state: 'attached', timeout: 60000 });
    await page.evaluate(() => document.querySelector('.social-tabs button[data-tab="ranking"]').click());
    await page.waitForFunction(() => document.querySelectorAll('#hub-community .ranking-player, .social-workspace .ranking-player').length >= 10, null, { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(600);
    if (MUTANTE === 'saudacao-sem-quebra') await page.addStyleTag({ content: '.social-account-panel h2{overflow-wrap:normal!important}' });
    await medir(page, 'ranking-comunidade', [['.social-workspace .ranking-player a, .social-workspace .ranking-player > div > span', 'td'], ['.social-account-panel h2', '.social-account-panel']], tela);
    await page.evaluate(() => document.querySelector('.social-tabs button[data-tab="settings"]').click());
    await page.waitForFunction(() => [...document.querySelectorAll('input')].some((x) => x.pattern?.includes('{2,') && x.getClientRects().length), null, { timeout: 60000 }).catch(() => {});
    const campo = await page.evaluate(() => { const i = [...document.querySelectorAll('input')].find((x) => x.pattern?.includes('{2,') && x.getClientRects().length); i?.scrollIntoView({ block: 'center' }); return i && { max: i.maxLength, pattern: i.pattern, valor: i.value, dica: i.closest('.social-card, section, form')?.textContent.match(/2 a \d+ caracteres/)?.[0] }; });
    if (!campo || campo.max !== 32 || campo.valor.length !== 32 || campo.dica !== '2 a 32 caracteres') falhas.push(`${tela} perfil: campo do nick ${JSON.stringify(campo)}`);
    await page.waitForTimeout(300);
    await medir(page, 'perfil-nick', [['input[pattern*="{2,"]', null]], tela);
    await ctx.close();
  }
  { // jogo: placar, killfeed, morte e chat
    const { ctx, page } = await nova(viewport);
    await page.goto(`${BASE}/?tela=placar`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => window.__game && document.querySelector('#scoreboard:not(.hidden) .sb-n'), null, { timeout: 240000 });
    await page.evaluate((n) => { const g = window.__game; for (const c of g.combatants) c.name = n; g._showScoreboard(true); }, W32);
    await page.waitForTimeout(500);
    await medir(page, 'placar', [['#scoreboard .sb-n', 'tr']], tela);
    await page.evaluate((n) => {
      const g = window.__game; g._showScoreboard(false);
      const a = { name: n, team: 'E' }, b = { name: n, team: 'B' };
      g._feed(a, b, 'ak', true); g._feed(b, a, 'awp', false); g._feed(a, b, 'deagle', false); g._feed(null, b, 'queda');
      g._feed(g.player, b, 'ak', true);
    }, W32);
    if (MUTANTE === 'killfeed-sem-elipse') await page.addStyleTag({ content: '.kf-row{max-width:none!important}.kf-row .kf-n{overflow:visible!important;white-space:nowrap!important;min-width:auto!important}' });
    await page.waitForTimeout(300);
    await medir(page, 'killfeed', [['#killfeed .kf-row', '#killfeed'], ['#killfeed .kf-n', '.kf-row']], tela);
    const voce = await page.evaluate(() => { const n = [...document.querySelectorAll('#killfeed .kf-row.me-atk .kf-n')][0]; return n && { cheio: n.scrollWidth <= n.clientWidth, texto: n.textContent }; });
    if (!voce?.cheio) falhas.push(`${tela} killfeed: o nome curto do próprio jogador foi cortado ${JSON.stringify(voce)}`);
    console.log(`  ${voce?.cheio ? 'ok' : 'XX'}   ${tela} killfeed: "${voce?.texto}" do próprio jogador aparece inteiro`);
    await page.evaluate(({ n, mutante }) => {
      const g = window.__game, p = g.player;
      g._lastHit = { at: g.time, name: n, tier: 'bom', weap: 'AK-47', dmg: 36, head: true, dist: 12, behind: false, quad: 'DA SUA FRENTE', pos: p.pos.clone().add({ x: 3, y: 0, z: 3 }), total: 100 };
      g.el.respawn.classList.remove('hidden'); g._deathFeedback(0.016);
      if (mutante === 'morte-sem-quebra') g._deathPanel.style.cssText += ';max-width:none;overflow-wrap:normal';
    }, { n: W32, mutante: MUTANTE });
    await page.waitForTimeout(300);
    await medir(page, 'morte', [['.death-info b', '.death-info'], ['.death-info', null]], tela);
    const tags = await page.evaluate(() => {
      const g = window.__game, tag = '<b id="xss-nick">X</b><img src=x onerror="window.__xss=1">';
      g._feed({ name: tag, team: 'E' }, { name: 'alvo', team: 'B' }, 'ak', false);
      g._lastHit = { ...g._lastHit, at: g.time + 1, name: tag }; g._deathShown = null; g._deathFeedback(0.016);
      return { elementos: document.querySelectorAll('#xss-nick').length, texto: document.querySelector('#killfeed').textContent.includes('<b id="xss-nick">') };
    });
    if (tags.elementos || !tags.texto) falhas.push(`${tela} nome com tag virou HTML no killfeed/morte ${JSON.stringify(tags)}`);
    console.log(`  ${tags.elementos || !tags.texto ? 'XX' : 'ok'}   ${tela} nome com tag aparece como texto no killfeed e na tela de morte`);
    await page.evaluate(() => window.__game.el.respawn.classList.add('hidden'));
    await page.evaluate(async ({ n, mutante }) => {
      const { montarLinha } = await import('/js/chat-painel.js');
      const { rotuloDe } = await import('/js/chat.js');
      const sala = document.getElementById('chat-sala'), log = document.getElementById('chat-log');
      sala.hidden = false; sala.classList.add('aberto');
      for (const m of [{ id: 1, h: 'ab12', nk: n, ch: 'sala', txt: 'boa rodada' }, { id: 2, h: 'cd34', nk: n, ch: 'time', txt: 'vou B' }, { id: 3, h: 'ef56', ch: 'sala', txt: 'x'.repeat(40) }])
        log.appendChild(montarLinha(m, { rotulo: rotuloDe(m), marcaTime: m.ch === 'time' ? 'TIME' : '' }));
      if (mutante === 'chat-sem-quebra') for (const li of log.querySelectorAll('.chat-linha')) li.style.flexWrap = 'nowrap';
    }, { n: W32, mutante: MUTANTE });
    await page.waitForTimeout(300);
    await medir(page, 'chat', [['#chat-log .chat-quem', '.chat-linha'], ['#chat-log .chat-linha', '#chat-sala']], tela);
    await ctx.close();
  }
}
await browser.close();
if (falhas.length) { console.log(`\x1b[31mNICK32 VERMELHO: ${falhas.length}\x1b[0m\n  ${falhas.join('\n  ')}`); process.exit(1); }
if (MUTANTE) throw new Error(`mutante ${MUTANTE} não deixou a régua vermelha`);
console.log(`\x1b[32mNICK32 verde: 32 W cabem em todas as superfícies, desktop e 390x844. Capturas em ${OUT}\x1b[0m`);
