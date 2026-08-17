#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const file = join(ROOT, 'public/js/screenquery.js');
const mutant = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || '';
if (mutant && !['sem-mapas', 'oito-volta-vitoria', 'sem-integracao', 'sem-resultados', 'resultado-time-b', 'mapa-sem-consumo', 'sem-placar', 'sem-placar-integracao', 'sem-vida', 'placar-abre-pausa', 'placar-volta-ctf'].includes(mutant)) throw new Error(`mutante desconhecido: ${mutant}`);

let source;
try { source = readFileSync(file, 'utf8'); }
catch {
  console.error('✗ SQ1 · public/js/screenquery.js ainda não existe');
  process.exit(1);
}
let main = readFileSync(join(ROOT, 'public/js/main.js'), 'utf8');
if (mutant === 'sem-mapas') {
  const changed = source.replace("mapas: 'maps'", "mapas: 'maps-mutado'");
  if (changed === source) throw new Error('MUTAÇÃO IMPOSSÍVEL: alias mapas não encontrado');
  source = changed;
}
if (mutant === 'oito-volta-vitoria') {
  const changed = source.replace("'08': 'scoreboard'", "'08': 'victory'");
  if (changed === source) throw new Error('MUTAÇÃO IMPOSSÍVEL: alias numérico 08 não encontrado');
  source = changed;
}
if (mutant === 'sem-integracao') {
  const changed = main.replace(
    'openInspectionScreen(inspectionScreen).catch((error) => window.__gameLaunch?.fail(error, \'screen-query\'));',
    'Promise.resolve().catch((error) => window.__gameLaunch?.fail(error, \'screen-query\'));',
  );
  if (changed === main) throw new Error('MUTAÇÃO IMPOSSÍVEL: chamada do modo direto não encontrada');
  main = changed;
}
if (mutant === 'sem-resultados') {
  const changed = main.replace(
    "showInspectionResult(target.screen === 'victory', character);",
    "void (target.screen === 'victory' && character);",
  );
  if (changed === main) throw new Error('MUTAÇÃO IMPOSSÍVEL: montagem de resultado não encontrada');
  main = changed;
}
if (mutant === 'resultado-time-b') {
  const changed = main.replace("const playerOnE = currentTeam === 'E';", 'const playerOnE = true;');
  if (changed === main) throw new Error('MUTAÇÃO IMPOSSÍVEL: orientação do placar não encontrada');
  main = changed;
}
if (mutant === 'mapa-sem-consumo') {
  const changed = main.replace('if (target.map) currentMap = resolveMapId(target.map);', 'void target.map;');
  if (changed === main) throw new Error('MUTAÇÃO IMPOSSÍVEL: consumo do mapa não encontrado');
  main = changed;
}
if (mutant === 'sem-placar') {
  const changed = source.replace("placar: 'scoreboard'", "placar: 'scoreboard-mutado'");
  if (changed === source) throw new Error('MUTAÇÃO IMPOSSÍVEL: alias placar não encontrado');
  source = changed;
}
if (mutant === 'sem-placar-integracao') {
  const changed = main.replace("if (target.screen === 'scoreboard') {", "if (target.screen === 'scoreboard-mutado') {");
  if (changed === main) throw new Error('MUTAÇÃO IMPOSSÍVEL: integração do placar não encontrada');
  main = changed;
}
if (mutant === 'sem-vida') {
  const changed = source.replace("hp: Number.isFinite(hpParsed)", "hp: false && Number.isFinite(hpParsed)");
  if (changed === source) throw new Error('MUTAÇÃO IMPOSSÍVEL: consumo de vida não encontrado');
  source = changed;
}
if (mutant === 'placar-abre-pausa') {
  const changed = main.replace(
    "game.paused = true; game.keys = {}; game.el.pause.classList.add('hidden'); game._showScoreboard(true); return;",
    "game.setPaused(true); game._showScoreboard(true); return;",
  );
  if (changed === main) throw new Error('MUTAÇÃO IMPOSSÍVEL: isolamento do placar não encontrado');
  main = changed;
}
if (mutant === 'placar-volta-ctf') {
  const changed = main.replace('game.ctf = false; game._inspectionTotalRounds = 5;', 'game.ctf = true; game._inspectionTotalRounds = 5;');
  if (changed === main) throw new Error('MUTAÇÃO IMPOSSÍVEL: modo de inspeção do placar não encontrado');
  main = changed;
}
const moduleUrl = mutant
  ? `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  : pathToFileURL(file).href;
const { resolveInspectionScreen } = await import(moduleUrl);

const aliases = {
  '00': 'splash', '00b': 'loading', '01': 'menu', '02': 'faction',
  '03': 'character', '04': 'maps', '05': 'hud', '06': 'pause', '07': 'settings',
  '08': 'scoreboard', '09': 'defeat',
  menu: 'menu', faccao: 'faction', personagem: 'character', mapas: 'maps',
  loading: 'loading', hud: 'hud', pausa: 'pause', config: 'settings',
  placar: 'scoreboard', scoreboard: 'scoreboard',
  vitoria: 'victory', victory: 'victory', derrota: 'defeat', defeat: 'defeat',
};
const aliasErrors = Object.entries(aliases).filter(([query, expected]) =>
  resolveInspectionScreen(new URLSearchParams({ tela: query }))?.screen !== expected);
const sq1 = aliasErrors.length === 0;

const explicit = resolveInspectionScreen(new URLSearchParams({
  tela: 'personagem', time: 'b', char: 'influencer', map: 'quebrada',
}));
const sq2 = explicit?.faction === 'B' && explicit.character === 'influencer'
  && explicit.map === 'quebrada'
  && resolveInspectionScreen(new URLSearchParams({ tela: 'hud', time: 'x' }))?.faction === 'E';
const sq3 = resolveInspectionScreen(new URLSearchParams()) === null
  && resolveInspectionScreen(new URLSearchParams({ tela: 'nao-existe' })) === null;
const sq4 = /import \{ resolveInspectionScreen \} from '\.\/screenquery\.js';/.test(main)
  && /const inspectionScreen = resolveInspectionScreen\(params\);/.test(main)
  && /const testMode = params\.get\('debug'\) === '1' \|\| !!inspectionScreen;/.test(main)
  && /if \(inspectionScreen\) \{[\s\S]{0,120}openInspectionScreen\(inspectionScreen\)\.catch/.test(main)
  && /async function openInspectionScreen\(target\)/.test(main);
const sq5 = /function showInspectionResult\(won, character\)/.test(main)
  && /target\.screen === 'victory' \|\| target\.screen === 'defeat'/.test(main)
  && /showInspectionResult\(target\.screen === 'victory', character\)/.test(main);
const sq6 = /const playerOnE = currentTeam === 'E';/.test(main)
  && /const roundsE = playerOnE \? playerRounds : enemyRounds;/.test(main)
  && /const roundsB = playerOnE \? enemyRounds : playerRounds;/.test(main)
  && /frase\('statsFim', roundsE, roundsB,/.test(main);
const sq7 = /if \(target\.map\) currentMap = resolveMapId\(target\.map\);/.test(main)
  && /if \(target\.screen === 'maps'\) \{ renderMapScreen\(\); show\('map-screen'\); return; \}/.test(main);
const lowHud = resolveInspectionScreen(new URLSearchParams({ tela: 'hud', vida: '23' }));
const sq8 = lowHud?.hp === 23
  && resolveInspectionScreen(new URLSearchParams({ tela: 'hud', vida: '999' }))?.hp === 100
  && resolveInspectionScreen(new URLSearchParams({ tela: 'hud', vidabaixa: '1' }))?.hp === 23
  && /if \(target\.hp != null && game\?\.player\)/.test(main)
  && /if \(target\.screen === 'scoreboard'\) \{[\s\S]{0,260}game\.ctf = false; game\._inspectionTotalRounds = 5;[\s\S]{0,180}game\.paused = true;[\s\S]{0,120}game\.el\.pause\.classList\.add\('hidden'\); game\._showScoreboard\(true\)/.test(main);

console.log(`${sq1 ? '✓' : '✗'} SQ1 · aliases numéricos e nomes abrem todas as telas diretamente`);
if (!sq1) console.log(`  divergiram: ${aliasErrors.map(([q, expected]) => `${q}→${expected}`).join(', ')}`);
console.log(`${sq2 ? '✓' : '✗'} SQ2 · time, personagem e mapa são preservados com fallback seguro`);
console.log(`${sq3 ? '✓' : '✗'} SQ3 · ausência ou tela desconhecida não altera o fluxo normal`);
console.log(`${sq4 ? '✓' : '✗'} SQ4 · main.js importa, resolve e abre a tela pedida no boot`);
console.log(`${sq5 ? '✓' : '✗'} SQ5 · vitória e derrota montam o resultado sem iniciar uma partida`);
console.log(`${sq6 ? '✓' : '✗'} SQ6 · placar direto preserva a ordem E × B para qualquer lado do jogador`);
console.log(`${sq7 ? '✓' : '✗'} SQ7 · openInspectionScreen consome o mapa resolvido pela query`);
console.log(`${sq8 ? '✓' : '✗'} SQ8 · placar e vida baixa podem ser inspecionados diretamente`);

const ok = sq1 && sq2 && sq3 && sq4 && sq5 && sq6 && sq7 && sq8;
if (mutant) {
  const target = mutant === 'sem-integracao' ? 'SQ4'
    : mutant === 'sem-resultados' ? 'SQ5'
      : mutant === 'resultado-time-b' ? 'SQ6'
      : mutant === 'mapa-sem-consumo' ? 'SQ7'
        : ['sem-placar-integracao', 'sem-vida', 'placar-abre-pausa', 'placar-volta-ctf'].includes(mutant) ? 'SQ8' : 'SQ1';
  const targetFailed = target === 'SQ4' ? !sq4 : target === 'SQ5' ? !sq5
    : target === 'SQ6' ? !sq6 : target === 'SQ7' ? !sq7 : target === 'SQ8' ? !sq8 : !sq1;
  console.log(targetFailed ? `\n✓ mutante ${mutant}: ${target} ficou VERMELHA; a régua morde`
    : `\n✗ mutante ${mutant} sobreviveu`);
  process.exit(targetFailed ? 0 : 1);
}
process.exit(ok ? 0 : 1);
