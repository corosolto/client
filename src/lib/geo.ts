// Geo a partir dos headers da Vercel (grátis, sem API externa).
export interface Geo { city: string | null; country: string | null; lat: number | null; lon: number | null; }

// a cidade vem percent-encoded ("S%C3%A3o%20Paulo"); se vier malformada,
// decodeURIComponent joga URIError e derruba o endpoint inteiro (500) — aí
// vale mais devolver o valor cru do que perder a partida do jogador.
function decodeCity(raw: string): string {
  try { return decodeURIComponent(raw); } catch { return raw; }
}

export function geoFrom(request: Request): Geo | null {
  const h = request.headers;
  const country = h.get('x-vercel-ip-country');
  if (!country) return null; // fora da Vercel (localhost etc.)
  const cityRaw = h.get('x-vercel-ip-city');
  const lat = parseFloat(h.get('x-vercel-ip-latitude') || '');
  const lon = parseFloat(h.get('x-vercel-ip-longitude') || '');
  return {
    city: cityRaw ? decodeCity(cityRaw) : null,
    country,
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
  };
}
