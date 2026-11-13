import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { provaValida } from './operacao-flavio-proof-check.mjs';

// Reproduz a falha real do antigo `! node`: código equivalente perde a âncora,
// passa os onze cenários e não pode ser contado como mutação detectada.
const dir = mkdtempSync(join(tmpdir(), 'flavio-prova-'));
try {
  let main = readFileSync(new URL('../../public/js/main.js', import.meta.url), 'utf8');
  const before = "mpEl('mp-modo')?.value !== 'ctf' &&";
  assert.equal(main.split(before).length, 2, 'alvo equivalente único');
  main = main.replace(before, "mpEl('mp-modo')?.value != 'ctf' &&");
  const mainPath = join(dir, 'main.js'), scriptPath = join(dir, 'room-form.mjs');
  writeFileSync(mainPath, main);
  const script = readFileSync(new URL('./operacao-flavio-room-form-check.mjs', import.meta.url), 'utf8');
  const load = "new URL('../../public/js/main.js',import.meta.url)";
  assert.equal(script.split(load).length, 2);
  writeFileSync(scriptPath, script.replace(load, 'new URL('+JSON.stringify(pathToFileURL(mainPath).href)+')'));
  const run = (...args) => spawnSync(process.execPath, [scriptPath, ...args], { encoding: 'utf8', timeout: 15000 });
  const normal = run();
  assert.equal(normal.status, 0, normal.stderr);
  assert.equal((normal.stdout.match(/^ok /gm) || []).length, 11);
  const mutant = run('--mutante=ctf-permitido');
  assert.equal(mutant.status, 1, 'antigo ! node aceitaria esta falha de âncora');
  assert.match(mutant.stderr, /alvo único/);
  assert.equal(provaValida(mutant, 'Mutação aplicada: ctf-permitido', 'FALHA grade exclui seleção incompatível true/2:'), false);
  console.log('✓ onze casos equivalentes passam; falha anterior à mutação é rejeitada');
} finally { rmSync(dir, { recursive: true, force: true }); }
