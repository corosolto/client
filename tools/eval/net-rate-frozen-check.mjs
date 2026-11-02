import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VERSION, SIM_HASH } from '../../public/js/version.js';

const mutation = process.argv.find(arg => arg.startsWith('--mutante='))?.slice(10);
const mutations = {
  'sem-congelamento': ['netrate.js', 'if (this._vivo && temSrv && this._eixoServidor && tm <= this._ultimoTm && tm >= this._ultimoTm - RECUO_MAX_MS) {', 'if (false) {'],
  'sem-reset-partida': ['net.js', '          this._taxa.reiniciar();', ''],
};
let rateModule = await import('../../public/js/netrate.js'), netModule = await import('../../public/js/net.js');
if (mutation) {
  assert(Object.hasOwn(mutations, mutation), 'mutante desconhecido');
  const [file, before, after] = mutations[mutation], url = new URL('../../public/js/' + file, import.meta.url);
  const source = readFileSync(url, 'utf8');
  assert.equal(source.split(before).length - 1, 1, 'mutante precisa aplicar exatamente uma vez');
  const changed = source.replace(before, after).replace(/from\s+(['"])([^'"]+)\1/g,
    (_, quote, spec) => 'from ' + JSON.stringify(spec.startsWith('.') ? new URL(spec, url).href : import.meta.resolve(spec)));
  const module = await import('data:text/javascript;base64,' + Buffer.from(changed).toString('base64'));
  if (file === 'netrate.js') rateModule = module; else netModule = module;
  console.log('Mutação aplicada: ' + mutation);
}
const { MedidorDeTaxa } = rateModule, { NetClient } = netModule;

let failures = 0;
const check = async (name, task) => {
  try { await task(); console.log(`✓ ${name}`); }
  catch (error) { failures++; console.error(`✗ ${name}: ${error.name}: ${error.message}`); }
};
const reporterProbe = process.argv.find(arg => arg.startsWith('--prova-reporter='))?.split('=')[1];
if (reporterProbe) {
  assert(['TypeError', 'AssertionError'].includes(reporterProbe));
  console.log('Mutação aplicada: controle-reporter');
  await check('clock: congelamento explícito não publica taxa inventada', () => {
    if (reporterProbe === 'TypeError') throw new TypeError('controle executável do reporter');
    assert.fail('controle executável do reporter');
  });
  process.exit(1);
}
const frozen = (batch = false) => {
  const rate = new MedidorDeTaxa();
  for (let i = 1; i <= 90; i++) {
    const local = batch ? 9100 : i * 1000 / 30;
    rate.amostra(700, 0, local); rate.atualizar(local);
  }
  return rate;
};
await check('clock: congelamento explícito não publica taxa inventada', () => {
  const rate = frozen(); assert.equal(rate.hz, null); assert.equal(rate.kbps, null);
  assert(rate._tm.length - rate._i <= 1, 'não acumula janela de emissão sem relógio válido');
});
await check('clock: primeiro lote após travada permanece indisponível', () => {
  const rate = frozen(true); assert.equal(rate.hz, null); assert.equal(rate.kbps, null);
});
await check('clock: silêncio é zero e novo pacote congelado volta a indisponível', () => {
  const rate = frozen(); rate.atualizar(4100);
  assert.equal(rate.hz, 0); assert.equal(rate.kbps, 0);
  rate.amostra(700, 0, 4200); rate.atualizar(4200);
  assert.equal(rate.hz, null); assert.equal(rate.kbps, null);
});
await check('clock: retomada descarta todas as amostras congeladas', () => {
  const rate = frozen(); rate.amostra(700, .1, 3100); rate.atualizar(3100);
  assert.equal(rate.hz, 5, 'primeira amostra usa só o piso existente de200ms');
  assert.equal(rate.kbps, +(700 / 1024 / .2).toFixed(2));
});
await check('clock: recuo de sessão reinicia a janela sem congelamento', () => {
  const rate = new MedidorDeTaxa();
  rate.amostra(700, 100, 1000); rate.amostra(700, 101, 2000);
  rate.amostra(700, 1, 2010); rate.atualizar(2010);
  assert.equal(rate.hz, 5); assert.equal(rate.kbps, +(700 / 1024 / .2).toFixed(2));
});
await check('clock: partida reinicia medidor e preserva null na telemetria', async () => {
  const net = new NetClient('ws://fixture.invalid/ws'); let hooks; const sent = [];
  const pending = net._conectar(1000, () => ({ abrir(value) { hooks = value; }, fechar() {}, enviar(value) { sent.push(value); } }));
  hooks.mensagem(JSON.stringify({ type: 'welcome', clientVersion: VERSION, simHash: SIM_HASH }), false, 100);
  await pending;
  for (let i = 1; i <= 90; i++) hooks.mensagem(JSON.stringify({ type: 'snapshot', t: i / 30, tick: i, ents: [] }), false, 700);
  assert(net.computeStats().hz > 0, 'pré-condição: havia taxa medida');
  hooks.mensagem(JSON.stringify({ type: 'partida' }), false, 100);
  const after = net.computeStats(); assert.equal(after.hz, 0); assert.equal(after.kbps, 0);
  net.sendClientStats({ snap: null }); assert.equal(JSON.parse(sent.at(-1)).snap, null);
});
if (failures) process.exitCode = 1;
