#!/usr/bin/env node
/* ============================================================================
   repesar-skin.mjs — reescreve SÓ os pesos de skin (JOINTS_0/WEIGHTS_0) de um
   GLB meshy-28 pelas regras de tools/personagens/pesos-skin.mjs (REGRAS).
   ----------------------------------------------------------------------------
   Uso:
     node tools/personagens/repesar-skin.mjs <entrada.glb> <saida.glb> --receita=<id>
     node tools/personagens/repesar-skin.mjs <entrada.glb> <saida.glb> [--anel=2 --ombroR0=1.5 ...]
     node tools/personagens/repesar-skin.mjs --regras

   --receita=<id> lê os parâmetros de tools/personagens/pesos-receitas.json e
   exige que a entrada seja o arquivo de origem registrado (sha256).

   Antes de gravar, prova que fora dos bytes de JOINTS_0/WEIGHTS_0 a saída é
   idêntica à entrada (mesmo tamanho, mesmo JSON, mesmas posições, normais,
   UV, tangentes, materiais, texturas, esqueleto, IBMs e animações) e imprime o
   vazamento braço→perna antes/depois com a conta do censo. Determinístico.
   ============================================================================ */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PARAMETROS, REGRAS, lerGlb, localizadoresDePele, medirVazamento, repesar } from './pesos-skin.mjs';

const args = process.argv.slice(2);
if (args.includes('--regras')) { for (const r of REGRAS) console.log(r); process.exit(0); }
const [entrada, saida] = args.filter((a) => !a.startsWith('--'));
if (!entrada || !saida) {
  console.error('uso: repesar-skin.mjs <entrada.glb> <saida.glb> [--receita=<id>] [--<parâmetro>=<n>] | --regras');
  process.exit(1);
}
const opcao = (n) => args.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const sha = (b) => createHash('sha256').update(b).digest('hex');
const antes = lerGlb(entrada);
const opcoes = {};
const receita = opcao('receita');
if (receita) {
  const r = JSON.parse(readFileSync(new URL('./pesos-receitas.json', import.meta.url))).receitas[receita];
  if (!r) throw new Error(`receita ${receita} não existe em pesos-receitas.json`);
  if (sha(antes.buf) !== r.origemSha256) throw new Error(`${entrada} não é a origem da receita ${receita} (sha256 ${sha(antes.buf)} ≠ ${r.origemSha256})`);
  Object.assign(opcoes, r.parametros);
}
for (const n of Object.keys(PARAMETROS)) if (opcao(n) != null) opcoes[n] = Number(opcao(n));

const { bytes, relatorio } = repesar(antes.buf, opcoes);

// Prova de que só pesos mudaram: todo byte diferente cai dentro de JOINTS_0/WEIGHTS_0.
if (bytes.length !== antes.buf.length) throw new Error('tamanho mudou: abortado');
const permitido = new Uint8Array(bytes.length);
for (const [ini, fim] of localizadoresDePele(antes)) permitido.fill(1, ini, fim);
let fora = 0, dentro = 0;
for (let i = 0; i < bytes.length; i++) if (bytes[i] !== antes.buf[i]) { if (permitido[i]) dentro++; else fora++; }
if (fora) throw new Error(`${fora} byte(s) fora de JOINTS_0/WEIGHTS_0 mudaram: abortado`);

const va = medirVazamento(antes), vd = medirVazamento(lerGlb(bytes));
writeFileSync(saida, bytes);
console.log(JSON.stringify({
  entrada, saida, receita: receita || null, parametros: { ...PARAMETROS, ...opcoes },
  sha256Entrada: sha(antes.buf), sha256: sha(bytes), bytes: bytes.length, bytesAlterados: dentro, primitivas: relatorio,
  vazamento: { antes: { ...va, pct: +va.pct.toFixed(2) }, depois: { ...vd, pct: +vd.pct.toFixed(2) } },
}, null, 2));
