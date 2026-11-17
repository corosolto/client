#!/usr/bin/env node
/* ============================================================================
   dist-compartilhado.mjs — O DIST DO PR-FAST VIAJA SEM O QUE O CHECKOUT JÁ TEM
   ----------------------------------------------------------------------------
   POR QUE EXISTE (medido em 17/11/2026, runs de pull_request de 15-16/11)
   O artefato `pr-fast-dist` subia `dist` + `.vercel/output` inteiros: 1,33 GB
   zipados, baixados por cada um dos 41 jobs do pr-fast (~29 runner-min por run, mais
   ~52 s de upload no caminho crítico do setup). Dois terços disso eram cópia:
   · `.vercel/output/static` é o espelho byte a byte de `dist/client` que o adaptador
     da Vercel escreve (ver scripts/prune-dist.mjs);
   · quase todo `dist/client` é `public/` copiado sem mudança pelo Astro (GLB, vídeo,
     áudio, textura), e o job consumidor já tem `public/` no próprio checkout do
     MESMO commit.

   empacota <dir>  (job setup, depois do `npm run build`)
     1. confere que `.vercel/output/static` é espelho exato de `dist/client` (mesmos
        caminhos, tipos, bytes e alvos de link); divergência é vermelho, nunca pulo;
     2. arquivo de `dist/client/<x>` cujo conteúdo é o blob COMMITADO de `public/<x>`
        (hash de blob do git, não mtime nem worktree) fica fora do tar e entra no
        manifesto `publico.json` com sha256, tamanho e modo;
     3. o resto de `dist` e de `.vercel/output` (sem `static`) vira `dist.tar.zst`.
   restaura <dir>  (action setup-ci-environment, nos consumidores)
     1. extrai o tar na raiz;
     2. copia cada arquivo do manifesto de `public/` para `dist/client/` e confere o
        sha256 — checkout de outro commit ou arquivo alterado é vermelho;
     3. refaz `.vercel/output/static` como cópia de `dist/client` (cópia real, não
        hardlink: régua que escreva num lado não pode mudar o outro).

   Uso: node scripts/ci/dist-compartilhado.mjs empacota|restaura <dir>
   ============================================================================ */
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync, copyFileSync, renameSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync,
  readlinkSync, rmSync, symlinkSync, writeFileSync,
} from 'node:fs';
import path from 'node:path';

const [modo, dir] = process.argv.slice(2);
if (!['empacota', 'restaura'].includes(modo) || !dir) {
  console.error('uso: node scripts/ci/dist-compartilhado.mjs empacota|restaura <dir>');
  process.exit(2);
}
const CLIENTE = 'dist/client';
const SERVIDOR = 'dist/server';
/* Fase 6 (docs/runbooks/MIGRACAO-CLOUDFLARE.md): o adapter é o do Cloudflare e o build
   não produz `.vercel/output`. As réguas SSR do repo, porém, medem o handler em
   `.vercel/output/functions/_render.func` com `.vc-config.json` — o `restaura` recria
   esse caminho como ESPELHO DE COMPAT (cópia de dist/server + wrapper env.ASSETS por fs),
   e `dist/client` segue como fonte do estático. */
const ESTATICO = '.vercel/output/static';
const FUNC = '.vercel/output/functions/_render.func';
const TAR = path.join(dir, 'dist.tar.zst');
const MANIFESTO = path.join(dir, 'publico.json');
/* Shim do módulo interno do runtime: `env` é mutável e o compat.mjs o preenche por
   requisição com o mesmo objeto passado ao server.fetch (bindings + ASSETS). */
const SHIM_CF_WORKERS_MJS = `let atual = {};
export const env = new Proxy({}, {
  get: (_, k) => (k in atual ? atual[k] : process.env[k]),
  has: (_, k) => k in atual || k in process.env,
});
export function __setEnv(e) { atual = e ?? {}; }
export const waitUntil = (p) => { globalThis.__csWaitUntil?.(p); };
// Globals do runtime Workers que o bundle le em top-level (caches no SSR-cache).
// No-op seguro para regras: match nunca acerta, put descarta.
export function __installGlobals() {
  if (!globalThis.caches) {
    globalThis.caches = { default: {
      match: async () => undefined,
      put: async () => undefined,
      delete: async () => true,
    } };
  }
}
`;

/* Wrapper de compat: expõe o entry do Workers no contrato que as réguas consomem
   (`default {fetch}` com `env.ASSETS` servindo `dist/client` do disco). */
const COMPAT_MJS = `import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { __setEnv, __installGlobals } from './_shims/cloudflare-workers.mjs';

__installGlobals();
const { default: server } = await import('./entry.mjs');

const CLIENTE = path.resolve(import.meta.dirname, '..', '..', '..', '..', 'dist', 'client');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.webm': 'video/webm', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.woff2': 'font/woff2' };

const ASSETS = {
  async fetch(input) {
    const url = typeof input === 'string' ? new URL(input, 'https://local.test') : new URL(input.url);
    const pathname = decodeURIComponent(url.pathname);
    for (const candidato of [pathname, pathname + '/index.html', pathname.replace(/\\/+$/, '') + '/index.html']) {
      const alvo = path.resolve(CLIENTE, '.' + candidato);
      if (!alvo.startsWith(CLIENTE) || !existsSync(alvo) || !statSync(alvo).isFile()) continue;
      return new Response(readFileSync(alvo), { headers: { 'content-type': MIME[path.extname(alvo).toLowerCase()] || 'application/octet-stream' } });
    }
    return new Response(null, { status: 404 });
  },
};

export default {
  fetch(request, env = { ASSETS }, ctx = { waitUntil() {}, passThroughOnException() {} }) {
    __setEnv(env);
    return server.fetch(request, env, ctx);
  },
};
`;

function falha(msg) {
  console.error(`::error::dist-compartilhado: ${msg}`);
  process.exit(1);
}
function roda(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.status !== 0) falha(`${cmd} ${args.slice(0, 3).join(' ')}… saiu ${r.status ?? r.signal}`);
}
/* Caminhos relativos (separador /) de tudo sob `raiz`, diretórios incluídos. */
function arvore(raiz) {
  const itens = [];
  const anda = (rel) => {
    for (const e of readdirSync(path.join(raiz, rel), { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      itens.push(r);
      if (e.isDirectory()) anda(r);
    }
  };
  anda('');
  return itens.sort();
}
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const blobGit = (buf) => createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;

if (modo === 'empacota') {
  for (const d of [CLIENTE, SERVIDOR]) if (!existsSync(d)) falha(`${d} ausente depois do build`);
  if (existsSync(ESTATICO) || existsSync('.vercel/output/functions')) falha('.vercel/output não deve existir com o adapter Cloudflare (fase 6)');

  /* 1. (fase 6) sem espelho: o adapter Cloudflare não duplica o estático. */

  /* 2. arquivos que são o blob commitado de public/ */
  const cliente = arvore(CLIENTE);
  const commitados = new Map();
  for (const linha of execFileSync('git', ['ls-files', '-s', '-z', '--', 'public'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).split('\0')) {
    const m = /^(\d{6}) ([0-9a-f]{40}) 0\t(.+)$/.exec(linha);
    if (m && (m[1] === '100644' || m[1] === '100755')) commitados.set(m[3].slice('public/'.length), m[2]);
  }
  const publico = [];
  const fora = new Set();
  let bytesPublico = 0;
  for (const rel of cliente) {
    const blob = commitados.get(rel);
    if (!blob) continue;
    const p = path.join(CLIENTE, rel);
    const st = lstatSync(p);
    if (!st.isFile()) continue;
    const buf = readFileSync(p);
    if (blobGit(buf) !== blob) continue;
    publico.push({ caminho: rel, sha256: sha256(buf), bytes: buf.length, modo: st.mode & 0o777 });
    fora.add(`${CLIENTE}/${rel}`);
    bytesPublico += buf.length;
  }

  /* 3. tar do resto (fase 6: só `dist`; não existe `.vercel/output`) */
  mkdirSync(dir, { recursive: true });
  const lista = [];
  for (const rel of arvore('dist')) {
    const p = `dist/${rel}`;
    if (fora.has(p)) continue;
    lista.push(p);
  }
  const arquivoLista = path.join(dir, 'lista.bin');
  writeFileSync(arquivoLista, lista.join('\0') + '\0');
  roda('tar', ['--zstd', '-cf', TAR, '--null', '--no-recursion', '-T', arquivoLista]);
  rmSync(arquivoLista);
  writeFileSync(MANIFESTO, JSON.stringify({ versao: 1, publico }) + '\n');
  console.log(`dist-compartilhado: ${publico.length} arquivo(s) de public/ (${mb(bytesPublico)}) voltam do checkout; ` +
    `${ESTATICO} é refeito de ${CLIENTE}; tar ${mb(lstatSync(TAR).size)}`);
} else {
  if (!existsSync(TAR) || !existsSync(MANIFESTO)) falha(`artefato incompleto em ${dir}`);
  const { versao, publico } = JSON.parse(readFileSync(MANIFESTO, 'utf8'));
  if (versao !== 1 || !Array.isArray(publico)) falha('manifesto publico.json inválido');
  roda('tar', ['--zstd', '-xf', TAR]);
  for (const { caminho, sha256: esperado, bytes, modo: permissao } of publico) {
    if (typeof caminho !== 'string' || caminho.startsWith('/') || caminho.split('/').includes('..')) falha(`caminho inválido no manifesto: ${caminho}`);
    const origem = path.join('public', caminho);
    const destino = path.join(CLIENTE, caminho);
    const buf = existsSync(origem) ? readFileSync(origem) : null;
    if (!buf || buf.length !== bytes || sha256(buf) !== esperado) falha(`public/${caminho} do checkout não é o arquivo que o build publicou`);
    mkdirSync(path.dirname(destino), { recursive: true });
    copyFileSync(origem, destino);
    chmodSync(destino, permissao);
  }
  if (existsSync(ESTATICO)) falha(`${ESTATICO} já existe antes da restauração`);
  mkdirSync(ESTATICO, { recursive: true });
  roda('cp', ['-a', `${CLIENTE}/.`, `${ESTATICO}/`]);

  /* ESPELHO DE COMPAT (fase 6): as réguas SSR medem `.vercel/output/functions/_render.func`
     com `.vc-config.json` e chamam `handler.fetch(request)` estilo Worker. O adapter
     Cloudflare escreve `dist/server` (entry.mjs com default {fetch}); o wrapper abaixo
     injeta um `env.ASSETS` que serve `dist/client` do disco — em produção isso é o
     binding de assets do Workers, não existe no formato Vercel. */
  if (!existsSync(SERVIDOR)) falha(`${SERVIDOR} ausente no artefato (espelho de compat exige o handler)`);
  mkdirSync(FUNC, { recursive: true });
  roda('cp', ['-a', `${SERVIDOR}/.`, `${FUNC}/`]);
  /* O wrapper vira `entry.mjs` (as réguas importam esse nome direto ou via .vc-config);
     o entry bruto do Workers vai para `worker-entry.mjs` e o wrapper o importa. */
  for (const sufixo of ['', '.map']) {
    const bruto = path.join(FUNC, `entry.mjs${sufixo}`);
    if (existsSync(bruto)) renameSync(bruto, path.join(FUNC, `worker-entry.mjs${sufixo}`));
  }
  if (existsSync(path.join(FUNC, 'worker-entry.mjs.map'))) {
    const mapa = path.join(FUNC, 'worker-entry.mjs.map');
    writeFileSync(mapa, readFileSync(mapa, 'utf8').replace('"entry.mjs"', '"worker-entry.mjs"'));
  }
  /* O runtime real de `cloudflare:*` não existe no Node. O shim expõe `env` mutável;
     o wrapper o preenche com o mesmo objeto passado ao server.fetch. */
  mkdirSync(path.join(FUNC, '_shims'), { recursive: true });
  writeFileSync(path.join(FUNC, '_shims', 'cloudflare-workers.mjs'), SHIM_CF_WORKERS_MJS);
  for (const alvo of arvore(FUNC)) {
    if (!alvo.endsWith('.mjs') || alvo.startsWith('_shims/')) continue;
    const caminho = path.join(FUNC, alvo);
    const rel = alvo.startsWith('chunks/') ? '../_shims/cloudflare-workers.mjs' : './_shims/cloudflare-workers.mjs';
    const fonte = readFileSync(caminho, 'utf8');
    if (fonte.includes('"cloudflare:workers"') || fonte.includes("'cloudflare:workers'")) {
      let saida = fonte.replace(/import\s+(["'])cloudflare:workers\1\s*;/g, `import ${JSON.stringify(rel)}`);
      saida = saida.replace(/from (["'])cloudflare:workers\1/g, `from ${JSON.stringify(rel)}`);
      writeFileSync(caminho, saida);
    }
  }
  writeFileSync(path.join(FUNC, 'entry.mjs'), COMPAT_MJS.replace("'./entry.mjs'", "'./worker-entry.mjs'"));
  writeFileSync(path.join(FUNC, '.vc-config.json'), JSON.stringify({ runtime: 'nodejs22.x', handler: 'entry.mjs', launcherType: 'Nodejs', shouldAddHelpers: false }) + '\n');
  /* `game-pages-check` mede o handler em `.vercel/output/_functions/` (Build Output V0);
     symlink para o mesmo espelho de compat — um handler, dois caminhos de régua. */
  symlinkSync(path.join('functions', '_render.func'), '.vercel/output/_functions', 'dir');
  console.log(`dist-compartilhado: ${publico.length} arquivo(s) de public/ conferidos por sha256; ${ESTATICO} e ${FUNC} (espelho de compat) refeitos`);
}
