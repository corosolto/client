import { writeSync } from 'node:fs';
/* Um mutante real por vez, escolhido por SIM_LOOK_MUTANTE (whitelist; desconhecido é
   recusado na hora). O alvo é a âncora ÚNICA do applyLook do Carandiru (contada antes
   de aplicar) e o marcador pós-aplicação prova que a mutação aconteceu de verdade.
   Transformação 100% em memória: nenhum byte vai pro disco. */
const ALVO = new URL('../../public/js/map_penitenciaria.js', import.meta.url).href;
const ANCORA = "const { hemi, sun } = applyLook(scene, T, 'penitenciaria');";
const PARA = "const { hemi, sun } = applyLook(scene, T, 'corrego');";

const mutante = process.env.SIM_LOOK_MUTANTE || '';
if (mutante && mutante !== 'corrego') {
  throw new Error(`mutante desconhecido: ${mutante} (whitelist: corrego)`);
}

export async function load(url, context, nextLoad) {
  const loaded = await nextLoad(url, context);
  if (!mutante || loaded.source == null) return loaded;
  if (url !== ALVO) return loaded;
  const before = String(loaded.source);
  const ocorrencias = before.split(ANCORA).length - 1;
  if (ocorrencias !== 1) {
    throw new Error(`mutante ${mutante}: âncora não é literal único em ${ALVO} (${ocorrencias} ocorrências)`);
  }
  const source = before.replace(ANCORA, PARA);
  if (source === before) throw new Error(`mutante ${mutante} não foi aplicado em ${ALVO}`);
  writeSync(2, `LOOK_BINDING_APPLIED:${mutante}\n`);
  return { ...loaded, source };
}
