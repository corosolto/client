#!/usr/bin/env node
/* Monta a comparação auditiva A/B (v7 sem IA × v8 Fish TTS) das vozes de Funkeiros (F)
 * e Tribos Urbanas (U), por facção/personagem/ação, a partir das fontes já verificadas
 * pela investigação de 06/09. Não publica áudio, não gera voz nova, não troca manifest
 * do jogo: só prepara a escuta nivelada com hash conferido antes de o dono escolher.
 *
 * Fonte da verdade dos hashes: docs/reports/CLAUDE-AUDIO-ROLLBACK-FUNKEIROS-URBANAS.md.
 * Fail-closed: qualquer hash divergente aborta sem escrever o destino. */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const value = (name) => (process.argv.find((arg) => arg.startsWith(`--${name}=`)) || '')
  .split('=').slice(1).join('=');

const repoRoot = resolve(new URL('../..', import.meta.url).pathname);
const v7Root = resolve(value('v7') || join(repoRoot, '../../worktrees/escadao-visual/public/audio'));
const v8Zip = resolve(value('v8') || '/tmp/csbrasil-audio-restore.QZXwty/v8.zip');
const outputRoot = resolve(value('output') || join(repoRoot, '../../private-assets/audio/fu-ab-2026-09-07'));

if (!existsSync(v7Root) || !existsSync(join(v7Root, 'manifest.json'))) {
  console.error(`recusado: pack v7 não encontrado em ${v7Root}`); process.exit(2);
}
if (!existsSync(v8Zip)) { console.error(`recusado: zip v8 não encontrado em ${v8Zip}`); process.exit(2); }
if (!relative(repoRoot, outputRoot).startsWith('..')) {
  console.error('recusado: a comparação A/B precisa ficar fora do repositório.'); process.exit(2);
}
if (existsSync(outputRoot)) {
  console.error(`recusado: ${outputRoot} já existe; preserve a escuta ou mova antes de regerar.`); process.exit(2);
}

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const V8_ZIP_SHA256 = '009e0125820764a231ddf921b4ad865170aec39262ebf18d6cdcaf38394aebf8';

/* Conjunto de comparação — só o que a investigação ligou por hash. camadas:
 * v7-e-v8  : bytes idênticos nos dois packs (referência, sem decisão)
 * par      : v7 e v8 divergem (A/B real)
 * so-v8    : bordão só existe no v8 (decisão: manter ou cair no pool)
 * sem-v7   : personagem sem bordão no v7 (v8 trouxe; v7 = pool) */
const COMPARACAO = Object.freeze([
  { faccao: 'F', personagem: 'funkraiz', acao: 'select', camada: 'par',
    v7: { membro: 'a/d5b87c3d2638e166.mp3', sha256: 'ec346c5706998f081715933e378c63774c0a2afbd932233014445f517c9bfcd6' },
    v8: { membro: 'a/d92c5f1644b8a249.mp3', sha256: 'a6c3d7d77d8b7e7ea48a05f6918ff7f6e6bd24d3f11a88cd19fdc72ca74b685e' } },
  { faccao: 'F', personagem: 'mandrake', acao: 'select', camada: 'so-v8',
    v8: { membro: 'a/5a358d37cd9fbb0b.mp3', sha256: '19675b6f0376b3c5eb25e258da7f39b2cffb62fcb2f3bd2ad3251e38329f7c77' } },
  { faccao: 'F', personagem: 'oakley', acao: 'select', camada: 'so-v8',
    v8: { membro: 'a/d19d12bf1ccd0ee1.mp3', sha256: 'c8aad92239ea71f7ebc067ce93349b0be87ba30b02f55b51411639f9a434b1cf' } },
  { faccao: 'F', personagem: 'trapfunk', acao: 'select', camada: 'so-v8',
    v8: { membro: 'a/d06aa48d289d4fd5.mp3', sha256: '2640c24071a7a3718ace41b4221ba143605ad59f9659d56d6564c67850ef74ff' } },
  { faccao: 'U', personagem: 'clubber', acao: 'select', camada: 'v7-e-v8',
    v7: { membro: 'a/08290068f8d9935f.mp3', sha256: '583dbee1e54324a2864a518791d22b0efa33d2ae2a904709feb256f660238339' } },
  { faccao: 'U', personagem: 'reggae', acao: 'select', camada: 'v7-e-v8',
    v7: { membro: 'a/f180be207d0b440b.mp3', sha256: '013f23ce3b09ec917f6ab270139cf471b8b425a35584974657cdaf033a215e52' } },
  { faccao: 'U', personagem: 'pagodeiro', acao: 'select', camada: 'sem-v7',
    v8: { membro: 'a/b902671ec7cb5cbf.mp3', sha256: 'fd9ad2bc5c4f8193c6994927f990f4f7c7e62fe7d0f50364d43d271f22a99507' } },
]);

const zipSha = sha256(readFileSync(v8Zip));
if (zipSha !== V8_ZIP_SHA256) {
  console.error(`recusado: sha256 do zip v8 diverge do verificado.\n  esperado ${V8_ZIP_SHA256}\n  obtido   ${zipSha}`);
  process.exit(1);
}
const v7Manifest = JSON.parse(readFileSync(join(v7Root, 'manifest.json'), 'utf8'));
if (v7Manifest.voice?.F?.length !== 45 || v7Manifest.voice?.U?.length !== 11) {
  console.error(`recusado: manifest v7 não é o pack esperado (voice.F=${v7Manifest.voice?.F?.length}, voice.U=${v7Manifest.voice?.U?.length}).`);
  process.exit(1);
}

const temp = `${outputRoot}.tmp-${process.pid}`;
const manifest = { geradoEm: new Date().toISOString(), fonteV7: v7Root, fonteV8Zip: v8Zip,
  sha256ZipV8: V8_ZIP_SHA256, itens: [] };
const playOrder = ['# Ordem de escuta — comparativo F/U (v7 × v8)', '',
  '> Arquivos brutos, sem processamento de ganho: a comparação é nivelada por origem.',
  '> Decisão pedida ao dono: **qual estado anterior de F/U vale — v7 (sem IA) ou v8 (bordões Fish)?**', ''];

try {
  let n = 0;
  for (const item of COMPARACAO) {
    const dir = join(temp, item.faccao, item.personagem, item.acao);
    mkdirSync(dir, { recursive: true });
    for (const variante of ['v7', 'v8']) {
      const alvo = item[variante];
      if (!alvo) continue;
      const buf = variante === 'v7'
        ? readFileSync(join(v7Root, alvo.membro))
        : execFileSync('unzip', ['-p', v8Zip, alvo.membro], { maxBuffer: 64 * 1024 * 1024, encoding: 'buffer' });
      const got = sha256(buf);
      if (got !== alvo.sha256) {
        throw new Error(`${item.personagem}/${variante}: sha256 diverge (${got} ≠ ${alvo.sha256})`);
      }
      const nome = item.camada === 'v7-e-v8' && variante === 'v7'
        ? `igual-v7-v8__${alvo.membro.split('/').pop()}`
        : `${variante}__${alvo.membro.split('/').pop()}`;
      writeFileSync(join(dir, nome), buf);
      manifest.itens.push({ ...item, variante, arquivo: `${item.faccao}/${item.personagem}/${item.acao}/${nome}`, sha256: got,
        proveniencia: variante === 'v8' ? 'Fish Audio TTS (PROVENANCE-v8.md)' : 'pack v7 publicado pelo dono (29/08)' });
    }
    n += 1;
    playOrder.push(`${n}. **${item.faccao}/${item.personagem} (${item.camada})** — ${item.v7 && item.v8 ? 'ouvir v7__ depois v8__' : item.v7 ? 'referência única (inalterada entre packs)' : 'só existe no v8; no v7 este personagem cai no pool'}`);
  }
  writeFileSync(join(temp, 'fu-ab.manifest.json'), `${JSON.stringify(manifest, null, 1)}\n`);
  writeFileSync(join(temp, 'PLAY-ORDER.md'), `${playOrder.join('\n')}\n`);
  renameSync(temp, outputRoot);
  console.log(`ok: ${manifest.itens.length} arquivos de ${n} personagens em ${outputRoot}`);
  console.log('ok: nenhum byte publicado, nenhum manifest do jogo alterado');
} catch (erro) {
  rmSync(temp, { recursive: true, force: true });
  console.error(`falhou: ${erro.message}`); process.exit(1);
}
