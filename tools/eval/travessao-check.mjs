/* RÉGUA DO TRAVESSÃO — nenhum `—` (em-dash) ou `–` (en-dash) no texto público (src/).
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE ESTA RÉGUA EXISTE

   O travessão `—` é a marca registrada de texto gerado por IA: quase ninguém digita
   em-dash à mão em português de teclado, e ele aparece em bloco no que sai de LLM. Num
   jogo que se vende como ORIGINAL e artesanal, título, meta, OG e as descrições de
   arma/personagem cheias de `—` entregam a origem antes de o visitante clicar em Jogar.

   A regra (CONTRIBUTING.md): em texto do site use ` - ` (hífen com espaços), não `—`.
   Esta régua é o portão — sem ela, o próximo dev (ou a próxima IA) reintroduz em uma
   semana e ninguém percebe, porque `—` e `-` são quase idênticos na tela.

   ESCOPO: só `src/` (o SITE — o que o público lê). Os comentários de dev em `public/js/`
   e `tools/`, e os blocos GERADOS em `docs/`, ficam de fora de propósito: não são texto
   público e são follow-up (limpá-los pede um sweep mecânico + regeneração da fonte).

   uso: node tools/eval/travessao-check.mjs [--mutante=inject]
     --mutante=inject  finge um `—` numa amostra lida; prova que a régua reprova
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = 'src';
const EXT = /\.(astro|ts|tsx|js|jsx|css|json|xml|md|txt|html)$/;
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const PROIBIDOS = /[—–]/;

function arquivos(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) arquivos(p, acc);
    else if (EXT.test(e)) acc.push(p);
  }
  return acc;
}

const lista = arquivos(RAIZ);
if (!lista.length) { console.error(`nenhum arquivo varrido em ${RAIZ}/`); process.exit(1); }

const achados = [];
for (const p of lista) {
  let texto = readFileSync(p, 'utf8');
  if (MUT === 'inject' && p.endsWith('.astro')) texto = texto.replace('\n', ' — \n');
  texto.split('\n').forEach((linha, i) => {
    if (PROIBIDOS.test(linha)) achados.push(`${p}:${i + 1}  ${linha.trim().slice(0, 80)}`);
  });
}

console.log(`TRAVESSÃO-CHECK: ${lista.length} arquivos de src/ varridos`);
if (achados.length) {
  console.error(`  ✗ ${achados.length} linha(s) com — ou – (use ' - ' — ver CONTRIBUTING.md):`);
  for (const a of achados.slice(0, 40)) console.error('    ', a);
  if (achados.length > 40) console.error(`     … e mais ${achados.length - 40}`);
  process.exit(1);
}
console.log("  ✓ nenhum travessão no texto público");
