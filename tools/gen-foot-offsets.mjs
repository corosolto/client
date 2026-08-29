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
 * O rig está certo. Quem tira o pé do chão é o CLIPE: `walk ≈ -0,028`, `run ≈ -0,018`,
 * `crouch ≈ -0,017`, `shoot ≈ +0,015`. E o probe registra que **38 dos 44 têm os mesmos
 * números** — "no caminho procedural o ciclo de passo é o MESMO pra todos". Ou seja: um
 * punhado de clipes compartilhados, cada um com seu deslocamento de raiz, herdado do pack
 * de animação.
 *
 * Isso derruba a hipótese que estava no handoff ("é rig a refazer, 18 personagens"). Não é:
 * é uma constante por (personagem, clipe), e uma tabela conserta o elenco inteiro.
 *
 * A CORREÇÃO
 * offset = -desvio. Para um ciclo de locomoção isso é exatamente o certo: sobe o corpo até
 * o pé mais baixo do ciclo encostar no chão. Não é "empurrar pra dentro do tapete" — o pé
 * que planta passa a plantar, e a fase aérea sobe junto, como tem que ser.
 *
 * POR QUE TABELA GERADA E NÃO NÚMERO NO CÓDIGO
 * Mesmo motivo do manifest de áudio e do ARCH.md: clipe novo ou personagem novo muda os
 * números, e constante escrita à mão envelhece calada. Aqui a fonte é a própria medição.
 *
 * USO
 *   node tools/eval/char-probe.mjs      (gera tools/eval/char_probe.json — a fonte)
 *   node tools/gen-foot-offsets.mjs             escreve a tabela
 *   node tools/gen-foot-offsets.mjs --check     sai 1 se estiver defasada
 *   node tools/gen-foot-offsets.mjs --check --mutante=semverificados
 *                                               remove as excecoes olhadas; tem que sair 1
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FONTE = join(ROOT, 'tools', 'eval', 'char_probe.json');
const SAIDA = join(ROOT, 'public', 'models', 'anims', 'foot-offsets.json');
const CHECK = process.argv.includes('--check');
const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
if (!['', 'semverificados'].includes(MUTANTE)) throw new Error(`mutante desconhecido: ${MUTANTE}`);
if (MUTANTE && !CHECK) throw new Error('mutante so pode rodar com --check; nunca sobrescreve o baseline');

if (!existsSync(FONTE)) {
  console.error('✗ tools/eval/char_probe.json não existe. Rode antes: node tools/eval/char-probe.mjs');
  process.exit(1);
}

const probe = JSON.parse(readFileSync(FONTE, 'utf8'));
const TOL = 0.01;            // a mesma tolerância da CHR3
const R = (v) => Math.round(v * 1e4) / 1e4;

/* TETO DE CORREÇÃO — 8 cm. Não é número redondo por acaso, e não é o teto da CHR3:
   é a linha que separa DOIS defeitos diferentes que a medição estava somando num número só.

   A massa do elenco tem desvio de 3-4 cm (mediana por pose: walk 4,3 · crouch 4,4 · run 3,6 ·
   shoot 3,0 · idle 2,5 cm). Isso é pé fora do chão, e somar a constante conserta.

   Mas há uma cauda de outra natureza — `proerd/crouch 43 cm`, `canarinho/crouch 37 cm`,
   `ancap` em quatro poses. Meio corpo de deslocamento não é "pé flutuando": é o clipe
   descendo a RAIZ inteira, provavelmente agachamento feito baixando o boneco em vez de
   dobrar o joelho. Somar +43 cm ali não conserta nada — troca um boneco enterrado por um
   boneco voando, e ainda faz a régua ficar verde mentindo.

   Então a tabela aplica até 8 cm (tornozelo; acima disso não é mais "quase no chão") e
   NOMEIA o resto em `suspeitos`, que é lista de trabalho, não de conserto automático.
   A regra da casa vale aqui inteira: correção grande só entra depois de olhar a imagem. */
const CAP = 0.08;
/* Excecoes acima do CAP so entram depois de figura olhada. O Lobisomem Mint encosta no
   chao na bind, mas os cinco clipes afundam canelas/pes; a captura da mesma pose medida
   (`select-inflate --fotos`, 10/08) mostra o plano y=0 cortando as pernas. Portanto aqui
   somar -desvio corrige a translacao do clipe; mover o pivo do GLB quebraria a bind boa.
   Os VALORES continuam vindo do char_probe.json — esta lista autoriza pares, nao numeros. */
const VERIFICADOS_ACIMA_CAP = new Set([
  'lobisomem/idle',
  'lobisomem/walk',
  'lobisomem/run',
  'lobisomem/shoot',
  'lobisomem/crouch',
]);
const verificadosAtivos = MUTANTE === 'semverificados' ? new Set() : VERIFICADOS_ACIMA_CAP;

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
    const chave = `${p.id}/${pose}`;
    if (Math.abs(desvio) > CAP && !verificadosAtivos.has(chave)) {
      suspeitos.push({ id: p.id, pose, desvio: R(desvio) });
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
  excecoesVerificadas: [...verificadosAtivos],
  offsets: tabela,
  /* NÃO são corrigidos automaticamente — ver o comentário do CAP. É lista de trabalho:
     cada um precisa de imagem antes de virar número. */
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
