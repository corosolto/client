// lado do jogador: matches_p conta a Esquerda e matches_b a Direita (colunas legadas)
export function sideOf(mp: number, mb: number): [string, string] {
  if (mp > mb) return ['ESQUERDA', '#e03232'];
  if (mb > mp) return ['DIREITA', '#3355ff'];
  return ['NEUTRO', '#ffd23f'];
}
