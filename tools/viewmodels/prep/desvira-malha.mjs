#!/usr/bin/env node
/**
 * Desfaz "arma invertida" da malha nas armas de precisão (mesma classe da SKS, VM-FIX-MAGS.md):
 * o ICP de `precisao-final-build.py` convergiu girado 180° no eixo vertical, com a boca da malha
 * na câmera e o socket MUZZLE na soleira. Gira `GEO_MINT_<X>` 180° no Y local e aplica o mesmo
 * giro de mundo (medido no idle) às peças recortadas, que seguem os ossos do pacote.
 * M400 (pacote próprio, sem GEO_MINT): a malha mora no nó animado com os marcadores do autor
 * (grip_r, support_l, muzzle); gira os VÉRTICES 180° em Y e conjuga os canais do pente.
 * REM700: a malha está ROLADA ~90° no eixo do cano (altura da arma no X do mundo, as irmãs do
 * mesmo pacote de ferrolho têm no Y); gira o nó da malha e o ferrolho em torno da linha que passa
 * pelas duas palmas (punho e guarda-mão ficam na mão; o contato dos dedos é o que o verify DMR cobra).
 * `apoio`: depois do giro a mão esquerda do pacote fica no cano nu, além do guarda-mão; a pegada vai
 * para o centro da seção do guarda-mão (z 0,36 local) pelo IK do grip-support.mjs (#633).
 * `apoio` na mosin: virada, a mão esquerda ficava na boca do cano; vai ao centro do guarda-mão.
 * `fixaNaArma` (svd): o osso `Mag` do doador G3SG1 carrega o pente virado para longe das mãos (0,10 m
 * no melhor quadro; o crítico viu a peça parada no ar). Até existir pose de mão, o pente fica na arma.
 * `giraMira`/`bocaNaPonta`: o SOCKET_MINT_SIGHT tinha sido posto sobre a malha virada e gira junto;
 * o MUZZLE vai ao centro da seção da ponta do cano (ficava 3–7 cm fora dela: clarão/traçador).
 * `esconde`: peças do pacote (clipe de cartuchos, cartucho) que em nenhum clipe chegam a 0,45 m de
 * uma mão ficam flutuando longe na tela; saem com escala zero, estacionadas no centro da arma.
 * Diagnóstico e antes/depois: docs/reports/VM-FIX-L3L5.md.
 *
 * Uso: node tools/viewmodels/prep/desvira-malha.mjs --arma=mosin|svd|m400|rem700 --source=<glb> --output-dir=<fora-do-git>
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { Pose, THREE, duration, gravarClipe } from './fk-gltf.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ARMAS = {
  mosin: { sha: '52b8db3adc4415364accf34d5b039d1399df988482268150790b4cc40399c56b', arquivo: 'mosin-baked-runtime.glb',
    arma: 'MINT_WEAPON_MOSIN', malha: 'GEO_MINT_MOSIN', pecas: ['MINT_MOSIN_BOLT'], giraMira: true, bocaNaPonta: true, esconde: /^GEO_PROC_(Clip|Cartridge)/,
    apoio: { corpo: 'MINT_WEAPON_MOSIN', alvo: [-0.09, 0.041, 0.021], rolagem: 0, fecho: 1,
      clipes: ['idle', 'shoot', 'inspect', 'equip_rifle', 'reload_empty', 'reload_start', 'reload_loop', 'reload_end'] } },
  svd: { sha: 'f44732930d24dcb78a728ea3a1c1458d0d763a23a79749ea8ad54366a9e376e9', arquivo: 'svd-baked-runtime.glb',
    arma: 'MINT_WEAPON_SVD', malha: 'GEO_MINT_SVD', pecas: ['MINT_SVD_MAG'], giraMira: true, bocaNaPonta: true, fixaNaArma: ['MINT_SVD_MAG'] },
  m400: { sha: 'f75e4625c1199d3fed6fb9f132e5cc59a0c742dc41a92bcac5fa6bcab76f739d', arquivo: 'm400-baked-runtime.glb',
    arma: 'MINT_WEAPON_M400', malha: 'MINT_WEAPON_M400', pecas: [], bocaNaPonta: true, vertices: ['MINT_WEAPON_M400', 'MINT_WEAPON_M400_MAG'], conjuga: ['MINT_WEAPON_M400_MAG'] },
  rem700: { sha: '439a4859d840b241680cd6a566bf62b989b7a63c01bbf89d45c7d3b24f1e79fa', arquivo: 'rem700-baked-runtime.glb',
    arma: 'MINT_WEAPON_REM700', malha: 'MINT_WEAPON_REM700', pecas: [], rola: { graus: -90, pelasMaos: true, nos: ['MINT_WEAPON_REM700', 'MINT_BOLT_REM700'] }, esconde: /^PROPS_(Clip|Cartridge)/,
    apoio: { corpo: 'MINT_WEAPON_REM700', alvo: [-0.163, 1.558, 0.36], rolagem: 0, fecho: 1,
      clipes: ['idle', 'shoot', 'inspect', 'reload_empty', 'reload_start', 'reload_loop', 'reload_end'] } },
};
const option = (name) => (process.argv.find((value) => value.startsWith(`--${name}=`)) || '').slice(name.length + 3);
const cfg = ARMAS[option('arma')];
if (!cfg || !option('source') || !option('output-dir')) throw new Error(`uso: --arma=${Object.keys(ARMAS).join('|')} --source=<glb> --output-dir=<dir>`);
const outputDir = path.resolve(option('output-dir'));
if (!path.relative(REPO, outputDir).startsWith('..')) throw new Error('output-dir precisa ficar fora do Git');
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const sourceBytes = await fs.readFile(path.resolve(option('source')));
if (digest(sourceBytes) !== cfg.sha) throw new Error(`fonte ${option('arma')} divergente: ${digest(sourceBytes)}`);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(path.resolve(option('source')));
const P = new Pose(doc);
const V = (...a) => new THREE.Vector3(...a);
const compoe = (node, m) => {
  const t = V(); const q = new THREE.Quaternion(); const s = V(); m.decompose(t, q, s);
  node.setTranslation(t.toArray()).setRotation([q.x, q.y, q.z, q.w]).setScale(s.toArray());
};
const centro = (name) => {
  const caixa = new THREE.Box3();
  P.node(name).traverse((n) => { if (!n.getMesh()) return; const M = P.world(n);
    for (const prim of n.getMesh().listPrimitives()) { const pos = prim.getAttribute('POSITION'); for (let i = 0; i < pos.getCount(); i += 1) caixa.expandByPoint(V(...pos.getElement(i, [])).applyMatrix4(M)); } });
  return caixa.getCenter(V());
};
// Distância mínima peça→mão esquerda/direita nos clipes de recarga (a peça tem que andar com uma mão).
const nasMaos = (peca) => {
  const out = {};
  for (const anim of P.root.listAnimations().filter((a) => /^reload/.test(a.getName()))) {
    let min = Infinity;
    const dur = Math.max(...anim.listSamplers().map((s) => { const a = s.getInput().getArray(); return a[a.length - 1]; }));
    for (let t = 0; t <= dur; t += 1 / 15) { P.set(anim.getName(), t); const c = centro(peca);
      min = Math.min(min, c.distanceTo(P.pos('hand_l')), c.distanceTo(P.pos('hand_r'))); }
    out[anim.getName()] = +min.toFixed(3);
  }
  P.set('idle', 0);
  return out;
};

P.set('idle', 0);
const relatorio = { giro: { eixo: `Y local de ${cfg.malha}`, graus: 180 }, pecas: {} };
const antes = Object.fromEntries(cfg.pecas.map((p) => [p, { osso: P.parent.get(P.node(p)).getName(),
  centroAteOsso: +centro(p).distanceTo(P.pos(P.parent.get(P.node(p)))).toFixed(3), maoMaisPerto: nasMaos(p) }]));
const giro = new THREE.Matrix4().makeRotationY(Math.PI);
const malha = P.node(cfg.malha);
const armaW = P.world(cfg.arma);
const localMalha = P.local(malha);
const giroMundo = armaW.clone().multiply(localMalha).multiply(giro).multiply(localMalha.clone().invert()).multiply(armaW.clone().invert());
const pecasW = cfg.pecas.map((p) => [p, P.world(p), P.world(P.parent.get(P.node(p)))]);
if (cfg.rola) {
  // Eixo longo (PCA) apontando para a boca, pela linha que passa no socket MUZZLE; giro rígido no mundo (idle).
  const pts = []; const M = P.world(malha);
  for (const prim of malha.getMesh().listPrimitives()) { const pos = prim.getAttribute('POSITION'); for (let i = 0; i < pos.getCount(); i += 2) pts.push(V(...pos.getElement(i, [])).applyMatrix4(M)); }
  const c = V(); pts.forEach((p) => c.add(p)); c.divideScalar(pts.length);
  const cov = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (const p of pts) { const d = [p.x - c.x, p.y - c.y, p.z - c.z]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cov[i][j] += d[i] * d[j]; }
  let eixo = V(0.1, 0.2, 1).normalize();
  for (let k = 0; k < 80; k++) eixo = V(cov[0][0] * eixo.x + cov[0][1] * eixo.y + cov[0][2] * eixo.z, cov[1][0] * eixo.x + cov[1][1] * eixo.y + cov[1][2] * eixo.z, cov[2][0] * eixo.x + cov[2][1] * eixo.y + cov[2][2] * eixo.z).normalize();
  let boca = P.pos('SOCKET_MINT_MUZZLE'); if (boca.clone().sub(c).dot(eixo) < 0) eixo.negate();
  if (cfg.rola.pelasMaos) {
    const palma = (l) => P.pos(`index_01_${l}`).add(P.pos(`pinky_01_${l}`)).multiplyScalar(0.5);
    const pr = palma('r'); const pl = palma('l');
    const e2 = pl.clone().sub(pr).normalize(); if (e2.dot(eixo) < 0) e2.negate();
    eixo = e2; boca = pr;
  }
  const R = new THREE.Matrix4().makeTranslation(boca.x, boca.y, boca.z)
    .multiply(new THREE.Matrix4().makeRotationAxis(eixo, THREE.MathUtils.degToRad(cfg.rola.graus)))
    .multiply(new THREE.Matrix4().makeTranslation(-boca.x, -boca.y, -boca.z));
  const antesW = cfg.rola.nos.map((nome) => [nome, P.world(nome), P.world(P.parent.get(P.node(nome)))]);
  for (const [nome, W, paiW] of antesW) compoe(P.node(nome), paiW.clone().invert().multiply(R).multiply(W));
  relatorio.giro = { eixo: `${cfg.rola.pelasMaos ? 'linha das palmas' : 'linha do cano (socket MUZZLE)'}, direção ${eixo.toArray().map((v) => +v.toFixed(3))}`, graus: cfg.rola.graus, nos: cfg.rola.nos };
} else if (cfg.vertices) {
  // Giro nos vértices (o nó carrega marcadores e canais que não podem girar junto).
  const feitos = new Set();
  for (const nome of cfg.vertices) for (const prim of P.node(nome).getMesh().listPrimitives()) {
    for (const [sem, largura] of [['POSITION', 3], ['NORMAL', 3], ['TANGENT', 4]]) {
      const acc = prim.getAttribute(sem); if (!acc || feitos.has(acc)) continue; feitos.add(acc);
      const a = acc.getArray(); for (let i = 0; i < a.length; i += largura) { a[i] = -a[i]; a[i + 2] = -a[i + 2]; }
      acc.setArray(a);
    }
  }
  const qG = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), Math.PI); const qGi = qG.clone().invert();
  for (const nome of cfg.conjuga) {
    const node = P.node(nome);
    const t0 = V(...node.getTranslation()).applyQuaternion(qG); node.setTranslation(t0.toArray());
    const r0 = qG.clone().multiply(new THREE.Quaternion(...node.getRotation())).multiply(qGi); node.setRotation([r0.x, r0.y, r0.z, r0.w]);
    for (const anim of P.root.listAnimations()) for (const ch of anim.listChannels()) {
      if (ch.getTargetNode() !== node) continue;
      const out = ch.getSampler().getOutput(); const a = out.getArray();
      if (ch.getTargetPath() === 'translation') for (let i = 0; i < a.length; i += 3) { a[i] = -a[i]; a[i + 2] = -a[i + 2]; }
      if (ch.getTargetPath() === 'rotation') for (let i = 0; i < a.length; i += 4) { const q = qG.clone().multiply(new THREE.Quaternion(a[i], a[i + 1], a[i + 2], a[i + 3])).multiply(qGi); a[i] = q.x; a[i + 1] = q.y; a[i + 2] = q.z; a[i + 3] = q.w; }
      out.setArray(a);
    }
  }
  relatorio.giro = { eixo: `Y local de ${cfg.vertices.join(', ')} (vértices)`, graus: 180, canaisConjugados: cfg.conjuga };
} else compoe(malha, localMalha.clone().multiply(giro));
for (const [p, W, paiW] of pecasW) compoe(P.node(p), paiW.clone().invert().multiply(giroMundo).multiply(W));
P.cache = new Map();
if (cfg.giraMira) {
  const s0 = P.node('SOCKET_MINT_SIGHT'); P.set('idle', 0);
  compoe(s0, P.world(P.parent.get(s0)).invert().multiply(giroMundo).multiply(P.world(s0)));
  P.cache = new Map();
  relatorio.mira = { socket: 'SOCKET_MINT_SIGHT', novoLocal: s0.getTranslation().map((v) => +v.toFixed(4)) };
}
if (cfg.bocaNaPonta) {
  // Centro da seção dos 2 cm da ponta do cano (lado do MUZZLE), no referencial da arma.
  P.set('idle', 0);
  const bocaNo = P.node('SOCKET_MINT_MUZZLE'); const Ainv = P.world(cfg.arma).invert(); const Mm = P.world(malha);
  const pts = []; for (const prim of malha.getMesh().listPrimitives()) { const pos = prim.getAttribute('POSITION'); for (let i = 0; i < pos.getCount(); i += 1) pts.push(V(...pos.getElement(i, [])).applyMatrix4(Mm).applyMatrix4(Ainv)); }
  const b0 = V(...bocaNo.getTranslation()); const k = [0, 1, 2].reduce((a, i) => (Math.abs(b0.getComponent(i)) > Math.abs(b0.getComponent(a)) ? i : a), 0);
  const sinal = Math.sign(b0.getComponent(k)); const ponta = sinal < 0 ? Math.min(...pts.map((p) => p.getComponent(k))) : Math.max(...pts.map((p) => p.getComponent(k)));
  const caixa = new THREE.Box3(); for (const p of pts) if (Math.abs(p.getComponent(k) - ponta) < 0.02) caixa.expandByPoint(p);
  const c = caixa.getCenter(V()); c.setComponent(k, ponta);
  if (P.parent.get(bocaNo) !== P.node(cfg.arma)) throw new Error('MUZZLE fora do nó da arma');
  bocaNo.setTranslation(c.toArray()); P.cache = new Map();
  relatorio.boca = { antes: b0.toArray().map((v) => +v.toFixed(4)), depois: c.toArray().map((v) => +v.toFixed(4)) };
}
for (const p of cfg.pecas) relatorio.pecas[p] = { antes: antes[p], depois: { centroAteOsso: +centro(p).distanceTo(P.pos(P.parent.get(P.node(p)))).toFixed(3), maoMaisPerto: nasMaos(p) } };
if (cfg.esconde) {
  // Quadro a quadro, pelo CENTRO DA MALHA (a origem do nó fica longe da geometria): munição só
  // aparece em clipe de recarga e a ≤ LIMIAR de uma mão; fora disso escala zero, no centro da arma.
  const LIMIAR = 0.2;
  const nos = P.root.listNodes().filter((n) => cfg.esconde.test(n.getName()) && n.getMesh());
  const resumo = {};
  for (const an of P.root.listAnimations()) {
    const d = duration(an); const ts = []; for (let t = 0; t < d - 1e-6; t += 1 / 30) ts.push(+t.toFixed(5)); ts.push(+d.toFixed(5));
    const faixas = new Map(nos.map((n) => [n, []])); const vis = new Map(nos.map((n) => [n, 0]));
    for (const t of ts) { P.set(an.getName(), t); const armaW = P.world(cfg.arma);
      for (const n of nos) { const c = centro(n); const dist = Math.min(c.distanceTo(P.pos('hand_l')), c.distanceTo(P.pos('hand_r')));
        if (/^reload/.test(an.getName()) && dist <= LIMIAR) { faixas.get(n).push(P.trs(n)); vis.set(n, vis.get(n) + 1); } else faixas.get(n).push({ ...P.localFor(n, armaW), scale: [0, 0, 0] }); } }
    gravarClipe(doc, an.getName(), ts, faixas);
    resumo[an.getName()] = Object.fromEntries(nos.map((n) => [n.getName(), `${vis.get(n)}/${ts.length}`]));
  }
  P.cache = new Map();
  relatorio.escondidas = { limiarM: LIMIAR, quadrosVisiveis: resumo };
}
if (cfg.fixaNaArma) {
  P.set('idle', 0); const armaW0inv = P.world(cfg.arma).invert();
  const rel = new Map(cfg.fixaNaArma.map((nome) => [P.node(nome), armaW0inv.clone().multiply(P.world(nome))]));
  for (const an of P.root.listAnimations()) {
    const d = duration(an); const ts = []; for (let t = 0; t < d - 1e-6; t += 1 / 30) ts.push(+t.toFixed(5)); ts.push(+d.toFixed(5));
    const faixas = new Map([...rel.keys()].map((n) => [n, []]));
    for (const t of ts) { P.set(an.getName(), t); const A = P.world(cfg.arma); for (const [n, R] of rel) faixas.get(n).push(P.localFor(n, A.clone().multiply(R))); }
    gravarClipe(doc, an.getName(), ts, faixas);
  }
  P.cache = new Map();
  relatorio.fixasNaArma = cfg.fixaNaArma;
}
// Boca da malha: ponta do eixo longo mais perto do socket MUZZLE (tem que ficar a ~0 m).
const boca = P.pos('SOCKET_MINT_MUZZLE');
let ponta = Infinity;
P.set('idle', 0);
for (const prim of malha.getMesh().listPrimitives()) { const pos = prim.getAttribute('POSITION'); const M = P.world(malha);
  for (let i = 0; i < pos.getCount(); i += 1) ponta = Math.min(ponta, V(...pos.getElement(i, [])).applyMatrix4(M).distanceTo(boca)); }
relatorio.vérticeMaisPertoDaBocaM = +ponta.toFixed(3);

await fs.mkdir(outputDir, { recursive: true });
const output = path.join(outputDir, cfg.arquivo);
await io.write(output, doc);
if (cfg.apoio) {
  const { aplicar } = await import('./grip-support.mjs');
  relatorio.apoio = await aplicar({ arma: option('arma'), entrada: output, saida: output, cfg: cfg.apoio });
}
const outputBytes = await fs.readFile(output);
const report = { schemaVersion: 1, weapon: option('arma'), ...relatorio, source: { bytes: sourceBytes.length, sha256: cfg.sha },
  product: { file: output, bytes: outputBytes.length, sha256: digest(outputBytes) } };
await fs.writeFile(path.join(outputDir, `${option('arma')}-desvira.json`), `${JSON.stringify(report, null, 2)}\n`);
console.log(`DESVIRA_OK ${JSON.stringify(report)}`);
