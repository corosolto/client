export const ALCANCE_TIRO = 200;
const RAIO_CORPO = 0.45, RAIO_CABECA = 0.25, ALTURA_BASE = 0.2, ALTURA_TOPO = 1.75, ALTURA_CABECA = 1.6, DESCIDA_AGACHADO = 0.52;

function esferaIntervalo(from, dir, x, y, z, raio) {
  const ox = from.x - x, oy = from.y - y, oz = from.z - z;
  const a = dir.x ** 2 + dir.y ** 2 + dir.z ** 2;
  const b = ox * dir.x + oy * dir.y + oz * dir.z;
  const c = ox ** 2 + oy ** 2 + oz ** 2 - raio ** 2, disc = b * b - a * c;
  if (a === 0 || disc < 0) return null;
  const raiz = Math.sqrt(disc);
  return [(-b - raiz) / a, (-b + raiz) / a];
}

// Cabeça justa: elipsoide medido por personagem (data/cabecas-hitbox.js), relativo aos pés e
// ao yaw do corpo. Sem ele (servidor de MP, ?hscaixa=0) vale a esfera antiga.
function elipsoideIntervalo(from, dir, pos, cabeca, queda) {
  const s = Math.sin(cabeca.yaw || 0), c = Math.cos(cabeca.yaw || 0);
  const cx = pos.x + c * (cabeca.l || 0) + s * (cabeca.f || 0);
  const cz = pos.z - s * (cabeca.l || 0) + c * (cabeca.f || 0);
  const cy = pos.y + cabeca.y - queda;
  // No espaço do elipsoide (gira -yaw, escala pelos semieixos) ele é a esfera unitária; t não muda.
  const ox = from.x - cx, oy = from.y - cy, oz = from.z - cz;
  const lo = { x: (c * ox - s * oz) / cabeca.rx, y: oy / cabeca.ry, z: (s * ox + c * oz) / cabeca.rz };
  const ld = { x: (c * dir.x - s * dir.z) / cabeca.rx, y: dir.y / cabeca.ry, z: (s * dir.x + c * dir.z) / cabeca.rz };
  return esferaIntervalo(lo, ld, 0, 0, 0, 1);
}

function corpoEntrada(from, dir, pos, queda, cabeca = null) {
  const baixo = pos.y + ALTURA_BASE, alto = pos.y + ALTURA_TOPO - queda;
  const ox = from.x - pos.x, oz = from.z - pos.z;
  const a = dir.x ** 2 + dir.z ** 2, b = ox * dir.x + oz * dir.z, c = ox ** 2 + oz ** 2 - RAIO_CORPO ** 2;
  const partes = [];
  let cilindro = null;
  if (a === 0) { if (c <= 0) cilindro = [-Infinity, Infinity]; }
  else if (b * b - a * c >= 0) {
    const raiz = Math.sqrt(b * b - a * c);
    cilindro = [(-b - raiz) / a, (-b + raiz) / a];
  }
  if (cilindro) {
    if (dir.y === 0) { if (from.y < baixo || from.y > alto) cilindro = null; }
    else {
      const ys = [(baixo - from.y) / dir.y, (alto - from.y) / dir.y].sort((x, y) => x - y);
      cilindro = [Math.max(cilindro[0], ys[0]), Math.min(cilindro[1], ys[1])];
    }
    if (cilindro && cilindro[0] <= cilindro[1]) partes.push(cilindro);
  }
  for (const y of [baixo, alto]) {
    const intervalo = esferaIntervalo(from, dir, pos.x, y, pos.z, RAIO_CORPO);
    if (intervalo) partes.push(intervalo);
  }
  if (!partes.length) return null;
  let entrada = Math.max(0, Math.min(...partes.map(p => p[0]))), saida = Math.max(...partes.map(p => p[1]));
  // O torso termina na base da cabeça (o queixo medido, com a cabeça justa), sem mover os
  // pés ao agachar; senão o pescoço entre 1,35 m e o queixo vira buraco.
  const teto = pos.y - queda + (cabeca ? cabeca.y - cabeca.ry : ALTURA_CABECA - RAIO_CABECA);
  if (dir.y > 0) saida = Math.min(saida, (teto - from.y) / dir.y);
  else if (dir.y < 0) entrada = Math.max(entrada, (teto - from.y) / dir.y);
  else if (from.y > teto) return null;
  return entrada <= saida ? entrada : null;
}

export function entradaCombatente(from, dir, pos, crouchF = 0, perfilCabeca = null) {
  if (dir.x ** 2 + dir.y ** 2 + dir.z ** 2 === 0) return null;
  const queda = DESCIDA_AGACHADO * Math.max(0, Math.min(1, crouchF));
  const intervalo = perfilCabeca ? elipsoideIntervalo(from, dir, pos, perfilCabeca, queda)
    : esferaIntervalo(from, dir, pos.x, pos.y + ALTURA_CABECA - queda, pos.z, RAIO_CABECA);
  const cabeca = intervalo && intervalo[1] >= 0 ? Math.max(0, intervalo[0]) : null;
  const corpo = corpoEntrada(from, dir, pos, queda, perfilCabeca);
  if (cabeca !== null && (corpo === null || cabeca <= corpo)) return { dist: cabeca, head: true };
  return corpo === null ? null : { dist: corpo, head: false };
}

export const alturaDoOlho = (crouchF = 0, base = 1.62) => base - DESCIDA_AGACHADO * Math.max(0, Math.min(1, crouchF));
