// Imagem na Vercel (Node): o wasm do resvg vem do próprio site (/wasm/resvg.wasm, copiado por
// scripts/copy-wasm.mjs) com fallback para o node_modules; o avatar passa pelo sharp.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import sharp from 'sharp';
import type { BordaImagem } from './contrato';

const CANDIDATOS = ['@resvg/resvg-wasm/index_bg.wasm', '@resvg/resvg-wasm/dist/index_bg.wasm'];

export const bordaImagem = {
  async resvgWasm(request) {
    try {
      const r = await fetch(new URL('/wasm/resvg.wasm', request.url));
      if (r.ok) return await r.arrayBuffer();
      console.warn('[resvg] /wasm/resvg.wasm devolveu', r.status, '- usando o node_modules');
    } catch (e) {
      console.warn('[resvg] fetch do wasm falhou - usando o node_modules:', e);
    }
    const require = createRequire(import.meta.url);
    for (const c of CANDIDATOS) {
      try { return readFileSync(require.resolve(c)); } catch { /* tenta o próximo */ }
    }
    throw new Error('resvg.wasm indisponível (nem publicado nem no node_modules)');
  },
  async avatarDataUri(bytes) {
    try {
      const png = await sharp(bytes).resize(120, 120, { fit: 'cover' }).png().toBuffer();
      return 'data:image/png;base64,' + png.toString('base64');
    } catch { return null; }
  },
  async retratoDataUri(_request, valor) {
    return valor;
  },
} satisfies BordaImagem;
