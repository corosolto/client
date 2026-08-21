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
