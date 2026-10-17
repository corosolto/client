/* LP0 a LP14 e LB1 a LB8: nenhum modal antes da 1ª partida; convite de login depois dela, com os T$ que a conta rende (dono, 14/10/2026).
 * Ver public/js/login-prompt.js. Parte rápida (padrão, entra no check:fast): roda o login-prompt.js REAL num vm,
 * avalia o gatilho do passo de entrada (account-entry.js) e o da apresentação da loja (treta-store.js).
 * Parte de browser (`--browser`, exige BASE): visitante novo abre o site, joga uma partida SP de verdade
 * (a partida termina por __game._endMatch, o mesmo fim da tela de resultado), volta ao menu e só então vê o
 * convite; logado nunca vê. Grava capturas em SHOTS se definido.
 * Mutantes (cada um tem de ficar VERMELHO): --mutante=na-abertura | menu-antes | conta-sem-nick | loja-na-abertura |
 * sem-treta | treta-sem-janela | treta-fixa | intro-dobrada |
 * sem-login | sem-embed | sem-partida | sem-conta | sem-sessao | sem-intervalo | sem-perfil | sem-contagem | empilha |
 * telemetria-sem-consentimento */
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import { TRETA_DEFAULT_REWARDS, TRETA_COIN_ART } from '../../public/js/treta-catalog.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
const MUT = arg('mutante');
const BROWSER = process.argv.includes('--browser');

const INTRO_ANTIGA = "  const introObserver=new MutationObserver(()=>{if(skipPrompt || stored('cs_treta_intro') || $('boot-splash') || $('main-menu')?.classList.contains('hidden') || document.querySelector('dialog[open]'))return;explain();introObserver.disconnect();});\n  introObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});\n";
const MUTANTES = {
  'na-abertura': ['login-prompt', '  if(!ended)return false;\n', ''],
  'menu-antes': ['login-prompt', '    if(!ended || inMatch())return;   // espera a volta ao menu depois da tela de resultado\n', ''],
  'conta-sem-nick': ['conta', "const wantsPrompt=()=>failedReturn || (auth?.authenticated && !auth.profile);", "const wantsPrompt=()=>failedReturn || (auth?.authenticated?!auth.profile:!localStorage.getItem('awpbr_nick')?.trim());"],
  'loja-na-abertura': ['loja', "  document.addEventListener('cs-pos-partida',event=>{\n", INTRO_ANTIGA + "  document.addEventListener('cs-pos-partida',event=>{\n"],
  'sem-treta': ['login-prompt', 'markSeen();draw();drawTreta();', 'markSeen();draw();'],
  'treta-sem-janela': ['login-prompt', '  if(!(now>=Date.parse(c.starts_at) && now<Date.parse(c.ends_at)))return null;\n', ''],
  'treta-fixa': ['login-prompt', '  const c={...TRETA_DEFAULT_REWARDS,...campaign};', '  const c={...campaign,...TRETA_DEFAULT_REWARDS,starts_at:campaign.starts_at,ends_at:campaign.ends_at};'],
  'intro-dobrada': ['loja', "    if(event.detail?.treta){stored('cs_treta_intro','v1');return;}   // o convite já mostrou os T$\n", ''],
  'sem-login': ['login-prompt', '  if(auth?.authenticated)return false;\n', ''],
  'sem-embed': ['login-prompt', '  if(embedded)return false;\n', ''],
  'sem-partida': ['login-prompt', '  if(playing)return false;\n', ''],
  'sem-conta': ['login-prompt', '  if(accountBusy)return false;\n', ''],
  'sem-sessao': ['login-prompt', '  if(seen)return false;\n', ''],
  'sem-intervalo': ['login-prompt', '  if(record && record.matches<LOGIN_PROMPT_MATCHES && now-record.dismissedAt<LOGIN_PROMPT_COOLDOWN_MS)return false;\n', ''],
  'empilha': ['login-prompt', "    if(document.querySelector('dialog[open]'))return;", ''],
  'sem-perfil': ['main', "onReady:ready=>initLoginPrompt({...ready,skip:Boolean(inspectionScreen || testMode || params.get('sala') || perfilCompartilhado)", "onReady:ready=>initLoginPrompt({...ready,skip:Boolean(inspectionScreen || testMode || params.get('sala'))"],
  'sem-contagem': ['main', '  if (!continuaPartida) noteLoginPromptMatch();', ''],
  'telemetria-sem-consentimento': ['login-prompt', '  if(!analyticsAllowed())return;\n  try{track(step,data);}', '  try{track(step,data);}'],
  'sem-recuperacao-convidado': ['login-prompt', "if(e.message==='guest_invalid'){", 'if(false){'],
};
if (MUT && !MUTANTES[MUT]) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }
const muta = (alvo, fonte) => {
  if (!MUT || MUTANTES[MUT][0] !== alvo) return fonte;
  const [, velho, novo] = MUTANTES[MUT];
  const n = fonte.replace(velho, novo);
  if (n === fonte) { console.error(`MUTANTE ${MUT} NAO APLICOU`); process.exit(2); }
  return n;
};

let falhas = 0;
const SO = arg('so') ? arg('so').split(',') : null;   // --so=LB1,LB3 roda só esses casos de browser
const caso = async (id, nome, fn) => {
  if (SO && id.startsWith('LB') && !SO.includes(id)) return;
  try { await fn(); console.log(`PASS ${id} ${nome}`); }
  catch (e) { falhas++; console.log(`RED  ${id} ${nome}: ${String(e.message).split('\n')[0]}`); }
};

const fontePrompt = muta('login-prompt', read('public/js/login-prompt.js'));
const fonteMain = muta('main', read('public/js/main.js'));
const fonteConta = muta('conta', read('public/js/account-entry.js'));
const fonteLoja = muta('loja', read('public/js/treta-store.js'));
const ROTA = { 'login-prompt': 'login-prompt', main: 'main', conta: 'account-entry', loja: 'treta-store' };

/* ---------- parte rápida: o módulo real num vm ---------- */
function carrega({ consent = null, search = '', embedded = false, menuHidden = false, session = new Map(), store = new Map() } = {}) {
  const corpo = fontePrompt.replace(/^import .*$/gm, '').replace(/^export /gm, '');
  const ctx = {
    analyticsAllowed: () => consent === true,
    privacyChoice: () => (consent === null ? null : { analytics: consent }),
    PROVIDER_ICONS: {}, leaveTo: () => {}, socialApi: async () => ({}), guestProof: () => undefined, accountError: (e) => e.message,
    localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    sessionStorage: { getItem: (k) => session.get(k) ?? null, setItem: (k, v) => session.set(k, String(v)) },
    location: { search },
    document: { documentElement: { dataset: embedded ? { embedded: 'true' } : {} }, getElementById: (id) => (id === 'main-menu' ? { classList: { contains: (c) => c === 'hidden' && menuHidden } } : null) },
    URLSearchParams, JSON, Number, Date, Intl, TRETA_DEFAULT_REWARDS, TRETA_COIN_ART,
  };
  vm.runInNewContext(`${corpo}\n;globalThis.__api={tretaPitch,loginPromptDue,noteLoginPromptMatch,isEmbedded,inMatch,emit,readRecord,seenThisVisit,markSeen,LOGIN_PROMPT_KEY,LOGIN_PROMPT_SESSION_KEY,LOGIN_PROMPT_MATCHES,LOGIN_PROMPT_COOLDOWN_MS};`, ctx);
  return { api: ctx.__api, store, session };
}
const CONFIG = { providers: ['google', 'discord', 'x', 'linkedin_oidc'], email: true };
const base = (m, extra = {}) => ({ auth: { authenticated: false }, config: CONFIG, ended: true, embedded: m.isEmbedded(), playing: m.inMatch(), accountBusy: false, seen: m.seenThisVisit(), record: m.readRecord(), ...extra });

await caso('LP0', 'antes de terminar a 1a partida o convite não aparece', () => {
  const { api } = carrega();
  assert.equal(api.loginPromptDue(base(api, { ended: false })), false);
});
await caso('LP1', 'deslogado, partida terminada, de volta ao menu: o convite aparece', () => {
  const { api } = carrega();
  assert.equal(api.loginPromptDue(base(api)), true);
});
await caso('LP2', 'logado: não aparece', () => {
  const { api } = carrega();
  assert.equal(api.loginPromptDue(base(api, { auth: { authenticated: true, profile: { nick: 'x' } } })), false);
});
await caso('LP3', '?embed=1 (ou html[data-embedded]) não mostra', () => {
  for (const o of [{ search: '?embed=1' }, { embedded: true }]) { const { api } = carrega(o); assert.equal(api.isEmbedded(), true); assert.equal(api.loginPromptDue(base(api)), false); }
});
await caso('LP4', 'dentro de partida ou na tela de resultado (menu escondido) não mostra', () => {
  const { api } = carrega({ menuHidden: true });
  assert.equal(api.inMatch(), true);
  assert.equal(api.loginPromptDue(base(api)), false);
});
await caso('LP5', 'passo de entrada aberto ou pendente tem prioridade', () => {
  const { api } = carrega();
  assert.equal(api.loginPromptDue(base(api, { accountBusy: true })), false);
});
await caso('LP6', 'uma vez por visita', () => {
  const { api, session } = carrega();
  api.markSeen();
  assert.equal(session.get(api.LOGIN_PROMPT_SESSION_KEY), '1');
  const outra = carrega({ session });
  assert.equal(outra.api.loginPromptDue(base(outra.api)), false);
});
await caso('LP7', 'recusa: volta só com 3 partidas ou 24 h', () => {
  const agora = Date.UTC(2026, 9, 14, 12);
  const { api, store } = carrega();
  store.set(api.LOGIN_PROMPT_KEY, JSON.stringify({ dismissedAt: agora - 3600e3, matches: 0 }));
  assert.equal(api.loginPromptDue(base(api, { now: agora })), false, '1 h depois e 0 partidas');
  api.noteLoginPromptMatch(); api.noteLoginPromptMatch();
  assert.equal(api.loginPromptDue(base(api, { now: agora })), false, '2 partidas');
  api.noteLoginPromptMatch();
  assert.equal(api.readRecord().matches, 3);
  assert.equal(api.loginPromptDue(base(api, { now: agora })), true, '3 partidas');
  store.set(api.LOGIN_PROMPT_KEY, JSON.stringify({ dismissedAt: agora - api.LOGIN_PROMPT_COOLDOWN_MS, matches: 0 }));
  assert.equal(api.loginPromptDue(base(api, { now: agora })), true, '24 h');
  store.set(api.LOGIN_PROMPT_KEY, 'quebrado');
  assert.equal(api.readRecord(), null, 'storage corrompido não trava o jogo');
});
await caso('LP8', 'telemetria só com consentimento de analytics', () => {
  for (const consent of [null, false, true]) {
    const enviados = [];
    const { api } = carrega({ consent });
    api.emit((s, d) => enviados.push([s, d]), 'login_prompt_shown', {});
    api.emit((s, d) => enviados.push([s, d]), 'login_prompt_provider_click', { provider: 'google' });
    assert.equal(enviados.length, consent === true ? 2 : 0, `consent=${consent}`);
    if (consent) assert.deepEqual(enviados[1], ['login_prompt_provider_click', { provider: 'google' }]);
  }
  for (const nome of ['login_prompt_shown', 'login_prompt_dismissed', 'login_prompt_provider_click']) assert(fontePrompt.includes(`'${nome}'`), nome);
});
await caso('LP15', 'prova antiga do convidado oferece uma recuperação e mantém o progresso local', async () => {
  class El {
    constructor(){this.children=[];this.dataset={};this.open=false;this.textContent='';}
    append(...children){this.children.push(...children);}
    replaceChildren(...children){this.children=children;}
    querySelector(){return this.children.find(c=>c instanceof El)||null;}
    focus(){} showModal(){this.open=true;} close(){this.open=false;} addEventListener(){}
  }
  const ids=Object.fromEntries(['login-prompt','login-prompt-providers','login-prompt-status','login-prompt-close','login-prompt-guest','main-menu'].map(id=>[id,new El()]));
  ids['main-menu'].classList={contains:()=>false};
  const calls=[],navigations=[],listeners={},observers=[],proof={uid:'fixture-guest',token:'fixture-proof'},storage=new Map([['awpbr_stats','{"kills":3}']]);
  const ctx={analyticsAllowed:()=>false,privacyChoice:()=>null,PROVIDER_ICONS:{},guestProof:()=>proof,accountError:e=>e.message,
    socialApi:async(_path,body)=>{calls.push(body);if(body.guest)throw new Error('guest_invalid');return {url:'https://provider.example/authorize'};},
    leaveTo:url=>navigations.push(url),localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    sessionStorage:{getItem:()=>null,setItem:()=>{}},location:{search:''},URLSearchParams,Date,Number,JSON,
    MutationObserver:class{constructor(fn){observers.push(fn)}observe(){}},document:{body:new El(),activeElement:null,documentElement:{dataset:{}},createElement:()=>new El(),createTextNode:text=>text,getElementById:id=>ids[id]||null,querySelector:()=>null,addEventListener:(name,fn)=>{listeners[name]=fn}}};
  const source=fontePrompt.replace(/^import .*$/gm,'').replace(/^export /gm,'');
  vm.runInNewContext(`${source}\n;globalThis.__init=initLoginPrompt`,ctx);
  ctx.__init({auth:{authenticated:false},config:CONFIG});
  listeners['cs-match-end']({detail:{mode:'singleplayer'}});
  for(const observer of observers)observer();
  const google=ids['login-prompt-providers'].children.find(b=>b.dataset.provider==='google');assert(google);
  await google.onclick();await google.onclick();
  const recover=ids['login-prompt-providers'].children.filter(b=>b.textContent==='Entrar sem vincular o convidado');
  assert.equal(recover.length,1,'403 repetido duplicou a recuperação');
  await recover[0].onclick();
  const starts=calls.filter(body=>body?.action==='start');
  assert.equal(starts.length,3);assert(starts[0].guest && starts[1].guest);
  assert.equal(starts[2].guest,undefined,'a recuperação ainda envia a prova antiga');
  assert.equal(navigations.length,1,'a escolha explícita não prosseguiu ao provedor');
  assert.equal(storage.get('awpbr_stats'),'{"kills":3}');
});
await caso('LP10', 'perfil compartilhado (/u/<perfil>, que é o hub, e o link antigo ?perfil=) pula o convite', () => {
  const skip = fonteMain.match(/onReady:ready=>initLoginPrompt\(\{\.\.\.ready,skip:Boolean\((.*?)\),track:/)?.[1] || '';
  assert(skip.includes('perfilCompartilhado'), `skip do convite: ${skip || 'não achado'}`);
  const decl = fonteMain.match(/^const perfilCompartilhado = ([^\n]*);$/m)?.[1] || '';
  assert(decl.includes("params.get('perfil')") && decl.includes('estadoDaUrl(location.href)?.perfil'), `perfilCompartilhado: ${decl || 'não achado'}`);
  assert(skip.includes("params.get('sala')"), 'convite de sala');
});
await caso('LP9', 'fiação: partida começada conta, partida terminada arma o convite, mesmo pipeline do funil', () => {
  const ini = fonteMain.indexOf('async function _startGame('), fim = fonteMain.indexOf('\n}\n', ini);
  assert(/if \(!continuaPartida\) noteLoginPromptMatch\(\);/.test(fonteMain.slice(ini, fim)), '_startGame não conta a partida');
  const rec = fonteMain.indexOf('async function recordMatchStats(');
  assert(rec > 0 && /document\.dispatchEvent\(new CustomEvent\('cs-match-end', \{ detail: \{ mode: mpSessao \? 'multiplayer' : 'singleplayer' \} \}\)\)/.test(fonteMain.slice(rec, rec + 200)), 'fim de partida não avisa');
  assert(/document\.addEventListener\('cs-match-end',e=>\{\n\s+ended=true;/.test(fontePrompt), 'convite não escuta o fim da partida');
  assert(/onReady:ready=>initLoginPrompt\(\{\.\.\.ready,skip:Boolean\(inspectionScreen \|\| testMode \|\| params\.get\('sala'\)(?: \|\| (?:params\.get\('perfil'\)|perfilCompartilhado))?\)/.test(fonteMain), 'convite não pendurado no onReady da conta');
  assert(/sendJsonKeepalive\('\/api\/funnel', \{ step, sessionId: getSessionId\(\), \.\.\.data \}\)/.test(fonteMain), 'transporte fora do funil');
});
await caso('LP11', 'passo de entrada não abre sozinho para visitante (com ou sem nick); abre para link expirado e conta sem nick', () => {
  const linha = fonteConta.match(/const wantsPrompt=\(\)=>[^;]*;/)?.[0];
  assert(linha, 'wantsPrompt não achado');
  const avalia = (failedReturn, auth, nick) => Boolean(vm.runInNewContext(`${linha}\nwantsPrompt()`, { failedReturn, auth, localStorage: { getItem: () => nick } }));
  assert.equal(avalia(false, { authenticated: false }, null), false, 'visitante sem nick');
  assert.equal(avalia(false, { authenticated: false }, 'Fulano'), false, 'visitante com nick');
  assert.equal(avalia(false, null, null), false, 'sessão sem resposta');
  assert.equal(avalia(true, { authenticated: false }, null), true, 'link expirado');
  assert.equal(avalia(false, { authenticated: true }, null), true, 'conta sem nick');
  assert.equal(avalia(false, { authenticated: true, profile: { nick: 'x' } }, null), false, 'conta pronta');
});
await caso('LP12', 'apresentação da loja só abre sozinha depois da decisão pós-partida', () => {
  const ini = fonteLoja.indexOf('export function initTretaStore('), corpo = fonteLoja.slice(ini);
  assert(ini > 0, 'initTretaStore não achado');
  assert(!/MutationObserver/.test(corpo), 'observador de DOM abre a apresentação na abertura');
  assert(!/account-entry-dialog/.test(corpo), 'apresentação pendurada no passo de entrada');
  const sozinhos = [...corpo.matchAll(/(.{0,24})\bexplain\(\)/g)].filter((m) => !/void $/.test(m[1]));
  assert.equal(sozinhos.length, 1, `chamadas automáticas: ${sozinhos.length}`);
  const pos = corpo.indexOf("document.addEventListener('cs-pos-partida',");
  assert(pos > 0 && sozinhos[0].index > pos && sozinhos[0].index - pos < 300, 'a chamada automática não está no cs-pos-partida');
  assert(fontePrompt.includes("document.dispatchEvent(new CustomEvent('cs-pos-partida',{detail:{treta:pitched}}))"), 'convite não avisa a loja');
});
const CAMPANHA = { starts_at: '2026-10-12T00:00:00+00:00', ends_at: '2026-11-01T00:00:00+00:00', email_reward: 200, referral_reward: 100, sp_reward: 10, mp_reward: 25, daily_match_cap: 250 };
await caso('LP13', 'T$ do convite vêm da campanha do servidor e só dentro da janela de quests', () => {
  const { api } = carrega();
  const dentro = Date.parse('2026-10-14T12:00:00Z');
  const plano = (p) => (p ? JSON.parse(JSON.stringify(p).replace(/\u00a0/g, ' ')) : p);   // T$ e valor ficam juntos por espaço fixo
  const sp = plano(api.tretaPitch(CAMPANHA, 'singleplayer', dentro)), mp = plano(api.tretaPitch(CAMPANHA, 'multiplayer', dentro));
  assert.match(sp.headline, /treino.*solo premiada rende T\$ 10\./, sp.headline);
  assert.match(mp.headline, /partida multiplayer podia render T\$ 25\./, mp.headline);
  assert.deepEqual(JSON.parse(JSON.stringify(sp.items.map((i) => i[0]))), ['T$ 25', 'T$ 10', 'T$ 200']);
  assert.match(sp.cap, /T\$ 250 por dia/);
  const outra = plano(api.tretaPitch({ ...CAMPANHA, mp_reward: 30, sp_reward: 12, email_reward: 150, daily_match_cap: 300 }, 'multiplayer', dentro));
  assert.deepEqual(JSON.parse(JSON.stringify(outra.items.map((i) => i[0]))), ['T$ 30', 'T$ 12', 'T$ 150'], 'número fixo no cliente em vez do servidor');
  assert.match(outra.cap, /T\$ 300/);
  assert.equal(api.tretaPitch(CAMPANHA, 'singleplayer', Date.parse('2026-11-02T00:00:00Z')), null, 'campanha encerrada promete T$');
  assert.equal(api.tretaPitch(CAMPANHA, 'singleplayer', Date.parse('2026-10-01T00:00:00Z')), null, 'campanha futura promete T$');
  assert.equal(api.tretaPitch(null, 'singleplayer', dentro), null, 'sem resposta do servidor promete T$');
  assert.equal(api.tretaPitch({ ...CAMPANHA, mp_reward: 0 }, 'singleplayer', dentro), null, 'valor inválido');
  const texto = [sp, mp].flatMap((p) => [p.headline, p.cap, ...p.items.flat()]).join(' ');
  assert(!/[\u2013\u2014]/.test(texto), 'travessão na cópia');
  assert.equal(TRETA_DEFAULT_REWARDS.sp_reward, CAMPANHA.sp_reward, 'catálogo e campanha divergem');
});
await caso('LP14', 'convite com T$ absorve a apresentação da loja', () => {
  const pos = fonteLoja.indexOf("document.addEventListener('cs-pos-partida',event=>{");
  assert(pos > 0, 'handler cs-pos-partida sem evento');
  assert(fonteLoja.slice(pos, pos + 200).includes("if(event.detail?.treta){stored('cs_treta_intro','v1');return;}"), 'apresentação repete o que o convite mostrou');
});

/* ---------- parte de browser ---------- */
if (BROWSER) {
  const BASE = process.env.BASE;
  if (!BASE) { console.error('--browser exige BASE=http://localhost:<porta>'); process.exit(2); }
  const SHOTS = process.env.SHOTS || '';
  if (SHOTS) mkdirSync(SHOTS, { recursive: true });
  const gRoot = execSync('npm root -g').toString().trim();
  const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
  const chromium = pw.chromium || pw.default?.chromium;
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
  });
  const GUEST = { authenticated: false };
  const LOGADO = { authenticated: true, profile: { nick: 'Logado' }, identities: ['google'] };
  const AGORA = Date.now();
  const CAMPANHA_ATIVA = { ...CAMPANHA, starts_at: new Date(AGORA - 2 * 864e5).toISOString(), ends_at: new Date(AGORA + 14 * 864e5).toISOString() };
  async function abre({ auth = GUEST, nick = null, consent = null, query = '', seed = null, intro = false, treta = CAMPANHA_ATIVA, viewport = { width: 1440, height: 900 } } = {}) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: viewport.width < 500 ? 2 : 1 });
    await ctx.addInitScript(({ nick, consent, seed, intro }) => {
      try {
        if (sessionStorage.getItem('__lp_seeded')) return;
        sessionStorage.setItem('__lp_seeded', '1');
        localStorage.setItem('awpbr_settings', JSON.stringify({ menuMusic: false, vol: 0, speech: false, quality: 'low', bots: 1 }));
        if (nick) localStorage.setItem('awpbr_nick', nick);
        if (consent !== null) localStorage.setItem('cs_privacy', JSON.stringify({ version: 'corosolto-analytics-v1', analytics: consent, updatedAt: new Date(0).toISOString() }));
        if (seed) localStorage.setItem('cs_login_prompt', JSON.stringify(seed));
        if (intro) localStorage.setItem('cs_treta_intro', 'v1');
      } catch {}
    }, { nick, consent, seed, intro });
    const funil = [];
    await ctx.route('**/api/social-auth**', async (rota) => {
      const url = rota.request().url();
      if (url.includes('action=providers')) return rota.fulfill({ json: { providers: ['google', 'discord', 'x', 'linkedin_oidc'], email: true, linking: true } });
      if (rota.request().method() === 'POST') return rota.fulfill({ status: 400, json: { error: 'provider_unavailable' } });
      return rota.fulfill({ json: auth });
    });
    await ctx.route('**/api/treta*', (r) => (treta ? r.fulfill({ json: { currency: 'TRETA$', symbol: 'T$', acquisition: 'quests', topUpsEnabled: false, accountId: null, catalog: [], campaign: treta, wallet: null, inventory: [], ledger: [], quests: null, authenticated: false } }) : r.fulfill({ status: 503, json: { error: 'treta_unavailable' } })));
    await ctx.route('**/api/social?action=profile', (r) => r.fulfill({ json: { profile: { avatar_url: 'x', socials: ['x'] } } }));
    await ctx.route('**/api/funnel', (r) => { try { funil.push(JSON.parse(r.request().postData() || '{}')); } catch {} return r.fulfill({ json: { ok: true, stored: false } }); });
    if (MUT) {
      const [alvo] = MUTANTES[MUT];
      const fonte = { 'login-prompt': fontePrompt, main: fonteMain, conta: fonteConta, loja: fonteLoja }[alvo];
      await ctx.route(`**/js/${ROTA[alvo]}.js*`, (rota) => rota.fulfill({ status: 200, body: fonte, contentType: 'text/javascript' }));
    }
    const page = await ctx.newPage();
    await page.goto(`${BASE}/${query}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.addStyleTag({ content: 'astro-dev-toolbar { display: none !important; pointer-events: none !important; }' });
    await page.waitForFunction(() => window.__CS_MAIN_READY__ === true, null, { timeout: 120000 });
    await page.locator('#splash-enter:not(.hidden)').waitFor({ timeout: 120000 }).catch(() => {});
    if (await page.locator('#boot-splash').count()) await page.locator('#boot-splash').dispatchEvent('pointerdown').catch(() => {});
    await page.waitForFunction(() => document.getElementById('login-prompt')?.dataset.ready === 'true' || new URLSearchParams(location.search).get('embed') === '1' || new URLSearchParams(location.search).get('perfil'), null, { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2500);   // a sessão social e a loja já responderam: quem fosse abrir sozinho, abriu
    return { ctx, page, funil };
  }
  const abertos = (page) => page.evaluate(() => [...document.querySelectorAll('dialog[open]')].map((d) => d.id));
  const convite = (page) => page.evaluate(() => document.getElementById('login-prompt')?.open === true);
  const shot = async (page, nome) => { if (!SHOTS) return; await page.mouse.move(2, 2); await page.waitForTimeout(250); await page.screenshot({ path: `${SHOTS}/${nome}.png` }); };
  // Partida SP de verdade pelo menu: PLAY, PRONTO PRA TRETA, partida ao vivo; o fim é o _endMatch do jogo (tela de resultado real).
  async function jogaPartida(page, { nick = 'VISITA', resultado = null } = {}) {
    await page.evaluate((nick) => { const n = document.getElementById('nick-input'); if (!n.value.trim()) { n.value = nick; n.dispatchEvent(new Event('input', { bubbles: true })); } }, nick);
    await page.click('#btn-jogar');
    await page.locator('#hub-quick-confirm').click({ timeout: 30000 });
    await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 240000 });
    assert.deepEqual(await abertos(page), [], 'diálogo aberto durante a partida');
    await page.evaluate(() => window.__game._endMatch());
    await page.waitForFunction(() => !document.getElementById('match-end')?.classList.contains('hidden'), null, { timeout: 30000 });
    await page.waitForTimeout(800);
    assert.deepEqual(await abertos(page), [], 'diálogo cobre o placar');
    if (resultado) await resultado(page);
    await page.click('#btn-menu');
    await page.waitForFunction(() => !document.getElementById('main-menu').classList.contains('hidden'), null, { timeout: 30000 });
    await page.waitForTimeout(1200);
  }

  await caso('LB1', 'browser: visitante novo não vê modal na abertura; depois da 1a partida vê o convite com T$; "agora não" e a próxima partida segue sem convite nem loja', async () => {
    const { ctx, page } = await abre();
    try {
      assert.deepEqual(await abertos(page), [], 'modal na abertura');
      await shot(page, 'desktop-1-abertura');
      await jogaPartida(page, { resultado: (p) => shot(p, 'desktop-2-resultado') });
      assert.equal(await convite(page), true, `convite não abriu depois da partida: ${await abertos(page)}`);
      assert.equal(await page.evaluate(() => document.activeElement?.dataset.provider), 'google', 'foco inicial');
      const nomes = await page.$$eval('#login-prompt-providers button', (bs) => bs.map((b) => b.textContent.trim()));
      assert.deepEqual(nomes, ['Continuar com Google', 'Continuar com Discord', 'Continuar com X', 'Continuar com LinkedIn', 'Continuar com e-mail']);
      await page.waitForFunction(() => !document.getElementById('login-prompt-treta').hidden, null, { timeout: 10000 }).catch(() => {});
      const t = JSON.parse((await page.evaluate(() => JSON.stringify({ visivel: !document.getElementById('login-prompt-treta').hidden, titulo: document.getElementById('login-prompt-title').textContent, frase: document.getElementById('login-prompt-treta-headline').textContent, itens: [...document.querySelectorAll('#login-prompt-treta-list li')].map((li) => li.textContent), teto: document.getElementById('login-prompt-treta-cap').textContent, moeda: document.querySelector('#login-prompt-treta img')?.naturalWidth || 0, agoraNao: document.getElementById('login-prompt-guest').textContent.trim() }))).replace(/\u00a0/g, ' '));
      assert(t.visivel, 'convite sem os T$');
      assert.equal(t.titulo, 'Jogar logado rende T$');
      assert.match(t.frase, /treino.*T\$ 10/, t.frase);
      assert.deepEqual(t.itens, ['T$ 25 por partida multiplayer', 'T$ 10 por partida solo premiada', 'T$ 200 ao confirmar o e-mail, uma vez só']);
      assert.match(t.teto, /T\$ 250 por dia/);
      assert(t.moeda > 0, 'moeda não carregou');
      assert.equal(t.agoraNao, 'Agora não');
      await shot(page, 'desktop-3-convite');
      await page.click('#login-prompt-guest');
      await page.waitForTimeout(600);
      assert.equal(await convite(page), false, '"agora não" não fechou');
      assert.deepEqual(await abertos(page), [], 'apresentação da loja repetiu os T$ logo depois do convite');
      const rec = await page.evaluate(() => JSON.parse(localStorage.getItem('cs_login_prompt')));
      assert(rec && rec.matches === 0 && Date.now() - rec.dismissedAt < 120000, 'recusa não gravada');
      await jogaPartida(page, { nick: 'VISITA' });
      assert.equal(await convite(page), false, 'convite voltou na mesma visita');
      await shot(page, 'desktop-4-segunda-partida');
    } finally { await ctx.close(); }
  });
  await caso('LB2', 'browser: logado nunca vê o convite (abertura e pós-partida)', async () => {
    const { ctx, page } = await abre({ auth: LOGADO, nick: 'Logado', intro: true });
    try {
      assert.deepEqual(await abertos(page), [], 'modal na abertura');
      await jogaPartida(page);
      assert.equal(await convite(page), false, 'logado viu o convite');
    } finally { await ctx.close(); }
  });
  await caso('LB3', 'browser: sem campanha no ar, o convite não promete T$ e a apresentação da loja vem depois dele', async () => {
    const { ctx, page } = await abre({ nick: 'Visitante', consent: true, treta: null });
    try {
      assert.deepEqual(await abertos(page), [], 'modal na abertura');
      await page.evaluate(() => document.body.append(document.createElement('div')));
      await page.waitForTimeout(500);
      assert.deepEqual(await abertos(page), [], 'modal depois de mexer no DOM');
      await jogaPartida(page);
      assert.deepEqual(await abertos(page), ['login-prompt'], 'só o convite, sem empilhar');
      assert.equal(await page.evaluate(() => document.getElementById('login-prompt-treta').hidden), true, 'prometeu T$ sem campanha');
      assert.equal(await page.evaluate(() => document.getElementById('login-prompt-title').textContent), 'Entre na sua conta');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.getElementById('treta-info')?.open === true, null, { timeout: 10000 });
    } finally { await ctx.close(); }
  });
  await caso('LB4', 'browser: funil login_prompt_* sai no novo momento só com consentimento', async () => {
    const a = await abre({ nick: 'Visitante', consent: true, intro: true });
    try {
      await jogaPartida(a.page);
      assert.equal(await convite(a.page), true, `convite não abriu: ${await abertos(a.page)}`);
      await a.page.click('#login-prompt [data-provider=discord]');
      await a.page.waitForTimeout(300);
      await a.page.click('#login-prompt-close');
      await a.page.waitForTimeout(500);
      const steps = a.funil.map((f) => f.step);
      for (const s of ['login_prompt_shown', 'login_prompt_provider_click', 'login_prompt_dismissed']) assert(steps.includes(s), `${s} ausente: ${steps}`);
    } finally { await a.ctx.close(); }
    const b = await abre({ nick: 'Visitante', consent: false, intro: true });
    try {
      await jogaPartida(b.page);
      assert.equal(await convite(b.page), true, 'convite não abriu');
      await b.page.click('#login-prompt-guest');
      await b.page.waitForTimeout(400);
      assert.equal(b.funil.filter((f) => String(f.step).startsWith('login_prompt')).length, 0, 'evento sem consentimento');
    } finally { await b.ctx.close(); }
  });
  await caso('LB5', 'browser: recusa recente segura o convite depois da partida', async () => {
    const { ctx, page } = await abre({ nick: 'Visitante', seed: { dismissedAt: Date.now() - 3600e3, matches: 0 }, intro: true });
    try { await jogaPartida(page); assert.equal(await convite(page), false); } finally { await ctx.close(); }
  });
  await caso('LB6', 'browser: perfil compartilhado (?perfil=) e ?embed=1 não veem nada sozinhos', async () => {
    for (const query of ['?secao=comunidade&social=profile&perfil=fulano', '?embed=1']) {
      const { ctx, page } = await abre({ query });
      try {
        assert.equal(await convite(page), false, `${query}: convite`);
        assert.deepEqual(await abertos(page), [], `${query}: modal na abertura`);
      } finally { await ctx.close(); }
    }
  });
  await caso('LB7', 'browser: outro diálogo aberto na volta ao menu adia o convite', async () => {
    const { ctx, page } = await abre({ nick: 'Visitante', intro: true });
    try {
      await jogaPartida(page, { resultado: (p) => p.evaluate(() => { const d = document.createElement('dialog'); d.id = 'lp-outro'; document.body.append(d); d.show(); }) });
      assert.deepEqual(await abertos(page), ['lp-outro'], 'empilhou sobre outro diálogo');
      await page.evaluate(() => { document.getElementById('lp-outro').close(); document.body.append(document.createElement('div')); });
      await page.waitForFunction(() => document.getElementById('login-prompt')?.open === true, null, { timeout: 10000 });
    } finally { await ctx.close(); }
  });
  await caso('LB8', 'browser: mobile 390x844 sem modal na abertura; convite pós-partida cabe sem rolagem lateral', async () => {
    const { ctx, page } = await abre({ viewport: { width: 390, height: 844 } });
    try {
      assert.deepEqual(await abertos(page), [], 'modal na abertura');
      await shot(page, 'mobile-1-abertura');
      await jogaPartida(page, { resultado: (p) => shot(p, 'mobile-2-resultado') });
      assert.equal(await convite(page), true, 'convite não abriu');
      await page.waitForFunction(() => !document.getElementById('login-prompt-treta').hidden, null, { timeout: 10000 });
      const r = await page.evaluate(() => { const d = document.getElementById('login-prompt'), b = d.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, bt: b.bottom, sw: d.scrollWidth, cw: d.clientWidth }; });
      assert(r.l >= 0 && r.r <= 390 && r.t >= 0 && r.bt <= 844, `fora da tela ${JSON.stringify(r)}`);
      assert(r.sw <= r.cw, 'rolagem lateral');
      const alturas = await page.$$eval('#login-prompt button', (bs) => bs.filter((b) => b.offsetParent).map((b) => b.getBoundingClientRect().height));
      assert(alturas.every((h) => h >= 44), `alvo de toque < 44px: ${alturas}`);
      await shot(page, 'mobile-3-convite');
    } finally { await ctx.close(); }
  });
  await browser.close();
}

console.log(falhas ? `\n${falhas} RED${MUT ? ` [mutante ${MUT}]` : ''}` : `\nlogin-prompt: tudo verde${MUT ? ` [mutante ${MUT} NÃO pegou]` : ''}`);
process.exit(falhas ? 1 : (MUT ? 3 : 0));
