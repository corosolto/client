#!/usr/bin/env node
/*
 * Pré-voo de procedência de áudio.
 *
 * O manifesto responde "o que toca"; este arquivo responde "de onde pode vir".
 * Ele não copia, gera, apaga nem edita manifestos. Execute sobre uma pasta de
 * preparação antes de ela tocar em public/audio, e de novo no áudio instalado.
 *
 * Uso:
 *   node tools/audio-provenance.mjs --root /caminho/para/audio --strict
 *   node tools/audio-provenance.mjs --root public/audio --report
 *   node tools/audio-provenance.mjs --root public/audio --strict --require-weapons
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, relative, join, posix } from 'node:path';

const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|webm)$/i;
const BEGIN = '<!-- AUDIO-PROVENANCE:BEGIN -->';
const END = '<!-- AUDIO-PROVENANCE:END -->';
const SOURCE_KINDS = new Set(['original-generation', 'recorded-in-house', 'licensed-library', 'cc0']);

function args(argv) {
  const value = (name) => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : null;
  };
  return {
    root: value('--root') || 'public/audio',
    strict: argv.includes('--strict'),
    report: argv.includes('--report'),
    requireWeapons: argv.includes('--require-weapons'),
  };
}

function walkAudio(root, dir = '') {
  const absolute = join(root, dir);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute).flatMap((name) => {
    if (name.startsWith('.')) return [];
    const next = join(dir, name);
    const full = join(root, next);
    if (statSync(full).isDirectory()) return walkAudio(root, next);
    return AUDIO_EXT.test(name) ? [next.split('\\').join('/')] : [];
  }).sort();
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function loadLedger(root, folder, problems) {
  const file = join(root, folder, 'SOURCES.md');
  if (!existsSync(file)) {
    problems.push(`${folder}/SOURCES.md ausente`);
    return { file, assets: [] };
  }
  const source = readFileSync(file, 'utf8');
  const start = source.indexOf(BEGIN);
  const end = source.indexOf(END);
  if (start < 0 || end < 0 || end <= start) {
    problems.push(`${folder}/SOURCES.md precisa conter os marcadores AUDIO-PROVENANCE`);
    return { file, assets: [] };
  }
  const json = source.slice(start + BEGIN.length, end).replace(/^\s*```json\s*/i, '').replace(/\s*```\s*$/i, '');
  try {
    const parsed = JSON.parse(json);
    if (parsed.schema !== 1 || !Array.isArray(parsed.assets)) {
      problems.push(`${folder}/SOURCES.md: schema deve ser 1 e assets deve ser uma lista`);
      return { file, assets: [] };
    }
    return { file, assets: parsed.assets };
  } catch (error) {
    problems.push(`${folder}/SOURCES.md contém JSON inválido: ${error.message}`);
    return { file, assets: [] };
  }
}

function required(record, fields, label, problems) {
  for (const field of fields) if (record[field] === undefined || record[field] === null || record[field] === '') {
    problems.push(`${label}: campo obrigatório ausente: ${field}`);
  }
}

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)?$/.test(value);
}

function validateRecord(record, expectedPrefix, root, label, problems, warnings) {
  required(record, ['path', 'kind', 'sha256', 'commercialUse', 'rightsBasis'], label, problems);
  if (typeof record.path !== 'string' || !record.path.startsWith(expectedPrefix) || !AUDIO_EXT.test(record.path)) {
    problems.push(`${label}: path deve apontar para ${expectedPrefix} e ter extensão de áudio`);
    return;
  }
  if (!/^[a-f0-9]{64}$/i.test(record.sha256 || '')) problems.push(`${label}: sha256 deve ter 64 hexadecimais`);
  if (record.commercialUse !== true) problems.push(`${label}: commercialUse precisa ser true antes de distribuição monetizada`);
  if (record.kind === 'generated') {
    required(record, ['provider', 'model', 'accountPlan', 'generatedAt', 'generationId', 'termsUrl'], label, problems);
    if (!isIsoDate(record.generatedAt)) problems.push(`${label}: generatedAt deve ser YYYY-MM-DD ou timestamp ISO em UTC`);
  } else if (record.kind === 'procured') {
    required(record, ['provider', 'sourceUrl', 'license', 'acquiredAt', 'licenseEvidence'], label, problems);
    if (!isIsoDate(record.acquiredAt)) problems.push(`${label}: acquiredAt deve ser YYYY-MM-DD ou timestamp ISO em UTC`);
  } else {
    problems.push(`${label}: kind deve ser generated ou procured`);
  }
  const file = join(root, record.path);
  if (!existsSync(file)) problems.push(`${label}: arquivo declarado não existe: ${record.path}`);
  else if (record.sha256 && sha256(file) !== record.sha256.toLowerCase()) problems.push(`${label}: hash não corresponde ao arquivo atual`);
  if (record.termsUrl && !/^https:\/\//.test(record.termsUrl)) warnings.push(`${label}: termsUrl não parece URL HTTPS`);
}

function loadTracks(root, problems) {
  const file = join(root, 'menu-music', 'TRACKS.txt');
  if (!existsSync(file)) {
    problems.push('menu-music/TRACKS.txt ausente');
    return new Map();
  }
  const map = new Map();
  for (const [index, raw] of readFileSync(file, 'utf8').split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(m\d+\.mp3)\s*<-\s*(soundtrack\/[a-z0-9][a-z0-9._-]*\.mp3)$/i);
    if (!match) {
      problems.push(`menu-music/TRACKS.txt:${index + 1}: use "mNN.mp3 <- soundtrack/faixa.mp3"`);
      continue;
    }
    if (map.has(match[1])) problems.push(`menu-music/TRACKS.txt:${index + 1}: ${match[1]} foi mapeado duas vezes`);
    map.set(match[1], match[2]);
  }
  return map;
}

function collectManifestPaths(value, output = new Set()) {
  if (typeof value === 'string' && value.startsWith('audio/')) output.add(value.slice('audio/'.length));
  else if (Array.isArray(value)) value.forEach((item) => collectManifestPaths(item, output));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => collectManifestPaths(item, output));
  return output;
}

export function auditAudioProvenance({ root: rootInput = 'public/audio', strict = false, requireWeapons = false } = {}) {
  const root = resolve(rootInput);
  const problems = [];
  const warnings = [];
  if (!existsSync(root)) return { root, problems: [`diretório de áudio não existe: ${root}`], warnings, summary: {} };

  const soundtrack = walkAudio(root, 'soundtrack');
  const menu = walkAudio(root, 'menu-music');
  const weapons = walkAudio(root, 'weapons');
  const soundtrackLedger = loadLedger(root, 'soundtrack', problems);
  const weaponLedger = loadLedger(root, 'weapons', problems);
  const soundtrackRecords = new Map();
  const weaponRecords = new Map();

  for (const record of soundtrackLedger.assets) {
    const label = `soundtrack/SOURCES.md (${record.path || 'sem path'})`;
    if (soundtrackRecords.has(record.path)) problems.push(`${label}: path duplicado no ledger`);
    soundtrackRecords.set(record.path, record);
    validateRecord(record, 'soundtrack/', root, label, problems, warnings);
  }
  for (const record of weaponLedger.assets) {
    const label = `weapons/SOURCES.md (${record.path || 'sem path'})`;
    if (weaponRecords.has(record.path)) problems.push(`${label}: path duplicado no ledger`);
    weaponRecords.set(record.path, record);
    validateRecord(record, 'weapons/', root, label, problems, warnings);
    if (!SOURCE_KINDS.has(record.sourceKind)) problems.push(`${label}: sourceKind deve ser um de ${[...SOURCE_KINDS].join(', ')}`);
    if (/\b(cs|counter[ -]?strike|valve|ripped?|extracted?)\b/i.test(String(record.sourceKind || '') + ' ' + String(record.rightsBasis || ''))) {
      problems.push(`${label}: arma não pode ter origem derivada de Counter-Strike/Valve`);
    }
  }

  for (const file of soundtrack) if (!soundtrackRecords.has(file)) problems.push(`sem procedência para ${file}`);
  for (const file of soundtrackRecords.keys()) if (!soundtrack.includes(file)) problems.push(`ledger aponta arquivo fora do lote: ${file}`);
  for (const file of weapons) if (!weaponRecords.has(file)) problems.push(`sem procedência para ${file}`);
  for (const file of weaponRecords.keys()) if (!weapons.includes(file)) problems.push(`ledger aponta arquivo fora do lote: ${file}`);

  // Em checkout limpo o pacote de áudio ainda não foi baixado. Relatório deve
  // dizer "aguardando lote", não fingir que um TRACKS inexistente é uma falha
  // de um menu que também não existe; no pré-voo estrito a ausência do menu já
  // reprova abaixo.
  const tracks = menu.length ? loadTracks(root, problems) : new Map();
  for (const file of menu) {
    const name = posix.basename(file);
    if (!/^m\d+\.mp3$/i.test(name)) problems.push(`menu-music aceita apenas mNN.mp3; encontrado ${file}`);
    const source = tracks.get(name);
    if (!source) problems.push(`menu ${name} não tem origem em TRACKS.txt`);
    else if (!soundtrack.includes(source)) problems.push(`menu ${name} aponta fonte ausente: ${source}`);
  }
  for (const [menuFile, source] of tracks) {
    if (!menu.includes(`menu-music/${menuFile}`)) problems.push(`TRACKS.txt mapeia ${menuFile}, mas esse arquivo não existe`);
    if (!soundtrack.includes(source)) problems.push(`TRACKS.txt aponta trilha ausente: ${source}`);
  }

  if (strict && soundtrack.length === 0) problems.push('pré-voo estrito exige ao menos uma faixa em soundtrack/');
  if (strict && menu.length === 0) problems.push('pré-voo estrito exige ao menos uma derivação em menu-music/');
  if (requireWeapons && weapons.length === 0) problems.push('pré-voo exigiu armas, mas weapons/ não tem alternativa aprovada');

  let orphans = null;
  const manifest = join(root, 'manifest.json');
  if (existsSync(manifest)) {
    try {
      const referenced = collectManifestPaths(JSON.parse(readFileSync(manifest, 'utf8')));
      const all = walkAudio(root);
      orphans = all.filter((file) => !referenced.has(file));
    } catch (error) { problems.push(`manifest.json inválido: ${error.message}`); }
  }
  return {
    root,
    problems: [...new Set(problems)],
    warnings: [...new Set(warnings)],
    summary: {
      soundtrack: soundtrack.length,
      menu: menu.length,
      weapons: weapons.length,
      soundtrackLedger: soundtrackRecords.size,
      weaponLedger: weaponRecords.size,
      orphans,
    },
  };
}

function print(result) {
  const { summary } = result;
  console.log(`ÁUDIO-PROCEDÊNCIA  ${relative(process.cwd(), result.root) || '.'}`);
  console.log(`  soundtrack ${summary.soundtrack ?? 0} · menu ${summary.menu ?? 0} · armas ${summary.weapons ?? 0}`);
  console.log(`  ledger trilha ${summary.soundtrackLedger ?? 0} · ledger armas ${summary.weaponLedger ?? 0}`);
  if (summary.orphans === null) console.log('  órfãos: manifest.json ausente — não medidos');
  else if (!summary.orphans.length) console.log('  ✓ órfãos: nenhum');
  else {
    console.log(`  ⚠ órfãos antes de qualquer remoção: ${summary.orphans.length}`);
    summary.orphans.forEach((file) => console.log(`     ${file}`));
  }
  result.warnings.forEach((warning) => console.log(`  ⚠ ${warning}`));
  result.problems.forEach((problem) => console.error(`  ✗ ${problem}`));
  console.log(result.problems.length ? `\n✗ pré-voo reprovado: ${result.problems.length} problema(s)` : '\n✓ procedência e derivação conferidas');
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  const options = args(process.argv.slice(2));
  const result = auditAudioProvenance(options);
  print(result);
  if (result.problems.length || (options.strict && result.warnings.length)) process.exit(1);
}
