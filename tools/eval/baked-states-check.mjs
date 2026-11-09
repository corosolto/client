#!/usr/bin/env node
/* ESTADOS-ASSADOS: troca de clipe por ESTADO nos 74 BODIES legados (regra em baked-states-metrics.mjs).
   A régua prova, a partir de tools/eval/baked-states.json (gerado por tools/import-baked-states.mjs):
     R1 a decisão de cada estado é a da regra (substitui ⇔ nenhum motivo para manter);
     R2 o arquivo publicado é o que o QA mediu (sha256[0..12]); estado compartilhado não tem arquivo;
     R3 pé no chão MEDIDO no clipe publicado, skinado no GLB do personagem (pé = vértices cuja
        junta dominante é Foot/ToeBase): mínimo ≥ min(−penetração do Studio, piso do QA) − 1,5 cm;
     R4 o jogo usa a velocidade do manifest nos estados de locomoção trocados (índice + anim-speed-ref);
     R5 o pack mesclado <id>.glb decodifica no GLTFLoader do jogo com os clipes da pasta.
   Mutantes (cada um tem que reprovar):
     --mutante=pe-afundado  afunda 13 cm o quadril do death do bonzo e regrava o hash (só R3 pega);
     --mutante=ref-global   o glbchars volta a usar só as refs globais;
     --mutante=regra-ruido  aplica a regra antiga (qualquer número pior): recusa clipe válido. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { motivosParaManter, motivosRegraRuido } from './baked-states-metrics.mjs';
import { readGLB, buildScene, worldMats, poseWith, skinVerts, bboxOf } from './tp-mount-probe.mjs';
import { marcarRef, refsDoCorpo } from '../../public/js/anim-speed-ref.js';

const MUT = process.argv.find((a) => a.startsWith('--mutante='))?.split('=')[1] || '';
const MUTANTES = {
  'pe-afundado': (f) => f.startsWith('R3 bonzo/death'),
  'ref-global': (f) => f.startsWith('R4 glbchars'),
  'regra-ruido': (f) => f.startsWith('R1') && f.includes('substituído contra a regra'),
};
if (MUT && !MUTANTES[MUT]) throw new Error(`mutante desconhecido: ${MUT}`);
const ANIMS = path.resolve('public/models/anims');
const data = JSON.parse(fs.readFileSync(path.resolve('tools/eval/baked-states.json'), 'utf8'));
const indice = JSON.parse(fs.readFileSync(path.join(ANIMS, 'index.json'), 'utf8'));
let glbchars = fs.readFileSync(path.resolve('public/js/glbchars.js'), 'utf8');
const S = data.estados;
const LOCO = ['walk', 'run', 'crouchwalk', 'walk1h'];
const TOL_PISO_CM = 1.5;
const h12 = (bytes) => createHash('sha256').update(bytes).digest('hex').slice(0, 12);
const falhas = [];
const lidos = new Map();
const ler = (id, estado) => {
  const k = `${id}/${estado}`;
  if (!lidos.has(k)) { const f = path.join(ANIMS, id, `${estado}.glb`); lidos.set(k, fs.existsSync(f) ? fs.readFileSync(f) : null); }
  return lidos.get(k);
};
const glbDe = (bytes) => {
  const n = bytes.readUInt32LE(12);
  return { json: JSON.parse(bytes.subarray(20, 20 + n).toString('utf8')), bin: bytes.subarray(20 + n + 8) };
};

if (MUT === 'pe-afundado') {
  // Desce o Hips 13 cm no mundo em todas as chaves do death do bonzo e "conserta" o hash.
  const bytes = Buffer.from(ler('bonzo', 'death'));
  const g = glbDe(bytes), anim = g.json.animations[0];
  const hips = g.json.nodes.findIndex((n) => n.name === 'Hips');
  const ch = anim.channels.find((c) => c.target.node === hips && c.target.path === 'translation');
  const pai = g.json.nodes.findIndex((n) => n.children?.includes(hips));
  const cena = buildScene(g), W = worldMats(cena);
  const escalaPai = pai >= 0 ? Math.hypot(W[pai][4], W[pai][5], W[pai][6]) : 1;
  const acc = g.json.accessors[anim.samplers[ch.sampler].output], bv = g.json.bufferViews[acc.bufferView];
  const base = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  for (let i = 0; i < acc.count; i++) { const p = base + i * 12 + 4; g.bin.writeFloatLE(g.bin.readFloatLE(p) - 0.13 / escalaPai, p); }
  lidos.set('bonzo/death', bytes);
  data.corpos.bonzo.e[S.indexOf('death')][1] = h12(bytes);
}
if (MUT === 'ref-global') glbchars = glbchars.replace(/this\.refs = refsDoCorpo\([^;]*\);/, 'this.refs = REFS_GLOBAIS;');

/* R1 + R2 */
const ids = Object.keys(data.corpos);
if (ids.length !== 74) falhas.push(`inventário: ${ids.length} corpos != 74`);
let trocados = 0, mantidos = 0, recusaRuido = 0, exemploRuido = '';
const regra = MUT === 'regra-ruido'
  ? (a, n) => motivosRegraRuido(a[0], n[0], a[1] || {}, n[1] || {})
  : (a, n) => motivosParaManter(a[1] || {}, n[1] || {});
for (const id of ids) {
  const c = data.corpos[id];
  if (!Array.isArray(c.f) || c.f.length !== 3 || !c.f.every((x) => /^[0-9a-f]{12}$/.test(x))) falhas.push(`${id}: sem hash das fontes do QA Studio`);
  if (!Array.isArray(c.e) || c.e.length !== S.length) { falhas.push(`${id}: precisa de ${S.length} registros de estado`); continue; }
  c.e.forEach(([troca, hash, a, n], i) => {
    const estado = S[i], k = `${id}/${estado}`;
    if (!Number.isFinite(a?.[0]) || !Number.isFinite(n?.[0])) { falhas.push(`${k}: piso ausente`); return; }
    const motivos = regra(a, n);
    if (troca === 1 && motivos.length) {
      if (MUT === 'regra-ruido' && !motivosParaManter(a[1] || {}, n[1] || {}).length) {
        recusaRuido++;
        if (!exemploRuido && !Object.keys(n[1] || {}).some((x) => x !== '~')) exemploRuido = `${k} passa todos os checks do QA e a regra antiga recusa por ${motivos.join('; ')}`;
      }
      falhas.push(`R1 ${k}: substituído contra a regra (${motivos.join('; ')})`);
    }
    if (troca === 0 && !motivos.length) falhas.push(`R1 ${k}: mantido sem motivo — a regra manda substituir`);
    if (troca !== 0 && troca !== 1) falhas.push(`R1 ${k}: decisão inválida ${troca}`);
    troca === 1 ? trocados++ : mantidos++;
    const bytes = ler(id, estado);
    if (hash === null) {
      if (troca === 1) falhas.push(`R2 ${k}: substituído sem arquivo`);
      if (bytes) falhas.push(`R2 ${k}: QA mediu o clipe compartilhado, mas há arquivo próprio`);
    } else if (!bytes) falhas.push(`R2 ${k}: arquivo publicado ausente`);
    else if (h12(bytes) !== hash) falhas.push(`R2 ${k}: arquivo difere do que o QA mediu; rode o importador`);
    if (troca === 1 && bytes) {
      const { json } = glbDe(bytes);
      if (json.extensionsRequired?.length) falhas.push(`R2 ${k}: exige ${json.extensionsRequired.join(', ')}, o loader do jogo não registra decoder`);
      if (json.animations?.[0]?.name !== estado) falhas.push(`R2 ${k}: clipe com nome ${json.animations?.[0]?.name}`);
    }
  });
}

/* R3 — pé medido no clipe publicado (mesmo skinning das sondas de personagem). */
const PE = /^(Left|Right)(Foot|ToeBase)$/;
let piorPe = Infinity, piorPeQuem = '', medidos = 0;
const alvosR3 = MUT === 'pe-afundado' ? ['bonzo'] : MUT ? [] : ids;
for (const id of alvosR3) {
  const g = readGLB(path.resolve('public/models/characters', `${id}.glb`)), sc = buildScene(g);
  const nomes = g.json.skins[0].joints.map((j) => g.json.nodes[j].name);
  const chao = bboxOf(skinVerts(sc, g, worldMats(sc), 1))[1];
  const pe = (vs) => {
    let mn = Infinity;
    for (const v of vs) {
      if (!v.j) continue;
      let dom = 0; for (let k = 1; k < 4; k++) if (v.w[k] > v.w[dom]) dom = k;
      if (PE.test(nomes[v.j[dom]] || '') && v.p[1] < mn) mn = v.p[1];
    }
    return mn;
  };
  data.corpos[id].e.forEach(([troca, , , n], i) => {
    if (troca !== 1 || (MUT && S[i] !== 'death')) return;
    const bytes = ler(id, S[i]);
    if (!bytes) return;
    // poseWith lê de arquivo: o clipe mutado vai para um temporário fora do repo.
    let arquivo = path.join(ANIMS, id, `${S[i]}.glb`), tmp = null;
    if (!fs.readFileSync(arquivo).equals(bytes)) {
      tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'estados-assados-'));
      arquivo = path.join(tmp, 'clipe.glb');
      fs.writeFileSync(arquivo, bytes);
    }
    try {
      const { json } = glbDe(bytes);
      const dur = Math.max(...json.animations[0].samplers.map((s) => json.accessors[s.input].max[0]));
      let mn = Infinity;
      for (let k = 0; k <= 12; k++) mn = Math.min(mn, pe(skinVerts(sc, g, poseWith(sc, arquivo, (dur * k) / 12), 2)));
      const cm = +((mn - chao) * 100).toFixed(2);
      medidos++;
      if (cm < piorPe) { piorPe = cm; piorPeQuem = `${id}/${S[i]}`; }
      const limite = Math.min(-data.limites.penetrationCm, n[0]) - TOL_PISO_CM;
      if (cm < limite) falhas.push(`R3 ${id}/${S[i]}: pé afundado ${cm} cm < ${limite} cm (QA declarou piso ${n[0]} cm)`);
    } finally { if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); }
  });
}

/* R4 — refs por personagem: índice = manifest; o jogo multiplica pela escala do modelo. */
const GLOBAIS = { walk: 0.84, walk1h: 0.84, run: 2.08, crouchwalk: 0.75 };
let refsTrocadas = 0;
for (const id of ids) {
  const c = data.corpos[id];
  const acoes = {};
  for (const estado of LOCO) {
    const troca = c.e[S.indexOf(estado)][0] === 1;
    const v = c.v?.[estado], noIndice = indice.refs?.[id]?.[estado];
    if (troca !== (v > 0)) falhas.push(`R4 ${id}/${estado}: ref do manifest ${troca ? 'ausente' : 'em estado mantido'}`);
    if ((v ?? null) !== (noIndice ?? null)) falhas.push(`R4 ${id}/${estado}: índice tem ${noIndice}, manifest ${v}`);
    const clip = {};
    marcarRef(clip, noIndice);
    acoes[estado] = { getClip: () => clip };
  }
  const escala = 1.04;
  const refs = refsDoCorpo(acoes, escala, GLOBAIS);
  for (const estado of LOCO) {
    const esperado = c.v?.[estado] > 0 ? c.v[estado] * escala : GLOBAIS[estado];
    if (Math.abs(refs[estado] - esperado) > 1e-9) falhas.push(`R4 ${id}/${estado}: ref ${refs[estado]} != ${esperado}`);
    if (c.v?.[estado] > 0) refsTrocadas++;
  }
}
{
  const exigido = [
    [/import \{ marcarRef, refsDoCorpo \} from '\.\/anim-speed-ref\.js';/, 'importa anim-speed-ref.js'],
    [/const refs = \(_idx && _idx\.refs && _idx\.refs\[id\]\) \|\| \{\};/, 'lê refs do índice'],
    [/set\[s\] = c; marcarRef\(c, refs\[s\]\)/, 'marca a ref do clipe mesclado'],
    [/set\[s\] = g\.animations\[0\]; marcarRef\(set\[s\], refs\[s\]\)/, 'marca a ref do clipe por estado'],
    [/this\.refs = refsDoCorpo\(actions, model \? model\.scale\.x : 0, REFS_GLOBAIS\);/, 'resolve as refs com a escala do modelo'],
  ];
  for (const [re, oque] of exigido) if (!re.test(glbchars)) falhas.push(`R4 glbchars não ${oque} (ref global no lugar da do clipe)`);
  for (const estado of LOCO) if (!glbchars.includes(`rate(refs.${estado})`)) falhas.push(`R4 glbchars: ${estado} não usa a ref do clipe`);
  if (/rate\((WALK|RUN|CROUCH)_REF\)/.test(glbchars)) falhas.push('R4 glbchars: rate() ainda usa ref global direta');
}

/* R5 — pack mesclado decodifica no GLTFLoader do jogo (sem decoder: os clipes são float). */
if (!MUT) {
  await import('./three-node.mjs');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const loader = new GLTFLoader();
  for (const id of ids) {
    const esperados = S.filter((s) => ler(id, s));
    if (!esperados.length) continue;
    if (JSON.stringify(indice.clipes?.[id] || []) !== JSON.stringify(esperados)) falhas.push(`R5 ${id}: índice lista ${indice.clipes?.[id]}, pasta tem ${esperados}`);
    const f = path.join(ANIMS, `${id}.glb`);
    if (!fs.existsSync(f)) { falhas.push(`R5 ${id}: pack mesclado ausente`); continue; }
    const bytes = fs.readFileSync(f);
    try {
      const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
      const nomes = gltf.animations.map((a) => a.name);
      if (JSON.stringify([...nomes].sort()) !== JSON.stringify([...esperados].sort())) falhas.push(`R5 ${id}: mesclado tem ${nomes}, pasta tem ${esperados}`);
      for (const clip of gltf.animations) {
        const proprio = ler(id, clip.name);
        if (!proprio) { falhas.push(`R5 ${id}/${clip.name}: no mesclado e não na pasta`); continue; }
        const { json } = glbDe(proprio);
        const dur = Math.max(...(json?.animations?.[0]?.samplers || []).map((s) => json.accessors[s.input].max[0]));
        if (Math.abs(clip.duration - dur) > 1e-3) falhas.push(`R5 ${id}/${clip.name}: mesclado dura ${clip.duration}s, arquivo ${dur}s (rode npm run anims:merge)`);
        if (!clip.tracks.every((t) => Array.from(t.values).every(Number.isFinite))) falhas.push(`R5 ${id}/${clip.name}: track não finita`);
      }
    } catch (error) { falhas.push(`R5 ${id}: GLTFLoader não decodificou: ${error.message}`); }
  }
}

const porCorpo = ids.map((id) => data.corpos[id].e.filter((e) => e[0] === 1).length);
const resumo = `${trocados}/${trocados + mantidos} estados substituídos em ${porCorpo.filter(Boolean).length} corpos (${porCorpo.filter((n) => n === S.length).length} com 11/11)`
  + ` · ${mantidos} mantidos · ${refsTrocadas} refs de locomoção por personagem`
  + (medidos ? ` · pé medido em ${medidos} clipes, pior ${piorPe} cm (${piorPeQuem})` : '');
if (MUT) {
  const mordeu = falhas.some(MUTANTES[MUT]) && (MUT !== 'regra-ruido' || recusaRuido > 0);
  const detalhe = MUT === 'regra-ruido' ? ` — regra antiga recusa ${recusaRuido} estados válidos; ex.: ${exemploRuido}` : ` — ${falhas.find(MUTANTES[MUT]) || ''}`;
  console.log(mordeu ? `✓ mutante ${MUT} reprovado${detalhe}` : `MUTAÇÃO PASSOU — ${resumo}`);
  process.exit(mordeu ? 0 : 1);
}
if (falhas.length) {
  console.error(`ESTADOS-ASSADOS VERMELHO · ${falhas.length} falha(s)\n${falhas.slice(0, 20).join('\n')}`);
  process.exit(1);
}
console.log(`ESTADOS-ASSADOS ✓ ${resumo}; packs mesclados decodificados no GLTFLoader`);
