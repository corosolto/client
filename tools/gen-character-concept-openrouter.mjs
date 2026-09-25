#!/usr/bin/env node
/* Gera um concept original por vez via OpenRouter e persiste a procedência.

   Uso seguro:
     node tools/gen-character-concept-openrouter.mjs \
       --prompt-file prompts/nerdolas/designer-ux.md \
       --reference public/img/faccoes/nerdolas.webp \
       --out references/nerdolas/designer-ux/designer-ux-concept-v1.png \
       --dry-run

   A ferramenta não sobrescreve sem --force e nunca imprime a chave.
*/
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname } from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const value = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const promptFile = value('--prompt-file');
const reference = value('--reference');
const output = value('--out');
const model = value('--model') || 'google/gemini-3.1-flash-image';
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
if (!promptFile || !reference || !output)
  throw new Error('uso: --prompt-file <md> --reference <imagem> --out <png> [--dry-run] [--force]');
if (!existsSync(promptFile) || !existsSync(reference)) throw new Error('prompt ou referência inexistente');
if (extname(output).toLowerCase() !== '.png') throw new Error('--out precisa terminar em .png');
if (!dryRun && existsSync(output) && !force) throw new Error(`saída já existe: ${output} (use --force deliberadamente)`);

function loadEnv(file = '.env') {
  const out = {};
  let text; try { text = readFileSync(file, 'utf8'); } catch { return out; }
  for (const line of text.split('\n')) {
    const match = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    let current = match[2].trim();
    if ((current.startsWith('"') && current.endsWith('"')) || (current.startsWith("'") && current.endsWith("'")))
      current = current.slice(1, -1);
    out[match[1]] = current;
  }
  return out;
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const promptMarkdown = readFileSync(promptFile, 'utf8');
const prompt = promptMarkdown.split(/^## Prompt usado\s*$/m)[1]?.trim();
if (!prompt) throw new Error(`${promptFile}: seção “## Prompt usado” vazia ou ausente`);
const referenceBytes = readFileSync(reference);
const referenceMime = extname(reference).toLowerCase() === '.webp' ? 'image/webp' : 'image/png';
const preflight = {
  dryRun,
  provider: 'openrouter',
  model,
  promptFile,
  promptCharacters: prompt.length,
  reference,
  referenceSha256: sha256(referenceBytes),
  output,
  imageSize: '1K',
  aspectRatio: '1:1',
};
console.log(JSON.stringify(preflight, null, 2));
if (dryRun) process.exit(0);

const env = { ...loadEnv(), ...process.env };
if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY ausente; use --dry-run ou configure fora do git');
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
    'content-type': 'application/json',
    'HTTP-Referer': 'https://game.csbrasil.online',
    'X-Title': 'CORO SOLTO: Treta Suprema',
  },
  body: JSON.stringify({
    model,
    modalities: ['image', 'text'],
    image_config: { aspect_ratio: '1:1', image_size: '1K' },
    messages: [{ role: 'user', content: [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: `data:${referenceMime};base64,${referenceBytes.toString('base64')}` } },
    ] }],
  }),
});
if (!response.ok) throw new Error(`OpenRouter ${response.status}: ${(await response.text()).slice(0, 600)}`);
const payload = await response.json();
const dataUrl = payload.choices?.[0]?.message?.images?.[0]?.image_url?.url;
const match = /^data:image\/[a-z0-9.+-]+;base64,(.+)$/i.exec(dataUrl || '');
if (!match) {
  const diagnostic = {
    generationId: payload.id || null,
    finishReason: payload.choices?.[0]?.finish_reason || null,
    message: String(payload.choices?.[0]?.message?.content || '').slice(0, 400),
    error: payload.error?.message || null,
  };
  throw new Error(`OpenRouter respondeu sem imagem base64: ${JSON.stringify(diagnostic)}`);
}
const raw = Buffer.from(match[1], 'base64');
mkdirSync(dirname(output), { recursive: true });
await sharp(raw).png().toFile(output);
const bytes = readFileSync(output);
const metadata = await sharp(bytes).metadata();
const receipt = {
  provider: 'openrouter',
  model,
  generationId: payload.id || null,
  generatedAt: new Date().toISOString(),
  promptFile,
  promptSha256: sha256(Buffer.from(promptMarkdown)),
  reference,
  referenceSha256: sha256(referenceBytes),
  width: metadata.width,
  height: metadata.height,
  sha256: sha256(bytes),
  usage: payload.usage || null,
};
writeFileSync(`${output}.json`, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, output, ...receipt }, null, 2));
