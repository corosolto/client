#!/usr/bin/env node
/* ============================================================================
   vm-serving-prod-check.mjs — O SITE PUBLICADO ENTREGA O VIEWMODEL PRIVADO
   ----------------------------------------------------------------------------
   POR QUE EXISTE: até o PR "viewmodel: entrega privada em produção (Blob)" não
   havia canal de produção para public/private-assets/viewmodels (gitignored,
   symlink local): em produção o GLB autorado dava 404 e o jogo caía no legado EM
   SILÊNCIO. O eval:vm-serving mede o astro dev; esta régua mede o ARTEFATO.
   Contrato: tools/viewmodels/vm-assets.manifest.json (35 assets, 75,4 MB medidos
   em 23/09 pela árvore viewmodels-catalog-final).

   Modo dist (padrão; lê .vercel/output/static e/ou dist/client, ou --dist=<dir>):
     SP1 toda entrada do manifesto existe no publicado com bytes e SHA-256 iguais
     SP2 nada fora do manifesto sob private-assets/viewmodels (vazamento de intermediário)
     SP3 vercel.json, avaliado com a semântica da Vercel (@vercel/routing-utils):
         GLB sai model/gltf-binary; imutável exatamente onde cachePolicyFor manda;
         CSP permite connect-src 'self' e img-src blob:; buildCommand baixa antes do build
   Modo URL (--url=https://preview…): cada entrada responde 200 com bytes, SHA-256,
     Content-Type e Cache-Control esperados (SP1/SP3 medidos no ar). Deployment
     Protection: VERCEL_AUTOMATION_BYPASS_SECRET no ambiente vira cabeçalho.
   SP4 (os dois modos) vínculo URL↔bytes: todo VM_BYTES de public/js/data/vmbytes.js
     aponta para um asset imutável do manifesto e vice-versa. Sem vmbytes.js no ramo
     o vínculo não é medido e isso é dito (vira obrigatório quando o runtime chegar).

   Mutantes (TÊM que ficar vermelhos): --mutante=arquivo-faltando | hash-errado |
     vazamento | sem-imutavel | vmbytes-velho
   --config: só SP3/SP4, sem publicado — é o que roda no check:deploy (node puro, ms).
   Uso: node tools/eval/vm-serving-prod-check.mjs [--config | --dist=<dir> | --url=<base>] [--mutante=<nome>]
   ============================================================================ */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { ROOT, cachePolicyFor, contentTypeFor, listTree, readManifest, sha256File } from '../../scripts/vm-assets.mjs';

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=').slice(1).join('=');
const MUT = arg('mutante');
const MUTANTES = ['arquivo-faltando', 'hash-errado', 'vazamento', 'sem-imutavel', 'vmbytes-velho'];
if (MUT && !MUTANTES.includes(MUT)) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }
const URL_BASE = arg('url').replace(/\/+$/, '');

let falhas = 0;
const check = (ok, id, label, evid = '') => {
  console.log(`${ok ? 'PASSA' : 'FALHA'} ${id} ${label}${evid ? ` — ${evid}` : ''}`);
  if (!ok) falhas += 1;
};
const mutApplied = (ok, what) => { if (!ok) { console.error(`MUTANTE NAO APLICOU: ${what}`); process.exit(2); } };

let manifest;
try { manifest = readManifest(); } catch (error) {
  check(false, 'SP0', 'manifesto legível', error.message);
  process.exit(1);
}
const files = manifest.files;
const VICTIM = files.find((f) => f.path.endsWith('-baked-runtime.glb')) || files[0];
const IMMUTABLE = 'public, max-age=31536000, immutable';

/* ---- SP3 (config) ---- */
function headerTable() {
  let vercel = JSON.parse(readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  if (MUT === 'sem-imutavel') {
    const before = vercel.headers.length;
    vercel = { ...vercel, headers: vercel.headers.filter((h) => !h.headers.some((x) => x.value === IMMUTABLE && h.source.includes('private-assets'))) };
    mutApplied(vercel.headers.length < before, 'sem-imutavel');
  }
  let getTransformedRoutes;
  try { ({ getTransformedRoutes } = createRequire(import.meta.url)('@vercel/routing-utils')); } catch {
    check(false, 'SP3', 'avaliar vercel.json', '@vercel/routing-utils ausente (dependência do @astrojs/vercel) — sem ele a régua não sabe medir; `npm ci`');
    return null;
  }
  const res = getTransformedRoutes({ headers: vercel.headers });
  if (res.error) { check(false, 'SP3', 'vercel.json válido', res.error.message); return null; }
  const routes = res.routes.filter((r) => r.headers);
  return {
    vercel,
    headersFor(p) {
      const h = {};
      for (const r of routes) if (new RegExp(r.src).test(p)) for (const [k, v] of Object.entries(r.headers)) h[k.toLowerCase()] = v;
      return h;
    },
  };
}

function checkHeaders(h, entry) {
  const erros = [];
  if (entry.path.endsWith('.glb') && !(h['content-type'] || '').startsWith('model/gltf-binary')) erros.push(`content-type ${h['content-type'] || '(nenhum)'}`);
  const cc = h['cache-control'] || '';
  const immutable = /\bimmutable\b/.test(cc) && /max-age=31536000/.test(cc);
  if (cachePolicyFor(entry.path) === 'immutable' && !immutable) erros.push(`cache "${cc || '(nenhum)'}" deveria ser imutável (URL versionada por bytes)`);
  if (cachePolicyFor(entry.path) === 'revalidate' && /\bimmutable\b/.test(cc)) erros.push('imutável numa URL de versão fixa (BUG-157)');
  return erros;
}

function checkConfig() {
  const t = headerTable();
  if (!t) return;
  const ruins = [];
  for (const f of files) {
    const erros = checkHeaders(t.headersFor(`${manifest.servedRoot}/${f.path}`), f);
    if (erros.length) ruins.push(`${f.path}: ${erros.join(', ')}`);
  }
  check(!ruins.length, 'SP3', `cabeçalhos do vercel.json para ${files.length} assets`, ruins.length ? `${ruins.length} errados (ex.: ${ruins.slice(0, 3).join(' | ')})` : `${files.filter((f) => cachePolicyFor(f.path) === 'immutable').length} imutáveis, resto revalida`);
  const csp = t.headersFor(`${manifest.servedRoot}/${files[0].path}`)['content-security-policy'] || '';
  const dir = (name) => (new RegExp(`${name}([^;]*)`).exec(csp) || [])[1] || '';
  check(/'self'/.test(dir('connect-src')) && /blob:/.test(dir('img-src')) && /'self'/.test(dir('img-src')),
    'SP3', "CSP deixa o GLTFLoader buscar same-origin e decodificar textura em blob:", csp ? '' : 'sem CSP');
  const build = t.vercel.buildCommand || '';
  const iFetch = build.indexOf('scripts/fetch-viewmodels.sh');
  check(iFetch >= 0 && iFetch < build.indexOf('npm run build'), 'SP3', 'buildCommand baixa o viewmodel antes do build', build.slice(0, 120));
}

/* ---- SP4 (vínculo URL↔bytes) ---- */
async function checkVmBytes() {
  const file = path.join(ROOT, 'public/js/data/vmbytes.js');
  if (!existsSync(file)) {
    console.log('AVISO SP4 vmbytes.js ausente neste ramo — vínculo URL↔bytes NÃO medido (obrigatório quando o runtime do catálogo entrar)');
    if (MUT === 'vmbytes-velho') mutApplied(false, 'vmbytes-velho (sem vmbytes.js)');
    return;
  }
  const { VM_BYTES } = await import(pathToFileURL(file).href);
  const bytes = { ...VM_BYTES };
  if (MUT === 'vmbytes-velho') { const k = Object.keys(bytes)[0]; bytes[k] = '0000000000'; }
  const imut = new Set(files.filter((f) => cachePolicyFor(f.path) === 'immutable').map((f) => f.v));
  const orfaos = Object.entries(bytes).filter(([, v]) => !imut.has(v)).map(([w, v]) => `${w}=${v}`);
  const soltos = [...imut].filter((v) => !Object.values(bytes).includes(v));
  check(!orfaos.length && !soltos.length, 'SP4', `VM_BYTES (${Object.keys(bytes).length}) ↔ manifesto imutável (${imut.size})`,
    [orfaos.length ? `URL pede bytes que o manifesto não publica: ${orfaos.slice(0, 4).join(', ')}` : '',
      soltos.length ? `imutável sem versão no runtime: ${soltos.slice(0, 4).join(', ')}` : ''].filter(Boolean).join('; '));
}

/* ---- modo dist ---- */
function mutateDist(realRoot) {
  const tmp = mkdtempSync(path.join(tmpdir(), 'vm-prod-mut-'));
  const vmRoot = path.join(tmp, 'private-assets/viewmodels');
  for (const rel of listTree(realRoot)) {
    const dest = path.join(vmRoot, rel);
    mkdirSync(path.dirname(dest), { recursive: true });
    if (MUT === 'arquivo-faltando' && rel === VICTIM.path) continue;
    if (MUT === 'hash-errado' && rel === VICTIM.path) {
      copyFileSync(path.join(realRoot, rel), dest);
      const buf = readFileSync(dest); buf[buf.length >> 1] ^= 0xff; writeFileSync(dest, buf);
      continue;
    }
    symlinkSync(path.join(realRoot, rel), dest);
  }
  if (MUT === 'vazamento') { mkdirSync(path.join(vmRoot, 'shared/raw-general'), { recursive: true }); writeFileSync(path.join(vmRoot, 'shared/raw-general/walk.glb'), 'intermediario'); }
  if (MUT === 'arquivo-faltando') mutApplied(!existsSync(path.join(vmRoot, VICTIM.path)), 'arquivo-faltando');
  process.on('exit', () => rmSync(tmp, { recursive: true, force: true }));
  return tmp;
}

async function checkDist(distRoot) {
  let root = path.join(distRoot, 'private-assets/viewmodels');
  if (!existsSync(root)) {
    check(false, 'SP1', `${path.relative(ROOT, distRoot) || distRoot}: private-assets/viewmodels ausente`, 'o build não recebeu o viewmodel — `bash scripts/fetch-viewmodels.sh` não rodou ou degradou sem token; produção cairia no legado');
    return;
  }
  if (['arquivo-faltando', 'hash-errado', 'vazamento'].includes(MUT)) root = path.join(mutateDist(root), 'private-assets/viewmodels');
  const ruins = [];
  for (const f of files) {
    const abs = path.join(root, f.path);
    if (!existsSync(abs)) { ruins.push(`${f.path} ausente`); continue; }
    const sha = await sha256File(abs);
    if (sha !== f.sha256) ruins.push(`${f.path} sha ${sha.slice(0, 10)} != ${f.v}`);
  }
  if (MUT === 'hash-errado') mutApplied((await sha256File(path.join(root, VICTIM.path))) !== VICTIM.sha256, 'hash-errado');
  check(!ruins.length, 'SP1', `${path.relative(ROOT, distRoot) || distRoot}: ${files.length - ruins.length}/${files.length} assets com SHA-256 do manifesto`,
    ruins.length ? `${ruins.slice(0, 4).join('; ')} — refaça \`bash scripts/fetch-viewmodels.sh\` (VM_REQUIRED=1) e o build` : '');
  const lista = new Set(files.map((f) => f.path));
  const extras = listTree(root).filter((r) => !lista.has(r));
  check(!extras.length, 'SP2', 'nada fora do manifesto no publicado', extras.length ? `${extras.length} extra(s): ${extras.slice(0, 4).join(', ')} — scripts/prune-dist.mjs não podou` : '');
}

/* ---- modo URL ---- */
async function checkUrl() {
  const headers = {};
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) headers['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const ruins = [];
  let total = 0;
  const encodings = {};
  for (const f of files) {
    const expected = MUT === 'hash-errado' && f === VICTIM ? `${'0'.repeat(10)}${f.sha256.slice(10)}` : f.sha256;
    const rel = MUT === 'arquivo-faltando' && f === VICTIM ? `${f.path}.fantasma` : f.path;
    try {
      const res = await fetch(`${URL_BASE}${manifest.servedRoot}/${rel}?v=${f.v}`, { headers, signal: AbortSignal.timeout(120000) });
      if (res.status !== 200) { ruins.push(`${rel} HTTP ${res.status}`); continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      total += buf.length;
      const sha = createHash('sha256').update(buf).digest('hex');
      if (buf.length !== f.bytes || sha !== expected) { ruins.push(`${rel} ${buf.length} bytes sha ${sha.slice(0, 10)} != ${expected.slice(0, 10)}`); continue; }
      const h = Object.fromEntries(res.headers);
      encodings[h['content-encoding'] || 'nenhuma'] = (encodings[h['content-encoding'] || 'nenhuma'] || 0) + 1;
      if (f.path.endsWith('.webp') && !(h['content-type'] || '').startsWith(contentTypeFor(f.path))) ruins.push(`${rel} content-type ${h['content-type']}`);
      const erros = checkHeaders(h, f);
      if (erros.length) ruins.push(`${rel}: ${erros.join(', ')}`);
    } catch (error) {
      ruins.push(`${rel} ${error.name}`);
    }
  }
  check(!ruins.length, 'SP1', `${URL_BASE}: ${files.length - ruins.length}/${files.length} assets com 200, SHA-256 e cabeçalhos certos (${(total / 1048576).toFixed(1)} MB)`,
    ruins.length ? `${ruins.slice(0, 5).join('; ')}${ruins.some((r) => /HTTP 40[13]/.test(r)) ? ' — preview protegido? exporte VERCEL_AUTOMATION_BYPASS_SECRET' : ''}` : '');
  console.log(`INFO compressão no fio: ${JSON.stringify(encodings)} (GLB comprime ~3,5× em gzip; ver VM-ENTREGA-PRODUCAO.md)`);
}

if (URL_BASE) {
  if (['vazamento', 'sem-imutavel'].includes(MUT)) { console.error(`mutante ${MUT} só vale no modo dist`); process.exit(2); }
  await checkUrl();
} else {
  checkConfig();
  const alvo = arg('dist');
  if (process.argv.includes('--config')) {
    if (['arquivo-faltando', 'hash-errado', 'vazamento'].includes(MUT)) { console.error(`mutante ${MUT} precisa do publicado (sem --config)`); process.exit(2); }
  } else {
    const dists = alvo ? [path.resolve(alvo)] : ['.vercel/output/static', 'dist/client'].map((d) => path.join(ROOT, d)).filter(existsSync);
    if (!dists.length) check(false, 'SP1', 'nenhum publicado encontrado', 'rode `npm run build` (ou passe --dist=<dir>)');
    for (const d of dists) await checkDist(d);
  }
}
await checkVmBytes();

console.log(JSON.stringify({ modo: URL_BASE ? 'url' : process.argv.includes('--config') ? 'config' : 'dist', mutante: MUT || null, assets: files.length, falhas }));
if (MUT && !falhas) { console.log(`FALHA mutação '${MUT}' não acendeu nenhuma cláusula — régua cega`); process.exit(1); }
process.exit(falhas ? 1 : 0);
