import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { verificarDeploy } from '../cf/verifica-deploy.mjs';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const raiz = mkdtempSync(path.join(tmpdir(), 'cs-cf-deploy-'));
const dist = path.join(raiz, 'dist');
const manifestPath = path.join(raiz, 'viewmodels.json');
const commit = 'a'.repeat(40);
const audio = Buffer.from('{"audio":true}\n');
const correto = Buffer.from('GLB-CORRETO');
const corrupto = Buffer.from('GLB-CORRUPT');
assert.equal(corrupto.length, correto.length, 'fixture corrupta precisa preservar o tamanho');
const digest = sha256(correto);

mkdirSync(path.join(dist, 'audio'), { recursive: true });
writeFileSync(path.join(dist, 'audio/manifest.json'), audio);
writeFileSync(manifestPath, JSON.stringify({ files: [{ path: 'arma.glb', bytes: correto.length, sha256: digest }] }));

const executar = async (body) => {
  const metodos = [];
  const fetchImpl = async (url, init = {}) => {
    if (url.endsWith('/')) return new Response(`GIT_SHA = "${commit}"`, { status: 200 });
    if (url.endsWith('/audio/manifest.json')) return new Response(audio, { status: 200 });
    if (url.includes('/private-assets/viewmodels/')) {
      metodos.push(init.method || 'GET');
      return new Response(body, {
        status: 200,
        headers: { 'content-length': String(correto.length), etag: `"${digest}"` },
      });
    }
    throw new Error(`URL inesperada: ${url}`);
  };
  const resultado = await verificarDeploy({
    base: 'https://fixture.invalid', sha: commit, dist, manifestPath, fetchImpl, log: () => {},
  });
  return { ...resultado, metodos };
};

try {
  const ruim = await executar(corrupto);
  assert.deepEqual(ruim.falhas, ['D3'], 'D3 precisa rejeitar corpo corrupto com tamanho e ETag forjados');
  assert.deepEqual(ruim.metodos, ['GET'], 'D3 precisa baixar o corpo, não confiar em HEAD');

  const bom = await executar(correto);
  assert.deepEqual(bom.falhas, [], 'o corpo correto precisa passar D1-D3');
  assert.deepEqual(bom.metodos, ['GET']);
  console.log('PASS CF-DEPLOY: D3 valida bytes mesmo com tamanho e ETag plausíveis');
} finally {
  rmSync(raiz, { recursive: true, force: true });
}
