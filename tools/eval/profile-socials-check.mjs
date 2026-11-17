/* profile-socials-check.mjs — O PERFIL MOSTRA AS REDES PÚBLICAS, COM ÍCONE, E SÓ ELAS?
   Pedido do dono (14/10/2026): mostrar no perfil as redes públicas da pessoa, com ícones.
   "Pública" aqui é o que a pessoa cadastrou no próprio perfil (players.socials, que o
   backend aceita hoje de Instagram, TikTok, X, GitHub, YouTube e Twitch, mais LinkedIn,
   aceito antes e ainda gravado em perfis antigos) e o link legado
   social_link quando é de uma dessas redes. Login social vinculado (OAuth) é privado e
   não chega no perfil.

     RS1 · profileSocialLinks: só https sem credencial e sem porta, só as redes aceitas,
           sem duplicata, no máximo 5, cada uma com rótulo e ícone; social_link só como
           reserva e só se for de rede aceita
     RS2 · no jogo (community.js): o perfil desenha um link por rede, com ícone SVG, rótulo
           acessível, nova aba e rel noopener noreferrer nofollow; nada de rede recusada
     RS3 · na página SSR /u/<perfil> (handler de .vercel/output): idem no HTML servido

   Uso: npm run build && node tools/eval/profile-socials-check.mjs [--mutate]
   --mutate quebra cada garantia numa cópia da fonte/artefato e exige vermelho. */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const FUNC = path.join(ROOT, '.vercel/output/functions/_render.func');
const MUTATE = process.argv.includes('--mutate');
const read = (f) => readFileSync(path.join(ROOT, f), 'utf8');
const ID = '33333333-3333-4333-8333-3333333333cc', HANDLE = 'redes_fixture';
const ACEITAS = ['https://www.instagram.com/fixture', 'https://x.com/fixture', 'https://github.com/fixture', 'https://www.linkedin.com/in/fixture', 'https://www.twitch.tv/fixture'];
const RECUSADAS = ['https://evil.example/fixture', 'http://www.youtube.com/@fixture', 'javascript:alert(1)', 'https://user:senha@github.com/x', 'https://github.com:8443/x'];
const SOCIAIS = [...ACEITAS.slice(0, 2).map((url) => ({ net: 'x', url })), ...RECUSADAS.slice(0, 1).map((url) => ({ net: 'site', url })), ...ACEITAS.slice(2).map((url) => ({ net: 'x', url }))];
const PERFIL = { id: ID, handle: HANDLE, nick: 'Redes Fixture', url: `/u/${HANDLE}`, visibility: 'public', source: 'server_verified',
  points: 10, kills: 1, deaths: 1, kd: 1, round_wins: 1, wins: 1, losses: 0, matches: 1, rounds: 1, level: 1, next_level_points: 90, position: 9,
  bio: '', socials: SOCIAIS, social_link: null, avatar_url: null, last_character: null, account_verified: false, achievements: [], favorites: [], history: [], play_seconds: 0 };

class El {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.dataset = {}; this.textContent = ''; this.className = ''; this.hidden = false; this.innerHTML = ''; }
  append(...n) { this.children.push(...n); } replaceChildren(...n) { this.children = n; this.textContent = ''; }
  setAttribute(k, v) { this.attrs[k] = String(v); } getAttribute(k) { return this.attrs[k] ?? null; } removeAttribute(k) { delete this.attrs[k]; }
  addEventListener() {} querySelector() { return null; } focus() {}
}
const todos = (n) => [n, ...n.children.filter((x) => x && typeof x === 'object').flatMap(todos)];
const texto = (n) => [n.textContent, ...n.children.map((x) => (typeof x === 'object' ? texto(x) : x))].join(' ');
const exportsDe = (src) => [...src.matchAll(/export (?:async )?(?:function|const) (\w+)/g)].map((m) => m[1]);
const semImport = (src) => src.replace(/^import[^\n]*\n/gm, '');
function carregar(ctx, src) {
  const nomes = exportsDe(src);
  Object.assign(ctx, vm.runInContext(`(()=>{${semImport(src).replace(/export /g, '')};return {${nomes.join(',')}}})()`, ctx));
}
function contexto(extra = {}) {
  return vm.createContext({ document: { createElement: (t) => new El(t), createTextNode: (t) => t, getElementById: () => null, querySelectorAll: () => [], addEventListener() {} }, URL, URLSearchParams, console, ...extra });
}
function helpers(b) {
  const ctx = contexto();
  for (const f of ['account-verified', 'career-rank']) carregar(ctx, read(`public/js/${f}.js`));
  carregar(ctx, b.ranking);
  return ctx;
}

async function noJogo(b) {
  const ids = Object.fromEntries(['community', 'social-status', 'social-account', 'social-content', 'social-unread', 'hub-social-unread'].map((id) => [id, new El('div')]));
  ids.community.dataset = { profile: ID, tab: 'profile' };
  const ctx = contexto({ location: { origin: 'http://localhost', href: 'http://localhost/', search: '' }, AbortSignal: { timeout: () => null }, setInterval: () => 1, navigator: { clipboard: { writeText: async () => {} } },
    fetch: async (alvo) => { const a = new URL(alvo, 'http://localhost').searchParams.get('action'); return { ok: true, json: async () => (a === 'profile' ? { profile: PERFIL } : {}) }; },
    mountAccountEntry() {}, mountProfilePreferences() {}, mountAccountIntegrations() {}, loadAccount: async () => ({ authenticated: false }), loadAuthOptions: async () => ({ providers: [] }), acceptAccount() {}, logoutAccount() {} });
  ctx.document.getElementById = (id) => ids[id] || null;
  for (const f of ['profile-character-catalog', 'career-rank', 'account-verified', 'community-inbox', 'profile-character']) carregar(ctx, read(`public/js/${f}.js`));
  carregar(ctx, b.ranking);
  vm.runInContext(semImport(b.community), ctx, { timeout: 1000 });
  for (let n = 0; n < 12; n++) await new Promise((r) => setImmediate(r));
  return ids['social-content'];
}

async function coletar() {
  const base = { ranking: read('public/js/ranking-player.js'), community: read('public/js/community.js'), ssr: null };
  const cfg = path.join(FUNC, '.vc-config.json');
  const entry = existsSync(cfg) && path.join(FUNC, JSON.parse(readFileSync(cfg, 'utf8')).handler);
  if (!entry || !existsSync(entry)) return null;
  process.chdir(FUNC);
  const { default: handler } = await import(pathToFileURL(entry).href);
  const real = globalThis.fetch;
  globalThis.fetch = async (alvo, init) => (String(alvo?.url ?? alvo).includes(`action=profile&id=${HANDLE}`) ? Response.json({ profile: PERFIL }) : real(alvo, init));
  const r = await handler.fetch(new Request(`https://www.corosolto.com.br/u/${HANDLE}`, { headers: { 'cf-connecting-ip': '127.0.0.1' } }));
  base.ssr = { status: r.status, html: await r.text() };
  globalThis.fetch = real;
  process.chdir(ROOT);
  return base;
}

const esperado = ACEITAS.map((u) => new URL(u).href);
const CASOS = [
  ['RS1 · só redes aceitas, https limpo, com rótulo e ícone', async (b) => {
    const h = helpers(b), links = (p) => JSON.parse(JSON.stringify(h.profileSocialLinks(p)));
    const r = links({ socials: SOCIAIS });
    if (JSON.stringify(r.map((x) => x.url)) !== JSON.stringify(esperado)) return `redes erradas: ${r.map((x) => x.url).join(' ')}`;
    if (JSON.stringify(r.map((x) => x.net)) !== '["instagram","x","github","linkedin","twitch"]') return `rede derivada do host errada: ${r.map((x) => x.net)}`;
    for (const x of r) if (!x.label || !/^M[\d.\s,a-zA-Z-]+$/.test(x.path || '')) return `rede ${x.net} sem rótulo ou ícone`;
    for (const url of RECUSADAS) if (links({ socials: [{ net: 'github', url }] }).length) return `aceitou ${url}`;
    if (links({ socials: [{ url: ACEITAS[0] }, { url: ACEITAS[0] }] }).length !== 1) return 'duplicata desenhada duas vezes';
    if (links({ socials: Array.from({ length: 8 }, (_, i) => ({ url: `https://github.com/f${i}` })) }).length !== 5) return 'mais de 5 redes';
    if (links({ socials: [], social_link: 'https://www.youtube.com/@fixture' }).length !== 1) return 'link legado de rede aceita sumiu';
    if (links({ socials: [], social_link: 'https://evil.example/' }).length) return 'link legado de site qualquer virou rede';
    if (links({ socials: [{ url: ACEITAS[1] }], social_link: 'https://www.youtube.com/@legado' }).length !== 1) return 'legado somou com as redes cadastradas';
    if (links(null).length || links({}).length) return 'perfil sem redes inventou rede';
    return null;
  }],
  ['RS2 · no jogo, um link com ícone por rede aceita', async (b) => {
    const raiz = await noJogo(b);
    const as = todos(raiz).filter((n) => n.tagName === 'A' && n.className === 'profile-social');
    if (JSON.stringify(as.map((a) => a.href)) !== JSON.stringify(esperado)) return `links no jogo: ${as.map((a) => a.href).join(' ') || 'nenhum'}`;
    for (const a of as) {
      if (a.target !== '_blank' || a.rel !== 'noopener noreferrer nofollow') return `${a.href} sem nova aba segura`;
      if (!/abre em nova aba/.test(a.attrs['aria-label'] || '')) return `${a.href} sem rótulo acessível`;
      const icone = todos(a).find((n) => n.className === 'profile-social-icon');
      if (!/^<svg viewBox="0 0 24 24" aria-hidden="true"[^>]*><path d="M[^"<>]+"\/><\/svg>$/.test(icone?.innerHTML || '')) return `${a.href} sem ícone SVG`;
    }
    if (/evil\.example/.test(JSON.stringify(todos(raiz).map((n) => [n.href, n.textContent])))) return 'rede recusada apareceu no jogo';
    if (!todos(raiz).some((n) => n.className === 'profile-socials' && /Redes/.test(n.attrs['aria-label'] || ''))) return 'grupo de redes sem rótulo';
    return null;
  }],
  ['RS3 · na página SSR, um link com ícone por rede aceita', async (b) => {
    const { status, html } = b.ssr;
    if (status !== 200) return `status ${status}`;
    const nav = html.match(/<nav class="socials"[^>]*aria-label="Redes[^"]*"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
    if (!nav) return 'SSR sem o grupo de redes';
    const as = [...nav.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
    const hrefs = as.map(([, at]) => at.match(/href="([^"]+)"/)?.[1]);
    if (JSON.stringify(hrefs) !== JSON.stringify(esperado)) return `links SSR: ${hrefs.join(' ')}`;
    for (const [, at, corpo] of as) {
      if (!/target="_blank"/.test(at) || !/rel="noopener noreferrer nofollow"/.test(at)) return 'link SSR sem nova aba segura';
      if (!/aria-label="[^"]*abre em nova aba[^"]*"/.test(at)) return 'link SSR sem rótulo acessível';
      if (!/<svg\b[^>]*aria-hidden="true"[^>]*>\s*<path\b[^>]*d="M[^"]+"/.test(corpo)) return 'link SSR sem ícone SVG';
    }
    if (/evil\.example/.test(html)) return 'rede recusada apareceu no SSR';
    return null;
  }],
];

const rodar = async (b) => { const out = []; for (const [nome, f] of CASOS) { let erro; try { erro = await f(b); } catch (e) { erro = `exceção: ${e.message}`; } out.push({ nome, erro }); } return out; };
const build = await coletar();
if (!build) { console.error('✗ sem build: rode `npm run build` antes (precisa de .vercel/output).'); process.exit(1); }

if (MUTATE) {
  const MUTANTES = [
    ['RS1', 'aceita qualquer host', (b) => ({ ...b, ranking: b.ranking.replace("if(url.port || !net || seen.has(href))continue;", "if(url.port || seen.has(href))continue;") })],
    ['RS1', 'aceita porta', (b) => ({ ...b, ranking: b.ranking.replace('if(url.port || !net', 'if(!net') })],
    ['RS1', 'sem teto de 5', (b) => ({ ...b, ranking: b.ranking.replace('if(out.length===5)break;', '') })],
    ['RS1', 'legado vira rede de qualquer site', (b) => ({ ...b, ranking: b.ranking.replace("net=SOCIAL_HOSTS[url.hostname.replace(/^www\\./,'')]", "net=SOCIAL_HOSTS[url.hostname.replace(/^www\\./,'')] || 'x'") })],
    ['RS2', 'jogo volta ao texto sem ícone', (b) => ({ ...b, ranking: b.ranking.replace('icon.innerHTML=', 'icon.title=') })],
    ['RS2', 'jogo sem rel seguro', (b) => ({ ...b, ranking: b.ranking.replace("a.rel='noopener noreferrer nofollow';", '') })],
    ['RS2', 'jogo desenha as redes cruas', (b) => ({ ...b, community: b.community.replace('const socials=profileSocialLinks(p);', 'const socials=p.socials.map(s=>({...s,label:s.net}));') })],
    ['RS3', 'SSR sem as redes', (b) => ({ ...b, ssr: { ...b.ssr, html: b.ssr.html.replace(/<nav class="socials"[\s\S]*?<\/nav>/, '') } })],
    ['RS3', 'SSR sem ícone', (b) => ({ ...b, ssr: { ...b.ssr, html: b.ssr.html.replace(/(<nav class="socials"[\s\S]*?<\/nav>)/, (m) => m.replace(/<svg\b[\s\S]*?<\/svg>/g, '')) } })],
    ['RS3', 'SSR com rede recusada', (b) => ({ ...b, ssr: { ...b.ssr, html: b.ssr.html.replace('<nav class="socials"', '<nav class="socials"><a href="https://evil.example/fixture">x</a></nav><nav class="old"') } })],
  ];
  let cegas = 0;
  console.log('REDES DO PERFIL (MUTANTES: cada um tem que FALHAR)\n');
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
console.log(`\n${falhas ? '✗' : '✓'} redes do perfil ${res.length - falhas}/${res.length}`);
process.exit(falhas ? 1 : 0);
