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

   O orçamento é POR MAPA de propósito: `loja_h` tem 59 carros no pátio e não tem como
   caber no mesmo orçamento do `praca_poderes`. Teto global só teria duas saídas, e as duas
   ruins — ou frouxo o bastante para o pior mapa (e cego para os outros quatro), ou
   apertado o bastante para o melhor (e vermelho para sempre).

   ── AO MEXER NUM TETO ───────────────────────────────────────────────────────────
   Subir teto é decisão, não manutenção. Se um mapa passou a estourar, o teto está certo
   e a cena regrediu — é a régua fazendo o trabalho dela. Só suba com o motivo escrito e
   o número novo medido, nunca para "destravar o CI".
   ═══════════════════════════════════════════════════════════════════════════════════ */

/* Os 5 mapas do registro (`MAPS` de public/js/maps.js) e com que facção/personagem cada
   um entra no `?auto=`. A sonda antiga (`gl-metrics.mjs`) cobria só 4: faltava o
   `quebrada`, que é o mapa com mais arte urbana do jogo — justamente o que mais tem
   a ganhar com um teto. */
export const MAPAS = [
  { id: 'praca_poderes', auto: 'E,mst' },
  { id: 'piscina_treta', auto: 'E,mst' },
  { id: 'loja_h', auto: 'B,coach' },
  { id: 'ferro_velho', auto: 'B,coach' },
  { id: 'quebrada', auto: 'B,coach' },
  // os 12 que faltavam: 5 de 17 medidos era orçamento para um terço do jogo
  { id: 'mansao', auto: 'E,mst' },
  { id: 'amazonia', auto: 'B,coach' },
  { id: 'escadao', auto: 'B,coach' },
  { id: 'corrego', auto: 'B,coach' },
  { id: 'lajes', auto: 'B,coach' },
  { id: 'posto_treta', auto: 'B,coach' },
  { id: 'upa_24h', auto: 'E,mst' },
  { id: 'obras_prefeitura', auto: 'B,coach' },
  { id: 'atacadao_treta', auto: 'B,coach' },
  { id: 'parque_treta', auto: 'E,mst' },
  { id: 'velho_oeste', auto: 'B,coach' },
  { id: 'penitenciaria', auto: 'E,mst' },
];

/* Teto por mapa. `calls` e `tris` são a MÉDIA por frame somando todos os passes do
   composer (o `info.render` zera a cada `renderer.render()`, então a soma dos passes é
   o custo real do frame — não o do passe principal).

   PREENCHIDO POR MEDIÇÃO — ver o cabeçalho. `null` = ainda não medido, e a régua
   RECUSA rodar contra `null` em vez de deixar passar: não saber custa o mesmo que
   estar errado. */
export const TETOS = {
  praca_poderes: { calls: 350, tris: 740000 },
  piscina_treta: { calls: 860, tris: 870000 },
  loja_h: { calls: 360, tris: 1410000 },
  ferro_velho: { calls: 620, tris: 1170000 },
  /* quebrada é O FORA DA CURVA, e o teto abaixo está SEGURANDO um número ruim em vez
     de abençoá-lo. Medido em 11/08 na v2.0.0-alpha.79 (`--medir`, backend padrão):

       praca_poderes        297 calls   643 k tris   135 fps
       loja_h       310 calls  1218 k tris    92 fps
       ferro_velho  531 calls  1010 k tris   102 fps
       piscina_treta    740 calls   748 k tris   135 fps
       quebrada   1810 calls  1544 k tris    60 fps   <-- 2,4× o segundo pior em calls
                                                             e METADE do fps de todo o resto

     Não é coincidência que seja justamente o mapa que a sonda antiga (`gl-metrics.mjs`)
     nunca mediu: os 4 que ela cobria estão todos em ordem. O que não se mede não melhora,
     e o que ninguém reprova não se mantém.

     O teto entra no valor medido + folga porque teto que nasce estourado não é portão —
     ele existe para impedir que 1787 vire 2500 enquanto ninguém olha. QUANDO O LOD DESTE
     MAPA ENTRAR, este número DESCE para a nova medição. Deixá-lo aqui depois disso seria
     transformar a régua em carimbo. */
  quebrada: { calls: 2060, tris: 1810000 },
  /* OS 12 QUE FALTAVAM, medidos em 12/09/2026 (`--medir`, alpha.248, Chrome headless com GPU
     real nesta máquina). Medir 5 de 17 era ter orçamento para um terço do jogo — e os dois
     mapas mais caros do catálogo estavam justamente entre os não medidos:

       mansao       2065 calls  2.453 k tris   77 fps   <- mais calls que o quebrada
       corrego       525 calls  8.303 k tris  102 fps   <- 3,4× o segundo pior em triângulos
       quebrada     1975 calls  1.199 k tris   66 fps   <- o mais lento
       atacadao     1534 calls    976 k tris  123 fps
       penitenciaria 1247 calls   773 k tris  136 fps
       obras        1040 calls  1.399 k tris  135 fps
       velho_oeste   838 calls  1.043 k tris  136 fps
       lajes         735 calls  1.192 k tris  143 fps
       upa_24h       688 calls    799 k tris   96 fps
       amazonia      629 calls  1.526 k tris  137 fps
       parque        586 calls    756 k tris  136 fps
       escadao       393 calls    808 k tris  136 fps

     O `fps` é desta máquina e não é teto (o cabeçalho explica por quê); ele está aqui porque
     é o que diz QUAIS destes números doem. Os tetos dos 5 antigos ficam como estavam: a
     medição de hoje veio mais barata em alguns, e baixar teto numa execução só troca portão
     por ruído. */
  mansao: { calls: 2380, tris: 2830000 },
  amazonia: { calls: 730, tris: 1760000 },
  escadao: { calls: 460, tris: 930000 },
  corrego: { calls: 610, tris: 9550000 },
  lajes: { calls: 850, tris: 1380000 },
  /* posto_treta quase ficou sem teto: a primeira medição NÃO aconteceu. O jogador morria no
     aquecimento e `_tpDeath` lançava exceção a cada quadro (590 em 30 s) porque o fixture
     pedia o personagem 'bozo', que virou 'bonzo' numa renomeação de elenco. Corrigidos os
     dois lados (o fixture e a tolerância do jogo a id inexistente), ele mediu — e é o SEGUNDO
     mapa mais caro em draw calls do catálogo, 1883, atrás só do mansao. Ninguém sabia. */
  /* E é o mapa que VARIA: duas execuções no mesmo commit deram 1.989.349 e 2.295.572
     triângulos (15% de diferença — os props dele são sorteados por partida). O teto saiu da
     PIOR das duas mais a folga, e não da primeira: teto colado numa medição só reprova por
     sorteio, e régua que acende por sorteio é régua que o time aprende a ignorar. */
  posto_treta: { calls: 2170, tris: 2640000 },
  upa_24h: { calls: 800, tris: 920000 },
  obras_prefeitura: { calls: 1200, tris: 1610000 },
  atacadao_treta: { calls: 1770, tris: 1130000 },
  parque_treta: { calls: 680, tris: 870000 },
  velho_oeste: { calls: 970, tris: 1200000 },
  penitenciaria: { calls: 1440, tris: 890000 },
};

/* Folga aplicada sobre o medido quando `--medir` sugere teto novo.

   15% começou como ESCOLHA, sem medição por trás — e ficou registrado assim para não virar
   procedência falsa. Duas execuções no mesmo commit (quebrada, 11/08) deram a variação
   de graça:

     calls  1787 -> 1781   (0,34%)
     tris   1568270 -> 1563911   (0,28%)

   Ou seja: a folga é ~40× maior que o ruído medido. Isso é de propósito e não é desperdício
   — o teto existe para pegar regressão de arquitetura (a mutação `estoura` levou loja_h
   de 307 para 3.518 calls, 10×), não para vigiar o terceiro dígito. Folga apertada em cima
   de ruído produz vermelho que ninguém acredita, e régua em que ninguém acredita já morreu. */
export const FOLGA = 0.15;

export const PROBE = 'tools/eval/cena_probe.json';
