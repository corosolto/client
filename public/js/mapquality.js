/* ORÇAMENTO DE QUALIDADE DE CENA — fonte única do que cada nível de qualidade pode gastar.
   Existe porque o mesmo número estava escrito à mão em 10 arquivos de mapa e mais uma vez no
   pós-processamento, e nenhum deles sabia dos outros: quem escolhia "baixa" no atacadão,
   na upa, no posto, no parque, na piscina, nas obras, na penitenciária, no velho oeste ou no
   ferro velho pagava sombra de 2048 igual a quem escolheu "alta". Ver docs/docs/quality-gates.md
   e a régua tools/eval/quality-mapas-check.mjs. */

/* Tamanho do shadow map do sol, por nível. `low` é metade do lado — um quarto dos texels, que
   é o que aparece na conta de preenchimento da GPU. `med`/`high` mantêm o 2048 de hoje: este
   módulo nasceu para TIRAR o número de 11 lugares, não para mudar o que o jogador vê. */
export const SOMBRA_POR_QUALIDADE = Object.freeze({ low: 1024, med: 2048, high: 2048 });

export function orcamentoSombra(quality = qualidadeAtual()) {
  return SOMBRA_POR_QUALIDADE[quality] || SOMBRA_POR_QUALIDADE.med;
}

/* A MESMA leitura que 12 arquivos de mapa faziam cada um por conta própria. Módulo carrega uma
   vez, e é assim que o jogo já trata a preferência: ela vale para a partida inteira. */
let _q = 'med';
try { _q = JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality || 'med'; } catch { /* storage bloqueado */ }
export const qualidadeAtual = () => _q;
export const ehBaixa = () => _q === 'low';

/* Aplica no sol do mapa. `extra` deixa o mapa continuar tunando o que é DELE (extensão da
   câmera de sombra, bias) sem reescrever o tamanho, que é o que este orçamento governa. */
export function aplicaSombraSol(sun, quality = qualidadeAtual()) {
  if (!sun || !sun.shadow) return sun;
  const n = orcamentoSombra(quality);
  sun.shadow.mapSize.set(n, n);
  // trocar o tamanho depois de o mapa existir exige descartar o antigo, senão o three mantém
  // a textura velha e a mudança não chega na tela (mesma razão do `l.shadow.map = null` do bloom)
  if (sun.shadow.map && sun.shadow.map.width !== n) { sun.shadow.map.dispose?.(); sun.shadow.map = null; }
  return sun;
}
