/* profile-achievements-check.mjs · CONQUISTAS E ATIVIDADE DO PERFIL FAZEM SENTIDO?
   Pedido do dono (14/10/2026): o #13 (2763 abates, 52 rodadas ganhas) aparecia com
   "Primeiro abate · Ainda sem atividade" e "Nenhuma rodada confirmada".

   Por que estava assim:
   · O servidor manda `at: null` quando quem vê não é a pessoa nem amigo (privacidade de
     atividade). O cliente passava null para date() e escrevia "Ainda sem atividade".
   · player_achievement só é gravada quando o banco ingere rodada verificada (048). Quem só
     tem histórico preservado (antes do corte) não tem linha nenhuma.
   · history/favorites só chegam para a própria pessoa e amigos; vazio para os outros virava
     "nenhuma rodada confirmada".

   Regra: conquista de contagem segue os totais que o próprio perfil exibe (histórico preservado
   + confirmadas), que já são os números depois do filtro do corte. "Uma hora de arena" usa só
   o tempo confirmado, porque o tempo antigo contava menu e AFK.

     AC1 · histórico sem linha no banco ganha as conquistas que os totais exibidos provam
     AC2 · `at: null` diz "conquistada", nunca "Ainda sem atividade"
     AC3 · sem inflar: zero abates não dá conquista; hora de arena ignora o tempo antigo
     AC4 · atividade vazia respeita a decisão do backend: visitante sem acesso vê a
           explicação de privacidade; a própria pessoa com histórico vê a origem dos totais

   Uso: node tools/eval/profile-achievements-check.mjs [--mutate] */
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
  for (const f of ['profile-character-catalog', 'career-rank', 'account-verified', 'community-inbox', 'profile-character', 'ranking-player']) carregar(ctx, read(`public/js/${f}.js`));
  vm.runInContext(semImport(community), ctx, { timeout: 1000 });
  for (let n = 0; n < 20; n++) await new Promise((r) => setImmediate(r));
  const raiz = ids['social-content'];
  const itens = () => todos(raiz).filter((n) => n.tagName === 'LI').map((n) => n.textContent);
  return { raiz, itens, tudo: () => texto(raiz) };
}

const CASOS = [
  ['AC1 · histórico sem linha no banco ganha as conquistas provadas pelos totais exibidos', async (c) => {
    const u = await abrir(c, { ...BASE, verified_play_seconds: 0, round_wins: 0 });
    const t = u.itens().join(' | ');
    for (const nome of ['Primeiro abate', 'Dez abates na conta', 'Primeira vitória']) if (!t.includes(nome)) return `falta "${nome}": ${t || 'nenhuma'}`;
    if (!/pelo histórico preservado/.test(t)) return `origem não indicada: ${t}`;
    return null;
  }],
  ['AC2 · data escondida pela privacidade vira "conquistada"', async (c) => {
    const u = await abrir(c, { ...BASE, achievements: ['first_kill', 'first_win', 'ten_kills', 'one_hour'].map((key) => ({ key, at: null })) });
    if (/Ainda sem atividade/.test(u.tudo())) return 'ainda mostra "Ainda sem atividade"';
    if (u.itens().filter((l) => /conquistada/.test(l)).length !== 4) return `itens: ${u.itens().join(' | ')}`;
    const datado = await abrir(c, { ...BASE, achievements: [{ key: 'first_kill', at: '2026-10-01T12:00:00Z' }] });
    if (!datado.itens().some((l) => /Primeiro abate · \d{2}\/10\/2026/.test(l))) return `data do servidor sumiu: ${datado.itens().join(' | ')}`;
    return null;
  }],
  ['AC3 · sem inflar: zero abates nada; hora de arena só com tempo confirmado', async (c) => {
    const zero = await abrir(c, { ...BASE, kills: 0, round_wins: 0, wins: 0, legacy_wins: 0, verified_play_seconds: 0, play_seconds: 99999, legacy_play_seconds: 99999 });
    if (zero.itens().length) return `conquista sem prova: ${zero.itens().join(' | ')}`;
    const legado = await abrir(c, { ...BASE, verified_play_seconds: 1200, play_seconds: 99999, legacy_play_seconds: 98799 });
    if (legado.itens().some((l) => l.startsWith('Uma hora de arena'))) return 'hora de arena contou o tempo antigo';
    const nove = await abrir(c, { ...BASE, kills: 9 });
    if (nove.itens().some((l) => l.startsWith('Dez abates'))) return 'dez abates com 9';
    if (!(await abrir(c, BASE)).itens().some((l) => l.startsWith('Uma hora de arena'))) return 'hora de arena confirmada não apareceu';
    return null;
  }],
  ['AC4 · atividade vazia explica o porquê', async (c) => {
    const estranho = await abrir(c, { ...BASE, activity_visible: false }, EU);
    if (/Nenhuma rodada confirmada|Jogue uma rodada verificada/.test(estranho.tudo())) return 'estranho vê "nenhuma rodada" em vez de privacidade';
    if (!/não compartilha as rodadas/.test(estranho.tudo())) return 'estranho sem explicação de privacidade';
    const proprio = await abrir(c, { ...BASE, id: EU, activity_visible: true }, EU);
    if (!/histórico antigo guarda só os totais/.test(proprio.tudo())) return 'própria pessoa com legado sem explicação';
    return null;
  }],
];

const rodar = async (c) => { const out = []; for (const [nome, f] of CASOS) { let erro; try { erro = await f(c); } catch (e) { erro = `exceção: ${e.message}`; } out.push({ nome, erro }); } return out; };
const fonte = read('public/js/community.js');
if (MUTATE) {
  const MUTANTES = [
    ['AC1', 'só linhas do banco', fonte.replace('saved.has(k) || derived[k]', 'saved.has(k)')],
    ['AC2', 'volta ao date(null)', fonte.replace("a.at?new Date(a.at).toLocaleDateString('pt-BR'):a.source==='history'?'pelo histórico preservado':'conquistada'", "a.at?new Date(a.at).toLocaleDateString('pt-BR'):'Ainda sem atividade'")],
    ['AC3', 'hora de arena com o tempo antigo', fonte.replace('active=Number(p.verified_play_seconds ?? 0) || 0', 'active=Number(p.play_seconds) || 0')],
    ['AC3', 'conquista sem prova', fonte.replace('first_kill:kills>=1', 'first_kill:true')],
    ['AC4', 'estranho vê "nenhuma rodada"', fonte.replace("'Este jogador não compartilha as rodadas com você.'", "'Nenhuma rodada confirmada ainda.'")],
  ];
  let cegas = 0;
  console.log('CONQUISTAS (MUTANTES: cada um tem que FALHAR)\n');
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
console.log(`\n${falhas ? '✗' : '✓'} conquistas e atividade ${res.length - falhas}/${res.length}`);
process.exit(falhas ? 1 : 0);
