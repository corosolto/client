/* Issue #1352: a morte não pode derrubar o loop quando o HUD de respawn não foi ligado no _dom.
   Usa o Game real e exige recuperação do contador quando o nó aparece, respawn e mutação do acesso direto. */
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SELF = fileURLToPath(import.meta.url);
const args = process.argv.slice(2);
const gameArg = args.find((arg) => arg.startsWith('--game-module='));
const mutant = args.includes('--mutante=acesso-direto');
if (args.some((arg) => arg !== gameArg && !(mutant && arg === '--mutante=acesso-direto'))) {
  console.error('uso: respawn-dom-check.mjs [--game-module=<caminho>] [--mutante=acesso-direto]');
  process.exit(2);
}
const gameFile = path.resolve(gameArg?.slice('--game-module='.length) || path.join(ROOT, 'public/js/game.js'));
if (!existsSync(gameFile)) {
  console.error(`INFRA RESPAWN-DOM módulo ausente: ${gameFile}`);
  process.exit(3);
}

if (mutant) {
  const nominal = spawnSync(process.execPath, [SELF], { encoding: 'utf8' });
  if (nominal.status !== 0) {
    console.error(`INFRA RESPAWN-DOM nominal reprovou antes do mutante\n${nominal.stdout}${nominal.stderr}`);
    process.exit(3);
  }
  const source = readFileSync(gameFile, 'utf8');
  const fixed = "const respawnCount = this.el.respawnCount || (this.el.respawnCount = document.getElementById('respawn-count'));\n      if (respawnCount) respawnCount.textContent = Number.isFinite(left) ? Math.max(0, left).toFixed(1) : '—';";
  const direct = "this.el.respawnCount.textContent = Number.isFinite(left) ? Math.max(0, left).toFixed(1) : '—';";
  if (source.split(fixed).length !== 2) {
    console.error('INFRA RESPAWN-DOM mutante não construído: guarda não encontrada');
    process.exit(3);
  }
  const tmp = path.join(path.dirname(gameFile), `.respawn-dom-mutante-${process.pid}.js`);
  let variant;
  try {
    writeFileSync(tmp, source.replace(fixed, direct));
    variant = spawnSync(process.execPath, [SELF, `--game-module=${tmp}`], { encoding: 'utf8' });
  } finally {
    rmSync(tmp, { force: true });
  }
  const failures = [...new Set([...String(variant.stdout).matchAll(/^FALHA RESPAWN-DOM (\S+)/gm)].map((match) => match[1]))];
  if (variant.status !== 1 || failures.length !== 1 || failures[0] !== 'AUSENTE-NAO-DERRUBA') {
    console.error(`MUTANTE acesso-direto SOBREVIVEU ou falhou fora do contrato: exit=${variant.status} falhas=${JSON.stringify(failures)}\n${variant.stdout}${variant.stderr}`);
    process.exit(1);
  }
  console.log('MUTANTE acesso-direto DETECTADO · FALHA RESPAWN-DOM AUSENTE-NAO-DERRUBA');
  process.exit(0);
}

const rows = [];
const check = (id, pass, evidence = {}) => rows.push({ id, pass: !!pass, evidence });
let game;
const H = await import('./harness.mjs');
const { Game } = await import(pathToFileURL(gameFile));
const originalGet = document.getElementById;
const originalCount = originalGet('respawn-count');
let countAvailable = false;
document.getElementById = (id) => {
  if (id === 'respawn-overlay') return null;
  if (id === 'respawn-count' && !countAvailable) return null;
  return originalGet(id);
};
try {
  const def = H.CHARACTERS.find((character) => character.id === H.PCHAR) || H.CHARACTERS[0];
  game = new Game({
    renderer: H.renderer, textures: H.initTextures(), sfx: H.sfx,
    settings: { bots: 4, quality: 'low', difficulty: 'normal', sens: 1 },
    playerCharId: def.id, playerTeam: 'E', playerFaction: def.team, enemyFaction: 'B',
    nickname: 'SIM', mapId: Object.keys(H.MAPS)[0], testMode: true, onQuit() {}, onMatchEnd() {},
  });
  game._ensureDolly = () => {};
  game.killsToWin = Infinity;
  game.start ? game.start() : game._startRound();

  let firstError = null;
  try { game._kill(game.player, null); } catch (error) { firstError = error; }
  check('OVERLAY-AUSENTE-NAO-DERRUBA-MORTE', !firstError && game.el.respawn === null && !game.player.alive, {
    overlayNulo: game.el.respawn === null,
    alive: game.player.alive,
    erro: String(firstError || ''),
  });

  let countError = null;
  try { game._updatePlayer(1 / 60); } catch (error) { countError = error; }
  check('AUSENTE-NAO-DERRUBA', !countError && game.el.respawnCount === null, {
    nuloNoDom: game.el.respawnCount === null,
    erro: String(countError || ''),
  });

  if (!game.player.respawnAt) game.player.respawnAt = game.time + 2;
  if (firstError) throw firstError;
  if (countError) throw countError;

  countAvailable = true;
  game.time += 0.5;
  const expectedCount = Math.max(0, game.player.respawnAt - game.time).toFixed(1);
  game._updatePlayer(1 / 60);
  check('REBIND-ATUALIZA', game.el.respawnCount === originalCount && originalCount.textContent === expectedCount, {
    ligado: game.el.respawnCount === originalCount,
    esperado: expectedCount,
    texto: originalCount.textContent,
  });

  game.time = game.player.respawnAt;
  game._updatePlayer(1 / 60);
  check('RESPAWN-CONTINUA', game.player.alive, { alive: game.player.alive });

  let disposeError = null;
  try { game.dispose(); } catch (error) { disposeError = error; }
  check('OVERLAY-AUSENTE-NAO-DERRUBA-DESCARTE', !disposeError, { erro: String(disposeError || '') });
  game = null;
} catch (error) {
  if (!rows.some((row) => !row.pass)) check('INFRA', false, { erro: String(error && error.stack || error) });
} finally {
  document.getElementById = originalGet;
  try { game?.dispose(); } catch { /* descarte best-effort */ }
}

for (const row of rows) console.log(`${row.pass ? 'PASSA' : 'FALHA'} RESPAWN-DOM ${row.id} · ${JSON.stringify(row.evidence)}`);
if (rows.some((row) => !row.pass)) process.exit(1);
