/* profile-character-empty-check.mjs · O PERFIL DIZ POR QUE NÃO MOSTRA O PERSONAGEM?
   Pedido do dono (14/10/2026): o #13 mostrava "Nenhum personagem disponível para mostrar".
   Causa medida em prod: last_character só sai aberto quando a pessoa marcou "Mostrar meu último
   personagem" (players.share_character, padrão false desde a 048), ou para ela mesma e amigos.
   No ranking público de 14/10, 0 de 125 jogadores têm last_character: ninguém marcou.
   Não há outra fonte confiável para o histórico antigo: ranking_legacy_totals não guarda personagem,
   e stats.last_character era declarado pelo navegador e ligado por nick.

     PC1 · outro jogador sem personagem: diz que não compartilha (ou sem rodada confirmada)
     PC2 · a própria pessoa com share desligado vê o personagem e o caminho para mostrar a todos
     PC3 · personagem compartilhado continua aparecendo, sem aviso
     PC4 · página SSR /u: vazio explica a escolha do jogador, sem "Nenhum personagem disponível"

   Uso: npm run build && node tools/eval/profile-character-empty-check.mjs [--mutate] */
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = (f) => readFileSync(path.join(ROOT, f), 'utf8');
const MUTATE = process.argv.includes('--mutate');
const EU = '11111111-1111-4111-8111-1111111111aa', ALVO = '22222222-2222-4222-8222-2222222222bb';
const BASE = { id: ALVO, nick: 'Kogos', url: `/u/${ALVO}`, visibility: 'public', source: 'historical_plus_server_verified', relationship: null,
  points: 2772, kills: 2763, deaths: 149, kd: 18.54, matches: 39, round_wins: 52, round_losses: 6, wins: 11, legacy_wins: 11, level: 28, next_level_points: 28, position: 13,
  play_seconds: 15341, legacy_play_seconds: 9727, verified_play_seconds: 5614, bio: '', socials: [], avatar_url: null, last_character: null, account_verified: false,
  achievements: [], favorites: [], history: [], legacy_points: 1928, verified_points: 844 };

class El {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.dataset = {}; this.textContent = ''; this.className = ''; this.hidden = false; }
  append(...n) { this.children.push(...n); } replaceChildren(...n) { this.children = n; this.textContent = ''; }
  setAttribute(k, v) { this.attrs[k] = String(v); } getAttribute(k) { return this.attrs[k] ?? null; } removeAttribute(k) { delete this.attrs[k]; }
  addEventListener() {} querySelector(sel) { return todos(this).find((n) => n.tagName === sel.toUpperCase()) || null; } focus() {} closest() { return null; }
}
const todos = (n) => [n, ...n.children.filter((x) => x && typeof x === 'object').flatMap(todos)];
const texto = (n) => [n.textContent, ...n.children.map((x) => (typeof x === 'object' ? texto(x) : x))].join(' ');
const semImport = (src) => src.replace(/^import[^\n]*\n/gm, '');
function carregar(ctx, src) {
  const nomes = [...src.matchAll(/export (?:async )?(?:function|const) (\w+)/g)].map((m) => m[1]);
  Object.assign(ctx, vm.runInContext(`(()=>{${semImport(src).replace(/export /g, '')};return {${nomes.join(',')}}})()`, ctx));
}
async function abrir(community, perfil, eu = null) {
  const ids = Object.fromEntries(['community', 'social-status', 'social-account', 'social-content', 'social-unread', 'hub-social-unread'].map((id) => [id, new El('div')]));
  ids.community.dataset = { profile: perfil.id, tab: 'profile' };
  const estado = eu ? { profile: { id: eu, nick: 'Eu' }, friends: [], requests: [], notifications: [], blocks: [], feed: [], invites: [], inbox: { conversations: [] } } : {};
  const ctx = vm.createContext({
    document: { createElement: (t) => new El(t), createTextNode: (t) => t, getElementById: (id) => ids[id] || null, querySelectorAll: () => [], addEventListener() {} },
    URL, URLSearchParams, console, location: { origin: 'http://localhost', href: 'http://localhost/', search: '' }, AbortSignal: { timeout: () => null }, setInterval: () => 1,
    navigator: { clipboard: { writeText: async () => {} } }, CustomEvent: class {},
    fetch: async (alvo, opts = {}) => {
      if (opts.method === 'POST') return { ok: true, json: async () => ({ ok: true }) };
      const a = new URL(alvo, 'http://localhost').searchParams.get('action');
      return { ok: true, json: async () => (a === 'profile' ? { profile: perfil } : estado) };
    },
    mountAccountEntry() {}, mountProfilePreferences() {}, mountAccountIntegrations() {}, acceptAccount() {}, logoutAccount() {},
    loadAccount: async () => (eu ? { authenticated: true, profile: { id: eu, nick: 'Eu' } } : { authenticated: false }), loadAuthOptions: async () => ({ providers: [] }),
  });
  for (const f of ['profile-character-catalog', 'career-rank', 'account-verified', 'community-inbox', 'profile-character', 'ranking-player']) carregar(ctx, read(`public/js/${f}.js`));
  vm.runInContext(semImport(community), ctx, { timeout: 1000 });
  for (let n = 0; n < 20; n++) await new Promise((r) => setImmediate(r));
  const raiz = ids['social-content'];
  const itens = () => todos(raiz).filter((n) => n.tagName === 'LI').map((n) => n.textContent);
  return { raiz, itens, tudo: () => texto(raiz) };
}

const FUNC = path.join(ROOT, '.vercel/output/functions/_render.func');
async function ssr() {
  const cfg = path.join(FUNC, '.vc-config.json');
  const entry = existsSync(cfg) && path.join(FUNC, JSON.parse(readFileSync(cfg, 'utf8')).handler);
  if (!entry || !existsSync(entry)) return null;
  process.chdir(FUNC);
  const { default: handler } = await import(pathToFileURL(entry).href);
  const real = globalThis.fetch;
  globalThis.fetch = async (a, i) => (String(a?.url ?? a).includes('/api/social') ? Response.json({ profile: { ...BASE, handle: 'kogos_fixture', url: '/u/kogos_fixture' } }) : real(a, i));
  const r = await handler.fetch(new Request('https://www.corosolto.com.br/u/kogos_fixture', { headers: { 'x-forwarded-for': '127.0.0.1' } }));
  const html = await r.text();
  globalThis.fetch = real; process.chdir(ROOT);
  return { status: r.status, html };
}
const CASOS = [
  ['PC1 · outro jogador sem personagem: explica a privacidade', async (b) => {
    const u = await abrir(b.community, BASE, EU);
    if (/Nenhum personagem disponível/.test(u.tudo())) return 'ainda diz "Nenhum personagem disponível"';
    if (!/não compartilha o último personagem/.test(u.tudo())) return 'sem explicação de privacidade';
    if (/Mostrar meu último personagem/.test(u.tudo())) return 'mostra o atalho de privacidade para quem não é dono';
    return null;
  }],
  ['PC2 · própria pessoa com share desligado vê o caminho', async (b) => {
    const u = await abrir(b.community, { ...BASE, id: EU, last_character: 'barbudo', settings: { share_character: false, profile: 'public', presence: 'friends', activity: 'private' } }, EU);
    if (!/Mostrar meu último personagem no perfil público/.test(u.tudo())) return 'sem caminho para compartilhar';
    if (!todos(u.raiz).some((n) => String(n.className).includes('profile-character'))) return 'o próprio personagem sumiu';
    return null;
  }],
  ['PC3 · personagem compartilhado aparece sem aviso', async (b) => {
    const u = await abrir(b.community, { ...BASE, last_character: 'barbudo' }, EU);
    if (!todos(u.raiz).some((n) => String(n.className).includes('profile-character'))) return 'personagem compartilhado não aparece';
    if (/não compartilha o último personagem|Mostrar meu último personagem/.test(u.tudo())) return 'aviso de privacidade com personagem visível';
    return null;
  }],
  ['PC4 · SSR explica o vazio', async (b) => {
    if (b.ssr.status !== 200) return `status ${b.ssr.status}`;
    if (/Nenhum personagem disponível/.test(b.ssr.html)) return 'SSR ainda diz "Nenhum personagem disponível"';
    if (!/<div class="character-empty"[^>]*><p[^>]*>Personagem não compartilhado\.<\/p>/.test(b.ssr.html)) return 'SSR sem a explicação';
    return null;
  }],
];

const rodar = async (b) => { const out = []; for (const [nome, f] of CASOS) { let erro; try { erro = await f(b); } catch (e) { erro = `exceção: ${e.message}`; } out.push({ nome, erro }); } return out; };
const base = { community: read('public/js/community.js'), ssr: await ssr() };
if (!base.ssr) { console.error('✗ sem build: rode `npm run build` antes (precisa de .vercel/output).'); process.exit(1); }
if (MUTATE) {
  const c = (a, d) => (b) => ({ ...b, community: b.community.replace(a, d) });
  const MUTANTES = [
    ['PC1', 'volta ao "Nenhum personagem disponível"', c("'Este jogador não compartilha o último personagem, ou ainda não jogou uma rodada confirmada.'", "'Nenhum personagem disponível para mostrar.'")],
    ['PC1', 'atalho aparece para qualquer um', c("if(own && p.settings?.share_character===false)", "if(p.settings?.share_character!==true)")],
    ['PC2', 'sem atalho para a própria pessoa', c("if(own && p.settings?.share_character===false)c.append", "if(false)c.append")],
    ['PC4', 'SSR volta ao texto antigo', (b) => ({ ...b, ssr: { ...b.ssr, html: b.ssr.html.replace('Personagem não compartilhado.', 'Nenhum personagem disponível para mostrar.') } })],
  ];
  let cegas = 0;
  console.log('PERSONAGEM VAZIO (MUTANTES: cada um tem que FALHAR)\n');
  for (const [alvo, nome, aplica] of MUTANTES) {
    const m = aplica(base);
    if (JSON.stringify(m) === JSON.stringify(base)) { console.error(`✗ MUTANTE NÃO APLICOU: ${nome}`); process.exit(1); }
    const mordeu = (await rodar(m)).some((r) => r.nome.startsWith(alvo) && r.erro);
    if (!mordeu) cegas++;
    console.log(` ${mordeu ? '✓' : '✗'} ${alvo} · ${nome}`);
  }
  if (cegas) { console.error(`\n✗ RÉGUA CEGA: ${cegas} mutante(s) passaram.`); process.exit(1); }
  console.log(`\n✓ a régua MORDE: os ${MUTANTES.length} mutantes ficaram vermelhos.`);
  process.exit(0);
}
const res = await rodar(base);
for (const r of res) console.log(` ${r.erro ? '✗' : '✓'} ${r.nome}${r.erro ? '\n     ' + r.erro : ''}`);
const falhas = res.filter((r) => r.erro).length;
console.log(`\n${falhas ? '✗' : '✓'} personagem vazio ${res.length - falhas}/${res.length}`);
process.exit(falhas ? 1 : 0);
