#!/usr/bin/env node
/* ============================================================================
   char-color.mjs — C9: A COR QUE VEM DO GLB (antes de qualquer luz)
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   O dono, 04/08: "todos personagens depois desses também tão ruim na cor e
   iluminação". Existem TRÊS suspeitos possíveis e ninguém os tinha separado:
     (1) a textura/material do próprio GLB
     (2) o piso de irradiância injetado em characters.js (CHAR_FX.floorIrr/sat)
     (3) o tonemap do renderer
   (2) e (3) são IGUAIS para os 45 personagens — o mesmo shader, o mesmo renderer.
   Logo, qualquer diferença ENTRE personagens só pode nascer em (1). Este script
   mede (1) e mais nada, sem browser e sem luz: lê a textura de cor base embutida
   no GLB e calcula, sobre os pixels opacos:

     • satMedia   — saturação HSV média (0..1). Baixo = "cor chapada", "manequim".
     • lumMedia   — luminância média (0..1). Alto = "esbranquiçado".
     • lumP95     — luminância no percentil 95. Alto = estourado/lavado.
     • contraste  — desvio-padrão da luminância. Baixo = liso, sem acabamento.
     • lado       — resolução da textura (o "nível de acabamento" que o dono vê).

   O teto é o PRÓPRIO ELENCO (mediana + MAD), pela mesma razão do C1: a reclamação
   é comparativa ("três níveis de acabamento na mesma tela").

   uso: node tools/eval/char-color.mjs [--json]
   ============================================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { readGLB } from './tp-mount-probe.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const CHARDIR = path.join(ROOT, 'public/models/characters');
const TMP = fs.mkdtempSync('/tmp/charcolor-');

const ids = fs.readdirSync(CHARDIR).filter((f) => f.endsWith('.glb')).map((f) => f.replace(/\.glb$/, '')).sort();

// extrai a textura de COR BASE (baseColorTexture) do GLB e devolve o arquivo em disco
function baseColorFile(id) {
  const g = readGLB(path.join(CHARDIR, `${id}.glb`));
  const mat = (g.json.materials || [])[0];
  const ti = mat && mat.pbrMetallicRoughness && mat.pbrMetallicRoughness.baseColorTexture
    ? mat.pbrMetallicRoughness.baseColorTexture.index : undefined;
  if (ti === undefined) return null;
  const tex = g.json.textures[ti];
  const si = tex.source !== undefined ? tex.source
    : (tex.extensions && tex.extensions.EXT_texture_webp ? tex.extensions.EXT_texture_webp.source : undefined);
  if (si === undefined) return null;
  const img = g.json.images[si];
  if (img.bufferView === undefined) return null;
  const bv = g.json.bufferViews[img.bufferView];
  const data = g.bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
  const ext = (img.mimeType || '').includes('webp') ? 'webp' : (img.mimeType || '').includes('jpeg') ? 'jpg' : 'png';
  const out = path.join(TMP, `${id}.${ext}`);
  fs.writeFileSync(out, data);
  return out;
}

// estatística de cor via ImageMagick (converte pra RGB cru e lê no node)
function stats(file) {
  const raw = path.join(TMP, 'x.rgba');
  const info = execFileSync('magick', ['identify', '-format', '%w %h', file]).toString().trim().split(' ');
  const w = +info[0], h = +info[1];
  // reamostra para no máximo 256² — a estatística não precisa do mapa inteiro
  execFileSync('magick', [file, '-resize', '256x256!', '-depth', '8', `rgba:${raw}`]);
  const buf = fs.readFileSync(raw);
  let n = 0, sSat = 0, sLum = 0, sLum2 = 0;
  const lums = [];
  for (let i = 0; i < buf.length; i += 4) {
    const a = buf[i + 3]; if (a < 128) continue;
    const r = buf[i] / 255, g = buf[i + 1] / 255, b = buf[i + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const sat = mx > 0 ? (mx - mn) / mx : 0;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sSat += sat; sLum += lum; sLum2 += lum * lum; lums.push(lum); n++;
  }
  if (!n) return null;
  lums.sort((x, y) => x - y);
  const mean = sLum / n;
  return {
    lado: Math.max(w, h),
    satMedia: sSat / n,
    lumMedia: mean,
    lumP95: lums[Math.floor(lums.length * 0.95)],
    contraste: Math.sqrt(Math.max(0, sLum2 / n - mean * mean)),
  };
}

const rows = [];
for (const id of ids) {
  const f = baseColorFile(id);
  if (!f) { rows.push({ id, erro: 'sem baseColorTexture' }); continue; }
  const s = stats(f);
  if (!s) { rows.push({ id, erro: 'textura vazia' }); continue; }
  rows.push({ id, ...s });
}

const ok = rows.filter((r) => !r.erro);
const med = (k) => { const a = ok.map((r) => r[k]).sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
const mad = (k) => { const m = med(k); const a = ok.map((r) => Math.abs(r[k] - m)).sort((x, y) => x - y); return 1.4826 * a[Math.floor(a.length / 2)] || 1e-9; };

if (process.argv.includes('--json')) {
  fs.writeFileSync(path.join(ROOT, 'tools/eval/char_color.json'), JSON.stringify(rows, null, 2));
}
console.log('C9 — COR NA FONTE (textura de cor base do GLB; sem luz, sem tonemap)\n');
console.log('id              lado  satMedia  lumMedia  lumP95  contraste   z(sat)');
console.log('-'.repeat(70));
const mSat = med('satMedia'), sSat = mad('satMedia');
for (const r of rows) {
  if (r.erro) { console.log(r.id.padEnd(15) + '  ' + r.erro); continue; }
  const z = (r.satMedia - mSat) / sSat;
  console.log(r.id.padEnd(15) + String(r.lado).padStart(5)
    + r.satMedia.toFixed(3).padStart(10) + r.lumMedia.toFixed(3).padStart(10)
    + r.lumP95.toFixed(3).padStart(8) + r.contraste.toFixed(3).padStart(11)
    + (z < -1.5 ? `   ${z.toFixed(1)} LAVADO` : `   ${z.toFixed(1)}`));
}
console.log('-'.repeat(70));
console.log(`mediana do elenco: sat ${mSat.toFixed(3)}  lum ${med('lumMedia').toFixed(3)}  contraste ${med('contraste').toFixed(3)}`);
const por = {};
for (const r of ok) (por[r.lado] ||= []).push(r);
console.log('\nPOR RESOLUÇÃO DE TEXTURA (o "nível de acabamento"):');
for (const [lado, arr] of Object.entries(por)) {
  const m = (k) => { const a = arr.map((r) => r[k]).sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
  console.log(`  ${String(lado).padStart(5)}px  n=${String(arr.length).padStart(2)}  sat=${m('satMedia').toFixed(3)}  lum=${m('lumMedia').toFixed(3)}  contraste=${m('contraste').toFixed(3)}`);
}
fs.rmSync(TMP, { recursive: true, force: true });
