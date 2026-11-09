/* canonical-host-check.mjs — O HOST QUE O CRAWLER RECEBE É O HOST DECIDIDO?
   Decisão do dono (13/10/2026): o domínio canônico é https://www.corosolto.com.br.
   Em 13/10 a produção servia o mesmo HTML com 200 em www.csbrasil.online,
   www.corosolto.com.br e csbrasil.vercel.app, e todo canonical, og:url, hreflang,
   JSON-LD, robots.txt e sitemap apontava para www.csbrasil.online
   (`curl -s https://www.corosolto.com.br/ | grep canonical`).

   Mede o ARTEFATO (`dist/client` e o handler SSR de `.vercel/output`), não o fonte:
     CH0 · src/lib/site-origin.mjs exporta SITE === host decidido
     CH1 · toda página estática com canonical (site e /docs) declara canonical e og:url
           no host decidido, e hreflang quando há; nas páginas-chave os três são obrigatórios
     CH2 · toda rota prerender=false, o sitemap e um perfil público de fixture (fetch do
           backend interceptado), pedidos no handler SSR pelo host novo e pelo antigo, idem
           (hreflang só onde a página é indexável; o perfil exige 200, canonical e og:image)
     CH3 · robots.txt e llms.txt anunciam o host decidido
     CH4 · nenhum arquivo de texto publicado cita o host antigo
     CH5 · a comunidade do jogo recebe o host decidido (`#community[data-site]`)

   Uso: npm run build && node tools/eval/canonical-host-check.mjs [--mutate]
   --mutate reintroduz o host antigo em cada superfície medida e exige vermelho.
   CSB_SSR_BASE=http://127.0.0.1:8787 (build Cloudflare, `npm run build:cf`): o handler SSR
   não roda em Node (importa `cloudflare:workers`), então CH2 pede as rotas a esse host
   (wrangler dev ou deploy); o backend de perfil tem que ser o fake de tools/cf/backend-fake.mjs. */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const CANONICO = 'https://www.corosolto.com.br';
const ANTIGO = 'https://www.csbrasil.online';
const HOST_ANTIGO = /csbrasil\.online|csbrasil\.vercel\.app/;
const NOSSO = /^https?:\/\/(?:(?:www\.)?(?:csbrasil\.online|corosolto\.com\.br)|csbrasil\.vercel\.app)(?:[/:?#]|$)/i;
const noHost = (u) => u === CANONICO || u?.startsWith(CANONICO + '/');
const CHAVE = ['index.html', 'armas/index.html', 'mapas/index.html', 'personagens/index.html', 'como-jogar/index.html', 'sobre/index.html', 'changelog/index.html', 'docs/index.html', 'docs/en/index.html'];
const TEXTO = /\.(html|txt|xml|json|md|webmanifest|js|mjs|css|svg)$/;
const MUTATE = process.argv.includes('--mutate');
const PERFIL_ID = '00000000-0000-4000-8000-00000000c0de';
const PERFIL = { id: PERFIL_ID, handle: null, nick: 'fixture', url: `/u/${PERFIL_ID}/fixture`, visibility: 'public', source: 'server_verified',
  points: 1, kills: 1, deaths: 1, kd: 1, round_wins: 1, level: 1, next_level_points: 1, position: 1, bio: '', socials: [], avatar_url: null, last_character: null };
const ROTA_PERFIL = PERFIL.url;
const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist/client');
const FUNC = path.join(ROOT, '.vercel/output/functions/_render.func');

function arvore(dir, base = dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...arvore(f, base));
    else if (TEXTO.test(e.name)) out.push(path.relative(base, f));
  }
  return out;
}

function rotasSSR(dir = 'src/pages', prefixo = '') {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) { out.push(...rotasSSR(f, `${prefixo}/${e.name}`)); continue; }
    if (!e.name.endsWith('.astro') || !/export const prerender\s*=\s*false/.test(readFileSync(f, 'utf8'))) continue;
    out.push(`${prefixo}/${e.name.replace(/\.astro$/, '')}`.replace(/\/index$/, '/').replace(/\[[^\]]+\]/g, '_x_'));
  }
  return out;
}

const attr = (tag, nome) => tag.match(new RegExp(`\\s${nome}="([^"]*)"`))?.[1];
function metadados(html) {
  const head = html.slice(0, html.search(/<\/head>/i) + 1 || html.length);
  const out = { canonical: [], ogUrl: [], hreflang: [], nossos: [] };
  for (const [tag] of head.matchAll(/<(?:link|meta)\b[^>]*>/gi)) {
    const href = attr(tag, 'href'), content = attr(tag, 'content');
    if (/\srel="canonical"/.test(tag)) out.canonical.push(href);
    if (/\shreflang="/.test(tag) && /\srel="alternate"/.test(tag)) out.hreflang.push(href);
    if (/property="og:url"/.test(tag)) out.ogUrl.push(content);
    for (const v of [href, content]) if (v && NOSSO.test(v)) out.nossos.push(v);
  }
  for (const [, json] of head.matchAll(/<script\b[^>]*\btype="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g))
    for (const [, v] of json.matchAll(/"(https?:\/\/[^"]+)"/g)) if (NOSSO.test(v)) out.nossos.push(v);
  return out;
}

function paginaErrada(nome, html, exigeTudo) {
  const m = metadados(html);
  if (!m.canonical.length) return exigeTudo ? `${nome} sem <link rel="canonical">` : null;
  if (!m.ogUrl.length) return `${nome} sem og:url`;
  if (exigeTudo && !/<meta name="robots" content="noindex/.test(html) && !m.hreflang.length) return `${nome} sem hreflang`;
  for (const [tipo, lista] of [['canonical', m.canonical], ['og:url', m.ogUrl], ['hreflang', m.hreflang], ['URL própria', m.nossos]])
    for (const u of lista) if (!noHost(u)) return `${nome}: ${tipo} fora do host decidido: ${u}`;
  return null;
}

const SSR_BASE = (process.env.CSB_SSR_BASE || '').replace(/\/$/, '');

async function coletar() {
  const cfg = path.join(FUNC, '.vc-config.json');
  const entry = !SSR_BASE && existsSync(cfg) && path.join(FUNC, JSON.parse(readFileSync(cfg, 'utf8')).handler);
  if (!existsSync(DIST) || (!SSR_BASE && (!entry || !existsSync(entry)))) return null;
  const arquivos = Object.fromEntries(arvore(DIST).map((f) => [f, readFileSync(path.join(DIST, f), 'utf8')]));
  const ROTAS_SSR = rotasSSR();
  const cwd = process.cwd();
  const fetchReal = globalThis.fetch;
  let handler;
  if (SSR_BASE) {
    handler = { fetch: (req) => fetchReal(SSR_BASE + new URL(req.url).pathname, { headers: req.headers, redirect: 'manual' }) };
  } else {
    process.chdir(FUNC);
    ({ default: handler } = await import(pathToFileURL(entry).href));
    globalThis.fetch = async (alvo, init) => String(alvo?.url ?? alvo).includes(`action=profile&id=${PERFIL_ID}`)
      ? new Response(JSON.stringify({ profile: PERFIL }), { headers: { 'content-type': 'application/json' } })
      : fetchReal(alvo, init);
  }
  const ssr = {};
  for (const origem of [CANONICO, ANTIGO]) for (const rota of [...ROTAS_SSR, ROTA_PERFIL, '/sitemap.xml']) {
    const r = await handler.fetch(new Request(`${origem}${rota}`, { headers: { 'x-forwarded-for': '127.0.0.1' } }));
    ssr[`${origem}${rota}`] = { rota, status: r.status, corpo: await r.text(), location: r.headers.get('location') };
  }
  globalThis.fetch = fetchReal;
  process.chdir(cwd);
  let site = null;
  try { ({ SITE: site } = await import(pathToFileURL(path.join(ROOT, 'src/lib/site-origin.mjs')).href)); } catch {}
  return { arquivos, ssr, site };
}

const CASOS = [
  ['CH0 · src/lib/site-origin.mjs exporta SITE no host decidido', (b) =>
    b.site === CANONICO ? null : `SITE = ${b.site ?? 'ausente'}; esperado ${CANONICO}`],
  ['CH1 · páginas estáticas: canonical, og:url e hreflang no host decidido', (b) => {
    for (const f of CHAVE) if (!(f in b.arquivos)) return `dist/client/${f} não foi emitida`;
    for (const [f, txt] of Object.entries(b.arquivos))
      if (f.endsWith('.html')) { const e = paginaErrada(f, txt, CHAVE.includes(f)); if (e) return e; }
    return null;
  }],
  ['CH2 · rotas SSR e sitemap no handler: mesmo host', (b) => {
    for (const [url, { rota, status, corpo, location }] of Object.entries(b.ssr)) {
      if (status >= 300 && status < 400) {
        if (location && NOSSO.test(location) && !noHost(location)) return `SSR ${url} redireciona para fora do host decidido: ${location}`;
        continue;
      }
      if (rota === '/sitemap.xml') {
        const locs = [...corpo.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
        if (status !== 200 || !locs.length) return `${url} status ${status} com ${locs.length} <loc>`;
        const fora = locs.find((l) => !l.startsWith(CANONICO + '/'));
        if (fora) return `${url}: <loc> fora do host decidido: ${fora}`;
        continue;
      }
      const e = paginaErrada(`SSR ${url} (${status})`, corpo, true);
      if (e) return e;
      if (rota === ROTA_PERFIL) {
        const m = metadados(corpo), img = corpo.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
        if (status !== 200) return `SSR ${url}: perfil público de fixture respondeu ${status}`;
        if (m.canonical[0] !== CANONICO + ROTA_PERFIL) return `SSR ${url}: canonical do perfil ${m.canonical[0]}`;
        if (!img || !noHost(img)) return `SSR ${url}: og:image do perfil ${img ?? 'ausente'}`;
      }
    }
    return null;
  }],
  ['CH3 · robots.txt e llms.txt anunciam o host decidido', (b) => {
    const robots = b.arquivos['robots.txt'] || '', llms = b.arquivos['llms.txt'] || '';
    const sitemaps = [...robots.matchAll(/^Sitemap:\s*(\S+)/gim)].map((m) => m[1]);
    if (!sitemaps.length) return 'robots.txt sem linha Sitemap:';
    const fora = sitemaps.find((s) => !s.startsWith(CANONICO + '/'));
    if (fora) return `robots.txt: Sitemap fora do host decidido: ${fora}`;
    if (!llms.includes(`Site: ${CANONICO}`)) return `llms.txt não declara "Site: ${CANONICO}"`;
    return null;
  }],
  ['CH4 · nenhum texto publicado cita o host antigo', (b) => {
    const achados = Object.entries(b.arquivos).filter(([, t]) => HOST_ANTIGO.test(t)).map(([f]) => f);
    for (const [url, { corpo }] of Object.entries(b.ssr)) if (HOST_ANTIGO.test(corpo)) achados.push(`SSR ${url}`);
    return achados.length ? `${achados.length} arquivo(s) com o host antigo, ex.: ${achados.slice(0, 5).join(', ')}` : null;
  }],
  ['CH5 · #community recebe data-site no host decidido', (b) => {
    const tag = (b.arquivos['index.html'] || '').match(/<section\b[^>]*\bid="community"[^>]*>/)?.[0];
    if (!tag) return 'index.html sem <section id="community">';
    return attr(tag, 'data-site') === CANONICO ? null : `#community data-site = ${attr(tag, 'data-site') ?? 'ausente'}`;
  }],
];

const rodar = (b) => CASOS.map(([nome, f]) => { let erro; try { erro = f(b); } catch (e) { erro = `exceção: ${e.message}`; } return { nome, erro }; });

const build = await coletar();
if (!build) { console.error('✗ sem build: rode `npm run build` antes (precisa de dist/client e .vercel/output).'); process.exit(1); }

if (MUTATE) {
  const troca = (t) => t.replaceAll(CANONICO, ANTIGO);
  const MUTANTES = [
    ['CH0', 'SITE volta ao host antigo', (b) => ({ ...b, site: ANTIGO })],
    ['CH1', 'canonical da home volta ao host antigo', (b) => ({ ...b, arquivos: { ...b.arquivos, 'index.html': b.arquivos['index.html'].replace(`<link rel="canonical" href="${CANONICO}/`, `<link rel="canonical" href="${ANTIGO}/`) } })],
    ['CH1', 'hreflang de /docs volta ao host antigo', (b) => ({ ...b, arquivos: { ...b.arquivos, 'docs/index.html': b.arquivos['docs/index.html'].replace(`rel="alternate" href="${CANONICO}`, `rel="alternate" href="${ANTIGO}`) } })],
    ['CH1', 'og:image da home vai para o apex', (b) => ({ ...b, arquivos: { ...b.arquivos, 'index.html': b.arquivos['index.html'].replace(`property="og:image" content="${CANONICO}/`, 'property="og:image" content="https://corosolto.com.br/') } })],
    ['CH1', 'home perde o hreflang', (b) => ({ ...b, arquivos: { ...b.arquivos, 'index.html': b.arquivos['index.html'].replace(/<link rel="alternate" hreflang="[^"]+" href="[^"]+">/g, '') } })],
    ['CH1', 'JSON-LD de /docs aponta csbrasil.vercel.app', (b) => ({ ...b, arquivos: { ...b.arquivos, 'docs/index.html': b.arquivos['docs/index.html'].replace(/(type="application\/ld\+json">[^<]*?)https:\/\/www\.corosolto\.com\.br/, '$1https://csbrasil.vercel.app') } })],
    ['CH2', 'redirect SSR sai para o host antigo', (b) => { const [k, v] = Object.entries(b.ssr).find(([, x]) => x.status >= 300 && x.status < 400); return { ...b, ssr: { ...b.ssr, [k]: { ...v, location: `${ANTIGO}/` } } }; }],
    ['CH2', 'perfil usa Astro.url.origin (host do pedido)', (b) => { const k = `${ANTIGO}${ROTA_PERFIL}`; return { ...b, ssr: { ...b.ssr, [k]: { ...b.ssr[k], corpo: b.ssr[k].corpo.replaceAll(`${CANONICO}/`, `${ANTIGO}/`) } } }; }],
    ['CH2', 'perfil existente vira indisponível', (b) => ({ ...b, ssr: Object.fromEntries(Object.entries(b.ssr).map(([k, v]) => [k, v.rota === ROTA_PERFIL ? { ...v, status: 404 } : v])) })],
    ['CH2', 'rota SSR volta ao host antigo', (b) => ({ ...b, ssr: Object.fromEntries(Object.entries(b.ssr).map(([r, v]) => [r, { ...v, corpo: troca(v.corpo) }])) })],
    ['CH3', 'robots.txt volta ao host antigo', (b) => ({ ...b, arquivos: { ...b.arquivos, 'robots.txt': troca(b.arquivos['robots.txt']) } })],
    ['CH4', 'llms-full.txt cita o host antigo', (b) => ({ ...b, arquivos: { ...b.arquivos, 'llms-full.txt': (b.arquivos['llms-full.txt'] || '') + `\n${ANTIGO}/\n` } })],
    ['CH5', 'comunidade volta ao host antigo', (b) => ({ ...b, arquivos: { ...b.arquivos, 'index.html': b.arquivos['index.html'].replace(`data-site="${CANONICO}"`, `data-site="${ANTIGO}"`) } })],
  ];
  let cegas = 0;
  console.log('HOST CANÔNICO (MUTANTES — cada um tem que FALHAR)\n');
  for (const [alvo, nome, aplica] of MUTANTES) {
    const m = aplica(build);
    if (JSON.stringify(m) === JSON.stringify(build)) { console.error(`✗ MUTANTE NÃO APLICOU: ${nome}`); process.exit(1); }
    const mordeu = rodar(m).some((r) => r.nome.startsWith(alvo) && r.erro);
    if (!mordeu) cegas++;
    console.log(` ${mordeu ? '✓' : '✗'} ${alvo} · ${nome}`);
  }
  if (cegas) { console.error(`\n✗ RÉGUA CEGA: ${cegas} mutante(s) passaram.`); process.exit(1); }
  console.log(`\n✓ a régua MORDE: os ${MUTANTES.length} mutantes ficaram vermelhos.`);
  process.exit(0);
}

const res = rodar(build);
const comCanonical = Object.entries(build.arquivos).filter(([f, t]) => f.endsWith('.html') && metadados(t).canonical.length).length;
console.log(`HOST CANÔNICO (${CANONICO}) · ${comCanonical} páginas estáticas com canonical · ${Object.keys(build.arquivos).length} arquivos de texto · SSR: ${[...new Set(Object.values(build.ssr).map((v) => `${v.rota} ${v.status}`))].join(', ')} (pedidas em www.corosolto.com.br e www.csbrasil.online)\n`);
for (const r of res) console.log(` ${r.erro ? '✗' : '✓'} ${r.nome}${r.erro ? '\n     ' + r.erro : ''}`);
const falhas = res.filter((r) => r.erro).length;
console.log(`\n${falhas ? '✗' : '✓'} host canônico ${res.length - falhas}/${res.length}`);
process.exit(falhas ? 1 : 0);
