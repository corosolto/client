/* ============================================================================
   texel-mutantes.mjs — O TESTE DO TESTE da régua de densidade de texel.
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   "Régua entra com uma mutação que a faz ficar vermelha. Sem isso você não sabe se
   ela mede — sabe que ela imprime." Este arquivo injeta de volta, no disco, cada
   defeito que o texel-check.mjs foi escrito para pegar, roda a régua e restaura.

   A ARMADILHA QUE ESTE ARQUIVO EVITA (caso real desta árvore): um `replace` que NÃO
   CASA deixa o arquivo intacto, a régua fica verde e por um instante isso parece
   "o guarda funciona". Aqui todo mutante compara o texto antes e depois e MORRE se
   não aplicou — `MUTANTE NAO APLICOU` é falha, não aviso.

   RESULTADO POR MUTANTE
     MATOU      a régua ficou vermelha na cláusula esperada  -> ela morde
     SOBREVIVEU a régua ficou verde com o defeito plantado   -> ela é cega, conserte-a
     PARCIAL    ficou vermelha, mas em outra cláusula        -> a mensagem mente

   USO
     node tools/eval/texel-mutantes.mjs                # todos
     node tools/eval/texel-mutantes.mjs --so=uv-fixa   # um
     node tools/eval/texel-mutantes.mjs --mapa=quebrada
   Ctrl-C restaura os arquivos na hora (SIGINT/SIGTERM/uncaught).
   ============================================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const VAO = path.join(ROOT, 'public/js/vao.js');
const TEX = path.join(ROOT, 'public/js/textures.js');

const arg = (n, d = null) => {
  const p = process.argv.find((a) => a.startsWith(`--${n}=`));
  return p ? p.slice(n.length + 3) : null;
};
const SO = arg('so');
const MAPA = arg('mapa') || 'quebrada';

/* Cada mutante: o arquivo, o par (velho -> novo) e a cláusula que TEM que acender.
   Os trechos são recortes literais do conserto — se o conserto for reescrito e o
   recorte deixar de casar, o mutante morre gritando em vez de passar de largo. */
const MUTANTES = [
  {
    nome: 'uv-fixa',
    porque: 'Devolve o defeito original: aoBoxGeo cria BoxGeometry sem escalar UV pelo ' +
      'tamanho do mundo, então muro de 36 m e engradado de 0,6 m recebem UV 0→1 idênticos.',
    arq: VAO,
    de: 'if (p) escalaUVporMundo(p.geo, p.w, p.h, p.d,',
    para: 'if (false) escalaUVporMundo(p.geo, p.w, p.h, p.d,',
    espera: /TEXEL[123]/,
  },
  {
    /* Este mutante mira o TILE e não o ALVO_PXM exportado de propósito. Mexer no
       `export const ALVO_PXM` acorda a guarda de limiar divergente do texel-check.mjs,
       que MORRE antes de medir — o mutante provaria a guarda, não a cláusula. Aqui a
       conta local é adulterada e o limiar exportado fica igual, então a régua roda até
       o fim e tem que reprovar pela DENSIDADE. */
    nome: 'tile-gigante',
    porque: 'Mantém a chamada de escala de UV mas mira 16 px/m em vez de ALVO_PXM — prova ' +
      'que a régua reprova a ESCALA e não apenas a presença da chamada.',
    arq: VAO,
    de: 'const tileU = pxU / ALVO_PXM, tileV = pxV / ALVO_PXM;',
    para: 'const tileU = pxU / 16, tileV = pxV / 16; /* MUTANTE tile-gigante */',
    espera: /TEXEL[12]/,
  },
  {
    /* A cláusula-irmã do conserto TILE PURO (textures.js). Sem a declaração, `repeat`
       alto empurra toda caixa para o ramo do TETO_PXM e ela para colada em 512,0 px/m,
       que é o pico que a TEXEL3b existe para pegar. */
    nome: 'puro-solto',
    porque: 'Tira a isenção de recorte das seis texturas de ruído: as caixas voltam a ' +
      'encostar no teto de 512 px/m em vez de acertar o ALVO_PXM.',
    arq: VAO,
    de: '  if (puro) return r;',
    para: '  /* MUTANTE puro-solto */',
    espera: /TEXEL3/,
  },
  {
    /* POR QUE ESTE MUTANTE MIRA A CONSTANTE E NÃO A LINHA DA FÁBRICA (medido, 12/08):
       mirando só `t.anisotropy = ANISO_TEX` dentro de `tex()` ele SOBREVIVEU. Não é
       cegueira da régua — é que o conserto passou a ter DOIS pontos de atribuição, e o
       segundo (textures.js `detailFor`, que atende também a textura nascida dentro de
       cada map_*.js) devolve a anisotropia para toda textura que passa pelo `lam()`.
       Ou seja, a linha da fábrica virou redundante para o chão dos mapas, e um mutante
       que a apaga não reproduz mais o defeito. Mirar a constante apaga os dois caminhos,
       que é o defeito original: "a fábrica nunca atribui anisotropia". Se um dia alguém
       separar os dois valores, este mutante volta a ter que ser dois. */
    nome: 'aniso1',
    porque: 'Devolve o default de anisotropia 1 para TODO caminho de textura procedural ' +
      '(fábrica `tex()` e o resgate do `detailFor`) — o defeito medido em textures.js:6-17.',
    arq: TEX,
    de: 'const ANISO_TEX = !TEXEL_ON ? 1 :',
    para: 'const ANISO_TEX = 1; /* MUTANTE aniso1 */ const _ANISO_ORIG = !TEXEL_ON ? 1 :',
    espera: /TEXEL4/,
  },
  {
    nome: 'chao-256',
    porque: 'Devolve o canvas de chão a 256² — prova que a régua enxerga resolução de ' +
      'canvas, não só `repeat`.',
    arq: TEX,
    de: 'const CHAO_PX = ',
    para: 'const CHAO_PX = 64; const _CHAO_MUTADO = ',
    espera: /TEXEL[12]/,
  },
];

const alvo = SO ? MUTANTES.filter((m) => m.nome === SO) : MUTANTES;
if (!alvo.length) { console.error(`✗ mutante "${SO}" não existe. Há: ${MUTANTES.map((m) => m.nome).join(', ')}`); process.exit(1); }

const salvos = new Map();
function restaura() {
  for (const [f, s] of salvos) fs.writeFileSync(f, s);
  salvos.clear();
}
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { restaura(); process.exit(130); });
process.on('uncaughtException', (e) => { restaura(); throw e; });

function rodaRegua() {
  const r = spawnSync(process.execPath, [path.join(HERE, 'texel-check.mjs'), `--mapa=${MAPA}`], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  return { code: r.status, txt: (r.stdout || '') + (r.stderr || '') };
}

console.log(`\n  Mutantes da régua TEXEL (mapa de prova: ${MAPA})\n  ${'-'.repeat(92)}`);

/* O VEREDITO É POR DELTA, e não por "ficou vermelho".
   A formulação antiga exigia que o estado bom estivesse VERDE no mapa de prova, senão
   abortava. Ela é correta e é a que vale quando dá — mas ela para de RODAR justamente
   quando a árvore mais precisa dela: hoje os 10 mapas carregam cláusulas vermelhas que
   moram em `map_*.js` (dispersão de pico em prop de menos de 1 m², chão de textura
   externa abaixo do piso), e uma régua que só pode ser testada num mundo já perfeito
   nunca é testada. Pior: um mutante rodado contra um estado vermelho daria MATOU de
   graça, porque a régua já reprovava antes de ele existir.
   Aqui o mutante precisa ACENDER UMA CLÁUSULA QUE NÃO ESTAVA ACESA — o par
   (cláusula, mapa) tem que ser NOVO em relação ao estado bom. Isso é estritamente mais
   exigente: piorar um número que já era vermelho conta como SOBREVIVEU. Quando o estado
   bom está verde, o conjunto base é vazio e esta regra vira exatamente a antiga. */
const acusa = (txt) => new Set([...txt.matchAll(/✗ (TEXEL\w*) (\w+):/g)].map((x) => `${x[1]} ${x[2]}`));

const base = rodaRegua();
const baseSet = acusa(base.txt);
if (base.code === 0) console.log('  · estado bom: VERDE — todo mutante acende do zero\n');
else console.log(`  · estado bom: ${baseSet.size} cláusula(s) JÁ vermelha(s) (${[...baseSet].join(', ')}).\n` +
  '    Elas não contam para nenhum mutante: só vale cláusula que o mutante ACENDE do zero.\n');

let mortos = 0;
const linhas = [];
for (const m of alvo) {
  const src = fs.readFileSync(m.arq, 'utf8');
  if (!src.includes(m.de)) {
    console.error(`  ✗ ${m.nome}: MUTANTE NAO APLICOU — o trecho\n      ${JSON.stringify(m.de)}\n` +
      `    não existe em ${path.relative(ROOT, m.arq)}. O conserto foi reescrito e o mutante ficou órfão; ` +
      `atualize-o AGORA, porque um mutante que não casa dá confiança falsa por escrito.`);
    restaura(); process.exit(1);
  }
  const mut = src.replace(m.de, m.para);
  if (mut === src) { console.error(`  ✗ ${m.nome}: MUTANTE NAO APLICOU (replace no-op)`); restaura(); process.exit(1); }
  salvos.set(m.arq, src);
  fs.writeFileSync(m.arq, mut);

  const r = rodaRegua();
  restaura();

  const mutSet = acusa(r.txt);
  const novas = [...mutSet].filter((x) => !baseSet.has(x));
  /* Régua que morre ANTES de medir (guarda de limiar divergente, exceção no boot) não
     produz linha de cláusula nenhuma. Sem esta checagem isso passaria como SOBREVIVEU e
     acusaria de cega uma régua que na verdade nem chegou a olhar. */
  if (r.code !== 0 && mutSet.size === 0) {
    console.error(`  ✗ ${m.nome}: a régua ABORTOU sem medir (código ${r.code}). O mutante não prova nada:\n` +
      r.txt.split('\n').filter((l) => l.includes('✗')).slice(0, 3).map((l) => '      ' + l.trim()).join('\n'));
    restaura(); process.exit(1);
  }
  const certo = novas.some((x) => m.espera.test(x.split(' ')[0]));
  const veredito = novas.length === 0 ? 'SOBREVIVEU' : (certo ? 'MATOU' : 'PARCIAL');
  if (veredito === 'MATOU') mortos++;
  linhas.push({ nome: m.nome, veredito, acendeu: novas.join(',') || '—' });
  console.log(`  ${veredito.padEnd(11)} ${m.nome.padEnd(14)} acendeu do zero: ${novas.join(', ') || '(nada)'}`);
  if (veredito !== 'MATOU') console.log(`              ${m.porque}`);
}
restaura();

console.log('  ' + '-'.repeat(92));
console.log(`  ${mortos}/${alvo.length} mutantes MORTOS.`);
if (mortos < alvo.length) {
  console.error('  ✗ Há mutante SOBREVIVENTE ou PARCIAL: a régua não morde o defeito que ela diz cobrir.');
  process.exit(1);
}
console.log('  ✓ a régua morde todos os defeitos que ela declara cobrir.\n');
