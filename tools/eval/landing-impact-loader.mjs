import { writeSync } from 'node:fs';
/* Quatro mutantes reais, um por vez, escolhidos por SIM_MUTANTE. Cada alvo é um literal
   ÚNICO (contado antes de aplicar) e o marcador pós-aplicação garante que a mutação
   aconteceu de verdade. Nomes e caminhos são whitelist; desconhecido é recusado na hora. */
const MUTANTES = new Map([
  ['sem-impacto', {
    arquivo: '/public/js/game.js',
    de: 'if (landImpact > 0) this._landingFx(p.pos, landImpact);',
    para: 'void landImpact;',
  }],
  ['sem-agua', {
    arquivo: '/public/js/game.js',
    de: "const low = this.settings?.quality === 'low';\n    let fx = low ? this.puffFx : this[key];",
    para: "const low = this.settings?.quality === 'low';\n    if (surface === 'water' && !low) return 0;\n    let fx = low ? this.puffFx : this[key];",
  }],
  ['altura-errada', {
    arquivo: '/public/js/map_corrego.js',
    de: '(Math.abs(x) <= CANAL_ABERTURA / 2 && Math.abs(z) <= HALF_Z) ? CANAL_AGUA : null',
    para: '(Math.abs(x) <= CANAL_ABERTURA / 2 && Math.abs(z) <= HALF_Z) ? 0.02 : null',
  }],
  ['sem-limpeza', {
    arquivo: '/public/js/game.js',
    de: '      fx.points?.material?.dispose();\n      fx.uniforms?.uTex?.value?.dispose?.();',
    para: '      void fx; // mutante sem-limpeza: dispose removido, array de cleanup intacto',
  }],
]);

const mutante = process.env.SIM_MUTANTE || '';
if (mutante && !MUTANTES.has(mutante)) {
  throw new Error(`mutante desconhecido: ${mutante} (whitelist: ${[...MUTANTES.keys()].join(', ')})`);
}

export async function load(url, context, nextLoad) {
  const loaded = await nextLoad(url, context);
  if (!mutante || loaded.source == null) return loaded;
  const alvo = MUTANTES.get(mutante);
  if (!url.endsWith(alvo.arquivo)) return loaded;
  const { de, para } = alvo;
  const before = String(loaded.source);
  const ocorrencias = before.split(de).length - 1;
  if (ocorrencias !== 1) {
    throw new Error(`mutante ${mutante}: alvo não é literal único em ${alvo.arquivo} (${ocorrencias} ocorrências)`);
  }
  const source = before.replace(de, para);
  if (source === before) throw new Error(`mutante ${mutante} não foi aplicado em ${alvo.arquivo}`);
  writeSync(2, `MUTACAO_POUSO_APLICADA:${mutante}\n`);
  return { ...loaded, source };
}
