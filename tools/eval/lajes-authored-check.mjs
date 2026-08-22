/*
  A Lajes antiga passou verde enquanto o pixel continuava uma arena de caixas.
  Esta régua cobra a substituição descrita em plans/10-LAJES.md. Ela não dá nota
  estética; só impede que o runtime volte à casca procedural ou ao fallback cinza.

  Uso: node tools/eval/lajes-authored-check.mjs
       node tools/eval/lajes-authored-check.mjs --mutante=sem-assets|duas-conexoes|volta-casca
*/
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const ROOT = path.resolve(import.meta.dirname, '../..');
const MAPS_PATH = path.join(ROOT, 'public/js/maps.js');
const MAP_PATH = path.join(ROOT, 'public/js/map_lajes_authored.js');
const mutante = process.argv.find((a) => a.startsWith('--mutante='))?.split('=')[1] || '';

let mapsSrc = fs.readFileSync(MAPS_PATH, 'utf8');
let mapSrc = fs.existsSync(MAP_PATH) ? fs.readFileSync(MAP_PATH, 'utf8') : '';
if (mutante === 'sem-assets') mapSrc = mapSrc.replace(/export const LAJES_AUTHORED_ASSETS\s*=\s*Object\.freeze\(\[[\s\S]*?\]\);/, 'export const LAJES_AUTHORED_ASSETS = Object.freeze([]);');
if (mutante === 'duas-conexoes') mapSrc = mapSrc.replace(/export const LAJES_CONNECTIONS\s*=\s*Object\.freeze\(\[[\s\S]*?\]\);/, 'export const LAJES_CONNECTIONS = Object.freeze(["escadaria", "passarela"]);');
if (mutante === 'volta-casca') mapSrc += "\nloadShell(root, '/models/shells/lajes_completa.glb');\n";

const arr = (name) => {
  const body = mapSrc.match(new RegExp(`export const ${name}\\s*=\\s*Object\\.freeze\\(\\[([\\s\\S]*?)\\]\\);`))?.[1] || '';
  return [...body.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
};
const assets = arr('LAJES_AUTHORED_ASSETS');
const connections = arr('LAJES_CONNECTIONS');
const runtimeNovo = /from\s+['"]\.\/map_lajes_authored\.js['"]/.test(mapsSrc)
  && !/from\s+['"]\.\/map_lajes\.js['"]/.test(mapsSrc);
const semCasca = !/lajes_completa\.glb|loadShell\s*\(|makeHorizon\s*\(/.test(mapSrc);
const lowqMantemArquitetura = /const\s+ARCHITECTURE_ON\s*=\s*true/.test(mapSrc)
  && !/LOWQ[^\n]{0,120}(?:placeProp|PropBatch|LAJES_AUTHORED_ASSETS)/.test(mapSrc);
const usaAssets = assets.length >= 4 && assets.every((id) => new RegExp(`['"]${id}['"]`).test(mapSrc));
const temMarcos = ['ESCADARIA', 'BECO DO VARAL', 'LAJE DA CAIXA'].every((s) => mapSrc.includes(s));
const temLoops = /export const LAJES_LOOPS\s*=\s*Object\.freeze\(\{[\s\S]*?beco[\s\S]*?laje[\s\S]*?\}\);/.test(mapSrc);
const tresConexoes = connections.length >= 3;
const varalReal = assets.includes('lajes_varal') && /centerProp\s*\(\s*['"]lajes_varal['"]/.test(mapSrc);

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const glbs = [];
for (const id of assets) {
  const file = path.join(ROOT, 'public/models/props', `${id}.glb`);
  if (!fs.existsSync(file)) { glbs.push({ id, existe: false }); continue; }
  try {
    const doc = await io.read(file);
    const prim = doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives());
    const tris = prim.reduce((n, p) => n + (p.getIndices()?.getCount() || p.getAttribute('POSITION')?.getCount() || 0) / 3, 0);
    glbs.push({ id, existe: true, primitivas: prim.length, texturas: doc.getRoot().listTextures().length, triangulos: Math.round(tris) });
  } catch (e) { glbs.push({ id, existe: true, erro: e.message }); }
}
const glbsValidos = assets.length >= 4 && glbs.every((g) => g.existe && !g.erro && g.primitivas > 0 && g.triangulos > 0);

const checks = [
  ['LA1', 'maps.js registra a reconstrução, não a baseline', runtimeNovo, runtimeNovo ? 'map_lajes_authored.js ativo' : 'map_lajes.js antigo ainda ativo'],
  ['LA2', 'runtime não carrega casca nem horizonte radial rejeitados', semCasca, semCasca ? 'sem shell/horizon' : 'casca ou horizonte antigo reapareceu'],
  ['LA3', 'LOWQ conserva a arquitetura autorada', lowqMantemArquitetura, lowqMantemArquitetura ? 'arquitetura sempre ligada' : 'LOWQ ainda pode cair em geometria substituta'],
  ['LA4', 'kit autorado cobre arquitetura, massa e varal', usaAssets && glbsValidos, `${assets.length} assets · ${glbs.map((g) => `${g.id}:${g.existe && !g.erro ? `${g.triangulos}t` : 'inválido'}`).join(' · ')}`],
  ['LA5', 'planta declara o Beco e três atalhos verticais pelas lajes', temLoops && tresConexoes, `${connections.length} conexões: ${connections.join(', ') || 'nenhuma'}`],
  ['LA6', 'os três marcos nomeiam o percurso e as bandeiras', temMarcos, temMarcos ? 'Escadaria · Beco do Varal · Laje da Caixa' : 'marco ausente'],
  ['LA7', 'varal é o GLB de referência integrado', varalReal, varalReal ? 'lajes_varal colocado no runtime' : 'varal autorado ausente'],
];

let falhas = 0;
for (const [id, desc, ok, evid] of checks) {
  if (!ok) falhas++;
  console.log(`${ok ? '✓' : '✗'} ${id} ${desc} — ${evid}`);
}
if (falhas) {
  console.error(`LAJES-AUTHORED FALHA: ${falhas}/${checks.length}`);
  process.exitCode = 1;
} else if (mutante) {
  console.error(`MUTANTE ${mutante} sobreviveu`);
  process.exitCode = 1;
} else console.log('LAJES-AUTHORED OK');
