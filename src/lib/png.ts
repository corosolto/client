// Render SVG -> PNG das rotas og, badge e profile-card com resvg-wasm: resvg-js (nativo)
// não roda no Workers; o wasm roda nas duas bordas e vem de `#borda-imagem`.
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { bordaImagem } from '#borda-imagem';
import { FONT_BOLD_B64 } from './font-data';

export const FONTES = [Buffer.from(FONT_BOLD_B64, 'base64')];
let pronto: Promise<void> | null = null;

export function prepararResvg(request: Request): Promise<void> {
  return pronto ??= bordaImagem.resvgWasm(request).then(initWasm).catch((e) => { pronto = null; throw e; });
}

export async function renderPng(request: Request, svg: string, background: string): Promise<Uint8Array> {
  await prepararResvg(request);
  const resvg = new Resvg(svg, {
    font: { fontBuffers: FONTES, loadSystemFonts: false, defaultFontFamily: 'DejaVu Sans' },
    background,
  });
  return resvg.render().asPng();
}
