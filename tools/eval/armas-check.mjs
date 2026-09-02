#!/usr/bin/env node
/* ============================================================================
   armas-check.mjs — A PARTIDA CARREGA AS ARMAS DELA, E NENHUM BOT SEGURA CAIXA
   ----------------------------------------------------------------------------
   POR QUE EXISTE (medido em 21/08/2026)
   `preloadWeapons()` baixava as 26 armas, BLOQUEANDO, antes de construir o Game — 7,5 MB de
   download e ~164 MB de VRAM para uma partida que usa ~9. Era a mesma doença do elenco, que o
   #368 já tinha curado nos personagens e ninguém tinha olhado nas armas.

   O QUE ELA NÃO PODE DEIXAR PASSAR
   Cortar o preload é fácil; cortar E deixar bot empunhando CAIXA procedural é trocar espera por
   feiura. `weaponModel()` cai em `buildRifle()` quando o GLB não está em memória, e isso não
   aparece em erro nenhum — some calado dentro da cena. Por isso ARM2 cobra a cena, não o código.

   O QUE MEDE (jogo real, ?auto=, rede de verdade)
   ARM1 GLBs de arma no preload BLOQUEANTE <= TETO (12). Janela: do goto até `window.__game`
        existir — o Game só nasce depois do `await` do preload. Antes do conserto: 26.
   ARM2 todo bot em campo tem arma com malha GLB (zero caixa procedural).
   ARM3 o resto das armas CHEGA em ocioso — sem isso, o drop do chão no meio da partida vira
        caixa. Sonda até 60 s; o contrato é existência, não velocidade.
   ARM4 nenhuma arma do chão ou armário nasce com GLB de outra arma; AWP não pode ser fallback.
   ARM5 depois da carga ociosa, chão e armários procedurais são trocados pelo GLB certo.
   ARM6 fallbacks do armário compartilham as 6 geometrias que `characters.js:buildRifle`
        cria; este script conta UUIDs e o mutante prova a alocação por instância.

   Mutantes: sem-lazy acende ARM3; awp-fallback acende ARM4; fallback-unshared acende ARM6.
   Uso: node tools/eval/armas-check.mjs [--mutante=sem-lazy|awp-fallback|fallback-unshared] [--porta=8137] [--foto=/tmp/armas.png]
   ============================================================================ */
import { execSync, spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const MUT = arg('mutante');
if (MUT && !['sem-lazy', 'awp-fallback', 'fallback-unshared'].includes(MUT)) throw new Error(`mutante desconhecido: ${MUT}`);
const PORTA = arg('porta') || '8137';
const FOTO = arg('foto');
const BASE = `http://127.0.0.1:${PORTA}`;
const TETO = 12;

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const srv = spawn('node', ['tools/eval/serve.mjs', PORTA], { stdio: 'ignore' });
process.on('exit', () => srv.kill());
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(BASE)).ok) break; } catch { /* subindo */ }
  await new Promise((r) => setTimeout(r, 500));
}
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const ARMA_GLB = /\/models\/weapons\/([a-z0-9-]+)\.glb/;
const pedidas = [];
page.on('request', (r) => { const m = ARMA_GLB.exec(r.url()); if (m) pedidas.push({ id: m[1], t: Date.now() }); });
let mutouFonte = false;
if (MUT === 'fallback-unshared') {
  await page.route(/\/js\/game\.js(?:\?|$)/, async (route) => {
    const response = await route.fetch();
    const original = await response.text();
    const body = original.replace(
      '(this._pickupFallbackTpl ||= buildRifle()).clone(true)',
      'buildRifle()',
    );
    mutouFonte = body !== original;
    await route.fulfill({ response, body });
  });
}
if (MUT === 'awp-fallback') {
  await page.route(/\/js\/weapons\.js(?:\?|$)/, async (route) => {
    const response = await route.fetch();
    const original = await response.text();
    const body = original.replace(
      'const source = _cache.has(requested) ? requested : null;',
      "const source = _cache.has(requested) ? requested : (_cache.has('awp') ? 'awp' : null);",
    );
    mutouFonte = body !== original;
    await route.fulfill({ response, body });
  });
}

const falhas = [];
try {
  await page.goto(`${BASE}/?debug=1&auto=B,et&map=piscina_treta${MUT === 'sem-lazy' ? '&armaslazy=0' : ''}`,
    { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.__game, null, { timeout: 180000 });
  const bloqueante = new Set(pedidas.map((p) => p.id)).size;

  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
  /* glbchars nomeia a peça: 'arma-glb' quando o GLB entrou, 'arma-caixa' no fallback. */
  const cena = await page.evaluate(() => {
    const g = window.__game;
    const semGlb = g.bots.filter((b) => b.mesh?.group?.getObjectByName('arma-caixa')).map((b) => b.weapon);
    const armas = [...g.world.pickups, ...g.drops];
    const fallbacks = armas.filter((p) => p.mesh?.userData.weaponProceduralFallback);
    const fallbackGeometries = new Set();
    for (const p of fallbacks) p.mesh.traverse((o) => { if (o.geometry) fallbackGeometries.add(o.geometry.uuid); });
    const pickupsErrados = armas.filter((p) => {
      const d = p.mesh?.userData;
      return d?.weaponSource && d.weaponSource !== d.weaponRequested;
    }).map((p) => `${p.weapon}→${p.mesh.userData.weaponSource}`);
    return { bots: g.bots.length, semGlb: [...new Set(semGlb)], pickupsErrados, armas: armas.length,
      fallbacks: fallbacks.length, fallbackGeometries: fallbackGeometries.size };
  });

  let esperou = 0, total = new Set(pedidas.map((p) => p.id)).size;
  let pickupsProntos = false;
  while (((MUT !== 'awp-fallback' && !pickupsProntos) || total < 20) && esperou < 60000) {
    await page.waitForTimeout(2000); esperou += 2000;
    total = new Set(pedidas.map((p) => p.id)).size;
    pickupsProntos = await page.evaluate(() => [...window.__game.world.pickups, ...window.__game.drops].every((p) => {
      const d = p.mesh?.userData;
      return d?.weaponSource && d.weaponSource === d.weaponRequested;
    }));
  }
  const pickups = await page.evaluate(() => [...window.__game.world.pickups, ...window.__game.drops].map((p) => ({
    weapon: p.weapon,
    requested: p.mesh?.userData?.weaponRequested || null,
    source: p.mesh?.userData?.weaponSource || null,
  })));
  const errados = pickups.filter((p) => p.source && p.source !== p.requested);
  const semGlb = pickups.filter((p) => !p.source);

  console.log(`  ARM1 armas no bloqueante (<= ${TETO}): ${bloqueante}  ${bloqueante <= TETO ? 'OK' : 'FALHOU'}`);
  console.log(`  ARM2 bots com arma de caixa (== 0):  ${cena.semGlb.length} de ${cena.bots} bots${cena.semGlb.length ? ` — ${cena.semGlb.join(', ')}` : ''}`);
  console.log(`  ARM3 armas carregadas ao todo:       ${total} em ${(esperou / 1000).toFixed(0)}s`);
  console.log(`  ARM4 armas de chão/rack erradas no nascimento: ${cena.pickupsErrados.length} de ${cena.armas}${cena.pickupsErrados.length ? ` — ${[...new Set(cena.pickupsErrados)].join(', ')}` : ''}`);
  console.log(`  ARM5 chão/rack após carga ociosa:              ${semGlb.length} sem GLB, ${errados.length} com GLB errado`);
  console.log(`  ARM6 geometria dos fallbacks compartilhada:    ${cena.fallbackGeometries} geometrias em ${cena.fallbacks} armas`);
  if (bloqueante > TETO) falhas.push(`ARM1 preload bloqueante com ${bloqueante} armas (teto ${TETO})`);
  if (cena.semGlb.length) falhas.push(`ARM2 ${cena.semGlb.length} bot(s) empunhando caixa: ${cena.semGlb.join(', ')}`);
  if (total <= bloqueante) falhas.push(`ARM3 carga tardia não chegou: parou em ${total} armas`);
  if (cena.pickupsErrados.length) falhas.push(`ARM4 ${cena.pickupsErrados.length} pickup(s) nasceram com GLB errado: ${cena.pickupsErrados.join(', ')}`);
  if (semGlb.length || errados.length) falhas.push(`ARM5 carga ociosa terminou com ${semGlb.length} pickup(s) sem GLB e ${errados.length} com GLB errado`);
  if (cena.fallbackGeometries > 6) falhas.push(`ARM6 fallbacks alocaram ${cena.fallbackGeometries} geometrias únicas para ${cena.fallbacks} armas (teto 6 do buildRifle)`);
  if (['awp-fallback', 'fallback-unshared'].includes(MUT) && !mutouFonte) falhas.push(`mutante ${MUT} não encontrou a linha de produção para alterar`);
  if (FOTO) {
    await page.addStyleTag({ content: '#hud,.screen{display:none!important}' });
    const png = await page.evaluate(() => {
      const g = window.__game;
      const pk = g.world.pickups.find((p) => p.weapon === 'm4' && p.x > 0) || g.world.pickups[0];
      const alvo = pk.mesh.position;
      g._updatePlayer = () => {};
      g._updateBot = () => {};
      if (g.vm?.root) g.vm.root.visible = false;
      for (const b of g.bots) if (b.mesh?.group) b.mesh.group.visible = false;
      g.camera.position.set(alvo.x - 3, alvo.y + 2.2, alvo.z + 2.4);
      g.camera.up.set(0, 1, 0);
      g.camera.fov = 55;
      g.camera.updateProjectionMatrix();
      g.camera.lookAt(alvo);
      g.renderer.autoClear = true;
      g.renderer.render(g.scene, g.camera);
      return g.renderer.domElement.toDataURL('image/png').split(',')[1];
    });
    writeFileSync(FOTO, Buffer.from(png, 'base64'));
    console.log(`  figura: ${FOTO}`);
  }
} catch (e) {
  falhas.push(`ARM não deu para medir: ${String(e).split('\n')[0]}`);
}

await browser.close();
srv.kill();
for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) console.log('  \x1b[32m✓\x1b[0m ARM partida carrega as armas dela, nenhum bot com caixa e o resto chega em ocioso');
if (MUT && !falhas.length) {
  console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego (lei 3)`);
  falhas.push('mutacao-cega');   // prova que não morde é vermelho, não aviso
}
process.exit(falhas.length ? 1 : 0);
