import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { trafficEntry } from '../../src/lib/server-traffic.mjs';

describe('entradas HTML contadas no servidor', () => {
  it('guarda só host de origem e UTM curta, sem URL sensível nem identidade', () => {
    const request = new Request('https://www.corosolto.com.br/?utm_source=X&utm_campaign=segredo', {
      headers: { accept: 'text/html', referer: 'https://t.co/link?token=secret', 'user-agent': 'Mozilla/5.0' },
    });
    assert.deepEqual(trafficEntry(request), {
      landing: '/', referrer: 't.co', utmSource: 'x', kind: 'browser',
    });
  });

  it('separa bot de busca, bot de treino e ferramentas automáticas', () => {
    const req = (agent) => new Request('https://www.corosolto.com.br/sobre', { headers: { accept: 'text/html', 'user-agent': agent } });
    assert.equal(trafficEntry(req('OAI-SearchBot/1.0'))?.kind, 'search-bot');
    assert.equal(trafficEntry(req('ClaudeBot/1.0'))?.kind, 'ai-training');
    assert.equal(trafficEntry(req('curl/8.0'))?.kind, 'automation');
  });

  it('não conta recursos, API, HEAD ou hosts de preview', () => {
    const entry = (url, method = 'GET', accept = 'text/html') => trafficEntry(new Request(url, { method, headers: { accept } }));
    assert.equal(entry('https://www.corosolto.com.br/api/health'), null);
    assert.equal(entry('https://www.corosolto.com.br/logo.png', 'GET', 'image/png'), null);
    assert.equal(entry('https://www.corosolto.com.br/', 'HEAD'), null);
    assert.equal(entry('https://preview.vercel.app/'), null);
  });

  it('não grava convite de sala ou caminhos arbitrários', () => {
    const req = (path) => new Request(`https://www.corosolto.com.br${path}`, {
      headers: { accept: 'text/html', 'user-agent': 'Mozilla/5.0' },
    });
    assert.equal(trafficEntry(req('/sala/codigo-secreto'))?.landing, '/sala/:convite');
    assert.equal(trafficEntry(req('/u/123/usuario'))?.landing, '/u/:perfil');
    assert.equal(trafficEntry(req('/token/segredo'))?.landing, '/outra-rota');
  });
});

describe('middleware de contagem', () => {
  it('envia apenas o agregado mínimo e não bloqueia a página', async () => {
    process.env.API_PROXY_SECRET = 'test-only-secret-for-server-traffic-000000';
    const { default: middleware } = await import('../../middleware.js');
    const originalFetch = globalThis.fetch;
    let captured;
    let pending;
    globalThis.fetch = async (_url, init) => {
      captured = init;
      return new Response(null, { status: 204 });
    };
    try {
      const request = new Request('https://www.corosolto.com.br/?utm_source=x&token=private', {
        headers: { accept: 'text/html', referer: 'https://t.co/path?secret=private', 'user-agent': 'Mozilla/5.0' },
      });
      const response = middleware(request, { waitUntil(promise) { pending = promise; } });
      await pending;
      assert.equal(response.status, 200);
      assert.deepEqual(JSON.parse(captured.body), { landing: '/', referrer: 't.co', utmSource: 'x', kind: 'browser' });
      assert.equal(captured.body.includes('private'), false);
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.API_PROXY_SECRET;
    }
  });
});
