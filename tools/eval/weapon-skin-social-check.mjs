import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const SKIN_ID = process.env.SKIN_ID || 'ondas-cariocas';
const TARGETS = Object.freeze({
  'ondas-cariocas': 'm4',
  'mosaico-paulista': 'scar',
  'nacao-rubro-negra': 'ak',
  'alvinegra-paulista': 'ak',
  'celeste-mineira': 'ak',
  'tricolor-gaucha': 'ak',
  'tricolor-baiana': 'ak',
  'verde-alviverde': 'ak',
  'tricolor-morumbi': 'ak',
  'alvinegra-praiana': 'ak',
});
const WEAPON_ID = TARGETS[SKIN_ID];
assert.ok(WEAPON_ID, `skin desconhecida: ${SKIN_ID}`);
const OUT = process.env.SOCIAL_OUT || path.resolve(ROOT, `../../launch-media/2026-10-18-${SKIN_ID}`);
const receipt = JSON.parse(readFileSync(path.join(OUT, 'receipt.json')));
assert.equal(receipt.schemaVersion, 'cs-social-video/1');
assert.equal(receipt.skinId, SKIN_ID);
assert.equal(receipt.weaponId, WEAPON_ID);
assert.equal(receipt.mapId, 'parque_treta');
const expected = { horizontal: [1280, 720], vertical: [720, 1280] };
const summary = {};
for (const [id, dimensions] of Object.entries(expected)) {
  const output = receipt.outputs[id];
  assert.ok(output, `${id}: saída ausente`);
  assert.deepEqual([output.width, output.height], dimensions, `${id}: recibo com dimensão errada`);
  assert.deepEqual(output.consoleErrors, [], `${id}: erros de console inesperados`);
  assert.deepEqual(output.pageErrors, [], `${id}: erros de página`);
  assert.deepEqual(output.unexpectedResponses, [], `${id}: respostas HTTP inesperadas`);
  assert.deepEqual(output.unexpectedRequests, [], `${id}: falhas de requisição inesperadas`);
  assert.ok(Array.isArray(output.knownCaptureNoise?.console), `${id}: dívida conhecida sem registro`);
  for (const file of [output.file, output.poster, output.thirdPersonPoster]) assert.ok(existsSync(file) && statSync(file).size > 0, `${id}: arquivo ausente ${file}`);
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,width,height:format=duration,size', '-of', 'json', output.file], { encoding: 'utf8' }));
  const video = probe.streams.find((stream) => stream.width && stream.height);
  assert.equal(video.codec_name, 'h264', `${id}: codec não é H.264`);
  assert.deepEqual([video.width, video.height], dimensions, `${id}: resolução real errada`);
  const duration = Number(probe.format.duration);
  assert.ok(duration >= 5.9 && duration <= 6.1, `${id}: duração ${duration}`);
  assert.equal(Number(probe.format.size), statSync(output.file).size, `${id}: bytes divergentes`);
  summary[id] = { duration, width: video.width, height: video.height, bytes: Number(probe.format.size) };
}
console.log(`weapon-skin social check: ${JSON.stringify(summary)}`);
