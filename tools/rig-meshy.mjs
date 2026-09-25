// Auto-rig humanoide offline via Meshy. O browser nunca chama provedor nem recebe chave.
//
// A API de rig descarta normal/metallicRoughness (caso medido em rig-tex-restore.mjs),
// por isso o download cru vai para /tmp e o GLB final passa pelo restaurador existente.
// A ordem importa: remesh/edição vêm ANTES daqui; remesh depois do rig apaga skeleton.
//
// Uso:
//   node tools/rig-meshy.mjs --input char.glb --out /tmp/char-rig.glb --dry-run
//   node tools/rig-meshy.mjs --input char.glb --out /tmp/char-rig.glb
//
// Requer Node >= 20 e MESHY_API_KEY no .env. Custo vigente em 11/08/2026: 5 créditos;
// confirme em https://docs.meshy.ai/en/api/pricing antes de geração em lote.
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};
const flag = (name) => argv.includes(`--${name}`);
const input = arg('input');
const output = arg('out');
const height = Number(arg('height', '1.7'));
const timeoutS = Number(arg('timeout', '900'));

if (!input || !output) throw new Error('uso: rig-meshy --input <GLB> --out <GLB> [--height 1.7] [--dry-run]');
if (!existsSync(input)) throw new Error(`GLB de entrada inexistente: ${input}`);
if (!input.endsWith('.glb') || !output.endsWith('.glb')) throw new Error('entrada e saída precisam terminar em .glb');
if (!Number.isFinite(height) || height <= 0) throw new Error(`--height inválido: ${height}`);
if (!flag('dry-run') && existsSync(output) && !flag('force')) throw new Error(`saída já existe: ${output} (use --force deliberadamente)`);

function loadEnv(file = '.env') {
  const out = {};
  let text = '';
  try { text = readFileSync(file, 'utf8'); } catch { return out; }
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    out[match[1]] = value;
  }
  return out;
}

const env = { ...loadEnv(), ...process.env };
const key = env.MESHY_API_KEY;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const source = await io.read(input);
let triangles = 0;
for (const mesh of source.getRoot().listMeshes()) for (const primitive of mesh.listPrimitives()) {
  const position = primitive.getAttribute('POSITION');
  triangles += (primitive.getIndices()?.getCount() || position?.getCount() || 0) / 3;
}
const stats = {
  input,
  output,
  bytes: statSync(input).size,
  triangles: Math.round(triangles),
  meshes: source.getRoot().listMeshes().length,
  materials: source.getRoot().listMaterials().length,
  textures: source.getRoot().listTextures().length,
  heightMeters: height,
  estimatedCredits: 5,
};
console.log(JSON.stringify({ dryRun: flag('dry-run'), provider: 'meshy', ...stats }, null, 2));
if (triangles > 300_000) throw new Error(`Meshy recusa rig acima de 300.000 faces; medido ${Math.round(triangles)}`);
if (!stats.textures) throw new Error('Meshy exige malha texturizada; entrada tem 0 texturas');
if (flag('dry-run')) process.exit(0);
if (!key) throw new Error('MESHY_API_KEY ausente do .env');

const api = async (url, options = {}) => {
  const parsed = new URL(url);
  if (parsed.host !== 'api.meshy.ai') throw new Error(`auth recusada para host não permitido: ${parsed.host}`);
  const response = await fetch(url, {
    ...options,
    redirect: 'error',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const text = await response.text();
  let body = null;
  try { body = JSON.parse(text); } catch { /* erro abaixo não imprime a chave */ }
  if (!response.ok) throw new Error(`Meshy HTTP ${response.status}: ${(body?.message || body?.task_error?.message || text).slice(0, 500)}`);
  return body;
};

const encoded = readFileSync(input).toString('base64');
const created = await api('https://api.meshy.ai/openapi/v1/rigging', {
  method: 'POST',
  body: JSON.stringify({ model_url: `data:model/gltf-binary;base64,${encoded}`, height_meters: height }),
});
if (!created?.result) throw new Error('Meshy não devolveu task id');
const taskId = created.result;
console.log(`TASK_ID=${taskId}`);

const start = Date.now();
let task;
let previous = '';
while ((Date.now() - start) / 1000 < timeoutS) {
  task = await api(`https://api.meshy.ai/openapi/v1/rigging/${encodeURIComponent(taskId)}`);
  const line = `${task.status} ${task.progress ?? 0}%`;
  if (line !== previous) { console.log(line); previous = line; }
  if (task.status === 'SUCCEEDED') break;
  if (['FAILED', 'CANCELED'].includes(task.status)) throw new Error(`rig terminou ${task.status}: ${task.task_error?.message || 'sem detalhe'}`);
  await new Promise((resolve) => setTimeout(resolve, 6000));
}
if (task?.status !== 'SUCCEEDED') throw new Error(`timeout de ${timeoutS}s; retome a task ${taskId}`);

const url = task.result?.rigged_character_glb_url;
if (!url) throw new Error('rig concluído sem rigged_character_glb_url');
const response = await fetch(url, { redirect: 'follow' });
if (!response.ok) throw new Error(`download do rig falhou: HTTP ${response.status}`);
const rawDir = `/tmp/csbrasil-meshy-rig/${taskId}`;
mkdirSync(rawDir, { recursive: true });
const raw = `${rawDir}/rigged.glb`;
await writeFile(raw, Buffer.from(await response.arrayBuffer()));

mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
const restored = spawnSync(process.execPath, ['tools/rig-tex-restore.mjs', input, raw, output], {
  cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
});
if (restored.status !== 0) throw new Error(`restauração PBR falhou: ${restored.stderr || restored.stdout}`);
process.stdout.write(restored.stdout);

const result = await io.read(output);
// A resposta inclui um clipe de serviço de duração zero. O jogo carrega os clipes
// retargetados por personagem; deixar o clipe aqui só aumenta ambiguidade de runtime.
for (const animation of result.getRoot().listAnimations()) animation.dispose();
await io.write(output, result);
const skins = result.getRoot().listSkins().length;
const textures = result.getRoot().listTextures().length;
const bones = result.getRoot().listNodes().filter((node) => /hips|spine|arm|hand|leg/i.test(node.getName())).length;
if (!skins || bones < 8) throw new Error(`rig baixado inválido: skins=${skins}, ossos reconhecíveis=${bones}`);
if (textures < stats.textures) throw new Error(`PBR incompleto: texturas ${stats.textures} -> ${textures}`);
console.log(JSON.stringify({ ok: true, taskId, consumedCredits: task.consumed_credits, skins, bones, textures, output }, null, 2));
