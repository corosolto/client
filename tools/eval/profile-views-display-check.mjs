/* profile-views-display-check.mjs — O PERFIL MOSTRA AS VISUALIZAÇÕES SEM DEPENDER DO BACKEND NOVO?
   Pedido do dono (14/10/2026): número de visualizações no perfil. A contagem e o dedupe
   vivem no backend (migration 064, api/_lib/profile-views.ts). Aqui só o cliente:

     VW1 · no jogo, o total aparece em pt-BR ("1.234 visualizações", "1 visualização") só
           quando a API manda `views`; sem o campo, nada aparece
     VW2 · abrir o perfil de OUTRA pessoa manda UM POST profile_view por carregamento;
           o próprio perfil não manda; reabrir o mesmo perfil não manda de novo
     VW3 · backend sem a 064 (401/400/erro de rede) não apaga o perfil nem mexe na sessão
     VW4 · na página SSR /u/<perfil> (handler de .vercel/output): total quando há o campo,
           nada sem ele, e o SSR nunca conta visita (crawler e prévia de link não contam)

   Uso: npm run build && node tools/eval/profile-views-display-check.mjs [--mutate] */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const FUNC = path.join(ROOT, '.vercel/output/functions/_render.func');
const MUTATE = process.argv.includes('--mutate');
const read = (f) => readFileSync(path.join(ROOT, f), 'utf8');
const ID = '44444444-4444-4444-8444-4444444444dd', EU = '55555555-5555-4555-8555-5555555555ee', HANDLE = 'views_fixture';
const PERFIL = { id: ID, handle: HANDLE, nick: 'Views Fixture', url: `/u/${HANDLE}`, visibility: 'public', source: 'server_verified',
  points: 10, kills: 1, deaths: 1, kd: 1, round_wins: 1, wins: 1, losses: 0, matches: 1, rounds: 1, level: 1, next_level_points: 90, position: 9,
  bio: '', socials: [], avatar_url: null, last_character: null, account_verified: false, achievements: [], favorites: [], history: [], play_seconds: 0 };

class El {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.dataset = {}; this.textContent = ''; this.className = ''; this.hidden = false; }
  append(...n) { this.children.push(...n); } replaceChildren(...n) { this.children = n; this.textContent = ''; }
  setAttribute(k, v) { this.attrs[k] = String(v); } getAttribute(k) { return this.attrs[k] ?? null; } removeAttribute(k) { delete this.attrs[k]; }
  addEventListener() {} querySelector() { return null; } focus() {}
}
const todos = (n) => [n, ...n.children.filter((x) => x && typeof x === 'object').flatMap(todos)];
const texto = (n) => [n.textContent, ...n.children.map((x) => (typeof x === 'object' ? texto(x) : x))].join(' ');
const semImport = (src) => src.replace(/^import[^\n]*\n/gm, '');
function carregar(ctx, src) {
  const nomes = [...src.matchAll(/export (?:async )?(?:function|const) (\w+)/g)].map((m) => m[1]);
  Object.assign(ctx, vm.runInContext(`(()=>{${semImport(src).replace(/export /g, '')};return {${nomes.join(',')}}})()`, ctx));
}

// Roda o community.js real com a API social simulada. `post` responde ao POST profile_view.
async function noJogo(b, { perfil = PERFIL, eu = null, post = async () => ({ ok: true, json: async () => ({ counted: true }) }) } = {}) {
  const ids = Object.fromEntries(['community', 'social-status', 'social-account', 'social-content', 'social-unread', 'hub-social-unread', 'social-hello', 'social-logout'].map((id) => [id, new El('div')]));
  ids.community.dataset = { profile: perfil.id, tab: 'profile' };
  const posts = [], listeners = {};
  const ctx = vm.createContext({
    document: { createElement: (t) => new El(t), createTextNode: (t) => t, getElementById: (id) => ids[id] || null, querySelectorAll: () => [], addEventListener: (t, f) => { listeners[t] = f; } },
    URL, URLSearchParams, console, location: { origin: 'http://localhost', href: 'http://localhost/', search: '' }, AbortSignal: { timeout: () => null }, setInterval: () => 1,
    navigator: { clipboard: { writeText: async () => {} } }, CustomEvent: class {},
    fetch: async (alvo, opts = {}) => {
      if (opts.method === 'POST') { const body = JSON.parse(opts.body); posts.push(body); return body.action === 'profile_view' ? post(body) : { ok: true, json: async () => ({}) }; }
      const a = new URL(alvo, 'http://localhost').searchParams.get('action');
      const estado = eu ? { profile: { id: eu, nick: 'Eu' }, friends: [], requests: [], notifications: [], blocks: [], feed: [], invites: [], inbox: { conversations: [] } } : {};
      return { ok: true, json: async () => (a === 'profile' ? { profile: perfil } : estado) };
    },
    mountAccountEntry() {}, mountProfilePreferences() {}, mountAccountIntegrations() {}, acceptAccount() {}, logoutAccount() {},
    loadAccount: async () => (eu ? { authenticated: true, profile: { id: eu, nick: 'Eu' } } : { authenticated: false }), loadAuthOptions: async () => ({ providers: [] }),
  });
  for (const f of ['profile-character-catalog', 'career-rank', 'account-verified', 'community-inbox', 'profile-character', 'ranking-player']) carregar(ctx, read(`public/js/${f}.js`));
  vm.runInContext(semImport(b.community), ctx, { timeout: 1000 });
  const esperar = async () => { for (let n = 0; n < 16; n++) await new Promise((r) => setImmediate(r)); };
  await esperar();
  return { raiz: ids['social-content'], conta: ids['social-account'], logout: ids['social-logout'], posts, reabrir: async () => { listeners['cs-community-open']?.({ detail: { tab: 'profile' } }); await esperar(); } };
}
const linhaViews = (raiz) => todos(raiz).find((n) => n.className === 'social-profile-views');

async function coletar() {
  const base = { community: read('public/js/community.js'), ssr: {} };
  const cfg = path.join(FUNC, '.vc-config.json');
  const entry = existsSync(cfg) && path.join(FUNC, JSON.parse(readFileSync(cfg, 'utf8')).handler);
  if (!entry || !existsSync(entry)) return null;
  process.chdir(FUNC);
  const { default: handler } = await import(pathToFileURL(entry).href);
  const real = globalThis.fetch;
  for (const [nome, perfil] of [['com', { ...PERFIL, views: 1234 }], ['sem', PERFIL]]) {
    const pedidos = [];
    globalThis.fetch = async (alvo, init) => {
      const url = String(alvo?.url ?? alvo), metodo = alvo?.method || init?.method || 'GET';
      if (url.includes('/api/social')) { pedidos.push(`${metodo} ${url}`); return Response.json({ profile: perfil }); }
      return real(alvo, init);
    };
    const r = await handler.fetch(new Request(`https://www.corosolto.com.br/u/${HANDLE}`, { headers: { 'x-forwarded-for': '127.0.0.1' } }));
    base.ssr[nome] = { status: r.status, html: await r.text(), pedidos };
  }
  globalThis.fetch = real;
  process.chdir(ROOT);
  return base;
}

const CASOS = [
  ['VW1 · total em pt-BR só quando a API manda o campo', async (b) => {
    const muitos = await noJogo(b, { perfil: { ...PERFIL, views: 1234 } });
    if (linhaViews(muitos.raiz)?.textContent !== '1.234 visualizações') return `total errado: ${linhaViews(muitos.raiz)?.textContent}`;
    const um = await noJogo(b, { perfil: { ...PERFIL, views: 1 } });
    if (linhaViews(um.raiz)?.textContent !== '1 visualização') return `singular errado: ${linhaViews(um.raiz)?.textContent}`;
    const sem = await noJogo(b);
    if (linhaViews(sem.raiz) || /visualiza/.test(texto(sem.raiz))) return 'sem o campo, o jogo inventou visualizações';
    for (const lixo of ['12', -1, 1.5, null]) { const x = await noJogo(b, { perfil: { ...PERFIL, views: lixo } }); if (linhaViews(x.raiz)) return `campo inválido ${JSON.stringify(lixo)} virou total`; }
    if (!/Views Fixture/.test(texto(sem.raiz))) return 'perfil não desenhado';
    return null;
  }],
  ['VW2 · um aviso por perfil alheio; nunca o próprio', async (b) => {
    const visita = await noJogo(b, { post: async () => ({ ok: true, json: async () => ({ counted: true, views: 8 }) }), perfil: { ...PERFIL, views: 7 } });
    const avisos = visita.posts.filter((p) => p.action === 'profile_view');
    if (avisos.length !== 1 || avisos[0].target !== ID) return `avisos: ${JSON.stringify(avisos)}`;
    if (linhaViews(visita.raiz)?.textContent !== '8 visualizações') return `total não acompanhou a resposta: ${linhaViews(visita.raiz)?.textContent}`;
    await visita.reabrir();
    if (visita.posts.filter((p) => p.action === 'profile_view').length !== 1) return 'reabrir o mesmo perfil mandou outro aviso';
    const logado = await noJogo(b, { eu: EU });
    if (logado.posts.filter((p) => p.action === 'profile_view').length !== 1) return 'visitante logado não avisou';
    const proprio = await noJogo(b, { eu: ID });
    if (proprio.posts.some((p) => p.action === 'profile_view')) return 'o próprio perfil contou visita';
    return null;
  }],
  ['VW3 · backend sem a 064 não apaga o perfil nem a sessão', async (b) => {
    for (const post of [async () => ({ ok: false, status: 401, json: async () => ({ error: 'session_expired' }) }), async () => ({ ok: false, status: 400, json: async () => ({ error: 'bad' }) }), async () => { throw new Error('rede'); }]) {
      const x = await noJogo(b, { eu: EU, post });
      if (!/Views Fixture/.test(texto(x.raiz))) return 'falha do aviso apagou o perfil';
      if (/Não foi possível|indisponível/.test(texto(x.raiz))) return 'falha do aviso virou erro na tela';
      if (x.logout.hidden) return 'falha do aviso derrubou a sessão';
    }
    return null;
  }],
  ['VW4 · SSR mostra o total quando há o campo e nunca conta visita', async (b) => {
    const { com, sem } = b.ssr;
    if (com.status !== 200 || sem.status !== 200) return `status ${com.status}/${sem.status}`;
    if (!/<p class="views"[^>]*>1\.234 visualizações<\/p>/.test(com.html)) return 'SSR sem o total';
    // /u/<perfil> é o hub: mede o perfil SSR, não os comentários do HTML do jogo em volta.
    const perfil = sem.html.match(/<article\b[^>]*profile-sheet[\s\S]*?<\/article>/)?.[0];
    if (!perfil) return 'SSR sem o perfil legível';
    if (/visualiza/.test(perfil)) return 'SSR inventou total sem o campo';
    const posts = [...com.pedidos, ...sem.pedidos].filter((p) => !p.startsWith('GET '));
    if (posts.length || [...com.pedidos, ...sem.pedidos].some((p) => p.includes('profile_view'))) return `SSR contou visita: ${posts.join(' ')}`;
    return null;
  }],
];

const rodar = async (b) => { const out = []; for (const [nome, f] of CASOS) { let erro; try { erro = await f(b); } catch (e) { erro = `exceção: ${e.message}`; } out.push({ nome, erro }); } return out; };
const build = await coletar();
if (!build) { console.error('✗ sem build: rode `npm run build` antes (precisa de .vercel/output).'); process.exit(1); }

if (MUTATE) {
  const c = (antes, depois) => (b) => ({ ...b, community: b.community.replace(antes, depois) });
  const MUTANTES = [
    ['VW1', 'mostra zero sem o campo', c("const views=Number.isSafeInteger(p.views) && p.views>=0?el('p',viewsText(p.views),'social-profile-views'):null;", "const views=el('p',viewsText(Number(p.views) || 0),'social-profile-views');")],
    ['VW1', 'sem singular', c("n===1?'visualização':'visualizações'", "'visualizações'")],
    ['VW1', 'sem formato pt-BR', c("n.toLocaleString('pt-BR')", 'String(n)')],
    ['VW2', 'conta o próprio perfil', c(' || auth?.profile?.id===p.id)return;', ')return;')],
    ['VW2', 'avisa a cada abertura', c(' || viewedProfiles.has(p.id)', '')],
    ['VW2', 'nunca avisa', c('countProfileView(p,views);', '')],
    ['VW3', 'aviso pela api() que derruba a sessão', c("fetch('/api/social',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action:'profile_view',target:p.id}),signal:AbortSignal.timeout(12000)}).then(r=>r.ok?r.json():null)", "api('/api/social',{action:'profile_view',target:p.id})")],
    ['VW4', 'SSR sem o total', (b) => ({ ...b, ssr: { ...b.ssr, com: { ...b.ssr.com, html: b.ssr.com.html.replace(/<p class="views"[^>]*>[^<]*<\/p>/, '') } } })],
    ['VW4', 'SSR conta visita', (b) => ({ ...b, ssr: { ...b.ssr, com: { ...b.ssr.com, pedidos: [...b.ssr.com.pedidos, 'POST /api/social profile_view'] } } })],
  ];
  let cegas = 0;
  console.log('VISUALIZAÇÕES NO PERFIL (MUTANTES: cada um tem que FALHAR)\n');
  for (const [alvo, nome, aplica] of MUTANTES) {
    const m = aplica(build);
    if (JSON.stringify(m) === JSON.stringify(build)) { console.error(`✗ MUTANTE NÃO APLICOU: ${nome}`); process.exit(1); }
    const mordeu = (await rodar(m)).some((r) => r.nome.startsWith(alvo) && r.erro);
    if (!mordeu) cegas++;
    console.log(` ${mordeu ? '✓' : '✗'} ${alvo} · ${nome}`);
  }
  if (cegas) { console.error(`\n✗ RÉGUA CEGA: ${cegas} mutante(s) passaram.`); process.exit(1); }
  console.log(`\n✓ a régua MORDE: os ${MUTANTES.length} mutantes ficaram vermelhos.`);
  process.exit(0);
}

const res = await rodar(build);
for (const r of res) console.log(` ${r.erro ? '✗' : '✓'} ${r.nome}${r.erro ? '\n     ' + r.erro : ''}`);
const falhas = res.filter((r) => r.erro).length;
console.log(`\n${falhas ? '✗' : '✓'} visualizações no perfil ${res.length - falhas}/${res.length}`);
process.exit(falhas ? 1 : 0);
