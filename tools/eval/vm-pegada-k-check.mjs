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
 *  PG1 apoio   centro do punho esquerdo (círculo dos dedos) DENTRO do corte real da malha
 *              no plano do punho, com folga de 1,5 cm — a mão envolve o guarda-mão.
 *  PG2 gatilho osso do gatilho a ≤ 4 cm da junta distal do indicador direito (idle).
 *  PG3 manga   a manga cobre o braço (pesos em upperarm_twist); a manga cortada no
 *              antebraço (748 vértices) é o punho oco.
 *  PG4 pente   o pente não pode sair branco liso (baseColor sem textura com luminância > 0,5).
 *  PG5 pinça   com cartucho na mão (recarga vazia), pontas de polegar e indicador ≤ 4,5 cm.
 *  PG6 mira    ADS simulado como o runtime (authoredvm.js): alça e massa a ≤ 12 px da
 *              cruz em 1440×960 (vmads-sim.mjs).
 *  PG7 ads     no ADS a arma ocupa ≥ 0,4% da tela sem as mãos na frente (PT-38 no frame
 *              novo: 0,63%; revólver reprovado: 0,14% = o "toco de 40 px acima das luvas").
 *  PG8 cabo    centro do punho DIREITO dentro do corte horizontal do cabo, folga 1,5 cm (m92 do
 *              pacote M4 fechava ~19 cm à frente do cabo, atrás do pente; ak/akm ~9 cm).
 *  PG9 luvas   no ADS simulado as luvas ocupam ≤ 8% da tela: PT-38 aprovada 5,2%; revólver
 *              reprovado (r2 e fix-grips, "luvas ~1,8× as da pistola") 10,5%.
 *  PG10 à vista a luva de apoio aparece ≥ 60% na câmera do runtime (pixels com a arma ÷ sem a
 *              arma, sem a manga estendida do runtime): m4 0,85, md97 0,77; shotgun do catálogo 0,39.
 *  PG11 enterra juntas dos dedos de apoio no máximo 1 cm dentro da malha (paridade de 5 raios
 *              + distância ao triângulo, dedo com luva = 0,9 cm): shotgun reprovada 1,74 cm.
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
import { frameDa } from '../viewmodels/prep/vmpose-preview.mjs';
import { desenhar } from '../viewmodels/prep/vmpose.mjs';
import { VM_WEAPON } from '../../public/js/data/vmconfig.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const opt = (n, d = '') => { const h = process.argv.find((v) => v.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const SERVIDO = path.join(ROOT, 'public/private-assets/viewmodels');
const CATALOGO = path.resolve(opt('catalogo',
  '/Users/ruben/csbrasil-private-assets/generated/viewmodels-catalog-final/preview-root/viewmodels'));
// A AK K não existe no catálogo Codex: o produto reprovado dela é o do vm/k-rebuild.
const K_REBUILD = path.resolve(opt('k-rebuild',
  '/Users/ruben/csbrasil-private-assets/generated/viewmodels-k-rebuild/overlay/viewmodels'));
const { Vector3 } = THREE;

// ref = nó cujo espaço local tem o cano num eixo; alça/massa vêm de VM_WEAPON[arma].ads.linhaDeMira.
// cabo = eixo vertical do nó da arma para o corte horizontal do PG8.
export const ARMAS = {
  ak: { arquivo: 'ak/ak-baked-runtime.glb', malha: 'MINT_WEAPON_AK', ref: 'MINT_WEAPON_AK', eixo: 0, cabo: 1, antes: K_REBUILD,
    checks: ['PG1', 'PG3', 'PG8', 'PG10'] },
  akm: { arquivo: 'ak/akm-baked-runtime.glb', malha: 'MINT_WEAPON_AKM', ref: 'MINT_WEAPON_AKM', eixo: 0, cabo: 1,
    checks: ['PG1', 'PG3', 'PG8', 'PG10'] },
  m92: { arquivo: 'ak/m92-baked-runtime.glb', malha: 'MINT_WEAPON_M92', ref: 'MINT_WEAPON_M92', eixo: 0, cabo: 1,
    checks: ['PG1', 'PG3', 'PG6', 'PG8', 'PG10'] },
  md97: { arquivo: 'ar/md97-baked-runtime.glb', malha: 'MINT_WEAPON_MD97', ref: 'MINT_WEAPON_MD97', eixo: 0,
    pente: 'MD97 Magazine', checks: ['PG1', 'PG3', 'PG4', 'PG6', 'PG10'] },
  shotgun: { arquivo: 'shotgun/shotgun-baked-runtime.glb', malha: 'GEO_WEAPON_SHOTGUN_KXG12', ref: 'RIG_WEAPON_SHOTGUN', eixo: 2,
    gatilho: 'MINT_MECH_SHOTGUN_TRIGGER', checks: ['PG1', 'PG2', 'PG3', 'PG6', 'PG10', 'PG11'] },
  revolver38: { arquivo: 'revolver/revolver-runtime.glb', ref: 'RIG_WEAPON_REVOLVER', gatilho: 'Trigger',
    checks: ['PG2', 'PG5', 'PG6', 'PG7', 'PG9'] },
};

const pos = (m) => new Vector3().setFromMatrixPosition(m);
const dedos = (lado) => ['index', 'middle', 'ring', 'pinky'].flatMap((d) => ['01', '02', '03'].map((k) => `${d}_${k}_${lado}`));

// Centro do punho: círculo (mínimos quadrados) das juntas dos quatro dedos no plano ⟂ aos nós.
function centroPunho(pose, W, lado = 'l') {
  const DEDOS = dedos(lado);
  const P = (n) => pos(W[pose.byName.get(n)]);
  const eixo = P(`pinky_01_${lado}`).sub(P(`index_01_${lado}`)).normalize();
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
  // Corte real da malha no plano ⟂ ao eixo A que passa pelo centro do punho do lado dado.
  const corte = (lado, A) => {
    const refInv = W[pose.byName.get(cfg.ref)].clone().invert();
    const escalaRef = new Vector3().setFromMatrixScale(W[pose.byName.get(cfg.ref)]).x;
    const c = centroPunho(pose, W, lado).applyMatrix4(refInv);
    const B = (A + 1) % 3, C = (A + 2) % 3;
    // Corte real da malha no plano do punho: segmentos triângulo×plano. Dentro = paridade ímpar
    // em ≥3 de 4 raios (±B, ±C: face duplicada não vira fora); fora, vale a distância ao segmento.
    const segs = [];
    for (const t of pose.triangulos(W).filter((t) => t.no === cfg.malha)) {
      const v = [0, 3, 6].map((k) => new Vector3(t.p[k], t.p[k + 1], t.p[k + 2]).applyMatrix4(refInv).toArray());
      const pts = [];
      for (let e = 0; e < 3; e++) {
        const p = v[e], q = v[(e + 1) % 3], alvo = c.getComponent(A);
        if ((p[A] - alvo) * (q[A] - alvo) > 0 || p[A] === q[A]) continue;
        const u = (alvo - p[A]) / (q[A] - p[A]);
        pts.push([p[B] + u * (q[B] - p[B]), p[C] + u * (q[C] - p[C])]);
      }
      if (pts.length >= 2) segs.push([pts[0], pts[1]]);
    }
    const [cb, cc] = [c.getComponent(B), c.getComponent(C)];
    const raios = [0, 0, 0, 0];
    let dmin = Infinity;
    for (const [[b1, c1], [b2, c2]] of segs) {
      if ((c1 > cc) !== (c2 > cc)) { const bx = b1 + (cc - c1) / (c2 - c1) * (b2 - b1); raios[bx > cb ? 0 : 1]++; }
      if ((b1 > cb) !== (b2 > cb)) { const cx = c1 + (cb - b1) / (b2 - b1) * (c2 - c1); raios[cx > cc ? 2 : 3]++; }
      const L = (b2 - b1) ** 2 + (c2 - c1) ** 2;
      const u = L > 0 ? Math.max(0, Math.min(1, ((cb - b1) * (b2 - b1) + (cc - c1) * (c2 - c1)) / L)) : 0;
      dmin = Math.min(dmin, Math.hypot(cb - (b1 + u * (b2 - b1)), cc - (c1 + u * (c2 - c1))));
    }
    const dentro = raios.filter((n) => n % 2 === 1).length >= 3;
    const distCm = dentro ? 0 : dmin * escalaRef / metro * 100;
    return { cm: +distCm.toFixed(2), dentro, centro: c.toArray().map((x) => +x.toFixed(3)), segmentos: segs.length,
      ok: segs.length > 0 && distCm <= 1.5 };
  };
  if (cfg.checks.includes('PG1')) out.PG1 = corte('l', cfg.eixo);
  if (cfg.checks.includes('PG8')) out.PG8 = corte('r', cfg.cabo);
  if (cfg.checks.includes('PG10')) {
    // Luva esquerda = triângulos de luva mais perto de hand_l que de hand_r.
    const frame = await frameDa(arma);
    const hl = pos(W[pose.byName.get('hand_l')]), hr = pos(W[pose.byName.get('hand_r')]);
    const tris = pose.triangulos(W).map((t) => {
      if (!/Glove/i.test(t.mat)) return t;
      const c = new Vector3((t.p[0] + t.p[3] + t.p[6]) / 3, (t.p[1] + t.p[4] + t.p[7]) / 3, (t.p[2] + t.p[5] + t.p[8]) / 3);
      return c.distanceTo(hl) < c.distanceTo(hr) ? t : { ...t, mat: 'OutraMao' };
    });
    const view = pose.camera(W, frame), fov = pose.fovTela(frame.fov, 1.5);
    const com = await desenhar(tris, view, { fov });
    const sem = await desenhar(tris.filter((t) => /Glove|Cloth|Hand|OutraMao/i.test(t.mat)), view, { fov });
    const visivel = sem.luva > 0 ? com.luva / sem.luva : 0;
    out.PG10 = { visivel: +visivel.toFixed(3), ok: visivel >= 0.6 };
  }
  if (cfg.checks.includes('PG11')) {
    const malha = pose.triangulos(W).filter((t) => t.no === cfg.malha)
      .map((t) => new THREE.Triangle(new Vector3(t.p[0], t.p[1], t.p[2]), new Vector3(t.p[3], t.p[4], t.p[5]), new Vector3(t.p[6], t.p[7], t.p[8])));
    const R = 0.009 * metro;
    const raios = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [-1, 0, 0], [0, -1, 0]].map((d) => new Vector3(...d));
    const ray = new THREE.Ray(), hit = new Vector3(), cp = new Vector3();
    let pior = { junta: null, cm: 0 };
    for (const nome of [...dedos('l'), 'thumb_02_l', 'thumb_03_l']) {
      const p = pos(W[pose.byName.get(nome)]);
      let d = Infinity, votos = 0;
      for (const tr of malha) { tr.closestPointToPoint(p, cp); d = Math.min(d, cp.distanceTo(p)); }
      for (const dir of raios) { ray.set(p, dir); let k = 0; for (const tr of malha) if (ray.intersectTriangle(tr.a, tr.b, tr.c, false, hit)) k++; if (k % 2) votos++; }
      const cm = (votos >= 3 ? d + R : Math.max(0, R - d)) / metro * 100;
      if (cm > pior.cm) pior = { junta: nome, cm: +cm.toFixed(2) };
    }
    out.PG11 = { ...pior, triangulos: malha.length, ok: malha.length > 0 && pior.cm <= 1 };
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

export async function mira(arma, raiz, ads = {}, frame = {}, poseAds = true) {
  const cfg = ARMAS[arma];
  const linha = VM_WEAPON[arma].ads.linhaDeMira;
  if (!linha) throw new Error(`${arma}: ads.linhaDeMira ausente no vmconfig`);
  const r = await simularAds({ arquivo: path.join(raiz, cfg.arquivo), arma, ref: linha.ref, alca: linha.alca, massa: linha.massa, ads, frame, cobertura: true, poseAds });
  const px = Math.max(Math.hypot(r.alca[0], r.alca[1]), Math.hypot(r.massa[0], r.massa[1]));
  return { alca: r.alca.slice(0, 2), massa: r.massa.slice(0, 2), piorPx: +px.toFixed(1), ok: px <= 12,
    PG7: { armaVisivel: +(r.cobertura.arma * 100).toFixed(2), ok: r.cobertura.arma >= 0.004 },
    PG9: { luvas: +(r.cobertura.luva * 100).toFixed(2), ok: r.cobertura.luva <= 0.08 } };
}

async function rodada(raiz, adsMutante = null) {
  const linhas = [];
  for (const arma of Object.keys(ARMAS)) {
    const r = raiz === CATALOGO && ARMAS[arma].antes ? ARMAS[arma].antes : raiz;
    const m = await medir(arma, r);
    if (ARMAS[arma].checks.includes('PG6')) {
      const { PG7, PG9, ...pg6 } = await mira(arma, r, adsMutante ? adsMutante(arma) : {});
      m.PG6 = pg6;
      if (ARMAS[arma].checks.includes('PG7')) m.PG7 = PG7;
      if (ARMAS[arma].checks.includes('PG9')) m.PG9 = PG9;
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
    // Cada produto reprovado tem de cair na cláusula que o conserto dele move, não em qualquer uma.
    const MORDE = { ak: ['PG1', 'PG8'], akm: ['PG1', 'PG8'], m92: ['PG1', 'PG8'], md97: ['PG1', 'PG4'], shotgun: ['PG10', 'PG11'], revolver38: ['PG5', 'PG9'] };
    for (const l of velhos) {
      const mordeu = (MORDE[l.arma] || []).every((k) => l.falhas.includes(k)) && l.falhas.length > 0;
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
  // Mutante 4: runtime que ignora o clipe `ads` do produto (pose de ADS própria) — PG9 tem de reprovar.
  {
    const r = await mira('revolver38', SERVIDO, {}, {}, false);
    console.log(`MUTANTE revolver-sem-pose-ads ${r.PG9.ok ? 'VERDE (CEGA)' : 'VERMELHO (mordeu)'} luvas=${r.PG9.luvas}%`);
    ok &&= !r.PG9.ok;
  }
  // Mutante 2: produto novo com o ADS sem resíduo (só o socket `sight`) — PG6 tem de reprovar.
  for (const arma of ['md97', 'shotgun', 'm92']) {
    const r = await mira(arma, SERVIDO, { auto: true, off: [0, 0, 0], rotDeg: [0, 0, 0], pull: 0.05 });
    console.log(`MUTANTE ads-sem-residuo ${arma.padEnd(11)} ${r.ok ? 'VERDE (CEGA)' : 'VERMELHO (mordeu)'} piorPx=${r.piorPx}`);
    ok &&= !r.ok;
  }
}
console.log(`VM_PEGADA_K=${JSON.stringify({ ok })}`);
process.exit(ok ? 0 : 1);
