#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { extname } from 'node:path';

const args = process.argv.slice(2);
const value = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};
const values = (flag) => args.flatMap((arg, index) => arg === flag ? [args[index + 1]] : []);
const promptFile = value('--prompt-file');
const output = value('--out');
const images = values('--image');
const model = value('--model') || 'anthropic/claude-opus-5';
if (!promptFile || !output || images.length === 0) throw new Error('uso: --prompt-file <txt> --image <path>... --out <json> [--model <id>]');
if (!existsSync(promptFile) || images.some((path) => !existsSync(path))) throw new Error('prompt ou imagem ausente');

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
if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY ausente');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const mimeFor = (path) => ({ '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }[extname(path).toLowerCase()] || 'image/png');
const content = [{ type: 'text', text: readFileSync(promptFile, 'utf8') }];
for (const path of images) {
  const bytes = readFileSync(path);
  content.push({ type: 'text', text: `IMAGEM: ${path}` });
  content.push({ type: 'image_url', image_url: { url: `data:${mimeFor(path)};base64,${bytes.toString('base64')}` } });
}

const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
    'content-type': 'application/json',
    'HTTP-Referer': 'https://game.csbrasil.online',
    'X-Title': 'CORO SOLTO Asset Review',
  },
  body: JSON.stringify({ model, messages: [{ role: 'user', content }], temperature: 0.1 }),
});
if (!response.ok) throw new Error(`OpenRouter ${response.status}: ${(await response.text()).slice(0, 800)}`);
const payload = await response.json();
const review = payload.choices?.[0]?.message?.content;
if (typeof review !== 'string' || !review.trim()) throw new Error('resposta sem laudo textual');
const receipt = {
  provider: 'openrouter', model, id: payload.id || null, createdAt: new Date().toISOString(),
  promptFile, promptSha256: sha256(readFileSync(promptFile)),
  images: images.map((path) => ({ path, sha256: sha256(readFileSync(path)) })),
  usage: payload.usage || null, finishReason: payload.choices?.[0]?.finish_reason || null, review,
};
writeFileSync(output, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(review);
console.log(`RECEIPT=${output}`);
