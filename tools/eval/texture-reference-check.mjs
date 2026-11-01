// TEXTURE-REFERENCE — régua do handoff texelReference da alvenaria PBR do córrego.
// UV em mundo resolvida antes do onLoad; todos os componentes UV aceitos têm que
const argv = process.argv.slice(2);
const uso = (msg) => { console.error(`uso: ${msg}`); process.exit(2); };
const flags = {};
for (const a of argv) {
  if (a.startsWith('--mutante=')) { if (flags.mutante !== undefined) uso('--mutante duplicado'); flags.mutante = a.slice(10); }
  else uso(`argumento desconhecido: ${a}`);
}
const MUT = flags.mutante ?? '';
if (flags.mutante !== undefined && !flags.mutante) uso('--mutante vazio');
// CONJUNTO EXATO por ID+contagem (multiset), capturado dos logs reais do Root em
// /tmp/texref-{missing,dims,lock}-R4.log — nenhum outro conjunto aprova.
const MUTANTES = {
  'missing-reference': { 'fria-vspan': 1, 'fria-texel-escalada': 1, 'uv-fria-quente': 1, 'uv-fria-baseline': 1, 'v-efetivo': 1, 'prop-lock': 1, 'cross-accept': 1, 'cross-contaminacao': 1 },
  'reference-wrong-dims': { 'fria-vspan': 1, 'uv-fria-baseline': 1, 'v-efetivo': 1, 'ref-invalida-bloqueada': 8, 'ref-invalida-uv': 8, 'ref-invalida-marcada': 8 },
  'lock-removal-factor1': { 'prop-lock': 1 },
  'uv-nao-finito': { 'uv-finita-fria': 1, 'uv-finita-quente': 1, 'uv-finita-baseline': 1, 'uv-finita-prop': 1 },
};
if (MUT && !Object.hasOwn(MUTANTES, MUT)) uso(`mutante desconhecido: ${MUT} (válidos: ${Object.keys(MUTANTES).join(', ')})`);
// contraprova: cada mutante é combinado com um defeito independente — o conjunto
// tem que DIVERGIR do alvo, senão o gate aprovaria mutante+defeito junto
const CONTRA_DEFEITO = {
  'missing-reference': ['if (!TEXEL_ON || !geo || geo.userData.texelEscalada) return false;', 'if (!TEXEL_ON || !geo) return false;'],
  'reference-wrong-dims': ['if (!TEXEL_ON || !geo || geo.userData.texelEscalada) return false;', 'if (!TEXEL_ON || !geo) return false;'],
  'lock-removal-factor1': ['const referencia = t?.userData?.texelReference, image = referencia || t?.image;', 'const referencia = t?.userData?.texelReference, image = t?.image;'],
};
const contagem = (fs) => fs.reduce((m, { id }) => (m[id] = (m[id] || 0) + 1, m), {});
const mesmoConjunto = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

const { readFileSync, writeFileSync, unlinkSync } = await import('node:fs');
// harness indisponível é infra 3, não crash 1 (crítico R5 P3-1)
let THREE;
try { ({ THREE } = await import('./harness.mjs')); }
catch (e) { console.error(`infra: import do harness falhou: ${e?.message ?? e}`); process.exit(3); }

// casa real da fileira B derivada pelo crítico R3: corpo 3×7.35×4, repeat 2.4×1.6,
// ref 256² ⇒ tileV = 256×1.6/128 = 3.2 m ⇒ Vspan = 7.35/3.2 = 2.296875 (V efetivo 3.675)
const CASA = { w: 3, h: 7.35, d: 4, repeat: [2.4, 1.6] };
const VSPAN_BASE = 7.35 / (256 * 1.6 / 128);   // 2.296875

const baseTex = (over = {}) => {
  const t = new THREE.Texture();
  t.name = 'pbr_paintedplaster017_color';
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.repeat.set(CASA.repeat[0], CASA.repeat[1]);
  Object.assign(t, over);
  return t;
};
const matDe = (map) => new THREE.MeshStandardMaterial({ map });

const bytesUV = (geo) => new Uint8Array(geo.attributes.uv.array.buffer.slice(0));

// igualdade de bytes não prova bytes válidos: toda geometria aceita pelo validador
// precisa de TODOS os componentes UV finitos (crítico R5 P2-1) — lê o atributo real
const uvFinita = (geo, id, rotulo, add) => {
  const uv = geo?.attributes?.uv;
  if (!uv) { add(`uv-finita-${id}`, `${rotulo}: geometria sem atributo UV`); return; }
  for (let i = 0; i < uv.count; i++) {
    const x = uv.getX(i), y = uv.getY(i);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      add(`uv-finita-${id}`, `${rotulo}: UV[${i}]=(${x},${y}) componente não finita`);
      return;
    }
  }
};

// span de V da face +Z (materialIndex 4, extensão w×h) — o mesmo cálculo de EXT do helper
const vspanFaceZ = (geo) => {
  const uv = geo.attributes.uv, idx = geo.index;
  const gp = geo.groups.find((g) => g.materialIndex === 4);
  let mn = Infinity, mx = -Infinity;
  for (let k = gp.start; k < gp.start + gp.count; k++) { const y = uv.getY(idx.getX(k)); if (y < mn) mn = y; if (y > mx) mx = y; }
  return mx - mn;
};

// MESMO validador para nominal e mutante: recebe o módulo vao (real ou copiado)
export function validar(vao) {
  const f = [];
  const add = (id, msg) => f.push({ id, msg });
  const aoMat = vao.aoMatFactory();
  const casa = (map) => { const geo = vao.aoBoxGeo(CASA.w, CASA.h, CASA.d); aoMat(matDe(map)); return geo; };

  // (1) casa fria (image ausente, ref 256²): UV em mundo do baseline ANTES do onLoad
  const fria = casa(baseTex({ userData: { texelReference: { width: 256, height: 256 } } }));
  uvFinita(fria, 'fria', 'casa fria', add);
  const vsFria = vspanFaceZ(fria);
  if (Math.abs(vsFria - VSPAN_BASE) > 1e-9)
    add('fria-vspan', `casa fria com Vspan ${vsFria} (esperado ${VSPAN_BASE} do baseline DataTexture256)`);
  if (!fria.userData.texelEscalada) add('fria-texel-escalada', 'casa fria sem texelEscalada (operação não concluída)');

  // (2) casa quente (image 1024x512 carregada) e ANTERIOR (DataTexture 256², sem ref):
  //     buffers de UV byte-idênticos à fria — não apenas "parece"
  const quente = casa(baseTex({ image: { width: 1024, height: 512 }, userData: { texelReference: { width: 256, height: 256 } } }));
  const dt = new THREE.DataTexture(new Uint8Array(256 * 256 * 4), 256, 256);
  dt.wrapS = dt.wrapT = THREE.RepeatWrapping; dt.repeat.set(CASA.repeat[0], CASA.repeat[1]);
  const anterior = casa(dt);
  uvFinita(quente, 'quente', 'casa quente', add);
  uvFinita(anterior, 'baseline', 'baseline DataTexture256', add);
  const bF = bytesUV(fria), bQ = bytesUV(quente), bA = bytesUV(anterior);
  if (!(bF.length === bQ.length && bF.every((b, i) => b === bQ[i]))) add('uv-fria-quente', 'UV fria ≠ UV quente (image 1024x512 mudou a escala)');
  if (!(bF.length === bA.length && bF.every((b, i) => b === bA[i]))) add('uv-fria-baseline', 'UV fria ≠ UV do baseline DataTexture256 (comportamento anterior não preservado)');

  // (3) V efetivo = Vspan × repeat.y (o que o sampler realmente varre)
  if (Math.abs(vspanFaceZ(fria) * CASA.repeat[1] - 3.675) > 1e-9)
    add('v-efetivo', 'V efetivo da casa não é 3.675 (2.296875 × 1.6)');

  // (4) prop pequeno fator 1: helper 2× não mexe; imagem de outra dimensão no 3º
  //     chamado NÃO reescala (lock por referência), nem contamina a casa anterior
  const snapAntes = bytesUV(fria);
  const propMap = baseTex(); propMap.repeat.set(1, 1); propMap.userData = { texelReference: { width: 256, height: 256 } };
  const propMat = matDe(propMap);
  const prop = vao.aoBoxGeo(1, 1, 1); aoMat(propMat);
  const p0 = bytesUV(prop);
  if (vao.escalaUVporMundo(prop, 1, 1, 1, propMat) !== false) add('prop-noop', '2º chamado no prop fator 1 deveria ser no-op');
  const p1 = bytesUV(prop);
  if (!(p0.length === p1.length && p0.every((b, i) => b === p1[i]))) add('prop-idempotente', 'prop fator 1 reescalado no 2º chamado (não idempotente)');
  propMat.map.image = { width: 1024, height: 512 };   // imagem carrega DEPOIS
  vao.escalaUVporMundo(prop, 1, 1, 1, propMat);
  const p2 = bytesUV(prop);
  if (!(p1.length === p2.length && p1.every((b, i) => b === p2[i])))
    add('prop-lock', 'prop pequeno reescalada após a imagem carregar (idempotência fator 1 quebrada)');
  delete propMat.map.userData.texelReference;   // referência cai: o LOCK é o que segura
  vao.escalaUVporMundo(prop, 1, 1, 1, propMat);
  const p3 = bytesUV(prop);
  if (!(p2.length === p3.length && p2.every((b, i) => b === p3[i])))
    add('prop-lock', 'prop pequeno reescalada após a imagem carregar (idempotência fator 1 quebrada)');
  uvFinita(prop, 'prop', 'prop fator 1', add);
  if (vao.escalaUVporMundo(fria, CASA.w, CASA.h, CASA.d, matDe(baseTex({ image: { width: 1024, height: 1024 } }))) !== false)
    add('cross-accept', 'casa já escalada aceitou reescala por material alheio (cross-material)');
  const snapDepois = bytesUV(fria);
  if (!(snapAntes.length === snapDepois.length && snapAntes.every((b, i) => b === snapDepois[i])))
    add('cross-contaminacao', 'UV da casa mudou com material de outro corpo (contaminação cross-material)');

  // (5) referências inválidas bloqueiam SEM alterar UV e sem marcar conclusão
  for (const eixo of ['width', 'height']) for (const ruim of [0, NaN, Infinity, -256]) {
    const m = matDe(baseTex()); m.map.repeat.set(1, 1); m.map.userData = { texelReference: { width: 256, height: 256 } };
    m.map.userData.texelReference[eixo] = ruim;
    const g = vao.aoBoxGeo(1, 1, 1); const antes = bytesUV(g);
    if (vao.escalaUVporMundo(g, 1, 1, 1, m) !== false) add('ref-invalida-bloqueada', `ref inválida (${eixo}=${ruim}) não foi bloqueada`);
    const depois = bytesUV(g);
    if (!(antes.length === depois.length && antes.every((b, i) => b === depois[i]))) add('ref-invalida-uv', `ref inválida (${eixo}=${ruim}) alterou a UV`);
    if (g.userData.texelEscalada) add('ref-invalida-marcada', `ref inválida (${eixo}=${ruim}) marcou texelEscalada (bloqueia aplicação futura)`);
    uvFinita(g, 'ref-invalida', `ref inválida (${eixo}=${ruim})`, add);
  }

  // (6) legado sem flag: image ausente continua inalterado (default anterior)
  const legado = matDe(baseTex()); legado.map.repeat.set(1, 1);
  const gL = vao.aoBoxGeo(1, 1, 1); const aL = bytesUV(gL);
  if (vao.escalaUVporMundo(gL, 1, 1, 1, legado) !== false) add('legado-noop', 'legado sem ref e sem image deveria voltar sem tocar');
  const dL = bytesUV(gL);
  if (!(aL.length === dL.length && aL.every((b, i) => b === dL[i]))) add('legado-uv', 'legado sem ref e sem image teve UV alterada');
  uvFinita(gL, 'legado', 'legado sem ref/image', add);
  return f;
}

// -------- nominal primeiro, com o helper REAL do produto --------
let nominal = null;
try {
  const vaoReal = await import('../../public/js/vao.js');
  nominal = validar(vaoReal);
} catch (e) {
  console.error(`infra: preparação/validação nominal falhou: ${e?.message ?? e}`);
  process.exit(3);
}
if (!MUT) {
  console.log(JSON.stringify({ mutante: null, veredito: nominal.length ? 'RED' : 'GREEN', falhas: nominal }));
  process.exit(nominal.length ? 1 : 0);
}
if (nominal.length) { console.error('nominal já RED — mutante não prova nada (infra)'); process.exit(3); }

// -------- mutante: CÓPIA do vao.js, fonte real intocada --------
const VAO_SRC = new URL('../../public/js/vao.js', import.meta.url).href.replace('file://', '');
const fonte = readFileSync(VAO_SRC.replace(/^\/+/, '/'), 'utf8');
const EDITS = {
  'missing-reference': [['const referencia = t?.userData?.texelReference, image = referencia || t?.image;', 'const referencia = t?.userData?.texelReference, image = t?.image;']],
  'reference-wrong-dims': [['const referencia = t?.userData?.texelReference, image = referencia || t?.image;', "const referencia = t?.userData?.texelReference ? { width: 1024, height: 512 } : null, image = referencia || t?.image;"]],
  'lock-removal-factor1': [['if (mudou || referencia) geo.userData.texelEscalada = true;', 'if (mudou) geo.userData.texelEscalada = true;']],
  // corrosão física provada pelo crítico R5 P2-1: só U[0] não finito, igual nas três casas
  'uv-nao-finito': [['if (mudou) uv.needsUpdate = true;', 'uv.setX(0, NaN);\n  if (mudou) uv.needsUpdate = true;']],
};
const CONTRA = {
  'uv-nao-finito': 'if (!TEXEL_ON || !geo || geo.userData.texelEscalada) return false;',
};
// build/import do experimento quebrado é infra 3 — não vira crash nem engole semântica
const rodarCopia = async (nome, edits) => {
  const tmp = new URL(`./.texref-${nome}.mjs`, import.meta.url).pathname;
  let saida;
  try {
    let corpo = fonte;
    for (const [de, para] of edits) {
      if (!corpo.includes(de)) throw new Error(`âncora do mutante não existe no vao.js real: ${de}`);
      corpo = corpo.replace(de, para);
    }
    writeFileSync(tmp, corpo);
    saida = validar(await import(`./.texref-${nome}.mjs`));
  } finally {
    try { unlinkSync(tmp); } catch {}
  }
  return saida;
};
const contraEdits = (mut) => CONTRA[mut]
  ? [...EDITS[mut], [CONTRA[mut], CONTRA[mut].replace(' || geo.userData.texelEscalada', '')]]
  : [...EDITS[mut], CONTRA_DEFEITO[mut]];
let pos, posContra, erroInfra = null;
try {
  pos = await rodarCopia(`mut-${MUT}`, EDITS[MUT]);
  posContra = await rodarCopia(`contra-${MUT}`, contraEdits(MUT));
} catch (e) {
  erroInfra = e;
}
if (erroInfra) { console.error(`infra: experimento do mutante ${MUT} falhou: ${erroInfra?.message ?? erroInfra}`); process.exit(3); }
if (!pos.length) { console.error(`mutante ${MUT} passou GREEN — régua cega`); process.exit(3); }
const obtido = contagem(pos);
if (!mesmoConjunto(obtido, MUTANTES[MUT])) {
  console.error(`mutante ${MUT} com conjunto de falhas ≠ alvo — esperado ${JSON.stringify(MUTANTES[MUT])}, obtido ${JSON.stringify(obtido)}`);
  process.exit(3);
}
const obtidoContra = contagem(posContra);
if (mesmoConjunto(obtidoContra, MUTANTES[MUT])) {
  console.error(`contraprova: mutante ${MUT} + defeito independente produziu o MESMO conjunto — gate aprovaria contaminação`);
  process.exit(3);
}
console.log(JSON.stringify({ mutante: MUT, veredito: 'RED', esperado: MUTANTES[MUT], obtido, contra: { defeito: (CONTRA[MUT] ?? CONTRA_DEFEITO[MUT][0]).slice(0, 40), obtido: obtidoContra } }));
process.exit(1); // RED por mutação detectada é o resultado NORMAL do mutante
