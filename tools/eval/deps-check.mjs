/* ============================================================================
   deps-check.mjs — VULNERABILIDADE NOVA EM DEPENDÊNCIA DE PRODUÇÃO REPROVA
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   Em 12/08/2026 o `npm audit --omit=dev` devolvia 8 vulnerabilidades, 6 altas, e
   NENHUM portão olhava para isso - a primeira vez que alguém rodou foi numa
   auditoria manual. A régua acompanha o audit e exige a remoção de isenções
   quando a vulnerabilidade correspondente desaparece.

   O QUE ELA MEDE: `pnpm audit --prod`, alta ou crítica, fora da lista de
   isenção.
   A lista é nominal e datada; vulnerabilidade nova reprova mesmo que pareça
   parecida com uma isenta.

   FORA DO `check:deploy` DE PROPÓSITO: o audit precisa de REDE, e o check:deploy
   roda dentro do build da Vercel, onde o contrato é "sem browser e sem rede".
   Este portão é passo de CI, junto do build.

   Mutantes: sem-isencao (vulnerabilidade sintética deve acender),
   isencao-vazia (prova que a lista é o que segura, não um `exit 0` escondido) e
   advisory-nova (advisory desconhecida em pacote isento tem que reprovar - isenção
   por nome esconderia exatamente esse caso).

   Uso: node tools/eval/deps-check.mjs [--mutante=sem-isencao|isencao-vazia|advisory-nova]
   ============================================================================ */
import { execFileSync } from 'node:child_process';

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const mutante = arg('mutante');
if (mutante && !['sem-isencao', 'isencao-vazia', 'advisory-nova'].includes(mutante)) {
  throw new Error(`mutante desconhecido: ${mutante}`);
}

/* Isenção amarrada à assinatura da advisory (trecho de URL/título), por pacote.
   Cada linha diz por que o risco não se realiza aqui. */
// GitHub withdrew GHSA-fc5q-39xc-vjpf on 2026-11-18; the audit no longer reports that chain.
const ISENTAS = new Map();

const GRAVES = new Set(['high', 'critical']);

const assinatura = (advisory) => JSON.stringify([advisory.url || '', advisory.title || '']);
const registro = (valor) => valor && typeof valor === 'object' && !Array.isArray(valor);
const relatorioValido = (valor) => registro(valor?.advisories) && !valor.error
  && Object.values(valor.advisories).every((a) => registro(a)
    && typeof a.module_name === 'string' && a.module_name && typeof a.severity === 'string');

let relatorio;
/* Vulnerabilidade sintética: com a lista de isenções vazia (as três saíram no #363), mutar a
   lista virou no-op e os dois mutantes ficaram cegos — eles precisam TRAZER o vermelho. */
const VULN_SINTETICA = { advisories: { 1: { module_name: 'pacote-sintetico', severity: 'high',
  url: 'https://github.com/advisories/GHSA-sintetica-0000-0000', title: 'vulnerabilidade alta de mutante' } } };
const ISENCAO_FIXTURE = new Map([['pacote-sintetico', { adv: ['GHSA-fixture-approved'], motivo: '' }]]);
if (mutante === 'advisory-nova') {
  /* Advisory fantasma num pacote isento no fixture: só DEP3 pode reprovar. */
  relatorio = { advisories: { 2: { module_name: 'pacote-sintetico', severity: 'high',
    url: 'https://github.com/advisories/GHSA-fantasma-0000-0000', title: 'advisory que a isenção não conhece' } } };
} else if (mutante === 'sem-isencao' || mutante === 'isencao-vazia') {
  relatorio = VULN_SINTETICA;
} else try {
  relatorio = JSON.parse(execFileSync('pnpm', ['audit', '--prod', '--json'], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 32 * 1024 * 1024,
  }));
} catch (erro) {
  // Audit também sai != 0 quando encontra advisory; o JSON distingue isso de erro de execução.
  try { relatorio = JSON.parse(erro.stdout || ''); } catch { relatorio = null; }
}

if (!relatorioValido(relatorio)) {
  console.error('  \x1b[31m✗\x1b[0m DEP0 pnpm audit não devolveu um relatório válido (rede ou formato do registry)');
  process.exitCode = 1;
  relatorio = null;
}

if (relatorio) {
  /* `sem-isencao`: alta sem isenção nenhuma reprova (DEP1). `isencao-vazia`: isenção que não
     LISTA a advisory não perdoa (DEP3) — perdão por nome viraria `exit 0` disfarçado. */
  const isentas = mutante === 'sem-isencao' ? new Map()
    : mutante === 'isencao-vazia' ? new Map([['pacote-sintetico', { adv: [], motivo: '' }]])
    : mutante === 'advisory-nova' ? ISENCAO_FIXTURE : ISENTAS;
  const falhas = [];
  const perdoadas = new Set();
  const correspondem = new Set();
  for (const advisory of Object.values(relatorio.advisories)) {
    const nome = advisory.module_name;
    const id = assinatura(advisory);
    const isencao = isentas.get(nome);
    const isenta = isencao?.adv.some((trecho) => id.includes(trecho));
    if (isenta) correspondem.add(nome);
    if (!GRAVES.has(advisory.severity)) continue;
    if (isenta) perdoadas.add(nome);
    else if (isencao) falhas.push(`DEP3 advisory NOVA em \`${nome}\` (isento de outra advisory) — ${id.slice(0, 120)}`);
    else falhas.push(`DEP1 ${advisory.severity} em \`${nome}\` — ${advisory.url || advisory.title || 'advisory sem URL'}`);
  }
  if (!mutante) {
    for (const nome of ISENTAS.keys()) {
      if (!correspondem.has(nome)) falhas.push(`DEP2 isenção de \`${nome}\` não corresponde a nenhuma advisory — tire da lista`);
    }
  }
  for (const f of falhas) console.error(`  \x1b[31m✗\x1b[0m ${f}`);
  if (falhas.length) {
    console.error(`\x1b[31mDEPS ${falhas.length} VERMELHA(S)\x1b[0m${mutante ? ` (mutante=${mutante})` : ''}`);
    console.error('  Conserte, ou isente NOMINALMENTE em tools/eval/deps-check.mjs dizendo por que o risco não se realiza aqui.');
    process.exitCode = 1;
  } else {
    console.log(`\x1b[32mDEPS verde: nenhuma vulnerabilidade alta fora da lista (${perdoadas.size} isenta[s])\x1b[0m`);
  }
}
