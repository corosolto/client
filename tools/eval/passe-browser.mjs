#!/usr/bin/env node
/* Passe "Sessão da Treta" no lobby real, com o /api/passe do mock (passe-mock.mjs) até o backend publicar.
     PB1 anúncio: abre uma vez por versão no lobby, com a arte da temporada; com conta o CTA leva à tela.
     PB2 tela (desktop 1536×1024): 15 níveis × 5 recompensas, XP, missões; RESGATAR NÍVEL 1 manda só
         {action:'claim', level:1}, o nível vira RESGATADO e o bônus de XP aparece.
     PB3 visitante no celular deitado (844×390): CTA do anúncio abre o convite de login (login-prompt.js);
         a tela do passe cabe sem rolar na horizontal e não tem botão de resgate.
     PB5 funil do painel: com medição permitida sai modal_view e open, uma vez cada; com a recusa
         gravada em cs_privacy não sai nenhum evento.
     PB6 resposta lenta: /api/passe respondendo em 7 s (depois de qualquer prazo curto) ainda abre o anúncio.
     PB7 grade do seletor (UIR44 no navegador): card ocupa a célula, chip ＋ no canto de cima e livre do cadeado.
     PB4 seletor: personagem do passe aparece com cadeado e "Nível N" e não é escolhido; o mesmo id salvo
         no localStorage não entra no lobby; depois do resgate (inventário do servidor) é escolhido.
     PB8 skins de arma: as 15 recompensas mostram o pôster da definição (storePoster) com o nome da skin;
         pôster que não carrega volta ao ícone genérico.
     PB9 bot travado: o ＋ do personagem travado recusa escalar como bot, com o mesmo aviso da escolha.
     PB10 ordem dos anúncios: no 1º acesso o anúncio da Operação Flávio abre antes; ao fechá-lo o do
         passe abre na mesma visita (e fica marcado como visto).
     PB11 auto: a partida automática suprime o anúncio, mas ainda faz GET /api/passe e revela a aba.
   Uso (servidor próprio; um navegador por vez):
     node tools/eval/serve.mjs 9431 &
     BASE=http://127.0.0.1:9431 tools/eval/with-browser-lock.sh node tools/eval/passe-browser.mjs [--mutantes]
   Capturas em OUT (padrão tools/eval/out/passe). */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
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
const CHROME_MAC = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const chromeBin = process.env.CHROME_BIN || (existsSync(CHROME_MAC) ? CHROME_MAC : '');
const browser = await chromium.launch({
  /* CHROME_BIN vence; sem ele, o Chrome do macOS se existir, senão o Chromium do próprio Playwright (Linux/CI) */
  ...(chromeBin ? { executablePath: chromeBin } : {}),
  args: ['--headless=new', '--mute-audio', '--autoplay-policy=no-user-gesture-required'],
});

/* Mutantes reescrevem o que o servidor entrega e precisam derrubar a cláusula que miram. */
const MUTANTES = {
  'passe-modal-repete': ['PB1', /\/js\/passe-anuncio\.js/, (t) => t.replace('  marcarAnuncio();\n', '\n')],
  'personagem-travado-selecionavel': ['PB4', /\/js\/main\.js/, (t) => t.replace("if (personagemTravado(def)) { $('hub-roster-selected')", "if (false) { $('hub-roster-selected')")],
  'analytics-sem-consentimento': ['PB5', /\/js\/passe\.js/, (t) => t.replace(' || !globalThis.__csPrivacy?.allowed()) return;', ') return;')],
  'anuncio-com-prazo': ['PB6', /\/js\/tp\/lobby\.js/, (t) => t.replace('  await esperarPasse();', '  await Promise.race([esperarPasse(), new Promise((r) => setTimeout(r, 4000))]);')],
  'pin-some-no-travado': ['PB7', /\/js\/main\.js/, (t) => t.replace('      if (def.id !== efetivo) {', '      if (def.id !== currentChar) {')],
  'cadeado-sob-o-chip': ['PB7', /\/style\.css/, (t) => t.replace('align-items:flex-end;justify-content:center;gap:4px;padding:0 4px 6px;', 'align-items:flex-start;justify-content:flex-end;gap:4px;padding:8px 6px 0;')],
  'pin-fora-da-celula': ['PB7', /\/style\.css/, (t) => t.replace('.hub-roster-cell--travado>button:not(.hub-roster-pin),', '.hub-roster-cell--travado>button,')],
  'claim-sem-conta': ['PB3', /\/js\/tp\/passe\.js/, (t) => t.replace('if (!s?.authenticated) { entrar(); return; }', '')
    .replace("const primeiro = s.claimable[0];", 'const primeiro = s.claimable[0] || (!s.authenticated && 1);')],
  'premio-sem-poster': ['PB8', /\/js\/tp\/passe\.js/, (t) => t.replace('  if (!skin?.poster) {\n', '  if (true) {\n')],
  'bot-travado-fixado': ['PB9', /\/js\/main\.js/, (t) => t.replace('if (!ehPin && personagemTravado(def)) {', 'if (false) {')],
  'anuncio-desiste': ['PB10', /\/js\/passe-anuncio\.js/, (t) => t.replace('    await semDialogoAberto();\n', '    return null;\n')],
};

/* Personagem do passe ainda fora do roster deste branch (o faction-pipeline monta a facção):
   a régua injeta um com o campo combinado na spec §6, nível 1, no lado E. */
const INJETA_PERSONAGEM = (t) => t.replace('export const CHARACTERS = [',
  "export const CHARACTERS = [\n  { id: 'capitao-caveira', team: 'E', name: 'Capitão Caveira', passe: { season: 'sessao-da-treta-s1', level: 1 },\n    blurb: 'Personagem do passe (régua).', pal: { skin: 0xe8b98a, shirt: 0x222222, pants: 0x222222, hair: 0x111111, boots: 0x111111 } },");

async function abrir({ w = 1536, h = 1024, toque = false, conta = true, mock, mutante = '', personagem = null, anuncioVisto = false, recusaMedicao = false, atrasoMs = 0, flavio = false, posterQuebrado = '', auto = false }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: toque, isMobile: toque, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const erros = [];
  page.on('pageerror', (e) => { if (!/\/\.astro\//.test(e.stack || '')) erros.push(e.message.slice(0, 160)); });
  await page.addInitScript(({ personagem, anuncioVisto, recusaMedicao, flavio }) => {
    localStorage.setItem('awpbr_settings', JSON.stringify({ menuMusic: false, vol: 0, speech: false }));
    localStorage.setItem('cs_lang', 'pt'); localStorage.setItem('awpbr_nick', 'Regua'); localStorage.setItem('cs_treta_intro', 'v1');
    /* flavio: 1º acesso de verdade, o anúncio da Operação Flávio ainda não foi visto e abre antes */
    if (!flavio) localStorage.setItem('csbr-mode-ann-seen', JSON.stringify(['operacao_flavio']));
    localStorage.setItem('cs-javaporcos-cidade-anuncio-v1', '1');
    if (personagem) { localStorage.setItem('csbr-home-character', personagem); localStorage.setItem('csbr-home-side', 'E'); }
    if (anuncioVisto) localStorage.setItem('cs-passe-anuncio', 'sessao-da-treta-s1/1');
    /* recusa gravada no formato do privacy-runtime.js: o funil do passe não pode sair */
    if (recusaMedicao) localStorage.setItem('cs_privacy', JSON.stringify({ version: 'corosolto-analytics-v1', analytics: false }));
  }, { personagem, anuncioVisto, recusaMedicao, flavio });
  /* posterQuebrado: o pôster desta skin responde 404, a recompensa tem de voltar ao ícone */
  if (posterQuebrado) await page.route(`**/img/weapon-skins/${posterQuebrado}.webp`, (r) => r.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' }));
  const posts = [], eventos = [];   // resgates e funil do painel, separados
  let gets = 0;
  await page.route('**/api/passe', async (r) => {
    const req = r.request();
    if (req.method() === 'GET') gets++;
    if (req.method() === 'POST') { const corpo = req.postData() || ''; if (/"action":"analytics"/.test(corpo)) eventos.push(JSON.parse(corpo).event); else posts.push(corpo); }
    if (atrasoMs && req.method() === 'GET') await new Promise((ok) => setTimeout(ok, atrasoMs));
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
    /* O predicado recebe a URL completa; comparar o pathname evita depender de o
       matcher regex casar incidentalmente no origin e deixa a cobertura dos assets explícita. */
    await page.route((u) => teste.test(u.pathname), async (r) => {
      const res = await r.fetch().catch(() => r.fetch());
      const antes = await res.text(), depois = troca(antes);
      if (depois === antes) throw new Error(`mutante ${mutante} não aplicou em ${r.request().url()}`);
      await r.fulfill({ response: res, body: depois });
    });
  }
  await page.goto(`${BASE}/?lang=pt${auto ? '&auto=E,gotinha' : ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => !document.getElementById('splash-enter')?.classList.contains('hidden'), null, { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await entrarNoLobby(page, flavio ? 'flavio' : !anuncioVisto);
  return { page, ctx, posts, eventos, erros, gets };
}

/* Sai do splash e espera o status do passe (aba PASSE visível). O anúncio sai depois que o lobby
   monta; quando ele é esperado, espera por ele, e quando não é, dá o mesmo tempo para ele aparecer. */
async function entrarNoLobby(page, anuncioEsperado) {
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => { const s = document.getElementById('boot-splash'); return !s || s.classList.contains('gone'); }, null, { timeout: 20000 }).catch(() => {});
  await page.waitForSelector('.tp-lobby-esq', { state: 'attached', timeout: 30000 }).catch(() => {});
  await page.waitForSelector('[data-tp-aba="passe"]:not([hidden])', { timeout: 20000 }).catch(() => {});
  if (anuncioEsperado === 'flavio') await page.waitForSelector('dialog.cs-modes-dialog[open]', { timeout: 15000 }).catch(() => {});
  else if (anuncioEsperado) await page.waitForSelector('#passe-anuncio[open]', { timeout: 15000 }).catch(() => {});
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
    const { page, ctx, posts, eventos, erros } = await abrir({ mock, mutante, posterQuebrado: 'arma-02' });
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
    /* PB8: pôster real da skin no cartão; o de arma-02 responde 404 e volta ao ícone */
    await page.waitForFunction(() => {
      const um = document.querySelector('#tp-passe [data-id="arma-01"] img'), dois = document.querySelector('#tp-passe [data-id="arma-02"]');
      return !!dois && (!um || (um.complete && um.naturalWidth > 0)) && (!dois.querySelector('img') || dois.querySelector('img').complete) && !!(um || dois.querySelector('svg'));
    }, null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(200);
    const armas = await page.evaluate(() => {
      const itens = [...document.querySelectorAll('#tp-passe [data-premio="weapon_skin"]')];
      const um = itens.find((i) => i.dataset.id === 'arma-01'), dois = itens.find((i) => i.dataset.id === 'arma-02');
      const img = um?.querySelector('.tp-passe-premio__poster img'), quadro = um?.querySelector('.tp-passe-premio__poster')?.getBoundingClientRect();
      return { total: itens.length, comPoster: itens.filter((i) => i.querySelector(`.tp-passe-premio__poster img[src="/img/weapon-skins/${i.dataset.id}.webp"]`)).length,
        comNome: itens.filter((i) => i.querySelector('.tp-passe-premio__nome')?.textContent.trim()).length,
        um: { nome: um?.querySelector('.tp-passe-premio__nome')?.textContent || '', carregou: !!img?.complete && img.naturalWidth > 0, quadro: quadro ? `${Math.round(quadro.width)}×${Math.round(quadro.height)}` : '0×0', largura: quadro?.width || 0 },
        dois: { icone: !!dois?.querySelector('.tp-passe-premio__icone svg'), img: !!dois?.querySelector('img'), texto: dois?.textContent || '' } };
    });
    add('PB8', armas.total === 15 && armas.comPoster === 14 && armas.comNome === 15 && armas.um.nome === 'Sintonia' && armas.um.carregou && armas.um.largura >= 150
      && armas.dois.icone && !armas.dois.img && /Chuvisco/.test(armas.dois.texto),
      `${armas.total} skins de arma, ${armas.comPoster} com pôster, ${armas.comNome} com nome; arma-01 "${armas.um.nome}" ${armas.um.carregou ? 'carregou' : 'SEM PÔSTER'} num quadro ${armas.um.quadro}; arma-02 com 404: ${armas.dois.icone && !armas.dois.img ? 'ícone' : 'SEM ÍCONE'} "${armas.dois.texto}"`);
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
    add('PB1', anuncio.aberto && anuncio.cta === 'VER O PASSE' && /sessao-da-treta-s1\.webp/.test(anuncio.arte) && !repetiu,
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
    /* UIR44 no navegador: o card ocupa a célula inteira e o chip ＋ fica dentro dela, sem o cadeado por cima */
    const geo = await page.evaluate(() => {
      const r = (e) => e?.getBoundingClientRect();
      const dentro = (a, b) => a && b && a.left >= b.left - 1 && a.right <= b.right + 1 && a.top >= b.top - 1 && a.bottom <= b.bottom + 1;
      const cruza = (a, b) => a && b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      return [...document.querySelectorAll('#hub-roster-grid .hub-roster-cell')].filter((c) => c.checkVisibility?.()).map((c) => {
        const cel = r(c), card = r(c.querySelector(':scope>button:not(.hub-roster-pin)')), pin = r(c.querySelector('.hub-roster-pin')), travaEl = c.querySelector('.hub-roster-trava');
        const trava = travaEl ? (() => { const g = document.createRange(); g.selectNodeContents(travaEl); return g.getBoundingClientRect(); })() : null;
        return { nome: c.textContent.trim().slice(0, 18), travado: c.classList.contains('hub-roster-cell--travado'), larguraIgual: !!card && Math.abs(card.width - cel.width) <= 1,
          temPin: !!pin, pinDentro: !pin || dentro(pin, cel), pinNoTopo: !pin || pin.top < cel.top + cel.height / 3, pinLivre: !pin || !cruza(pin, trava) };
      });
    });
    const ruins = geo.filter((g) => !g.larguraIgual || !g.pinDentro || !g.pinNoTopo || !g.pinLivre);
    const medido = geo.find((g) => /Capitão Caveira/.test(g.nome));   // o personagem do passe injetado tem de estar na conta
    const travadoComPin = medido?.travado && medido.temPin;
    add('PB7', geo.length >= 8 && !ruins.length && !!travadoComPin,
      `${geo.length} células: ${ruins.length ? `fora do lugar ${JSON.stringify(ruins.slice(0, 3))}` : 'card ocupa a célula e o ＋ fica no canto de cima'}; Capitão Caveira ${medido ? (travadoComPin ? 'travado com chip ＋' : 'SEM cadeado ou chip') : 'NÃO MEDIDO'}`);
    await page.evaluate(() => document.querySelector('.hub-roster-cell--travado')?.scrollIntoView({ block: 'center' }));
    await foto(page, 'seletor-travado-desktop', mutante);
    await page.evaluate(() => [...document.querySelectorAll('.hub-roster-cell button')].find((b) => /Capitão Caveira/.test(b.textContent))?.click());
    await page.waitForTimeout(500);
    const depois = await page.evaluate(() => ({ aviso: document.getElementById('hub-roster-selected')?.textContent || '', aberto: !document.getElementById('hub-roster-modal')?.hidden, nome: document.getElementById('hub-character-name')?.textContent || '' }));
    add('PB4', cel.existe && cel.travado && /Nível 1/.test(cel.rotulo) && !/Caveira/.test(lobby) && depois.aberto && /destrava no nível 1/.test(depois.aviso) && !/Caveira/.test(depois.nome),
      `id salvo no navegador -> lobby com "${lobby}"; célula ${cel.existe ? (cel.travado ? `travada "${cel.rotulo}"` : 'LIVRE') : 'ausente'}; clique: "${depois.aviso}", lobby "${depois.nome}"`);
    /* PB9: o ＋ do travado não escala o personagem como bot (seria jogar com ele de graça) */
    await page.evaluate(() => { document.getElementById('hub-roster-selected').textContent = ''; });
    await page.evaluate(() => [...document.querySelectorAll('.hub-roster-cell')].find((c) => /Capitão Caveira/.test(c.textContent))?.querySelector('.hub-roster-pin')?.click());
    await page.waitForTimeout(500);
    const pin = await page.evaluate(() => {
      const cel = [...document.querySelectorAll('.hub-roster-cell')].find((c) => /Capitão Caveira/.test(c.textContent));
      let fixados = [];
      try { fixados = JSON.parse(localStorage.getItem('awpbr_settings') || '{}').pinnedChars || []; } catch { /* sem ajuste salvo */ }
      return { aviso: document.getElementById('hub-roster-selected')?.textContent || '', fixados, chip: cel?.querySelector('.hub-roster-pin')?.textContent || '', pressionado: cel?.querySelector('.hub-roster-pin')?.getAttribute('aria-pressed') };
    });
    await foto(page, 'seletor-bot-travado-recusado', mutante);
    add('PB9', /Capitão Caveira destrava no nível 1/.test(pin.aviso) && !pin.fixados.includes('capitao-caveira') && pin.pressionado !== 'true',
      `＋ no Capitão Caveira travado: aviso "${pin.aviso}"; escalados ${JSON.stringify(pin.fixados)}; chip "${pin.chip}" ${pin.pressionado === 'true' ? 'ESCALADO' : 'livre'}`);
    await ctx.close();
  }
  /* Sessão E: servidor lento, o anúncio espera a resposta em vez de desistir. */
  {
    const mock = mockNoAr({ autenticado: true, xp: 2350, claimed: [] });
    const { page, ctx } = await abrir({ mock, mutante, atrasoMs: 7000 });
    const aberto = await page.evaluate(() => !!document.getElementById('passe-anuncio')?.open);
    add('PB6', aberto, `/api/passe em 7 s: anúncio ${aberto ? 'abriu' : 'NÃO ABRIU (desistiu antes da resposta)'}`);
    await ctx.close();
  }
  /* Sessão F: 1º acesso de verdade, o anúncio da Operação Flávio abre antes do passe. */
  {
    const mock = mockNoAr({ autenticado: false, claimed: [] });
    const { page, ctx, erros } = await abrir({ mock, mutante, conta: false, flavio: true });
    await page.waitForTimeout(2500);   // o status do passe já chegou: o passe está na fila, não na tela
    const antes = await page.evaluate(() => ({ flavio: !!document.querySelector('dialog.cs-modes-dialog[open]'), passe: !!document.getElementById('passe-anuncio')?.open,
      abertos: document.querySelectorAll('dialog[open]').length }));
    await foto(page, 'anuncio-flavio-primeiro', mutante);
    await page.evaluate(() => document.querySelector('dialog.cs-modes-dialog[open] .cs-modes-secundario')?.click());
    /* visitante com nick salvo: o convite de login (login-prompt.js) pode vir entre os dois; o passe espera ele também */
    await page.waitForSelector('#passe-anuncio[open], #login-prompt[open]', { timeout: 8000 }).catch(() => {});
    const convite = await page.evaluate(() => !!document.getElementById('login-prompt')?.open && !document.getElementById('passe-anuncio')?.open);
    if (convite) {
      await page.evaluate(() => document.getElementById('login-prompt-close')?.click());
      await page.waitForSelector('#passe-anuncio[open]', { timeout: 8000 }).catch(() => {});
    }
    await page.waitForTimeout(400);
    const depois = await page.evaluate(() => ({ passe: !!document.getElementById('passe-anuncio')?.open, flavio: !!document.querySelector('dialog.cs-modes-dialog[open]'),
      abertos: document.querySelectorAll('dialog[open]').length, cta: document.querySelector('#passe-anuncio [data-passe-cta]')?.textContent || '', visto: localStorage.getItem('cs-passe-anuncio') }));
    await foto(page, 'anuncio-passe-apos-flavio', mutante);
    add('PB10', antes.flavio && !antes.passe && antes.abertos === 1 && depois.passe && !depois.flavio && depois.abertos === 1 && depois.cta === 'ENTRAR E JOGAR O PASSE' && depois.visto === 'sessao-da-treta-s1/1',
      `1º acesso: Flávio ${antes.flavio ? 'abriu' : 'NÃO ABRIU'}, passe ${antes.passe ? 'EMPILHADO' : 'na fila'} (${antes.abertos} diálogo(s)); fechado o Flávio${convite ? ' e o convite de login' : ''}, passe ${depois.passe ? `abriu "${depois.cta}" sozinho (${depois.abertos} diálogo)` : 'NÃO ABRIU (desistiu)'}, visto=${depois.visto}`);
    add('PB0@flavio', !erros.length, erros.length ? `erros de página: ${erros.join(' | ')}` : 'sem erro de página');
    await ctx.close();
  }
  /* Sessão G: auto inicia a partida sem anúncio, mas ainda precisa descobrir o passe. */
  if (!mutante) {
    const mock = mockNoAr({ autenticado: true, xp: 2350, claimed: [] });
    const { page, ctx, erros, gets } = await abrir({ mock, mutante, auto: true, anuncioVisto: true });
    const estado = await page.evaluate(() => ({
      aba: !!document.querySelector('[data-tp-aba="passe"]:not([hidden])'),
      anuncio: !!document.getElementById('passe-anuncio')?.open,
    }));
    add('PB11', gets > 0 && estado.aba && !estado.anuncio && !erros.length,
      `auto: ${gets} GET /api/passe, aba ${estado.aba ? 'visível' : 'oculta'}, anúncio ${estado.anuncio ? 'ABERTO' : 'suprimido'}${erros.length ? `, erros=${erros.join(' | ')}` : ''}`);
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
