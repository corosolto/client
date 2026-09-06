/* Sondas em condições hostis: caminho com espaço/acento, cwd inexistente, URL malformada,
   path traversal — cada uma já derrubou processo em vez de virar achado. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sondaPartidas } from '../probes/match.mjs';
import { servidorEstaticoDePublic, coerenciaDoGrafo } from '../probes/boot.mjs';
import { RAIZ_PADRAO } from '../lib/repo.mjs';

test('partidas: cwd inexistente (com espaço e acento) vira `fatal`, não exceção sem dono', { timeout: 20_000 }, async () => {
  const r = await sondaPartidas({ raiz: join(tmpdir(), 'não existe', 'csbr ops'), mapas: '1', modos: 'rounds', updates: 1, timeoutMs: 10_000 });
  assert.match(r.fatal || '', /worker não subiu|worker sem resposta/);
  assert.deepEqual(r.partidas, []);
});

test('coerência: raiz sem prod-coherence.mjs não é medida, e diz isso', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'csbr-ops-vazio-'));
  try {
    const c = await coerenciaDoGrafo('http://127.0.0.1:1', dir, 2000);
    assert.equal(c.exit, null);
    assert.match(c.saida, /ausente/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('servidor estático local: URL malformada é 400, traversal é 404, módulo real é 200', { timeout: 20_000 }, async () => {
  const s = await servidorEstaticoDePublic(RAIZ_PADRAO);
  try {
    const status = async (p) => (await fetch(`${s.base}${p}`, { signal: AbortSignal.timeout(5000) })).status;
    assert.equal(await status('/%E0%A4%A'), 400, 'decodeURIComponent inválido não pode derrubar o servidor');
    assert.equal(await status('/../package.json'), 404);
    assert.equal(await status('/js/version.js'), 200);
    assert.equal(await status('/'), 200);
  } finally { await s.fechar(); }
});
