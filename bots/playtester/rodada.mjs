/* rodada.mjs — playtester: o que só uma partida de verdade pega.
   ─────────────────────────────────────────────────────────────────────────────
   O QUE É: por mapa ativo, roda UMA partida curta com bots no MESMO arnês da
   casa (eval:serve na 8123 + Chrome headless com WebGL por SwiftShader — o
   padrão do graffiti-census; nada de arnês paralelo) e mede as três classes
   que régua estática não pega:
     · PICKUP NO BURACO da partida: pickup que NENHUM combatente vivo chegou
       a `pickup_raio_m` em `duracao_s` de jogo (classe dos PRs #256/#257);
     · SPAWN EM GEOMETRIA: player.pos.y abaixo do groundHeightAt(x,z) além da
       tolerância no primeiro sample (eu sinto na espinha);
     · FPS: média e p95 de frame time medidos DENTRO da página (rAF), sempre
       contra BASELINE do mesmo ambiente — SwiftShader não tem GPU e o número
       absoluto não vale nada; o que vale é a regressão.
   Primeira rodada de cada mapa estabelece baseline e NÃO reporta. Regressão
   contra a baseline → issue com mapa, métrica e o log da rodada como
   evidência. Relatório de cada rodada em estado/relatorios/.

   Navegação: a mesma do smoke (`?map=<id>&debug=1&nav=1`, perfil com nick,
   btn-jogar → time → personagem → inimigo), partida com bots do jogo.

   COMANDOS:
     bun rodada.mjs rodada [mapa]   todos os mapas do config (ou um só)
     bun rodada.mjs selftest        métricas puras, offline
*/
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarCliente } from '../lib/gh.mjs';
import { carregarPersona, cabecalho, assinatura } from '../lib/persona.mjs';
import { tabela, alerta, detalhes } from '../lib/formatacao.mjs';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const CFG = JSON.parse(readFileSync(join(RAIZ, 'config.json'), 'utf8'));
const PERSONA = carregarPersona(RAIZ);
const ESTADO_DIR = join(RAIZ, 'estado');
if (!existsSync(ESTADO_DIR)) mkdirSync(ESTADO_DIR, { recursive: true });
const { gh } = criarCliente({ patEnv: CFG.pat_env, estadoDir: ESTADO_DIR, repo: CFG.repo });
const REPO_DIR = join(RAIZ, CFG.base_dir || '../..');
const log = (...a) => console.log(`[${new Date().toLocaleTimeString('pt-BR')}]`, ...a);

/* ── métricas puras (testáveis offline) ────────────────────────────────────── */
/* amostras: [{ t, combatants: [{x,y,z,vivo}], pickups: [{x,z,tomado}] }, …] */
export function resumoDaPartida(amostras, { pickupRaio = CFG.pickup_raio_m, spawnTol = CFG.spawn_tol_m } = {}) {
  const primeira = amostras[0];
  const player0 = primeira?.combatants?.find((c) => c.isPlayer);
  const ground0 = player0 ? player0.ground : null;
  const spawnSuspeito = !!(player0 && ground0 !== null && (ground0 - player0.y) > spawnTol);
  const minDist = new Map();
  const tomados = new Set();
  for (const a of amostras) {
    const vivos = (a.combatants || []).filter((c) => c.vivo);
    for (const [i, p] of (a.pickups || []).entries()) {
      if (p.tomado) { tomados.add(i); continue; }
      for (const c of vivos) {
        const d = Math.hypot(c.x - p.x, c.z - p.z);
        if (!minDist.has(i) || d < minDist.get(i)) minDist.set(i, d);
      }
    }
  }
  const naoAlcancados = [...minDist.entries()].filter(([i, d]) => d > pickupRaio && !tomados.has(i)).map(([i, d]) => ({ i, minDist: +d.toFixed(2) }));
  return {
    mapa: primeira?.mapa, duracaoS: primeira ? +(amostras[amostras.length - 1].t - primeira.t).toFixed(1) : 0,
    pickups: (amostras[0]?.pickups || []).length, tomados: tomados.size,
    naoAlcancados, spawnSuspeito,
  };
}

/* FPS medido na página: { frames, ms } → média e p95 */
export function fpsDe({ frames, ms, frameMs }) {
  const p95 = frameMs && frameMs.length ? frameMs.slice().sort((a, b) => a - b)[Math.floor(frameMs.length * 0.95)] : null;
  return { fpsMedio: +(frames / (ms / 1000)).toFixed(1), frameP95ms: p95 ? +p95.toFixed(1) : null };
}

/* compara contra baseline: regressão é piora, não diferença */
export function compararBaseline(base, atual, { fpsRegressaoPct = CFG.fps_regressao_pct } = {}) {
  const piores = [];
  if (atual.naoAlcancados.length > (base.naoAlcancados?.length || 0)) piores.push({ metrica: 'pickups não alcançados', base: base.naoAlcancados?.length || 0, atual: atual.naoAlcancados.length });
  if (atual.spawnSuspeito && !base.spawnSuspeito) piores.push({ metrica: 'spawn em geometria', base: 'não', atual: 'sim' });
  const fpsBase = base.fps?.fpsMedio, fpsAtual = atual.fps?.fpsMedio;
  if (fpsBase && fpsAtual && fpsAtual < fpsBase * (1 - fpsRegressaoPct / 100)) piores.push({ metrica: 'fps médio', base: fpsBase, atual: fpsAtual });
  return piores;
}

/* ── driver do navegador (padrão do census: chrome global + swiftshader) ───── */
async function abrirNavegador() {
  const gRoot = execSync('npm root -g', { cwd: REPO_DIR }).toString().trim();
  const _pw = await import((await import('node:url')).pathToFileURL(`${gRoot}/playwright/index.js`).href);
  const chromium = _pw.chromium || _pw.default?.chromium;
  return chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
}

async function jogar(page, mapa, duracaoS) {
  await page.goto(`http://localhost:8123/?map=${mapa}&debug=1&nav=1`, { waitUntil: 'domcontentloaded' });
  await page.locator('#splash-enter').waitFor({ timeout: 30_000 });
  await page.keyboard.press('Enter');
  await page.locator('#main-menu').waitFor({ timeout: 20_000 });
  await page.locator('.cs-item[data-act="sp"]').click();
  await page.locator('#btn-profile').click();
  await page.locator('#nick-input').fill(CFG.nick || 'MandrakeBot');
  await page.locator('#profile-ok').click();
  await page.locator('#btn-jogar').click();
  await page.locator('#team-select').waitFor();
  await page.locator('#btn-team-e').click();
  await page.locator('#char-select').waitFor();
  await page.locator('#char-confirm').click();
  await page.locator('#btn-team-b').click();
  await page.locator('#hud').waitFor({ timeout: 90_000 });
  await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 60_000 });

  /* amostragem e FPS dentro da página; resolve com tudo de uma vez */
  return page.evaluate(async ({ duracaoS, amostraMs }) => {
    const g = window.__game;
    const t0 = performance.now();
    let frames = 0; const frameMs = []; let ult = null;
    const tick = (ts) => { frames++; if (ult !== null) frameMs.push(ts - ult); ult = ts; if (performance.now() - t0 < duracaoS * 1000) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    const amostras = [];
    const pegar = () => {
      const combatants = (g.combatants || []).map((c) => ({
        isPlayer: !!c.isPlayer, vivo: !!c.alive,
        x: c.pos?.x ?? 0, y: c.pos?.y ?? 0, z: c.pos?.z ?? 0,
        ground: c.isPlayer && g.world?.groundHeightAt ? g.world.groundHeightAt(c.pos.x, c.pos.z) : null,
      }));
      const pickups = (g.world?.pickups || []).map((p) => ({ x: p.x, z: p.z, tomado: p.taken || p.inactive || false }));
      return { t: (performance.now() - t0) / 1000, mapa: g._mapId, combatants, pickups };
    };
    while (performance.now() - t0 < duracaoS * 1000) {
      amostras.push(pegar());
      await new Promise(r => setTimeout(r, amostraMs));
    }
    return { amostras, fpsBruto: { frames, ms: duracaoS * 1000, frameMs } };
  }, { duracaoS, amostraMs: CFG.amostra_ms || 500 });
}

/* ── relatório e issue ─────────────────────────────────────────────────────── */
export function corpoIssue(mapa, atual, piores, arqLog) {
  const miolo = `<!-- playtester: regressao ${mapa} -->

## Regressão na partida — \`${mapa}\`

${alerta('atencao', `**${atual.duracaoS}s de partida.** ${piores.length} métrica(s) pioraram contra a última rodada salva.`)}

O que piorou:

${tabela({ colunas: ['métrica', 'baseline', 'agora'], linhas: piores.map(p => [p.metrica, String(p.base), String(p.atual)]) })}

**Esta rodada:** ${atual.pickups} pickups (${atual.tomados} tomados,
${atual.naoAlcancados.length} sem ninguém chegando a ${CFG.pickup_raio_m} m) ·
FPS médio ${atual.fps?.fpsMedio ?? '—'} (p95 ${atual.fps?.frameP95ms ?? '—'} ms) ·
spawn ${atual.spawnSuspeito ? 'DENTRO da geometria' : 'limpo'}.

${detalhes('log completo da rodada (replay por amostra)', `\`${arqLog}\` — posição de cada combatente a cada \`${CFG.amostra_ms} ms\`, pickups e FPS por janela. Máquina do plantão.`)}

> FPS é medido no MESMO ambiente da baseline (Chrome headless, SwiftShader):
> número absoluto não vale nada aqui; a regressão percentual vale.`;
  return `${cabecalho(PERSONA)}\n\n${miolo}\n\n---\n${assinatura(PERSONA)}`;
}

/* ── rodada ────────────────────────────────────────────────────────────────── */
async function rodada({ umMapa = null } = {}) {
  const mapas = umMapa ? [umMapa] : (CFG.mapas || []);
  const arqBase = join(ESTADO_DIR, 'baseline.json');
  const baseline = existsSync(arqBase) ? JSON.parse(readFileSync(arqBase, 'utf8')) : {};

  const probe = spawnSync('curl', ['-fsS', 'http://localhost:8123/'], { encoding: 'utf8' });
  let pidServe = null;
  if (probe.status !== 0) {
    const p = spawnSync('sh', ['-c', 'node tools/eval/serve.mjs 8123 >/tmp/playtester-serve.log 2>&1 & echo $!'], { cwd: REPO_DIR, encoding: 'utf8' });
    pidServe = p.stdout.trim();
    for (let i = 0; i < 30; i++) {
      if (spawnSync('curl', ['-fsS', 'http://localhost:8123/'], { encoding: 'utf8' }).status === 0) break;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  const browser = await abrirNavegador();
  try {
    for (const mapa of mapas) {
      log(`jogando ${mapa} (${CFG.duracao_s}s)…`);
      const page = await browser.newPage();
      let dados;
      try { dados = await jogar(page, mapa, CFG.duracao_s); }
      catch (e) { log(`  ${mapa}: partida não subiu — ${String(e.message).split('\n')[0]}`); await page.close(); continue; }
      await page.close();
      const atual = { ...resumoDaPartida(dados.amostras), fps: fpsDe(dados.fpsBruto) };
      log(`  ${atual.mapa}: ${atual.pickups} pickups (${atual.naoAlcancados.length} não alcançados) · fps ${atual.fps.fpsMedio} · spawn ${atual.spawnSuspeito ? 'SUSPEITO' : 'ok'}`);

      const dirRel = join(ESTADO_DIR, 'relatorios');
      if (!existsSync(dirRel)) mkdirSync(dirRel, { recursive: true });
      const arqLog = join(dirRel, `${mapa}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`);
      writeFileSync(arqLog, JSON.stringify(atual, null, 1));

      const base = baseline[mapa];
      if (!base) {
        baseline[mapa] = atual;
        writeFileSync(arqBase, JSON.stringify(baseline, null, 2));
        log('  primeira rodada — baseline anotada, zero reclamação');
        continue;
      }
      const piores = compararBaseline(base, atual);
      if (piores.length) {
        gh(['issue', 'create', '-R', CFG.repo, '--title', `[playtest] regressão em ${mapa}: ${piores.map(p => p.metrica).join(', ')}`,
          '--body', corpoIssue(mapa, atual, piores, arqLog)]);
        log(`  ${piores.length} regressão(ões) → issue aberta`);
      }
      baseline[mapa] = atual;
      writeFileSync(arqBase, JSON.stringify(baseline, null, 2));
    }
  } finally {
    await browser.close();
    if (pidServe) spawnSync('sh', ['-c', `kill ${pidServe} 2>/dev/null`]);
  }
}

async function selftest() {
  const amostras = [
    { t: 0, mapa: 'quebrada', combatants: [{ isPlayer: true, vivo: true, x: 0, y: 1.6, z: 0, ground: 1.6 }], pickups: [{ x: 5, z: 5, tomado: false }, { x: 90, z: 90, tomado: false }] },
    { t: 5, mapa: 'quebrada', combatants: [{ isPlayer: true, vivo: true, x: 5, y: 1.6, z: 5, ground: 1.6 }, { vivo: true, x: 6, y: 1.6, z: 6 }], pickups: [{ x: 5, z: 5, tomado: true }, { x: 90, z: 90, tomado: false }] },
    { t: 10, mapa: 'quebrada', combatants: [{ isPlayer: true, vivo: true, x: 5, y: 1.6, z: 5, ground: 1.6 }], pickups: [{ x: 5, z: 5, tomado: true }, { x: 90, z: 90, tomado: false }] },
  ];
  const r = resumoDaPartida(amostras);
  const okPick = r.naoAlcancados.length === 1 && r.naoAlcancados[0].minDist > 80;
  const okSpawn = r.spawnSuspeito === false;
  const spawnRuim = resumoDaPartida([{ t: 0, mapa: 'x', combatants: [{ isPlayer: true, vivo: true, x: 0, y: -2, z: 0, ground: 1.6 }], pickups: [] }]);
  const okSpawnRuim = spawnRuim.spawnSuspeito === true;
  const base = { naoAlcancados: [], spawnSuspeito: false, fps: { fpsMedio: 6.0 } };
  const pior1 = { naoAlcancados: [{ i: 1 }], spawnSuspeito: false, fps: { fpsMedio: 5.9 } };
  const okComp = compararBaseline(base, pior1).length === 1;
  const okFps = compararBaseline(base, { ...pior1, fps: { fpsMedio: 4.0 } }).length === 2;
  const okMelhora = compararBaseline({ naoAlcancados: [{ i: 0 }], spawnSuspeito: true, fps: { fpsMedio: 4 } }, pior1).length === 0;
  const f = fpsDe({ frames: 600, ms: 100000, frameMs: [10, 20, 30, 40, 100] });
  const okF = f.fpsMedio === 6 && f.frameP95ms === 100;
  const issue = corpoIssue('quebrada', { duracaoS: 90, pickups: 22, tomados: 3, naoAlcancados: [{ i: 4, minDist: 88 }], spawnSuspeito: false, fps: { fpsMedio: 4.2, frameP95ms: 600 } }, [{ metrica: 'fps médio', base: 6, atual: 4.2 }], '/tmp/log.json');
  const okIssue = issue.includes('**Mandrake**') && issue.includes('| fps médio') && /— \*.*\* 🎮/.test(issue);
  console.log(`  pickup não alcançado detectado: ${okPick ? '✓' : '✗'}`);
  console.log(`  spawn limpo vs DENTRO da geometria: ${okSpawn && okSpawnRuim ? '✓' : '✗'}`);
  console.log(`  regressão (não diferença): ${okComp && okFps && okMelhora ? '✓' : '✗'}`);
  console.log(`  fps média e p95: ${okF ? '✓' : '✗'}`);
  console.log(`  issue com persona e tabela: ${okIssue ? '✓' : '✗'}`);
  const tudo = okPick && okSpawn && okSpawnRuim && okComp && okFps && okMelhora && okF && okIssue;
  console.log(tudo ? '✓ SELFTEST verde' : '✗ SELFTEST vermelho');
  process.exit(tudo ? 0 : 1);
}

const [cmd, mapa] = process.argv.slice(2);
const chamadoDireto = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (chamadoDireto) {
  if (cmd === 'rodada') await rodada({ umMapa: mapa || null });
  else if (cmd === 'selftest') await selftest();
  else { console.log('uso: rodada.mjs rodada [mapa]|selftest'); process.exit(2); }
}
