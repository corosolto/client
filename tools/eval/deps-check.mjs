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

   Mutantes: sem-isencao (ignora a lista e as 3 conhecidas devem acender),
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

/* Isenção amarrada à ADVISORY, não só ao nome: pacote perdoado hoje pode ganhar
   amanhã uma advisory nova, e isenção por nome a esconderia. `adv` lista as
   assinaturas (trecho de URL/título) que cobrem a isenção; entrada de cadeia
   (via só com nomes de pacote) não carrega advisory própria - a raiz carrega.
   Cada linha diz por que o risco não se realiza aqui - "é transitiva" não é motivo. */
/* Vazia de propósito desde 21/08/2026: as três isenções que moravam aqui (@astrojs/vercel,
   @vercel/routing-utils, path-to-regexp) cobriam a MESMA cadeia de ReDoS, fechada pelo #363
   com override para path-to-regexp ^6.3.0 — e o DEP2 acusou que elas viraram letra morta. */
const ISENTAS = new Map([]);

const GRAVES = new Set(['high', 'critical']);

/* Advisory de objeto carrega `url`/`title`; string na via é elo de cadeia. */
const assinaturas = (via) => (Array.isArray(via) ? via : [])
  .filter((e) => e && typeof e === 'object')
  .map((e) => JSON.stringify([e.url || '', e.title || '']));

let relatorio;
/* Vulnerabilidade sintética: com a lista de isenções vazia (as três saíram no #363), mutar a
   lista virou no-op e os dois mutantes ficaram cegos — eles precisam TRAZER o vermelho. */
const VULN_SINTETICA = { vulnerabilities: { 'pacote-sintetico': { severity: 'high', fixAvailable: true,
  via: [{ url: 'https://github.com/advisories/GHSA-sintetica-0000-0000', title: 'vulnerabilidade alta de mutante' }] } } };
if (mutante === 'advisory-nova') {
  relatorio = { vulnerabilities: { 'path-to-regexp': { severity: 'high', fixAvailable: false,
    via: [{ url: 'https://github.com/advisories/GHSA-fantasma-0000-0000', title: 'advisory que a isenção não conhece' }] } } };
} else if (mutante === 'sem-isencao' || mutante === 'isencao-vazia') {
  relatorio = VULN_SINTETICA;
} else try {
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
  /* `sem-isencao`: alta sem isenção nenhuma reprova (DEP1). `isencao-vazia`: isenção que não
     LISTA a advisory não perdoa (DEP3) — perdão por nome viraria `exit 0` disfarçado. */
  const isentas = mutante === 'sem-isencao' ? new Map()
    : mutante === 'isencao-vazia' ? new Map([['pacote-sintetico', { adv: [], motivo: '' }]])
    : ISENTAS;
  const falhas = [];
  const perdoadas = [];
  for (const [nome, v] of Object.entries(relatorio.vulnerabilities || {})) {
    if (!GRAVES.has(v.severity)) continue;
    if (isentas.has(nome)) {
      const esperadas = isentas.get(nome).adv;
      const desconhecidas = assinaturas(v.via).filter((s) => !esperadas.some((a) => s.includes(a)));
      if (desconhecidas.length) {
        falhas.push(`DEP3 advisory NOVA em \`${nome}\` (isento de outra advisory) — ${desconhecidas[0].slice(0, 120)}`);
        continue;
      }
      perdoadas.push(nome);
      continue;
    }
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
