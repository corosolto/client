/* Validadores puros dos gates #1179: finitude ANTES da comparação e cobertura sem
   dup/missing/extra. Medida ausente/não finita reprova, nunca aprova. */
export const finite = (v) => typeof v === 'number' && Number.isFinite(v);
export const naoFinitos = (o, keys) => keys.filter((k) => !finite(o[k]));

export function cobertura(chaves, esperadas) {
  const vistas = new Set(), dup = [];
  for (const c of chaves) vistas.has(c) ? dup.push(c) : vistas.add(c);
  return { dup, missing: esperadas.filter((c) => !vistas.has(c)), extra: chaves.filter((c) => !esperadas.includes(c)) };
}

const max = (a, k) => Math.max(...a.map((x) => x[k]));
const min = (a, k) => Math.min(...a.map((x) => x[k]));
/* Amplitude real max−min: critério de deriva compartilhado entre LA5 (browser) e
   DERIVA-GRAUS/DERIVA-M (gate Node preview-grip-phase) — mesmo limiar, mesma função. */
export const amplitude = (a, k) => max(a, k) - min(a, k);
/* LA1..LA5 do lobby-arma-mao-check: medida não finita ou ausente reprova, nunca aprova. */
export function lobbyFalhas(r, TETO, TETO_PEGADA) {
  if (r.erro) return { falhas: [], invalidas: [`caso com erro: ${r.erro}`] };
  const a = r.amostras;
  if (!Array.isArray(a)) return { falhas: [], invalidas: ['sem amostras'] };
  if (a.length !== 8) return { falhas: [], invalidas: [`amostras ${a.length}, esperadas exatamente 8`] };
  const ruins = a.flatMap((s, i) => naoFinitos(s, ['pegada', 'palma', 'caixa', 'canoZ']).map((k) => `amostra ${i}: ${k} não finito`));
  if (ruins.length) return { falhas: [], invalidas: ruins };
  const [cid] = r.caso;
  const f = [];
  if (max(a, 'pegada') > (TETO_PEGADA[cid] ?? TETO.pegadaGraus)) f.push('LA1');
  if (max(a, 'palma') > TETO.palmaM) f.push('LA2');
  if (max(a, 'caixa') > Math.max(TETO.caixaM, (finite(r.caixaJogo) ? r.caixaJogo : 0) + 0.005)) f.push('LA3');
  if (min(a, 'canoZ') < TETO.canoZmin) f.push('LA4');
  if (amplitude(a, 'pegada') > TETO.derivaGraus || amplitude(a, 'palma') > TETO.derivaM) f.push('LA5');
  return { falhas: f, invalidas: [] };
}

/* Veredito da mira-alinhada: MA1 só conta com a matriz completa, sem dup/missing/extra,
   sem erro de coleta e sem medida não finita — o mutante não resgata cenário faltante. */
export function miraVeredito(linhas, { aspectos, cams, armas, emLinha }) {
  const esperadas = [];
  for (const asp of aspectos) for (const cam of cams) for (const arma of armas) for (const ads of [false, true])
    esperadas.push(`${asp}|${cam}|${arma}|${ads}`);
  const chave = (l) => `${l.asp}|${l.cam}|${l.arma}|${l.ads}`;
  const cob = cobertura(linhas.map(chave), esperadas);
  const faltou = linhas.filter((l) => l.erro);
  const massaRuim = (l) => (l.cam === 'first' || l.massa !== undefined) && !finite(l.massa);
  const invalidas = linhas.filter((l) => !l.erro && (!finite(l.ang) || !finite(l.px) || massaRuim(l)));
  const ma1 = linhas.filter((l) => !l.erro && finite(l.ang) && finite(l.px) && l.cam === 'first' && l.ads)
    .filter((l) => l.ang > 1 || l.px > 4 || (emLinha(l.arma) && l.massa > 4));
  const prontas = !cob.dup.length && !cob.missing.length && !cob.extra.length && !faltou.length && !invalidas.length;
  return { ma1, faltou, invalidas, cob, prontas, aprovado: prontas && !ma1.length };
}
