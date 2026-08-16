#!/usr/bin/env node
/* strip-decal-bg.mjs — TIRA O FUNDO BRANCO DOS DECALS DE GRAFITE.
 *
 * Sintoma (13/08, em produção): os decals `alfabeto-*.png` (letras recortadas de
 * folhas) aparecem com um RETÂNGULO BRANCO atrás da letra — o fundo da folha de onde
 * foram recortados veio junto no PNG. O dono já tinha reclamado disso ("o do chorão
 * está com fundo branco"). A textura carrega (200), então não é 404: é o PNG.
 *
 * O que faz: alpha-key do branco. Pixels QUASE puro-branco (R,G,B ≥ LIMIAR) viram
 * transparentes; o traço escuro/colorido da letra fica. Roda depois do fetch-decals.sh
 * no build da Vercel — só os decals do acervo (exclui `or-*`, que são obra própria já
 * correta). Idempotente: um PNG já transparente não tem branco puro e sai igual.
 *
 * Conservador de propósito: o limiar é alto (≥248) pra não comer conteúdo claro que
 * não seja o fundo da folha. Se um decal tiver branco INTERNO legítimo, ele some junto
 * — é o trade-off de cortar fundo por limiar em vez de máscara manual.
 *
 * Uso: node tools/strip-decal-bg.mjs   (depois de bash scripts/fetch-decals.sh)
 * Var: DECAL_BG_LIMIAR (default 248), STRIP_DECAL_BG=0 pula. */
import { readdirSync, existsSync } from 'node:fs';
import sharp from 'sharp';

const DIR = 'public/img/decals';
const LIMIAR = parseInt(process.env.DECAL_BG_LIMIAR || '248', 10);
if (process.env.STRIP_DECAL_BG === '0') { console.log('strip-decal-bg: pulando (STRIP_DECAL_BG=0)'); process.exit(0); }
if (!existsSync(DIR)) { console.log(`strip-decal-bg: ${DIR} não existe — nada a fazer`); process.exit(0); }

const pngs = readdirSync(DIR).filter((f) => f.toLowerCase().endsWith('.png') && !f.startsWith('or-'));
if (!pngs.length) { console.log('strip-decal-bg: sem decals do acervo (só or-*?) — nada a fazer'); process.exit(0); }

let tocados = 0, totalPixels = 0;
for (const f of pngs) {
  const path = `${DIR}/${f}`;
  const img = sharp(path);
  const meta = await img.metadata();
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const n = info.width * info.height;
  let mudou = 0;
  for (let i = 0; i < n; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    // branco QUASE puro e baixa saturação = fundo da folha (não traço colorido claro)
    if (r >= LIMIAR && g >= LIMIAR && b >= LIMIAR && Math.max(r, g, b) - Math.min(r, g, b) <= 8) {
      if (data[i * 4 + 3] !== 0) { data[i * 4 + 3] = 0; mudou++; }
    }
  }
  if (mudou > 0) {
    await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png({ quality: 90, compressionLevel: 9 }).toFile(path);
    tocados++;
    totalPixels += mudou;
  }
}
console.log(`strip-decal-bg: ${tocados}/${pngs.length} decals tiveram fundo branco removido (${totalPixels.toLocaleString('pt-BR')} pixels)`);
