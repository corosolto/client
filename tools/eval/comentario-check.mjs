/* ============================================================================
   comentario-check.mjs — COMENTÁRIO NOVO CABE EM DUAS LINHAS, E É EM PORTUGUÊS
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   A regra é do `CONTRIBUTING.md` ("Código não é relatório") e do `AGENTS.md`
   ("orçamento quase zero"), e nunca teve régua: quem cobrava era revisor humano
   ou bot de PR, sempre DEPOIS do push. Em 12/08/2026 o greptile reprovou um
   comentário de quatro linhas EM INGLÊS no `src/lib/error-provenance.mjs` — duas
   violações da mesma regra escrita em dois arquivos, num PR que passou por
   dezessete portões verdes.

   O QUE ELA MEDE: só o que o diff ACRESCENTA contra a base. Código velho não é
   reescrito por régua nova — isso é ratchet, não faxina.

   ONDE ELA MEDE: `public/js/` e `src/`, que é o código do jogo e do site. O
   `tools/eval/` fica FORA de propósito: o cabeçalho longo de régua (qual defeito
   a comprou, como mede, quais mutantes) é o padrão da casa, e é ele que faz o
   arnês ser legível por quem chega.

   Cláusulas: CM1 bloco de comentário novo com mais de 2 linhas; CM2 comentário
   novo sem uma palavra portuguesa e com marca de inglês.

   Mutantes: bloco-longo e comentario-ingles injetam a violação e devem acender.

   Uso: node tools/eval/comentario-check.mjs [--base=origin/main]
        [--mutante=bloco-longo|comentario-ingles]
   ============================================================================ */
import { execFileSync } from 'node:child_process';

const arg = (nome) => (process.argv.find((a) => a.startsWith(`--${nome}=`)) || '').split('=')[1] || '';
const mutante = arg('mutante');
if (mutante && !['bloco-longo', 'comentario-ingles'].includes(mutante)) {
  throw new Error(`mutante desconhecido: ${mutante}`);
}
const base = arg('base') || 'origin/main';

const TETO_LINHAS = 2;
const ZONAS = /^(public\/js\/|src\/)/;
/* Marca de inglês só conta quando NENHUMA palavra portuguesa aparece: comentário
   misto ("o cache do fallback") é normal e não é violação de idioma. */
const INGLES = /\b(the|this|that|when|which|because|should|would|with|from|does|has|are|is)\b/i;
const PORTUGUES = /\b(o|a|os|as|de|do|da|que|não|é|por|para|com|quando|porque|sem|já|pra|no|na|um|uma|em|se)\b/i;

function diff() {
  try {
    return execFileSync('git', ['diff', '--unified=0', `${base}...HEAD`, '--', 'public/js', 'src'], { encoding: 'utf8' });
  } catch {
    return '';
  }
}

/* Linha ACRESCENTADA que abre ou continua comentário. Não é parser de JS: régua que
   precisa de AST para medir estilo custa mais do que o defeito que ela pega. */
const abreBloco = (t) => /^\s*\/\*/.test(t);
const fechaBloco = (t) => /\*\//.test(t);
const ehLinha = (t) => /^\s*\/\//.test(t);
const ehCorpo = (t) => /^\s*\*/.test(t);

function blocos(texto) {
  const achados = [];
  let arquivo = null;
  let atual = null;
  const fecha = () => { if (atual && atual.linhas.length) achados.push(atual); atual = null; };
  for (const linha of texto.split('\n')) {
    if (linha.startsWith('+++ b/')) { fecha(); arquivo = linha.slice(6); continue; }
    if (linha.startsWith('@@')) { fecha(); continue; }
    if (!arquivo || !ZONAS.test(arquivo)) continue;
    if (!linha.startsWith('+') || linha.startsWith('+++')) { fecha(); continue; }
    const t = linha.slice(1);
    const dentro = atual && atual.aberto;
    if (abreBloco(t) || ehLinha(t) || (dentro && (ehCorpo(t) || !fechaBloco(t)))) {
      if (!atual) atual = { arquivo, linhas: [], aberto: abreBloco(t) && !fechaBloco(t) };
      atual.linhas.push(t.trim());
      if (fechaBloco(t)) atual.aberto = false;
      continue;
    }
    fecha();
  }
  fecha();
  return achados;
}

let texto = diff();
if (mutante === 'bloco-longo') {
  texto += '\n+++ b/src/mutante.ts\n@@ -0,0 +1,4 @@\n+// uma linha do mutante\n+// segunda linha do mutante\n+// terceira linha do mutante\n';
}
if (mutante === 'comentario-ingles') {
  texto += '\n+++ b/src/mutante.ts\n@@ -0,0 +1,1 @@\n+// this comment is written in english and should be flagged\n';
}

const falhas = [];
for (const b of blocos(texto)) {
  const corpo = b.linhas.join(' ');
  /* Cabeçalho de arquivo gerado e diretiva não são prosa: eles não têm orçamento. */
  if (/GERADO|eslint|@ts-|prettier|BEGIN:|END:/.test(corpo)) continue;
  if (b.linhas.length > TETO_LINHAS) {
    falhas.push(`CM1 ${b.arquivo}: comentário novo de ${b.linhas.length} linhas (teto ${TETO_LINHAS}) — "${b.linhas[0].slice(0, 50)}…"`);
  }
  if (INGLES.test(corpo) && !PORTUGUES.test(corpo)) {
    falhas.push(`CM2 ${b.arquivo}: comentário novo em inglês — "${b.linhas[0].slice(0, 50)}…"`);
  }
}

for (const f of falhas) console.error(`  \x1b[31m✗\x1b[0m ${f}`);
if (falhas.length) {
  console.error(`\x1b[31mCOMENTARIO ${falhas.length} VERMELHA(S)\x1b[0m${mutante ? ` (mutante=${mutante})` : ''}`);
  console.error('  Histórico, causa e números vão para KNOWN-BUGS.md ou docs/; o comentário aponta.');
  process.exitCode = 1;
} else {
  console.log(`\x1b[32mCOMENTARIO verde: nenhum comentário novo acima de ${TETO_LINHAS} linhas ou em inglês (base ${base})\x1b[0m`);
}
