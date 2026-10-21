#!/usr/bin/env node
/* faca-porte-check.mjs — A FACA NÃO É UM CANO.
   POR QUE EXISTE: feedback do dono em 21/10/2026, "acho o jeito que os personagens seguram
   a faca estranho". Medido no jogo real (sonda de 3ª pessoa, personagem esquerdomacho,
   câmera de ombro): a faca herdava o PORTE DE CANO (TP_CARRY_PITCH −6°) e a lâmina saía
   a +6° de elevação no espaço do modelo — exatamente a mesma leitura da pistola (+6°),
   ou seja, apontada pra frente na horizontal e escondida dentro do punho.
   Depois do porte de lâmina: elevação +38°, lâmina lida na silhueta.
   Evidência visual (antes | depois): tools/eval/asset-evidence/faca-3p-20261021/faca-3p-ab.png

   O QUE MEDE (lê os números do FONTE vivo, nada é copiado para cá):
   FP1  'knife' está declarado como lâmina (BLADES) em public/js/glbchars.js.
   FP2  o porte de lâmina levanta a ponta pelo menos 25° acima do porte de cano.
   FP3  o porte de lâmina vale no JOGO, não só na vitrine da seleção (a expressão do
        `carry` consulta BLADES antes de `opts.preview`).
   FP4  a lâmina continua com A/B por querystring (?tpcarryfaca=pitch,yaw).

   REPRODUZ: node tools/eval/faca-porte-check.mjs [--mutante=lamina-como-cano]
   MUTANTE:  --mutante=lamina-como-cano devolve a faca ao porte de cano -> FP2 vermelha. */
import { readFileSync } from 'node:fs';

const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (MUTANTE && MUTANTE !== 'lamina-como-cano') { console.error(`mutante desconhecido: ${MUTANTE}`); process.exit(2); }
const src = readFileSync(new URL('../../public/js/glbchars.js', import.meta.url), 'utf8');

const num = (re, label) => {
  const m = src.match(re);
  if (!m) { console.log(`FALHA leitura — não achei ${label} em glbchars.js`); process.exit(1); }
  return Number(m[1]);
};
const carryPitch = num(/_tpc\[0\]\s*:\s*(-?[\d.]+)\)\)\s*\*\s*Math\.PI/, 'TP_CARRY_PITCH');
let bladePitch = num(/isNaN\(_tpb\[0\]\) \? _tpb\[0\] : (-?[\d.]+)/, 'TP_CARRY_BLADE pitch');
const bladeYaw = num(/isNaN\(_tpb\[1\]\) \? _tpb\[1\] : (-?[\d.]+)/, 'TP_CARRY_BLADE yaw');
if (MUTANTE === 'lamina-como-cano') bladePitch = carryPitch;

let falhas = 0;
const chk = (id, ok, ev) => { console.log(`${ok ? 'PASSA' : 'FALHA'} ${id} — ${ev}`); if (!ok) falhas++; };

// Convenção do Euler YXZ do mount: pitch NEGATIVO levanta a ponta (ver glbchars ~l.150).
const subida = carryPitch - bladePitch;
chk('FP1', /const BLADES = new Set\(\['knife'\]\)/.test(src), "BLADES declara 'knife'");
chk('FP2', subida >= 25,
  `lâmina ${bladePitch}° vs cano ${carryPitch}° -> ponta ${subida.toFixed(0)}° mais alta (mínimo 25°)`);
chk('FP3', /faca \? TP_CARRY_BLADE\s*\n?\s*:\s*opts\.preview/.test(src),
  'o porte de lâmina é escolhido antes do porte de vitrine (vale no jogo)');
chk('FP4', /qp\.get\('tpcarryfaca'\)/.test(src), `A/B por querystring presente (padrão ${bladePitch},${bladeYaw})`);

process.exit(falhas ? 1 : 0);
