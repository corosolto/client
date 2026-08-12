/* ============================================================================
   deps-check.mjs — VULNERABILIDADE NOVA EM DEPENDÊNCIA DE PRODUÇÃO REPROVA
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   Em 12/08/2026 o `npm audit --omit=dev` devolvia 8 vulnerabilidades, 6 altas, e
   NENHUM portão olhava para isso - a primeira vez que alguém rodou foi numa
   auditoria manual. Cinco saíram com `npm audit fix` (só o lock mudou). As três
   que sobraram são a mesma raiz e estão ISENTAS aqui, com a análise embaixo.

   O QUE ELA MEDE: `npm audit --omit=dev`, alta ou crítica, fora da lista de
   isenção. A lista é nominal e datada; vulnerabilidade nova reprova mesmo que
   pareça parecida com uma isenta.

   FORA DO `check:deploy` DE PROPÓSITO: o audit precisa de REDE, e o check:deploy
   roda dentro do build da Vercel, onde o contrato é "sem browser e sem rede".
   Este portão é passo de CI, junto do build.

   Mutantes: sem-isencao (ignora a lista e as 3 conhecidas devem acender) e
   isencao-vazia (prova que a lista é o que segura, não um `exit 0` escondido).

   Uso: node tools/eval/deps-check.mjs [--mutante=sem-isencao|isencao-vazia]
   ============================================================================ */
import { execFileSync } from 'node:child_process';

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const mutante = arg('mutante');
if (mutante && !['sem-isencao', 'isencao-vazia'].includes(mutante)) {
  throw new Error(`mutante desconhecido: ${mutante}`);
}

/* Isenção NOMINAL, com prazo de reavaliação. Cada linha diz por que o risco não
   se realiza aqui - "é transitiva" não é motivo. */
const ISENTAS = new Map([
  ['@astrojs/vercel', 'path-to-regexp com backtracking, via @vercel/routing-utils. Reavaliar em 09/2026.'],
  ['@vercel/routing-utils', 'mesma raiz do path-to-regexp. Reavaliar em 09/2026.'],
  ['path-to-regexp', [
    'ReDoS por backtracking. NÃO exposto: o pacote entra só pelo dist/index.js do adapter,',
    'que é a integração de BUILD (getTransformedRoutes/normalizeRoutes). O runtime da',
    'função é dist/serverless/entrypoint.js e não importa routing-utils. As rotas',
    'transformadas saem do astro.config e do roteamento por arquivo - não há entrada de',
    'usuário no caminho. O "fix" do npm é @astrojs/vercel@8, que é DOWNGRADE e não',
    'atende o peer astro ^7.0.0. Reavaliar quando o adapter 11.x subir o routing-utils.',
  ].join(' ')],
]);

const GRAVES = new Set(['high', 'critical']);

let relatorio;
try {
  relatorio = JSON.parse(execFileSync('npm', ['audit', '--omit=dev', '--json'], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 32 * 1024 * 1024,
  }));
} catch (erro) {
  /* `npm audit` sai != 0 QUANDO ACHA ALGO: a saída ainda é o JSON, e é ela que
     interessa. Só é falha de verdade quando não veio JSON nenhum. */
  try { relatorio = JSON.parse(erro.stdout || ''); } catch {
    console.error('  \x1b[31m✗\x1b[0m DEP0 npm audit não devolveu JSON (rede?):', String(erro.message).split('\n')[0]);
    process.exitCode = 1;
    relatorio = null;
  }
}

if (relatorio) {
  const isentas = mutante === 'sem-isencao' || mutante === 'isencao-vazia' ? new Map() : ISENTAS;
  const falhas = [];
  const perdoadas = [];
  for (const [nome, v] of Object.entries(relatorio.vulnerabilities || {})) {
    if (!GRAVES.has(v.severity)) continue;
    if (isentas.has(nome)) { perdoadas.push(nome); continue; }
    falhas.push(`DEP1 ${v.severity} em \`${nome}\` — fix: ${v.fixAvailable === true ? 'npm audit fix' : (v.fixAvailable ? `${v.fixAvailable.name}@${v.fixAvailable.version}${v.fixAvailable.isSemVerMajor ? ' (MAJOR)' : ''}` : 'nenhum')}`);
  }
  /* Isenção que não corresponde a nada vira letra morta e some da revisão. */
  if (!mutante) {
    for (const nome of ISENTAS.keys()) {
      if (!(relatorio.vulnerabilities || {})[nome]) falhas.push(`DEP2 isenção de \`${nome}\` não corresponde a nenhuma vulnerabilidade — tire da lista`);
    }
  }

  for (const f of falhas) console.error(`  \x1b[31m✗\x1b[0m ${f}`);
  if (falhas.length) {
    console.error(`\x1b[31mDEPS ${falhas.length} VERMELHA(S)\x1b[0m${mutante ? ` (mutante=${mutante})` : ''}`);
    console.error('  Conserte, ou isente NOMINALMENTE em tools/eval/deps-check.mjs dizendo por que o risco não se realiza aqui.');
    process.exitCode = 1;
  } else {
    console.log(`\x1b[32mDEPS verde: nenhuma vulnerabilidade alta fora da lista (${perdoadas.length} isenta[s])\x1b[0m`);
  }
}
