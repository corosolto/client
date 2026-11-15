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

/* Vetos descobertos pelo censo do rig depois que os packs assados foram comparados
   contra os tetos congelados do jogo. O importador preserva o clipe anterior quando
   qualquer métrica agregada de deformação piora. */
export const RIG_VETOS = Object.freeze({
  'adjim/run': 'eval:rig-census clipes corpo 4.354>3.966 no run',
  'bandeirante/crouchwalk': 'eval:rig-census clipes corpo 3.339>3.092 no crouchwalk',
  'bombado/crouch': 'eval:rig-census clipes corpo 2.961>2.616 no crouch',
  'cadequinha/death': 'eval:rig-census clipes corpo 2.938>2.485 no death',
  'camera-roxa/death': 'eval:rig-census clipes mão L 1.707>1.614 no death',
  'caminhoneiro/crouch': 'eval:rig-census clipes corpo 3.143>2.622 no crouch',
  'canarinho/crouch': 'eval:rig-census clipes corpo 3.083>2.675 no crouch',
  'canarinho/crouchwalk': 'eval:rig-census clipes costas 2.088>1.986 no crouchwalk',
  'capitao/death': 'eval:rig-census clipes costas 3.107>2.76 no death',
  'clubber/death': 'eval:rig-census clipes corpo 2.949>2.688 no death',
  'coach/jump': 'eval:rig-census clipes mão R 1.592>1.47 no jump',
  'cuca/shoot': 'eval:rig-census clipes costas 7.632>7.256 no shoot',
  'curupira/death': 'eval:rig-census clipes costas 2.009>1.9 no death',
  'deputado/death': 'eval:rig-census clipes corpo 5.876>5.235 no death',
  'doidinho-bairro/crouchwalk': 'eval:rig-census clipes costas 4.783>4.24 no crouchwalk',
  'doidinho-bairro/death': 'eval:rig-census clipes mão L 2.232>1.78 no death',
  'doidinho-bairro/jump': 'eval:rig-census clipes costas 4.651>4.24 no jump',
  'doidinho-bairro/shoot': 'eval:rig-census clipes costas 4.485>4.24 no shoot',
  'esbirro/crouch': 'eval:rig-census clipes mão R 1.719>1.521 no crouch',
  'fluxo/run': 'eval:rig-census clipes corpo 3.456>3.116 no run',
  'fluxo/walk': 'eval:rig-census clipes corpo 3.318>3.116 no walk',
  'fluxo/walkfire': 'eval:rig-census clipes corpo 3.318>3.116 no walkfire',
  'mst/walk1h': 'eval:rig-census clipes corpo 3.278>3.044 no walk1h',
  'proerd/crouch': 'eval:rig-census clipes corpo 2.8>2.488 no crouch',
  'dollynho/death': 'eval:rig-census clipes mão L 2.083>1.923 no death',
  'emo/crouch': 'eval:rig-census clipes corpo 2.504>2.316 no crouch',
  'esbirro/death': 'eval:rig-census clipes mão R 1.789>1.521 no death',
  'fluxo/death': 'eval:rig-census clipes corpo 3.5>3.116 no death',
  'jozo/crouch': 'eval:rig-census clipes corpo 3.235>2.61 no crouch',
  'julia-zanatta/death': 'eval:rig-census clipes costas 4.845>4.534 no death',
  'mariabonita/death': 'eval:rig-census clipes corpo 5.087>4.573 no death',
  'mistico/death': 'eval:rig-census clipes corpo 2.48>2.334 no death',
  'mst/idle1h': 'eval:rig-census clipes corpo 3.31>3.044 no idle1h',
  'ostentacao/death': 'eval:rig-census clipes corpo 2.298>2.097 no death',
  'proerd/death': 'eval:rig-census clipes corpo 3.242>2.488 no death',
  'punk/death': 'eval:rig-census clipes mão L 1.537>1.425 no death',
  'reggae/crouch': 'eval:rig-census clipes corpo 2.321>2.015 no crouch',
  'reggae/death': 'eval:rig-census clipes costas 1.832>1.734 no death',
  'sertanejo/walk': 'eval:rig-census clipes corpo 4.616>4.333 no walk',
  'skatista/crouch': 'eval:rig-census clipes corpo 3.493>3.111 no crouch',
  'bombado/death': 'eval:rig-census clipes mão L 1.712>1.691 no death',
  'bonzo/jump': 'eval:rig-census clipes mão R 1.482>1.467 no jump',
  'caipora/shoot': 'eval:rig-census clipes mão L 1.464>1.463 no shoot',
  'capitao/crouch': 'eval:rig-census clipes corpo 4.064>4.044 no crouch',
  'capitao/run': 'eval:rig-census clipes costas 2.83>2.76 no run',
  'chave/walk1h': 'eval:rig-census clipes costas 1.857>1.852 no walk1h',
  'cuca/death': 'eval:rig-census clipes costas 7.429>7.256 no death',
  'dama/death': 'eval:rig-census clipes corpo 4.266>4.224 no death',
  'doidinho-bairro/run': 'eval:rig-census clipes costas 4.434>4.24 no run',
  'doidinho-bairro/walk': 'eval:rig-census clipes costura 0.06546>0.06235 no walk',
  'doutora/death': 'eval:rig-census clipes corpo 2.172>2.071 no death',
  'doutora/walk1h': 'eval:rig-census clipes costas 2.049>2.037 no walk1h',
  'esbirro/walk': 'eval:rig-census clipes mão R 1.552>1.521 no walk',
  'gotinha/crouchwalk': 'eval:rig-census clipes costas 2.969>2.947 no crouchwalk',
  'gotinha/death': 'eval:rig-census clipes mão L 1.984>1.891 no death',
  'gotinha/crouch': 'eval:rig-census clipes mão R 1.415>1.411 no crouch',
  'jozo/death': 'eval:rig-census clipes corpo 2.695>2.61 no death',
  'jozo/jump': 'eval:rig-census clipes mão R 1.805>1.777 no jump',
  'lobisomem/death': 'eval:rig-census clipes mão L 1.669>1.619 no death',
  'marina-silva/death': 'eval:rig-census clipes mão L 1.973>1.889 no death',
  'ministro/death': 'eval:rig-census clipes corpo 16.914>16.284 no death',
  'mistico/walk1h': 'eval:rig-census clipes costas 2.332>2.304 no walk1h',
  'oakley/shoot': 'eval:rig-census clipes corpo 4.114>4.004 no shoot',
  'ostentacao/crouch': 'eval:rig-census clipes corpo 2.169>2.097 no crouch',
  'pagodeiro/crouch': 'eval:rig-census clipes corpo 2.432>2.4 no crouch',
  'pagodeiro/death': 'eval:rig-census clipes mão L 1.527>1.519 no death',
  'proerd/run': 'eval:rig-census clipes corpo 2.593>2.488 no run',
  'professor/death': 'eval:rig-census clipes mão L 1.859>1.809 no death',
  'rapper/idle1h': 'eval:rig-census clipes costas 1.763>1.743 no idle1h',
  'raul/walk': 'eval:rig-census clipes costas 2.031>1.95 no walk',
  'senador/crouch': 'eval:rig-census clipes corpo 3.616>3.613 no crouch',
  'senador/idle': 'eval:rig-census clipes mão R 2.035>1.944 no idle',
  'sertanejo/run': 'eval:rig-census clipes corpo 4.53>4.333 no run',
  'sindicato/shoot': 'eval:rig-census clipes mão R 1.474>1.451 no shoot',
  'skatista/walk1h': 'eval:rig-census clipes corpo 3.138>3.111 no walk1h',
  'skatista/death': 'eval:rig-census clipes mão L 1.415>1.412 no death',
  'trapfunk/death': 'eval:rig-census clipes corpo 3.252>3.119 no death',
  'capitao/walk': 'eval:rig-census clipes costas 2.792>2.76 no walk',
  'chave/idle1h': 'eval:rig-census clipes costas 1.855>1.852 no idle1h',
  'doidinho-bairro/walkfire': 'eval:rig-census clipes costura 0.06546>0.06235 no walkfire',
  'doutora/crouch': 'eval:rig-census clipes corpo 2.136>2.071 no crouch',
  'doutora/idle1h': 'eval:rig-census clipes costas 2.046>2.037 no idle1h',
  'esbirro/walk1h': 'eval:rig-census clipes mão R 1.534>1.521 no walk1h',
  'jozo/walk': 'eval:rig-census clipes corpo 2.65>2.61 no walk',
  'mistico/idle1h': 'eval:rig-census clipes costas 2.329>2.304 no idle1h',
  'raul/walkfire': 'eval:rig-census clipes costas 2.031>1.95 no walkfire',
  'sindicato/walk1h': 'eval:rig-census clipes mão R 1.474>1.451 no walk1h',
  'capitao/walkfire': 'eval:rig-census clipes costas 2.792>2.76 no walkfire',
  'jozo/walkfire': 'eval:rig-census clipes corpo 2.65>2.61 no walkfire',
  'sindicato/idle1h': 'eval:rig-census clipes mão R 1.465>1.451 no idle1h',
  'capitao/jump': 'eval:rig-census clipes costas 2.781>2.76 no jump',
  'jozo/crouchwalk': 'eval:rig-census clipes corpo 2.635>2.61 no crouchwalk',
  'jozo/run': 'eval:rig-census clipes corpo 2.626>2.61 no run',
});
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
  'rig-census': [[new RegExp(`^clipes (?:corpo|costas|mão L|mão R|costura) ${N}>${N} no [a-z0-9]+$`), ([novo, teto]) => novo > teto, 'deformação do clipe assado acima do teto congelado']],
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
