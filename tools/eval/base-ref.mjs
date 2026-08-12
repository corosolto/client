/* Resolve a base de comparação de régua que mede DIFF, e diz quando não consegue.

   Existe porque as duas primeiras réguas de diff deste repositório engoliam a falha
   do git e devolviam diff vazio - ou seja, VERDE sem ter medido nada (greptile, PR
   #209). Régua que não sabe tem que dizer que não sabe: é a mesma regra do `null`
   do gen-docs e do eval:submitguard, que fica vermelho quando falta o insumo.

   A distinção que importa: clone RASO (Vercel, CI com fetch-depth padrão) prova que
   o dado não existe no ambiente, e aí a régua se declara não medida e sai 0. Clone
   COMPLETO sem a base é configuração errada, e aí ela reprova. */
import { execFileSync } from 'node:child_process';

const git = (args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

export function resolverBase(base) {
  let raso = false;
  try { raso = git(['rev-parse', '--is-shallow-repository']).trim() === 'true'; } catch { /* sem git */ }
  try {
    git(['rev-parse', '--verify', '--quiet', `${base}^{commit}`]);
    return { ok: true, raso, base };
  } catch {
    return { ok: false, raso, base };
  }
}

/* Imprime o veredito de "não deu para medir" e devolve o código de saída certo.
   Verde nunca é uma das saídas: ou mediu, ou disse que não mediu. */
export function relatarBaseAusente(nome, { raso, base }) {
  if (raso) {
    console.log(`\x1b[33m${nome} NÃO MEDIDO: clone raso, sem \`${base}\` para comparar. Vale no clone completo (CI de PR e máquina).\x1b[0m`);
    return 0;
  }
  console.error(`  \x1b[31m✗\x1b[0m ${nome}0 base \`${base}\` não existe num clone completo — régua sem insumo não pode passar calada`);
  console.error(`\x1b[31m${nome} 1 VERMELHA\x1b[0m`);
  return 1;
}
