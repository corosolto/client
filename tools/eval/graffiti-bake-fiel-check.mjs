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
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || '';
const MUT = arg('mutante');
const MAPA = arg('mapa') || 'loja_h';
const DERRUBA = { loja_h: 'statue_liberty\\.glb' }[MAPA] || arg('derruba');
if (MUT && MUT !== 'engole-falta') { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }
if (!process.env.BASE) { console.error('BASE ausente: suba node tools/eval/serve.mjs <porta> e passe BASE=http://127.0.0.1:<porta>'); process.exit(2); }
if (!DERRUBA) { console.error(`sem GLB conhecido para derrubar em ${MAPA}: passe --derruba=<regex>`); process.exit(2); }

const GERADOR = 'tools/gen-graffiti-layout.mjs';
const tmp = mkdtempSync(join(tmpdir(), 'grafite-fiel-'));
let gerador = GERADOR, copia = null;
if (MUT === 'engole-falta') {
  // a trava some: falta de entrada volta a ser engolida e o bake segue com a cena incompleta
  const fonte = readFileSync(GERADOR, 'utf8');
  if (fonte.split('  if (faltas.length) {').length !== 2) { console.error('mutante não achou a trava do gerador'); process.exit(2); }
  copia = 'tools/__gen-graffiti-mutante.mjs';
  writeFileSync(copia, fonte.replace('  if (faltas.length) {', '  if (false) {'));
  gerador = copia;
}

function assa(rotulo, env = {}) {
  const ck = join(tmp, `${rotulo}.json`);
  const r = spawnSync(process.execPath, [gerador, MAPA, `--checkpoint=${ck}`, '--checkpoint-only'],
    { encoding: 'utf8', env: { ...process.env, ...env } });
  const layout = existsSync(ck) ? JSON.parse(readFileSync(ck, 'utf8')).maps?.[MAPA]?.layout : undefined;
  return { status: r.status, saida: `${r.stdout}\n${r.stderr}`, layout };
}

const falhas = [];
try {
  if (!MUT) {
    const a = assa('a'), b = assa('b');
    if (a.status !== 0 || b.status !== 0 || !a.layout || !b.layout) {
      falhas.push(`G1 ${MAPA}: rodada sem layout (exit ${a.status}/${b.status})\n${(a.status ? a.saida : b.saida).trim().split('\n').slice(-6).join('\n')}`);
    } else if (JSON.stringify(a.layout) !== JSON.stringify(b.layout)) {
      falhas.push(`G1 ${MAPA}: duas rodadas deram layouts diferentes (${a.layout.pecas.length} e ${b.layout.pecas.length} peças)`);
    } else console.log(`  ✓ G1 ${MAPA}: duas rodadas, mesmo layout byte a byte (${a.layout.pecas.length} peças)`);
  }
  const c = assa('derrubado', { GRAFITE_DERRUBA: DERRUBA });
  if (c.status === 0 || c.layout) {
    falhas.push(`G2 ${MAPA}: sem ${DERRUBA} o bake seguiu e gravou ${c.layout?.pecas?.length ?? '?'} peças, em vez de cancelar`);
  } else if (!/entrada\(s\) faltando/.test(c.saida)) {
    falhas.push(`G2 ${MAPA}: o bake parou, mas não pela trava de entrada (exit ${c.status})\n${c.saida.trim().split('\n').slice(-6).join('\n')}`);
  } else console.log(`  ✓ G2 ${MAPA}: sem ${DERRUBA} o bake cancela e lista a falta`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
  if (copia) rmSync(copia, { force: true });
}

for (const f of falhas) console.log(`  ✗ ${f}`);
const mutacaoCega = MUT && !falhas.length;
if (mutacaoCega) console.log(`  ✗ MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego (lei 3)`);
process.exit(falhas.length || mutacaoCega ? 1 : 0);
