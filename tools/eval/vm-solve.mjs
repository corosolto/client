// SOLVER DO ENQUADRAMENTO DO VIEWMODEL — busca um ponto VIÁVEL para VM1/2/3/5/8/9/10/12.
//
// PORQUÊ EXISTE: as rodadas anteriores tunaram VM_FRAME "no olho", uma invariante por vez,
// e cada acerto quebrava outra. Este arquivo troca o tuning por uma PROVA: ele reimplementa
// a mesma cadeia do vm-mint-audit (importando a geometria DE LÁ — zero 2ª cópia da
// matemática), lê os TETOS do próprio invariants.mjs, e responde a pergunta que importa:
// existe um ponto no espaço de parâmetros que satisfaz as 8 invariantes ao mesmo tempo?
//
// A ESTRUTURA QUE FAZ A BUSCA SER EXATA (e não um chute aleatório):
// fixados os globais (vmScale, recuoZ, nearX, tanH, tanBarrel, offY, offX), TODA medida de
// tela de uma arma depende de UM único escalar: Zg, a profundidade do grip. zMul[id] é um
// multiplicador livre de Zg por arma. Então, em vez de sortear parâmetros, o solver varre
// Zg arma a arma e calcula o CONJUNTO VIÁVEL de Zg (interseção das 8 invariantes). Se o
// conjunto de alguma arma for VAZIO, aquele ponto global é impossível — e o solver diz QUAL
// PAR de invariantes se cruza vazio e por QUANTO (é a resposta (B) da tarefa). Se for
// não-vazio para as 26, o ponto é VIÁVEL e o zMul só é gasto nas armas cujo Zg natural cai
// fora do próprio intervalo.
//
// Uso:
//   node tools/eval/vm-solve.mjs             margens da config atual + fronteira VM5 × VM12 (~1 min)
//   node tools/eval/vm-solve.mjs --atual     só as margens da config do repo (instantâneo)
//   node tools/eval/vm-solve.mjs --busca     varredura dos globais (972 pontos, ~7 min)
//   node tools/eval/vm-solve.mjs --busca --escala   idem, liberando a escala por arma (cfg.vm)
import fs from 'fs';
import path from 'path';
import {
  gunSpace, bbox, muzzleOf, sightOf, silhueta, project, barrelCheck, rotXYZ,
  CFG, WDIR, H as H_REPO, V0DEG, ARM, OFF as OFF_REPO, F as F_REPO,
} from './vm-mint-audit.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const ASPECTS = { '16:9': 16 / 9, '3:2': 3 / 2 };
const A169 = 16 / 9;

/* ─── 1. TETOS: LIDOS de invariants.mjs, não redigitados ────────────────────
   PORQUÊ: um solver que carrega os tetos de cabeça é um solver que otimiza para um alvo
   que não é o do portão — foi assim que a rodada anterior "melhorou" o placar e regrediu o
   look. Aqui cada número é extraído do TEXTO do invariants.mjs e o solver ABORTA se algum
   sumir (mudou de forma => a busca inteira estaria mirando errado). */
function lerTetos() {
  const src = fs.readFileSync(path.join(ROOT, 'tools/eval/invariants.mjs'), 'utf8');
  const pega = (re, oq) => { const m = re.exec(src); if (!m) throw new Error(`vm-solve: não achei o teto de ${oq} em invariants.mjs`); return m; };
  const t = {};
  // FAIXAS (rodada da REFERÊNCIA MEDIDA): VM1, VM3, VM5, VM12 e a VM16 nova deixaram de
  // ser piso/teto de um lado só e viraram bandas [lo, hi] — os regexes seguem a nova forma.
  const m1 = pega(/put\('VM1'[\s\S]{0,200}?mn >= ([\d.]+) && mx <= ([\d.]+)/, 'VM1');
  t.VM1 = [+m1[1], +m1[2]];
  t.VM2 = +pega(/put\('VM2'[\s\S]{0,140}?min >= ([\d.]+)/, 'VM2')[1];
  const m3 = pega(/put\('VM3'[\s\S]{0,220}?mn >= (\d+) && mx <= (\d+)/, 'VM3');
  t.VM3 = [+m3[1], +m3[2]];
  t.VM4 = +pega(/put\('VM4'[\s\S]{0,140}?max <= ([\d.]+)/, 'VM4')[1];
  const m5 = pega(/mn \* pct >= (\d+) && mx \* pct <= (\d+)/, 'VM5');
  t.VM5 = [+m5[1], +m5[2]];
  const m9 = pega(/put\('VM9'[\s\S]{0,200}?mn >= ([\d.]+) && mx <= ([\d.]+)/, 'VM9');
  t.VM9 = [+m9[1], +m9[2]];
  t.VM10 = +pega(/put\('VM10'[\s\S]{0,200}?max <= ([\d.]+)/, 'VM10')[1];
  const m12 = pega(/const fora = boca\.filter\(\(r\) => r\[2\] < ([\d.]+) \|\| r\[2\] > ([\d.]+)\)/, 'VM12');
  t.VM12 = [+m12[1], +m12[2]];
  const m16 = pega(/put\('VM16'[\s\S]{0,260}?mn >= ([\d.]+) && mx <= ([\d.]+)/, 'VM16');
  t.VM16 = [+m16[1], +m16[2]];
  t.VM8 = +pega(/const acima = ws\.filter\([\s\S]{0,120}?> (-[\d.]+)\)/, 'VM8')[1];
  return t;
}
const T = lerTetos();

/* ─── 2. GEOMETRIA (uma vez só) ────────────────────────────────────────────
   Mesma amostragem do auditor (step = len/4000) — a área de tela é medida sobre os MESMOS
   vértices, senão o solver e a régua discordariam por amostragem. */
const ids = Object.keys(CFG).filter((id) => fs.existsSync(path.join(WDIR, id + '.glb')));
const GEO = {};
for (const id of ids) {
  // SEM SUBAMOSTRAGEM (rodada da REFERÊNCIA MEDIDA): a área/eixo/fatia agora saem de
  // silhueta() do vm-mint-audit, que rasteriza TRIÂNGULO. Um passo de amostragem sobre os
  // vértices quebraria os índices das faces e o solver voltaria a medir nuvem de pontos —
  // o instrumento torto que esta rodada aposentou.
  const { P, T, cfg } = gunSpace(id);
  const bb = bbox(P);
  const mz = muzzleOf(P, bb), sg = sightOf(P, bb, mz);
  GEO[id] = { bb, mz, sg, sub: P, T, cfg, cano: barrelCheck(P, bb) };
}
// coice: pull/pitch de pico por arma (vm_kick_sim.json). NÃO depende do enquadramento — a
// mola do RecoilAxis é a mesma —, mas o z da coronha no pico depende, e é isso que a VM8 mede.
const KICK = (() => {
  const p = path.join(ROOT, 'tools/eval/vm_kick_sim.json');
  if (!fs.existsSync(p)) throw new Error('vm-solve: rode `node tools/eval/vm-kick-sim.mjs --json` antes');
  const k = JSON.parse(fs.readFileSync(p, 'utf8'));
  const g = k.fonte.ganhos, out = {};
  for (const [id, w] of Object.entries(k.armas)) out[id] = { pull: w.kPicoRajada * g.posZ, th: w.kPicoRajada * g.rotX };
  return out;
})();
// ombro/alcance SEM o offset vertical: o offY entra igual no grip e no ombro (os dois são
// filhos do vm.root), então a DISTÂNCIA não depende dele; só a projeção na tela depende.
const rel = (p) => [p[0] - OFF_REPO[0], p[1] - OFF_REPO[1], p[2] - OFF_REPO[2]];
const ARM0 = { ombro: rel(ARM.ombro), ombroL: rel(ARM.ombroL), alcance: ARM.alcance, alcanceL: ARM.alcanceL };

/* ─── 3. A FORMA NOVA DO OFFSET VERTICAL ───────────────────────────────────
   O offset vertical do vm.root deixa de ser CONSTANTE EM METROS e passa a acompanhar a
   meia-tangente VERTICAL do aspecto corrente:  offY(a) = offY169 · V(a)/V(16:9).
   Como V(a) = H/a e vmFovForAspect trava H, isso é offY169 · (16/9)/a.
   POR QUE ISSO É A FORMA CERTA (a conta está em /tmp/deriv e no relatório):
     • com offset constante, gripY(a) = 0,5 + k(a)·T e k16:9/k3:2 = (16/9)/(3/2) = 1,1852
       SEMPRE (independe de V0, tanH, Zg, tudo). Logo Δ = 0,1852·(gripY32−0,5) ≥ 0,063 quando
       a VM9 exige gripY32 ≥ 0,84. O teto da VM10 é 0,03: VM9 e VM10 eram IMPOSSÍVEIS juntas.
     • com o offset escalado por V, a contribuição do offset na tela vira 0,5·c/z — MESMA
       fração de altura nos dois aspectos. Sobra só o termo do cano (k·tanH·tanBarrel), e
       Δ = 0,0931·tanH·tanBarrel ≈ 0,018 < 0,03: a VM10 fecha por construção.
   Escalar o offset do ROOT (e não o gy do grupo da arma) é deliberado: o gy é o que a VM3
   mede como "ângulo do cano". Jogar o deslocamento vertical no gy zeraria a VM3 (o ângulo
   iria a ~45°) — e mover o que uma invariante mede para fora do alcance dela é exatamente
   a fraude que a VM12 existe para impedir. */
const offYFor = (offY169, aspect) => offY169 * (A169 / aspect);
/* A LENTE DO VIEWMODEL VIROU PARÂMETRO (era `const H` importado do auditor).
   PORQUÊ: com a referência medida, a área alvo subiu de 3-14% para 6-16% e a boca subiu
   para 0,50-0,62. O tamanho angular da arma é ~ S·L/(Zg·2H) e o teto GEOMÉTRICO dele é
   L/(back·2H) — com Zg travado por baixo pela folga da coronha (VM8), NENHUM valor de
   vmScale/recuoZ/minz passa desse teto. H é a única variável que o move sem tocar na
   geometria da arma. H = tan(V0/2)·16/9 (game.js: VM_FOV_DEFAULT + vmFovForAspect), e
   V0=80 dá 112° de FOV HORIZONTAL no viewmodel — muito mais aberto que o CS 1.6, que
   desenha o viewmodel na lente do mundo (fov 90 => meia-tangente 1,0). Era por isso que
   a arma saía 2-4x menor que a foto. */
const Hde = (p) => Math.tan((p.V0 ?? V0DEG) * Math.PI / 360) * A169;
const proj = (p, pt, aspect) => { const Hh = Hde(p), V = Hh / aspect, z = -pt[2]; return [0.5 + 0.5 * (pt[0] / z) / Hh, 0.5 - 0.5 * (pt[1] / z) / V]; };

/* ─── 4. AVALIAÇÃO ─────────────────────────────────────────────────────────
   Espelho EXATO de _vmFrame (game.js:1099-1149) + toView/project (vm-mint-audit),
   parametrizado. Dois níveis DE PROPÓSITO: `medFast` é fechado (O(1)) e cobre
   VM3/VM8/VM9/VM10/VM12; `medFull` acrescenta o que exige varrer os 4000 vértices
   (VM1/VM5) e o antebraço (VM2). A busca chama o caro só onde o barato já passou —
   é o que faz o espaço de parâmetros caber no tempo de uma rodada. */
function escala(id, p) { return p.vmScale * (p.vmMul?.[id] ?? GEO[id].cfg.vm ?? 1); }
function zgNatural(id, p) {
  const g = GEO[id];
  const c = p.classOf[id] || 'rifle', t = p.cls[c];
  const S = escala(id, p);
  const back = S * Math.max(0, -g.bb.min[2]);
  const fwd = S * Math.max(0.001, g.bb.max[2]);
  let Zg = Math.max(back + t.clear, t.minz, fwd / t.fwdTan) * (p.zMul[id] || 1);
  Zg *= p.recuoZ;
  const lim = p.nearX * Hde(p);
  const piso = (lim > t.tanH + 1e-3 && back > 0) ? (back * lim) / (lim - t.tanH) : 0;
  return { Zg: Math.max(Zg, piso), S, back, fwd, piso, t, cls: c };
}
// ponto do gun-space -> view space, no aspecto `a` (offY depende do aspecto: ver bloco 3)
function mkView(id, p, Zg, ctx) {
  const { S, t } = ctx;
  const gx = Zg * t.tanH, gy = -gx * p.tanBarrel;
  // pitch/yaw da classe (RODADA DO GRIP + PITCH) — mesma convenção Euler XYZ do three.js e
  // do vm-mint-audit (rotXYZ). Com pitch=yaw=0 volta a ser só o roll de antes.
  const k = id === 'knife', kr = (p.knifeRot || F_REPO.knifeRot || [0, 0, 0]);
  const f = { roll: k ? kr[2] : (t.roll || 0), pitch: k ? kr[0] : (t.pitch || 0), yaw: k ? kr[1] : (t.yaw || 0) };
  return { gx, gy, view: (pt, offY) => {
    const w = rotXYZ(f, [-S * pt[0], S * pt[1], -S * pt[2]]);
    return [p.offX + gx + w[0], offY + gy + w[1], -Zg + w[2]];
  } };
}
// FECHADO: grip, boca, coronha, ângulo do cano. Nada de laço sobre vértices.
function medFast(id, p, Zg, ctx) {
  const g = GEO[id], { S, back } = ctx;
  const { gx, gy, view } = mkView(id, p, Zg, ctx);
  const o = { Zg, gx, gy, canoDeg: Math.atan2(-gy, gx) * 180 / Math.PI, asp: {}, S, back, cls: ctx.cls, piso: ctx.piso };
  const k = KICK[id];
  o.coronhaZ = -Zg + back;
  o.coronhaZpico = k ? Math.max(o.coronhaZ + k.pull, gy * Math.sin(k.th) + o.coronhaZ * Math.cos(k.th) + k.pull) : o.coronhaZ;
  for (const [an, a] of Object.entries(ASPECTS)) {
    const offY = offYFor(p.offY, a);
    o.asp[an] = {
      gripY: proj(p, [p.offX + gx, offY + gy, -Zg], a)[1],
      bocaY: proj(p, view(g.mz, offY), a)[1],
    };
  }
  return o;
}
// COMPLETO: acrescenta borda esquerda (VM1), área (VM5) e antebraço (VM2).
function medFull(id, p, Zg, ctx, o) {
  const g = GEO[id];
  o = o || medFast(id, p, Zg, ctx);
  const { gx, gy, view } = mkView(id, p, Zg, ctx);
  for (const [an, a] of Object.entries(ASPECTS)) {
    const offY = offYFor(p.offY, a);
    const pts = g.sub.map((q) => proj(p, view(q, offY), a));
    let minx = 1e9, maxx = -1e9;
    for (const q of pts) { if (q[0] < minx) minx = q[0]; if (q[0] > maxx) maxx = q[0]; }
    const sil = silhueta(pts, g.T, a, p.rasterN || 128);
    const om = [ARM0.ombro[0] + p.offX, ARM0.ombro[1] + offY, ARM0.ombro[2]];
    const gp = [p.offX + gx, offY + gy, -Zg];
    let bx = 0;
    for (let s = 0; s <= 1.0001; s += 0.02) {
      const q = [gp[0] + (om[0] - gp[0]) * s, gp[1] + (om[1] - gp[1]) * s, gp[2] + (om[2] - gp[2]) * s];
      if (q[2] > -0.03) break;
      const pr = proj(p, q, a);
      if (pr[0] > bx) bx = pr[0];
    }
    Object.assign(o.asp[an], {
      bordaEsq: minx, bordaDir: maxx, braco: bx,
      area: sil.areaPct, silEsq: sil.bordaEsq, eixo: sil.anguloEixoGraus, fatiaDir: sil.fatiaDir,
    });
  }
  const gpv = [p.offX + gx, offYFor(p.offY, A169) + gy, -Zg];
  const om = [ARM0.ombro[0] + p.offX, ARM0.ombro[1] + offYFor(p.offY, A169), ARM0.ombro[2]];
  o.dOmbro = Math.hypot(gpv[0] - om[0], gpv[1] - om[1], gpv[2] - om[2]);
  o.folgaBraco = ARM0.alcance - o.dOmbro;
  o.full = true;
  return o;
}
const medidas = (id, p, Zg, ctx) => medFull(id, p, Zg, ctx);

// MARGENS: >0 = folga até o teto. Os tetos vêm de lerTetos() (invariants.mjs).
function margFast(m) {
  const A = m.asp['16:9'], B = m.asp['3:2'];
  return {
    VM8: T.VM8 - m.coronhaZpico,
    VM9lo: Math.min(A.gripY, B.gripY) - T.VM9[0],
    VM9hi: T.VM9[1] - Math.max(A.gripY, B.gripY),
    VM10: T.VM10 - Math.abs(A.gripY - B.gripY),
    // VM12 virou FAIXA: a boca tem que ficar LOGO abaixo da mira (0,50-0,62 medidos na
    // referência), não "em qualquer lugar abaixo de 0,66". Os dois lados entram como duas
    // margens porque é o lado que estoura que diz o que fazer (afundou x subiu demais).
    VM12lo: Math.min(A.bocaY, B.bocaY) - T.VM12[0],
    VM12hi: T.VM12[1] - Math.max(A.bocaY, B.bocaY),
  };
}
function margens(m) {
  const A = m.asp['16:9'], B = m.asp['3:2'], g = margFast(m);
  if (!m.full) return g;
  // VM1/VM3/VM5/VM16 agora saem da SILHUETA RASTERIZADA (mesma definição do ref-measure.py)
  g.VM1lo = Math.min(A.silEsq, B.silEsq) - T.VM1[0];
  g.VM1hi = T.VM1[1] - Math.max(A.silEsq, B.silEsq);
  g.VM2 = A.braco - T.VM2;
  g.VM3lo = Math.min(A.eixo, B.eixo) - T.VM3[0];
  g.VM3hi = T.VM3[1] - Math.max(A.eixo, B.eixo);
  g.VM4 = T.VM4 - Math.abs(A.bordaEsq - B.bordaEsq);
  g.VM5lo = Math.min(A.area, B.area) - T.VM5[0];
  g.VM5hi = T.VM5[1] - Math.max(A.area, B.area);
  g.VM16lo = Math.min(A.fatiaDir, B.fatiaDir) - T.VM16[0];
  g.VM16hi = T.VM16[1] - Math.max(A.fatiaDir, B.fatiaDir);
  return g;
}
const NOMES_FAST = ['VM8', 'VM9lo', 'VM9hi', 'VM10', 'VM12lo', 'VM12hi'];
const NOMES = [...NOMES_FAST, 'VM1lo', 'VM1hi', 'VM2', 'VM3lo', 'VM3hi', 'VM4', 'VM5lo', 'VM5hi', 'VM16lo', 'VM16hi'];

function avaliar(p) {
  const armas = {};
  for (const id of ids) {
    const ctx = zgNatural(id, p);
    const m = medFull(id, p, ctx.Zg, ctx);
    armas[id] = { ...m, marg: margens(m) };
  }
  const V = (f) => ids.map((id) => f(armas[id]));
  const pior = (k) => Math.min(...V((w) => w.marg[k]));
  const faixa = (k) => [Math.min(...V((w) => Math.min(w.asp['16:9'][k], w.asp['3:2'][k]))), Math.max(...V((w) => Math.max(w.asp['16:9'][k], w.asp['3:2'][k])))];
  const res = {
    VM1: { v: faixa('silEsq'), teto: `${T.VM1[0]}-${T.VM1[1]}`, marg: Math.min(pior('VM1lo'), pior('VM1hi')) },
    VM2: { v: Math.min(...V((w) => w.asp['16:9'].braco)), teto: `>= ${T.VM2}`, marg: pior('VM2') },
    VM3: { v: faixa('eixo'), teto: `${T.VM3[0]}-${T.VM3[1]} graus`, marg: Math.min(pior('VM3lo'), pior('VM3hi')) },
    VM4: { v: Math.max(...V((w) => Math.abs(w.asp['16:9'].bordaEsq - w.asp['3:2'].bordaEsq))), teto: `<= ${T.VM4}`, marg: pior('VM4') },
    VM5: { v: faixa('area'), teto: `${T.VM5[0]}-${T.VM5[1]}%`, marg: Math.min(pior('VM5lo'), pior('VM5hi')) },
    VM8: { v: Math.max(...V((w) => w.coronhaZpico)), teto: `<= ${T.VM8}`, marg: pior('VM8') },
    VM9: { v: faixa('gripY'), teto: `${T.VM9[0]}-${T.VM9[1]}`, marg: Math.min(pior('VM9lo'), pior('VM9hi')) },
    VM10: { v: Math.max(...V((w) => Math.abs(w.asp['16:9'].gripY - w.asp['3:2'].gripY))), teto: `<= ${T.VM10}`, marg: pior('VM10') },
    VM12: { v: faixa('bocaY'), teto: `${T.VM12[0]}-${T.VM12[1]}`, marg: Math.min(pior('VM12lo'), pior('VM12hi')) },
    VM16: { v: faixa('fatiaDir'), teto: `${T.VM16[0]}-${T.VM16[1]}`, marg: Math.min(pior('VM16lo'), pior('VM16hi')) },
  };
  return { armas, res };
}

/* ─── 5. CONJUNTO VIÁVEL DE Zg, ARMA A ARMA ────────────────────────────────
   É AQUI que a pergunta de viabilidade é respondida. Fixados os globais, TODA medida de
   tela de uma arma depende de UM escalar: Zg. Varremos Zg e intersectamos as 8 invariantes.
   Vazio => aquele ponto global é IMPOSSÍVEL para aquela arma, e o par culpado sai nomeado
   com a distância mínima entre as duas (a resposta (B) da tarefa). */
function viavelZg(id, p, lo = 0.12, hi = 1.80, n = 200) {
  const ctx = zgNatural(id, p);
  const grade = [];
  for (let i = 0; i < n; i++) {
    const Zg = lo * Math.pow(hi / lo, i / (n - 1));
    if (Zg < ctx.piso - 1e-9) continue;                  // trava nearX: Zg abaixo do piso não existe
    const f = medFast(id, p, Zg, ctx);
    const gf = margFast(f);
    const okFast = NOMES_FAST.every((k) => gf[k] >= 0);
    grade.push({ Zg, f, gf, okFast, g: null, ok: false });
  }
  for (const r of grade) {                               // caro só onde o barato passou
    if (!r.okFast) continue;
    const m = medFull(id, p, r.Zg, ctx, r.f);
    r.g = margens(m); r.ok = NOMES.every((k) => r.g[k] >= 0);
  }
  const ok = grade.filter((r) => r.ok);
  if (ok.length) return { vazio: false, lo: ok[0].Zg, hi: ok[ok.length - 1].Zg, natural: ctx.Zg, piso: ctx.piso, grade };
  // vazio: qual PAR de invariantes se cruza vazio, e por quanto?
  for (const r of grade) if (!r.g) { const m = medFull(id, p, r.Zg, ctx, r.f); r.g = margens(m); }
  let pior = null;
  for (const a of NOMES) for (const b of NOMES) {
    if (a >= b) continue;
    const best = Math.max(...grade.map((r) => Math.min(r.g[a], r.g[b])));
    if (best < 0 && (!pior || best < pior.gap)) pior = { par: [a, b], gap: best };
  }
  const porInv = {};
  for (const k of NOMES) porInv[k] = Math.max(...grade.map((r) => r.g[k]));
  return { vazio: true, natural: ctx.Zg, piso: ctx.piso, pior, porInv, grade };
}

/* ─── 6. CONFIG DO REPO (ponto de partida / auto-teste) ────────────────────── */
function paramsDoRepo() {
  return {
    vmScale: F_REPO.vmScale, recuoZ: F_REPO.recuoZ, nearX: F_REPO.nearX, tanBarrel: F_REPO.tanBarrel,
    V0: V0DEG,                      // lente do viewmodel (game.js: VM_FOV_DEFAULT) — ver Hde()
    offX: OFF_REPO[0], offY: OFF_REPO[1], zMul: { ...F_REPO.zMul },
    cls: JSON.parse(JSON.stringify(F_REPO.cls)), classOf: F_REPO.classOf,
  };
}

/* ─── 7. AUTOTESTE ANTI-DIVERGÊNCIA ────────────────────────────────────────
   O solver só vale se medir a MESMA coisa que a régua. Com a forma NOVA do offset, o 16:9
   é idêntico ao de hoje por construção (offY(16:9) = offY169); então o autoteste compara o
   16:9 do solver com o vm_mint_audit.json COMMITADO, arma a arma. Divergiu => aborta. */
function autoteste() {
  const p = path.join(ROOT, 'tools/eval/vm_mint_audit.json');
  if (!fs.existsSync(p)) return 'vm_mint_audit.json ausente — autoteste pulado';
  const a = JSON.parse(fs.readFileSync(p, 'utf8'));
  const { armas } = avaliar(paramsDoRepo());   // paramsDoRepo lê vmattach.js + game.js
  let pior = 0, quem = '';
  for (const [id, w] of Object.entries(a.armas)) {
    const m = armas[id]; if (!m) continue;
    for (const an of ['16:9', '3:2']) {                 // OS DOIS aspectos: o dono joga em 3:2
      const ref = w.aspectos[an];
      const d = Math.max(Math.abs(ref.bordaEsq - m.asp[an].bordaEsq), Math.abs(ref.gripTela[1] - m.asp[an].gripY),
        Math.abs(ref.bocaTela[1] - m.asp[an].bocaY), Math.abs(ref.areaPct - m.asp[an].area) / 100,
        Math.abs((ref.silBordaEsq ?? m.asp[an].silEsq) - m.asp[an].silEsq),
        Math.abs(ref.bracoBordaDir - m.asp[an].braco), Math.abs(w.coronhaZ - m.coronhaZ),
        Math.abs(w.anguloCanoGraus - m.canoDeg) / 100);
      if (d > pior) { pior = d; quem = `${id}@${an}`; }
    }
  }
  if (pior > 0.006) throw new Error(`vm-solve: DIVERGE do vm-mint-audit em ${quem} (${pior.toFixed(4)}) — a busca estaria mirando outra tela`);
  return `autoteste (16:9 E 3:2) vs vm_mint_audit.json: pior Δ ${pior.toFixed(4)} (${quem}) — o solver mede a mesma tela que a régua`;
}

/* ─── 8. RELATÓRIO ─────────────────────────────────────────────────────────── */
const n = (v, d = 3) => (typeof v === 'number' ? v.toFixed(d) : String(v));
function relatorio(p, tag) {
  const { armas, res } = avaliar(p);
  console.log(`\n═══ ${tag} ═══`);
  console.log('inv   medido                       teto        margem   veredito');
  for (const [k, r] of Object.entries(res)) {
    if (k === 'ok') continue;
    const v = Array.isArray(r.v) ? r.v.map((x) => n(x, 3)).join(' a ') : n(r.v, 3);
    console.log(`${k.padEnd(5)} ${v.padEnd(28)} ${String(r.teto).padEnd(11)} ${n(r.marg, 4).padStart(8)}  ${r.marg >= 0 ? '✓' : '✗ FALHA'}`);
  }
  return { armas, res };
}
function foraDaBanda(armas) {
  const out = [];
  for (const id of ids) {
    const w = armas[id];
    const ruim = NOMES.filter((k) => w.marg[k] < 0);
    if (ruim.length) out.push(`${id}(${ruim.map((k) => `${k} ${n(w.marg[k], 3)}`).join(' ')})`);
  }
  return out;
}

export { buscar2, estagio1, avaliar, viavelZg, fronteira, provaVazio, relatorioFronteira, paramsDoRepo, medidas, medFast, medFull, margFast, zgNatural, margens, ids, GEO, T, offYFor, NOMES, NOMES_FAST, escala, melhorArma, pontoGlobal, janelaVM9, buscar };

/* ─── 8b. FRONTEIRA VM5 × VM12 (a resposta (B)) ─────────────────────────────
   A suspeita do enunciado estava certa e este bloco a MEDE: aumentar a área exige aproximar
   ou aumentar a arma, e as duas coisas sobem a BOCA na tela. Para cada arma calculamos:
     • o teto de área com a VM12 respeitada (todas as outras invariantes também), e
     • o teto de área SEM a VM12, com o y da boca que isso custaria.
   A escala por arma (cfg.vm, weapons.js) entra como grau de liberdade LIVRE aqui de
   propósito: é a folga máxima que existe. Se nem assim a área chega a 3%, a interseção
   VM5 × VM12 é VAZIA e o número que falta é a distância entre os dois tetos. */
function fronteira(p, alvos, opc = {}) {
  const muls = opc.muls || Array.from({ length: 21 }, (_, i) => 0.5 * Math.pow(4 / 0.5, i / 20));
  const jan = {};
  const out = [];
  for (const id of alvos) {
    const tanH = p.cls[p.classOf[id] || 'rifle'].tanH;
    const j = jan[tanH] || (jan[tanH] = janelaVM9(p, tanH));
    let com = null, sem = null;
    for (const mul of muls) {
      const q = { ...p, vmMul: { ...(p.vmMul || {}), [id]: (GEO[id].cfg.vm ?? 1) * mul } };
      const ctx = zgNatural(id, q);
      const nZ = opc.nZ || 22;
      for (let i = 0; i < nZ; i++) {
        const Zg = j[0] * Math.pow(j[1] / j[0], i / (nZ - 1));
        if (Zg < ctx.piso - 1e-9) continue;
        const m = medFull(id, q, Zg, ctx), g = margens(m);
        const outros = NOMES.filter((k) => k !== 'VM5lo' && k !== 'VM12');
        if (!outros.every((k) => g[k] >= 0)) continue;
        const a = Math.min(m.asp['16:9'].area, m.asp['3:2'].area);
        const boca = Math.min(m.asp['16:9'].bocaY, m.asp['3:2'].bocaY);
        // quem TRAVA o teto: a invariante com a menor margem no ponto de área máxima
        const travaDe = (excl) => NOMES.filter((k) => k !== 'VM5lo' && k !== 'VM5hi' && k !== excl)
          .reduce((b, k) => (g[k] < g[b] ? k : b), excl === 'VM12' ? 'VM1' : 'VM12');
        const trava = travaDe(null);
        if (!sem || a > sem.a) sem = { a, boca, mul, trava: travaDe('VM12') };
        if (g.VM12 < 0) continue;
        if (!com || a > com.a) com = { a, boca, mul, trava };
      }
    }
    out.push({ id, com, sem });
  }
  return out;
}
function relatorioFronteira(p) {
  console.log('\n═══ FRONTEIRA VM5 (área ≥ 3%) × VM12 (boca ≥ 0,66) ═══');
  console.log('escala por arma LIVRE (cfg.vm), Zg LIVRE dentro da janela da VM9, demais invariantes RESPEITADAS');
  console.log('arma        tetoArea(c/ VM12)  falta p/ 3%   tetoArea(s/ VM12)  boca que isso custaria');
  const r = fronteira(p, ids);
  let pior = null;
  for (const x of r) {
    const falta = x.com ? 3 - x.com.a : NaN;
    if (x.com && falta > 0 && (!pior || falta > pior.f)) pior = { id: x.id, f: falta, com: x.com, sem: x.sem };
    console.log(`${x.id.padEnd(11)} ${(x.com ? x.com.a.toFixed(3) + '%' : 'sem ponto').padStart(14)} ${(x.com ? (falta > 0 ? '+' + falta.toFixed(3) + ' p.p.' : 'ok') : '-').padStart(14)} ${(x.sem ? x.sem.a.toFixed(3) + '%' : '-').padStart(16)} ${(x.sem ? x.sem.boca.toFixed(3) : '-').padStart(12)}   trava: ${x.com ? x.com.trava : '-'}`);
  }
  const fora = r.filter((x) => !x.com || x.com.a < T.VM5[0]);
  console.log(`\n${fora.length}/${r.length} armas NÃO alcançam ${T.VM5[0]}% com a VM12 de pé.`);
  if (pior) {
    console.log(`pior caso: ${pior.id} — teto ${pior.com.a.toFixed(3)}% contra piso ${T.VM5[0]}%.`);
    console.log(`  para fechar as duas, UM dos dois tetos teria que ceder:`);
    console.log(`   • piso da VM5: ${T.VM5[0]}%  ->  ${pior.com.a.toFixed(2)}%   (queda de ${(3 - pior.com.a).toFixed(3)} p.p.)`);
    if (pior.sem && pior.sem.a >= T.VM5[0]) {
      console.log(`   • piso da VM12: ${T.VM12}  ->  ${pior.sem.boca.toFixed(3)}   (a boca subiria ${(T.VM12 - pior.sem.boca).toFixed(3)} da altura da tela — o look CS 1.6 do dono)`);
    } else {
      console.log(`   • soltar a VM12 SOZINHA não resolve: sem ela o teto sobe só para ${pior.sem ? pior.sem.a.toFixed(3) : '?'}% e quem trava passa a ser ${pior.sem ? pior.sem.trava : '?'}.`);
      console.log(`     o teto é CONJUNTO (VM5 × VM12 × ${pior.sem ? pior.sem.trava : '?'}) — nenhuma das três sozinha é a culpada.`);
    }
    console.log('  NENHUM teto foi mexido: a decisão é do dono (regra 3 da tarefa).');
  }
  return r;
}

/* ─── 9. BUSCA ──────────────────────────────────────────────────────────────
   ESTRUTURA (é o que torna a busca EXATA em vez de sorteio):
     • VM9 fixa, em FORMA FECHADA, a janela de Zg de qualquer arma:
         gripY(a) = 0,5 + u + k(a)·B,  u = 0,5·c/Zg,  c = −offY·(16/9)/H,  B = tanH·tanBarrel
       => u ∈ [0,84−0,5−k3:2·B , 0,92−0,5−k16:9·B]  =>  Zg ∈ [0,5c/u_hi , 0,5c/u_lo].
       Só se varre DENTRO dessa janela — o resto do eixo Zg já está reprovado por VM9.
     • dentro dela, a arma tem 1 grau de liberdade extra: a escala (VM_FRAME.vmScale ×
       cfg.vm). `mul` varre esse eixo. Sem escala por arma, mul fica travado em 1.
     • se nenhum par (Zg, mul) satisfaz as 10 desigualdades, aquela arma é INVIÁVEL naquele
       ponto global, e o par de invariantes culpado sai nomeado com a distância mínima. */
const K = (p, a) => 0.5 * a / Hde(p);
function janelaVM9(p, tanH) {
  const B = tanH * p.tanBarrel;
  const c = -p.offY * (A169 / Hde(p));
  const uLo = T.VM9[0] - 0.5 - K(p, 3 / 2) * B, uHi = T.VM9[1] - 0.5 - K(p, A169) * B;
  if (uHi <= 0 || uLo > uHi) return null;
  return [0.5 * c / uHi, 0.5 * c / Math.max(uLo, 1e-6)];
}
// melhor ponto (Zg, mul) de UMA arma: maximiza a menor margem entre as 10 invariantes
function melhorArma(id, p, opc = {}) {
  const muls = opc.muls || [1];
  const jan = janelaVM9(p, p.cls[p.classOf[id] || 'rifle'].tanH);
  if (!jan) return { ok: false, motivo: 'VM9+VM3: nenhuma janela de u (tanH·tanBarrel grande demais)' };
  const nZ = opc.nZ || 16;
  let best = null, bestQual = null;
  for (const mul of muls) {
    const q = mul === 1 ? p : { ...p, vmMul: { ...(p.vmMul || {}), [id]: (GEO[id].cfg.vm ?? 1) * mul } };
    const ctx = zgNatural(id, q);
    for (let i = 0; i < nZ; i++) {
      const Zg = jan[0] * Math.pow(jan[1] / jan[0], i / (nZ - 1));
      if (Zg < ctx.piso - 1e-9) continue;                 // trava nearX
      const f = medFast(id, q, Zg, ctx), gf = margFast(f);
      // FILTRO BARATO ANTES DO CARO: VM8/VM9/VM10/VM12 são fechadas (O(1)); VM1/3/5/16
      // exigem rasterizar 13 mil triângulos por aspecto. Rasterizar onde a parte fechada já
      // reprovou é queimar o orçamento da busca — e o espaço agora tem V0 dentro.
      if (opc.filtroFast && !NOMES_FAST.every((k) => gf[k] >= 0)) continue;
      const m = medFull(id, q, Zg, ctx, f), g = margens(m);
      const pior = Math.min(...NOMES.map((k) => g[k]));
      if (!bestQual || pior > bestQual.pior) bestQual = { pior, g, Zg, mul, m };
      if (pior >= 0 && (!best || pior > best.pior)) best = { pior, g, Zg, mul, m };
    }
  }
  if (best) return { ok: true, ...best };
  // inviável: qual PAR se cruza vazio, e por quanto?
  return { ok: false, ...bestQual, par: parCulpado(id, p, opc, jan) };
}
function parCulpado(id, p, opc, jan) {
  const muls = opc.muls || [1], nZ = opc.nZ || 16, pontos = [];
  for (const mul of muls) {
    const q = mul === 1 ? p : { ...p, vmMul: { ...(p.vmMul || {}), [id]: (GEO[id].cfg.vm ?? 1) * mul } };
    const ctx = zgNatural(id, q);
    for (let i = 0; i < nZ; i++) {
      const Zg = jan[0] * Math.pow(jan[1] / jan[0], i / (nZ - 1));
      if (Zg < ctx.piso - 1e-9) continue;
      pontos.push(margens(medFull(id, q, Zg, ctx)));
    }
  }
  if (!pontos.length) return { par: ['VM9', 'nearX'], gap: -Infinity };
  let pior = null;
  for (const a of NOMES) for (const b of NOMES) {
    if (a >= b) continue;
    const best = Math.max(...pontos.map((g) => Math.min(g[a], g[b])));
    if (best < 0 && (!pior || best < pior.gap)) pior = { par: [a, b], gap: best };
  }
  const porInv = {};
  for (const k of NOMES) porInv[k] = Math.max(...pontos.map((g) => g[k]));
  return { ...(pior || {}), porInv };
}
// avalia UM ponto global: quantas armas ficam inviáveis, e qual a pior margem
function pontoGlobal(p, opc) {
  const det = {}; let ruins = 0, pior = Infinity;
  for (const id of ids) {
    const r = melhorArma(id, p, opc);
    det[id] = r;
    if (!r.ok) { ruins++; pior = Math.min(pior, r.pior ?? -9); } else pior = Math.min(pior, r.pior);
  }
  return { ruins, pior, det };
}
/* BUSCA EM 2 ESTÁGIOS (rodada da REFERÊNCIA MEDIDA).
   O espaço cresceu (V0, minz e clear entraram como eixos) e o custo por ponto também
   (a área virou rasterização de triângulo). A busca de força bruta que existia antes
   levaria horas. Estrutura:
     estágio 1 — só as invariantes FECHADAS (VM8/VM9/VM10/VM12), O(1) por (arma, Zg).
                 Um ponto global que já perde aqui não tem como ganhar depois.
     estágio 2 — os sobreviventes vão para a rasterização (VM1/VM3/VM5/VM16 + VM2).
   Os eixos e por que cada um está aqui:
     V0    — lente do viewmodel. É o ÚNICO eixo que move o teto geométrico de tamanho
             angular (ver Hde()). Sem ele a VM5 de 6% é inalcançável para 26/26.
     minz  — VOLTA A SER POR CLASSE. O uniforme 0,42 da rodada passada foi escolhido para
             uniformizar profundidade e custou 77% do tamanho angular da faca e 67% do das
             pistolas. Com a boca subindo para 0,50-0,62 a restrição muda de sinal.
     clear — folga coronha/lente. É o que trava a aproximação junto com a VM8.
     tanH/tanB/nearX/offY/vmScale — como antes. */
function estagio1(p, opc) {
  let ruins = 0;
  for (const id of ids) {
    const jan = janelaVM9(p, p.cls[p.classOf[id] || 'rifle'].tanH);
    if (!jan) return { ruins: 99 };
    const ctx = zgNatural(id, p);
    let ok = false;
    for (let i = 0; i < (opc.nZ || 12) && !ok; i++) {
      const Zg = jan[0] * Math.pow(jan[1] / jan[0], i / ((opc.nZ || 12) - 1));
      if (Zg < ctx.piso - 1e-9) continue;
      const gf = margFast(medFast(id, p, Zg, ctx));
      if (NOMES_FAST.every((k) => gf[k] >= 0)) ok = true;
    }
    if (!ok) ruins++;
  }
  return { ruins };
}
function buscar2(opc = {}) {
  const base = paramsDoRepo();
  const eixos = opc.eixos || {
    V0: [46, 52, 58, 66, 74, 80],
    tanH: [0.30, 0.42, 0.55, 0.67],
    tanB: [0.10, 0.18, 0.28, 0.40],
    nearX: [1.05, 1.45],
    offY: [-0.10, -0.16, -0.23, -0.32, -0.44],
    vmScale: [0.72, 1.0, 1.4, 1.9, 2.6],
    clear: [0.04, 0.09],
  };
  const monta = (V0, tanH, tanB, nearX, offY, vmScale, clear) => {
    const p = JSON.parse(JSON.stringify(base)); p.classOf = base.classOf; p.zMul = {};
    p.V0 = V0; p.tanBarrel = tanB; p.nearX = nearX; p.offY = offY; p.vmScale = vmScale;
    for (const c of Object.keys(p.cls)) { p.cls[c].tanH = tanH; p.cls[c].clear = clear; }
    p.rasterN = opc.rasterN || 128;
    return p;
  };
  const cands = [];
  let n1 = 0;
  for (const V0 of eixos.V0) for (const tanH of eixos.tanH) for (const tanB of eixos.tanB)
    for (const nearX of eixos.nearX) for (const offY of eixos.offY) for (const vmScale of eixos.vmScale)
      for (const clear of eixos.clear) {
        const p = monta(V0, tanH, tanB, nearX, offY, vmScale, clear);
        const r = estagio1(p, { nZ: 12 }); n1++;
        if (r.ruins === 0) cands.push({ p, g: { V0, tanH, tanB, nearX, offY, vmScale, clear } });
      }
  console.log(`estágio 1: ${n1} pontos globais, ${cands.length} passam nas fechadas (VM8/9/10/12)`);
  const muls = opc.escalaPorArma ? [0.6, 0.8, 1, 1.3, 1.7, 2.2, 2.9] : [1];
  let melhor = null;
  const lim = opc.max2 || 400;
  for (const c of cands.slice(0, lim)) {
    const r = pontoGlobal(c.p, { muls, nZ: opc.nZ || 10, filtroFast: true });
    if (!melhor || r.ruins < melhor.r.ruins || (r.ruins === melhor.r.ruins && r.pior > melhor.r.pior)) melhor = { ...c, r };
  }
  if (!melhor) { console.log('estágio 2: nenhum candidato'); return null; }
  console.log(`estágio 2: ${Math.min(cands.length, lim)} candidatos rasterizados`);
  console.log('melhor:', JSON.stringify(melhor.g), `-> ${melhor.r.ruins}/26 armas INVIÁVEIS, pior margem ${n2(melhor.r.pior)}`);
  return melhor;
}
function buscar(opc = {}) {
  const base = paramsDoRepo();
  const muls = opc.escalaPorArma ? [0.55, 0.7, 0.85, 1, 1.2, 1.45, 1.75, 2.1] : [1];
  const eixos = {
    tanB: [0.08, 0.16, 0.24],
    tanH: [0.67, 0.78, 0.90],
    nearX: [1.05, 1.4, 1.8],
    offY: [-0.16, -0.20, -0.25, -0.31],
    vmScale: [0.72, 0.95, 1.25],
    roll: [null, -0.18, -0.25],
  };
  let melhor = null; let n = 0;
  for (const tanB of eixos.tanB) for (const tanH of eixos.tanH) for (const nearX of eixos.nearX)
    for (const offY of eixos.offY) for (const vmScale of eixos.vmScale) for (const roll of eixos.roll) {
      const p = JSON.parse(JSON.stringify(base)); p.classOf = base.classOf; p.zMul = {};
      p.tanBarrel = tanB; p.nearX = nearX; p.offY = offY; p.vmScale = vmScale;
      for (const c of Object.keys(p.cls)) { p.cls[c].tanH = tanH; if (roll !== null && c !== 'knife') p.cls[c].roll = roll; }
      const r = pontoGlobal(p, { muls, nZ: opc.nZ || 14 });
      n++;
      if (!melhor || r.ruins < melhor.r.ruins || (r.ruins === melhor.r.ruins && r.pior > melhor.r.pior)) melhor = { p, r, g: { tanB, tanH, nearX, offY, vmScale, roll } };
    }
  console.log(`\n${n} pontos globais varridos (escala por arma: ${opc.escalaPorArma ? 'LIVRE' : 'travada em cfg.vm'})`);
  console.log('melhor:', JSON.stringify(melhor.g), `-> ${melhor.r.ruins}/26 armas INVIÁVEIS, pior margem ${n2(melhor.r.pior)}`);
  return melhor;
}
const n2 = (v) => (isFinite(v) ? v.toFixed(4) : String(v));

/* ─── 8c. PROVA: SEM PITCH, VM8 ∩ VM9 ∩ VM12 É VAZIA PARA QUALQUER PARÂMETRO ───
   Esta não é uma busca — é uma DESIGUALDADE FECHADA, e por isso vale para todo o espaço
   (V0, vmScale, cfg.vm, tanH, tanBarrel, offY, minz, clear, zMul, nearX, recuoZ), não só
   para os pontos que a busca visita. Com o cano paralelo ao eixo da câmera:
     gripY = 0,5 + u/2,  u = −(offY+gy)/(Zg·V) ≥ 0
     bocaY = 0,5 + (u/2)·Zg/(Zg+S·mzZ) − 0,5·S·mzY/((Zg+S·mzZ)·V)
   O último termo é ≥ 0 sempre que mzY ≤ 0 (boca ABAIXO da linha do grip no próprio modelo —
   é o caso da p90 e da faca) e, quando mzY > 0, ele é a ÚNICA folga: entra como `sobra`.
   Impondo VM9 (gripY ≥ g0) e VM12 (bocaY ≤ b1):
     u ≥ 2(g0−0,5)   e   u·Zg/(Zg+S·mzZ) ≤ 2(b1−0,5) + S·mzY/((Zg+S·mzZ)·V)
   Ignorando a folga (mzY ≤ 0) sai  Zg/(Zg+S·mzZ) ≤ (b1−0,5)/(g0−0,5) =: r, ou seja
     Zg ≤ S·mzZ·r/(1−r).
   E a VM8 (a coronha não cruza a lente, nem no pico do coice) impõe Zg ≥ S·back + 0,05.
   As duas juntas exigem  0,05 ≤ S·( mzZ·r/(1−r) − back ), e o lado direito é NEGATIVO para
   as 26 armas: nenhum S>0 salva. É por isso que esta rodada introduziu pitch/yaw em vez de
   afrouxar mais um teto medido.  Uso: node tools/eval/vm-solve.mjs --prova-vazio  */
function provaVazio() {
  const g0 = T.VM9[0], b1 = T.VM12[1], r = (b1 - 0.5) / (g0 - 0.5);
  console.log(`\n═══ PROVA (sem pitch/yaw): VM8 ∩ VM9 ∩ VM12 ═══`);
  console.log(`VM9 piso ${g0} | VM12 teto ${b1} | r = (b1-0,5)/(g0-0,5) = ${r.toFixed(4)}`);
  console.log(`condicao necessaria por arma:  0,05 <= S*( mzZ*r/(1-r) - back/S*S )  ->  lado direito por metro de S`);
  console.log('arma        mzZ(gun)  back(gun)  mzZ*r/(1-r)-back   veredito');
  let viaveis = 0;
  for (const id of ids) {
    const g = GEO[id];
    const mzZ = Math.max(0.001, g.bb.max[2]), back = Math.max(0, -g.bb.min[2]);
    const lhs = mzZ * r / (1 - r) - back;               // por unidade de S
    const ok = lhs > 0;                                 // só aí existe S grande o bastante
    if (ok) viaveis++;
    console.log(`${id.padEnd(11)} ${mzZ.toFixed(3).padStart(8)} ${back.toFixed(3).padStart(10)} ${lhs.toFixed(4).padStart(18)}   ${ok ? 'pode existir S' : 'IMPOSSIVEL p/ todo S>0'}`);
  }
  console.log(`\n${ids.length - viaveis}/${ids.length} armas sao IMPOSSIVEIS sem pitch, para QUALQUER valor de`);
  console.log('V0/vmScale/cfg.vm/tanH/tanBarrel/offY/minz/clear/zMul/nearX/recuoZ.');
  return ids.length - viaveis;
}

/* ─── 9. MAIN ──────────────────────────────────────────────────────────────── */
function main() {
  if (process.argv.includes('--prova-vazio')) { console.log('tetos lidos de invariants.mjs:', JSON.stringify(T)); provaVazio(); return; }
  console.log('tetos lidos de invariants.mjs:', JSON.stringify(T));
  console.log(autoteste());
  const base = paramsDoRepo();
  relatorio(base, 'CONFIG DO REPO (com a forma nova do offset já ativa no solver)');
  if (process.argv.includes('--atual')) return;
  if (!process.argv.includes('--busca')) { relatorioFronteira(base); return; }
  const esc = process.argv.includes('--escala');
  const m = buscar({ escalaPorArma: esc, nZ: +(process.argv.find((a) => a.startsWith('--nz='))?.slice(5) || 14) });
  console.log('\n─── diagnóstico arma a arma no melhor ponto ───');
  for (const id of ids) {
    const r = m.r.det[id];
    if (r.ok) console.log(`  ✓ ${id.padEnd(11)} margem ${n2(r.pior)}  Zg ${r.Zg.toFixed(3)} escala x${r.mul}`);
    else console.log(`  ✗ ${id.padEnd(11)} VAZIO — par ${r.par?.par ? r.par.par.join(' × ') : '?'} gap ${n2(r.par?.gap)}` +
      `  | melhor por inv: ${Object.entries(r.par?.porInv || {}).filter(([, v]) => v < 0).map(([k, v]) => `${k} ${n2(v)}`).join(' ')}`);
  }
}


if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) main();
