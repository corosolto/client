// Cobertura de footprint de marca de faca: retângulo 2D menos a UNIÃO dos triângulos
// reais da lâmina (adaptação pura do clipping de public/js/graffiti_coverage.js).
const EPS = 1e-10;

function polyArea(poly) {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(sum) / 2;
}

function normalizarPoligono(poly) {
  const coincidem = (a, b) => [0, 1].every((i) =>
    Math.abs(a[i] - b[i]) <= 8 * Number.EPSILON * Math.max(1, Math.abs(a[i]), Math.abs(b[i])));
  const out = [];
  for (const point of poly) {
    if (!out.length || !coincidem(out[out.length - 1], point)) out.push(point);
  }
  if (out.length > 1 && coincidem(out[0], out[out.length - 1])) out.pop();
  return out;
}

function clip(poly, distance) {
  const out = [];
  if (!poly.length) return out;
  let a = poly[poly.length - 1];
  let da = distance(a);
  for (const b of poly) {
    const db = distance(b);
    if (da <= 0) {
      out.push(a);
      if (da < 0 && db > 0) out.push([a[0] + (da / (da - db)) * (b[0] - a[0]), a[1] + (da / (da - db)) * (b[1] - a[1])]);
    } else if (db <= 0) {
      out.push([a[0] + (da / (da - db)) * (b[0] - a[0]), a[1] + (da / (da - db)) * (b[1] - a[1])]);
    }
    a = b;
    da = db;
  }
  return normalizarPoligono(out);
}

const boundsOf = (poly) => poly.reduce(
  (b, p) => [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])],
  [Infinity, Infinity, -Infinity, -Infinity],
);
const overlaps = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

// Diferença de polígonos convexos gera fragmentos disjuntos (cortador convexo por aresta).
function subtract(subject, cutter) {
  if (!overlaps(boundsOf(subject), boundsOf(cutter))) return [subject];
  const out = [];
  let inside = subject;
  for (let i = 0; i < cutter.length && inside.length >= 3; i++) {
    const a = cutter[i];
    const b = cutter[(i + 1) % cutter.length];
    if (a[0] === b[0] && a[1] === b[1]) continue;
    const edge = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    const outside = clip(inside, (p) => -edge(p));
    if (outside.length >= 3 && polyArea(outside) > EPS) out.push(outside);
    inside = clip(inside, edge);
  }
  return out;
}

function pointInTriangleTol(x, y, tri, tol) {
  // tol absoluta no produto cruzado, escalada pela magnitude das arestas.
  let sign = 0;
  for (let i = 0; i < 3; i++) {
    const [x1, y1] = tri[i];
    const [x2, y2] = tri[(i + 1) % 3];
    const cross = (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1);
    const scale = (Math.abs(x2 - x1) + Math.abs(y - y1) + Math.abs(x - x1) + Math.abs(y2 - y1)) * tol + tol;
    if (Math.abs(cross) <= scale) continue;
    const current = cross > 0 ? 1 : -1;
    if (sign === 0) sign = current;
    else if (sign !== current) return false;
  }
  return true;
}

export const FOOTPRINT_TOLERANCE = Object.freeze({ cornerTol: 1e-7, areaTolFrac: 1e-6 });

// Retângulo (u∈[centerU±halfH], t∈[centerT±halfW]) integralmente coberto pela
// união dos triângulos: 4 cantos dentro e área descoberta ≤ areaTolFrac·área.
export function footprintFullyCovered(centerU, centerT, halfH, halfW, triangles, tolerance = FOOTPRINT_TOLERANCE) {
  const { cornerTol, areaTolFrac } = tolerance;
  if (!(halfH > 0) || !(halfW > 0) || !triangles.length) return false;
  const corners = [
    [centerU - halfH, centerT - halfW], [centerU + halfH, centerT - halfW],
    [centerU + halfH, centerT + halfW], [centerU - halfH, centerT + halfW],
  ];
  const rectArea = 4 * halfH * halfW;
  const box = boundsOf(corners);
  const near = triangles.filter((tri) => overlaps(boundsOf(tri), box));
  if (!near.length) return false;
  for (const [u, t] of corners) {
    if (!near.some((tri) => pointInTriangleTol(u, t, tri, cornerTol))) return false;
  }
  let uncovered = [corners];
  for (const tri of near) {
    uncovered = uncovered.flatMap((poly) => subtract(poly, tri));
    if (!uncovered.length) break;
  }
  const missing = uncovered.reduce((sum, poly) => sum + polyArea(poly), 0);
  return missing <= areaTolFrac * rectArea;
}
