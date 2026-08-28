/* ============================================================================
   texel-tetos.mjs — OS LIMIARES DE DENSIDADE DE TEXEL, EM UM LUGAR SÓ.
   ----------------------------------------------------------------------------
   POR QUE ESTE ARQUIVO EXISTE (e não é uma constante dentro do check)
   A lição que a passada de grafite pagou: dois lugares que medem o MESMO conceito
   com limiares diferentes fazem a peça nascer aprovada num lado e reprovada no
   outro, e dois consertos seguidos não moveram o número (451 -> 445 -> 445).
   Densidade de texel já é citada em TRÊS documentos desta árvore
   (BAR.md §1.8, BAR-CONSISTENCIA.md §3.1 e §4) e ia virar três números soltos.
   Aqui é um só, e quem medir isso de novo importa daqui.

   PROCEDÊNCIA DE CADA NÚMERO (nada é chute)
   · BAR.md §1.8 "Recomendação operacional para CS BRASIL":
       chão/parede de playspace .... 256-512 px/m
       fundo, telhado, proxy ....... 64-128 px/m
       hero prop ................... 512-1024 px/m
     A BANDA ACEITÁVEL para uma superfície de cenário é portanto a união das duas
     primeiras faixas: 64 a 512 px/m. Abaixo de 64 é borrão; acima de 512 é
     hero prop, e hero prop é exceção declarada, não regra.
   · ALVO 128 px/m: é o exemplo literal que a BAR-CONSISTENCIA §3.1 usa quando diz
     "uma densidade de texel para o mapa inteiro, declarada por mapa (ex.: 128 px/m)",
     e é o teto da faixa de fundo — ou seja, o menor valor que não é borrão em
     lugar nenhum. Num jogo web com textura procedural de canvas, subir de 128 custa
     canvas maior (CPU de boot + heap), então 128 é o ponto onde o BAR e o orçamento
     desta base se encontram.
   · DISPERSAO_MAX 1,5: BAR-CONSISTENCIA §3.1, literal — "Nenhum asset pode passar
     de 1,5x a densidade mediana do mapa". Repetido em §4(b) como cláusula de gate.
   · DISPERSAO_MAX_ABS 4,0: a exceção que a própria BAR §1.8 abre para hero prop
     (512-1024 px/m contra os 256 do playspace = 2x a 4x). Acima de 4x não existe
     categoria no cânone que justifique.
   · PISO_AREA_MAX 0,10: não está escrito em lugar nenhum e é MINHA escolha; está
     aqui explícito para poder ser discutido. Justificativa: a mediana sozinha não
     morde quando a superfície ruim é grande mas minoritária, e 10% da área de um
     mapa é aproximadamente uma sala inteira. Se alguém achar frouxo, aperte AQUI.
   ============================================================================ */

export const TEXEL_MIN = 64;     // px/m — abaixo disto é borrão (BAR §1.8, faixa de fundo)
export const TEXEL_MAX = 512;    // px/m — acima disto só hero prop (BAR §1.8)
export const TEXEL_ALVO = 128;   // px/m — alvo declarado do mapa (BAR-CONSISTENCIA §3.1)

export const DISPERSAO_MAX = 1.5;      // p95 / mediana (BAR-CONSISTENCIA §3.1, literal)
export const DISPERSAO_MAX_ABS = 4.0;  // maior / mediana, com a exceção de hero prop

export const PISO_AREA_MAX = 0.10;     // fração da área estrutural abaixo de TEXEL_MIN

/* Anisotropia: chão é a superfície vista em ângulo RASANTE o tempo todo num FPS, e é
   exatamente onde a filtragem trilinear sozinha borra. 8 é o valor que praticamente todo
   hardware suporta (o mínimo garantido do EXT_texture_filter_anisotropic é 2, mas o piso
   de mercado real em WebGL2 é 16); 4 fica para quality 'low', onde o custo de banda
   importa mais que a nitidez do horizonte. */
export const ANISO_ALVO = 8;
export const ANISO_MIN = 4;

/* Metros por tile — a CONVENÇÃO de escala que substitui `repeat` fixo.
   2,0 m é o tamanho aparente que um tile de piso/parede tem que ter para que um canvas
   de 256 px dê 128 px/m (256 / 2 = 128) e um de 512 dê 256 px/m. Não é estética: é a
   conta que amarra o canvas que já existe ao alvo do BAR sem inventar textura nova. */
export const METROS_POR_TILE = 2.0;
export const METROS_POR_TILE_DETALHE = 0.5;  // grade, tela, corrimão: detalhe fino
