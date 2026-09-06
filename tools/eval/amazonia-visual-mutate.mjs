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
  ['AMZ5', 'arvoreNoAcesso.z = 21.5', 'arvoreNoAcesso.z = 22.7'],
  ['MAP6', 'for (const ladoGuarda of [-1, 1])', 'for (const ladoGuarda of [])'],
  ['AMV1', 'PONTE_Y = 0.18', 'PONTE_Y = -0.20'],
  ['AMV2', 'p.setY(i, margemY(p.getX(i)))', 'p.setY(i, RIO_FUNDO)'],
  ['AMV7', 'const DECK_Y = 2.3', 'const DECK_Y = 1.8'],
  ['AMV5', 'for (const side of [-1, 1]) {\n    const x = side * 15', 'for (const side of []) {\n    const x = side * 15'],
  ['AMV6', 'Math.abs(x) < aguaMeiaLargura', 'Math.abs(x) <= RIO_MEIA_LARGURA + 0.6'],
  ['AMV3', '  // Horizonte usa o mesmo molde', '  addBox(6.2, 9, 2.4, matMata, 30, 0, 42);\n  // Horizonte usa o mesmo molde'],
];
try {
  for (const [id, from, to] of cases) {
    if (original.split(from).length !== 2) throw new Error(`${id}: alvo não é único`);
    const mutated = original.replace(from, to);
    writeFileSync(source, mutated);
    const args = id === 'AMV4'
      ? ['tools/eval/amazonia-visual-capture.mjs', `${out}/roots`, '--checks-only']
      : id === 'AMZ5' ? ['tools/eval/amazonia-check.mjs'] : id === 'MAP6' ? ['tools/eval/map-check.mjs','amazonia'] : ['tools/eval/amazonia-surface-check.mjs'];
    const result = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 900000, maxBuffer: 2e6 });
    const log = `${result.stdout || ''}\n${result.stderr || ''}`;
    writeFileSync(`${out}/${id}.log`, log);
    const failed = [...log.matchAll(id === 'AMZ5' ? /^\s*FALHA\s+(AMZ5)\b/gm : id === 'MAP6' ? /^(MAP6) FALHA/gm : /^FAIL (AMV\d)\b/gm)].map(m => m[1]);
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
