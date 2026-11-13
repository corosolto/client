#!/usr/bin/env node
/* Monta UM pacote compartilhado de clipes extras 3P a partir da biblioteca convertida.
   Nenhum FBX entra no repositório: a saída contém somente clipes meshy-28 já retargetados.
   Uso: node tools/build-extras-pack.mjs --library=<caminho>/library/index.json */
import fs from 'node:fs';
import path from 'node:path';
import { lerBiblioteca, montarPack, gravarPack, LICENCAS } from './anim-pack.mjs';

const { index, libraryDir, clipsOut } = lerBiblioteca(process.argv,
  'uso: node tools/build-extras-pack.mjs --library=<caminho>/library/index.json');

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
const pack = await montarPack({
  index, libraryDir, clipsOut,
  fontes: Object.entries(FONTES),
  validar(estado, meta) {
    if (meta.key !== estado && !(estado === 'run_back_pistol' && meta.keyStatus === 'proposed')) {
      throw new Error(`${estado}: catálogo ${meta.id} declara key=${meta.key}`);
    }
  },
  ajustar(estado, animacao) {
    // A faca não move a cabeça: o aim/head-lag do runtime já a controla, e a tomada
    // levantava a malha do pescoço da dama-creepy acima do teto de 3,5× (medido em R2).
    if (estado === 'knife_stab') {
      for (const canal of animacao.listChannels()) {
        if (/^(Head|neck)$/.test(canal.getTargetNode()?.getName() || '')) animacao.removeChannel(canal);
      }
    }
    // Na pistola o punho da mão dominante fica com o clipe-base; o take UAL torcia
    // a mão direita de nanica/coronel-arrego além do teto de 2,5× (R1).
    if (estado === 'reload_pistol') {
      for (const canal of animacao.listChannels()) {
        if (canal.getTargetNode()?.getName() === 'RightHand') animacao.removeChannel(canal);
      }
    }
  },
});
const linhas = pack.metas.map(({ nome, id, meta }) => `| ${nome} | ${id} | ${meta.duration.toFixed(4)} s | ${meta.loop ? 'sim' : 'não'} |`);
const saida = path.resolve('public/models/anims/extras.glb');
const nomes = await gravarPack(pack, saida, Object.keys(FONTES));

const fonteDoc = `# SOURCES — models/anims/extras.glb\n\n`
  + `Pacote único de estados extras 3P no esqueleto meshy-28. Gerado por `
  + `\`node tools/build-extras-pack.mjs --library=<biblioteca>/index.json\`; `
  + `os GLBs intermediários e FBX não são redistribuídos.\n\n`
  + `## Catálogo\n\n| Estado | ID do catálogo | Duração | Laço declarado |\n|---|---|---:|---|\n`
  + `${linhas.join('\n')}\n\n`
  + `Ausentes na biblioteca e com fallback procedural/estado atual: ${AUSENTES.map((x) => `\`${x}\``).join(', ')}.\n\n`
  + LICENCAS
  + `A conversão para meshy-28 preserva \`extras.clip.source.id\` em cada animação. `
  + `A mescla reaproveita os nós por nome e elimina cenas duplicadas; o jogo consome somente \`g.animations\`.\n`;
fs.writeFileSync('public/models/anims/extras.SOURCES.md', fonteDoc);
console.log(`EXTRAS-PACK ✓ ${nomes.length} clipes, ${fs.statSync(saida).size} bytes -> ${saida}`);
console.log(`EXTRAS-PACK fallbacks: ${AUSENTES.join(', ')}`);
