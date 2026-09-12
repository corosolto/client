/* RÉGUA DO CAMINHO AUTORADO — o jogo monta mesmo o viewmodel golden, com mãos?
 *
 * POR QUE ELA EXISTE. O merge com a main levou uma linha de `_applyVmVisibility`
 * (`this.vm.authored?.setWeapon(w)`) porque a main não conhece o caminho
 * autorado. Sem ela `authored.weapon` ficava vazio, nenhuma entrada era pedida,
 * e as 26 armas caíam no viewmodel legado: modelo antigo e SEM MÃOS. O
 * `check:fast` ficou VERDE o tempo todo — ele roda o motor em node e nunca
 * monta viewmodel. O dono viu em dois segundos: "não aparece nenhuma mão".
 *
 * Régua de contagem não pegaria: as malhas existem no GLB e a config está certa.
 * O que falhava era a LIGAÇÃO. Por isso esta régua mede no jogo de verdade, arma
 * por arma, três coisas juntas:
 *   1. a chave resolvida começa com `gold#` (é o GLB novo, não a família velha);
 *   2. o controlador tem malha de mão na entrada;
 *   3. a mão está visível com a cadeia de pais inteira.
 *
 * Mutação:
 *   --mutante=semfiacao   serve o game.js sem o `authored?.setWeapon` → 0 armas
 *
 *   node tools/eval/vm-autorado-vivo.mjs --porta=4361
 */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';

const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `=${d}`)
  .split('=').slice(1).join('=');
const PORTA = arg('porta', '4361');
const MUTANTE = arg('mutante', '');
const SO = arg('armas', '').split(',').filter(Boolean);

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const nav = await chromium.launch();
const pag = await nav.newPage({ viewport: { width: 1280, height: 800 } });
const erros = [];
pag.on('pageerror', (e) => erros.push(String(e).split('\n')[0].slice(0, 140)));

if (MUTANTE === 'semfiacao') {
  // Reproduz EXATAMENTE o defeito do merge: a troca some, o resto fica.
  const fonte = fs.readFileSync('public/js/game.js', 'utf8')
    .replace('const authored = melee ? false : (this.vm.authored?.setWeapon(w) || false);',
             'const authored = false;');
  await pag.route('**/js/game.js*', (r) =>
    r.fulfill({ contentType: 'application/javascript; charset=utf-8', body: fonte }));
}

await pag.goto(`http://localhost:${PORTA}/?debug=1&auto=E&map=brasilia&armaslazy=0`,
  { waitUntil: 'load', timeout: 180000 });
await pag.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
await pag.waitForTimeout(2500);

/* A lista golden sai do vmconfig LIDO PELA PÁGINA, não de regex no arquivo: o
   parser à mão já falhou aqui e devolveu zero armas com o arquivo correto. */
const ALVO = SO.length ? SO : await pag.evaluate(async () => {
  const vm = await import('/js/data/vmconfig.js');
  return Object.entries(vm.VM_WEAPON || {}).filter(([, c]) => c?.golden).map(([k]) => k);
});
if (!ALVO.length) {
  await nav.close();
  console.log('\n  VERMELHO — nenhuma arma golden no vmconfig\n');
  process.exit(1);
}

const linhas = [];
for (const arma of ALVO) {
  const r = await pag.evaluate(async (a) => {
    const g = window.__game;
    g._switchWeapon(a);
    for (let i = 0; i < 30 && !g.vm.authored?.entry?.(a); i += 1) {
      await new Promise((r2) => setTimeout(r2, 120));     // espera o GLB chegar
    }
    await new Promise((r2) => setTimeout(r2, 250));
    const ent = g.vm.authored?.entry?.(a);
    const visivel = (o) => { let v = o.visible; let p = o.parent; while (v && p) { v = p.visible; p = p.parent; } return v; };
    const maos = ent?.handMeshes || [];
    return { arma: a, chave: ent?.key || null, maos: maos.length, visiveis: maos.filter(visivel).length };
  }, arma);
  const ok = r.chave?.startsWith('gold#') && r.visiveis > 0;
  linhas.push({ ...r, ok });
  console.log(`  ${r.arma.padEnd(7)} ${String(r.chave || 'LEGADO').padEnd(14)} maos ${r.visiveis}/${r.maos}  ${ok ? 'ok' : 'FALHA'}`);
}
await nav.close();

const bons = linhas.filter((l) => l.ok).length;
const semMao = linhas.filter((l) => l.chave?.startsWith('gold#') && !l.visiveis).map((l) => l.arma);
const legado = linhas.filter((l) => !l.chave?.startsWith('gold#')).map((l) => l.arma);
console.log(`\n  ${bons}/${ALVO.length} armas golden montam o viewmodel autorado COM mão visível`);
if (legado.length) console.log(`  caíram no legado: ${legado.join(' ')}`);
if (semMao.length) console.log(`  autoradas mas SEM mão: ${semMao.join(' ')}`);
if (erros.length) console.log(`  erros de página: ${[...new Set(erros)].slice(0, 3).join(' | ')}`);
const ok = bons === ALVO.length;
console.log(ok ? '\n  VERDE — o caminho autorado está ligado\n'
               : '\n  VERMELHO — o jogo não está montando o viewmodel novo\n');
process.exit(ok ? 0 : 1);
