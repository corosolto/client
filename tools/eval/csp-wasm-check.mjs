#!/usr/bin/env node
/* ============================================================================
csp-wasm-check.mjs — A CSP DEIXA O DECODER MESHOPT INSTANCIAR?

POR QUE EXISTE (20/10/2026, achado em produção)
O #1037 registrou o `MeshoptDecoder` no loader do viewmodel autorado — e a AK
continuou invisível em primeira pessoa **em produção**, enquanto local passava.
A diferença não estava no código: o servidor local não manda CSP, e a de
produção trazia `script-src 'self' 'unsafe-inline' …` sem `'wasm-unsafe-eval'`.
O decoder do meshopt é WebAssembly; sem essa fonte o navegador responde
"WebAssembly.instantiate(): … violates the following Content Security policy
directive" e a família `gold#ak` (GLB comprimido) morre na carga.

O QUE ELE MEDE
Carrega a página alvo DUAS vezes, trocando só o header `Content-Security-Policy`
da resposta do documento, e tenta instanciar um módulo WebAssembly mínimo:
  - com a CSP do `vercel.json` deste checkout -> TEM de instanciar;
  - com a CSP antiga (sem `'wasm-unsafe-eval'`) -> TEM de falhar.
A segunda metade é o mutante: se ela também passar, a medição não está medindo
CSP nenhuma e o verde não vale.

Uso:
  node tools/eval/csp-wasm-check.mjs                 # alvo: produção
  node tools/eval/csp-wasm-check.mjs --alvo http://127.0.0.1:9421
============================================================================ */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const arg = (n) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : null;
};
const ALVO = arg('alvo') || 'https://www.csbrasil.online';

const cspDoRepo = () => {
  const vercel = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
  for (const regra of vercel.headers || []) {
    const h = (regra.headers || []).find((x) => x.key === 'Content-Security-Policy');
    if (h) return h.value;
  }
  throw new Error('vercel.json sem Content-Security-Policy');
};

// WASM mínimo válido: módulo vazio. Instanciar é o que a CSP barra.
const SONDA = `(async () => {
  const bytes = new Uint8Array([0,97,115,109,1,0,0,0]);
  try { await WebAssembly.instantiate(bytes); return { wasm: true, erro: '' }; }
  catch (e) { return { wasm: false, erro: String(e.message).slice(0, 90) }; }
})()`;

const medir = async (browser, csp) => {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.route('**/*', async (rota) => {
    const req = rota.request();
    if (req.resourceType() !== 'document') return rota.continue();
    const res = await rota.fetch();
    const headers = { ...res.headers(), 'content-security-policy': csp };
    return rota.fulfill({ response: res, headers });
  });
  await page.goto(`${ALVO}/?lang=pt`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const r = await page.evaluate(SONDA);
  await page.close();
  return r;
};

const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--headless=new', '--mute-audio'],
});

const CSP_REPO = cspDoRepo();
const CSP_ANTIGA = CSP_REPO.replace(" 'wasm-unsafe-eval'", '');
const casos = [];
try {
  const atual = await medir(browser, CSP_REPO);
  casos.push({ id: 'CSP1', ok: atual.wasm === true, msg: atual.wasm ? 'wasm instancia com a CSP do repo' : `wasm BARRADO: ${atual.erro}` });

  const mutante = await medir(browser, CSP_ANTIGA);
  casos.push({ id: 'CSP2', ok: mutante.wasm === false, msg: mutante.wasm ? 'mutante passou: a medição não enxerga CSP' : 'mutante morde: sem wasm-unsafe-eval o wasm falha' });
} finally {
  await browser.close();
}

let sair = 0;
for (const c of casos) {
  console.log(`${c.ok ? 'VERDE' : 'VERMELHO'} ${c.id} ${c.msg}`);
  if (!c.ok) sair = 1;
}
console.log(`${casos.filter((c) => c.ok).length}/${casos.length} em ${ALVO}`);
process.exit(sair);
