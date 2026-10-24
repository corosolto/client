#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => {
  if (value.startsWith('--') && all[index + 1] && !all[index + 1].startsWith('--')) pairs.push([value.slice(2), all[index + 1]]);
  return pairs;
}, []));
if (!args.source || !args.out) {
  process.stderr.write('Uso: node tools/film/social-package.mjs --source /arquivo.mp4 --out /diretorio\n');
  process.exit(2);
}

const source = resolve(args.source);
const out = resolve(args.out);
const logo = fileURLToPath(new URL('../../public/logo.png', import.meta.url));
const hashFile = async file => {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
};
const { stdout } = await run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', source], { maxBuffer: 1024 * 1024 });
const probe = JSON.parse(stdout);
const video = probe.streams.find(stream => stream.codec_type === 'video');
const audio = probe.streams.find(stream => stream.codec_type === 'audio');
if (!video || !audio) throw new Error('A peça social exige vídeo e áudio no arquivo de origem');
if (video.width < 1280 || video.height < 720) throw new Error('Origem abaixo de 1280×720');
const sha256 = await hashFile(source);
await mkdir(out, { recursive: true });

const landscape = join(out, 'landscape.mp4');
const portrait = join(out, 'portrait.mp4');
const common = ['-hide_banner', '-loglevel', 'error', '-y', '-i', source];
const encode = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-fps_mode', 'vfr',
  '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart'];
await run('ffmpeg', [...common, '-map', '0:v:0', '-map', '0:a:0', '-vf',
  'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1',
  ...encode, landscape], { maxBuffer: 1024 * 1024 });
await run('ffmpeg', [...common, '-i', logo, '-filter_complex',
  '[0:v]split=2[back][front];[back]scale=360:640:force_original_aspect_ratio=increase,crop=360:640,boxblur=8:2,scale=1080:1920[blur];[front]scale=1080:1920:force_original_aspect_ratio=decrease,setsar=1[game];[blur][game]overlay=(W-w)/2:(H-h)/2[base];[1:v]scale=420:-1[brand];[base][brand]overlay=(W-w)/2:120:repeatlast=1,format=yuv420p[out]',
  '-map', '[out]', '-map', '0:a:0', ...encode, portrait], { maxBuffer: 1024 * 1024 });

const inspect = async file => {
  const result = await run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { maxBuffer: 1024 * 1024 });
  const parsed = JSON.parse(result.stdout);
  const v = parsed.streams.find(stream => stream.codec_type === 'video');
  return { file, sha256: await hashFile(file), width: v.width, height: v.height, durationSeconds: Number(parsed.format.duration),
    hasAudio: parsed.streams.some(stream => stream.codec_type === 'audio') };
};
const files = { landscape: await inspect(landscape), portrait: await inspect(portrait) };
if (files.landscape.width !== 1920 || files.landscape.height !== 1080 ||
    files.portrait.width !== 1080 || files.portrait.height !== 1920 ||
    !files.landscape.hasAudio || !files.portrait.hasAudio) throw new Error('Pacote social incompleto');
const manifest = { source: basename(source), sourcePath: source, sha256, createdAt: new Date().toISOString(),
  sourceWidth: video.width, sourceHeight: video.height, sourceDurationSeconds: Number(probe.format.duration),
  files, editorialStatus: 'preview_only' };
await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(Math.min(1, Number(probe.format.duration) / 2)), '-i', portrait,
  '-frames:v', '1', join(out, 'portrait-preview.png')], { maxBuffer: 1024 * 1024 });
await writeFile(join(out, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
process.stdout.write(JSON.stringify({ package: join(out, 'package.json'), ...files }) + '\n');
