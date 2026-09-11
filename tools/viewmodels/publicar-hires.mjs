#!/usr/bin/env node
/* ============================================================================
   publicar-hires.mjs — LEVA O PILOTO CONSTRUÍDO PARA O CAMINHO QUE O JOGO SERVE.
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   O builder sai com `published: false` de propósito: construir não é aprovar. Mas
   entre "o GLB existe em artifacts/" e "o jogador vê" há dois passos que, quando
   feitos à mão, é onde esta frente se perdeu antes — a AK golden ficou meses
   pronta e fora do trunk porque ninguém executou exatamente estes dois passos.

     1. copiar para `public/models/viewmodels/coro/<arma>-hires.glb`
     2. marcar `golden: true` na arma em `public/js/data/vmconfig.js`

   Sem o (2) o arquivo é servido e ignorado: `entryKeyFor` (authoredvm.js) só
   manda para o caminho do repo quando `golden === true`. Foi assim que a AKM e a
   pistola ficaram completas e invisíveis.

   O QUE ELE RECUSA
   Publicar GLB sem os quatro clipes (Equip/Idle/Reload/Shoot) ou sem as duas
   malhas de mão do doador. Piloto que perdeu clipe no caminho entra no jogo como
   arma que não recarrega, e isso o dono vê antes de qualquer régua.

   USO
     node tools/viewmodels/publicar-hires.mjs --de=artifacts/viewmodels/hires-v2
     node tools/viewmodels/publicar-hires.mjs --de=... --armas=uzi,m92
     node tools/viewmodels/publicar-hires.mjs --de=... --ensaio
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';

const RAIZ = process.cwd();
const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] ?? d;
const DE = path.join(RAIZ, arg('de', 'artifacts/viewmodels/hires-v2'));
const SO = (arg('armas', '') || '').split(',').filter(Boolean);
const ENSAIO = process.argv.includes('--ensaio');

const DESTINO = path.join(RAIZ, 'public/models/viewmodels/coro');
const VMCONFIG = path.join(RAIZ, 'public/js/data/vmconfig.js');

const EXIGIDOS = ['Equip', 'Idle', 'Reload', 'Shoot'];

function inspecionar(glb) {
  const b = fs.readFileSync(glb);
  const len = b.readUInt32LE(12);
  const j = JSON.parse(b.slice(20, 20 + len).toString('utf8'));
  return {
    clipes: (j.animations || []).map((a) => a.name),
    maos: (j.meshes || []).filter((m) => /Requests_Studio_Hands/i.test(m.name || '')).length,
    bytes: b.length,
  };
}

const armas = fs.existsSync(DE)
  ? fs.readdirSync(DE).filter((d) => fs.existsSync(path.join(DE, d, 'ak-hires-pilot.glb')))
      .filter((d) => !SO.length || SO.includes(d)).sort()
  : [];

if (!armas.length) {
  console.error(`nada para publicar em ${DE}`);
  process.exit(2);
}

const aprovadas = [];
for (const arma of armas) {
  const glb = path.join(DE, arma, 'ak-hires-pilot.glb');
  const i = inspecionar(glb);
  const faltam = EXIGIDOS.filter((c) => !i.clipes.includes(c));
  if (faltam.length) {
    console.log(`  RECUSA  ${arma.padEnd(10)} sem clipe: ${faltam.join(',')}`);
    continue;
  }
  if (i.maos < 2) {
    console.log(`  RECUSA  ${arma.padEnd(10)} só ${i.maos} malha(s) de mão do doador (esperado 2)`);
    continue;
  }
  aprovadas.push({ arma, glb, bytes: i.bytes });
  console.log(`  ok      ${arma.padEnd(10)} ${i.clipes.join(',')} · ${(i.bytes / 1048576).toFixed(2)} MB`);
}

if (ENSAIO) {
  console.log(`\nensaio: publicaria ${aprovadas.length} de ${armas.length}`);
  process.exit(0);
}

fs.mkdirSync(DESTINO, { recursive: true });
for (const a of aprovadas) {
  fs.copyFileSync(a.glb, path.join(DESTINO, `${a.arma}-hires.glb`));
}

/* `golden: true` na entrada da arma. Regex sobre a linha dela, não reescrita do
   arquivo: outras frentes editam o mesmo vmconfig e sobrescrever apaga o trabalho
   delas — é a regra do game.js valendo aqui também. */
let cfg = fs.readFileSync(VMCONFIG, 'utf8');
let ligadas = 0;
for (const a of aprovadas) {
  const re = new RegExp(`^(\\s+${a.arma}: W\\('[a-z0-9_]+'(?:, \\{)?)`, 'm');
  if (!re.test(cfg)) { console.log(`  AVISO   ${a.arma}: sem entrada em vmconfig, não liguei`); continue; }
  if (new RegExp(`^\\s+${a.arma}: W\\([^)]*golden: true`, 'm').test(cfg)) { ligadas += 1; continue; }
  cfg = cfg.replace(new RegExp(`^(\\s+${a.arma}: W\\('[a-z0-9_]+')(, \\{)?`, 'm'),
    (_m, p1, p2) => (p2 ? `${p1}, { golden: true,` : `${p1}, { golden: true }`));
  ligadas += 1;
}
fs.writeFileSync(VMCONFIG, cfg);

console.log(`\npublicadas ${aprovadas.length} · golden ligado em ${ligadas}`);
