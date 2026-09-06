import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const mutate = process.argv.includes('--mutate=sem-lobisomem');
const read = (file) => readFileSync(file, 'utf8');
let characters = read('public/js/characters.js');
if (mutate) characters = characters.replace("{ id: 'lobisomem'", "{ id: 'mutado'" );

const failures = [];
const expect = (ok, message) => { if (!ok) failures.push(message); };
const roster = [...characters.matchAll(/\{ id: '([^']+)', team: 'M'/g)].map((match) => match[1]);
expect(roster.length === 1 && roster[0] === 'lobisomem', `roster M deve conter somente lobisomem, recebeu ${roster.join(', ') || 'vazio'}`);
expect(!/\b(?:cuca|saci|lampiao|mariabonita|curupira|zumbi|boto|bandeirante)\b/.test(roster.join(' ')), 'personagem M bloqueado entrou no roster');
expect(/lobisomem:\s*'shotgun'/.test(characters), 'loadout de lobisomem não está registrado');

const glb = read('public/js/glbchars.js');
expect(/'lobisomem'/.test(glb), 'GLB_CHARS não carrega lobisomem');
const palette = read('public/js/paleta.js');
expect(/FACCOES\s*=\s*\[[^\]]*'M'/.test(palette) && /M:\s*\{ base: '#9d4edd', escura: '#5e35b1', palida: '#d0a3f0' \}/.test(palette), 'paleta M está incompleta');
expect(/M:\s*'m'/.test(read('public/js/brasoes.js')), 'brasão M não está registrado');
const main = read('public/js/main.js');
expect(/btn-team-m/.test(main) && /pickTeam\('M'\)/.test(main), 'seleção não expõe o card M');
expect(/FACTION_ART_URLS[^;]*mitico\.webp/.test(main), 'arte M não entra no preload do menu');
expect(/M:\s*'MÍTICO'/.test(read('public/js/mapcat.js')), 'nome M não entra na interface compartilhada');
expect(/btn-team-m/.test(read('src/pages/index.astro')) && /team-m/.test(read('public/style.css')), 'card M não está completo no documento e estilo');

const assets = [
  'public/models/characters/lobisomem.glb',
  'public/img/chars/avatars/lobisomem.webp',
  'public/img/chars-hero/lobisomem.webp',
  'public/img/resultado/lobisomem-vitoria.webp',
  'public/img/resultado/lobisomem-derrota.webp',
  'public/video/chars/lobisomem.webm',
  'public/video/resultado/lobisomem-vitoria.webm',
  'public/video/resultado/lobisomem-derrota.webm',
  'public/img/faccoes/mitico.webp',
  'public/img/brasoes/m.png',
];
for (const asset of assets) expect(existsSync(asset), `asset ausente: ${asset}`);
const digest = createHash('sha256');
for (const asset of assets) if (existsSync(asset)) digest.update(asset).update('\0').update(readFileSync(asset)).update('\0');
const assetHash = digest.digest('hex');

if (mutate) {
  if (!failures.length) throw new Error('mutação não foi pega');
  console.log(`✓ mutação pega: ${failures.join('; ')}`);
  process.exit(0);
}
if (failures.length) throw new Error(failures.join('\n'));
console.log(`✓ Lobisomem integrado: roster=M/${roster.join(',')}, ${assets.length} assets, sha256=${assetHash}`);
