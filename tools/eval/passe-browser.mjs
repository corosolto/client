#!/usr/bin/env node
/* Passe "Sessão da Treta" no lobby real, com o /api/passe do mock (passe-mock.mjs) até o backend publicar.
     PB1 anúncio: abre uma vez por versão no lobby, com a arte da temporada; com conta o CTA leva à tela.
     PB2 tela (desktop 1536×1024): 15 níveis × 5 recompensas, XP, missões; RESGATAR NÍVEL 1 manda só
         {action:'claim', level:1}, o nível vira RESGATADO e o bônus de XP aparece.
     PB3 visitante no celular deitado (844×390): CTA do anúncio abre o convite de login (login-prompt.js);
         a tela do passe cabe sem rolar na horizontal e não tem botão de resgate.
     PB5 funil do painel: com medição permitida sai modal_view e open, uma vez cada; com a recusa
         gravada em cs_privacy não sai nenhum evento.
     PB4 seletor: personagem do passe aparece com cadeado e "Nível N" e não é escolhido; o mesmo id salvo
         no localStorage não entra no lobby; depois do resgate (inventário do servidor) é escolhido.
   Uso (servidor próprio; um navegador por vez):
     node tools/eval/serve.mjs 9431 &
     BASE=http://127.0.0.1:9431 tools/eval/with-browser-lock.sh node tools/eval/passe-browser.mjs [--mutantes]
   Capturas em OUT (padrão tools/eval/out/passe). */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { criarPasseMock } from './passe-mock.mjs';

const BASE = process.env.BASE;
if (!BASE) { console.error('passe BASE=http://127.0.0.1:<porta> explícito'); process.exit(2); }
const OUT = process.env.OUT || 'tools/eval/out/passe';
/* Janela da temporada relativa a hoje: o navegador usa o relógio real, e a régua mede o
   comportamento, não a data em que roda (fora de 05/11 a 10/01 a janela anda junto). */
const DIA = 86400000;
const mockNoAr = (opcoes) => criarPasseMock({
  inicio: Math.min(Date.parse('2026-11-05T03:00:00Z'), Date.now() - 5 * DIA),
  fim: Math.max(Date.parse('2027-01-10T03:00:00Z'), Date.now() + 60 * DIA), ...opcoes,
});
const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio', '--autoplay-policy=no-user-gesture-required'],
});

/* Mutantes reescrevem o que o servidor entrega e precisam derrubar a cláusula que miram. */
const MUTANTES = {
  'passe-modal-repete': ['PB1', /\/js\/passe-anuncio\.js/, (t) => t.replace('  marcarAnuncio();\n', '\n')],
  'personagem-travado-selecionavel': ['PB4', /\/js\/main\.js/, (t) => t.replace("if (personagemTravado(def)) { $('hub-roster-selected')", "if (false) { $('hub-roster-selected')")],
  'analytics-sem-consentimento': ['PB5', /\/js\/passe\.js/, (t) => t.replace(' || !globalThis.__csPrivacy?.allowed()) return;', ') return;')],
  'claim-sem-conta': ['PB3', /\/js\/tp\/passe\.js/, (t) => t.replace('if (!s?.authenticated) { entrar(); return; }', '')
    .replace("const primeiro = s.claimable[0];", 'const primeiro = s.claimable[0] || (!s.authenticated && 1);')],
};

/* Personagem do passe ainda fora do roster deste branch (o faction-pipeline monta a facção):
   a régua injeta um com o campo combinado na spec §6, nível 1, no lado E. */
const INJETA_PERSONAGEM = (t) => t.replace('export const CHARACTERS = [',
  "export const CHARACTERS = [\n  { id: 'capitao-caveira', team: 'E', name: 'Capitão Caveira', passe: { season: 'sessao-da-treta-s1', level: 1 },\n    blurb: 'Personagem do passe (régua).', pal: { skin: 0xe8b98a, shirt: 0x222222, pants: 0x222222, hair: 0x111111, boots: 0x111111 } },");

async function abrir({ w = 1536, h = 1024, toque = false, conta = true, mock, mutante = '', personagem = null, anuncioVisto = false, recusaMedicao = false }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: toque, isMobile: toque, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const erros = [];
  page.on('pageerror', (e) => { if (!/\/\.astro\//.test(e.stack || '')) erros.push(e.message.slice(0, 160)); });
  await page.addInitScript(({ personagem, anuncioVisto, recusaMedicao }) => {
    localStorage.setItem('awpbr_settings', JSON.stringify({ menuMusic: false, vol: 0, speech: false }));
    localStorage.setItem('cs_lang', 'pt'); localStorage.setItem('awpbr_nick', 'Regua'); localStorage.setItem('cs_treta_intro', 'v1');
    localStorage.setItem('csbr-mode-ann-seen', JSON.stringify(['operacao_flavio']));
    localStorage.setItem('cs-javaporcos-cidade-anuncio-v1', '1');
    if (personagem) { localStorage.setItem('csbr-home-character', personagem); localStorage.setItem('csbr-home-side', 'E'); }
    if (anuncioVisto) localStorage.setItem('cs-passe-anuncio', 'sessao-da-treta-s1/1');
    /* recusa gravada no formato do privacy-runtime.js: o funil do passe não pode sair */
    if (recusaMedicao) localStorage.setItem('cs_privacy', JSON.stringify({ version: 'corosolto-analytics-v1', analytics: false }));
  }, { personagem, anuncioVisto, recusaMedicao });
  const posts = [], eventos = [];   // resgates e funil do painel, separados
  await page.route('**/api/passe', async (r) => {
    const req = r.request();
    if (req.method() === 'POST') { const corpo = req.postData() || ''; if (/"action":"analytics"/.test(corpo)) eventos.push(JSON.parse(corpo).event); else posts.push(corpo); }
    const { status, body } = mock.handle(req.method(), req.postData() || '');
    await r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.route((u) => u.pathname === '/api/social-auth', async (r) => {
    const u = new URL(r.request().url());
    if (r.request().method() !== 'GET') return r.fulfill({ status: 400, contentType: 'application/json', body: '{"error":"bad_request"}' });
    if (u.searchParams.get('action') === 'providers') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ providers: ['google', 'discord'], email: true }) });
    const sessao = conta ? { authenticated: true, profile: { id: '00000000-0000-4000-8000-0000000000aa', nick: 'Regua' }, account_verified: true } : { authenticated: false };
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sessao) });
  });
  await page.route('**/js/characters.js*', async (r) => {
    const res = await r.fetch().catch(() => r.fetch());   // o servidor de eval às vezes derruba a conexão sob carga
    await r.fulfill({ response: res, body: INJETA_PERSONAGEM(await res.text()) });
  });
  if (mutante) {
    const [, teste, troca] = MUTANTES[mutante];
    await page.route(teste, async (r) => {
      const res = await r.fetch().catch(() => r.fetch());
      const antes = await res.text(), depois = troca(antes);
      if (depois === antes) throw new Error(`mutante ${mutante} não aplicou em ${r.request().url()}`);
      await r.fulfill({ response: res, body: depois });
    });
  }
  await page.goto(`${BASE}/?lang=pt`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => !document.getElementById('splash-enter')?.classList.contains('hidden'), null, { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await entrarNoLobby(page, !anuncioVisto);
  return { page, ctx, posts, eventos, erros };
}

/* Sai do splash e espera o status do passe (aba PASSE visível). O anúncio sai depois que o lobby
   monta; quando ele é esperado, espera por ele, e quando não é, dá o mesmo tempo para ele aparecer. */
async function entrarNoLobby(page, anuncioEsperado) {
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => { const s = document.getElementById('boot-splash'); return !s || s.classList.contains('gone'); }, null, { timeout: 20000 }).catch(() => {});
  await page.waitForSelector('.tp-lobby-esq', { state: 'attached', timeout: 30000 }).catch(() => {});
  await page.waitForSelector('[data-tp-aba="passe"]:not([hidden])', { timeout: 20000 }).catch(() => {});
  if (anuncioEsperado) await page.waitForSelector('#passe-anuncio[open]', { timeout: 15000 }).catch(() => {});
  else await page.waitForTimeout(6000);
  await page.waitForTimeout(800);
}

const foto = (page, nome, mutante) => (mutante ? null : page.screenshot({ path: `${OUT}/${nome}.png` }));
const vis = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return !!e && e.checkVisibility?.() && e.getBoundingClientRect().width > 0; }, sel);

async function medir(mutante = '') {
  mkdirSync(OUT, { recursive: true });
  const r = [];
  const add = (id, ok, msg) => r.push({ id, ok: !!ok, msg });

  /* Sessão A: desktop, conta com 2.350 XP e nada resgatado. */
  {
    const mock = mockNoAr({ autenticado: true, xp: 2350, claimed: [] });
    const { page, ctx, posts, eventos, erros } = await abrir({ mock, mutante });
    const anuncio = await page.evaluate(() => {
      const d = document.getElementById('passe-anuncio');
      const arte = d?.querySelector('.tp-passe-anuncio__arte');
      return { aberto: !!d?.open, cta: d?.querySelector('[data-passe-cta]')?.textContent || '', arte: arte?.complete && arte.naturalWidth > 0 ? arte.getAttribute('src') : '' };
    });
    await foto(page, 'anuncio-desktop-conta', mutante);
    if (anuncio.aberto) await page.click('#passe-anuncio [data-passe-cta]');
    await page.waitForSelector('#tp-passe[open] .tp-passe-nivel', { timeout: 10000 }).catch(() => {});
    const tela = await page.evaluate(() => {
      const d = document.getElementById('tp-passe');
      const niveis = [...(d?.querySelectorAll('.tp-passe-nivel') || [])];
      return { aberta: !!d?.open, niveis: niveis.length, cinco: niveis.every((n) => n.querySelectorAll('.tp-passe-premio').length === 5),
        personagens: niveis.reduce((s, n) => s + n.querySelectorAll('[data-premio="character"]').length, 0),
        xp: d?.querySelector('.tp-passe__xp-legenda')?.textContent || '', missoes: d?.querySelectorAll('.tp-passe-missao').length || 0,
        resgatar: d?.querySelector('.tp-passe__resgatar')?.textContent || '', aba: !!document.querySelector('[data-tp-aba="passe"]:not([hidden])') };
    });
    add('PB2', tela.aberta && tela.niveis === 15 && tela.cinco && tela.personagens === 30 && /2\.350 \/ 3\.450 XP/.test(tela.xp) && tela.missoes === 7 && tela.aba,
      `tela ${tela.aberta ? 'aberta' : 'FECHADA'}: ${tela.niveis} níveis, ${tela.cinco ? '5 recompensas em todos' : 'nível sem 5 recompensas'}, ${tela.personagens} personagens, XP "${tela.xp}", ${tela.missoes} missões, aba PASSE ${tela.aba ? 'visível' : 'ausente'}`);
    await foto(page, 'passe-desktop-antes', mutante);
    await page.click('.tp-passe__resgatar').catch(() => {});
    await page.waitForSelector('.tp-passe-nivel[data-nivel="1"][data-estado="resgatado"]', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(400);
    const depois = await page.evaluate(() => ({
      n1: document.querySelector('.tp-passe-nivel[data-nivel="1"]')?.dataset.estado,
      boost: document.querySelector('.tp-passe__boost')?.textContent || '', aviso: document.querySelector('.tp-passe__aviso')?.textContent || '',
      proximo: document.querySelector('.tp-passe__resgatar')?.textContent || '',
    }));
    add('PB2@resgate', depois.n1 === 'resgatado' && /\+10% XP/.test(depois.boost) && posts.length === 1 && posts[0] === '{"action":"claim","level":1}' && /NÍVEL 2/.test(depois.proximo),
      `"${tela.resgatar}" -> nível 1 ${depois.n1}; bônus "${depois.boost}"; resgates ${JSON.stringify(posts)}; próximo "${depois.proximo}"; aviso "${depois.aviso}"`);
    add('PB5', JSON.stringify(eventos) === '["modal_view","open"]' && JSON.stringify(mock.eventos) === '["modal_view","open"]',
      `funil com medição permitida: ${JSON.stringify(eventos)} (quer modal_view e open, uma vez cada)`);
    await page.evaluate(() => { document.querySelector('.tp-passe__niveis').scrollLeft = 0; });
    await foto(page, 'passe-desktop', mutante);
    /* PB4: depois do resgate o servidor lista o personagem: o seletor escolhe */
    await page.click('.tp-passe__fechar');
    await page.click('#hub-change-character').catch(() => {});
    await page.waitForSelector('#hub-roster-modal:not([hidden])', { timeout: 8000 }).catch(() => {});
    await page.evaluate(() => [...document.querySelectorAll('#hub-roster-factions button')].find((b) => /TODOS|ALL/.test(b.textContent))?.click());
    await page.waitForTimeout(300);
    const livre = await page.evaluate(() => {
      const cel = [...document.querySelectorAll('.hub-roster-cell')].find((c) => /Capitão Caveira/.test(c.textContent));
      return { existe: !!cel, travado: !!cel?.classList.contains('hub-roster-cell--travado') };
    });
    await page.evaluate(() => [...document.querySelectorAll('.hub-roster-cell button')].find((b) => /Capitão Caveira/.test(b.textContent))?.click());
    await page.waitForTimeout(500);
    const escolhido = await page.evaluate(() => localStorage.getItem('csbr-home-character'));
    add('PB4@destravado', livre.existe && !livre.travado && escolhido === 'capitao-caveira', `após o resgate: célula ${livre.existe ? (livre.travado ? 'AINDA TRAVADA' : 'livre') : 'ausente'}; escolhido ${escolhido}`);
    /* PB1: recarregar não repete o anúncio */
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.getElementById('splash-enter')?.classList.contains('hidden'), null, { timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await entrarNoLobby(page, false);
    const repetiu = await page.evaluate(() => !!document.getElementById('passe-anuncio')?.open);
    add('PB1', anuncio.aberto && anuncio.cta === 'VER O PASSE' && /sessao-da-treta-s1\.svg/.test(anuncio.arte) && !repetiu,
      `anúncio ${anuncio.aberto ? 'abriu' : 'NÃO ABRIU'} (CTA "${anuncio.cta}", arte ${anuncio.arte || 'sem carregar'}); ao recarregar ${repetiu ? 'REPETIU' : 'não repetiu'}`);
    add('PB0@desktop', !erros.length, erros.length ? `erros de página: ${erros.join(' | ')}` : 'sem erro de página');
    await ctx.close();
  }

  /* Sessão B: celular deitado, visitante. */
  {
    const mock = mockNoAr({ autenticado: false, claimed: [] });
    const { page, ctx, posts, eventos, erros } = await abrir({ w: 844, h: 390, toque: true, conta: false, mock, mutante, recusaMedicao: true });
    const anuncio = await page.evaluate(() => ({ aberto: !!document.getElementById('passe-anuncio')?.open, cta: document.querySelector('#passe-anuncio [data-passe-cta]')?.textContent || '' }));
    await foto(page, 'anuncio-celular-visitante', mutante);
    if (anuncio.aberto) await page.click('#passe-anuncio [data-passe-cta]');
    await page.waitForTimeout(800);
    const login = await page.evaluate(() => ({ aberto: !!document.getElementById('login-prompt')?.open, titulo: document.getElementById('login-prompt-title')?.textContent || '' }));
    await foto(page, 'login-celular-visitante', mutante);
    await page.evaluate(() => document.getElementById('login-prompt-close')?.click());
    await page.click('[data-tp-aba="passe"]').catch(() => {});
    await page.waitForSelector('#tp-passe[open] .tp-passe-nivel', { timeout: 10000 }).catch(() => {});
    const tela = await page.evaluate(() => {
      const d = document.getElementById('tp-passe');
      return { aberta: !!d?.open, larguraOk: d ? d.scrollWidth <= innerWidth + 1 : false, resgates: d?.querySelectorAll('[data-resgatar]').length ?? -1,
        entrar: !!d?.querySelector('[data-passe-entrar]'), niveis: d?.querySelectorAll('.tp-passe-nivel').length || 0 };
    });
    await foto(page, 'passe-celular-visitante', mutante);
    await page.click('[data-resgatar]', { timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(500);
    add('PB3', anuncio.aberto && anuncio.cta === 'ENTRAR E JOGAR O PASSE' && login.aberto && /passe/.test(login.titulo) && tela.aberta && tela.larguraOk && tela.niveis === 15 && tela.resgates === 0 && tela.entrar && posts.length === 0,
      `anúncio ${anuncio.aberto ? `"${anuncio.cta}"` : 'NÃO ABRIU'}; login ${login.aberto ? `"${login.titulo}"` : 'NÃO ABRIU'}; tela ${tela.aberta ? 'aberta' : 'FECHADA'}, ${tela.niveis} níveis, ${tela.larguraOk ? 'sem rolagem lateral' : 'ROLA NA HORIZONTAL'}, ${tela.resgates} botão(ões) de resgate, ENTRAR ${tela.entrar ? 'presente' : 'ausente'}; resgates ${posts.length}`);
    add('PB5@recusa', eventos.length === 0, `funil com recusa gravada: ${eventos.length ? `SAIU ${JSON.stringify(eventos)}` : 'nenhum evento'}`);
    add('PB0@celular', !erros.length, erros.length ? `erros de página: ${erros.join(' | ')}` : 'sem erro de página');
    await ctx.close();
  }

  /* Sessão C: celular deitado, conta; Sessão D: seletor com o personagem travado e o id salvo no navegador. */
  {
    const mock = mockNoAr({ autenticado: true, xp: 6400, claimed: [1, 2] });
    const { page, ctx } = await abrir({ w: 844, h: 390, toque: true, mock, mutante, anuncioVisto: true });
    await page.click('[data-tp-aba="passe"]').catch(() => {});
    await page.waitForSelector('#tp-passe[open] .tp-passe-nivel', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(400);
    await foto(page, 'passe-celular', mutante);
    await ctx.close();
  }
  {
    const mock = mockNoAr({ autenticado: true, xp: 400, claimed: [] });
    const { page, ctx } = await abrir({ mock, mutante, personagem: 'capitao-caveira', anuncioVisto: true });
    const lobby = await page.evaluate(() => document.getElementById('hub-character-name')?.textContent || '');
    await page.click('#hub-change-character').catch(() => {});
    await page.waitForSelector('#hub-roster-modal:not([hidden])', { timeout: 8000 }).catch(() => {});
    await page.evaluate(() => [...document.querySelectorAll('#hub-roster-factions button')].find((b) => /TODOS|ALL/.test(b.textContent))?.click());
    await page.waitForTimeout(300);
    const cel = await page.evaluate(() => {
      const c = [...document.querySelectorAll('.hub-roster-cell')].find((x) => /Capitão Caveira/.test(x.textContent));
      return { existe: !!c, travado: !!c?.classList.contains('hub-roster-cell--travado'), rotulo: c?.querySelector('.hub-roster-trava')?.textContent || '' };
    });
    await page.evaluate(() => document.querySelector('.hub-roster-cell--travado')?.scrollIntoView({ block: 'center' }));
    await foto(page, 'seletor-travado-desktop', mutante);
    await page.evaluate(() => [...document.querySelectorAll('.hub-roster-cell button')].find((b) => /Capitão Caveira/.test(b.textContent))?.click());
    await page.waitForTimeout(500);
    const depois = await page.evaluate(() => ({ aviso: document.getElementById('hub-roster-selected')?.textContent || '', aberto: !document.getElementById('hub-roster-modal')?.hidden, nome: document.getElementById('hub-character-name')?.textContent || '' }));
    add('PB4', cel.existe && cel.travado && /Nível 1/.test(cel.rotulo) && !/Caveira/.test(lobby) && depois.aberto && /destrava no nível 1/.test(depois.aviso) && !/Caveira/.test(depois.nome),
      `id salvo no navegador -> lobby com "${lobby}"; célula ${cel.existe ? (cel.travado ? `travada "${cel.rotulo}"` : 'LIVRE') : 'ausente'}; clique: "${depois.aviso}", lobby "${depois.nome}"`);
    await ctx.close();
  }
  return r;
}

let sair = 0;
if (process.argv.includes('--mutantes')) {
  for (const [mut, [alvo]] of Object.entries(MUTANTES)) {
    const rs = (await medir(mut)).filter((x) => x.id === alvo || x.id.startsWith(`${alvo}@`));
    const morde = rs.some((x) => !x.ok);
    if (!morde) sair = 1;
    const c = rs.find((x) => !x.ok) || rs[0] || { msg: 'cláusula não medida' };
    console.log(`${morde ? 'MORDE ' : 'CEGO  '} ${alvo} (${mut})  ${c.msg}`);
  }
} else {
  const r = await medir();
  for (const c of r) console.log(`${c.ok ? 'VERDE   ' : 'VERMELHO'} ${c.id}  ${c.msg}`);
  sair = r.every((c) => c.ok) ? 0 : 1;
  console.log(`\npasse no navegador: ${r.filter((c) => c.ok).length}/${r.length}  (capturas em ${OUT})`);
}
await browser.close();
process.exit(sair);
