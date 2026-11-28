/* profile-weapons-display-check.mjs · O PERFIL MOSTRA AS ARMAS QUE O JOGADOR MAIS USA?
   Pedido do dono (14/10/2026). A contagem vem do backend (migration 068): abates por arma
   contados pelo nó nas rodadas verificadas, top 3 em `top_weapons`. O cliente só mostra.

     WD1 · com o campo: até 3 armas, na ordem do servidor, com o nome do jogo e os abates em pt-BR
     WD2 · sem o campo (backend sem a 068): nenhuma seção
     WD3 · campo vazio: explica que as armas vêm das partidas multiplayer confirmadas
     WD4 · linha inválida (id fora do formato, abates não inteiros ou zero) não aparece

   Uso: node tools/eval/profile-weapons-display-check.mjs [--mutate] */
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

const secao = (u) => todos(u.raiz).filter((n) => n.tagName === 'OL' && String(n.className).includes('profile-weapons')).flatMap((n) => n.children.map((li) => li.textContent));
const CASOS = [
  ['WD1 · top 3 com nome e abates', async (c) => {
    const u = await abrir(c, { ...BASE, top_weapons: [{ weapon: 'ak', kills: 1234 }, { weapon: 'awp', kills: 40 }, { weapon: 'deagle', kills: 1 }, { weapon: 'm4', kills: 1 }] }, EU);
    const l = secao(u);
    if (JSON.stringify(l) !== JSON.stringify(['AK-47 "BATE-ESTACA" · 1.234 abates', 'AWP "DELIBERADOR" · 40 abates', 'DEAGLE "MARTELO" · 1 abate'])) return `lista: ${JSON.stringify(l)}`;
    if (!/Armas que mais usa/.test(u.tudo())) return 'sem título';
    return null;
  }],
  ['WD2 · sem o campo, sem seção', async (c) => {
    const u = await abrir(c, BASE, EU);
    if (/Armas que mais usa/.test(u.tudo())) return 'seção apareceu sem dado do backend';
    return null;
  }],
  ['WD3 · campo vazio explica a origem', async (c) => {
    const u = await abrir(c, { ...BASE, top_weapons: [] }, EU);
    if (!/partidas multiplayer confirmadas/.test(u.tudo())) return 'vazio sem explicação';
    return null;
  }],
  ['WD4 · linha inválida não aparece', async (c) => {
    const u = await abrir(c, { ...BASE, top_weapons: [{ weapon: 'ak', kills: 0 }, { weapon: 7, kills: 3 }, { weapon: 'awp', kills: 2.5 }, { weapon: 'mp5', kills: 3 }] }, EU);
    const l = secao(u);
    if (JSON.stringify(l) !== JSON.stringify(['MP5 "VASSOURA" · 3 abates'])) return `lista: ${JSON.stringify(l)}`;
    return null;
  }],
];

const rodar = async (c) => { const out = []; for (const [nome, f] of CASOS) { let erro; try { erro = await f(c); } catch (e) { erro = `exceção: ${e.message}`; } out.push({ nome, erro }); } return out; };
const fonte = read('public/js/community.js');
if (MUTATE) {
  const MUTANTES = [
    ['WD1', 'sem teto de 3', fonte.replace('w.kills>0).slice(0,3)', 'w.kills>0)')],
    ['WD1', 'id cru no lugar do nome', fonte.replace("WEAPONS[w.weapon]?.name || w.weapon.toUpperCase()", 'w.weapon')],
    ['WD2', 'seção sem o campo', fonte.replace('if(Array.isArray(p.top_weapons)){', 'if(true){p.top_weapons=p.top_weapons || [];')],
    ['WD4', 'sem filtro', fonte.replace("p.top_weapons.filter(w=>typeof w?.weapon==='string' && Number.isSafeInteger(w.kills) && w.kills>0)", 'p.top_weapons')],
  ];
  let cegas = 0;
  console.log('ARMAS NO PERFIL (MUTANTES: cada um tem que FALHAR)\n');
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
console.log(`\n${falhas ? '✗' : '✓'} armas no perfil ${res.length - falhas}/${res.length}`);
process.exit(falhas ? 1 : 0);
