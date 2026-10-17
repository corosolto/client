// CONTRATO de cadência das pistolas semi (relato de out/2026: "o firerate das pistolas
// está muito baixo"). O alvo é a FAIXA de gênero (semi de CS anda em 0,15-0,17 s), não um
// número solto: a régua prende (1) a faixa, (2) a ORDEM de TTK contra SMG/fuzil (pistola
// continua PERDENDO no corpo-a-corpo pra MP5) e (3) que o ajuste toca SÓ o rate — pente e
// reserva são o mesmo contrato de economia de antes.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const option = (n) => process.argv.find((a) => a.startsWith(n + '='))?.slice(n.length + 1);
// WEAPONS direto do DATA (é ali que o rate mora; game.js só reexporta). O override do
// mutante aponta pra este arquivo, não pro game.js.
const dataFile = path.resolve(option('--weapons-module') || path.join(ROOT, 'public/js/data/weapons.js'));
const { WEAPONS } = await import(pathToFileURL(dataFile));

const rows = [];
const check = (name, pass, observed = {}) => rows.push({ name, pass: !!pass, observed });
// TTK de corpo: tiros necessários menos o primeiro (que sai no instante 0) vezes o rate.
const ttk = (w) => (Math.ceil(100 / WEAPONS[w].dmg) - 1) * WEAPONS[w].rate;

check('PT-38 na faixa de semi (0,12-0,18 s)', WEAPONS.pistol.rate >= 0.12 && WEAPONS.pistol.rate <= 0.18,
  { rate: WEAPONS.pistol.rate });
check('PT-38 mata em 3 tiros de corpo (dmg 34 intacto)', WEAPONS.pistol.dmg === 34, { dmg: WEAPONS.pistol.dmg });
check('Deagle na faixa de canhão de mão (0,18-0,26 s)', WEAPONS.deagle.rate >= 0.18 && WEAPONS.deagle.rate <= 0.26,
  { rate: WEAPONS.deagle.rate });
check('PT-38 TTK de corpo < 0,40 s (o alvo do ajuste)', ttk('pistol') < 0.40, { ttk: +ttk('pistol').toFixed(3) });
check('pistola continua perdendo a curto prazo pra MP5', ttk('pistol') > ttk('mp5'),
  { pistola: +ttk('pistol').toFixed(3), mp5: +ttk('mp5').toFixed(3) });
check('Deagle segue mais lenta que a AK (o preço do 2 tiros)', ttk('deagle') > ttk('ak'),
  { deagle: +ttk('deagle').toFixed(3), ak: +ttk('ak').toFixed(3) });
check('ajuste toca SÓ cadência: pente/reserva da PT-38 intactos',
  WEAPONS.pistol.mag === 12 && WEAPONS.pistol.reserve === 48,
  { mag: WEAPONS.pistol.mag, reserve: WEAPONS.pistol.reserve });
check('ajuste toca SÓ cadência: pente/reserva da Deagle intactos',
  WEAPONS.deagle.mag === 7 && WEAPONS.deagle.reserve === 35,
  { mag: WEAPONS.deagle.mag, reserve: WEAPONS.deagle.reserve });

const result = {
  passed: rows.filter((r) => r.pass).length, total: rows.length,
  failed: rows.filter((r) => !r.pass).map((r) => r.name), rows,
  scope: 'contrato de dados de cadência; sem aceite de feel (isso é humano)',
};
console.log(JSON.stringify({ passed: result.passed, total: result.total, failed: result.failed }, null, 1));
if (result.failed.length) process.exitCode = 1;
