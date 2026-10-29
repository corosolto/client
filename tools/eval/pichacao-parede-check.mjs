#!/usr/bin/env node
/* ============================================================================
   pichacao-parede-check.mjs — CADA PICHAÇÃO ESTÁ COLADA NA PAREDE QUE O JOGADOR VÊ?
   ----------------------------------------------------------------------------
   Feedback do Gustavo (28/10): "testei um mapa de favela, onde tinha várias
   pichações, e elas estavam flutuando no mapa, fora da parede."

   Mede o QUE FOI DESENHADO, não o que foi planejado: percorre a cena montada,
   tira cada quad de `decal:`/`mural:` da geometria real (inclusive as malhas
   juntas por arquivo, 4 vértices por peça) e, para cada um, atira raios pela
   normal (de 2 cm à frente para trás) numa grade 9×9 contra a malha visível e
   opaca do mapa — os GLB entram com a geometria real (`prop-geometry-fixture`).

   Por peça:
     · vao     — distância mediana do plano da peça até a superfície atrás (m);
     · solta   — fração da área sem superfície a ≤ LIMITE atrás (no ar ou longe);
     · sobra   — quanto a peça passa da borda da parede (m, pior lado: linhas ou
                 colunas inteiras da grade sem apoio, a partir da borda).
     · sangria — de onde o jogador olha (waypoints), quanto da peça vence o teste de
                 profundidade de um sólido que está NA FRENTE dela (ver bloco SANGRIA).
   Uso:
     npm run eval:pichacao-parede        # 14 mapas + mutantes (--self-test)
     node tools/eval/pichacao-parede-check.mjs [--maps=quebrada,corrego] [--top=5] [--json=out.json]
     SIM_QS='?tintaoffset=0' node tools/eval/pichacao-parede-check.mjs   # mede o código antigo
   ============================================================================ */
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const opt = (k, d) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const quality = opt('quality', 'med');
globalThis.localStorage = { getItem: () => JSON.stringify({ quality }), setItem() {}, removeItem() {} };
const { THREE, MAPS, initTextures, seedRandom } = await import('./harness.mjs');
const { preloadPropGeometry } = await import('./prop-geometry-fixture.mjs');
const { COMMON_MAP_PROPS } = await import('../../public/js/mapprops.js');

export const MAPAS_GRAFITE = ['corrego', 'quebrada', 'escadao', 'lajes', 'campomorro', 'ferro_velho',
  'atacadao_treta', 'praca_poderes', 'loja_h', 'mansao', 'obras_prefeitura', 'piscina_treta', 'posto_treta', 'upa_24h'];
export const FAVELA = ['corrego', 'quebrada', 'escadao', 'lajes', 'campomorro'];
const LIMITE = 0.06;          // 3 cm de montagem + folga: acima disso a peça descola da parede
const ALCANCE = 2.0;          // até onde procura a parede atrás
const N = 9;

const visivel = (o) => { for (let a = o; a; a = a.parent) if (!a.visible) return false; return true; };
const ehArte = (o) => { for (let a = o; a; a = a.parent) if (/^(decal:|mural:)/.test(a.name || '')) return true; return false; };

/* Quads realmente desenhados: 4 vértices por peça, em mundo. */
export function pecasDesenhadas(root) {
  const out = [];
  root.updateMatrixWorld(true);
  root.traverse((m) => {
    if (!m.isMesh || !/^(decal:|mural:)/.test(m.name) || !visivel(m)) return;
    const pos = m.geometry?.attributes?.position;
    if (!pos || pos.count % 4) return;
    for (let b = 0; b < pos.count; b += 4) {
      const p = [0, 1, 2, 3].map((i) => new THREE.Vector3().fromBufferAttribute(pos, b + i).applyMatrix4(m.matrixWorld));
      const right = p[1].clone().sub(p[0]), down = p[2].clone().sub(p[0]);
      const normal = new THREE.Vector3().crossVectors(right, down).normalize().negate();
      const c = p[0].clone().add(p[3]).multiplyScalar(0.5);
      const mat = Array.isArray(m.material) ? m.material[0] : m.material;
      const fator = mat?.polygonOffset ? mat.polygonOffsetFactor : 0, unid = mat?.polygonOffset ? mat.polygonOffsetUnits : 0;
      out.push({ nome: m.name, c, right, down, normal, w: right.length(), h: down.length(), fator, unid });
    }
  });
  return out;
}

export function paredes(root) {
  const out = [];
  root.traverse((m) => {
    if (!m.isMesh || !m.geometry || !m.material || !(m.layers.mask & 1) || !visivel(m) || ehArte(m)) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    if (mats.some((x) => x && x.visible !== false && x.colorWrite !== false && x.opacity > 0.5 && !x.transparent)) out.push(m);
  });
  return out;
}

function grade(meshes, cel = 4) {
  const g = new Map(), bb = new THREE.Box3();
  const box = new THREE.Box3(), mtx = new THREE.Matrix4();
  for (const o of meshes) {
    if (o.isInstancedMesh) {
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, mtx); box.copy(o.geometry.boundingBox).applyMatrix4(mtx).applyMatrix4(o.matrixWorld);
        add(o, box);
      }
    } else { bb.setFromObject(o); add(o, bb); }
  }
  function add(o, b) {
    if (!isFinite(b.min.x)) return;
    const x0 = Math.floor(b.min.x / cel), x1 = Math.floor(b.max.x / cel), z0 = Math.floor(b.min.z / cel), z1 = Math.floor(b.max.z / cel);
    if ((x1 - x0 + 1) * (z1 - z0 + 1) > 4096) { (g.get('*') || g.set('*', new Set()).get('*')).add(o); return; }
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      const k = x + ',' + z; (g.get(k) || g.set(k, new Set()).get(k)).add(o);
    }
  }
  return (x0, z0, x1, z1) => {
    const s = new Set(g.get('*') || []);
    for (let x = Math.floor(Math.min(x0, x1) / cel); x <= Math.floor(Math.max(x0, x1) / cel); x++)
      for (let z = Math.floor(Math.min(z0, z1) / cel); z <= Math.floor(Math.max(z0, z1) / cel); z++)
        for (const o of g.get(x + ',' + z) || []) s.add(o);
    return [...s];
  };
}

export function medirPecas(root, pecas) {
  const perto = grade(paredes(root));
  const rc = new THREE.Raycaster(), o = new THREE.Vector3(), d = new THREE.Vector3();
  return pecas.map((p) => {
    const ux = p.right.clone().normalize(), dv = p.down.clone().normalize();
    const r = p.w / 2 + ALCANCE + 0.1;
    const alvos = perto(p.c.x - r, p.c.z - r, p.c.x + r, p.c.z + r);
    const prof = [];
    d.copy(p.normal).negate();
    for (let a = 0; a < N; a++) {
      const linha = [];
      for (let b = 0; b < N; b++) {
        const su = (a / (N - 1) - 0.5) * 0.98, sv = (b / (N - 1) - 0.5) * 0.98;
        o.copy(p.c).addScaledVector(ux, su * p.w).addScaledVector(dv, sv * p.h).addScaledVector(p.normal, 0.02);
        rc.set(o, d); rc.far = ALCANCE + 0.02;
        const hit = rc.intersectObjects(alvos, false).find((h) => h.distance > 1e-4);
        linha.push(hit ? hit.distance - 0.02 : null);
      }
      prof.push(linha);
    }
    const todas = prof.flat();
    const ok = (v) => v !== null && v <= LIMITE && v >= -0.03;
    const achadas = todas.filter((v) => v !== null).sort((x, y) => x - y);
    const vao = achadas.length ? achadas[achadas.length >> 1] : null;
    const vaoMin = achadas.length ? achadas[0] : null;
    const solta = todas.filter((v) => !ok(v)).length / todas.length;
    const passo = (n) => (0.98 / (N - 1)) * n;
    const colVazia = (a) => prof[a].every((v) => !ok(v));
    const linVazia = (b) => prof.every((col) => !ok(col[b]));
    let esq = 0; while (esq < N && colVazia(esq)) esq++;
    let dir = 0; while (dir < N && colVazia(N - 1 - dir)) dir++;
    let cima = 0; while (cima < N && linVazia(cima)) cima++;
    let baixo = 0; while (baixo < N && linVazia(N - 1 - baixo)) baixo++;
    const sobra = Math.max(passo(Math.max(esq, dir)) * p.w, passo(Math.max(cima, baixo)) * p.h);
    return { nome: p.nome, x: +p.c.x.toFixed(2), y: +p.c.y.toFixed(2), z: +p.c.z.toFixed(2),
      w: +p.w.toFixed(2), h: +p.h.toFixed(2), vao: vao === null ? null : +vao.toFixed(3), vaoMin: vaoMin === null ? null : +vaoMin.toFixed(4), solta: +solta.toFixed(3), sobra: +sobra.toFixed(2) };
  });
}

/* ── SANGRIA: A PICHAÇÃO QUE ATRAVESSA A QUINA DA FRENTE ────────────────────
   `polygonOffset` empurra a peça em direção à câmera em PROFUNDIDADE DE TELA:
   offset = fator·(inclinação da própria peça por pixel) + unidades·(menor degrau).
   O termo do fator cresce com a tangente do ângulo de visada — de lado, num beco,
   ele vira dezenas de centímetros de mundo, e a peça passa a ganhar o teste de
   profundidade de tudo que esteja até essa distância NA FRENTE dela: a quina do
   barraco vizinho, o pilar, o cano. O jogador vê a tinta desenhada no ar, por cima
   da parede que deveria tapá-la. Aqui a conta é a do GL, em mundo:
     Δ ≈ |fator|·α·tanθ·D + |unid|·D²/(near·2^24)
   (α = ângulo de 1 pixel, θ = visada × normal da peça, D = distância). Uma amostra
   SANGRA quando o primeiro sólido opaco no raio olho→peça está à frente dela por
   menos que Δ — devia tapar e não tapa. */
const NEAR = 0.08, FOV_V = 70 * Math.PI / 180, ALTURA_TELA = 1080, OLHO = 1.6;
const ALFA = FOV_V / ALTURA_TELA, DEGRAU = 1 / 2 ** 24;
export function offsetMundo(fator, unid, tanT, D) {
  return Math.abs(fator) * ALFA * tanT * D + Math.abs(unid) * DEGRAU * D * D / NEAR;
}

export function medirSangria(root, pecas, waypoints, { vistas = 6, raio = 25 } = {}) {
  const perto = grade(paredes(root), 6);
  const rc = new THREE.Raycaster(), olho = new THREE.Vector3(), alvo = new THREE.Vector3(), dir = new THREE.Vector3();
  return pecas.map((p) => {
    const ux = p.right.clone().normalize(), dv = p.down.clone().normalize();
    const cand = [];
    for (const wp of waypoints) {
      olho.set(wp.x, (wp.y || 0) + OLHO, wp.z);
      const v = olho.clone().sub(p.c), D = v.length();
      if (D < 2 || D > raio) continue;
      const cos = v.dot(p.normal) / D;
      if (cos < 0.03) continue;                       // atrás da peça: FrontSide nem desenha
      cand.push({ o: olho.clone(), cos });
    }
    cand.sort((a, b) => a.cos - b.cos);               // a visada mais rasante primeiro: é onde sangra
    let amostras = 0, sangra = 0, pior = 0, vista = null, mira = null, vaoMin = Infinity;
    for (const { o } of cand.slice(0, vistas)) {
      const alvos = perto(Math.min(o.x, p.c.x), Math.min(o.z, p.c.z), Math.max(o.x, p.c.x), Math.max(o.z, p.c.z));
      for (const su of [-0.4, 0, 0.4]) for (const sv of [-0.4, 0, 0.4]) {
        alvo.copy(p.c).addScaledVector(ux, su * p.w).addScaledVector(dv, sv * p.h);
        dir.copy(alvo).sub(o); const D = dir.length(); dir.divideScalar(D);
        const cos = Math.max(1e-3, -dir.dot(p.normal)), tanT = Math.min(60, Math.sqrt(1 - cos * cos) / cos);
        rc.set(o, dir); rc.far = D - 0.002;
        const hit = rc.intersectObjects(alvos, false).find((h) => h.distance > 1e-3);
        amostras++;
        if (!hit) continue;                            // nada na frente: a peça aparece, e deve
        const frente = D - hit.distance, delta = offsetMundo(p.fator, p.unid, tanT, D);
        if (frente < delta) {
          sangra++;
          if (frente > pior) { pior = frente; vista = o.toArray().map((v) => +v.toFixed(2)); mira = alvo.toArray().map((v) => +v.toFixed(2)); }
        }
      }
    }
    return { nome: p.nome, x: +p.c.x.toFixed(2), y: +p.c.y.toFixed(2), z: +p.c.z.toFixed(2),
      w: +p.w.toFixed(2), h: +p.h.toFixed(2), fator: p.fator, unid: p.unid,
      amostras, sangra, atravessa: +pior.toFixed(3), vista, mira };
  });
}

export function nota(m) { return m.solta * m.w * m.h + (m.vao === null ? 1 : Math.max(0, m.vao - LIMITE)); }

export async function montar(id) {
  const props = [...new Set([...COMMON_MAP_PROPS, ...(MAPS[id].props || [])])];
  await preloadPropGeometry(props);
  seedRandom(12345);
  const W = MAPS[id].build(new THREE.Scene(), initTextures());
  W.root.updateMatrixWorld(true);
  return W;
}

/* ── PORTÃO ─────────────────────────────────────────────────────────────────
   Reprova se QUALQUER peça sobra fora da parede ou descola mais que LIMITE
   (solta > 0), ou atravessa a quina da frente (sangria > 0). Sem teto de dívida:
   o número certo é zero.
   `vão mín` sai no relatório e NÃO reprova: há peças com um ponto da grade 9×9
   encostando em friso/arremate exatamente no plano da tinta (vão 0 no Piscina).
   Coplanar tem a MESMA inclinação de profundidade, e aí `polygonOffsetUnits` sozinho
   decide a favor da tinta — o fator só era necessário para planos DIFERENTES, que é
   exatamente o caso em que ele vaza por cima da quina.
   --self-test: dois mutantes que mordem —
     1. `?tintaoffset=0` (o kill-switch = o código de antes) tem de reprovar por sangria;
     2. uma malha de tinta empurrada 40 cm para fora da parede tem de reprovar por solta. */
async function rodar(lista, top) {
  const rel = {};
  let falhas = 0;
  for (const id of lista) {
    const W = await montar(id);
    const r = medirMapa(W, top);
    rel[id] = r;
    const ruins = r.soltas + r.sangram;
    falhas += ruins;
    console.log(`${ruins ? 'FAIL' : 'ok  '} ${id.padEnd(16)} ${String(r.pecas).padStart(5)} peças | ${String(r.soltas).padStart(3)} fora da parede`
      + ` (pior vão ${r.vaoMax} m, sobra ${r.sobraMax} m) | ${String(r.sangram).padStart(3)} atravessam a quina da frente`
      + ` (${r.sangria}/${r.amostras} visadas) | vão mín ${r.vaoMin} m`);
    for (const m of r.piores) if (nota(m) > 0) console.log('    parede ', JSON.stringify(m));
    for (const m of r.sangriaPiores) if (m.sangra > 0) console.log('    sangria', JSON.stringify(m));
  }
  return { rel, falhas };
}

export function medirMapa(W, top = 5) {
  const pecas = pecasDesenhadas(W.root);
  const med = medirPecas(W.root, pecas);
  const sg = medirSangria(W.root, pecas, (W.waypoints && W.waypoints.nodes) || []);
  sg.sort((a, b) => b.sangra - a.sangra || b.atravessa - a.atravessa);
  med.sort((a, b) => nota(b) - nota(a));
  const vaos = med.map((m) => m.vaoMin).filter((v) => v !== null);
  return {
    pecas: med.length,
    soltas: med.filter((m) => m.solta > 0).length,
    vaoMax: +Math.max(0, ...med.map((m) => m.vao || 0)).toFixed(3),
    vaoMin: vaos.length ? +Math.min(...vaos).toFixed(3) : null,
    sobraMax: +Math.max(0, ...med.map((m) => m.sobra)).toFixed(2),
    sangram: sg.filter((m) => m.sangra > 0).length,
    amostras: sg.reduce((a, m) => a + m.amostras, 0), sangria: sg.reduce((a, m) => a + m.sangra, 0),
    piores: med.slice(0, top), sangriaPiores: sg.slice(0, top),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const lista = opt('maps', MAPAS_GRAFITE.join(',')).split(',');
  const { rel, falhas } = await rodar(lista, +opt('top', 5));
  if (opt('json')) writeFileSync(opt('json'), JSON.stringify(rel, null, 2));
  console.log(JSON.stringify({ regua: 'pichacao-parede', mapas: lista.length, falhas, legado: process.env.SIM_QS || '' }));
  if (falhas) process.exitCode = 1;

  if (args.includes('--self-test')) {
    const { spawnSync } = await import('node:child_process');
    // mutante 1: o kill-switch é o código de antes, byte a byte (offsetTinta devolve o fator antigo)
    const filho = spawnSync(process.execPath, [process.argv[1], '--maps=quebrada,lajes', '--top=0'],
      { env: { ...process.env, SIM_QS: '?tintaoffset=0' }, encoding: 'utf8', maxBuffer: 64 << 20 });
    const resumo = JSON.parse(filho.stdout.trim().split('\n').filter((l) => l.startsWith('{"regua"')).pop() || '{}');
    if (filho.status !== 1 || !(resumo.falhas > 0)) { console.error('FAIL mutante ?tintaoffset=0 não mordeu', filho.status, resumo); process.exitCode = 1; }
    else console.log(JSON.stringify({ mutante: 'tintaoffset=0', mordeu: true, falhas: resumo.falhas }));
    // mutante 2: uma malha de tinta 40 cm descolada da parede
    const W = await montar('lajes');
    let alvo = null;
    W.root.traverse((m) => { if (!alvo && m.isMesh && /^decal:/.test(m.name)) alvo = m; });
    const p = pecasDesenhadas(W.root).find((q) => q.nome === alvo.name);
    alvo.matrixAutoUpdate = true;
    alvo.position.addScaledVector(p.normal, 0.4); alvo.updateMatrixWorld(true);
    const r = medirMapa(W, 0);
    if (!(r.soltas > 0)) { console.error('FAIL mutante descolado não mordeu', r.soltas); process.exitCode = 1; }
    else console.log(JSON.stringify({ mutante: 'tinta 40 cm fora da parede', mordeu: true, soltas: r.soltas }));
  }
}
