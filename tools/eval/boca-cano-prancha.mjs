#!/usr/bin/env node
/* BOCA-CANO-PRANCHA — prancha antes/depois e medida NO BROWSER (corpo e arma GLB de verdade)
   da origem do clarão e do traçante. Complementa a eval:boca-cano, que roda em Node com o
   corpo procedural: aqui entram o personagem GLB, a arma GLB na mão e o viewmodel autorado.

   Mede, a 1280×720, para cada lado (antes = ?bocacano=0, depois = padrão):
     3P  · jogador em 3ª pessoa: clarão e traçante × boca da arma do corpo (m e px);
     BOT · bot inimigo atirando a ~4 m: clarão e traçante × boca da arma dele (m e px);
     1P  · viewmodel autorado: clarão e traçante × pixel da boca do viewmodel (px).
   A boca de referência é medida no browser direto nos vértices da arma visível (centroide
   dos 2% mais avançados em +Z), sem chamar o código que está sendo julgado.

   Marcadores na imagem: anel VERDE = boca real; ponto VERMELHO = origem do efeito.
   Uso: node tools/eval/boca-cano-prancha.mjs --porta=8512 [--saida=evidence/boca-cano] */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (n, d = '') => process.argv.find((v) => v.startsWith(`--${n}=`))?.split('=').slice(1).join('=') || d;
const port = Number(arg('porta', '8512'));
if (port === 8123) throw new Error('8123 é de outra sessão');
const OUT = path.resolve(ROOT, arg('saida', 'evidence/boca-cano'));
fs.mkdirSync(OUT, { recursive: true });
const W = 1280, H = 720;
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['tools/eval/serve.mjs', String(port)], { cwd: ROOT, stdio: 'ignore' });
let browser;

// roda DENTRO da página: helpers de medida + congelamento do laço
const PREP = async () => {
  const THREE = await import('/vendor/three.module.js');
  const g = window.__game;
  g.player.hp = 1e9;
  const W = innerWidth, H = innerHeight;
  const px = (p, cam = g.camera) => { const v = p.clone().project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };
  const ref = new WeakMap();
  const bocaRef = (grp) => {
    const gun = grp && (grp.getObjectByName('arma-glb') || grp.getObjectByName('arma-caixa'));
    if (!gun) return null;
    gun.updateWorldMatrix(true, true);
    let loc = ref.get(gun);
    if (!loc) {
      const inv = gun.matrixWorld.clone().invert(), pts = [];
      gun.traverse((o) => {
        const pos = o.isMesh && o.geometry?.attributes?.position; if (!pos) return;
        const m = inv.clone().multiply(o.matrixWorld);
        for (let i = 0; i < pos.count; i++) pts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m));
      });
      let z0 = Infinity, z1 = -Infinity; for (const p of pts) { z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
      const cut = z1 - (z1 - z0) * 0.02; loc = new THREE.Vector3(); let n = 0;
      for (const p of pts) if (p.z >= cut) { loc.add(p); n++; }
      loc.divideScalar(n); ref.set(gun, loc);
    }
    return gun.localToWorld(loc.clone());
  };
  const cap = { f: [], t: [] };
  const of = g._flash.bind(g), ot = g._tracer.bind(g);
  // congela SÓ o clarão deste tiro; os de tiros anteriores (outros bots) somem antes do disparo
  g._flash = (p, d, c) => { if (p) cap.f.push({ p: p.clone(), fp: !!c }); const r = of(p, d, c); const a = c ? g._vmMzActive : g._mzActive; if (window.__freeze && a.length) a[a.length - 1].life = 1e9; return r; };
  const limpaClaroes = () => { for (const arr of [g._mzActive, g._vmMzActive]) for (const m of arr) { m.grp.visible = false; m.life = 0; }
    for (const sm of g._smokes || []) if (sm.group) sm.group.visible = false; };   // fumaça de granada de bot cobria o quadro
  g._tracer = (a, b) => { cap.t.push(a.clone()); return ot(a, b); };
  const upd = g.update.bind(g);
  window.__freeze = false;
  g.update = (dt, render) => (window.__freeze ? undefined : upd(dt, render));
  const marks = new THREE.Group(); marks.renderOrder = 999; g.scene.add(marks);
  const mk = (p, cor, r) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), new THREE.MeshBasicMaterial({ color: cor, depthTest: false, transparent: true, opacity: 0.9 }));
    m.position.copy(p); m.renderOrder = 999; marks.add(m);
    const ring = new THREE.Mesh(new THREE.RingGeometry(r * 1.6, r * 2.1, 24), new THREE.MeshBasicMaterial({ color: cor, depthTest: false, side: THREE.DoubleSide }));
    ring.position.copy(p); ring.quaternion.copy(g.camera.quaternion); ring.renderOrder = 999; marks.add(ring);
  };
  const draw = () => {
    const r = g.renderer; g.scene.updateMatrixWorld(true);
    r.render(g.scene, g.camera);
    if (g.camView === 'first' && g.vmScene) { r.autoClear = false; r.clearDepth(); r.render(g.vmScene, g.vmCamera); r.autoClear = true; }
  };
  window.__bc = { THREE, g, px, bocaRef, cap, marks, mk, draw, limpaClaroes };
};

async function lado(nome, qs) {
  const page = await (await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`${base}/?debug=1&auto=E&map=praca_poderes&armaslazy=0&bloom=0&vmauthored=1${qs}`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.__game?.state === 'live' || window.__game?.state === 'countdown', null, { timeout: 180000 });
  for (const sel of ['#crash-overlay']) if (await page.locator(sel).count()) await page.locator(sel).evaluate((el) => el.remove()).catch(() => {});
  if (await page.locator('#aviso-software button').count()) await page.locator('#aviso-software button').click({ force: true }).catch(() => {});
  await page.addStyleTag({ content: '#crash-overlay{display:none!important}' });
  await page.evaluate(PREP);
  await page.waitForFunction(() => window.__game.state === 'live', null, { timeout: 60000 });
  const res = {};

  // ── 3P: jogador em 3ª pessoa, arma GLB na mão ──
  await page.evaluate(() => { const { g } = window.__bc; g.player.weapon !== 'ak' && g._switchWeapon?.('ak'); g.setCamView('third'); g.player.pitch = 0.05; });
  await page.waitForFunction(() => window.__game.playerTP?.isGLB && window.__game.playerTP.group.getObjectByName('arma-glb'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
  res['3P'] = await page.evaluate(() => {
    const { g, px, bocaRef, cap, mk, draw, marks } = window.__bc;
    window.__freeze = true;
    window.__bc.limpaClaroes();
    cap.f.length = 0; cap.t.length = 0;
    const p = g.player; p.ammo[p.weapon].mag = 30; p.nextShotAt = 0; p.reloadUntil = 0; p.drawUntil = 0;
    g._tryShoot();
    g._updateFx(0.012);
    const ref = bocaRef(g.playerTP.group);
    const f = cap.f[0], t = cap.t[0];
    marks.clear(); if (ref) mk(ref, 0x22ff44, 0.035); if (f) mk(f.p, 0xff2222, 0.018); if (t && (!f || t.distanceTo(f.p) > 0.02)) mk(t, 0xffaa00, 0.018);
    draw();
    const d = (a) => (a && ref ? { m: +a.distanceTo(ref).toFixed(3), px: +Math.hypot(px(a)[0] - px(ref)[0], px(a)[1] - px(ref)[1]).toFixed(1) } : null);
    return { arma: p.weapon, glb: !!g.playerTP.isGLB, armaGlb: !!g.playerTP.group.getObjectByName('arma-glb'), clarao: d(f?.p), claraoNaVmScene: !!f?.fp, tracante: d(t), bocaPx: ref && px(ref).map((n) => Math.round(n)) };
  });
  await page.screenshot({ path: path.join(OUT, `${nome}-3p.png`) });

  // ── BOT: inimigo GLB atirando a ~4 m, de perfil ──
  res.BOT = await page.evaluate(() => {
    const { THREE, g, px, bocaRef, cap, mk, draw, marks } = window.__bc;
    marks.clear();
    g.setCamView('first');
    const b = g.bots.find((x) => x.team !== g.playerTeam && x.mesh?.isGLB && x.mesh.group.getObjectByName('arma-glb')) || g.bots.find((x) => x.mesh?.group);
    const p = g.player;
    const fwd = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw)), lat = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
    b.alive = true; b.hp = 1e9;
    b.pos.copy(p.pos).addScaledVector(fwd, 4).addScaledVector(lat, 0.9);
    // olha para um ponto ao lado do jogador: perfil 3/4, cano visível
    const alvo = p.pos.clone().addScaledVector(lat, -2.2);
    b.yaw = Math.atan2(alvo.x - b.pos.x, alvo.z - b.pos.z);
    b.mesh.group.position.copy(b.pos); b.mesh.group.rotation.set(0, b.yaw, 0);
    for (let i = 0; i < 20; i++) b.mesh.ctrl?.update?.(1 / 60, 0, true, 0, false);
    b.mesh.group.updateMatrixWorld(true);
    b.mag = 30; b.reloadUntil = 0;
    window.__bc.limpaClaroes();
    cap.f.length = 0; cap.t.length = 0;
    g._botShootNN(b, p);
    g._updateFx(0.012);
    const ref = bocaRef(b.mesh.group);
    const f = cap.f.find((x) => !x.fp), t = cap.t[0];
    if (ref) mk(ref, 0x22ff44, 0.035); if (f) mk(f.p, 0xff2222, 0.018); if (t && (!f || t.distanceTo(f.p) > 0.02)) mk(t, 0xffaa00, 0.018);
    g.vm.root.visible = false;
    draw();
    const d = (a) => (a && ref ? { m: +a.distanceTo(ref).toFixed(3), px: +Math.hypot(px(a)[0] - px(ref)[0], px(a)[1] - px(ref)[1]).toFixed(1) } : null);
    const vis = g._mzActive.filter((m) => m.grp.visible).map((m) => px(m.grp.getWorldPosition(new THREE.Vector3())).map(Math.round));
    return { bot: b.mesh.isGLB ? 'GLB' : 'procedural', arma: b.weapon, clarao: d(f?.p), tracante: d(t), bocaPx: ref && px(ref).map((n) => Math.round(n)),
      diag: { nFlash: cap.f.length, nTracer: cap.t.length, sprites: vis, flashPx: cap.f.map((x) => px(x.p).map(Math.round)), smoke: g._smokes?.length ?? null } };
  });
  await page.screenshot({ path: path.join(OUT, `${nome}-bot.png`) });

  // ── 1P: viewmodel autorado ──
  res['1P'] = await page.evaluate(async () => {
    const { THREE, g, px, cap, draw, marks } = window.__bc;
    marks.clear();
    window.__freeze = false;
    g.vm.root.visible = true;
    await new Promise((r) => setTimeout(r, 1200));
    window.__freeze = true;
    window.__bc.limpaClaroes();
    cap.f.length = 0; cap.t.length = 0;
    const p = g.player; p.ammo[p.weapon].mag = 30; p.nextShotAt = 0; p.reloadUntil = 0; p.drawUntil = 0;
    g._tryShoot();
    const vmPt = g.vm.authored?.muzzleVm?.(p.weapon);
    const off = g._vmMuzzle[p.weapon] || g._vmMuzzle.rifle;
    g.vm.root.updateWorldMatrix(true, false);
    const ref = px(vmPt || g.vm.root.localToWorld(off.clone()), g.vmCamera);
    const m = g._vmMzActive.at(-1);
    const fpx = m ? px(m.grp.getWorldPosition(new THREE.Vector3()), g.vmCamera) : null;
    const tpx = cap.t[0] ? px(cap.t[0]) : null;
    const cam = g.camera.getWorldPosition(new THREE.Vector3());
    const mw = g._muzzleWorld('rifle'), rel = mw.clone().sub(cam);
    const diag = { mwPx: dd0(px(mw), ref), relLen: +rel.length().toFixed(3), relDot: +rel.normalize().dot(g.camera.getWorldDirection(new THREE.Vector3())).toFixed(3),
      vmPt: vmPt && vmPt.toArray().map((n) => +n.toFixed(3)), view: !!g.vmCamera.view?.enabled, tetoK: g._vmTetoK, camZoom: g.camera.zoom, vmZoom: g.vmCamera.zoom, nT: cap.t.length };
    draw();
    const dd = (a) => (a ? +Math.hypot(a[0] - ref[0], a[1] - ref[1]).toFixed(1) : null);
    function dd0(a, b) { return +Math.hypot(a[0] - b[0], a[1] - b[1]).toFixed(1); }
    return { arma: p.weapon, autorado: !!vmPt, claraoPx: dd(fpx), tracantePx: dd(tpx), bocaPx: ref.map((n) => Math.round(n)), diag };
  });
  await page.evaluate(() => { const { g, THREE, mk, marks, cap } = window.__bc; if (cap.t[0]) { mk(cap.t[0], 0xffaa00, 0.03); window.__bc.draw(); } });
  await page.screenshot({ path: path.join(OUT, `${nome}-1p.png`) });
  res.erros = errs.slice(0, 5);
  await page.context().close();
  return res;
}

async function prancha(resAntes, resDepois) {
  const crop = async (file, c) => {
    const s = 300;
    const left = Math.max(0, Math.min(W - s, (c?.[0] ?? W / 2) - s / 2)), top = Math.max(0, Math.min(H - s, (c?.[1] ?? H / 2) - s / 2));
    return sharp(file).extract({ left: Math.round(left), top: Math.round(top), width: s, height: s }).resize(420, 420, { kernel: 'nearest' }).png().toBuffer();
  };
  const fmt = (r) => (r ? `${(r.m * 100).toFixed(1)} cm · ${r.px} px` : '—');
  const linhas = [
    ['3P', 'jogador em 3ª pessoa'], ['BOT', 'bot atirando'], ['1P', '1ª pessoa (VM autorado)'],
  ];
  const tiles = [];
  for (const [i, [k, rot]] of linhas.entries()) {
    for (const [j, [nome, res]] of [['antes', resAntes], ['depois', resDepois]].entries()) {
      const file = path.join(OUT, `${nome}-${k.toLowerCase()}.png`);
      const full = await sharp(file).resize(640, 360).png().toBuffer();
      const zoom = await crop(file, res[k].bocaPx);
      const txt = k === '1P' ? `${nome.toUpperCase()} · ${rot} — clarão ${res[k].claraoPx} px · traçante ${res[k].tracantePx} px da boca`
        : `${nome.toUpperCase()} · ${rot} — clarão ${fmt(res[k].clarao)} · traçante ${fmt(res[k].tracante)}${res[k].claraoNaVmScene ? ' (clarão na vmScene: invisível)' : ''}`;
      const label = Buffer.from(`<svg width="1060" height="34"><rect width="1060" height="34" fill="#000" opacity="0.75"/><text x="10" y="23" font-family="Arial" font-size="17" fill="#fff">${txt}</text></svg>`);
      tiles.push({ input: full, left: j * 1070, top: i * 470 + 40 }, { input: zoom, left: j * 1070 + 645, top: i * 470 + 40 },
        { input: label, left: j * 1070, top: i * 470 + 4 });
    }
  }
  const leg = Buffer.from(`<svg width="2130" height="30"><text x="10" y="20" font-family="Arial" font-size="16" fill="#ddd">anel VERDE = boca real da arma visível · ponto VERMELHO = origem do clarão · LARANJA = origem do traçante (quando difere). Zoom 300×300 px em volta da boca. 1280×720, praca_poderes.</text></svg>`);
  tiles.push({ input: leg, left: 0, top: linhas.length * 470 + 6 });
  await sharp({ create: { width: 2130, height: linhas.length * 470 + 40, channels: 3, background: '#181818' } }).composite(tiles).png().toFile(path.join(OUT, 'prancha-boca-cano.png'));
}

try {
  let up = false;
  for (let i = 0; i < 80 && !up; i++) { try { up = (await fetch(base)).ok; } catch { await new Promise((r) => setTimeout(r, 500)); } }
  if (!up) throw new Error('servidor não subiu');
  browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
  const antes = await lado('antes', '&bocacano=0');
  const depois = await lado('depois', '');
  fs.writeFileSync(path.join(OUT, 'medidas.json'), JSON.stringify({ antes, depois }, null, 2));
  console.log(JSON.stringify({ antes, depois }, null, 2));
  await prancha(antes, depois);
  console.log('prancha:', path.join(OUT, 'prancha-boca-cano.png'));
} finally {
  await browser?.close().catch(() => {});
  server.kill();
}
