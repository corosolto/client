#!/usr/bin/env node
// graffiti-bake-fiel-check.mjs — assar o mesmo mapa duas vezes dá o mesmo grafite (#1109).
// Contrato, histórico e uso: docs/reports/GRAFITE-FIEL-PROOF-CONTINUATION-20261031.md
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync, openSync, closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { runOwnedProcess, allocateOwnedEgoPage, closeOwnedEgoPage } from './grafite-owned-process.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ARGS = process.argv.slice(2);
const PREFIXOS = ['--mutante=', '--mapa=', '--derruba='];
const uso = (msg) => { console.error(msg); process.exit(2); };
const arg = (k) => {
  const prefix = `--${k}=`;
  const a = ARGS.find((x) => x.startsWith(prefix));
  if (!a) return '';
  const v = a.slice(prefix.length);
  if (!v) uso(`valor vazio em ${prefix}`);
  return v;
};

for (const a of ARGS) if (!PREFIXOS.some((p) => a.startsWith(p))) uso(`argumento desconhecido: ${a}`);
const MUT = arg('mutante');
const MAPA = arg('mapa') || 'loja_h';
const DERRUBA_ARG = arg('derruba');
const DERRUBA = { loja_h: 'statue_liberty\\.glb' }[MAPA] || DERRUBA_ARG;
if (MUT && MUT !== 'engole-falta') uso(`mutante desconhecido: ${MUT}`);
if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(MAPA)) uso(`mapa inválido: ${MAPA} (use letras, dígitos e _, começando por letra)`);
if (!process.env.BASE) uso('BASE ausente: suba node tools/eval/serve.mjs <porta> e passe BASE=http://127.0.0.1:<porta>');
if (!DERRUBA) uso(`sem GLB conhecido para derrubar em ${MAPA}: passe --derruba=<regex>`);
try { new RegExp(DERRUBA); } catch (e) { uso(`--derruba não é regex válida: ${e.message}`); }
if (DERRUBA_ARG !== undefined) { try { new RegExp(DERRUBA_ARG); } catch (e) { uso(`--derruba fornecida não é regex válida: ${e.message}`); } }
const EGO_TASK_SPACE = process.env.EGO_TASK_SPACE === undefined ? null : Number(process.env.EGO_TASK_SPACE);
if (EGO_TASK_SPACE !== null && (!Number.isSafeInteger(EGO_TASK_SPACE) || EGO_TASK_SPACE <= 0)) uso('EGO_TASK_SPACE inválido: inteiro positivo esperado');

const GERADOR = join(ROOT, 'tools', 'gen-graffiti-layout.mjs');
const MSG_CANCELAMENTO = new RegExp(`${MAPA}: \\d+ entrada\\(s\\) faltando na cena; bake cancelado, layout anterior preservado:`);
// Diagnóstico fatal no filho é infra (exit 3), nunca evidência semântica, mesmo com exit 0 e checkpoint presente.
const FATAL = /SyntaxError|TypeError|ReferenceError|ERR_MODULE_NOT_FOUND|ERR_UNKNOWN_FILE_EXTENSION|ENOBUFS|ETIMEDOUT|ECONNREFUSED|setup/i;
const HEX16 = /^[0-9a-f]{16}$/, HEX64 = /^[0-9a-f]{64}$/;
// Prazo absoluto por assa: alocação <=10s + trabalho 150s + stop <=2.8s + cleanup <=10s < helper 180s.
const RESERVA_CLEANUP_MS = 10000;
const ASSA_PRAZO_MS = 174000;
let gerador = GERADOR, copiaPropria = null, tmp = null;
const falhas = [];
let infraErro = null, retencaoTmp = false;

function tuplePecaValido(t, nArquivos, i) {
  if (!Array.isArray(t) || t.length !== 7) return `peça ${i} não é 7-tupla`;
  const [fi, x, y, z, ry, w, h] = t;
  if (!Number.isSafeInteger(fi) || fi < 0 || fi >= nArquivos) return `peça ${i}: índice ${fi} fora de arquivos (${nArquivos})`;
  if (![x, y, z, ry, w, h].every(Number.isFinite)) return `peça ${i}: coordenada não finita`;
  if (!(w > 0 && h > 0)) return `peça ${i}: largura/altura não positivas`;
  return null;
}

function tupleMuralValido(t, i) {
  if (!Array.isArray(t) || t.length !== 7) return `mural ${i} não é 7-tupla`;
  const [nome, x, y, z, ry, w, h] = t;
  if (typeof nome !== 'string' || !nome.length) return `mural ${i}: nome vazio`;
  if (![x, y, z, ry, w, h].every(Number.isFinite)) return `mural ${i}: coordenada não finita`;
  if (!(w > 0 && h > 0)) return `mural ${i}: largura/altura não positivas`;
  return null;
}

function layoutValido(layout) {
  if (!layout || typeof layout !== 'object' || Array.isArray(layout)) return 'layout ausente ou não-objeto';
  if (!Array.isArray(layout.arquivos) || !layout.arquivos.length) return 'arquivos ausente ou vazio';
  if (!layout.arquivos.every((a) => typeof a === 'string' && a.length)) return 'arquivo com nome vazio';
  if (!Array.isArray(layout.pecas) || !layout.pecas.length) return 'pecas ausente ou vazio';
  for (const [i, p] of layout.pecas.entries()) { const e = tuplePecaValido(p, layout.arquivos.length, i); if (e) return e; }
  if (!Array.isArray(layout.murais)) return 'murais ausente';
  for (const [i, m] of layout.murais.entries()) { const e = tupleMuralValido(m, i); if (e) return e; }
  return null;
}

function registroValido(doc) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return 'checkpoint não é objeto';
  if (typeof doc.assets !== 'string' || typeof doc.inputs !== 'string' || !HEX64.test(doc.assets) || !HEX64.test(doc.inputs)) return 'fingerprints assets/inputs inválidos';
  if (!doc.maps || typeof doc.maps !== 'object' || Array.isArray(doc.maps)) return 'maps ausente ou não-objeto';
  if (!Object.hasOwn(doc.maps, MAPA)) return `registro do mapa ${MAPA} ausente`;
  const mapa = doc.maps[MAPA];
  if (!mapa || typeof mapa !== 'object' || Array.isArray(mapa)) return `registro do mapa ${MAPA} não é objeto`;
  if (typeof mapa.pass !== 'string' || typeof mapa.map !== 'string' || !HEX16.test(mapa.pass) || !HEX16.test(mapa.map)) return 'fingerprints pass/map inválidos';
  return null;
}

// Cada assa tem checkpoint e rounddir próprios; o checkpoint só é lido DEPOIS do filho encerrar
// e da página própria ser fechada com ACK — sem cleanup aceito, nenhuma métrica vale.
async function assa(nome, env = {}) {
  const inicio = Date.now();
  const dir = mkdtempSync(join(tmp, `${nome}-`));
  const ck = join(dir, 'checkpoint.json');
  let lease = null;
  const exigeOrçamento = (fase, necessario) => {
    if (cancel.signal.aborted) throw Error(`assa ${nome}: cancelamento externo antes de ${fase}`);
    if (ASSA_PRAZO_MS - (Date.now() - inicio) < necessario) throw Error(`assa ${nome}: orçamento esgotado antes de ${fase}`);
  };
  const trabalhoMs = 150000 + 2 * 900 + 1000;
  const cleanupMs = EGO_TASK_SPACE === null ? 0 : RESERVA_CLEANUP_MS;
  try {
    if (EGO_TASK_SPACE !== null) {
      exigeOrçamento('a alocação da página própria', 9800 + trabalhoMs + cleanupMs);
      const a = await allocateOwnedEgoPage({ space: EGO_TASK_SPACE, rounddir: dir, env: process.env });
      lease = a.lease;
      if (!a.ok) { retencaoTmp = true; throw Error(a.error); }
    }
    exigeOrçamento('o trabalho do filho', trabalhoMs + cleanupMs);
    const r = await runOwnedProcess(process.execPath, [gerador, MAPA, `--checkpoint=${ck}`, '--checkpoint-only'],
      { timeoutMs: 150000, graceMs: 900, killWaitMs: 1000, maxBuffer: 8 * 1024 * 1024, cwd: ROOT,
        env: { ...process.env, ...env, ...(lease ? { EGO_PAGE: lease.page } : {}) }, signal: cancel.signal });
    if (r.error || r.signal || r.status === null || r.timedOut || r.aborted || r.overflow || !r.contained || r.residual) {
      if (!r.contained || r.residual) retencaoTmp = true;
      const motivo = r.error ? r.error.message
        : r.timedOut ? 'timeout do grupo próprio'
        : r.aborted ? 'trabalho abortado por sinal externo'
        : r.overflow ? 'saída acima do maxBuffer'
        : (!r.contained || r.residual) ? 'grupo próprio do filho não encerrou com prova de ausência'
        : 'sinal ' + r.signal;
      return { infra: `filho ${nome}: ${motivo}` };
    }
    const saida = `${r.stdout}\n${r.stderr}`;
    // FATAL deixa de ser decidido aqui: cada consumidor (G1/G2) aplica a régua sobre a sua saída.
    let layout = null, ckErro = null;
    const ckAusente = !existsSync(ck);
    if (!ckAusente) {
      try {
        const doc = JSON.parse(readFileSync(ck, 'utf8'));
        const eReg = registroValido(doc);
        if (eReg) ckErro = `checkpoint ${nome}: ${eReg}`;
        else {
          const e = layoutValido(doc.maps[MAPA].layout);
          if (e) ckErro = `checkpoint ${nome}: ${e}`;
          else layout = doc.maps[MAPA].layout;
        }
      } catch { ckErro = `checkpoint ${nome}: JSON inválido`; }
    } else ckErro = `checkpoint ${nome}: ausente`;
    return { status: r.status, saida, layout, ckErro, ckAusente };
  } finally {
    if (lease) {
      // Cleanup com orçamento próprio (<=10s), mesmo com o signal do trabalho já abortado.
      try { await closeOwnedEgoPage(lease, { rounddir: dir, env: process.env }); }
      catch (e) { retencaoTmp = true; throw Error(`assa ${nome}: cleanup da página própria falhou: ${e.message}`); }
    }
    if (cancel.signal.aborted || cancelado) throw Error(`assa ${nome}: cancelamento externo após cleanup`);
    if (Date.now() - inicio > ASSA_PRAZO_MS) throw Error(`assa ${nome}: prazo absoluto de ${ASSA_PRAZO_MS}ms excedido`);
  }
}

// Envelope estrito de cancelamento: cada warning TypeError precisa estar ligado ao pedido
// do mesmo prop que o DERRUBA bloqueou; qualquer outra entrada é infra, nunca passe livre.
function envelopeCancelamento(saida) {
  const origem = new URL(process.env.BASE).origin;
  const cabecalho = new RegExp(`^Error: ${MAPA}: (\\d+) entrada\\(s\\) faltando na cena; bake cancelado, layout anterior preservado:$`);
  const linhas = saida.split('\n');
  let i = -1, n = 0;
  for (let k = 0; k < linhas.length && i < 0; k++) {
    const m = linhas[k].match(cabecalho);
    if (m) { i = k; n = Number(m[1]); }
  }
  if (i < 0) return { ok: false, reason: 'cabeçalho de cancelamento ausente' };
  if (!Number.isSafeInteger(n) || n < 1) return { ok: false, reason: 'contagem de faltas inválida no cabeçalho' };
  const derruba = new RegExp(DERRUBA);
  const falhos = new Set();
  const avisos = [];
  let entradas = 0;
  for (let j = i + 1; j < linhas.length; j++) {
    const l = linhas[j];
    if (/^\s+at\s/.test(l)) continue;
    if (/^\s*$/.test(l)) continue;
    if (!l.startsWith('    ')) continue;
    const mF = l.match(/^    falhou: (\S+) \((.*)\)$/);
    const mA = l.match(/^    console: map prop load failed (\S+) TypeError: Failed to fetch$/);
    if (mF) {
      let u;
      try { u = new URL(mF[1]); } catch { return { ok: false, reason: 'entrada falhou sem URL válida' }; }
      if (u.origin !== origem) return { ok: false, reason: `URL fora da origem de BASE: ${u.origin}` };
      if (!/^\/models\/props\/[^/]+\.glb$/.test(u.pathname) || !derruba.test(u.pathname))
        return { ok: false, reason: `pedido falho fora do alvo: ${u.pathname}` };
      falhos.add(u.pathname.slice('/models/props/'.length, -'.glb'.length));
    } else if (mA) avisos.push({ index: j, id: mA[1] });
    else return { ok: false, reason: `entrada de falha não reconhecida: ${JSON.stringify(l.slice(0, 80))}` };
    entradas++;
  }
  if (entradas !== n) return { ok: false, reason: `${entradas} entrada(s) listadas, cabeçalho diz ${n}` };
  if (!falhos.size || !avisos.length) return { ok: false, reason: 'falta o par pedido GLB falho + warning esperado' };
  for (const av of avisos) if (!falhos.has(av.id)) return { ok: false, reason: `warning sem pedido falho do mesmo prop: ${av.id}` };
  return { ok: true, avisos: avisos.map((av) => av.index) };
}
function sanitiza(saida, envelope) {
  if (!envelope || !envelope.ok) return saida;
  const linhas = saida.split('\n');
  for (const k of envelope.avisos) linhas[k] = linhas[k].replace('TypeError: Failed to fetch', '');
  return linhas.join('\n');
}

// Sinais externos param o trabalho, mas o cleanup da página própria roda no finally de cada assa.
const cancel = new AbortController();
let cancelado = false;
const aoSinal = () => { cancelado = true; cancel.abort(); };
process.on('SIGINT', aoSinal);
process.on('SIGTERM', aoSinal);

try {
  tmp = mkdtempSync(join(tmpdir(), 'grafite-fiel-'));
  if (MUT === 'engole-falta') {
    // a trava some: falta de entrada volta a ser engolida e o bake segue com a cena incompleta
    const fonte = readFileSync(GERADOR, 'utf8');
    const trava = '  if (faltas.length) {';
    if (fonte.split(trava).length !== 2) throw Error('mutante: trava "if (faltas.length)" ausente ou ambígua no gerador');
    const mutada = fonte.replace(trava, '  if (false) {');
    if (mutada === fonte) throw Error('mutante: substituição da trava não aplicou');
    for (let i = 0; i < 8 && !copiaPropria; i++) {
      const alvo = join(ROOT, 'tools', `__gen-graffiti-mutante-${randomUUID()}.mjs`);
      let fd;
      try { fd = openSync(alvo, 'wx'); }
      catch (e) { if (e.code !== 'EEXIST') throw Error('mutante: cópia exclusiva falhou: ' + e.message); continue; }
      copiaPropria = alvo;
      try { writeFileSync(fd, mutada); }
      finally { closeSync(fd); }
    }
    if (!copiaPropria) throw Error('mutante: sem nome exclusivo disponível para a cópia do gerador');
    gerador = copiaPropria;
    console.log('Mutação aplicada: engole-falta');
  }

  if (!MUT) {
    // Sequencial com checagens entre chamadas: nenhuma assa nova após infra/fatal/schema de a.
    const a = await assa('a');
    if (a.infra) throw Error(a.infra);
    if (FATAL.test(a.saida)) throw Error(`G1: diagnóstico fatal: ${a.saida.slice(-400).replace(/\s+/g, ' ').trim()}`);
    if (a.status !== 0 || a.ckErro) throw Error(`G1 a: filho exit ${a.status}: ${a.ckErro}`);
    const b = await assa('b');
    if (b.infra) throw Error(b.infra);
    if (FATAL.test(b.saida)) throw Error(`G1: diagnóstico fatal: ${b.saida.slice(-400).replace(/\s+/g, ' ').trim()}`);
    if (b.status !== 0 || b.ckErro) throw Error(`G1 b: filho exit ${b.status}: ${b.ckErro}`);
    if (JSON.stringify(a.layout) !== JSON.stringify(b.layout)) {
      falhas.push({ clause: 'G1', type: 'ContractViolation', message: `G1 ${MAPA}: duas rodadas com checkpoint novo deram layouts diferentes (${a.layout.pecas.length} e ${b.layout.pecas.length} peças)` });
    } else console.log(`  ✓ G1 ${MAPA}: duas rodadas, mesmo layout byte a byte (${a.layout.pecas.length} peças)`);
  }

  const c = await assa('derrubado', { GRAFITE_DERRUBA: DERRUBA });
  if (c.infra) throw Error(c.infra);
  if (c.status === 0) {
    if (FATAL.test(c.saida)) throw Error(`G2: filho exit 0 com diagnóstico fatal: ${c.saida.slice(-400).replace(/\s+/g, ' ').trim()}`);
    if (c.ckErro) throw Error(`G2: filho exit 0 sem evidência válida de layout: ${c.ckErro}`);
    falhas.push({ clause: 'G2', type: 'ContractViolation', message: `G2 ${MAPA}: com ${DERRUBA} derrubado o bake completou (exit 0) e gravou layout com ${c.layout.pecas.length} peças em vez de cancelar por entrada faltando` });
  } else if (c.status === 1) {
    if (!c.ckAusente || c.layout) throw Error('G2: filho exit 1 mas com checkpoint presente; cancelamento fora do previsto');
    const envelope = envelopeCancelamento(c.saida);
    if (!envelope.ok) throw Error(`G2: cancelamento fora do previsto: ${envelope.reason}`);
    if (FATAL.test(sanitiza(c.saida, envelope))) throw Error(`G2: fatal fora do envelope de cancelamento: ${sanitiza(c.saida, envelope).slice(-400).replace(/\s+/g, ' ').trim()}`);
    if (!MSG_CANCELAMENTO.test(c.saida)) throw Error('G2: filho exit 1 sem a mensagem de cancelamento por entrada faltando');
    console.log(`  ✓ G2 ${MAPA}: entrada derrubada cancela o bake e preserva o layout anterior`);
  } else throw Error(`G2: filho exit ${c.status} inesperado`);
  if (cancel.signal.aborted || cancelado) throw Error('cancelamento externo antes de publicar resultado');
} catch (e) {
  infraErro = cancelado ? `cancelamento externo (sinal) durante a prova: ${e.message}` : e.message;
  falhas.length = 0;
} finally {
  if (retencaoTmp) {
    // Contenção incerta: artefatos do assa ficam retidos para o Root; não fingir limpeza.
    infraErro = `${infraErro || 'cleanup/grupo incerto'}; artefatos retidos: ${tmp}${copiaPropria ? ', ' + copiaPropria : ''}`;
  } else if (tmp) {
    try { rmSync(tmp, { recursive: true, force: true }); }
    catch { infraErro ??= 'limpeza do diretório temporário falhou'; }
  }
  if (copiaPropria && !retencaoTmp) {
    try { rmSync(copiaPropria, { force: true }); }
    catch { infraErro = 'limpeza da cópia do mutante falhou'; falhas.length = 0; }
  }
  process.off('SIGINT', aoSinal);
  process.off('SIGTERM', aoSinal);
}

if (infraErro) {
  console.log(JSON.stringify({ mutant: MUT || null, cases: MUT ? 1 : 2, failed: [], error: infraErro }));
  process.exitCode = 3;
} else {
  for (const f of falhas) console.log(`  ✗ ${f.clause}: ${f.message}`);
  if (MUT && !falhas.length) console.log('  ✗ mutante engole-falta sobreviveu (G2 ainda cancela) — helper semântico deve recusar');
  console.log(JSON.stringify({ mutant: MUT || null, cases: MUT ? 1 : 2, failed: falhas }));
  process.exitCode = falhas.length ? 1 : 0;
}
