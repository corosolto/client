#!/usr/bin/env node
/* Roster dos emotes de captura: TODO corpo (public/models/characters) e TODA skin aprovada
   do manifesto tocam os 8 clipes pelo runtime real (glbchars.js em Node) e, em 16 instantes
   de cada clipe, a malha é skinnada na CPU (a conta do SkinnedMesh do three) para medir:
     piso    menor vértice em relação ao chão do grupo (cm; negativo = enterra)
     flutua  (clipes em pé) maior altura do vértice mais baixo sobre o chão (cm)
     peNoAr  (clipes em pé) maior altura do pé/dedo mais baixo sobre o chão (cm): cauda ou
             capa sustentando o corpo com os dois pés no ar
     peIdle  pé/dedo mais baixo − o do idle no pior instante (cm; informativo: o idle de
             alguns corpos já está fora do chão — cuca −49, canarinho-cyborg +12)
     quadril deslocamento horizontal máximo do Hips ao eixo da cápsula (m; raio 0,38)
     estica  maior razão de aresta posada/bind
     fidel   (com --assado) maior erro de direção de osso contra o clipe ASSADO por corpo
             (anim-conv, QA por rig) tocado no mesmo corpo e instante (graus)
   Teto de estica: max(3,5 do Studio; 1,10 × pior clipe de jogo do corpo; 1,10 × o assado
   do mesmo clipe no mesmo corpo). O assado mora em local/ (fora do repo): `--congela`
   grava as medidas dele em emotes-mocap-roster-ref.json, que o CI lê.
   Corpos com GLB mas fora de CHARACTERS (ainda não jogáveis) entram com def emprestada.
   MUTANTES (`--mutante=<nome>`, num subconjunto; `--self-test` roda o roster inteiro verde
   e cada mutante, que TEM de reprovar pela falha dele):
     rotacao-local   copia a rotação local da referência (o runtime de antes)  -> estica
     capsula-aberta  sem encolher o horizontal do Hips                         -> quadril
     sem-contato     Hips só na escala da altura, sem o chão da malha          -> piso
     curl-ignorado   contato sem o curl vivo da mão (Lampião no freeze)        -> piso
   Uso: node tools/eval/emotes-mocap-roster.mjs [--ids=a,b] [--json=<saída>] [--mutante=<nome>]
          [--assado=<legacy-out> [--congela] [--modo=assado]] [--glbchars=<arquivo>] [--self-test] */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { root, THREE, CHARACTERS, carregaRuntime, step, esperaClipe, once, parseGlb } from './lib/glbchars-node.mjs';

const MUTANTES = {
  'rotacao-local': ['estica', (s) => once(s, 'loc.copy(paiW).invert().multiply(tgtW[i]).toArray(locais[i], f * 4);', '(refQL[ref.indice.get(o.nome)] || ref.ossos.get(o.nome).q).toArray(locais[i], f * 4);')],
  'capsula-aberta': ['quadril', (s) => once(s, 'const fXZ = maxXZ > limite ? limite / maxXZ : 1;', 'const fXZ = 1;')],
  'sem-contato': ['piso', (s) => once(s, '      if (apoio) {\n', '      if (apoio && false) {\n')],
  'curl-ignorado': ['piso', (s) => once(s, 'q[i].fromArray(locais[i], f * 4) : vivos[i]; });', 'q[i].fromArray(locais[i], f * 4) : null; });')],
};
const IDS_MUTANTE = 'capitao,gotinha,lampiao,lula-drip';
if (process.argv.includes('--self-test')) {
  const roda = (extra) => spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...extra], { cwd: root, encoding: 'utf8' });
  const normal = roda([]);
  if (normal.status !== 0 || !normal.stdout.includes('EMOTES-ROSTER VERDE')) { console.log(normal.stdout.slice(-3000), normal.stderr.slice(-1500)); process.exit(1); }
  console.log(normal.stdout.split('\n').filter((l) => !l.startsWith('ok ')).join('\n').trim());
  for (const [nome, [falha]] of Object.entries(MUTANTES)) {
    const r = roda([`--mutante=${nome}`, `--ids=${IDS_MUTANTE}`]);
    const reprovou = r.status !== 0 && r.stdout.includes('EMOTES-ROSTER VERMELHO') && new RegExp(`:[a-z+]*${falha}`).test(r.stdout);
    if (!reprovou) { console.log(`MUTAÇÃO PASSOU — ${nome} (esperava ${falha})\n${r.stdout.slice(-2000)}${r.stderr.slice(-1500)}`); process.exit(1); }
    console.log(`MUTANTE ${nome} REPROVADO (${falha}): ${r.stdout.split('\n').filter((l) => l.startsWith('FALHA')).length} itens`);
  }
  process.exit(0);
}

const arg = (k) => process.argv.find((x) => x.startsWith(`--${k}=`))?.split('=').slice(1).join('=') || '';
const AMOSTRAS = 16;
// Raio lido da colisão do jogador em game.js (`this._collide(p.pos, R)`), sem cópia do literal.
const CAPSULA_R = Number(/this\._collide\(p\.pos, ([\d.]+)\)/.exec(fs.readFileSync(path.join(root, 'public/js/game.js'), 'utf8'))?.[1]);
if (!Number.isFinite(CAPSULA_R)) throw new Error('raio de colisão do jogador não encontrado em game.js');
// Clipes em pé: o vértice mais baixo fica no chão. freeze apoia mão/cabeça e sobe as pernas.
// flutua 12 cm: o dedo da referência sobe do repouso (4,3 cm) até 10 cm no uprock e na ginga,
// e a altura de quadril escala o salto (maior medido: cuca no uprock, 9,9 cm). Pé no ar 20 cm:
// a ginga levanta o pé de trás (p95 15 cm no roster).
const EM_PE = new Set(['capoeira', 'meia_lua', 'bencao', 'uprock', 'continencia', 'marra', 'comemoracao']);
export const LIMITES = Object.freeze({ pisoCm: -6, flutuaCm: 12, peNoArCm: 20, quadrilM: CAPSULA_R + 0.002, esticaAbs: 3.5, esticaRel: 1.10 });
const ESTADOS_JOGO = ['idle', 'walk', 'run', 'shoot', 'death', 'crouch', 'crouchwalk', 'jump', 'idle1h', 'walk1h', 'walkfire'];
const ARQ_REF = path.join(root, 'tools/eval/emotes-mocap-roster-ref.json');
const REF = fs.existsSync(ARQ_REF) ? JSON.parse(fs.readFileSync(ARQ_REF, 'utf8')) : { esticaAssado: {} };
/* Resíduos medidos (09/11): estica acima de 1,1× o assado no runtime retargetado. Teto = o
   medido (×1,02 de ruído de float), só desce. Os dois divergem do assado na coxa (31–57° de
   direção): o assado da anim-conv dobra a perna de outro jeito; o ancap já estica 8,39 em jogo. */
const RESIDUOS = Object.freeze({ 'ancap|capoeira': 10.99, 'fluxo|capoeira': 5.17, 'fluxo|bencao': 3.94 });
/* Apêndice que atravessa o chão (cm, piso por corpo): cauda/capa que o auto-skin pendurou a
   mais de uma altura de quadril do osso (cuca 1,61 na perna, lobisomem cyborg 1,48 na coxa,
   proerd 1,43 no quadril). O runtime assenta o pé e deixa o apêndice atravessar em vez de
   flutuar o corpo; conserto é de pesos (Studio). Teto = medido, só sobe em direção a zero. */
const RESIDUOS_PISO = Object.freeze({ cuca: -73, 'lobisomem-cyborg': -48, proerd: -32 });

const DIR_ASSADO = arg('assado');
const MODO = arg('modo') || 'runtime';
// Nome do clipe assado por emote (tools/build-emotes-mocap-pack.mjs, FONTES).
const ARQ_ASSADO = { capoeira: 'emote_capoeira_capoeira', meia_lua: 'emote_capoeira_meia_lua_de_frente', bencao: 'emote_capoeira_bencao',
  uprock: 'emote_breakdance_uprock', freeze: 'emote_breakdance_freeze_var_2', continencia: 'emote_salute', marra: 'emote_being_cocky', comemoracao: 'emote_happy_hand_gesture' };
// --glbchars=<arquivo>: mede outra versão do runtime (ex.: `git show <rev>:public/js/glbchars.js`).
const mutante = arg('mutante');
if (mutante && !MUTANTES[mutante]) throw new Error(`mutante desconhecido: ${mutante}`);
const { E, G } = await carregaRuntime({ arquivoGlbchars: arg('glbchars') || undefined,
  glbchars: (s) => {
    const m = mutante ? MUTANTES[mutante][1](s) : s;
    return m.includes('clip = emoteClipDoCorpo(info.id, this);')
      ? once(m, 'clip = emoteClipDoCorpo(info.id, this);', 'clip = globalThis.__emoteClipe?.(this, info.id) || emoteClipDoCorpo(info.id, this);')
      : once(m, 'const clip = emoteClipDoCorpo(', 'const clip = globalThis.__emoteClipe?.(this, info.id) || emoteClipDoCorpo(');
  } });
const capturas = E.EMOTES.filter((e) => e.clipe).map((e) => e.id);
const manifesto = JSON.parse(fs.readFileSync(path.join(root, 'public/models/skins/manifest.json'), 'utf8')).skins;
const corpos = fs.readdirSync(path.join(root, 'public/models/characters')).filter((f) => f.endsWith('.glb')).map((f) => f.slice(0, -4));
const filtro = arg('ids') ? new Set(arg('ids').split(',')) : null;
const itens = [
  ...corpos.map((id) => ({ id, tipo: 'corpo', corpo: id, skinId: null })),
  ...Object.entries(manifesto).filter(([, e]) => e.approved).map(([id, e]) => ({ id, tipo: 'skin', corpo: e.character, skinId: id, dir: e.model.split('/').pop().replace(/\.glb$/, '') })),
].filter((x) => !filtro || filtro.has(x.id));
for (const x of itens) if (x.tipo === 'corpo') { x.dir = x.id; x.jogavel = CHARACTERS.some((c) => c.id === x.id); if (!x.jogavel) G.GLB_CHARS.add(x.id); }

await G.preloadCharacterAssets([...new Set(itens.map((x) => x.corpo))]);
await G.preloadCosmeticAssets(itens.filter((x) => x.skinId).map((x) => x.skinId));

const defDe = (item) => {
  const base = CHARACTERS.find((c) => c.id === item.corpo) || { ...CHARACTERS[0], id: item.corpo, name: item.corpo };
  return { ...base, skinId: item.skinId || undefined };
};
const monta = (item) => {
  const b = G.buildCharacterModel(defDe(item), { weaponId: 'ak' });
  if (!b?.ctrl) return null;
  b.ctrl.aimPitch = 0;
  b.item = item;
  return b;
};

/* Malhas skinnadas visíveis + arestas do bind (geometria = pose de bind no espaço local). */
function preparaMalhas(b) {
  const malhas = [];
  b.ctrl.model.traverse((o) => {
    if (!o.isSkinnedMesh || !o.skeleton) return;
    const g = o.geometry, pos = g.attributes.position, J = g.attributes.skinIndex, W = g.attributes.skinWeight;
    const idx = g.index ? g.index.array : Uint32Array.from({ length: pos.count }, (_, i) => i);
    const vistas = new Set(), arestas = [];
    for (let t = 0; t + 2 < idx.length; t += 3) {
      for (const [a, c] of [[idx[t], idx[t + 1]], [idx[t + 1], idx[t + 2]], [idx[t + 2], idx[t]]]) {
        const k = a < c ? a * 4294967296 + c : c * 4294967296 + a;
        if (vistas.has(k)) continue; vistas.add(k);
        const L = Math.hypot(pos.getX(a) - pos.getX(c), pos.getY(a) - pos.getY(c), pos.getZ(a) - pos.getZ(c));
        if (L > 5e-4) arestas.push(a, c, L);   // rig-census: arestas < 0,5 mm são ruído
      }
    }
    // Atributos quantizados/normalizados (meshopt, KHR_mesh_quantization): copia já desnormalizado.
    const GET = ['getX', 'getY', 'getZ', 'getW'];
    const plano = (attr, Tipo) => { const s = attr.itemSize, out = new Tipo(attr.count * s); for (let i = 0; i < attr.count; i++) for (let c = 0; c < s; c++) out[i * s + c] = attr[GET[c]](i); return out; };
    malhas.push({ o, n: pos.count, P: plano(pos, Float32Array), Ja: plano(J, Uint16Array), Wa: plano(W, Float32Array), arestas: Float64Array.from(arestas), saida: new Float32Array(pos.count * 3) });
  });
  return malhas;
}

const _m = new THREE.Matrix4(), _s = new THREE.Vector3();
/* Skinning na CPU em MUNDO: Σ w · boneWorld · boneInverse · bindMatrix · v. */
function skinna(b, malhas) {
  b.group.updateMatrixWorld(true);
  let baixo = Infinity, estica = 1, raioXZ = 0;
  for (const m of malhas) {
    if (!m.o.visible) continue;
    const sk = m.o.skeleton;
    const mats = sk.bones.map((bone, j) => new THREE.Matrix4().multiplyMatrices(bone.matrixWorld, sk.boneInverses[j]).multiply(m.o.bindMatrix).elements);
    // GLTFLoader faz bind com matrixWorld ainda identidade: no bind, mundo = raiz da cena · v.
    const escala = _s.setFromMatrixScale(b.ctrl.model.matrixWorld).x;
    const { n, P, Ja, Wa, saida } = m;
    const acc = new Float64Array(16);
    for (let v = 0; v < n; v++) {
      acc.fill(0);
      for (let k = 0; k < 4; k++) {
        const w = Wa[v * 4 + k]; if (!w) continue;
        const e = mats[Ja[v * 4 + k]];
        for (let q = 0; q < 16; q++) acc[q] += e[q] * w;
      }
      const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
      const X = acc[0] * x + acc[4] * y + acc[8] * z + acc[12];
      const Y = acc[1] * x + acc[5] * y + acc[9] * z + acc[13];
      const Z = acc[2] * x + acc[6] * y + acc[10] * z + acc[14];
      saida[v * 3] = X; saida[v * 3 + 1] = Y; saida[v * 3 + 2] = Z;
      if (Y < baixo) baixo = Y;
      const r = Math.hypot(X, Z); if (r > raioXZ) raioXZ = r;
    }
    const A = m.arestas;
    for (let i = 0; i < A.length; i += 3) {
      const a = A[i] * 3, c = A[i + 1] * 3;
      const r = Math.hypot(saida[a] - saida[c], saida[a + 1] - saida[c + 1], saida[a + 2] - saida[c + 2]) / (A[i + 2] * escala);
      if (r > estica) estica = r;
    }
  }
  return { baixo, estica, raioXZ };
}
const _v = new THREE.Vector3();
const yOsso = (b, n) => b.ctrl.corpo.get(n)?.getWorldPosition(_v).y ?? NaN;
const pes = (b) => Math.min(...['LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase'].map((n) => ossos(b).get(n)?.getWorldPosition(_v).y ?? Infinity));
/* Pior estica dos clipes de jogo do corpo (8 instantes cada), mixer direto. */
function esticaJogo(b) {
  const malhas = preparaMalhas(b);
  let pior = 1;
  for (const nome of ESTADOS_JOGO) {
    const a = b.ctrl.actions[nome];
    if (!a) continue;
    b.ctrl.mixer.stopAllAction(); a.reset().play();
    const dur = a.getClip().duration;
    for (let k = 0; k < 8; k++) { a.time = dur * k / 7; b.ctrl.mixer.update(0); pior = Math.max(pior, skinna(b, malhas).estica); }
  }
  return pior;
}

/* Clipe assado do corpo (cache), servido ao runtime pelo gancho __emoteClipe. */
const _assados = new Map();
async function assado(item, id) {
  const k = `${item.dir}|${id}`;
  if (!_assados.has(k)) {
    const f = path.join(DIR_ASSADO, item.dir, 'emotes', `${ARQ_ASSADO[id]}.glb`);
    const g = await parseGlb(fs.readFileSync(f));
    const c = g.animations[0].clone(); c.name = `emote_${id}`;
    _assados.set(k, c);
  }
  return _assados.get(k);
}
globalThis.__emoteClipe = (ctrl, id) => (ctrl.__assado ? _assados.get(`${ctrl.__assado}|${id}`) || null : null);

/* Direções de osso (osso → filho) no quadro do grupo: o que o olho lê como "a pose". */
const PARES = [['LeftUpLeg', 'LeftLeg'], ['LeftLeg', 'LeftFoot'], ['LeftFoot', 'LeftToeBase'], ['RightUpLeg', 'RightLeg'], ['RightLeg', 'RightFoot'], ['RightFoot', 'RightToeBase'],
  ['Hips', 'Spine02'], ['Spine', 'neck'], ['neck', 'Head'], ['LeftArm', 'LeftForeArm'], ['LeftForeArm', 'LeftHand'], ['RightArm', 'RightForeArm'], ['RightForeArm', 'RightHand']];
function ossos(b) {
  if (!b._ossos) { b._ossos = new Map(); b.ctrl.model.traverse((o) => { if (o.isBone && !b._ossos.has(o.name)) b._ossos.set(o.name, o); }); }
  return b._ossos;
}
const _a = new THREE.Vector3(), _b = new THREE.Vector3();
function direcoes(b) {
  const m = ossos(b);
  return PARES.map(([p, f]) => (m.has(p) && m.has(f) ? m.get(f).getWorldPosition(_b).sub(m.get(p).getWorldPosition(_a)).normalize().clone() : null));
}
function erroGraus(A, B) {
  let pior = [0, null];
  A.forEach((d, i) => { const g = d && B[i] ? d.angleTo(B[i]) * 180 / Math.PI : 0; if (g > pior[0]) pior = [g, PARES[i][0]]; });
  return pior;
}
async function tocando(item, id, comAssado) {
  const b = monta(item);
  if (comAssado) { await assado(item, id); b.ctrl.__assado = item.dir; }
  step(b, 40);
  b.ctrl.emote(id);
  await esperaClipe(b);
  return b;
}

async function medeItem(item) {
  const ref = monta(item);
  if (!ref) return { id: item.id, tipo: item.tipo, erro: 'sem modelo' };
  step(ref, 40);
  const idle = { ...skinna(ref, preparaMalhas(ref)), pe: pes(ref), jogo: esticaJogo(monta(item)) };
  const hipsIdle = ref.ctrl.corpo.get('Hips').getWorldPosition(new THREE.Vector3());
  const clipes = {};
  for (const id of capturas) {
    const b = await tocando(item, id, MODO === 'assado');
    const gemeo = DIR_ASSADO && MODO !== 'assado' ? await tocando(item, id, true) : null;
    const malhas = preparaMalhas(b), malhasG = gemeo && preparaMalhas(gemeo);
    const acao = b.ctrl.actions[`emote_${id}`];
    if (!b.ctrl._emoteClipeAtivo || !acao) { clipes[id] = { erro: 'clipe não tocou', falhas: ['tocou'] }; continue; }
    step(b, 15); if (gemeo) step(gemeo, 15);   // rampa de entrada assentada
    const dur = acao.getClip().duration;
    const passo = Math.max(1, Math.floor((dur - 0.35) * 60 / AMOSTRAS));
    let piso = Infinity, flutua = -Infinity, peMax = -Infinity, peNoAr = -Infinity, quadril = 0, estica = 1, esticaG = 1, fidel = [0, null];
    for (let s = 0; s < AMOSTRAS && b.ctrl.curName === `emote_${id}`; s++) {
      const m = skinna(b, malhas), chao = b.group.position.y;
      piso = Math.min(piso, m.baixo - chao);
      flutua = Math.max(flutua, m.baixo - chao);
      peMax = Math.max(peMax, pes(b) - idle.pe);
      peNoAr = Math.max(peNoAr, pes(b) - chao);
      const h = b.ctrl.corpo.get('Hips').getWorldPosition(_v);
      quadril = Math.max(quadril, Math.hypot(h.x - b.group.position.x, h.z - b.group.position.z));
      estica = Math.max(estica, m.estica);
      if (gemeo) {
        esticaG = Math.max(esticaG, skinna(gemeo, malhasG).estica);
        const e = erroGraus(direcoes(b), direcoes(gemeo)); if (e[0] > fidel[0]) fidel = e;
      }
      step(b, passo); if (gemeo) step(gemeo, passo);
    }
    const refEstica = gemeo ? esticaG : REF.esticaAssado[item.id]?.[id];
    const teto = Math.max(LIMITES.esticaAbs, idle.jogo * LIMITES.esticaRel, (refEstica || 0) * LIMITES.esticaRel, (RESIDUOS[`${item.id}|${id}`] || 0) * 1.02);
    const r = { pisoCm: +(piso * 100).toFixed(1), flutuaCm: EM_PE.has(id) ? +(flutua * 100).toFixed(1) : null, peIdleCm: +(peMax * 100).toFixed(1),
      peNoArCm: EM_PE.has(id) ? +(peNoAr * 100).toFixed(1) : null,
      quadrilM: +quadril.toFixed(3), estica: +estica.toFixed(2), esticaTeto: +teto.toFixed(2),
      ...(gemeo ? { esticaAssado: +esticaG.toFixed(2), fidelGraus: +fidel[0].toFixed(1), fidelOsso: fidel[1] } : {}) };
    const falhas = [];
    if (r.pisoCm < Math.min(LIMITES.pisoCm, RESIDUOS_PISO[item.id] ?? 0)) falhas.push('piso');
    if (r.flutuaCm != null && r.flutuaCm > LIMITES.flutuaCm) falhas.push('flutua');
    if (r.peNoArCm != null && r.peNoArCm > LIMITES.peNoArCm) falhas.push('pe-no-ar');
    if (r.quadrilM > LIMITES.quadrilM) falhas.push('quadril');
    if (r.estica > teto) falhas.push('estica');
    r.falhas = falhas;
    clipes[id] = r;
  }
  return { id: item.id, tipo: item.tipo, jogavel: item.tipo === 'skin' || item.jogavel, idleEstica: +idle.estica.toFixed(2), jogoEstica: +idle.jogo.toFixed(2),
    idleBaixoCm: +((idle.baixo - ref.group.position.y) * 100).toFixed(1), idleQuadrilM: +Math.hypot(hipsIdle.x, hipsIdle.z).toFixed(3), clipes };
}

const resultado = [];
const t0 = Date.now();
for (const item of itens) {
  const r = await medeItem(item);
  resultado.push(r);
  const ruins = r.erro ? [r.erro] : Object.entries(r.clipes).filter(([, c]) => c.erro || c.falhas.length).map(([k, c]) => `${k}:${c.erro || c.falhas.join('+')}`);
  console.log(`${ruins.length ? 'FALHA' : 'ok   '} ${r.tipo} ${r.id}${ruins.length ? ` · ${ruins.join(' ')}` : ''}`);
}
const reprovados = resultado.filter((r) => r.erro || Object.values(r.clipes).some((c) => c.erro || c.falhas.length));
const pior = (k, sinal = 1) => resultado.flatMap((r) => Object.entries(r.clipes || {}).map(([c, v]) => [r.id, c, v[k]])).filter((x) => x[2] != null).sort((a, b) => sinal * (b[2] - a[2]))[0];
console.log(`roster ${resultado.length} (${itens.filter((x) => x.tipo === 'corpo').length} corpos, ${itens.filter((x) => x.tipo === 'skin').length} skins) em ${((Date.now() - t0) / 1000).toFixed(0)} s`);
console.log(`pior piso ${JSON.stringify(pior('pisoCm', -1))} · pior flutua ${JSON.stringify(pior('flutuaCm'))} · pior quadril ${JSON.stringify(pior('quadrilM'))} · pior estica ${JSON.stringify(pior('estica'))}`);
console.log(`EMOTES-ROSTER ${reprovados.length ? 'VERMELHO' : 'VERDE'}: ${resultado.length - reprovados.length}/${resultado.length} aprovados`);
if (arg('json')) fs.writeFileSync(arg('json'), JSON.stringify({ limites: LIMITES, resultado }, null, 1));
if (process.argv.includes('--congela')) {
  if (!DIR_ASSADO || MODO === 'assado' || filtro || mutante) throw new Error('--congela exige --assado, modo runtime, sem mutante e o roster inteiro');
  const linhas = resultado.filter((r) => r.clipes).map((r) => `  ${JSON.stringify(r.id)}: ${JSON.stringify(Object.fromEntries(Object.entries(r.clipes).map(([c, v]) => [c, v.esticaAssado])))}`);
  fs.writeFileSync(ARQ_REF, `{\n "fonte": "local/anim-conv-20261109/legacy-out/<id>/emotes (QA por rig, qa-packed.json)",\n`
    + ` "medida": "maior razão de aresta do clipe assado tocado pelo runtime, 16 instantes",\n "esticaAssado": {\n${linhas.join(',\n')}\n }\n}\n`);
  console.log(`congelado ${ARQ_REF}`);
}
process.exit(reprovados.length ? 1 : 0);
