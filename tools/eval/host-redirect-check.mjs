/* host-redirect-check.mjs — OS HOSTS ANTIGOS REDIRECIONAM PARA O CANÔNICO, E SÓ ELES?
   Em 13/10/2026 www.csbrasil.online e csbrasil.vercel.app serviam 200 com o mesmo HTML de
   www.corosolto.com.br (`curl -sI`), e csbrasil.online fazia 308 para www.csbrasil.online.
   Avalia o vercel.json com a semântica da Vercel (@vercel/routing-utils), sem deploy:
     HR1 · páginas dos hosts antigos dão redirect permanente para https://www.corosolto.com.br/<mesmo path>
     HR2 · /api/, /auth/ e arquivos (js, glb, robots.txt…) não redirecionam: aba aberta, beacon
           e callback de login seguem no host em que nasceram
     HR3 · host canônico, nós MP e previews *-rubenmarcus-projects.vercel.app não redirecionam
   Uso: node tools/eval/host-redirect-check.mjs [--mutate] */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const CANONICO = 'https://www.corosolto.com.br';
const ANTIGOS = ['www.csbrasil.online', 'csbrasil.online', 'csbrasil.vercel.app'];
const PAGINAS = ['/', '/armas', '/u/abc123/nick', '/docs/stack', '/como-jogar', '/sala/XYZ'];
const FICAM = ['/api/health', '/api/social', '/api/telemetry', '/auth/callback', '/js/main.js', '/models/x.glb', '/robots.txt', '/sitemap.xml', '/audio/manifest.json'];
const INTOCADOS = ['www.corosolto.com.br', 'br.corosolto.com.br', 'csbrasil-git-x-rubenmarcus-projects.vercel.app', 'csbrasil-abc123-rubenmarcus-projects.vercel.app'];

const { getTransformedRoutes } = createRequire(import.meta.url)('@vercel/routing-utils');

function roteador(vercel) {
  const res = getTransformedRoutes({ redirects: vercel.redirects });
  if (res.error) throw new Error(res.error.message);
  const rotas = res.routes.filter((r) => r.status && r.headers?.Location);
  return (host, p) => {
    for (const r of rotas) {
      const m = new RegExp(r.src).exec(p);
      if (!m) continue;
      if ((r.has || []).some((h) => h.type === 'host' && !new RegExp(`^${h.value}$`).test(host))) continue;
      return { status: r.status, location: r.headers.Location.replace(/\$(\d+)/g, (_, i) => m[i] ?? '') };
    }
    return null;
  };
}

function medir(vercel) {
  const ir = roteador(vercel);
  const falhas = { HR1: [], HR2: [], HR3: [] };
  for (const host of ANTIGOS) {
    for (const p of PAGINAS) {
      const r = ir(host, p);
      if (!r || ![301, 308].includes(r.status) || r.location !== CANONICO + p) falhas.HR1.push(`${host}${p} → ${r ? `${r.status} ${r.location}` : 'sem redirect'}`);
    }
    for (const p of FICAM) { const r = ir(host, p); if (r) falhas.HR2.push(`${host}${p} → ${r.status} ${r.location}`); }
  }
  for (const host of INTOCADOS) for (const p of [...PAGINAS, ...FICAM]) {
    const r = ir(host, p);
    if (r) falhas.HR3.push(`${host}${p} → ${r.status} ${r.location}`);
  }
  return falhas;
}

const NOMES = { HR1: 'páginas dos hosts antigos → redirect permanente ao canônico, mesmo path', HR2: '/api, /auth e arquivos ficam no host de origem', HR3: 'canônico, nós MP e previews não redirecionam' };
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));

if (process.argv.includes('--mutate')) {
  const doHost = (r) => r.has?.some((h) => h.type === 'host');
  const MUTANTES = [
    ['HR3', 'regra sem condição de host', (v) => v.redirects.map((r) => (doHost(r) ? { ...r, has: undefined } : r))],
    ['HR2', 'regra deixa de poupar /api/', (v) => v.redirects.map((r) => (doHost(r) ? { ...r, source: r.source.replace('api/|', '') } : r))],
    ['HR1', 'destino volta ao host antigo', (v) => v.redirects.map((r) => (doHost(r) ? { ...r, destination: r.destination.replace(CANONICO, 'https://www.csbrasil.online') } : r))],
    ['HR1', 'csbrasil.vercel.app fica sem regra', (v) => v.redirects.filter((r) => !r.has?.some((h) => h.value === 'csbrasil.vercel.app'))],
    ['HR1', 'redirect vira temporário', (v) => v.redirects.map((r) => (doHost(r) ? { ...r, permanent: false } : r))],
  ];
  let cegas = 0;
  for (const [alvo, nome, aplica] of MUTANTES) {
    const redirects = aplica(vercel);
    if (JSON.stringify(redirects) === JSON.stringify(vercel.redirects)) { console.error(`✗ MUTANTE NÃO APLICOU: ${nome}`); process.exit(1); }
    const mordeu = medir({ ...vercel, redirects })[alvo].length > 0;
    if (!mordeu) cegas++;
    console.log(` ${mordeu ? '✓' : '✗'} ${alvo} · ${nome}`);
  }
  if (cegas) { console.error(`✗ RÉGUA CEGA: ${cegas} mutante(s) passaram.`); process.exit(1); }
  console.log(`✓ a régua MORDE: os ${MUTANTES.length} mutantes ficaram vermelhos.`);
  process.exit(0);
}

const falhas = medir(vercel);
console.log(`REDIRECT DE HOST (${ANTIGOS.join(', ')} → ${CANONICO})\n`);
for (const [k, lista] of Object.entries(falhas))
  console.log(` ${lista.length ? '✗' : '✓'} ${k} · ${NOMES[k]}${lista.length ? `\n     ${lista.length} caso(s), ex.: ${lista.slice(0, 3).join(' | ')}` : ''}`);
const n = Object.values(falhas).filter((l) => l.length).length;
console.log(`\n${n ? '✗' : '✓'} redirect de host ${3 - n}/3`);
process.exit(n ? 1 : 0);
