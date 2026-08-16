// lado do jogador: P > B = PETISTA, B > P = BOLSONARISTA, empate = NEUTRO
export function sideOf(mp: number, mb: number): [string, string] {
  if (mp > mb) return ['PETISTA', '#e03232'];
  if (mb > mp) return ['BOLSONARISTA', '#1faa4d'];
  return ['NEUTRO', '#ffd23f'];
}
