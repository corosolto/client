import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
if (args.length !== 0 && (args.length !== 1 || !args[0].startsWith('--checker='))) process.exit(2);
const checkerPath = args.length === 0 ? fileURLToPath(new URL('./operacao-flavio-check.mjs', import.meta.url)) : args[0].slice('--checker='.length);
if (!isAbsolute(checkerPath)) process.exit(2);

let fonte;
try { fonte = readFileSync(checkerPath, 'utf8'); }
catch (erro) { console.log(JSON.stringify({ tool: 'operacao-flavio-core-verdict-proof.mjs', infra: true, cases: [], error: String(erro?.message ?? erro).slice(0, 240) })); process.exit(2); }
const ancoraHelperInicio = 'let falhas = 0;';
const ancoraHelperFim = 'const caminho =';
const ancoraVeredito = 'if (mutante) {';
function posicaoUnica(ancora) {
  if (fonte.split(ancora).length !== 2) return -1;
  return fonte.indexOf(ancora);
}
const inicioHelper = posicaoUnica(ancoraHelperInicio);
const fimHelper = posicaoUnica(ancoraHelperFim);
const inicioVeredito = posicaoUnica(ancoraVeredito);
if (inicioHelper < 0 || fimHelper <= inicioHelper || inicioVeredito < fimHelper) process.exit(2);
const helper = fonte.slice(inicioHelper, fimHelper);
const veredito = fonte.slice(inicioVeredito);

const propria = 'atacante no raio interrompe a escolta';
const outra = 'escolta viva move Flávio a 1,8 m/s';
const casos = [];
for (const modo of [{ id: '', rotulo: 'baseline' }, { id: 'sem-contestacao', rotulo: 'mutante' }]) {
  for (const propriaOk of [true, false]) {
    for (const outraOk of [true, false]) {
      casos.push({
        nome: `${modo.rotulo}:propria-${propriaOk ? 'ok' : 'falha'}:outra-${outraOk ? 'ok' : 'falha'}`,
        mutante: modo.id,
        fixtures: [{ texto: propria, ok: propriaOk }, { texto: outra, ok: outraOk }],
        esperado: modo.id ? (propriaOk ? 1 : 0) : (propriaOk && outraOk ? 0 : 1),
      });
    }
  }
}

let infra = false;
const resultadoCasos = [];
for (const caso of casos) {
  let atual = null;
  const sentinela = Object.freeze({ tipo: 'veredito-proprio' });
  try {
    const executar = new Function('process', 'console', 'fixtures', 'mutante',
      `${helper}\nfor (const fixture of fixtures) cobra(fixture.ok, fixture.texto);\n${veredito}`);
    executar({
      exit(code) {
        atual = code;
        throw sentinela;
      },
    }, { log() {} }, caso.fixtures, caso.mutante);
  } catch (erro) {
    if (erro !== sentinela) infra = true;
  }
  if (atual === null) infra = true;
  const passa = !infra && atual === caso.esperado;
  resultadoCasos.push({ nome: caso.nome, pass: passa, actualExit: atual, expectedExit: caso.esperado });
}

const tudoPassa = !infra && resultadoCasos.every((caso) => caso.pass);
console.log(JSON.stringify({
  tool: 'operacao-flavio-core-verdict-proof.mjs',
  sourceSHA: createHash('sha256').update(fonte).digest('hex'),
  infra,
  cases: resultadoCasos,
}, null, 2));
process.exit(infra ? 2 : tudoPassa ? 0 : 1);
