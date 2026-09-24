import { BlockList, isIP } from 'node:net';

/* Salto da Cloudflare (faixas de cloudflare.com/ips): x-vercel-ip-* descreve o PoP e valem os
   cf-*. Fora dessas faixas os cf-* são forjáveis e vale a geo da Vercel. */
const CLOUDFLARE_V4 = [
  '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18',
  '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17',
  '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
];
const CLOUDFLARE_V6 = [
  '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32',
  '2a06:98c0::/29', '2c0f:f248::/32',
];
const cloudflare = new BlockList();
for (const faixa of CLOUDFLARE_V4) { const [ip, bits] = faixa.split('/'); cloudflare.addSubnet(ip, Number(bits), 'ipv4'); }
for (const faixa of CLOUDFLARE_V6) { const [ip, bits] = faixa.split('/'); cloudflare.addSubnet(ip, Number(bits), 'ipv6'); }

// Cold start do Cloud Run (~1 s) cabe; backend pendurado não segura a função da Vercel.
const TEMPO_MAXIMO_MS = 10_000;
const GEO_VERCEL = ['x-vercel-ip-country', 'x-vercel-ip-city', 'x-vercel-ip-latitude', 'x-vercel-ip-longitude'];
const GEO_CLOUDFLARE = ['cf-ipcountry', 'cf-ipcity', 'cf-iplatitude', 'cf-iplongitude'];

export function saltoDaCloudflare(ip) {
  const tipo = isIP(String(ip || ''));
  return tipo ? cloudflare.check(ip, tipo === 4 ? 'ipv4' : 'ipv6') : false;
}

// A Cloudflare manda a cidade em UTF-8 cru, que o runtime lê como latin1; já codificada, passa.
const cidadeCodificada = (bruto) => {
  if (/%[0-9A-Fa-f]{2}/.test(bruto)) { try { decodeURIComponent(bruto); return bruto; } catch { /* segue */ } }
  const utf8 = Buffer.from(bruto, 'latin1').toString('utf8');
  return encodeURIComponent(utf8.includes('�') ? bruto : utf8);
};

/* Uma fonte só por requisição: país da Cloudflare com cidade do PoP da Vercel é pior que
   cidade ausente. Sem o Managed Transform de localização, a Cloudflare manda só o país. */
export function origemDoJogador(request, clientAddress) {
  const h = request.headers;
  if (saltoDaCloudflare(clientAddress)) {
    const real = h.get('cf-connecting-ip') || '';
    const geo = {};
    for (const nome of GEO_CLOUDFLARE) {
      const valor = h.get(nome);
      if (valor) geo[nome] = nome === 'cf-ipcity' ? cidadeCodificada(valor) : valor;
    }
    return { ip: isIP(real) ? real : clientAddress, geo, borda: 'cloudflare' };
  }
  const geo = {};
  for (const nome of GEO_VERCEL) {
    const valor = h.get(nome);
    if (valor) geo[nome] = valor;
  }
  return { ip: clientAddress || '', geo, borda: 'vercel' };
}

export async function proxyApiRequest(request, target, clientAddress, fetchFn = fetch, { segredo = '' } = {}) {
  const upstreamHeaders = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) upstreamHeaders.set('content-type', contentType);
  // Geo e IP do jogador: o backend só confia neles com o segredo (api/_lib/borda.mjs, backend#22).
  // Só estes; cookie/authorization e o resto do navegador continuam de fora.
  const origem = origemDoJogador(request, clientAddress);
  if (origem.ip) {
    upstreamHeaders.set('x-forwarded-for', origem.ip);
    upstreamHeaders.set('x-csb-client-ip', origem.ip);
  }
  for (const [nome, valor] of Object.entries(origem.geo)) upstreamHeaders.set(nome, valor);
  if (segredo) upstreamHeaders.set('x-csb-proxy-auth', segredo);

  const temCorpo = request.method !== 'GET' && request.method !== 'HEAD';
  const upstream = await fetchFn(target, {
    method: request.method,
    headers: upstreamHeaders,
    body: temCorpo ? await request.arrayBuffer() : undefined,
    redirect: 'manual',
    signal: AbortSignal.timeout(TEMPO_MAXIMO_MS),
  });

  const responseHeaders = new Headers();
  for (const nome of ['content-type', 'cache-control', 'etag', 'last-modified']) {
    const valor = upstream.headers.get(nome);
    if (valor) responseHeaders.set(nome, valor);
  }
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
