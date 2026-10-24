#!/usr/bin/env node
/* Régua do perfil e da carreira Treta Pop (telas 10 e 11 de design/treta-pop-2026-10-14) medida no Chrome.
     BASE=http://127.0.0.1:9427 node tools/eval/ui-v3-perfil.mjs [--mutantes]
   APIs simuladas: mede o cliente, não o backend. Capturas em OUT (padrão tools/eval/out/ui-v3-perfil). */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || 'http://127.0.0.1:9427';
const OUT = process.env.OUT || 'tools/eval/out/ui-v3-perfil';
const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});

const EU = '11111111-2222-4333-8444-555555555555', OUTRO = '22222222-3333-4444-8555-666666666666', CLA = '33333333-4444-4555-8666-777777777777';
const CONVITE = 'Abc123_-'.repeat(5).slice(0, 43);
const HIST = [['praca_poderes', 'rounds', 'win', 24, 8], ['escadao', 'ctf', 'loss', 11, 14], ['amazonia', 'ctf', 'win', 18, 10], ['piscina_treta', 'rounds', 'win', 20, 4], ['loja_h', 'rounds', 'loss', 9, 12], ['quebrada', 'rounds', 'win', 5, 5]]
  .map(([map, mode, result, kills, deaths], i) => ({ started_at: new Date(Date.now() - (i + 1) * 7200e3).toISOString(), map, mode, game_type: 'multiplayer', complete: true, result, kills, deaths }));
const DONO = { id: EU, nick: 'ZeDoAWP', handle: 'zedoawp', url: '/u/zedoawp', visibility: 'public', source: 'server_verified', bio: 'Só AWP no eixo da Praça.',
  level: 11, next_level_points: 80, points: 1020, position: 412, kills: 1284, deaths: 904, kd: 1.42, matches: 140, round_wins: 97, round_losses: 60,
  verified_play_seconds: 90000, play_seconds: 99000, legacy_play_seconds: 9000,
  settings: { share_character: true }, socials: [{ url: 'https://instagram.com/zedoawp' }, { url: 'https://www.tiktok.com/@zedoawp' }],
  achievements: [], favorites: [{ map: 'praca_poderes', mode: 'rounds', character: 'sertanejo', faction: 'B', rounds: 40 }], history: HIST,
  last_character: 'sertanejo', presence: { online: true }, relationship: null,
  /* fora de ordem de propósito (o backend manda no máximo 3): arma que o cliente não conhece, abate zero e número fora da faixa segura */
  top_weapons: [{ weapon: 'ak', kills: 118 }, { weapon: 'awp', kills: 400 }, { weapon: 'bazuca_fake', kills: 1 },
    { weapon: 'mp5', kills: 1e21 }, { weapon: 'knife', kills: 0 }] };
const CONTA = { id: EU, handle: 'zedoawp', url: '/u/zedoawp', bio: DONO.bio, socials: DONO.socials,
  settings: { share_character: true, profile: 'public', presence: 'private', activity: 'friends' } };
const ALHEIO = { ...DONO, id: OUTRO, nick: 'ClubberDaLaje', handle: 'clubber', url: '/u/clubber', points: 150, level: 3, kills: 40, history: [], favorites: [],
  last_character: null, relationship: 'none', top_weapons: [], presence: null };
/* O que a produção devolve ao visitante (medido em /api/social?action=profile&id=…): privacidade já podada no backend. */
const VISITA = { ...DONO, settings: null, last_character: null, favorites: [], history: [], relationship: null, treta_balance: null };
const MEU_CLA = { clan: { id: CLA, tag: 'CRIA', name: 'Cria do Piscinão', member_count: 3, leader_id: EU, description: '' }, playerId: EU,
  members: [{ player_id: EU, nick: 'ZeDoAWP', is_leader: true }, { player_id: OUTRO, nick: 'ClubberDaLaje', is_leader: false }, { player_id: CLA, nick: 'TrapDoCorrego', is_leader: false }] };

/* Mutantes reescrevem o arquivo servido; cada um prova que aplicou. */
const MUT = {
  'sem-avatar': ['PF1', ['dono'], /\/js\/tp\/perfil\.js/, (t) => t.replace("id.append(avatar(p, 'tp-perfil__avatar'), quem)", 'id.append(quem)')],
  'edicao-embaixo': ['PF2', ['dono'], /\/css\/tp\/perfil\.css/, (t) => t.replace('grid-template-columns:minmax(0,1fr) 428px', 'grid-template-columns:minmax(0,1fr)')],
  'previa-morta': ['PF3', ['dono'], /\/js\/tp\/perfil\.js/, (t) => t.replace('bio.oninput = contar;', 'bio.oninput = null;')],
  'presenca-chutada': ['PF4', ['dono'], /\/js\/tp\/perfil\.js/, (t) => t.replace('presence: c.settings.presence', "presence: 'friends'")],
  'dois-limas': ['PF5', ['dono'], /\/js\/tp\/perfil\.js/, (t) => t.replace("'tp-carreira__compartilhar'", "'tp-btn--primario tp-carreira__compartilhar'")],
  'numero-inventado': ['PF6', ['dono'], /\/js\/tp\/perfil\.js/, (t) => t.replace("trk('Abates', conta(p.kills))", "trk('Abates', conta(Number(p.kills) + 16))")],
  'acao-morta': ['PF7', ['alheio'], /\/js\/tp\/perfil\.js/, (t) => t.replace('() => clicaLegado(texto)?.click()', '() => {}')],
  'carreira-empilhada': ['CA1', ['dono'], /\/css\/tp\/perfil\.css/, (t) => t.replace('.tp-carreira{display:grid', '.tp-carreira{display:block')],
  'barra-da-faixa': ['CA2', ['dono'], /\/js\/tp\/perfil\.js/, (t) => t.replace('Math.min(1, pts / seguinte.minPoints)', 'Math.min(1, (pts - rank.minPoints) / seguinte.minPoints)')],
  'convite-sem-token': ['CA3', ['dono'], /\/js\/tp\/perfil\.js/, (t) => t.replace('link += `#invite=${r.invite}`', "link += ''")],
  'cla-de-mentira': ['CA4', ['semcla'], /\/js\/tp\/perfil\.js/, (t) => t.replace('if (!c) {', "if (!c && false) {")],
  'patente-sem-tr': ['IN1', ['en'], /\/js\/i18n\.js/, (t) => t.replace("'Próxima patente': 'Next rank',", '')],
  'toque-pequeno': ['VP2', ['telas'], /\/css\/tp\/perfil\.css/, (t) => t.replace('@media (pointer:coarse){', '@media (pointer:none){')],
  'gancho-sem-flag': ['SF1', ['semflag'], /\/js\/community\.js/, (t) => t.replace("if(document.documentElement?.dataset?.ui==='v3')root.tpPerfilDados", 'root.tpPerfilDados')],
  'horas-decimais': ['PF9', ['dono'], /\/js\/tp\/perfil\.js/, (t) => t.replace('? tempo(seg) :', '? decimal(seg / 3600, 1) :')],
  'horas-misturadas': ['PF9', ['dono'], /\/js\/tp\/perfil\.js/, (t) => t.replace('const seg = Number(p.verified_play_seconds)', 'const seg = Number(p.play_seconds)')],
  'armas-fora-de-ordem': ['PF8', ['dono'], /\/js\/tp\/perfil\.js/, (t) => t.replace('.sort((a, b) => b.kills - a.kills)', '')],
  'armas-sem-filtro': ['PF8', ['dono'], /\/js\/tp\/perfil\.js/, (t) => t.replace('&& Number.isSafeInteger(w.kills) && w.kills > 0', '')],
  'armas-zero-inventado': ['PF8', ['dono', 'alheio'], /\/js\/tp\/perfil\.js/, (t) => t.replace('const lista = armasDe(p);', "const lista = armasDe(p).length ? armasDe(p) : [{ weapon: 'ak', kills: 0 }];")],
  /* VS1/VS2: sem conta a tela é o perfil, não o painel de login. */
  'perfil-so-com-conta': ['VS1', ['visitante'], /\/js\/community\.js/, (t) => t.replace("const alvo=profileId || auth?.profile?.id || idConvidado();", 'const alvo=profileId || auth?.profile?.id;')],
  'login-na-tela-toda': ['VS1', ['visitante'], /\/js\/community\.js/, (t) => t.replace("&& tab==='profile' && !painelPedido)panel.open=false", "&& tab==='profile' && !painelPedido)panel.open=true")],
  'convite-sumido': ['VS1', ['visitante'], /\/js\/tp\/perfil\.js/, (t) => t.replace('if (d.visitante) v.append(convite());', '')],
  'vazio-vira-legado': ['VS2', ['semperfil'], /\/js\/tp\/perfil\.js/, (t) => t.replace('d?.visitante === true)', 'false)')],
  'vazio-zerado': ['VS2', ['semperfil'], /\/js\/tp\/perfil\.js/, (t) => t.replace("el('p', 'tp-perfil__vazio', tr('Abates, ranking", "trk('Abates', '0'), el('p', 'tp-perfil__vazio', tr('Abates, ranking")],
};

/* `logado:false` é o visitante: social-auth responde sem conta e o cs_anon do convidado é o mesmo id que o jogo registra. */
async function contexto(mutante, { lang = 'pt', cla = MEU_CLA, viewport = { width: 1536, height: 1024 }, toque = false, posts = [], logado = true, anon = '', semPerfil = false } = {}) {
  const ctx = await browser.newContext({ viewport, hasTouch: toque, isMobile: toque, deviceScaleFactor: 1 });
  await ctx.addInitScript(({ l, a }) => {
    localStorage.setItem('awpbr_nick', 'ZeDoAWP'); localStorage.setItem('cs_treta_intro', '1'); localStorage.setItem('cs_lang', l);
    if (a) { localStorage.setItem('cs_anon', a); localStorage.setItem('awpbr_token', '99999999-8888-4777-8666-555555555555'); }
    window.__copiado = '';
    try { Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { window.__copiado = t; } } }); } catch { /* sem clipboard */ }
  }, { l: lang, a: anon });
  if (mutante) {
    const [, , teste, troca] = MUT[mutante];
    await ctx.route(teste, async (r) => {
      const res = await r.fetch().catch(() => r.fetch()); const antes = await res.text(); const depois = troca(antes);
      if (depois === antes) throw new Error(`mutante ${mutante} não aplicou em ${r.request().url()}`);
      await r.fulfill({ response: res, body: depois });
    });
  }
  await ctx.route(/\/api\/social-auth/, (r) => r.fulfill({ json: new URL(r.request().url()).searchParams.get('action') === 'providers' ? { providers: ['google', 'discord', 'x', 'linkedin_oidc'] } : (logado ? { authenticated: true, profile: { id: EU, nick: 'ZeDoAWP' } } : { authenticated: false }) }));
  await ctx.route(/\/api\/social(?:\?|$)/, (r) => {
    const u = new URL(r.request().url());
    if (u.searchParams.get('action') === 'profile') {
      /* Como a produção responde: sem id e sem sessão é 404; com id, o perfil público já podado pelo backend. */
      if (semPerfil || !u.searchParams.get('id')) return r.fulfill({ status: 404, json: { error: 'not_found' } });
      return r.fulfill({ json: { profile: u.searchParams.get('id') === OUTRO ? ALHEIO : logado ? DONO : VISITA } });
    }
    if (r.request().method() === 'POST') { const b = r.request().postDataJSON(); posts.push(b); return r.fulfill({ json: b.action === 'nick' ? { nick: b.nick } : { ok: true } }); }
    if (u.searchParams.get('action')) return r.fulfill({ json: {} });
    return r.fulfill({ json: { profile: CONTA, friends: [], notifications: [], invites: [], feed: [], blocks: [], messages_enabled: false } });
  });
  await ctx.route(/\/api\/clans/, (r) => {
    const b = r.request().postDataJSON?.() || {};
    posts.push({ clans: b.action });
    return r.fulfill({ json: b.action === 'invite' ? { invite: CONVITE, clanId: CLA } : b.action === 'me' ? cla : { clans: [] } });
  });
  return ctx;
}

async function abrir(ctx, query = '', flag = '') {
  const p = await ctx.newPage();
  const sep = flag ? '&' : '?';
  await p.goto(`${BASE}/${flag}${sep}home=hub&secao=comunidade&social=profile${query}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForSelector('#hub-ui:not([hidden])', { timeout: 120000 });
  for (let i = 0; i < 80 && await p.$('#boot-splash:not(.gone)'); i++) {
    await p.evaluate(() => document.getElementById('boot-splash')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await p.keyboard.press('Enter').catch(() => {});
    await p.waitForTimeout(500);
  }
  await p.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); });
  await p.waitForFunction(() => document.getElementById('social-content')?.getAttribute('aria-busy') === 'false' && document.querySelector('#social-content .social-card, #social-content .tp-perfil'), null, { timeout: 60000 }).catch(() => {});
  await p.waitForSelector('.tp-perfil', { timeout: flag === '?ui=legacy' ? 3000 : 20000 }).catch(() => {});
  await p.waitForTimeout(700);
  return p;
}

const caixa = (sel) => { const e = document.querySelector(sel); if (!e || !e.checkVisibility()) return null; const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };

async function medePerfil(p) {
  await p.waitForFunction(() => [...document.querySelectorAll('.tp-perfil__arma-img')].every((i) => i.complete), null, { timeout: 8000 }).catch(() => {});
  return p.evaluate((caixaSrc) => {
    const caixa = eval(caixaSrc);
    const nick = document.querySelector('.tp-perfil__cartao .tp-perfil__nick');
    const visiveis = (sel) => [...document.querySelectorAll(sel)].filter((e) => e.checkVisibility());
    return {
      cartao: caixa('.tp-perfil__cartao'), editar: caixa('.tp-perfil__editar'), avatar: !!visiveis('.tp-perfil__cartao .tp-perfil__avatar').length,
      nickFonte: nick ? getComputedStyle(nick).fontFamily : '', nickTexto: nick?.textContent || '', patente: visiveis('.tp-perfil__cartao .tp-patente').map((e) => e.textContent),
      nivel: document.querySelector('.tp-perfil__cartao .tp-perfil__nivel')?.textContent || '',
      primarios: visiveis('.tp-btn--primario').map((e) => e.textContent.trim()),
      trks: visiveis('.tp-perfil__trks .tp-perfil__trk').map((e) => [e.children[0].textContent, e.children[1].textContent]),
      bio: document.querySelector('.tp-perfil__cartao .tp-perfil__bio')?.textContent || '',
      campos: ['#tp-pf-nick', '#tp-pf-bio', '#tp-pf-quem'].map((s) => !!document.querySelector(s)), bioMax: document.querySelector('#tp-pf-bio')?.maxLength,
      armas: visiveis('.tp-perfil__arma').map((e) => {
        const i = e.querySelector('.tp-perfil__arma-barra > i'), t = getComputedStyle(i).transform;
        return [e.querySelector('b').textContent, e.querySelector('.tp-perfil__arma-num').textContent,
          Number((t === 'none' ? 1 : new DOMMatrix(t).a).toFixed(3)), (e.querySelector('img')?.naturalWidth || 0) > 0];
      }),
      armasBloco: !!document.querySelector('.tp-perfil__armas-bloco')?.checkVisibility(),
      armasVazio: document.querySelector('.tp-perfil__armas-bloco .tp-perfil__vazio')?.textContent || '',
      notaHoras: document.querySelector('.tp-perfil__trks + .tp-perfil__nota')?.textContent || '',
      texto: document.querySelector('.tp-perfil')?.innerText || '', legado: !!document.querySelector('#social-content > .social-card')?.checkVisibility(),
    };
  }, `(${caixa})`);
}
async function medeCarreira(p) {
  await p.click('.tp-perfil__abas [data-vista="carreira"]').catch(() => {});
  await p.waitForSelector('.tp-carreira', { timeout: 5000 }).catch(() => {});
  await p.waitForFunction(() => !document.querySelector('.tp-carreira__cla .tp-perfil__vazio') || document.querySelector('.tp-carreira__cla h3'), null, { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(700);
  return p.evaluate((caixaSrc) => {
    const caixa = eval(caixaSrc);
    const visiveis = (sel) => [...document.querySelectorAll(sel)].filter((e) => e.checkVisibility());
    const i = document.querySelector('.tp-carreira__barra > i');
    const m = i ? new DOMMatrix(getComputedStyle(i).transform) : null;
    return {
      eu: caixa('.tp-carreira__eu'), partidas: caixa('.tp-carreira__partidas'), cla: caixa('.tp-carreira__cla'),
      linhas: visiveis('.tp-carreira__m').map((e) => [e.querySelector('.tp-perfil__marca').textContent, e.querySelector('b').textContent, e.querySelector('.tp-carreira__kd').textContent]),
      prox: document.querySelector('.tp-carreira__prox-topo')?.textContent || '', escala: m ? m.a : -1,
      claTexto: document.querySelector('.tp-carreira__cla')?.innerText || '', membros: visiveis('.tp-carreira__membro').length,
      primarios: visiveis('.tp-btn--primario').map((e) => e.textContent.trim()), texto: document.querySelector('.tp-perfil')?.innerText || '',
    };
  }, `(${caixa})`);
}
/* Tela de quem não tem conta: o que aparece, e o tamanho do painel de login (recolhido ele é só o resumo). */
async function medeVisitante(p) {
  return p.evaluate((caixaSrc) => {
    const caixa = eval(caixaSrc);
    const painel = document.querySelector('.social-account-panel');
    const visiveis = (sel) => [...document.querySelectorAll(sel)].filter((e) => e.checkVisibility());
    return {
      cartao: caixa('.tp-perfil__cartao'), editar: caixa('.tp-perfil__editar'), abas: caixa('.tp-perfil__abas'),
      convite: caixa('.tp-perfil__convite'), sem: caixa('.tp-perfil__sem'), painel: caixa('.social-account-panel'),
      painelAberto: painel?.open === true, entradaConta: visiveis('#social-account button, #social-account input').length,
      trks: visiveis('.tp-perfil__trk').map((e) => [e.children[0].textContent, e.children[1].textContent]),
      armas: visiveis('.tp-perfil__arma b').map((e) => e.textContent), barras: visiveis('.tp-perfil__sem .tp-barra').length,
      nick: document.querySelector('.tp-perfil__cartao .tp-perfil__nick')?.textContent || '',
      texto: document.querySelector('.tp-perfil')?.innerText || '', legado: !!document.querySelector('#social-content > .social-card')?.checkVisibility(),
    };
  }, `(${caixa})`);
}

/* Cada cenário abre o jogo uma vez; o mutante roda só os cenários da cláusula que ele quer derrubar. */
const CENARIOS = {
  async dono(mut) {
    const posts = [];
    const ctx = await contexto(mut, { posts });
    const p = await abrir(ctx);
    const perfil = await medePerfil(p);
    if (!mut) await p.screenshot({ path: `${OUT}/perfil-1536x1024.png` });
    await p.fill('#tp-pf-bio', 'Bio nova da régua').catch(() => {});
    await p.fill('#tp-pf-nick', 'ZeDaRegua').catch(() => {});
    const previa = await p.evaluate(() => ({ bio: document.querySelector('.tp-perfil__cartao .tp-perfil__bio')?.textContent || '', nick: document.querySelector('.tp-perfil__cartao .tp-perfil__nick')?.textContent || '', contador: document.querySelector('.tp-perfil__contador')?.textContent || '' }));
    await p.click('.tp-perfil__salvar').catch(() => {});
    await p.waitForTimeout(1500);
    const enviados = posts.filter((x) => x.action === 'settings' || x.action === 'nick');
    await p.waitForSelector('.tp-perfil', { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(800);
    const carreira = await medeCarreira(p);
    if (!mut) await p.screenshot({ path: `${OUT}/carreira-1536x1024.png` });
    await p.click('.tp-carreira__cla-acao').catch(() => {});
    await p.waitForTimeout(800);
    const copiado = await p.evaluate(() => window.__copiado);
    await ctx.close();
    return { perfil, previa, enviados, carreira, copiado, convites: posts.filter((x) => x.clans === 'invite').length };
  },
  async en(mut) {
    const ctx = await contexto(mut, { lang: 'en' });
    const p = await abrir(ctx, '&lang=en');
    const perfil = await medePerfil(p);
    if (!mut) await p.screenshot({ path: `${OUT}/perfil-en-1536x1024.png` });
    const carreira = await medeCarreira(p);
    if (!mut) await p.screenshot({ path: `${OUT}/carreira-en-1536x1024.png` });
    await ctx.close();
    const pt = await contexto(mut);
    const q = await abrir(pt);
    const ptPerfil = await medePerfil(q);
    const ptCarreira = await medeCarreira(q);
    await pt.close();
    return { en: `${perfil.texto}\n${carreira.texto}`, pt: `${ptPerfil.texto}\n${ptCarreira.texto}` };
  },
  async alheio(mut) {
    const posts = [];
    const ctx = await contexto(mut, { posts });
    const p = await abrir(ctx, `&perfil=${OUTRO}`);
    const perfil = await medePerfil(p);
    if (!mut) await p.screenshot({ path: `${OUT}/perfil-alheio-1536x1024.png` });
    const abas = await p.evaluate(() => !!document.querySelector('.tp-perfil__abas')?.checkVisibility());
    await p.click('.tp-perfil__acoes .tp-btn--primario').catch(() => {});
    await p.waitForTimeout(1200);
    await ctx.close();
    return { perfil, abas, pedido: posts.find((x) => x.action === 'request') };
  },
  async semcla(mut) {
    const ctx = await contexto(mut, { cla: { clan: null, members: [], playerId: EU } });
    const p = await abrir(ctx);
    const carreira = await medeCarreira(p);
    if (!mut) await p.screenshot({ path: `${OUT}/carreira-sem-cla-1536x1024.png` });
    const link = await p.evaluate(() => document.querySelector('.tp-carreira__cla a.tp-btn--primario')?.getAttribute('href') || '');
    await ctx.close();
    return { carreira, link };
  },
  async telas(mut) {
    const r = {};
    const ctx = await contexto(mut, { viewport: { width: 1920, height: 1080 } });
    const p = await abrir(ctx);
    for (const [w, h] of [[1920, 1080], [1280, 720]]) {
      await p.setViewportSize({ width: w, height: h });
      for (const vista of ['perfil', 'carreira']) {
        await p.click(`.tp-perfil__abas [data-vista="${vista}"]`).catch(() => {});
        await p.waitForTimeout(900);
        r[`${w}x${h}-${vista}`] = await mede(p);
        if (!mut) await p.screenshot({ path: `${OUT}/${vista}-${w}x${h}.png` });
      }
    }
    await ctx.close();
    const m = await contexto(mut, { viewport: { width: 844, height: 390 }, toque: true });
    const q = await abrir(m);
    for (const vista of ['perfil', 'carreira']) {
      await q.click(`.tp-perfil__abas [data-vista="${vista}"]`).catch(() => {});
      await q.waitForTimeout(900);
      r[`844x390-${vista}`] = await mede(q);
      if (!mut) {
        await q.screenshot({ path: `${OUT}/${vista}-844x390.png` });
        /* o painel do hub rola por dentro: uma captura por bloco, na altura em que o celular mostra */
        const blocos = vista === 'perfil' ? ['.tp-perfil__cartao', '.tp-perfil__dupla', '.tp-perfil__atividade', '.tp-perfil__editar', '.tp-perfil__salvar']
          : ['.tp-carreira__eu', '.tp-carreira__trks', '.tp-carreira__partidas', '.tp-carreira__cla'];
        for (const [n, sel] of blocos.entries()) {
          await q.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'start' }), sel);
          await q.waitForTimeout(250);
          await q.screenshot({ path: `${OUT}/${vista}-844x390-rolado-${n + 1}.png` });
        }
      }
    }
    await m.close();
    return r;
    async function mede(pg) {
      return pg.evaluate(() => {
        const v = document.querySelector('.tp-perfil');
        if (!v) return { existe: false };
        const vw = document.documentElement.clientWidth;
        const largos = [...v.querySelectorAll('*')].filter((e) => e.checkVisibility() && e.getBoundingClientRect().right > vw + 1).map((e) => e.className || e.tagName).slice(0, 3);
        const pequenos = [...v.querySelectorAll('button, a, input, select, textarea, summary')].filter((e) => e.checkVisibility() && e.type !== 'checkbox' && e.getBoundingClientRect().height < 44)
          .map((e) => `${(e.className || e.tagName).toString().split(' ').pop()} ${e.getBoundingClientRect().height.toFixed(0)}px`).slice(0, 4);
        const cb = [...v.querySelectorAll('input[type=checkbox]')].filter((e) => e.checkVisibility() && e.closest('label').getBoundingClientRect().height < 44).length;
        return { existe: true, rolagem: document.documentElement.scrollWidth > vw + 1, largos, pequenos, cb, vista: v.dataset.vista };
      });
    }
  },
  async semflag(mut) {
    const ctx = await contexto(mut);
    const p = await abrir(ctx, '', '?ui=legacy');
    const r = await p.evaluate(() => ({
      tp: !!document.querySelector('.tp-perfil, [data-tp-perfil]'), gancho: document.getElementById('community')?.tpPerfilDados !== undefined,
      legado: !!document.querySelector('#social-content > .social-card')?.checkVisibility(), largura: document.getElementById('hub-community')?.getBoundingClientRect().width,
    }));
    if (!mut) await p.screenshot({ path: `${OUT}/antes-perfil-1536x1024.png` });
    await ctx.close();
    return { legacy: r };
  },
  /* Sem conta, com o cs_anon do convidado: é o mesmo id que o jogo registra, então o perfil público dele abre. */
  async visitante(mut) {
    const ctx = await contexto(mut, { logado: false, anon: EU });
    const p = await abrir(ctx);
    const r = await medeVisitante(p);
    if (!mut) await p.screenshot({ path: `${OUT}/perfil-visitante-1536x1024.png` });
    /* A faixa é elemento novo: no celular deitado ela não pode passar da largura nem encolher o alvo de toque. */
    await p.setViewportSize({ width: 844, height: 390 });
    await p.waitForTimeout(700);
    const celular = await p.evaluate(() => {
      const vw = document.documentElement.clientWidth, f = document.querySelector('.tp-perfil__convite');
      const alvos = f ? [...f.querySelectorAll('button')].map((e) => e.getBoundingClientRect().height) : [];
      return { existe: !!f, rolagem: document.documentElement.scrollWidth > vw + 1, largo: !!f && f.getBoundingClientRect().right > vw + 1, alvo: alvos.length ? Math.min(...alvos) : 0 };
    });
    if (!mut) await p.screenshot({ path: `${OUT}/perfil-visitante-844x390.png` });
    await p.setViewportSize({ width: 1536, height: 1024 });
    await p.waitForTimeout(500);
    await p.click('.tp-perfil__convite .tp-btn').catch(() => {});
    await p.waitForTimeout(700);
    const pedido = await medeVisitante(p);
    if (!mut) await p.screenshot({ path: `${OUT}/perfil-visitante-convite-aberto-1536x1024.png` });
    await ctx.close();
    return { ...r, pedido, celular };
  },
  async semperfil(mut) {
    const ctx = await contexto(mut, { logado: false, anon: EU, semPerfil: true });
    const p = await abrir(ctx);
    const r = await medeVisitante(p);
    if (!mut) await p.screenshot({ path: `${OUT}/perfil-visitante-sem-rodada-1536x1024.png` });
    await ctx.close();
    return r;
  },
};

const PT_VAZA = /\b(Próxima patente|Abates|Vitórias|Partidas|Últimas partidas|Medalhas|Editar perfil|Salvar perfil|Nível|Vitrine|Números|Atividade|Arena favorita|membros|LÍDER|Copiar convite|Carreira e clã|destaques do histórico|Capitão|Armas preferidas|Horas jogadas|abates confirmados|contadas à parte)\b/i;
const EN_VAZA = /\b(Next rank|Kills|Wins|Matches|Latest matches|Medals|Edit profile|Save profile|Level|Showcase|Stats|Activity|Favorite arena|members|LEADER|Copy clan invite|Career and clan|Captain|Favorite weapons|Hours played|kills confirmed|counted separately)\b/;

async function medir(mutante = '') {
  const so = mutante ? MUT[mutante][1] : Object.keys(CENARIOS);
  const m = {};
  for (const c of so) m[c] = await CENARIOS[c](mutante);
  const r = [];
  const add = (id, ok, msg) => r.push({ id, ok: !!ok, msg });
  const d = m.dono;
  if (d) {
    const pf = d.perfil;
    add('PF1', pf.cartao && pf.cartao.h >= 260 && pf.avatar && /Anton/.test(pf.nickFonte) && pf.nickTexto === 'ZeDoAWP' && pf.patente.some((t) => /CAPITÃO/.test(t)) && /11/.test(pf.nivel),
      !pf.cartao ? 'cartão público Treta Pop ausente' : `cartão ${pf.cartao.h.toFixed(0)} px de altura (quer 260+), avatar ${pf.avatar ? 'sim' : 'NÃO'}, nick "${pf.nickTexto}" em ${pf.nickFonte.split(',')[0] || '?'}, patente [${pf.patente}], ${pf.nivel || 'sem nível'}`);
    const e = pf.editar, c = pf.cartao;
    add('PF2', e && c && e.l >= c.r + 8 && e.w >= 380 && e.w <= 460 && pf.campos.every(Boolean) && pf.bioMax === 280,
      !e ? 'painel de edição ausente' : `edição ${e.w.toFixed(0)} px (quer 380-460) ${e.l >= (c?.r || 0) + 8 ? 'ao lado' : 'EMBAIXO'} do cartão; campos nick/bio/quem vê ${pf.campos.map((x) => (x ? 'ok' : 'falta'))}; bio até ${pf.bioMax}`);
    add('PF3', d.previa.bio === 'Bio nova da régua' && /ZeDaRegua/.test(d.previa.nick) && d.previa.contador.startsWith('17'),
      `prévia ao vivo: bio "${d.previa.bio}", nick "${d.previa.nick}", contador "${d.previa.contador}"`);
    const s = d.enviados.find((x) => x.action === 'settings'), n = d.enviados.find((x) => x.action === 'nick');
    add('PF4', s && n?.nick === 'ZeDaRegua' && s.bio === 'Bio nova da régua' && s.presence === 'private' && s.activity === 'friends' && s.profile === 'public' && s.links?.length === 2,
      !s ? 'SALVAR não mandou settings' : `nick ${n ? n.nick : 'não mandado'}; settings bio "${s.bio}", presence ${s.presence} (conta: private), activity ${s.activity}, profile ${s.profile}, ${s.links?.length} links`);
    add('PF5', pf.primarios.length === 1 && d.carreira.primarios.length === 1 && (!m.alheio || m.alheio.perfil.primarios.length === 1),
      `lima por tela: perfil [${pf.primarios}], carreira [${d.carreira.primarios}]${m.alheio ? `, perfil alheio [${m.alheio.perfil.primarios}]` : ''} (quer 1 em cada)`);
    const esperado = [['ABATES', '1.284'], ['VITÓRIAS', '97'], ['K/D', '1,42'], ['PARTIDAS', '140'], ['RANKING', '#412'], ['HORAS JOGADAS', '25 h']];
    const tem = Object.fromEntries(pf.trks.map(([k, v]) => [k.toUpperCase(), v]));
    const erra = esperado.filter(([k, v]) => tem[k] !== v).map(([k, v]) => `${k}=${tem[k] ?? 'ausente'} (backend ${v})`);
    const inventa = /headshot|\bXP\b|curtidas|coment[aá]rios|online/i.test(pf.texto + d.carreira.texto);
    add('PF6', pf.trks.length && !erra.length && !inventa, erra.length ? `número diverge do backend: ${erra.join(', ')}` : inventa ? 'mostra dado que o backend não manda (headshot, XP, curtidas, online)' : `${pf.trks.length} números iguais aos do backend, nada inventado`);
    /* Armas preferidas: ordem e número saem do top_weapons, nunca do cliente. */
    const armasEsperadas = [['AWP "DELIBERADOR"', '400 abates', 1, true], ['AK-47 "BATE-ESTACA"', '118 abates', 0.295, true],
      ['BAZUCA_FAKE', '1 abate', 0.003, false]];
    const armasErra = pf.armas.length !== armasEsperadas.length ? [`${pf.armas.length} armas (quer ${armasEsperadas.length})`]
      : pf.armas.flatMap((a, i) => {
        const q = armasEsperadas[i];
        if (a[0] !== q[0] || a[1] !== q[1]) return [`${i + 1}ª "${a[0]}" ${a[1]} (quer "${q[0]}" ${q[1]})`];
        if (Math.abs(a[2] - q[2]) > 0.01) return [`barra de ${a[0]} em ${(a[2] * 100).toFixed(1)}% (quer ${(q[2] * 100).toFixed(1)}%)`];
        if (a[3] !== q[3]) return [`${a[0]} ${a[3] ? 'ganhou render que não existe' : 'sem render de /img/weapons'}`];
        return [];
      });
    const semArma = m.alheio?.perfil;
    if (semArma && (!semArma.armasBloco || semArma.armas.length || !/Ainda sem arma registrada/.test(semArma.armasVazio)))
      armasErra.push(`perfil sem arma: bloco ${semArma.armasBloco ? 'à vista' : 'SUMIU'}, ${semArma.armas.length} armas desenhadas, vazio "${semArma.armasVazio.slice(0, 40)}"`);
    add('PF8', pf.armas.length && !armasErra.length, armasErra.length ? armasErra.join('; ')
      : `${pf.armas.length} armas em ordem de abate, com render e barra relativa; sem dado vira estado vazio`);
    /* Horas: só o tempo confirmado vira número; o histórico antigo aparece à parte, nunca somado. */
    const horasErra = [];
    if (tem['HORAS JOGADAS'] !== '25 h') horasErra.push(`HORAS JOGADAS=${tem['HORAS JOGADAS'] ?? 'ausente'} (verified_play_seconds 90000 = 25 h)`);
    if (!/2 h 30 min/.test(pf.notaHoras)) horasErra.push(`nota não separa o histórico antigo: "${pf.notaHoras.slice(0, 70)}"`);
    if (/27 h|27,5|99\.000/.test(pf.texto)) horasErra.push('soma o tempo antigo com o confirmado (27 h 30 min)');
    add('PF9', !horasErra.length, horasErra.length ? horasErra.join('; ')
      : `25 h confirmadas em hora cheia, com as 2 h 30 min do histórico antigo contadas à parte`);
    const k = d.carreira;
    const col = k.eu && k.partidas && k.cla && k.eu.r <= k.partidas.l && k.partidas.r <= k.cla.l && Math.abs(k.eu.t - k.cla.t) < 4;
    const esperadas = HIST.slice(0, 5).map((h) => [h.result === 'win' ? 'V' : 'D', h.kills, h.deaths]);
    const linhasOk = k.linhas.length === 5 && k.linhas.every((l, i) => l[0] === esperadas[i][0] && l[2] === `${esperadas[i][1]} / ${esperadas[i][2]}`);
    add('CA1', col && linhasOk, !k.eu ? 'carreira Treta Pop ausente' : `${col ? 'três colunas lado a lado' : 'colunas EMPILHADAS'}; ${k.linhas.length} partidas (quer 5) ${linhasOk ? 'com V/D e abates do backend' : `divergem: ${JSON.stringify(k.linhas.slice(0, 2))}`}`);
    add('CA2', /Major/.test(k.prox) && /1\.020\s*\/\s*1\.100/.test(k.prox) && Math.abs(k.escala - 1020 / 1100) < 0.02,
      `próxima patente "${k.prox.replace(/\s+/g, ' ')}", barra em ${(k.escala * 100).toFixed(1)}% (quer ${(1020 / 11).toFixed(1)}%)`);
    add('CA3', /Cria do Piscinão/i.test(k.claTexto) && k.membros === 3 && /LÍDER/.test(k.claTexto) && d.convites === 1 && d.copiado === `${BASE}/clans/${CLA}#invite=${CONVITE}`.replace('127.0.0.1', new URL(BASE).hostname),
      `clã ${/Cria do Piscinão/i.test(k.claTexto) ? 'com nome' : 'SEM nome'}, ${k.membros} membros (quer 3), ${d.convites} convite gerado, copiado "${d.copiado}"`);
  }
  if (m.semcla) {
    const k = m.semcla.carreira;
    add('CA4', /Sem clã/i.test(k.claTexto) && k.membros === 0 && m.semcla.link === '/clans' && k.primarios.length === 1,
      `sem clã: "${k.claTexto.replace(/\s+/g, ' ').slice(0, 80)}", ${k.membros} membros, ação → ${m.semcla.link || 'nenhuma'}`);
  }
  if (m.en) {
    const vazaEn = (m.en.en.match(PT_VAZA) || [])[0], vazaPt = (m.en.pt.match(EN_VAZA) || [])[0];
    add('IN1', m.en.en.length > 50 && m.en.pt.length > 50 && !vazaEn && !vazaPt, m.en.en.length <= 50 || m.en.pt.length <= 50 ? `sem texto para medir (EN ${m.en.en.length}, PT ${m.en.pt.length} caracteres)` : vazaEn || vazaPt ? `idioma misturado: "${vazaEn || vazaPt}" ${vazaEn ? 'em EN' : 'em PT'}` : 'perfil e carreira sem string do outro idioma');
  }
  if (m.alheio) {
    const a = m.alheio;
    add('PF7', a.perfil.cartao && !a.perfil.editar && !a.abas && a.pedido?.target === OUTRO && /ADICIONAR AMIGO/.test(a.perfil.primarios.join()),
      !a.perfil.cartao ? 'perfil alheio sem cartão Treta Pop' : `perfil alheio: edição ${a.perfil.editar ? 'VAZA' : 'fora'}, abas ${a.abas ? 'VAZAM' : 'fora'}, lima [${a.perfil.primarios}], pedido de amizade ${a.pedido ? `para ${a.pedido.target}` : 'NÃO saiu'}`);
  }
  if (m.telas) {
    const t = m.telas, quebras = [], toque = [];
    for (const [k, v] of Object.entries(t)) {
      if (!v.existe) { quebras.push(`${k}: sem tela`); continue; }
      if (!k.includes(v.vista)) quebras.push(`${k}: abriu ${v.vista}`);
      if (v.rolagem || v.largos.length) quebras.push(`${k}: passa da largura (${v.largos.join(', ') || 'rolagem'})`);
      if (k.startsWith('844') && (v.pequenos.length || v.cb)) toque.push(`${k}: ${v.pequenos.join(', ')}${v.cb ? ` ${v.cb} caixa de marcar` : ''}`);
    }
    add('VP1', !quebras.length, quebras.length ? quebras.join('; ') : `${Object.keys(t).length} telas sem rolagem lateral`);
    add('VP2', !toque.length && t['844x390-perfil']?.existe, toque.length ? `alvo de toque abaixo de 44 px: ${toque.join('; ')}` : '844×390 com toque: todo alvo tem 44 px ou mais');
  }
  if (m.semflag) {
    const s = m.semflag, ruim = Object.entries(s).filter(([, v]) => v.tp || v.gancho || !v.legado || Math.abs(v.largura - 1180) > 1);
    add('SF1', !ruim.length, ruim.length ? ruim.map(([k, v]) => `${k}: tp ${v.tp}, gancho ${v.gancho}, legado ${v.legado}, largura ${v.largura}`).join('; ') : '?ui=legacy mantém o perfil anterior');
  }
  /* VS1: sem conta a tela é o perfil público; o convite é faixa, e o painel de login só abre a pedido. */
  if (m.visitante) {
    const v = m.visitante, erra = [];
    if (!v.cartao || v.cartao.h < 260) erra.push(v.cartao ? `cartão com ${v.cartao.h.toFixed(0)} px de altura` : 'SEM cartão: o visitante não vê o perfil');
    if (v.nick !== 'ZeDoAWP') erra.push(`nick "${v.nick}"`);
    const temV = Object.fromEntries(v.trks.map(([k, x]) => [k.toUpperCase(), x]));
    for (const [k, x] of [['ABATES', '1.284'], ['VITÓRIAS', '97'], ['K/D', '1,42'], ['PARTIDAS', '140'], ['RANKING', '#412'], ['HORAS JOGADAS', '25 h']])
      if (temV[k] !== x) erra.push(`${k}=${temV[k] ?? 'ausente'} (backend ${x})`);
    if (!v.convite) erra.push('sem faixa de convite');
    else if (v.convite.h > 120) erra.push(`convite com ${v.convite.h.toFixed(0)} px de altura (faixa quer até 120)`);
    else if (v.cartao && v.convite.t > v.cartao.t) erra.push('faixa de convite abaixo do perfil');
    if (!v.painel || v.painel.h > 90 || v.painelAberto || v.entradaConta)
      erra.push(`painel de login ${v.painelAberto ? 'ABERTO' : 'recolhido'} com ${(v.painel?.h || 0).toFixed(0)} px e ${v.entradaConta} campos à vista`);
    if (v.editar || v.abas) erra.push('edição ou abas de dono vazando para quem não tem conta');
    if (!v.pedido.painelAberto || !v.pedido.entradaConta || !v.pedido.cartao)
      erra.push(`no clique do convite: painel ${v.pedido.painelAberto ? 'abriu' : 'NÃO abriu'}, ${v.pedido.entradaConta} campos, perfil ${v.pedido.cartao ? 'continua' : 'SUMIU'}`);
    const cel = v.celular;
    if (!cel.existe || cel.rolagem || cel.largo || cel.alvo < 44)
      erra.push(`844×390: faixa ${cel.existe ? 'presente' : 'AUSENTE'}, ${cel.rolagem || cel.largo ? 'passa da largura' : 'cabe'}, alvo de ${cel.alvo.toFixed(0)} px (quer 44+)`);
    add('VS1', !erra.length, erra.length ? erra.join('; ')
      : `visitante vê o perfil público (${v.trks.length} números do backend, ${v.armas.length} armas), convite em faixa de ${v.convite.h.toFixed(0)} px (844×390 cabe, alvo ${v.celular.alvo.toFixed(0)} px) e login recolhido em ${v.painel.h.toFixed(0)} px`);
  }
  /* VS2: servidor sem perfil para o visitante (404) vira estado vazio — nunca zero, nunca painel de login no lugar da tela. */
  if (m.semperfil) {
    const s = m.semperfil, erra = [];
    if (!s.sem) erra.push('sem o estado vazio Treta Pop');
    if (s.cartao) erra.push('desenhou cartão sem perfil no servidor');
    if (s.trks.length || s.barras) erra.push(`${s.trks.length} números e ${s.barras} barras sem dado nenhum`);
    if (/(^|\s)0(\s|$)/.test(s.texto)) erra.push(`mostra zero sem dado: "${s.texto.replace(/\s+/g, ' ').slice(0, 80)}"`);
    if (!s.convite) erra.push('sem faixa de convite');
    if (!s.painel || s.painel.h > 90 || s.painelAberto || s.entradaConta)
      erra.push(`painel de login ${s.painelAberto ? 'ABERTO' : 'recolhido'} com ${(s.painel?.h || 0).toFixed(0)} px e ${s.entradaConta} campos à vista`);
    add('VS2', !erra.length, erra.length ? erra.join('; ')
      : `visitante sem rodada confirmada: estado vazio com convite, sem número inventado, login recolhido em ${s.painel.h.toFixed(0)} px`);
  }
  return r;
}

mkdirSync(OUT, { recursive: true });
let sair = 0;
if (process.argv.includes('--mutantes')) {
  for (const [mut, [alvo]] of Object.entries(MUT).filter(([k]) => !process.env.SO || process.env.SO === k)) {
    const c = (await medir(mut)).find((x) => x.id === alvo);
    if (!c || c.ok) sair = 1;
    console.log(`${!c || c.ok ? 'CEGO  ' : 'MORDE '} ${alvo} (${mut})  ${c?.msg || 'cláusula não mediu'}`);
  }
} else {
  const r = await medir();
  for (const c of r) console.log(`${c.ok ? 'VERDE   ' : 'VERMELHO'} ${c.id}  ${c.msg}`);
  sair = r.every((c) => c.ok) ? 0 : 1;
  console.log(`\nperfil v3: ${r.filter((c) => c.ok).length}/${r.length}  (capturas em ${OUT})`);
}
await browser.close();
process.exit(sair);
