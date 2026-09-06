/* ============================================================================
   boot.mjs — O HTML QUE O ALVO SERVE CONSEGUE VIRAR JOGO?
   ----------------------------------------------------------------------------
   Mede, sem navegador, a cadeia que precede o primeiro frame: HTML da raiz →
   import map → main.js → version.js → grafo de módulos. Cada elo já derrubou a
   produção uma vez (BUG-39 cache split-brain, #362 import map, boot morto por
   TDZ em 07/08), e cada um tem sonda própria em tools/eval; aqui elas viram UM
   retrato com a versão servida ao lado, para o relatório dizer "o HTML é da
   alpha.221 e o main.js é de outra" em vez de "algo está errado".

   Remoto (`sondaBootRemoto`): rede. Local (`sondaBootLocal`): árvore + um
   servidor estático descartável que serve `public/` com o MESMO import map que
   o index.astro gera (scripts/module-cache.mjs), e o prod-coherence.mjs corre
   contra ele — coerência do grafo ANTES do deploy, sem Astro.

   O que NÃO mede: se o main.js AVALIA (isso é `eval:boot`, com Chrome) — a
   sonda de navegador (browser.mjs) cobre quando há Playwright.
   ============================================================================ */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, sep } from 'node:path';
import { sonda, pareceHtml } from '../lib/http.mjs';
import { lerPackage, versaoDoVersionJs, manifestoDeModulos, importMapComo, RAIZ_PADRAO } from '../lib/repo.mjs';

export function extraiImportMap(html) {
  const m = /<script[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!m) return null;
  try { return JSON.parse(m[1]).imports || {}; } catch { return null; }
}

export function extraiVersaoHtml(html) {
  const m = /<link[^>]+rel=["']stylesheet["'][^>]+href=["'][^"']*\?v=([^"'&]+)["']/i.exec(html)
    || /href=["'][^"']*\?v=([^"'&]+)["'][^>]*rel=["']stylesheet["']/i.exec(html);
  return m ? m[1] : null;
}

export function extraiScriptsModulo(html) {
  return [...html.matchAll(/<script[^>]+type=["']module["'][^>]*src=["']([^"']+)["']/gi)].map((m) => m[1]);
}

export function extraiVersionJs(src) {
  const m = /export\s+const\s+VERSION\s*=\s*['"]([^'"]+)['"]/.exec(src || '');
  return m ? m[1] : null;
}

/* Corre o prod-coherence.mjs como processo filho e devolve as linhas ✗. Reusar
   a régua em vez de copiá-la: dois leitores do mesmo grafo divergindo é o
   instrumento discordando de si (docs/LICOES.md §2). */
export function coerenciaDoGrafo(base, raiz = RAIZ_PADRAO, timeoutMs = 120_000) {
  return new Promise((resolve) => {
    const script = join(raiz, 'tools/eval/prod-coherence.mjs');
    if (!existsSync(script)) return resolve({ exit: null, problemas: [], saida: 'prod-coherence.mjs ausente' });
    const p = spawn(process.execPath, [script, base], { cwd: raiz, env: { ...process.env } });
    let saida = '';
    const timer = setTimeout(() => { try { p.kill('SIGKILL'); } catch { /* já morreu */ } }, timeoutMs);
    p.on('error', (e) => { clearTimeout(timer); resolve({ exit: null, problemas: [], saida: `prod-coherence não subiu: ${e.message}` }); });
    p.stdout.on('data', (d) => { saida += d; });
    p.stderr.on('data', (d) => { saida += d; });
    p.on('close', (exit) => {
      clearTimeout(timer);
      const problemas = saida.split('\n').filter((l) => /^\s*✗\s/.test(l)).map((l) => l.replace(/^\s*✗\s*/, '').trim());
      resolve({ exit, problemas, saida: saida.trim().slice(-2000) });
    });
  });
}

export async function sondaBootRemoto(base, { raiz = RAIZ_PADRAO, coerencia = true, timeoutMs = 15_000 } = {}) {
  const r = { sonda: 'boot', alvo: base, html: null, importMap: null, versaoHtml: null, versaoJs: null, mainJs: null, opsJs: null, coerencia: null };
  const html = await sonda(`${base}/`, { timeoutMs });
  r.html = {
    status: html.status, ms: html.ms, bytes: html.bytes.length, erro: html.erro,
    csp: !!html.headers['content-security-policy'], hsts: !!html.headers['strict-transport-security'],
    cacheControl: html.headers['cache-control'] || null, cfCache: html.headers['cf-cache-status'] || null,
    servidor: html.headers['x-vercel-id'] ? 'vercel' : (html.headers.server || null),
  };
  if (html.status !== 200) return r;
  const texto = html.texto();
  r.importMap = extraiImportMap(texto);
  r.versaoHtml = extraiVersaoHtml(texto);
  const scripts = extraiScriptsModulo(texto);
  r.scriptsModulo = scripts.map((s) => s.split('?')[0]);
  r.opsJs = { noHtml: scripts.some((s) => /\/js\/ops\.js/.test(s)), noImportMap: !!r.importMap?.['./js/ops.js'] };
  if (!r.importMap) return r;

  const srcMain = scripts.find((s) => /\/js\/main\.js/.test(s)) || r.importMap['./js/main.js'];
  if (srcMain) {
    const m = await sonda(new URL(srcMain, `${base}/`).href, { timeoutMs, maxBytes: 4096 });
    r.mainJs = { status: m.status, ms: m.ms, erro: m.erro, ehHtml: m.status === 200 && pareceHtml(m.bytes), tipo: m.headers['content-type'] || null, cfCache: m.headers['cf-cache-status'] || null };
  }
  const srcVersion = r.importMap['./js/version.js'];
  if (srcVersion) {
    const v = await sonda(new URL(srcVersion, `${base}/`).href, { timeoutMs });
    r.versaoJs = v.status === 200 ? extraiVersionJs(v.texto()) : null;
    r.versionJsStatus = v.status;
  }
  if (coerencia) r.coerencia = await coerenciaDoGrafo(base, raiz);
  return r;
}

/* ---------- local: árvore + servidor estático com o import map do Astro ---------- */
const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.html': 'text/html', '.css': 'text/css', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };

export async function servidorEstaticoDePublic(raiz = RAIZ_PADRAO, { versao, manifesto } = {}) {
  const pub = join(raiz, 'public');
  const v = versao || lerPackage(raiz).version;
  const man = manifesto || await manifestoDeModulos(raiz);
  const mapa = importMapComo(null, v, man);
  const html = `<!doctype html><html><head><link rel="stylesheet" href="/style.css?v=${v}"><script type="importmap">${JSON.stringify(mapa)}</script></head><body><script type="module" src="/js/main.js?v=${v}-${man.revision}"></script></body></html>`;
  const srv = createServer((req, res) => {
    let caminho; try { caminho = decodeURIComponent(req.url.split('?')[0]); } catch { res.writeHead(400); res.end(); return; }
    if (caminho === '/' || caminho === '/index.html') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(html); return; }
    const abs = join(pub, caminho);
    if (!abs.startsWith(pub + sep) || !existsSync(abs)) { res.writeHead(404); res.end(); return; }
    try { const corpo = readFileSync(abs); res.writeHead(200, { 'content-type': MIME[extname(abs)] || 'application/octet-stream' }); res.end(corpo); }
    catch { res.writeHead(404); res.end(); }
  });
  await new Promise((f) => srv.listen(0, '127.0.0.1', f));
  // closeAllConnections: um pedido que morreu no handler não pode segurar o fechamento para sempre
  return { srv, base: `http://127.0.0.1:${srv.address().port}`, versao: v, manifesto: man, fechar: () => new Promise((f) => { srv.closeAllConnections?.(); srv.close(f); }) };
}

export async function sondaBootLocal({ raiz = RAIZ_PADRAO, coerencia = true } = {}) {
  const r = { sonda: 'boot-local', versaoPackage: null, versaoJs: null, indexAstro: null, manifesto: null, coerencia: null };
  const pkg = lerPackage(raiz);
  r.versaoPackage = pkg.version;
  r.versaoJs = versaoDoVersionJs(raiz);
  const astro = readFileSync(join(raiz, 'src/pages/index.astro'), 'utf8');
  r.indexAstro = {
    temImportMap: /type=["']importmap["']/.test(astro),
    temMainJs: /\/js\/main\.js\?v=/.test(astro),
    temOpsJs: /\/js\/ops\.js\?v=/.test(astro),
    temColetorDeErros: /\/api\/jserror/.test(astro),
  };
  const man = await manifestoDeModulos(raiz);
  r.manifesto = { modulos: man.modules.length, revisao: man.revision, temOps: man.modules.includes('ops.js') };
  if (coerencia) {
    const s = await servidorEstaticoDePublic(raiz, { versao: pkg.version, manifesto: man });
    try { r.coerencia = await coerenciaDoGrafo(s.base, raiz); } finally { await s.fechar(); }
  }
  return r;
}
