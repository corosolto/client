import { geoFromRequest } from './borda/geo.ts';

export interface Geo {
  city: string | null;
  country: string | null;
  lat: number | null;
  lon: number | null;
}

export function geoFrom(request: Request): Geo | null {
  const { ip: _ip, ...geo } = geoFromRequest(request);
  return geo.country && geo.country !== 'XX' ? geo : null;
}

/* Idioma default por país: com a home estática (Stateloop não publica SSR), a lista
   que era do index.astro é servida pelo /api/geo-lang. PT é o fallback. */
const EN_GEO_COUNTRIES = new Set([
  'US', 'GB', 'UK', 'AD', 'AL', 'AT', 'BA', 'BE', 'BG', 'BY',
  'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'FI', 'FR', 'GR', 'HR',
  'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'MC', 'MD', 'ME',
  'MK', 'MT', 'NL', 'NO', 'PL', 'RO', 'RS', 'RU', 'SE', 'SI',
  'SK', 'SM', 'TR', 'UA', 'VA', 'XK',
]);

export function langFromCountry(country: string | null | undefined): 'pt' | 'en' {
  return EN_GEO_COUNTRIES.has((country || '').toUpperCase()) ? 'en' : 'pt';
}
