/* ============================================================================
   vm-enquadramento.mjs — RÉGUA DE ENQUADRAMENTO DO FP PARADO (idle, sem inspeção)
   ----------------------------------------------------------------------------
   POR QUE EXISTE — dono, 10/11/2026 (capturas do #1298): com pintura equipada a
   pistola aparecia minúscula e longe, no meio-baixo da tela, com os dois braços
   esticados. A/B: o mesmo quadro sai no staging limpo com qualquer pintura de
   pistola da loja (rota gold#pistol, `goldFrame` de vmconfig.js) e numa partida
   de verdade pelo menu — não é arnês nem o PR. A área da arma batia com a PT-38
   (o `goldFrame` de 06/11 foi calibrado só por área), por isso nenhuma régua via.

   O QUE MEDE: a máscara do QUADRO (vmScene pela vmCamera, arma vermelha, braço
   verde, materiais escondidos continuam escondidos) renderizada com
   SOBREVARREDURA ×3 — o que sai da tela também entra na conta. A "arma" é o
   maior componente conexo dos pixels de arma (pente reserva solto não conta).
   Coordenadas em fração da tela (0..1, y para baixo).

   CLASSES E CLÁUSULAS (cada aspecto, cada rota):
     curta (PISTOLS)  E1 caixa inteira da arma dentro da tela com margem
                      E2 tamanho são: área visível da arma entre areaMin e areaMax
                      E3 braço não domina: área do braço ≤ bracoPorArma × área da arma
                      E4 arma ancorada embaixo: da base da arma à borda ≤ pegaMax
                         (pistola alta = antebraço comprido na tela = "longe")
     longa            E1 o cano/frente (canto superior-esquerdo da caixa) dentro da
                         tela com margem — a saída de propósito é SÓ pela borda de
                         baixo/direita (composição CS da AK golden aprovada)
                      E2 a frente chega ao quadro: x0 ≤ frenteXMax, y0 ≤ frenteYMax
                      E3 tamanho são: área visível entre areaMin e areaMax
     faca             E1 caixa inteira dentro com margem; E2 área (mão grande é do desenho)
   Limiares tirados da medida do arsenal inteiro em 16:9 e 3:2 (staging de 10/11/2026),
   com folga: tools/eval/vm-enquadramento-idle.json guarda o placar medido.
   ============================================================================ */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PISTOLS } from '../../../public/js/weapons.js';

// Placar assado (navegador, local) que o CI confere sem navegador: eval:vm-enquadramento-placar.
export const PLACAR_ARQ = 'tools/eval/vm-enquadramento-idle.json';
// Tudo que decide o quadro parado: composição/FOV por arma e rota, revisões dos GLBs e a régua.
export const ENTRADAS = Object.freeze(['public/js/data/vmconfig.js', 'public/js/data/vmframe.js', 'public/js/data/vmfabrica.js',
  'public/js/data/vmbytes.js', 'public/js/data/goldenver.js', 'tools/eval/lib/vm-enquadramento.mjs']);
// Armas com rota de pintura (main.js: playerWeaponSkins; authoredvm.js: gold#<arma>).
export const PINTADAS = Object.freeze(['pistol', 'ak', 'm4', 'scar']);
// `sobrepor` troca o texto de um arquivo antes do hash (mutante do CI sem tocar o disco).
export function hashDasEntradas(raiz = process.cwd(), sobrepor = {}) {
  const h = crypto.createHash('sha256');
  for (const f of ENTRADAS) { h.update(f); h.update(sobrepor[f] ?? fs.readFileSync(path.join(raiz, f))); }
  return h.digest('hex').slice(0, 16);
}
export const ASPECTOS = Object.freeze({ '16x9': [1920, 1080], '3x2': [1500, 1000] });
export const SOBRE = 3;          // sobrevarredura: janela ×3 em cada eixo
export const REDUCAO = 2;        // máscara a 1/2 da resolução da tela
export const MARGEM = 0.015;     // 1,5% da dimensão da tela

export const LIMIARES = Object.freeze({
  curta: Object.freeze({ areaMin: 0.005, areaMax: 0.03, bracoPorArma: 5, pegaMax: 0.2 }),
  longa: Object.freeze({ frenteXMax: 0.8, frenteYMax: 0.75, areaMin: 0.02, areaMax: 0.15 }),
  faca: Object.freeze({ areaMin: 0.005, areaMax: 0.05 }),
});

export const classeDe = (arma) => (arma === 'knife' ? 'faca' : PISTOLS.has(arma) ? 'curta' : 'longa');

/* Roda NA PÁGINA (autocontida): máscara da vmScene com a projeção da vmCamera
   encolhida ×S (vê S× mais em cada eixo), em RGBA lido do render target.
   Devolve a máscara (0 fundo, 1 arma, 2 braço/mão) em base64, de cima para baixo. */
export async function MASCARA_SOBRE({ S, ds }) {
  const T = await import('three');
  const g = window.__game;
  const arma = g.player.weapon;
  const melee = g.vm.melee?.active;
  const entry = melee ? null : g.vm.authored?.entry?.(arma);
  if (!melee && !entry) return { erro: `sem viewmodel autorado ativo para ${arma}` };
  const MAO = /CoroSolto_(?:FP_(?:Hand|Gloves?|Cloth)|Mandrake_Sleeves)|Glove|Hand|Sleeve|Cloth|luva|manga/i;
  const maos = new Set(entry?.handMeshes || []);
  const armas = new Set(entry?.weaponMeshes || []);
  const visivel = (o) => { for (let p = o; p; p = p.parent) if (p.visible === false) return false; return true; };
  const ehMao = (o) => maos.has(o) || (!armas.has(o) && (Array.isArray(o.material) ? o.material : [o.material]).some((m) => MAO.test(m?.name || '')));
  const vermelho = new T.MeshBasicMaterial({ color: 0xff0000, toneMapped: false, fog: false });
  const verde = new T.MeshBasicMaterial({ color: 0x00ff00, toneMapped: false, fog: false });
  const trocados = [];
  const escondidos = [];
  g.vmScene.traverse((o) => {
    if (!(o.isMesh || o.isLine || o.isPoints || o.isSprite)) return;
    if (!o.isMesh || !visivel(o) || /^(skin-|club-mark-)/.test(o.name)) { if (o.visible) { escondidos.push(o); o.visible = false; } return; }
    // O jogo também esconde peça pelo MATERIAL (Material.visible): continua escondida.
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.every((m) => !m || m.visible === false)) { escondidos.push(o); o.visible = false; return; }
    trocados.push([o, o.material]);
    const cor = ehMao(o) ? verde : vermelho;
    o.material = Array.isArray(o.material) ? o.material.map((m) => (m && m.visible === false ? m : cor)) : cor;
  });
  const r = g.renderer;
  const W = r.domElement.clientWidth;
  const H = r.domElement.clientHeight;
  const w = Math.round((W * S) / ds);
  const h = Math.round((H * S) / ds);
  const cam = g.vmCamera.clone();
  cam.projectionMatrix.copy(g.vmCamera.projectionMatrix);
  const e = cam.projectionMatrix.elements;
  e[0] /= S; e[8] /= S; e[5] /= S; e[9] /= S;
  cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  const fundo = g.vmScene.background;
  const neblina = g.vmScene.fog;
  g.vmScene.background = null; g.vmScene.fog = null;
  const rt = new T.WebGLRenderTarget(w, h);
  const antes = { rt: r.getRenderTarget(), auto: r.autoClear, cor: r.getClearColor(new T.Color()), alfa: r.getClearAlpha() };
  r.setRenderTarget(rt); r.setClearColor(0, 0); r.autoClear = true; r.clear(true, true, true);
  r.render(g.vmScene, cam);
  const buf = new Uint8Array(w * h * 4);
  r.readRenderTargetPixels(rt, 0, 0, w, h, buf);
  r.setRenderTarget(antes.rt); r.autoClear = antes.auto; r.setClearColor(antes.cor, antes.alfa); rt.dispose();
  g.vmScene.background = fundo; g.vmScene.fog = neblina;
  for (const [o, m] of trocados) o.material = m;
  for (const o of escondidos) o.visible = true;
  vermelho.dispose(); verde.dispose();
  const out = new Uint8Array(w * h);
  for (let yy = 0; yy < h; yy++) {
    const y = h - 1 - yy;
    for (let x = 0; x < w; x++) {
      const i = (yy * w + x) * 4;
      if (buf[i + 3] < 128) continue;
      out[y * w + x] = buf[i] > buf[i + 1] ? 1 : 2;
    }
  }
  let s = '';
  for (let i = 0; i < out.length; i += 0x8000) s += String.fromCharCode.apply(null, out.subarray(i, i + 0x8000));
  return { w, h, W, H, arma, chave: melee ? 'melee' : entry.key, vmFov: +g.vmCamera.fov.toFixed(2), b64: btoa(s) };
}

/* Node: maior componente conexo (8-vizinhos) da arma e área visível do braço.
   Caixa e área em fração da TELA (terço central da sobrevarredura). */
export function medir(m, S = SOBRE) {
  const { w, h } = m;
  const px = Buffer.from(m.b64, 'base64');
  const rot = new Int32Array(w * h);
  const pilha = new Int32Array(w * h);
  const sx0 = w / S, sx1 = (2 * w) / S, sy0 = h / S, sy1 = (2 * h) / S;
  const dentro = (x, y) => x >= sx0 && x < sx1 && y >= sy0 && y < sy1;
  let melhor = null;
  let id = 0;
  let braco = 0;
  for (let s = 0; s < w * h; s++) {
    if (px[s] === 2) { const x = s % w; if (dentro(x, (s - x) / w)) braco++; continue; }
    if (px[s] !== 1 || rot[s]) continue;
    id++;
    let topo = 0;
    pilha[topo++] = s; rot[s] = id;
    const c = { n: 0, nDentro: 0, x0: w, x1: -1, y0: h, y1: -1, sx: 0, sy: 0, sxx: 0, syy: 0, sxy: 0 };
    while (topo) {
      const p = pilha[--topo];
      const x = p % w;
      const y = (p - x) / w;
      c.n++;
      if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
      if (dentro(x, y)) { c.nDentro++; c.sx += x; c.sy += y; c.sxx += x * x; c.syy += y * y; c.sxy += x * y; }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const q = yy * w + xx;
        if (px[q] === 1 && !rot[q]) { rot[q] = id; pilha[topo++] = q; }
      }
    }
    if (!melhor || c.nDentro > melhor.nDentro) melhor = c;
  }
  const tela = (sx1 - sx0) * (sy1 - sy0);
  const fx = (x) => +((x - sx0) / (sx1 - sx0)).toFixed(3);
  const fy = (y) => +((y - sy0) / (sy1 - sy0)).toFixed(3);
  if (!melhor || !melhor.nDentro) return { arma: null, braco: +(braco / tela).toFixed(4) };
  return {
    arma: { x0: fx(melhor.x0), x1: fx(melhor.x1 + 1), y0: fy(melhor.y0), y1: fy(melhor.y1 + 1),
      area: +(melhor.nDentro / tela).toFixed(4), naTela: +(melhor.nDentro / melhor.n).toFixed(3),
      // Centro e eixo principal (≈ direção do cano) da parte visível, em pixels de tela quadrados.
      ...eixo(melhor, fx, fy, (sx1 - sx0) / (sy1 - sy0)) },
    braco: +(braco / tela).toFixed(4),
    componentes: id,
  };
}

const r3 = (v) => +v.toFixed(3);
export function julgar(arma, medida, limiares = LIMIARES) {
  const classe = classeDe(arma);
  const L = limiares[classe];
  const a = medida?.arma;
  // Viewmodel ativo e nenhum pixel de arma na tela = a arma saiu do quadro (vermelho, não "não mede").
  if (!a) return { classe, estado: 'VERMELHO', clausulas: [{ id: 'E0', ok: false, msg: 'arma fora do quadro (nenhum pixel de arma na tela)' }] };
  const cl = [];
  const c = (id, ok, valor, msg) => cl.push({ id, ok: Boolean(ok), valor, msg });
  const area = (id) => c(id, a.area >= L.areaMin && a.area <= L.areaMax, a.area, `área visível ${a.area} ∈ [${L.areaMin}, ${L.areaMax}]`);
  if (classe === 'longa') {
    c('E1', a.x0 >= MARGEM && a.y0 >= MARGEM, [a.x0, a.y0], `frente (x0,y0)=(${a.x0},${a.y0}) ≥ margem ${MARGEM}`);
    c('E2', a.x0 <= L.frenteXMax && a.y0 <= L.frenteYMax, [a.x0, a.y0], `frente chega ao quadro: x0 ≤ ${L.frenteXMax}, y0 ≤ ${L.frenteYMax}`);
    area('E3');
  } else {
    const ok = a.x0 >= MARGEM && a.y0 >= MARGEM && a.x1 <= 1 - MARGEM && a.y1 <= 1 - MARGEM;
    c('E1', ok, [a.x0, a.y0, a.x1, a.y1], `caixa (${a.x0},${a.y0})–(${a.x1},${a.y1}) dentro da tela com margem ${MARGEM}`);
    area('E2');
    if (classe === 'curta') {
      const razao = r3(medida.braco / a.area);
      c('E3', razao <= L.bracoPorArma, razao, `braço/arma ${razao} ≤ ${L.bracoPorArma}`);
      const pega = r3(1 - a.y1);
      c('E4', pega <= L.pegaMax, pega, `base da arma a ${pega} da borda de baixo ≤ ${L.pegaMax}`);
    }
  }
  return { classe, estado: cl.every((x) => x.ok) ? 'VERDE' : 'VERMELHO', clausulas: cl };
}

function eixo(c, fx, fy, aspecto) {
  const n = c.nDentro;
  const mx = c.sx / n, my = c.sy / n;
  const vxx = c.sxx / n - mx * mx, vyy = c.syy / n - my * my, vxy = c.sxy / n - mx * my;
  const graus = (Math.atan2(2 * vxy, vxx - vyy) / 2) * (180 / Math.PI);
  return { cx: fx(mx), cy: fy(my), eixoGraus: +(((graus % 180) + 180) % 180).toFixed(1), aspecto: +aspecto.toFixed(3) };
}

/* Pintura não muda o quadro: a rota pintada fica com o mesmo centro, área e eixo da
   referência sem pintura (a pistola contra ela mesma; fuzis pintados contra a AK golden
   aprovada, cuja composição eles herdam). Pedido do dono, 10/11 (#1315). */
export const REFERENCIA_DA_PINTURA = Object.freeze({ pistol: 'pistol', ak: 'ak', m4: 'ak', scar: 'ak' });
export const PAREAMENTO = Object.freeze({ centroMax: 0.06, areaTol: 0.2, eixoMax: 15 });
export function comparar(pintada, referencia, P = PAREAMENTO) {
  const a = pintada?.arma, r = referencia?.arma;
  if (!a || !r || a.cx == null || r.cx == null) return [{ id: 'P0', ok: false, msg: 'sem medida de centro/eixo para comparar com a referência' }];
  const centro = r3(Math.hypot(a.cx - r.cx, (a.cy - r.cy) / (a.aspecto || 1)));
  const razao = r3(a.area / r.area);
  const d = Math.abs(a.eixoGraus - r.eixoGraus) % 180;
  const eixoDif = r3(Math.min(d, 180 - d));
  return [
    { id: 'P1', ok: centro <= P.centroMax, valor: centro, msg: `centro a ${centro} da referência ≤ ${P.centroMax}` },
    { id: 'P2', ok: Math.abs(razao - 1) <= P.areaTol, valor: razao, msg: `área ${razao}× a referência (±${P.areaTol * 100}%)` },
    { id: 'P3', ok: eixoDif <= P.eixoMax, valor: eixoDif, msg: `eixo do cano a ${eixoDif}° da referência ≤ ${P.eixoMax}°` },
  ];
}
