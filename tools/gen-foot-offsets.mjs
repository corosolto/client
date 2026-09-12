#!/usr/bin/env node
/* Gera public/models/anims/foot-offsets.json — correção de pé no chão, POR CLIPE.
 *
 * O DEFEITO (invariante CHR3, vermelha desde sempre)
 *   "pés no chão na bind pose E em cada clipe (|base da bbox| ≤ 0,01 m)"
 *   44 personagens medidos: 24 afundando (até -0,074 m), 32 flutuando (até +0,043 m).
 *
 * O QUE A MEDIÇÃO DIZ, E POR QUE ISSO **NÃO** É RE-RIG
 * `char-probe.mjs` mede por POSE, e o número que importa é este:
 *
 *     bind = 0.000   em TODOS os 44
 *
 * O rig está certo. Quem tira o pé do chão é o CLIPE. Desde 30/08 a sonda mede o PÉ
 * (vértices cuja junta dominante é de canela/pé — RX_PE no char-probe.mjs), não a base
 * da bbox inteira: rabo/casaco cruzando o chão não é "pé fora do chão" (proerd/canarinho
 * no crouch eram exatamente isso, com os pés plantados).
 *
 * A CORREÇÃO
 * offset = -desvio. Para um ciclo de locomoção isso é exatamente o certo: sobe o corpo até
 * o pé mais baixo do ciclo encostar no chão. Não é "empurrar pra dentro do tapete" — o pé
 * que planta passa a plantar, e a fase aérea sobe junto, como tem que ser. Desvio GRANDE
 * só entra com constância comprovada (amplitude ≤ 2 cm no clipe inteiro) — ver o bloco
 * "O QUE SEPARA COMPENSÁVEL DE NÃO-COMPENSÁVEL" abaixo.
 *
 * POR QUE TABELA GERADA E NÃO NÚMERO NO CÓDIGO
 * Mesmo motivo do manifest de áudio e do ARCH.md: clipe novo ou personagem novo muda os
 * números, e constante escrita à mão envelhece calada. Aqui a fonte é a própria medição.
 *
 * USO
 *   node tools/eval/char-probe.mjs      (gera tools/eval/char_probe.json — a fonte)
 *   node tools/gen-foot-offsets.mjs             escreve a tabela
 *   node tools/gen-foot-offsets.mjs --check     sai 1 se estiver defasada
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FONTE = join(ROOT, 'tools', 'eval', 'char_probe.json');
const SAIDA = join(ROOT, 'public', 'models', 'anims', 'foot-offsets.json');
const CHECK = process.argv.includes('--check');

if (!existsSync(FONTE)) {
  console.error('✗ tools/eval/char_probe.json não existe. Rode antes: node tools/eval/char-probe.mjs');
  process.exit(1);
}

const probe = JSON.parse(readFileSync(FONTE, 'utf8'));
const TOL = 0.01;            // a mesma tolerância da CHR3
const R = (v) => Math.round(v * 1e4) / 1e4;

/* O QUE SEPARA COMPENSÁVEL DE NÃO-COMPENSÁVEL (reescrito em 30/08, depois de medir
   a cauda que o teto antigo de 8 cm deixava de fora — e de OLHAR a imagem de cada um):

   A régua agora mede o PÉ (vértices de canela/pé), não a bbox inteira — ver RX_PE no
   char-probe.mjs. Com isso a antiga cauda se divide em TRÊS classes, medidas quadro a
   quadro no clipe inteiro:

   (a) PÉ PLANTADO, corpo cruzando o chão — proerd/crouch (bbox -0,43; pé +0,003) e
       canarinho/crouch (bbox -0,37; pé -0,007): era o RABO, skinado em Hips. Não é "pé
       fora do chão", a régua de bbox é que mentia. Sumiram daqui ao medir o pé certo.
   (b) PÉ ENTERRADO COM DESVIO CONSTANTE — esbirro/crouch (-0,143), ancap/crouch
       (-0,140), dollynho/crouch (-0,106): variação ≤ 5 mm no clipe INTEIRO (6,7 s).
       O clipe desce a raiz um valor fixo; somar a constante oposta recoloca o pé no
       chão em TODO quadro, sem criar voo em nenhum. Compensável, sem teto de magnitude:
       quem garante que o offset não vira "boneco voando" é a constância, não o tamanho.
   (c) RAIZ OSCILANDO — ancap/walk (-0,037…-0,131), ancap/run (-0,026…-0,106),
       esbirro/run (-0,029…-0,137): o pé afunda no meio do ciclo. Um offset constante
       pelo pior ponto ergueria a fase de apoio ~9 cm no ar — troca afundar por flutuar.
       NÃO compensável por tabela; é defeito do clipe. Fica em `suspeitos`, com a
       amplitude medida, como lista de trabalho (exige clipe novo, não número).

   Regra: desvio ≤ CAP compensa (massa do elenco, amplitude pequena); desvio > CAP só
   compensa com constância comprovada (amplitude ≤ AMP_TOL na faixa medida pela sonda). */
const CAP = 0.08;
const AMP_TOL = 0.02;   // ≤ 2 cm de variação no clipe = desvio constante (os da classe (b) medem ≤ 5 mm)

const tabela = {};
const suspeitos = [];
let corrigidos = 0, total = 0, pior = 0, piorQuem = '';
for (const p of probe.personagens || []) {
  const porPose = p.C3?.porPose;
  if (!porPose) continue;
  const linha = {};
  for (const [pose, desvio] of Object.entries(porPose)) {
    total++;
    if (Math.abs(desvio) <= TOL) continue;   // já está no chão: não inventa correção
    const fx = p.C3?.faixaPorPose?.[pose];
    const amp = fx ? fx[1] - fx[0] : null;
    const constante = amp != null && amp <= AMP_TOL;
    if (Math.abs(desvio) > CAP && !constante) {
      suspeitos.push({ id: p.id, pose, desvio: R(desvio), amplitude: amp != null ? R(amp) : null });
      continue;
    }
    linha[pose] = R(-desvio);
    corrigidos++;
    if (Math.abs(desvio) > Math.abs(pior)) { pior = desvio; piorQuem = `${p.id}/${pose}`; }
  }
  if (Object.keys(linha).length) tabela[p.id] = linha;
}
suspeitos.sort((a, b) => Math.abs(b.desvio) - Math.abs(a.desvio));

const saida = {
  gerado: probe.gerado || null,
  fonte: 'tools/eval/char_probe.json (C3.porPose) — via tools/gen-foot-offsets.mjs',
  nota: 'offset em METROS somado ao Y do modelo enquanto o clipe está ativo. offset = -desvio medido.',
  tolerancia: TOL,
  teto: CAP,
  offsets: tabela,
  /* NÃO compensáveis por constante — raiz oscilando dentro do clipe (amplitude > 2 cm
     com desvio > 8 cm). Defeito DO CLIPE: exige clipe novo, não offset. Lista de
     trabalho documentada, com a amplitude medida. */
  suspeitos,
};

const texto = JSON.stringify(saida, null, 1) + '\n';
const igual = existsSync(SAIDA) && readFileSync(SAIDA, 'utf8') === texto;

console.log(`PÉS  ${Object.keys(tabela).length} personagens com correção · ${corrigidos} de ${total} pares (personagem, pose) fora de ±${TOL} m`);
console.log(`     pior corrigido: ${pior.toFixed(4)} m em ${piorQuem}`);
if (suspeitos.length) {
  console.log(`     ⚠ ${suspeitos.length} acima do teto de ${CAP} m — NÃO corrigidos (outro defeito, exigem imagem):`);
  for (const s of suspeitos.slice(0, 8)) console.log(`        ${s.desvio.toFixed(4)} m  ${s.id}/${s.pose}`);
  if (suspeitos.length > 8) console.log(`        (+${suspeitos.length - 8})`);
}

if (CHECK) {
  if (!igual) { console.error('\n✗ foot-offsets.json DEFASADO. Rode: npm run feet'); process.exit(1); }
  console.log('\n✓ foot-offsets.json em dia com a medição');
  process.exit(0);
}
mkdirSync(dirname(SAIDA), { recursive: true });
writeFileSync(SAIDA, texto);
console.log(`\n✓ ${relative(ROOT, SAIDA)} escrito`);
