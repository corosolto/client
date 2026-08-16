/* CTF-WIN-CHECK — no CAPTURA o alvo da rodada é TODAS as bandeiras que o mapa tem.
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE ESTA RÉGUA EXISTE

   Defeito do dono, jogando: *"no capture the flag na loja H está com 3 capturas quando a
   vitória tem que ser as 4. tem que ser todas sempre."*

   MEDIDO antes do conserto (este mesmo script, cláusula CTF-W1):
     praca_poderes        bandeiras 3 (layout padrão)   alvo 3   ok
     piscina_treta    bandeiras 3 (layout padrão)   alvo 3   ok
     loja_h       bandeiras 4 (world.ctfPoints) alvo 3   FALTAM 1
     ferro_velho  bandeiras 4 (world.ctfPoints) alvo 3   FALTAM 1
     quebrada    bandeiras 4 (world.ctfPoints) alvo 3   FALTAM 1

   A causa era uma CONSTANTE: `this.capsToWin = this.ctf ? CTF_CAPS_TO_WIN : Infinity`
   (CTF_CAPS_TO_WIN = 3), escrita quando TODO mapa tinha 3 bandeiras. Quando a Havan, o
   ferro velho e a quebrada ganharam a quarta, o alvo não acompanhou — a rodada fechava
   com 3 de 4, e o modo passou a ter uma condição de vitória que o mapa não declara.

   ATENÇÃO AO HISTÓRICO (é o segundo defeito deste mesmo alvo): a condição de vitória do
   CAPTURA já morou dentro do `_checkPace()`, atrás do gate `?pace=1`, e com PACE
   desligado a rodada NUNCA fechava. Quem cobra isso é `tools/eval/ctf-round-check.mjs`
   (CTF-R1). Esta régua mede o caminho VIVO: ela injeta captura por captura no motor de
   verdade e cobra em QUAL delas a rodada fecha.

   CLÁUSULAS
     CTF-W1  alvo da rodada == nº de bandeiras que o mapa realmente tem (todos os mapas)
     CTF-W2  simulando: com (N−1) capturas a rodada NÃO fecha; na N-ésima ela fecha
     CTF-W3  o alvo é DERIVADO da contagem de bandeiras, não de constante (leitura do fonte)

   uso: node tools/eval/ctf-win-check.mjs [--mutante=constante|menos1]
     constante  devolve o defeito (alvo fixo em 3) -> CTF-W1/W2 vermelhas nos 4-bandeiras
     menos1     alvo = bandeiras − 1 -> prova que a CTF-W2 mede o FECHO, não a declaração
   ═══════════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import { bootGame, MAPS, initTextures } from './harness.mjs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const falhas = [];
const linhas = [];

const textures = initTextures();
const IDS = Object.keys(MAPS);

for (const id of IDS) {
  const g = bootGame(id, { textures, ctf: true, seed: 4242 });
  if (MUT === 'constante') g.capsToWin = 3;
  if (MUT === 'menos1') g.capsToWin = g.ctfPts.length - 1;

  const declaradas = (g.world.ctfPoints || []).length;
  const bandeiras = g.ctfPts.length;                    // o que o jogo REALMENTE instanciou
  const alvo = g.capsToWin;

  /* ── CTF-W1: o alvo é o número de bandeiras ────────────────────────────────────── */
  if (declaradas && declaradas !== bandeiras)
    falhas.push(`CTF-W1 ${id}: o mapa declara ${declaradas} bandeiras e o jogo instanciou ${bandeiras}`);
  if (alvo !== bandeiras)
    falhas.push(`CTF-W1 ${id}: alvo da rodada = ${alvo}, mas o mapa tem ${bandeiras} bandeiras — a vitória tem que ser TODAS`);

  /* ── CTF-W2: o motor de verdade fecha na N-ésima, não antes ─────────────────────
     Injeta o contador que o modo lê (roundCaps) uma captura por vez e roda o update
     REAL entre elas. Nada de ler declaração: o que vale é em qual captura o estado
     sai de 'live'. Sem tocar em `_ctfWin` (dominação), que é o outro caminho. */
  const DT = 1 / 30;
  const passos = [];
  let fechouEm = null;
  g.state = 'live';
  for (let n = 1; n <= bandeiras + 1 && fechouEm === null; n++) {
    g.roundCaps.B = n;
    for (let k = 0; k < 6 && fechouEm === null; k++) {
      g.update(DT);
      if (g.state !== 'live') fechouEm = n;
    }
    passos.push(`${n}:${fechouEm === n ? 'FECHOU' : 'segue'}`);
  }
  if (fechouEm !== bandeiras)
    falhas.push(`CTF-W2 ${id}: a rodada fechou na captura ${fechouEm === null ? '(nunca)' : fechouEm} — tinha que fechar na ${bandeiras}ª (${passos.join(' ')})`);

  linhas.push(`${id.padEnd(15)} bandeiras=${String(bandeiras).padEnd(2)} (declaradas ${declaradas || '—'})  alvo=${String(alvo).padEnd(4)} fechou_na=${fechouEm ?? 'nunca'}`);
  g.dispose && g.dispose();
}

/* ── CTF-W3: leitura do FONTE — o alvo não pode voltar a ser constante ──────────── */
{
  let fonte = fs.readFileSync('public/js/game.js', 'utf8');
  if (MUT === 'constante') fonte = fonte.replace(/this\.capsToWin = this\.ctfPts\.length[^;]*;/, 'this.capsToWin = CTF_CAPS_TO_WIN;');
  const atrib = (fonte.match(/this\.capsToWin\s*=\s*[^;]+;/g) || []);
  if (!atrib.length) falhas.push('CTF-W3 ninguém atribui `capsToWin` — quem define o alvo da rodada de captura?');
  const derivado = atrib.some((a) => /ctfPts\.length|ctfPoints\.length/.test(a));
  if (!derivado) falhas.push(`CTF-W3 nenhuma atribuição de \`capsToWin\` deriva da CONTAGEM de bandeiras (achei: ${atrib.join(' | ')})`);
}

console.log('┌─ CTF-WIN-CHECK ─ alvo da rodada de captura = todas as bandeiras do mapa');
for (const l of linhas) console.log('│ ' + l);
console.log('└─' + (MUT ? ` (mutante: ${MUT})` : ''));
if (falhas.length) {
  console.log('\nVERMELHA (' + falhas.length + '):');
  for (const f of falhas) console.log('  ✗ ' + f);
  process.exit(1);
}
console.log('\nVERDE — ' + IDS.length + ' mapas: alvo == bandeiras, e a rodada fecha na última.');
