#!/usr/bin/env node
/* ============================================================================
   vm-reguas-check.mjs — RÉGUAS DE IMAGEM DO VIEWMODEL (mira, cobertura,
   pistola-ref, mãos, carregador) NO QUADRO RENDERIZADO DO JOGO REAL
   ----------------------------------------------------------------------------
   POR QUE EXISTE: revisão L1 (23/09) — o crítico cego reprovou 10/10 armas com
   os portões verdes. O caso que abre a série: `eval:vm-ads` AD1 = 0,000 em
   md97/m92/mp5/akm com a mira 40–90 px fora da cruz, porque o AD1 projetava o
   socket `sight` — o MESMO ponto que o ADS automático leva ao centro. Régua
   que mede o que o conserto controla é tautologia. Estas medem a imagem.
   Definições, limiares e procedência: tools/eval/lib/vm-reguas.mjs e
   tools/eval/lib/vm-limiares.mjs.

   Uso:
     node tools/eval/vm-reguas-check.mjs --regua=mira [--armas=md97,uzi] [--porta=8171]
     node tools/eval/vm-reguas-check.mjs --regua=todas --placar      (26 armas → PLACAR)
     node tools/eval/vm-reguas-check.mjs --mutante=alca-deslocada   (tem de REPROVAR)
     --fotos=<dir>  grava as máscaras rotuladas (arma vermelha, braço verde, cruz)
     --aspecto=16x9 (padrão 3x2, o do dono)
     --ref-pistola=viva      mede a PT-38 do branch (padrão: retrato da APROVADA, pré-#631)
     --faixa-pistola=0.8,1.25  faixa das curtas contra a pistola (decisão pendente do dono)
     --variante='{"arma":{"frame":{...},"ads":{...}}}'  experimento de config ao vivo, sem tocar arquivo
     --assar-pistola          regrava tools/eval/vm-pistola-aprovada.json (só com decisão do dono)
   Saída ≠ 0: vermelho fora da dívida declarada (vm-reguas-divida.json) ou
   "não sei medir". Com VM_LAUNCH=true a dívida não desculpa nada.
   Requer private-assets e navegador — régua LOCAL (check:vm), fora do check:fast;
   o CI confere o placar assado com eval:vm-placar.
   ============================================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import * as P from './lib/vm-palco.mjs';
import { JUIZ, MUTANTES, REGUAS, TODAS, coletar, coletarReferencias } from './lib/vm-reguas.mjs';
import { entradasDoPlacar } from './vm-placar-check.mjs';

const arg = (n, d = '') => { const h = process.argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const flag = (n) => process.argv.includes(`--${n}`);
const MUT_NOME = arg('mutante');
const MUT = MUT_NOME ? { nome: MUT_NOME, ...MUTANTES[MUT_NOME] } : null;
if (MUT_NOME && !MUTANTES[MUT_NOME]) throw new Error(`mutante desconhecido: ${MUT_NOME} (há: ${Object.keys(MUTANTES).join(', ')})`);
const reguaArg = arg('regua', MUT ? MUT.regua : 'todas');
const reguas = reguaArg === 'todas' ? REGUAS : reguaArg.split(',');
for (const r of reguas) if (!JUIZ[r]) throw new Error(`régua desconhecida: ${r} (há: ${REGUAS.join(', ')})`);
const armas = MUT ? [MUT.arma] : (arg('armas') ? arg('armas').split(',') : TODAS);
const PORTA = arg('porta', '8171');
const ASPECTO = arg('aspecto', '3x2');
const FOTOS = arg('fotos') ? path.resolve(arg('fotos')) : '';
const PLACAR = flag('placar');
// --variante='{"md97":{"frame":{"rotDeg":[-8,0.9,0]},"ads":{"off":[0,-0.02,0]}}}' — experimento ao vivo.
const VARIANTE = arg('variante') ? JSON.parse(arg('variante')) : null;
if (VARIANTE && flag('placar')) throw new Error('--variante não assa placar: o placar é do que está no arquivo');

const { VM_LAUNCH } = await import(pathToFileURL(path.resolve('public/js/data/vmconfig.js')).href);
const DIVIDA_ARQ = 'tools/eval/vm-reguas-divida.json';
const divida = fs.existsSync(DIVIDA_ARQ) ? JSON.parse(fs.readFileSync(DIVIDA_ARQ, 'utf8')).dividas || {} : {};

const srv = await P.subirServidor(PORTA);
const browser = await P.abrirNavegador();
const t0 = Date.now();
const resultados = {};
let refs = {};
try {
  const { page, erros, width } = await P.abrirJogo(browser, srv.base, ASPECTO);
  refs = await coletarReferencias(page, reguas, { pistola: arg('ref-pistola', 'aprovada'), aspecto: ASPECTO, assarPistola: flag('assar-pistola') });
  refs.largura = width;
  if (arg('faixa-pistola')) { const [min, max] = arg('faixa-pistola').split(',').map(Number); refs.faixaPistola = { min, max }; }
  for (const arma of armas) {
    const t = Date.now();
    let c;
    try {
      c = await coletar(page, arma, { reguas, mut: MUT, fotos: FOTOS, variante: VARIANTE });
    } catch (e) {
      if (/MUTANTE NAO APLICOU/.test(e.message)) throw e;
      c = { arma, erro: String(e.message || e).slice(0, 300) };
    }
    resultados[arma] = {};
    for (const r of reguas) {
      resultados[arma][r] = c.erro ? { estado: 'NAO_MEDE', valor: '?', msg: `coleta falhou: ${c.erro}` } : JUIZ[r](c, refs);
    }
    if (c.mutante) resultados[arma].__mutante = c.mutante;
    const linha = reguas.map((r) => `${r}=${resultados[arma][r].estado}`).join(' ');
    console.log(`… ${arma} ${linha} (${((Date.now() - t) / 1000).toFixed(0)}s)`);
  }
  if (erros.length) console.log(`erros de página: ${erros.slice(0, 3).join(' | ')}`);
} finally {
  await browser.close();
  srv.kill();
}

// ---- veredito ---------------------------------------------------------------
const falhas = [];
const avisos = [];
if (MUT) {
  const r = resultados[MUT.arma][MUT.regua];
  const prova = JSON.stringify(resultados[MUT.arma].__mutante?.prova || {});
  if (r.estado === 'VERMELHO') console.log(`MUTANTE ${MUT.nome} MORDEU: ${MUT.regua}/${MUT.arma} VERMELHO — ${r.msg} (prova ${prova})`);
  else {
    console.log(`MUTANTE ${MUT.nome} NÃO MORDEU: ${MUT.regua}/${MUT.arma} ${r.estado} — ${r.msg}`);
    falhas.push(`mutante ${MUT.nome} não reprovou`);
  }
} else {
  for (const [arma, rr] of Object.entries(resultados)) {
    for (const r of reguas) {
      const x = rr[r];
      const tag = `${r}/${arma}`;
      if (x.estado === 'VERDE' || x.estado === 'N/A') {
        console.log(`${x.estado === 'VERDE' ? 'PASSA' : 'N/A  '} ${tag} ${x.valor} — ${x.msg}`);
        if (x.estado === 'VERDE' && divida[r]?.[arma]) avisos.push(`${tag}: dívida PAGA — remova de ${DIVIDA_ARQ}`);
        continue;
      }
      const d = divida[r]?.[arma];
      if (d && !VM_LAUNCH) {
        console.log(`DÍVIDA ${tag} ${x.valor} — ${x.msg} [dono: ${d.dono}]`);
      } else {
        console.log(`FALHA ${tag} ${x.valor} — ${x.msg}${d && VM_LAUNCH ? ' [VM_LAUNCH=true: dívida não vale]' : ''}`);
        falhas.push(tag);
      }
    }
  }
}

if (PLACAR && !MUT) {
  const entradas = entradasDoPlacar();
  const placar = { gerado: new Date().toISOString().slice(0, 10), aspecto: ASPECTO, entradas: entradas.hash, resultados };
  fs.writeFileSync('tools/eval/vm-reguas-placar.json', `${JSON.stringify(placar, null, 1)}\n`);
  fs.mkdirSync('artifacts/vm-reguas', { recursive: true });
  fs.writeFileSync('artifacts/vm-reguas/PLACAR.md', placarMd(placar));
  console.log('placar: tools/eval/vm-reguas-placar.json + artifacts/vm-reguas/PLACAR.md');
}

for (const a of avisos) console.log(`AVISO ${a}`);
console.log(`vm-reguas: ${reguas.join(',')} · ${armas.length} arma(s) · ${falhas.length} falha(s) · ${((Date.now() - t0) / 60000).toFixed(1)} min`);
process.exit(falhas.length ? 1 : 0);

function placarMd(pl) {
  const sim = { VERDE: 'verde', VERMELHO: '**VERMELHO**', 'N/A': 'n/a', NAO_MEDE: '**NÃO MEDE**' };
  const linhas = [
    '# PLACAR das réguas de imagem do viewmodel',
    '',
    `Gerado por \`node tools/eval/vm-reguas-check.mjs --regua=todas --placar\` em ${pl.gerado}, quadro ${pl.aspecto}`,
    `(1440 px de largura), produtos do catálogo privado servidos pelo \`vmbytes.js\` deste branch. Entradas: \`${pl.entradas}\`.`,
    'Célula = estado e valor. `NÃO MEDE` conta como vermelho. Detalhe por célula logo abaixo.',
    '',
    `| arma | ${REGUAS.join(' | ')} |`,
    `|---|${REGUAS.map(() => '---').join('|')}|`,
  ];
  for (const [arma, rr] of Object.entries(pl.resultados)) {
    linhas.push(`| ${arma} | ${REGUAS.map((r) => (rr[r] ? `${sim[rr[r].estado]} ${rr[r].valor === '—' ? '' : rr[r].valor}`.trim() : '')).join(' | ')} |`);
  }
  const verm = Object.entries(pl.resultados).filter(([, rr]) => REGUAS.some((r) => ['VERMELHO', 'NAO_MEDE'].includes(rr[r]?.estado)));
  linhas.push('', `**Vermelhas na máquina:** ${verm.length} de ${Object.keys(pl.resultados).length} — ${verm.map(([a]) => a).join(', ')}.`, '');
  for (const r of REGUAS) {
    linhas.push(`## ${r}`, '');
    for (const [arma, rr] of Object.entries(pl.resultados)) if (rr[r]) linhas.push(`- **${arma}** ${rr[r].estado} — ${rr[r].msg}`);
    linhas.push('');
  }
  return `${linhas.join('\n')}\n`;
}
