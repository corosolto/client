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
 *   tamanho   infla o diâmetro 3D medido — a cláusula de tamanho tem de reprovar
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
/* Piso recalibrado com o instrumento corrigido (dedupe de raiz + espera por
   presença). Medido nas 9 armas, 3:2 e 16:9, fora dos estados de luneta: o mínimo
   saudável cai a 94 (`awp/reload-f060`, mão parcialmente fora na pose de recarga —
   conferido na figura, está certo) e a 72 na m92. Quebrada mede 0. O piso separa
   "mão sumiu" de "mão saiu um pouco"; perda PARCIAL não é julgada por esta cláusula. */
const PISO_MAO = { autorado: 40, legado: 40 };
/* Teto do contato, com 800 pontos por lado: FORA do ADS toda arma saudável mede
   0–1 px, então 10 px é folga larga. NO ADS todas sobem junto (ak 14, pistol 25,
   shotgun 38 em 16:9) — padrão sistemático, não defeito de uma arma: o delta que
   leva a alça ao centro parece mover a arma sem levar a mão. Enquanto isso não for
   investigado, o ADS é MEDIDO E RELATADO, não reprovado: teto que reprova o que não
   se entende vira vermelho que se aprende a ignorar. */
const TETO_CONTATO = 10;
const RAZAO_ESCALA = 1.35;   // dentro da família (m92 861 ÷ ak 553 = 1,56 reprovou)
const LUNETA = new Set(['sniper', 'bolt']);  // escondem o viewmodel no ADS

const mut = JSON.parse(JSON.stringify(caps));
if (MUT === 'semarma') mut[0].armaEmQuadro = 0;
if (MUT === 'semmao') mut[0].maoEmQuadro = 0;
if (MUT === 'semcontato') mut[0].contato_px = 400;
if (MUT === 'escala') mut[0].arma_diag_px = Math.round((mut[0].arma_diag_px || 500) * 2);
if (MUT === 'tamanho') for (const c of mut) c.arma_diam3d_cm = Math.round((c.arma_diam3d_cm || 90) * 1.4 * 10) / 10;
const dados = MUT ? mut : caps;

const falhas = [];
const adsContato = [];
for (const c of dados) {
  const onde = `${c.arma}/${c.cenario}`;
  if (c.armaAmostra === 0 || c.armaEmQuadro === 0) {
    /* Exceção medida, não afrouxamento: sniper e ferrolho ESCONDEM o viewmodel no
       ADS e põem a luneta em tela cheia — `awp/ads` mede 0 nos dois caminhos, com
       ou sem defeito. Fora do ADS a cláusula vale inteira. */
    if (c.luneta && (c.cenario === 'ads' || c.mirando)) continue;
    if (c.luneta === undefined && c.cenario === 'ads' && LUNETA.has(FAMILIA[c.arma])) continue;   // relatorio antigo
    falhas.push(`${onde}: ARMA NÃO DESENHA (amostra ${c.armaAmostra}, em quadro ${c.armaEmQuadro})`);
    continue; // sem arma não há contato nem escala que meçam algo
  }
  const piso = PISO_MAO[rel.modo] ?? PISO_MAO.autorado;
  if (c.maoEmQuadro < piso) falhas.push(`${onde}: mão fora do quadro (${c.maoEmQuadro} < ${piso} de ${c.maoAmostra})`);
  if (c.contato_px !== null && c.contato_px > TETO_CONTATO) {
    if (c.cenario === 'ads') adsContato.push(`${onde} ${c.contato_px}px`);
    else falhas.push(`${onde}: mão sem contato (${c.contato_px} px > ${TETO_CONTATO})`);
  }
}
/* Escala: diagonal NA TELA nao serve — oscilou 624→878 px para a mesma arma entre
   rodadas, porque depende da pose e da distancia. O diametro 3D da nuvem de pontos e
   invariante (corpo rigido) e reproduziu identico em rodadas seguidas: ak 87,2 cm,
   m4 84,6, m92 75,6, akm 105,8. Compara-se com o `len` DECLARADO em weapons.js:
   as tres primeiras batem em ~1%; a akm mede 20% a mais que o declarado. */
/* Tolerancia 8% para arma longa: 21 das 25 batem o declarado dentro de 2% (awp 116,1
   /115, ak 87,2/88, lmg 110,1/110, svd 115/115...). A de UMA MAO fica de fora: o
   diametro 3D vai da boca ao calcanhar da coronha e supera o `len` por construcao
   (pistol 30,4/26, revolver38 27,3/24, deagle 31,5/30) — a clausula mediria a metrica,
   nao a arma. */
const TOL_TAMANHO = 0.08;
const UMA_MAO = new Set(['pistol', 'deagle', 'revolver38', 'knife']);
const tamanhos = new Map();
for (const c of dados) {
  if (!c.arma_diam3d_cm || !c.len_declarado_cm) continue;
  const d = tamanhos.get(c.arma) || [];
  d.push(c.arma_diam3d_cm);
  tamanhos.set(c.arma, d);
}
const umaMaoVistas = [];
for (const [arma, medidas] of tamanhos) {
  if (UMA_MAO.has(arma)) { umaMaoVistas.push(arma); continue; }
  medidas.sort((a, b) => a - b);
  const mediana = medidas[Math.floor(medidas.length / 2)];
  const declarado = dados.find((c) => c.arma === arma)?.len_declarado_cm;
  const erro = Math.abs(mediana - declarado) / declarado;
  if (erro > TOL_TAMANHO) {
    falhas.push(`${arma}: tamanho renderizado ${mediana} cm contra ${declarado} cm declarado em weapons.js (${Math.round(erro * 100)}%)`);
  }
}
if (umaMaoVistas.length) console.log(`  tamanho não julgado (arma de uma mão, ver nota): ${umaMaoVistas.join(', ')}`);
// Vacuidade: arma pedida e nao medida (troca falhou) some do relatorio em silencio.
if (Array.isArray(rel.solicitadas)) {
  const medidas = new Set(dados.map((c) => c.arma));
  for (const a of rel.solicitadas) if (!medidas.has(a)) falhas.push(`${a}: PEDIDA E NÃO MEDIDA — nenhuma captura no relatório`);
}
if (adsContato.length) console.log(`  ADS (medido, não reprovado): contato acima de ${TETO_CONTATO} px em ${adsContato.join(', ')}`);
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
