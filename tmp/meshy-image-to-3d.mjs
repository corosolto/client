#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const args = process.argv.slice(2);
const value = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};
const image = value('--image');
const outDir = value('--out-dir');
if (!image || !outDir || !existsSync(image)) throw new Error('uso: --image <png> --out-dir <diretório>');

function loadEnv(path = '.env') {
  const result = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    let current = match[2].trim();
    if ((current.startsWith('"') && current.endsWith('"')) || (current.startsWith("'") && current.endsWith("'"))) current = current.slice(1, -1);
    result[match[1]] = current;
  }
  return result;
}

const env = { ...loadEnv(), ...process.env };
if (!env.MESHY_API_KEY) throw new Error('MESHY_API_KEY ausente');
const headers = { Authorization: `Bearer ${env.MESHY_API_KEY}`, 'content-type': 'application/json' };
const bytes = readFileSync(image);
const sha256 = createHash('sha256').update(bytes).digest('hex');
const mime = extname(image).toLowerCase() === '.jpg' ? 'image/jpeg' : 'image/png';
const requestBody = {
  image_url: `data:${mime};base64,${bytes.toString('base64')}`,
  model_type: 'smart-topology', ai_model: 'meshy-t2', target_polycount: 12000,
  should_texture: true, enable_pbr: true, texture_resolution: '2k',
  pose_mode: 'a-pose',
  moderation: true, target_formats: ['glb'], auto_size: true, origin_at: 'bottom',
  alpha_thumbnail: true, multi_view_thumbnails: true,
};
const create = await fetch('https://api.meshy.ai/openapi/v1/image-to-3d', { method: 'POST', headers, body: JSON.stringify(requestBody) });
if (!create.ok) throw new Error(`Meshy create ${create.status}: ${(await create.text()).slice(0, 800)}`);
const taskId = (await create.json()).result;
if (!taskId) throw new Error('Meshy não retornou task id');
console.log(`TASK=${taskId}`);

let task;
const deadline = Date.now() + 15 * 60 * 1000;
while (Date.now() < deadline) {
  const response = await fetch(`https://api.meshy.ai/openapi/v1/image-to-3d/${encodeURIComponent(taskId)}`, { headers });
  if (!response.ok) throw new Error(`Meshy status ${response.status}: ${(await response.text()).slice(0, 800)}`);
  task = await response.json();
  console.log(`${task.status} ${task.progress ?? 0}% credits=${task.consumed_credits ?? '?'}`);
  if (task.status === 'SUCCEEDED') break;
  if (['FAILED', 'CANCELED', 'EXPIRED'].includes(task.status)) throw new Error(`Meshy ${task.status}: ${JSON.stringify(task.task_error || {})}`);
  await new Promise((resolve) => setTimeout(resolve, 5000));
}
if (task?.status !== 'SUCCEEDED') throw new Error('Meshy timeout');

mkdirSync(outDir, { recursive: true });
const receipt = { provider: 'meshy', taskId, generatedAt: new Date().toISOString(), image, imageSha256: sha256, request: { ...requestBody, image_url: `data:${mime};base64,<omitted>` }, task };
writeFileSync(join(outDir, `${taskId}.json`), `${JSON.stringify(receipt, null, 2)}\n`);

async function download(url, name) {
  if (!url) return;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`download ${name}: ${response.status}`);
  const output = join(outDir, name);
  writeFileSync(output, Buffer.from(await response.arrayBuffer()));
  console.log(`DOWNLOADED=${output}`);
}
await download(task.model_urls?.glb, `${taskId}-model.glb`);
await download(task.thumbnail_url, `${taskId}-thumbnail.webp`);
await download(task.alpha_thumbnail_url, `${taskId}-thumbnail-alpha.webp`);
if (Array.isArray(task.thumbnail_urls)) {
  for (const [index, url] of task.thumbnail_urls.entries()) await download(url, `${taskId}-view-${index}.webp`);
} else if (task.thumbnail_urls && typeof task.thumbnail_urls === 'object') {
  for (const [label, url] of Object.entries(task.thumbnail_urls)) await download(url, `${taskId}-view-${label}.webp`);
}
