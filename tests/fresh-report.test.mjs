import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { freshReport } from '../tools/eval/fresh-report.mjs';

test('relatório versionado não mascara auditor interrompido', () => {
  const dir = mkdtempSync(join(tmpdir(), 'map-audit-fresh-'));
  const path = join(dir, 'map_check.json');
  try {
    writeFileSync(path, JSON.stringify({ mapas: [{ map: 'resultado-antigo' }] }));
    const interrupted = freshReport(path, () => '__ERRO__ timeout');
    assert.equal(interrupted.data, null);
    assert.match(interrupted.error, /timeout/);
    assert.equal(existsSync(path), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('relatório novo é lido mesmo quando o auditor aponta dívida de mapa', () => {
  const dir = mkdtempSync(join(tmpdir(), 'map-audit-fresh-'));
  const path = join(dir, 'map_check.json');
  try {
    const result = freshReport(path, () => {
      writeFileSync(path, JSON.stringify({ mapas: [{ map: 'corrego', piorRotas: 1 }] }));
      return '__ERRO__ saída 1 por dívida MAP1/MAP6';
    });
    assert.equal(result.error, null);
    assert.equal(result.data.mapas[0].piorRotas, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('relatório novo inválido não vira dado de geometria', () => {
  const dir = mkdtempSync(join(tmpdir(), 'map-audit-fresh-'));
  const path = join(dir, 'map_check.json');
  try {
    const result = freshReport(path, () => {
      writeFileSync(path, '{');
      return '';
    });
    assert.equal(result.data, null);
    assert.match(result.error, /relatório novo inválido/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
