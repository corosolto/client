#!/usr/bin/env node
/* ============================================================================
   vm-enquadramento-placar-check.mjs — O PLACAR DO FP PARADO ESTÁ EM DIA E VERDE?
   ----------------------------------------------------------------------------
   A régua de enquadramento (vm-enquadramento-idle-check.mjs) precisa de navegador
   e do catálogo pago; o CI não tem. Aqui, em milissegundos, sobre o placar assado
   (tools/eval/vm-enquadramento-idle.json):
     Q1 o placar foi medido sobre as entradas atuais (hash de vmconfig, vmframe,
        vmfabrica, vmbytes, goldenver e da própria régua) — mexeu no goldFrame,
        no frame de uma arma ou num GLB sem re-medir = vermelho;
     Q2 cobertura: 16:9 e 3:2 × (26 armas sem pintura + pistol/ak/m4/scar pintadas);
     Q3 toda célula, RE-JULGADA com a régua atual, é VERDE (não confia no estado gravado).
   Mutantes (todos reprovam): --mutante=goldframe-antigo (devolve o goldFrame de
   06/11 em memória: Q1), --mutante=sem-pistola-pintada (tira a célula: Q2),
   --mutante=pistola-longe (grava na célula a medida do quadro do dono: Q3).
   Conserto quando Q1 reprova: `npm run eval:vm-enquadramento-idle -- --assar` (local).
   ============================================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ASPECTOS, PINTADAS, PLACAR_ARQ, REFERENCIA_DA_PINTURA, comparar, hashDasEntradas, julgar } from './lib/vm-enquadramento.mjs';
const ROOT = process.cwd();
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').slice('--mutante='.length);
const MUTANTES = ['goldframe-antigo', 'sem-pistola-pintada', 'pistola-longe'];
if (MUT && !MUTANTES.includes(MUT)) { console.error(`mutante desconhecido: ${MUT} (há: ${MUTANTES.join(', ')})`); process.exit(2); }
const { WEAPON_IDS } = await import(pathToFileURL(path.join(ROOT, 'public/js/weapons.js')).href);

const placar = JSON.parse(fs.readFileSync(path.join(ROOT, PLACAR_ARQ), 'utf8'));
let sobrepor = {};
if (MUT === 'goldframe-antigo') {
  const arq = 'public/js/data/vmconfig.js';
  const txt = fs.readFileSync(path.join(ROOT, arq), 'utf8');
  const velho = txt.replace(/goldFrame: \{[^}]*\}/, 'goldFrame: { x: -7.5, y: -5.5, z: 0, fov: 60 }');
  if (velho === txt) throw new Error('mutante não aplicou: goldFrame da PT-38 sumiu de vmconfig.js');
  sobrepor = { [arq]: velho };
}
if (MUT === 'sem-pistola-pintada') placar.celulas = placar.celulas.filter((c) => !(c.rota === 'pintura' && c.arma === 'pistol'));
if (MUT === 'pistola-longe') {
  // Medida do quadro do dono (staging 10/11, gold#pistol 16:9, goldFrame 60°).
  const c = placar.celulas.find((x) => x.rota === 'pintura' && x.arma === 'pistol' && x.aspecto === '16x9');
  if (!c) throw new Error('mutante não aplicou: célula pintura/pistol/16x9 ausente');
  c.medida = { arma: { x0: 0.56, x1: 0.63, y0: 0.6, y1: 0.776, area: 0.0085, naTela: 1 }, braco: 0.0524 };
}

const falhas = [];
const hash = hashDasEntradas(ROOT, sobrepor);
if (placar.hash !== hash) falhas.push(`Q1 placar medido sobre outras entradas (${placar.hash} ≠ ${hash}): rode \`npm run eval:vm-enquadramento-idle -- --assar\``);
const esperadas = [];
for (const aspecto of Object.keys(ASPECTOS)) {
  for (const arma of WEAPON_IDS) esperadas.push({ aspecto, rota: 'padrao', arma });
  for (const arma of PINTADAS) esperadas.push({ aspecto, rota: 'pintura', arma });
}
const achar = (e) => placar.celulas.find((c) => c.aspecto === e.aspecto && c.rota === e.rota && c.arma === e.arma);
const faltam = esperadas.filter((e) => !achar(e));
if (faltam.length) falhas.push(`Q2 ${faltam.length} célula(s) sem medida: ${faltam.map((e) => `${e.aspecto}/${e.rota}/${e.arma}`).join(', ')}`);
for (const e of esperadas) {
  const c = achar(e);
  if (!c) continue;
  const j = c.medida ? julgar(c.arma, c.medida) : { estado: c.estado || 'NAO_MEDE', clausulas: [] };
  if (j.estado !== 'VERDE') falhas.push(`Q3 ${e.aspecto}/${e.rota}/${e.arma} ${j.estado}: ${j.clausulas.filter((x) => !x.ok).map((x) => `${x.id} ${x.msg}`).join('; ') || c.msg || 'sem medida'}`);
  if (e.rota !== 'pintura') continue;
  // Q4 pintura não muda o quadro: centro, área e eixo contra a referência sem pintura.
  const ref = achar({ aspecto: e.aspecto, rota: 'padrao', arma: REFERENCIA_DA_PINTURA[e.arma] });
  const ruins = comparar(c.medida, ref?.medida).filter((x) => !x.ok);
  if (ruins.length) falhas.push(`Q4 ${e.aspecto}/pintura/${e.arma} × padrão ${REFERENCIA_DA_PINTURA[e.arma]}: ${ruins.map((x) => `${x.id} ${x.msg}`).join('; ')}`);
}

if (falhas.length) {
  console.error(`✗ VM-ENQUADRAMENTO-PLACAR${MUT ? ` (mutante ${MUT})` : ''} — ${falhas.length} falha(s):`);
  for (const f of falhas) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`✓ VM-ENQUADRAMENTO-PLACAR: ${esperadas.length} células verdes em dia (hash ${hash}, medido ${placar.medido})`);
