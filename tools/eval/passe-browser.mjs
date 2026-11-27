#!/usr/bin/env node
/* Passe "Sessão da Treta" no lobby real, com o /api/passe do mock (passe-mock.mjs) até o backend publicar.
     PB1 anúncio: abre uma vez por versão no lobby, com a arte da temporada; com conta o CTA leva à tela.
     PB2 tela (desktop 1536×1024): 15 níveis × 5 recompensas, XP, missões; RESGATAR NÍVEL 1 manda só
         {action:'claim', level:1}, o nível vira RESGATADO e o bônus de XP aparece.
     PB3 visitante no celular deitado (844×390): CTA abre o convite de login; depois de fechar,
         o convite do bônus de cadastro (/api/treta chegando depois) não reabre na mesma visita, e
         a aba PASSE mostra 15 níveis sem rolagem horizontal nem resgate, com CTA para entrar.
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
   Conta no nível 10 com os 10 níveis para resgatar (presente da migration 096), sem memória de novidades:
     PB12 celebração: ao entrar no lobby abre UMA celebração (sem empilhar <dialog>) de 0 a 10 com o
         presente de boas-vindas; recarregar depois de vista não repete.
     PB13 resgatar tudo: na tela e na celebração, um POST por nível de 1 a 10, nunca dois em voo, e o
         resumo (10 níveis, 20 personagens, T$ 950) no fim.
     PB14 selo da aba PASSE: mostra os 10 resgatáveis e some quando não sobra nenhum (PASSE_EVENTO).
     PB15 prévia 3D: skin de arma e personagem abrem a camada com nome, nível e status; Esc fecha só a
         prévia, devolve o foco e o contexto WebGL é perdido (dispose); a tela não empilha <dialog>.
     PB16 grade: 5 colunas × 3 linhas em 1440×900, sem rolagem horizontal; hover levanta o cartão.
     PB17 missão: missão que o servidor passa a dar como feita avisa uma vez ("+150 XP · missão",
         aria-live), e só ela.
     PB18 pós-partida: na tela de resultado, "+N XP do passe" com a liquidação de ~4 s e de novo com a
         de ~12 s (MP ingerido com atraso).
     PB19 conta trocada: level-up da conta A enfileirado (um <dialog> segura a celebração); a conta B
         entra antes de abrir e não vê a celebração, os níveis nem as recompensas da A.
   Uso (servidor próprio; um navegador por vez):
     node tools/eval/serve.mjs 9431 &
     BASE=http://127.0.0.1:9431 tools/eval/with-browser-lock.sh node tools/eval/passe-browser.mjs [--mutantes]
   Capturas em OUT (padrão tools/eval/out/passe). */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
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

const pw = await import('playwright')
const chromium = pw.chromium || pw.default?.chromium;
const CHROME_MAC = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const chromeBin = process.env.CHROME_BIN || (existsSync(CHROME_MAC) ? CHROME_MAC : '');
const browser = await chromium.launch({
  /* CHROME_BIN vence; sem ele, o Chrome do macOS se existir, senão o Chromium do próprio Playwright (Linux/CI) */
  ...(chromeBin ? { executablePath: chromeBin } : {}),
  args: ['--headless=new', '--mute-audio', '--autoplay-policy=no-user-gesture-required'],
});

/* Mutantes reescrevem o que o servidor entrega e precisam derrubar a cláusula que miram.
   [cláusula, caminho EXATO do módulo que contém o texto, trocas [de, para]]. O caminho é comparado
   por igualdade com o pathname pedido (`/js/passe.js` é o estado; a tela é `/js/tp/passe.js`).
   aplicarMutante() exige que cada `de` exista no arquivo e que o resultado mude: mutante que não
   aplica é ERRO, nunca CEGO calado nem mordida falsa. */
const MUTANTES = {
  'passe-modal-repete': ['PB1', '/js/passe-anuncio.js', [['  marcarAnuncio();\n', '\n']]],
  'personagem-travado-selecionavel': ['PB4', '/js/main.js', [["if (personagemTravado(def)) { $('hub-roster-selected')", "if (false) { $('hub-roster-selected')"]]],
  'analytics-sem-consentimento': ['PB5', '/js/passe.js', [[' || !globalThis.__csPrivacy?.allowed()) return;', ') return;']]],
  'anuncio-com-prazo': ['PB6', '/js/tp/lobby.js', [['  await esperarPasse();', '  await Promise.race([esperarPasse(), new Promise((r) => setTimeout(r, 4000))]);']]],
  'pin-some-no-travado': ['PB7', '/js/main.js', [['      if (def.id !== efetivo) {', '      if (def.id !== currentChar) {']]],
  'cadeado-sob-o-chip': ['PB7', '/style.css', [['align-items:flex-end;justify-content:center;gap:4px;padding:0 4px 6px;', 'align-items:flex-start;justify-content:flex-end;gap:4px;padding:8px 6px 0;']]],
  'pin-fora-da-celula': ['PB7', '/style.css', [['.hub-roster-cell--travado>button:not(.hub-roster-pin),', '.hub-roster-cell--travado>button,']]],
  'claim-sem-conta': ['PB3', '/js/tp/passe.js', [['if (!s?.authenticated) { entrar(); return; }', ''],
    ['const primeiro = s.claimable[0];', 'const primeiro = s.claimable[0] || (!s.authenticated && 1);']]],
  'premio-sem-poster': ['PB8', '/js/tp/passe.js', [['  if (!skin?.poster) {\n', '  if (true) {\n']]],
  'bot-travado-fixado': ['PB9', '/js/main.js', [['if (!ehPin && personagemTravado(def)) {', 'if (false) {']]],
  'anuncio-desiste': ['PB10', '/js/passe-anuncio.js', [['    await semDialogoAberto();\n', '    return null;\n']]],
  'convite-volta': ['PB3', '/js/login-prompt.js', [['    markSeen();dialog.showModal();\n', '    dialog.showModal();\n']]],
  'festa-ausente': ['PB12', '/js/tp/passe-festa.js', [['  abrirFesta(f);\n', '\n']]],
  'resgatar-tudo-paralelo': ['PB13', '/js/passe.js', [['const out = await resgatarComLimite(fila[i]);', 'const out = resgatarComLimite(fila[i]).catch(() => null);']]],
  'selo-parado': ['PB14', '/js/tp/lobby.js', [['document.addEventListener(PASSE_EVENTO, () => { passeAba(); marcar(); });', 'document.addEventListener(PASSE_EVENTO, () => { marcar(); });']]],
  'modelo-sem-dispose': ['PB15', '/js/tp/passe.js', [['  palco?.dispose();\n', '\n']]],
  'grade-vira-trilho': ['PB16', '/css/tp/passe.css', [['.tp-passe__niveis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px;margin:0;padding:6px 2px 4px;list-style:none;overflow:visible}',
    '.tp-passe__niveis{display:flex;gap:12px;margin:0;padding:2px 2px 12px;list-style:none;overflow-x:auto}.tp-passe__niveis>.tp-passe-nivel{flex:none;width:216px}']]],
  'missao-repete': ['PB17', '/js/passe.js', [['.filter((q) => q.done && !feitas.has(q.id))', '.filter((q) => q.done)']]],
  'partida-uma-vez': ['PB18', '/js/passe.js', [['Object.freeze([4000, 12000])', 'Object.freeze([4000])']]],
  'pos-partida-sem-bloco': ['PB18', '/js/tp/passe-festa.js', [['  document.addEventListener(PASSE_EVENTO, blocoResultado);\n', '\n']]],
  'festa-vaza-conta': ['PB19', '/js/tp/passe-festa.js', [["  document.addEventListener('cs-account-change', esquecerConta);\n", '\n']]],
};
function aplicarMutante(nome, texto) {
  const [, caminho, trocas] = MUTANTES[nome];
  let saida = texto;
  for (const [de, para] of trocas) {
    if (!saida.includes(de)) throw new Error(`mutante ${nome}: texto de origem ausente em ${caminho}: ${JSON.stringify(de.slice(0, 60))}`);
    saida = saida.replace(de, para);
  }
  if (saida === texto) throw new Error(`mutante ${nome}: a troca não mudou ${caminho}`);
  return saida;
}
/* quantas vezes o módulo mutado foi servido na medição atual (0 = o mutante nunca chegou na página) */
let servidos = 0;

/* Conta da régua (o /api/social-auth abaixo) e a memória de novidades dela (passe.js): por padrão o
   nível 15 já foi visto e as 7 missões já estavam feitas, para a celebração e os avisos só aparecerem
   nas sessões que medem isso (memoria: null = primeira vez da conta na temporada). */
const CONTA = '00000000-0000-4000-8000-0000000000aa';

/* Personagem do passe ainda fora do roster deste branch (o faction-pipeline monta a facção):
   a régua injeta um com o campo combinado na spec §6, nível 1, no lado E. */
const INJETA_PERSONAGEM = (t) => t.replace('export const CHARACTERS = [',
  "export const CHARACTERS = [\n  { id: 'capitao-caveira', team: 'E', name: 'Capitão Caveira', passe: { season: 'sessao-da-treta-s1', level: 1 },\n    blurb: 'Personagem do passe (régua).', pal: { skin: 0xe8b98a, shirt: 0x222222, pants: 0x222222, hair: 0x111111, boots: 0x111111 } },");

async function abrir({ w = 1536, h = 1024, toque = false, conta = true, mock, mutante = '', personagem = null, anuncioVisto = false, recusaMedicao = false, atrasoMs = 0, flavio = false, posterQuebrado = '', auto = false, memoria = 15, atrasoPostMs = 0, seguraTreta = false }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: toque, isMobile: toque, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const erros = [];
  page.on('pageerror', (e) => { if (!/\/\.astro\//.test(e.stack || '')) erros.push(e.message.slice(0, 160)); });
  await page.addInitScript(({ personagem, anuncioVisto, recusaMedicao, flavio, memoria, CONTA }) => {
    localStorage.setItem('awpbr_settings', JSON.stringify({ menuMusic: false, vol: 0, speech: false }));
    localStorage.setItem('cs_lang', 'pt'); localStorage.setItem('awpbr_nick', 'Regua'); localStorage.setItem('cs_treta_intro', 'v1');
    /* flavio: 1º acesso de verdade, o anúncio da Operação Flávio ainda não foi visto e abre antes */
    if (!flavio) localStorage.setItem('csbr-mode-ann-seen', JSON.stringify(['operacao_flavio']));
    localStorage.setItem('cs-javaporcos-cidade-anuncio-v1', '1');
    if (personagem) { localStorage.setItem('csbr-home-character', personagem); localStorage.setItem('csbr-home-side', 'E'); }
    if (anuncioVisto) localStorage.setItem('cs-passe-anuncio', 'sessao-da-treta-s1/1');
    /* recusa gravada no formato do privacy-runtime.js: o funil do passe não pode sair */
    if (recusaMedicao) localStorage.setItem('cs_privacy', JSON.stringify({ version: 'corosolto-analytics-v1', analytics: false }));
    if (memoria !== null) {
      const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      const d = new Date(`${dia}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      const todas = ['login', 'play_3', 'win_1', 'mp_1', 'days_5', 'win_10', 'mp_10'];
      localStorage.setItem(`cs-passe-memoria:${CONTA}:sessao-da-treta-s1`, JSON.stringify({ level: memoria, xp: 0, dia, semana: d.toISOString().slice(0, 10), diarias: todas, semanais: todas }));
    }
  }, { personagem, anuncioVisto, recusaMedicao, flavio, memoria, CONTA });
  /* posterQuebrado: o pôster desta skin responde 404, a recompensa tem de voltar ao ícone */
  if (posterQuebrado) await page.route(`**/img/weapon-skins/${posterQuebrado}.webp`, (r) => r.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' }));
  const posts = [], eventos = [];   // resgates e funil do painel, separados
  const voo = { agora: 0, max: 0 };   // resgates em voo ao mesmo tempo (RESGATAR TUDO é em sequência)
  let gets = 0;
  await page.route('**/api/passe', async (r) => {
    const req = r.request();
    if (req.method() === 'GET') gets++;
    const resgate = req.method() === 'POST' && !/"action":"analytics"/.test(req.postData() || '');
    if (req.method() === 'POST') { const corpo = req.postData() || ''; if (!resgate) eventos.push(JSON.parse(corpo).event); else posts.push(corpo); }
    if (atrasoMs && req.method() === 'GET') await new Promise((ok) => setTimeout(ok, atrasoMs));
    if (resgate) { voo.agora++; voo.max = Math.max(voo.max, voo.agora); if (atrasoPostMs) await new Promise((ok) => setTimeout(ok, atrasoPostMs)); }
    const { status, body } = mock.handle(req.method(), req.postData() || '');
    await r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (resgate) voo.agora--;
  });
  /* seguraTreta: o GET /api/treta (bônus de cadastro, que abre o convite do visitante com nick salvo)
     sai de um fixo e só responde quando a régua solta, em vez de correr contra a rede até o backend. */
  let soltar;
  const solta = new Promise((ok) => { soltar = ok; }), entregas = [];
  if (seguraTreta) await page.route((u) => u.pathname === '/api/treta', (r) => {
    if (r.request().method() !== 'GET') return r.fallback();
    const entrega = solta.then(() => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ authenticated: false, currency: 'TRETA$', catalog: [],
      campaign: { id: 'regua', starts_at: new Date(Date.now() - 5 * DIA).toISOString(), ends_at: new Date(Date.now() + 60 * DIA).toISOString(),
        email_reward: 10000, referral_reward: 100, sp_reward: 10, mp_reward: 25, daily_match_cap: 250, referral_cap: 10, signup_bonus: 10000 } }) }));
    entregas.push(entrega);
    return entrega;
  });
  const soltaTreta = async () => { soltar(); await Promise.all(entregas); };
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
    const [, caminho] = MUTANTES[mutante];
    await page.route((u) => u.pathname === caminho, async (r) => {
      const res = await r.fetch().catch(() => r.fetch());
      const depois = aplicarMutante(mutante, await res.text());
      servidos++;
      await r.fulfill({ response: res, body: depois });
    });
  }
  await page.goto(`${BASE}/?lang=pt${auto ? '&auto=E,gotinha' : ''}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => !document.getElementById('splash-enter')?.classList.contains('hidden'), null, { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await entrarNoLobby(page, flavio ? 'flavio' : !anuncioVisto);
  return { page, ctx, posts, eventos, erros, gets, voo, soltaTreta };
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
  /* com mutante, só as sessões que medem a cláusula que ele mira */
  const quer = (...ids) => !mutante || ids.includes(MUTANTES[mutante][0]);

  /* Sessão A: desktop, conta com 2.350 XP e nada resgatado. */
  if (quer('PB1', 'PB2', 'PB4', 'PB5', 'PB8')) {
    const mock = mockNoAr({ autenticado: true, xp: 2350, claimed: [] });
    const { page, ctx, posts, eventos, erros } = await abrir({ mock, mutante, posterQuebrado: 'arma-02' });
    const anuncio = await page.evaluate(() => {
      const d = document.getElementById('passe-anuncio');
      const arte = d?.querySelector('.tp-passe-anuncio__arte');
      return { aberto: !!d?.open, cta: d?.querySelector('[data-passe-cta]')?.textContent || '', arte: arte?.complete && arte.naturalWidth > 0 ? arte.getAttribute('src') : '' };
    });
    await foto(page, 'anuncio-desktop-conta', mutante);
    if (anuncio.aberto) await page.click('#passe-anuncio [data-passe-cta]', { timeout: 5000 }).catch(() => {});
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
    await foto(page, 'passe-desktop', mutante);
    /* PB4: depois do resgate o servidor lista o personagem: o seletor escolhe */
    await page.click('.tp-passe__fechar').catch(() => {});
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
  if (quer('PB3', 'PB5')) {
    const mock = mockNoAr({ autenticado: false, claimed: [] });
    const { page, ctx, posts, eventos, erros, soltaTreta } = await abrir({ w: 844, h: 390, toque: true, conta: false, mock, mutante, recusaMedicao: true, seguraTreta: true });
    const anuncio = await page.evaluate(() => ({ aberto: !!document.getElementById('passe-anuncio')?.open, cta: document.querySelector('#passe-anuncio [data-passe-cta]')?.textContent || '' }));
    await foto(page, 'anuncio-celular-visitante', mutante);
    if (anuncio.aberto) await page.click('#passe-anuncio [data-passe-cta]', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(800);
    const login = await page.evaluate(() => ({ aberto: !!document.getElementById('login-prompt')?.open, titulo: document.getElementById('login-prompt-title')?.textContent || '' }));
    await foto(page, 'login-celular-visitante', mutante);
    /* As decisões do convite (cs-pos-partida) são contadas desde ANTES do fechar, para nenhuma se perder;
       só conta como resposta ao /api/treta a que vier depois de soltá-lo (segurado até o fechar). */
    await page.evaluate(() => { window.__reguaDecisoes = 0; document.addEventListener('cs-pos-partida', () => { window.__reguaDecisoes++; }); });
    /* espera tolerante: sob mutante o convite pode não ter aberto; a cláusula mede o estado depois */
    await page.click('#login-prompt-close', { timeout: 3000 }).catch(() => {});
    const fechou = await page.waitForFunction(() => !document.getElementById('login-prompt')?.open, null, { timeout: 3000 }).then(() => true, () => false);
    const antes = await page.evaluate(() => window.__reguaDecisoes);
    /* Só agora chega o bônus de cadastro (/api/treta): o convite decide sem reabrir atrás do do passe. */
    await soltaTreta();
    await page.waitForFunction((n) => window.__reguaDecisoes > n || document.getElementById('login-prompt')?.open, antes, { timeout: 8000 }).catch(() => {});
    const convite = await page.evaluate((n) => ({ decidiu: window.__reguaDecisoes > n, voltou: document.getElementById('login-prompt')?.open ? document.getElementById('login-prompt-title')?.textContent || '?' : '' }), antes);
    if (convite.voltou) await page.click('#login-prompt-close').catch(() => {});
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
    add('PB3', anuncio.aberto && anuncio.cta === 'ENTRAR E JOGAR O PASSE' && login.aberto && /passe/.test(login.titulo) && fechou && convite.decidiu && !convite.voltou
      && tela.aberta && tela.larguraOk && tela.niveis === 15 && tela.resgates === 0 && tela.entrar && posts.length === 0,
      `anúncio ${anuncio.aberto ? `"${anuncio.cta}"` : 'NÃO ABRIU'}; login ${login.aberto ? `"${login.titulo}"` : 'NÃO ABRIU'} ${fechou ? 'fechou' : 'NÃO FECHOU'}; bônus de cadastro depois: ${convite.voltou ? `convite VOLTOU "${convite.voltou}"` : convite.decidiu ? 'convite não voltou' : 'convite NÃO DECIDIU'}; tela ${tela.aberta ? 'aberta' : 'FECHADA'}, ${tela.niveis} níveis, ${tela.larguraOk ? 'sem rolagem lateral' : 'ROLA NA HORIZONTAL'}, ${tela.resgates} botão(ões) de resgate, ENTRAR ${tela.entrar ? 'presente' : 'ausente'}; resgates ${posts.length}`);
    add('PB5@recusa', eventos.length === 0, `funil com recusa gravada: ${eventos.length ? `SAIU ${JSON.stringify(eventos)}` : 'nenhum evento'}`);
    add('PB0@celular', !erros.length, erros.length ? `erros de página: ${erros.join(' | ')}` : 'sem erro de página');
    await ctx.close();
  }

  /* Sessão C: celular deitado, conta; Sessão D: seletor com o personagem travado e o id salvo no navegador. */
  if (!mutante) {
    const mock = mockNoAr({ autenticado: true, xp: 6400, claimed: [1, 2] });
    const { page, ctx } = await abrir({ w: 844, h: 390, toque: true, mock, mutante, anuncioVisto: true });
    await page.click('[data-tp-aba="passe"]').catch(() => {});
    await page.waitForSelector('#tp-passe[open] .tp-passe-nivel', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(400);
    await foto(page, 'passe-celular', mutante);
    await ctx.close();
  }
  if (quer('PB4', 'PB7', 'PB9')) {
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
  if (quer('PB6')) {
    const mock = mockNoAr({ autenticado: true, xp: 2350, claimed: [] });
    const { page, ctx } = await abrir({ mock, mutante, atrasoMs: 7000 });
    const aberto = await page.evaluate(() => !!document.getElementById('passe-anuncio')?.open);
    add('PB6', aberto, `/api/passe em 7 s: anúncio ${aberto ? 'abriu' : 'NÃO ABRIU (desistiu antes da resposta)'}`);
    await ctx.close();
  }
  /* Sessão F: 1º acesso de verdade, o anúncio da Operação Flávio abre antes do passe. */
  if (quer('PB10')) {
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
  /* Sessão H: 1440×900, conta no nível 10 com 10 resgatáveis e sem memória: celebração, grade, prévia
     3D, aviso de missão e RESGATAR TUDO pela tela. Com mutante, só o passo da cláusula que ele mira
     (a rodada de mutantes cabe no prazo do portao-passe). */
  if (quer('PB12', 'PB13', 'PB14', 'PB15', 'PB16', 'PB17')) {
    const mock = mockNoAr({ autenticado: true, xp: 16750, claimed: [] });
    /* atrasoPostMs > PASSE_ESPACO_RESGATE_MS (150): só assim um resgate sem await sobrepõe o seguinte e a PB13 vê 2 em voo. */
    const { page, ctx, posts, erros, voo } = await abrir({ w: 1440, h: 900, mock, mutante, anuncioVisto: true, memoria: null, atrasoPostMs: 400 });
    await page.evaluate(() => {   // todo aviso de missão criado, mesmo os que já saíram da tela
      window.__avisos = [];
      new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.classList?.contains('tp-passe-aviso')) window.__avisos.push(n.dataset.missao); })
        .observe(document.body, { subtree: true, childList: true });
    });
    await page.waitForSelector('#tp-passe-festa[open]', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1300);   // contagem 0 -> 10
    const festa = await page.evaluate(() => {
      const d = document.getElementById('tp-passe-festa');
      const aba = document.querySelector('[data-tp-aba="passe"]'), selo = aba?.querySelector('.tp-lobby-aba__selo');
      return { aberta: !!d?.open, de: d?.dataset.de, para: d?.dataset.para, boasVindas: !!d && 'boasVindas' in d.dataset, n: d?.querySelector('.tp-passe-festa__n')?.textContent,
        texto: d?.textContent || '', abertos: document.querySelectorAll('dialog[open]').length, tudo: !!d?.querySelector('[data-festa-tudo]'),
        selo: selo && !selo.hidden ? selo.textContent : '', rotulo: aba?.getAttribute('aria-label') || '' };
    });
    await foto(page, 'festa-boas-vindas-1440', mutante);
    add('PB12', festa.aberta && festa.de === '0' && festa.para === '10' && festa.boasVindas && festa.n === '10' && /Presente de boas-vindas: você começa no nível 10/.test(festa.texto) && festa.abertos === 1 && festa.tudo,
      `celebração ${festa.aberta ? `de ${festa.de} a ${festa.para} (mostra ${festa.n})${festa.boasVindas ? ', presente de boas-vindas' : ', SEM boas-vindas'}` : 'NÃO ABRIU'}; ${festa.abertos} diálogo(s); RESGATAR TUDO ${festa.tudo ? 'presente' : 'ausente'}`);
    if (festa.aberta) await page.click('[data-festa-ver]').catch(() => {});
    else await page.click('[data-tp-aba="passe"]').catch(() => {});
    await page.waitForSelector('#tp-passe[open] .tp-passe-nivel', { timeout: 10000 }).catch(() => {});
    await page.mouse.move(5, 5);
    await page.waitForTimeout(500);
    if (quer('PB16')) {
      const grade = await page.evaluate(() => {
        const d = document.getElementById('tp-passe'), ol = d?.querySelector('.tp-passe__niveis');
        const cards = [...(ol?.children || [])];
        return { display: ol ? getComputedStyle(ol).display : '', colunas: ol ? getComputedStyle(ol).gridTemplateColumns.split(' ').length : 0,
          linhas: new Set(cards.map((c) => c.offsetTop)).size, cabe: !!ol && ol.scrollWidth <= ol.clientWidth + 1 && d.scrollWidth <= innerWidth + 1,
          resgataveis: cards.filter((c) => c.dataset.estado === 'resgatavel').length, travados: cards.filter((c) => c.dataset.estado === 'travado').length,
          atual: d?.querySelector('[data-atual]')?.dataset.nivel || '', abertos: document.querySelectorAll('dialog[open]').length };
      });
      await foto(page, 'passe-nivel10-1440', mutante);
      const caixa = await page.locator('.tp-passe-nivel[data-nivel="3"] .tp-passe-nivel__cab').boundingBox().catch(() => null);   // 1ª linha, na tela
      if (caixa) await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
      await page.waitForTimeout(400);
      /* Sem cartão (mutante que some com a tela) o hover vale '' e a PB16 reprova, em vez de derrubar a régua. */
      const hover = await page.evaluate(() => { const c = document.querySelector('.tp-passe-nivel[data-nivel="3"]'); return c ? getComputedStyle(c).transform : ''; });
      await foto(page, 'passe-hover-1440', mutante);
      add('PB16', grade.display === 'grid' && grade.colunas === 5 && grade.linhas === 3 && grade.cabe && grade.resgataveis === 10 && grade.travados === 5 && grade.atual === '10' && grade.abertos === 1 && /matrix/.test(hover),
        `trilha ${grade.display} com ${grade.colunas} colunas × ${grade.linhas} linhas, ${grade.cabe ? 'sem rolagem lateral' : 'ROLA NA HORIZONTAL'}; ${grade.resgataveis} resgatáveis, ${grade.travados} travados, atual ${grade.atual}; hover ${hover}`);
    }
    /* PB15: prévia 3D da skin (modelo público, sempre carrega) e do personagem */
    if (quer('PB15')) {
      await page.click('.tp-passe-nivel[data-nivel="1"] [data-id="arma-01"] [data-modelo]').catch(() => {});
      await page.waitForSelector('.tp-passe-modelo__palco[data-pronto], .tp-passe-modelo__palco[data-falhou]', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(800);
      const arma = await page.evaluate(() => {
        const m = document.querySelector('#tp-passe .tp-passe-modelo');
        window.__cv = m?.querySelector('canvas') || null;
        return { aberta: !!m, nome: m?.querySelector('.tp-passe-modelo__nome')?.textContent || '', nivel: m?.querySelector('.tp-passe-modelo__nivel')?.textContent || '',
          status: m?.querySelector('.tp-passe-modelo__status')?.textContent || '', canvas: !!window.__cv, abertos: document.querySelectorAll('dialog[open]').length,
          foco: !!m?.contains(document.activeElement) };
      });
      await foto(page, 'modelo-skin-1440', mutante);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      const fechou = await page.evaluate(() => {
        const gl = window.__cv && (window.__cv.getContext('webgl2') || window.__cv.getContext('webgl'));
        return { modelo: !!document.querySelector('.tp-passe-modelo'), passe: !!document.getElementById('tp-passe')?.open, solto: !!window.__cv && !window.__cv.isConnected,
          perdido: !!gl && gl.isContextLost(), foco: document.activeElement?.closest('[data-id]')?.dataset.id || '' };
      });
      await page.click('.tp-passe-nivel[data-nivel="1"] [data-id="capitao-caveira"] [data-modelo]').catch(() => {});
      await page.waitForSelector('.tp-passe-modelo__palco[data-pronto], .tp-passe-modelo__palco[data-falhou]', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(800);
      const boneco = await page.evaluate(() => {
        const m = document.querySelector('#tp-passe .tp-passe-modelo');
        return { nome: m?.querySelector('.tp-passe-modelo__nome')?.textContent || '', figura: !!m?.querySelector('canvas, .tp-passe-modelo__figura') };
      });
      await foto(page, 'modelo-personagem-1440', mutante);
      await page.click('.tp-passe-modelo__fechar').catch(() => {});
      await page.waitForTimeout(300);
      add('PB15', arma.aberta && arma.nome === 'Sintonia' && arma.nivel === 'NÍVEL 1' && arma.status === 'PRONTO PARA RESGATAR' && arma.canvas && arma.abertos === 1 && arma.foco
        && !fechou.modelo && fechou.passe && fechou.solto && fechou.perdido && fechou.foco === 'arma-01' && boneco.nome === 'Capitão Caveira' && boneco.figura,
        `skin: ${arma.aberta ? `"${arma.nome}" ${arma.nivel} ${arma.status}, ${arma.canvas ? 'canvas 3D' : 'SEM 3D'}, ${arma.abertos} diálogo` : 'NÃO ABRIU'}; Esc: prévia ${fechou.modelo ? 'AINDA ABERTA' : 'fechada'}, passe ${fechou.passe ? 'aberto' : 'FECHADO'}, contexto WebGL ${fechou.perdido ? 'descartado' : 'VIVO (sem dispose)'}, foco em ${fechou.foco || 'nada'}; personagem "${boneco.nome}"`);
    }
    /* PB17: o servidor passa a dar play_3 como feita; o GET seguinte avisa uma vez, só ela */
    if (quer('PB17')) {
      mock.definir({ progresso: { play_3: 3 } });
      await page.click('.tp-passe__fechar').catch(() => {});
      await page.click('[data-tp-aba="passe"]').catch(() => {});
      await page.waitForSelector('.tp-passe-aviso[data-missao="play_3"]', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(500);
      const aviso = await page.evaluate(() => {
        const t = document.querySelector('.tp-passe-aviso[data-missao="play_3"]'), caixa = t?.parentElement;
        return { texto: t?.textContent || '', topo: !!caixa?.matches(':popover-open'), vivo: caixa?.getAttribute('aria-live') || '' };
      });
      await foto(page, 'missao-toast-1440', mutante);
      await page.click('.tp-passe__fechar').catch(() => {});
      await page.click('[data-tp-aba="passe"]').catch(() => {});
      await page.waitForTimeout(1500);
      const avisos = await page.evaluate(() => window.__avisos);
      add('PB17', /\+150 XP · missão/.test(aviso.texto) && /Jogar 3 partidas/.test(aviso.texto) && aviso.topo && aviso.vivo === 'polite' && JSON.stringify(avisos) === '["play_3"]',
        `aviso "${aviso.texto}" ${aviso.topo ? 'no top layer' : 'FORA do top layer'}, aria-live=${aviso.vivo}; avisos ao todo ${JSON.stringify(avisos)} (quer só play_3, uma vez)`);
    }
    /* PB13 + PB14: RESGATAR TUDO pela tela */
    if (quer('PB13', 'PB14')) {
      await page.click('.tp-passe__resgatar-tudo').catch(() => {});
      await page.waitForSelector('#tp-passe .tp-passe-resumo', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(400);
      const tudo = await page.evaluate(() => {
        const d = document.getElementById('tp-passe'), aba = document.querySelector('[data-tp-aba="passe"]'), selo = aba?.querySelector('.tp-lobby-aba__selo');
        return { resumo: d?.querySelector('.tp-passe-resumo')?.textContent || '', resgatados: d?.querySelectorAll('.tp-passe-nivel[data-estado="resgatado"]').length || 0,
          selo: selo && !selo.hidden ? selo.textContent : '', rotulo: aba?.getAttribute('aria-label') || '' };
      });
      await foto(page, 'resgatar-tudo-resumo-1440', mutante);
      const niveis = posts.map((p) => JSON.parse(p).level);
      add('PB13', JSON.stringify(niveis) === '[1,2,3,4,5,6,7,8,9,10]' && voo.max === 1 && /10 NÍVEIS RESGATADOS/.test(tudo.resumo) && /20 PERSONAGENS/.test(tudo.resumo) && /T\$ 950/.test(tudo.resumo) && tudo.resgatados === 10,
        `resgates ${JSON.stringify(niveis)}, ${voo.max} em voo ao mesmo tempo; resumo "${tudo.resumo.slice(0, 90)}"; ${tudo.resgatados} cartões resgatados`);
      add('PB14', festa.selo === '10' && /10 níveis para resgatar/.test(festa.rotulo) && !tudo.selo && !tudo.rotulo,
        `selo da aba ${festa.selo ? `"${festa.selo}" (${festa.rotulo})` : 'AUSENTE'} com 10 resgatáveis; depois do resgate ${tudo.selo ? `AINDA "${tudo.selo}"` : 'sumiu'}`);
    }
    add('PB0@nivel10', !erros.length, erros.length ? `erros de página: ${erros.join(' | ')}` : 'sem erro de página');
    await ctx.close();
  }
  /* Sessão I: 1280×720, RESGATAR TUDO pela celebração, celebração vista não repete, pós-partida. */
  if (quer('PB12', 'PB13', 'PB18')) {
    const mock = mockNoAr({ autenticado: true, xp: 16750, claimed: [] });
    const { page, ctx, posts, erros, voo } = await abrir({ w: 1280, h: 720, mock, mutante, anuncioVisto: true, memoria: null, atrasoPostMs: 400 });
    await page.waitForSelector('#tp-passe-festa[open]', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await foto(page, 'festa-boas-vindas-1280', mutante);
    if (quer('PB13')) {
      await page.click('[data-festa-tudo]').catch(() => {});
      await page.waitForSelector('#tp-passe-festa .tp-passe-resumo', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(400);
      const resumo = await page.evaluate(() => ({ texto: document.querySelector('#tp-passe-festa .tp-passe-resumo')?.textContent || '', abertos: document.querySelectorAll('dialog[open]').length }));
      await foto(page, 'festa-resumo-1280', mutante);
      const niveis = posts.map((p) => JSON.parse(p).level);
      add('PB13@festa', JSON.stringify(niveis) === '[1,2,3,4,5,6,7,8,9,10]' && voo.max === 1 && /10 NÍVEIS RESGATADOS/.test(resumo.texto) && resumo.abertos === 1,
        `pela celebração: resgates ${JSON.stringify(niveis)}, ${voo.max} em voo; resumo "${resumo.texto.slice(0, 60)}"; ${resumo.abertos} diálogo`);
    }
    await page.keyboard.press('Escape');
    if (quer('PB12')) {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => !document.getElementById('splash-enter')?.classList.contains('hidden'), null, { timeout: 90000 }).catch(() => {});
      await page.waitForTimeout(1200);
      await entrarNoLobby(page, false);
      const repetiu = await page.evaluate(() => !!document.getElementById('tp-passe-festa')?.open);
      add('PB12@visto', !repetiu, `celebração vista e página recarregada: ${repetiu ? 'REPETIU' : 'não repetiu'}`);
    }
    /* PB18: o jogo despacha cs-match-end com a tela de resultado na frente; o servidor liquida a
       partida (+180) e, depois, o MP que o nó ingeriu atrasado (+120) */
    if (quer('PB18')) {
      await page.evaluate(() => {
        document.getElementById('tp-passe-festa')?.close();
        document.getElementById('main-menu')?.classList.add('hidden');
        document.getElementById('match-stats').innerHTML = '<b>3×1</b><b>9</b><b>2</b>';
        const fim = document.getElementById('match-end');
        fim.classList.add('win'); fim.classList.remove('hidden');
        document.dispatchEvent(new CustomEvent('cs-match-end', { detail: { mode: 'multiplayer' } }));
      });
      mock.definir({ xp: 16750 + 180 });
      await page.waitForSelector('#match-end .tp-res__passe:not([hidden])', { timeout: 9000 }).catch(() => {});
      await page.waitForTimeout(1200);
      const primeira = await page.evaluate(() => document.querySelector('#match-end .tp-res__passe:not([hidden])')?.textContent || '');
      await foto(page, 'pos-partida-1280', mutante);
      mock.definir({ xp: 16750 + 300 });
      await page.waitForFunction(() => /\+300 XP do passe/.test(document.querySelector('#match-end .tp-res__passe')?.textContent || ''), null, { timeout: 12000 }).catch(() => {});
      await page.waitForTimeout(900);
      const segunda = await page.evaluate(() => {
        const b = document.querySelector('#match-end .tp-res__passe');
        return { texto: b?.textContent || '', p: b?.querySelector('.tp-barra')?.style.getPropertyValue('--p') || '', vivo: b?.getAttribute('aria-live') || '' };
      });
      add('PB18', /\+180 XP do passe/.test(primeira) && /\+300 XP do passe/.test(segunda.texto) && Number(segunda.p) > 0 && segunda.vivo === 'polite',
        `resultado: 1ª liquidação "${primeira.slice(0, 60)}"; 2ª "${segunda.texto.slice(0, 60)}", barra --p=${segunda.p}`);
    }
    add('PB0@festa', !erros.length, erros.length ? `erros de página: ${erros.join(' | ')}` : 'sem erro de página');
    await ctx.close();
  }
  /* Sessão J: a conta A sobe de nível com a celebração presa atrás de outro <dialog>; a conta B entra
     antes de ela abrir. B (nível 10 já visto) não pode ver nada da A. */
  if (quer('PB19')) {
    const mock = mockNoAr({ autenticado: true, xp: 16750, claimed: [] });
    const { page, ctx, erros } = await abrir({ w: 1280, h: 720, mock, mutante, anuncioVisto: true });
    const memoria = (conta, level) => page.evaluate(({ conta, level }) => {
      const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      const d = new Date(`${dia}T00:00:00Z`); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      const todas = ['login', 'play_3', 'win_1', 'mp_1', 'days_5', 'win_10', 'mp_10'];
      localStorage.setItem(`cs-passe-memoria:${conta}:sessao-da-treta-s1`, JSON.stringify({ level, xp: 0, dia, semana: d.toISOString().slice(0, 10), diarias: todas, semanais: todas }));
    }, { conta, level });
    const entra = (id) => page.evaluate((id) => document.dispatchEvent(new CustomEvent('cs-account-change', { detail: { authenticated: true, profile: { id, nick: 'Regua' } } })), id);
    await page.evaluate(() => { const d = document.createElement('dialog'); d.id = 'regua-trava'; document.body.append(d); d.showModal(); });
    await memoria(CONTA, 0);   // A: primeira vez na temporada, o nível 10 ainda não foi visto
    await entra(CONTA);
    await page.waitForTimeout(2000);
    const presa = await page.evaluate(() => !document.getElementById('tp-passe-festa')?.open);
    await memoria('regua-conta-b', 10);   // B: nível 10 já visto
    await entra('regua-conta-b');
    await page.waitForTimeout(2000);
    await page.evaluate(() => { const d = document.getElementById('regua-trava'); d.close(); d.remove(); });
    await page.waitForTimeout(1500);
    const depois = await page.evaluate(() => { const d = document.getElementById('tp-passe-festa'); return { aberta: !!d?.open, de: d?.dataset.de || '', para: d?.dataset.para || '' }; });
    await foto(page, 'conta-trocada-sem-festa', mutante);
    add('PB19', presa && !depois.aberta,
      `celebração da conta A ${presa ? 'presa atrás do diálogo' : 'ABRIU antes da troca (cenário não montado)'}; conta B entrou: ${depois.aberta ? `VIU A CELEBRAÇÃO DA A (${depois.de} -> ${depois.para})` : 'nenhuma celebração'}`);
    add('PB0@conta', !erros.length, erros.length ? `erros de página: ${erros.join(' | ')}` : 'sem erro de página');
    await ctx.close();
  }
  return r;
}

let sair = 0;
/* --mutantes roda todos; --mutantes=a,b só os nomeados (diagnóstico de um mutante).
   Veredito por mutante, isolado (um mutante que quebra não derruba a rodada):
     ERRO  o mutante não aplica no arquivo do disco (texto de origem ausente ou troca sem efeito) ou o
           módulo mutado nunca foi servido na medição: a régua não sabe o que mediu, reprova.
     MORDE a cláusula mirada ficou vermelha, OU a medição quebrou (exceção/timeout) DEPOIS de o módulo
           mutado ter sido servido. Critério da quebra: `eval:passe:browser` roda a medição nominal antes
           (&&) e ela só passa verde; com o mesmo roteiro, a única diferença é o módulo mutado, que
           comprovadamente aplicou e foi servido — o comportamento quebrou a ponto de o fluxo não seguir,
           e isso é exatamente o que a régua existe para pegar. Exceção sem o módulo servido é ERRO.
     CEGO  aplicou, foi servido, a medição terminou e a cláusula continuou verde: reprova. */
const pedidos = (process.argv.find((a) => a.startsWith('--mutantes=')) || '').split('=')[1]?.split(',').filter(Boolean) || [];
if (process.argv.some((a) => a === '--mutantes' || a.startsWith('--mutantes='))) {
  for (const mut of pedidos) if (!MUTANTES[mut]) { console.error(`mutante desconhecido: ${mut}`); process.exit(2); }
  for (const [mut, [alvo, caminho]] of Object.entries(MUTANTES).filter(([m]) => !pedidos.length || pedidos.includes(m))) {
    try { aplicarMutante(mut, readFileSync(`public${caminho}`, 'utf8')); }
    catch (e) { sair = 1; console.log(`ERRO   ${alvo} (${mut})  não aplica: ${e.message}`); continue; }
    servidos = 0;
    let rs, quebra = null;
    try { rs = (await medir(mut)).filter((x) => x.id === alvo || x.id.startsWith(`${alvo}@`)); }
    catch (e) { quebra = String(e.message || e).split('\n')[0]; }
    const onde = `${caminho} servido ${servidos}x`;
    if (!servidos) { sair = 1; console.log(`ERRO   ${alvo} (${mut})  ${onde}: o mutante nunca chegou na página${quebra ? ` (${quebra})` : ''}`); continue; }
    if (quebra) { console.log(`MORDE  ${alvo} (${mut})  [${onde}] o fluxo quebrou com o mutante: ${quebra}`); continue; }
    const morde = rs.some((x) => !x.ok);
    if (!morde) sair = 1;
    const c = rs.find((x) => !x.ok) || rs[0] || { msg: 'cláusula não medida' };
    console.log(`${morde ? 'MORDE ' : 'CEGO  '} ${alvo} (${mut})  [${onde}] ${c.msg}`);
  }
} else {
  const r = await medir();
  for (const c of r) console.log(`${c.ok ? 'VERDE   ' : 'VERMELHO'} ${c.id}  ${c.msg}`);
  sair = r.every((c) => c.ok) ? 0 : 1;
  console.log(`\npasse no navegador: ${r.filter((c) => c.ok).length}/${r.length}  (capturas em ${OUT})`);
}
await browser.close();
process.exit(sair);
