#!/usr/bin/env node
/* ============================================================================
   vm-placar-check.mjs — O PLACAR ASSADO DAS RÉGUAS DE IMAGEM ESTÁ EM DIA?
   ----------------------------------------------------------------------------
   As réguas de imagem (vm-reguas-check.mjs) precisam do catálogo privado e de
   navegador: o CI não tem nenhum dos dois. O que o CI pode cobrar, em
   milissegundos, é o RESULTADO assado (tools/eval/vm-reguas-placar.json):
     P1 o placar foi medido sobre as entradas atuais (hash de vmconfig, vmframe,
        vmbytes, FAMILY_FRAME e das próprias réguas) — conserto de config ou
        produto re-assado sem re-medir fica vermelho aqui;
     P2 todo vermelho do placar tem dono em vm-reguas-divida.json;
     P3 com VM_LAUNCH=true nenhuma arma pode estar vermelha (a chave tudo-ou-nada
        do eval:vm-launch cobra `ready`; esta cobra a imagem).
   Mutantes: --mutante=placar-velho (troca o hash), --mutante=sem-dono (tira uma
   dívida), --mutante=chave-ligada (VM_LAUNCH=true) — os três reprovam.
   Conserto quando P1 reprova: `npm run eval:vm-reguas -- --placar` (local).
   ============================================================================ */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ENTRADAS = [
  'public/js/data/vmconfig.js', 'public/js/data/vmframe.js', 'public/js/data/vmbytes.js',
  'tools/eval/lib/vm-palco.mjs', 'tools/eval/lib/vm-analise.mjs', 'tools/eval/lib/vm-limiares.mjs', 'tools/eval/lib/vm-reguas.mjs',
];

export function entradasDoPlacar(raiz = process.cwd()) {
  const h = crypto.createHash('sha256');
  for (const f of ENTRADAS) {
    // VM_LAUNCH não muda imagem: fora do hash, senão virar a chave "envelhece" o placar.
    const txt = fs.readFileSync(path.join(raiz, f), 'utf8').replace(/export const VM_LAUNCH = (true|false);/, '');
    h.update(`${f}\n${txt}`);
  }
  const av = fs.readFileSync(path.join(raiz, 'public/js/authoredvm.js'), 'utf8');
  const i = av.indexOf('const FAMILY_FRAME = Object.freeze({');
  h.update(av.slice(i, av.indexOf('});', i)));
  return { hash: h.digest('hex').slice(0, 16), arquivos: ENTRADAS };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const mut = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
  const placarArq = 'tools/eval/vm-reguas-placar.json';
  const falhas = [];
  if (!fs.existsSync(placarArq)) {
    console.log(`FALHA P1: ${placarArq} ausente — rode \`npm run eval:vm-reguas -- --placar\` com o catálogo privado.`);
    process.exit(1);
  }
  const placar = JSON.parse(fs.readFileSync(placarArq, 'utf8'));
  const DIV = 'tools/eval/vm-reguas-divida.json';
  const divida = fs.existsSync(DIV) ? JSON.parse(fs.readFileSync(DIV, 'utf8')).dividas || {} : {};
  let { VM_LAUNCH } = await import(pathToFileURL(path.resolve('public/js/data/vmconfig.js')).href);
  let atual = entradasDoPlacar().hash;
  if (mut === 'placar-velho') atual = `${atual.slice(0, -1)}x`;
  if (mut === 'chave-ligada') VM_LAUNCH = true;
  if (mut === 'sem-dono') { const r = Object.keys(divida)[0]; delete divida[r][Object.keys(divida[r])[0]]; }
  if (placar.entradas !== atual) {
    falhas.push(`P1 placar velho: medido sobre ${placar.entradas}, entradas atuais ${atual} (${entradasDoPlacar().arquivos.join(', ')} ou FAMILY_FRAME mudou). Re-meça: \`npm run eval:vm-reguas -- --placar\`.`);
  }
  let verm = 0;
  for (const [arma, rr] of Object.entries(placar.resultados)) {
    for (const [r, x] of Object.entries(rr)) {
      if (r.startsWith('__') || !['VERMELHO', 'NAO_MEDE'].includes(x.estado)) continue;
      verm++;
      if (!divida[r]?.[arma]) falhas.push(`P2 ${r}/${arma} vermelho sem dono em vm-reguas-divida.json — ${x.msg.slice(0, 140)}`);
      if (VM_LAUNCH) falhas.push(`P3 VM_LAUNCH=true com ${r}/${arma} vermelho na imagem — ${x.msg.slice(0, 140)}`);
    }
  }
  for (const f of falhas) console.log(`FALHA ${f}`);
  console.log(`vm-placar: ${Object.keys(placar.resultados).length} armas, ${verm} célula(s) vermelha(s) com dono, ${falhas.length} falha(s)${mut ? ` [mutante ${mut}]` : ''}`);
  process.exit(falhas.length ? 1 : 0);
}
