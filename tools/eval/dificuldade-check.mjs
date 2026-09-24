/* RÉGUA DA DIFICULDADE — a escolha do jogador chega aos bots, e o padrão é o que o dono pediu.

   Os quatro níveis existem e estão calibrados em `game.js` (`DIFF_MUL`), com o padrão rebaixado
   a pedido do dono ("o padrão tem que ser claramente mais fácil que hoje"). Só que o `<select>`
   que os oferece **nunca existiu na tela**: `main.js` liga `#diff-select`, e o id não estava em
   `index.astro` — de 187 ids que o jogo usa, era um dos dois órfãos. Na prática a dificuldade só
   era alcançável por `?diff=hard`, que ninguém digita.

   Uma régua que só cobrasse "o id existe no HTML" seria satisfeita por um `<select>` decorativo.
   Por isso ela cobra o CAMINHO INTEIRO: o elemento existe, o main.js o preenche com os níveis
   que o game.js conhece, e a escolha muda de verdade a habilidade do bot no jogo real.

   Uso: node tools/eval/dificuldade-check.mjs
        node tools/eval/dificuldade-check.mjs --mutar=sem-select   # tira o id do HTML
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Game, initTextures, renderer, sfx, PCHAR, seedRandom } from './harness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(HERE, '../..');
const MUTAR = (process.argv.slice(2).find((a) => a.startsWith('--mutar=')) || '').split('=')[1] || '';

let ok = 0, falhas = 0;
const cobra = (c, m) => { if (c) { ok++; console.log(`  ok   ${m}`); } else { falhas++; console.log(`  FALHA ${m}`); } };

let html = fs.readFileSync(path.join(RAIZ, 'src/pages/index.astro'), 'utf8');
const main = fs.readFileSync(path.join(RAIZ, 'public/js/main.js'), 'utf8');
const gameSrc = fs.readFileSync(path.join(RAIZ, 'public/js/game.js'), 'utf8');

if (MUTAR === 'sem-select') {
  html = html.replace(/<select id="diff-select"><\/select>/, '');
  console.log('\n  [MUTANTE: sem-select] — a régua TEM que reprovar');
}

console.log('\n· a dificuldade sai do código e chega ao jogador');

// DIF1 · o elemento existe na tela onde o jogador escolhe a partida
cobra(/id="diff-select"/.test(html) && /ms-match-options/.test(html),
  'DIF1 · o seletor existe no bloco de opções da partida');

// DIF2 · o main.js continua sendo o dono da lista (o HTML nasce vazio de propósito)
cobra(/\$\('diff-select'\)/.test(main) && /settings\.difficulty = diffSel\.value/.test(main),
  'DIF2 · o main.js preenche o seletor e grava a escolha');

// DIF3 · os níveis oferecidos são exatamente os que o jogo conhece
const niveisUI = [...main.matchAll(/\['(easy|normal|hard|insane)',\s*'[^']+'\]/g)].map((m) => m[1]);
const niveisJogo = [...(gameSrc.match(/const DIFF_MUL = \{([^}]+)\}/) || [, ''])[1].matchAll(/(\w+):/g)].map((m) => m[1]);
cobra(niveisJogo.length > 0 && niveisJogo.every((n) => niveisUI.includes(n)) && niveisUI.length === niveisJogo.length,
  `DIF3 · a tela oferece os mesmos níveis do jogo (${niveisJogo.join(', ')})`);

/* DIF4 · a escolha MUDA O JOGO. Sem isto, as três cláusulas acima descrevem um seletor bonito
   que não faz nada — é a diferença entre a declaração e o uso. Mede a habilidade média sorteada
   para os bots com cada nível, no jogo real, com a mesma semente. */
const TEX = initTextures();
const habilidadeMedia = (dificuldade) => {
  seedRandom(4242);
  const g = new Game({
    renderer, textures: TEX, sfx,
    settings: { bots: 8, quality: 'low', difficulty: dificuldade, sens: 1 },
    playerCharId: PCHAR, playerTeam: 'E', playerFaction: 'E', enemyFaction: 'B',
    nickname: 'DIF', mapId: 'praca_poderes', ctf: false, testMode: true,
    onQuit() {}, onMatchEnd() {},
  });
  g._ensureDolly = () => {};
  const sk = g.bots.map((b) => b.skill ?? b.aim ?? 0);
  const media = sk.reduce((a, b) => a + b, 0) / (sk.length || 1);
  g.dispose?.();
  return media;
};
const facil = habilidadeMedia('easy');
const insano = habilidadeMedia('insane');
const normal = habilidadeMedia('normal');
console.log(`  habilidade média dos bots — fácil ${facil.toFixed(3)} · normal ${normal.toFixed(3)} · insano ${insano.toFixed(3)}`);
cobra(facil < normal && normal < insano,
  `DIF4 · a escolha chega ao bot: fácil < normal < insano (${facil.toFixed(2)} < ${normal.toFixed(2)} < ${insano.toFixed(2)})`);

/* DIF5 · o padrão é o que o dono pediu — "claramente mais fácil que hoje". `hard` é o 1.00 da
   tabela, ou seja, o antigo padrão; o padrão de hoje tem que ser mais fácil que ele. */
const dificil = habilidadeMedia('hard');
cobra(normal < dificil,
  `DIF5 · o padrão (normal) é mais fácil que o antigo padrão (hard): ${normal.toFixed(2)} < ${dificil.toFixed(2)}`);

/* DIF6 · o seletor tem que PARECER com os irmãos. Achado olhando a figura: sobrou no CSS uma
   regra `#diff-select` de quando ele moraria noutra tela, e por especificidade ela vencia o
   container (13px de fonte com 20px de padding dentro de 32px de altura) — o texto "NORMAL"
   saía cortado ao meio. Régua headless nenhuma pega isso; a figura pegou. */
const css = fs.readFileSync(path.join(RAIZ, 'public/style.css'), 'utf8');
cobra(!/#diff-select\s*[,{:]/.test(css),
  'DIF6 · nenhuma regra por id disputa o estilo com a faixa de opções (foi assim que o texto saiu cortado)');

console.log(`\n${falhas ? 'REPROVADO' : 'APROVADO'} — ${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
