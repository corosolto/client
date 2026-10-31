/* ============================================================================
   sonda-filho.mjs — TRÊS DESFECHOS, NÃO DOIS. (issue #1133)
   ----------------------------------------------------------------------------
   POR QUE EXISTE

   Portão que roda um processo filho e lê só `status === 0` conhece dois
   desfechos: passou e não passou. Mas existem TRÊS:

     1. ok            — medi, e o conteúdo está certo.
     2. reprovou      — medi, e o conteúdo está errado.
     3. não consegui medir — o filho morreu antes de medir coisa alguma.

   Colapsar (3) em (2) produz o pior tipo de saída de portão: um veredito
   confiante sobre a coisa errada. Foi o que a SB7 fez em 2026-10-28. Numa
   worktree recém-criada, sem `npm ci`, ela imprimia:

       ✗ SB7 módulos locais mudam de URL junto com o conteúdo

   quando a causa real, duas camadas abaixo, era:

       Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'astro'
         imported from tools/eval/serve.mjs

   Ninguém tinha mexido em cache-bust. O que faltava era dependência. A régua
   acusou o réu errado, e quem batia nisso ia procurar bug de versionamento de
   URL por horas. Pior: a regra da casa é worktree por feature, então TODA lane
   nova pagava esse pedágio — e o caminho natural de quem paga pedágio demais é
   concluir que o portão é chato e contorná-lo.

   O colapso simétrico é ainda pior e também existia aqui: num arquivo de
   mutantes, que espera `status !== 0` para declarar o mutante MORTO, um filho
   que morre por dependência ausente vira mutante "detectado". Aí o colapso não
   produz vermelho mentiroso, produz VERDE mentiroso — a régua declara que ainda
   morde sem ter encostado no código. Falso-verde é a lei nº 1 da casa.

   ── POR QUE SKIP NÃO É VERDE, E TAMBÉM NÃO É VERMELHO ───────────────────────

   A tentação é mapear "não consegui medir" para um dos dois códigos que já
   existem. As duas opções são erradas, por motivos opostos:

   • SKIP como 0 (verde) é falso-verde. O portão desapareceria exatamente no
     ambiente onde ele é mais necessário: o mal configurado. Um CI com cache de
     node_modules quebrado passaria a aprovar tudo, em silêncio, para sempre.

   • SKIP como 1 (vermelho) é o defeito original de volta. O veredito fica de
     novo indistinguível de "o conteúdo está quebrado", e a lane é bloqueada por
     algo que não é defeito dela.

   Então SKIP tem código próprio: 78. Não é número inventado — é EX_CONFIG do
   sysexits.h, cuja definição ("configuration error") é literalmente o caso:
   o ambiente está errado, o código não. Com um terceiro código, cada consumidor
   decide a política sabendo sobre o que está decidindo — o runner pinta de
   amarelo e conta à parte, o CI trata como falha de infraestrutura — e nenhum
   deles precisa adivinhar a partir de um 1 ambíguo.

   A mensagem de SKIP carrega sempre a causa e o comando que conserta. Portão
   que não passou e não diz o que fazer é só uma forma mais lenta de ser inútil.

   ── USO ─────────────────────────────────────────────────────────────────────

     import { sonda, pulaSeNaoMediu, SAIDA_SKIP } from './sonda-filho.mjs';

     const r = sonda([ 'tools/eval/social-serve-check.mjs' ]);
     pulaSeNaoMediu(r, 'SB7');            // sai com 78 se o filho não mediu
     const clausula = r.status === 0;     // aqui o status já significa conteúdo

   Para quem chama `execFileSync` dentro de try/catch, `causaNaoMedivel` também
   aceita a exceção lançada — ela carrega `status`, `stdout` e `stderr`.
   ============================================================================ */
import { spawnSync } from 'node:child_process';

/* EX_CONFIG do sysexits.h: o ambiente está mal configurado, não o código. */
export const SAIDA_SKIP = 78;

/* Um módulo que não resolve, um .node que não carrega, um binário que não
   existe. Todos significam "o filho morreu antes de medir", nunca "o conteúdo
   que eu deveria medir está errado". */
const FALTA_MODULO = /ERR_MODULE_NOT_FOUND|ERR_DLOPEN_FAILED|MODULE_NOT_FOUND|Cannot find package|Cannot find module/;
const NOME_PACOTE = /Cannot find (?:package|module) '([^']+)'/;

const CONSERTO = 'rode `npm ci` na raiz desta worktree';

/* Devolve a causa de "não consegui medir", ou null se o filho realmente mediu.
   Aceita tanto o objeto de retorno de spawnSync quanto a exceção de execFileSync. */
export function causaNaoMedivel(resultado) {
  if (!resultado) return null;
  const falha = resultado.error || resultado;
  if (falha && falha.code === 'ENOENT' && !resultado.stderr) {
    return `executável ausente (${falha.path || falha.syscall || 'desconhecido'})`;
  }
  const texto = `${resultado.stderr || ''}${resultado.stdout || ''}${resultado.error?.message || ''}`;
  if (!FALTA_MODULO.test(texto)) return null;
  const pacote = texto.match(NOME_PACOTE)?.[1] || '';
  const alvo = pacote.startsWith('/') ? pacote : pacote && `'${pacote}'`;
  return `dependência ausente${alvo ? `: ${alvo}` : ''} — ${CONSERTO}`;
}

/* Roda o filho e anexa o diagnóstico. `desfecho` já vem resolvido nos três
   valores; quem chama nunca mais precisa inferir isso de um inteiro. */
export function sonda(args, opcoes = {}) {
  const resultado = spawnSync(process.execPath, args, { encoding: 'utf8', ...opcoes });
  const causa = causaNaoMedivel(resultado);
  const desfecho = causa ? 'nao-medi' : resultado.status === 0 ? 'ok' : 'reprovou';
  return { ...resultado, causa, desfecho, mediu: !causa };
}

/* Imprime o SKIP no formato que o runner reconhece e encerra com 78. */
export function pula(causa, clausula = '') {
  const etiqueta = clausula ? `${clausula} ` : '';
  console.error(`\x1b[33m⊘ SKIP ${etiqueta}não medido: ${causa}\x1b[0m`);
  process.exit(SAIDA_SKIP);
}

export function pulaSeNaoMediu(resultado, clausula = '') {
  if (resultado?.causa) pula(resultado.causa, clausula);
  return resultado;
}
