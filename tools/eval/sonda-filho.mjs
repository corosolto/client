/* Três desfechos de filho — ok, reprovou e "não consegui medir" (SKIP=EX_CONFIG):
   por quê, uso e limites da heurística em docs/docs/sonda-processos.md (issue #1133). */
import { spawnSync } from 'node:child_process';

/* EX_CONFIG do sysexits.h: o ambiente está mal configurado, não o código. */
export const SAIDA_SKIP = 78;

/* Módulo que não resolve, .node que não carrega ou binário ausente: o filho
   morreu antes de medir — nunca veredito de conteúdo. */
const FALTA_MODULO = /ERR_MODULE_NOT_FOUND|ERR_DLOPEN_FAILED|MODULE_NOT_FOUND|Cannot find package|Cannot find module/;
const NOME_PACOTE = /Cannot find (?:package|module) '([^']+)'/;

const CONSERTO = 'rode `npm ci` na raiz desta worktree';

/* Devolve a causa de "não consegui medir", ou null se o filho realmente mediu.
   Aceita tanto o objeto de retorno de spawnSync quanto a exceção de execFileSync. */
export function causaNaoMedivel(resultado) {
  if (!resultado) return null;
  const falha = resultado.error || resultado;
  const erroExecucao = resultado.error || (resultado instanceof Error && typeof resultado.code === 'string');
  // ENOBUFS pode coexistir com status0; erro do executor e saída parcial não medem.
  if (erroExecucao || resultado.status === null) {
    if (falha.code === 'ENOENT' && !resultado.stderr) {
      return `executável ausente (${falha.path || falha.syscall || 'desconhecido'})`;
    }
    const estado = resultado.signal ? `morto por ${resultado.signal}` : 'sem resultado completo';
    const detalhes = [falha.code, falha.code === 'ETIMEDOUT' ? 'timeout' : ''].filter(Boolean).join(', ');
    return `filho ${estado} antes de medir${detalhes ? ` (${detalhes})` : ''}`;
  }
  /* Exit0 sem erro do executor mediu: erro citado na saída é dado, não causa. */
  if (resultado.status === 0) return null;
  if (falha && falha.code === 'ENOENT' && !resultado.stderr) {
    return `executável ausente (${falha.path || falha.syscall || 'desconhecido'})`;
  }
  const texto = `${resultado.stderr || ''}${resultado.stdout || ''}${resultado.error?.message || ''}`;
  if (!FALTA_MODULO.test(texto)) return null;
  const pacote = texto.match(NOME_PACOTE)?.[1] || '';
  /* Especificador de arquivo ('./x', '/x') é import quebrado no próprio
     conteúdo; bare é pacote npm ausente — só ele é infra (issue #1133). */
  if (/^(?:\.{1,2}\/|\/|file:|[A-Za-z]:[\\/])/.test(pacote)) return null;
  return `dependência ausente${pacote ? `: '${pacote}'` : ''} — ${CONSERTO}`;
}

/* Roda o filho e anexa o diagnóstico. `desfecho` já vem resolvido nos três
   valores; quem chama nunca mais precisa inferir isso de um inteiro. */
export function sonda(args, opcoes = {}) {
  const resultado = spawnSync(process.execPath, args, { encoding: 'utf8', ...opcoes });
  const causa = causaNaoMedivel(resultado);
  const desfecho = causa ? 'nao-medi' : resultado.status === 0 ? 'ok' : 'reprovou';
  return { ...resultado, causa, desfecho, mediu: !causa };
}

/* Imprime o SKIP no formato que o runner reconhece e encerra com 78 — a menos que
   um veredito de conteúdo (exitCode≠0) já exista: falha medida vence SKIP. */
export function pula(causa, clausula = '') {
  const etiqueta = clausula ? `${clausula} ` : '';
  console.error(`\x1b[33m⊘ SKIP ${etiqueta}não medido: ${causa}\x1b[0m`);
  process.exit(process.exitCode || SAIDA_SKIP);
}
