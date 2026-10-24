/* profile-friend-request-check.mjs · ADICIONAR AMIGO FUNCIONA E O PERFIL DOS OUTROS É PÚBLICO?
   Bug do dono (14/10/2026, alpha.92): clicar em PEDIR AMIZADE no perfil do #13 não fazia nada.
   Causa: social_action (backend, migration 040) só aceita alvo com conta (`auth_user is not
   null`); perfil de histórico sem conta responde 404 not_found. O cliente não tinha texto para
   not_found e escrevia o erro genérico no #social-status, que fica no topo da comunidade, fora
   da tela quando o perfil está rolado. Sucesso também só aparecia lá em cima.
   Pedido do dono (14/10, /u/<perfil> no hub): o botão vira ADICIONAR AMIGO e existe também para
   quem está deslogado (login e depois o pedido sai); amigo vê "AMIGOS", pedido pendente vê
   "PEDIDO ENVIADO"; abas de conta e de configuração só para o dono do perfil.

     FR1 · alvo sem conta (404 not_found): aviso ao lado do botão explica, e o botão some
     FR2 · alvo com conta: pedido sai uma vez, aviso "enviado" ao lado, selo PEDIDO ENVIADO e CANCELAR PEDIDO
     FR3 · falha de rede ou servidor: o erro aparece ao lado do botão, não só no topo
     FR4 · deslogado: ADICIONAR AMIGO guarda o pedido, abre SUA CONTA e não manda nada sem sessão
     FR5 · depois do login, o pedido guardado sai UMA vez, o perfil reabre com o aviso e o pedido some
     FR6 · amigo vê o selo AMIGOS e nenhum ADICIONAR AMIGO
     FR7 · perfil de outra pessoa (logado ou não): sem abas de conta, sem abas do perfil, sem rodadas
     FR8 · dono: abas do perfil; /u/<eu>/conquistas mostra só conquistas e /u/<eu>/privacidade abre as configurações

   Roda o public/js/community.js real numa DOM mínima, com a API social simulada.
   Uso: node tools/eval/profile-friend-request-check.mjs [--mutate] */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = (f) => readFileSync(path.join(ROOT, f), 'utf8');
const MUTATE = process.argv.includes('--mutate');
const EU = '11111111-1111-4111-8111-1111111111aa', ALVO = '22222222-2222-4222-8222-2222222222bb';

class El {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.dataset = {}; this.textContent = ''; this.className = ''; this.hidden = false; this.disabled = false; this.open = false; this.parent = null; }
  append(...n) { for (const x of n) if (x && typeof x === 'object') x.parent = this; this.children.push(...n); } replaceChildren(...n) { this.children = []; this.append(...n); this.textContent = ''; }
  setAttribute(k, v) { this.attrs[k] = String(v); } getAttribute(k) { return this.attrs[k] ?? null; } removeAttribute(k) { delete this.attrs[k]; if (k === 'open') this.open = false; }
  addEventListener() {} querySelector(sel) { return todos(this).find((n) => n.tagName === sel.toUpperCase()) || null; } focus() {} scrollIntoView() {}
  closest(sel) { let n = this; while (n) { if (n.tagName === sel.toUpperCase()) return n; n = n.parent; } return null; }
}
const todos = (n) => [n, ...n.children.filter((x) => x && typeof x === 'object').flatMap(todos)];
const semImport = (src) => src.replace(/^import[^\n]*\n/gm, '');
function carregar(ctx, src) {
  const nomes = [...src.matchAll(/export (?:async )?(?:function|const) (\w+)/g)].map((m) => m[1]);
  Object.assign(ctx, vm.runInContext(`(()=>{${semImport(src).replace(/export /g, '')};return {${nomes.join(',')}}})()`, ctx));
}
const esperar = async () => { for (let n = 0; n < 30; n++) await new Promise((r) => setImmediate(r)); };
const ABAS = ['profile', 'friends', 'ranking', 'notifications', 'feed', 'settings'];

/* `pedido` responde ao POST request: {status, body}. `quem`: 'eu' (logado), 'deslogado'.
   `alvo`: id do perfil aberto (ALVO ou EU). `caminho`: location.pathname. `guardado`: localStorage inicial. */
async function abrir(community, pedido, { quem = 'eu', alvo = ALVO, relacao: rel0 = null, caminho = `/u/${alvo}`, guardado = {}, falhaEstado = false, semHandle = false } = {}) {
  const ids = Object.fromEntries(['community', 'social-status', 'social-account', 'social-content', 'social-unread', 'hub-social-unread', 'main-menu'].map((id) => [id, new El('div')]));
  ids['main-menu'].dataset = { hubTab: 'comunidade' };
  const painel = new El('details'); painel.append(ids['social-account']);
  ids.community.dataset = { profile: '', tab: 'profile', site: 'http://localhost' };
  const abas = ABAS.map((t) => { const b = new El('button'); b.dataset.tab = t; return b; });
  let relacao = rel0; const posts = [], urls = [];
  const storage = { ...guardado };
  const localStorage = { getItem: (k) => storage[k] ?? null, setItem: (k, v) => { storage[k] = String(v); }, removeItem: (k) => { delete storage[k]; } };
  const location = { origin: 'http://localhost', pathname: caminho, get href() { return `http://localhost${this.pathname}`; }, search: '' };
  const history = { state: null, pushState: (s, t, u) => { urls.push(String(u)); location.pathname = new URL(u, 'http://localhost').pathname; }, replaceState: (s, t, u) => { urls.push(String(u)); location.pathname = new URL(u, 'http://localhost').pathname; } };
  const perfil = (id) => ({ id: id === 'eu_mesmo' ? EU : id, nick: id === EU || id === 'eu_mesmo' ? 'Eu' : 'Kogos', url: id === EU || id === 'eu_mesmo' ? (semHandle?`/u/${EU}/Eu`:'/u/eu_mesmo') : `/u/${ALVO}`, handle: (id === EU || id === 'eu_mesmo') && !semHandle ? 'eu_mesmo' : null, visibility: 'public', source: 'historical_plus_server_verified', relationship: id === EU || id === 'eu_mesmo' ? null : relacao,
    points: 2772, kills: 2763, deaths: 149, kd: 18.54, matches: 39, round_wins: 52, round_losses: 6, level: 28, next_level_points: 28, position: 13,
    bio: '', socials: [], avatar_url: null, last_character: null, account_verified: false, achievements: [{ key: 'first_kill', at: '2026-09-01T00:00:00Z' }], favorites: [], history: [], play_seconds: 0, legacy_points: 1928, verified_points: 844, settings: { share_character: false, profile: 'public', presence: 'friends', activity: 'friends' } });
  const estado = () => ({ profile: perfil(EU), friends: [], requests: [], notifications: [], blocks: [], feed: [], invites: [], inbox: { conversations: [] } });
  const sessao = () => (quem === 'eu' ? { authenticated: true, profile: { id: EU, nick: 'Eu' } } : { authenticated: false });
  const ctx = vm.createContext({
    document: { createElement: (t) => new El(t), createTextNode: (t) => t, getElementById: (id) => ids[id] || null, querySelectorAll: (sel) => (sel === '.social-tabs button' ? abas : []), addEventListener() {}, dispatchEvent() {}, hidden: false },
    URL, URLSearchParams, console, location, history, localStorage, AbortSignal: { timeout: () => null }, setInterval: () => 1, Date,
    navigator: { clipboard: { writeText: async () => {} } }, CustomEvent: class {},
    fetch: async (url, opts = {}) => {
      if (opts.method === 'POST') {
        const body = JSON.parse(opts.body); posts.push(body);
        if (quem !== 'eu') return { ok: false, status: 401, json: async () => ({ error: 'session_expired' }) };
        if (body.action !== 'request') return { ok: true, json: async () => ({ ok: true }) };
        const r = await pedido(body);
        if (r.status === 200 && r.body?.state) relacao = r.body.state === 'accepted' ? 'friend' : 'outgoing';
        return { ok: r.status < 400, status: r.status, json: async () => r.body };
      }
      const q = new URL(url, 'http://localhost').searchParams, a = q.get('action');
      if (a === 'profile') return { ok: true, json: async () => ({ profile: perfil(q.get('id') || EU) }) };
      if (quem !== 'eu') return { ok: false, status: 401, json: async () => ({ error: 'session_expired' }) };
      if (falhaEstado) return { ok: false, status: 503, json: async () => ({ error: 'social_unavailable' }) };
      return { ok: true, json: async () => estado() };
    },
    mountAccountEntry() {}, mountProfilePreferences() {}, mountAccountIntegrations() {}, acceptAccount() {}, logoutAccount() {},
    loadAccount: async () => sessao(), loadAuthOptions: async () => ({ providers: [] }),
  });
  for (const f of ['profile-character-catalog', 'career-rank', 'account-verified', 'community-inbox', 'profile-character', 'ranking-player']) carregar(ctx, read(`public/js/${f}.js`));
  if (alvo !== EU || caminho.startsWith('/u/')) ids.community.dataset.profile = '';
  vm.runInContext(semImport(community).replace("profileId=root.dataset.profile || new URLSearchParams(location.search).get('perfil') || ''", `profileId=${JSON.stringify(alvo === EU && !caminho.startsWith('/u/') ? '' : alvo)}`), ctx, { timeout: 1000 });
  await esperar();
  const raiz = ids['social-content'];
  const botao = (t) => todos(raiz).find((n) => n.tagName === 'BUTTON' && n.textContent === t);
  const selo = (t) => todos(raiz).find((n) => n.tagName === 'SPAN' && n.className === 'social-chip' && n.textContent === t);
  const aviso = () => todos(raiz).find((n) => n.className === 'social-inline-status');
  const texto = () => todos(raiz).map((n) => n.textContent).join(' | ');
  const abasVisiveis = () => abas.filter((b) => !b.hidden).map((b) => b.dataset.tab).join();
  const abasPerfil = () => todos(raiz).filter((n) => n.tagName === 'BUTTON' && n.dataset.aba !== undefined).map((n) => n.textContent).join();
  return { raiz, botao, selo, aviso, texto, posts, urls, storage, painel, abasVisiveis, abasPerfil, topo: ids['social-status'], clicar: async (t) => { await botao(t).onclick(); await esperar(); } };
}

const CASOS = [
  ['FR1 · alvo sem conta: explica ao lado e tira o botão', async (c) => {
    const u = await abrir(c, async () => ({ status: 404, body: { error: 'not_found' } }));
    if (!u.botao('ADICIONAR AMIGO')) return 'perfil sem ADICIONAR AMIGO na fixture';
    await u.clicar('ADICIONAR AMIGO');
    if (u.posts.filter((p) => p.action === 'request').length !== 1) return 'pedido não saiu';
    if (!/não tem conta/.test(u.aviso()?.textContent || '')) return `aviso ao lado: "${u.aviso()?.textContent || ''}"`;
    if (u.botao('ADICIONAR AMIGO')) return 'botão continua oferecendo uma ação que o servidor recusa';
    return null;
  }],
  ['FR2 · alvo com conta: enviado ao lado, selo PEDIDO ENVIADO e CANCELAR PEDIDO', async (c) => {
    const u = await abrir(c, async () => ({ status: 200, body: { ok: true, state: 'pending' } }));
    await u.clicar('ADICIONAR AMIGO');
    if (!/Pedido de amizade enviado/.test(u.aviso()?.textContent || '')) return `aviso ao lado: "${u.aviso()?.textContent || ''}"`;
    if (!u.botao('CANCELAR PEDIDO')) return 'botão não mudou para CANCELAR PEDIDO';
    if (!u.selo('PEDIDO ENVIADO')) return 'sem o estado PEDIDO ENVIADO';
    if (u.botao('ADICIONAR AMIGO')) return 'ADICIONAR AMIGO continua depois do pedido';
    if (u.posts.filter((p) => p.action === 'request').length !== 1) return 'pedido duplicado';
    return null;
  }],
  ['FR3 · falha do servidor aparece ao lado do botão', async (c) => {
    const u = await abrir(c, async () => ({ status: 503, body: { error: 'social_unavailable' } }));
    const antes = u.aviso();
    await u.botao('ADICIONAR AMIGO').onclick(); await esperar();
    if (!/fora do ar/.test(antes?.textContent || '')) return `erro só no topo: aviso="${antes?.textContent || ''}" topo="${u.topo.textContent}"`;
    return null;
  }],
  ['FR4 · deslogado: ADICIONAR AMIGO guarda o pedido e abre o login', async (c) => {
    const u = await abrir(c, async () => ({ status: 200, body: { state: 'pending' } }), { quem: 'deslogado' });
    if (!u.botao('ADICIONAR AMIGO')) return `deslogado sem ADICIONAR AMIGO: ${u.texto().slice(0, 200)}`;
    await u.clicar('ADICIONAR AMIGO');
    const guardado = JSON.parse(u.storage.cs_amizade_pendente || 'null');
    if (guardado?.id !== ALVO) return `pedido não ficou guardado: ${u.storage.cs_amizade_pendente}`;
    if (!u.painel.open || u.painel.hidden) return 'o login (SUA CONTA) não abriu';
    if (!/Entre na conta/.test(u.aviso()?.textContent || '')) return `sem aviso de login ao lado: "${u.aviso()?.textContent || ''}"`;
    if (u.posts.some((p) => p.action === 'request')) return 'mandou pedido sem sessão';
    /* Desde 22/10 o visitante vê o PRÓPRIO perfil (cs_anon). Nele não cabe pedir amizade a si mesmo. */
    const eu = await abrir(c, async () => ({ status: 200, body: { state: 'pending' } }), { quem: 'deslogado', guardado: { cs_anon: ALVO } });
    if (eu.botao('ADICIONAR AMIGO')) return 'convidado vê ADICIONAR AMIGO no próprio perfil';
    return null;
  }],
  ['FR5 · depois do login, o pedido guardado sai uma vez e o perfil reabre', async (c) => {
    const guardado = { cs_amizade_pendente: JSON.stringify({ id: ALVO, url: `/u/${ALVO}`, at: Date.now() }) };
    const u = await abrir(c, async () => ({ status: 200, body: { ok: true, state: 'pending' } }), { alvo: EU, caminho: '/comunidade', guardado });
    const pedidos = u.posts.filter((p) => p.action === 'request');
    if (pedidos.length !== 1 || pedidos[0].target !== ALVO) return `pedidos depois do login: ${JSON.stringify(pedidos)}`;
    if ('cs_amizade_pendente' in u.storage) return 'pedido guardado não foi limpo (sairia de novo)';
    if (!u.urls.includes(`/u/${ALVO}`)) return `perfil não reabriu no endereço: ${u.urls}`;
    if (!/Pedido de amizade enviado/.test(u.aviso()?.textContent || '')) return `sem aviso de enviado: "${u.aviso()?.textContent || ''}"`;
    if (!u.selo('PEDIDO ENVIADO')) return 'perfil reaberto sem PEDIDO ENVIADO';
    const velho = await abrir(c, async () => ({ status: 200, body: { state: 'pending' } }), { alvo: EU, caminho: '/comunidade', guardado: { cs_amizade_pendente: JSON.stringify({ id: ALVO, at: Date.now() - 2 * 3600000 }) } });
    if (velho.posts.some((p) => p.action === 'request')) return 'pedido guardado há mais de 1 h ainda saiu';
    return null;
  }],
  ['FR6 · amigo vê o selo AMIGOS', async (c) => {
    const u = await abrir(c, async () => ({ status: 200, body: {} }), { relacao: 'friend' });
    if (!u.selo('AMIGOS ✓')) return 'amigo sem o selo AMIGOS';
    if (u.botao('ADICIONAR AMIGO')) return 'amigo ainda vê ADICIONAR AMIGO';
    return null;
  }],
  ['FR7 · perfil de outra pessoa: sem abas de conta, sem abas do perfil, sem rodadas', async (c) => {
    for (const quem of ['eu', 'deslogado']) {
      const u = await abrir(c, async () => ({ status: 200, body: {} }), { quem });
      if (u.abasVisiveis() !== 'profile,ranking') return `${quem}: abas visíveis ${u.abasVisiveis()}`;
      if (u.abasPerfil()) return `${quem}: abas do perfil para visitante: ${u.abasPerfil()}`;
      if (/Rodadas recentes|Preferências na arena/.test(u.texto())) return `${quem}: rodadas de quem não é amigo aparecem`;
      if (!/Conquistas/.test(u.texto())) return `${quem}: conquistas públicas sumiram`;
    }
    return null;
  }],
  ['FR8 · dono: abas do perfil, conquistas sozinha e privacidade nas configurações', async (c) => {
    const u = await abrir(c, async () => ({ status: 200, body: {} }), { alvo: EU, caminho: '/u/eu_mesmo' });
    if (u.abasPerfil() !== 'PERFIL,CONQUISTAS,PARTIDAS,PRIVACIDADE') return `abas do dono: ${u.abasPerfil()}`;
    if (u.abasVisiveis() !== ABAS.join()) return `dono perdeu abas de conta: ${u.abasVisiveis()}`;
    if (u.botao('ADICIONAR AMIGO')) return 'dono vê ADICIONAR AMIGO no próprio perfil';
    const conq = await abrir(c, async () => ({ status: 200, body: {} }), { alvo: EU, caminho: '/u/eu_mesmo/conquistas' });
    if (!/Primeiro abate/.test(conq.texto()) || /RANKING GERAL|Rodadas recentes/.test(conq.texto())) return `aba conquistas: ${conq.texto().slice(0, 160)}`;
    const priv = await abrir(c, async () => ({ status: 200, body: {} }), { alvo: EU, caminho: '/u/eu_mesmo/privacidade' });
    if (!/Seu perfil, suas regras/.test(priv.texto())) return `aba privacidade não abre as configurações: ${priv.texto().slice(0, 160)}`;
    await u.botao('PARTIDAS').onclick(); await esperar();
    if (u.urls.at(-1) !== '/u/eu_mesmo/partidas' && !String(u.urls.at(-1)).endsWith('/u/eu_mesmo/partidas')) return `aba PARTIDAS não grava o endereço: ${u.urls}`;
    if (!/Rodadas recentes/.test(u.texto())) return 'aba PARTIDAS sem as rodadas';
    return null;
  }],
  ['FR9 · privacidade direta usa o perfil próprio mesmo se o estado da resenha falhar', async (c) => {
    const u = await abrir(c, async () => ({ status: 200, body: {} }), { alvo: EU, caminho: '/u/eu_mesmo/privacidade', falhaEstado: true });
    if (!/Seu perfil, suas regras/.test(u.texto())) return `configurações próprias sumiram com a falha do estado: ${u.texto().slice(0, 180)}`;
    if (/Entre para configurar seu perfil/.test(u.texto())) return 'dono foi tratado como visitante na própria privacidade';
    if (/fora do ar/.test(u.topo.textContent)) return `perfil carregado recebeu erro global: ${u.topo.textContent}`;
    return null;
  }],
  ['FR10 · configurações da comunidade usam o perfil próprio e salvam sem o estado agregado', async (c) => {
    const u = await abrir(c, async () => ({ status: 200, body: {} }), { alvo: EU, caminho: '/comunidade/configuracoes', falhaEstado: true });
    if (!/Seu perfil, suas regras/.test(u.texto())) return `configurações da comunidade indisponíveis: ${u.texto().slice(0, 180)}`;
    if (!u.botao('SALVAR PERFIL')) return 'formulário próprio sem SALVAR PERFIL';
    await u.clicar('SALVAR PERFIL');
    if (u.posts.filter(p => p.action === 'settings').length !== 1) return `salvamentos enviados: ${JSON.stringify(u.posts)}`;
    if (/fora do ar/.test(u.topo.textContent)) return `salvamento concluído recebeu erro global: ${u.topo.textContent}`;
    return null;
  }],
  ['FR11 · abas de conta sem handle usam o UUID, não o nick legado', async (c) => {
    const u = await abrir(c, async () => ({ status: 200, body: {} }), { alvo: EU, caminho: `/u/${EU}/Eu`, semHandle: true });
    await u.botao('CONQUISTAS').onclick();await esperar();
    const esperado=`/u/${EU}/conquistas`;
    if (u.urls.at(-1)!==esperado && !String(u.urls.at(-1)).endsWith(esperado)) return `aba sem handle abriu ${u.urls.at(-1)}, esperado ${esperado}`;
    return null;
  }],
];

const rodar = async (c) => { const out = []; for (const [nome, f] of CASOS) { let erro; try { erro = await f(c); } catch (e) { erro = `exceção: ${e.message}`; } out.push({ nome, erro }); } return out; };
const fonte = read('public/js/community.js');

if (MUTATE) {
  const MUTANTES = [
    ['FR1', 'sem texto para not_found', fonte.replace("if(e.message!=='not_found')throw e;", 'throw e;')],
    ['FR1', 'botão não some', fonte.replace("else if(!noAccountTargets.has(p.id))buttons.append(button('ADICIONAR AMIGO'", "else buttons.append(button('ADICIONAR AMIGO'")],
    ['FR2', 'volta ao action() sem aviso', fonte.replace("()=>requestFriend(p)", "()=>action('request',p.id)")],
    ['FR3', 'erro só no topo', fonte.replace('if(feedback)feedback.textContent=t;', '')],
    ['FR2', 'pedido pendente sem estado', fonte.replace("buttons.append(chip('PEDIDO ENVIADO'),", 'buttons.append(')],
    ['FR4', 'deslogado sem botão', fonte.replace("else if(!own && !euConvidado && !noAccountTargets.has(p.id))buttons.append(button('ADICIONAR AMIGO',()=>askLoginForFriend(p)", "else if(false)buttons.append(button('ADICIONAR AMIGO',()=>askLoginForFriend(p)")],
    ['FR4', 'convidado pede amizade a si mesmo', fonte.replace('!own && !euConvidado && !noAccountTargets.has(p.id)', '!own && !noAccountTargets.has(p.id)')],
    ['FR4', 'deslogado não guarda o pedido', fonte.replace("try{localStorage.setItem(PENDING_FRIEND,", 'try{void(PENDING_FRIEND,')],
    ['FR5', 'pedido guardado nunca sai', fonte.replace('await refresh();await completePendingFriend();', 'await refresh();')],
    ['FR5', 'pedido guardado não é limpo', fonte.replace('localStorage.removeItem(PENDING_FRIEND);', '')],
    ['FR5', 'pedido guardado sem validade', fonte.replace(' || !(Date.now()-Number(pending.at)<3600000)', '')],
    ['FR6', 'amigo sem selo', fonte.replace("buttons.append(chip('AMIGOS ✓'));", '')],
    ['FR7', 'abas de conta no perfil alheio', fonte.replace('b.hidden=viewingOther && PRIVATE_TABS.includes(b.dataset.tab);', 'b.hidden=false;')],
    ['FR7', 'abas do perfil para visitante', fonte.replace('if(!own){content.append(c);return;}', '')],
    ['FR7', 'rodadas para quem não é amigo', fonte.replace('if(activityVisible)c.append(secPartidas);else c.append(empty(noActivity));', 'c.append(secPartidas);')],
    ['FR8', 'dono sem aba de privacidade', fonte.replace("if(profileAba==='privacidade'){content.append(nav);showSettings(p);return;}", '')],
    ['FR8', 'aba não grava o endereço', fonte.replace("if(alvo.href!==location.href)history.pushState(null,'',alvo);", '')],
    ['FR9', 'privacidade volta a depender do estado inteiro', fonte.replace("showSettings(p);return;", "showSettings();return;")],
    ['FR10', 'configurações não buscam o perfil próprio como fallback', fonte.replace("if(!settingsProfile && auth?.profile)try{", "if(false)try{")],
    ['FR11', 'abas sem handle voltam a aninhar no nick legado', fonte.replace("base=`/u/${encodeURIComponent(p.handle || p.id)}`", "base=p.url")],
  ];
  let cegas = 0;
  console.log('ADICIONAR AMIGO E PERFIL PÚBLICO (MUTANTES: cada um tem que FALHAR)\n');
  for (const [alvo, nome, src] of MUTANTES) {
    if (src === fonte) { console.error(`✗ MUTANTE NÃO APLICOU: ${nome}`); process.exit(1); }
    const mordeu = (await rodar(src)).some((r) => r.nome.startsWith(alvo) && r.erro);
    if (!mordeu) cegas++;
    console.log(` ${mordeu ? '✓' : '✗'} ${alvo} · ${nome}`);
  }
  if (cegas) { console.error(`\n✗ RÉGUA CEGA: ${cegas} mutante(s) passaram.`); process.exit(1); }
  console.log(`\n✓ a régua MORDE: os ${MUTANTES.length} mutantes ficaram vermelhos.`);
  process.exit(0);
}
const res = await rodar(fonte);
for (const r of res) console.log(` ${r.erro ? '✗' : '✓'} ${r.nome}${r.erro ? '\n     ' + r.erro : ''}`);
const falhas = res.filter((r) => r.erro).length;
console.log(`\n${falhas ? '✗' : '✓'} adicionar amigo e perfil público ${res.length - falhas}/${res.length}`);
process.exit(falhas ? 1 : 0);
