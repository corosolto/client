#!/usr/bin/env node
// Prévia offline: node tools/viewmodels/prep/vmpose-preview.mjs --arma=m92 --glb=<arquivo> --clipe=idle --t=0 --out=x.png
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { carregar, desenhar, THREE } from './vmpose.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const opt = (n, d = '') => { const h = process.argv.find((v) => v.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };

export async function frameDa(arma) {
  const { VM_WEAPON } = await import(pathToFileURL(path.join(ROOT, 'public/js/data/vmconfig.js')).href);
  const { VM_FRAME } = await import(pathToFileURL(path.join(ROOT, 'public/js/data/vmframe.js')).href);
  const src = fs.readFileSync(path.join(ROOT, 'public/js/authoredvm.js'), 'utf8');
  const bloco = /const FAMILY_FRAME = Object\.freeze\((\{[\s\S]*?\n\})\);/.exec(src)[1];
  const FAMILY_FRAME = Function(`return (${bloco})`)();
  const w = VM_WEAPON[arma];
  const wf = w?.frame && typeof w.frame === 'object' ? w.frame : {};
  return { ...(FAMILY_FRAME[w.family] || FAMILY_FRAME.default), ...(VM_FRAME[arma] || {}), ...wf };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arma = opt('arma');
  const pose = await carregar(opt('glb'));
  const frame = { ...(await frameDa(arma)), ...JSON.parse(opt('frame', '{}')) };
  const clipes = opt('clipe', 'idle').split(',');
  const ts = opt('t', '0').split(',').map(Number);
  for (const clipe of clipes) for (const t of ts) {
    const world = pose.mundo(pose.local(clipe, t * pose.duracao(clipe)));
    const out = opt('out').replace('%', `${clipe}-${Math.round(t * 100)}`);
    let view = pose.camera(world, frame);
    let fov = pose.fovTela(frame.fov, (+opt('w', 720)) / (+opt('h', 480)));
    // --foco=<nó>: gira a câmera para o nó e fecha o fov (lupa sobre a pegada).
    if (opt('foco')) {
      const p = new THREE.Vector3().setFromMatrixPosition(world[pose.byName.get(opt('foco'))]).applyMatrix4(view);
      const look = new THREE.Matrix4().lookAt(new THREE.Vector3(), p, new THREE.Vector3(0, 1, 0)).invert();
      view = look.multiply(view);
      fov = +opt('fovfoco', '22');
    }
    const cob = await desenhar(pose.triangulos(world), view, { fov, arquivo: out, w: +opt('w', 720), h: +opt('h', 480) });
    console.log(out, `cobertura arma ${(cob.arma * 100).toFixed(1)}% braço ${(cob.braco * 100).toFixed(1)}%`);
  }
}
