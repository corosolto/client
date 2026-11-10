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
const EN_GEO_COUNTRIES = {
  US: true, GB: true, UK: true, AD: true, AL: true, AT: true, BA: true, BE: true, BG: true, BY: true,
  CH: true, CY: true, CZ: true, DE: true, DK: true, EE: true, FI: true, FR: true, GR: true, HR: true,
  HU: true, IE: true, IS: true, IT: true, LI: true, LT: true, LU: true, MC: true, MD: true, ME: true,
  MK: true, MT: true, NL: true, NO: true, PL: true, RO: true, RS: true, RU: true, SE: true, SI: true,
  SK: true, SM: true, TR: true, UA: true, VA: true, XK: true,
} as const;

export function langFromCountry(country: string | null | undefined): 'pt' | 'en' {
  return EN_GEO_COUNTRIES[(country || '').toUpperCase() as keyof typeof EN_GEO_COUNTRIES] ? 'en' : 'pt';
}
