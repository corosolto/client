import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.env.BASE;
if (!base) throw new Error('BASE obrigatório');
const mutante = process.argv.find(arg => arg.startsWith('--mutante='))?.slice(10) || '';
if (!['', 'patina', 'apoio-no-ar', 'parada-desliza'].includes(mutante)) throw new Error('mutante desconhecido');
const type = process.env.TYPE || 'jovem';
const step = Number(process.env.STEP || .01);
if (!['jovem', 'adulto', 'matriarca', 'ariete'].includes(type) || !(step > 0)) throw new Error('TYPE ou STEP inválido');
const out = process.env.OUT || '/tmp/javaporcos-passada';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=metal', '--headless=new', '--mute-audio'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await page.addInitScript(() => localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'low', vol: 0, menuMusic: false })));
  await page.goto(`${base}/?debug=1&adaptativa=0&map=invasao_javaporcos&auto=E&bots=3`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
  await page.evaluate(() => { window.__game.objective.state.prepLeft = 0; });
  await page.waitForFunction(() => window.__game.bots.some(b => b.alive && b._boarVisual), null, { timeout: 60000 });
  const result = await page.evaluate(async ({ mutante, type, step }) => {
    const THREE = await import('three');
    const g = window.__game;
    g.paused = true;
    g.update = () => {};
    if (!g.bots.some(b => b.alive && b._boarType === type)) g.objective.assignar({ id: `qa.${type}`, type, hp: 100, entrance: 0 });
    const bot = g.bots.find(b => b.alive && b._boarType === type && b._boarVisual);
    const visual = bot._boarVisual;
    bot.pos.set(0, 0, 0); bot.yaw = 0; bot._boarFocinhoAte = 0; bot._boarGolpeAte = 0; bot._boarCorpo = null;
    g.player.pos.set(3, 0, 0); g.objective.state.mutante = mutante;
    g.objective.atualizaVisual(bot); visual.updateMatrixWorld(true);
    let mesh;
    visual.traverse(o => { if (o.isMesh) mesh ||= o; });
    const attr = mesh.geometry.attributes.position;
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox, midX = (box.min.x + box.max.x) / 2, midZ = (box.min.z + box.max.z) / 2;
    const feet = Array(4).fill(-1);
    for (let i = 0; i < attr.count; i++) {
      const q = (attr.getX(i) < midX ? 0 : 1) + (attr.getZ(i) < midZ ? 0 : 2);
      if (feet[q] < 0 || attr.getY(i) < attr.getY(feet[q])) feet[q] = i;
    }
    if (feet.includes(-1)) throw new Error('não encontrei as quatro patas no GLB real');
    const footWorld = index => {
      if (mesh.geometry.attributes.position !== attr) throw new Error('LOD mudou durante a comparação de vértices');
      const v = new THREE.Vector3().fromBufferAttribute(attr, index);
      if (mesh.isSkinnedMesh) mesh.applyBoneTransform(index, v);
      return mesh.localToWorld(v);
    };
    bot.pos.set(0, 0, 0); bot.yaw = 0; bot._boarFocinhoAte = 0;
    if (mutante) g.objective.state.mutante = mutante;
    g.objective.atualizaVisual(bot); visual.updateMatrixWorld(true);
    bot.pos.z += step; g.time += 1 / 60;
    g.objective.atualizaVisual(bot); visual.updateMatrixWorld(true);
    let previous = feet.map(footWorld), supported = 0;
    const ratios = [];
    for (let frame = 0; frame < 240; frame++) {
      g.time += 1 / 60; bot.pos.z += step;
      g.objective.atualizaVisual(bot); visual.updateMatrixWorld(true);
      const next = feet.map(footWorld);
      const slips = next.map((v, i) => Math.abs(v.y - g.world.groundHeightAt(v.x, v.z)) < 1e-5
        ? Math.hypot(v.x - previous[i].x, v.z - previous[i].z) : Infinity).sort((a, b) => a - b);
      ratios.push(slips[1] / step);
      if (slips[1] < 1e-5) supported++;
      previous = next;
    }
    const beforeStop = feet.map(footWorld);
    let stopSlip = 0;
    for (let frame = 0; frame < 120; frame++) {
      g.time += 1 / 60;
      g.objective.atualizaVisual(bot); visual.updateMatrixWorld(true);
      const now = feet.map(footWorld);
      for (let i = 0; i < 4; i++) stopSlip = Math.max(stopSlip, Math.hypot(now[i].x - beforeStop[i].x, now[i].z - beforeStop[i].z));
    }
    const settled = feet.map(footWorld).every(v => Math.abs(v.y - g.world.groundHeightAt(v.x, v.z)) < 1e-5);
    let resumed = 0;
    previous = feet.map(footWorld);
    for (let frame = 0; frame < 120; frame++) {
      g.time += 1 / 60; bot.pos.z += step;
      g.objective.atualizaVisual(bot); visual.updateMatrixWorld(true);
      const next = feet.map(footWorld);
      if (next.filter((v, i) => Math.abs(v.y - g.world.groundHeightAt(v.x, v.z)) < 1e-5
        && Math.hypot(v.x - previous[i].x, v.z - previous[i].z) < 1e-5).length >= 2) resumed++;
      previous = next;
    }
    return { type: bot._boarType, lod: visual.userData.passada.longe ? 'far' : 'near', step, skinned: !!mesh.isSkinnedMesh, frames: 240, supported, stopSlip, settled, resumed,
      meanSlipRatio: ratios.reduce((a, b) => a + b, 0) / ratios.length, worstSlipRatio: Math.max(...ratios) };
  }, { mutante, type, step });
  writeFileSync(`${out}/resultado${mutante ? `-${mutante}` : ''}.json`, JSON.stringify(result, null, 2));
  if (process.argv.includes('--perf')) {
    const perf = await page.evaluate(() => {
      const g = window.__game;
      let index = 0;
      while (g.objective.boars.some(b => !b._boarId)) g.objective.assignar({ id: `perf.${index++}`, type: 'adulto', hp: 100, entrance: 0 });
      const boars = g.objective.boars;
      const measure = mutante => {
        g.objective.state.mutante = mutante;
        const samples = [];
        for (let frame = 0; frame < 140; frame++) {
          g.time += 1 / 60;
          const start = performance.now();
          for (const b of boars) { b.pos.z += .01; g.objective.atualizaVisual(b); }
          if (frame >= 20) samples.push(performance.now() - start);
        }
        samples.sort((a, b) => a - b);
        return { medianMs: samples[60], p95Ms: samples[114] };
      };
      return { boars: boars.length, rigid: measure('patina'), animated: measure('') };
    });
    writeFileSync(`${out}/perf.json`, JSON.stringify(perf, null, 2));
    console.log(JSON.stringify(perf));
  }
  if (process.argv.includes('--fotos')) {
    await page.addStyleTag({ content: '#hud,#round-banner{display:none!important}' });
    for (let pose = 0; pose < 4; pose++) {
      await page.evaluate(type => {
        const g = window.__game, bot = g.bots.find(b => b.alive && b._boarType === type && b._boarVisual);
        g.vm.root.visible = false;
        bot.pos.z += .1; g.time += 1 / 60;
        g.objective.atualizaVisual(bot);
        g.camera.position.set(bot.pos.x + 2.5, bot.pos.y + .9, bot.pos.z + .5);
        g.camera.lookAt(bot.pos.x, bot.pos.y + .4, bot.pos.z);
        g.renderer.render(g.scene, g.camera);
      }, type);
      await page.screenshot({ path: `${out}/pose-${mutante ? `${mutante}-` : ''}${pose}.png` });
    }
  }
  const ok = result.supported === result.frames && result.stopSlip < 1e-5 && result.settled && result.resumed === 120;
  console.log(`${ok ? '✓' : '✗'} PASSO1 duas patas em apoio sem deslizar: ${result.supported}/${result.frames}; razão média pé/corpo ${result.meanSlipRatio.toFixed(6)}`);
  console.log(`PASSO2 parar/retomar: deslize parado ${result.stopSlip.toFixed(9)} m; acomodou ${result.settled}; retomada ${result.resumed}/120`);
  if (mutante && !result.skinned) throw new Error('MUTANTE NÃO APLICOU: GLB ainda não tem rig de passada');
  process.exitCode = mutante ? (ok ? 1 : 0) : (ok ? 0 : 1);
} finally {
  await browser.close();
}
