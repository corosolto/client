// Geo confiável da borda; o adaptador escolhe Vercel ou Cloudflare por `#borda`,
// evitando misturar o PoP com o visitante quando há cabeçalhos das duas plataformas.
export interface GeoDaBorda {
  country: string | null;
  city: string | null;
  ip: string | null;
  lat: number | null;
  lon: number | null;
}

type Origem = 'vercel' | 'cloudflare';
type RequestComCf = Request & { cf?: Record<string, unknown> | null };

function textoDoHeader(bruto: string): string {
  try {
    return decodeURIComponent(bruto).trim() || bruto.trim();
  } catch {
    return bruto.trim();
  }
}

function numero(valor: string | null | undefined): number | null {
  const parsed = Number.parseFloat(valor || '');
  return Number.isFinite(parsed) ? parsed : null;
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() ? textoDoHeader(valor) : null;
}

function ipValido(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null;
}

export function geoDaBorda(request: Request, origem: Origem): GeoDaBorda {
  const h = request.headers;
  if (origem === 'cloudflare') {
    const cf = (request as RequestComCf).cf || {};
    return {
      country: texto(cf.country) || texto(h.get('cf-ipcountry'))?.toUpperCase() || null,
      city: texto(cf.city) || texto(h.get('cf-ipcity')),
      ip: ipValido(h.get('cf-connecting-ip')),
      lat: numero(typeof cf.latitude === 'number' ? String(cf.latitude) : h.get('cf-iplatitude')),
      lon: numero(typeof cf.longitude === 'number' ? String(cf.longitude) : h.get('cf-iplongitude')),
    };
  }
  return {
    country: texto(h.get('x-vercel-ip-country'))?.toUpperCase() || null,
    city: texto(h.get('x-vercel-ip-city')),
    ip: ipValido(h.get('x-real-ip')) || ipValido(h.get('x-forwarded-for')?.split(',')[0]),
    lat: numero(h.get('x-vercel-ip-latitude')),
    lon: numero(h.get('x-vercel-ip-longitude')),
  };
}

// Uso sem alias em réguas e módulos que precisam aceitar fixtures das duas bordas.
// Cloudflare é prioritária quando a requisição traz sua marca, nunca a geo Vercel do PoP.
export function geoFromRequest(request: Request): GeoDaBorda {
  const cf = request as RequestComCf;
  const cfCountry = request.headers.get('cf-ipcountry')?.trim().toUpperCase();
  const usaCloudflare = Boolean(cf.cf || request.headers.get('cf-connecting-ip') || (cfCountry && cfCountry !== 'XX'));
  return geoDaBorda(request, usaCloudflare ? 'cloudflare' : 'vercel');
}
