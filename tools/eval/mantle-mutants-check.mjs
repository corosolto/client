// União QA nativa447 após timeout445; não é autoria de produto GLM.
// GLM242 — driver estrito do alias `mut:mantle`. Infraestrutura NÃO é morte: baseline
// real exige exit 0 + UM relatório terminal JSON medido; mutante real exige exit 1 com
// UMA evidência e UM POST. Qualquer desvio de meta/setup/infra: exit 2. Só com provas.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const CHECK = path.join(AQUI, 'mantle-check.mjs'); // fixo: nenhum command/path via CLI/env
const EVID = '__MANTLE_MUT_EVIDENCE__';
const POST = '__MANTLE_MUT_POST__';
const BASE = '__MANTLE_MUT_BASE__';
const ESTADOS = ['OK', 'N/A', 'FALHA'];
/* Os 2 casos REAIS com id CANÔNICO do registro MAPS (maps.js): baixa no Córrego (MNT2),
   alta nas Lajes (MNT3). Alias fy_* é normalizado pelo checker; o protocolo fala canônico. */
const CASOS = [
  { mapa: 'corrego', mutante: 'beirada-baixa', clausula: 'MNT2', chave: 'mnt2' },
  { mapa: 'lajes', mutante: 'beirada-alta', clausula: 'MNT3', chave: 'mnt3' },
  { mapa: 'lajes', mutante: 'travessia-congelada', clausula: 'MNT2', chave: 'mnt2' },
  { mapa: 'corrego', mutante: 'pouso-nan', clausula: 'MNT2', chave: 'mnt2' },
];
const CANAL = { mapa: 'corrego', mutante: 'canal-fechado', clausula: 'MNT1', chave: 'mnt1' };
const TIMEOUT_MS = 180000; // all-242s/18-mapas já medido; 180 s para 1 mapa é conservador
const MAXBUF = 32 * 1024 * 1024;

const linhasMarca = (txt, marca) => (txt || '').split('\n').filter((l) => l.startsWith(marca));

/* Valida UMA corrida do mantle-check; retorna null se válida, ou o motivo do rechazo. */
function validar(res, caso, baseline) {
  if (res.error || res.signal || res.timedOut)
    return `infra: error=${res.error ? (res.error.code || res.error.message) : '-'} signal=${res.signal || '-'} timeout=${res.timedOut ? 'sim' : 'não'}`;
  const evid = linhasMarca(res.stderr, EVID), post = linhasMarca(res.stderr, POST);
  if (baseline) {
    if (res.status !== 0) return `baseline exit ${res.status} (exige 0)`;
    if (evid.length || post.length) return 'baseline emitiu marca de mutante';
    const bs = linhasMarca(res.stderr, BASE);
    if (bs.length !== 1) return `relatórios terminais ${bs.length} (exige exatamente 1)`;
    let b;
    try { b = JSON.parse(bs[0].slice(BASE.length)); }
    catch { return 'relatório terminal com corpo não-JSON'; }
    if (typeof b !== 'object' || b === null || Array.isArray(b)) return `relatório terminal não é objeto JSON: ${b === null ? 'null' : Array.isArray(b) ? 'array' : typeof b}`;
    if (b.tool !== 'mantle-check') return `tool=${b.tool}`;
    if (b.map !== caso.mapa) return `map=${b.map} (esperado ${caso.mapa})`;
    if (b.mutant !== null) return `mutant=${b.mutant} (baseline roda sem mutante)`;
    if (!Number.isInteger(b.celulas) || b.celulas < 1) return `celulas=${b.celulas} (exige contagem real >= 1)`;
    for (const k of ['mnt1', 'mnt2', 'mnt3'])
      if (!ESTADOS.includes(b[k])) return `${k}=${b[k]} (estado MNT real é OK/N/A/FALHA)`;
    if (b[caso.chave] !== 'OK') return `${caso.chave}=${b[caso.chave]} (exige cláusula pertinente PASS)`;
    return null;
  }
  const esperado = caso.nominal === true ? 0 : 1;
  if (res.status !== esperado) return `mutante exit ${res.status} (exige ${esperado}; nominal declarado ou morte semântica, nunca !/signal/timeout genérico)`;
  if (evid.length !== 1) return `evidências ${evid.length} (exige exatamente 1)`;
  if (post.length !== 1) return `POSTs ${post.length} (exige exatamente 1)`;
  let e, p;
  try { e = JSON.parse(evid[0].slice(EVID.length)); p = JSON.parse(post[0].slice(POST.length)); }
  catch { return 'marca com corpo não-JSON (ex. TypeError/ReferenceError de sintaxe)'; }
  if (typeof e !== 'object' || e === null || Array.isArray(e)) return 'evidência não é objeto JSON (null/array/primitivo)';
  if (typeof p !== 'object' || p === null || Array.isArray(p)) return 'POST não é objeto JSON (null/array/primitivo)';
  if (e.tool !== 'mantle-check') return `tool=${e.tool}`;
  if (e.map !== caso.mapa) return `map=${e.map} (esperado ${caso.mapa})`;
  if (e.mutant !== caso.mutante) return `mutant=${e.mutant}`;
  if (e.applied !== true) return `applied=${e.applied}`;
  if (e.status) return `evidência com status=${e.status}: infra não é morte`;
  if (JSON.stringify(e.clauses) !== JSON.stringify([caso.clausula]))
    return `clauses=${JSON.stringify(e.clauses)} (exige ["${caso.clausula}"])`;
  if (['travessia-congelada', 'pouso-nan', 'canal-fechado'].includes(caso.mutante) && (!Number.isInteger(e.aplicacoes) || e.aplicacoes < 1)) return 'sem aplicação em branch real';
  if (['travessia-congelada', 'pouso-nan'].includes(caso.mutante) && e.mecanismo !== '_stepMantle') return 'mecanismo de aplicação errado';
  if (caso.mutante === 'pouso-nan') {
    const c = e.causal;
    if (!c || typeof c !== 'object' || Array.isArray(c)) return 'sem causa de pouso';
    for (const pose of [c.antes, c.pouso])
      if (!pose || typeof pose !== 'object' || Array.isArray(pose) || !['x', 'y', 'z'].every((k) => Number.isFinite(pose[k]))) return 'pouso sem pose finita antes da injeção';
    if (c.mantleAntes !== true || c.mantleDepois !== false || c.pousoFinito !== true || c.aposInjecaoFinito !== false) return 'transição de pouso inválida';
  }
  if (p.tool !== 'mantle-check' || p.map !== caso.mapa || p.mutant !== caso.mutante)
    return 'POST com identificação errada';
  if (!Number.isInteger(p.celulas) || p.celulas < 1) return `POST celulas=${p.celulas} (exige contagem real >= 1)`;
  for (const k of ['mnt1', 'mnt2', 'mnt3'])
    if (!ESTADOS.includes(p[k])) return `POST ${k}=${p[k]} (estado MNT real é OK/N/A/FALHA)`;
  const estado = caso.nominal === true ? 'OK' : 'FALHA';
  if (p[caso.chave] !== estado) return `POST ${caso.chave}=${p[caso.chave]} (exige ${estado} específica)`;
  if (caso.mutante === 'canal-fechado') {
    if (!Number.isInteger(p.depressoes) || p.depressoes < 1 || !Number.isInteger(p.semSaida) || p.semSaida < 0 || p.semSaida > p.depressoes || !Number.isFinite(p.piorSaidaSReal) || p.piorSaidaSReal < 0 || p.tMax !== 2) return 'canal sem medidas MNT1 válidas';
    const falhaMedida = p.semSaida > 0 || p.piorSaidaSReal > p.tMax;
    if (falhaMedida !== (estado === 'FALHA')) return 'canal contradiz fórmula MNT1 real';
  }
  return null;
}

function validarInfra(res, tipo) {
  if (res.error || res.signal || res.timedOut || res.status !== 2) return 'controle de infraestrutura não terminou normalmente com exit 2';
  if (linhasMarca(res.stderr, POST).length || linhasMarca(res.stderr, BASE).length) return 'infra emitiu resultado medido';
  const ev = linhasMarca(res.stderr, EVID);
  const prefixos = {
    motor: 'INFRA (exit 2): MNT2 runtime — Error: mutante causal: _updatePlayer explodiu',
    mapa: 'INFRA (exit 2): mutante canal-fechado solicitado e NÃO aplicado em nenhum mapa (mapa corrego ausente da execução?)',
    cli: 'INFRA (exit 2): mutante duplicado: beirada-alta,motor-explode',
    desconhecido: 'INFRA (exit 2): mutante desconhecido: inexistente',
  };
  if (!Object.hasOwn(prefixos, tipo)) return 'controle infra desconhecido';
  const linhas = (res.stderr || '').split('\n');
  if (linhas.filter((l) => l === prefixos[tipo]).length !== 1) return 'diagnóstico infra próprio ausente/duplicado';
  if (tipo !== 'motor') return ev.length ? 'setup/CLI emitiu aplicação' : null;
  if (ev.length !== 1) return 'motor sem uma aplicação observada';
  let e;
  try { e = JSON.parse(ev[0].slice(EVID.length)); } catch { return 'evidência infra não JSON'; }
  if (!e || typeof e !== 'object' || Array.isArray(e) || e.tool !== 'mantle-check' || e.map !== 'corrego' || e.mutant !== 'motor-explode' || e.applied !== true || e.status !== 'infra' || e.aplicacoes !== 1 || JSON.stringify(e.clauses) !== '[]') return 'evidência não prova chamada do motor';
  return null;
}

function rodar(args, env = {}) {
  const r = spawnSync(process.execPath, [CHECK, ...args],
    { timeout: TIMEOUT_MS, maxBuffer: MAXBUF, encoding: 'utf8', env: { ...process.env, ...env } });
  return {
    status: r.status, error: r.error, signal: r.signal,
    timedOut: !!(r.error && r.error.code === 'ETIMEDOUT'),
    stdout: r.stdout, stderr: r.stderr,
  };
}

/* Provas reais por padrão: 1 baseline + 1 mutante por caso, com spawn de verdade. */
function provaReal() {
  for (const caso of CASOS) {
    const b = validar(rodar([caso.mapa]), caso, true);
    if (b) { console.error(`mut:mantle: baseline ${caso.mapa} inválida — ${b}`); process.exit(2); }
    const m = validar(rodar([caso.mapa, `--mutante=${caso.mutante}`]), caso, false);
    if (m) { console.error(`mut:mantle: mutante ${caso.mutante}@${caso.mapa} inválido — ${m}`); process.exit(2); }
    console.log(`mut:mantle OK — ${caso.mapa}: baseline 0 + ${caso.mutante} morto com ${caso.clausula} FALHA`);
  }
  for (const nominal of [true, false]) {
    const caso = { ...CANAL, nominal };
    const motivo = validar(rodar([caso.mapa, '--mutante=canal-fechado'], { SIM_QS: nominal ? '' : '?mantle=0' }), caso, false);
    if (motivo) { console.error(`mut:mantle: canal ${nominal ? 'ON' : 'OFF'} inválido — ${motivo}`); process.exit(2); }
    console.log(`mut:mantle OK — canal ${nominal ? 'ON exit0/MNT1 OK' : 'OFF exit1/MNT1 FALHA'} com aplicação e medidas reais`);
  }
  for (const [tipo, args] of [
    ['mapa', ['lajes', '--mutante=canal-fechado']],
    ['desconhecido', ['corrego', '--mutante=inexistente']],
    ['motor', ['corrego', '--mutante=motor-explode']],
    ['cli', ['lajes', '--mutante=beirada-alta', '--mutante=motor-explode']],
  ]) {
    const motivo = validarInfra(rodar(args), tipo);
    if (motivo) { console.error(`mut:mantle: controle ${tipo} inválido — ${motivo}`); process.exit(2); }
    console.log(`mut:mantle OK — controle ${tipo} infra2, sem morte semântica`);
  }
}

/* self-test: valida o VALIDADOR sem spawn; cada controle muda UMA condição sozinho. */
function selfTest() {
  const caso = CASOS[0];
  const ev = (o) => EVID + JSON.stringify({ tool: 'mantle-check', map: caso.mapa, mutant: caso.mutante, applied: true, clauses: [caso.clausula], ...o }) + '\n';
  const po = (o) => POST + JSON.stringify({ tool: 'mantle-check', map: caso.mapa, mutant: caso.mutante, celulas: 4321, mnt1: 'OK', mnt2: 'FALHA', mnt3: 'OK', ...o }) + '\n';
  const ba = (o) => BASE + JSON.stringify({ tool: 'mantle-check', map: caso.mapa, mutant: null, celulas: 4321, mnt1: 'OK', mnt2: 'OK', mnt3: 'OK', ...o }) + '\n';
  const res = (o = {}) => ({ status: 1, error: null, signal: null, timedOut: false, stdout: '', stderr: ev() + po(), ...o });
  const resB = (o = {}) => ({ status: 0, error: null, signal: null, timedOut: false, stdout: 'VERDE\n', stderr: ba(), ...o });
  const controles = [
    ['status 0', res({ status: 0 })],
    ['status 2', res({ status: 2 })],
    ['status null', res({ status: null })],
    ['error de spawn', res({ error: { code: 'ENOENT', message: 'spawn ENOENT' } })],
    ['signal SIGKILL', res({ signal: 'SIGKILL' })],
    ['timeout', res({ error: { code: 'ETIMEDOUT' } })],
    ['sem evidência', res({ stderr: po() })],
    ['evidência dupla', res({ stderr: ev() + ev() + po() })],
    ['sem POST', res({ stderr: ev() })],
    ['POST duplo', res({ stderr: ev() + po() + po() })],
    ['POST errado', res({ stderr: ev() + po({ map: 'fy_lajes' }) })],
    ['POST cláusula verde', res({ stderr: ev() + po({ mnt2: 'OK' }) })],
    ['tool errado', res({ stderr: ev({ tool: 'outro' }) + po() })],
    ['map errado', res({ stderr: ev({ map: 'fy_corrego' }) + po() })],
    ['mutante errado', res({ stderr: ev({ mutant: 'beirada-alta' }) + po() })],
    ['applied false', res({ stderr: ev({ applied: false }) + po() })],
    ['sem cláusula própria', res({ stderr: ev({ clauses: ['MNT1'] }) + po() })],
    ['infra misturada', res({ stderr: ev({ status: 'infra' }) + po() })],
    ['corpo não-JSON', res({ stderr: EVID + 'TypeError: invalid reference\n' + po() })],
    ['evidência null', res({ stderr: EVID + 'null\n' + po() })],
    ['evidência array', res({ stderr: EVID + '[1]\n' + po() })],
    ['evidência string', res({ stderr: EVID + '"x"\n' + po() })],
    ['evidência número', res({ stderr: EVID + '5\n' + po() })],
    ['POST null', res({ stderr: ev() + POST + 'null\n' })],
    ['POST array', res({ stderr: ev() + POST + '[1,2]\n' })],
    ['POST string', res({ stderr: ev() + POST + '"x"\n' })],
    ['POST número', res({ stderr: ev() + POST + '7\n' })],
    ['POST sem medição', res({ stderr: ev() + po({ celulas: 0 }) })],
  ];
  /* Negativos de baseline: vazia/SKIP, duplicado, mapa errado, cláusula não medida/falha. */
  const controlesBaseline = [
    ['baseline PULOU sem medição', resB({ stdout: 'PULOU: sem medição\n', stderr: '' })],
    ['baseline relatório duplo', resB({ stderr: ba() + ba() })],
    ['baseline mapa errado', resB({ stderr: ba({ map: 'fy_corrego' }) })],
    ['baseline com mutante', resB({ stderr: ba({ mutant: 'beirada-baixa' }) })],
    ['baseline cláusula SKIP', resB({ stderr: ba({ mnt2: 'SKIP' }) })],
    ['baseline cláusula pertinente N/A', resB({ stderr: ba({ mnt2: 'N/A' }) })],
    ['baseline cláusula FALHA', resB({ stderr: ba({ mnt2: 'FALHA' }) })],
    ['baseline sem contagem', resB({ stderr: ba({ celulas: 0 }) })],
    ['baseline corpo não-JSON', resB({ stderr: BASE + 'PULOU: sem medição\n' })],
    ['baseline relatório null', resB({ stderr: BASE + 'null\n' })],
    ['baseline relatório array', resB({ stderr: BASE + '[1,2]\n' })],
    ['baseline relatório string', resB({ stderr: BASE + '"x"\n' })],
    ['baseline relatório número', resB({ stderr: BASE + '7\n' })],
    ['baseline com marca de mutante', resB({ stderr: ba() + ev() })],
  ];
  let maus = 0;
  if (validar(res(), caso, false)) { console.error('self-test: candidato VÁLIDO foi recusado'); maus++; }
  if (validar(resB(), caso, true)) { console.error('self-test: baseline VÁLIDA foi recusada'); maus++; }
  for (const [nome, r] of controles)
    if (!validar(r, caso, false)) { console.error(`self-test: controle "${nome}" foi ACEITO`); maus++; }
  for (const [nome, r] of controlesBaseline)
    if (!validar(r, caso, true)) { console.error(`self-test: controle "${nome}" foi ACEITO`); maus++; }
  console.log(`self-test: ${controles.length + controlesBaseline.length} controles + 2 candidatos válidos — ${maus} desvio(s)`);
  return maus;
}


/* Controles novos usam os validadores reais; não substituem as corridas do motor. */
function selfTestAdicoes() {
  const resultado = (caso, status, extra = {}, postExtra = {}, evExtra = {}) => ({
    status, error: null, signal: null, timedOut: false, stdout: '',
    stderr: EVID + JSON.stringify({ tool: 'mantle-check', map: caso.mapa, mutant: caso.mutante, applied: true, clauses: [caso.clausula], mecanismo: '_stepMantle', aplicacoes: 1, ...evExtra }) + '\n' +
      POST + JSON.stringify({ tool: 'mantle-check', map: caso.mapa, mutant: caso.mutante, celulas: 4321, mnt1: 'OK', mnt2: 'OK', mnt3: 'OK', [caso.chave]: caso.nominal ? 'OK' : 'FALHA', ...postExtra }) + '\n', ...extra,
  });
  const xz = CASOS[2], nan = CASOS[3], on = { ...CANAL, nominal: true }, off = { ...CANAL, nominal: false };
  const causal = { antes: { x: 0, y: 0, z: 0 }, pouso: { x: 1, y: 1, z: 0 }, mantleAntes: true, mantleDepois: false, pousoFinito: true, aposInjecaoFinito: false };
  const medidas = { depressoes: 211, semSaida: 0, piorSaidaSReal: 0.73, tMax: 2 };
  const motor = { status: 2, error: null, signal: null, timedOut: false, stdout: '', stderr: EVID + JSON.stringify({ tool: 'mantle-check', map: 'corrego', mutant: 'motor-explode', applied: true, clauses: [], status: 'infra', aplicacoes: 1 }) + '\nINFRA (exit 2): MNT2 runtime — Error: mutante causal: _updatePlayer explodiu\n' };
  const controles = [
    ['XZ válido', null, () => validar(resultado(xz, 1), xz, false)],
    ['XZ não aplicado', 'erro', () => validar(resultado(xz, 1, {}, {}, { aplicacoes: 0 }), xz, false)],
    ['NaN válido', null, () => validar(resultado(nan, 1, {}, {}, { causal }), nan, false)],
    ['NaN sem causa', 'erro', () => validar(resultado(nan, 1), nan, false)],
    ['NaN causa nula', 'erro', () => validar(resultado(nan, 1, {}, {}, { causal: null }), nan, false)],
    ['NaN pose não finita', 'erro', () => validar(resultado(nan, 1, {}, {}, { causal: { ...causal, pouso: { x: null, y: 1, z: 0 } } }), nan, false)],
    ['canal ON válido', null, () => validar(resultado(on, 0, {}, medidas), on, false)],
    ['canal ON exit1', 'erro', () => validar(resultado(on, 1, {}, medidas), on, false)],
    ['canal ON fórmula divergente', 'erro', () => validar(resultado(on, 0, {}, { ...medidas, piorSaidaSReal: 2.4 }), on, false)],
    ['canal OFF por duração', null, () => validar(resultado(off, 1, {}, { ...medidas, piorSaidaSReal: 2.4 }), off, false)],
    ['canal OFF sem saída', null, () => validar(resultado(off, 1, {}, { ...medidas, semSaida: 1 }), off, false)],
    ['canal OFF não falhou', 'erro', () => validar(resultado(off, 1, {}, medidas), off, false)],
    ['canal sem aplicação', 'erro', () => validar(resultado(on, 0, {}, medidas, { aplicacoes: 0 }), on, false)],
    ['motor infra válido', null, () => validarInfra(motor, 'motor')],
    ['motor exit1', 'erro', () => validarInfra({ ...motor, status: 1 }, 'motor')],
    ['motor erro alheio', 'erro', () => validarInfra({ ...motor, stderr: motor.stderr.replace('Error: mutante causal: _updatePlayer explodiu', 'TypeError: falha alheia') }, 'motor')],
    ['motor sem evidência', 'erro', () => validarInfra({ ...motor, stderr: motor.stderr.split('\n').slice(1).join('\n') }, 'motor')],
  ];
  let maus = 0;
  for (const [nome, esperado, executar] of controles) {
    const motivo = executar();
    if ((esperado === null) !== (motivo === null)) { console.error(`self-test adicional: ${nome} — resultado inesperado ${motivo}`); maus++; }
  }
  console.log(`self-test adicional: ${controles.length} controles de integração — ${maus} desvio(s)`);
  return maus;
}

const args = process.argv.slice(2);
if (args.length === 0) provaReal();
else if (args.length === 1 && args[0] === '--self-test') process.exit(selfTest() + selfTestAdicoes() === 0 ? 0 : 2);
else { console.error('uso: node tools/eval/mantle-mutants-check.mjs [--self-test]'); process.exit(2); }
