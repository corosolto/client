/* Relevo da Invasão dos Javaporcos: UM campo de altura serve malha, groundHeightAt e
   navegação. Derivação dos números e custo por chamada: docs/maps/invasao-javaporcos.md. */
import * as THREE from 'three';

/* Medidas do relevo (arena, cidade, barranco, córrego e pontes) e o porquê de cada
   número: docs/maps/invasao-javaporcos.md, seção "Cotas do relevo". */
export const HALF = 58;
export const CIDADE = 36;
export const PASSO = 0.5;
export const BARRANCO = 2.6;
export const SUBIDA = 4.5;
export const CORREGO_Z = -39;
export const CORREGO_MEIA = 3.2;
export const CORREGO_FUNDO = 1.4;
export const PONTES = [-20, 28];
export const PONTE_MEIA = 2.2;

export const TRILHA_MEIA = 1.75;   // trilha de 3,5 m
export const CLAREIRA_R = 3.8;

/* As dez bocas de mata. `u` é a coordenada da clareira ao longo do lado; `desvio` joga a
   entrada para o lado, para a trilha DOBRAR e nenhuma delas enxergar a borda do mapa. */
export const TRILHAS = Object.freeze([
  { id: 'n1', lado: 'N', u: -26, desvio: 6 },
  { id: 'n2', lado: 'N', u: -4, desvio: -6 },
  { id: 'n3', lado: 'N', u: 22, desvio: 6 },
  { id: 's1', lado: 'S', u: -22, desvio: -6 },
  { id: 's2', lado: 'S', u: 2, desvio: 6 },
  { id: 's3', lado: 'S', u: 27, desvio: -6 },
  { id: 'o1', lado: 'O', u: -17, desvio: 6 },
  { id: 'o2', lado: 'O', u: 19, desvio: -6 },
  { id: 'l1', lado: 'L', u: -21, desvio: 6 },
  { id: 'l2', lado: 'L', u: 15, desvio: -6 },
]);

/* (u, v) do lado para (x, z) do mundo: u corre ao longo do lado, v cresce para FORA. */
export function paraMundo(lado, u, v) {
  if (lado === 'N') return [u, -v];
  if (lado === 'S') return [u, v];
  if (lado === 'O') return [-v, u];
  return [v, u];
}

const V_BOCA = 33, V_RETA = 41, V_DOBRA = 45, V_CLAREIRA = 47.5;

export const EIXOS = TRILHAS.map((t) => {
  const uv = [[t.u + t.desvio, V_BOCA], [t.u + t.desvio, V_RETA], [t.u, V_DOBRA], [t.u, V_CLAREIRA]];
  const pts = uv.map(([u, v]) => paraMundo(t.lado, u, v));
  return { ...t, pts, clareira: pts[3], boca: pts[0] };
});

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const suave = (t) => t * t * (3 - 2 * t);

function distSegmento(x, z, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const L = dx * dx + dz * dz;
  let t = L > 0 ? ((x - ax) * dx + (z - az) * dz) / L : 0;
  t = clamp01(t);
  const qx = ax + dx * t - x, qz = az + dz * t - z;
  return Math.hypot(qx, qz);
}

/* Distância até o eixo da trilha mais perto, já descontando o raio da clareira: é o
   mesmo número que decide o desenho do chão, a ausência de colisor e o nó de navegação. */
export function distTrilha(x, z) {
  let melhor = Infinity;
  for (const e of EIXOS) {
    const dc = Math.hypot(x - e.clareira[0], z - e.clareira[1]) - (CLAREIRA_R - TRILHA_MEIA);
    if (dc < melhor) melhor = dc;
    for (let i = 0; i < e.pts.length - 1; i++) {
      const d = distSegmento(x, z, e.pts[i][0], e.pts[i][1], e.pts[i + 1][0], e.pts[i + 1][1]);
      if (d < melhor) melhor = d;
    }
  }
  return Math.max(0, melhor);
}

export const naTrilha = (x, z, folga = 0) => distTrilha(x, z) <= TRILHA_MEIA + folga;

/* Altura ANALÍTICA do terreno, sem as plataformas construídas. A cidade é plana de
   propósito: desnível sob prédio é o que fazia o bicho entrar no chão. */
export function alturaTerreno(x, z) {
  const r = Math.max(Math.abs(x), Math.abs(z));
  const s = suave(clamp01((r - CIDADE) / SUBIDA));
  let h = s * BARRANCO + s * (0.42 * Math.sin(x * 0.31) + 0.38 * Math.cos(z * 0.27));
  const dc = Math.abs(z - CORREGO_Z) / CORREGO_MEIA;
  if (dc < 1 && z < -CIDADE + 4 && !PONTES.some((px) => Math.abs(x - px) < PONTE_MEIA)) {
    const q = 1 - dc * dc;
    h -= CORREGO_FUNDO * q * q;
  }
  const dt = distTrilha(x, z);
  if (dt < 2.6 && r > CIDADE - 4) h -= 0.22 * (1 - dt / 2.6);
  return h;
}

/* Plataforma construída: calçada, soleira de loja, piso de praça. Entra no campo por
   `max`, então ela nunca afunda o terreno — só levanta onde o concreto existe. */
export class CampoDeAltura {
  constructor() {
    this.n = Math.round((2 * HALF) / PASSO) + 1;
    this.h = new Float32Array(this.n * this.n);
    for (let i = 0; i < this.n; i++) {
      const x = -HALF + i * PASSO;
      for (let j = 0; j < this.n; j++) this.h[i * this.n + j] = alturaTerreno(x, -HALF + j * PASSO);
    }
  }

  plataforma(x0, x1, z0, z1, altura) {
    const i0 = Math.max(0, Math.ceil((x0 + HALF) / PASSO)), i1 = Math.min(this.n - 1, Math.floor((x1 + HALF) / PASSO));
    const j0 = Math.max(0, Math.ceil((z0 + HALF) / PASSO)), j1 = Math.min(this.n - 1, Math.floor((z1 + HALF) / PASSO));
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const k = i * this.n + j;
      if (this.h[k] < altura) this.h[k] = altura;
    }
  }

  /* Bilinear em grade regular: 2 truncamentos, 4 leituras de Float32Array e 3 lerps.
     Sem alocação e sem ramo de busca — é o que torna barato a horda chamar por quadro. */
  amostra(x, z) {
    const n = this.n;
    let fx = (x + HALF) / PASSO, fz = (z + HALF) / PASSO;
    if (!(fx >= 0)) fx = 0; else if (fx > n - 1.0001) fx = n - 1.0001;
    if (!(fz >= 0)) fz = 0; else if (fz > n - 1.0001) fz = n - 1.0001;
    const i = fx | 0, j = fz | 0, tx = fx - i, tz = fz - j;
    const k = i * n + j;
    const a = this.h[k], b = this.h[k + n], c = this.h[k + 1], d = this.h[k + n + 1];
    const ab = a + (b - a) * tx, cd = c + (d - c) * tx;
    return ab + (cd - ab) * tz;
  }
}

/* Malha do terreno amostrada NA MESMA grade do campo: o vértice visível e o nó medido são
   o mesmo número, então não existe chão desenhado acima do chão que a horda lê. */
export function malhaTerreno(campo, mat, x0, x1, z0, z1, passo = PASSO * 2, tile = 2.4) {
  const nx = Math.max(1, Math.round((x1 - x0) / passo)), nz = Math.max(1, Math.round((z1 - z0) / passo));
  const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  for (let v = 0; v < pos.count; v++) pos.setZ(v, campo.amostra(cx + pos.getX(v), cz - pos.getY(v)));
  for (let v = 0; v < uv.count; v++) uv.setXY(v, uv.getX(v) * ((x1 - x0) / tile), uv.getY(v) * ((z1 - z0) / tile));
  uv.needsUpdate = true;
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  const malha = new THREE.Mesh(geo, mat);
  malha.position.set(cx, 0, cz);
  malha.receiveShadow = true;
  return malha;
}
