/* ============================================================================
   vm-pente-pecas.mjs — QUEM NÃO TEM PENTE, E POR QUÊ (veredito de configuração)
   ----------------------------------------------------------------------------
   POR QUE EXISTE (BUG-90 / #1116)

   O `vm-consistencia-check` precisa separar duas coisas que têm a MESMA
   aparência num arquivo de configuração — "esta arma não tem carregador" e
   "alguém esqueceu de declarar o carregador". Sem essa separação o BUG-90
   sobreviveu a três rodadas: campo vazio não diz qual dos dois é.

   POR QUE NÃO IMPORTA DE `vm-reguas.mjs`

   A tabela irmã (`CARREGADOR_PECA`/`CARREGADOR_NA`) mora em
   `tools/eval/lib/vm-reguas.mjs`, que arrasta o palco (Playwright) e o
   `weapons.js` (Three) — o `vm-consistencia-check` roda em 0,2 s, sem navegador,
   e não pode pagar isso. Importar de lá também mudaria os BYTES do
   `vm-reguas.mjs`, que entra no hash do `eval:vm-placar` (`ENTRADAS` em
   `vm-placar-check.mjs:26-29`): um refactor inocente envelheceria os dois
   placares de imagem e exigiria re-medir as 26 armas com o catálogo privado
   inteiro. Caro, e sem relação com o que esta régua julga.

   Então aqui ficam só os dois fatos que a régua de CONFIGURAÇÃO precisa — a
   isenção e o motivo dela —, e a concordância com a tabela de imagem é COBRADA
   (VM-C10), lendo o `vm-reguas.mjs` como TEXTO. É o mesmo recurso que o
   `vm-consistencia-check` já usa para ler `WEAPON_IDS` sem importar o Three.
   Duas listas que precisam concordar e uma régua que reprova quando divergem
   valem mais que uma lista que ninguém consegue importar.
   ============================================================================ */

/* Armas SEM peça de carregador, com o motivo MEDIDO. Cada entrada foi conferida
   contra o produto servido; o texto é o que a régua imprime no lugar do
   vermelho, para que a isenção seja legível na saída e não invisível.

   A `carbine` custou uma rodada inteira em 11/09: todos os números dela ficaram
   VERDES com a alavanca pendurada no osso do pente (972 vértices visíveis,
   `mint_part_mag` na tela, régua 17/19). A CARABINA PAPO DE PEÃO é de alavanca;
   a família `ar` anima um osso `Mag` porque o rig do pacote é de um M16A4.
   Contagem de vértices não sabe o que é um carregador — só a figura soube.

   A isenção aqui NÃO é fé: VM-C7 confere cada motivo contra o GLB servido e
   reprova a entrada que envelheceu (arma isenta que já ganhou pente de verdade). */
export const CARREGADOR_NA_BASE = {
  knife: 'faca: sem carregador — corre em meleevm.js, fora do caminho de viewmodel de fogo',
  revolver38: 'cilindro: a família revolver tem reloadStyle `cylinder` e nenhum osso Mag; tambor e cartuchos são do eval:vm-pistol-revolver',
  carbine: 'alavanca: a CARABINA PAPO DE PEÃO não tem pente destacável. O osso Mag da família `ar` vem do rig de um M16A4 — rig e arma são de espécies diferentes, e qualquer peça pendurada ali é a errada (medido: a régua escolhia a ALAVANCA)',
  lmg: 'fita/caixa: a M249 alimenta por cinto, reloadStyle `belt`; tampa/caixa/fita são do eval:vm-lmg-final',
};

/* Alimentação por CLIPE-PENTE (stripper). A peça existe, mas em repouso as
   balas ficam estacionadas separadas e só se juntam na recarga — medido na
   mosin: os cinco `GEO_PROC_CartridgeClip*` têm centro de -0,618 a -1,306
   enquanto o corpo está em -0,528. Isso é POSE, não tamanho de peça, e por isso
   o teto de coincidência (VM-C6) não se aplica a elas. Quem julga a pose é o
   `vm-reguas --regua=carregador`, no quadro desenhado. */
export const CLIPE_PENTE = new Set(['sks', 'mosin', 'rem700', 'shotgun']);
