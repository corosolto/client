#!/usr/bin/env node
// O Ego captura CHARVID.reset/step/grab no renderer real; este CLI só codifica frames.
// Sem --frames imprime URL; --dry-run não grava; saída existente exige --force.
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 && argv[index + 1] && !argv[index + 1].startsWith('--') ? argv[index + 1] : fallback;
};
const flag = (name) => argv.includes(`--${name}`);
const die = (message) => { console.error(`ERRO: ${message}`); process.exit(1); };

/* IDs vêm dos registros reais; não há lista paralela neste gerador. */
globalThis.location ||= { search: '' };
globalThis.localStorage ||= { getItem: () => null };
const { CHARACTERS, charWeapon } = await import('../public/js/characters.js');
const { CHARACTER_RELEASES } = await import('../public/js/data/content-releases.js');
const VALID_IDS = new Set([
  ...CHARACTERS.map((character) => character.id),
  ...Object.keys(CHARACTER_RELEASES),
]);
const IDS = [...VALID_IDS].sort();

if (flag('todos')) {
  if (!flag('dry-run')) die('--todos só lista o roster com --dry-run; batch exige decisão após a fatia vertical');
  console.log(JSON.stringify({ dryRun: true, ids: IDS, writes: [], estimatedCost: 0 }, null, 2));
  process.exit(0);
}
const ID = arg('id');
if (!ID) die('faltou --id (ou --todos --dry-run)');
if (!VALID_IDS.has(ID)) die(`id desconhecido: ${ID} (use um id de CHARACTERS ou CHARACTER_RELEASES)`);

const BG = String(arg('bg', 'alpha')).toLowerCase();
if (!['cena', 'alpha'].includes(BG)) die(`--bg desconhecido: ${BG} (use cena ou alpha)`);
const SHOT = String(arg('shot', BG === 'alpha' ? 'busto' : 'corpo')).toLowerCase();
if (!['busto', 'corpo'].includes(SHOT)) die(`--shot desconhecido: ${SHOT} (use busto ou corpo)`);
const POSE = arg('pose', 'idle');
const FPS = Number(arg('fps', '30'));
if (!Number.isInteger(FPS) || FPS < 1 || FPS > 120) die('--fps deve ser inteiro entre 1 e 120');
const W = Number(arg('w', BG === 'alpha' ? '512' : '1280'));
const H = Number(arg('h', BG === 'alpha' ? '512' : '720'));
if (!Number.isInteger(W) || !Number.isInteger(H) || W < 1 || H < 1) die('--w/--h inválidos');
const SPIN = Number(arg('spin', '0'));
const MAP = arg('map', 'loja_h');
const BASE = arg('base', process.env.BASE || 'http://localhost:8123');
const OUT = arg('out', 'public/video/chars');
const OUT_FILE = arg('out-file');
const FRAMES = arg('frames');
const SECS = arg('secs');
const WPN = arg('wpn', charWeapon(ID));
const dryRun = flag('dry-run');

function captureUrl() {
  const query = new URLSearchParams({
    id: ID, bg: BG, shot: SHOT, w: String(W), h: String(H), fps: String(FPS),
    pose: POSE, spin: String(SPIN), map: MAP, wpn: WPN,
  });
  return `${BASE.replace(/\/$/, '')}/charvideo.html?${query}`;
}

const target = OUT_FILE || `${OUT}/${ID}-${BG}-${SHOT}.webm`;
const plan = {
  id: ID, bg: BG, shot: SHOT, pose: POSE, weapon: WPN, fps: FPS, width: W, height: H,
  frames: FRAMES || null, captureUrl: captureUrl(), output: target,
  source: 'Ego CHARVID → public/js/glbchars.js → Studio/legacy model path',
};
if (dryRun) {
  console.log(JSON.stringify({ dryRun: true, ...plan, writes: [], estimatedCost: 0 }, null, 2));
  process.exit(0);
}
if (!FRAMES) {
  console.log(captureUrl());
  process.exit(0);
}
if (!existsSync(FRAMES)) die(`pasta de frames não existe: ${FRAMES}`);

const frameFiles = readdirSync(FRAMES)
  .filter((name) => /^\d{4}\.png$/i.test(name))
  .sort();
if (!frameFiles.length) die(`nenhum frame PNG %04d em ${FRAMES}`);
for (let i = 0; i < frameFiles.length; i++) {
  const expected = `${String(i).padStart(4, '0')}.png`;
  if (frameFiles[i] !== expected) die(`frames não contíguos: esperado ${expected}, achei ${frameFiles[i]}`);
}
if (SECS !== null) {
  const seconds = Number(SECS);
  if (!Number.isFinite(seconds) || seconds <= 0) die('--secs deve ser positivo');
  const expected = Math.max(1, Math.round(seconds * FPS));
  if (frameFiles.length !== expected) die(`--secs=${seconds} exige ${expected} frames, achei ${frameFiles.length}`);
}

if (existsSync(target) && !flag('force')) die(`saída já existe: ${target}; use --force para substituir`);
mkdirSync(dirname(target), { recursive: true });
const inputPattern = `${FRAMES}/%04d.png`;
const common = ['-y', '-framerate', String(FPS), '-i', inputPattern, '-an'];
const ext = target.toLowerCase().slice(target.lastIndexOf('.'));
if (BG === 'alpha' || ext === '.webm') {
  execFileSync('ffmpeg', [...common, '-c:v', 'libvpx-vp9', '-pix_fmt', BG === 'alpha' ? 'yuva420p' : 'yuv420p', '-b:v', '0', '-crf', '34', target], { stdio: 'pipe' });
} else if (ext === '.mp4') {
  execFileSync('ffmpeg', [...common, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', '-preset', 'slow', '-movflags', '+faststart', target], { stdio: 'pipe' });
} else {
  die('--out-file precisa terminar em .webm ou .mp4');
}
console.log(JSON.stringify({ ...plan, frames: frameFiles.length, output: target }, null, 2));
