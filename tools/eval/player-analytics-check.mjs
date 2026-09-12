/* PA1–PA6 — o admin só consegue separar single-player/multiplayer e ligar picks
 * à duração se o cliente preservar o mesmo contexto nos três beacons. Fonte pura:
 * rápido o bastante para entrar no check:fast. */
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../../public/js/main.js', import.meta.url), 'utf8');
const falhas = [];
const cobra = (ok, msg) => { if (!ok) falhas.push(msg); };

cobra(main.includes("gameType: 'single_player'") && main.includes("gameType: 'multiplayer'"),
  'PA1 contexto não distingue single_player de multiplayer');
cobra(main.includes('matchEventId: telemetryGameContext.gameType ? _matchEventId : null'),
  'PA2 picks não ligam ao event_id da partida');
cobra(main.includes('picks: lote.map((pick) => ({ ...pick, eventId: clientUuid() }))'),
  'PA3 picks do lote não têm idempotência individual');
cobra((main.match(/\.\.\.telemetryGameContext/g) || []).length >= 4,
  'PA4 contexto não acompanha pick, perf e match');
cobra(main.indexOf('_matchEventId = clientUuid();') < main.indexOf('_picks(['),
  'PA5 event_id nasce depois dos picks');
cobra((main.match(/clearTelemetryGameContext\(\)/g) || []).length >= 4,
  'PA6 contexto da partida pode vazar para o menu/partida seguinte');

if (falhas.length) {
  console.error(`player analytics: ${falhas.length} FALHA(S)`);
  for (const f of falhas) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('player analytics: 6/6 verde');

