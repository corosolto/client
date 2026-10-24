#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, link, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => {
  if (value.startsWith('--') && all[index + 1] && !all[index + 1].startsWith('--')) pairs.push([value.slice(2), all[index + 1]]);
  return pairs;
}, []));
if (!args.source || !args.rights || !['self', 'licensed', 'community-consent'].includes(args.rights)) {
  process.stderr.write('Uso: node tools/film/library-import.mjs --source /arquivo.mov --rights self|licensed|community-consent [--kind gameplay|store] [--opponents bots|players|mixed] [--map loja_h] [--creator nome] [--library /diretorio]\n');
  process.exit(2);
}

const source = resolve(args.source);
const library = resolve(args.library || '../../launch-media/2026-10-24-growth-pipeline/capture-library');
const sha = createHash('sha256');
for await (const chunk of createReadStream(source)) sha.update(chunk);
const digest = sha.digest('hex');
const extension = extname(source).toLowerCase();
if (!['.mov', '.mp4', '.webm', '.mkv'].includes(extension)) throw new Error('Formato de vídeo não suportado');
const targetName = `${digest.slice(0, 20)}${extension}`;
const target = join(library, 'originals', targetName);
const thumb = join(library, 'thumbnails', `${digest.slice(0, 20)}.jpg`);
const { stdout } = await run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', source], { maxBuffer: 1024 * 1024 });
const probe = JSON.parse(stdout);
const video = probe.streams.find(stream => stream.codec_type === 'video');
if (!video) throw new Error('Arquivo sem vídeo');
const audio = probe.streams.find(stream => stream.codec_type === 'audio');
const [numerator, denominator] = String(video.avg_frame_rate || '0/1').split('/').map(Number);
const fps = denominator ? Number((numerator / denominator).toFixed(2)) : 0;
const seconds = Number(probe.format.duration || video.duration || 0);
const metadata = {
  id: digest.slice(0, 20), sha256: digest, file: `originals/${targetName}`,
  thumbnail: `thumbnails/${digest.slice(0, 20)}.jpg`,
  source: source, sourceName: basename(source),
  creator: args.creator || null, rights: args.rights, map: args.map || null,
  kind: args.kind || 'gameplay', opponents: args.opponents || 'unknown',
  capturedAt: args.captured || null, importedAt: new Date().toISOString(),
  width: video.width, height: video.height, fps, durationSeconds: Number(seconds.toFixed(2)),
  videoCodec: video.codec_name, audioCodec: audio?.codec_name || null,
  bytes: Number(probe.format.size || 0),
  review: 'pending',
  checks: {
    hasAudio: !!audio, highResolution: video.width >= 1280 && video.height >= 720,
    smoothMotion: fps >= 48,
  },
};
await mkdir(join(library, 'originals'), { recursive: true });
await mkdir(join(library, 'thumbnails'), { recursive: true });
try { await link(source, target); } catch (error) {
  if (error.code !== 'EEXIST') await copyFile(source, target);
}
try {
  await run('ffmpeg', ['-v', 'error', '-ss', String(Math.max(0, seconds * 0.35)), '-i', source, '-frames:v', '1', '-q:v', '3', '-y', thumb], { maxBuffer: 1024 * 1024 });
} catch { metadata.thumbnail = null; }
const manifest = join(library, 'index.jsonl');
let existing = [];
try { existing = (await readFile(manifest, 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse); } catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (!existing.some(item => item.sha256 === digest)) {
  existing.push(metadata);
  await writeFile(manifest, existing.map(item => JSON.stringify(item)).join('\n') + '\n');
}
process.stdout.write(JSON.stringify({ id: metadata.id, library, file: target, thumbnail: metadata.thumbnail && thumb,
  width: metadata.width, height: metadata.height, fps, durationSeconds: metadata.durationSeconds,
  audio: metadata.audioCodec, review: metadata.review }) + '\n');
