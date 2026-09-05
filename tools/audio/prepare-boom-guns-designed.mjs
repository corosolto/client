#!/usr/bin/env node
/* Separa os quatro one-shots de cada WAV do BOOM GUNS Designed por silêncio.
   O processamento é local e determinístico; os derivados ficam fora do Git. */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';

const args = process.argv.slice(2);
const positional = args.filter((arg) => !arg.startsWith('--'));
const inspectOnly = args.includes('--inspect');
if (!positional[0] || (!positional[1] && !inspectOnly)) {
  console.error('uso: node tools/audio/prepare-boom-guns-designed.mjs <GUNS Designed extraído> <saída> [--inspect]');
  process.exit(2);
}

const SOURCE = resolve(positional[0]);
const OUTPUT = positional[1] ? resolve(positional[1]) : null;
const ARCHIVE_SHA256 = 'ad47c32d9b82c932c52169b30ab0e038c2d7a7228a3bf21c13fa821807ee76aa';
const SOURCE_PAGE = 'https://www.boomlibrary.com/sound-effects/gun-sounds/';
const EULA = join(SOURCE, '00_BOOM-Library-EULA-2022.pdf');
const METADATA = join(SOURCE, '00_Guns_DS_Metadata.xlsx');
for (const path of [SOURCE, EULA, METADATA]) {
  if (!existsSync(path)) throw new Error(`entrada BOOM incompleta: ${path}`);
}

const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const duration = (path) => Number(execFileSync('ffprobe', [
  '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=duration',
  '-of', 'default=nk=1:nw=1', path,
], { encoding: 'utf8' }).trim());
const slug = (value) => value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function shotOnsets(path) {
  const total = duration(path);
  const rate = 8000;
  const pcm = execFileSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-i', path, '-map', '0:a:0',
    '-ac', '1', '-ar', String(rate), '-f', 'f32le', '-',
  ], { maxBuffer: 64 * 1024 * 1024 });
  const samples = new Float32Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 4));
  const window = Math.round(rate * 0.04);
  const hop = Math.round(rate * 0.01);
  const candidates = [];
  for (let start = 0; start + window <= samples.length; start += hop) {
    let energy = 0;
    for (let i = start; i < start + window; i += 1) energy += samples[i] * samples[i];
    candidates.push({ time: start / rate, energy: energy / window });
  }
  /* O ataque do tiro é o pico de energia. Caudas desenhadas podem reaparecer
     após silêncio, por isso selecionamos quatro picos fortes separados no tempo. */
  const selected = [];
  for (const candidate of candidates.sort((a, b) => b.energy - a.energy)) {
    if (selected.every((time) => Math.abs(candidate.time - time) >= 1.8)) selected.push(candidate.time);
    if (selected.length === 4) break;
  }
  selected.sort((a, b) => a - b);
  if (selected.length !== 4) {
    throw new Error(`${basename(path)}: esperava 4 one-shots, detectei ${selected.length} (${selected.map((n) => n.toFixed(3)).join(', ')})`);
  }
  return { total, onsets: selected };
}

const pattern = /^GUN(Pis|Rif|Shotg)_(.+?) 4x Single ?Shots (bright|crispy|huge|light|natural)_B00M_GUDS\.wav$/;
const inputs = readdirSync(SOURCE).filter((name) => pattern.test(name)).sort();
if (!inputs.length) throw new Error(`nenhum WAV 4x SingleShots encontrado em ${SOURCE}`);

const recordings = {};
const derived = {};
for (const name of inputs) {
  const [, category, sourceWeapon, style] = name.match(pattern);
  const sourceId = slug(sourceWeapon);
  const input = resolve(SOURCE, name);
  if (!input.startsWith(SOURCE + sep)) throw new Error(`caminho BOOM fora da raiz: ${input}`);
  const { total, onsets } = shotOnsets(input);
  recordings[sourceId] ||= { sourceWeapon, category, styles: {} };
  recordings[sourceId].styles[style] = [];
  if (inspectOnly) {
    console.log(`${sourceId}\t${style}\t${onsets.map((n) => n.toFixed(3)).join(',')}\t${name}`);
    continue;
  }
  mkdirSync(OUTPUT, { recursive: true });
  for (let index = 0; index < onsets.length; index += 1) {
    const start = Math.max(0, onsets[index] - 0.04);
    const untilNext = index + 1 < onsets.length ? onsets[index + 1] - start - 0.15 : total - start;
    const length = Math.min(2.8, untilNext);
    if (length < 0.2) throw new Error(`${name}: região ${index + 1} curta demais (${length})`);
    const outputName = `${sourceId}-${style}-${String(index + 1).padStart(2, '0')}.wav`;
    const output = join(OUTPUT, outputName);
    const fadeStart = Math.max(0.1, length - 0.05).toFixed(3);
    execFileSync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', '-ss', start.toFixed(6), '-i', input,
      '-map', '0:a:0', '-t', length.toFixed(6), '-af', `afade=t=out:st=${fadeStart}:d=0.05`,
      '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', output,
    ]);
    recordings[sourceId].styles[style].push(outputName);
    derived[outputName] = {
      source: name, sourceWeapon, category, style, take: index + 1,
      trimStartSeconds: Number(start.toFixed(6)), durationSeconds: Number(length.toFixed(6)),
      sourceSha256: sha256(input), sha256: sha256(output),
    };
  }
}
if (inspectOnly) {
  console.log(`BOOM-GUNS-DESIGNED-INSPECT: ${inputs.length} WAVs com quatro regiões.`);
  process.exit(0);
}

const mappings = {
  ak: [['ak47-v1'], 'exact'], akm: [['ak47-v2'], 'family'], m92: [['ak47-v2'], 'family'],
  lmg: [['ak47-v2'], 'proxy'], m4: [['m4-v1'], 'exact'], md97: [['m4-v2'], 'family'],
  tavor: [['m4-v2'], 'proxy'], famas: [['m4-v2'], 'proxy'], scar: [['m4-v2'], 'proxy'],
  carbine: [['ruger-1022'], 'family'], g3: [['dragunov-psl'], 'proxy'],
  mp5: [['gsg5'], 'proxy'], pistol: [['beretta-m9'], 'family'], deagle: [['fnh-fnp45'], 'proxy'],
  revolver38: [['sandw-model66'], 'family'], awp: [['mosinnagant'], 'proxy'],
  mosin: [['mosinnagant'], 'exact'], rem700: [['dragunov-psl'], 'proxy'],
  m400: [['mosinnagant'], 'proxy'], svd: [['dragunov-psl'], 'family'],
  g3sg1: [['dragunov-psl'], 'proxy'], sks: [['sks-m59'], 'exact'],
  shotgun: [['ithaca-m37', 'maverick88', 'maverick88fm', 'winchester1300'], 'family'],
};
const weapons = {};
for (const [weapon, [sourceIds, match]] of Object.entries(mappings)) {
  const missing = sourceIds.filter((id) => !recordings[id]);
  if (missing.length) throw new Error(`${weapon}: gravações BOOM ausentes: ${missing.join(', ')}`);
  const styleNames = [...new Set(sourceIds.flatMap((id) => Object.keys(recordings[id].styles)))].sort();
  const styles = Object.fromEntries(styleNames.map((style) => [
    style, sourceIds.flatMap((id) => recordings[id].styles[style] || []),
  ]));
  weapons[weapon] = {
    defaultStyle: 'huge', match, sourceWeapons: sourceIds.map((id) => recordings[id].sourceWeapon), styles,
  };
}

const manifest = {
  version: 1, product: 'BOOM Library GUNS Designed', sourcePage: SOURCE_PAGE,
  license: 'BOOM-MEDIA-LICENSE-2022', licenseProofRequiredForRelease: true,
  permittedUse: 'private audition and embedding as audio material in an audiovisual game production',
  prohibitedUse: 'standalone redistribution, audio-only product, AI or machine-learning training',
  aiUse: false, approval: 'local-candidates-only', archiveSha256: ARCHIVE_SHA256,
  eulaSha256: sha256(EULA), metadataSha256: sha256(METADATA),
  processing: 'four one-shots isolated by silence onsets; 40 ms preroll, max 2.8 s, 50 ms fade-out, stereo PCM s16le 48 kHz; no layering, EQ, pitch or synthesis',
  recordings, weapons, derived,
};
writeFileSync(join(OUTPUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`BOOM-GUNS-DESIGNED: ${Object.keys(weapons).length} armas do jogo, ${Object.keys(derived).length} WAVs em ${OUTPUT}`);
console.log(`sem mapeamento BOOM: uzi, p90; continuam no pack base durante o A/B.`);
