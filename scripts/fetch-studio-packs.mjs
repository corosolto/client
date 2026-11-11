#!/usr/bin/env node
/* Baixa da origem pública (R2) os packs do Studio FIXADOS em public/js/data/content-releases.js
   para uma raiz local no layout de STUDIO_PACK_ROOT (<raiz>/<kind>/<id>/<versão>/…), para as
   réguas do CI medirem o corpo que o jogo desenha em vez de "NÃO MEDIDO".

   Confere tudo antes de gravar: SHA-256 do manifest.json contra o pin, e bytes + SHA-256 de cada
   arquivo do inventário (`files[]`) contra o manifest. Caminho fora de isSafePackPath, bytes
   divergentes ou HTTP != 200 reprovam (exit 1); nada parcial fica na raiz. Arquivo já presente
   com o SHA certo não é baixado de novo (actions/cache).

   uso: node scripts/fetch-studio-packs.mjs <raiz>
   ambiente: STUDIO_PACK_ORIGIN (padrão https://assets.corosolto.com.br) */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { CHARACTER_RELEASES } from '../public/js/data/content-releases.js';
import { isSafePackPath } from '../public/js/studio-character.js';

const ORIGIN = (process.env.STUDIO_PACK_ORIGIN || 'https://assets.corosolto.com.br').replace(/\/+$/, '');
const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : '';
if (!ROOT) { console.error('uso: node scripts/fetch-studio-packs.mjs <raiz>'); process.exit(2); }
const CONCURRENCY = 8;
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function baixar(url) {
  for (let tentativa = 1; ; tentativa++) {
    try {
      const res = await fetch(url);
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (error) {
      if (tentativa >= 3) throw new Error(`${url}: ${error.message}`);
      await new Promise((r) => setTimeout(r, 1000 * tentativa));
    }
  }
}
function gravar(arquivo, bytes) {
  mkdirSync(path.dirname(arquivo), { recursive: true });
  const tmp = `${arquivo}.tmp-${process.pid}`;
  writeFileSync(tmp, bytes);
  renameSync(tmp, arquivo);
}

const tarefas = [];
let baixados = 0, reaproveitados = 0, bytesTotal = 0;
for (const pin of Object.values(CHARACTER_RELEASES)) {
  const rel = pin.manifestUrl.replace(/^\/packs\//, '');
  if (!pin.manifestUrl.startsWith('/packs/') || !isSafePackPath(rel)) throw new Error(`${pin.id}: manifestUrl fora de /packs/`);
  const dir = path.join(ROOT, path.dirname(rel));
  const manifestPath = path.join(ROOT, rel);
  const bytes = existsSync(manifestPath) && sha256(readFileSync(manifestPath)) === pin.manifestSha256
    ? readFileSync(manifestPath) : await baixar(`${ORIGIN}${pin.manifestUrl}`);
  if (sha256(bytes) !== pin.manifestSha256) throw new Error(`${pin.id}@${pin.version}: manifest não bate com o SHA do pin`);
  const manifest = JSON.parse(bytes.toString('utf8'));
  for (const entrada of manifest.files || []) {
    if (!isSafePackPath(entrada.path)) throw new Error(`${pin.id}@${pin.version}: caminho inválido ${entrada.path}`);
    tarefas.push({ pin, entrada, arquivo: path.join(dir, entrada.path), url: `${ORIGIN}/packs/${path.posix.dirname(rel)}/${entrada.path}` });
  }
  // o manifest entra por último, depois do inventário inteiro conferido
  tarefas.push({ pin, manifestPath, manifestBytes: bytes });
}

const arquivos = tarefas.filter((t) => t.entrada);
let proximo = 0;
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (proximo < arquivos.length) {
    const { pin, entrada, arquivo, url } = arquivos[proximo++];
    if (existsSync(arquivo) && sha256(readFileSync(arquivo)) === entrada.sha256) { reaproveitados++; continue; }
    const bytes = await baixar(url);
    if (bytes.length !== entrada.bytes || sha256(bytes) !== entrada.sha256) throw new Error(`${pin.id}@${pin.version}: ${entrada.path} diverge do manifest`);
    gravar(arquivo, bytes);
    baixados++; bytesTotal += bytes.length;
  }
}));
for (const t of tarefas) if (t.manifestPath) gravar(t.manifestPath, t.manifestBytes);
console.log(`packs Studio: ${Object.keys(CHARACTER_RELEASES).length} releases, ${arquivos.length} arquivos `
  + `(${baixados} baixados, ${(bytesTotal / 1048576).toFixed(1)} MB; ${reaproveitados} do cache) de ${ORIGIN} -> ${ROOT}`);
