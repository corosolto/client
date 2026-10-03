/* VO1–VO4 — build servida fora dos nossos domínios marca a versão com o host (canal de terceiro,
 * ex. espelho congelado da Stateloop em client-psi-ten-78.vercel.app). Mutantes: --mutante=sem-marca|main-cru */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const mut = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
let apibase = readFileSync(new URL('../../public/js/apibase.js', import.meta.url), 'utf8');
let main = readFileSync(new URL('../../public/js/main.js', import.meta.url), 'utf8');
if (mut === 'sem-marca') apibase = apibase.replace("if (!h || HOST_PROPRIO.test(h)) return versao;", 'return versao;');
if (mut === 'main-cru') main = main.replaceAll('version: versaoComOrigem(VERSION)', 'version: VERSION');

const dir = mkdtempSync(join(tmpdir(), 'vo-'));
writeFileSync(join(dir, 'apibase.mjs'), apibase);
const { versaoComOrigem } = await import(pathToFileURL(join(dir, 'apibase.mjs')).href);

const falhas = [];
const cobra = (ok, msg) => { if (!ok) falhas.push(msg); };
const V = '2.1.0-alpha.17';
for (const h of ['www.csbrasil.online', 'csbrasil.online', 'csbrasil.vercel.app', 'csbrasil-git-x-rubenmarcus-projects.vercel.app', 'localhost', '127.0.0.1', '']) {
  cobra(versaoComOrigem(V, h) === V, `VO1 host próprio "${h}" ganhou marca: ${versaoComOrigem(V, h)}`);
}
cobra(versaoComOrigem(V, 'client-psi-ten-78.vercel.app') === `${V}@client-psi-ten-78`, `VO2 espelho não marcado: ${versaoComOrigem(V, 'client-psi-ten-78.vercel.app')}`);
cobra(versaoComOrigem(V, 'csbrasil.online.evil.example') !== V, 'VO2 sufixo falso passou como próprio');
cobra(versaoComOrigem(V, 'um-host-muito-comprido-de-algum-portal.example.com').length <= 40, 'VO3 versão marcada passa de 40 (backend corta)');
for (const rota of ['/api/perf', '/api/match']) {
  const i = main.indexOf(`sendJsonKeepalive('${rota}'`);
  const trecho = main.slice(Math.max(0, main.lastIndexOf('const payload = {', i)), i);
  cobra(trecho.includes('version: versaoComOrigem(VERSION)'), `VO4 ${rota} manda versão sem origem`);
}

if (falhas.length) {
  console.error(`versão com origem: ${falhas.length} FALHA(S)`);
  for (const f of falhas) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('versão com origem: VO1–VO4 verde');
