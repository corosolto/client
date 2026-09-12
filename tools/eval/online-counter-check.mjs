/* O1–O4: o primeiro refresh só roda depois de a própria presença ser confirmada.
 * O mutante prova que inverter essa ordem volta a esconder o primeiro visitante. */
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../../public/js/main.js', import.meta.url), 'utf8');
const falhas = [];
const cobra = (ok, msg) => { if (!ok) falhas.push(msg); };
const mede = (source) => ({
  espera: source.includes('await _pingPresenca(true);\n  await _refreshOnline();'),
  confirma: /async function _pingPresenca\(aguardar = false\)/.test(source)
    && source.includes("if (aguardar) {\n    try {\n      const response = await fetch(apiUrl('/api/presence')"),
  inicia: source.includes('void _iniciaPresencaOnline();'),
  repete: source.includes('setInterval(_pingPresenca, 45_000);')
    && source.includes('setInterval(_refreshOnline, 60_000);'),
});

const medido = mede(main);
cobra(medido.espera, 'O1 refresh inicial pode correr antes do heartbeat');
cobra(medido.confirma, 'O2 heartbeat inicial não espera confirmação HTTP');
cobra(medido.inicia, 'O3 bootstrap presença→contador não é iniciado');
cobra(medido.repete, 'O4 atualizações periódicas de presença/contador sumiram');

const mutante = main.replace('await _pingPresenca(true);', '_pingPresenca();');
cobra(mutante !== main && !mede(mutante).espera, 'O5 mutante de ordem não deixa a régua vermelha');

if (falhas.length) {
  console.error(`online counter: ${falhas.length} FALHA(S)`);
  for (const falha of falhas) console.error(`  ✗ ${falha}`);
  process.exit(1);
}
console.log('online counter: 5/5 verde');
