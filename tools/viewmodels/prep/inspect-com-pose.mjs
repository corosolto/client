#!/usr/bin/env node
/**
 * Inspeção que só anima `RIG_FP_ARMS`: os 66 ossos de braço/mão ficam na pose de ligação e a arma
 * sai do quadro (crítico cego L3–L5: "não aparece nenhuma mão" na deagle; a PT-38 tem o mesmo clipe).
 * Preenche o clipe `inspect` com os canais do `idle` (em laço) para todo nó que o idle anima e o
 * inspect não. O giro de `RIG_FP_ARMS` do pacote (2,8°) não se lê na tela: é multiplicado por `ganhoGiro`
 * (o verify da deagle cobra 2,5 cm de excursão da arma). A M400 tem a pose de ligação no saque abaixado
 * (0,41 m / 20° do idle), que o idle não anima; shoot/inspect/equip_rifle só animam VM_PACKAGE_M400
 * partindo da identidade e subiam os braços 0,4 m ("braços do teto" no tiro): o canal passa a ser
 * composto sobre o repouso (`sobreORepouso`). Antes/depois: docs/reports/VM-FIX-L3L5.md.
 *
 * Uso: node tools/viewmodels/prep/inspect-com-pose.mjs --arma=deagle|m400 --source=<glb> --output-dir=<fora-do-git>
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { Pose, THREE, duration, gravarClipe } from './fk-gltf.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ARMAS = {
  deagle: { sha: 'd482ff82bceba3690ff4dd5912f95851d538320a55d9d7f37cf56e32fd2c64a4', arquivo: 'deagle-runtime.glb', arma: 'MINT_WEAPON_DEAGLE',
    clipes: { inspect: 5 } },
  // Entrada = saída de desvira-malha.mjs --arma=m400.
  m400: { sha: '1aba50ea9349057c5e6fbd6af7002ebd5a6f64f24069ac5f507ef2def3038ba7', arquivo: 'm400-baked-runtime.glb', arma: 'MINT_WEAPON_M400',
    clipes: { shoot: 1, inspect: 1, equip_rifle: 1 }, sobreORepouso: 'VM_PACKAGE_M400' },
};
const option = (name) => (process.argv.find((value) => value.startsWith(`--${name}=`)) || '').slice(name.length + 3);
const cfg = ARMAS[option('arma')];
if (!cfg || !option('source') || !option('output-dir')) throw new Error(`uso: --arma=${Object.keys(ARMAS).join('|')} --source=<glb> --output-dir=<dir>`);
const outputDir = path.resolve(option('output-dir'));
if (!path.relative(REPO, outputDir).startsWith('..')) throw new Error('output-dir precisa ficar fora do Git');
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const sourceBytes = await fs.readFile(path.resolve(option('source')));
if (digest(sourceBytes) !== cfg.sha) throw new Error(`fonte ${option('arma')} divergente: ${digest(sourceBytes)}`);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(path.resolve(option('source')));
const P = new Pose(doc);

const idle = P.clip('idle');
const animados = (clip) => new Set(clip.listChannels().map((c) => c.getTargetNode()));
const noIdle = animados(idle);
const dIdle = duration(idle);
const raiz = P.node('RIG_FP_ARMS');
const q0 = new THREE.Quaternion(...raiz.getRotation());
// Pivô na arma (idle t=0): o giro ampliado vira a arma na mão em vez de balançar o braço inteiro.
P.set('idle', 0);
const pivo = P.pos(cfg.arma);
const pai = P.parent.get(raiz); const paiW = pai ? P.world(pai) : new THREE.Matrix4();
const resumo = {};
for (const [nome, ganho] of Object.entries(cfg.clipes)) {
  const clip = P.clip(nome);
  const noClip = animados(clip);
  const faltam = [...noIdle].filter((n) => !noClip.has(n));
  const d = duration(clip);
  const ts = []; for (let t = 0; t < d - 1e-6; t += 1 / 30) ts.push(+t.toFixed(5)); ts.push(+d.toFixed(5));
  const faixas = new Map(faltam.map((n) => [n, []]));
  for (const t of ts) { P.set('idle', dIdle > 0 ? t % dIdle : 0); for (const n of faltam) faixas.get(n).push(P.trs(n)); }
  if (ganho !== 1) faixas.set(raiz, ts.map((t) => {
    P.set(nome, t); const trs = P.trs(raiz);
    const delta = q0.clone().invert().multiply(new THREE.Quaternion(...trs.rotation));
    const ang = 2 * Math.acos(Math.min(1, Math.abs(delta.w)));
    const eixoLocal = ang > 1e-6 ? new THREE.Vector3(delta.x, delta.y, delta.z).multiplyScalar(Math.sign(delta.w) || 1).normalize() : new THREE.Vector3(1, 0, 0);
    const eixo = eixoLocal.applyQuaternion(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().extractRotation(paiW)).multiply(q0)).normalize();
    const R = new THREE.Matrix4().makeTranslation(pivo.x, pivo.y, pivo.z).multiply(new THREE.Matrix4().makeRotationAxis(eixo, ang * ganho)).multiply(new THREE.Matrix4().makeTranslation(-pivo.x, -pivo.y, -pivo.z));
    const W0 = paiW.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(...trs.translation), q0, new THREE.Vector3(...trs.scale)));
    return P.localFor(raiz, R.multiply(W0));
  }));
  if (cfg.sobreORepouso) {
    const no = P.node(cfg.sobreORepouso);
    const R0 = new THREE.Matrix4().compose(new THREE.Vector3(...no.getTranslation()), new THREE.Quaternion(...no.getRotation()), new THREE.Vector3(...no.getScale()));
    faixas.set(no, ts.map((t) => { P.set(nome, t); const trs = P.trs(no);
      const M = R0.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(...trs.translation), new THREE.Quaternion(...trs.rotation), new THREE.Vector3(...trs.scale)));
      const tt = new THREE.Vector3(); const q = new THREE.Quaternion(); const sc = new THREE.Vector3(); M.decompose(tt, q, sc);
      return { translation: tt.toArray(), rotation: [q.x, q.y, q.z, q.w], scale: sc.toArray() }; }));
  }
  gravarClipe(doc, nome, ts, faixas);
  resumo[nome] = { ganhoGiro: ganho, canaisAntes: noClip.size, preenchidosDoIdle: faltam.length, duracao: d };
}

await fs.mkdir(outputDir, { recursive: true });
const output = path.join(outputDir, cfg.arquivo);
await io.write(output, doc);
const outputBytes = await fs.readFile(output);
const report = { schemaVersion: 1, weapon: option('arma'), clipes: resumo, idleEmLaco: dIdle,
  source: { bytes: sourceBytes.length, sha256: cfg.sha }, product: { file: output, bytes: outputBytes.length, sha256: digest(outputBytes) } };
await fs.writeFile(path.join(outputDir, `${option('arma')}-inspect.json`), `${JSON.stringify(report, null, 2)}\n`);
console.log(`INSPECT_OK ${JSON.stringify(report)}`);
