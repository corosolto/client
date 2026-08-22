#!/usr/bin/env node
/* ============================================================================
   docs-autoria-check.mjs — O PORTÃO DE DOCS COBRA DE QUEM PODE CONSERTAR
   ----------------------------------------------------------------------------
   POR QUE EXISTE (medido no #392, 21/08/2026)
   O bloco `pessoas` do colaborar.md sai do `git shortlog` da branch. O squash do merge
   REESCREVE o autor: no #392 os commits eram `manazitto <mana.gsoares@gmail.com>` e viraram
   `Maná Soares <153231177+manazitto@users.noreply.github.com>` na main. Ou seja, o valor certo
   só existe DEPOIS do merge — rodar `npm run docs` na branch (foi rodado) não salva.

   O estrago não é o bloco desatualizado: é a CULPA ERRADA. A main fica vermelha por um commit
   e o DOCS1 acusa no PR seguinte, que não tem nada com isso. Aconteceu de verdade: o #392
   passou, mergeou, e a main caiu — o conserto foi um PR à parte (#395).

   A REGRA QUE ESTA RÉGUA GUARDA
   (a) num PR (`--check`), o bloco de autoria NÃO derruba o portão;
   (b) na main (`--check --autoria`), ele derruba — lá é derivável e consertável;
   (c) qualquer OUTRO bloco gerado continua derrubando os dois — a tolerância é só da autoria;
   (d) em clone RASO não há o que medir, e portão sem medida não vota (ver o guard lá embaixo).

   Mede executando o gerador de verdade sobre uma mutação real no arquivo, e devolve o
   arquivo ao estado original no fim (recusa rodar se ele já estiver sujo).

   Uso: node tools/eval/docs-autoria-check.mjs [--mutante=sem-tolerancia|tolerancia-demais]
   ============================================================================ */
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const ALVO = 'docs/docs/colaborar.md';
const GERADOR = 'tools/gen-docs.mjs';

/* Clone RASO (Vercel, CI com fetch-depth:1) não tem histórico, e o gen-docs - por decisão
   já registrada nele - NÃO regenera o bloco `pessoas` ali: número que não existe no
   ambiente não derruba portão. Sem regeneração, a mutação de autoria não tem como acender
   nada, e a DOCSAUT2 acusa cegueira onde na verdade falta medida. Foi o que derrubou o
   deploy da Vercel (e a produção) desde o #398. Onde há histórico, a régua segue mordendo. */
if (execFileSync('git', ['rev-parse', '--is-shallow-repository']).toString().trim() === 'true') {
  console.log('  \x1b[33m⚠\x1b[0m DOCSAUT não medido: clone raso não tem o histórico de onde sai a autoria');
  process.exit(0);
}

const sujo = execFileSync('git', ['status', '--porcelain', '--', ALVO, GERADOR]).toString().trim();
if (sujo) {
  console.log(`  \x1b[31m✗\x1b[0m DOCSAUT não dá para medir: ${ALVO} ou ${GERADOR} com mudança não commitada`);
  process.exit(1);
}

/* Linha de base SEM `--autoria`: com ele, qualquer branch de PR que traga autor novo no
   histórico reprovava aqui — o contrato do #398 é que autoria só é derivável na main, e a régua
   estava cobrando o contrário do que guarda (bateu em #375, #372, #399). */
if (spawnSync('node', [GERADOR, '--check'], { encoding: 'utf8' }).status !== 0) {
  console.log('  \x1b[31m✗\x1b[0m DOCSAUT não dá para medir: os blocos gerados já estão desatualizados (rode: npm run docs)');
  process.exit(1);
}

/* A DOCSAUT2 pergunta se `--autoria` MORDE a autoria torta. Numa branch onde ela já está torta
   por si, a pergunta não tem resposta: pular dizendo isso é honesto, cobrar não. */
const autoriaMedivel = spawnSync('node', [GERADOR, '--check', '--autoria'], { encoding: 'utf8' }).status === 0;

const original = readFileSync(ALVO, 'utf8');
const geradorOriginal = readFileSync(GERADOR, 'utf8');
const rodar = (args) => spawnSync('node', [GERADOR, '--check', ...args], { encoding: 'utf8' }).status === 0;
const restaurar = () => { writeFileSync(ALVO, original); writeFileSync(GERADOR, geradorOriginal); };

const falhas = [];
try {
  if (MUT === 'sem-tolerancia') {       // volta a cobrar autoria no PR: (a) tem de acender
    writeFileSync(GERADOR, geradorOriginal.replace(
      "const VERIFICA_AUTORIA = !process.argv.includes('--check') || process.argv.includes('--autoria');",
      'const VERIFICA_AUTORIA = true;'));
  } else if (MUT === 'tolerancia-demais') {   // nunca cobra, nem na main: (b) tem de acender
    writeFileSync(GERADOR, geradorOriginal.replace(
      "const VERIFICA_AUTORIA = !process.argv.includes('--check') || process.argv.includes('--autoria');",
      'const VERIFICA_AUTORIA = false;'));
  } else if (MUT) throw new Error(`mutante desconhecido: ${MUT}`);

  // ---- mutação de AUTORIA: mexe só no número de identidades do bloco `pessoas`
  const comAutoriaTorta = original.replace(/\*\*(\d+) identidades de autoria humana\*\*/,
    (_, n) => `**${Number(n) + 7} identidades de autoria humana**`);
  if (comAutoriaTorta === original) throw new Error('não achei a frase de autoria para mutar');
  writeFileSync(ALVO, comAutoriaTorta);
  if (!rodar([])) falhas.push('DOCSAUT1 autoria torta REPROVOU o PR — cobra de quem não pode consertar (só é derivável após o squash)');
  if (!autoriaMedivel) console.log('  \x1b[33m⚠\x1b[0m DOCSAUT2 pulada: a autoria já está torta nesta branch (autor novo no histórico), então a mutação não é medível aqui');
  if (autoriaMedivel && rodar(['--autoria'])) falhas.push('DOCSAUT2 autoria torta PASSOU com --autoria — o portão da main está cego para o único lugar onde o número é derivável');
  writeFileSync(ALVO, original);

  // ---- mutação de OUTRO bloco: a tolerância não pode ter vazado para o resto
  const comMapasTortos = original.replace(/BEGIN:GERADO:mapas([\s\S]{0,400}?)\n/,
    (m) => `${m}\nlinha intrusa que o gerador não escreveu\n`);
  if (comMapasTortos === original) throw new Error('não achei o bloco `mapas` para mutar');
  writeFileSync(ALVO, comMapasTortos);
  if (rodar([])) falhas.push('DOCSAUT3 bloco NÃO-autoria torto passou no PR — a tolerância vazou para os outros blocos');
  if (rodar(['--autoria'])) falhas.push('DOCSAUT3 bloco NÃO-autoria torto passou com --autoria');
} catch (e) {
  falhas.push(`DOCSAUT não deu para medir: ${String(e).split('\n')[0]}`);
} finally {
  restaurar();
}

for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) console.log('  \x1b[32m✓\x1b[0m DOCSAUT autoria só é cobrada onde é derivável (main); os outros blocos mordem sempre');
if (MUT && !falhas.length) console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego (lei 3)`);
process.exit(falhas.length ? 1 : 0);
