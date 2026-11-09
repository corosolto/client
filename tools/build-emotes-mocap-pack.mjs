#!/usr/bin/env node
/* Monta public/models/anims/emotes-mocap.glb: os 8 emotes de captura (capoeira,
   breakdance e gestos) no esqueleto meshy-28 de referência, num pack único carregado só
   no primeiro emote de clipe. Mesmo caminho do extras.glb (tools/anim-pack.mjs).
   Uso: node tools/build-emotes-mocap-pack.mjs --library=<caminho>/library/index.json */
import fs from 'node:fs';
import path from 'node:path';
import { lerBiblioteca, montarPack, gravarPack, LICENCAS } from './anim-pack.mjs';

const { index, libraryDir, clipsOut } = lerBiblioteca(process.argv,
  'uso: node tools/build-emotes-mocap-pack.mjs --library=<caminho>/library/index.json');

// Nome no pack = id do emote em public/js/data/emote-catalog.js; a chave é a do catálogo
// de conversão (QA aprovada nos dois rigs de prova).
const FONTES = Object.freeze([
  ['capoeira', 'mixamo/capoeira-pack/capoeira', 'emote_capoeira_capoeira'],
  ['meia_lua', 'mixamo/capoeira-pack/meia-lua-de-frente', 'emote_capoeira_meia_lua_de_frente'],
  ['bencao', 'mixamo/capoeira-pack/bencao', 'emote_capoeira_bencao'],
  ['uprock', 'mixamo/breakdance-pack/breakdance-uprock', 'emote_breakdance_uprock'],
  ['freeze', 'mixamo/breakdance-pack/breakdance-freeze-var-2', 'emote_breakdance_freeze_var_2'],
  ['continencia', 'mixamo/loose/salute', 'emote_salute'],
  ['marra', 'mixamo/gestures-pack-basic/being-cocky', 'emote_being_cocky'],
  ['comemoracao', 'mixamo/gestures-pack-basic/happy-hand-gesture', 'emote_happy_hand_gesture'],
]);
const chave = new Map(FONTES.map(([nome, , key]) => [nome, key]));

const pack = await montarPack({
  index, libraryDir, clipsOut,
  fontes: FONTES.map(([nome, id]) => [nome, id]),
  validar(nome, meta) {
    if (meta.key !== chave.get(nome) || meta.keyStatus !== 'emote') throw new Error(`${nome}: catálogo ${meta.id} declara key=${meta.key}/${meta.keyStatus}`);
    const qa = Object.entries(meta.qa || {});
    if (!qa.length || qa.some(([, v]) => v.verdict !== 'pass')) throw new Error(`${nome}: QA de conversão não aprovada (${JSON.stringify(meta.qa)})`);
  },
});
const saida = path.resolve('public/models/anims/emotes-mocap.glb');
const nomes = await gravarPack(pack, saida, FONTES.map(([nome]) => nome));
const linhas = pack.metas.map(({ nome, id, meta }) => `| ${nome} | ${id} | ${meta.duration.toFixed(4)} s | ${meta.loop ? 'laço' : 'uma vez'} | ${Object.keys(meta.qa).join(', ')} |`);
const bytes = fs.statSync(saida).size;

const fonteDoc = `# SOURCES — models/anims/emotes-mocap.glb\n\n`
  + `Pacote único dos emotes de captura no esqueleto meshy-28 de referência (${bytes} bytes, ${nomes.length} clipes). `
  + `Gerado por \`node tools/build-emotes-mocap-pack.mjs --library=<biblioteca>/index.json\`; `
  + `os GLBs intermediários e FBX não são redistribuídos. O jogo baixa o pack no primeiro emote de clipe `
  + `e reescala só a translação do \`Hips\` pela altura de quadril de cada corpo.\n\n`
  + `## Catálogo\n\n| Clipe (= id do emote) | ID do catálogo | Duração | Reprodução (laço do catálogo) | QA de conversão aprovada |\n|---|---|---:|---|---|\n`
  + `${linhas.join('\n')}\n\n`
  + LICENCAS
  + `A conversão para meshy-28 preserva \`extras.clip.source.id\` em cada animação. `
  + `A mescla reaproveita os nós por nome e elimina cenas duplicadas; o jogo consome \`g.animations\` `
  + `e a altura de repouso do nó \`Hips\` da cena.\n`;
fs.writeFileSync('public/models/anims/emotes-mocap.SOURCES.md', fonteDoc);
console.log(`EMOTES-MOCAP-PACK ✓ ${nomes.length} clipes, ${bytes} bytes -> ${saida}`);
for (const { nome, meta } of pack.metas) console.log(`  ${nome}: ${meta.duration.toFixed(4)} s, ${meta.loop ? 'laço' : 'uma vez'}`);
