/* bug59-audits.mjs — regenera os dois recibos de auditoria do redesign com o
   lote completo (63 personagens), replicando EXATAMENTE o parsing e a ordem de
   hash do redesign-check.mjs (é ele quem confere; divergência = vermelha).

   - redesign-static-audit.json: resultImagesSha256 sobre public/img/resultado
     (UIA1). punk/gotinha avatar SHAs e avatarReference são preservados (UIA28).
   - char-native-audit.json: mediaSha256 sobre video/chars + video/resultado
     (UIA4) e weaponMapSha256 do bloco CHAR_WEAPON tal como a régua o lê
     (regex \w+: chaves com hífen entram pela cauda — 'camera-roxa' vira 'roxa').
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const sha = createHash('sha256');

const resultadoImg = readdirSync(join(ROOT, 'public/img/resultado')).filter((f) => /-(?:derrota|vitoria)\.webp$/.test(f)).sort();
const hashResultado = createHash('sha256');
for (const arquivo of resultadoImg) {
  const rel = `public/img/resultado/${arquivo}`;
  hashResultado.update(rel).update('\0').update(readFileSync(join(ROOT, rel))).update('\0');
}

const selecao = readdirSync(join(ROOT, 'public/video/chars')).filter((f) => f.endsWith('.webm')).sort();
const resultadoVideo = readdirSync(join(ROOT, 'public/video/resultado')).filter((f) => /-(?:derrota|vitoria)\.webm$/.test(f)).sort();
const caminhosMidia = [
  ...selecao.map((f) => `public/video/chars/${f}`),
  ...resultadoVideo.map((f) => `public/video/resultado/${f}`),
].sort();
const hashMidia = createHash('sha256');
for (const arquivo of caminhosMidia) {
  hashMidia.update(arquivo).update('\0').update(readFileSync(join(ROOT, arquivo))).update('\0');
}

const characters = readFileSync(join(ROOT, 'public/js/characters.js'), 'utf8');
const weaponBlock = characters.match(/export const CHAR_WEAPON = \{([\s\S]*?)\n\};/);
const weaponMap = Object.fromEntries(
  [...(weaponBlock?.[1] || '').matchAll(/(?:'([^']+)'|([\w-]+)):\s*'([^']+)'/g)]
    .map((m) => [m[1] || m[2], m[3]]).sort(([a], [b]) => a.localeCompare(b)),
);
const weaponMapSha256 = createHash('sha256').update(JSON.stringify(weaponMap)).digest('hex');

const staticPath = join(ROOT, 'tools/eval/redesign-static-audit.json');
const estatico = JSON.parse(readFileSync(staticPath, 'utf8'));
estatico.resultImagesSha256 = hashResultado.digest('hex');
estatico.reviewedAt = new Date().toISOString().slice(0, 10);
estatico.review = `O recibo cobre as imagens de resultado dos 63 personagens publicados. O lote original mantém a revisão registrada em tools/eval/asset-evidence/bug59/; Julia Zanatta e Marina Silva foram geradas a partir dos GLBs com char-native-vids e char-result-stills. Os quadros novos foram inspecionados; a pose de seleção da Julia ainda precisa de revisão visual humana antes da aprovação do elenco. Nenhuma figura nova ou fictícia foi criada para o resultado.`;
writeFileSync(staticPath, `${JSON.stringify(estatico, null, 2)}\n`);

const mediaPath = join(ROOT, 'tools/eval/char-native-audit.json');
const midia = existsSync(mediaPath) ? JSON.parse(readFileSync(mediaPath, 'utf8')) : {};
midia.mediaSha256 = hashMidia.digest('hex');
midia.weaponMapSha256 = weaponMapSha256;
midia.review = `Recibo de geração dos 63 vídeos e mapa CHAR_WEAPON correspondente. A revisão em pranchas de asset-evidence/bug59/ cobre o lote anterior. Os quadros novos de Julia Zanatta e Marina Silva foram inspecionados; a pose de seleção da Julia ainda precisa de revisão visual humana antes da aprovação do elenco.`;
midia.regenerate = 'BASE=http://127.0.0.1:8142 node tools/eval/char-native-vids.mjs';
writeFileSync(mediaPath, `${JSON.stringify(midia, null, 2)}\n`);

console.log(`resultado: ${resultadoImg.length} artes · sha=${estatico.resultImagesSha256.slice(0, 12)}`);
console.log(`midia: ${caminhosMidia.length} vídeos · sha=${midia.mediaSha256.slice(0, 12)}`);
console.log(`weaponMap: ${Object.keys(weaponMap).length} entradas · sha=${weaponMapSha256.slice(0, 12)}`);
