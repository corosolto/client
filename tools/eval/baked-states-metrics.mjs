/* Regra de troca por estado (aprovada pelo dono em 09/11) — fonte única do importador e da régua.
   O clipe assado SUBSTITUI o atual num estado quando:
     1. não cria reprovação nova no QA do Studio (todo check que passa no atual passa no novo);
     2. num check que reprova nos DOIS, o valor novo não piora mais de 10% sobre o atual;
     3. stretch marcado `[rig]` (peso da malha, não o clipe) não conta contra o clipe.
   Os checks e os textos de falha são os de `evaluateClip` (studio tools/lib/clip-qa.mjs). O
   valor de cada check vem das métricas do mesmo resultado, no sentido "maior = pior". */
export const CHECKS = Object.freeze([
  ['ds', 'foot slide (cm)', /^foot slide /, (m) => m.footSlide.maxCm, false],
  ['pn', 'floor penetration (−cm)', /^floor penetration /, (m) => -m.lowestVertex.minCm, false],
  ['cl', 'heel sinks (−cm)', /^heel sinks /, (m) => -m.lowestVertex.byRegionCm.heel, false],
  ['fl', 'floats (cm)', /^floats /, (m) => m.lowestVertex.floatOverSourceCm ?? m.lowestVertex.maxCm, false],
  ['qd', 'hips rise (× bind)', /^hips rise /, (m) => m.hips.maxRatio, false],
  ['ec', 'loop seam (cm)', /^loop seam [\d.]+ cm/, (m) => m.loopSeam.positionCm, false],
  ['eg', 'loop seam (°)', /^loop seam [\d.]+°/, (m) => m.loopSeam.rotationDeg, false],
  ['pg', 'two-hand grip (cm)', /^two-hand grip /, (m) => m.hands.maxDeviationCm, false],
  ['st', 'skin stretch (×)', /^skin stretch /, (m) => m.stretch.maxEdge.value, true],
  ['sc', 'back stretch (×)', /^back stretch /, (m) => m.stretch.backMaxEdge.value, true],
  ['se', 'hand L stretch (×)', /^hand L stretch /, (m) => m.stretch.handMaxEdgeL.value, true],
  ['sd', 'hand R stretch (×)', /^hand R stretch /, (m) => m.stretch.handMaxEdgeR.value, true],
  ['cs', 'seam opens (m)', /^seam opens /, (m) => m.stretch.seamGapMax.value, true],
]);
const ESTICA = new Set(CHECKS.filter((c) => c[4]).map(([codigo]) => codigo));
export const LEGENDA = Object.freeze(Object.fromEntries(CHECKS.map(([codigo, rotulo]) => [codigo, rotulo])));
export const TOLERANCIA_PIORA = 0.10;
// Chave dos checks reprovados que NÃO contam (stretch `[rig]`, regra 3): códigos separados por espaço.
export const RIG = '~';

/* Resultado do QA → { check: valor } das reprovações que contam, mais `~: "st cs"` com os
   stretch `[rig]` (sem valor: não entram na regra). */
export function falhasDe(result) {
  const out = {}, rig = new Set();
  for (const texto of result.failures) {
    const check = CHECKS.find(([, , re]) => re.test(texto));
    if (!check) throw new Error(`${result.name}: falha do QA sem check conhecido: ${texto}`);
    const [codigo, , , valor, estica] = check;
    if (estica && /\[rig[:\]]/.test(texto)) rig.add(codigo);
    else out[codigo] = valor(result.metrics);
  }
  if (rig.size) out[RIG] = [...rig].join(' ');
  return out;
}

/* Motivos para MANTER o clipe atual; lista vazia = substituir. `atual` e `novo` são
   saídas de falhasDe. */
export function motivosParaManter(atual, novo) {
  const motivos = [];
  for (const [check, valorNovo] of Object.entries(novo)) {
    if (check === RIG) {
      for (const c of String(valorNovo).split(' ')) if (!ESTICA.has(c)) motivos.push(`[rig] fora de stretch: ${c}`);
      continue;
    }
    if (!(check in LEGENDA)) { motivos.push(`check desconhecido: ${check}`); continue; }
    if (!(check in atual)) { motivos.push(`reprovação nova: ${check} ${valorNovo}`); continue; }
    const valorAtual = atual[check];
    if (valorNovo > valorAtual * (1 + TOLERANCIA_PIORA) + 1e-9) motivos.push(`${check} piora ${valorAtual} → ${valorNovo} (> +10%)`);
  }
  return motivos;
}

/* A regra ANTIGA (rejeitada): qualquer número pior, mesmo dentro do threshold. Só existe
   para o mutante `regra-ruido` provar que ela recusa clipe válido. Piso maior = melhor. */
export function motivosRegraRuido(pisoAtual, pisoNovo, atual, novo) {
  const motivos = [];
  if (pisoNovo < pisoAtual) motivos.push(`piso ${pisoAtual} → ${pisoNovo} cm`);
  for (const [check, v] of Object.entries(novo)) if (check !== RIG && check in atual && v > atual[check]) motivos.push(`${check} ${atual[check]} → ${v}`);
  return motivos;
}

/* Veto de runtime: `eval:<régua> <medição>`. A régua tem que existir em package.json e a
   medição tem que ter uma das formas abaixo, com os números do lado ruim da própria régua.
   Retorna o erro, ou null se o veto é válido. */
const N = '(\\d+(?:\\.\\d+)?)';
const FORMAS_VETO = {
  postura: [[new RegExp(`^COTOVELO=${N}° \\(faixa ${N}°–${N}°\\)`), ([v, lo, hi]) => v < lo || v > hi, 'cotovelo fora da faixa']],
  tpanim3p: [[new RegExp(`^AN1 pente→mão idle/recarga ${N}/${N}→${N}/${N} cm$`), ([idle, , idleNovo]) => idleNovo < idle, 'idle assado mais perto do pente']],
  select: [
    [new RegExp(`^dívida piora ${N}/${N}→${N}/${N}$`), ([a, b, c, d]) => c > a || d > b, 'dívida maior com o assado'],
    [new RegExp(`^${N}/${N} > teto ${N}/${N}$`), ([a, b, ta, tb]) => a > ta || b > tb, 'assado acima do teto'],
    [new RegExp(`^referência do teto: o \\w+ assado baixa o teto global ${N}/${N} → ${N}/${N} e reabre a dívida do elenco$`), ([a, b, c, d]) => c < a && d < b, 'teto global mais baixo'],
  ],
  'death-camera-consistency': [[/^mutante ([a-z-]+) sobrevive com o death assado \(.*: (\d+) de (\d+) clausulas acendem\)$/, ([, acesas, total]) => acesas === 0 && total > 0, 'mutante da régua sobrevive']],
};
export function erroDoVeto(veto, scripts) {
  const m = /^eval:([a-z0-9-]+) (.+)$/.exec(String(veto));
  if (!m) return 'sem `eval:<régua> <medição>`';
  const [, regua, medicao] = m;
  if (!scripts[`eval:${regua}`]) return `régua eval:${regua} não existe em package.json`;
  if (!FORMAS_VETO[regua]) return `eval:${regua} não é régua de runtime aceita para veto`;
  for (const [forma, piora, rotulo] of FORMAS_VETO[regua]) {
    const g = forma.exec(medicao);
    if (!g) continue;
    const nums = g.slice(1).map((x) => (/^\d+(\.\d+)?$/.test(x) ? Number(x) : x));
    if (regua === 'death-camera-consistency' && !scripts[`eval:${regua}`].includes(`--mutante=${nums[0]}`)) return `mutante ${nums[0]} não existe em eval:${regua}`;
    return piora(nums) ? null : `medição não mostra piora (${rotulo}): ${medicao}`;
  }
  return `medição fora das formas de eval:${regua}: ${medicao}`;
}
