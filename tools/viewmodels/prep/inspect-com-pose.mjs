#!/usr/bin/env node
/**
 * Inspeção que só anima `RIG_FP_ARMS`: os 66 ossos de braço/mão ficam na pose de ligação e a arma
 * sai do quadro (crítico cego L3–L5: "não aparece nenhuma mão" na deagle; a PT-38 tem o mesmo clipe).
 * Preenche o clipe `inspect` com os canais do `idle` (em laço) para todo nó que o idle anima e o
 * inspect não. O giro de `RIG_FP_ARMS` do pacote (2,8°) não se lê na tela: é multiplicado por `ganhoGiro`
 * (o verify da deagle cobra 2,5 cm de excursão da arma). Antes/depois: docs/reports/VM-FIX-L3L5.md.
 *
 * Uso: node tools/viewmodels/prep/inspect-com-pose.mjs --arma=deagle --source=<glb> --output-dir=<fora-do-git>
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
  deagle: { sha: 'd482ff82bceba3690ff4dd5912f95851d538320a55d9d7f37cf56e32fd2c64a4', arquivo: 'deagle-runtime.glb', arma: 'MINT_WEAPON_DEAGLE', ganhoGiro: 5 },
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
const inspect = P.clip('inspect');
const animados = (clip) => new Set(clip.listChannels().map((c) => c.getTargetNode()));
const noIdle = animados(idle);
const noInspect = animados(inspect);
const faltam = [...noIdle].filter((n) => !noInspect.has(n));
const dIdle = duration(idle);
const dInsp = duration(inspect);
const ts = []; for (let t = 0; t < dInsp - 1e-6; t += 1 / 30) ts.push(+t.toFixed(5)); ts.push(+dInsp.toFixed(5));
const faixas = new Map(faltam.map((n) => [n, []]));
for (const t of ts) {
  P.set('idle', dIdle > 0 ? t % dIdle : 0);
  for (const n of faltam) faixas.get(n).push(P.trs(n));
}
const raiz = P.node('RIG_FP_ARMS');
const q0 = new THREE.Quaternion(...raiz.getRotation());
// Pivô na arma (idle t=0): o giro ampliado vira a arma na mão em vez de balançar o braço inteiro.
P.set('idle', 0);
const pivo = P.pos(cfg.arma);
const pai = P.parent.get(raiz); const paiW = pai ? P.world(pai) : new THREE.Matrix4();
faixas.set(raiz, ts.map((t) => {
  P.set('inspect', t); const trs = P.trs(raiz);
  const delta = q0.clone().invert().multiply(new THREE.Quaternion(...trs.rotation));
  const ang = 2 * Math.acos(Math.min(1, Math.abs(delta.w)));
  const eixoLocal = ang > 1e-6 ? new THREE.Vector3(delta.x, delta.y, delta.z).multiplyScalar(Math.sign(delta.w) || 1).normalize() : new THREE.Vector3(1, 0, 0);
  const eixo = eixoLocal.applyQuaternion(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().extractRotation(paiW)).multiply(q0)).normalize();
  const R = new THREE.Matrix4().makeTranslation(pivo.x, pivo.y, pivo.z).multiply(new THREE.Matrix4().makeRotationAxis(eixo, ang * cfg.ganhoGiro)).multiply(new THREE.Matrix4().makeTranslation(-pivo.x, -pivo.y, -pivo.z));
  const W0 = paiW.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(...trs.translation), q0, new THREE.Vector3(...trs.scale)));
  return P.localFor(raiz, R.multiply(W0));
}));
gravarClipe(doc, 'inspect', ts, faixas);

await fs.mkdir(outputDir, { recursive: true });
const output = path.join(outputDir, cfg.arquivo);
await io.write(output, doc);
const outputBytes = await fs.readFile(output);
const report = { schemaVersion: 1, weapon: option('arma'), inspect: { ganhoGiro: cfg.ganhoGiro, canaisAntes: noInspect.size, preenchidosDoIdle: faltam.length, duracao: dInsp, idleEmLaco: dIdle },
  source: { bytes: sourceBytes.length, sha256: cfg.sha }, product: { file: output, bytes: outputBytes.length, sha256: digest(outputBytes) } };
await fs.writeFile(path.join(outputDir, `${option('arma')}-inspect.json`), `${JSON.stringify(report, null, 2)}\n`);
console.log(`INSPECT_OK ${JSON.stringify(report)}`);
