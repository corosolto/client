import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import * as landing from '../../public/js/landing-app.js';
import { desvioParaApp, trafficEntry, uniqueRegister } from '../../src/lib/server-traffic.mjs';

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

  it('navegador interno de app é browser (gente), com o app nomeado e referrer/UTM preservados', () => {
    const req = (agent) => new Request('https://www.corosolto.com.br/?utm_source=tiktok', { headers: { accept: 'text/html', referer: 'https://www.tiktok.com/', 'user-agent': agent } });
    const tiktok = 'Mozilla/5.0 (Linux; Android 14; SM-A155M Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.107 Mobile Safari/537.36 musical_ly_2024.12 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/38.2.5 ByteLocale/pt-BR ByteFullLocale/pt-BR Region/BR BytedanceWebview/d8a21c6';
    assert.deepEqual(trafficEntry(req(tiktok)), { landing: '/', referrer: 'www.tiktok.com', utmSource: 'tiktok', kind: 'browser', agent: 'app/tiktok' });
    assert.equal(trafficEntry(req('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21F90 Instagram 334.0.4.32.98 (iPhone15,2; iOS 17_5; pt_BR; pt; scale=3.00; 1179x2556; 606166883)'))?.agent, 'app/instagram');
    assert.equal(trafficEntry(req('Mozilla/5.0 (Linux; Android 13; SM-G991B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.42.75;]'))?.agent, 'app/facebook');
    assert.equal(trafficEntry(req('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 LinkedInApp'))?.agent, 'app/linkedin');
    // Chrome comum continua sem agente: o campo vazio é o que separa navegador aberto de app.
    assert.deepEqual(trafficEntry(req('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36')), { landing: '/', referrer: 'www.tiktok.com', utmSource: 'tiktok', kind: 'browser', agent: '' });
    // O preview do Facebook (facebookexternalhit) é bot de preview, nunca app.
    assert.equal(trafficEntry(req('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'))?.kind, 'social-preview');
  });

  it('WebView de app na home vai para /app com a query intacta; escolha feita, sala, rota funda, Chrome e bot ficam', () => {
    const TIKTOK = 'Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36 musical_ly_2024.12 BytedanceWebview/d8a21c6';
    const req = (url, ua = TIKTOK, method = 'GET') => new Request(url, { method, headers: { accept: 'text/html', 'user-agent': ua } });
    assert.equal(desvioParaApp(req('https://www.corosolto.com.br/?utm_source=tiktok&utm_medium=paid-social')), 'https://www.corosolto.com.br/app?utm_source=tiktok&utm_medium=paid-social');
    assert.equal(desvioParaApp(req('https://www.corosolto.com.br')), 'https://www.corosolto.com.br/app');
    assert.equal(desvioParaApp(req('https://www.corosolto.com.br/?utm_source=tiktok&jogo=1')), null, 'quem já escolheu jogar não volta');
    assert.equal(desvioParaApp(req('https://www.corosolto.com.br/?sala=ABCD')), null, 'convite de sala entra direto');
    assert.equal(desvioParaApp(req('https://www.corosolto.com.br/app?utm_source=tiktok')), null, 'a própria landing não redireciona');
    assert.equal(desvioParaApp(req('https://www.corosolto.com.br/u/alguem')), null, 'perfil segue onde aponta');
    assert.equal(desvioParaApp(req('https://www.corosolto.com.br/', 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36')), null, 'Chrome aberto não é WebView');
    assert.equal(desvioParaApp(req('https://www.corosolto.com.br/', 'facebookexternalhit/1.1')), null, 'preview de rede não é gente');
    assert.equal(desvioParaApp(req('https://www.corosolto.com.br/', TIKTOK, 'HEAD')), null);
    assert.equal(desvioParaApp(req('https://preview.vercel.app/')), null, 'só o host público');
    assert.equal(trafficEntry(req('https://www.corosolto.com.br/app?utm_source=tiktok'))?.landing, '/app', 'a landing conta como página própria');
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
  it('WebView de app na home recebe 302 para /app antes de qualquer ingestão', async () => {
    process.env.API_PROXY_SECRET = 'test-only-secret-for-server-traffic-000000';
    const { default: middleware } = await import('../../middleware.js');
    const originalFetch = globalThis.fetch;
    let chamadas = 0;
    globalThis.fetch = async () => { chamadas++; return new Response(null, { status: 204 }); };
    try {
      const request = new Request('https://www.corosolto.com.br/?utm_source=tiktok&utm_medium=paid-social', {
        headers: { accept: 'text/html', 'user-agent': 'Mozilla/5.0 (Linux; Android 14; wv) Chrome/130.0 Mobile Safari/537.36 musical_ly_2024.12 BytedanceWebview/x', 'x-real-ip': '198.51.100.10' },
      });
      const response = middleware(request, { waitUntil() { assert.fail('redirect não agenda ingestão'); } });
      assert.equal(response.status, 302);
      assert.equal(response.headers.get('location'), 'https://www.corosolto.com.br/app?utm_source=tiktok&utm_medium=paid-social');
      assert.equal(chamadas, 0);
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.API_PROXY_SECRET;
    }
  });
});

describe('landing /app: alvo do navegador externo', () => {
  it('iOS monta UMA autoridade https; Android usa intent com fallback https codificado', () => {
    const { alvoExterno } = landing;
    const destino = new URL('https://www.corosolto.com.br/?utm_source=tiktok&utm_medium=paid-social&jogo=1');
    const ios = alvoExterno(destino, 'ios');
    assert.equal(ios, 'x-safari-https://www.corosolto.com.br/?utm_source=tiktok&utm_medium=paid-social&jogo=1');
    assert.equal(ios.match(/https:\/\//g).length, 1, 'autoridade https dobrada (o bug do estraga-codigo)');
    const android = alvoExterno(destino, 'android');
    assert.ok(android.startsWith('intent://www.corosolto.com.br/?'), android);
    assert.ok(android.includes('S.browser_fallback_url=' + encodeURIComponent(destino.href)));
    assert.ok(android.endsWith(';end'));
  });
});
