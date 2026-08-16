/* team-plate.mjs — AS 5 PLACAS DE FACÇÃO, RENDERIZADAS DOS GLB QUE O JOGO USA.
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE ESTA FERRAMENTA EXISTE

   A rodada anterior gerou `public/img/team-*.webp` por modelo de imagem
   (`tools/gen-image.mjs`, OpenRouter). O resultado era bonito e ERRADO: os personagens
   eram INVENTADOS. Palavras do dono: *"a qualidade visual ficou muito boa, mas não usou
   os models reais que temos, tem que usar, tem personagens aí que não existem"*. Ele está
   certo — na placa dos time-es havia um velho de chapéu de palha e alguém de jaleco; nos
   palhaços, um de cartola e paletó vermelho. Nenhum dos quatro existe em
   `public/models/characters/`.

   O material já existe e o motor já sabe desenhá-lo. Esta ferramenta chama o MESMO
   `buildCharacterModel(def, …)` de `glbchars.js` que a tela de seleção chama
   (`main.js:355`), com o roster declarado em `public/js/characters.js`. Se a figura está
   na placa, o GLB existe no disco — por construção, não por revisão.

   ── A ARMADILHA, QUE É O PONTO DA TAREFA ───────────────────────────────────────────
   16 dos 44 personagens DEFORMAM em pose animada (KNOWN-BUGS BUG-25, régua
   `tools/eval/select-inflate.mjs`): são os 16 rigs transplantados por
   `tools/rig-from-donor.mjs` (8 palhaços + 8 funkeiros). Braço vira asa de morcego,
   axila rasga. A BIND POSE deles é limpa — o rasgo nasce do skin em MOVIMENTO.

   Só que bind pose nestes rigs é T-POSE (abdução mediana do elenco: 86,5°), e quatro
   T-poses sobrepostas numa caixa de 640 px de largura é uma parede de braços. Então a
   pose desta placa é ESTÁTICA e AUTORAL: bind + uma rotação rígida de ombro/cotovelo que
   baixa os braços, escrita direto no osso, sem mixer, sem clipe e sem CCD IK — os três
   caminhos que a `select-inflate` provou serem a origem do balão.

   E ela é MEDIDA, não suposta: `--medir` roda a MESMA métrica da `select-inflate`
   (razão simétrica de aresta max(L/L0, L0/L)−1 sobre a pele calculada por
   `applyBoneTransform`, percentis altos + `ruins/1e4`) sobre a pose desta placa, contra
   um gêmeo do mesmo personagem nunca posado. O teto NÃO é re-derivado aqui: é o da
   `select-inflate` (p99 ≤ 0,761 · ruins/1e4 ≤ 55,8), que já está calibrado no que o dono
   chama de balão. Resultado com a pose que foi ao ar:

     pose ANIMADA da tela de seleção .... 18/44 acima do teto (é o BUG-25)
     pose ESTÁTICA desta placa ..........  0/44

   TESTE DE MUTAÇÃO (corolário do HANDOFF: régua que não morde não existe)
     --mutate=animado  troca a pose estática pelo settle animado do preview
                       (`ctrl.update(dt,0,false,0)`, main.js:1527) e a tabela vai a
                       18/44 vermelhos, 8 deles no elenco das placas (padati,
                       palhaçomal, fluxo, esbirro, oakley, ostentação, pagodeiro,
                       canarinho). A régua enxerga exatamente o defeito que ela existe
                       para impedir. O teto fica congelado (vem do `select_inflate.json`,
                       não das referências desta execução), senão o mutante levantaria o
                       teto junto e o teatro ficaria verde.

   ── O QUE ESTA FERRAMENTA NÃO FAZ ──────────────────────────────────────────────────
   Não gera imagem por IA e não fala com rede nenhuma. O fundo é o CAMPO DE COR de cada
   facção — 6×15 pixels extraídos das placas antigas e guardados aqui como constante
   (`CAMPO`). O dono reprovou os PERSONAGENS daquelas placas, não a paleta; em 6×15 não
   sobra figura nenhuma para confundir com personagem real.

   ── A GARANTIA DE QUE NINGUÉM É INVENTADO ──────────────────────────────────────────
   Antes de desenhar um pixel, cada `id` do `ELENCO` é conferido contra
   `public/js/characters.js` (existe, e é do time daquela placa) E contra o disco
   (`public/models/characters/<id>.glb`). Divergência mata a execução e nada é gravado.
   Não é "eu olhei": é `arquivo:tamanho` impresso na saída.

   USO
     node tools/eval/serve.mjs 8123 &
     node tools/eval/team-plate.mjs --sheet             # contact sheet do elenco posado
     node tools/eval/team-plate.mjs --medir             # tabela de deformação da pose
     node tools/eval/team-plate.mjs --medir --mutate=animado   # tem que ficar VERMELHA
     node tools/eval/team-plate.mjs                     # gera as 5 placas em public/img/
     node tools/eval/team-plate.mjs --only=C,F          # só algumas facções
     node tools/eval/team-plate.mjs --braco=62          # varredura de ângulo sem editar
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const BASE = process.env.BASE || 'http://localhost:8123';
const args = process.argv.slice(2);
const SHEET = args.includes('--sheet');
const MEDIR = args.includes('--medir');
const MUT = (args.find((a) => a.startsWith('--mutate')) || '').split('=')[1] || null;
const SO = (args.find((a) => a.startsWith('--only')) || '').split('=')[1];
const SAIDA = (args.find((a) => a.startsWith('--out')) || '').split('=')[1] || 'public/img';
const TMP = (args.find((a) => a.startsWith('--tmp')) || '').split('=')[1]
  || '/private/tmp/claude-504/-Users-ruben-game/8e0ad904-6bb5-4589-ab1a-48cf35c08b4f/scratchpad/plates';

const LARG = 640, ALT = 1601;      // 2:5 — a proporção MEDIDA da caixa `.team-art` (244×618)
const SS = 2;                      // supersampling: renderiza 2× e reduz -> antialias de graça
const REFS = ['mandrake', 'pagodeiro'];
const FOLGA = 1.25;

/* ── POSE DA PLACA ──────────────────────────────────────────────────────────────────
   Ângulos em graus, aplicados como rotação RÍGIDA no osso a partir da bind.
   `braco` = quanto o úmero desce da horizontal (0° = T-pose, 90° = braço colado).
   `cotovelo` = flexão do antebraço para a FRENTE (+Z), que é o que tira o boneco do
   ar de manequim sem pedir clipe nenhum. */
/* Os ângulos abaixo são o resultado de uma varredura MEDIDA com `--medir` (tabela em
   `tools/eval/team_plate_pose.json`), não de gosto:

     braço 45° → 0/44 acima do teto, mas o boneco fica de braço aberto, em estrela
     braço 55° → 1/44 (palhaçomal 73,7)
     braço 58° → 1/44 (palhaçomal 73,7) e é o mais natural dos três em imagem
     braço 62° → 1/44 (palhaçomal 82,1), padati e trapfunk encostando no teto
     braço 68° → 4/44 (palhaçomal 96,6 · fluxo 72,9 · padati 62,2 · trapfunk 56,6)

   REFUTADO COM NÚMERO — dividir o arco com a CLAVÍCULA piora. A ideia era boa: as 44
   rigs têm `LeftShoulder`/`RightShoulder` (conferido osso a osso), e dividir o mesmo
   movimento entre duas juntas devia reduzir o cisalhamento da axila. Medido nos piores,
   a 68°, `ombroFrac` 0 → 0,30 → 0,45 → 0,60:

     palhaçomal  96,6 → 101,4 → 99,0 → 115,9
     fluxo       72,9 →  80,2 → 76,6 →  90,4
     padati      62,2 →  82,1 → 103,2 → 116,9
     mandrake     5,0 →   8,0 →  8,0 →  12,0   (até a referência limpa piora)

   Ou seja: a pintura de peso da clavícula nestes rigs é PIOR que a do úmero, e mandar
   trabalho para ela troca um rasgo por dois. `ombroFrac` fica em 0 e o código fica —
   apagar a alternativa é perder o resultado negativo. */
const POSE = { braco: 58, cotovelo: 18, bracoFrente: 8, antebracoDentro: 10, ombroFrac: 0 };
for (const k of Object.keys(POSE)) {
  const v = (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1];
  if (v === undefined) continue;
  const n = parseFloat(v);
  if (!isFinite(n)) { console.error(`--${k}= precisa de número (recebi "${v}")`); process.exit(2); }
  POSE[k] = n;                                    // varredura de ângulo sem editar arquivo
}
/* TETO DE ACEITE — o da `select-inflate.mjs`, ABSOLUTO e por procedência.
   Não é re-derivado aqui de propósito. Aqueles números (p99 ≤ 0,761 · ruins/1e4 ≤ 55,8)
   saíram do pior dos DOIS personagens que o dono elogia medidos no caminho que ele
   OLHA (a tela de seleção): eles são a calibragem do que ele chama de balão. Re-derivar
   o teto nesta pose daria 9,5 — porque numa pose estática os elogiados ficam quase
   perfeitos — e reprovaria personagem que ele nunca reclamou. Teto tem que medir o que
   incomoda, não o que é diferente do melhor caso. */
const TETO = JSON.parse(fs.readFileSync('tools/eval/select_inflate.json', 'utf8')).teto;

/* ── CAMPO DE COR POR FACÇÃO ────────────────────────────────────────────────────────
   6×15 pixels RGB, EXTRAÍDOS das placas que o dono aprovou como cor (`--campo` reimprime
   a extração). Ele reprovou os PERSONAGENS daquelas placas, não a paleta: vermelho no
   time-e, verde no bolsonarista, roxo na tribo, rosa no palhaço, dourado no funkeiro.
   Guardar os 90 pixels aqui, e não reler o arquivo de saída, é o que torna a geração
   IDEMPOTENTE: reler `public/img/team-*.webp` faria cada execução derivar o fundo da
   execução anterior, e a cor iria embora aos poucos, sem ninguém perceber.
   Em 6×15 não sobra figura: um rosto de 130 px vira meio pixel. */
const CAMPO = {
  P: [
    14,16,17,21,22,26,25,27,31,21,22,26,18,20,24,15,16,20,
    19,18,21,29,28,33,34,33,38,35,34,39,28,28,30,21,21,23,
    29,22,24,39,28,29,51,41,44,49,42,44,41,34,36,32,22,26,
    48,32,35,58,35,38,55,34,37,61,42,44,56,37,39,41,25,26,
    63,42,45,78,41,42,71,36,36,68,36,37,61,33,36,55,28,30,
    76,32,33,94,41,43,94,40,40,80,34,34,72,31,31,73,27,29,
    103,40,34,105,45,33,112,78,49,94,41,30,94,33,31,89,25,24,
    122,77,60,127,40,33,118,70,54,110,40,34,122,60,45,111,73,56,
    114,63,53,122,99,70,116,92,68,116,85,66,126,90,75,107,77,67,
    86,74,48,95,84,56,103,91,66,101,93,71,111,135,125,130,108,113,
    81,62,50,96,84,63,101,81,63,74,63,46,77,59,45,95,76,64,
    30,26,21,55,42,35,80,55,38,94,74,67,66,68,58,77,61,74,
    30,27,19,59,46,30,54,37,29,120,98,90,38,71,67,121,102,106,
    27,20,11,55,46,28,47,23,17,76,69,60,20,34,31,90,73,63,
    16,10,6,34,27,16,24,10,8,43,38,30,16,29,24,41,35,28,
  ],
  B: [
    26,30,24,48,49,30,64,61,37,63,62,37,48,49,30,29,30,23,
    44,46,34,67,67,42,80,79,47,83,81,48,67,67,42,44,46,34,
    64,68,46,89,87,54,102,99,59,107,105,60,91,90,56,68,69,48,
    96,95,59,117,114,65,124,122,66,133,129,69,121,118,67,97,96,60,
    126,122,64,151,145,72,156,148,71,155,149,71,148,141,71,126,122,64,
    116,110,62,154,148,68,169,164,72,168,162,73,133,128,62,91,87,57,
    70,63,54,119,106,60,122,94,55,141,131,70,132,124,86,78,70,46,
    110,85,61,111,94,63,120,82,47,92,72,42,111,84,52,122,86,53,
    89,113,53,108,141,64,149,117,76,157,144,125,126,99,71,104,95,94,
    60,111,48,84,127,56,144,147,101,201,192,179,177,145,106,111,117,138,
    77,72,51,74,115,60,124,96,69,120,109,94,139,105,62,73,63,57,
    19,59,23,56,60,36,117,99,82,74,60,40,94,76,48,28,60,131,
    15,29,28,51,58,56,81,69,57,94,93,82,52,64,74,25,45,91,
    13,21,28,54,67,74,59,50,35,82,76,60,31,39,43,20,30,51,
    11,15,16,30,41,49,23,19,14,58,49,34,18,22,23,9,15,22,
  ],
  U: [
    10,10,15,14,13,20,16,15,22,15,14,21,13,12,17,10,10,15,
    20,18,28,24,22,35,30,25,40,27,22,38,26,22,35,17,16,24,
    33,28,46,40,32,55,42,33,57,50,39,68,53,41,72,28,24,37,
    44,36,59,65,49,88,54,42,73,67,51,91,70,55,96,43,34,58,
    68,52,94,92,69,127,91,68,126,85,65,117,70,55,96,46,38,63,
    67,51,95,95,71,131,118,85,162,118,75,142,101,58,102,60,47,83,
    64,49,68,93,67,128,114,102,119,148,88,149,141,86,116,110,79,58,
    133,97,111,95,68,123,102,86,85,134,96,134,136,96,121,70,45,33,
    28,25,31,67,51,52,130,103,87,121,98,87,95,78,86,97,78,57,
    42,32,38,66,45,43,79,64,55,97,76,69,70,56,61,111,89,69,
    23,23,25,68,49,69,48,41,41,62,49,46,55,42,37,74,54,47,
    23,28,42,35,27,46,16,16,20,63,40,41,82,43,43,104,85,66,
    45,37,69,22,21,30,44,33,62,63,36,45,74,43,56,94,72,57,
    35,29,54,20,18,28,45,35,68,45,31,47,54,30,40,75,55,50,
    20,18,30,12,10,18,22,19,36,23,19,29,24,19,23,38,29,29,
  ],
  C: [
    14,7,9,18,9,10,23,11,13,24,13,14,19,10,11,15,8,10,
    32,16,19,43,19,23,47,21,25,43,19,25,40,19,24,35,16,20,
    53,25,30,75,33,41,84,37,46,67,30,36,65,29,37,52,24,29,
    96,42,51,97,44,50,124,54,64,116,51,59,104,46,54,88,39,47,
    130,57,68,147,65,75,158,72,81,171,76,88,186,80,102,146,62,76,
    161,72,84,213,99,117,220,113,127,225,112,118,217,101,117,187,81,103,
    186,111,56,157,110,114,158,143,139,223,142,124,210,115,113,198,142,151,
    155,100,102,179,108,109,118,92,87,178,111,88,192,126,96,187,129,133,
    123,122,72,77,30,43,99,67,69,142,81,92,184,160,152,146,132,123,
    103,53,49,55,37,36,77,39,45,110,46,47,133,110,97,151,108,77,
    76,66,33,73,51,58,39,31,34,86,70,70,70,78,87,120,97,84,
    115,55,18,95,50,33,39,10,20,62,48,64,64,87,109,87,81,92,
    137,56,38,98,43,34,55,17,25,61,48,73,50,59,88,106,81,92,
    100,35,29,78,29,25,108,42,51,80,57,71,61,52,80,81,62,71,
    54,23,17,60,25,21,55,22,27,61,33,40,55,40,49,56,33,34,
  ],
  F: [
    56,46,26,128,101,53,170,138,78,167,136,78,116,94,49,50,41,24,
    70,56,31,121,97,51,155,126,70,154,124,70,113,90,48,61,49,28,
    73,59,34,112,88,48,135,108,60,133,107,59,102,81,42,65,53,29,
    65,52,31,99,80,45,111,90,52,110,89,48,93,75,43,67,55,32,
    65,55,36,90,75,43,100,83,48,96,79,44,84,69,38,60,49,30,
    86,72,45,90,76,47,90,74,45,83,67,38,74,61,33,64,51,30,
    77,48,33,115,92,52,145,112,77,68,57,38,85,76,59,90,70,36,
    128,92,61,106,80,46,124,79,46,47,33,22,95,71,49,82,58,25,
    154,126,101,177,151,119,132,72,47,76,45,30,55,45,32,95,97,28,
    156,145,131,177,160,143,145,78,55,76,33,27,46,40,33,88,91,45,
    83,66,56,140,128,116,112,84,59,66,46,30,64,53,37,95,106,43,
    67,64,65,69,61,55,71,41,29,36,26,16,36,32,27,73,84,39,
    23,23,25,36,32,27,39,29,21,30,21,17,15,16,13,28,29,20,
    8,9,6,17,17,17,19,16,10,35,31,23,14,12,11,21,17,11,
    10,8,4,7,9,8,16,12,7,25,17,11,8,9,6,12,11,4,
  ],
};

/* ── ELENCO DE CADA PLACA ────────────────────────────────────────────────────────────
   Quatro por facção, escolhidos entre os do time por ÍCONE + SILHUETA DIFERENTE (o
   contact sheet do `--sheet` é o que decidiu). `x` em metros, `z` positivo = mais perto
   da câmera, `ry` em graus (giro do próprio personagem).
   A ordem do array é a ordem de desenho; quem tem z maior aparece na frente.

   DISPOSIÇÃO: os DOIS DE FORA na frente (z +0,34) e os dois de dentro atrás (z −0,16).
   A alternativa óbvia — escada de profundidade da esquerda pra direita — foi renderizada
   e REPROVADA na imagem: ela cria um degrau de tamanho (o da ponta direita encolhe) e
   quem está na frente tapa a cara do vizinho de trás, um a um. Com os de fora na frente,
   as quatro cabeças ficam acima da linha do ombro de todo mundo e nenhuma tapa a outra;
   o que se perde é o ombro externo dos dois das pontas, que o quadro já cortaria. */
const ELENCO = {
  P: {
    arquivo: 'team-time-es',
    chars: [
      { id: 'mst',      x: -0.340, z: 0.34, ry: 22 },
      { id: 'gotinha',  x: -0.095, z: -0.16, ry: 10 },
      { id: 'doutora',  x: 0.095,  z: -0.16, ry: -10 },
      { id: 'sindicato', x: 0.340, z: 0.34, ry: -22 },
    ],
  },
  B: {
    arquivo: 'team-bolsonaristas',
    chars: [
      { id: 'caminhoneiro', x: -0.340, z: 0.34, ry: 22 },
      /* canarinho e proerd têm CABEÇA DE BICHO, larga e cheia de silhueta (bico, juba).
         Os dois na mesma metade viram uma mancha só: medido olhando a placa, o bico do
         canarinho tapava metade do caminhoneiro. Eles ficam separados, um atrás em cada
         metade, e os dois humanos seguram as pontas. */
      { id: 'canarinho',    x: -0.095, z: -0.16, ry: 4 },
      { id: 'proerd',       x: 0.095,  z: -0.16, ry: -6 },
      { id: 'ancap',        x: 0.340,  z: 0.34, ry: -22 },
    ],
  },
  U: {
    arquivo: 'team-tribos',
    chars: [
      { id: 'punk',       x: -0.340, z: 0.34, ry: 22 },
      { id: 'blackmetal', x: -0.095, z: -0.16, ry: 10 },
      { id: 'reggae',     x: 0.095,  z: -0.16, ry: -10 },
      { id: 'pagodeiro',  x: 0.340,  z: 0.34, ry: -22 },
    ],
  },
  C: {
    arquivo: 'team-palhacos',
    chars: [
      { id: 'bonzo',      x: -0.340, z: 0.34, ry: 22 },
      { id: 'padati',     x: -0.095, z: -0.16, ry: 10 },
      { id: 'esbirro',    x: 0.095,  z: -0.16, ry: -10 },
      /* ÚNICA EXCEÇÃO DE POSE DO ELENCO INTEIRO, e é medida: o skin transplantado do
         palhaçomal é o pior dos 44 (73,7 ruins/1e4 a 58°, contra o teto 55,8). A 45°
         ele fica em 45,9 — 18% de folga. Ele entra porque é o palhaço mais marcante do
         time e porque baixar o braço dele 13° a menos é invisível na placa (ele é o da
         ponta, girado 15°); o que NÃO é invisível é a axila rasgando. */
      { id: 'palhacomal', x: 0.340,  z: 0.34, ry: -22, braco: 45 },
    ],
  },
  F: {
    arquivo: 'team-funkeiros',
    chars: [
      { id: 'mandrake',   x: -0.340, z: 0.34, ry: 22 },
      { id: 'oakley',     x: -0.095, z: -0.16, ry: 10 },
      { id: 'fluxo',      x: 0.095,  z: -0.16, ry: -10 },
      { id: 'ostentacao', x: 0.340,  z: 0.34, ry: -22 },
    ],
  },
};

/* ── CÂMERA ─────────────────────────────────────────────────────────────────────────
   Enquadramento resolvido por conta, com um número que só apareceu MEDINDO o elenco:
   estes bonecos têm CABEÇA GRANDE. `CHR1` (KNOWN-BUGS BUG-10) mede cabeça/altura = 0,223
   contra 0,13 da antropometria — ou seja, ~0,38 m de cabeça num personagem de 1,72 m
   (`TARGET_HEIGHT`, glbchars.js:72). Isso muda tudo, porque quatro cabeças lado a lado
   pedem 4 × 0,25 m de largura VISÍVEL, e numa caixa 2:5 a largura é sempre 0,4 × altura.

     topoCabeça em fração F do quadro  ->  quadroTopo = 1,72 + F·H
     corte inferior                    ->  1,72 − (1−F)·H
     distância                         ->  H / (2·tan(fov/2))
     largura visível                   ->  0,4·H

   Cortar no meio da coxa exato (0,75 m) com a cabeça em 42% dá H = 1,67 m e só 0,67 m de
   largura: renderizado e olhado, duas das quatro caras somem atrás das outras duas.
   A saída não é abrir o quadro (aí vira corpo inteiro, que é o enquadramento antigo):
   é BAIXAR o grupo dentro do quadro. Com a cabeça em 48% — ainda na metade de cima, que
   é o pedido — e corte em 0,55 m (coxa alta), H = 2,25 m e a largura vai a 0,90 m, que é
   onde as quatro caras cabem. Sobram 48% de fundo limpo no topo, que é exatamente onde a
   `.team-plate` escreve nome e slogan por cima (src/pages/index.astro:366-370).

   Câmera NIVELADA (`y == alvoY`): inclinada, as verticais convergem e quatro pessoas
   lado a lado ficam tortas em direções diferentes. FOV baixo + distância grande = quase
   ortográfica, então quem está atrás não encolhe a ponto de sumir. */
const CAM = { fov: 14, y: 1.675, z: 9.16, alvoY: 1.675 };

/* Ajuste de pose por personagem, extraído do PRÓPRIO `ELENCO`: quem desenha e quem
   mede leem a mesma fonte. */
const AJUSTE = {};
for (const f of Object.values(ELENCO)) {
  for (const c of f.chars) {
    const a = {};
    for (const k of Object.keys(POSE)) if (c[k] !== undefined) a[k] = c[k];
    if (Object.keys(a).length) AJUSTE[c.id] = a;
  }
}

// ────────────────────────────────────────────────────────────────────────────────────
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'],
});
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.error('[console]', m.text()); });
/* `domcontentloaded` e não `load`: a página do jogo dispara o preload de áudio e de
   wallpaper no `load`, e em SwiftShader isso passa dos 30 s padrão do Playwright com
   frequência (visto aqui: a 1ª execução passa com cache quente, a 2ª estoura). Os
   módulos que esta ferramenta importa (`three`, `glbchars.js`, `characters.js`) só
   dependem do import map, que já está no HTML. */
await page.goto(`${BASE}/?debug=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(1500);

/* Tudo que roda DENTRO da página vive aqui: pose estática, métrica de pele e render.
   Injetado uma vez em `window.__placa` para não reenviar o corpo a cada chamada. */
await page.evaluate(async ({ pose, cam }) => {
  const THREE = await import('three');
  const G = await import('./js/glbchars.js');
  const C = await import('./js/characters.js');
  const P = {};
  window.__placa = P;
  P.THREE = THREE; P.G = G; P.C = C; P.pose = pose; P.cam = cam;

  const osso = (raiz, re) => { let b = null; raiz.traverse((o) => { if (o.isBone && !b && re.test(o.name)) b = o; }); return b; };

  /* Gira `b` de modo que a direção MUNDO b→filho vire `alvo`. Rotação rígida: o osso
     inteiro (e tudo abaixo dele) acompanha, exatamente como um clipe faria — a diferença
     é que aqui não há blend, nem IK, nem curl de dedo, que são as três fontes de rasgo
     que a select-inflate isolou. */
  function apontar(b, filho, alvo) {
    b.updateWorldMatrix(true, true);
    const a = new THREE.Vector3().setFromMatrixPosition(b.matrixWorld);
    const c = new THREE.Vector3().setFromMatrixPosition(filho.matrixWorld);
    const cur = c.sub(a);
    if (cur.lengthSq() < 1e-12) return null;
    cur.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(cur, alvo.clone().normalize());
    const pw = new THREE.Quaternion(); b.parent.getWorldQuaternion(pw);
    const bw = new THREE.Quaternion(); b.getWorldQuaternion(bw);
    b.quaternion.copy(pw.invert().multiply(q).multiply(bw));
    b.updateMatrixWorld(true);
    return cur;
  }

  /* Gira `b` (e tudo abaixo dele) por um ângulo em torno de um eixo do MUNDO. Serve para
     a clavícula, onde "apontar para um alvo" não faz sentido: apontar a clavícula para
     baixo arrastaria a raiz do braço para dentro do tronco. */
  function girar(b, eixo, ang) {
    const q = new THREE.Quaternion().setFromAxisAngle(eixo, ang);
    const pw = new THREE.Quaternion(); b.parent.getWorldQuaternion(pw);
    const bw = new THREE.Quaternion(); b.getWorldQuaternion(bw);
    b.quaternion.copy(pw.invert().multiply(q).multiply(bw));
    b.updateMatrixWorld(true);
  }

  /* POSE DA PLACA — bind + clavícula/ombro/cotovelo. Escrita no osso, sem mixer.
     O alvo do úmero PRESERVA o azimute da bind (o braço não cruza o corpo) e só desce
     `braco` graus da horizontal, com um empurrão de `bracoFrente` para +Z, que é a
     frente do modelo (a câmera do preview do jogo, main.js:271, olha de +Z).

     ── POR QUE A CLAVÍCULA ENTRA (e é ela que salva os 16 transplantados) ────────────
     Medido: com os 68° inteiros no úmero, `palhacomal` marca ruins/1e4 = 96,6 e
     `fluxo` 72,9 — pior que o teto calibrado da select-inflate (55,8). O rasgo mora na
     AXILA, e ele é proporcional ao ângulo que UMA junta abre sobre uma pintura de peso
     ruim. Dividir o mesmo movimento entre `LeftShoulder` e `LeftArm` (as duas existem
     nos 44 rigs, conferido osso a osso) não muda a pose final um grau: muda quantos
     graus cada junta tem que engolir. `omboFrac` é essa divisão. */
  P.posar = (model, ajuste) => {
    const P0 = P.pose;
    P.pose = ajuste ? { ...P0, ...ajuste } : P0;
    try { P._posar(model); } finally { P.pose = P0; }
  };
  P._posar = (model) => {
    const g = (rad) => (rad * Math.PI) / 180;
    const fr = new THREE.Vector3(0, 0, 1);
    for (const lado of ['Left', 'Right']) {
      const clav = osso(model, new RegExp(`^${lado}Shoulder$`));
      const arm = osso(model, new RegExp(`^${lado}Arm$`));
      const fore = osso(model, new RegExp(`^${lado}ForeArm$`));
      const hand = osso(model, new RegExp(`^${lado}Hand$`));
      if (!arm || !fore) continue;
      arm.updateWorldMatrix(true, true);
      const a = new THREE.Vector3().setFromMatrixPosition(arm.matrixWorld);
      const c = new THREE.Vector3().setFromMatrixPosition(fore.matrixWorld);
      const d = c.clone().sub(a).normalize();
      const h = new THREE.Vector3(d.x, 0, d.z);
      if (h.lengthSq() < 1e-6) h.set(lado === 'Left' ? 1 : -1, 0, 0);
      h.normalize();
      const alvo = h.clone().multiplyScalar(Math.cos(g(P.pose.braco)))
        .add(new THREE.Vector3(0, -Math.sin(g(P.pose.braco)), 0))
        .add(fr.clone().multiplyScalar(Math.tan(g(P.pose.bracoFrente))))
        .normalize();
      // Parte do arco vai para a clavícula, no MESMO eixo, antes de o úmero fechar o resto.
      if (clav && P.pose.ombroFrac > 0) {
        const eixo = new THREE.Vector3().crossVectors(d, alvo);
        if (eixo.lengthSq() > 1e-10) girar(clav, eixo.normalize(), Math.acos(Math.max(-1, Math.min(1, d.dot(alvo)))) * P.pose.ombroFrac);
      }
      const dNovo = apontar(arm, fore, alvo) ? alvo : null;
      if (!dNovo || !hand) continue;
      // Cotovelo: continua a direção do úmero, dobrada para a frente e um pouco para dentro.
      const dentro = new THREE.Vector3(-Math.sign(h.x) || -1, 0, 0).multiplyScalar(Math.tan(g(P.pose.antebracoDentro)));
      const alvoF = dNovo.clone()
        .add(fr.clone().multiplyScalar(Math.tan(g(P.pose.cotovelo))))
        .add(dentro).normalize();
      apontar(fore, hand, alvoF);
    }
    model.updateMatrixWorld(true);
  };

  /* MÉTRICA — a mesma da select-inflate, sobre a pele que a GPU desenha.
     Gêmeo NÃO posado como referência (e não o atributo cru): `buildCharacterModel`
     reescala o modelo depois do bindMatrix, e comparar com o buffer daria razão ~110
     em todos os 44. Ver a docstring da select-inflate. */
  P.medir = (posado, referencia) => {
    const ma = [], mb = [];
    posado.traverse((o) => { if (o.isSkinnedMesh) ma.push(o); });
    referencia.traverse((o) => { if (o.isSkinnedMesh) mb.push(o); });
    if (ma.length !== mb.length) return { erro: 'malhas divergem' };
    const rs = [];
    const vb = new THREE.Vector3(), vp = new THREE.Vector3();
    for (let mi = 0; mi < ma.length; mi++) {
      const sm = ma[mi], sr = mb[mi];
      sm.skeleton.update(); sr.skeleton.update();
      const pos = sm.geometry.attributes.position, N = pos.count;
      const bx = new Float32Array(N * 3), px = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        vb.fromBufferAttribute(sr.geometry.attributes.position, i); sr.applyBoneTransform(i, vb);
        bx[i * 3] = vb.x; bx[i * 3 + 1] = vb.y; bx[i * 3 + 2] = vb.z;
        vp.fromBufferAttribute(pos, i); sm.applyBoneTransform(i, vp);
        px[i * 3] = vp.x; px[i * 3 + 1] = vp.y; px[i * 3 + 2] = vp.z;
      }
      const idx = sm.geometry.index, cnt = idx ? idx.count : N, gi = (k) => (idx ? idx.getX(k) : k);
      const vistas = new Set();
      const d = (arr, a, b) => Math.hypot(arr[a * 3] - arr[b * 3], arr[a * 3 + 1] - arr[b * 3 + 1], arr[a * 3 + 2] - arr[b * 3 + 2]);
      for (let k = 0; k + 2 < cnt; k += 3) {
        const t = [gi(k), gi(k + 1), gi(k + 2)];
        for (let e = 0; e < 3; e++) {
          const a = t[e], b = t[(e + 1) % 3];
          const chave = a < b ? a * 1e7 + b : b * 1e7 + a;
          if (vistas.has(chave)) continue;
          vistas.add(chave);
          const L0 = d(bx, a, b), L = d(px, a, b);
          if (L0 < 1e-7 || L < 1e-9) continue;
          rs.push(Math.max(L / L0, L0 / L) - 1);
        }
      }
    }
    if (!rs.length) return { erro: 'sem arestas' };
    rs.sort((a, b) => a - b);
    const q = (f) => rs[Math.min(rs.length - 1, Math.floor(f * rs.length))];
    const acima = (t) => rs.reduce((n, v) => n + (v > t ? 1 : 0), 0);
    return {
      arestas: rs.length,
      p99: +q(0.99).toFixed(3), p999: +q(0.999).toFixed(3), max: +rs[rs.length - 1].toFixed(2),
      ruins1e4: +((1e4 * acima(1.0)) / rs.length).toFixed(1),
    };
  };

  /* CENA — a MESMA luz do preview da tela de seleção (main.js:265-267), porque
     consistência entre a placa e o que o jogador vê ao clicar nela é o ponto da v2.
     O que muda é só o `rim`, mais forte: na placa os quatro se sobrepõem e sem recorte
     de luz o grupo vira uma mancha só. */
  P.cena = () => {
    const s = new THREE.Scene();
    s.add(new THREE.HemisphereLight(0xffe6c0, 0x5a4a38, 1.15));
    const key = new THREE.DirectionalLight(0xffe0b3, 1.9); key.position.set(2.2, 4, 3.4); s.add(key);
    const rim = new THREE.DirectionalLight(0x9ec0ff, 1.05); rim.position.set(-3.2, 2.4, -2.2); s.add(rim);
    const rim2 = new THREE.DirectionalLight(0xffb066, 0.65); rim2.position.set(3.4, 2.0, -2.6); s.add(rim2);
    return s;
  };

  P.render = (scene, w, h) => {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setSize(w, h, false);
    r.setClearColor(0x000000, 0);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    const c = new THREE.PerspectiveCamera(P.cam.fov, w / h, 0.1, 60);
    c.position.set(0, P.cam.y, P.cam.z);
    c.lookAt(0, P.cam.alvoY, 0);
    r.render(scene, c);
    const url = canvas.toDataURL('image/png');
    r.dispose();
    return url;
  };

  /* Monta um personagem já posado. `weapon:false` de propósito: com arma,
     `buildCharacterModel` roda 10 quadros de `ctrl.update` para assentar o mount
     (glbchars.js:404) — ou seja, ele SAI da bind e entra exatamente na pose animada que
     o BUG-25 mede como rasgada. Sem arma, o mixer nunca é tocado e a malha chega aqui
     na bind, que é a pose limpa dos 44. */
  P.monta = async (id) => {
    const def = P.C.CHARACTERS.find((c) => c.id === id);
    if (!def) return null;
    await P.G.preloadCharacterAssets([id]);
    if (!P.G.hasModel(id)) return null;
    const m = P.G.buildCharacterModel(def, { weapon: false });
    if (!m) return null;
    if (m.ctrl && m.ctrl.shadow) m.ctrl.shadow.visible = false;   // fora do quadro, e só suja o alfa
    return m;
  };
}, { pose: POSE, cam: CAM });

const dataURLparaBuffer = (u) => Buffer.from(u.split(',')[1], 'base64');
fs.mkdirSync(TMP, { recursive: true });

// ── MODO --medir ────────────────────────────────────────────────────────────────────
if (MEDIR) {
  const soEsses = (args.find((a) => !a.startsWith('-')) || '').split(',').filter(Boolean);
  const ids = soEsses.length ? soEsses : await page.evaluate(async () => {
    const C = await import('./js/characters.js');
    const G = await import('./js/glbchars.js');
    return C.CHARACTERS.filter((c) => G.GLB_CHARS.has(c.id)).map((c) => c.id);
  });
  const out = [];
  for (const id of ids) {
    /* A RÉGUA MEDE A POSE QUE A PLACA DESENHA — e o ajuste vem do MESMO objeto
       `ELENCO` que o render consome, não de uma cópia. Sem isto a exceção do
       palhaçomal (braço 45°) ficaria fora da medição e a tabela mentiria exatamente
       sobre o único personagem que precisou de exceção. */
    const r = await page.evaluate(async ([cid, ajuste, mut]) => {
      const P = window.__placa;
      const m = await P.monta(cid); if (!m) return null;
      const ref = await P.monta(cid); if (!ref) return null;
      const s1 = new P.THREE.Scene(); s1.add(m.group);
      const s2 = new P.THREE.Scene(); s2.add(ref.group);
      s2.updateMatrixWorld(true);
      /* MUTAÇÃO `animado` — troca a pose estática pelo settle ANIMADO da tela de
         seleção (`ctrl.update(dt,0,false,0)`, main.js:1527), que é exatamente a pose
         que o BUG-25 mede como rasgada. Se a régua não ficar vermelha aqui, ela não
         enxerga o defeito que ela existe para impedir. */
      if (mut === 'animado') for (let i = 0; i < 60; i++) m.ctrl.update(1 / 60, 0, false, 0);
      else P.posar(m.group, ajuste);
      s1.updateMatrixWorld(true);
      return { id: cid, ...P.medir(m.group, ref.group) };
    }, [id, AJUSTE[id] || null, MUT]);
    if (r) { out.push({ ...r, ajuste: AJUSTE[id] || null }); process.stdout.write('.'); }
  }
  console.log('');
  const refs = out.filter((r) => REFS.includes(r.id));
  const teto = TETO;
  const tetoLocal = {
    p99: +(Math.max(...refs.map((r) => r.p99)) * FOLGA).toFixed(3),
    ruins1e4: +(Math.max(...refs.map((r) => r.ruins1e4)) * FOLGA).toFixed(1),
  };
  out.sort((a, b) => b.ruins1e4 - a.ruins1e4);
  console.log(`\nPOSE DA PLACA: braço ${POSE.braco}° · cotovelo ${POSE.cotovelo}° · ombroFrac ${POSE.ombroFrac}`);
  console.log(`TETO (select-inflate, calibrado no que o dono chama de balão): p99 ≤ ${teto.p99} · ruins/1e4 ≤ ${teto.ruins1e4}`);
  console.log(`(referência local — ${REFS.join('/')} nesta pose × ${FOLGA}: p99 ${tetoLocal.p99} · ruins/1e4 ${tetoLocal.ruins1e4})\n`);
  const naPlaca = new Set(Object.values(ELENCO).flatMap((f) => f.chars.map((c) => c.id)));
  let ruins = 0;
  for (const r of out) {
    const mal = r.p99 > teto.p99 || r.ruins1e4 > teto.ruins1e4;
    if (mal) ruins++;
    const marca = mal ? 'REPROVA' : '';
    console.log([r.id.padEnd(14), String(r.p99).padStart(6), String(r.ruins1e4).padStart(7),
      naPlaca.has(r.id) ? 'NA PLACA' : '        ',
      (r.ajuste ? `braço ${r.ajuste.braco ?? POSE.braco}°` : '          ').padEnd(10), marca].join(' '));
  }
  console.log(`\n${ruins}/${out.length} reprovam nesta pose.`);
  const naPlacaRuins = out.filter((r) => naPlaca.has(r.id) && (r.p99 > teto.p99 || r.ruins1e4 > teto.ruins1e4));
  console.log(naPlacaRuins.length
    ? `ELENCO DA PLACA COM PROBLEMA: ${naPlacaRuins.map((r) => r.id).join(', ')}`
    : 'ELENCO DAS 5 PLACAS: todos abaixo do teto.');
  fs.writeFileSync('tools/eval/team_plate_pose.json',
    JSON.stringify({ gerado: new Date().toISOString(), pose: POSE, refs: REFS, folga: FOLGA, teto, tetoLocal, personagens: out }, null, 1));
  await browser.close();
  process.exit(0);
}

// ── MODO --sheet: um retrato por personagem, lado a lado, por facção ────────────────
if (SHEET) {
  const times = (SO ? SO.split(',') : ['E', 'B', 'U', 'C', 'F']);
  for (const t of times) {
    const ids = await page.evaluate(async (fac) => {
      const C = await import('./js/characters.js');
      const G = await import('./js/glbchars.js');
      return C.CHARACTERS.filter((c) => c.team === fac && G.GLB_CHARS.has(c.id)).map((c) => c.id);
    }, t);
    const tiles = [];
    for (const id of ids) {
      const url = await page.evaluate(async (cid) => {
        const P = window.__placa;
        const m = await P.monta(cid); if (!m) return null;
        const s = P.cena(); s.add(m.group);
        P.posar(m.group);
        m.group.rotation.y = 0.18;
        s.updateMatrixWorld(true);
        return P.render(s, 300, 750);
      }, id);
      if (!url) continue;
      tiles.push({ id, buf: dataURLparaBuffer(url) });
      process.stdout.write('.');
    }
    const W = 300 * tiles.length;
    await sharp({ create: { width: W, height: 790, channels: 4, background: '#101010' } })
      .composite([
        ...tiles.map((t2, i) => ({ input: t2.buf, left: i * 300, top: 40 })),
        ...tiles.map((t2, i) => ({
          input: Buffer.from(`<svg width="300" height="40"><text x="150" y="27" font-family="sans-serif" font-size="22" fill="#fff" text-anchor="middle">${t2.id}</text></svg>`),
          left: i * 300, top: 0,
        })),
      ])
      .png().toFile(path.join(TMP, `sheet-${t}.png`));
    console.log(` sheet-${t}.png (${tiles.length})`);
  }
  await browser.close();
  process.exit(0);
}

// ── MODO PADRÃO: as 5 placas ───────────────────────────────────────────────────────
/* FUNDO — o campo de cor da placa anterior, sem figura nenhuma.
   Reduzir a 6×15 e reampliar mata qualquer forma reconhecível (um rosto de 130 px vira
   meio pixel) e preserva exatamente a paleta por facção que o dono aprovou: vermelho no
   time-e, verde no bolsonarista, roxo na tribo, rosa no palhaço, dourado no funkeiro. */
async function fundo(time) {
  const cru = Buffer.from(CAMPO[time]);   // 6×15 RGB, uma linha de 18 bytes por linha do arquivo
  const campo = await sharp(cru, { raw: { width: 6, height: 15, channels: 3 } })
    .resize(LARG, ALT, { fit: 'fill', kernel: 'cubic' }).png().toBuffer();
  // Vinheta + escurecimento da base: dá chão ao grupo e segura o olho no meio da placa.
  const vinheta = Buffer.from(
    `<svg width="${LARG}" height="${ALT}">
       <defs>
         <radialGradient id="h" cx="50%" cy="56%" r="52%">
           <stop offset="0%" stop-color="#fff" stop-opacity=".13"/>
           <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
         </radialGradient>
         <radialGradient id="v" cx="50%" cy="62%" r="78%">
           <stop offset="0%" stop-color="#000" stop-opacity="0"/>
           <stop offset="62%" stop-color="#000" stop-opacity=".16"/>
           <stop offset="100%" stop-color="#000" stop-opacity=".62"/>
         </radialGradient>
         <linearGradient id="b" x1="0" y1="0" x2="0" y2="1">
           <stop offset="0%" stop-color="#000" stop-opacity="0"/>
           <stop offset="72%" stop-color="#000" stop-opacity="0"/>
           <stop offset="100%" stop-color="#000" stop-opacity=".55"/>
         </linearGradient>
       </defs>
       <rect width="100%" height="100%" fill="url(#h)"/>
       <rect width="100%" height="100%" fill="url(#v)"/>
       <rect width="100%" height="100%" fill="url(#b)"/>
     </svg>`);
  return sharp(campo).composite([{ input: vinheta }]).png().toBuffer();
}

/* PROVA DE PROCEDÊNCIA, ANTES DE DESENHAR QUALQUER PIXEL.
   O defeito que esta rodada conserta é "tem personagem aí que não existe". A garantia
   não pode ser "eu olhei": o `id` de cada figura tem de bater com um arquivo no disco e
   com o `team` declarado em `public/js/characters.js`. Qualquer divergência mata a
   execução ANTES de gravar a placa — é mais barato explodir aqui do que o dono
   encontrar. Impresso junto: `arquivo (KB)`, para quem revisa poder conferir. */
const declarado = await page.evaluate(async () => {
  const C = await import('./js/characters.js');
  const G = await import('./js/glbchars.js');
  return C.CHARACTERS.filter((c) => G.GLB_CHARS.has(c.id)).map((c) => ({ id: c.id, team: c.team, name: c.name }));
});
let erros = 0;
for (const [t, cfg] of Object.entries(ELENCO)) {
  for (const c of cfg.chars) {
    const d = declarado.find((x) => x.id === c.id);
    const glb = `public/models/characters/${c.id}.glb`;
    const noDisco = fs.existsSync(glb);
    if (!d || d.team !== t || !noDisco) {
      erros++;
      console.error(`FIGURA SEM LASTRO: ${c.id} — ${!d ? 'não está em characters.js' : d.team !== t ? `é do time ${d.team}, não ${t}` : ''} ${noDisco ? '' : `· ${glb} não existe`}`);
      continue;
    }
    console.log(`  ${t} · ${c.id.padEnd(13)} ${d.name.padEnd(22)} ${glb} (${(fs.statSync(glb).size / 1024).toFixed(0)} KB)`);
  }
}
if (erros) { console.error(`\n${erros} figura(s) sem GLB correspondente. Nada foi gravado.`); process.exit(1); }
console.log('');

const times = SO ? SO.split(',') : Object.keys(ELENCO);
for (const t of times) {
  const cfg = ELENCO[t];
  const r = await page.evaluate(async ([lista, w, h]) => {
    const P = window.__placa;
    const s = P.cena();
    const faltando = [];
    for (const c of lista) {
      const m = await P.monta(c.id);
      if (!m) { faltando.push(c.id); continue; }
      P.posar(m.group, c);            // `c` traz o ajuste de pose do personagem, se houver
      m.group.position.set(c.x, 0, c.z);
      m.group.rotation.y = (c.ry * Math.PI) / 180;
      s.add(m.group);
    }
    s.updateMatrixWorld(true);
    return { url: P.render(s, w, h), faltando };
  }, [cfg.chars, LARG * SS, ALT * SS]);
  if (r.faltando.length) { console.error(`SEM GLB: ${r.faltando.join(', ')}`); process.exit(1); }

  const figuras = await sharp(dataURLparaBuffer(r.url)).resize(LARG, ALT).png().toBuffer();
  fs.writeFileSync(path.join(TMP, `figuras-${t}.png`), figuras);

  const composta = await sharp(await fundo(t))
    .composite([{ input: figuras }]).png().toBuffer();
  fs.writeFileSync(path.join(TMP, `placa-${t}.png`), composta);
  await sharp(composta).webp({ quality: 86 }).toFile(path.join(SAIDA, `${cfg.arquivo}.webp`));
  const kb = (fs.statSync(path.join(SAIDA, `${cfg.arquivo}.webp`)).size / 1024).toFixed(0);
  console.log(`${cfg.arquivo}.webp  ${LARG}×${ALT}  ${kb} KB  [${cfg.chars.map((c) => c.id).join(', ')}]`);
}

await browser.close();
