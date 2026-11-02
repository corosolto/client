#!/usr/bin/env node
/* ============================================================================
   ambiente-mapas.mjs — v9: os mapas TOCAM a ambiência autoral do pack.
   ----------------------------------------------------------------------------
   Até o v8 o pack público não trazia ambiência nenhuma e este passo não
   existia: `ensure-map-soundscapes` instalava hum sintetizado em todo mapa e a
   ambiência real de `soundscape.js` era 404 garantido em produção. O
   audio-pack-v9 traz as 17 faixas (16 CC0 Freesound + 1 Mint, procedência em
   `public/audio/ambiente/FONTE.md`) sob nomes binários, e ESTE script escreve o
   override por mapa no manifest com os caminhos RESOLVIDOS:

     mapSoundscapes.<id> = { loops: [...], shots: [...] }

   · loops: o `world.sound` REAL de cada mapa (construído pelo mesmo harness das
     réguas — `maps.js` continua sendo a fonte autoritativa; pos/radius/vol/tag
     passam intocados, só o `src` vira `audio/a/<sha1-16>.mp3`);
   · shots: os pools de `BIOME_SHOTS` do bioma do mapa, também resolvidos. O
     override vai SEM `bioma` de propósito: o `soundscape.js` soma
     `BIOME_SHOTS[bioma]` (caminhos crus, 404 no pack) ao `config.shots`; com os
     pools já resolvidos no override, o caminho cru nunca é fetchado.

   CONTRATO DE FALHA: asset que o código nomeia e o pack não traz REPROVA a
   instalação (exit 1) — é o que impede o mapa subir mudo com portão verde. A
   verificação é dupla: o arquivo tem de existir no disco E o sha1 do conteúdo
   tem de bater com a tabela `ambiente-pack.mjs`.

   NÃO RECORRE o que já está curado: entrada com loops/shots no manifest fica;
   entrada puramente sintética (era do v8) SOBE para a real. Cobertura sai
   completa para todos os `MAP_IDS` — mapa sem `world.sound` (atacadao_treta)
   recebe o hum sintetizado, igual à era v8.

   Roda SÓ no ramo público do `fetch-audio.sh`: o pack privado é curado pelo
   dono e não traz as faixas do v9 — traduzir para ele seria inventar 404.
   ============================================================================ */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMBIENTE_PACK, resolveAmbientePack, sha1Arquivo } from './ambiente-pack.mjs';
import { carregarMapIds } from './map-ids.mjs';

/* O harness (THREE + MAPS + initTextures) e os pools de bioma entram SÓ quando
   um mapa precisa mesmo ser construído — entrada curada não paga o build e uma
   árvore de teste que cobre tudo (estado do pack privado) nem os importa. */
const MAP_IDS = carregarMapIds();
let arnes = null;
const carregaArnes = async () => {
  if (arnes) return arnes;
  const { THREE, MAPS, initTextures } = await import('../eval/harness.mjs');
  const { BIOME_SHOTS } = await import('../../public/js/soundscape.js');
  arnes = { THREE, MAPS, BIOME_SHOTS, textures: await initTextures() };
  return arnes;
};
let reais = 0, sinteticos = 0, subidos = 0;

const raiz = (process.argv.find((a) => a.startsWith('--raiz=')) || '').slice(7) || 'public';
const caminho = join(raiz, 'audio', 'manifest.json');
if (!existsSync(caminho)) {
  console.error(`AUDIO: manifest ausente em ${caminho}`);
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(caminho, 'utf8'));
manifest.mapSoundscapes ||= {};

const faltando = [];
const traduz = (id, src) => {
  const pack = resolveAmbientePack(src);
  if (!pack) { faltando.push(`${id}: src não catalogado no pack v9: ${src}`); return src; }
  const disco = join(raiz, pack);
  if (!existsSync(disco)) { faltando.push(`${id}: pack não trouxe ${pack} (${src})`); return pack; }
  if (sha1Arquivo(disco) !== AMBIENTE_PACK[src.slice('audio/ambiente/'.length)]) {
    faltando.push(`${id}: sha1 de ${pack} diverge da tabela do v9`);
  }
  return pack;
};
const resolveLoops = (loops, id) => loops.map((loop) => ({ ...loop, src: traduz(id, loop.src) }));
const resolveShotPool = (id) => (pool) => ({ ...pool, srcs: pool.srcs.map((src) => traduz(id, src)) });

for (const id of MAP_IDS) {
  const atual = manifest.mapSoundscapes[id];
  /* Curado de verdade (loops/shots publicados) não se toca; synth da era v8 sobe. */
  const curado = !!(atual?.loops?.some((l) => typeof l?.src === 'string') || atual?.shots?.some((s) => s.srcs?.length));
  if (curado) continue;

  const { THREE, MAPS, BIOME_SHOTS, textures } = await carregaArnes();
  const registro = MAPS[id];
  const world = registro?.build ? registro.build(new THREE.Scene(), textures) : null;
  const sound = world?.sound || null;
  world?.dispose?.();

  const loops = (sound?.loops || []).filter((l) => typeof l?.src === 'string');
  if (loops.length || sound?.synth) {
    if (atual?.synth?.kind) subidos++;
    manifest.mapSoundscapes[id] = {
      ...(sound.synth ? { synth: sound.synth } : {}),
      loops: resolveLoops(loops, id),
      shots: (BIOME_SHOTS[sound?.bioma] || []).map(resolveShotPool(id)),
    };
    reais++;
  } else {
    /* Sem sound autoral (hoje: atacadao_treta) fica no hum da era v8 — sala
       fechada com latido é defeito; silêncio tectônico aqui é o estado honesto. */
    manifest.mapSoundscapes[id] = { synth: { kind: 'indoor-hum', vol: 0.012 } };
    sinteticos++;
  }
}

if (faltando.length) {
  console.error(`AUDIO-AMBIENTE: ${faltando.length} asset(s) que o código nomeia o pack v9 não entregou:`);
  for (const f of [...new Set(faltando)].slice(0, 12)) console.error('  ' + f);
  if (new Set(faltando).size > 12) console.error(`  … e mais ${new Set(faltando).size - 12}`);
  console.error('O mapa subiria mudo com portão verde. Confira AUDIO_PACK_URL e a release do pack.');
  process.exit(1);
}

writeFileSync(caminho, JSON.stringify(manifest, null, 1) + '\n');
console.log(`AUDIO-AMBIENTE: ${reais} mapas com ambiência real do v9 (${subidos} subiram do hum v8; `
  + `${sinteticos} sem sound autoral ficam no hum sintetizado); cobertura ${MAP_IDS.length}/${MAP_IDS.length}.`);
