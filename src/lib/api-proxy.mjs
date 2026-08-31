export async function proxyApiRequest(request, target, clientAddress, fetchFn = fetch) {
  const upstreamHeaders = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) upstreamHeaders.set('content-type', contentType);
  if (clientAddress) upstreamHeaders.set('x-forwarded-for', clientAddress);

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
