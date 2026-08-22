/* ============================================================================
   props-uv1-check.mjs — GEOMETRIA NORMALIZADA NÃO PODE PERDER O uv1 DO GLB
   ----------------------------------------------------------------------------
   O DEFEITO QUE ELA FECHA (captura de 20/08/2026, bug64-mansao-v21/depois)

   O Mini Cooper da mansão (`2014_mini_cooper_s_f56.glb`) tem `normalTexture` com
   `texCoord: 1` — legal no glTF, a primitiva tem TEXCOORD_1. Mas o PropBatch
   instancia via `normalizeGeo` (mapprops.js), que reescreve a geometria só com
   {position, normal, uv}: o uv1 some e o material (com a textura no canal 1)
   fica. O three r160 só declara `attribute vec2 uv1` quando a GEOMETRIA tem uv1
   (three.module.js:20851 `vertexUv1s: HAS_ATTRIBUTE_UV1`), então o shader compilado
   usa `uv1` sem declaração → "Shader Error: 'uv1' undeclared identifier", material
   quebrado e o console de debug cobrindo a captura inteira. Medido: os 3 programas
   com `diagnostics` no renderer da mansão bootada eram exatamente os materiais do
   Mini com uv1 no cacheKey.

   ── COMO ELA MEDE ──────────────────────────────────────────────────────────
   UV1-1 (uso, não declaração): chama o `normalizeGeo` REAL de produção numa
   geometria com uv1 e exige uv1 na saída. UV1-2 (raio do estrago): varre o JSON
   dos GLBs de public/models/props e conta materiais com textura em canal ≥1 —
   o número vai na evidência; se UV1-1 está verde, eles compilam.

   ── A MUTAÇÃO QUE PROVA ────────────────────────────────────────────────────
   --mutante=dropa-uv1: embrulha o normalizeGeo apagando o uv1 da saída (o código
   de ontem) → UV1-1 tem que ficar vermelha.
   ============================================================================ */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { normalizeGeo } from '../../public/js/mapprops.js';

const MUTANTE = process.argv.find((a) => a.startsWith('--mutante='))?.split('=')[1] || '';
if (MUTANTE && MUTANTE !== 'dropa-uv1') { console.error(`mutante desconhecido: ${MUTANTE}`); process.exit(2); }
const normaliza = MUTANTE === 'dropa-uv1'
  ? (g, m, o) => { const r = normalizeGeo(g, m, o); if (r) r.deleteAttribute('uv1'); return r; }
  : normalizeGeo;

let falha = 0;
const put = (id, ok, evid) => { console.log(`${ok ? '✓' : '✗'} ${id}  ${evid}`); if (!ok) falha = 1; };

// UV1-1 — o normalizeGeo de produção preserva uv1 (fonte do material de canal 1)
const geo = new THREE.BoxGeometry(1, 1, 1);
geo.setAttribute('uv1', geo.attributes.uv.clone());
const norm = normaliza(geo, null);
put('UV1-1 normalizeGeo preserva uv1 na saída', !!norm && !!norm.attributes.uv1,
  norm ? `atributos: ${Object.keys(norm.attributes).join(',')}` : 'normalizeGeo devolveu null');

// UV1-2 — quantos props do acervo têm textura em canal ≥1 (só eles precisam do uv1)
function* glbs(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* glbs(p); else if (e.name.endsWith('.glb')) yield p;
  }
}
const SLOTS = ['baseColorTexture', 'metallicRoughnessTexture', 'normalTexture', 'occlusionTexture', 'emissiveTexture'];
let canal1 = 0;
const nomes = [];
for (const f of glbs('public/models/props')) {
  const b = readFileSync(f);
  if (b.readUInt32LE(0) !== 0x46546C67) continue;
  const j = JSON.parse(b.slice(20, 20 + b.readUInt32LE(12)).toString());
  const hit = (j.materials || []).some((m) => {
    const pbr = m.pbrMetallicRoughness || {};
    return SLOTS.some((s) => { const t = (s in pbr) ? pbr[s] : m[s]; return t && (t.texCoord || 0) >= 1; })
      || (m.extensions && /"texCoord"\s*:\s*[1-9]/.test(JSON.stringify(m.extensions)));
  });
  if (hit) { canal1++; nomes.push(f.split('/').pop()); }
}
put('UV1-2 varredura do acervo (evidência do raio)', true,
  `${canal1} GLBs com textura em canal ≥1: ${nomes.join(', ') || 'nenhum'}`);

if (falha) console.log('\nCorreção: normalizeGeo precisa carregar uv1 (fonte tem) ou copiar uv → uv1 (merge exige conjunto idêntico).');
process.exit(falha);
