#!/usr/bin/env node
/* Aplica o lote aprovado DEPOIS da escolha auditiva do dono. Até lá, recusa.
 * A decisão fica em docs/audio/fu-rollback-decisao.json (criado pelo dono):
 *   { "escolha": "v7" | "v8", "assinaladoPor": "Ruben", "data": "..." }
 * O que este script faz: gera o manifest-alvo verificável + blob staging + comandos do
 * build privado. O que NÃO faz: publicar, subir blob, tocar public/audio ou remoto.
 * v7  = rebuild do pack privado SEM --character-voices (nenhum byte novo) + characterVoice
 *       alvo com os bordões antigos de clubber/reggae/funkraiz.
 * v8  = bordões Fish de funkraiz/mandrake/oakley/trapfunk (F) e pagodeiro (U).
 * Em ambos: vozes Míticas e demais facções intocadas (provado por fu-rollback-verify). */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const repoRoot = resolve(new URL('../..', import.meta.url).pathname);
const decisaoPath = join(repoRoot, 'docs/audio/fu-rollback-decisao.json');
const v8Zip = resolve(process.argv.find((a) => a.startsWith('--v8='))?.slice(5)
  || '/tmp/csbrasil-audio-restore.QZXwty/v8.zip');
const outRoot = resolve(process.argv.find((a) => a.startsWith('--output='))?.slice(9)
  || join(repoRoot, '../../private-assets/audio/fu-rollback-aplicado'));

if (!relative(repoRoot, outRoot).startsWith('..')) {
  console.error('recusado: saída precisa ficar fora do repositório.'); process.exit(2);
}
if (!existsSync(decisaoPath)) {
  console.error('recusado: decisão do dono ausente.');
  console.error(`Crie ${decisaoPath} depois de ouvir o comparativo, com:`);
  console.error('  { "escolha": "v7"|"v8", "assinaladoPor": "Ruben", "data": "YYYY-MM-DD" }');
  console.error('Comparativo: private-assets/audio/fu-ab-2026-09-07 (PLAY-ORDER.md).');
  process.exit(2);
}
const decisao = JSON.parse(readFileSync(decisaoPath, 'utf8'));
if (!['v7', 'v8'].includes(decisao.escolha) || !decisao.assinaladoPor || !decisao.data) {
  console.error('recusado: decisão incompleta (escolha v7|v8, assinaladoPor, data).'); process.exit(2);
}
if (existsSync(outRoot)) {
  console.error(`recusado: ${outRoot} já existe; preserve ou mova antes de regerar.`); process.exit(2);
}

const BORDOES_V8 = Object.freeze({
  funkraiz: ['a/d92c5f1644b8a249.mp3', 'a6c3d7d77d8b7e7ea48a05f6918ff7f6e6bd24d3f11a88cd19fdc72ca74b685e'],
  mandrake: ['a/5a358d37cd9fbb0b.mp3', '19675b6f0376b3c5eb25e258da7f39b2cffb62fcb2f3bd2ad3251e38329f7c77'],
  oakley: ['a/d19d12bf1ccd0ee1.mp3', 'c8aad92239ea71f7ebc067ce93349b0be87ba30b02f55b51411639f9a434b1cf'],
  trapfunk: ['a/d06aa48d289d4fd5.mp3', '2640c24071a7a3718ace41b4221ba143605ad59f9659d56d6564c67850ef74ff'],
  pagodeiro: ['a/b902671ec7cb5cbf.mp3', 'fd9ad2bc5c4f8193c6994927f990f4f7c7e62fe7d0f50364d43d271f22a99507'],
});
const BORDOES_V7 = Object.freeze({
  funkraiz: 'audio/a/d5b87c3d2638e166.mp3',
  clubber: 'audio/a/08290068f8d9935f.mp3',
  reggae: 'audio/a/f180be207d0b440b.mp3',
});
const FU = new Set(['funkraiz', 'mandrake', 'oakley', 'trapfunk', 'pagodeiro', 'clubber', 'reggae']);

const temp = `${outRoot}.tmp-${process.pid}`;
try {
  const v8 = JSON.parse(execFileSync('unzip', ['-p', v8Zip, 'manifest.json'], { maxBuffer: 64 * 1024 * 1024 }));
  const alvo = JSON.parse(JSON.stringify(v8));
  alvo.characterVoice = Object.fromEntries(
    Object.entries(v8.characterVoice).filter(([p]) => !FU.has(p)),
  );
  const passos = [`# Aplicação ${decisao.escolha} — decidido por ${decisao.assinaladoPor} em ${decisao.data}`, ''];
  if (decisao.escolha === 'v8') {
    mkdirSync(join(temp, 'blob'), { recursive: true });
    for (const [personagem, [membro, esperado]] of Object.entries(BORDOES_V8)) {
      const buf = execFileSync('unzip', ['-p', v8Zip, membro], { maxBuffer: 64 * 1024 * 1024, encoding: 'buffer' });
      const got = sha256(buf);
      if (got !== esperado) throw new Error(`${personagem}: sha256 diverge (${got})`);
      const nome = membro.split('/').pop();
      writeFileSync(join(temp, 'blob', nome), buf);
      alvo.characterVoice[personagem] = `audio/${membro}`;
    }
    passos.push('1. Build privado do pack com os 5 bordões do blob/ (origem Fish Audio TTS, ids em ~/Music/PROVENANCE-v8.md).',
      '2. Registrar no docs/audio/proveniencia.json o lote Fish com ids de modelo.',
      '3. Rodar node tools/audio/fu-rollback-verify.mjs --alvo=<alvo-manifest.json>.');
  } else {
    for (const [personagem, caminho] of Object.entries(BORDOES_V7)) alvo.characterVoice[personagem] = caminho;
    passos.push('1. Rebuild do pack privado SEM --character-voices= (nenhum byte novo; tudo já está no pack vivo).',
      '2. Revogar a entrada character-voices-openrouter-gemini em docs/audio/proveniencia.json (autorização de 2026-09-06).',
      '3. Reescrever a régua MIX12 (audio-voice-mix-check.mjs) para cobrar o estado novo em vez de verde à toa.',
      '4. Rodar node tools/audio/fu-rollback-verify.mjs --alvo=<alvo-manifest.json>.');
  }
  alvo.__variante = decisao.escolha;
  writeFileSync(join(temp, 'alvo-manifest.json'), `${JSON.stringify(alvo, null, 1)}\n`);
  writeFileSync(join(temp, 'PASSOS.md'), `${passos.join('\n')}\n`);
  renameSync(temp, outRoot);
  console.log(`ok: lote ${decisao.escolha} preparado em ${outRoot}`);
  console.log('ok: nada publicado; blob e comandos prontos para o build privado');
} catch (e) {
  rmSync(temp, { recursive: true, force: true });
  console.error(`falhou: ${e.message}`); process.exit(1);
}
