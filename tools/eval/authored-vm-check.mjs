import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { WEAPONS } from '../../public/js/data/weapons.js';
import { AUTHORED_VM_MODELS, AUTHORED_VM_URLS } from '../../public/js/authoredvm.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mutant = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || '';
const runtime = fs.readFileSync(path.join(ROOT, 'public/js/authoredvm.js'), 'utf8');
const game = fs.readFileSync(path.join(ROOT, 'public/js/game.js'), 'utf8');
let failures = 0;

function check(ok, label, evidence = '') {
  console.log(`${ok ? 'PASSA' : 'FALHA'} AVM ${label}${evidence ? ` — ${evidence}` : ''}`);
  if (!ok) failures += 1;
}

const gameplay = Object.keys(WEAPONS);
const missing = gameplay.filter((id) => id !== 'knife' && !AUTHORED_VM_MODELS[id]);
const families = new Set(Object.values(AUTHORED_VM_MODELS));
if (mutant === 'sem-familia') families.delete('ak');

check(gameplay.length === 26, 'arsenal mantém 26 armas', `weapons=${gameplay.length}`);
check(missing.length === 0, '25 armas de fogo possuem família paga', missing.join(', '));
check(families.size === 15, 'catálogo deduplica o arsenal em 15 famílias mecânicas', `families=${families.size}`);
check(Object.keys(AUTHORED_VM_URLS).length === 15, 'cada família possui uma URL privada');
check(Object.values(AUTHORED_VM_URLS).every((url) => url.startsWith('/private-assets/viewmodels/')),
  'binários licenciados são servidos fora do código público');
check(!/weaponModel\s*\(/.test(runtime), 'runtime não desmonta nem remonta armas por inferência');
check(!/PCA|principalComponents|contactPoint/.test(runtime), 'runtime não usa PCA ou busca de contato');
check(/loadAsync\(AUTHORED_VM_URLS\[family\]\)/.test(runtime), 'famílias carregam sob demanda');
check(!/Promise\.all\([^)]*AUTHORED_VM_URLS/.test(runtime), 'boot não baixa o catálogo inteiro');
check(/authoredCamera\.matrixWorld\.clone\(\)\.invert\(\)/.test(runtime),
  'câmera exportada define o espaço óptico do pacote');
check(/reload_tactical/.test(runtime) && /reload_empty/.test(runtime),
  'recarga tática e vazia permanecem distintas');
check(/reload_start/.test(runtime) && /reload_loop/.test(runtime) && /reload_end/.test(runtime),
  'shotgun e bolt-action suportam recarga em fases');
check(/a\.mag === 0/.test(game), 'game informa ao rig quando o carregador está vazio');
check(/authoredCharacterHand/.test(runtime) && /profile\.sleeve/.test(runtime),
  'mãos e mangas recebem identidade do personagem');
check(/dispose\(\)/.test(runtime), 'GPU resources possuem ciclo de descarte');

console.log(JSON.stringify({ mutant, weapons: gameplay.length, families: families.size, failures }, null, 2));
process.exit(failures ? 1 : 0);
