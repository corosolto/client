import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import * as THREE from '../../public/vendor/three.module.js';

const mutant = (process.argv.find(a => a.startsWith('--mutate=')) || '').split('=')[1];
if (mutant && !['sem-lobisomem', 'roster', 'links', 'gloves', 'resultados', 'clipes', 'curltwist', 'loading'].includes(mutant)) throw new Error(`Mutante desconhecido: ${mutant}`);
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

/* ── OS OSSOS DE CURL SÃO DO RUNTIME, NÃO DO CLIPE ────────────────────────────────
   `Curl_L`/`Curl_R` não são ossos de animação: são o atuador do fechamento da mão, que
   o `buildCharacterModel` escreve UMA vez (glbchars.js, bloco "Grip curl") com o ângulo
   tirado da espessura medida da arma. Canal de clipe neles é sobrescrita por quadro: o
   grip curl morre e a arma fica na pata aberta.
   POR QUE ISTO É PORTÃO, e não conselho: em 06/09 o `retarget-glb.mjs` assou 0,8763 rad
   de TORÇÃO (x=0,293 y=-0,544 z=-0,621) nesses ossos nos 11 clipes do Lobisomem — nos 13
   outros rigs com `Curl_*` o mesmo tool sai IDENTIDADE (0,0000 rad), então nada nas
   réguas de asset acusava. O efeito era 12,55% do peso de skin da pata torcendo todo
   quadro: `npm run eval:select` foi a 13 reprovados (p99 0,694 / ruins 36,2 no lobo)
   num portão que declara no máximo 12. Depois do `tools/strip-curl-tracks.mjs`: p99
   0,511 / ruins 14,5 — melhor que o `mandrake`, que é referência elogiada.
   A tolerância é 1e-4 rad e não zero: quaternion vai e volta de float32 no GLB, então
   exigir igualdade exata reprovaria por ruído de arredondamento, não por defeito. */
const TOL_CURL = 1e-4;
const io = new NodeIO();
const clipesLobo = ['public/models/anims/lobisomem.glb',
  ...index.estados.concat(index.opcionais || []).map(s => `public/models/anims/lobisomem/${s}.glb`)]
  .filter(existsSync);
expect(clipesLobo.length >= 1 + index.estados.length, 'clipes do Lobisomem sumiram do disco');
const docs = [];
for (const arq of clipesLobo) docs.push([arq, await io.read(arq)]);

/* MUTANTE DE VERDADE, não carimbo. Ele RECONSTRÓI o canal de `Curl_R` em memória com a
   torção medida no disco em 06/09 e deixa o laço de baixo achá-lo sozinho. Um mutante que
   só empurrasse a mensagem na lista de falhas provaria que a string existe — não que a
   régua enxerga o defeito. Como o conserto apagou o canal, o mutante precisa CRIAR um:
   é exatamente o que uma regeração do `retarget-glb.mjs` sem a guarda faria. */
if (mutant === 'curltwist') {
  const [, doc] = docs[0];
  const alvo = doc.getRoot().listNodes().find(n => n.getName() === 'Curl_R');
  const anim = doc.getRoot().listAnimations()[0];
  if (!alvo || !anim) throw new Error('mutante curltwist: sem Curl_R ou sem animação para mutar');
  const torto = new THREE.Quaternion().fromArray(alvo.getRotation())
    .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.293, -0.544, -0.621, 'XYZ')));
  const buf = doc.getRoot().listBuffers()[0] || doc.createBuffer();
  const samp = doc.createAnimationSampler()
    .setInput(doc.createAccessor().setType('SCALAR').setBuffer(buf).setArray(new Float32Array([0, 1])))
    .setOutput(doc.createAccessor().setType('VEC4').setBuffer(buf).setArray(new Float32Array([...torto.toArray(), ...torto.toArray()])))
    .setInterpolation('LINEAR');
  anim.addSampler(samp);
  anim.addChannel(doc.createAnimationChannel().setTargetNode(alvo).setTargetPath('rotation').setSampler(samp));
}

const torcidos = [];
for (const [arq, doc] of docs) {
  for (const anim of doc.getRoot().listAnimations()) {
    for (const ch of anim.listChannels()) {
      const no = ch.getTargetNode();
      if (!no || !/^Curl_/.test(no.getName())) continue;
      if (ch.getTargetPath() !== 'rotation') { torcidos.push(`${arq}·${anim.getName()}·${no.getName()} (${ch.getTargetPath()})`); continue; }
      const out = ch.getSampler().getOutput().getArray();
      const inv = new THREE.Quaternion().fromArray(no.getRotation()).invert();
      const q = new THREE.Quaternion(), e = new THREE.Euler();
      let pior = 0;
      for (let i = 0; i + 3 < out.length; i += 4) {
        q.set(out[i], out[i + 1], out[i + 2], out[i + 3]);
        e.setFromQuaternion(inv.clone().multiply(q), 'XYZ');
        pior = Math.max(pior, Math.hypot(e.x, e.y, e.z));
      }
      if (pior > TOL_CURL) torcidos.push(`${arq}·${anim.getName()}·${no.getName()} |delta|max=${pior.toFixed(4)} rad`);
    }
  }
}
expect(!torcidos.length,
  `clipe do Lobisomem escreve nos ossos de curl (o runtime perde o fechamento da mão e a pata torce):\n  ${torcidos.join('\n  ')}`);

/* ── A TELA DE CARREGAMENTO TAMBÉM É UMA FACÇÃO ───────────────────────────────────
   `LOADING_CHARACTER_IDS` (loading3d.js) escolhe quem posa no palco 3D enquanto o mapa
   monta, e o `|| LOADING_CHARACTER_IDS.E` no fim é fallback para facção DESCONHECIDA.
   Com M fora do mapa, o fallback engolia a escolha em silêncio: quem clicava em MÍTICO
   via GOTINHA, do Time E, girando na tela — o mesmo defeito de "puxar gente de outra
   facção" que esta lane consertou no roster, um andar acima. Nenhuma régua olhava aqui
   porque o objeto é um dicionário estático e sempre devolvia ALGUÉM.
   A invariante é sobre TODAS as facções, não só a M: quem entra em `FACCOES`
   (paleta.js) entra aqui junto, com personagem da própria facção e com GLB — um id sem
   modelo deixa o palco vazio (`dataset.error = 'modelo-ausente'`). Medido no navegador
   por `tools/eval/miticos-browser-review.mjs`, que foi quem achou. */
const loading3d = read('public/js/loading3d.js');
const paleta = read('public/js/paleta.js');
const faccoes = (paleta.match(/export const FACCOES = \[([^\]]*)\]/) || [])[1]
  ?.match(/'([A-Z])'/g)?.map((f) => f.slice(1, -1)) || [];
expect(faccoes.length >= 6, `FACCOES não foi lido do paleta.js: ${JSON.stringify(faccoes)}`);
let mapaLoading = (loading3d.match(/LOADING_CHARACTER_IDS = Object\.freeze\(\{([\s\S]*?)\}\)/) || [])[1] || '';
if (mutant === 'loading') mapaLoading = mapaLoading.replace(/\n\s*M: '[^']*',/, '');
const porFaccao = Object.fromEntries([...mapaLoading.matchAll(/([A-Z]):\s*'([^']+)'/g)].map((m) => [m[1], m[2]]));
const glbChars = read('public/js/glbchars.js');
for (const f of faccoes) {
  const id = porFaccao[f];
  expect(!!id, `facção ${f} não tem personagem no palco de carregamento — o fallback mostra o Time E no lugar dela (loading3d.js)`);
  if (!id) continue;
  const dono = new RegExp(`\\{ id: '${id}',[^}]*team: '([A-Z])'`).exec(characters)?.[1]
    || new RegExp(`id: '${id}',\\s*team: '([A-Z])'`).exec(characters)?.[1];
  expect(dono === f, `palco de carregamento da facção ${f} usa '${id}', que é da facção ${dono}`);
  expect(glbChars.includes(`'${id}'`), `palco de carregamento da facção ${f} usa '${id}', que não está em GLB_CHARS — o palco fica vazio`);
}

if (mutant) {
  if (!failures.length) throw new Error('mutação não foi pega');
  console.log(`✓ mutação ${mutant} pega: ${failures.join('; ')}`);
  process.exit(0);
}
if (failures.length) throw new Error(failures.join('\n'));
console.log(`✓ Lobisomem integrado: roster=M/${roster.join(',')}, ${assets.length} assets, sha256=${assetHash}`);
