#!/usr/bin/env node
/* ============================================================================
   melee-vm-check.mjs — A FACA TEM DONO: O PILOTO MELEE ESTÁ CONSTRUÍDO E INTEIRO
   ----------------------------------------------------------------------------
   POR QUE EXISTE (BUG-75): meleevm.js nunca era importado — game.js referenciava
   this.vm.melee em 12 pontos e ele era sempre undefined; a faca caía no caminho
   legado (o pior visual do arsenal) com o piloto pronto parado na árvore.
   MV1 game.js importa KnifeMeleeViewModel e CONSTRÓI this.vm.melee;
   MV2 o GLB que o meleevm.js SERVE existe com câmera e os clipes exigidos: produto K
       privado (manifesto melee-candidates.json + catálogo local) ou golden versionado;
   MV3 nenhum vm.melee órfão: as referências têm o construtor no mesmo arquivo.
   Mutante: --mutante=sem-construtor apaga a construção em memória → MV1 reprova.
   ============================================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUT && MUT !== 'sem-construtor') throw new Error(`mutante desconhecido: ${MUT}`);

let game = fs.readFileSync(path.join(ROOT, 'public/js/game.js'), 'utf8');
if (MUT === 'sem-construtor') game = game.replace(/new KnifeMeleeViewModel\(/g, 'nuncaConstruido(');
const melee = fs.readFileSync(path.join(ROOT, 'public/js/meleevm.js'), 'utf8');

let failures = 0;
function check(ok, label, evidence = '') {
  console.log(`${ok ? 'PASSA' : 'FALHA'} ${label}${evidence ? ` — ${evidence}` : ''}`);
  if (!ok) failures += 1;
}

check(/import \{ KnifeMeleeViewModel \} from '\.\/meleevm\.js'/.test(game)
  // A construção fica atrás da chave tudo-ou-nada (eval:vm-launch), nunca some.
  && /this\.vm\.melee = (?:!AUTHORED_VM_ENABLED \? null : )?new KnifeMeleeViewModel\(\{/.test(game),
'MV1 game.js constrói this.vm.melee com o piloto');

// O caminho medido é o que o runtime pede, não uma constante desta régua.
const servida = /const KNIFE_URL = [`'"]\/([^?`'"]+)/.exec(melee)?.[1] || '';
const privada = servida.startsWith('private-assets/');
const glbPath = `public/${servida}`;
const glbFull = path.join(ROOT, glbPath);
if (privada) {
  const manifesto = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/viewmodels/melee-candidates.json'), 'utf8'));
  const produto = manifesto.candidates?.knife;
  check(Boolean(produto) && glbPath.endsWith(produto.file.replace(/^viewmodels\//, '')) && /^[0-9a-f]{64}$/.test(produto.sha256 || ''),
    'MV2a faca K servida tem entrada com sha256 no manifesto', servida);
  check(/VM_BYTES\.knife/.test(melee), 'MV2b URL da faca K versiona pelos bytes (VM_BYTES.knife)');
  if (!fs.existsSync(path.join(ROOT, 'public/private-assets/viewmodels'))) {
    console.log('NOTA  MV2c/MV2d catálogo privado ausente nesta máquina: clipes e câmera medidos só com ele');
  }
} else {
  check(fs.existsSync(glbFull), 'MV2a GLB da faca existe', glbPath);
  let versionado = false;
  try { execFileSync('git', ['ls-files', '--error-unmatch', glbPath], { cwd: ROOT, stdio: 'ignore' }); versionado = true; } catch { /* não versionado */ }
  check(versionado, 'MV2b GLB público da faca está versionado');
}
if (fs.existsSync(glbFull)) {
  const glb = fs.readFileSync(glbFull);
  const jsonLength = glb.readUInt32LE(12);
  const json = JSON.parse(glb.subarray(20, 20 + jsonLength).toString('utf8').replace(/\0+$/g, ''));
  const clips = new Set((json.animations || []).map((animation) => animation.name));
  const missing = ['Idle', 'Draw', 'Slash', 'Stab', 'QuickThrust', 'HeavyStab'].filter((name) => !clips.has(name));
  check(missing.length === 0, 'MV2c biblioteca original e ataques aprovados presentes', missing.join(', '));
  check((json.cameras || []).length >= 1, 'MV2d câmera autoral exportada no GLB');
} else if (privada && fs.existsSync(path.join(ROOT, 'public/private-assets/viewmodels'))) {
  check(false, 'MV2c GLB da faca K ausente no catálogo privado', glbPath);
}

const referencias = (game.match(/this\.vm\.melee/g) || []).length;
check(referencias >= 10 && /REQUIRED_CLIPS/.test(melee),
  'MV3 referências vm.melee têm dono construído', `${referencias} referências`);

console.log(JSON.stringify({ mutante: MUT || null, referencias, failures }, null, 2));
process.exit(failures ? 1 : 0);
