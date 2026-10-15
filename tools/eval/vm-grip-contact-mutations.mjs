#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const scoped = process.argv.includes('--revolver-only'), scope = scoped ? ['--revolver-only'] : [];
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vm-pegas-'));
try {
  const control = path.join(directory, 'control.json');
  const run = spawnSync(process.execPath, [path.join(import.meta.dirname, 'vm-grip-contact-check.mjs'), ...scope], {
    env: { ...process.env, VM_CONTACT_REPORT: control, VM_CONTACT_MUTANT: '' }, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024,
  });
  if (run.status !== 0 || !fs.existsSync(control) || !JSON.parse(fs.readFileSync(control, 'utf8')).ok) {
    throw Error('controle atual vermelho: mutantes não certificam a correção pendente da #991');
  }
  for (const mutation of (scoped ? ['baseline', 'dedo-solto', 'ads-grip', 'ads-pop', 'ads-time', 'ads-scale'] : ['baseline', 'faca-solta', 'ombro', 'trajetoria', 'dedo-solto', 'manga', 'ads-grip', 'ads-pop', 'ads-time', 'ads-scale'])) {
    const file = path.join(directory, `${mutation}.json`);
    const args = [path.join(import.meta.dirname, 'vm-grip-contact-check.mjs'), ...scope, ...(mutation === 'baseline' ? ['--baseline'] : [])];
    const run = spawnSync(process.execPath, args, { env: { ...process.env, VM_CONTACT_REPORT: file,
      VM_CONTACT_MUTANT: mutation === 'baseline' ? '' : mutation }, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
    if (run.status !== 1 || !fs.existsSync(file)) throw Error(`${mutation}: não reprovou na régua (${run.status})\n${run.stdout}\n${run.stderr?.slice(0, 500)}`);
    const report = JSON.parse(fs.readFileSync(file, 'utf8'));
    const clauses = Object.entries(report.checks).filter(([, ok]) => !ok).map(([name]) => name);
    const expected = { baseline: scoped ? ['guardaMato'] : ['palma', 'cabo', 'guardaMato'], 'faca-solta': ['contato'], ombro: ['tracksProtegidos'], trajetoria: ['tracksProtegidos'], 'dedo-solto': ['gatilho', 'somenteDedos'], manga: ['manga'], 'ads-grip': ['guardaMato'], 'ads-pop': ['extremosADS'], 'ads-time': ['relogio'], 'ads-scale': ['escalaMao'] }[mutation];
    if (report.ok || !expected.every(name => clauses.includes(name))) throw Error(`${mutation}: falhou na cláusula errada (${clauses})`);
    console.log(`PASSA mutante ${mutation}: ${clauses.join(', ')}`);
  }
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
