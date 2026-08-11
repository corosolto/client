/* cena-tetos.mjs — O TETO DE CUSTO DE CENA, NUM LUGAR SÓ.
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE ESTE ARQUIVO EXISTE (e não é só uma constante dentro da régua)

   Duas coisas medem custo de cena: a régua de navegador (`cena-check.mjs`, que mede
   AGORA e reprova) e a cláusula CENA1 do `invariants.mjs` (que lê a medição gravada e
   cabe no `check`, sem browser). LIÇÃO 2 do `docs/LICOES.md` foi comprada exatamente
   por dois limiares diferentes para o mesmo conceito: a passada aceitava 1 de 5 e a
   auditoria reprovava acima de 2 de 15, então peça nascia aprovada num lado e
   reprovada no outro, e dois consertos seguidos não moveram o número.

   Aqui o limiar é UM. Quem mede importa daqui; ninguém escreve teto no próprio arquivo.

   ── DE ONDE VÊM ESTES NÚMEROS ───────────────────────────────────────────────────
   Não do comentário de `mapprops.js:15-17` ("300-800 calls / 500 k tris"), que é prosa
   de duas rodadas atrás e nunca reprovou nada. Vêm da medição real de
   `node tools/eval/cena-check.mjs --medir`, com folga por cima do medido — teto que já
   nasce estourado não é portão, e teto colado no medido reprova por ruído de swiftshader.

   O orçamento é POR MAPA de propósito: `fy_havan` tem 59 carros no pátio e não tem como
   caber no mesmo orçamento do `awp_map`. Teto global só teria duas saídas, e as duas
   ruins — ou frouxo o bastante para o pior mapa (e cego para os outros quatro), ou
   apertado o bastante para o melhor (e vermelho para sempre).

   ── AO MEXER NUM TETO ───────────────────────────────────────────────────────────
   Subir teto é decisão, não manutenção. Se um mapa passou a estourar, o teto está certo
   e a cena regrediu — é a régua fazendo o trabalho dela. Só suba com o motivo escrito e
   o número novo medido, nunca para "destravar o CI".
   ═══════════════════════════════════════════════════════════════════════════════════ */

/* Os 5 mapas do registro (`MAPS` de public/js/maps.js) e com que facção/personagem cada
   um entra no `?auto=`. A sonda antiga (`gl-metrics.mjs`) cobria só 4: faltava o
   `fy_quebrada`, que é o mapa com mais arte urbana do jogo — justamente o que mais tem
   a ganhar com um teto. */
export const MAPAS = [
  { id: 'awp_map', auto: 'P,mst' },
  { id: 'fy_pool_day', auto: 'P,mst' },
  { id: 'fy_havan', auto: 'B,bozo' },
  { id: 'fy_ferrovelho', auto: 'B,bozo' },
  { id: 'fy_quebrada', auto: 'B,bozo' },
];

/* Teto por mapa. `calls` e `tris` são a MÉDIA por frame somando todos os passes do
   composer (o `info.render` zera a cada `renderer.render()`, então a soma dos passes é
   o custo real do frame — não o do passe principal).

   PREENCHIDO POR MEDIÇÃO — ver o cabeçalho. `null` = ainda não medido, e a régua
   RECUSA rodar contra `null` em vez de deixar passar: não saber custa o mesmo que
   estar errado. */
export const TETOS = {
  awp_map: { calls: 350, tris: 740000 },
  fy_pool_day: { calls: 860, tris: 870000 },
  fy_havan: { calls: 360, tris: 1410000 },
  fy_ferrovelho: { calls: 620, tris: 1170000 },
  /* fy_quebrada é O FORA DA CURVA, e o teto abaixo está SEGURANDO um número ruim em vez
     de abençoá-lo. Medido em 11/08 na v2.0.0-alpha.79 (`--medir`, backend padrão):

       awp_map        297 calls   643 k tris   135 fps
       fy_havan       310 calls  1218 k tris    92 fps
       fy_ferrovelho  531 calls  1010 k tris   102 fps
       fy_pool_day    740 calls   748 k tris   135 fps
       fy_quebrada   1810 calls  1544 k tris    60 fps   <-- 2,4× o segundo pior em calls
                                                             e METADE do fps de todo o resto

     Não é coincidência que seja justamente o mapa que a sonda antiga (`gl-metrics.mjs`)
     nunca mediu: os 4 que ela cobria estão todos em ordem. O que não se mede não melhora,
     e o que ninguém reprova não se mantém.

     O teto entra no valor medido + folga porque teto que nasce estourado não é portão —
     ele existe para impedir que 1787 vire 2500 enquanto ninguém olha. QUANDO O LOD DESTE
     MAPA ENTRAR, este número DESCE para a nova medição. Deixá-lo aqui depois disso seria
     transformar a régua em carimbo. */
  fy_quebrada: { calls: 2060, tris: 1810000 },
};

/* Folga aplicada sobre o medido quando `--medir` sugere teto novo.

   15% começou como ESCOLHA, sem medição por trás — e ficou registrado assim para não virar
   procedência falsa. Duas execuções no mesmo commit (fy_quebrada, 11/08) deram a variação
   de graça:

     calls  1787 -> 1781   (0,34%)
     tris   1568270 -> 1563911   (0,28%)

   Ou seja: a folga é ~40× maior que o ruído medido. Isso é de propósito e não é desperdício
   — o teto existe para pegar regressão de arquitetura (a mutação `estoura` levou fy_havan
   de 307 para 3.518 calls, 10×), não para vigiar o terceiro dígito. Folga apertada em cima
   de ruído produz vermelho que ninguém acredita, e régua em que ninguém acredita já morreu. */
export const FOLGA = 0.15;

export const PROBE = 'tools/eval/cena_probe.json';
