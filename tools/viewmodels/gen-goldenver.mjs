#!/usr/bin/env node
/* VERSÃO DO GLB GOLDEN DERIVADA DOS BYTES — gerado, nunca escrito à mão.
 *
 * `urlForKey` montava `?v=golden-<arma>-1`, uma string congelada no código. Em
 * 13/09 republiquei m4, uzi e p90 na mesma URL com o mesmo `?v=` e o navegador
 * do dono serviu o GLB DE ONTEM do cache: ele testou, viu os mesmos defeitos e
 * disse "todos os erros que eu te apontei antes ainda acontecem". Estava certo,
 * e nenhuma régua pegou porque todas leem o arquivo em disco.
 *
 * É a mesma lei do `moduleCacheManifest()`: a revisão vem do conteúdo. Este
 * script escreve public/js/data/goldenver.js com o hash de cada GLB publicado.
 * O publicar-hires chama no fim; `npm run vm:goldenver` regenera à mão.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(ROOT, 'public/models/viewmodels/coro');
const SAIDA = path.join(ROOT, 'public/js/data/goldenver.js');

export function gerar() {
  const mapa = {};
  for (const f of fs.readdirSync(DIR).filter((n) => n.endsWith('-hires.glb')).sort()) {
    const arma = f.replace('-hires.glb', '');
    mapa[arma] = crypto.createHash('sha256').update(fs.readFileSync(path.join(DIR, f)))
      .digest('hex').slice(0, 10);
  }
  const corpo = Object.entries(mapa).map(([k, v]) => `  ${k}: '${v}',`).join('\n');
  const texto = `/* GERADO por tools/viewmodels/gen-goldenver.mjs — não edite à mão.
   Revisão de cada GLB golden, derivada dos BYTES. Versão escrita à mão congela
   e o navegador serve o arquivo velho: foi o que aconteceu em 13/09/2026 com
   m4, uzi e p90 (KNOWN-BUGS.md, BUG-157). */
export const GOLDEN_VER = Object.freeze({
${corpo}
});
`;
  const antes = fs.existsSync(SAIDA) ? fs.readFileSync(SAIDA, 'utf8') : '';
  if (antes !== texto) fs.writeFileSync(SAIDA, texto);
  return { mapa, mudou: antes !== texto };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { mapa, mudou } = gerar();
  console.log(`  ${Object.keys(mapa).length} GLB golden · ${mudou ? 'goldenver.js ATUALIZADO' : 'já estava em dia'}`);
}
