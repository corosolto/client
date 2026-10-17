import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { trafficEntry, uniqueRegister } from '../../src/lib/server-traffic.mjs';

describe('entradas HTML contadas no servidor', () => {
  it('guarda só host de origem e UTM curta, sem URL sensível nem identidade', () => {
    const request = new Request('https://www.corosolto.com.br/?utm_source=X&utm_campaign=segredo', {
      headers: { accept: 'text/html', referer: 'https://t.co/link?token=secret', 'user-agent': 'Mozilla/5.0' },
    });
    assert.deepEqual(trafficEntry(request), {
      landing: '/', referrer: 't.co', utmSource: 'x', kind: 'browser', agent: '',
    });
  });

  it('separa busca, treino, assistentes de IA e previews sociais com agente estável', () => {
    const req = (agent) => new Request('https://www.corosolto.com.br/sobre', { headers: { accept: 'text/html', 'user-agent': agent } });
    assert.deepEqual(trafficEntry(req('OAI-SearchBot/1.0')), { landing: '/sobre', referrer: null, utmSource: null, kind: 'ai-search', agent: 'openai/oai-searchbot' });
    assert.deepEqual(trafficEntry(req('Claude-User/1.0')), { landing: '/sobre', referrer: null, utmSource: null, kind: 'ai-assistant', agent: 'anthropic/claude-user' });
    assert.equal(trafficEntry(req('ClaudeBot/1.0'))?.kind, 'ai-training');
    assert.equal(trafficEntry(req('Googlebot/2.1'))?.kind, 'search-bot');
    assert.equal(trafficEntry(req('Twitterbot/1.0'))?.kind, 'social-preview');
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

  it('estima cliente diário com um registro HLL sem exportar IP ou hash', () => {
    const one = uniqueRegister('198.51.100.10', 'Mozilla/5.0', 'secret', '2026-10-15');
    assert.deepEqual(one, uniqueRegister('198.51.100.10', 'Mozilla/5.0', 'secret', '2026-10-15'));
    assert.ok(one.bucket >= 0 && one.bucket < 1024);
    assert.ok(one.rank >= 1 && one.rank <= 55);
    assert.notDeepEqual(one, uniqueRegister('198.51.100.10', 'Mozilla/5.0', 'secret', '2026-10-16'));
    assert.equal(JSON.stringify(one).includes('198.51'), false);
    const registers = new Uint8Array(1024);
    for (let n = 0; n < 1000; n++) {
      const value = uniqueRegister(`203.0.${Math.floor(n / 256)}.${n % 256}`, 'Mozilla/5.0', 'secret', '2026-10-15');
      registers[value.bucket] = Math.max(registers[value.bucket], value.rank);
    }
    const zeros = registers.filter((value) => value === 0).length;
    const raw = (0.7213 / (1 + 1.079 / 1024)) * 1024 * 1024 / registers.reduce((sum, value) => sum + 2 ** -value, 0);
    const estimate = raw <= 2560 && zeros ? 1024 * Math.log(1024 / zeros) : raw;
    assert.ok(estimate > 900 && estimate < 1100, `estimativa de mil clientes: ${estimate}`);
  });
});

describe('middleware de contagem', () => {
  it('registra o proxy no build da Vercel', () => {
    const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
    assert.equal(config.proxy?.entrypoint, 'middleware.js');
  });
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
        headers: { accept: 'text/html', referer: 'https://t.co/path?secret=private', 'user-agent': 'Mozilla/5.0', 'x-real-ip': '198.51.100.10' },
      });
      const response = middleware(request, { waitUntil(promise) { pending = promise; } });
      await pending;
      assert.equal(response.status, 200);
      const body = JSON.parse(captured.body);
      assert.deepEqual({ landing: body.landing, referrer: body.referrer, utmSource: body.utmSource, kind: body.kind, agent: body.agent }, { landing: '/', referrer: 't.co', utmSource: 'x', kind: 'browser', agent: '' });
      assert.ok(body.unique?.bucket >= 0 && body.unique?.rank >= 1);
      assert.equal(captured.body.includes('private'), false);
      assert.equal(captured.body.includes('198.51'), false);
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.API_PROXY_SECRET;
    }
  });
});
