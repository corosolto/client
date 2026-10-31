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
];
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
  if (res.status !== 1) return `mutante exit ${res.status} (morte semântica é exit 1, nunca !/signal/timeout genérico)`;
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
  if (p.tool !== 'mantle-check' || p.map !== caso.mapa || p.mutant !== caso.mutante)
    return 'POST com identificação errada';
  if (!Number.isInteger(p.celulas) || p.celulas < 1) return `POST celulas=${p.celulas} (exige contagem real >= 1)`;
  for (const k of ['mnt1', 'mnt2', 'mnt3'])
    if (!ESTADOS.includes(p[k])) return `POST ${k}=${p[k]} (estado MNT real é OK/N/A/FALHA)`;
  if (p[caso.chave] !== 'FALHA') return `POST ${caso.chave}=${p[caso.chave]} (exige FALHA específica)`;
  return null;
}

function rodar(args) {
  const r = spawnSync(process.execPath, [CHECK, ...args],
    { timeout: TIMEOUT_MS, maxBuffer: MAXBUF, encoding: 'utf8' });
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

const args = process.argv.slice(2);
if (args.length === 0) provaReal();
else if (args.length === 1 && args[0] === '--self-test') process.exit(selfTest() === 0 ? 0 : 2);
else { console.error('uso: node tools/eval/mantle-mutants-check.mjs [--self-test]'); process.exit(2); }
