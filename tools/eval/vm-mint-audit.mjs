// AUDITORIA HEADLESS DO VIEWMODEL MINT (sem Chrome, sem render).
// PORQUÊ: a régua nova (BAR-CONSISTENCIA) exige provar o enquadramento arma a arma nos
// DOIS aspectos (16:9 e 3:2 — o dono joga em 3:2). Abrir o browser aqui é proibido (2 CPU
// / SwiftShader), então este script reimplementa EXATAMENTE a cadeia de transformação do
// viewmodel (weapons.js weaponModel + game.js vmFrame) e projeta os vértices reais do GLB
// na tela. Se um número aqui está fora da faixa, a tela está fora da faixa.
//
// Saída: tools/eval/vm_mint_audit.json
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
export const WDIR = path.join(ROOT, 'public/models/weapons');

/* ---------- parser GLB mínimo (os 26 GLBs da Mint são 1 mesh / 1 node, sem Draco) ---------- */
const COMP = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const NUM = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
function readGLB(file) {
  const b = fs.readFileSync(file);
  const jsonLen = b.readUInt32LE(12);
  const json = JSON.parse(b.slice(20, 20 + jsonLen).toString('utf8'));
  let bin = null, off = 20 + jsonLen;
  while (off < b.length) {
    const len = b.readUInt32LE(off), type = b.readUInt32LE(off + 4);
    if (type === 0x004e4942) bin = b.slice(off + 8, off + 8 + len);
    off += 8 + len + ((4 - (len % 4)) % 4) * 0;
    if (len % 4) off += 4 - (len % 4);
  }
  return { json, bin };
}
function accessor(g, idx) {
  const a = g.json.accessors[idx], bv = g.json.bufferViews[a.bufferView];
  const T = COMP[a.componentType], n = NUM[a.type];
  const base = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const out = new Float32Array(a.count * n);
  const stride = bv.byteStride || n * T.BYTES_PER_ELEMENT;
  for (let i = 0; i < a.count; i++) {
    const view = new T(g.bin.buffer, g.bin.byteOffset + base + i * stride, n);
    for (let k = 0; k < n; k++) out[i * n + k] = view[k];
  }
  return out;
}
/* Vértices do GLB já no espaço do nó raiz (aplica TRS/matrix dos nós) + os TRIÂNGULOS.
   POR QUE OS TRIÂNGULOS ENTRARAM AGORA (tools/eval/ref-measure.py mede PIXEL de imagem):
   até esta rodada o auditor só tinha a nuvem de vértices, e `screenArea` estimava a área
   ocupada marcando a célula de cada vértice numa grade 128² e DILATANDO 1 célula. Um
   crítico rasterizou os triângulos de verdade e mostrou que a dilatação inflava a medida
   ~1,5× DE FORMA DESIGUAL (faca 1,90×, m92 1,15×) — porque o fator depende da densidade
   de vértices por área de tela, que varia por modelo. Calibrar o teto da VM5 contra a
   referência medida em pixel com um instrumento assim é calibrar contra régua torta.
   Com os índices, `screenArea` passa a rasterizar a face (ver rasteriza()) e as duas
   réguas — a de imagem (ref-measure.py) e a de geometria (aqui) — medem a mesma coisa. */
function glbPositions(g) {
  const nodes = g.json.nodes || [];
  const scene = g.json.scenes[g.json.scene || 0];
  const out = [];
  const tris = [];
  const walk = (ni, M) => {
    const nd = nodes[ni];
    const L = nd.matrix ? mat4FromArray(nd.matrix) : trs(nd.translation, nd.rotation, nd.scale);
    const W = mul(M, L);
    if (nd.mesh !== undefined) {
      for (const prim of g.json.meshes[nd.mesh].primitives) {
        if (prim.attributes.POSITION === undefined) continue;
        if (prim.mode !== undefined && prim.mode !== 4) continue;   // só TRIANGLES
        const base = out.length;
        const p = accessor(g, prim.attributes.POSITION);
        for (let i = 0; i < p.length; i += 3) out.push(apply(W, p[i], p[i + 1], p[i + 2]));
        const n = p.length / 3;
        if (prim.indices !== undefined) {
          const idx = accessor(g, prim.indices);
          for (let i = 0; i + 2 < idx.length; i += 3) tris.push([base + idx[i], base + idx[i + 1], base + idx[i + 2]]);
        } else {
          for (let i = 0; i + 2 < n; i += 3) tris.push([base + i, base + i + 1, base + i + 2]);
        }
      }
    }
    for (const c of nd.children || []) walk(c, W);
  };
  for (const r of scene.nodes) walk(r, ident());
  out.tris = tris;
  return out;
}
/* ---------- álgebra 4x4 (column-major, igual ao THREE) ---------- */
const ident = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const mat4FromArray = (a) => a.slice();
function mul(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  }
  return o;
}
const apply = (m, x, y, z) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
function trs(t = [0, 0, 0], q = [0, 0, 0, 1], s = [1, 1, 1]) {
  const [x, y, z, w] = q, x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
  return [(1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0,
    (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
    (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0,
    t[0], t[1], t[2], 1];
}
// Euler XYZ em graus -> matriz (mesma ordem do THREE.Object3D.rotation default 'XYZ')
function eulerXYZ(dx, dy, dz) {
  const [a, b, c] = [dx, dy, dz].map((d) => d * Math.PI / 180);
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cc = Math.cos(c), sc = Math.sin(c);
  const ae = ca * cc, af = ca * sc, be = sa * cc, bf = sa * sc;
  return [cb * cc, af + be * sb, bf - ae * sb, 0,
    -cb * sc, ae - bf * sb, be + af * sb, 0,
    sb, -sa * cb, ca * cb, 0, 0, 0, 0, 1];
}

/* ---------- CFG LIDO DE public/js/weapons.js (sem espelho: zero risco de drift) ---------- */
function loadCFG() {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/weapons.js'), 'utf8');
  const i = src.indexOf('const CFG = {');
  const j = src.indexOf('\n};', i);
  const body = src.slice(i + 'const CFG = '.length, j + 2).replace(/Math\.PI/g, String(Math.PI));
  // eslint-disable-next-line no-new-func
  return new Function('return ' + body)();
}
export const CFG = loadCFG();

/* ---------- réplica de weaponModel(): grip na origem, cano +Z, comprimento real ---------- */
/* gunSpace(id) usa o CFG DESTA árvore. `cfgAlt` existe para o vm-project projetar uma
   ÁRVORE ALVO (o "antes" da sobreposição): len/gripZ/rot/vm vivem em weapons.js e MUDAM
   entre commits — a rodada do GRIP + PITCH mexeu no `vm` de 9 armas. Sem isto o "antes"
   sairia com a geometria nova e o enquadramento velho, que é uma tela que nunca existiu. */
export function gunSpace(id, cfgAlt) {
  const cfg = cfgAlt || CFG[id];
  const g = readGLB(path.join(WDIR, id + '.glb'));
  const raw = glbPositions(g);
  const R = eulerXYZ(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
  let P = raw.map(([x, y, z]) => apply(R, x, y, z));
  const bb = bbox(P);
  const zlen = (bb.max[2] - bb.min[2]) || 1;
  const s = Math.min(8, Math.max(0.05, cfg.len / zlen));
  P = P.map((p) => [p[0] * s, p[1] * s, p[2] * s]);
  const bb2 = bbox(P);
  const gripZ = bb2.max[2] - (bb2.max[2] - bb2.min[2]) * cfg.gripZ;   // shift p/ grip na origem
  P = P.map((p) => [p[0], p[1], p[2] - gripZ]);
  // T = triângulos (índices em P). A transformação acima é vértice-a-vértice e preserva a
  // ordem, então os índices do GLB continuam válidos sem remapeamento.
  return { P, T: raw.tris, cfg };
}
export function bbox(P) {
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const p of P) for (let k = 0; k < 3; k++) { if (p[k] < mn[k]) mn[k] = p[k]; if (p[k] > mx[k]) mx[k] = p[k]; }
  return { min: mn, max: mx };
}
// Boca do cano = centroide dos vértices no 2% mais avançado em +Z (é a ponta FINA — ver weapons.js)
export function muzzleOf(P, bb) {
  const cut = bb.max[2] - (bb.max[2] - bb.min[2]) * 0.02;
  let s = [0, 0, 0], c = 0;
  for (const p of P) if (p[2] >= cut) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; c++; }
  return c ? [s[0] / c, s[1] / c, s[2] / c] : [0, 0, bb.max[2]];
}
// Alça de mira = topo do receiver na metade da frente (z entre 0 e 45% do trecho grip->boca):
// é a linha que o ADS tem que colocar no centro da tela.
export function sightOf(P, bb, mz) {
  const z0 = 0, z1 = mz[2] * 0.45;
  let top = -1e9, sx = 0, c = 0;
  for (const p of P) if (p[2] >= z0 && p[2] <= z1 && p[1] > top) top = p[1];
  for (const p of P) if (p[2] >= z0 && p[2] <= z1 && p[1] > top - 0.012) { sx += p[0]; c++; }
  return [c ? sx / c : mz[0], top, mz[2] * 0.30];
}

// VERIFICAÇÃO DO `rot` (requisito "o cano aponta pra onde a mira aponta"): o cano é a ponta
// FINA, a coronha a GROSSA. Mede o raio médio da seção transversal nos 6% de cada ponta; se
// a ponta +Z não for a mais fina, a arma entra no viewmodel de ré (foi o bug "arma apontada
// pra baixo"/invertida). Independe de olhar na tela.
export function barrelCheck(P, bb) {
  const L = bb.max[2] - bb.min[2];
  const rad = (lo, hi) => {
    let cx = 0, cy = 0, c = 0;
    for (const p of P) if (p[2] >= lo && p[2] <= hi) { cx += p[0]; cy += p[1]; c++; }
    if (!c) return 1e9;
    cx /= c; cy /= c;
    let r = 0;
    for (const p of P) if (p[2] >= lo && p[2] <= hi) r += Math.hypot(p[0] - cx, p[1] - cy);
    return r / c;
  };
  const rFrente = rad(bb.max[2] - L * 0.06, bb.max[2]), rTras = rad(bb.min[2], bb.min[2] + L * 0.06);
  return { rFrente: r3(rFrente), rTras: r3(rTras), canoEmZmais: rFrente < rTras };
}

/* ---------- FRAMING (espelho de game.js _vmFrame) ----------
   NADA de constante hardcodada aqui: V0 e VM_OFF são LIDOS do game.js por regex. Foi
   exatamente o hardcode (V0=62, sem recuoZ, sem trava nearX, sem VM_OFF) que fez este
   auditor medir um enquadramento que não existe mais na tela desde o look CS 1.6. */
function loadV0() {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/game.js'), 'utf8');
  const m = /const\s+VM_FOV_DEFAULT\s*=\s*([\d.]+)\s*;/.exec(src);
  if (!m) throw new Error('VM_FOV_DEFAULT não encontrado em game.js');
  return +m[1];
}
// VM_OFF (game.js): offset base do vm.root em VIEW SPACE. Move a arma E os braços juntos,
// então entra na projeção de tela e no rig do braço — nunca só num dos dois.
// O y é o valor NA REFERÊNCIA 16:9 — ver offYFor() abaixo (espelho de `vmOffY` do game.js).
function loadVmOff() {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/game.js'), 'utf8');
  const m = /const\s+VM_OFF\s*=[\s\S]*?:\s*\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]/.exec(src);
  if (!m) throw new Error('VM_OFF não encontrado em game.js');
  return [+m[1], +m[2], +m[3]];
}
export const V0DEG = loadV0();
export const OFF = loadVmOff();
const V0 = V0DEG * Math.PI / 180;
// vmFovForAspect() mantém tan(fov/2)·aspect CONSTANTE = tan(V0/2)·16/9 em qualquer aspecto:
// por isso H (e a trava nearX que depende dele) não dependem do aspecto.
export const H = Math.tan(V0 / 2) * (16 / 9);          // meia-tangente HORIZONTAL (constante em qq aspecto)
/* OFFSET VERTICAL EM FRAÇÃO DE ALTURA (espelho de `vmOffY`, game.js).
   VM_OFF[1] vale em 16:9 e o offset real escala com a meia-tangente VERTICAL do aspecto:
   offY(a) = VM_OFF[1]·V(a)/V(16:9) = VM_OFF[1]·(16/9)/a. Consequência medível: a fração de
   altura que o offset desloca passa a ser a MESMA nos dois aspectos, e o Δ da VM10 cai de
   0,103 para 0,0931·tanH·tanBarrel ≈ 0,017. Em 16:9 offY == VM_OFF[1]: é por isso que o
   `viewSpace` gravado no JSON (e conferido pela AUD1) continua sendo o de 16:9.
   A FÓRMULA É LIDA DO game.js POR REGEX, não copiada — mesma regra do V0 e do VM_OFF.
   Foi hardcode de fórmula que já fez este auditor medir, por rodadas, um enquadramento que
   não existia na tela. Com a leitura, um `* 1.3` no vmOffY do game.js aparece AQUI (e a
   AUD1 fica vermelha, porque em 16:9 o grip deixa de bater com VM_OFF[1] + gy). */
function loadOffYFn() {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/game.js'), 'utf8');
  const m = /const\s+vmOffY\s*=\s*\(\s*aspect\s*\)\s*=>\s*([^;]+);/.exec(src);
  if (!m) throw new Error('vmOffY não encontrado em game.js — o offset vertical mudou de forma e este auditor está medindo outra tela');
  // eslint-disable-next-line no-new-func
  const f = new Function('VM_OFF', 'aspect', 'return (' + m[1] + ');');
  return (aspect) => f(OFF, aspect);
}
const offYFor = loadOffYFn();
const A_REF = 16 / 9;

function loadFrame() {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/vmattach.js'), 'utf8');
  const i = src.indexOf('export const VM_FRAME = {');
  const j = src.indexOf('\n};', i);
  const body = src.slice(i + 'export const VM_FRAME = '.length, j + 2);
  // eslint-disable-next-line no-new-func
  return new Function('return ' + body)();
}
export const F = loadFrame();
const CLS = F.classOf;

/* ---------- POSE DE MIRA (ADS) — espelho de game.js `_updatePlayer` ----------
   POR QUE ISTO PASSOU A SER MEDIDO. O dono jogou e disse: "algumas armas EM POSIÇÃO DE
   MIRA chegam perto do que seria o ideal da posição da arma". Essa frase é a única
   informação de qualidade que existe sobre o ADS, e até aqui ele não tinha régua NENHUMA:
   a VM17 confere só que `vmAdsRot` zera pitch/yaw, e `vm.ads[id]` (o delta calculado no
   _vmFrame a partir da alça do GLB) é CÓDIGO MORTO — nada lê. Quem posiciona a arma em
   mira é `this._adsPose[STATIC_CLASS[arma]]`, aplicado ao vm.root, e ninguém nunca projetou
   isso na tela. Sem projeção não dá pra responder "o ADS está mais perto do CS do que o
   quadril?", que é a pergunta que decide o alvo da pose de quadril.

   O QUE MUDA NO ADS CHEIO (adsF = 1), lido do game.js e não assumido:
     • vm.root.position += (pose.x, pose.y, pose.z)      [o offset da classe]
     • vm.root.scale     = pose.s                        [scale-down, hoje 1 nas 4 classes]
     • grupo da arma: rotation = (0, 0, roll)            [vmAdsRot zera pitch e yaw — VM17]
   O grupo NÃO muda de posição: (gx, gy, −Zg) é do _vmFrame, que só roda quando o aspecto
   muda. Por isso o ADS é medível com a MESMA cadeia do quadril, trocando duas coisas.

   AS DUAS TABELAS SÃO LIDAS DO game.js POR REGEX/eval, pela mesma razão do V0/VM_OFF: uma
   cópia aqui viraria ficção na primeira vez que alguém mexesse na pose. `_adsPose` é um
   literal de objeto; STATIC_CLASS é montado por laços, então o BLOCO INTEIRO é avaliado
   (é a única forma de o espelho seguir uma reclassificação de arma — por exemplo a md97
   saindo de 'shotgun' — em vez de fossilizar a tabela antiga). */
function loadAdsPose() {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/game.js'), 'utf8');
  const i = src.indexOf('this._adsPose = {');
  if (i < 0) throw new Error('_adsPose não encontrado em game.js — a pose de mira mudou de forma e este auditor está medindo outro ADS');
  const j = src.indexOf('\n    };', i);
  // eslint-disable-next-line no-new-func
  return new Function('return ' + src.slice(i + 'this._adsPose = '.length, j + 6))();
}
function loadStaticClass() {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/game.js'), 'utf8');
  const i = src.indexOf('const STATIC_CLASS = {};');
  const fim = src.indexOf("STATIC_CLASS['knife']");
  if (i < 0 || fim < 0) throw new Error('STATIC_CLASS não encontrado em game.js');
  const body = src.slice(i, src.indexOf('\n', fim) + 1);
  // eslint-disable-next-line no-new-func
  return new Function(body + '\nreturn STATIC_CLASS;')();
}
export const ADS_POSE = loadAdsPose();
export const ADS_CLS = loadStaticClass();
// pose efetiva da arma no ADS cheio (game.js: `this._adsPose[STATIC_CLASS[p.weapon]] || this._adsPose._hip`)
export const adsPoseOf = (id) => ADS_POSE[ADS_CLS[id]] || ADS_POSE._hip;
function frame(id, bb, S) {
  const c = CLS[id] || 'rifle';
  const t = F.cls[c];
  const back = S * Math.max(0, -bb.min[2]);        // coronha atrás do grip (m)
  const fwd = S * Math.max(0.001, bb.max[2]);      // cano à frente do grip (m)
  let Zg = Math.max(back + t.clear, t.minz, fwd / t.fwdTan) * (F.zMul[id] || 1);
  Zg *= F.recuoZ;                                  // game.js:1141 — recuo de tamanho aparente
  // TRAVA DE BORDA nearX (game.js:1143-1148): a coronha (ponto mais perto da lente) pode
  // projetar no máximo nearX·halfTanH. halfTanH = H porque vmFovForAspect trava a
  // meia-tangente horizontal — a trava vale igual em 16:9 e 3:2.
  {
    const lim = F.nearX * H;
    if (lim > t.tanH + 1e-3 && back > 0) Zg = Math.max(Zg, (back * lim) / (lim - t.tanH));
  }
  const gx = Zg * t.tanH;
  const gy = -gx * F.tanBarrel;                    // ângulo do cano na tela = atan(|gy|/gx) (independe do aspecto)
  /* ROTAÇÃO DO GRUPO — espelho exato de game.js `_vmFrame`:
       faca:  g.rotation.set(knifeRot[0], knifeRot[1], knifeRot[2])
       resto: g.rotation.set(t.pitch, t.yaw, t.roll)
     A FACA ENTRA AGORA (era 0,0,0 aqui). Um crítico mediu que mutar VM_FRAME.knifeRot para
     [1.5,1.5,1.5] passava o portão inteiro verde: o auditor projetava a faca SEM a pose, ou
     seja media uma faca que não existe na tela. Com o pitch/yaw desta rodada a cadeia de
     rotação passou a existir de verdade no espelho, e usar knifeRot aqui custou 3 linhas —
     agora VM1/VM3/VM5/VM12/VM16 medem a faca RENDERIZADA e knifeRot vira mensurável. */
  const eKnife = id === 'knife';
  const kr = F.knifeRot || [0, 0, 0];
  return { Zg, gx, gy, cls: c,
    roll: eKnife ? kr[2] : (t.roll || 0), pitch: eKnife ? kr[0] : (t.pitch || 0), yaw: eKnife ? kr[1] : (t.yaw || 0) };
}
/* rotação do GRUPO da arma: Euler XYZ = RX(pitch)·RY(yaw)·RZ(roll), a MESMA convenção do
   three.js (Object3D.rotation com order 'XYZ'). Com pitch=yaw=0 sobra exatamente o roll de
   antes — este espelho é uma extensão do anterior, não uma reescrita. */
export function rotXYZ(f, v) {
  const cz = Math.cos(f.roll || 0), sz = Math.sin(f.roll || 0);
  const cy = Math.cos(f.yaw || 0), sy = Math.sin(f.yaw || 0);
  const cx = Math.cos(f.pitch || 0), sx = Math.sin(f.pitch || 0);
  const x1 = v[0] * cz - v[1] * sz, y1 = v[0] * sz + v[1] * cz, z1 = v[2];
  const x2 = x1 * cy + z1 * sy, y2 = y1, z2 = -x1 * sy + z1 * cy;
  return [x2, y2 * cx - z2 * sx, y2 * sx + z2 * cx];
}
// gun-space -> view space (rw leva rotation.y = π: x e z invertem; depois a rotação do grupo
// — roll, que gira em torno do eixo da câmera, mais pitch/yaw, que SÃO inclinação própria da
// arma e desviam a boca de propósito; por fim VM_OFF, que é a posição do vm.root —
// game.js:3995 — e portanto entra em TUDO que é medido na tela).
function toView(p, S, f, aspect = A_REF) {
  const w = rotXYZ(f, [-S * p[0], S * p[1], -S * p[2]]);
  return [OFF[0] + f.gx + w[0], offYFor(aspect) + f.gy + w[1], OFF[2] - f.Zg + w[2]];
}
// grip em VIEW SPACE (com VM_OFF) — o ponto que a régua chama de "gripTela".
const gripView = (f, aspect = A_REF) => [OFF[0] + f.gx, offYFor(aspect) + f.gy, OFF[2] - f.Zg];
/* MESMA CADEIA, NO ADS CHEIO (ver o bloco loadAdsPose acima). Duas diferenças e só:
   pitch/yaw do grupo zerados (vmAdsRot em adsF=1) e o vm.root deslocado/escalado pela pose
   da classe. Escrever isto como uma função separada — e não um `if (ads)` dentro do toView —
   é deliberado: o caminho de QUADRIL que a AUD1 confere contra o game.js fica byte a byte o
   mesmo, e o ADS entra como medida NOVA em vez de risco de regressão na régua antiga. */
export function toViewAds(p, S, f, id, aspect = A_REF) {
  const pz = adsPoseOf(id);
  const w = rotXYZ({ roll: f.roll, pitch: 0, yaw: 0 }, [-S * p[0], S * p[1], -S * p[2]]);
  const e = pz.s ?? 1;
  return [OFF[0] + pz.x + e * (f.gx + w[0]),
    offYFor(aspect) + pz.y + e * (f.gy + w[1]),
    OFF[2] + pz.z + e * (-f.Zg + w[2])];
}
export const gripViewAds = (f, id, aspect = A_REF) => {
  const pz = adsPoseOf(id), e = pz.s ?? 1;
  return [OFF[0] + pz.x + e * f.gx, offYFor(aspect) + pz.y + e * f.gy, OFF[2] + pz.z - e * f.Zg];
};

export function project(p, aspect) {
  const V = H / aspect;
  const z = -p[2];
  return [0.5 + 0.5 * (p[0] / z) / H, 0.5 - 0.5 * (p[1] / z) / V];
}
/* ── RASTERIZAÇÃO DA SILHUETA ────────────────────────────────────────────────
   A VERSÃO ANTERIOR MEDIA ERRADO E O ERRO NÃO ERA CONSTANTE. Ela marcava a célula de
   cada VÉRTICE numa grade 128² e dilatava 1 célula em volta para tapar os buracos da
   amostragem esparsa (4000 vértices). O fator de inflação disso depende da densidade de
   vértices projetada, que varia por modelo: um crítico rasterizou os triângulos de verdade
   e mediu faca 1,90× e m92 1,15× — ~1,5× na média, mas DESIGUAL. Com a referência agora
   medida em pixel de imagem (tools/eval/ref-measure.py: AK 8,11%, M4 9,78%, Vandal 13,09%),
   escolher o teto da VM5 com o medidor velho seria calibrar contra uma régua torta.
   Aqui a face é rasterizada: célula ligada se o CENTRO dela cai dentro do triângulo (mais
   as células dos 3 vértices, para não perder triângulo menor que a célula). O teste de
   centro é não-viesado na borda (metade entra, metade sai), então a área converge para a
   área geométrica da união em vez de para a área dilatada.
   N=256 sobre [0,1]²: o erro de borda de um rifle a 10% de tela fica < 0,15 p.p. */
function rasteriza(pts, tris, N, x0 = 0, y0 = 0, x1 = 1, y1 = 1) {
  const grid = new Uint8Array(N * N);
  const sx = N / (x1 - x0), sy = N / (y1 - y0);
  const set = (i, j) => { if (i >= 0 && i < N && j >= 0 && j < N) grid[j * N + i] = 1; };
  for (const t of tris) {
    const A = pts[t[0]], B = pts[t[1]], C = pts[t[2]];
    if (!A || !B || !C) continue;
    const ax = (A[0] - x0) * sx, ay = (A[1] - y0) * sy;
    const bx = (B[0] - x0) * sx, by = (B[1] - y0) * sy;
    const cx = (C[0] - x0) * sx, cy = (C[1] - y0) * sy;
    set(ax | 0, ay | 0); set(bx | 0, by | 0); set(cx | 0, cy | 0);
    const lo = Math.max(0, Math.floor(Math.min(ax, bx, cx))), hi = Math.min(N - 1, Math.ceil(Math.max(ax, bx, cx)));
    const to = Math.max(0, Math.floor(Math.min(ay, by, cy))), bo = Math.min(N - 1, Math.ceil(Math.max(ay, by, cy)));
    if (hi < lo || bo < to) continue;
    const d = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(d) < 1e-12) continue;
    const inv = 1 / d;
    for (let j = to; j <= bo; j++) {
      const py = j + 0.5;
      for (let i = lo; i <= hi; i++) {
        const px = i + 0.5;
        const w0 = ((bx - ax) * (py - ay) - (by - ay) * (px - ax)) * inv;
        const w1 = ((px - ax) * (cy - ay) - (py - ay) * (cx - ax)) * inv;
        if (w0 >= 0 && w1 >= 0 && w0 + w1 <= 1) grid[j * N + i] = 1;
      }
    }
  }
  return grid;
}
// Área OCUPADA na tela (fração 0-1) — mesma grandeza que o `areaPct` do ref-measure.py.
// `tris` é OBRIGATÓRIO de propósito: chamar sem ele voltaria a medir nuvem de pontos, que é
// exatamente o defeito que esta rodada consertou. Melhor quebrar alto do que medir torto.
export function screenArea(pts, tris, N = 256) {
  if (!tris || !tris.length) throw new Error('screenArea: sem triângulos — o medidor de nuvem de pontos foi REMOVIDO (inflava 1,15-1,90×, ver comentário acima)');
  const g = rasteriza(pts, tris, N);
  let c = 0; for (let i = 0; i < g.length; i++) c += g[i];
  return c / (N * N);
}
/* MÉTRICAS DA SILHUETA NO MESMO FORMATO DO ref-measure.py (é o que torna "nosso × referência"
   uma comparação e não uma analogia). Tudo medido sobre as células VISÍVEIS ([0,1]²), porque
   é só isso que a foto de referência contém — o que está fora do quadro é invisível lá.
   `anguloEixoGraus` é PCA em coordenadas de PIXEL (x multiplicado pelo aspecto), idêntico ao
   PCA do ref-measure.py; `foraPct` é a fração da silhueta que cai fora do quadro e SÓ existe
   do nosso lado (na imagem de referência é impossível medir — ver VM16). */
export function silhueta(pts, tris, aspect, N = 256, grip = null, boca = null) {
  const g = rasteriza(pts, tris, N);
  let n = 0, sx = 0, sy = 0, minx = 2, maxx = -1, miny = 2, maxy = -1;
  const cells = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    if (!g[j * N + i]) continue;
    const x = (i + 0.5) / N, y = (j + 0.5) / N;
    n++; sx += x; sy += y; cells.push(i, j);
    if (x < minx) minx = x; if (x > maxx) maxx = x;
    if (y < miny) miny = y; if (y > maxy) maxy = y;
  }
  if (!n) return { areaPct: 0, vazio: true };
  const mx = sx / n, my = sy / n;
  // PCA em pixel: x·aspecto, y·1 (o ref-measure usa xs/ys em pixel, e W/H = aspecto)
  let cxx = 0, cxy = 0, cyy = 0;
  for (let k = 0; k < cells.length; k += 2) {
    const dx = ((cells[k] + 0.5) / N - mx) * aspect, dy = (cells[k + 1] + 0.5) / N - my;
    cxx += dx * dx; cxy += dx * dy; cyy += dy * dy;
  }
  const tr = cxx + cyy, det = cxx * cyy - cxy * cxy;
  const lam = tr / 2 + Math.sqrt(Math.max(0, tr * tr / 4 - det));
  let ang = Math.abs(Math.atan2(lam - cxx, cxy) * 180 / Math.PI);
  if (Math.abs(cxy) < 1e-12) ang = cxx >= cyy ? 0 : 90;
  if (ang > 90) ang = 180 - ang;
  // área TOTAL (dentro + fora do quadro) para o `foraPct`: mesma rasterização, domínio = bbox
  let bx0 = 9, by0 = 9, bx1 = -9, by1 = -9;
  for (const p of pts) { if (p[0] < bx0) bx0 = p[0]; if (p[0] > bx1) bx1 = p[0]; if (p[1] < by0) by0 = p[1]; if (p[1] > by1) by1 = p[1]; }
  const gt = rasteriza(pts, tris, N, bx0, by0, bx1, by1);
  let nt = 0; for (let i = 0; i < gt.length; i++) nt += gt[i];
  const areaTotal = (nt / (N * N)) * (bx1 - bx0) * (by1 - by0);
  const areaTela = n / (N * N);
  /* FATIAS DE BORDA — a medida de "sai de raspão" da VM16.
     `fatiaDir` = altura (em fração da tela) da faixa vertical que a silhueta ocupa no 1%
     mais à direita do quadro; `fatiaBaixo` = idem na largura, no 1% mais abaixo. As DUAS
     são mensuráveis na foto de referência (ref-overlay.py mede exatamente isto nas 3
     máscaras: fatiaDir 0,053 / 0,053 / 0,095 e fatiaBaixo 0,000 / 0,383 / 0,480), e é por
     elas que dá para bilhar "a coronha sai pela quina" sem inventar nada sobre o que está
     FORA do quadro — que a imagem não mostra. */
  const faixa = Math.max(1, Math.round(N * 0.01));
  let dy0 = -1, dy1 = -1, bx = -1, bx1c = -1;
  for (let j = 0; j < N; j++) for (let i = N - faixa; i < N; i++) if (g[j * N + i]) { if (dy0 < 0) dy0 = j; dy1 = j; break; }
  for (let i = 0; i < N; i++) for (let j = N - faixa; j < N; j++) if (g[j * N + i]) { if (bx < 0) bx = i; bx1c = i; break; }
  /* LEGIBILIDADE (VM18) — ESPELHO EXATO de `legibilidade()` do ref-measure.py.
     A definição inteira (por que existe, o que cada número quer dizer, e a ressalva do grip
     como PISO na AK/Vandal) está lá; aqui só o cálculo, sobre as MESMAS células visíveis que
     o ref-measure usa na foto. Coordenada de PIXEL (x·aspecto, y), eixo u = grip→boca:
       frenteVisivel = max(s)   quanto do trecho grip→boca aparece  (ref 1,000-1,010)
       trasVisivel   = -min(s)  quanto de arma aparece ATRÁS do grip (ref 0,298-0,669)
       gordura       = Δt/Δs    espessura ÷ comprimento da silhueta  (ref 0,684-0,948)
     `gordura` é o número que separa "um cano atravessando a tela" de "uma arma": área e
     posição já eram medidas (VM5/VM1/VM12) e uma fita fina passa em todas elas. */
  let leg = null;
  if (grip && boca) {
    const ux = (boca[0] - grip[0]) * aspect, uy = boca[1] - grip[1];
    const L = Math.hypot(ux, uy);
    if (L > 1e-6) {
      const ex = ux / L, ey = uy / L;
      let smin = 9e9, smax = -9e9, tmin = 9e9, tmax = -9e9;
      for (let k2 = 0; k2 < cells.length; k2 += 2) {
        const dx = ((cells[k2] + 0.5) / N - grip[0]) * aspect, dy = (cells[k2 + 1] + 0.5) / N - grip[1];
        const s = (dx * ex + dy * ey) / L, t = (-dx * ey + dy * ex) / L;
        if (s < smin) smin = s; if (s > smax) smax = s;
        if (t < tmin) tmin = t; if (t > tmax) tmax = t;
      }
      const ds = smax - smin, dt = tmax - tmin;
      leg = { eixoGripBoca: L, frenteVisivel: smax, trasVisivel: -smin, compVisivel: ds, espessura: dt, gordura: ds > 1e-9 ? dt / ds : 0 };
    }
  }
  return {
    areaPct: 100 * areaTela,
    bordaEsq: minx, bordaDir: maxx, topo: miny, base: maxy,
    anguloEixoGraus: ang,
    leg,
    foraPct: areaTotal > 0 ? 100 * Math.max(0, 1 - areaTela / areaTotal) : 0,
    fatiaDir: dy0 < 0 ? 0 : (dy1 - dy0 + 1) / N,
    fatiaBaixo: bx < 0 ? 0 : (bx1c - bx + 1) / N,
    bboxDir: bx1, bboxBase: by1,
  };
}
function convex(pts) {
  if (pts.length < 3) return pts;
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  lo.pop(); up.pop();
  return lo.concat(up);
}
function clipRect(poly) {
  const edges = [[1, 0, 0], [-1, 0, 1], [0, 1, 0], [0, -1, 1]];   // x>=0, x<=1, y>=0, y<=1
  let out = poly;
  for (const [a, b, c] of edges) {
    const inp = out; out = [];
    const f = (p) => a * p[0] + b * p[1] + c;
    for (let i = 0; i < inp.length; i++) {
      const P0 = inp[i], P1 = inp[(i + 1) % inp.length], f0 = f(P0), f1 = f(P1);
      if (f0 >= 0) out.push(P0);
      if ((f0 >= 0) !== (f1 >= 0)) { const t = f0 / (f0 - f1); out.push([P0[0] + (P1[0] - P0[0]) * t, P0[1] + (P1[1] - P0[1]) * t]); }
    }
    if (!out.length) return [];
  }
  return out;
}

/* ---------- braços FP (models/fparms/arms.glb): ombro e alcance ----------
   PORQUÊ: a reclamação nº1 do dono é "mãos soltas no ar". Isso acontece quando o grip
   fica além do alcance do braço e o CCD do handik para no limite. Aqui medimos, na pose
   de bind, a posição do ombro direito e o comprimento braço+antebraço no MESMO espaço do
   vm.root (normalização de fparms.js: altura 1.72·0.93, pés em y=0, grupo em y=-1.48,
   z=+0.02, girado π). Se dist(ombro,grip) > alcance, a mão flutua — e o audit reprova. */
export function armRig() {
  const g = readGLB(path.join(ROOT, 'public/models/fparms/arms.glb'));
  const nodes = g.json.nodes, world = {}, all = [];
  const walk = (ni, M) => {
    const nd = nodes[ni];
    const W = mul(M, nd.matrix ? mat4FromArray(nd.matrix) : trs(nd.translation, nd.rotation, nd.scale));
    if (nd.name) world[nd.name] = [W[12], W[13], W[14]];
    all.push([W[12], W[13], W[14]]);
    if (nd.mesh !== undefined) for (const prim of g.json.meshes[nd.mesh].primitives) {
      if (prim.attributes.POSITION === undefined) continue;
      const p = accessor(g, prim.attributes.POSITION);
      for (let i = 0; i < p.length; i += 3) all.push(apply(W, p[i], p[i + 1], p[i + 2]));
    }
    for (const c of nd.children || []) walk(c, W);
  };
  for (const r of g.json.scenes[g.json.scene || 0].nodes) walk(r, ident());
  const bb = bbox(all);
  const s = (1.72 * 0.93) / ((bb.max[1] - bb.min[1]) || 1);
  const y0 = -bb.min[1] * s;
  // model -> vm.root: escala s, sobe y0, gira π em Y (x,z invertem), desloca (0,-1.48,0.02)
  // ...e depois VM_OFF (posição do vm.root): os braços são filhos do MESMO grupo que a arma,
  // então o offset entra nos dois — as distâncias ombro→grip não mudam, mas a projeção do
  // antebraço na tela sim.
  // y no offset de REFERÊNCIA (16:9); o delta por aspecto é somado em foreArmEdge. As
  // DISTÂNCIAS ombro→grip não mudam com o aspecto (grip e ombro são filhos do mesmo root
  // e recebem o mesmo offset); só a projeção na tela precisa do aspecto.
  const toRoot = (p) => [OFF[0] - p[0] * s, offYFor(A_REF) + p[1] * s + y0 - 1.48, OFF[2] - p[2] * s + 0.02];
  const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const sh = toRoot(world.RightShoulder), ar = toRoot(world.RightArm), fo = toRoot(world.RightForeArm), ha = toRoot(world.RightHand);
  return { cotoveloL: toRoot(world.LeftArm), ombro: sh, alcance: d(sh, ar) + d(ar, fo) + d(fo, ha), ombroL: toRoot(world.LeftShoulder), alcanceL: d(toRoot(world.LeftShoulder), toRoot(world.LeftArm)) + d(toRoot(world.LeftArm), toRoot(world.LeftForeArm)) + d(toRoot(world.LeftForeArm), toRoot(world.LeftHand)) };
}
export const ARM = armRig();
// Onde o ANTEBRAÇO sai da tela: segmento grip->ombro amostrado (o ombro fica com z>0, atrás
// da lente — o braço necessariamente varre para fora do quadro pela direita/baixo).
function foreArmEdge(grip, aspect) {
  let mx = 0, my = 0;
  // o ombro é gravado com o offset de 16:9; no aspecto corrente ele desce junto com o grip
  const dOff = offYFor(aspect) - offYFor(A_REF);
  const om = [ARM.ombro[0], ARM.ombro[1] + dOff, ARM.ombro[2]];
  for (let t = 0; t <= 1.0001; t += 0.02) {
    const p = [grip[0] + (om[0] - grip[0]) * t, grip[1] + (om[1] - grip[1]) * t, grip[2] + (om[2] - grip[2]) * t];
    if (p[2] > -0.03) break;                 // atrás da lente: já saiu do quadro
    const q = project(p, aspect);
    if (q[0] > mx) mx = q[0];
    if (q[1] > my) my = q[1];
  }
  return [mx, my];
}

function r3(v) { return Math.round(v * 1000) / 1000; }
function r2(v) { return Math.round(v * 100) / 100; }

/* ---------- execução ---------- */
// PORQUE main(): o vm-solve.mjs IMPORTA a geometria daqui (gunSpace/muzzleOf/sightOf/bbox)
// para não manter uma 2ª cópia da matemática — e importar não pode disparar a escrita do
// vm_mint_audit.json. Rodar o arquivo direto (`node vm-mint-audit.mjs`) faz exatamente o
// mesmo que antes.
export function main() {
  const ONE_H = new Set(['pistol', 'deagle', 'revolver38', 'knife']);
  const ASPECTS = { '16:9': 16 / 9, '3:2': 3 / 2 };
  const report = { gerado: new Date().toISOString(), lente: { V0deg: V0DEG, halfTanH: +H.toFixed(4), vmOff: OFF, offYForma: 'VM_OFF[1]*(16/9)/aspecto (fração de altura; 16:9 == VM_OFF[1])', offY: { '16:9': +offYFor(16 / 9).toFixed(4), '3:2': +offYFor(3 / 2).toFixed(4) } }, tuning: F, armas: {} };
  const ids = Object.keys(CFG).filter((id) => fs.existsSync(path.join(WDIR, id + '.glb')));
  for (const id of ids) {
    const { P, T, cfg } = gunSpace(id);
    const bb = bbox(P);
    const mz = muzzleOf(P, bb), sg = sightOf(P, bb, mz);
    const S = F.vmScale * (cfg.vm ?? 1);
    const f = frame(id, bb, S);
    const vMz = toView(mz, S, f), vSg = toView(sg, S, f);
    // SEM SUBAMOSTRAGEM: a silhueta é rasterizada TRIÂNGULO A TRIÂNGULO (ver screenArea),
    // e um passo de amostragem quebraria os índices das faces. 6-8 mil vértices por arma
    // custam ~30 ms — a subamostragem só existia porque o medidor velho era por ponto.
    const sub = P.map((p) => toView(p, S, f));
    const gripW = gripView(f);
    // mão de apoio: FORE_T do caminho grip->boca, FORE_DROP abaixo da linha do cano (fparms.js)
    // Réplica do clamp de alcance do poseToWeapon: desliza t pelo eixo até caber no braço L.
    const FORE_DROP = 0.030, reachL = ARM.alcanceL * 0.94;
    let FORE_T = 0.42, foreV = null, dOmbroL = 0;
    for (let i = 0; i < 8; i++) {
      foreV = toView([mz[0] * FORE_T, mz[1] * FORE_T - FORE_DROP, mz[2] * FORE_T], S, f);
      dOmbroL = Math.hypot(foreV[0] - ARM.ombroL[0], foreV[1] - ARM.ombroL[1], foreV[2] - ARM.ombroL[2]);
      if (dOmbroL <= reachL || FORE_T <= 0.14) break;
      FORE_T -= 0.045;
    }
    const dOmbro = Math.hypot(gripW[0] - ARM.ombro[0], gripW[1] - ARM.ombro[1], gripW[2] - ARM.ombro[2]);
    const bc = barrelCheck(P, bb);
    const entry = {
      classe: f.cls,
      cano: bc,
      alcanceBraco: { dist: r3(dOmbro), max: r3(ARM.alcance), folga: r3(ARM.alcance - dOmbro) },
      alcanceApoio: ONE_H.has(id) ? null : { foreT: r2(FORE_T), dist: r3(dOmbroL), max: r3(reachL), folga: r3(reachL - dOmbroL), guardaMao: foreV.map(r3) }, len: cfg.len, gripZ: cfg.gripZ, vm: cfg.vm ?? 1, escalaVM: +S.toFixed(3),
      gunSpace: { bboxMin: bb.min.map(r3), bboxMax: bb.max.map(r3), boca: mz.map(r3), alca: sg.map(r3) },
      viewSpace: { grip: gripView(f).map(r3), boca: vMz.map(r3), alca: vSg.map(r3) },
      coronhaZ: r3(OFF[2] - f.Zg + S * Math.max(0, -bb.min[2])),   // tem que ser < 0 (nunca atrás da lente)
      anguloCanoGraus: r2(Math.atan2(-f.gy, f.gx) * 180 / Math.PI),
      adsDelta: [-vSg[0], -vSg[1], F.adsPullZ].map(r3),    // leva a ALÇA ao centro da tela
      aspectos: {},
    };
    for (const [an, asp] of Object.entries(ASPECTS)) {
      // reprojeta os vértices COM o offset do aspecto (sub veio no offset de 16:9)
      const dOff = offYFor(asp) - offYFor(A_REF);
      const pts = sub.map((p) => project([p[0], p[1] + dOff, p[2]], asp));
      let mnx = 9, mxx = -9, mny = 9, mxy = -9;
      for (const q of pts) { if (q[0] < mnx) mnx = q[0]; if (q[0] > mxx) mxx = q[0]; if (q[1] < mny) mny = q[1]; if (q[1] > mxy) mxy = q[1]; }
      // sil = a MESMA medição que o ref-measure.py faz na foto (só o que é VISÍVEL).
      // grip/boca entram porque a LEGIBILIDADE (VM18) é medida no eixo da própria arma.
      const gT = project(gripView(f, asp), asp), bT = project([vMz[0], vMz[1] + dOff, vMz[2]], asp);
      const sil = silhueta(pts, T, asp, 256, gT, bT);
      /* ADS CHEIO no MESMO aspecto (ver toViewAds). Só as grandezas que respondem à
         pergunta do dono — "a pose de mira está mais perto do ideal que a de quadril?":
         área, borda esquerda, boca, eixo e as três da legibilidade. */
      const ptsA = P.map((q) => project(toViewAds(q, S, f, id, asp), asp));
      const gA = project(gripViewAds(f, id, asp), asp);
      const bA = project(toViewAds(mz, S, f, id, asp), asp);
      const silA = silhueta(ptsA, T, asp, 256, gA, bA);
      entry.aspectos[an] = {
        bordaEsq: r3(mnx), bordaDir: r3(mxx),
        topo: r3(mny), base: r3(mxy),
        areaPct: r2(sil.areaPct),
        // ── campos comparáveis 1:1 com tools/eval/ref_viewmodel.json ──────────────
        silBordaEsq: r3(sil.bordaEsq),          // borda esq da silhueta VISÍVEL (ref: bordaEsq)
        anguloEixoGraus: r2(sil.anguloEixoGraus), // PCA em pixel (ref: anguloEixoGraus)
        foraPct: r2(sil.foraPct),               // % da silhueta FORA do quadro (só nosso lado)
        fatiaDir: r3(sil.fatiaDir),             // VM16: quanto sai pela LATERAL (ref 0,053-0,095)
        fatiaBaixo: r3(sil.fatiaBaixo),         // VM16: quanto sai por BAIXO (ref 0,000-0,480)
        // ── VM18 LEGIBILIDADE, comparável 1:1 com ref_viewmodel.json -> refs[].legibilidade ──
        frenteVisivel: r3(sil.leg.frenteVisivel),   // ref 1,000-1,010
        trasVisivel: r3(sil.leg.trasVisivel),       // ref 0,298-0,669
        gordura: r3(sil.leg.gordura),               // ref 0,684-0,948  <- "só um cano" mora aqui
        // ── ADS CHEIO (adsF=1): a pose que o dono disse estar "perto do ideal" ──
        ads: {
          areaPct: r2(silA.areaPct), silBordaEsq: r3(silA.bordaEsq),
          anguloEixoGraus: r2(silA.anguloEixoGraus),
          gripTela: gA.map(r3), bocaTela: bA.map(r3),
          frenteVisivel: r3(silA.leg.frenteVisivel), trasVisivel: r3(silA.leg.trasVisivel),
          gordura: r3(silA.leg.gordura), fatiaDir: r3(silA.fatiaDir),
        },
        cruzaDir: mxx > 0.995,                  // ref: cruzaBordaDireita (3/3 = true)
        cruzaBaixo: mxy > 0.995,
        gripTela: project(gripView(f, asp), asp).map(r3),
        bracoBordaDir: r3(foreArmEdge(gripView(f, asp), asp)[0]),
        bracoBordaBaixo: r3(foreArmEdge(gripView(f, asp), asp)[1]),
        bocaTela: project([vMz[0], vMz[1] + dOff, vMz[2]], asp).map(r3),
        // ADS por ASPECTO: adsDelta é gravado no JSON na referência 16:9, mas o que o jogo
        // faz é levar a ALÇA ao eixo da câmera no aspecto CORRENTE. Sem o dOff dos dois
        // lados, o cheque acusaria 26 falsos positivos em 3:2 — a alça estaria centrada na
        // tela e o auditor diria que não. Ver `vmOffY` (game.js).
        adsAlcaTela: project([vSg[0] + entry.adsDelta[0], (vSg[1] + dOff) - (vSg[1] + dOff), vSg[2] + entry.adsDelta[2]], asp).map(r3),
      };
    }
    report.armas[id] = entry;
}

/* ---------- veredito ---------- */
const fails = [];
for (const [id, e] of Object.entries(report.armas)) {
  if (!e.cano.canoEmZmais) fails.push(`${id}: rot INVERTIDO — a ponta +Z é a grossa (r ${e.cano.rFrente} vs ${e.cano.rTras}) => cano de ré no viewmodel`);
  if (e.coronhaZ >= -0.01) fails.push(`${id}: coronha atrás da lente (z=${e.coronhaZ})`);
  /* OS LIMITES DESTE VEREDITO PASSARAM A SER OS MESMOS DA REFERÊNCIA MEDIDA.
     Eles eram números ASSERIDOS (ângulo do cano 11-14°, borda esq 0,58-0,68, área 4,5-10,5%)
     e discordavam do portão — duas réguas no mesmo repo dando veredito diferente sobre o
     mesmo pixel é como se perde uma rodada. Agora vêm de tools/eval/ref_viewmodel.json,
     exatamente como as VM1/VM3/VM5/VM16 de tools/eval/invariants.mjs (procedência lá).
     O `anguloCanoGraus` SAIU do veredito: ele não é o ângulo que o olho vê (é
     atan(tanBarrel), a direção do deslocamento do grupo dentro do vm.root) e não tem
     correspondente na referência. Quem manda no ângulo agora é `anguloEixoGraus`. */
  for (const [an, a] of Object.entries(e.aspectos)) {
    if (a.silBordaEsq < 0.50 || a.silBordaEsq > 0.60) fails.push(`${id} ${an}: borda esq da silhueta ${a.silBordaEsq} (ref 0,520-0,565)`);
    if (a.anguloEixoGraus < 22 || a.anguloEixoGraus > 42) fails.push(`${id} ${an}: eixo ${a.anguloEixoGraus}° (ref CS 27,3° e 34,8°)`);
    if (a.fatiaDir < 0.02 || a.fatiaDir > 0.20) fails.push(`${id} ${an}: fatia na borda direita ${a.fatiaDir} (ref 0,053-0,095)`);
    if (a.bracoBordaDir < 0.99) fails.push(`${id} ${an}: antebraço não sai pela borda direita (${a.bracoBordaDir})`);
    /* PISO CONDICIONAL — espelho exato da VM5 (invariants.mjs). 4% é PISO DE COBERTURA (a
       arma não pode sumir da tela); 6% só para malha tão gorda quanto a referência
       (gordura >= 0,684, piso medido da VM18). Quem gateia ESCALA agora é a distância da
       boca até a mira, logo abaixo — área não distingue arma pequena inteira de pedaço
       ampliado de arma grande, e o foraPct desta mesma linha mostra por quê. */
    const lim = [(a.gordura >= 0.684 ? 6 : 4), 16];
    if (a.areaPct < lim[0] || a.areaPct > lim[1]) fails.push(`${id} ${an}: área ${a.areaPct}% (alvo ${lim[0]}-${lim[1]}, ref 9,76-13,09; gordura ${a.gordura})`);
    /* VM20: distância da boca do cano até a mira, em frações de ALTURA de tela.
       ref_viewmodel.json -> boca[]/aspecto: 0,103 (AK) · 0,131 (M4) · 0,277 (Vandal). */
    const asp = an === '3:2' ? 3 / 2 : 16 / 9;
    const dMira = Array.isArray(a.bocaTela) ? Math.hypot((a.bocaTela[0] - 0.5) * asp, a.bocaTela[1] - 0.5) : null;
    if (dMira != null && (dMira < 0.100 || dMira > 0.290)) fails.push(`${id} ${an}: boca a ${dMira.toFixed(3)} da mira (faixa 0,100-0,290; ref medida 0,103-0,277)`);
    const ads = a.adsAlcaTela;
    if (Math.abs(ads[0] - 0.5) > 0.012 || Math.abs(ads[1] - 0.5) > 0.012) fails.push(`${id} ${an}: ADS fora do centro ${ads}`);
  }
}
for (const [id, e] of Object.entries(report.armas)) {
  if (e.alcanceBraco.folga < 0.02) fails.push(`${id}: grip fora do alcance do braço R (folga ${e.alcanceBraco.folga} m) -> MÃO SOLTA NO AR`);
  if (e.alcanceApoio && e.alcanceApoio.folga < -0.005) fails.push(`${id}: guarda-mão fora do alcance do braço L (folga ${e.alcanceApoio.folga} m) -> MÃO SOLTA NO AR`);
}
report.braco = ARM;
report.reprovacoes = fails;
fs.writeFileSync(path.join(ROOT, 'tools/eval/vm_mint_audit.json'), JSON.stringify(report, null, 1));
console.log(`armas: ${ids.length}   reprovações: ${fails.length}`);
for (const f of fails.slice(0, 40)) console.log('  ✗', f);
const t = (id) => { const e = report.armas[id]; if (!e) return; const a = e.aspectos['16:9'], b = e.aspectos['3:2']; console.log(`${id.padEnd(11)} ${e.classe.padEnd(8)} esq=${a.bordaEsq}/${b.bordaEsq} braco=${a.bracoBordaDir} area=${a.areaPct}/${b.areaPct}% cano=${e.anguloCanoGraus}° coronhaZ=${e.coronhaZ} folgaBraco=${e.alcanceBraco.folga}`); };
console.log('');
for (const id of ids) t(id);
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) main();
