#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const option = (name, fallback) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=') || fallback;
const base = option('base', 'http://127.0.0.1:9326');
const out = option('out', 'artifacts/operacao-flavio');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
await page.route(/\.astro\/eval-vite|dev-toolbar/, (route) => route.fulfill({
  contentType: 'text/javascript',
  body: 'export default {};',
}));
const errors = [], failed = [], glbs = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('response', (response) => {
  if (response.status() >= 400) failed.push([response.status(), response.url()]);
  if (response.status() === 200 && response.url().includes('.glb')) glbs.push(response.url());
});

const views = [
  { id: '01-terminal', camera: [-24, 5.8, -50], target: [-3, 1.4, -27], description: 'fachada, portal, balcões e assentos do terminal sem trilha no chão' },
  { id: '02-seguranca', camera: [0, 1.8, -24], target: [0, 1.35, 3], description: 'scanners Mint, guaritas e coberturas do controle de acesso' },
  { id: '03-hangar', camera: [-10, 4.2, 17], target: [4, 2.2, 39], description: 'equipamentos de manutenção, carga e eixo protegido do hangar' },
  { id: '04-apron', camera: [27, 5.2, 61], target: [0, 2.2, 55], description: 'avião nivelado, balizamento, escada e equipamentos detalhados do pátio' },
];

try {
  await page.addInitScript(() => {
    localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'med', allyBots: 3, enemyBots: 4, bots: 4, vol: 0, speech: false }));
  });
  await page.goto(`${base}/?debug=1&auto=B,senador&map=operacao_flavio&perfilauto=0`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
  await page.waitForTimeout(3200);
  await page.addStyleTag({ content: '#crash-overlay,astro-dev-toolbar{display:none!important}' });

  const runtime = await page.evaluate(() => {
    const g = window.__game;
    const vip = g.bots.find((bot) => bot._objectiveNpc === 'flavio');
    const gl = g.renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const mintNames = [
      'terminal_fachada', 'terminal_portal', 'balcao_recepcao', 'assentos_aeroporto',
      'scanner_bagagem', 'carro_servico', 'energia_solo', 'torre_iluminacao',
      'barreiras_aeroporto', 'estacao_manutencao', 'containers_carga', 'jardineira',
    ];
    const pointBlocked = (x, z, inflate = 0.46) => g.world.colliders.some((c) => (
      x > c.minX - inflate && x < c.maxX + inflate
      && z > c.minZ - inflate && z < c.maxZ + inflate
      && c.minY < 1.8 && c.maxY > 0.1
    ));
    const blockedRouteSamples = [];
    for (let i = 0; i < g.world.escortPath.length - 1; i++) {
      const a = g.world.escortPath[i], b = g.world.escortPath[i + 1];
      const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.15);
      for (let step = 0; step <= steps; step++) {
        const t = step / steps;
        if (pointBlocked(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) {
          blockedRouteSamples.push(i);
          break;
        }
      }
    }
    const weapon = g.player.weapon;
    const visibility = g._vmVisibility || {};
    const authoredEntry = g.vm.authored?.entry?.(weapon);
    return {
      map: g._mapId,
      mode: g.world.mode,
      ctf: g.ctf,
      state: g.state,
      objective: !!g.objective,
      checkpoints: g.world.escortPath?.length || 0,
      vip: vip ? { char: vip.def?.id, name: vip.name, weapon: vip.weapon, primary: vip.primary, secondary: vip.secondary, meshWeapon: vip._meshWeapon, team: vip.team } : null,
      plane: g.world.objectivePlane ? {
        clearance: g.world.objectivePlane.userData.groundClearance,
        groundY: g.world.objectivePlane.userData.groundY,
        height: g.world.objectivePlane.userData.placedHeight,
      } : null,
      signs: g.world.root.children.filter((object) => object.name.startsWith('placa-')).map((object) => object.name),
      mintProps: mintNames.filter((name) => g.world.root.getObjectByName(name)),
      mintPropInstances: g.world.root.children.filter((object) => mintNames.includes(object.name)).length,
      routeMeshCount: g.world.root.children.filter((object) => object.name === 'rota-operacao-flavio').length,
      vm: {
        mode: g.camView,
        root: Boolean(g.vm.root?.visible),
        authored: Boolean(visibility.authored),
        fallback: Boolean(visibility.fallback),
        legacyVisible: Boolean(g.vm.models?.[weapon]?.visible),
        authoredVisible: Boolean(authoredEntry?.mount?.visible),
      },
      nodes: g.world.waypoints.nodes.length,
      colliders: g.world.colliders.length,
      occluders: g.world.occluders.length,
      blockedCheckpoints: (g.world.escortPath || []).flatMap((point, index) => (
        pointBlocked(point.x, point.z) ? [index] : []
      )),
      blockedRouteSamples: [...new Set(blockedRouteSamples)],
      disconnectedRouteSegments: (g.world.escortPath || []).slice(1).flatMap((point, index) => {
        const from = g.world.nearestWaypoint(g.world.escortPath[index].x, g.world.escortPath[index].z);
        const to = g.world.nearestWaypoint(point.x, point.z);
        return from !== to && g.world.findPath(from, to).length <= 1 ? [index] : [];
      }),
      gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : g.renderer.__csWebgl,
      webgl2: g.renderer.capabilities.isWebGL2,
      modeLabel: document.getElementById('map-mode')?.textContent,
      objectiveLabel: document.getElementById('escort-objective')?.textContent,
    };
  });
  assert.equal(runtime.map, 'operacao_flavio');
  assert.equal(runtime.mode, 'escort');
  assert.equal(runtime.ctf, false);
  assert.equal(runtime.objective, true);
  assert.equal(runtime.checkpoints, 13);
  assert.deepEqual(runtime.vip && {
    char: runtime.vip.char,
    weapon: runtime.vip.weapon,
    primary: runtime.vip.primary,
    secondary: runtime.vip.secondary,
    meshWeapon: runtime.vip.meshWeapon,
    team: runtime.vip.team,
  }, { char: 'senador', weapon: 'knife', primary: 'knife', secondary: 'knife', meshWeapon: 'knife', team: 'B' });
  assert.ok(Math.abs(runtime.plane?.clearance || 0) <= 0.01, `avião fora do solo: ${runtime.plane?.clearance}`);
  assert.ok(runtime.plane?.groundY >= 0.07, `avião sem folga do pátio: ${runtime.plane?.groundY}`);
  assert.ok(runtime.plane?.height > 1, `altura inválida do avião: ${runtime.plane?.height}`);
  assert.deepEqual(runtime.signs.sort(), ['placa-embarque', 'placa-hangar', 'placa-rota-patio']);
  assert.equal(runtime.mintProps.length, 12);
  assert.ok(runtime.mintPropInstances >= 37, `poucos props detalhados no mapa: ${runtime.mintPropInstances}`);
  assert.equal(runtime.routeMeshCount, 0, 'a trilha amarela da escolta continua desenhada no chão');
  assert.equal(runtime.vm.mode, 'first');
  assert.ok(runtime.vm.root && (runtime.vm.legacyVisible || runtime.vm.authoredVisible),
    `arma de primeira pessoa invisível: ${JSON.stringify(runtime.vm)}`);
  assert.ok(runtime.nodes >= 500);
  assert.ok(runtime.colliders >= 50);
  assert.ok(runtime.occluders >= 50);
  assert.deepEqual(runtime.blockedCheckpoints, [], `checkpoints dentro de colisores: ${runtime.blockedCheckpoints.join(', ')}`);
  assert.deepEqual(runtime.blockedRouteSamples, [], `rota física atravessa colisores: ${runtime.blockedRouteSamples.join(', ')}`);
  assert.deepEqual(runtime.disconnectedRouteSegments, [], `trechos sem navegação: ${runtime.disconnectedRouteSegments.join(', ')}`);
  assert.equal(runtime.webgl2, true);
  assert.match(runtime.gpu || '', /Apple M4 Pro|Metal/i);
  assert.match(runtime.objectiveLabel || '', /OPERAÇÃO FLÁVIO/);
  for (const file of [
    'aviao_executivo.glb', 'trator_bagagem.glb', 'carrinho_ferramentas.glb', 'arco_seguranca.glb', 'escada_embarque.glb',
    'terminal_fachada.glb', 'terminal_portal.glb', 'balcao_recepcao.glb', 'assentos_aeroporto.glb',
    'scanner_bagagem.glb', 'carro_servico.glb', 'energia_solo.glb', 'torre_iluminacao.glb',
    'barreiras_aeroporto.glb', 'estacao_manutencao.glb', 'containers_carga.glb', 'jardineira.glb', 'senador.glb',
  ]) {
    assert.ok(glbs.some((url) => url.includes(file)), `${file} não carregou por HTTP 200`);
  }
  await page.evaluate(() => {
    const g = window.__game;
    g.player.pos.set(-40, g.world.groundHeightAt(-40, -55), -55);
    let side = -1;
    for (const bot of g.bots) {
      if (bot.team !== 'E') continue;
      bot.pos.set(40 * side, g.world.groundHeightAt(40 * side, 54), 54);
      bot.target = null;
      bot.path = null;
      side *= -1;
    }
  });
  const escortTrace = [];
  for (let second = 0; second < 8; second++) {
    await page.waitForTimeout(1000);
    escortTrace.push(await page.evaluate(() => {
      const g = window.__game;
      const vip = g.objective.vip;
      const guardDistances = g.bots
        .filter((bot) => bot !== vip && bot.team === 'B' && bot.alive)
        .map((bot) => Math.hypot(bot.pos.x - vip.pos.x, bot.pos.z - vip.pos.z))
        .sort((a, b) => a - b);
      const overlaps = g.world.colliders.filter((c) => (
        vip.pos.x > c.minX - 0.46 && vip.pos.x < c.maxX + 0.46
        && vip.pos.z > c.minZ - 0.46 && vip.pos.z < c.maxZ + 0.46
        && c.minY < 1.8 && c.maxY > 0.1
      )).length;
      return {
        x: vip.pos.x, z: vip.pos.z,
        checkpoint: g.objective.state.checkpoint,
        escortCount: g.objective.state.escortCount,
        guardDistances,
        overlaps,
        weapon: vip.weapon,
        meshWeapon: vip._meshWeapon,
      };
    }));
  }
  const firstEscort = escortTrace[0], lastEscort = escortTrace.at(-1);
  assert.ok(Math.hypot(lastEscort.x - firstEscort.x, lastEscort.z - firstEscort.z) > 7, 'Flávio não avançou com escolta autônoma');
  assert.ok(lastEscort.checkpoint > firstEscort.checkpoint, 'Flávio não alcançou o próximo checkpoint');
  assert.ok(escortTrace.every((sample) => sample.escortCount >= 2
    && sample.guardDistances.filter((distance) => distance <= 6.1).length >= 2),
  `bots abandonaram a formação protetora: ${JSON.stringify(escortTrace)}`);
  assert.ok(escortTrace.every((sample) => sample.overlaps === 0),
    `Flávio atravessou um colisor: ${JSON.stringify(escortTrace)}`);
  assert.ok(escortTrace.every((sample) => sample.weapon === 'knife' && sample.meshWeapon === 'knife'), 'Flávio trocou a faca durante a escolta');

  const threatBefore = await page.evaluate(() => {
    const g = window.__game;
    const vip = g.objective.vip;
    const checkpoint = g.objective.state.checkpoint;
    const cover = g.objective.state.caminho[checkpoint];
    const threat = g.bots.find((bot) => bot.team === 'E');
    threat.alive = true; threat.hp = 1000; threat.protUntil = Infinity;
    threat.pos.set(vip.pos.x, 0, vip.pos.z + 5);
    threat.target = null; threat.path = null;
    for (const bot of g.bots) if (bot.team === 'E' && bot !== threat) bot.pos.set(38, 0, 54);
    return {
      checkpoint,
      distanceToCover: Math.hypot(vip.pos.x - cover.x, vip.pos.z - cover.z),
    };
  });
  await page.waitForTimeout(1800);
  const threatAfter = await page.evaluate(() => {
    const g = window.__game;
    const vip = g.objective.vip;
    const cover = g.objective.state.caminho[g.objective.state.checkpoint];
    return {
      checkpoint: g.objective.state.checkpoint,
      threatened: g.objective.state.threatened,
      inCover: g.objective.state.inCover,
      crouched: Boolean(vip.mesh?.ctrl?.crouch),
      distanceToCover: Math.hypot(vip.pos.x - cover.x, vip.pos.z - cover.z),
      hud: document.getElementById('escort-objective')?.textContent || '',
      guardsInside: g.bots.filter((bot) => bot !== vip && bot.team === 'B' && bot.alive
        && Math.hypot(bot.pos.x - vip.pos.x, bot.pos.z - vip.pos.z) <= 6.1).length,
    };
  });
  assert.equal(threatAfter.checkpoint, threatBefore.checkpoint);
  assert.ok(threatAfter.threatened && threatAfter.inCover && threatAfter.crouched,
    `Flávio não buscou cobertura: ${JSON.stringify({ threatBefore, threatAfter })}`);
  assert.ok(threatAfter.distanceToCover <= threatBefore.distanceToCover + 0.05,
    `Flávio se afastou do abrigo: ${JSON.stringify({ threatBefore, threatAfter })}`);
  assert.match(threatAfter.hud, /COBERTURA/);
  assert.ok(threatAfter.guardsInside >= 2, `guardas não protegeram Flávio sob ameaça: ${JSON.stringify(threatAfter)}`);
  await page.evaluate(() => {
    const g = window.__game;
    for (const bot of g.bots) if (bot.team === 'E') {
      bot.protUntil = 0; bot.hp = 100; bot.pos.set(bot.pos.x < 0 ? -38 : 38, 0, 54);
      bot.target = null; bot.path = null;
    }
  });

  for (const view of views) {
    await page.evaluate(({ camera, target }) => {
      const g = window.__game;
      g.paused = true;
      g.camera.position.set(...camera);
      g.camera.lookAt(...target);
      g.renderer.render(g.scene, g.camera);
    }, view);
    await page.screenshot({ path: `${out}/${view.id}.png` });
  }

  await page.evaluate(() => {
    const g = window.__game;
    g.paused = false;
    g.state = 'live';
    g.objective.vip.hp = 0;
    g.objective.vip.alive = false;
  });
  await page.waitForTimeout(1000);
  const death = await page.evaluate(() => {
    const g = window.__game;
    return {
      state: g.state,
      winner: g.objective?.cinematic?.winner,
      announced: g.objective?.deathAnnounced,
      result: g._resultado,
      hud: document.getElementById('escort-objective')?.textContent || '',
    };
  });
  assert.equal(death.state, 'roundEnd');
  assert.equal(death.winner, 'E');
  assert.equal(death.announced, true);
  assert.equal(death.result?.titulo, 'FLÁVIO FOI MORTO');
  assert.match(death.result?.sub || '', /escolta fracassou/i);
  assert.match(death.hud, /FLÁVIO FOI MORTO · ESCOLTA FRACASSOU/);
  await page.screenshot({ path: `${out}/05-morte-flavio.png` });

  await page.evaluate(() => {
    const g = window.__game;
    g._startRound();
    g.state = 'live';
    g.paused = false;
    g._endRound('B');
  });
  await page.waitForTimeout(4000);
  const cinematic = await page.evaluate(() => {
    const g = window.__game;
    return {
      active: !!g.objective?.cinematic,
      winner: g.objective?.cinematic?.winner,
      duration: g.stateUntil - g.objective.cinematic.startedAt,
      planeZ: g.world.objectivePlane?.position.z,
      result: g._resultado,
    };
  });
  assert.equal(cinematic.active, true);
  assert.equal(cinematic.winner, 'B');
  assert.ok(cinematic.duration >= 8.9);
  assert.ok(cinematic.planeZ > 55);
  await page.screenshot({ path: `${out}/06-cinematica-vitoria.png` });

  assert.deepEqual(errors, [], `erros no browser: ${errors.join(' | ')}`);
  const featureFailed = failed.filter(([, url]) => /operacao_flavio|operacao_decola|senador\\.glb/.test(url));
  assert.deepEqual(featureFailed, [], `assets da operação falharam: ${JSON.stringify(featureFailed)}`);
  const receipt = {
    generatedAt: new Date().toISOString(), base, runtime, escortTrace,
    threatBefore, threatAfter, death, cinematic, views, errors, failed, glbs,
  };
  writeFileSync(`${out}/receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  await browser.close();
}
