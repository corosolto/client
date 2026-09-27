#!/usr/bin/env node
// Sonda da mira (não versionar figuras): máscara do ADS com profundidade e normais por arma,
// salva PNG da máscara e das normais para ver o que a régua `mira` lê em óptica/reflex.
// Uso: VM_PALCO_QS=vmfabrica=lmg node tools/fabrica/captura/sonda-mira.mjs --armas=lmg,p90 --out=<dir> [--porta=4672]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import * as P from '../../eval/lib/vm-palco.mjs';
import * as A from '../../eval/lib/vm-analise.mjs';

const arg = (n, d = '') => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') || d;
const OUT = arg('out'); const ARMAS = arg('armas').split(',').filter(Boolean);
fs.mkdirSync(OUT, { recursive: true });
const srv = await P.subirServidor(arg('porta', '4672'));
const browser = await P.abrirNavegador();
const { page } = await P.abrirJogo(browser, `http://127.0.0.1:${arg('porta', '4672')}`, arg('aspecto', '3x2'));
for (const arma of ARMAS) {
  await P.equipar(page, arma);
  await P.entrarAds(page);
  if (arg('deslocar')) await page.evaluate(([x, d]) => { const e = window.__authoredVm.entry(x); const cam = window.__game.vmCamera; cam.updateMatrixWorld();
    const dir = new cam.position.constructor(1, 0, 0).applyQuaternion(cam.getWorldQuaternion(cam.quaternion.clone())).multiplyScalar(d);
    const w = e.mount.getWorldPosition(e.mount.position.clone()).add(dir); e.mount.position.copy(e.mount.parent.worldToLocal(w)); e.mount.updateMatrixWorld(true); }, [arma, Number(arg('deslocar'))]);
  if (process.env.SONDA_PONTOS) console.log(JSON.stringify(await page.evaluate(([x, lista]) => {
    const g = window.__game; const e = window.__authoredVm.entry(x); const cam = g.vmCamera; cam.updateMatrixWorld();
    const osso = e.scene.getObjectByName('Rifle_metarig'); osso.updateWorldMatrix(true, false);
    const V = e.scene.position.constructor; const W = 1440; const H = 960;
    return lista.map((p) => { const v = new V(...p).applyMatrix4(osso.matrixWorld); const d = cam.worldToLocal(v.clone()).z; v.project(cam);
      return [p.join(','), Math.round((v.x + 1) * W / 2 - W / 2), Math.round((1 - v.y) * H / 2 - H / 2), +(-d).toFixed(3)]; });
  }, [arma, JSON.parse(process.env.SONDA_PONTOS)])));
  const m = await P.mascara(page, arma, { profundidade: true, normais: true });
  const r = A.pontoDeMira(m);
  console.log(arma, JSON.stringify({ tipo: r.ponto?.tipo, desvio: r.desvio?.toFixed(0), dx: r.dx?.toFixed(0), dy: r.dy?.toFixed(0) }));
  if (process.env.SONDA_PERFIL) { const x = Math.round(m.w / 2); const lin = []; for (let y = Math.round(m.h / 2) - 90; y < m.h / 2 + 40; y += 3) lin.push(`${y - m.h / 2}:${m.px[y * m.w + x]}/${m.prof[y * m.w + x]}`); console.log(lin.join(' ')); const yy = Math.round(m.h / 2); const lh = []; for (let xx = x - 90; xx < x + 90; xx += 3) lh.push(`${xx - x}:${m.px[yy * m.w + xx]}/${m.prof[yy * m.w + xx]}`); console.log(lh.join(' ')); }
  P.salvarMascaraPng(m, path.join(OUT, `${arma}-mascara.png`), r.ponto ? [{ x: r.ponto.x, y: r.ponto.y, r: 12 }] : []);
  const rgb = Buffer.alloc(m.w * m.h * 3);
  for (let i = 0; i < m.w * m.h; i++) if (m.px[i]) { rgb[i * 3] = m.nrm[i * 3]; rgb[i * 3 + 1] = m.nrm[i * 3 + 1]; rgb[i * 3 + 2] = m.nrm[i * 3 + 2]; }
  await sharp(rgb, { raw: { width: m.w, height: m.h, channels: 3 } }).png().toFile(path.join(OUT, `${arma}-normais.png`));
  await page.screenshot({ path: path.join(OUT, `${arma}-ads.png`) });
  await P.sairAds(page);
}
await browser.close();
srv?.kill?.();
process.exit(0);
