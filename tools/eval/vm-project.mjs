#!/usr/bin/env node
/* PROJETOR DE SILHUETA DO VIEWMODEL — emite a MÁSCARA da nossa arma num aspecto qualquer.
 *
 * POR QUE ESTE ARQUIVO EXISTE (e por que ele é separado do vm-mint-audit):
 * o ref-overlay.py precisa desenhar a NOSSA arma por cima do frame de referência, e os
 * frames têm aspecto 1,597 / 1,251 / 1,778 — nenhum deles é 16:9 nem 3:2, que são os dois
 * únicos aspectos que o vm-mint-audit grava. Precisa também rodar contra uma ÁRVORE
 * ANTIGA (`git show 607c6f4:...`) para produzir o "ANTES" da sobreposição, e a árvore
 * antiga não exporta o rasterizador nem devolve os triângulos.
 *
 * A SOLUÇÃO É PARAMETRIZAR, NÃO DUPLICAR MAL: a geometria (GLB, weapons.js CFG,
 * triângulos) vem do módulo vm-mint-audit DESTA árvore — os GLBs não mudam entre commits,
 * e é o único lugar do repo que sabe ler GLB. Já os parâmetros de ENQUADRAMENTO
 * (VM_FRAME, VM_OFF, VM_FOV_DEFAULT, a fórmula do vmOffY) são lidos POR REGEX da árvore
 * ALVO, exatamente como o vm-mint-audit faz com a própria. Assim o mesmo código projeta
 * o "antes" e o "depois" e a diferença na imagem é SÓ a mudança de enquadramento.
 *
 * A cadeia frame()/toView() aqui é um ESPELHO da do vm-mint-audit (que é, por sua vez,
 * espelho do _vmFrame do game.js). Espelho sem conferência é drift esperando acontecer,
 * então `--conferir` compara este espelho contra o vm_mint_audit.json da árvore alvo em
 * 16:9 e 3:2 e falha se divergir mais que 0,004 de tela.
 *
 * Uso:
 *   node tools/eval/vm-project.mjs --arma ak --aspecto 1.597 --w 535 --h 335 --saida /tmp/m.bin
 *   node tools/eval/vm-project.mjs --alvo /tmp/repo-antes --arma ak ...   (árvore alvo)
 *   node tools/eval/vm-project.mjs --alvo <root> --conferir               (autoteste)
 * A saída é um buffer W*H de bytes (0/1), lido com numpy.fromfile no ref-overlay.py.
 */
import fs from 'fs';
import path from 'path';
import { gunSpace, bbox, muzzleOf, sightOf, rotXYZ, CFG, WDIR } from './vm-mint-audit.mjs';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const RAIZ_GEO = path.resolve(AQUI, '../..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ALVO = path.resolve(arg('alvo', RAIZ_GEO));

/* ── parâmetros de enquadramento LIDOS DA ÁRVORE ALVO (mesmos regexes do vm-mint-audit) ── */
// CFG (weapons.js) da ÁRVORE ALVO — mesmo regex do vm-mint-audit, ver a nota no gunSpace.
function cfgDe(root) {
  const src = fs.readFileSync(path.join(root, 'public/js/weapons.js'), 'utf8');
  const i = src.indexOf('const CFG = ');
  if (i < 0) return null;
  const j = src.indexOf('\n};', i);
  // eslint-disable-next-line no-new-func
  return new Function('return ' + src.slice(i + 'const CFG = '.length, j + 2).replace(/Math\.PI/g, String(Math.PI)))();
}
function paramsDe(root) {
  const gjs = fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8');
  const vjs = fs.readFileSync(path.join(root, 'public/js/vmattach.js'), 'utf8');
  const v0 = /const\s+VM_FOV_DEFAULT\s*=\s*([\d.]+)\s*;/.exec(gjs);
  const off = /const\s+VM_OFF\s*=[\s\S]*?:\s*\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]/.exec(gjs);
  const foy = /const\s+vmOffY\s*=\s*\(\s*aspect\s*\)\s*=>\s*([^;]+);/.exec(gjs);
  if (!v0 || !off || !foy) throw new Error('vm-project: game.js do alvo mudou de forma (VM_FOV_DEFAULT/VM_OFF/vmOffY)');
  const i = vjs.indexOf('export const VM_FRAME = {'), j = vjs.indexOf('\n};', i);
  // eslint-disable-next-line no-new-func
  const F = new Function('return ' + vjs.slice(i + 'export const VM_FRAME = '.length, j + 2))();
  const OFF = [+off[1], +off[2], +off[3]];
  // eslint-disable-next-line no-new-func
  const fy = new Function('VM_OFF', 'aspect', 'return (' + foy[1] + ');');
  /* POSE DE MIRA da árvore alvo (RODADA DA LEGIBILIDADE) — `--ads 1` projeta o ADS CHEIO.
     Existe porque o dono disse que a pose de MIRA "chega perto do ideal" e a de quadril
     não: sem desenhar as duas sobre o MESMO frame de referência, essa frase continua sendo
     opinião contra opinião. Ler do alvo (e não copiar) é a mesma regra do VM_FRAME/V0.
     Numa árvore antiga sem `_adsPose` isto devolve null e `--ads` vira erro explícito em
     vez de projetar silenciosamente um ADS inventado. */
  let pose = null, sc = null;
  try {
    const k = gjs.indexOf('this._adsPose = {');
    if (k >= 0) pose = new Function('return ' + gjs.slice(k + 'this._adsPose = '.length, gjs.indexOf('\n    };', k) + 6))();
    const k2 = gjs.indexOf('const STATIC_CLASS = {};'), k3 = gjs.indexOf("STATIC_CLASS['knife']");
    if (k2 >= 0 && k3 >= 0) sc = new Function(gjs.slice(k2, gjs.indexOf('\n', k3) + 1) + '\nreturn STATIC_CLASS;')();
  } catch { /* alvo antigo: fica null */ }
  return { V0: +v0[1], OFF, F, pose, sc, offYFor: (a) => fy(OFF, a), H: Math.tan((+v0[1]) * Math.PI / 360) * (16 / 9) };
}
const P = paramsDe(ALVO);
const CFG_ALVO = cfgDe(ALVO) || CFG;
const A_REF = 16 / 9;

/* ── espelho de _vmFrame / toView / project (ver cabeçalho) ── */
function frame(id, bb, S) {
  const t = P.F.cls[P.F.classOf[id] || 'rifle'];
  const back = S * Math.max(0, -bb.min[2]);
  const fwd = S * Math.max(0.001, bb.max[2]);
  let Zg = Math.max(back + t.clear, t.minz, fwd / t.fwdTan) * (P.F.zMul[id] || 1);
  Zg *= P.F.recuoZ;
  const lim = P.F.nearX * P.H;
  if (lim > t.tanH + 1e-3 && back > 0) Zg = Math.max(Zg, (back * lim) / (lim - t.tanH));
  const gx = Zg * t.tanH;
  const k = id === 'knife', kr = P.F.knifeRot || [0, 0, 0];
  // pitch/yaw entram aqui pelo mesmo caminho do roll (RODADA DO GRIP + PITCH). Como os
  // parâmetros são LIDOS da árvore alvo, uma árvore antiga sem os campos devolve 0 e o
  // "antes" da sobreposição continua sendo o enquadramento antigo, sem gambiarra.
  // A faca usa knifeRot (o que o game.js desenha) — ver a nota no frame() do vm-mint-audit.
  return { Zg, gx, gy: -gx * P.F.tanBarrel,
    roll: k ? kr[2] : (t.roll || 0), pitch: k ? kr[0] : (t.pitch || 0), yaw: k ? kr[1] : (t.yaw || 0) };
}
function toView(p, S, f, aspect) {
  const w = rotXYZ(f, [-S * p[0], S * p[1], -S * p[2]]);
  return [P.OFF[0] + f.gx + w[0], P.offYFor(aspect) + f.gy + w[1], P.OFF[2] - f.Zg + w[2]];
}
// ADS CHEIO (adsF=1): pitch/yaw zerados pela rampa vmAdsRot (VM17) + vm.root deslocado e
// escalado pela pose da CLASSE. Espelho de toViewAds() do vm-mint-audit — ver o bloco lá.
function poseAds(id) {
  if (!P.pose || !P.sc) throw new Error('vm-project --ads: a árvore alvo não tem _adsPose/STATIC_CLASS');
  return P.pose[P.sc[id]] || P.pose._hip;
}
function toViewAds(p, S, f, id, aspect) {
  const pz = poseAds(id), e = pz.s ?? 1;
  const w = rotXYZ({ roll: f.roll, pitch: 0, yaw: 0 }, [-S * p[0], S * p[1], -S * p[2]]);
  return [P.OFF[0] + pz.x + e * (f.gx + w[0]), P.offYFor(aspect) + pz.y + e * (f.gy + w[1]), P.OFF[2] + pz.z + e * (-f.Zg + w[2])];
}
const proj = (p, aspect) => { const V = P.H / aspect, z = -p[2]; return [0.5 + 0.5 * (p[0] / z) / P.H, 0.5 - 0.5 * (p[1] / z) / V]; };

// projeta a arma inteira no aspecto pedido; devolve vértices de tela + triângulos + pontos-chave
export function projetar(id, aspect, ads = false) {
  const { P: pts, T, cfg } = gunSpace(id, CFG_ALVO[id]);
  const bb = bbox(pts);
  const mz = muzzleOf(pts, bb), sg = sightOf(pts, bb, mz);
  const S = P.F.vmScale * (cfg.vm ?? 1);
  const f = frame(id, bb, S);
  if (ads) {
    const pz = poseAds(id), e = pz.s ?? 1;
    return {
      v: pts.map((q) => proj(toViewAds(q, S, f, id, aspect), aspect)), T,
      grip: proj([P.OFF[0] + pz.x + e * f.gx, P.offYFor(aspect) + pz.y + e * f.gy, P.OFF[2] + pz.z - e * f.Zg], aspect),
      boca: proj(toViewAds(mz, S, f, id, aspect), aspect),
      alca: proj(toViewAds(sg, S, f, id, aspect), aspect),
      Zg: f.Zg, S,
    };
  }
  const v = pts.map((q) => proj(toView(q, S, f, aspect), aspect));
  return {
    v, T,
    grip: proj([P.OFF[0] + f.gx, P.offYFor(aspect) + f.gy, P.OFF[2] - f.Zg], aspect),
    boca: proj(toView(mz, S, f, aspect), aspect),
    alca: proj(toView(sg, S, f, aspect), aspect),
    Zg: f.Zg, S,
  };
}

// rasteriza no tamanho de PIXEL da foto (mesma grade da imagem => a máscara nossa e a
// máscara da referência viram comparáveis pixel a pixel)
function mascara(v, T, W, Hh) {
  const g = new Uint8Array(W * Hh);
  const set = (i, j) => { if (i >= 0 && i < W && j >= 0 && j < Hh) g[j * W + i] = 1; };
  for (const t of T) {
    const A = v[t[0]], B = v[t[1]], C = v[t[2]];
    const ax = A[0] * W, ay = A[1] * Hh, bx = B[0] * W, by = B[1] * Hh, cx = C[0] * W, cy = C[1] * Hh;
    set(ax | 0, ay | 0); set(bx | 0, by | 0); set(cx | 0, cy | 0);
    const lo = Math.max(0, Math.floor(Math.min(ax, bx, cx))), hi = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx)));
    const to = Math.max(0, Math.floor(Math.min(ay, by, cy))), bo = Math.min(Hh - 1, Math.ceil(Math.max(ay, by, cy)));
    const d = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(d) < 1e-12 || hi < lo || bo < to) continue;
    const inv = 1 / d;
    for (let j = to; j <= bo; j++) {
      const py = j + 0.5;
      for (let i = lo; i <= hi; i++) {
        const px = i + 0.5;
        const w0 = ((bx - ax) * (py - ay) - (by - ay) * (px - ax)) * inv;
        const w1 = ((px - ax) * (cy - ay) - (py - ay) * (cx - ax)) * inv;
        if (w0 >= 0 && w1 >= 0 && w0 + w1 <= 1) g[j * W + i] = 1;
      }
    }
  }
  return g;
}

/* ── autoteste: o espelho bate com o vm_mint_audit.json da árvore alvo? ── */
function conferir() {
  const p = path.join(ALVO, 'tools/eval/vm_mint_audit.json');
  if (!fs.existsSync(p)) return console.log('conferir: vm_mint_audit.json ausente no alvo — pulado');
  const a = JSON.parse(fs.readFileSync(p, 'utf8'));
  let pior = 0, quem = '', faca = 0;
  for (const [id, w] of Object.entries(a.armas)) {
    if (!fs.existsSync(path.join(WDIR, id + '.glb'))) continue;
    /* A FACA SAI DA CONTA QUANDO O ALVO É UMA ÁRVORE ANTIGA, e isso é um ACHADO, não uma
       exceção de conveniência: até a rodada do GRIP + PITCH os espelhos projetavam a faca
       com rotação ZERO enquanto o game.js desenhava knifeRot. O JSON de 5737ce8 tem a faca
       ERRADA gravada; comparar contra ele acusaria 0,18 m de divergência que é do JSON, não
       deste arquivo. O Δ da faca é IMPRESSO à parte para ninguém varrer isso pra baixo. */
    if (id === 'knife' && !(a.tuning && a.tuning.cls && a.tuning.cls.rifle && 'pitch' in a.tuning.cls.rifle)) {
      const r = projetar(id, 16 / 9), ref = w.aspectos['16:9'];
      faca = Math.max(Math.abs(ref.bocaTela[0] - r.boca[0]), Math.abs(ref.bocaTela[1] - r.boca[1]));
      continue;
    }
    for (const [an, asp] of [['16:9', 16 / 9], ['3:2', 3 / 2]]) {
      const r = projetar(id, asp), ref = w.aspectos[an];
      const d = Math.max(
        Math.abs(ref.gripTela[0] - r.grip[0]), Math.abs(ref.gripTela[1] - r.grip[1]),
        Math.abs(ref.bocaTela[0] - r.boca[0]), Math.abs(ref.bocaTela[1] - r.boca[1]),
      );
      if (d > pior) { pior = d; quem = `${id}@${an}`; }
    }
  }
  const ok = pior <= 0.004;
  console.log(`conferir(${ALVO}): pior Δ ${pior.toFixed(4)} (${quem}) ${ok ? 'OK' : 'DIVERGE'}`
    + (faca ? ` | faca fora da conta: Δ ${faca.toFixed(4)} contra um JSON gerado por auditor que ignorava knifeRot` : ''));
  if (!ok) process.exit(2);
}

if (process.argv.includes('--conferir')) { conferir(); }
else {
  const id = arg('arma'), aspect = +arg('aspecto', String(16 / 9));
  const W = +arg('w', '960'), Hh = +arg('h', String(Math.round(960 / aspect)));
  const r = projetar(id, aspect, arg('ads', '0') === '1');
  fs.writeFileSync(arg('saida', '/tmp/vmmask.bin'), Buffer.from(mascara(r.v, r.T, W, Hh)));
  console.log(JSON.stringify({ arma: id, aspecto: aspect, w: W, h: Hh, grip: r.grip, boca: r.boca, alca: r.alca, Zg: r.Zg, escala: r.S, vmScale: P.F.vmScale, recuoZ: P.F.recuoZ, offY: P.OFF[1], V0: P.V0, minz: P.F.cls[P.F.classOf[id] || 'rifle'].minz, tanH: P.F.cls[P.F.classOf[id] || 'rifle'].tanH, tanBarrel: P.F.tanBarrel, nearX: P.F.nearX }));
}
