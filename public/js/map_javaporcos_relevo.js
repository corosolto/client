/* Relevo da Invasão dos Javaporcos: UM campo de altura serve malha, groundHeightAt e
   navegação. Derivação dos números e custo por chamada: docs/maps/invasao-javaporcos.md. */
import * as THREE from 'three';

/* Medidas do relevo (arena, cidade, pasto, barranco, córrego e trilhas) e o porquê de
   cada número: docs/maps/invasao-javaporcos-layout.md, seção "Cotas do relevo". */
export const HALF = 68;
export const CIDADE = 36;
export const MATA_R = 54;
export const PASSO = 0.5;
export const PASTO_SOBE = 0.45;
export const BARRANCO = 2.6;
export const SUBIDA = 4.5;
export const CORREGO_Z = -41.6;
export const CORREGO_MEIA = 2.3;
export const CORREGO_FUNDO = 1.1;
export const ATERRO_MEIA = 2.4;

export const TRILHA_MEIA = 1.75;   // trilha de 3,5 m
export const CLAREIRA_R = 3.0;

/* Seis frentes nos quatro lados; u e cidade posicionam as bocas, desvio dobra a trilha. */
export const TRILHAS = Object.freeze([
  { id: 'norte', nome: 'Trilha do Norte', lado: 'N', u: -10, desvio: -9, cidade: -3, curva: 1.6 },
  { id: 'leste', nome: 'Trilha do Leste', lado: 'L', u: 12, desvio: 9, cidade: 3, curva: -1.4 },
  { id: 'sudoeste', nome: 'Trilha do Sudoeste', lado: 'S', u: -24, desvio: -9, cidade: -22, curva: 1.2 },
  { id: 'oeste', nome: 'Trilha do Oeste', lado: 'O', u: 18, desvio: 7, cidade: 16, curva: -1.2 },
  { id: 'nordeste', nome: 'Trilha do Nordeste', lado: 'N', u: 34, desvio: 4, cidade: 25, curva: 1.2 },
  { id: 'sudeste', nome: 'Trilha do Sudeste', lado: 'S', u: 28, desvio: 7, cidade: 22, curva: -1.2 },
]);

/* (u, v) do lado para (x, z) do mundo: u corre ao longo do lado, v cresce para FORA. */
export function paraMundo(lado, u, v) {
  if (lado === 'N') return [u, -v];
  if (lado === 'S') return [u, v];
  if (lado === 'O') return [-v, u];
  return [v, u];
}

const V_RETA = MATA_R + 3.4, V_DOBRA = MATA_R + 5.4, V_CLAREIRA = MATA_R + 5.6;
const V_CIDADE = CIDADE + 0.4;

/* `pts` é a trilha DA MATA (boca -> clareira); `pasto` é a trilha de terra batida
   (cidade -> boca). A rota da horda é a clareira até a cidade, nessa ordem. */
export const EIXOS = TRILHAS.map((t) => {
  const uv = [[t.u, MATA_R], [t.u, V_RETA], [t.u + t.desvio * 0.55, V_DOBRA], [t.u + t.desvio, V_CLAREIRA]];
  const pts = uv.map(([u, v]) => paraMundo(t.lado, u, v));
  const meioU = (t.u + t.cidade) / 2 + t.curva, meioV = (MATA_R + V_CIDADE) / 2;
  const pasto = [[t.cidade, V_CIDADE], [meioU, meioV], [t.u, MATA_R]].map(([u, v]) => paraMundo(t.lado, u, v));
  const rota = [...pts.slice().reverse(), ...pasto.slice(0, -1).reverse()];
  return { ...t, pts, pasto, rota, clareira: pts[3], boca: pts[0], cidadePt: pasto[0] };
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

const distPolilinha = (x, z, pts) => {
  let melhor = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = distSegmento(x, z, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (d < melhor) melhor = d;
  }
  return melhor;
};

/* Distância até a trilha de MATA mais perto, já descontando o raio da clareira: é o
   mesmo número que decide o desenho do chão, a ausência de colisor e o nó de navegação. */
export function distTrilha(x, z) {
  let melhor = Infinity;
  for (const e of EIXOS) {
    const dc = Math.hypot(x - e.clareira[0], z - e.clareira[1]) - (CLAREIRA_R - TRILHA_MEIA);
    if (dc < melhor) melhor = dc;
    const d = distPolilinha(x, z, e.pts);
    if (d < melhor) melhor = d;
  }
  return Math.max(0, melhor);
}

export function distPasto(x, z) {
  let melhor = Infinity;
  for (const e of EIXOS) melhor = Math.min(melhor, distPolilinha(x, z, e.pasto));
  return melhor;
}

export const naTrilha = (x, z, folga = 0) => distTrilha(x, z) <= TRILHA_MEIA + folga;

export const corregoZ = (x) => CORREGO_Z + 0.8 * Math.sin(x * 0.083 + 0.6);

/* Profundidade do corte do córrego em (x, z), 0 fora do leito e no aterro da trilha. */
export function corteCorrego(x, z) {
  const dc = Math.abs(z - corregoZ(x)) / CORREGO_MEIA;
  if (dc >= 1 || z > -CIDADE) return 0;
  if (distPasto(x, z) < ATERRO_MEIA) return 0;
  const q = 1 - dc * dc;
  return CORREGO_FUNDO * q * q;
}

/* Altura ANALÍTICA do terreno, sem as plataformas construídas: cidade plana, pasto em
   rampa ondulada até a mata, barranco até o platô. */
export function alturaTerreno(x, z) {
  const r = Math.max(Math.abs(x), Math.abs(z));
  const sp = suave(clamp01((r - CIDADE) / (MATA_R - CIDADE)));
  const sb = suave(clamp01((r - MATA_R) / SUBIDA));
  let h = PASTO_SOBE * sp + (BARRANCO - PASTO_SOBE) * sb;
  h += sp * (1 - sb) * 0.09 * (Math.sin(x * 0.23 + z * 0.11) + Math.cos(z * 0.19 - x * 0.07));
  h += sb * (0.42 * Math.sin(x * 0.31) + 0.38 * Math.cos(z * 0.27));
  h -= corteCorrego(x, z);
  if (r > CIDADE - 4) {
    const dt = distTrilha(x, z);
    if (dt < 2.6) h -= 0.22 * (1 - dt / 2.6);
    const dp = distPasto(x, z);
    if (dp < 1.6 && r > CIDADE + 0.6) h -= 0.08 * (1 - dp / 1.6);
  }
  return h;
}

/* Plataforma construída: calçada, soleira de loja, piso de praça. Entra no campo por
   `max`, então ela nunca afunda o terreno — só levanta onde o concreto existe. */
export class CampoDeAltura {
  constructor(perfil=null) {
    this.n = Math.round((2 * HALF) / PASSO) + 1;
    this.h = new Float32Array(this.n * this.n);
    for (let i = 0; i < this.n; i++) {
      const x = -HALF + i * PASSO;
      for (let j = 0; j < this.n; j++) {
        const z=-HALF+j*PASSO,h=alturaTerreno(x,z);
        this.h[i*this.n+j]=perfil?perfil(x,z,h):h;
      }
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
   o mesmo número. `cor(x, z)` opcional devolve [r,g,b] por vértice e quebra a repetição. */
export function malhaTerreno(campo, mat, x0, x1, z0, z1, passo = PASSO * 2, tile = 2.4, cor = null) {
  const nx = Math.max(1, Math.round((x1 - x0) / passo)), nz = Math.max(1, Math.round((z1 - z0) / passo));
  const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  for (let v = 0; v < pos.count; v++) pos.setZ(v, campo.amostra(cx + pos.getX(v), cz - pos.getY(v)));
  for (let v = 0; v < uv.count; v++) uv.setXY(v, uv.getX(v) * ((x1 - x0) / tile), uv.getY(v) * ((z1 - z0) / tile));
  uv.needsUpdate = true;
  if (cor) {
    const c = new Float32Array(pos.count * 3);
    for (let v = 0; v < pos.count; v++) c.set(cor(cx + pos.getX(v), cz - pos.getY(v)), v * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  }
  // A dobra quadrada do barranco segue x=z em dois quadrantes; a diagonal oposta cria uma ponte sobre a física.
  const indices = geo.index;
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const ax = x0 + ix * (x1 - x0) / nx, az = z0 + iz * (z1 - z0) / nz;
    const bx = x0 + (ix + 1) * (x1 - x0) / nx, bz = z0 + (iz + 1) * (z1 - z0) / nz;
    if (ax * az <= 0 || Math.max(ax, az) > Math.min(bx, bz)) continue;
    const a = ix + (nx + 1) * iz, b = a + nx + 1, c = b + 1, d = a + 1;
    const k = (iz * nx + ix) * 6;
    [a, b, c, a, c, d].forEach((v, i) => indices.setX(k + i, v));
  }
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  const malha = new THREE.Mesh(geo, mat);
  malha.position.set(cx, 0, cz);
  malha.receiveShadow = true;
  return malha;
}
