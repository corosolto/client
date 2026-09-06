export async function proxyApiRequest(request, target, clientAddress, fetchFn = fetch) {
  const upstreamHeaders = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) upstreamHeaders.set('content-type', contentType);
  if (clientAddress) upstreamHeaders.set('x-forwarded-for', clientAddress);
  // Geo da borda da Vercel: o backend lê `x-vercel-ip-*` como segunda fonte (api/_lib/geo.ts)
  // e é a única origem de city_daily; sem repassar, telemetria que passa por aqui perde
  // país e cidade em silêncio. Só estes quatro - cookie/authorization continuam de fora.
  for (const nome of ['x-vercel-ip-country', 'x-vercel-ip-city', 'x-vercel-ip-latitude', 'x-vercel-ip-longitude']) {
    const valor = request.headers.get(nome);
    if (valor) upstreamHeaders.set(nome, valor);
  }

  const temCorpo = request.method !== 'GET' && request.method !== 'HEAD';
  const upstream = await fetchFn(target, {
    method: request.method,
    headers: upstreamHeaders,
    body: temCorpo ? await request.arrayBuffer() : undefined,
    redirect: 'manual',
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
