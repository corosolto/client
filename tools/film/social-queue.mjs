#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { isAbsolute, join, resolve, sep } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => {
  if (value.startsWith('--') && all[index + 1] && !all[index + 1].startsWith('--')) pairs.push([value.slice(2), all[index + 1]]);
  return pairs;
}, []));
if (!args.library || !args.decisions || !args.out || !args.campaign) {
  process.stderr.write('Uso: node tools/film/social-queue.mjs --library /diretorio --decisions /arquivo.jsonl --out /fila.json --campaign slug [--limit 15] [--published /arquivo.jsonl]\n');
  process.exit(2);
}
if (!/^[a-z0-9][a-z0-9-]{2,80}$/.test(args.campaign)) throw new Error('Campanha inválida');
const limit = Number(args.limit || 15);
if (!Number.isSafeInteger(limit) || limit < 1 || limit > 15) throw new Error('Limite deve ser 1–15');
const library = resolve(args.library);
const rows = (await readFile(join(library, 'index.jsonl'), 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);
const decisions = (await readFile(resolve(args.decisions), 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);
const published = args.published ? (await readFile(resolve(args.published), 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse) : [];
const byId = new Map(rows.map(row => [row.id, row]));
if (byId.size !== rows.length) throw new Error('IDs repetidos no índice da biblioteca');
const decisionIds = new Set(decisions.map(row => row.id));
if (decisionIds.size !== decisions.length) throw new Error('IDs repetidos nas decisões editoriais');
const seen = new Set(published.filter(row => row.status === 'published').map(row => `${row.id}:${row.platform}`));
const platforms = ['x', 'instagram', 'tiktok', 'youtube'];
const blocked = rows.filter(row => !decisionIds.has(row.id)).map(row => ({ id: row.id, reasons: ['sem decisão editorial'] }));
const queue = [];
const fileWithin = path => {
  const full = resolve(library, path);
  if (isAbsolute(path) || !(full === library || full.startsWith(library + sep))) throw new Error('Caminho fora da biblioteca');
  return full;
};
const sha = async path => {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  return digest.digest('hex');
};

for (const decision of decisions) {
  const row = byId.get(decision.id);
  const reasons = [];
  if (!row) { blocked.push({ id: decision.id, reasons: ['não consta na biblioteca'] }); continue; }
  if (row.review !== 'approved') reasons.push('original não aprovado na biblioteca');
  if (decision.status !== 'approved' || decision.visualReview !== 'passed' || decision.audioReview !== 'passed') reasons.push('revisão visual/áudio pendente');
  if (decision.publicationRights !== true || !decision.approvedBy || !decision.approvedAt) reasons.push('direitos de publicação ou responsável ausentes');
  if (row.rights !== 'self' && !decision.rightsEvidence) reasons.push('prova de licença/republicação ausente');
  if (row.kind !== 'gameplay' || !['bots', 'players', 'mixed'].includes(row.opponents)) reasons.push('tipo ou adversários não confirmados');
  if (!decision.caption || !decision.character || !row.map || !decision.gameBuild) reasons.push('copy, personagem, mapa ou build ausente');
  if (!Array.isArray(decision.platforms) || !decision.platforms.length || decision.platforms.some(p => !platforms.includes(p))) reasons.push('plataformas inválidas');
  if (!decision.package) reasons.push('pacote social ausente');
  if (reasons.length) { blocked.push({ id: row.id, reasons }); continue; }
  try {
    const original = fileWithin(row.file);
    const packaged = fileWithin(decision.package);
    if (!(await stat(original)).isFile()) throw new Error('original não encontrado');
    if (await sha(original) !== row.sha256) throw new Error('hash do original divergiu');
    const pack = JSON.parse(await readFile(packaged, 'utf8'));
    if (pack.sha256 !== row.sha256) throw new Error('pacote não corresponde ao original');
    for (const format of ['landscape', 'portrait']) {
      const videoPath = pack.files[format]?.file;
      if (!videoPath || !videoPath.startsWith(library + sep) ||
          !(await stat(fileWithin(videoPath.slice(library.length + 1)))).isFile()) throw new Error(`versão ${format} ausente`);
      if (!pack.files[format].sha256 || await sha(videoPath) !== pack.files[format].sha256) throw new Error(`hash da versão ${format} divergiu`);
    }
    for (const platform of decision.platforms) {
      if (seen.has(`${row.id}:${platform}`) || queue.length >= limit) continue;
      const url = new URL('https://www.corosolto.com.br/');
      url.search = new URLSearchParams({ utm_source: platform, utm_medium: 'organic_social',
        utm_campaign: args.campaign, utm_content: row.id }).toString();
      const clickable = platform === 'x' || platform === 'youtube';
      queue.push({ id: row.id, platform, slot: queue.length + 1,
        video: pack.files[platform === 'x' ? 'landscape' : 'portrait'].file,
        caption: `${decision.caption.trim()}\n\n${clickable ? `Jogue: ${url}` : 'Jogue em corosolto.com.br · link na bio'}`,
        destinationUrl: String(url), sourceSha256: row.sha256, gameBuild: decision.gameBuild || null,
        map: row.map, character: decision.character, opponents: row.opponents,
        rightsEvidence: decision.rightsEvidence || row.rights, state: 'draft' });
      seen.add(`${row.id}:${platform}`);
    }
  } catch (error) { blocked.push({ id: row.id, reasons: [error.message] }); }
}
const output = { campaign: args.campaign, generatedAt: new Date().toISOString(), limit,
  count: queue.length, queue, blocked, publicationMode: 'draft_only' };
await writeFile(resolve(args.out), JSON.stringify(output, null, 2) + '\n');
process.stdout.write(JSON.stringify({ out: resolve(args.out), count: queue.length, blocked }) + '\n');
