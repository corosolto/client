// Nominal e mutantes do suporte: oito cláusulas completas e conjunto exato de falhas.
// Status de sonda cega/infra nunca conta como reprovação medida.
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ids = ['CU-1', 'CU-2', 'CU-3', 'CU-4', 'CU-5', 'CU-6', 'CU-7', 'CU-8'];
const PROTO_RE = /^(CU-[1-8]) (PASSA|FALHA) — /;

// Matriz congelada ANTES de qualquer execução: OLD9 + nominais×3 + novos por perfil aplicável.
const VELHOS = Object.freeze([
  ['guardrepeat20x3', ['CU-1']], ['removerguardUV', ['CU-3']],
  ['guardperiod2m', ['CU-3']], ['removerfimUV', ['CU-5', 'CU-6']],
  ['removerlock', ['CU-4']], ['uv-rank1', ['CU-3']],
  ['face-ausente', ['CU-3']], ['repeat-nao-finito', ['CU-1']],
  ['inventario-compensado', ['CU-3']],
]);
const TODOS = Object.freeze([0, 1, 2]);
const SO_STD = Object.freeze([1, 2]);
const NOVOS = Object.freeze([
  ['fim-compensado', TODOS], ['std-compensado', SO_STD],
  ['fim-oculto', TODOS], ['std-oculto', SO_STD],
  ['fim-ancestral-oculto', TODOS], ['fim-face-duplicada', TODOS],
  ['std-face-duplicada', SO_STD], ['fim-translado', TODOS],
  ['folha-f7-metal', Object.freeze([2])], ['std-drawrange', SO_STD],
  ['std-grupo-oculto', SO_STD], ['fim-alpha-test', TODOS], ['fim-alpha-blend', TODOS],
  ['fim-raster-blend-zero', TODOS], ['fim-raster-depth-never', TODOS],
  ['fim-position-itemsize1', TODOS], ['fim-normal-itemsize1', TODOS],
  ['fim-uv-itemsize1', TODOS], ['fim-index-itemsize2', TODOS],
  ['std-position-itemsize1', SO_STD], ['std-normal-itemsize1', SO_STD],
  ['std-uv-itemsize1', SO_STD], ['std-index-itemsize2', SO_STD],
]);

const shaPadrao = 'a'.repeat(64);
const linhaPerfil = (perfil = 'r23', query = 'default', sha = shaPadrao) =>
  `CAMPO-PERFIL ${JSON.stringify({ perfil, query, sha })}`;
function saida(falhas, { perfil = linhaPerfil(), mut = null, extra = '' } = {}) {
  return ids.map((id) => `${id} ${falhas.includes(id) ? 'FALHA' : 'PASSA'} — prova`).join('\n')
    + '\n' + perfil
    + (mut ? `\nCAMPO-MUTANTE ${JSON.stringify(typeof mut === 'string' ? { name: mut, aplicado: true } : mut)}` : '')
    + (extra ? '\n' + extra : '');
}
export function shaIgual(a, b) { return typeof a === 'string' && typeof b === 'string' && /^[0-9a-f]{64}$/.test(a) && a === b; }
export function extrairPerfil(stdout) {
  const l = String(stdout || '').split('\n').filter((x) => /^CAMPO-PERFIL /.test(x));
  if (l.length !== 1) return null;
  try { return JSON.parse(l[0].slice('CAMPO-PERFIL '.length)); } catch { return null; }
}

export function aceitar(r, esperado, meta = {}) {
  if (r.error || r.signal) return false;
  if (![0, 1].includes(r.status)) return false;   // infra 2/3/4 e abort nunca são detecção
  if (r.status !== (esperado.length ? 1 : 0)) return false;   // all-PASS com exit1 é recusado
  const lines = String(r.stdout || '').split('\n');
  if (/infraestrutura|nominal não-VERDE|mutante não aplicado/i.test(String(r.stdout || '') + '\n' + String(r.stderr || ''))) return false;
  if (lines.some(l => /^\s*CAMPO-(?:PERFIL|MUTANTE)/.test(l)
    && !/^CAMPO-(?:PERFIL|MUTANTE) \{/.test(l))) return false;
  for (const l of lines)
    if (/^\s*CU-/.test(l) && !PROTO_RE.test(l)) return false;   // whitespace/CU-9/malformada não evadem
  const proto = lines.filter((l) => PROTO_RE.test(l)).map((l) => l.match(PROTO_RE));
  if (proto.length !== ids.length) return false;
  const got = proto.map((m) => m[1]);
  if (new Set(got).size !== ids.length || ids.some((id) => !got.includes(id))) return false;
  const falhas = proto.filter((m) => m[2] === 'FALHA').map((m) => m[1]).sort();
  if (JSON.stringify(falhas) !== JSON.stringify([...esperado].sort())) return false;
  const perfis = lines.filter((l) => /^CAMPO-PERFIL /.test(l));
  if (perfis.length !== 1) return false;
  let pj; try { pj = JSON.parse(perfis[0].slice('CAMPO-PERFIL '.length)); } catch { return false; }
  if (!pj || !['original', 'r22', 'r23'].includes(pj.perfil)) return false;
  if (JSON.stringify(Object.keys(pj).sort()) !== JSON.stringify(['perfil','query','sha'])) return false;
  if (typeof pj.query !== 'string') return false;
  const queryPerfil = { original: '0', r22: '1', r23: '2' };
  if (pj.query !== queryPerfil[pj.perfil] && !(pj.perfil === 'r23' && pj.query === 'default')) return false;
  if (!['default', '0', '1', '2'].includes(String(pj.query))) return false;
  if (typeof pj.sha !== 'string' || !/^[0-9a-f]{64}$/.test(pj.sha)) return false;
  if (meta.perfil && pj.perfil !== meta.perfil) return false;
  if (meta.query != null && String(pj.query) !== String(meta.query)) return false;
  const muts = lines.filter((l) => /^CAMPO-MUTANTE /.test(l));
  if (meta.mutante) {
    if (muts.length !== 1) return false;
    let mj; try { mj = JSON.parse(muts[0].slice('CAMPO-MUTANTE '.length)); } catch { return false; }
    if (mj?.name !== meta.mutante || mj?.aplicado !== true) return false;
    if (Object.keys(mj).some(k => !['name','aplicado','target'].includes(k))) return false;
    if (Object.hasOwn(mj, 'target') && (typeof mj.target !== 'string' || !mj.target)) return false;
  } else if (muts.length) return false;
  return true;
}

const INVOCADO = resolve(process.argv[1] || '') === fileURLToPath(import.meta.url);
if (INVOCADO) {
  const argv = process.argv.slice(2);
  if (argv.length > 1 || (argv.length && argv[0] !== '--self-test')) {
    console.error('uso: node tools/eval/campo-uv-finish-mutations.mjs [--self-test]');
    process.exit(2);
  }
  if (argv[0] === '--self-test') {
    const mutOk = { name: 'fim-oculto', aplicado: true };
    const provas = [
      // 9 controles originais preservados
      [aceitar({ status: 0, stdout: saida([]) }, []), true],
      [aceitar({ status: 1, stdout: saida([]) }, ['CU-2']), false],
      [aceitar({ status: 4, stdout: saida([]) }, ['CU-2']), false],
      [aceitar({ status: 1, stdout: saida(['CU-2']) }, ['CU-2']), true],
      [aceitar({ status: 3, stdout: saida(['CU-2']) }, ['CU-2']), false],
      [aceitar({ status: 1, stdout: saida(['CU-3']) }, ['CU-2']), false],
      [aceitar({ status: 1, stdout: saida(['CU-2']).replace(/^CU-1.*\n/, '') }, ['CU-2']), false],
      [aceitar({ status: 0, stdout: saida([]) + '\nCU-8 FALHA — extra' }, []), false],
      [aceitar({ status: 0, stdout: saida([]) + '\nCU-2 ERROR — extra' }, []), false],
      // perfil/query/metadata
      [aceitar({ status: 0, stdout: saida([], { perfil: linhaPerfil('r22', '1') }) }, [], { perfil: 'r23' }), false],
      [aceitar({ status: 0, stdout: saida([], { perfil: linhaPerfil('r23', '2') }) }, [], { query: 'default' }), false],
      [aceitar({ status: 0, stdout: saida([], { perfil: linhaPerfil('r23', '2') }) }, [], { perfil: 'r23', query: '2' }), true],
      [aceitar({ status: 0, stdout: saida([], { perfil: linhaPerfil('r23', 'default', 'zzz') }) }, []), false],
      [aceitar({ status: 0, stdout: saida([], { perfil: linhaPerfil() + '\n' + linhaPerfil() }) }, []), false],
      [aceitar({ status: 0, stdout: saida([]) }, []), true],
      // marker CAMPO-MUTANTE
      [aceitar({ status: 1, stdout: saida(['CU-8']) }, ['CU-8'], { mutante: 'fim-oculto' }), false],
      [aceitar({ status: 1, stdout: saida(['CU-8'], { mut: { name: 'outro', aplicado: true } }) }, ['CU-8'], { mutante: 'fim-oculto' }), false],
      [aceitar({ status: 1, stdout: saida(['CU-8'], { mut: { name: 'fim-oculto', aplicado: false } }) }, ['CU-8'], { mutante: 'fim-oculto' }), false],
      [aceitar({ status: 1, stdout: saida(['CU-8'], { mut: mutOk }) + '\nCAMPO-MUTANTE ' + JSON.stringify(mutOk) }, ['CU-8'], { mutante: 'fim-oculto' }), false],
      [aceitar({ status: 1, stdout: saida(['CU-8'], { mut: mutOk }) }, ['CU-8'], { mutante: 'fim-oculto' }), true],
      [aceitar({ status: 0, stdout: saida([], { mut: mutOk }) }, []), false],
      // protocolo: duplicada/malformada/extra/whitespace
      [aceitar({ status: 1, stdout: saida(['CU-3']) + '\nCU-3 FALHA — dup' }, ['CU-3']), false],
      [aceitar({ status: 1, stdout: saida(['CU-3']).replace('CU-3 FALHA — prova', 'CU-3 FALHA: prova') }, ['CU-3']), false],
      [aceitar({ status: 0, stdout: saida([]) + '\nCU-9 PASSA — extra' }, []), false],
      [aceitar({ status: 0, stdout: saida([]) + '\n CU-9 FALHA — fora' }, []), false],
      // sinais/timeout/infra
      [aceitar({ status: null, signal: 'SIGTERM', error: null, stdout: '' }, []), false],
      [aceitar({ status: null, signal: null, error: { code: 'ETIMEDOUT' }, stdout: '' }, []), false],
      [aceitar({ status: 2, stdout: 'uso:' }, []), false],
      [aceitar({ status: 3, stdout: 'infraestrutura' }, []), false],
      // falha extra+faltante e all-PASS/exit1
      [aceitar({ status: 1, stdout: saida(['CU-4']) }, ['CU-3']), false],
      [aceitar({ status: 1, stdout: saida(['CU-3']) }, ['CU-3', 'CU-4']), false],
      // default SHA ≠ query2 SHA
      [shaIgual('a'.repeat(64), 'a'.repeat(64)), true],
      [shaIgual('a'.repeat(64), 'b'.repeat(64)), false],
      [shaIgual('curto', 'curto'), false],
      [shaIgual('z'.repeat(64), 'z'.repeat(64)), false],
      [aceitar({ status: 0, stdout: saida([], { perfil: linhaPerfil('original', 'default') }) }, []), false],
      [aceitar({ status: 0, stdout: saida([]).replace('"query":"default"', '"query":2') }, []), false],
      [aceitar({ status: 0, stdout: saida([]) + '\n CAMPO-PERFIL {}' }, []), false],
      [aceitar({ status: 0, stdout: saida([]) + '\nCAMPO-PERFIL' }, []), false],
      [aceitar({ status: 0, stdout: saida([]) + '\nCAMPO-MUTANTE invalid' }, []), false],
      [aceitar({ status: 1, stdout: saida(['CU-8'], { mut: mutOk }), stderr: 'infraestrutura: setup falhou' }, ['CU-8'], { mutante: 'fim-oculto' }), false],
      [aceitar({ status: 0, stdout: saida([], { perfil: linhaPerfil().replace('}', ',"extra":true}') }) }, []), false],
      [aceitar({ status: 1, stdout: saida(['CU-8'], { mut: { ...mutOk, extra: true } }) }, ['CU-8'], { mutante: 'fim-oculto' }), false],
    ];
    if (provas.some(([obtido, esperado]) => obtido !== esperado)) {
      provas.forEach(([o, e], i) => { if (o !== e) console.error(`controle ${i}: obtido=${o} esperado=${e}`); });
      process.exit(1);
    }
    console.log(`CAMPO-UV wrapper: ${provas.length}/${provas.length} controles, incluindo perfil/query/marcador/infra/all-PASS e SHA default≠query2`);
  } else {
    const gate = fileURLToPath(new URL('./campo-uv-finish-check.mjs', import.meta.url));
    const roda = (args) => spawnSync(process.execPath, [gate, ...args], {
      encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024,
    });
    const recusa = (r, alvo, rotulo) => {
      console.error(`CAMPO-UV wrapper recusou ${rotulo}: status=${r.status}, alvo=${alvo.join(',') || 'nenhum'}`);
      console.error(((r.stdout || '') + '\n' + (r.stderr || '')).slice(-2400));
      process.exit(r.error || r.signal || [2, 3, 4].includes(r.status) ? 3 : 1);
    };
    let executados = 0, nas = 0;
    let shaQuery2 = null;
    for (const [nome, num] of [['original', 0], ['r22', 1], ['r23', 2]]) {
      const rn = roda([`--perfil=${nome}`, `--query=${num}`]);
      if (!aceitar(rn, [], { perfil: nome, query: String(num) })) recusa(rn, [], `nominal ${nome}`);
      if (nome === 'r23') shaQuery2 = extrairPerfil(rn.stdout)?.sha ?? null;
      console.log(`CAMPO-UV nominal ${nome}: 8/8 GREEN`); executados++;
      for (const [mut, esp] of VELHOS) {
        const r = roda([`--perfil=${nome}`, `--query=${num}`, `--mutar=${mut}`]);
        if (!aceitar(r, esp, { perfil: nome, query: String(num), mutante: mut })) recusa(r, esp, `${mut} @${nome}`);
        console.log(`CAMPO-UV ${mut} @${nome}: conjunto ${esp.join(',') || 'GREEN'} confirmado`); executados++;
      }
      for (const [mut, perfis] of NOVOS) {
        if (!perfis.includes(num)) {
          const razao = num === 0
            ? (mut === 'folha-f7-metal' ? 'roofPainted não existe no original' : `sem batch std no original`)
            : (mut === 'folha-f7-metal' ? 'folha F7 é door no r22 (roofPainted só r23)' : `não aplicável a ${nome}`);
          console.log(`CAMPO-UV ${mut} @${nome}: NA — ${razao}`); nas++;
          continue;
        }
        const r = roda([`--perfil=${nome}`, `--query=${num}`, `--mutar=${mut}`]);
        if (!aceitar(r, ['CU-8'], { perfil: nome, query: String(num), mutante: mut })) recusa(r, ['CU-8'], `${mut} @${nome}`);
        console.log(`CAMPO-UV ${mut} @${nome}: conjunto CU-8 confirmado`); executados++;
      }
    }
    const rd = roda([]);
    if (!aceitar(rd, [], { perfil: 'r23', query: 'default' })) recusa(rd, [], 'default (sem args)');
    const shaDefault = extrairPerfil(rd.stdout)?.sha ?? null;
    if (!shaIgual(shaDefault, shaQuery2)) {
      console.error(`CAMPO-UV wrapper: SHA default ${shaDefault} ≠ query2 ${shaQuery2} — equivalência estrutural quebrada`);
      process.exit(1);
    }
    console.log(`CAMPO-UV default R23: 8/8 GREEN, SHA estrutural idêntico ao --query=2`); executados++;
    console.log(`CAMPO-UV causal: executados=${executados}, NA=${nas}`);
  }
}
