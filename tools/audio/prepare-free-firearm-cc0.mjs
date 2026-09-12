#!/usr/bin/env node
/* Isola one-shots da Free Firearm Sound Library sem interpretar o áudio com IA.
   A entrada é a pasta `Prepared SFX Library`; ffmpeg detecta silêncio e corta
   deterministicamente um disparo por arma/take. O resultado continua local até
   passar pela escuta humana e pelo ledger de procedência. */
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';

const args = process.argv.slice(2);
const sourceArg = args.find((a) => !a.startsWith('--'));
const outputArg = args.filter((a) => !a.startsWith('--'))[1];
const inspectOnly = args.includes('--inspect');
if (!sourceArg || (!outputArg && !inspectOnly)) {
  console.error('uso: node tools/audio/prepare-free-firearm-cc0.mjs <Prepared SFX Library> <saida> [--inspect]');
  process.exit(2);
}

const SOURCE = resolve(sourceArg);
const OUTPUT = outputArg ? resolve(outputArg) : null;
const ARCHIVE_SHA256 = 'cc1ab5a99a0a365105c7c5dd783f4b0b1fe90938114d3ceec53856bfe005f7d6';
const SOURCE_PAGE = 'https://opengameart.org/content/the-free-firearm-sound-library';
const AUTHORS = ['Ben Jaszczak', 'Brian Nelson', 'Kevin Heras', 'Matthew Nanney'];

const sources = {
  ak47Near: ['AK-47/C_28P.wav', 'AK-47 7.62x39', 'near'],
  ak47Mid: ['AK-47/C_31P.wav', 'AK-47 7.62x39', 'mid'],
  ar15Near: ['AR-15/D_32P.wav', 'AR-15/M4 5.56x45', 'near'],
  ar15Mid: ['AR-15/D_24P.wav', 'AR-15/M4 5.56x45', 'mid'],
  springfieldNear: ['1917/B_24P.wav', 'Springfield 1917 .30-06', 'near'],
  pistol45Near: ['1911/A_42P.wav', '1911 .45', 'near'],
  bersaNear: ['Bersa/F_47P.wav', 'Bersa .380', 'near'],
  m45Near: ['Carl Gustav M45/G_31P.wav', 'Carl Gustav M45 9mm', 'near'],
  marlinNear: ['Marlin 336/I_22P.wav', 'Marlin 336 .30-30', 'near'],
  mosinNear: ['Mosin Nagant/M_21P.wav', 'Mosin Nagant 7.62x54', 'near'],
  ppshNear: ['PPSh/P_30P.wav', 'PPSh 7.62x25', 'near'],
  arisakaNear: ['Arisaka/E_25P.wav', 'Arisaka .30-06', 'near'],
  savageNear: ['Savage 10 .300 Blackout/T_27P.wav', 'Savage 10 .300 Blackout', 'near'],
  sksNear: ['SKS/U_14P.wav', 'Norinco SKS 7.62x39', 'near'],
  sw38Near: ['Smith & Wesson 642/V_27P.wav', 'Smith & Wesson 642 .38', 'near'],
  tikkaNear: ['Tikka/W_29P.wav', 'Tikka T3 .30-06', 'near'],
  model12Mid: ['Model 12/K_17P.wav', 'Winchester Model 12 12 gauge', 'mid'],
  model12Near: ['Model 12/K_22P.wav', 'Winchester Model 12 12 gauge', 'near'],
  mossbergMid: ['Mossberg/N_26P.wav', 'Mossberg Model 190 12 gauge', 'mid'],
  mossbergNear: ['Mossberg/N_30P.wav', 'Mossberg Model 190 12 gauge', 'near'],
  novaMid: ['Nova/O_17P.wav', 'Benelli Nova 12 gauge', 'mid'],
  novaNear: ['Nova/O_21P.wav', 'Benelli Nova 12 gauge', 'near'],
};

/* `match` é deliberadamente honesto: exact = mesma arma/modelo; family = mesma
   família/calibre razoável; proxy = aproximação provisória que exige escuta. */
const mappings = [
  ['akm', 'ak47Near', 0, 'family'], ['m92', 'ak47Near', 1, 'family'],
  ['lmg', 'ak47Mid', 0, 'proxy'],
  ['m4', 'ar15Near', 0, 'family'], ['md97', 'ar15Near', 1, 'family'],
  ['tavor', 'ar15Mid', 0, 'family'], ['famas', 'ar15Mid', 1, 'family'],
  ['scar', 'savageNear', 0, 'proxy'], ['carbine', 'marlinNear', 0, 'family'],
  ['g3', 'springfieldNear', 0, 'family'],
  ['mp5', 'm45Near', 0, 'family'], ['uzi', 'm45Near', 1, 'family'],
  ['p90', 'ppshNear', 0, 'proxy'],
  ['pistol', 'bersaNear', 0, 'family'], ['deagle', 'pistol45Near', 0, 'proxy'],
  ['revolver38', 'sw38Near', 0, 'exact'],
  ['awp', 'tikkaNear', 0, 'proxy'], ['mosin', 'mosinNear', 0, 'exact'],
  ['rem700', 'savageNear', 1, 'family'], ['m400', 'arisakaNear', 0, 'proxy'],
  ['svd', 'sksNear', 0, 'family'], ['g3sg1', 'springfieldNear', 1, 'family'],
  ['sks', 'sksNear', 1, 'exact'],
];
const shotgunCandidates = [
  ['shotgun-01-mossberg-room.wav', 'mossbergMid', 0],
  ['shotgun-02-model12-room.wav', 'model12Mid', 0],
  ['shotgun-03-nova-room.wav', 'novaMid', 0],
  ['shotgun-04-mossberg-near.wav', 'mossbergNear', 0],
  ['shotgun-05-model12-near.wav', 'model12Near', 0],
  ['shotgun-06-nova-near.wav', 'novaNear', 0],
];

const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
function sourcePath(sourceId) {
  const rel = sources[sourceId]?.[0];
  if (!rel) throw new Error(`fonte desconhecida: ${sourceId}`);
  const path = resolve(SOURCE, rel);
  if (!path.startsWith(SOURCE + sep) || !existsSync(path)) throw new Error(`fonte ausente: ${path}`);
  return path;
}
function duration(path) {
  return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nk=1:nw=1', path], { encoding: 'utf8' }).trim());
}
const regionCache = new Map();
function regions(sourceId) {
  if (regionCache.has(sourceId)) return regionCache.get(sourceId);
  const path = sourcePath(sourceId);
  const total = duration(path);
  const probe = spawnSync('ffmpeg', [
    '-hide_banner', '-nostats', '-i', path,
    '-af', 'silencedetect=noise=-35dB:d=0.4', '-f', 'null', '-',
  ], { encoding: 'utf8' });
  if (probe.status !== 0) throw new Error(`ffmpeg falhou em ${path}: ${String(probe.stderr).trim()}`);
  const log = String(probe.stderr || '');
  const events = [...log.matchAll(/silence_(start|end):\s*([0-9.]+)/g)]
    .map((m) => ({ kind: m[1], time: Number(m[2]) }));
  const found = [];
  let start = events[0]?.kind === 'start' && events[0].time < 0.01 ? null : 0;
  for (const event of events) {
    if (event.kind === 'end') start = event.time;
    else if (start !== null && event.time - start >= 0.12) {
      found.push([Math.max(0, start - 0.08), Math.min(total, event.time + 0.12)]);
      start = null;
    }
  }
  if (start !== null && total - start >= 0.12) found.push([Math.max(0, start - 0.08), total]);
  if (!found.length) throw new Error(`nenhum disparo isolável em ${path}`);
  regionCache.set(sourceId, found);
  return found;
}

for (const sourceId of new Set([
  ...mappings.map(([, id]) => id), ...shotgunCandidates.map(([, id]) => id),
])) {
  const [rel, firearm, distance] = sources[sourceId];
  const found = regions(sourceId);
  if (inspectOnly) console.log(`${sourceId}\t${firearm}\t${distance}\t${rel}\t${found.map(([a, b]) => `${a.toFixed(3)}-${b.toFixed(3)}`).join(',')}`);
}
if (inspectOnly) process.exit(0);

mkdirSync(OUTPUT, { recursive: true });
const derived = {};
function make(outputName, sourceId, take, match, gameWeapon) {
  const found = regions(sourceId);
  if (!found[take]) throw new Error(`${sourceId} só tem ${found.length} take(s); pedido ${take + 1}`);
  const input = sourcePath(sourceId);
  const [start, end] = found[take];
  const length = Math.min(2.2, end - start);
  const output = join(OUTPUT, outputName);
  const fadeStart = Math.max(0.1, length - 0.08).toFixed(3);
  execFileSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-ss', start.toFixed(6), '-i', input,
    '-t', length.toFixed(6), '-af', `afade=t=out:st=${fadeStart}:d=0.08`,
    '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', output,
  ]);
  derived[outputName] = {
    gameWeapon, source: sources[sourceId][0], sourceFirearm: sources[sourceId][1],
    distance: sources[sourceId][2], match, take: take + 1,
    trimStartSeconds: Number(start.toFixed(6)), durationSeconds: Number(length.toFixed(6)),
    sourceSha256: sha256(input), sha256: sha256(output),
  };
}

for (const [weapon, sourceId, take, match] of mappings) make(`${weapon}.wav`, sourceId, take, match, weapon);
for (const [name, sourceId, take] of shotgunCandidates) make(name, sourceId, take, 'exact', 'shotgun');

const weaponFiles = Object.fromEntries(mappings.map(([weapon]) => [weapon, [`${weapon}.wav`]]));
weaponFiles.shotgun = [shotgunCandidates[0][0]];
const manifest = {
  version: 1,
  sourcePage: SOURCE_PAGE,
  authors: AUTHORS,
  license: 'CC0-1.0',
  archiveSha256: ARCHIVE_SHA256,
  processing: 'silencedetect -35 dB/0.4 s, 80 ms preroll, 120 ms postroll, max 2.2 s, 80 ms fade-out, stereo PCM s16le 48 kHz; no layering or synthesis',
  approval: 'local-candidates-only',
  preservedWeapon: { ak: 'Fab Gunshot_1-1 remains the only human-approved local source candidate' },
  weapons: weaponFiles,
  weaponCandidates: { shotgun: shotgunCandidates.map(([name]) => name) },
  derived,
};
writeFileSync(join(OUTPUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`FREE-FIREARM-CC0: ${Object.keys(weaponFiles).length} armas, ${Object.keys(derived).length} WAVs em ${OUTPUT}`);
console.log(`manifest: ${join(OUTPUT, 'manifest.json')} (${basename(SOURCE)})`);
