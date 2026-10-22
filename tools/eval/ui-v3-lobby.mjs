#!/usr/bin/env node
/* Régua do lobby Treta Pop (telas 02, 18 e 26 de design/treta-pop-2026-10-14) medida no Chrome.
     BASE=http://127.0.0.1:9421 node tools/eval/ui-v3-lobby.mjs [--mutantes]
   Capturas em OUT (padrão tools/eval/out/ui-v3-lobby). Um navegador por vez (with-browser-lock.sh). */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || 'http://127.0.0.1:9421';
const OUT = process.env.OUT || 'tools/eval/out/ui-v3-lobby';
const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio', '--autoplay-policy=no-user-gesture-required'],
});

/* Loja no ar só no teste: a resposta do /api/treta de uma campanha ativa, para o painel de quests ter o que espelhar. */
const TRETA = {
  authenticated: false,
  campaign: { starts_at: '2026-01-01T00:00:00Z', ends_at: '2099-01-01T00:00:00Z', email_reward: 50, referral_reward: 100,
    referral_cap: 3, sp_reward: 10, mp_reward: 20, daily_match_cap: 60 },
  quests: { email: 0, referral: 1, singleplayer: 2, multiplayer: 0 },
  /* Skin de AK equipada: o personagem do lobby tem de segurar a AK com essa pintura (LB20). */
  inventory: [{ skin_id: 'estrela-vermelha-ak', equipped: true }, { skin_id: 'luvas-tropicalente', equipped: true }],
  catalog: [
    { id: 'estrela-vermelha-ak', available: true, slot: 'weapon', weapon_id: 'ak', price: 500, model_path: '/models/weapons/ak.glb' },
    { id: 'luvas-tropicalente', available: true, slot: 'glove', weapon_id: null, price: 350, model_path: '/models/viewmodels/coro/hands' },
  ],
};

/* Mutantes reescrevem o que o servidor entrega; cada um prova que aplicou (texto antes != depois). */
const MUTANTES = {
  'abas-velhas': [/\/css\/tp\/lobby\.css/, (t) => t.replace(':root[data-ui="v3"] .hub-header .hub-tabs{display:none}', '')],
  'ajustes-mudo': [/\/js\/tp\/lobby\.js/, (t) => t.replace("const rotuloAjustes = no('span', 'tp-lobby-hdr__rotulo', tr('AJUSTES'));", "const rotuloAjustes = '';")],
  'confirma-de-novo': [/\/js\/tp\/lobby\.js/, (t) => t.replace("if (!e.target.closest?.('#btn-jogar')) return;", 'return;')],
  'convidado-bloqueado': [/\/js\/tp\/lobby\.js/, (t) => t.replace("if (!e.target.closest?.('#btn-jogar')) return;", "if (!e.target.closest?.('#btn-jogar') || !($('nick-input')?.value || '').trim()) return;")],
  'enter-do-splash': [/\/js\/tp\/lobby\.js/, (t) => t.replace("if (e.key !== 'Enter' || e.repeat || e.defaultPrevented ||", "if (e.key !== 'Enter' || e.repeat ||")],
  'personagem-no-canto': [/\/css\/tp\/lobby\.css/, (t) => t.replace('left:calc(50% - 290px);right:auto;', '')],
  'convite-mudo': [/\/js\/tp\/lobby\.js/, (t) => t.replace("if (menu()?.dataset.hubNet !== 'mp') $('hub-mp')?.click();", 'return;')],
  'erro-mudo': [/\/js\/tp\/lobby\.js/, (t) => t.replace("if (estado?.dataset.s === 'erro') { mostrarAviso(tr('O multiplayer não respondeu agora. Tente de novo em um minuto.')); return; }", "if (estado?.dataset.s === 'erro') return;")],
  'quest-inventada': [/\/js\/tp\/lobby\.js/, (t) => t.replace("const recompensa = card.querySelector('strong')?.textContent || '';", "const recompensa = 'T$ 10';")],
  'passe-sem-backend': [/\/js\/tp\/lobby\.js/, (t) => t.replace('const ABAS = [', "const ABAS = [{ id: 'passe', rotulo: 'PASSE', ir: () => {} },")],
  'rede-trocada': [/\/js\/tp\/lobby\.js/, (t) => t.replace("['privada', 'PRIVADA', () => { $('hub-mp')?.click(); $('hub-mp-private')?.click(); }]", "['privada', 'PRIVADA', () => { $('hub-mp')?.click(); $('hub-mp-public')?.click(); }]")],
  'coluna-larga': [/\/css\/tp\/lobby\.css/, (t) => t.replace('--tp-lobby-coluna:380px;', '--tp-lobby-coluna:760px;')],
  'toque-baixo': [/\/css\/tp\/lobby\.css/, (t) => t.replace('--tp-lobby-toque:44px;', '--tp-lobby-toque:30px;')],
  'sem-traducao': [/\/js\/i18n\.js/, (t) => t.replace("'ARMÁRIO': 'LOCKER',", '')],
  'arma-sem-skin': [/\/js\/main\.js/, (t) => t.replace('weaponId: arma.weaponId, weaponSkinId: arma.weaponSkinId, preview: true', 'weaponId: arma.weaponId, weaponSkinId: null, preview: true')],
  'flag-vaza': [/\/js\/main\.js/, (t) => t.replace("if (document.documentElement.dataset.ui === 'v3') {\n  import('./splash-v3.js')", "if (true) {\n  import('./splash-v3.js')")],
  'gire-sem-arte': [/\/css\/tp\/lobby\.css/, (t) => t.replace("url('/img/loading-1.webp') 30% 50%/cover", 'none')],
  'mais-sem-feedback': [/\/js\/tp\/lobby\.js/, (t) => t.replace("{ id: 'feedback', rotulo: 'FEEDBACK', ir: () => abaDoHub('feedback') },", '')],
  'chip-sem-nome': [/\/css\/tp\/lobby\.css/, (t) => t.replace(':root[data-ui="v3"] #hub-footer-social .mf-social svg{display:block;width:15px;height:15px}', ':root[data-ui="v3"] #hub-footer-social .mf-social svg{display:none;width:15px;height:15px}')],
  'dois-limas': [/\/css\/tp\/lobby\.css/, (t) => t.replace('.tp-lobby-rede__opcao[aria-pressed="true"]{background:var(--tp-tinta-1)', '.tp-lobby-rede__opcao[aria-pressed="true"]{background:var(--tp-lima)')],
  'skins-mudas': [/\/js\/tp\/lobby\.js/, (t) => t.replace('.filter((s) => s && s.poster)', '.slice(0, 0).filter((s) => s && s.poster)')],
};

async function abrir({ w = 1536, h = 1024, lang = 'pt', flag = true, toque = false, mutante = '', loja = true, sairSplash = true, nick = 'Regua' }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: toque, isMobile: toque, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.addInitScript((valor) => { try { if (valor) localStorage.setItem('awpbr_nick', valor); else localStorage.removeItem('awpbr_nick'); } catch { /* sem storage */ } }, nick);
  if (loja) await page.route('**/api/treta**', (r) => (r.request().method() === 'GET'
    ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TRETA) }) : r.continue()));
  if (mutante) {
    const [teste, troca] = MUTANTES[mutante];
    await page.route(teste, async (r) => {
      /* o servidor de eval às vezes derruba a conexão sob carga: uma segunda tentativa antes de reprovar */
      const res = await r.fetch().catch(() => r.fetch());
      const antes = await res.text();
      const depois = troca(antes);
      if (depois === antes) throw new Error(`mutante ${mutante} não aplicou em ${r.request().url()}`);
      await r.fulfill({ response: res, body: depois });
    });
  }
  await page.goto(`${BASE}/?${flag ? '' : 'ui=legacy&'}lang=${lang}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => !document.getElementById('splash-enter')?.classList.contains('hidden'), null, { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1200);
  if (sairSplash) {
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => { const s = document.getElementById('boot-splash'); return !s || s.classList.contains('gone'); }, null, { timeout: 20000 }).catch(() => {});
    if (flag) await page.waitForSelector('.tp-lobby-esq', { state: 'attached', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2500);
  }
  return { page, ctx };
}

/* Caixas visíveis do lobby, para colisão e limites da tela. */
const CAIXAS = () => {
  const vis = (e) => e && e.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true }) && e.getBoundingClientRect().width > 0;
  const caixa = (e) => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
  const uniao = (els) => {
    const bs = els.filter(vis).map(caixa);
    return bs.length ? { l: Math.min(...bs.map((x) => x.l)), t: Math.min(...bs.map((x) => x.t)), r: Math.max(...bs.map((x) => x.r)), b: Math.max(...bs.map((x) => x.b)) } : null;
  };
  const q = (s) => document.querySelector(s);
  const qa = (s) => [...document.querySelectorAll(s)];
  return {
    cabecalho: uniao(qa('#hub-ui .hub-header > *, #hub-ui .hub-header .hub-identity-wrap > *')),
    esquerda: uniao(qa('.tp-lobby-esq > *')),
    direita: uniao(qa('.tp-lobby-dir > *')),
    partida: uniao(qa('#menu-setup .pane-match > *').filter((e) => e.id !== 'hub-sels' || getComputedStyle(e).position !== 'fixed')),
    opcoes: (() => { const s = q('#hub-sels'); return s && getComputedStyle(s).position === 'fixed' && vis(s) ? caixa(s) : null; })(),
    nome: vis(q('#hub-change-character')) ? caixa(q('#hub-change-character')) : null,
    rodape: uniao(qa('#hub-ui .hub-footer > *')),
    temParty: vis(document.getElementById('tp-lobby-party')),
    /* a caixa sozinha não basta: o palco 3D (ou o retrato estático) tem que estar desenhado nela */
    personagem: vis(q('.hub-character')) && (vis(q('#char-preview')) || vis(q('#char-preview-static'))) ? caixa(q('.hub-character')) : null,
    vw: innerWidth, vh: innerHeight,
  };
};

function colisoes(c) {
  /* vagaEsq/vagaDir saíram com os slots vazios (22/10). */
  const nomes = ['cabecalho', 'esquerda', 'direita', 'partida', 'opcoes', 'nome', 'rodape'];
  const out = [];
  const cruza = (a, b) => a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1;
  for (const n of nomes) {
    const a = c[n];
    if (a && (a.l < -1 || a.t < -1 || a.r > c.vw + 1 || a.b > c.vh + 1)) out.push(`${n} sai da tela`);
  }
  for (let i = 0; i < nomes.length; i++) for (let j = i + 1; j < nomes.length; j++) {
    const a = c[nomes[i]], b = c[nomes[j]];
    if (a && b && cruza(a, b)) out.push(`${nomes[i]} × ${nomes[j]}`);
  }
  /* o personagem pode passar por trás das vagas, nunca por baixo das colunas */
  for (const n of ['esquerda', 'direita', 'partida', 'opcoes']) if (c.personagem && c[n] && cruza({ ...c.personagem, l: c.personagem.l + 40, r: c.personagem.r - 40 }, c[n])) out.push(`personagem × ${n}`);
  return out;
}

async function medir(mutante = '', alvo = '') {
  const r = [];
  const add = (id, ok, msg) => r.push({ id, ok: !!ok, msg });
  const quer = (...ids) => !alvo || ids.includes(alvo);
  mkdirSync(OUT, { recursive: true });
  const foto = async (page, nome) => { if (!mutante) await page.screenshot({ path: `${OUT}/${nome}.png` }); };

  /* Sessão A: 3:2 do dono, PT, loja no ar. */
  if (quer('LB1', 'LB2', 'LB3', 'LB5', 'LB6', 'LB7', 'LB8', 'LB9', 'LB10', 'LB15', 'LB16', 'LB17', 'LB19', 'LB20')) {
    const { page, ctx } = await abrir({ mutante });
    await page.evaluate(() => document.fonts.ready);
    await foto(page, 'lobby-1536x1024-pt');
    const a = await page.evaluate(() => {
      const vis = (e) => !!e && e.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true }) && e.getBoundingClientRect().width > 0;
      const abas = [...document.querySelectorAll('.hub-header [data-tp-aba]')].filter(vis).map((e) => e.textContent.trim());
      const velhas = [...document.querySelectorAll('.hub-header .hub-tabs [data-hub-tab]')].filter(vis).length;
      const cab = [...document.querySelectorAll('.hub-header *')].filter(vis).map((e) => e.textContent).join(' ');
      const aj = document.getElementById('hub-settings');
      const rot = aj?.querySelector('.tp-lobby-hdr__rotulo');
      const fonte = rot ? getComputedStyle(rot).fontFamily : '';
      const anton = document.querySelector('[data-tp-aba]') ? getComputedStyle(document.querySelector('[data-tp-aba]')).fontFamily : '';
      const palco = vis(document.getElementById('char-preview')) || vis(document.getElementById('char-preview-static'));
      const heroi = palco ? document.querySelector('.hub-character')?.getBoundingClientRect() : null;
      const quests = [...document.querySelectorAll('#tp-lobby-quests [data-tp-quest]')].filter(vis).map((e) => ({
        id: e.dataset.tpQuest, nome: e.querySelector('.tp-lobby-quest__nome')?.textContent, premio: e.querySelector('.tp-lobby-quest__premio')?.textContent,
        barra: e.querySelector('.tp-lobby-quest__barra')?.dataset.p ?? null,
      }));
      const fonteQuests = [...document.querySelectorAll('#treta-quests [data-quest]')].map((e) => ({ id: e.dataset.quest, nome: e.querySelector('h4')?.textContent, premio: e.querySelector('strong')?.textContent, prog: e.querySelector('small')?.textContent }));
      const amigos = document.getElementById('tp-lobby-online-amigos');
      const lobbyTxt = [...document.querySelectorAll('.tp-lobby-esq, .tp-lobby-dir, .hub-header, #tp-lobby-rede, #tp-lobby-partida, .tp-lobby-vaga, #hub-change-character')].filter(vis).map((e) => e.innerText).join(' ');
      const vagas = [...document.querySelectorAll('.tp-lobby-vaga')].filter(vis).map((v) => v.querySelector('button')?.textContent.trim());
      const chips = [...document.querySelectorAll('#hub-footer-social .mf-social a')].filter(vis).map((a) => { const icone = a.querySelector('svg'); return { nome: a.getAttribute('aria-label') || a.textContent.trim(), icone: !!icone && getComputedStyle(icone).display !== 'none' }; });
      /* fundo lima só conta em controle: o risco das abas e a moeda do T$ são marca, não ação */
      const limas = [...document.querySelectorAll('#main-menu button, #main-menu a, #main-menu [role="button"]')].filter((e) => vis(e) && e.getBoundingClientRect().height > 10
        && /rgb\(180, 217, 46\)/.test(getComputedStyle(e).backgroundColor)).map((e) => e.id || e.className || e.tagName);
      return { abas, velhas, cab, rotulo: aj?.innerText.trim() || '', fonte, anton, fontesOk: document.fonts.check('700 15px "Barlow Semi Condensed"') && document.fonts.check('21px "Anton"'),
        heroiX: heroi ? (heroi.left + heroi.right) / 2 : -1, vw: innerWidth, quests, fonteQuests,
        amigosLinhas: amigos ? amigos.querySelectorAll('[data-amigo], li, img').length : -1, amigosVazio: amigos?.querySelector('.tp-lobby-vazio')?.textContent || '',
        lobbyTxt, vagas, chips, limas, net: document.getElementById('main-menu').dataset.hubNet };
    });
    const c = await page.evaluate(CAIXAS);
    const ABAS = ['JOGAR', 'LOJA', 'ARMÁRIO', 'CARREIRA', 'CLÃ'];
    add('LB1', JSON.stringify(a.abas) === JSON.stringify(ABAS) && !a.velhas,
      `abas visíveis: ${a.abas.join(' · ') || 'nenhuma'}${a.velhas ? `; ${a.velhas} abas antigas ainda visíveis` : ''} (quer ${ABAS.join(' · ')})`);
    add('LB2', /AJUSTES/.test(a.rotulo) && /^"?Barlow Semi Condensed/.test(a.fonte) && /^"?Anton/.test(a.anton) && a.fontesOk,
      `ajustes: "${a.rotulo || '⚙ sem rótulo'}" em ${a.fonte || '?'}; abas em ${a.anton || '?'}; fontes ${a.fontesOk ? 'carregadas' : 'não carregadas'}`);
    const desvio = Math.abs(a.heroiX - a.vw / 2) / a.vw;
    const col1536 = colisoes(c);
    add('LB5@1536', a.heroiX > 0 && desvio <= 0.03 && !col1536.some((x) => x.startsWith('personagem')), `personagem com centro em ${a.heroiX.toFixed(0)} px de ${a.vw} (desvio ${(desvio * 100).toFixed(1)}%)${col1536.filter((x) => x.startsWith('personagem')).map((x) => `; ${x}`).join('')}`);
    /* 22/10: os dois slots vazios saíram (revisão do pacote); o convite é UM botão
       só, em toda largura. A cláusula agora cobra o inverso do que cobrava. */
    add('LB6@1536', a.vagas.length === 0 && c.temParty, `slots vazios: ${a.vagas.length} (quer 0) · botão único de party ${c.temParty ? 'presente' : 'AUSENTE'}`);
    const esperado = a.fonteQuests.map((q) => q.id).join(',');
    const premioErrado = a.quests.filter((q) => q.premio !== a.fonteQuests.find((f) => f.id === q.id)?.premio).map((q) => q.id);
    const barraSemFracao = a.quests.filter((q) => q.barra !== null && ['singleplayer', 'multiplayer'].includes(q.id)).map((q) => q.id);
    add('LB7', a.fonteQuests.length >= 1 && a.quests.map((q) => q.id).join(',') === esperado && !premioErrado.length && !barraSemFracao.length,
      `${a.quests.length} quests no lobby, ${a.fonteQuests.length} na loja${premioErrado.length ? `; prêmio diverge em ${premioErrado.join(',')}` : ''}${barraSemFracao.length ? `; barra inventada em ${barraSemFracao.join(',')}` : ''}`);
    const inventado = (a.lobbyTxt.match(/PASSE|NÍVEL|PRIMEIRA VITÓRIA|renovam|\b\d{2}:\d{2}:\d{2}\b/) || [])[0];
    add('LB8', !inventado && a.amigosLinhas === 0 && a.amigosVazio.length > 10,
      inventado ? `número ou sistema sem backend na tela: "${inventado}"` : a.amigosLinhas ? `${a.amigosLinhas} amigo(s) listado(s) sem presença no backend` : a.amigosVazio ? 'sem passe, nível ou timer; amigos online em estado vazio' : 'painel de amigos online ausente');
    add('LB16', a.chips.length >= 4 && a.chips.every((c) => c.nome && c.icone), `redes no rodapé: ${a.chips.map((c) => c.nome || '?').join(' · ') || 'nenhuma'} (quer 4+ ícones com nome acessível)`);
    add('LB17', a.limas.length === 1 && /btn-jogar/.test(a.limas[0]), `fundos lima: ${a.limas.join(', ') || 'nenhum'} (quer só o JOGAR)`);

    /* MAIS: sobre, feedback e apoie saíram das abas; o item leva à seção certa e o ESC fecha. */
    let mais = { itens: [], foi: '', fechou: false };
    if (quer('LB15') && await page.locator('#tp-lobby-mais').count()) {
      await page.click('#tp-lobby-mais');
      await page.waitForTimeout(300);
      mais.itens = await page.$$eval('#tp-lobby-mais-menu [data-tp-mais]', (es) => es.filter((e) => e.checkVisibility()).map((e) => e.textContent.trim()));
      const fb = page.locator('#tp-lobby-mais-menu [data-tp-mais="feedback"]');
      if (await fb.count()) { await fb.click(); await page.waitForTimeout(400); }
      mais.foi = await page.evaluate(() => document.getElementById('main-menu').dataset.hubTab);
      await page.click('#tp-lobby-mais'); await page.waitForTimeout(200);
      await page.keyboard.press('Escape'); await page.waitForTimeout(200);
      mais.fechou = await page.evaluate(() => document.getElementById('tp-lobby-mais-menu')?.hidden === true);
      await page.click('[data-tp-aba="jogar"]'); await page.waitForTimeout(500);
    }
    const faltam = ['SOBRE O JOGO', 'FEEDBACK', 'APOIE O JOGO'].filter((t) => !mais.itens.includes(t));
    add('LB15', !faltam.length && mais.foi === 'feedback' && mais.fechou,
      faltam.length ? `MAIS sem ${faltam.join(', ')}` : `MAIS: ${mais.itens.join(' · ')}; FEEDBACK abre ${mais.foi || '?'}; ESC ${mais.fechou ? 'fecha' : 'não fecha'}`);

    /* Rede: cada botão leva o hub ao estado certo. */
    let rede = 'sem controle';
    if (quer('LB9') && await page.locator('#tp-lobby-rede').count()) {
      const passos = [];
      for (const [b, net, tab] of [['mp', 'mp', 'public'], ['privada', 'mp', 'private'], ['sp', 'sp', null]]) {
        const sel = `[data-tp-rede="${b}"]`;
        if (b === 'sp') await page.evaluate(() => document.getElementById('hub-sp')?.click()); else if (await page.locator(sel).isVisible()) await page.click(sel); else await page.evaluate((s) => document.querySelector(s)?.click(), sel);
        await page.waitForTimeout(500);
        const st = await page.evaluate((s) => ({ net: document.getElementById('main-menu').dataset.hubNet, tab: document.getElementById('main-menu').dataset.hubMpTab, pressed: document.querySelector(s)?.getAttribute('aria-pressed') }), sel);
        passos.push(st.net === net && (!tab || st.tab === tab) && st.pressed === 'true' ? '' : `${b}: net=${st.net} tab=${st.tab} pressed=${st.pressed}`);
      }
      rede = passos.filter(Boolean).join('; ');
    }
    add('LB9', rede === '', rede || 'VS BOTS, MULTIPLAYER e PRIVADA levam o hub ao estado certo e marcam aria-pressed');

    /* Arma equipada NA MÃO do personagem do lobby: o preview monta a arma que o jogador
       equipou, com a pintura dela. O canvas 3D não se lê, então o que foi montado vira
       dataset (main.js/pvSetChar) - é isso que esta cláusula mede. */
    let arma = { glb: '', id: '', skin: '' };
    if (quer('LB20')) {
      await page.waitForTimeout(1200);
      arma = await page.evaluate(() => {
        const cv = document.getElementById('char-preview');
        return { glb: cv?.dataset.glb || '', id: cv?.dataset.arma || '', skin: cv?.dataset.armaSkin || '' };
      });
    }
    /* Novidades de skins: pôster carregado em cada card e o clique abre a loja no detalhe. */
    let skins = { dados: [], abriu: false };
    if (quer('LB19')) {
      skins.dados = await page.evaluate(() => [...document.querySelectorAll('#tp-lobby-skins .tp-lobby-skins__cartao')]
        .filter((e) => e.checkVisibility())
        .map((e) => ({ id: e.dataset.skin, nome: e.querySelector('.tp-lobby-skins__nome')?.textContent || '', poster: (e.querySelector('.tp-lobby-skins__poster')?.naturalWidth || 0) > 0 })));
      if (skins.dados.length) {
        await page.click('#tp-lobby-skins .tp-lobby-skins__cartao');
        await page.waitForTimeout(700);
        skins.abriu = await page.evaluate(() => document.getElementById('main-menu').dataset.hubTab === 'loja' && document.getElementById('treta-detail')?.open === true);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        await page.click('[data-tp-aba="jogar"]');
        await page.waitForTimeout(400);
      }
    }
    add('LB20', arma.glb === '1' && arma.id === 'ak' && arma.skin === 'estrela-vermelha-ak',
      `preview monta arma='${arma.id || 'nenhuma'}' pintura='${arma.skin || 'nenhuma'}'${arma.glb === '1' ? '' : ' (sem GLB real)'}`);
    const skinsErradas = skins.dados.filter((s) => !s.nome || !s.poster).map((s) => s.id);
    add('LB19', skins.dados.length >= 5 && !skinsErradas.length && skins.abriu,
      `${skins.dados.length} cards de skins${skinsErradas.length ? `; sem pôster/nome: ${skinsErradas.join(', ')}` : ''}; clique ${skins.abriu ? 'abre a loja no detalhe' : 'não abriu o detalhe'}`);

    let convite = { net: '', pediu: false }, avisoErro = '';
    if (quer('LB6') && await page.locator('#tp-lobby-party').count()) {
      await page.evaluate(() => {
        window.__pediuSala = false;
        document.getElementById('mp-amigos')?.addEventListener('click', (e) => { window.__pediuSala = true; e.stopImmediatePropagation(); e.preventDefault(); }, true);
        document.getElementById('mp-estado')?.removeAttribute('data-s');
      });
      await page.locator('#tp-lobby-party').first().click();
      await page.waitForFunction(() => window.__pediuSala || document.getElementById('mp-estado')?.dataset.s === 'erro', null, { timeout: 15000 }).catch(() => {});
      convite = await page.evaluate(() => ({ net: document.getElementById('main-menu').dataset.hubNet, pediu: window.__pediuSala, s: document.getElementById('mp-estado')?.dataset.s }));
      await page.keyboard.press('Escape');
      /* fora do ar o sonda não decide: força o erro e cobra o aviso visível do convite */
      await page.evaluate(() => {
        const est = document.getElementById('mp-estado');
        window.__avisoErro = '';
        const espia = new MutationObserver(() => { const t = document.querySelector('.tp-lobby-avisos .tp-toast'); if (t?.textContent) window.__avisoErro = t.textContent; });
        espia.observe(document.body, { childList: true, subtree: true });
        window.__forcaErro = setInterval(() => est?.setAttribute('data-s', 'erro'), 50);
      });
      await page.evaluate(() => document.querySelector('[data-tp-aba="jogar"]')?.click());
      await page.waitForTimeout(300);
      await page.evaluate(() => document.getElementById('tp-lobby-party')?.click());
      await page.waitForTimeout(1500);
      avisoErro = await page.evaluate(() => { clearInterval(window.__forcaErro); return window.__avisoErro || ''; });
      await page.evaluate(() => document.getElementById('hub-sp')?.click());
      await page.waitForTimeout(500);
    }
    add('LB6', convite.net === 'mp' && (convite.pediu || convite.s === 'erro') && avisoErro.length > 10,
      `+ CONVIDAR: rede ${convite.net || '?'}, sala por código ${convite.pediu ? 'pedida' : convite.s === 'erro' ? 'sem servidor' : 'não pedida'}; sem servidor o aviso ${avisoErro ? `"${avisoErro.slice(0, 36)}"` : 'NÃO aparece'}`);

    /* JOGAR direto, sem o "Pronto pra treta?". */
    let jogo = {};
    if (quer('LB3')) {
      await page.click('#btn-jogar');
      await page.waitForTimeout(2500);
      jogo = await page.evaluate(() => ({ quick: document.getElementById('hub-quick')?.hidden, menu: document.getElementById('main-menu')?.classList.contains('hidden'),
        carga: !document.getElementById('load-overlay')?.classList.contains('hidden'), jogo: !!window.__game }));
      await foto(page, 'jogar-1536x1024');
    }
    add('LB3', jogo.quick === true && (jogo.menu || jogo.carga || jogo.jogo), `JOGAR: confirmação ${jogo.quick === false ? 'aberta' : 'fechada'}, partida ${jogo.menu || jogo.carga || jogo.jogo ? 'começou' : 'não começou'}`);
    await ctx.close();
  }

  /* Sessão convidado: JOGAR continua disponível e começa a partida sem nickname. */
  if (quer('LB18')) {
    const { page, ctx } = await abrir({ mutante, nick: '' });
    const antes = await page.evaluate(() => ({
      nick: document.getElementById('nick-input')?.value || '',
      disabled: document.getElementById('btn-jogar')?.getAttribute('aria-disabled'),
    }));
    await page.evaluate(() => document.getElementById('btn-jogar')?.click());
    await page.waitForTimeout(2500);
    const depois = await page.evaluate(() => ({
      quick: document.getElementById('hub-quick')?.hidden,
      perfil: document.getElementById('menu-setup')?.dataset.step,
      menu: document.getElementById('main-menu')?.classList.contains('hidden'),
      carga: !document.getElementById('load-overlay')?.classList.contains('hidden'),
      jogo: !!window.__game,
    }));
    add('LB18', antes.nick === '' && antes.disabled === 'false' && depois.quick === true && depois.perfil !== 'profile' && (depois.menu || depois.carga || depois.jogo),
      `convidado: JOGAR aria-disabled=${antes.disabled}; destino ${depois.perfil === 'profile' ? 'perfil' : depois.quick === false ? 'confirmação' : depois.menu || depois.carga || depois.jogo ? 'partida' : 'lobby'}`);
    await ctx.close();
  }

  /* Sessão B: o ENTER do splash não inicia partida; o ENTER no lobby inicia. */
  if (quer('LB4')) {
    /* sem foco em botão: só a guarda do próprio ENTER pode segurar a partida */
    const { page, ctx } = await abrir({ mutante, sairSplash: false });
    await page.evaluate(() => document.activeElement?.blur?.());
    await page.keyboard.press('Enter');
    await page.waitForSelector('.tp-lobby-esq', { state: 'attached', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const depoisDoSplash = await page.evaluate(() => ({ menu: !document.getElementById('main-menu').classList.contains('hidden'), carga: !document.getElementById('load-overlay')?.classList.contains('hidden') }));
    await page.evaluate(() => document.activeElement?.blur?.());
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2500);
    const depois = await page.evaluate(() => ({ menu: document.getElementById('main-menu').classList.contains('hidden'), carga: !document.getElementById('load-overlay')?.classList.contains('hidden'), quick: document.getElementById('hub-quick')?.hidden }));
    add('LB4', depoisDoSplash.menu && !depoisDoSplash.carga && (depois.menu || depois.carga) && depois.quick,
      `ENTER do splash: ${depoisDoSplash.menu && !depoisDoSplash.carga ? 'fica no lobby' : 'iniciou partida'}; ENTER no lobby: ${depois.menu || depois.carga ? 'inicia' : 'nada'}`);
    await ctx.close();
  }

  /* Sessão C/D: as outras telas do dono e o celular deitado. */
  for (const [w, h, toque] of [[1920, 1080, false], [1280, 720, false], [844, 390, true]]) {
    if (!quer('LB5', 'LB6', 'LB10', 'LB11', 'LB14')) break;
    if (alvo === 'LB11' && w !== 844) continue;
    const { page, ctx } = await abrir({ w, h, toque, mutante });
    await foto(page, `lobby-${w}x${h}-pt`);
    const c = await page.evaluate(CAIXAS);
    const m = await page.evaluate(() => {
      const vis = (e) => !!e && e.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true }) && e.getBoundingClientRect().width > 0;
      const party = document.getElementById('tp-lobby-party');
      const pequenos = [...document.querySelectorAll('.hub-header button, .hub-header a, .tp-lobby-esq button, .tp-lobby-esq a, .tp-lobby-dir button, .tp-lobby-dir a, #menu-setup button, #tp-lobby-partida, #tp-lobby-party')]
        .filter((e) => vis(e) && !e.closest('[hidden]')).map((e) => { const b = e.getBoundingClientRect(); return { n: e.id || e.dataset.tpAba || e.className || e.tagName, w: b.width, h: b.height }; })
        .filter((x) => x.w < 43.5 || x.h < 43.5);
      const gire = document.getElementById('rotate-prompt');
      return { vagas: [...document.querySelectorAll('.tp-lobby-vaga')].filter(vis).length, party: vis(party), eu: party?.querySelectorAll('.tp-lobby-party__eu img').length || 0, pequenos, gire: vis(gire) };
    });
    const desvio = c.personagem ? Math.abs((c.personagem.l + c.personagem.r) / 2 - c.vw / 2) / c.vw : 1;
    const col = colisoes(c);
    add(`LB5@${w}`, desvio <= 0.03 && !col.some((x) => x.startsWith('personagem')), `personagem com desvio de ${(desvio * 100).toFixed(1)}% do centro${col.filter((x) => x.startsWith('personagem')).map((x) => `; ${x}`).join('')}`);
    const largo = w >= 1440 && h >= 800;
    add(`LB6@${w}`, m.party && m.eu === 1 && !m.vagas, `party ${m.party ? 'visível' : 'ausente'} com ${m.eu} vaga preenchida e ${m.vagas} slots vazios (quer 0)`);
    add(`LB10@${w}`, !col.length && c.partida, col.length ? `colisão em ${w}×${h}: ${col.join(', ')}` : `${w}×${h} sem colisão`);
    if (toque) add('LB11', !m.pequenos.length, m.pequenos.length ? `alvo de toque < 44 px: ${m.pequenos.slice(0, 6).map((x) => `${x.n} ${x.w.toFixed(0)}×${x.h.toFixed(0)}`).join(', ')}` : 'todo alvo de toque do lobby tem 44 px ou mais');
    if (toque) add('LB14@deitado', !m.gire, m.gire ? '"gire o celular" aparece com o celular deitado' : 'deitado, sem o aviso de girar');
    await ctx.close();
  }

  /* Sessão E: celular em pé (tela 26). */
  if (quer('LB14')) {
    const { page, ctx } = await abrir({ w: 390, h: 844, toque: true, mutante, sairSplash: false });
    await page.waitForTimeout(2500);
    await foto(page, 'gire-390x844-pt');
    const g = await page.evaluate(() => {
      const e = document.getElementById('rotate-prompt');
      const b = e?.getBoundingClientRect();
      const cs = e && getComputedStyle(e);
      const titulo = e?.querySelector('.tp-gire__titulo');
      const ico = e?.querySelector('.rot-ico');
      return { vis: !!e?.checkVisibility(), cobre: b ? b.width >= innerWidth - 1 && b.height >= innerHeight - 1 : false, arte: cs?.backgroundImage || '',
        titulo: titulo?.textContent.trim() || '', fonte: titulo ? getComputedStyle(titulo).fontFamily : '', emoji: !!ico?.checkVisibility(),
        instalar: !!document.getElementById('tp-gire-instalar')?.checkVisibility(), pwa: !document.getElementById('pwa-install')?.hidden };
    });
    add('LB14', g.vis && g.cobre && /loading-\d\.webp/.test(g.arte) && g.titulo === 'GIRE O CELULAR' && /^"?Anton/.test(g.fonte) && !g.emoji && g.instalar === g.pwa,
      `em pé: aviso ${g.vis ? (g.cobre ? 'cobre a tela' : 'não cobre a tela') : 'ausente'}, arte ${(g.arte.match(/loading-\d\.webp/) || ['ausente'])[0]}, título "${g.titulo}" em ${g.fonte || '?'}, emoji ${g.emoji ? 'visível' : 'fora'}, instalar ${g.instalar ? 'visível' : 'fora'} (PWA ${g.pwa ? 'disponível' : 'indisponível'})`);
    await ctx.close();
  }

  /* Sessão F: inglês. */
  if (quer('LB12')) {
    const vazou = {};
    for (const lang of ['en', 'pt']) {
      const { page, ctx } = await abrir({ lang, mutante });
      if (lang === 'en') await foto(page, 'lobby-1536x1024-en');
      vazou[lang] = await page.evaluate(() => {
        /* DOM montado por JS não tem nó de espaço: textContent cola "PLAYSHOPARMÁRIO…" e a régua
           não vê a palavra. O texto por elemento separa sem inventar palavra nova. */
        const texto = (n) => [...n.childNodes].map((f) => (f.nodeType === 3 ? f.textContent : texto(f))).join(' ');
        return [...document.querySelectorAll('.tp-lobby-abas, .tp-lobby-esq, .tp-lobby-dir, .tp-lobby-vaga, #tp-lobby-rede, #tp-lobby-party, #tp-lobby-partida .tp-lobby-partida__rotulo, #tp-lobby-partida .tp-lobby-partida__trocar, #btn-jogar, #hub-settings, #tp-lobby-amigos, #tp-lobby-mais, #tp-lobby-mais-menu, #tp-lobby-online, #rotate-prompt, #hub-change-character .hub-character-change')]
          .map(texto).join(' | ');
      });
      await ctx.close();
    }
    const PT = /(?<!\p{L})(JOGAR|LOJA|ARMÁRIO|CARREIRA|CLÃ|AMIGOS|AJUSTES|MAIS|CONVIDAR|NOVIDADES|QUESTS DA TRETA|VER TODAS|PRIVADA|TROCAR|PARTIDAS|CONCLUÍDA|Ainda não|Nenhuma|Consultando|SOBRE O JOGO|APOIE|TERMOS|EXCLUIR|MAPA AO VIVO|GIRE|PERSONAGEM|Confirme|Chame|Conclua)(?!\p{L})/u;
    const EN = /(?<!\p{L})(PLAY|SHOP|LOCKER|CAREER|CLAN|FRIENDS|SETTINGS|MORE|INVITE|NEWS|ROTATE|CHANGE|CHARACTER|PRIVATE|MATCHES|Confirm|Finish)(?!\p{L})/u;
    const em = (vazou.en.match(PT) || [])[0], ep = (vazou.pt.match(EN) || [])[0];
    add('LB12', vazou.en && vazou.pt && !em && !ep, !vazou.en ? 'lobby v3 sem texto para medir' : em || ep ? `idioma misturado: "${em || ep}" ${em ? 'em EN' : 'em PT'}` : 'PT e EN sem string do outro idioma');
  }

  /* Sessão G: ?ui=legacy mantém o lobby anterior. */
  if (quer('LB13')) {
    const { page, ctx } = await abrir({ flag: false, mutante });
    await foto(page, 'hoje-1536x1024-pt');
    const s = await page.evaluate(() => ({
      tp: document.querySelectorAll('.tp-lobby-esq, .tp-lobby-abas, #tp-lobby-partida').length,
      abas: [...document.querySelectorAll('.hub-tabs [data-hub-tab]')].filter((e) => e.checkVisibility()).length,
      jogar: document.getElementById('btn-jogar')?.className || '',
    }));
    await page.click('#btn-jogar');
    await page.waitForTimeout(800);
    const quick = await page.evaluate(() => document.getElementById('hub-quick')?.hidden === false);
    add('LB13', !s.tp && s.abas === 7 && !/tp-btn/.test(s.jogar) && quick,
      `?ui=legacy: ${s.tp} nós do lobby v3, ${s.abas} abas antigas, JOGAR ${/tp-btn/.test(s.jogar) ? 'com classe v3' : 'antigo'}, confirmação ${quick ? 'abre' : 'não abre'}`);
    await ctx.close();
  }
  return r;
}
const MUT = [['abas-velhas', 'LB1'], ['ajustes-mudo', 'LB2'], ['confirma-de-novo', 'LB3'], ['convidado-bloqueado', 'LB18'], ['enter-do-splash', 'LB4'],
  ['personagem-no-canto', 'LB5'], ['convite-mudo', 'LB6'], ['erro-mudo', 'LB6'], ['quest-inventada', 'LB7'], ['passe-sem-backend', 'LB8'],
  ['rede-trocada', 'LB9'], ['coluna-larga', 'LB10'], ['toque-baixo', 'LB11'], ['sem-traducao', 'LB12'], ['flag-vaza', 'LB13'],
  ['gire-sem-arte', 'LB14'], ['mais-sem-feedback', 'LB15'], ['chip-sem-nome', 'LB16'], ['dois-limas', 'LB17'], ['skins-mudas', 'LB19'], ['arma-sem-skin', 'LB20']];
let sair = 0;
if (process.argv.includes('--mutantes')) {
  for (const [mut, alvo] of MUT.filter(([m]) => !process.env.SO || process.env.SO === m)) {
    const rs = (await medir(mut, alvo)).filter((x) => x.id === alvo || x.id.startsWith(`${alvo}@`));
    const morde = rs.some((x) => !x.ok);
    if (!morde) sair = 1;
    const c = rs.find((x) => !x.ok) || rs[0] || { msg: 'cláusula não medida' };
    console.log(`${morde ? 'MORDE ' : 'CEGO  '} ${alvo} (${mut})  ${c.msg}`);
  }
} else {
  const r = await medir('', process.env.ALVO || '');
  for (const c of r) console.log(`${c.ok ? 'VERDE   ' : 'VERMELHO'} ${c.id}  ${c.msg}`);
  sair = r.every((c) => c.ok) ? 0 : 1;
  console.log(`\nlobby v3: ${r.filter((c) => c.ok).length}/${r.length}  (capturas em ${OUT})`);
}
await browser.close();
process.exit(sair);
