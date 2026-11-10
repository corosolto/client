// Contrato das duas bordas (Vercel e Cloudflare Workers). `#borda` e `#borda-imagem` são
// aliases resolvidos no astro.config pelo ADAPTER; cada implementação `satisfies` estes tipos.
import type { GeoDaBorda } from './geo';

export type NomeBorda = 'vercel' | 'cloudflare';

export interface Borda {
  nome: NomeBorda;
  /* IP real do visitante, já validado; null quando a borda não informa. */
  ipDoCliente(request: Request): string | null;
  /* Geo da borda, sem misturar cabeçalhos da outra plataforma. */
  geoDoCliente(request: Request): GeoDaBorda;
  /* Agenda trabalho depois da resposta (waitUntil); nunca segura a requisição. */
  agendar(locals: App.Locals, promessa: Promise<unknown>): void;
}

export interface BordaImagem {
  /* Módulo wasm do resvg no formato que `initWasm` aceita nesta borda. */
  resvgWasm(request: Request): Promise<WebAssembly.Module | ArrayBuffer | Uint8Array>;
  /* Avatar da badge como data URI raster; null quando a borda não decodifica o formato. */
  avatarDataUri(bytes: Uint8Array): Promise<string | null>;
  /* Retrato do profile-card: `valor` é data URI (Vercel) ou caminho em public/ (Workers). */
  retratoDataUri(request: Request, valor: string): Promise<string | null>;
}
