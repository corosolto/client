/* RÉGUA DA BANCADA /vmtest.html — as 15 golden carregam e se deixam julgar juntas?
 *
 * O dono pediu para "testar todas de uma vez". A página serve as 15 armas golden
 * lado a lado, cada uma animando o próprio clipe, giradas TODAS pelo mesmo
 * ângulo — o que deita a AK — e com a peça presa a um osso `Mag*` pintada de
 * vermelho. Bancada que não carrega é pior que bancada nenhuma: mente calada.
 *
 * O que ela devolve, e que é o que o dono confere no olho:
 *   N/15 carregadas · M com peça presa ao osso do pente · quem ficou sem peça
 *
 * Mutações (lei 2 da casa: régua que não pode falhar não mede nada):
 *   --mutante=semglb    nega os GLB à página          → 0/15, VERMELHO
 *   --mutante=sempente  mata o casamento do osso Mag  → 0 com peça, VERMELHO
 *
 *   node tools/eval/vm-bancada-check.mjs --porta=4361 --figura=/tmp/bancada.png
 *   node tools/eval/vm-bancada-check.mjs --clipe=Idle --figura=/tmp/idle.png
 *   node tools/eval/vm-bancada-check.mjs --maos=1 --figura=/tmp/maos.png
 */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';

const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `=${d}`)
  .split('=').slice(1).join('=');
const PORTA = arg('porta', '4361');
const FIGURA = arg('figura', '');
const CLIPE = arg('clipe', '');
const MAOS = arg('maos', '') === '1';
const MUTANTE = arg('mutante', '');
const ESPERADAS = 15;
// Mutante que nega o GLB nunca completa: nao vale esperar os 150 s do caso bom.
const ESPERA = +arg('espera', MUTANTE ? 40000 : 150000);

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const nav = await chromium.launch();
const pag = await nav.newPage({ viewport: { width: 1600, height: 1000 } });
const erros = [];
pag.on('pageerror', (e) => erros.push(String(e).split('\n')[0]));
pag.on('console', (m) => { if (m.type() === 'error') erros.push(m.text().slice(0, 160)); });

if (MUTANTE === 'semglb') {
  await pag.route('**/models/viewmodels/coro/*.glb', (r) => r.abort());
}
if (MUTANTE === 'sempente') {
  // Muta a PÁGINA, não o número: troca o casamento do osso do pente por um que
  // não casa com nada. Se a régua continuar verde, ela não estava olhando a
  // geometria pintada — estava lendo o próprio rótulo.
  const html = fs.readFileSync('public/vmtest.html', 'utf8')
    .replace('/^mag/i.test(b.name', '/^zzzzz/i.test(b.name');
  await pag.route(`**/vmtest.html`, (r) => r.fulfill({ contentType: 'text/html', body: html }));
}

await pag.goto(`http://localhost:${PORTA}/vmtest.html`, { waitUntil: 'domcontentloaded' });
try {
  await pag.waitForFunction((n) => window.__bancada && window.__bancada.length === n,
    ESPERADAS, { timeout: ESPERA });
} catch { /* segue: o placar parcial é a informação */ }

if (CLIPE) await pag.selectOption('#clipe', CLIPE);
if (MAOS) await pag.setChecked('#maos', true);
await pag.waitForTimeout(CLIPE || MAOS ? 2200 : 1800);

const medida = await pag.evaluate(() => {
  const T = window.__bancada || [];
  return {
    carregadas: T.length,
    comPeca: T.filter((f) => f.pente.length).length,
    semPeca: T.filter((f) => !f.pente.length).map((f) => f.nome),
    presos: Object.fromEntries(T.map((f) =>
      [f.nome, f.pente.reduce((s, p) => s + p.presos, 0)])),
  };
});

if (FIGURA) await pag.screenshot({ path: FIGURA });
await nav.close();

const ok = medida.carregadas === ESPERADAS && medida.comPeca > 0;
console.log(`\n  ${medida.carregadas}/${ESPERADAS} armas carregadas na bancada`);
console.log(`  ${medida.comPeca} com peça presa ao osso do pente`);
if (medida.semPeca.length) console.log(`  sem peça: ${medida.semPeca.join(' ')}`);
const vs = Object.entries(medida.presos).filter(([, v]) => v)
  .sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ');
if (vs) console.log(`  vértices presos ao pente: ${vs}`);
if (FIGURA) console.log(`  figura: ${FIGURA}`);
if (erros.length) console.log(`  erros de página: ${[...new Set(erros)].slice(0, 4).join(' | ')}`);
console.log(ok ? '\n  VERDE — a bancada serve as 15\n' : '\n  VERMELHO — a bancada não serve o arsenal\n');
process.exit(ok ? 0 : 1);
