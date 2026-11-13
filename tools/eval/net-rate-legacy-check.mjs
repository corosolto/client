import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const ROOT = new URL('../../public/js/', import.meta.url);
const mutante = process.argv.find(a => a.startsWith('--mutante='))?.slice(10) || null;

let rateURL = new URL('netrate.js', ROOT), netURL = new URL('net.js', ROOT);
try {
  if (mutante === 'chegada-pela-drenagem') {
    const antes = 'amostra(bytes, tServidorS, tLocalMs, tPacoteLocalMs) {', depois = 'amostra(bytes, tServidorS, tLocalMs, tPacoteLocalMs = tLocalMs) {';
    const src = readFileSync(rateURL, 'utf8'), hits = src.split(antes).length - 1;
    if (hits !== 1) throw Object.assign(new Error('âncora de reparo ausente (' + hits + ' ocorrências): fonte ainda legada'), { code: 'ANCORA' });
    const mut = src.replace(antes, depois).replace(/from\s+(['"])([^'"]+)\1/g,
      (_, q, s) => 'from ' + JSON.stringify(s.startsWith('.') ? new URL(s, rateURL).href : import.meta.resolve(s)));
    rateURL = 'data:text/javascript;base64,' + Buffer.from(mut).toString('base64');
    const netSrc = readFileSync(netURL, 'utf8').replace(/(['"])\.\/netrate\.js\1/g, JSON.stringify(String(rateURL)))
      .replace(/from\s+(['"])(\.[^'"]+)\1/g, (_, q, s) => 'from ' + JSON.stringify(new URL(s, netURL).href));
    netURL = 'data:text/javascript;base64,' + Buffer.from(netSrc).toString('base64');
    console.log('Mutação aplicada: ' + mutante);
  } else if (mutante) throw Object.assign(new Error('mutante desconhecido: ' + mutante), { code: 'MUTANTE' });
} catch (e) { if (e.code === 'ANCORA' || e.code === 'MUTANTE') { console.error(e.message); process.exit(2); } throw e; }

let MedidorDeTaxa, NetClient, VERSION, SIM_HASH;
try {
  ({ MedidorDeTaxa } = await import(rateURL)); ({ NetClient } = await import(netURL));
  ({ VERSION, SIM_HASH } = await import(new URL('version.js', ROOT)));
} catch (e) { console.error('INFRA: ' + e.name + ': ' + e.message); process.exit(2); }

const perfDesc = Object.getOwnPropertyDescriptor(globalThis, 'performance');
let agora = 0;
Object.defineProperty(globalThis, 'performance', { value: { now: () => agora }, configurable: true, writable: true });

const failures = [];
const check = (name, fn) => { try { fn(); if (!mutante) console.log('✓ ' + name); } catch (e) { failures.push({ name, cls: e.constructor.name, msg: e.message }); } };
const LEGADO = new Set(['taxa: snapshots sem t do servidor publicam null enquanto chegam',
  'taxa: drenagem de backlog no mesmo instante não inventa taxa',
  'taxa: t ausente limpa janela boa anterior', 'taxa: silêncio vira zero com JANELA_MS e retorno sem t segue null']);
const snap = (i, t) => JSON.stringify({ type: 'snapshot', tick: i, ents: [], ...(t === undefined ? {} : { t }) });
const conecta = async () => {
  const net = new NetClient('ws://fixture.invalid/ws'), caixa = { h: null };
  const pend = net._conectar(1000, () => ({ abrir(v) { caixa.h = v; }, fechar() { net.connected = false; }, enviar() {} }));
  caixa.h.mensagem(JSON.stringify({ type: 'welcome', protocolVersion: 8, clientVersion: VERSION, simHash: SIM_HASH }), false, 100);
  await pend; return { net, h: caixa.h };
};
const solta = net => { net.stopPing(); net.tp?.fechar(); };
const alimenta = (h, n, comT, base, drena) => { for (let i = 1; i <= n; i++) { if (!drena) agora = base + i * 1000 / 30; h.mensagem(snap(i, comT ? i / 30 : undefined), false, 710); } };

try {
  const c1 = await conecta(); alimenta(c1.h, 273, true, agora, false);
  check('taxa: relógio do servidor válido mantém ~30Hz', () => {
    const s = c1.net.computeStats(), esperado = 273 / 9.1;
    assert.equal(s.hz, esperado); assert.equal(s.kbps, +(30 * 710 / 1024).toFixed(2));
  }); solta(c1.net);

  const c2 = await conecta(); alimenta(c2.h, 273, false, agora + 1000, false);
  check('taxa: snapshots sem t do servidor publicam null enquanto chegam', () => {
    const s = c2.net.computeStats();
    assert.equal(s.hz, null, 'sem relógio confiável a taxa deve ser null, obtido ' + s.hz);
    assert.equal(s.kbps, null);
  });

  solta(c2.net); const cb = await conecta(); agora += 9100; alimenta(cb.h, 273, false, agora, true);
  check('taxa: drenagem de backlog no mesmo instante não inventa taxa', () => {
    const s = cb.net.computeStats();
    assert.equal(s.hz, null, 'o instante da drenagem não prova ritmo de chegada');
    assert.equal(s.kbps, null);
  }); solta(cb.net);

  const c3 = await conecta(); alimenta(c3.h, 90, true, agora + 1000, false);
  check('taxa: t ausente limpa janela boa anterior', () => {
    assert.ok(c3.net.computeStats().hz > 0, 'pré-condição: havia taxa medida');
    agora += 1000 / 30; c3.h.mensagem(snap(91, undefined), false, 710); agora += 33;
    assert.equal(c3.net.computeStats().hz, null);
  });
  check('taxa: silêncio vira zero com JANELA_MS e retorno sem t segue null', () => {
    agora += 1000; const s = c3.net.computeStats();
    assert.equal(s.hz, 0); assert.equal(s.kbps, 0);
    agora += 50; c3.h.mensagem(snap(92, undefined), false, 710); agora += 33;
    const s2 = c3.net.computeStats(); assert.equal(s2.hz, null); assert.equal(s2.kbps, null);
  });
  check('taxa: retomada confiável recomeça janela limpa no piso de 200ms', () => {
    agora += 33; c3.h.mensagem(snap(93, agora / 1000), false, 710); agora += 33;
    const s = c3.net.computeStats();
    assert.equal(s.hz, 5, 'primeira amostra usa só o piso existente de 200ms');
    assert.equal(s.kbps, +(710 / 1024 / .2).toFixed(2));
  }); solta(c3.net);

  check('medidor: eixo de chegada local exato (4º arg) suporta ~30Hz', () => {
    const r = new MedidorDeTaxa(); const base = agora;
    for (let i = 1; i <= 273; i++) { agora = base + i * 1000 / 30; r.amostra(710, undefined, agora, agora); }
    r.atualizar(agora);
    const esperado = 273 / 9.1;
    assert.equal(r.hz, esperado); assert.equal(r.kbps, +(30 * 710 / 1024).toFixed(2));
  });
} finally { Object.defineProperty(globalThis, 'performance', perfDesc); }

if (mutante) {
  const ruins = failures.filter(f => f.cls !== 'AssertionError' || !LEGADO.has(f.name));
  if (ruins.length) { ruins.forEach(f => console.error(`✗ ${f.name}: ${f.cls}: ${f.msg}`)); console.error('falha de infraestrutura sob mutante'); process.exit(2); }
  if (!['taxa: snapshots sem t do servidor publicam null enquanto chegam', 'taxa: drenagem de backlog no mesmo instante não inventa taxa'].every(name => failures.some(f => f.name === name))) { console.error('mutante não acendeu as duas cláusulas causais do cliente real'); process.exit(1); }
  console.log('mutante ' + mutante + ' morto por: ' + failures.map(f => f.name).join('; '));
} else if (failures.length) {
  failures.forEach(f => console.error(`✗ ${f.name}: ${f.cls}: ${f.msg}`));
  console.error(failures.length + ' falha(s) nominal(is)');
  process.exitCode = 1;
} else console.log('verde nominal');
