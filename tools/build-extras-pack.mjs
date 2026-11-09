#!/usr/bin/env node
/* Monta UM pacote compartilhado de clipes extras 3P a partir da biblioteca convertida.
   Nenhum FBX entra no repositório: a saída contém somente clipes meshy-28 já retargetados.
   Uso: node tools/build-extras-pack.mjs --library=<caminho>/library/index.json */
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { prune, mergeDocuments, unpartition } from '@gltf-transform/functions';

const arg = process.argv.find((a) => a.startsWith('--library='));
if (!arg) {
  console.error('uso: node tools/build-extras-pack.mjs --library=<caminho>/library/index.json');
  process.exit(1);
}
const indexPath = path.resolve(arg.slice('--library='.length));
const clipsOutArg = process.argv.find((a) => a.startsWith('--clips-out='));
const clipsOut = clipsOutArg ? path.resolve(clipsOutArg.slice('--clips-out='.length)) : null;
if (clipsOut) fs.mkdirSync(clipsOut, { recursive: true });
const libraryDir = path.dirname(indexPath);
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
if (index.skeleton !== 'meshy-28' || !Array.isArray(index.clips)) throw new Error('biblioteca não é meshy-28 ou não tem clips[]');

// Escolha editorial: laço fechado para locomoção; reações curtas; arremesso próximo da
// janela de 1,05 s do jogo. Dois estados ficam ausentes por falta de fonte convertida.
const FONTES = Object.freeze({
  strafe_left: 'mixamo/pro-rifle-pack/walk-left',
  strafe_right: 'mixamo/pro-rifle-pack/walk-right',
  walk_back: 'mixamo/basic-shooter-pack/walking-backwards',
  run_back: 'mixamo/pro-rifle-pack/run-backward',
  strafe_left_pistol: 'mixamo/pistol-handgun-locomotion-pack/pistol-strafe',
  strafe_right_pistol: 'mixamo/pistol-handgun-locomotion-pack/pistol-strafe-2',
  walk_back_pistol: 'mixamo/pistol-handgun-locomotion-pack/pistol-walk-backward',
  reload_rifle: 'mixamo/basic-shooter-pack/reloading',
  reload_pistol: 'ual/ual1/Pistol_Reload',
  draw_rifle: 'mixamo/loose/rifle-pull-out',
  holster_rifle: 'mixamo/loose/rifle-put-away',
  hit_front: 'ual/ual1/Hit_Chest',
  hit_back: 'mixamo/loose/standing-react-small-from-back',
  hit_left: 'mixamo/loose/standing-react-small-from-left',
  hit_right: 'mixamo/loose/standing-react-small-from-right',
  hit_head: 'ual/ual1/Hit_Head',
  grenade_throw: 'ual/ual2/OverhandThrow',
  knife_idle: 'mixamo/loose/knife-idle',
  knife_stab: 'mixamo/loose/double-dagger-stab',
  victory: 'mixamo/loose/victory',
  defeat: 'mixamo/loose/sad-idle',
});
const AUSENTES = ['draw_pistol', 'holster_pistol'];
const io = new NodeIO();
let base = null;
const linhas = [];

for (const [estado, id] of Object.entries(FONTES)) {
  const candidatos = index.clips.filter((c) => c.id === id);
  if (candidatos.length !== 1) throw new Error(`${estado}: catálogo ${id} aparece ${candidatos.length}×`);
  const meta = candidatos[0];
  if (meta.key !== estado && !(estado === 'run_back_pistol' && meta.keyStatus === 'proposed')) {
    throw new Error(`${estado}: catálogo ${id} declara key=${meta.key}`);
  }
  const arquivo = path.join(libraryDir, meta.file);
  const doc = await io.read(arquivo);
  const animacoes = doc.getRoot().listAnimations();
  if (animacoes.length !== 1) throw new Error(`${estado}: ${meta.file} tem ${animacoes.length} animações`);
  animacoes[0].setName(estado);
  // A faca não move a cabeça: o aim/head-lag do runtime já a controla, e a tomada
  // levantava a malha do pescoço da dama-creepy acima do teto de 3,5× (medido em R2).
  if (estado === 'knife_stab') {
    for (const canal of animacoes[0].listChannels()) {
      if (/^(Head|neck)$/.test(canal.getTargetNode()?.getName() || '')) animacoes[0].removeChannel(canal);
    }
  }
  // Na pistola o punho da mão dominante fica com o clipe-base; o take UAL torcia
  // a mão direita de nanica/coronel-arrego além do teto de 2,5× (R1).
  if (estado === 'reload_pistol') {
    for (const canal of animacoes[0].listChannels()) {
      if (canal.getTargetNode()?.getName() === 'RightHand') animacoes[0].removeChannel(canal);
    }
  }
  if (clipsOut) await io.write(path.join(clipsOut, `${estado}.glb`), doc);
  if (!base) {
    base = doc;
    const cena = base.getRoot().listScenes()[0];
    if (cena && cena.listChildren().length === 0) {
      const comPai = new Set();
      for (const n of base.getRoot().listNodes()) for (const c of n.listChildren()) comPai.add(c);
      for (const n of base.getRoot().listNodes()) if (!comPai.has(n)) cena.addChild(n);
    }
  } else {
    const root = base.getRoot();
    const antesAnim = new Set(root.listAnimations());
    const antesNos = new Set(root.listNodes());
    const porNome = new Map(root.listNodes().map((n) => [n.getName(), n]));
    mergeDocuments(base, doc);
    for (const anim of root.listAnimations()) {
      if (antesAnim.has(anim)) continue;
      for (const canal of anim.listChannels()) {
        const alvo = canal.getTargetNode() && porNome.get(canal.getTargetNode().getName());
        if (!alvo) throw new Error(`${estado}: osso ${canal.getTargetNode()?.getName()} ausente na referência`);
        canal.setTargetNode(alvo);
      }
    }
    for (const n of root.listNodes()) if (!antesNos.has(n)) n.dispose();
    for (const s of root.listScenes().slice(1)) s.dispose();
  }
  linhas.push(`| ${estado} | ${id} | ${meta.duration.toFixed(4)} s | ${meta.loop ? 'sim' : 'não'} |`);
}

if (!base) throw new Error('nenhum clipe selecionado');
await base.transform(prune(), unpartition());
const saida = path.resolve('public/models/anims/extras.glb');
await io.write(saida, base);
const nomes = base.getRoot().listAnimations().map((a) => a.getName()).sort();
const esperados = Object.keys(FONTES).sort();
if (JSON.stringify(nomes) !== JSON.stringify(esperados)) throw new Error(`pacote divergente: ${nomes.join(', ')}`);

const fonteDoc = `# SOURCES — models/anims/extras.glb\n\n`
  + `Pacote único de estados extras 3P no esqueleto meshy-28. Gerado por `
  + `\`node tools/build-extras-pack.mjs --library=<biblioteca>/index.json\`; `
  + `os GLBs intermediários e FBX não são redistribuídos.\n\n`
  + `## Catálogo\n\n| Estado | ID do catálogo | Duração | Laço declarado |\n|---|---|---:|---|\n`
  + `${linhas.join('\n')}\n\n`
  + `Ausentes na biblioteca e com fallback procedural/estado atual: ${AUSENTES.map((x) => `\`${x}\``).join(', ')}.\n\n`
  + `## Licenças\n\n`
  + `- IDs \`mixamo/*\`: Adobe Mixamo, uso em jogos e mídia, inclusive comercial; a redistribuição dos FBX brutos não é permitida. https://helpx.adobe.com/mixamo/faq/mixamo-faq.html\n`
  + `- IDs \`ual/*\`: Quaternius Universal Animation Library, CC0 1.0 Universal. https://creativecommons.org/publicdomain/zero/1.0/\n\n`
  + `A conversão para meshy-28 preserva \`extras.clip.source.id\` em cada animação. `
  + `A mescla reaproveita os nós por nome e elimina cenas duplicadas; o jogo consome somente \`g.animations\`.\n`;
fs.writeFileSync('public/models/anims/extras.SOURCES.md', fonteDoc);
console.log(`EXTRAS-PACK ✓ ${nomes.length} clipes, ${fs.statSync(saida).size} bytes -> ${saida}`);
console.log(`EXTRAS-PACK fallbacks: ${AUSENTES.join(', ')}`);
