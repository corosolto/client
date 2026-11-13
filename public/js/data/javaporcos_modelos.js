export const MODELOS_JAVAPORCOS = Object.freeze({
  jovem: 'javali_jovem', adulto: 'javaporco_adulto',
  matriarca: 'matriarca_javali', ariete: 'ariete_javali',
  listrado: 'leitao_listrado', malhado: 'javaporco_malhado',
  ruivo: 'javaporco_ruivo', velho: 'javaporco_velho_cicatrizado',
});
/* Os valores são IDENTIFICADORES de GLB em models/enemies/javaporcos (review #1219):
   o retorno de varianteJavaporco resolve direto no modelo, sem apelido no meio. */
const variantes = Object.freeze({ jovem: [MODELOS_JAVAPORCOS.jovem, MODELOS_JAVAPORCOS.listrado], adulto: [MODELOS_JAVAPORCOS.adulto, MODELOS_JAVAPORCOS.malhado, MODELOS_JAVAPORCOS.ruivo], matriarca: [MODELOS_JAVAPORCOS.matriarca, MODELOS_JAVAPORCOS.velho], ariete: [MODELOS_JAVAPORCOS.ariete] });
export function varianteJavaporco(tipo, ordinal) {
  const opcoes = variantes[tipo] || [tipo];
  let seed = (Math.abs(Math.trunc(ordinal)) + 1) >>> 0;
  seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
  seed = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
  return opcoes[((seed ^ (seed >>> 16)) >>> 0) % opcoes.length];
}
