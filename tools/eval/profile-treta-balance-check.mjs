/* profile-treta-balance-check.mjs · O PERFIL MOSTRA O SALDO TRETA$ DO JOGADOR?
   Pedido do dono (14/10/2026): "mostrar o saldo de T$ de cada usuário no perfil público".
   O saldo vem do backend (#114, `treta_balance` em /api/social?action=profile, só com a loja
   ligada e para quem tem conta). O cliente só mostra, e funciona com o backend antigo.

     TB1 · com o campo: "T$ 1.234" em pt-BR, no perfil de outra pessoa e no próprio
     TB2 · sem o campo (backend antigo ou jogador sem conta): nada de saldo, nem "T$ 0"
     TB3 · zero aparece como T$ 0 (conta sem moeda é dado, não falta de dado)
     TB4 · valor inválido (negativo, fração, texto) não aparece

   Uso: node tools/eval/profile-treta-balance-check.mjs [--mutate] */
import { readFileSync } from 'node:fs';
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
  for (const f of ['data/weapons', 'profile-character-catalog', 'career-rank', 'account-verified', 'community-inbox', 'profile-character', 'data/retratos', 'ranking-player']) carregar(ctx, read(`public/js/${f}.js`));
  vm.runInContext(semImport(community), ctx, { timeout: 1000 });
  for (let n = 0; n < 20; n++) await new Promise((r) => setImmediate(r));
  const raiz = ids['social-content'];
  const itens = () => todos(raiz).filter((n) => n.tagName === 'LI').map((n) => n.textContent);
  return { raiz, itens, tudo: () => texto(raiz) };
}

const saldo = (u) => todos(u.raiz).filter((n) => String(n.className).includes('social-profile-treta')).map((n) => texto(n).replace(/\s+/g, ' ').trim());
const CASOS = [
  ['TB1 · com o campo, T$ em pt-BR', async (c) => {
    const alheio = await abrir(c, { ...BASE, treta_balance: 1234 }, EU);
    if (JSON.stringify(saldo(alheio)) !== JSON.stringify(['SALDO TRETA$ T$ 1.234'])) return `perfil alheio: ${JSON.stringify(saldo(alheio))}`;
    const deslogado = await abrir(c, { ...BASE, treta_balance: 1234 });
    if (saldo(deslogado).length !== 1) return 'deslogado não vê o saldo público';
    const proprio = await abrir(c, { ...BASE, id: EU, treta_balance: 50 }, EU);
    if (JSON.stringify(saldo(proprio)) !== JSON.stringify(['SALDO TRETA$ T$ 50'])) return `próprio: ${JSON.stringify(saldo(proprio))}`;
    return null;
  }],
  ['TB2 · sem o campo, sem saldo', async (c) => {
    const u = await abrir(c, BASE, EU);
    if (saldo(u).length || /T\$ 0|SALDO TRETA/.test(u.tudo())) return 'saldo inventado sem o campo';
    if (!/Kogos/.test(u.tudo())) return 'perfil não renderizou';
    return null;
  }],
  ['TB3 · zero é T$ 0', async (c) => {
    const u = await abrir(c, { ...BASE, treta_balance: 0 }, EU);
    if (JSON.stringify(saldo(u)) !== JSON.stringify(['SALDO TRETA$ T$ 0'])) return `zero: ${JSON.stringify(saldo(u))}`;
    return null;
  }],
  ['TB4 · valor inválido não aparece', async (c) => {
    for (const v of [-5, 2.5, '1234', null, Number.MAX_SAFE_INTEGER + 2]) {
      const u = await abrir(c, { ...BASE, treta_balance: v }, EU);
      if (saldo(u).length) return `${JSON.stringify(v)} apareceu: ${saldo(u)}`;
    }
    return null;
  }],
];

const rodar = async (c) => { const out = []; for (const [nome, f] of CASOS) { let erro; try { erro = await f(c); } catch (e) { erro = `exceção: ${e.message}`; } out.push({ nome, erro }); } return out; };
const fonte = read('public/js/community.js');
if (MUTATE) {
  const MUTANTES = [
    ['TB1', 'sem o saldo', fonte.replace('c.append(treta);}', '}')],
    ['TB1', 'número sem formato pt-BR', fonte.replace("`T$ ${p.treta_balance.toLocaleString('pt-BR')}`", '`T$ ${p.treta_balance}`')],
    ['TB2', 'saldo 0 inventado sem o campo', fonte.replace('if(Number.isSafeInteger(p.treta_balance) && p.treta_balance>=0){', 'if(true){p.treta_balance=p.treta_balance ?? 0;')],
    ['TB3', 'zero escondido', fonte.replace('Number.isSafeInteger(p.treta_balance) && p.treta_balance>=0', 'Number.isSafeInteger(p.treta_balance) && p.treta_balance>0')],
    ['TB4', 'sem validação', fonte.replace('if(Number.isSafeInteger(p.treta_balance) && p.treta_balance>=0){', 'if(p.treta_balance!=null){')],
  ];
  let cegas = 0;
  console.log('SALDO TRETA$ NO PERFIL (MUTANTES: cada um tem que FALHAR)\n');
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
console.log(`\n${falhas ? '✗' : '✓'} saldo TRETA$ no perfil ${res.length - falhas}/${res.length}`);
process.exit(falhas ? 1 : 0);
