#!/usr/bin/env node
/* ESTADOS-ASSADOS: o GLB servido é o pack medido pelo Studio e mantém contato/quadril.
   O teto de -3 cm vem do contrato da lane; quadril usa exatamente o limite do Studio:
   max(1,08× bind, máximo da fonte +0,08). Hash/int16/meshopt impedem trocar o asset sem
   renovar a evidência. --mutante=pe-afundado injeta os -13,37 cm da morte antiga do bonzo. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const MUT = process.argv.find((a) => a.startsWith('--mutante='))?.split('=')[1] || '';
if (MUT && MUT !== 'pe-afundado') throw new Error(`mutante desconhecido: ${MUT}`);
const ARQ = path.resolve('public/models/anims/baked-states.json');
const data = JSON.parse(fs.readFileSync(ARQ, 'utf8'));
if (MUT === 'pe-afundado') {
  const death = data.bodies.bonzo?.states.death;
  if (!death) throw new Error('mutante não aplicou: bonzo/death ausente');
  death.lowestVertexCm = -13.37;
}
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const falhas = [];
let clips = 0, piorPe = Infinity, piorPeQuem = '', piorFolgaHips = Infinity, piorHipsQuem = '';
for (const [id, body] of Object.entries(data.bodies || {})) {
  if (id.includes('-cyborg-') || id.includes('-drip-') || id.includes('-mandrake-')) falhas.push(`${id}: skin entrou no pipeline de BODIES`);
  const mergedPath = path.resolve('public/models/anims', `${id}.glb`);
  if (!fs.existsSync(mergedPath)) { falhas.push(`${id}: pack mesclado ausente`); continue; }
  const merged = fs.readFileSync(mergedPath);
  if (sha(merged) !== body.sha256 || merged.length !== body.bytes) falhas.push(`${id}: pack difere do QA gerado; rode o importador`);
  for (const [state, m] of Object.entries(body.states || {})) {
    clips++;
    if (!Number.isFinite(m.lowestVertexCm) || !Number.isFinite(m.hipsMaxRatio) || !Number.isFinite(m.hipsLimitRatio)) {
      falhas.push(`${id}/${state}: QA incompleto`); continue;
    }
    if (m.lowestVertexCm < piorPe) { piorPe = m.lowestVertexCm; piorPeQuem = `${id}/${state}`; }
    if (m.lowestVertexCm < data.thresholds.lowestVertexCm) falhas.push(`${id}/${state}: vértice ${m.lowestVertexCm} cm < ${data.thresholds.lowestVertexCm} cm`);
    const folga = m.hipsLimitRatio - m.hipsMaxRatio;
    if (!m.airborne && folga < piorFolgaHips) { piorFolgaHips = folga; piorHipsQuem = `${id}/${state}`; }
    if (!m.airborne && m.hipsMaxRatio > m.hipsLimitRatio + 1e-9) falhas.push(`${id}/${state}: quadril ${m.hipsMaxRatio}× > ${m.hipsLimitRatio}×`);
    const expectedLimit = Math.max(data.thresholds.hipsMaxRatio, (m.hipsSourceMaxRatio ?? -Infinity) + data.thresholds.hipsOverSourceRatio);
    if (Math.abs(expectedLimit - m.hipsLimitRatio) > 1e-9) falhas.push(`${id}/${state}: limite de quadril diverge do Studio`);
    const fallback = path.resolve('public/models/anims', id, `${state}.glb`);
    if (!fs.existsSync(fallback)) { falhas.push(`${id}/${state}: fallback ausente`); continue; }
    const bytes = fs.readFileSync(fallback);
    if (sha(bytes) !== m.sha256 || bytes.length !== m.bytes) falhas.push(`${id}/${state}: fallback difere do QA gerado`);
    for (const ref of ['walk', 'run', 'crouchwalk', 'walk1h', 'walkfire']) {
      if (!(body.refs?.[ref] > 0)) falhas.push(`${id}: velocidade ${ref} ausente`);
    }
  }
}

// Prova no MESMO GLTFLoader do jogo: meshopt + int16 normalizado viram clipes Three finitos.
if (!falhas.length) {
  const { THREE } = await import('./three-node.mjs');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { MeshoptDecoder } = await import('../../public/vendor/meshopt_decoder.module.js');
  await MeshoptDecoder.ready;
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  for (const id of Object.keys(data.bodies)) {
    const bytes = fs.readFileSync(path.resolve('public/models/anims', `${id}.glb`));
    try {
      const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
      const names = gltf.animations.map((a) => a.name).sort();
      if (JSON.stringify(names) !== JSON.stringify([...data.states].sort())) falhas.push(`${id}: clipes decodificados divergentes`);
      for (const clip of gltf.animations) {
        if (!(clip.duration > 0) || !clip.tracks.length) falhas.push(`${id}/${clip.name}: clipe vazio após decode`);
        for (const track of clip.tracks) {
          if (!Array.from(track.values).every(Number.isFinite)) falhas.push(`${id}/${clip.name}: track não finita`);
          if (!(track instanceof THREE.KeyframeTrack)) falhas.push(`${id}/${clip.name}: track inválida`);
        }
      }
    } catch (error) { falhas.push(`${id}: GLTFLoader não decodificou: ${error.message}`); }
  }
}

const resumo = `${Object.keys(data.bodies || {}).length} corpos/${clips} estados · pior mínimo ${piorPe} cm (${piorPeQuem}) · menor folga de quadril ${piorFolgaHips.toFixed(4)}× (${piorHipsQuem})`;
if (MUT) {
  const mordeu = falhas.some((f) => f.includes('bonzo/death') && f.includes('-13.37'));
  console.log(mordeu ? `✓ mutante pe-afundado reprovado: ${resumo}` : `MUTAÇÃO PASSOU — ${resumo}`);
  process.exit(mordeu ? 0 : 1);
}
if (falhas.length) {
  console.error(`ESTADOS-ASSADOS VERMELHO · ${falhas.length} falha(s)\n${falhas.slice(0, 20).join('\n')}`);
  process.exit(1);
}
console.log(`ESTADOS-ASSADOS ✓ ${resumo}; 11/11 clipes decodificados por corpo`);
