#!/usr/bin/env node
/* Testa a trava de procedência com um lote sintético e duas mutações reais. */
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { auditAudioProvenance } from '../audio-provenance.mjs';

const temp = mkdtempSync(join(tmpdir(), 'coro-solto-audio-provenance-'));
const hash = (file) => createHash('sha256').update(Buffer.from(file)).digest('hex');
const ledger = (assets) => `${'<!-- AUDIO-PROVENANCE:BEGIN -->'}\n\`\`\`json\n${JSON.stringify({ schema: 1, assets }, null, 2)}\n\`\`\`\n${'<!-- AUDIO-PROVENANCE:END -->'}\n`;
const fail = (message) => { console.error(`✗ AUDIO-PROVENANCE ${message}`); process.exitCode = 1; };

try {
  mkdirSync(join(temp, 'soundtrack'), { recursive: true });
  mkdirSync(join(temp, 'menu-music'), { recursive: true });
  mkdirSync(join(temp, 'weapons'), { recursive: true });
  writeFileSync(join(temp, 'soundtrack', 'teste-original.mp3'), 'musica-original');
  writeFileSync(join(temp, 'menu-music', 'm01.mp3'), 'menu-derivado');
  writeFileSync(join(temp, 'weapons', 'rifle-original.mp3'), 'sfx-original');
  writeFileSync(join(temp, 'menu-music', 'TRACKS.txt'), 'm01.mp3 <- soundtrack/teste-original.mp3\n');
  writeFileSync(join(temp, 'soundtrack', 'SOURCES.md'), ledger([{
    path: 'soundtrack/teste-original.mp3', kind: 'generated', provider: 'Teste', model: 'Teste 1',
    accountPlan: 'Plano comercial', generatedAt: '2026-08-22', generationId: 'teste-001',
    termsUrl: 'https://example.test/terms', commercialUse: true, rightsBasis: 'termos conferidos',
    sha256: hash('musica-original'),
  }]));
  const weapon = {
    path: 'weapons/rifle-original.mp3', kind: 'procured', provider: 'Biblioteca teste',
    sourceUrl: 'https://example.test/rifle', license: 'CC0', acquiredAt: '2026-08-22',
    licenseEvidence: 'https://example.test/license', commercialUse: true, rightsBasis: 'CC0 conferida',
    sourceKind: 'cc0', sha256: hash('sfx-original'),
  };
  writeFileSync(join(temp, 'weapons', 'SOURCES.md'), ledger([weapon]));

  const green = auditAudioProvenance({ root: temp, strict: true, requireWeapons: true });
  if (green.problems.length) fail(`lote válido reprovou: ${green.problems.join(' | ')}`);

  writeFileSync(join(temp, 'menu-music', 'TRACKS.txt'), 'm01.mp3 <- soundtrack/inexistente.mp3\n');
  const badMenu = auditAudioProvenance({ root: temp, strict: true });
  if (!badMenu.problems.some((problem) => problem.includes('fonte ausente'))) fail('mutação de menu não foi detectada');

  writeFileSync(join(temp, 'menu-music', 'TRACKS.txt'), 'm01.mp3 <- soundtrack/teste-original.mp3\n');
  weapon.sourceKind = 'cs-derived';
  writeFileSync(join(temp, 'weapons', 'SOURCES.md'), ledger([weapon]));
  const badWeapon = auditAudioProvenance({ root: temp, strict: true, requireWeapons: true });
  if (!badWeapon.problems.some((problem) => problem.includes('sourceKind deve ser')) || !badWeapon.problems.some((problem) => problem.includes('Counter-Strike/Valve'))) {
    fail('mutação de origem CS não foi detectada');
  }
  if (!process.exitCode) console.log('✓ AUDIO-PROVENANCE contrato verde; mutações de menu e origem CS reprovadas');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
