// Geo a partir dos headers da Vercel (grátis, sem API externa).
export interface Geo { city: string | null; country: string | null; lat: number | null; lon: number | null; }

export function geoFrom(request: Request): Geo | null {
  const h = request.headers;
  const country = h.get('x-vercel-ip-country');
  if (!country) return null; // fora da Vercel (localhost etc.)
  const cityRaw = h.get('x-vercel-ip-city');
  const lat = parseFloat(h.get('x-vercel-ip-latitude') || '');
  const lon = parseFloat(h.get('x-vercel-ip-longitude') || '');
  return {
    city: cityRaw ? decodeURIComponent(cityRaw) : null,
    country,
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
  };
}
