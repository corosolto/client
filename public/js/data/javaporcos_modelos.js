export const MODELOS_JAVAPORCOS = Object.freeze({
  jovem: 'javali_jovem', adulto: 'javaporco_adulto',
  matriarca: 'matriarca_javali', ariete: 'ariete_javali',
  listrado: 'leitao_listrado', malhado: 'javaporco_malhado',
  ruivo: 'javaporco_ruivo', velho: 'javaporco_velho_cicatrizado',
});
const variantes = Object.freeze({ jovem: ['jovem', 'listrado'], adulto: ['adulto', 'malhado', 'ruivo'], matriarca: ['matriarca', 'velho'], ariete: ['ariete'] });
export function varianteJavaporco(tipo, ordinal) {
  const opcoes = variantes[tipo] || [tipo];
  let seed = (Math.abs(Math.trunc(ordinal)) + 1) >>> 0;
  seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
  seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
  return opcoes[((seed ^ (seed >>> 16)) >>> 0) % opcoes.length];
}
