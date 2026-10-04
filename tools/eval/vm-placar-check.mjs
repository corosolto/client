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
     P3 com VM_LAUNCH=true só células vermelhas aceitas pelo dono, com estado,
        valor e mensagem idênticos ao placar aprovado; novas/pioradas reprovam.
   Mutantes: --mutante=placar-velho (troca o hash), --mutante=sem-dono (tira uma
   dívida), --mutante=chave-ligada (altera um vermelho),
   --mutante=celula-nova (vermelho novo), --mutante=pose-defeituosa (devolve a
   receita de foco do ADS sem o off[1] = -0,08 — o defeito do #679) — todos reprovam.
   Conserto quando P1 reprova: `npm run eval:vm-reguas -- --placar` (local).
   ============================================================================ */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { aceiteExato, lerAceites } from './lib/vm-aceite-visual.mjs';

const ENTRADAS = [
  'public/js/data/vmconfig.js', 'public/js/data/vmframe.js', 'public/js/data/vmbytes.js',
  'tools/eval/lib/vm-palco.mjs', 'tools/eval/lib/vm-analise.mjs', 'tools/eval/lib/vm-limiares.mjs', 'tools/eval/lib/vm-reguas.mjs',
];

// `sobrepor` injeta um arquivo por cima do disco antes do hash: é como o mutante
// `pose-defeituosa` devolve a receita de ADS quebrada sem tocar o repositório.
export function entradasDoPlacar(raiz = process.cwd(), sobrepor = {}) {
  const h = crypto.createHash('sha256');
  for (const f of ENTRADAS) {
    // VM_LAUNCH não muda imagem: fora do hash, senão virar a chave "envelhece" o placar.
    const txt = (sobrepor[f] ?? fs.readFileSync(path.join(raiz, f), 'utf8')).replace(/export const VM_LAUNCH = (true|false);/, '');
    h.update(`${f}\n${txt}`);
  }
  const av = sobrepor['public/js/authoredvm.js'] ?? fs.readFileSync(path.join(raiz, 'public/js/authoredvm.js'), 'utf8');
  const i = av.indexOf('const FAMILY_FRAME = Object.freeze({');
  h.update(av.slice(i, av.indexOf('});', i)));
  return { hash: h.digest('hex').slice(0, 16), arquivos: ENTRADAS };
}

// A POSE DEFECTUOSA que o #679 manda reconstituir: a receita `A()` de foco
// (vmconfig.js) que baixa a arma 8 cm para liberar a cruz. Sem esse `off[1] = -0.08`
// a arma volta ao eixo e a alça senta sobre a janela do alvo — o defeito do dono.
export const RECEITA_FOCO = "const A = (alivio) => ({ auto: true, off: [0, -0.08, 0],";
export function quebrandoReceitaFoco(txt) {
  const quebrada = txt.replace(RECEITA_FOCO, "const A = (alivio) => ({ auto: true, off: [0, 0, 0],");
  if (quebrada === txt) throw new Error('mutante não aplicou: a receita de foco do ADS mudou em vmconfig.js');
  return quebrada;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const mut = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
  // 3:2 é obrigatório; 16:9 (vm-reguas-placar-16x9.json, integração K) é cobrado quando existe.
  const placarArq = 'tools/eval/vm-reguas-placar.json';
  const extras = ['tools/eval/vm-reguas-placar-16x9.json'].filter((f) => fs.existsSync(f));
  const falhas = [];
  if (!fs.existsSync(placarArq)) {
    console.log(`FALHA P1: ${placarArq} ausente — rode \`npm run eval:vm-reguas -- --placar\` com o catálogo privado.`);
    process.exit(1);
  }
  const placares = [placarArq, ...extras].map((f) => ({ arq: f, ...JSON.parse(fs.readFileSync(f, 'utf8')) }));
  const DIV = 'tools/eval/vm-reguas-divida.json';
  const divida = fs.existsSync(DIV) ? JSON.parse(fs.readFileSync(DIV, 'utf8')).dividas || {} : {};
  const aceites = lerAceites();
  let { VM_LAUNCH } = await import(pathToFileURL(path.resolve('public/js/data/vmconfig.js')).href);
  // `pose-defeituosa` (#679): devolve a receita de foco do ADS sem o `off[1] = -0.08`
  // que baixa a arma para liberar a cruz. É a pose que o dono viu em quase todas as
  // armas. O hash muda e a P1 reprova: conserto de pose sem remedir = vermelho.
  let atual = mut === 'pose-defeituosa'
    ? entradasDoPlacar(process.cwd(), {
      'public/js/data/vmconfig.js': quebrandoReceitaFoco(fs.readFileSync('public/js/data/vmconfig.js', 'utf8')),
    }).hash
    : entradasDoPlacar().hash;
  if (mut === 'placar-velho') atual = `${atual.slice(0, -1)}x`;
  if (mut === 'chave-ligada' || mut === 'valor-pior') {
    VM_LAUNCH = true;
    const x = placares[0].resultados.awp.cobertura;
    x.valor = `${x.valor} [mutante]`;
  }
  if (mut === 'celula-nova') {
    VM_LAUNCH = true;
    placares[0].resultados.m4.mira = { estado: 'VERMELHO', valor: '99 px', msg: 'mutante: mira deslocada' };
  }
  if (mut === 'sem-dono') { const r = Object.keys(divida)[0]; delete divida[r][Object.keys(divida[r])[0]]; }
  let verm = 0;
  for (const placar of placares) {
    const asp = placar.aspecto || '3x2';
    if (placar.entradas !== atual) {
      falhas.push(`P1 placar ${asp} velho: medido sobre ${placar.entradas}, entradas atuais ${atual} (${entradasDoPlacar().arquivos.join(', ')} ou FAMILY_FRAME mudou). Re-meça: \`npm run eval:vm-reguas -- --placar${asp === '3x2' ? '' : ` --aspecto=${asp}`}\`.`);
    }
    for (const [arma, rr] of Object.entries(placar.resultados)) {
      for (const [r, x] of Object.entries(rr)) {
        if (r.startsWith('__') || !['VERMELHO', 'NAO_MEDE'].includes(x.estado)) continue;
        verm++;
        if (!divida[r]?.[arma]) falhas.push(`P2 ${asp} ${r}/${arma} vermelho sem dono em vm-reguas-divida.json — ${x.msg.slice(0, 140)}`);
        if (VM_LAUNCH && !aceiteExato(aceites, asp, r, arma, x)) {
          falhas.push(`P3 VM_LAUNCH=true com ${r}/${arma} (${asp}) vermelho novo ou diferente do aceite — ${x.msg.slice(0, 140)}`);
        }
      }
    }
  }
  for (const f of falhas) console.log(`FALHA ${f}`);
  console.log(`vm-placar: ${placares.map((p) => `${p.aspecto || '3x2'} ${Object.keys(p.resultados).length} armas`).join(' + ')}, ${verm} célula(s) vermelha(s) com dono, ${falhas.length} falha(s)${mut ? ` [mutante ${mut}]` : ''}`);
  process.exit(falhas.length ? 1 : 0);
}
