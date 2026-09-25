#!/usr/bin/env node
/* INVENTÁRIO DOS DOADORES DE ANIMAÇÃO — o que o dono baixou e nunca foi usado.
 *
 * O dono trouxe ~30 GLB de animação de arma em primeira pessoa e disse "tem
 * vários muito bons, também não estamos usando de nada de referência". Este
 * script lê cada um e reporta ossos, clipes e nomes de clipe, para que a escolha
 * de doador por arma seja feita com dado e não com o nome do arquivo.
 *
 * Retarget por NOME de osso está morto (0-2% de sobreposição com o rig da AK);
 * o que sobra é casamento ESTRUTURAL, e para isso a contagem de ossos e folhas
 * é o primeiro filtro: o rig da AK tem 77 ossos.
 *
 *   node tools/viewmodels/inventario-doadores.mjs
 *   node tools/viewmodels/inventario-doadores.mjs --dir=~/Downloads --md=<arquivo>
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `=${d}`)
  .split('=').slice(1).join('=');
const DIR = arg('dir', path.join(os.homedir(), 'Downloads'));
const MD = arg('md', '');
const ARMA = /gun|pistol|rifle|smg|sniper|shotgun|knife|uzi|scar|ak|m4|m16|hk|lmg|50cal|carbine|makarov|saiga|g17|beretta|deagle|desert|l96|remington|fps_arms/i;

function lerGlb(f) {
  const b = fs.readFileSync(f);
  if (b.length < 20 || b.readUInt32LE(0) !== 0x46546c67) return null;
  const l = b.readUInt32LE(12);
  try { return JSON.parse(b.slice(20, 20 + l).toString('utf8')); } catch { return null; }
}

const linhas = [];
for (const f of fs.readdirSync(DIR).filter((n) => n.endsWith('.glb')).sort()) {
  if (!ARMA.test(f)) continue;
  const json = lerGlb(path.join(DIR, f));
  if (!json) continue;
  const ossos = new Set();
  for (const pele of json.skins || []) for (const j of pele.joints || []) ossos.add(j);
  const clipes = (json.animations || []).map((a) => a.name).filter(Boolean);
  const malhas = (json.meshes || []).length;
  const mb = fs.statSync(path.join(DIR, f)).size / 1048576;
  linhas.push({ arquivo: f, ossos: ossos.size, clipes: clipes.length, nomes: clipes, malhas, mb });
}
linhas.sort((a, b) => b.clipes - a.clipes || b.ossos - a.ossos);

console.log(`\n  ${linhas.length} doadores de arma em ${DIR}`);
console.log('  (o rig da AK aprovada tem 77 ossos — casamento estrutural começa aqui)\n');
console.log('  ossos  clipes  MB    arquivo');
console.log('  ' + '-'.repeat(78));
for (const l of linhas) {
  console.log(`  ${String(l.ossos).padStart(5)}  ${String(l.clipes).padStart(6)}  ${l.mb.toFixed(1).padStart(4)}  ${l.arquivo}`);
}

if (MD) {
  const texto = `# Doadores de animação de arma — inventário gerado

Gerado por \`node tools/viewmodels/inventario-doadores.mjs\`. ${linhas.length} arquivos
em \`${DIR}\`. **O rig da AK aprovada tem 77 ossos**; retarget por NOME de osso
está morto (0–2% de sobreposição), então o primeiro filtro é estrutural.

| ossos | clipes | MB | arquivo | nomes dos clipes |
|---:|---:|---:|---|---|
${linhas.map((l) => `| ${l.ossos} | ${l.clipes} | ${l.mb.toFixed(1)} | \`${l.arquivo}\` | ${l.nomes.slice(0, 8).join(', ') || '—'}${l.nomes.length > 8 ? ` (+${l.nomes.length - 8})` : ''} |`).join('\n')}
`;
  fs.writeFileSync(MD, texto);
  console.log(`\n  markdown em ${MD}`);
}
console.log();
