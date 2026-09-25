/* ============================================================================
   vm-analise.mjs — LEITURA DA MÁSCARA RENDERIZADA DO VIEWMODEL (vm-reguas)
   ----------------------------------------------------------------------------
   Funções puras sobre a máscara de vm-palco.mjs (0 fundo, 1 arma, 2 braço/mão;
   `prof` = distância ao olho em mm por pixel). Nenhuma lê socket, osso ou
   vértice: o que entra é o que o jogador vê.
   ============================================================================ */

// Estatística de silhueta: área (fração do quadro) e caixa da arma, do braço e da união.
export function silhueta(m) {
  const { w, h, px } = m;
  const cx = { 1: [Infinity, Infinity, -1, -1, 0], 2: [Infinity, Infinity, -1, -1, 0] };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v0 = px[y * w + x];
      if (!v0) continue;
      const v = v0 === 3 ? 1 : v0;
      const b = cx[v];
      if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; b[4]++;
    }
  }
  const box = (b) => (b[4] ? { x0: b[0], y0: b[1], x1: b[2], y1: b[3], larg: b[2] - b[0] + 1, alt: b[3] - b[1] + 1, n: b[4] } : null);
  const arma = box(cx[1]);
  const braco = box(cx[2]);
  const uniao = arma || braco ? box([
    Math.min(cx[1][0], cx[2][0]), Math.min(cx[1][1], cx[2][1]),
    Math.max(cx[1][2], cx[2][2]), Math.max(cx[1][3], cx[2][3]), cx[1][4] + cx[2][4]]) : null;
  const total = w * h;
  return {
    areaArma: cx[1][4] / total,
    areaBraco: cx[2][4] / total,
    areaTotal: (cx[1][4] + cx[2][4]) / total,
    arma, braco, uniao,
  };
}

// Buracos da silhueta da ARMA: fundo cercado (não alcança a borda do quadro).
// Um aro de alça/óptica é um buraco cercado de arma; o vão entre braço e arma não
// conta (borda com braço).
export function buracosDaArma(m) {
  const { w, h, px } = m;
  const vis = new Uint8Array(w * h);
  const fila = new Int32Array(w * h);
  let ini = 0; let fim = 0;
  const semear = (i) => { if (!px[i] && !vis[i]) { vis[i] = 1; fila[fim++] = i; } };
  for (let x = 0; x < w; x++) { semear(x); semear((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { semear(y * w); semear(y * w + w - 1); }
  while (ini < fim) {
    const i = fila[ini++]; const x = i % w; const y = (i - x) / w;
    if (x > 0) semear(i - 1); if (x < w - 1) semear(i + 1);
    if (y > 0) semear(i - w); if (y < h - 1) semear(i + w);
  }
  const buracos = [];
  for (let i0 = 0; i0 < w * h; i0++) {
    if (px[i0] || vis[i0]) continue;
    ini = 0; fim = 0; vis[i0] = 1; fila[fim++] = i0;
    let sx = 0; let sy = 0; let n = 0; let bArma = 0; let bBraco = 0;
    let x0 = w; let y0 = h; let x1 = 0; let y1 = 0;
    while (ini < fim) {
      const i = fila[ini++]; const x = i % w; const y = (i - x) / w;
      sx += x; sy += y; n++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const j of [i - 1, i + 1, i - w, i + w]) {
        if (j < 0 || j >= w * h) continue;
        if (px[j] === 1 || px[j] === 3) bArma++; else if (px[j] === 2) bBraco++;
        else if (!vis[j]) { vis[j] = 1; fila[fim++] = j; }
      }
    }
    buracos.push({ n, cx: sx / n, cy: sy / n, x0, y0, x1, y1, bordaArma: bArma / Math.max(1, bArma + bBraco) });
  }
  return buracos;
}

/* PONTO DE MIRA NA IMAGEM (eval:vm-mira). Dois tipos de aparelho de pontaria:
   1. ARO (alça de dioptro, anel de óptica/reflex): buraco da silhueta cercado
      só de arma, pequeno, na metade de cima da arma → o ponto é o centro do aro.
   2. MASSA (alça aberta + massa de mira, pistola, conta de espingarda): a peça
      mais LONGE do olho — a boca do cano e a massa ficam no fundo da
      profundidade. O ponto é o topo da parte mais distante da arma que APARECE
      no quadro (se o receptor tapa a massa, a massa não conta: o jogador não a vê).
   Nenhum dos dois usa o socket `sight`: o AD1 do eval:vm-ads usava, e o ADS
   automático leva exatamente esse socket ao centro — tautologia (md97/m92/mp5/
   akm com AD1 0,000 e a mira 40–90 px fora, revisão L1). */
export function pontoDeMira(m, { fracFundo = 0.15 } = {}) {
  const { w, h, px, prof } = m;
  if (!prof) throw new Error('pontoDeMira precisa da máscara com profundidade');
  const ds = [];
  let y0 = h; let y1 = -1;
  for (let i = 0; i < px.length; i++) {
    if ((px[i] !== 1 && px[i] !== 3) || !prof[i]) continue;
    ds.push(prof[i]);
    const y = (i / w) | 0; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (ds.length < 50) return { mensuravel: false, motivo: `arma quase fora do quadro (${ds.length} px)` };
  ds.sort((a, b) => a - b);
  const dPerto = ds[Math.floor(ds.length * 0.01)];
  const dLonge = ds[Math.floor(ds.length * 0.99)];
  const limite = dLonge - fracFundo * (dLonge - dPerto);
  let massa = null;
  for (let y = 0; y < h && !massa; y++) {
    const xs = [];
    for (let x = 0; x < w; x++) { const i = y * w + x; if ((px[i] === 1 || px[i] === 3) && prof[i] >= limite) xs.push(x); }
    if (xs.length >= 2) massa = { x: xs[Math.floor(xs.length / 2)], y };
  }
  const altArma = Math.max(1, y1 - y0);
  const aros = buracosDaArma(m).filter((b) => b.n >= 25 && b.bordaArma >= 0.9
    && (b.y1 - b.y0) <= 0.08 * h && (b.x1 - b.x0) <= 0.08 * w
    && b.cy <= y0 + 0.5 * altArma);
  aros.sort((a, b) => a.cy - b.cy);
  const aro = aros[0] || null;
  const ponto = aro ? { x: aro.cx, y: aro.cy, tipo: 'aro' } : massa ? { ...massa, tipo: 'massa' } : null;
  if (!ponto) return { mensuravel: false, motivo: 'nem aro nem massa visível' };
  const dx = ponto.x - w / 2; const dy = ponto.y - h / 2;
  return { mensuravel: true, ponto, dx, dy, desvio: Math.hypot(dx, dy), aro, massa, dPerto, dLonge };
}


/* Eixo da arma NA TELA pela profundidade: do centro da parte mais PERTO do olho
   (15% mais próximos: coronha/receptor) ao centro da mais LONGE (15% mais
   distantes: cano/boca). Ângulo em graus a partir da horizontal para a direita,
   anti-horário (boca subindo à esquerda ≈ 150°). A componente principal da
   silhueta não serve: arma curta e gorda (md97 com o pente) vira borrão e o eixo
   pula de lado. */
export function eixoNaTela(m) {
  const { w, px, prof } = m;
  if (!prof) return null;
  const ds = [];
  for (let i = 0; i < px.length; i++) if ((px[i] === 1 || px[i] === 3) && prof[i]) ds.push(prof[i]);
  if (ds.length < 100) return null;
  ds.sort((a, b) => a - b);
  const pert = ds[Math.floor(ds.length * 0.15)]; const long = ds[Math.floor(ds.length * 0.85)];
  let nx = 0; let ny = 0; let nn = 0; let fx = 0; let fy = 0; let fn = 0;
  for (let i = 0; i < px.length; i++) {
    if ((px[i] !== 1 && px[i] !== 3) || !prof[i]) continue;
    const x = i % w; const y = (i / w) | 0;
    if (prof[i] <= pert) { nx += x; ny += y; nn++; } else if (prof[i] >= long) { fx += x; fy += y; fn++; }
  }
  const a = [nx / nn, ny / nn]; const b = [fx / fn, fy / fn];
  const graus = (Math.atan2(-(b[1] - a[1]), b[0] - a[0]) * 180) / Math.PI;
  return { graus, perto: a, longe: b, comprimento: Math.hypot(b[0] - a[0], b[1] - a[1]) };
}

/* ROLAGEM na tela: normal média do TOPO da silhueta da arma (5 px abaixo da
   borda de cima, coluna a coluna, passo de normais do quadro) projetada no plano
   perpendicular ao cano (eixo perto→longe pela profundidade, desprojetado), em
   graus a partir do "para cima" da câmera no mesmo plano. Positivo = topo
   tombado para a direita da tela. Pedido da FILA-CORRECAO (p90): "régua de
   rolagem (ângulo da normal do topo vs AK) antes de mexer". */
export function rolagem(m, { banda = 5 } = {}) {
  const { w, h, px, prof, nrm } = m;
  if (!prof || !nrm) return null;
  const e = eixoNaTela(m);
  if (!e) return null;
  const t = Math.tan((m.fov * Math.PI) / 360);
  const desp = (x, y) => {
    const d = prof[Math.round(y) * w + Math.round(x)] / 1000 || 0;
    return [(((x + 0.5) / w) * 2 - 1) * d * t * m.aspect, (1 - ((y + 0.5) / h) * 2) * d * t, -d];
  };
  // eixo 3D: média desprojetada das duas pontas (usa o pixel de arma mais perto do centroide)
  const achar = ([cx, cy]) => {
    let best = null; let bd = Infinity;
    for (let y = Math.max(0, Math.floor(cy - 40)); y < Math.min(h, cy + 40); y++) {
      for (let x = Math.max(0, Math.floor(cx - 40)); x < Math.min(w, cx + 40); x++) {
        const i = y * w + x; if ((px[i] !== 1 && px[i] !== 3) || !prof[i]) continue;
        const d = (x - cx) ** 2 + (y - cy) ** 2; if (d < bd) { bd = d; best = [x, y]; }
      }
    }
    return best ? desp(...best) : null;
  };
  const p0 = achar(e.perto); const p1 = achar(e.longe);
  if (!p0 || !p1) return null;
  let a = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const na = Math.hypot(...a); a = a.map((v) => v / na);
  let N = [0, 0, 0]; let n = 0;
  for (let x = 0; x < w; x++) {
    let y0 = -1;
    for (let y = 0; y < h; y++) { const i = y * w + x; if (px[i] === 1 || px[i] === 3) { y0 = y; break; } }
    if (y0 < 0) continue;
    for (let y = y0; y < Math.min(h, y0 + banda); y++) {
      const i = y * w + x; if (px[i] !== 1 && px[i] !== 3) break;
      N[0] += nrm[i * 3] / 127.5 - 1; N[1] += nrm[i * 3 + 1] / 127.5 - 1; N[2] += nrm[i * 3 + 2] / 127.5 - 1; n++;
    }
  }
  if (n < 50) return null;
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const proj = (v) => { const k = dot(v, a); const r = [v[0] - k * a[0], v[1] - k * a[1], v[2] - k * a[2]]; const l = Math.hypot(...r) || 1; return r.map((x) => x / l); };
  const Np = proj(N); const U = proj([0, 1, 0]);
  const cruz = [a[1] * U[2] - a[2] * U[1], a[2] * U[0] - a[0] * U[2], a[0] * U[1] - a[1] * U[0]];
  const graus = (Math.atan2(dot(Np, cruz), dot(Np, U)) * 180) / Math.PI;
  return { graus, amostras: n };
}
