// Régua de desfechos de filhos e prioridade da falha medida (issue #1133).
// Evidência: docs/reports/SB7-HARDENING-CONTINUATION-20261031.md.
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { stripVTControlCharacters } from 'node:util';
import { sonda, pula, causaNaoMedivel, SAIDA_SKIP } from './sonda-filho.mjs';

const SONDA = fileURLToPath(new URL('./sonda-filho.mjs', import.meta.url));
const TMP = mkdtempSync(join(tmpdir(), 'sonda-filho-check-'));
const filho = (nome, corpo) => {
  const caminho = join(TMP, nome);
  writeFileSync(caminho, corpo);
  return caminho;
};
const falhas = [];
const clausula = (id, fn) => {
  try { fn(); console.log(`  ✓ ${id}`); } catch (e) { falhas.push(`${id} ${e.message}`); console.error(`  ✗ ${id} ${e.message}`); }
};

/* ── desfechos do sonda ──────────────────────────────────────────────────── */
clausula('SFS1 filho verde: mediu e ok', () => {
  const r = sonda([filho('verde.mjs', 'console.log("ok")')]);
  assert.equal(r.status, 0); assert.equal(r.mediu, true); assert.equal(r.desfecho, 'ok');
});
clausula('SFS2 filho reprovou: mediu, é conteúdo', () => {
  const r = sonda([filho('ruim.mjs', 'console.error("conteúdo errado"); process.exit(1)')]);
  assert.equal(r.status, 1); assert.equal(r.mediu, true); assert.equal(r.desfecho, 'reprovou');
});
clausula('SFS3 dependência ausente: não mediu', () => {
  const r = sonda([filho('sempacote.mjs',
    'import("pacote-que-nao-existe-em-lugar-nenhum").catch((e) => { console.error(e); process.exit(1); })')]);
  assert.equal(r.mediu, false); assert.equal(r.desfecho, 'nao-medi');
  assert.match(r.causa, /dependência ausente/);
});
clausula('SFS4 verde que menciona erro como texto não vira SKIP', () => {
  const r = sonda([filho('menciona.mjs',
    'console.log("Cannot find module \'x\' citado como dado"); console.log("PASS")')]);
  assert.equal(r.status, 0); assert.equal(r.mediu, true);
});
clausula('SFS5 filho morto por sinal: não mediu', () => {
  const r = sonda([filho('morto.mjs', 'process.kill(process.pid, "SIGKILL")')]);
  assert.equal(r.status, null); assert.equal(r.mediu, false);
  assert.match(r.causa, /SIGKILL/);
});
clausula('SFS6 filho morto por timeout: não mediu', () => {
  const r = sonda([filho('lento.mjs', 'setTimeout(() => {}, 5000)')], { timeout: 150 });
  assert.equal(r.mediu, false);
  assert.match(r.causa, /SIGTERM/);
});
clausula('SFS7 executável ausente: não mediu', () => {
  const r = causaNaoMedivel(spawnSync('/caminho/que/nao/existe/bin', ['--x'], { encoding: 'utf8' }));
  assert.match(r, /executável ausente/);
});
clausula('SFS8 status numérico é veredito concreto, não unknown', () => {
  assert.equal(causaNaoMedivel({ status: 3, stderr: 'x' }), null);
  assert.equal(causaNaoMedivel({ status: 0 }), null);
});
clausula('SFS8a status null sem sinal nunca é medido', () => {
  assert.ok(causaNaoMedivel({ status: null, signal: null }));
  assert.match(causaNaoMedivel({ status: null, signal: null, error: { code: 'ENOBUFS' } }), /ENOBUFS/);
});
clausula('SFS8b ENOBUFS real vence status zero e preserva código/sinal', () => {
  const r = sonda(['-e', "process.on('SIGTERM',()=>process.exit(0));require('fs').writeSync(1,'saída parcial\\n');setInterval(()=>{},1000)"], { maxBuffer: 1 });
  assert.equal(r.error?.code, 'ENOBUFS'); assert.equal(r.status, 0); assert.equal(r.signal, null);
  assert.equal(r.mediu, false); assert.equal(r.desfecho, 'nao-medi'); assert.match(r.causa, /ENOBUFS/);
  const morto = sonda(['-e', "require('fs').writeSync(1,'saída parcial\\n');setInterval(()=>{},1000)"], { maxBuffer: 1 });
  assert.equal(morto.mediu, false); assert.match(morto.causa, /ENOBUFS/); assert.match(morto.causa, /SIGTERM/);
  const timeout = sonda(['-e', 'setInterval(()=>{},1000)'], { timeout: 150 });
  assert.match(timeout.causa, /ETIMEDOUT/); assert.match(timeout.causa, /timeout/);
  const conteudo = sonda(['-e', "console.error('ENOBUFS citado como dado');process.exit(1)"]);
  assert.equal(conteudo.status, 1); assert.equal(conteudo.mediu, true);
});

/* pula chama process.exit: o veredito de saída só se prova em filho de verdade. */
const saiCom = (corpo) => spawnSync(process.execPath, ['--input-type=module', '-e',
  `const { pula } = await import(${JSON.stringify(pathToFileURL(SONDA).href)}); ${corpo}`], { encoding: 'utf8' });
clausula('SFS9 pula limpo encerra 78', () => {
  const r = saiCom("pula('causa da régua', 'T')");
  assert.equal(r.status, SAIDA_SKIP);
  assert.match(r.stderr, /SKIP T não medido: causa da régua/);
});
clausula('SFS10 vermelho já medido vence SKIP (P2 do PR #1167)', () => {
  const r = saiCom("process.exitCode = 1; pula('causa da régua', 'T')");
  assert.equal(r.status, 1);
});

/* ── R2: callers reais + shim de filho controlado (PR #1167, issue #1133) ─── */
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
/* Shim carregado via NODE_OPTIONS em TODO descendente: decide o desfecho do
   processo alvo antes do módulo dele rodar — sem browser, sem playwright. */
writeFileSync(join(TMP, 'r2-shim.mjs'), [
  "const argv = process.argv;",
  "const fs = await import('node:fs');",
  "const conta = (f) => { const n = Number((fs.readFileSync(f, 'utf8') || '0').trim() || '0') + 1; fs.writeFileSync(f, String(n)); return n; };",
  "let chave = null;",
  "if (argv[1] && argv[1].endsWith('treta-ui-browser.mjs')) chave = (argv.find((a) => a.startsWith('--mutant=')) || '').slice(9) || 'normal';",
  "else if (argv[1] && argv[1].endsWith('amazonia-access-check.mjs')) chave = (process.env.AMAZONIA_SOURCE || '').split('/').pop().replace(/\\.mjs$/, '');",
  "if (chave) {",
  "  const papel = JSON.parse(process.env.SB7R2_PAPEIS || '{}')[chave];",
  "  if (papel === 'matar') { console.error(\"Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'sb7-r2-pacote-ausente', imported from tools/eval/filho.mjs\"); process.exit(1); }",
  "  if (papel === 'falha') { console.log('medido: conteúdo fora da régua'); process.exit(1); }",
  "  if (papel) { console.log(papel); process.exit(1); }",
  "} else if (argv[1] && argv[1].endsWith('social-serve-check.mjs') && JSON.parse(process.env.SB7R2_PAPEIS || '{}')['social-serve'] === 'matar') {",
  "  console.error(\"Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'sb7-r2-pacote-ausente', imported from tools/eval/filho.mjs\"); process.exit(1);",
  "} else if (argv[1] && argv[1].endsWith('assets-check.mjs')) {",
  "  const n = conta(process.env.SB7R2_CONTADOR);",
  "  if (n === Number(process.env.SB7R3_FAIL_AT || '0')) { console.log('medido: conteúdo fora da régua'); process.exit(1); }",
  "  if (n === Number(process.env.SB7R2_MATA_EM || '0')) { console.error(\"Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'sb7-r2-pacote-ausente', imported from tools/eval/filho.mjs\"); process.exit(1); }",
  "} else if (argv[1] && argv[1].endsWith('build-audio-pack.mjs') && process.env.SB7R3_BCOUNT) {",
  "  if (conta(process.env.SB7R3_BCOUNT) === Number(process.env.SB7R3_BUILDER_AT || '0')) { console.error(\"Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'sb7-r2-pacote-ausente', imported from tools/eval/filho.mjs\"); process.exit(1); }",
  "} else if (argv[1] && argv[1].endsWith('texel-check.mjs') && process.env.SB7R3_TEXEL) {",
  "  const plano = JSON.parse(process.env.SB7R3_TEXEL)[String(conta(process.env.SB7R2_CONTADOR))];",
  "  if (plano && plano.startsWith('TEXEL')) { console.error(`✗ ${plano} quebrada: 12.4 px/m abaixo do alvo`); process.exit(1); }",
  "  if (plano === 'matar') { console.error(\"Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'sb7-r2-pacote-ausente', imported from tools/eval/filho.mjs\"); process.exit(1); }",
  "}",
].join('\n'));
const SHIM_URL = pathToFileURL(join(TMP, 'r2-shim.mjs')).href;
const rodarCaller = (arquivo, papeis = {}, mataEm = 0, extra = {}, cwd = ROOT, args = []) => {
  const contador = join(TMP, `r2-contador-${Math.random().toString(36).slice(2)}`);
  writeFileSync(contador, '0');
  return spawnSync(process.execPath, [arquivo.startsWith('/') ? arquivo : join(ROOT, arquivo), ...args], {
    encoding: 'utf8', cwd, timeout: 300000,
    /* Descendentes chamam `node` do PATH: garante o mesmo binário que roda o
       gate (PATH local pode ter um node velho que rejeita --import). */
    env: { ...process.env, NODE_OPTIONS: `--import ${SHIM_URL}`,
      PATH: `${dirname(process.execPath)}:${process.env.PATH || ''}`,
      SB7R2_CONTADOR: contador, SB7R2_MATA_EM: String(mataEm),
      SB7R2_PAPEIS: JSON.stringify(papeis), ...extra },
  });
};

clausula('SFS11 import relativo/absoluto quebrado é conteúdo, não infra', () => {
  const esm = sonda([filho('rel-esm.mjs', "import './nao-existe-aqui.mjs';")]);
  assert.equal(esm.mediu, true, `ESM: ${esm.causa}`);
  assert.notEqual(esm.status, 0);
  const cjs = sonda([filho('rel-cjs.cjs', "try { require('./nao-existe-aqui.js'); } catch (e) { console.error(e.message); process.exit(1); }")]);
  assert.equal(cjs.mediu, true, `CJS: ${cjs.causa}`);
  assert.notEqual(cjs.status, 0);
});
clausula('SFS11b guard file: e drive é conteúdo, não infra', () => {
  const fileUrl = causaNaoMedivel({ status: 1, stderr: "Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'file:///nao-existe.mjs'" });
  assert.equal(fileUrl, null, `file: virou infra: ${fileUrl}`);
  const drive = causaNaoMedivel({ status: 1, stderr: "Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\\mapas\\x.js'" });
  assert.equal(drive, null, `drive virou infra: ${drive}`);
});
clausula('SFS12 limite declarado: texto citado em filho exit≠0 ainda vira SKIP', () => {
  /* Heurística sobre a mensagem, não prova: limite documentado em
     docs/docs/sonda-processos.md — melhora aqui exige atualizar a doc. */
  const r = sonda([filho('cita-texto.mjs', "console.error(\"Cannot find package 'sb7-r2-pacote-ausente'\"); process.exit(1)")]);
  assert.equal(r.mediu, false);
});
clausula('SFS13 treta-ui: vermelho já medido vence skip no meio do loop', () => {
  const a = rodarCaller('tools/eval/treta-ui-mutations.mjs', { preview: 'falha', framing: 'matar' }, 0, { OUT: join(TMP, 'treta-a') });
  assert.equal(a.status, 1, `fail→skip saiu ${a.status}: ${a.stderr}`);
  const b = rodarCaller('tools/eval/treta-ui-mutations.mjs', { preview: 'matar' }, 0, { OUT: join(TMP, 'treta-b') });
  assert.equal(b.status, SAIDA_SKIP, `skip limpo saiu ${b.status}`);
  const c = rodarCaller('tools/eval/treta-ui-mutations.mjs',
    { preview: 'Failed base-only preview must block purchase', framing: 'Skin body must fit the camera', manifest: 'Unapproved manifest must keep the skin in production' },
    0, { OUT: join(TMP, 'treta-c') });
  assert.equal(c.status, 0, `pass saiu ${c.status}: ${c.stderr}`);
});
clausula('SFS14 amazonia-access: vermelho já medido vence skip no meio do loop', () => {
  /* As âncoras de mutação não existem mais no map_amazonia.js real (quebra
     pré-existente em origin/main); o caller real roda numa árvore com elas. */
  const fix = join(TMP, 'amazonia-arvore');
  mkdirSync(join(fix, 'public/js'), { recursive: true });
  mkdirSync(join(fix, 'tools/eval'), { recursive: true });
  writeFileSync(join(fix, 'tools/eval/amazonia-access-check.mjs'), '// interceptado pelo shim antes de carregar\n');
  writeFileSync(join(fix, 'public/js/map_amazonia.js'), [
    'export function mapa(){',
    '  const occluders=[];',
    "  occluders.push(addBox(casaChapa ? 1 : 2, 3, 4, 5, {collide:false}));",
    '      if (!((st.x===14))) { lo();',
    '      }',
    '      if (u >= CASA_A) hi();',
    '  box({minX:st.x-2,maxX:st.x+2,minY:3.78,maxY:6.3,minZ:Math.min(z0,z1),maxZ:Math.max(z0,z1)});',
    '}',
  ].join('\n'));
  const rodar = (papeis) => rodarCaller('tools/eval/amazonia-access-mutate.mjs', papeis, 0, {}, fix);
  const a = rodar({ 'parede-sem-oclusao': 'falha', 'sem-piso': 'matar' });
  assert.equal(a.status, 1, `fail→skip saiu ${a.status}: ${a.stderr}`);
  const b = rodar({ 'parede-sem-oclusao': 'matar' });
  assert.equal(b.status, SAIDA_SKIP, `skip limpo saiu ${b.status}: ${b.stderr}`);
  const c = rodar({ 'parede-sem-oclusao': 'FAIL AMA3\nFAIL AMA3', 'sem-piso': 'FAIL AMA1\n'.repeat(9), 'colisor-na-escada': 'FAIL AMA1\n'.repeat(9) });
  assert.equal(c.status, 0, `pass saiu ${c.status}: ${c.stderr}`);
});
clausula('SFS15 escadeão/mansão/lajes: filho posterior morto não é veredito', () => {
  const esc2 = rodarCaller('tools/eval/escadao-audio-pack-check.mjs', {}, 2);
  assert.equal(esc2.status, SAIDA_SKIP, `escadeão mata@2 saiu ${esc2.status}: ${esc2.stderr}`);
  const esc3 = rodarCaller('tools/eval/escadao-audio-pack-check.mjs', {}, 3);
  assert.equal(esc3.status, SAIDA_SKIP, `escadeão mata@3 (falso-verde) saiu ${esc3.status}`);
  const man3 = rodarCaller('tools/eval/mansao-audio-pack-check.mjs', {}, 3);
  assert.equal(man3.status, SAIDA_SKIP, `mansão mata@3 (falso-verde) saiu ${man3.status}`);
  const ls2 = rodarCaller('tools/eval/lajes-soundscape-check.mjs', {}, 2);
  assert.equal(ls2.status, SAIDA_SKIP, `lajes mata@2 (green) saiu ${ls2.status}: ${ls2.stderr}`);
  const ls3 = rodarCaller('tools/eval/lajes-soundscape-check.mjs', {}, 3);
  assert.equal(ls3.status, SAIDA_SKIP, `lajes mata@3 (missingOther) saiu ${ls3.status}: ${ls3.stderr}`);
});
clausula('SFS16 SB7: vermelho estático vence probe HTTP não medido', () => {
  const mutante = rodarCaller('tools/eval/shader-budget-check.mjs', { 'social-serve': 'matar' }, 0, {}, ROOT, ['--mutante=cache-constante']);
  assert.equal(mutante.status, 1, `mutante + HTTP morto saiu ${mutante.status} — RED estático apagado`);
  const normal = rodarCaller('tools/eval/shader-budget-check.mjs', { 'social-serve': 'matar' });
  assert.equal(normal.status, SAIDA_SKIP, `sem mutante + HTTP morto saiu ${normal.status}`);
});
clausula('SFS17 PRV13/PRV14: irmã medida que reprova vence flag infra do grupo', () => {
  const prv13Irma = rodarCaller('tools/eval/audio-proveniencia-check.mjs', {}, 1, { SB7R3_FAIL_AT: '3' });
  assert.equal(prv13Irma.status, 1, `PRV13 a infra + irmã b vermelha saiu ${prv13Irma.status}`);
  const prv13SoInfra = rodarCaller('tools/eval/audio-proveniencia-check.mjs', {}, 3);
  assert.equal(prv13SoInfra.status, SAIDA_SKIP, `PRV13 só infra saiu ${prv13SoInfra.status}`);
  const prv14Irma = rodarCaller('tools/eval/audio-proveniencia-check.mjs', {}, 4, { SB7R3_FAIL_AT: '5' });
  assert.equal(prv14Irma.status, 1, `PRV14 ap infra + al vermelha saiu ${prv14Irma.status}`);
  const bcount = join(TMP, `b-${Math.random().toString(36).slice(2)}`);
  writeFileSync(bcount, '0');
  const prv14Builder = rodarCaller('tools/eval/audio-proveniencia-check.mjs', {}, 0, { SB7R3_BCOUNT: bcount, SB7R3_BUILDER_AT: '7' });
  assert.equal(prv14Builder.status, SAIDA_SKIP, `PRV14 irmã do builder morta por infra saiu ${prv14Builder.status}`);
});
clausula('SFS18 texel: vermelho já medido vence skip no meio do loop', () => {
  /* Árvore isolada com as âncoras dos mutantes: o produto não é tocado. */
  const fix = join(TMP, 'texel-arvore');
  mkdirSync(join(fix, 'tools/eval'), { recursive: true });
  mkdirSync(join(fix, 'public/js'), { recursive: true });
  cpSync(join(ROOT, 'tools/eval/texel-mutantes.mjs'), join(fix, 'tools/eval/texel-mutantes.mjs'));
  cpSync(SONDA, join(fix, 'tools/eval/sonda-filho.mjs'));
  writeFileSync(join(fix, 'tools/eval/texel-check.mjs'), '// interceptado pelo shim antes de carregar\n');
  writeFileSync(join(fix, 'public/js/vao.js'), 'if (p) escalaUVporMundo(p.geo, p.w, p.h, p.d,\nconst tileU = pxU / ALVO_PXM, tileV = pxV / ALVO_PXM;\n  if (puro) return r;\n');
  writeFileSync(join(fix, 'public/js/textures.js'), 'const ANISO_TEX = !TEXEL_ON ? 1 :\nconst CHAO_PX = ');
  const rodar = (plano) => rodarCaller(join(fix, 'tools/eval/texel-mutantes.mjs'), {}, 0, { SB7R3_TEXEL: JSON.stringify(plano) }, fix);
  const a = rodar({ 1: 'TEXEL1', 2: 'TEXEL1', 3: 'matar' });
  assert.equal(a.status, 1, `fail→skip saiu ${a.status}: ${a.stderr}`);
  const b = rodar({ 1: 'TEXEL1', 2: 'matar' });
  assert.equal(b.status, SAIDA_SKIP, `skip limpo saiu ${b.status}: ${b.stderr}`);
  const c = rodar({ 1: 'verde', 2: 'TEXEL1', 3: 'TEXEL1', 4: 'TEXEL3', 5: 'TEXEL4', 6: 'TEXEL1' });
  assert.equal(c.status, 0, `tudo morto saiu ${c.status}: ${c.stderr}`);
  assert.ok(!readFileSync(join(fix, 'public/js/vao.js'), 'utf8').includes('MUTANTE'), 'árvore restaurada');
});
clausula('SFS19 escadeão/mansão: PASS integral só com todos os filhos medidos', () => {
  const esc2 = rodarCaller('tools/eval/escadao-audio-pack-check.mjs', {}, 2);
  assert.equal(esc2.status, SAIDA_SKIP, `escadeão mata@2 saiu ${esc2.status}`);
  assert.ok(!/\bPASS\b/.test(esc2.stdout || ''), 'PASS integral impresso sob SKIP');
  const man3 = rodarCaller('tools/eval/mansao-audio-pack-check.mjs', {}, 3);
  assert.equal(man3.status, SAIDA_SKIP, `mansão mata@3 saiu ${man3.status}`);
  assert.ok(!/\bPASS\b/.test(man3.stdout || ''), 'PASS integral impresso sob SKIP');
  const esc0 = rodarCaller('tools/eval/escadao-audio-pack-check.mjs');
  assert.equal(esc0.status, 0, `escadeão real saiu ${esc0.status}: ${esc0.stderr}`);
  assert.ok(/\bPASS\b/.test(esc0.stdout || ''), 'PASS integral ausente na execução completa');
});
clausula('SFS20 TEXEL: ENOBUFS real não conta como mutante morto', () => {
  const fix = join(TMP, 'texel-enobufs');
  mkdirSync(join(fix, 'tools/eval'), { recursive: true });
  mkdirSync(join(fix, 'public/js'), { recursive: true });
  cpSync(join(ROOT, 'tools/eval/texel-mutantes.mjs'), join(fix, 'tools/eval/texel-mutantes.mjs'));
  cpSync(SONDA, join(fix, 'tools/eval/sonda-filho.mjs'));
  writeFileSync(join(fix, 'tools/eval/texel-check.mjs'), '// executado pelo shim controlado\n');
  const vao = 'if (p) escalaUVporMundo(p.geo, p.w, p.h, p.d,\n';
  writeFileSync(join(fix, 'public/js/vao.js'), vao);
  writeFileSync(join(fix, 'public/js/textures.js'), 'fixture');
  const records = join(fix, 'children.jsonl'), shim = join(fix, 'shim.mjs');
  writeFileSync(records, '');
  const child = "process.on('SIGTERM',()=>process.exit(0));require('fs').writeSync(1,'✗ TEXEL1 quebrada: medição incompleta\\n');setInterval(()=>{},1000)";
  writeFileSync(shim, [
    "import cp from 'node:child_process';import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';",
    'const real=cp.spawnSync;let calls=0;',
    `cp.spawnSync=function(bin,args,opts){if(args[0]?.endsWith('texel-check.mjs')){calls++;const r=calls===1?real(bin,['-e',"console.log('baseline clean')"],opts):real(bin,['-e',${JSON.stringify(child)}],{...opts,maxBuffer:1});fs.appendFileSync(${JSON.stringify(records)},JSON.stringify({status:r.status,signal:r.signal,code:r.error?.code})+'\\n');return r;}return real(bin,args,opts);};syncBuiltinESMExports();`,
  ].join('\n'));
  const r = spawnSync(process.execPath, [join(fix, 'tools/eval/texel-mutantes.mjs'), '--so=uv-fixa'], {
    cwd: fix, encoding: 'utf8', timeout: 30000,
    env: { ...process.env, NODE_OPTIONS: `--import ${pathToFileURL(shim).href}` },
  });
  const measured = readFileSync(records, 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(measured[1].code, 'ENOBUFS'); assert.equal(measured[1].status, 0); assert.equal(measured[1].signal, null);
  assert.equal(r.status, SAIDA_SKIP, `TEXEL ENOBUFS saiu ${r.status}: ${r.stderr}`);
  assert.match(r.stderr, /ENOBUFS/); assert.doesNotMatch(r.stdout, /MATOU|mutantes MORTOS|a régua morde todos/);
  assert.equal(readFileSync(join(fix, 'public/js/vao.js'), 'utf8'), vao, 'fixture não restaurada');
});

clausula('SFS21 RUNNER REAL: ENOBUFS com status0 é 78, FAIL medido vence', () => {
  /* O runner (tools/eval/runner.mjs) só provou o contrato com helper até aqui.
     Aqui é o processo REAL: spawnSync do shim limita maxBuffer do filho node
     (mesma fixture SIGTERM do SFS8b/SFS20) — ENOBUFS verdadeiro, status 0,
     signal null na fronteira de spawnSync que o runner lê. */
  const fix = join(TMP, 'runner-enobufs');
  mkdirSync(fix, { recursive: true });
  const records = join(fix, 'runner.jsonl'), shim = join(fix, 'shim.mjs');
  writeFileSync(records, '');
  const gordo = "process.on('SIGTERM',()=>process.exit(0));require('fs').writeSync(1,'saída parcial\\n');setInterval(()=>{},1000)";
  writeFileSync(shim, [
    "import cp from 'node:child_process';import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';",
    'const real=cp.spawnSync;',
    `cp.spawnSync=function(bin,args,opts={}){const passo=args&&String(args[0]).includes('run')&&args[1]==='passo'?null:args&&String(args[0]).includes('run')?args[2]:null;if(!passo)return real(bin,args,opts);`,
    `const r=passo==='passo-ruim'?real(process.execPath,['-e',"console.error('medido: conteúdo fora da régua');process.exit(1)"],opts):real(process.execPath,['-e',${JSON.stringify(gordo)}],{...opts,maxBuffer:1});`,
    `fs.appendFileSync(${JSON.stringify(records)},JSON.stringify({passo,status:r.status,signal:r.signal,code:r.error?.code})+'\\n');return r;};syncBuiltinESMExports();`,
  ].join('\n'));
  const env = { ...process.env, NODE_OPTIONS: `--import ${pathToFileURL(shim).href}` };
  const sozinho = spawnSync(process.execPath, [join(ROOT, 'tools/eval/runner.mjs'), 'passo'],
    { cwd: fix, encoding: 'utf8', timeout: 30000, env });
  const medido = readFileSync(records, 'utf8').trim().split('\n').map(JSON.parse).pop();
  assert.equal(medido.code, 'ENOBUFS'); assert.equal(medido.status, 0); assert.equal(medido.signal, null);
  assert.equal(sozinho.status, SAIDA_SKIP, `runner ENOBUFS+status0 saiu ${sozinho.status}`);
  assert.match(sozinho.stdout, /PULOU/);
  /* ANSI real no stdout: compara sem ANSI apenas na fronteira do assert; saída bruta intacta. */
  assert.match(stripVTControlCharacters(sozinho.stdout), /não medido: passo/);
  assert.doesNotMatch(sozinho.stdout, /ok\u001b\[0m/, 'status0 com ENOBUFS contou como medido ok');
  assert.doesNotMatch(sozinho.stdout, /1\/1 passaram/);
  /* Precedência: vermelho medido antes do passo não medido → sai 1, não 78. */
  writeFileSync(records, '');
  const ambos = spawnSync(process.execPath, [join(ROOT, 'tools/eval/runner.mjs'), 'passo-ruim', 'passo'],
    { cwd: fix, encoding: 'utf8', timeout: 30000, env });
  assert.equal(ambos.status, 1, `fail→skip saiu ${ambos.status}`);
  assert.match(ambos.stdout, /FALHOU/);
  assert.match(stripVTControlCharacters(ambos.stdout), /não medido: passo/);
});

clausula('SFS22 RUNNER REAL: filho limpo status0 é 1/1 passaram, nunca PULOU', () => {
  /* Controle do próprio runner com processo filho REAL: código 0, sem signal,
     sem error — mesma fronteira de spawnSync que o SFS21 lê, sem helper e sem
     objeto fabricado. Mutante causal (pulou passa a contar status 0 como SKIP)
     morre aqui: o passo verde real viraria PULOU, sumiria o 1/1 passaram e a
     saída deixaria de ser 0. */
  const fix = join(TMP, 'runner-limpo');
  mkdirSync(fix, { recursive: true });
  const records = join(fix, 'runner.jsonl'), shim = join(fix, 'shim.mjs');
  writeFileSync(records, '');
  const verde = "console.log('verde de verdade');process.exitCode=0";
  writeFileSync(shim, [
    "import cp from 'node:child_process';import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';",
    'const real=cp.spawnSync;',
    `cp.spawnSync=function(bin,args,opts={}){const passo=args&&String(args[0]).includes('run')?args[2]:null;if(!passo)return real(bin,args,opts);`,
    `const r=real(process.execPath,['-e',${JSON.stringify(verde)}],opts);`,
    `fs.appendFileSync(${JSON.stringify(records)},JSON.stringify({passo,status:r.status,signal:r.signal,code:r.error?.code})+'\\n');return r;};syncBuiltinESMExports();`,
  ].join('\n'));
  const env = { ...process.env, NODE_OPTIONS: `--import ${pathToFileURL(shim).href}` };
  const r = spawnSync(process.execPath, [join(ROOT, 'tools/eval/runner.mjs'), 'passo'],
    { cwd: fix, encoding: 'utf8', timeout: 30000, env });
  const m = readFileSync(records, 'utf8').trim().split('\n').map(JSON.parse).pop();
  /* Prova que o filho foi um processo real e mediu verde de verdade. */
  assert.equal(m.status, 0); assert.equal(m.signal, null); assert.equal(m.code, undefined);
  assert.equal(r.status, 0, `runner limpo saiu ${r.status}: ${(r.stdout || '') + (r.stderr || '')}`);
  assert.match(r.stdout, /1\/1 passaram/);
  assert.doesNotMatch(r.stdout, /PULOU/, 'status0 limpo contou como SKIP');
  assert.doesNotMatch(r.stdout, /não medido/);
});

rmSync(TMP, { recursive: true, force: true });
if (falhas.length) {
  console.error(`\nSONDA-FILHO ${falhas.length} VERMELHA(S)\n`);
  for (const f of falhas) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('\nSONDA-FILHO verde: três desfechos separados, morte não é veredito, vermelho vence SKIP');
