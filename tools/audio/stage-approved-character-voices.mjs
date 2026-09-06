#!/usr/bin/env node
/* Espelha no staging privado somente as falas finais dos nove Funkeiros.
 * A lane de autoria continua intacta; este script confere recibo, hash e provedor antes
 * de copiar os bytes que o dono já aprovou para o build privado. */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';

const value = (name) => (process.argv.find((arg) => arg.startsWith(`--${name}=`)) || '')
  .split('=').slice(1).join('=');
const sourceRoot = resolve(value('source') || '');
const outputRoot = resolve(value('output') || '');
if (!value('source') || !value('output')) {
  console.error('uso: node tools/audio/stage-approved-character-voices.mjs --source=<worktree> --output=<staging-privado>');
  process.exit(2);
}
const repoRoot = resolve(new URL('../..', import.meta.url).pathname);
if (!relative(repoRoot, outputRoot).startsWith('..')) {
  console.error('recusado: o staging de vozes precisa ficar fora do repositório.');
  process.exit(2);
}
if (existsSync(outputRoot)) {
  console.error(`recusado: ${outputRoot} já existe; preserve ou mova o lote antes de regerar.`);
  process.exit(2);
}

const FUNKEIROS = Object.freeze([
  'mandrake', 'raul', 'oakley', 'criarj', 'chave', 'funkraiz', 'trapfunk', 'fluxo', 'ostentacao',
]);
const EVENTS = Object.freeze(['select', 'kill', 'radio', 'round']);
const sourceManifestPath = join(sourceRoot, 'content', 'voice-lines.json');
const sourceManifest = JSON.parse(readFileSync(sourceManifestPath, 'utf8'));
const policy = sourceManifest.providerPolicy || {};
if (policy.primary !== 'openrouter' || policy.modelId !== 'google/gemini-3.1-flash-tts-preview'
  || policy.noVoiceCloning !== true || !String(policy.license || '').startsWith('gemini-api-generated-content')) {
  console.error('recusado: contrato de autoria/provedor das vozes não é o lote final esperado.');
  process.exit(2);
}

const temporary = `${outputRoot}.tmp-${process.pid}`;
const characters = {};
const characterVoiceText = {};
let copied = 0;
try {
  mkdirSync(temporary, { recursive: true });
  for (const id of FUNKEIROS) {
    const character = sourceManifest.characters?.[id];
    if (!character || character.faction !== 'F' || character.status !== 'generated') {
      throw new Error(`${id}: recibo final ausente ou fora da facção F`);
    }
    characters[id] = {};
    for (const event of EVENTS) {
      const lines = (character.lines || []).filter((line) => line.event === event && line.output?.file);
      if (lines.length !== 1) throw new Error(`${id}.${event}: esperado exatamente um take final, recebido ${lines.length}`);
      const line = lines[0];
      const rel = String(line.output.file).replace(/^audio\//, '');
      if (!rel.startsWith(`characters/${id}/${event}/`) || rel.split(/[\\/]/).includes('..')) {
        throw new Error(`${id}.${event}: caminho fora do contrato (${line.output.file})`);
      }
      const sourceFile = resolve(sourceRoot, 'public', 'audio', rel);
      const withinSource = relative(resolve(sourceRoot, 'public', 'audio'), sourceFile);
      if (!withinSource || withinSource.startsWith('..') || !existsSync(sourceFile)) {
        throw new Error(`${id}.${event}: arquivo fonte ausente`);
      }
      const bytes = readFileSync(sourceFile);
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      if (sha256 !== line.output.sha256) throw new Error(`${id}.${event}: hash divergiu do recibo`);
      const destRel = ['characters', id, event, basename(sourceFile)].join('/');
      const dest = join(temporary, ...destRel.split('/'));
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(sourceFile, dest);
      characters[id][event] = [destRel];
      characterVoiceText[destRel] = line.text;
      copied += 1;
    }
  }
  const sourceCommit = execFileSync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const manifest = {
    schemaVersion: 1,
    provider: policy.primary,
    modelId: policy.modelId,
    license: policy.license,
    noVoiceCloning: true,
    approval: 'owner-approved-private-build',
    approvedBy: 'Ruben',
    approvedAt: '2026-09-06',
    sourceCommit,
    characters,
    characterVoiceText,
  };
  writeFileSync(join(temporary, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  mkdirSync(dirname(outputRoot), { recursive: true });
  renameSync(temporary, outputRoot);
  console.log(`CHARACTER VOICES: ${copied}/36 takes finais verificados e copiados para staging privado.`);
} catch (error) {
  rmSync(temporary, { recursive: true, force: true });
  console.error(`recusado: ${error.message}`);
  process.exit(1);
}
