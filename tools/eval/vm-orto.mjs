#!/usr/bin/env node
/* VARREDURA SOBRE A CURVA DE ÁREA CONSTANTE — "escorço é alavanca?" (RODADA DO ESCORÇO)
 *
 * POR QUE ESTE ARQUIVO EXISTE
 * ───────────────────────────
 * O dono disse duas coisas que pareciam separadas: "a ak 47 e a zastava toma a tela
 * inteira" e (medido pela régua) "82,8% da AK está FORA do quadro, e o que sobra é a
 * parte fina da frente" (VM18: gordura 0,276-0,660 contra 0,684-0,948 da referência).
 * A HIPÓTESE desta rodada é que as duas frases são O MESMO FATO: a arma está perto da
 * lente e grande, então só a frente cabe no quadro e a silhueta visível é o CANO —
 * fina por ESCORÇO (perspectiva), não por ser uma arma fina.
 *
 * O CS 1.6 não resolve isso encolhendo a arma: ele usa uma lente de viewmodel MAIS
 * FECHADA com a arma MAIS LONGE — quase ortográfico. Mesmo tamanho aparente, menos
 * escorço. As buscas anteriores (vm-solve, 5 e 6 eixos) otimizavam tamanho E
 * legibilidade ao mesmo tempo e por isso ficaram presas num ótimo local: cada ponto que
 * engordava a silhueta mexia na área e estourava VM12/VM16/VM9.
 *
 * A CURVA (por que esta reparametrização é EXATA, e não mais um eixo de busca)
 * ──────────────────────────────────────────────────────────────────────────
 * A cadeia do viewmodel (game.js `_vmFrame` / vm-mint-audit `frame`+`toView`+`project`) é
 *     grip  = (OFF0 + Zg·tanH , offY + gy , −Zg)          gy = −Zg·tanH·tanBarrel
 *     tela  = 0,5 + 0,5·(x/z)/H                            H = tan(V0/2)·16/9
 * Aplique, com um único parâmetro k ("afastamento"):
 *     recuoZ → k·recuoZ      (Zg → k·Zg: a arma vai para o FUNDO)
 *     tanH   → tanH/k        (gx = k·Zg·tanH/k = gx: o offset lateral em METROS não muda)
 *     H      → H/k           (V0' = 2·atan(tan(V0/2)/k): a lente FECHA na mesma razão)
 * Efeito na tela de um ponto no PLANO DO GRIP: x/(z·H) → gx/(k·Zg·H/k) = gx/(Zg·H).
 * IDÊNTICO. O mesmo vale para OFF0/offY (offsets em metros no plano do grip) e para gy.
 * Ou seja: k não move o grip, não muda o ângulo do cano e não muda o tamanho aparente da
 * arma NO PLANO DO GRIP — é a definição de "andar sobre a curva de área constante".
 * O que k MUDA é só o ESCORÇO: a coronha está S·back METROS mais perto da lente e a boca
 * S·fwd metros mais longe; a razão (S·back)/Zg cai com 1/k, então a ampliação da coronha
 * (que é o que joga 83% da arma para fora do quadro) some. k→∞ = ortográfico.
 * Métrica disso: `escorco` = S·(back+fwd)/Zg — profundidade da arma em Zg.
 *
 * A trava nearX é invariante nesta curva (lim = nearX·H/k e tanH/k dividem em cima e em
 * baixo), então ela não contamina a medida — o que também mata a suspeita de que a
 * varredura só estaria mexendo na trava.
 *
 * O RESULTADO (varrido de k=1 a k=12 — reproduza com `node tools/eval/vm-orto.mjs`)
 * ─────────────────────────────────────────────────────────────────────────────
 *   escorço médio   1,570 -> 0,131   (12× menos perspectiva: praticamente ortográfico)
 *   foraPct médio   78,6% -> 43,2%   a hipótese CUMPRE o que prometia: cabe muito
 *                                    mais arma no quadro, exatamente como previsto
 *   gordura MÉDIA   0,504 -> 0,509   +1,0%. NADA.
 *   gordura da AK   0,575 -> 0,419   PIORA — e é uma das duas armas que o dono nomeou
 *   fora de banda   VM1 4->24 · VM3 2->16 · VM5 3->13 · VM12 5->30 · VM16 21->37
 * VEREDITO: ESCORÇO NÃO É A ALAVANCA DA `gordura`. Doze vezes menos escorço movem a
 * medida em 4 milésimos e quebram 6 invariantes. A hipótese está MORTA, com número.
 * (Por que a gordura CAI quando mais arma aparece: o que entra no quadro é a CORONHA,
 * que estende a silhueta ao longo do MESMO eixo grip→boca. `gordura` = espessura ⊥ ÷
 * comprimento ‖ — destravar o corte alonga o denominador antes de engordar o numerador.)
 *
 * O QUE É A ALAVANCA, medido junto (as duas pontas de dt/ds têm faixa na referência):
 *   espessura ⊥ (dt)          ref 0,427-0,688   nosso: 14/26 JÁ DENTRO
 *   comprimento visível (ds)  ref 0,624-0,798   nosso:  8/26 dentro; os 18 restantes
 *                                               TODOS ACIMA (0,800-0,953)
 * A AK tem dt 0,548 (DENTRO) e ds 0,953 (19% acima do teto): o déficit dela é 100%
 * COMPRIMENTO, 0% espessura. Com ds no teto medido e a MESMA espessura, a gordura da AK
 * vai a 0,686 — dentro da faixa. Vale para ak/akm/scar; as 12 com dt abaixo do piso
 * (shotgun 0,269 · carbine 0,296 · knife 0,304) são finas de VERDADE e é dívida de MALHA.
 *
 * Uso:
 *   node tools/eval/vm-orto.mjs                     # varredura padrão de k
 *   node tools/eval/vm-orto.mjs --k 1,1.5,2,3,4,6
 *   node tools/eval/vm-orto.mjs --k 2 --armas       # tabela por arma no k dado
 *   node tools/eval/vm-orto.mjs --autoteste         # k=1 tem que reproduzir o JSON atual
 */
import fs from 'fs';
import path from 'path';
import { gunSpace, bbox, muzzleOf, rotXYZ, silhueta, CFG, WDIR, F, OFF, V0DEG, adsPoseOf } from './vm-mint-audit.mjs';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(AQUI, '../..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes('--' + k);

const CLS = F.classOf;
const IDS = Object.keys(CFG).filter((id) => fs.existsSync(path.join(WDIR, id + '.glb')));
const LONGAS = new Set(['rifle', 'sniper', 'shotgun', 'smg']);
const offYFor = (a) => OFF[1] * ((16 / 9) / a);

/* ── a cadeia inteira, com a curva aplicada (k). k=1 == árvore atual, byte a byte ── */
function medir(id, aspect, k, extra = {}) {
  const H0 = Math.tan((V0DEG * Math.PI) / 360) * (16 / 9);
  const H = H0 / k;
  const cls = CLS[id] || 'rifle';
  const t = F.cls[cls];
  const tanH = (extra.tanH?.[cls] ?? t.tanH) / k;
  const { P: pts, T, cfg } = gunSpace(id, CFG[id]);
  const bb = bbox(pts);
  // extra.vm[id] = cfg.vm ALTERNATIVO (weapons.js) — é o knob do 2º teste da rodada (m92).
  // Escala o MESH em torno do grip; nas armas cujo Zg é travado pelo minz da classe (a m92
  // é uma delas: Zg = 0,345 = rifle.minz) ele muda o tamanho ANGULAR sem mover o grip.
  const S = F.vmScale * (extra.vm && extra.vm[id] !== undefined ? extra.vm[id] : (cfg.vm ?? 1));
  const back = S * Math.max(0, -bb.min[2]);
  const fwd = S * Math.max(0.001, bb.max[2]);
  const zMul = (extra.zMul && extra.zMul[id] !== undefined ? extra.zMul[id] : (F.zMul[id] || 1));
  let Zg = Math.max(back + t.clear, t.minz, fwd / t.fwdTan) * zMul;
  Zg *= F.recuoZ * k;
  const lim = F.nearX * H;
  if (lim > tanH + 1e-3 && back > 0) Zg = Math.max(Zg, (back * lim) / (lim - tanH));
  const gx = Zg * tanH;
  const gy = -gx * F.tanBarrel;
  const kn = id === 'knife', kr = F.knifeRot || [0, 0, 0];
  const f = { roll: kn ? kr[2] : (t.roll || 0), pitch: kn ? kr[0] : (t.pitch || 0), yaw: kn ? kr[1] : (t.yaw || 0) };
  const proj = (p) => { const V = H / aspect, z = -p[2]; return [0.5 + 0.5 * (p[0] / z) / H, 0.5 - 0.5 * (p[1] / z) / V]; };
  const toView = (p) => {
    const w = rotXYZ(f, [-S * p[0], S * p[1], -S * p[2]]);
    return [OFF[0] + gx + w[0], offYFor(aspect) + gy + w[1], OFF[2] - Zg + w[2]];
  };
  const v = pts.map((p) => proj(toView(p)));
  const grip = proj([OFF[0] + gx, offYFor(aspect) + gy, OFF[2] - Zg]);
  const mz = muzzleOf(pts, bb);
  const boca = proj(toView(mz));
  const sil = silhueta(v, T, aspect, 256, grip, boca);
  // ADS cheio (VM19) — mesma pose da classe; pz.z é DEPTH, então escala com k na curva
  const pz = adsPoseOf(id), e = pz.s ?? 1;
  const toViewA = (p) => {
    const w = rotXYZ({ roll: f.roll, pitch: 0, yaw: 0 }, [-S * p[0], S * p[1], -S * p[2]]);
    return [OFF[0] + pz.x + e * (gx + w[0]), offYFor(aspect) + pz.y + e * (gy + w[1]), OFF[2] + pz.z * k + e * (-Zg + w[2])];
  };
  const gripA = proj([OFF[0] + pz.x + e * gx, offYFor(aspect) + pz.y + e * gy, OFF[2] + pz.z * k - e * Zg]);
  const silA = silhueta(pts.map((p) => proj(toViewA(p))), T, aspect, 256, gripA, proj(toViewA(mz)));
  return {
    id, cls, Zg, area: sil.areaPct, fora: sil.foraPct, gord: sil.leg ? sil.leg.gordura : 0,
    frente: sil.leg ? sil.leg.frenteVisivel : 0, tras: sil.leg ? sil.leg.trasVisivel : 0,
    esq: sil.bordaEsq, ang: sil.anguloEixoGraus, fatiaDir: sil.fatiaDir,
    gripY: grip[1], bocaY: boca[1],
    escorco: (back + fwd) / Zg,
    coronhaZ: OFF[2] - Zg + Math.max(...pts.map((p) => rotXYZ(f, [-S * p[0], S * p[1], -S * p[2]])[2])),
    gordAds: silA.leg ? silA.leg.gordura : 0, trasAds: silA.leg ? silA.leg.trasVisivel : 0,
  };
}

/* agregados = as MESMAS contas das invariantes (invariants.mjs), para a tabela do relatório */
export function rodar(k, extra = {}) {
  const linhas = [];
  for (const id of IDS) for (const a of [16 / 9, 3 / 2]) linhas.push({ ...medir(id, a, k, extra), aspect: a });
  const L = linhas.filter((r) => LONGAS.has(r.cls));
  return {
    k, linhas,
    vm1: linhas.filter((r) => r.esq < 0.50 || r.esq > 0.60).length,
    vm3: linhas.filter((r) => r.ang < 22 || r.ang > 42).length,
    vm5: linhas.filter((r) => r.area < 6 || r.area > 16).length,
    vm9: linhas.filter((r) => r.gripY < 0.90 || r.gripY > 1.08).length,
    vm12: linhas.filter((r) => r.bocaY < 0.50 || r.bocaY > 0.62).length,
    vm16: linhas.filter((r) => r.fatiaDir < 0.02 || r.fatiaDir > 0.20).length,
    vm18: linhas.filter((r) => r.gord < 0.684 || r.gord > 0.948 || r.frente < 0.95 || r.tras < 0.20).length,
    vm18b: L.filter((r) => r.area > 13.09 || r.area < 8.0).length,
    gordMin: Math.min(...linhas.map((r) => r.gord)), gordMax: Math.max(...linhas.map((r) => r.gord)),
    gordMed: linhas.reduce((s, r) => s + r.gord, 0) / linhas.length,
    foraMed: linhas.reduce((s, r) => s + r.fora, 0) / linhas.length,
    areaMed: linhas.reduce((s, r) => s + r.area, 0) / linhas.length,
    escorcoMed: linhas.reduce((s, r) => s + r.escorco, 0) / linhas.length,
    ak: linhas.find((r) => r.id === 'ak' && r.aspect === 16 / 9),
    m92: linhas.find((r) => r.id === 'm92' && r.aspect === 16 / 9),
  };
}

const n = (v, d = 3) => (typeof v === 'number' ? v.toFixed(d) : '—');
// CLI só quando ESTE arquivo é o executado — `rodar` é importado por outros scripts e sem
// esta guarda a varredura inteira reimprimia a cada import (ruído no log de quem importa).
const CLI = (process.argv[1] || '').endsWith('vm-orto.mjs');
if (CLI && flag('autoteste')) {
  const a = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/eval/vm_mint_audit.json'), 'utf8'));
  let pior = 0, quem = '';
  for (const r of rodar(1).linhas) {
    const w = a.armas[r.id] && a.armas[r.id].aspectos[r.aspect === 16 / 9 ? '16:9' : '3:2'];
    if (!w) continue;
    for (const [c, v] of [['area', w.areaPct], ['gord', w.gordura], ['fora', w.foraPct], ['esq', w.silBordaEsq ?? w.bordaEsq]]) {
      const d = Math.abs(r[c] - v) / Math.max(1, Math.abs(v));
      if (d > pior) { pior = d; quem = `${r.id} ${c}`; }
    }
  }
  console.log(`autoteste k=1 contra vm_mint_audit.json: pior desvio relativo ${(pior * 100).toFixed(3)}% (${quem}) ${pior < 0.02 ? 'OK' : 'DIVERGE'}`);
  process.exit(pior < 0.02 ? 0 : 2);
}
if (CLI) {
const ks = (arg('k', '1,1.25,1.5,1.75,2,2.5,3,4,5,6,8,12')).split(',').map(Number);
if (flag('armas')) {
  for (const k of ks) {
    const r = rodar(k);
    console.log(`\n── k=${k}  V0=${(2 * Math.atan(Math.tan(V0DEG * Math.PI / 360) / k) * 180 / Math.PI).toFixed(2)}°  tanH=${(F.cls.rifle.tanH / k).toFixed(4)}  recuoZ=${(F.recuoZ * k).toFixed(3)}`);
    console.log('arma       cls      Zg     area%  fora%  gord  frente tras  esq   ang   fdir  gripY bocaY escorco');
    for (const w of r.linhas.filter((x) => x.aspect === 16 / 9)) {
      console.log(`${w.id.padEnd(11)}${w.cls.padEnd(8)} ${n(w.Zg)} ${n(w.area, 2).padStart(6)} ${n(w.fora, 1).padStart(5)} ${n(w.gord)} ${n(w.frente)} ${n(w.tras)} ${n(w.esq)} ${n(w.ang, 1).padStart(5)} ${n(w.fatiaDir)} ${n(w.gripY)} ${n(w.bocaY)} ${n(w.escorco)}`);
    }
  }
} else {
  console.log('CURVA DE ÁREA CONSTANTE — k = afastamento (Zg×k, tanH÷k, lente÷k). k=1 é a árvore de hoje.');
  console.log(' k      V0°    escorço  |  AK: area% fora%  gord | M92: area% fora%  gord | gord méd (min-max) | fora méd | area méd | VM1 VM3 VM5 VM9 VM12 VM16 VM18 VM18b');
  for (const k of ks) {
    const r = rodar(k);
    const V0k = 2 * Math.atan(Math.tan(V0DEG * Math.PI / 360) / k) * 180 / Math.PI;
    console.log(`${String(k).padEnd(6)} ${V0k.toFixed(2).padStart(6)} ${n(r.escorcoMed).padStart(8)}  |`
      + ` ${n(r.ak.area, 2).padStart(6)} ${n(r.ak.fora, 1).padStart(5)} ${n(r.ak.gord)} |`
      + ` ${n(r.m92.area, 2).padStart(6)} ${n(r.m92.fora, 1).padStart(5)} ${n(r.m92.gord)} |`
      + ` ${n(r.gordMed)} (${n(r.gordMin)}-${n(r.gordMax)}) | ${n(r.foraMed, 1).padStart(5)} | ${n(r.areaMed, 2).padStart(6)} |`
      + ` ${String(r.vm1).padStart(3)} ${String(r.vm3).padStart(3)} ${String(r.vm5).padStart(3)} ${String(r.vm9).padStart(3)} ${String(r.vm12).padStart(4)} ${String(r.vm16).padStart(4)} ${String(r.vm18).padStart(4)} ${String(r.vm18b).padStart(5)}`);
  }
}
}
