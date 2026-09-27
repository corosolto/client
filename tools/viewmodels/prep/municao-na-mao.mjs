#!/usr/bin/env node
/**
 * Clipe de munição (stripper) na mão direita durante a recarga de fuzil de ferrolho K.
 *
 * Mosin e rem700 herdaram do pacote de ferrolho um osso `Clip` que anda longe das mãos da arma
 * virada (desvira-malha.mjs); a receita do #635 escondeu as malhas do clipe fora de 0,2 m de uma
 * mão, então em nenhum quadro a munição aparece ("tira no ar", fila P2). Aqui, numa janela de cada
 * clipe de recarga (a mão sai do quadro para buscar a munição, volta ao receptor e empurra os
 * cartuchos), o osso `Clip` fica rígido na mão direita e as malhas do clipe voltam à escala do
 * repouso; fora da janela nada muda (continuam escondidas).
 *
 * Orientação desenhada pela própria geometria, sem número mágico por arma:
 *   - eixo dos cartuchos (o maior da caixa de cada cartucho) → frente da arma (alça → boca);
 *   - eixo da pilha (CartridgeClip0 → último) → cima da arma, com `inclina` graus para a câmera;
 *   - centro da caixa do clipe no meio das pontas de polegar e indicador, recuado `recuo` m
 *     para dentro da palma, no instante-âncora (o meio da janela); depois rígido na mão.
 *
 * Uso: node tools/viewmodels/prep/municao-na-mao.mjs --arma=mosin --in=<glb> --out=<glb>
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { Pose, THREE, duration, gravarClipe } from './fk-gltf.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const opt = (n, d = '') => { const h = process.argv.find((v) => v.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };

// A família `bolt` recarrega em laço (reloadStyle bolt_loop: start + 1 loop por cartucho + end;
// o reload_empty nunca toca). janelas = frações de cada clipe [aparece, some]: a mão sai do quadro
// no fim do start (vai buscar a munição), fica no receptor o laço inteiro e sai no começo do end.
// ancora = [clipe, fração] onde a peça é desenhada na mão; o mesmo H vale para todos os clipes.
const JANELAS_BOLT = { reload_start: [0.72, 1.0], reload_loop: [0, 1], reload_end: [0, 0.15], reload_empty: [0.19, 0.58] };
export const MUNICAO = {
  mosin: { arma: 'MINT_WEAPON_MOSIN', osso: 'Clip', malhas: /^GEO_PROC_(Clip|CartridgeClip\d)$/, pilha: /^CartridgeClip\d$/, cartucho: 'GEO_PROC_CartridgeClip0',
    mao: 'r', inclina: 25, recuo: 0.0, ancora: ['reload_loop', 0.5], janelas: JANELAS_BOLT },
  rem700: { arma: 'MINT_WEAPON_REM700', osso: 'Clip', malhas: /^PROPS_(Clip|CartridgeClip\d)$/, pilha: /^CartridgeClip\d$/, cartucho: 'PROPS_CartridgeClip0',
    mao: 'r', inclina: 25, recuo: 0.0, ancora: ['reload_loop', 0.5], janelas: JANELAS_BOLT },
};

const V = (...a) => new THREE.Vector3(...a);

export async function aplicar({ arma, entrada, saida, cfg = MUNICAO[arma] }) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.read(entrada);
  const root = doc.getRoot();
  const P = new Pose(doc);
  const nos = root.listNodes();
  const malhas = nos.filter((n) => cfg.malhas.test(n.getName()) && n.getMesh());
  const pilha = nos.filter((n) => cfg.pilha.test(n.getName())).sort((a, b) => a.getName().localeCompare(b.getName()));
  if (!malhas.length || pilha.length < 2) throw new Error(`${arma}: malhas do clipe/pilha ausentes`);
  const osso = P.node(cfg.osso);
  // Geometria no referencial do osso, com as malhas no repouso (TRS do nó, escala do nó).
  P.set(null, 0);
  const ossoInv = P.world(osso).invert();
  const caixa = new THREE.Box3();
  for (const m of malhas) {
    const M = ossoInv.clone().multiply(P.world(m));
    for (const prim of m.getMesh().listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      for (let i = 0; i < pos.getCount(); i += 1) caixa.expandByPoint(V(...pos.getElement(i, [])).applyMatrix4(M));
    }
  }
  const centroLocal = caixa.getCenter(V());
  const eixoPilha = P.pos(pilha[pilha.length - 1]).applyMatrix4(ossoInv).sub(P.pos(pilha[0]).applyMatrix4(ossoInv)).normalize();
  // Eixo do cartucho: maior dimensão da caixa do cartucho, no referencial do osso.
  const cart = P.node(cfg.cartucho);
  const Mc = ossoInv.clone().multiply(P.world(cart));
  const cc = new THREE.Box3();
  for (const prim of cart.getMesh().listPrimitives()) { const pos = prim.getAttribute('POSITION'); for (let i = 0; i < pos.getCount(); i += 1) cc.expandByPoint(V(...pos.getElement(i, []))); }
  const tam = cc.getSize(V());
  const k = [0, 1, 2].reduce((a, i) => (tam.getComponent(i) > tam.getComponent(a) ? i : a), 0);
  const eixoCart = V(0, 0, 0).setComponent(k, 1).transformDirection(Mc);
  const orto = (a, b) => { const x = a.clone().normalize(); const y = b.clone().sub(x.clone().multiplyScalar(b.dot(x))).normalize(); return new THREE.Matrix4().makeBasis(x, y, V().crossVectors(x, y)); };
  const basePeca = orto(eixoCart, eixoPilha);
  const escalaOsso = V(); P.world(osso).decompose(V(), new THREE.Quaternion(), escalaOsso);

  // Âncora: desenha a peça na mão uma vez e guarda H = mão⁻¹ · peça (rígida em todos os clipes).
  P.set(cfg.ancora[0], cfg.ancora[1] * duration(P.clip(cfg.ancora[0])));
  const A = P.world(cfg.arma);
  const frente = P.pos('SOCKET_MINT_MUZZLE').sub(P.pos('SOCKET_MINT_SIGHT')).normalize();
  const cimaArma = V(0, 1, 0).transformDirection(A);
  const cima = cimaArma.sub(frente.clone().multiplyScalar(cimaArma.dot(frente))).normalize();
  const camera = P.pos('VIEWMODEL_CAMERA');
  const ponta = P.pos(`thumb_03_${cfg.mao}`).add(P.pos(`index_03_${cfg.mao}`)).multiplyScalar(0.5);
  const paraCam = camera.clone().sub(ponta).normalize();
  const cimaInc = cima.clone().applyAxisAngle(V().crossVectors(cima, paraCam).normalize(), -THREE.MathUtils.degToRad(cfg.inclina));
  const R = orto(frente, cimaInc).multiply(basePeca.clone().invert());
  const q = new THREE.Quaternion().setFromRotationMatrix(R);
  const palma = P.pos(`hand_${cfg.mao}`).sub(ponta).normalize();
  const alvoCentro = ponta.clone().addScaledVector(palma, cfg.recuo);
  const semPos = new THREE.Matrix4().compose(V(), q, escalaOsso);
  const pega = centroLocal.clone().applyMatrix4(semPos);
  const alvo = semPos.clone().setPosition(alvoCentro.sub(pega));
  const H = P.world(`hand_${cfg.mao}`).invert().multiply(alvo);
  const relatorio = { arma, receita: 'municao-na-mao', osso: cfg.osso, malhas: malhas.map((m) => m.getName()), clipes: {} };
  for (const [clipe, [f0, f1]] of Object.entries(cfg.janelas)) {
    const anim = P.clip(clipe);
    const dur = duration(anim);
    const [a, b] = [f0 * dur, f1 * dur];
    const tempos = [];
    for (let t = 0; t < dur - 1e-6; t += 1 / 30) tempos.push(+t.toFixed(5));
    tempos.push(+dur.toFixed(5));
    for (const x of [a, b]) for (const e of [-1e-3, 1e-3]) tempos.push(+(x + e).toFixed(5));
    tempos.sort((x, y) => x - y);
    const faixas = new Map([[osso, []], ...malhas.map((m) => [m, []])]);
    const repousoMalha = new Map(malhas.map((m) => [m, { translation: m.getTranslation(), rotation: m.getRotation(), scale: m.getScale() }]));
    let visiveis = 0;
    for (const t of tempos) {
      P.set(clipe, t);
      const dentro = t >= a && t <= b;
      if (dentro) visiveis += 1;
      faixas.get(osso).push(dentro ? P.localFor(osso, P.world(`hand_${cfg.mao}`).multiply(H)) : P.trs(osso));
      for (const m of malhas) faixas.get(m).push(dentro ? repousoMalha.get(m) : P.trs(m));
    }
    gravarClipe(doc, clipe, tempos, faixas);
    relatorio.clipes[clipe] = { janela: [f0, f1], segundos: [+a.toFixed(3), +b.toFixed(3)], quadros: tempos.length, visiveis };
  }
  await io.write(saida, doc);
  const bytes = fs.readFileSync(saida);
  relatorio.saida = { arquivo: saida, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  return relatorio;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arma = opt('arma');
  const saida = path.resolve(opt('out'));
  if (!path.relative(REPO, saida).startsWith('..')) throw new Error('produto licenciado fica fora do repositório');
  const cfg = { ...MUNICAO[arma], ...JSON.parse(opt('cfg', '{}')) };
  console.log(JSON.stringify(await aplicar({ arma, entrada: path.resolve(opt('in')), saida, cfg })));
}
