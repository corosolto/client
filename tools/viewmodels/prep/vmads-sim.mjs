#!/usr/bin/env node
// Simula o ADS do runtime (authoredvm.js, update: alinhamento boca−alça, deslize da alça,
// resíduo off/pull/rotDeg) sobre a pose idle do produto e projeta alça e massa na tela.
// Uso: node vmads-sim.mjs --arma=shotgun --glb=<arquivo> --ref=<nó> --alca=x,y,z --massa=x,y,z [--ads='{...}'] [--frame='{...}']
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { carregar, desenhar, THREE } from './vmpose.mjs';
import { frameDa } from './vmpose-preview.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const opt = (n, d = '') => { const h = process.argv.find((v) => v.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const D2R = Math.PI / 180;

export async function simularAds({ arquivo, arma, ref, alca, massa, ads: adsExtra = {}, frame: frameExtra = {}, aspecto = 1.5, figura = '', cobertura = false }) {
  const { VM_WEAPON } = await import(pathToFileURL(path.join(ROOT, 'public/js/data/vmconfig.js')).href);
  const ads = { ...VM_WEAPON[arma].ads, ...adsExtra };
  const frame = { ...(await frameDa(arma)), ...frameExtra };
  const pose = await carregar(arquivo);
  const W = pose.mundo(pose.local('idle', 0));
  const cam = W[pose.byName.get('VIEWMODEL_CAMERA')].clone().invert();
  const refW = W[pose.byName.get(ref)];
  const cena = (v) => new THREE.Vector3(...v).applyMatrix4(refW).applyMatrix4(cam);
  const sock = (n) => new THREE.Vector3().setFromMatrixPosition(W[pose.byName.get(n)]).applyMatrix4(cam);
  const mount = new THREE.Object3D();
  const r = frame.rotDeg || [0, 0, 0];
  mount.rotation.set(r[0] * D2R, r[1] * D2R, r[2] * D2R);
  mount.position.set(frame.x, frame.y, frame.z);
  const mundo = (p) => { mount.updateMatrixWorld(true); return p.clone().applyMatrix4(mount.matrixWorld); };
  if (ads.auto) {
    const f = mundo(sock('SOCKET_MINT_MUZZLE')).sub(mundo(sock('SOCKET_MINT_SIGHT'))).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(f, new THREE.Vector3(0, 0, -1));
    mount.quaternion.premultiply(q);
    const s = mundo(sock('SOCKET_MINT_SIGHT'));
    mount.position.x -= s.x; mount.position.y -= s.y;
  }
  mount.position.x += ads.off[0]; mount.position.y += ads.off[1];
  mount.position.z += ads.pull + ads.off[2];
  mount.rotation.x += ads.rotDeg[0] * D2R; mount.rotation.y += ads.rotDeg[1] * D2R; mount.rotation.z += ads.rotDeg[2] * D2R;
  const fov = pose.fovTela(frame.fov * (ads.fovScale || 1), aspecto);
  const fk = 1 / Math.tan(fov * Math.PI / 360);
  const px = (p) => { const v = mundo(p); return [+(v.x * fk / aspecto / -v.z * 720).toFixed(1), +(-v.y * fk / -v.z * 480).toFixed(1), +(-v.z).toFixed(3)]; };
  let cob = null;
  if (figura || cobertura) {
    mount.updateMatrixWorld(true);
    cob = await desenhar(pose.triangulos(W), mount.matrixWorld.clone().multiply(cam), { fov, arquivo: figura,
      marcas: [[...alca, [255, 0, 255]], [...massa, [0, 200, 0]]].map(([x, y, z, c]) => [...new THREE.Vector3(x, y, z).applyMatrix4(refW).toArray(), c]) });
  }
  return { cobertura: cob, alca: px(cena(alca)), massa: px(cena(massa)), socketAlca: px(sock('SOCKET_MINT_SIGHT')), boca: px(sock('SOCKET_MINT_MUZZLE')), ads, fov };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = await simularAds({ arquivo: opt('glb'), arma: opt('arma'), ref: opt('ref'),
    alca: opt('alca').split(',').map(Number), massa: opt('massa').split(',').map(Number),
    ads: JSON.parse(opt('ads', '{}')), frame: JSON.parse(opt('frame', '{}')), figura: opt('figura') });
  console.log(JSON.stringify(r));
}

// Resíduo que leva alça E massa ao centro: busca em pitch/yaw (rotDeg) e off x/y.
export async function calibrarAds(args) {
  const base = { auto: true, off: [0, 0, 0], rotDeg: [0, 0, 0], pull: 0.05, fovScale: 1, ...args.ads };
  const erro = async (rx, ry, ox, oy) => {
    const r = await simularAds({ ...args, ads: { ...base, rotDeg: [rx, ry, 0], off: [ox, oy, base.off[2]] } });
    return { e: Math.hypot(...r.alca.slice(0, 2)) + Math.hypot(...r.massa.slice(0, 2)), r };
  };
  let best = { rx: base.rotDeg[0], ry: base.rotDeg[1], ox: base.off[0], oy: base.off[1] };
  let cur = await erro(best.rx, best.ry, best.ox, best.oy);
  for (const passo of [[4, 0.1], [1, 0.02], [0.25, 0.005], [0.06, 0.001]]) {
    let melhorou = true;
    while (melhorou) {
      melhorou = false;
      for (const [k, d] of [['rx', passo[0]], ['ry', passo[0]], ['ox', passo[1]], ['oy', passo[1]]]) {
        for (const s of [1, -1]) {
          const c = { ...best, [k]: best[k] + s * d };
          const e = await erro(c.rx, c.ry, c.ox, c.oy);
          if (e.e < cur.e - 1e-3) { best = c; cur = e; melhorou = true; }
        }
      }
    }
  }
  return { ads: { ...base, rotDeg: [+best.rx.toFixed(2), +best.ry.toFixed(2), 0], off: [+best.ox.toFixed(4), +best.oy.toFixed(4), base.off[2]] }, resultado: cur.r, erroPx: +cur.e.toFixed(2) };
}
