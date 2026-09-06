import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const mutant = (process.argv.find(a => a.startsWith('--mutate=')) || '').split('=')[1];
if (mutant && !['sem-lobisomem', 'roster', 'links', 'gloves', 'resultados', 'clipes'].includes(mutant)) throw new Error(`Mutante desconhecido: ${mutant}`);
const read = (file) => readFileSync(file, 'utf8');
let characters = read('public/js/characters.js');
if (mutant === 'sem-lobisomem') characters = characters.replace("{ id: 'lobisomem'", "{ id: 'mutado'" );

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

const change = (source, from, to) => {
  if (!source.includes(from)) throw new Error(`Mutação não aplicada: ${from}`);
  return source.replace(from, to);
};
const defs = [...characters.matchAll(/\{ id: '([^']+)', team: '([^']+)'/g)].map(m => ({ id: m[1], team: m[2] }));
let game = read('public/js/game.js');
if (mutant === 'roster') game = change(game, 'others.length ? others : allies', 'others');
const rosterSource = game.slice(game.indexOf('const _cyclePool ='), game.indexOf('/* Pool dos bots'));
const pickRoster = new Function('CHARACTERS', `${rosterSource.replace('export function', 'function')}return pickMatchRoster;`)(defs);
for (const dedicated of [false, true]) for (const size of [1, 5, 8]) {
  const result = pickRoster('M', 'B', size, 'lobisomem', dedicated);
  expect(result.allyDefs.length === size - (dedicated ? 0 : 1) && result.allyDefs.every(c => c.id === 'lobisomem'), `roster M incorreto: size=${size}, dedicated=${dedicated}`);
}
let query = read('public/js/screenquery.js');
if (mutant === 'links') query = change(query, ", 'M'", '');
const resolveQuery = new Function(`${query.replace('export function', 'function')}return resolveInspectionScreen;`)();
for (const tela of ['personagem', 'hud', 'vitoria', 'derrota']) {
  const target = resolveQuery(new URLSearchParams({ tela, time: 'M', char: 'lobisomem' }));
  expect(target.faction === 'M' && target.character === 'lobisomem', `inspeção ${tela} perde M`);
}
let fp = read('public/js/fparms.js');
if (mutant === 'gloves') fp = change(fp, ', M: 0x9d4edd', '');
expect(/const GLOVE = \{[^}]*M: 0x9d4edd/.test(fp), 'luva FP M ausente');
// O desfecho vive nos dois vídeos (0/45 pares iguais); o WebP é fallback compartilhado (44/45 pares iguais).
const victory = readFileSync('public/img/resultado/lobisomem-vitoria.webp');
const defeat = readFileSync(mutant === 'resultados'
  ? 'public/img/resultado/mst-derrota.webp' : 'public/img/resultado/lobisomem-derrota.webp');
expect(victory.equals(defeat), 'par estático do Lobisomem foge da convenção do elenco publicado');
expect(!readFileSync('public/video/resultado/lobisomem-vitoria.webm')
  .equals(readFileSync('public/video/resultado/lobisomem-derrota.webm')),
'vídeos de vitória e derrota do Lobisomem repetem a mesma cena');
const index = JSON.parse(read('public/models/anims/index.json'));
if (mutant === 'clipes') delete index.clipes.lobisomem;
expect(index.estados.every(state => index.clipes.lobisomem?.includes(state)), 'Lobisomem sem clipes próprios obrigatórios');
expect(existsSync('public/models/anims/lobisomem.glb'), 'pack mesclado do Lobisomem ausente');

if (mutant) {
  if (!failures.length) throw new Error('mutação não foi pega');
  console.log(`✓ mutação ${mutant} pega: ${failures.join('; ')}`);
  process.exit(0);
}
if (failures.length) throw new Error(failures.join('\n'));
console.log(`✓ Lobisomem integrado: roster=M/${roster.join(',')}, ${assets.length} assets, sha256=${assetHash}`);
