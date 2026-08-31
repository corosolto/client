#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const authoredPath = path.join(root, 'public/js/authoredvm.js');
const gamePath = path.join(root, 'public/js/game.js');
const failures = [];
const pass = (condition, message) => { if (!condition) failures.push(message); };

const readGlbJson = (relativePath) => {
  const data = fs.readFileSync(path.join(root, relativePath));
  pass(data.toString('ascii', 0, 4) === 'glTF', `${relativePath}: cabeçalho GLB inválido`);
  const jsonLength = data.readUInt32LE(12);
  return JSON.parse(data.toString('utf8', 20, 20 + jsonLength));
};

const game = fs.readFileSync(gamePath, 'utf8');
const authored = fs.existsSync(authoredPath) ? fs.readFileSync(authoredPath, 'utf8') : '';
pass(Boolean(authored), 'public/js/authoredvm.js ainda não existe');
pass(/awp:\s*'awp-heavy'/.test(authored), 'seleção isolada da AWP ausente');
pass(/shotgun:\s*'shotgun-heavy'/.test(authored), 'seleção isolada da shotgun ausente');
pass(!/^\s{2}(?!awp:|shotgun:)[a-z0-9]+:\s*'[^']+'/m.test(
  authored.match(/AUTHORED_VM_MODELS\s*=\s*Object\.freeze\(\{([\s\S]*?)\}\)/)?.[1] || ''
), 'AUTHORED_VM_MODELS contém arma fora dos dois pilotos');
pass(/heavy\/awp-pilot\.glb/.test(authored), 'URL do piloto AWP ausente');
pass(/heavy\/shotgun-pilot\.glb/.test(authored), 'URL do piloto shotgun ausente');
for (const hook of [
  /createAuthoredViewModels/, /vm\.authored/, /authored\?\.setWeapon/,
  /authored\?\.reload/, /authored\?\.shoot/, /authored\?\.setAim/,
]) pass(hook.test(game), `hook runtime ausente: ${hook}`);

for (const pilot of ['awp', 'shotgun']) {
  const relativePath = `public/models/viewmodels/coro/heavy/${pilot}-pilot.glb`;
  const json = readGlbJson(relativePath);
  pass((json.cameras || []).length === 1, `${pilot}: precisa exportar exatamente uma câmera`);
  const animations = new Set((json.animations || []).map((item) => item.name));
  for (const clip of ['Idle', 'Fire', 'Reload']) pass(animations.has(clip), `${pilot}: clip ${clip} ausente`);
  const names = [
    ...(json.nodes || []).map((item) => item.name || ''),
    ...(json.materials || []).map((item) => item.name || ''),
    ...(json.meshes || []).map((item) => item.name || ''),
  ].join('\n');
  pass(/coro_solto|CoroSolto/i.test(names), `${pilot}: identidade própria Coro Solto não encontrada`);
  pass(!/donor|fps_50cal|sniper_animated|shotgun_animated/i.test(names), `${pilot}: nome de doador vazou no GLB`);
}

if (failures.length) {
  console.error(`[heavy-authored] FALHOU (${failures.length})`);
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exit(1);
}
console.log('[heavy-authored] PASS — AWP/shotgun isoladas, câmera e clips presentes');
