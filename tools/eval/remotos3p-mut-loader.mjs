const mutacoes = {
  'lateral-mudo': ['vx * Math.cos(fwdYaw) - vz * Math.sin(fwdYaw));', '0);'],
  'flinch-remoto-mudo': ['vic.mesh?.ctrl?.flinch?.({ x: vic.pos.x - att.pos.x, z: vic.pos.z - att.pos.z }, d / 100);', 'void d;'],
  'morte-sem-direcao': ['vic.mesh?.ctrl?.die?.({ x: vic.pos.x - att.pos.x, z: vic.pos.z - att.pos.z });', 'vic.mesh?.ctrl?.die?.();'],
  'saque-mudo': ['if (trocouArma) ent.mesh?.ctrl?.draw?.();', 'void trocouArma;'],
};
export async function load(url, context, nextLoad) {
  const resultado = await nextLoad(url, context);
  if (!url.endsWith('/public/js/netgame.js')) return resultado;
  const par = mutacoes[process.env.REMOTOS_MUTANTE];
  if (!par) throw new Error('mutante desconhecido');
  const antes = resultado.source.toString();
  if (!antes.includes(par[0])) throw new Error('mutante não aplicou: ' + process.env.REMOTOS_MUTANTE);
  return { ...resultado, source: antes.replace(par[0], par[1]) };
}
