// Mutantes da régua da flash (flashbang-check.mjs). Muda a FONTE executada (cópias em
// artifacts/, imports relativos resolvidos para file://); nada do checkout é sobrescrito.
// Esperado: todo mutante KILLED com exatamente as falhas previstas.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const GAME = 'public/js/game.js', FLASH = 'public/js/flashbang.js';
const OUT = 'artifacts/flashbang';
mkdirSync(OUT, { recursive: true });
const game = readFileSync(GAME, 'utf8'), flash = readFileSync(FLASH, 'utf8');
const sub = (src, de, para) => { if (!src.includes(de)) throw new Error(`mutação não aplicou: ${de}`); return src.replace(de, para); };

const MATRIZ_PAREDE = ['parede zera tudo', 'fumaça opaca tapa a luz'];
const trials = [
  // o pedido explícito: ignorar a oclusão (parede/fumaça) tem de reprovar
  { name: 'ignora-oclusao', game: sub(game, 'const ocluido = !this._losClear(estouro, olho);', 'const ocluido = false;'),
    esperadas: MATRIZ_PAREDE },
  // ângulo some: de lado e de costas cegaria como de frente
  { name: 'ignora-angulo', flash: sub(flash, 'const forca = fatorAngulo(angulo) * fatorDistancia(dist);', 'const forca = fatorDistancia(dist);'),
    esperadas: ['lado perto livre: menos da metade da frente, mais que nada', 'lado longe livre < frente longe',
      'costas perto livre: quase nada (≤ 0,5 s)', 'costas longe livre: nada', 'jogador de costas a 2 m: ≤ 0,5 s'] },
  // distância some: longe cegaria como perto
  { name: 'ignora-distancia', flash: sub(flash, 'const forca = fatorAngulo(angulo) * fatorDistancia(dist);', 'const forca = fatorAngulo(angulo);'),
    esperadas: ['frente longe livre cega pouco (0,4-2,5 s)', 'costas longe livre: nada', 'perto > longe em toda direção'] },
  // bot não cega: nem perde a vista nem a mira
  { name: 'bot-enxerga-no-branco', game: sub(sub(game, 'const cegoTotal = this.time < (b.cegoTotalAte || 0);', 'const cegoTotal = false;'),
    'if (b.cegoTotalAte > this.time && b.target) {', 'if (false) {'),
    esperadas: ['bot no branco perde o jogador de vista'] },
  { name: 'bot-mira-certeira-cego', game: sub(game, 'if (cegoResta > 0) b.aimErr = Math.max(', 'if (false) b.aimErr = Math.max('),
    esperadas: ['bot cego que re-engata mira com erro ≥ 0,5 rad'] },
  // tela nunca fica branca; renascer mantém a cegueira
  { name: 'branco-nunca', flash: sub(flash, 'if (t <= hold) return pico;', 'if (t <= hold) return 0;'),
    esperadas: ['branco cheio no estouro e desbota até 0'] },
  { name: 'respawn-cego', game: sub(game, 'this._limparCegueira();   // renasce enxergando', ';'),
    esperadas: ['renascer tira a cegueira do jogador'] },
  { name: 'rodada-cega', game: sub(game, 'for (const c of this.combatants || []) { c.cegoAte = 0; c.cegoTotalAte = 0; }', ';'),
    esperadas: ['rodada nova tira a cegueira dos bots'] },
  // kill-switch morto
  { name: 'killswitch-morto', game: sub(game, "const FLASH_ON = QS.get('flash') !== '0';", 'const FLASH_ON = true;'),
    esperadas: ['?flash=0 remove a flash'] },
  // ?flashes sem ?debug=1 passaria a valer (loja de graça em produção)
  { name: 'flashes-sem-debug', game: sub(game, "const FLASH_DEBUG_N = FLASH_ON && QS.get('debug') === '1'", 'const FLASH_DEBUG_N = FLASH_ON'),
    esperadas: ['?flashes=2 sem debug não dá nada'] },
  // online sem servidor que conheça a flash: o estoque seria gasto num pedido descartado
  { name: 'flash-online-sem-servidor', game: sub(game, '_flashLiberada() { return FLASH_ON && (!this.online || Boolean(this._mp?.flashOn)); }',
    '_flashLiberada() { return FLASH_ON; }'),
    esperadas: ['online sem meta.flash recusa; com, libera'] },
];

const results = [];
for (const t of trials) {
  const flashFile = resolve(`${OUT}/${t.name}.flashbang.mjs`);
  writeFileSync(flashFile, t.flash || flash);
  const fixImports = (src) => src.replace(/from '(\.\/[^']+)'/g, (_, p) =>
    `from '${p === './flashbang.js' ? pathToFileURL(flashFile).href : pathToFileURL(resolve(dirname(GAME), p)).href}'`);
  const gameFile = resolve(`${OUT}/${t.name}.game.mjs`);
  writeFileSync(gameFile, fixImports(t.game || game));
  const run = spawnSync(process.execPath, ['tools/eval/flashbang-check.mjs', `--game-module=${gameFile}`, `--flash-module=${flashFile}`], { encoding: 'utf8' });
  writeFileSync(`${OUT}/${t.name}.log`, run.stdout + run.stderr);
  let failed = [];
  try { failed = JSON.parse(run.stdout.slice(run.stdout.indexOf('{'))).failed; } catch { failed = ['<sem json>']; }
  const ok = run.status === 1 && t.esperadas.every((e) => failed.includes(e)) && t.esperadas.length === failed.length;
  results.push({ name: t.name, status: run.status, failed, esperadas: t.esperadas, ok });
  console.log(t.name, ok ? 'KILLED' : 'SURVIVED', JSON.stringify(failed));
}
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
if (results.some((r) => !r.ok)) process.exitCode = 1;
