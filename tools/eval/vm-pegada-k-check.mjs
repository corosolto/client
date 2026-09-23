#!/usr/bin/env node
/**
 * Régua da PEGADA no produto K (m92, md97, shotgun, revolver38), com esqueleto aplicado.
 *
 * O crítico cego (rodada r2 da revisão L1) reprovou estas quatro por pegada, e nenhuma
 * régua via: "mão de apoio fechada no ar abaixo do guarda-mão" (m92/md97), "punho de
 * manga oco na boca do cano, sem antebraço" e "sockets de mira invertidos" (shotgun),
 * "pente bloco branco" (md97), "cartucho só encostado ao dedo" e "mão cobre a arma no
 * ADS" (revolver38). A `vm-contato-mao.mjs` antiga lia o buffer cru, sem skin, e não
 * valida. Esta resolve FK + skinning do clipe (tools/viewmodels/prep/vmpose.mjs):
 *
 *  PG1 apoio   centro do punho esquerdo (círculo dos dedos) DENTRO do corte da arma na
 *              mesma posição do cano, com folga de 1,5 cm — a mão envolve o guarda-mão.
 *  PG2 gatilho osso do gatilho a ≤ 4 cm da junta distal do indicador direito (idle).
 *  PG3 manga   a manga cobre o braço (pesos em upperarm_twist); a manga cortada no
 *              antebraço (748 vértices) é o punho oco.
 *  PG4 pente   o pente não pode sair branco liso (baseColor sem textura com luminância > 0,5).
 *  PG5 pinça   com cartucho na mão (recarga vazia), pontas de polegar e indicador ≤ 4,5 cm.
 *  PG6 mira    ADS simulado como o runtime (authoredvm.js): alça e massa a ≤ 12 px da
 *              cruz em 1440×960 (vmads-sim.mjs).
 *  PG7 ads     no ADS a arma ocupa ≥ 0,4% da tela sem as mãos na frente (PT-38 no frame
 *              novo: 0,63%; revólver reprovado: 0,14% = o "toco de 40 px acima das luvas").
 *
 * Tetos: 1,5 cm e 4 cm são meia largura de dedo / uma falange (rig KINEMATION, junta
 * distal→ponta 2,2 cm); 4,5 cm fica abaixo dos 6,2 cm medidos no produto reprovado;
 * 12 px é a metade do anel da alça da MD97 na captura aprovada pela AK (shots/ak-ads).
 *
 *   node tools/eval/vm-pegada-k-check.mjs            # produtos servidos (public/private-assets)
 *   node tools/eval/vm-pegada-k-check.mjs --mutantes # produtos reprovados do catálogo + ADS sem resíduo
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { carregar, THREE } from '../viewmodels/prep/vmpose.mjs';
import { simularAds } from '../viewmodels/prep/vmads-sim.mjs';
import { VM_WEAPON } from '../../public/js/data/vmconfig.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const opt = (n, d = '') => { const h = process.argv.find((v) => v.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const SERVIDO = path.join(ROOT, 'public/private-assets/viewmodels');
const CATALOGO = path.resolve(opt('catalogo',
  '/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-root/viewmodels'));
const { Vector3, Box3 } = THREE;

// ref = nó cujo espaço local tem o cano num eixo; alça/massa vêm de VM_WEAPON[arma].ads.linhaDeMira.
export const ARMAS = {
  m92: { arquivo: 'ak/m92-baked-runtime.glb', malha: 'MINT_WEAPON_M92', ref: 'MINT_WEAPON_M92', eixo: 0, checks: ['PG1', 'PG3'] },
  md97: { arquivo: 'ar/md97-baked-runtime.glb', malha: 'MINT_WEAPON_MD97', ref: 'MINT_WEAPON_MD97', eixo: 0,
    pente: 'MD97 Magazine', checks: ['PG1', 'PG3', 'PG4', 'PG6'] },
  shotgun: { arquivo: 'shotgun/shotgun-baked-runtime.glb', malha: 'GEO_WEAPON_SHOTGUN_KXG12', ref: 'RIG_WEAPON_SHOTGUN', eixo: 2,
    gatilho: 'MINT_MECH_SHOTGUN_TRIGGER', checks: ['PG1', 'PG2', 'PG3', 'PG6'] },
  revolver38: { arquivo: 'revolver/revolver-runtime.glb', ref: 'RIG_WEAPON_REVOLVER', gatilho: 'Trigger',
    checks: ['PG2', 'PG5', 'PG6', 'PG7'] },
};

const pos = (m) => new Vector3().setFromMatrixPosition(m);
const DEDOS = ['index', 'middle', 'ring', 'pinky'].flatMap((d) => ['01', '02', '03'].map((k) => `${d}_${k}_l`));

// Centro do punho: círculo (mínimos quadrados) das juntas dos quatro dedos no plano ⟂ aos nós.
function centroPunho(pose, W) {
  const P = (n) => pos(W[pose.byName.get(n)]);
  const eixo = P('pinky_01_l').sub(P('index_01_l')).normalize();
  const u = new Vector3(1, 0, 0); if (Math.abs(u.dot(eixo)) > 0.9) u.set(0, 1, 0);
  u.sub(eixo.clone().multiplyScalar(u.dot(eixo))).normalize();
  const v = new Vector3().crossVectors(eixo, u);
  const pts = DEDOS.map(P);
  const o = pts.reduce((a, p) => a.add(p), new Vector3()).multiplyScalar(1 / pts.length);
  let sxx = 0, sxy = 0, syy = 0, sx = 0, sy = 0, sxz = 0, syz = 0, sz = 0;
  for (const p of pts) { const d = p.clone().sub(o); const x = d.dot(u), y = d.dot(v), z = x * x + y * y; sxx += x * x; sxy += x * y; syy += y * y; sx += x; sy += y; sxz += x * z; syz += y * z; sz += z; }
  const A = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, pts.length]], b = [sxz, syz, sz];
  const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(A);
  const s = [0, 1, 2].map((k) => det(A.map((r, i) => r.map((c, j) => (j === k ? b[i] : c)))) / D);
  return o.clone().add(u.multiplyScalar(s[0] / 2)).add(v.multiplyScalar(s[1] / 2));
}

export async function medir(arma, raiz) {
  const cfg = ARMAS[arma];
  const arquivo = path.join(raiz, cfg.arquivo);
  const pose = await carregar(arquivo);
  const W = pose.mundo(pose.local('idle', 0));
  const metro = new Vector3().setFromMatrixScale(W[pose.byName.get('hand_r')]).x / 0.01;
  const out = { arma, arquivo };
  if (cfg.checks.includes('PG1')) {
    const refInv = W[pose.byName.get(cfg.ref)].clone().invert();
    const escalaRef = new Vector3().setFromMatrixScale(W[pose.byName.get(cfg.ref)]).x;
    const c = centroPunho(pose, W).applyMatrix4(refInv);
    const A = cfg.eixo, B = (A + 1) % 3, C = (A + 2) % 3;
    const corte = { b: [Infinity, -Infinity], c: [Infinity, -Infinity] };
    const inv = refInv;
    for (const t of pose.triangulos(W).filter((t) => t.no === cfg.malha)) {
      const v = [0, 3, 6].map((k) => new Vector3(t.p[k], t.p[k + 1], t.p[k + 2]).applyMatrix4(inv).toArray());
      for (let e = 0; e < 3; e++) {
        const p = v[e], q = v[(e + 1) % 3], alvo = c.getComponent(A);
        if ((p[A] - alvo) * (q[A] - alvo) > 0 || p[A] === q[A]) continue;
        const s = (alvo - p[A]) / (q[A] - p[A]);
        const vb = p[B] + s * (q[B] - p[B]), vc = p[C] + s * (q[C] - p[C]);
        corte.b = [Math.min(corte.b[0], vb), Math.max(corte.b[1], vb)];
        corte.c = [Math.min(corte.c[0], vc), Math.max(corte.c[1], vc)];
      }
    }
    const fora = (x, [lo, hi]) => Math.max(0, lo - x, x - hi);
    const distCm = Math.hypot(fora(c.getComponent(B), corte.b), fora(c.getComponent(C), corte.c)) * escalaRef / metro * 100;
    out.PG1 = { cm: +distCm.toFixed(2), centro: c.toArray().map((x) => +x.toFixed(3)), corte: [corte.b, corte.c].map((r) => r.map((x) => +x.toFixed(3))), ok: Number.isFinite(distCm) && corte.b[0] < Infinity && distCm <= 1.5 };
  }
  if (cfg.checks.includes('PG2')) {
    const d = pos(W[pose.byName.get(cfg.gatilho)]).distanceTo(pos(W[pose.byName.get('index_03_r')])) / metro * 100;
    out.PG2 = { cm: +d.toFixed(2), ok: d <= 4 };
  }
  if (cfg.checks.includes('PG3')) {
    const node = pose.node('GEO_FP_SK_Cloth_01');
    const juntas = node.getSkin().listJoints().map((j) => j.getName());
    let braco = 0;
    for (const p of node.getMesh().listPrimitives()) {
      const J = p.getAttribute('JOINTS_0').getArray(), Wt = p.getAttribute('WEIGHTS_0').getArray();
      for (let k = 0; k < J.length; k++) if (Wt[k] > 0.5 && /^upperarm_twist_01_[lr]$/.test(juntas[J[k]])) braco++;
    }
    out.PG3 = { verticesNoBraco: braco, ok: braco >= 200 };
  }
  if (cfg.checks.includes('PG4')) {
    const m = pose.doc.getRoot().listMaterials().find((x) => x.getName() === cfg.pente);
    const [r, g, b] = m.getBaseColorFactor();
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    out.PG4 = { luminancia: +lum.toFixed(3), textura: Boolean(m.getBaseColorTexture()), ok: Boolean(m.getBaseColorTexture()) || lum <= 0.5 };
  }
  if (cfg.checks.includes('PG5')) {
    const clipe = 'reload_empty';
    const dur = pose.duracao(clipe);
    const drum = pose.byName.get('Drum');
    const rest = [0, 1, 2, 3, 4, 5].map((c) => new Vector3(...pose.node(`Cartridge${c}`).getTranslation()));
    let pior = 0, janelas = 0;
    for (let f = 0; f <= 1; f += 1 / 240) {
      const Wt = pose.mundo(pose.local(clipe, f * dur));
      const ponta = (n) => new Vector3(2.2, 0, 0).applyMatrix4(Wt[pose.byName.get(n)]);
      const pin = pos(Wt[pose.byName.get('thumb_03_l')]).add(pos(Wt[pose.byName.get('index_03_l')])).multiplyScalar(0.5);
      const di = Wt[drum].clone().invert();
      const naMao = [0, 1, 2, 3, 4, 5].some((c) => {
        const cw = pos(Wt[pose.byName.get(`Cartridge${c}`)]);
        return cw.clone().applyMatrix4(di).distanceTo(rest[c]) > 0.3 && cw.distanceTo(pin) / metro < 0.02;
      });
      if (!naMao) continue;
      janelas++;
      pior = Math.max(pior, ponta('thumb_03_l').distanceTo(ponta('index_03_l')) / metro * 100);
    }
    out.PG5 = { quadrosComCartucho: janelas, piorAberturaCm: +pior.toFixed(2), ok: janelas > 0 && pior <= 4.5 };
  }
  return out;
}

export async function mira(arma, raiz, ads = {}, frame = {}) {
  const cfg = ARMAS[arma];
  const linha = VM_WEAPON[arma].ads.linhaDeMira;
  if (!linha) throw new Error(`${arma}: ads.linhaDeMira ausente no vmconfig`);
  const r = await simularAds({ arquivo: path.join(raiz, cfg.arquivo), arma, ref: linha.ref, alca: linha.alca, massa: linha.massa, ads, frame, cobertura: true });
  const px = Math.max(Math.hypot(r.alca[0], r.alca[1]), Math.hypot(r.massa[0], r.massa[1]));
  return { alca: r.alca.slice(0, 2), massa: r.massa.slice(0, 2), piorPx: +px.toFixed(1), ok: px <= 12,
    PG7: { armaVisivel: +(r.cobertura.arma * 100).toFixed(2), ok: r.cobertura.arma >= 0.004 } };
}

async function rodada(raiz, adsMutante = null) {
  const linhas = [];
  for (const arma of Object.keys(ARMAS)) {
    const m = await medir(arma, raiz);
    if (ARMAS[arma].checks.includes('PG6')) {
      const { PG7, ...pg6 } = await mira(arma, raiz, adsMutante ? adsMutante(arma) : {});
      m.PG6 = pg6;
      if (ARMAS[arma].checks.includes('PG7')) m.PG7 = PG7;
    }
    const falhas = ARMAS[arma].checks.filter((k) => !m[k].ok);
    linhas.push({ ...m, falhas });
  }
  return linhas;
}

const servidos = await rodada(SERVIDO);
for (const l of servidos) console.log(`${l.falhas.length ? 'FALHA' : 'ok   '} ${l.arma.padEnd(11)} ${ARMAS[l.arma].checks.map((k) => `${k}=${JSON.stringify(l[k])}`).join(' ')}`);
let ok = servidos.every((l) => l.falhas.length === 0);

if (process.argv.includes('--mutantes')) {
  // Mutante 1: os produtos reprovados na rodada r2 (catálogo intocado) têm de reprovar.
  if (!fs.existsSync(CATALOGO)) { console.log(`MUTANTE ignorado: catálogo ausente em ${CATALOGO}`); ok = false; }
  else {
    const velhos = await rodada(CATALOGO, () => ({ auto: true, off: [0, 0, 0], rotDeg: [0, 0, 0] }));
    for (const l of velhos) {
      const mordeu = l.falhas.length > 0;
      console.log(`MUTANTE produto-reprovado ${l.arma.padEnd(11)} ${mordeu ? 'VERMELHO (mordeu)' : 'VERDE (CEGA)'} falhas=${l.falhas.join(',')}`);
      ok &&= mordeu;
    }
  }
  // Mutante 3: revólver com o frame/ADS da família (antes do conserto) — PG7 tem de reprovar.
  {
    const r = await mira('revolver38', SERVIDO, { auto: true, off: [0, 0, 0], rotDeg: [0, 0, 0], pull: 0.05 },
      { x: 0.075, y: -0.042, z: -0.110, fov: 84, rotDeg: [0, 0, 0] });
    console.log(`MUTANTE revolver-frame-familia ${r.PG7.ok ? 'VERDE (CEGA)' : 'VERMELHO (mordeu)'} armaVisivel=${r.PG7.armaVisivel}%`);
    ok &&= !r.PG7.ok;
  }
  // Mutante 2: produto novo com o ADS sem resíduo (só o socket `sight`) — PG6 tem de reprovar.
  for (const arma of ['md97', 'shotgun']) {
    const r = await mira(arma, SERVIDO, { auto: true, off: [0, 0, 0], rotDeg: [0, 0, 0], pull: 0.05 });
    console.log(`MUTANTE ads-sem-residuo ${arma.padEnd(11)} ${r.ok ? 'VERDE (CEGA)' : 'VERMELHO (mordeu)'} piorPx=${r.piorPx}`);
    ok &&= !r.ok;
  }
}
console.log(`VM_PEGADA_K=${JSON.stringify({ ok })}`);
process.exit(ok ? 0 : 1);
