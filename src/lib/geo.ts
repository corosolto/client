// Geo usa a borda que recebeu a requisição: Cloudflare no domínio público e
// Vercel nos aliases diretos. Sem API externa.
export interface Geo {
  city: string | null;
  country: string | null;
  lat: number | null;
  lon: number | null;
}

function textoDoHeader(bruto: string): string {
  try {
    return decodeURIComponent(bruto).trim() || bruto;
  } catch {
    return bruto.trim();
  }
}

export function geoFrom(request: Request): Geo | null {
  const h = request.headers;
  const cfCountry = h.get('cf-ipcountry')?.trim().toUpperCase();
  const usaCloudflare = Boolean(cfCountry && cfCountry !== 'XX');
  const country = usaCloudflare ? cfCountry : h.get('x-vercel-ip-country')?.trim().toUpperCase();
  if (!country || country === 'XX') return null;

  const cityRaw = h.get(usaCloudflare ? 'cf-ipcity' : 'x-vercel-ip-city');
  const lat = Number.parseFloat(h.get(usaCloudflare ? 'cf-iplatitude' : 'x-vercel-ip-latitude') || '');
  const lon = Number.parseFloat(h.get(usaCloudflare ? 'cf-iplongitude' : 'x-vercel-ip-longitude') || '');
  return {
    city: cityRaw ? textoDoHeader(cityRaw) : null,
    country,
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
  };
}

/* Idioma default por país: com a home estática (Stateloop não publica SSR), a lista
   que era do index.astro é servida pelo /api/geo-lang. PT é o fallback. */
const EN_GEO_COUNTRIES = new Set([
  'US', 'GB', 'UK', 'AD', 'AL', 'AT', 'BA', 'BE', 'BG', 'BY', 'CH', 'CY', 'CZ', 'DE', 'DK',
  'EE', 'FI', 'FR', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MC', 'MD',
  'ME', 'MK', 'MT', 'NL', 'NO', 'PL', 'RO', 'RS', 'RU', 'SE', 'SI', 'SK', 'SM', 'TR',
  'UA', 'VA', 'XK',
]);

export function langFromCountry(country: string | null | undefined): 'pt' | 'en' {
  return EN_GEO_COUNTRIES.has((country || '').toUpperCase()) ? 'en' : 'pt';
}
