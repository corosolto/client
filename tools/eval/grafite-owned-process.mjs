#!/usr/bin/env node
// grafite-owned-process.mjs — processo em grupo próprio POSIX + página Ego própria com recibo (F4 R33).
// Ladder TERM1/grace/TERM2/grace/KILL provado em audits/2026-10-31-visual-consistency/GRAFITE-HEADLESS-LIFETIME-R31/R32.json.
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { openSync, fstatSync, readSync, closeSync, constants } from 'node:fs';
import { join } from 'node:path';

export const OWNED_NAMESPACE = 'corosolto.grafite.owned.v1';
const PAGE_LABEL = /^p[1-9]\d*$/;
const POSIX = ['darwin', 'linux', 'freebsd', 'openbsd', 'sunos', 'aix'];
const RECEIPT_MAX = 64 * 1024;
const egoBin = (env) => env.EGO_BROWSER_BIN || 'ego-browser';

const sono = (ms) => new Promise((r) => setTimeout(r, ms));
// Corrida com prazo que SEMPRE cancela o timer ao resolver: nenhum timer órfão segura o Node.
function esperaComPrazo(promise, ms, padrao) {
  let timer;
  const atraso = new Promise((r) => { timer = setTimeout(() => r(padrao), Math.max(0, ms)); });
  return Promise.race([promise, atraso]).finally(() => clearTimeout(timer));
}

function optLimita(opcoes, chave, min, max, padrao) {
  const v = opcoes[chave] ?? padrao;
  if (!Number.isInteger(v) || v < min || v > max) throw new TypeError(`opção ${chave}: inteiro ${min}..${max} exigido`);
  return v;
}

function listaRotulos(v) {
  return Array.isArray(v) && v.every((x) => typeof x === 'string' && PAGE_LABEL.test(x)) && new Set(v).size === v.length;
}

// Validador PURO de recibo: tipos estritos em todos os campos antes de qualquer regex.
export function validOwnedReceipt(receipt, expected) {
  const ruim = (motivo) => ({ ok: false, reason: motivo });
  if (!expected || !['allocated', 'closed'].includes(expected.kind)) return ruim('expectativa inválida');
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) return ruim('recibo não é objeto');
  if (typeof receipt.namespace !== 'string' || receipt.namespace !== OWNED_NAMESPACE) return ruim('namespace');
  if (typeof receipt.nonce !== 'string' || receipt.nonce !== expected.nonce) return ruim('nonce');
  if (!Number.isSafeInteger(receipt.space) || receipt.space !== expected.space) return ruim('space');
  if (typeof receipt.kind !== 'string' || receipt.kind !== expected.kind) return ruim('kind');
  if (typeof receipt.page !== 'string' || !PAGE_LABEL.test(receipt.page)) return ruim('page');
  if (expected.page !== undefined && receipt.page !== expected.page) return ruim('page divergente do lease');
  if (expected.protected !== undefined && receipt.page === expected.protected) return ruim('page protegida do caller');
  if (receipt.openedBy !== 'agent') return ruim('openedBy');
  if (receipt.kind === 'allocated') {
    if (!listaRotulos(receipt.before)) return ruim('before');
    if (receipt.before.includes(receipt.page)) return ruim('page já constava em before');
    return { ok: true, reason: null };
  }
  if (receipt.absent !== true) return ruim('absent');
  if (!listaRotulos(receipt.after)) return ruim('after');
  if (receipt.after.includes(receipt.page)) return ruim('page ainda presente em after');
  for (const b of expected.before || []) if (!receipt.after.includes(b)) return ruim(`before ${b} sumiu de after`);
  return { ok: true, reason: null };
}

const privados = new WeakMap();
function marcaLease(dados) {
  const lease = Object.freeze({ namespace: dados.namespace, nonce: dados.nonce, space: dados.space, page: dados.page });
  privados.set(lease, Object.freeze({ ...dados, before: Object.freeze([...dados.before]) }));
  return lease;
}
function dadosLease(lease) {
  if (!lease || typeof lease !== 'object' || !privados.has(lease)) throw Error('lease não emitido por este helper');
  const d = privados.get(lease);
  for (const k of ['namespace', 'nonce', 'space', 'page']) {
    if (lease[k] !== d[k]) throw Error('lease mutado ou forjado: ' + k);
  }
  return d;
}

// O filho detached é líder do próprio grupo: PGID === PID do filho. Só este grupo é sinalizado.
function grupoExiste(pgid) {
  if (!Number.isSafeInteger(pgid) || pgid <= 0) return false;
  try { process.kill(-pgid, 0); return true; }
  catch (e) { if (e.code === 'ESRCH') return false; return null; }
}

async function esperaAusente(pgid, ms, parado = () => false) {
  const fim = Date.now() + ms;
  for (;;) {
    if (parado()) return false;
    const e = grupoExiste(pgid);
    if (e === false) return true;
    if (e === null || Date.now() >= fim) return false;
    await sono(Math.min(50, Math.max(1, fim - Date.now())));
  }
}

// fence=true interrompe a escada: nunca sinaliza de novo um grupo já aposentado.
async function escada(pgid, graceMs, killWaitMs, parado = () => false) {
  if (!Number.isSafeInteger(pgid) || pgid <= 0 || parado()) return { contained: false };
  const sinal = (s) => { try { process.kill(-pgid, s); return true; } catch (e) { if (e.code === 'ESRCH') return false; if (e.code === 'EPERM') return null; throw e; } };
  if (grupoExiste(pgid) === false) return { contained: true };
  if (grupoExiste(pgid) === null) return { contained: false };
  if (sinal('SIGTERM') === null) return { contained: false };
  if (await esperaAusente(pgid, graceMs, parado)) return { contained: true };
  if (grupoExiste(pgid) === null) return { contained: false };
  if (parado()) return { contained: false };
  if (sinal('SIGTERM') === null) return { contained: false };
  if (await esperaAusente(pgid, graceMs, parado)) return { contained: true };
  if (parado()) return { contained: false };
  if (sinal('SIGKILL') === null) return { contained: false };
  return { contained: await esperaAusente(pgid, killWaitMs, parado) };
}

export async function runOwnedProcess(file, args, options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) throw new TypeError('options: objeto exigido');
  if (typeof file !== 'string' || !file) throw new TypeError('file: string não vazia exigida');
  if (!Array.isArray(args) || !args.every((a) => typeof a === 'string')) throw new TypeError('args: array de strings exigido');
  const timeoutMs = optLimita(options, 'timeoutMs', 1, 150000, 150000);
  const graceMs = optLimita(options, 'graceMs', 0, 900, 900);
  const killWaitMs = optLimita(options, 'killWaitMs', 1, 1000, 1000);
  const maxBuffer = optLimita(options, 'maxBuffer', 1, 8 * 1024 * 1024, 8 * 1024 * 1024);
  if (options.cwd !== undefined && typeof options.cwd !== 'string') throw new TypeError('cwd: string exigida');
  if (options.env !== undefined && (typeof options.env !== 'object' || options.env === null || Array.isArray(options.env))) throw new TypeError('env: objeto exigido');
  if (options.input !== undefined && typeof options.input !== 'string') throw new TypeError('input: string exigida');
  if (options.signal !== undefined && (!options.signal || typeof options.signal !== 'object' || typeof options.signal.aborted !== 'boolean'
    || typeof options.signal.addEventListener !== 'function' || typeof options.signal.removeEventListener !== 'function')) throw new TypeError('signal: AbortSignal exigido');
  if (options.signal?.aborted) throw new Error('signal já abortado antes do spawn');
  if (!POSIX.includes(process.platform)) throw new Error('contenção por grupo próprio não suportada nesta plataforma');
  // Orçamento total do runner: trabalho + 2 estágios de graça + espera do kill.
  const prazo = Date.now() + timeoutMs + 2 * graceMs + killWaitMs;
  const restante = () => prazo - Date.now();

  const filho = spawn(file, args, { detached: true, cwd: options.cwd, env: options.env, stdio: ['pipe', 'pipe', 'pipe'] });
  const pgid = Number.isSafeInteger(filho.pid) && filho.pid > 0 ? filho.pid : null;
  const saida = [], erroSaida = [];
  let outN = 0, errN = 0, overflow = false, timedOut = false, aborted = false;
  let erro = null, saidaExit = null, fechado = false, terminado = false, parando = null, residual = false;
  let acorda;
  const primeiroEvento = new Promise((r) => { acorda = r; });
  const iniciaParada = () => {
    if (terminado || !pgid) return;
    parando ??= escada(pgid, graceMs, killWaitMs, () => terminado).catch(() => ({ contained: false }));
  };

  filho.once('error', (e) => { if (!terminado) { erro ??= e; iniciaParada(); acorda(); } });
  filho.once('exit', (status, signal) => { if (!terminado) { saidaExit = { status, signal }; acorda(); } });
  const closeP = new Promise((res) => filho.once('close', () => { fechado = true; acorda(); res(true); }));
  const timer = setTimeout(() => { if (!terminado) { timedOut = true; iniciaParada(); acorda(); } }, timeoutMs);
  const onAbort = () => { if (!terminado) { aborted = true; iniciaParada(); acorda(); } };

  // EPIPE do stdin vira erro infra com stop limitado; nunca unhandledError que pule o finally.
  filho.stdin.on('error', (e) => {
    if (terminado) return;
    erro ??= e && e.code === 'EPIPE' ? new Error('stdin EPIPE: filho não consumiu a entrada') : e;
    iniciaParada();
    acorda();
  });
  // Teto COMBINADO de stdout+stderr: cada stream individual não vale nada sozinha.
  const capta = (d, lista) => {
    if (terminado) return;
    if (overflow || outN + errN + d.length > maxBuffer) { overflow = true; iniciaParada(); acorda(); }
    else { lista.push(d); if (lista === saida) outN += d.length; else errN += d.length; }
  };
  filho.stdout.on('data', (d) => capta(d, saida));
  filho.stderr.on('data', (d) => capta(d, erroSaida));

  try {
    options.signal?.addEventListener('abort', onAbort, { once: true });
    if (options.signal?.aborted) onAbort();
    try { if (options.input !== undefined) filho.stdin.end(options.input); else filho.stdin.end(); }
    catch (e) { erro ??= e; iniciaParada(); acorda(); }
    await primeiroEvento;
    clearTimeout(timer);
    // Grupo residual do próprio filho é contido AGORA, não depois do prazo total.
    if (pgid && !parando && grupoExiste(pgid) !== false) { residual = true; iniciaParada(); }
    let contencao = { contained: true };
    if (pgid) {
      if (parando) contencao = await esperaComPrazo(parando, Math.max(1, restante()), { contained: false });
      else contencao = { contained: grupoExiste(pgid) === false };
    }
    const grupoAusente = !pgid || (contencao.contained && grupoExiste(pgid) === false);
    // Close é esperado até o prazo total mesmo com pipe held; sem close, erro — nunca hang.
    const encerrou = fechado || (await esperaComPrazo(closeP, Math.max(1, restante()), false));
    if (!encerrou) erro ??= new Error('pipes do filho não encerraram dentro do prazo total');
    residual ||= !!pgid && !grupoAusente;
    return finaliza({ status: saidaExit ? saidaExit.status : null, signal: saidaExit ? saidaExit.signal : null, error: erro, contained: grupoAusente && encerrou, residual });
  } catch (e) {
    erro ??= e;
    iniciaParada();
    const stopped = !pgid ? true : parando && (await esperaComPrazo(parando, Math.max(1, restante()), { contained: false })).contained;
    const encerrou = fechado || (await esperaComPrazo(closeP, Math.max(1, restante()), false));
    const contido = !!stopped && (!pgid || grupoExiste(pgid) === false) && encerrou;
    return finaliza({ status: saidaExit?.status ?? null, signal: saidaExit?.signal ?? null, error: erro, contained: contido, residual: !!pgid && !contido });
  } finally {
    terminado = true;
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);
    for (const s of [filho.stdin, filho.stdout, filho.stderr]) s.destroy();
    filho.unref();
  }

  function finaliza(info) {
    return {
      status: info.status, signal: info.signal ?? null, error: info.error ?? null,
      timedOut, aborted, overflow,
      stdout: Buffer.concat(saida).toString('utf8'), stderr: Buffer.concat(erroSaida).toString('utf8'),
      ownpid: pgid, pgid, contained: !!info.contained, residual: !!info.residual,
    };
  }
}

function unicaAck(stdout, prefixo) {
  const linhas = String(stdout).split('\n').filter((l) => l.startsWith(prefixo));
  return linhas.length === 1 ? linhas[0].slice(prefixo.length) : null;
}

// Recibo só entra por arquivo regular pequeno: symlink/oversize/não-regular são rejeitados sem leitura.
function lerReciboLimitado(caminho) {
  let fd;
  try {
    fd = openSync(caminho, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const st = fstatSync(fd);
    if (!st.isFile()) return { erro: 'não é arquivo regular' };
    if (st.size > RECEIPT_MAX) return { erro: `maior que ${RECEIPT_MAX} bytes` };
    const bytes = Buffer.alloc(RECEIPT_MAX + 1);
    let n = 0, lidos;
    while (n < bytes.length && (lidos = readSync(fd, bytes, n, bytes.length - n, null)) > 0) n += lidos;
    if (n > RECEIPT_MAX) return { erro: `maior que ${RECEIPT_MAX} bytes` };
    return { bruto: bytes.subarray(0, n).toString('utf8') };
  } catch (e) { return e.code === 'ENOENT' ? { bruto: null } : { erro: e.message }; }
  finally { if (fd !== undefined) closeSync(fd); }
}

// ACK único precisa ser JSON válido com exatamente o mesmo conteúdo do recibo em arquivo.
function ackConfere(ack, recibo) {
  if (!ack || typeof ack !== 'object' || Array.isArray(ack)) return false;
  const chaves = Object.keys(recibo);
  if (Object.keys(ack).length !== chaves.length) return false;
  return chaves.every((k) => JSON.stringify(ack[k]) === JSON.stringify(recibo[k]));
}

export async function allocateOwnedEgoPage({ space, rounddir, env = process.env }) {
  if (!Number.isSafeInteger(space) || space <= 0) throw new TypeError('allocateOwnedEgoPage: space inteiro positivo exigido');
  if (typeof rounddir !== 'string' || !rounddir) throw new TypeError('allocateOwnedEgoPage: rounddir exigido');
  const nonce = randomUUID();
  const receiptPath = join(rounddir, `alloc-${randomUUID()}.json`);
  const protegida = typeof env.EGO_PAGE === 'string' && PAGE_LABEL.test(env.EGO_PAGE) ? env.EGO_PAGE : undefined;
  const input = { namespace: OWNED_NAMESPACE, nonce, space, receiptPath, protected: protegida || null };
  // Tipos do SDK são checados crus; rollback só fecha página NOVA do agente ausente de before/protected.
  const script = `
const input = ${JSON.stringify(input)};
const fs = await import('node:fs/promises');
const task = await taskSpace(input.space);
const rotulo = (p) => (p && typeof p.label === 'string') ? p.label : null;
const primeira = await task.pages();
if (!Array.isArray(primeira)) throw Error('pages fora do contrato');
const before = primeira.map(rotulo);
if (before.some((l) => l === null || !/^p[1-9]\\d*$/.test(l)) || new Set(before).size !== before.length) throw Error('label fora do contrato');
const page = await task.newPage();
const nova = rotulo(page);
const abertaPor = page.openedBy === 'agent' ? 'agent' : 'unknown';
const recibo = { namespace: input.namespace, nonce: input.nonce, kind: 'allocated', space: input.space,
  page: nova === null ? '' : nova, openedBy: abertaPor, before };
const fechaNova = async () => {
  const agora = await task.pages();
  if (!Array.isArray(agora) || nova === null || !/^p[1-9]\\d*$/.test(nova) || before.includes(nova) || nova === input.protected) return;
  const alvo = agora.find((p) => rotulo(p) === nova);
  if (alvo && alvo.openedBy === 'agent') { try { await alvo.close(); } catch {} }
};
if (nova === null || abertaPor !== 'agent' || !/^p[1-9]\\d*$/.test(recibo.page) || before.includes(nova)
  || nova === input.protected) { await fechaNova(); throw Error('alocação fora do contrato: ' + recibo.page + '/' + abertaPor); }
try { await fs.writeFile(input.receiptPath, JSON.stringify(recibo) + '\\n', { flag: 'wx' }); }
catch (e) { await fechaNova(); console.log('GRAFITE_OWNED_ERR=' + String(e && e.message)); throw e; }
console.log('GRAFITE_OWNED_ACK=' + JSON.stringify(recibo));
`;
  const expected = { nonce, space, kind: 'allocated', protected: protegida };
  let r;
  try {
    r = await runOwnedProcess(egoBin(env), ['nodejs'], {
      input: script, timeoutMs: 7000, graceMs: 900, killWaitMs: 1000, maxBuffer: 1024 * 1024, cwd: rounddir, env,
    });
  } catch (e) {
    return terminaAlocacao(receiptPath, expected, null, `controle de alocação não rodou: ${e.message}`);
  }
  const cliOk = !r.error && !r.signal && r.status === 0 && !r.timedOut && !r.aborted && !r.overflow && r.contained && !r.residual;
  const ack = cliOk ? unicaAck(r.stdout + '\n' + r.stderr, 'GRAFITE_OWNED_ACK=') : null;
  const ackObj = ack !== null ? parseJson(ack) : null;
  const erroCli = !cliOk
    ? `controle de alocação falhou: ${r.error ? r.error.message : 'status ' + r.status + (r.overflow ? ' overflow' : '') + (r.contained ? '' : ' sem contenção') + (r.residual ? ' residual' : '')}`
    : ackObj === null ? 'ACK de alocação ausente, duplicado ou sem JSON válido' : null;
  return terminaAlocacao(receiptPath, expected, ackObj, erroCli);
}

function parseJson(texto) {
  try { return JSON.parse(texto); } catch { return null; }
}

function terminaAlocacao(receiptPath, expected, ackObj, erroCli) {
  const lido = lerReciboLimitado(receiptPath);
  if (lido.erro) return { ok: false, lease: null, error: `recibo de alocação rejeitado: ${lido.erro}` };
  const receipt = lido.bruto !== null ? parseJson(lido.bruto) : null;
  if (!receipt) return { ok: false, lease: null, error: erroCli || 'recibo de alocação ausente ou JSON inválido' };
  const v = validOwnedReceipt(receipt, expected);
  if (!v.ok) return { ok: false, lease: null, error: `recibo de alocação inválido: ${v.reason}` };
  if (erroCli) return { ok: false, lease: marcaLease(receipt), error: erroCli + ' (lease de recuperação emitido para o finally)' };
  if (!ackConfere(ackObj, receipt)) return { ok: false, lease: marcaLease(receipt), error: 'ACK de alocação diverge do recibo em arquivo (lease de recuperação emitido para o finally)' };
  return { ok: true, lease: marcaLease(receipt), error: null };
}

export async function closeOwnedEgoPage(lease, { rounddir, env = process.env } = {}) {
  const d = dadosLease(lease);
  if (typeof rounddir !== 'string' || !rounddir) throw new TypeError('closeOwnedEgoPage: rounddir exigido');
  const receiptPath = join(rounddir, `close-${randomUUID()}.json`);
  const input = { namespace: d.namespace, nonce: d.nonce, space: d.space, page: d.page, receiptPath };
  const script = `
const input = ${JSON.stringify(input)};
const fs = await import('node:fs/promises');
const task = await taskSpace(input.space);
const rotulo = (p) => (p && typeof p.label === 'string') ? p.label : null;
const paginas = await task.pages();
if (!Array.isArray(paginas)) throw Error('pages fora do contrato');
const alvo = paginas.find((p) => rotulo(p) === input.page);
if (alvo) {
  if (alvo.openedBy !== 'agent') { console.log('GRAFITE_OWNED_ERR=página ' + input.page + ' não é do agente'); throw Error('not-owned'); }
  await alvo.close();
}
const depois = await task.pages();
if (!Array.isArray(depois)) throw Error('pages fora do contrato');
const after = depois.map(rotulo);
if (after.some((l) => l === null)) throw Error('label fora do contrato');
const recibo = { namespace: input.namespace, nonce: input.nonce, kind: 'closed', space: input.space,
  page: input.page, openedBy: 'agent', absent: !after.includes(input.page), after };
if (!recibo.absent) throw Error('página ' + input.page + ' continua presente após close');
try { await fs.writeFile(input.receiptPath, JSON.stringify(recibo) + '\\n', { flag: 'wx' }); }
catch (e) { console.log('GRAFITE_OWNED_ERR=' + String(e && e.message)); throw e; }
console.log('GRAFITE_OWNED_ACK=' + JSON.stringify(recibo));
`;
  // Cleanup tem orçamento próprio: nunca herda o signal já abortado do trabalho.
  const r = await runOwnedProcess(egoBin(env), ['nodejs'], {
    input: script, timeoutMs: 7000, graceMs: 900, killWaitMs: 1000, maxBuffer: 1024 * 1024, cwd: rounddir, env,
  });
  const cliOk = !r.error && !r.signal && r.status === 0 && !r.timedOut && !r.aborted && !r.overflow && r.contained && !r.residual;
  const ack = cliOk ? unicaAck(r.stdout + '\n' + r.stderr, 'GRAFITE_OWNED_ACK=') : null;
  const ackObj = ack !== null ? parseJson(ack) : null;
  const erro = !cliOk ? `controle de close falhou: ${r.error ? r.error.message : 'status ' + r.status + (r.contained ? '' : ' sem contenção') + (r.residual ? ' residual' : '')}`
    : ackObj === null ? 'close sem ACK único com JSON válido' : null;
  if (erro) throw new Error(erro);
  const lido = lerReciboLimitado(receiptPath);
  if (lido.erro) throw new Error('recibo de close rejeitado: ' + lido.erro);
  const receipt = lido.bruto !== null ? parseJson(lido.bruto) : null;
  if (!receipt) throw new Error('recibo de close ausente ou JSON inválido');
  const v = validOwnedReceipt(receipt, { nonce: d.nonce, space: d.space, kind: 'closed', page: d.page, before: d.before });
  if (!v.ok) throw new Error('recibo de close inválido: ' + v.reason);
  if (!ackConfere(ackObj, receipt)) throw new Error('ACK de close diverge do recibo em arquivo');
  privados.delete(lease);
  return { ok: true, page: d.page };
}
