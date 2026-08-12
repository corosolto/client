/* ============================================================================
   mythic-character-check.mjs — Time Mítico nunca pode ser caixa/T-pose/raw sem PBR.

   Caso real (screenshot do dono, 09/08/2026): Lampião selecionado aparecia como
   boneco procedural de caixas. Censo do arquivo mostrou 6/9 IDs em GLB_CHARS;
   os seis cadastrados tinham 0 skins, e os três excluídos tinham 0 materiais,
   0 texturas e 433k–728k triângulos.

   Orçamento geométrico: 2.500–40.000 triângulos. O piso fica abaixo do menor
   Mítico Mint medido (Cuca, 4.475); o teto é ~8× o maior Mint (Saci, 4.975) e
   reprova os raws de centenas de milhares que travariam notebook. Não mede beleza:
   cobra só que o asset jogável exista, anime, tenha superfície e caiba no browser.

   Mutações: --mutante=fallback|semrig|sempbr.
   ============================================================================ */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mutante = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (!['', 'fallback', 'semrig', 'sempbr'].includes(mutante)) throw new Error(`mutante desconhecido: ${mutante}`);

const charsSrc = readFileSync(path.join(ROOT, 'public/js/characters.js'), 'utf8');
const glbSrc = readFileSync(path.join(ROOT, 'public/js/glbchars.js'), 'utf8');
const miticos = [...charsSrc.matchAll(/\{\s*id:\s*'([^']+)',\s*team:\s*'M'/g)].map((m) => m[1]);
const setBody = glbSrc.match(/export const GLB_CHARS = new Set\(\[([\s\S]*?)\]\);/)?.[1] || '';
const registrados = new Set([...setBody.matchAll(/'([^']+)'/g)].map((m) => m[1]));
if (mutante === 'fallback' && miticos.length) registrados.delete(miticos[0]);

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const MIN_TRI = 2500, MAX_TRI = 40000;
const linhas = [], falhas = [];

for (const id of miticos) {
  const file = path.join(ROOT, `public/models/characters/${id}.glb`);
  if (!existsSync(file)) {
    linhas.push({ id, registrado: registrados.has(id), existe: false });
    falhas.push(`${id}: arquivo GLB ausente`);
    continue;
  }
  const doc = await io.read(file), root = doc.getRoot();
  let tris = 0, primitivas = 0, primitivasPbr = 0;
  for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives()) {
    primitivas++;
    const pos = prim.getAttribute('POSITION'), idx = prim.getIndices();
    tris += (idx ? idx.getCount() : pos?.getCount() || 0) / 3;
    const mat = prim.getMaterial();
    if (mat?.getBaseColorTexture() && mat.getNormalTexture() && mat.getMetallicRoughnessTexture()) primitivasPbr++;
  }
  tris = Math.round(tris);
  const skins = mutante === 'semrig' && id === miticos[0] ? 0 : root.listSkins().length;
  const pbr = mutante === 'sempbr' && id === miticos[0] ? false : primitivas > 0 && primitivasPbr === primitivas;
  const row = { id, registrado: registrados.has(id), existe: true, skins, pbr, tris };
  linhas.push(row);
  if (!row.registrado) falhas.push(`${id}: fora de GLB_CHARS, cai no procedural`);
  if (!skins) falhas.push(`${id}: 0 skins, não aceita animação/arma`);
  if (!pbr) falhas.push(`${id}: ${primitivasPbr}/${primitivas} primitivas com albedo+normal+metalRough`);
  if (tris < MIN_TRI || tris > MAX_TRI) falhas.push(`${id}: ${tris} triângulos fora de ${MIN_TRI}–${MAX_TRI}`);
}

for (const r of linhas)
  console.log(`${r.id.padEnd(14)} GLB ${r.registrado ? 'sim' : 'NÃO'} | skin ${r.skins ?? '-'} | PBR ${r.pbr ? 'sim' : 'NÃO'} | tris ${r.tris ?? '-'}`);
console.log(`MITICO ${linhas.filter((r) => r.registrado).length}/${miticos.length} GLB · ${linhas.filter((r) => r.skins > 0).length}/${miticos.length} rig · ${linhas.filter((r) => r.pbr).length}/${miticos.length} PBR`);

if (falhas.length) {
  falhas.forEach((f) => console.error(`✗ ${f}`));
  process.exitCode = 1;
} else console.log('✓ MITICO 4/4 contratos verdes');
