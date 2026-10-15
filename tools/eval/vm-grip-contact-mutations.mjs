#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vm-pegas-'));
try {
  for (const mutation of ['baseline', 'faca-solta', 'ombro', 'trajetoria', 'dedo-solto', 'manga']) {
    const file = path.join(directory, `${mutation}.json`);
    const args = [path.join(import.meta.dirname, 'vm-grip-contact-check.mjs'), ...(mutation === 'baseline' ? ['--baseline'] : [])];
    const run = spawnSync(process.execPath, args, { env: { ...process.env, VM_CONTACT_REPORT: file,
      VM_CONTACT_MUTANT: mutation === 'baseline' ? '' : mutation }, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
    if (run.status !== 1 || !fs.existsSync(file)) throw Error(`${mutation}: não reprovou na régua (${run.status})\n${run.stdout}\n${run.stderr?.slice(0, 500)}`);
    const report = JSON.parse(fs.readFileSync(file, 'utf8'));
    const clauses = Object.entries(report.checks).filter(([, ok]) => !ok).map(([name]) => name);
    const expected = { baseline: ['palma', 'cabo', 'guardaMato'], 'faca-solta': ['contato'], ombro: ['trajetoriaOmbro'], trajetoria: ['trajetoriaOmbro'], 'dedo-solto': ['gatilho', 'somenteDedos'], manga: ['manga'] }[mutation];
    if (report.ok || !expected.every(name => clauses.includes(name))) throw Error(`${mutation}: falhou na cláusula errada (${clauses})`);
    console.log(`PASSA mutante ${mutation}: ${clauses.join(', ')}`);
  }
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
