#!/usr/bin/env node
/* Portão do viewmodel no jogo real: lê o frames.json de vm-arsenal-frames.mjs e
 * reprova o que a revisão humana de 07/09 reprovou — arma que não desenha, mão
 * fora do quadro, mão que não encosta, escala em fuga dentro da família.
 *
 * Piso e teto vêm das famílias que passaram na medida de 07/09 (mp5, pistol, m4,
 * ak, lmg autoradas), não de número escolhido: mão 144–282 de ~306 amostras,
 * contato 1–32 px, diagonal 353–698 px em 1440×960. Os reprovados medem mão 0
 * e arma 0.
 *
 * Uso: node tools/eval/vm-arsenal-check.mjs <frames.json> [--mutante=<nome>]
 * Mutantes (a régua denuncia a si mesma: sai 1 se o mutante PASSAR):
 *   semarma   zera a arma em quadro de uma captura
 *   semmao    zera a mão em quadro de uma captura
 *   semcontato afasta a mão da arma
 *   escala    infla a diagonal de uma arma da família
 */
import fs from 'node:fs';
import process from 'node:process';

const alvo = process.argv[2];
const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (!alvo || !fs.existsSync(alvo)) {
  console.error('uso: node tools/eval/vm-arsenal-check.mjs <frames.json> [--mutante=nome]');
  process.exit(2);
}
const rel = JSON.parse(fs.readFileSync(alvo, 'utf8'));
const caps = rel.capturas || [];
if (!caps.length) { console.error('VAZIO: nenhuma captura no relatório — régua sem alvo não mede nada'); process.exit(2); }

// Famílias por arma: escala aparente só se compara DENTRO da família (mesmas mãos,
// mesmo enquadramento). Fonte: VM_WEAPON do vmconfig.
const FAMILIA = {
  awp: 'sniper', m400: 'sniper', mosin: 'bolt', ak: 'ak', m92: 'ak', akm: 'ak',
  m4: 'ar', md97: 'ar', carbine: 'ar', scar: 'ar', famas: 'ar', mp5: 'mp5', uzi: 'smg',
  p90: 'p90', shotgun: 'shotgun', deagle: 'deagle', pistol: 'pistol', revolver38: 'revolver',
  svd: 'svd', sks: 'marksman', lmg: 'lmg', knife: 'melee',
};
/* Piso por CAMINHO, medido dos dois lados: no autorado a mão saudável mede 144–282
   de ~306 amostras; no legado, 60–92 de 312 (braço menor, mais fora do quadro). Nos
   dois, quebrada mede 0 — o piso separa saudável de quebrada, não é afrouxamento. */
const PISO_MAO = { autorado: 100, legado: 40 };
const TETO_CONTATO = 40;     // aprovadas medem 1–32 px
const RAZAO_ESCALA = 1.35;   // dentro da família (m92 861 ÷ ak 553 = 1,56 reprovou)
const LUNETA = new Set(['sniper', 'bolt']);  // escondem o viewmodel no ADS

const mut = JSON.parse(JSON.stringify(caps));
if (MUT === 'semarma') mut[0].armaEmQuadro = 0;
if (MUT === 'semmao') mut[0].maoEmQuadro = 0;
if (MUT === 'semcontato') mut[0].contato_px = 400;
if (MUT === 'escala') mut[0].arma_diag_px = Math.round((mut[0].arma_diag_px || 500) * 2);
const dados = MUT ? mut : caps;

const falhas = [];
for (const c of dados) {
  const onde = `${c.arma}/${c.cenario}`;
  if (c.armaAmostra === 0 || c.armaEmQuadro === 0) {
    /* Exceção medida, não afrouxamento: sniper e ferrolho ESCONDEM o viewmodel no
       ADS e põem a luneta em tela cheia — `awp/ads` mede 0 nos dois caminhos, com
       ou sem defeito. Fora do ADS a cláusula vale inteira. */
    if (c.cenario === 'ads' && LUNETA.has(FAMILIA[c.arma])) continue;
    falhas.push(`${onde}: ARMA NÃO DESENHA (amostra ${c.armaAmostra}, em quadro ${c.armaEmQuadro})`);
    continue; // sem arma não há contato nem escala que meçam algo
  }
  const piso = PISO_MAO[rel.modo] ?? PISO_MAO.autorado;
  if (c.maoEmQuadro < piso) falhas.push(`${onde}: mão fora do quadro (${c.maoEmQuadro} < ${piso} de ${c.maoAmostra})`);
  if (c.contato_px !== null && c.contato_px > TETO_CONTATO) falhas.push(`${onde}: mão sem contato (${c.contato_px} px > ${TETO_CONTATO})`);
}
// Escala aparente dentro da família
const porFamilia = new Map();
for (const c of dados) {
  if (!c.arma_diag_px) continue;
  // Chave inclui a FONTE: comparar wrap Mint com malha do pack mede a troca de
  // malha, não escala em fuga (foi o falso vermelho `ak 554 ÷ m92 344`).
  const f = `${FAMILIA[c.arma] || c.arma}/${c.fonte || 'ignorada'}`;
  const d = porFamilia.get(f) || new Map();
  d.set(c.arma, Math.max(d.get(c.arma) || 0, c.arma_diag_px));
  porFamilia.set(f, d);
}
for (const [fam, armas] of porFamilia) {
  if (armas.size < 2) continue;
  const vs = [...armas.entries()].sort((a, b) => b[1] - a[1]);
  const razao = vs[0][1] / vs[vs.length - 1][1];
  if (razao > RAZAO_ESCALA) {
    falhas.push(`família ${fam}: escala em fuga — ${vs[0][0]} ${vs[0][1]}px ÷ ${vs[vs.length - 1][0]} ${vs[vs.length - 1][1]}px = ${razao.toFixed(2)}× > ${RAZAO_ESCALA}×`);
  }
}

const verde = falhas.length === 0;
if (MUT) {
  if (verde) { console.error(`RÉGUA CEGA: o mutante '${MUT}' PASSOU — a cláusula não morde`); process.exit(1); }
  console.log(`mutante '${MUT}' reprovado como devia (${falhas.length} falha[s]); primeira: ${falhas[0]}`);
  process.exit(0);
}
console.log(`vm-arsenal-check: ${caps.length} capturas, ${new Set(caps.map((c) => c.arma)).size} armas, modo=${rel.modo}, aspecto=${rel.aspecto}`);
for (const f of falhas) console.log(`  REPROVA ${f}`);
// No legado nao existe wrap Mint por construcao: o aviso so faz sentido no autorado.
const noPack = rel.modo === 'legado' ? [] : [...new Set(dados.filter((c) => c.fonte === 'pack').map((c) => c.arma))];
if (noPack.length) console.log(`  AVISO fallback: ${noPack.join(', ')} desenhando a malha do PACK — o GLB Mint de mundo não chegou nesta sessão`);
console.log(verde ? 'VERDE' : `VERMELHO: ${falhas.length} falha(s)`);
process.exit(verde ? 0 : 1);
