/* ORÇAMENTO DE QUALIDADE DE CENA — fonte única do que cada nível pode gastar. O porquê (o
   mesmo 2048 em 11 lugares, e "baixa" que não baixava) está em KNOWN-BUGS.md, BUG-156. */

// `low` é metade do lado = um quarto dos texels. med/high mantêm o 2048 de hoje de propósito:
// este módulo nasceu para tirar o número de 11 lugares, não para mudar o que o jogador vê.
export const SOMBRA_POR_QUALIDADE = Object.freeze({ low: 1024, med: 2048, high: 2048 });

export function orcamentoSombra(quality = qualidadeAtual()) {
  const q = _sombraDegrau || quality;   // o degrau adaptativo só ABAIXA; nunca sobe sozinho
  return SOMBRA_POR_QUALIDADE[q] || SOMBRA_POR_QUALIDADE.med;
}

// a MESMA leitura que 12 arquivos faziam cada um por conta própria; vale para a partida inteira
let _q = 'med';
try { _q = JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality || 'med'; } catch { /* storage bloqueado */ }
export const qualidadeAtual = () => _q;
export const ehBaixa = () => _q === 'low';

// Degrau de sombra da escada adaptativa: 'baixa' vale como o orçamento de `low` sem mudar a
// preferência salva do jogador — mudança adaptativa não vira configuração (ver DEGRAUS).
let _sombraDegrau = null;
export function definirSombraDegrau(d) { _sombraDegrau = d === 'baixa' ? 'low' : null; }
export const sombraDegrau = () => _sombraDegrau;

// o mapa continua tunando o que é DELE (extensão da câmera, bias); o tamanho é deste orçamento
export function aplicaSombraSol(sun, quality = qualidadeAtual()) {
  if (!sun || !sun.shadow) return sun;
  const n = orcamentoSombra(quality);
  sun.shadow.mapSize.set(n, n);
  // trocar o tamanho exige descartar o mapa antigo, senão o three mantém a textura velha
  if (sun.shadow.map && sun.shadow.map.width !== n) { sun.shadow.map.dispose?.(); sun.shadow.map = null; }
  return sun;
}
