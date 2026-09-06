// Muta o builder real, executa a régua em processo novo e restaura em finally.
// Não executar enquanto outra captura usa este checkout/servidor.
import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const source = 'public/js/map_amazonia.js';
const out = 'artifacts/amazonia-visual/mutations';
mkdirSync(out, { recursive: true });
const lock = `${out}/running.lock`;
writeFileSync(lock, `${process.pid}`, { flag: 'wx' });
const original = readFileSync(source, 'utf8');
const hash = s => createHash('sha256').update(s).digest('hex');
const cases = process.argv.includes('--browser') ? [
  ['AMV4', 'const scale = r > radius ?', 'const scale = true ? 1 : r > radius ?'],
] : [
  ['AMV1', 'PONTE_Y = 0.18', 'PONTE_Y = -0.20'],
  ['AMV2', 'p.setY(i, margemY(p.getX(i)))', 'p.setY(i, RIO_FUNDO)'],
  ['AMV5', 'for (const side of [-1, 1]) {\n    const x = side * 15', 'for (const side of []) {\n    const x = side * 15'],
  ['AMV6', 'Math.abs(x) < aguaMeiaLargura', 'Math.abs(x) <= RIO_MEIA_LARGURA + 0.6'],
  ['AMV3', '  PBF.build(root);', '  PBF.build(root);\n  addBox(6.2, 9, 2.4, matMata, 30, 0, 42);'],
];
try {
  for (const [id, from, to] of cases) {
    if (original.split(from).length !== 2) throw new Error(`${id}: alvo não é único`);
    const mutated = original.replace(from, to);
    writeFileSync(source, mutated);
    const args = id === 'AMV4'
      ? ['tools/eval/amazonia-visual-capture.mjs', `${out}/roots`, '--checks-only']
      : ['tools/eval/amazonia-surface-check.mjs'];
    const result = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 900000, maxBuffer: 2e6 });
    const log = `${result.stdout || ''}\n${result.stderr || ''}`;
    writeFileSync(`${out}/${id}.log`, log);
    const failed = [...log.matchAll(/^FAIL (AMV\d)\b/gm)].map(m => m[1]);
    const ok = result.status === 1 && failed.length === 1 && failed[0] === id;
    console.log(`${ok ? 'PASS' : 'FAIL'} mutante real ${id}: exit=${result.status}, cláusulas=${failed}, sha256=${hash(mutated)}`);
    if (!ok) process.exitCode = 1;
    writeFileSync(source, original);
  }
} finally {
  writeFileSync(source, original);
  unlinkSync(lock);
  console.log(`RESTAURADO sha256=${hash(readFileSync(source))}`);
}
