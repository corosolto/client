/* Aceitação do censo em CONTAGENS INTEIRAS: `r.cobertura`/`r.densidade.total` são
   apresentação arredondada e já deixaram mapa abaixo da meta passar — doc em GRAFITE-CENSO.md. */
import { writeFileSync } from 'node:fs';

/* Escrita do --out/JSON, usada pelo graffiti-census.mjs (R1: import perdido quebrou --out). */
export const gravarOut = (destino, out) => {
  writeFileSync(destino, JSON.stringify(out, null, 1));
  console.log('-> ' + destino);
};
export const coberturaApresentada = (pintadas, placas) =>
  placas > 0 ? Math.round(1000 * pintadas / placas) / 10 : 0;
export const densidadeApresentada = (pecas, placas) =>
  placas > 0 ? Math.round(100 * pecas / placas) / 100 : 0;

const metaDecimil = (meta) => Math.round(meta * 10);
const tetoCentesimo = (teto) => Math.round(teto * 100);

/* Piso: pintadas/placas >= meta/100, em produto inteiro — sem float de ponto médio. */
export const coberturaPasse = (pintadas, placas, meta) => {
  if (!Number.isInteger(pintadas) || !Number.isInteger(placas) || placas < 0 || pintadas < 0)
    throw new Error(`contagem inválida: pintadas=${pintadas} placas=${placas}`);
  if (placas === 0) return meta <= 0;              // sem placa medida só passa sem meta
  return meta <= 0 || pintadas * 1000 >= metaDecimil(meta) * placas;
};
export const coberturaMinima = (placas, meta) => Math.ceil(metaDecimil(meta) * placas / 1000);

/* Teto: pecas/placas <= teto, idem inteiro. */
export const densidadePasse = (pecas, placas, teto) => {
  if (!Number.isInteger(pecas) || !Number.isInteger(placas) || pecas < 0 || placas < 0)
    throw new Error(`contagem inválida: pecas=${pecas} placas=${placas}`);
  if (placas === 0 || teto <= 0) return true;
  return pecas * 100 <= tetoCentesimo(teto) * placas;
};

/* Mesma decisão do loop do graffiti-census.mjs, agora por contagem crua.
   `r` é o retorno do CENSO: pecas/placas/pintadas inteiros, orfas.{ar,chao}. */
export function avaliarMapa(id, r, limites) {
  const { META = {}, TETO = {}, ORFAS = {} } = limites || {};
  const reprovados = [];
  const meta = META[id] || 0, teto = TETO[id] || 0;
  if (!coberturaPasse(r.pintadas, r.placas, meta))
    reprovados.push({ id, cobertura: coberturaApresentada(r.pintadas, r.placas), meta, pintadas: r.pintadas, placas: r.placas });
  const orfasTotal = (r.orfas?.ar || 0) + (r.orfas?.chao || 0);
  if (orfasTotal > (ORFAS[id] || 0)) reprovados.push({ id, orfas: orfasTotal, tolerado: ORFAS[id] || 0 });
  if (!densidadePasse(r.pecas, r.placas, teto))
    reprovados.push({ id, densidade: densidadeApresentada(r.pecas, r.placas), teto, pecas: r.pecas, placas: r.placas });
  return reprovados;
}

/* `node tools/eval/graffiti-census-accept.mjs --prova` — fronteira sem browser, com a
   MESMA função de aceitação: piso/teto exatos ±1 e os casos de apresentação mentindo. */
if (process.argv[1]?.endsWith('graffiti-census-accept.mjs') && process.argv.includes('--prova')) {
  const META = { piscina_treta: 59.2, loja_h: 29.9, ferro_velho: 14, quebrada: 43.8,
    escadao: 11, corrego: 29, posto_treta: 13.9, lajes: 3 };
  const TETO = { piscina_treta: 0.85, loja_h: 0.7, ferro_velho: 0.5, quebrada: 0.8,
    escadao: 0.3, corrego: 0.25, posto_treta: 0.25 };
  let falhas = 0;
  const check = (nome, cond) => { if (!cond) { falhas++; console.error('FALHOU: ' + nome); } };

  for (const [id, meta] of Object.entries(META)) {
    for (const placas of [2000, 997]) {
      const min = coberturaMinima(placas, meta);
      check(`${id} piso acima (${min}/${placas} ≥ ${meta}%)`, coberturaPasse(min, placas, meta));
      check(`${id} piso abaixo (${min - 1}/${placas} < ${meta}%)`, !coberturaPasse(min - 1, placas, meta));
    }
  }
  for (const [id, teto] of Object.entries(TETO)) {
    for (const placas of [1000, 997]) {
      const max = Math.floor(tetoCentesimo(teto) * placas / 100);
      check(`${id} teto dentro (${max}/${placas} ≤ ${teto})`, densidadePasse(max, placas, teto));
      check(`${id} teto fora (${max + 1}/${placas} > ${teto})`, !densidadePasse(max + 1, placas, teto));
    }
  }
  const replica = avaliarMapa('piscina_treta',
    { pintadas: 1183, placas: 2000, pecas: 1701, orfas: { ar: 0, chao: 0 } }, { META, TETO });
  check('avaliarMapa reprova cobertura e densidade crua',
    replica.length === 2 && replica[0].pintadas === 1183 && replica[1].pecas === 1701);
  check('cobertura 1183/2000 apresenta 59.2 mas reprova',
    coberturaApresentada(1183, 2000) === 59.2 && !coberturaPasse(1183, 2000, 59.2));
  check('densidade 851/1000 apresenta 0.85 mas reprova',
    densidadeApresentada(851, 1000) === 0.85 && !densidadePasse(851, 1000, 0.85));
  // Casos-cláusula: meta 0, sem placa, e erro distinto de detecção para contagem inválida.
  check('meta 0 sempre passa', coberturaPasse(0, 500, 0));
  check('sem placa com meta reprova', !coberturaPasse(0, 0, 3));
  let invalido = '';
  try { coberturaPasse(NaN, 10, 3); } catch (e) { invalido = e.message; }
  check('NaN falha com cláusula própria', invalido.startsWith('contagem inválida'));
  // Integração: avaliarMapa usa as mesmas contagens, não a apresentação.

  console.log(falhas ? `PROVA VERMELHA — ${falhas} verificação(ões)` : 'PROVA VERDE — fronteira inteira exata');
  process.exit(falhas ? 1 : 0);
}
