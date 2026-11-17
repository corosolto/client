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
  chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync,
  readlinkSync, rmSync, writeFileSync,
} from 'node:fs';
import path from 'node:path';

const [modo, dir] = process.argv.slice(2);
if (!['empacota', 'restaura'].includes(modo) || !dir) {
  console.error('uso: node scripts/ci/dist-compartilhado.mjs empacota|restaura <dir>');
  process.exit(2);
}
const CLIENTE = 'dist/client';
const ESTATICO = '.vercel/output/static';
const TAR = path.join(dir, 'dist.tar.zst');
const MANIFESTO = path.join(dir, 'publico.json');

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
  for (const d of [CLIENTE, ESTATICO, '.vercel/output/functions']) if (!existsSync(d)) falha(`${d} ausente depois do build`);

  /* 1. espelho exato */
  const cliente = arvore(CLIENTE);
  const estatico = arvore(ESTATICO);
  if (cliente.join('\n') !== estatico.join('\n')) {
    const so = (a, b) => a.filter((x) => !b.includes(x)).slice(0, 5).join(', ');
    falha(`${ESTATICO} não espelha ${CLIENTE} (só no client: ${so(cliente, estatico) || '-'}; só no static: ${so(estatico, cliente) || '-'})`);
  }
  for (const rel of cliente) {
    const a = path.join(CLIENTE, rel), b = path.join(ESTATICO, rel);
    const sa = lstatSync(a), sb = lstatSync(b);
    if (sa.isDirectory() !== sb.isDirectory() || sa.isSymbolicLink() !== sb.isSymbolicLink()) falha(`${rel}: tipo diverge entre ${CLIENTE} e ${ESTATICO}`);
    if (sa.isSymbolicLink()) { if (readlinkSync(a) !== readlinkSync(b)) falha(`${rel}: alvo de link diverge`); continue; }
    if (sa.isFile() && (sa.size !== sb.size || !readFileSync(a).equals(readFileSync(b)))) falha(`${rel}: bytes divergem entre ${CLIENTE} e ${ESTATICO}`);
  }

  /* 2. arquivos que são o blob commitado de public/ */
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

  /* 3. tar do resto */
  mkdirSync(dir, { recursive: true });
  const lista = [];
  for (const raiz of ['dist', '.vercel/output']) {
    lista.push(raiz);
    for (const rel of arvore(raiz)) {
      const p = `${raiz}/${rel}`;
      if (p === ESTATICO || p.startsWith(`${ESTATICO}/`) || fora.has(p)) continue;
      lista.push(p);
    }
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
  console.log(`dist-compartilhado: ${publico.length} arquivo(s) de public/ conferidos por sha256; ${ESTATICO} refeito de ${CLIENTE}`);
}
