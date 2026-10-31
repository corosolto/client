#!/usr/bin/env node
/* ============================================================================
   graffiti-bake-fiel-check.mjs — ASSAR O MESMO MAPA DUAS VEZES DÁ O MESMO GRAFITE
   ----------------------------------------------------------------------------
   #1109: duas rodadas do gerador na mesma árvore deram 2769 e 2767 peças, e seguir
   a receita do portão já apagou 185 peças aprovadas. A passada é determinística sobre
   a cena que recebe; o que varia é a cena. Um GLB que não carrega some em silêncio
   (`preloadMapProps` só avisa no console), e só a `statue_liberty.glb` faltando leva
   a loja_h de 186 a 200 peças.

   G1 · duas rodadas seguidas, checkpoint novo em cada, dão o mesmo layout byte a byte.
   G2 · com um GLB derrubado, o gerador cancela o bake e lista a falta, em vez de
        gravar um layout diferente.

   Precisa de navegador e servidor (como o próprio gerador), então fica fora do
   check:fast: rode ao mexer no gerador, na passada ou no carregamento de props.

   Uso:
     node tools/eval/serve.mjs 4510 &
     BASE=http://127.0.0.1:4510 node tools/eval/graffiti-bake-fiel-check.mjs [--mapa=loja_h] [--mutante=engole-falta]
   ============================================================================ */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, openSync, closeSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { MAP_SOURCES } from './graffiti-fingerprint.mjs';
import { fileURLToPath } from 'node:url';
const invalido = mensagem => { console.error(mensagem); process.exit(2); };
const opcoes = Object.create(null);
let DRIVER = false;
for (const argumento of process.argv.slice(2)) {
  if (argumento === '--verificar-mutantes') {
    if (DRIVER) invalido('driver duplicado');
    DRIVER = true;
    continue;
  }
  const igual = argumento.indexOf('=');
  const chave = argumento.slice(2, igual);
  if (!argumento.startsWith('--') || igual < 3 || !['mutante', 'mapa', 'derruba'].includes(chave) || !argumento.slice(igual + 1) || Object.hasOwn(opcoes, chave)) invalido(`argumento inválido ou duplicado: ${argumento}`);
  opcoes[chave] = argumento.slice(igual + 1);
}
const MUT = opcoes.mutante || '';
if (DRIVER && MUT) invalido('driver não aceita --mutante');
const MAPA = opcoes.mapa || 'loja_h';
if (MUT && MUT !== 'engole-falta') invalido(`mutante desconhecido: ${MUT}`);
if (!Object.hasOwn(MAP_SOURCES, MAPA)) invalido(`mapa desconhecido: ${MAPA}`);
const DERRUBA = opcoes.derruba || { loja_h: 'statue_liberty\\.glb' }[MAPA];
if (!DERRUBA) invalido(`sem GLB conhecido para ${MAPA}: passe --derruba=<regex>`);
let REGEX;
try { REGEX = new RegExp(DERRUBA); } catch { invalido('regex de derruba malformada'); }
try { if (!['http:', 'https:'].includes(new URL(process.env.BASE).protocol)) throw Error(); } catch { invalido('BASE ausente ou inválida: aponte para seu servidor HTTP'); }


const GERADOR = 'tools/gen-graffiti-layout.mjs';
if (DRIVER) {
  const args = process.argv.slice(2).filter(a => a !== '--verificar-mutantes');
  let alvoBase = null;
  for (const mutante of ['', 'engole-falta']) {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...args, ...(mutante ? [`--mutante=${mutante}`] : [])], { encoding: 'utf8', timeout: 4800000, env: process.env });
    if (r.error || r.signal) invalido('driver: filho interrompido ou indisponível');
    const texto = `${r.stdout || ''}\n${r.stderr || ''}`;
    const registros = texto.split(/\r?\n/).filter(l => l.startsWith('GRAFITE-FIEL '));
    let rec;
    try { if (registros.length !== 1) throw Error(); rec = JSON.parse(registros[0].slice('GRAFITE-FIEL '.length)); }
    catch { invalido('driver: resultado único ausente ou inválido'); }
    if (!rec || rec.tool !== 'grafite-fiel' || rec.mutante !== mutante) invalido('driver: identificação divergente');
    const esperado = mutante
      ? r.status === 1 && rec.erro === 'ContractViolation' && rec.clausula === 'G2' && rec.aplicado === true && typeof rec.alvo === 'string'
      : r.status === 0 && rec.erro === null && rec.clausula === null && rec.aplicado === false;
    if (!esperado) invalido(`driver: resultado inesperado (exit ${r.status}, ${rec.erro}/${rec.clausula})`);
    let u; try { u = new URL(rec.alvo); } catch { invalido('driver: alvo inválido ou G2 ausente'); }
    if (!['http:', 'https:'].includes(u.protocol) || !/\.glb$/i.test(u.pathname) || !REGEX.test(rec.alvo)) invalido('driver: alvo não corresponde ao GLB pedido');
    if (!mutante) alvoBase = rec.alvo;
    else if (rec.alvo !== alvoBase) invalido('driver: baseline e mutante atingiram alvos distintos');
    console.log(`  ✓ driver: ${mutante || 'baseline'} com resultado próprio esperado`);
  }
  process.exit(0);
}
const tmp = mkdtempSync(join(tmpdir(), 'grafite-fiel-'));
let gerador = GERADOR, copia = null;


const layoutValido = layout => !!layout && Array.isArray(layout.pecas) && layout.pecas.length > 0 && Array.isArray(layout.arquivos) && layout.arquivos.length > 0;
function assa(rotulo, env = {}, arquivo = gerador) {
  const ck = join(tmp, `${rotulo}.json`), ambiente = { ...process.env };
  delete ambiente.GRAFITE_DERRUBA;
  const r = spawnSync(process.execPath, [arquivo, MAPA, `--checkpoint=${ck}`, '--checkpoint-only'],
    { encoding: 'utf8', timeout: 1500000, env: { ...ambiente, ...env } });
  const gravouCk = existsSync(ck);
  let layout, erroCk = null;
  try { if (gravouCk) layout = JSON.parse(readFileSync(ck, 'utf8')).maps?.[MAPA]?.layout; }
  catch (e) { erroCk = e.message; }
  return { status: r.status, signal: r.signal, erro: r.error?.message || erroCk, saida: `${r.stdout || ''}\n${r.stderr || ''}`, layout, gravouCk };
}

const linhas = (saida, tipo) => saida.split(/\r?\n/).filter(l => l.startsWith(tipo + ' ')).map(l => l.slice(tipo.length + 1));
function recibos(saida, tipo) {
  return linhas(saida, tipo).map(texto => {
    const objeto = JSON.parse(texto);
    if (!objeto || typeof objeto !== 'object' || Array.isArray(objeto)) throw Error(`${tipo}: objeto ausente`);
    return objeto;
  });
}
function faltasDoAlvo(faltas, alvo) {
  if (!Array.isArray(faltas) || !faltas.length) return false;
  const nome = new URL(alvo).pathname.split('/').at(-1).replace(/\.glb$/i, '');
  let request = false;
  return faltas.every(f => {
    if (!f || typeof f.reason !== 'string' || !f.reason) return false;
    if (f.tipo === 'requestfailed' && f.url === alvo) { request = true; return true; }
    // mapprops:65 avisa com o ID do prop, sem URL; só esse diagnóstico do alvo cabe aqui.
    return f.tipo === 'console' && (f.url === alvo || (!f.url && f.reason.startsWith(`map prop load failed ${nome} `)));
  }) && request;
}
function veredictoG2(c, mutante = MUT) {
  const infra = motivo => ({ tipo: 'infra', motivo });
  if (c.erro || c.signal || !Number.isInteger(c.status)) return infra('filho interrompido ou erro de preparação');
  try {
    const aborts = recibos(c.saida, 'GRAFITE-ABORT');
    if (!aborts.length) return infra('nenhum abort aplicado');
    const urls = new Set();
    for (const a of aborts) {
      if (a.tool !== 'gen-graffiti-layout' || a.mapa !== MAPA || a.padrao !== DERRUBA || a.aplicado !== true || typeof a.url !== 'string') return infra('metadados do abort divergentes');
      const u = new URL(a.url);
      if (!['http:', 'https:'].includes(u.protocol) || !/\.glb$/i.test(u.pathname) || !REGEX.test(a.url)) return infra('abort não corresponde ao GLB pedido');
      urls.add(a.url);
    }
    if (urls.size !== 1) return infra('mais de um alvo distinto');
    const alvo = [...urls][0];
    const entradas = recibos(c.saida, 'GRAFITE-ENTRADA'), posts = recibos(c.saida, 'GRAFITE-POST');
    if (c.status === 1 && !c.gravouCk && !c.layout && !mutante) {
      const e = entradas[0];
      if (entradas.length !== 1 || posts.length || e.tool !== 'gen-graffiti-layout' || e.mapa !== MAPA || e.clausula !== 'GRAFITE_ENTRADA' || e.truncado !== false || !Number.isInteger(e.total) || e.total !== e.faltas?.length || !faltasDoAlvo(e.faltas, alvo)) return infra('falta sem recibo único e causal do alvo');
      return { tipo: 'protegido', alvo };
    }
    if (c.status !== 0 || !c.gravouCk || !layoutValido(c.layout) || entradas.length) return infra('saída inesperada; não prova regressão da trava');
    if (mutante) {
      const p = posts[0];
      if (posts.length !== 1 || p.tool !== 'gen-graffiti-layout' || p.mapa !== MAPA || p.mutante !== mutante || p.aplicado !== true || p.truncado !== false || !Number.isInteger(p.total) || p.total !== p.faltas?.length || !faltasDoAlvo(p.faltas, alvo)) return infra('mutação sem POST próprio e causal');
    } else if (posts.length) return infra('POST inesperado na execução original');
    return { tipo: 'violacao', alvo };
  } catch (e) { return infra(`recibo inválido: ${e.message}`); }
}

const falhas = [], infra = [];
let resultadoG2 = null;
try {
  const a = assa('a', {}, GERADOR), b = assa('b', {}, GERADOR);
  if ([a, b].some(r => r.erro || r.signal || r.status !== 0 || !r.gravouCk || !layoutValido(r.layout))) infra.push('G1: baseline não completou com layout válido');
  else if (JSON.stringify(a.layout) !== JSON.stringify(b.layout)) falhas.push('G1: duas rodadas deram layouts diferentes');
  else console.log(`  ✓ G1 ${MAPA}: duas rodadas, mesmo layout byte a byte (${a.layout.pecas.length} peças)`);
  if (!infra.length && !falhas.length) {
    if (MUT) {
      const fonte = readFileSync(GERADOR, 'utf8'), ancora = '  if (faltas.length) {';
      if (fonte.split(ancora).length !== 2) throw Error('âncora do mutante ausente ou duplicada');
      const post = "  if (faltas.length) console.log('GRAFITE-POST ' + JSON.stringify({ tool: 'gen-graffiti-layout', mapa: id, mutante: 'engole-falta', aplicado: true, total: faltas.length, truncado: faltas.length > 20, faltas: faltas.slice(0, 20) }));\n  if (false) {";
      const nome = `tools/__gen-graffiti-mutante-${process.pid}.mjs`;
      const fd = openSync(nome, 'wx');
      copia = nome;
      try { writeFileSync(fd, fonte.replace(ancora, post)); } finally { closeSync(fd); }
      gerador = copia;
    }
    resultadoG2 = veredictoG2(assa('derrubado', { GRAFITE_DERRUBA: DERRUBA }));
    if (resultadoG2.tipo === 'infra') infra.push('G2: ' + resultadoG2.motivo);
    else if (resultadoG2.tipo === 'violacao') falhas.push(`G2: bake gravou layout após abort comprovado de ${resultadoG2.alvo}`);
    else console.log(`  ✓ G2 ${MAPA}: abort do alvo cancelou o bake sem checkpoint`);
  }
} catch (e) { infra.push(e.message); }
finally {
  rmSync(tmp, { recursive: true, force: true });
  if (copia) rmSync(copia, { force: true });
}
for (const f of falhas) console.log('  ✗ ' + f);
for (const i of infra) console.log('  ? infra: ' + i);
console.log('GRAFITE-FIEL ' + JSON.stringify({ tool: 'grafite-fiel', mutante: MUT, erro: infra.length ? 'InfrastructureError' : falhas.length ? 'ContractViolation' : null, clausula: resultadoG2?.tipo === 'violacao' ? 'G2' : falhas.length ? 'G1' : null, aplicado: !!MUT && resultadoG2?.tipo === 'violacao', alvo: resultadoG2?.alvo || null }));
process.exit(infra.length ? 2 : falhas.length ? 1 : 0);
