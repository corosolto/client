/* Procedencia nao pode ser uma frase solta: o hash do arquivo servido deve aparecer
   ao lado do prompt em public/img/FONTE.md. Cobre os cinco materiais e os tres ceus
   desta frente, e prova que cada mapa ainda referencia os seus arquivos.

   Mutantes:
   - hash-falso: muda o hash medido e precisa reprovar a procedencia;
   - asset-desligado: remove logicamente a textura do Campo e precisa reprovar o uso;
   - ceu-fotografico: religa o panorama nas Lajes e precisa reprovar o contrato procedural.
*/
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const files = [
  'escadao_streetart_azulejo.webp', 'campomorro_streetart_baile.webp',
  'lajes_streetart_mural.webp', 'corrego_streetart_pixo.webp',
  'mansao_streetart_marble.webp', 'sky_rj.webp', 'sky_sp.webp', 'sky_joa.webp',
];
const fonte = readFileSync('public/img/FONTE.md', 'utf8');
const mutante = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || null;
const conhecidos = new Set(['hash-falso', 'asset-desligado', 'ceu-fotografico']);
if (mutante && !conhecidos.has(mutante)) throw new Error(`mutante desconhecido: ${mutante}`);
let falhas = 0;
for (let i = 0; i < files.length; i++) {
  const file = files[i];
  let hash = createHash('sha256').update(readFileSync(`public/img/textures/${file}`)).digest('hex');
  if (i === 0 && mutante === 'hash-falso') hash = `${hash[0] === '0' ? '1' : '0'}${hash.slice(1)}`;
  const pos = fonte.indexOf(`textures/${file}`);
  const bloco = pos < 0 ? '' : fonte.slice(pos, pos + 1800);
  const ok = pos >= 0 && bloco.includes(hash);
  if (!ok) falhas++;
  console.log(`${ok ? '✓' : '✗'} ${file} ${hash.slice(0,12)}…`);
}

const usos = {
  'map_escadao.js': ['escadao_streetart_azulejo.webp', 'sky_rj.webp'],
  'map_campomorro.js': ['campomorro_streetart_baile.webp', 'sky_rj.webp'],
  'map_lajes.js': ['lajes_streetart_mural.webp'],
  'map_corrego.js': ['corrego_streetart_pixo.webp', 'sky_sp.webp'],
  'map_mansao.js': ['mansao_streetart_marble.webp', 'sky_joa.webp'],
};
for (const [mapa, assets] of Object.entries(usos)) {
  let src = readFileSync(`public/js/${mapa}`, 'utf8');
  if (mutante === 'asset-desligado' && mapa === 'map_campomorro.js') {
    const antes = src;
    src = src.replace('campomorro_streetart_baile.webp', 'campomorro_asset_desligado.webp');
    if (src === antes) throw new Error('MUTANTE asset-desligado nao aplicou');
  }
  if (mutante === 'ceu-fotografico' && mapa === 'map_lajes.js') {
    const antes = src;
    src = src.replace('\n  setLajesSky(scene);', "\n  setMapSky(scene, T, '/img/textures/sky_rj.webp', 0xb9c6d2);");
    if (src === antes) throw new Error('MUTANTE ceu-fotografico nao aplicou');
  }
  /* o céu fotográfico pode vir DIRETO no mapa (setMapSky com o literal) ou
     INDIRETO pelo applyLook do RC1 (a LOOK table do look.js aponta o mesmo
     /img/textures/sky_*.webp) — ler só o map_*.js acusava 3 faltando sendo que
     o céu é servido pelo look.js (v2.1, frente G) */
  const srcLook = src.includes('applyLook') ? readFileSync('public/js/look.js', 'utf8') : '';
  const ausentes = assets.filter((asset) => !src.includes(`/img/textures/${asset}`) && !srcLook.includes(`/img/textures/${asset}`));
  const lajesProcedural = mapa !== 'map_lajes.js' || (
    src.includes('\n  setLajesSky(scene);')
    && src.includes('\n  makeHorizon(scene,')
    && !src.includes("'/img/textures/sky_rj.webp'")
  );
  const ok = ausentes.length === 0 && lajesProcedural;
  if (!ok) falhas += Math.max(1, ausentes.length);
  const ceu = mapa === 'map_lajes.js' ? ' + céu/morros procedurais' : '';
  console.log(`${ok ? '✓' : '✗'} ${mapa} usa ${assets.join(' + ')}${ceu}${ausentes.length ? ` (faltando ${ausentes.join(', ')})` : ''}`);
}

if (falhas) {
  console.error(`MAP-SOURCE FALHA: ${falhas} clausula(s); material desligado ou procedencia sem o SHA servido.`);
  process.exitCode = 1;
} else if (mutante) {
  console.error(`MUTANTE ${mutante} sobreviveu`);
  process.exitCode = 1;
} else console.log('MAP-SOURCE OK');
