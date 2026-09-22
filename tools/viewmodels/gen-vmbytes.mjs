#!/usr/bin/env node
/**
 * Gera `public/js/data/vmbytes.js`: versão de URL derivada dos BYTES de cada
 * produto assado.
 *
 * Antes disso o `?v=` usava `CATALOG_VERSION`, uma string global congelada. O
 * efeito é traiçoeiro: re-assar uma arma NÃO invalida o cache do navegador, o
 * jogo serve o GLB de ontem e o conserto simplesmente não chega à tela. Na lane
 * `claude/vm-unificado` esse defeito custou um dia inteiro (BUG-157) antes de
 * alguém desconfiar da URL em vez do asset.
 *
 * O hash sai dos manifestos `*-candidates.json`, que já versionam `sha256` do
 * produto no Git. Nenhum byte privado entra no repositório — só o resumo que já
 * estava lá.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MANIFESTS = ['rifle', 'smg', 'sidearm', 'dmr', 'precision', 'heavy'];
const entries = [];
for (const name of MANIFESTS) {
  const file = path.join(ROOT, 'tools/viewmodels', `${name}-candidates.json`);
  if (!fs.existsSync(file)) continue;
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [weapon, cfg] of Object.entries(manifest.candidates || {})) {
    const sha = cfg.sha256 || cfg.productSha256 || cfg.optimizedSha256;
    if (!sha) { console.warn(`sem sha256 no manifesto: ${weapon} (${name})`); continue; }
    entries.push([weapon, sha.slice(0, 10), name]);
  }
}
entries.sort((a, b) => a[0].localeCompare(b[0]));
const corpo = `// GERADO por tools/viewmodels/gen-vmbytes.mjs — não editar à mão.
// Versão de URL por BYTES do produto assado, lida dos manifestos \`*-candidates.json\`.
export const VM_BYTES = Object.freeze({
${entries.map(([weapon, sha]) => `  ${weapon}: '${sha}',`).join('\n')}
});
`;
const out = path.join(ROOT, 'public/js/data/vmbytes.js');
fs.writeFileSync(out, corpo);
console.log(`escrito public/js/data/vmbytes.js com ${entries.length} armas`);
