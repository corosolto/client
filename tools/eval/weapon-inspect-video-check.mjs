#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRETA_PACKS, TRETA_WEAPON_SKINS } from '../../public/js/treta-catalog.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mutant = process.argv.find((arg) => arg.startsWith('--mutante='))?.split('=')[1] || null;
const proveMutant = process.argv.includes('--provar-mutante');
const checks = [];
const check = (id, ok, detail) => checks.push({ id, ok: Boolean(ok), detail });

const targets = [
  ...TRETA_WEAPON_SKINS.map((skin) => ({ id: skin.id, weapon: skin.weapon, src: skin.previewVideo, owner: skin.id })),
  ...TRETA_PACKS.flatMap((pack) => Object.entries(pack.weaponSkins).map(([weapon, id]) => ({
    id,
    weapon,
    src: pack.weaponPreviewVideos?.[weapon],
    owner: pack.id,
  }))),
];
if (mutant === 'compartilhado' && targets.length > 1) targets[1].src = targets[0].src;

check('PV1', targets.length === TRETA_WEAPON_SKINS.length + TRETA_PACKS.length * 2,
  `${targets.length} alvos: ${TRETA_WEAPON_SKINS.length} avulsos + ${TRETA_PACKS.length * 2} de packs`);
check('PV2', targets.every(({ id, src }) => src === `/video/weapon-skins/${id}.webm`),
  'cada skin seleciona o vídeo nomeado pelo próprio id');
check('PV3', new Set(targets.map(({ src }) => src)).size === targets.length,
  `${new Set(targets.map(({ src }) => src)).size}/${targets.length} URLs distintas`);

const missing = targets.filter(({ src }) => !src || !existsSync(path.join(ROOT, 'public', src.replace(/^\//, ''))));
check('PV4', missing.length === 0, missing.length ? `ausentes: ${missing.map(({ id }) => id).join(', ')}` : `${targets.length} arquivos presentes`);

const invalidMedia = [];
if (missing.length === 0) {
  for (const target of targets) {
    const file = path.join(ROOT, 'public', target.src.replace(/^\//, ''));
    try {
      const probe = JSON.parse(execFileSync('ffprobe', [
        '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=codec_name,width,height,duration:format=duration',
        '-of', 'json', file,
      ], { encoding: 'utf8' }));
      const stream = probe.streams?.[0];
      const duration = Number.isFinite(Number(stream?.duration)) ? Number(stream.duration) : Number(probe.format?.duration);
      if (stream?.codec_name !== 'vp9' || stream.width !== 960 || stream.height !== 540 || !Number.isFinite(duration) || duration < 2) {
        invalidMedia.push({ id: target.id, stream, duration });
      }
    } catch (error) {
      invalidMedia.push({ id: target.id, error: error.message });
    }
  }
}
check('PV5', missing.length === 0 && invalidMedia.length === 0,
  invalidMedia.length ? JSON.stringify(invalidMedia) : 'VP9 960×540, duração ≥2 s');

const dialogSource = readFileSync(path.join(ROOT, 'src/components/TretaDialogs.astro'), 'utf8');
const storeSource = readFileSync(path.join(ROOT, 'public/js/treta-store.js'), 'utf8');
const generatorSource = readFileSync(path.join(ROOT, 'tools/eval/weapon-inspect-video-capture.mjs'), 'utf8');
check('PV6', !dialogSource.includes('inspect-side.webm'), 'markup não fixa vídeo compartilhado');
check('PV7', storeSource.includes('skin.previewVideo') && storeSource.includes('skin.weaponPreviewVideos'),
  'detalhe escolhe vídeo pelo produto selecionado');
check('PV8', generatorSource.includes('TRETA_WEAPON_SKINS') && generatorSource.includes('TRETA_PACKS') && !generatorSource.includes("id:'trabalho-13-ak'"),
  'gerador percorre catálogos reais, sem fixture de uma skin');

const failed = checks.filter((entry) => !entry.ok);
console.log(JSON.stringify({ pass: failed.length === 0, mutant, targets: targets.length, checks }, null, 2));
if (proveMutant) {
  if (!mutant || failed.length === 0) process.exitCode = 1;
} else if (failed.length) process.exitCode = 1;
