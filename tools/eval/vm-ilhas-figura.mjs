/* FIGURA NUMERADA DAS ILHAS — a pergunta que nenhuma heurística soube responder.
 *
 * Qual ilha da malha é o carregador? Já falharam quatro regras automáticas: "o
 * componente que desce mais" pegou a alavanca da carabina e a base da deagle; "o
 * mais perto da âncora" herda a âncora da AK; a caixa derivada reprova no próprio
 * gabarito (IoU 62% na AK, piso 80%) e na AKM escolhe uma peça DISJUNTA da certa.
 *
 * Então a figura pergunta em vez de adivinhar: pinta cada candidata de uma cor,
 * põe um número em cima, e um crítico que só vê pixel responde "o carregador é
 * a 3". A partir daí o corte é exato — ilha nomeada, não região do espaço.
 *
 *   node tools/eval/vm-ilhas-figura.mjs --armas=m4,scar,uzi --saida=/tmp/ilhas
 */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';

const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `=${d}`)
  .split('=').slice(1).join('=');
const PORTA = arg('porta', '4361');
const SAIDA = arg('saida', '/tmp/ilhas');
const VISTAS = arg('vistas', 'lado,baixo').split(',').filter(Boolean);
const ARMAS = arg('armas', 'm4,scar,uzi,mp5,md97,m92,p90,ak').split(',').filter(Boolean);

const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

fs.mkdirSync(SAIDA, { recursive: true });
const nav = await chromium.launch();
const pag = await nav.newPage({ viewport: { width: 1280, height: 860 } });
const relatorio = [];
for (const arma of ARMAS) {
  for (const vista of VISTAS) {
    await pag.goto(`http://localhost:${PORTA}/vmilhas.html?arma=${arma}&vista=${vista}`,
      { waitUntil: 'domcontentloaded' });
    try {
      await pag.waitForFunction(() => window.__pronto === true, null, { timeout: 30000 });
    } catch {
      console.log(`  ${arma}/${vista}: NAO CARREGOU`);
      continue;
    }
    await pag.waitForTimeout(500);
    const d = await pag.evaluate(() => window.__ilhas);
    await pag.screenshot({ path: `${SAIDA}/${arma}-${vista}.png` });
    if (vista === VISTAS[0]) {
      relatorio.push(d);
      console.log(`  ${arma.padEnd(7)} ${String(d.total).padStart(3)} ilhas · candidatas: `
        + d.candidatas.map((c) => `${c.n}:${c.tris}tri`).join(' '));
    }
  }
}
fs.writeFileSync(`${SAIDA}/ilhas.json`, JSON.stringify(relatorio, null, 2));
await nav.close();
console.log(`\n  figuras em ${SAIDA}\n`);
