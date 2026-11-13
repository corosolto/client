// Workers proíbe compilar wasm de bytes ("Wasm code generation disallowed by embedder"):
// o resvg entra como módulo compilado pelo @cloudflare/vite-plugin.
import { env } from 'cloudflare:workers';
import resvgModulo from '@resvg/resvg-wasm/index_bg.wasm';
import type { BordaImagem } from './contrato';

const MAGICOS: [number[], string][] = [
  [[0x89, 0x50, 0x4e, 0x47], 'png'],
  [[0xff, 0xd8, 0xff], 'jpeg'],
  [[0x47, 0x49, 0x46, 0x38], 'gif'],
];

export function formatoRaster(bytes: Uint8Array): string | null {
  for (const [assinatura, nome] of MAGICOS) {
    if (assinatura.every((b, i) => bytes[i] === b)) return nome;
  }
  return null;
}

// Sem sharp (binário nativo): o avatar vai cru para o resvg, que decodifica PNG, JPEG e GIF;
// outros formatos caem no personagem do jogo, como perfil sem foto.
export const bordaImagem = {
  async resvgWasm() {
    return resvgModulo;
  },
  async avatarDataUri(bytes) {
    const formato = formatoRaster(bytes);
    return formato ? `data:image/${formato};base64,${Buffer.from(bytes).toString('base64')}` : null;
  },
  async retratoDataUri(request, valor) {
    const r = await env.ASSETS.fetch(new URL(valor, request.url).toString());
    if (!r.ok) { console.error('[profile-card] retrato ausente no asset binding:', valor, r.status); return null; }
    return `data:image/png;base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}`;
  },
} satisfies BordaImagem;
