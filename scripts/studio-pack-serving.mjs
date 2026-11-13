/* SERVE /packs/ A PARTIR DA RAIZ DE INSTALAÇÃO LOCAL DOS PACOTES DO STUDIO.
   ----------------------------------------------------------------------------
   Os pacotes instalados (ex.: local/studio-packs/character/<id>/<versão>/) NÃO são
   copiados para public/: o dev server do Astro (plugin Vite abaixo) e o servidor de
   eval (tools/eval/serve.mjs) montam este MESMO handler em /packs/, lendo de
   STUDIO_PACK_ROOT. Sem a variável, /packs/ responde 404 e o personagem fixado
   falha visível no runtime (studio_fetch_failed) — nunca vira boneco procedural
   apresentado como o pacote.

   - só GET/HEAD; só caminho canônico pela MESMA isSafePackPath do resolvedor do
     navegador: ela já recusa `%`, `\`, `.`/`..` e barra dupla, então nenhuma forma
     codificada (%2e%2e, %2f) chega a ser decodificada nem resolvida;
   - contenção sob a raiz conferida DEPOIS de resolver symlinks (realpath);
   - só arquivos regulares com extensão de dado (.json/.glb/.png/.jpg/.jpeg/.webp):
     o pacote é dado, nunca código servido;
   - `Cache-Control: no-store`: a raiz local muda entre instalações; publicação
     imutável com cache longo é outro passo (R2), fora deste servidor de dev. */
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { isSafePackPath } from '../public/js/studio-character.js';

export const STUDIO_PACK_MIME = Object.freeze({
  '.json': 'application/json; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
});

const HEADERS = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
const contained = (root, path) => path.startsWith(root + sep);

/* rawPath: o caminho AINDA CODIFICADO depois de /packs (ex.: "/character/x/0.1.0/manifest.json").
   Sempre responde; nunca chama next() — /packs/ é deste handler. */
export async function serveStudioPack(req, res, { rawPath, root = process.env.STUDIO_PACK_ROOT } = {}) {
  const deny = (status) => {
    if (res.headersSent) { res.destroy(); return; }
    res.writeHead(status, { ...HEADERS, 'content-type': 'text/plain; charset=utf-8' });
    res.end(String(status));
  };
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') return deny(405);
    if (!root) return deny(404);
    const pathname = String(rawPath ?? '').split(/[?#]/, 1)[0];
    if (!pathname.startsWith('/')) return deny(404);
    const relative = pathname.slice(1);
    if (!isSafePackPath(relative)) return deny(404);
    const mime = STUDIO_PACK_MIME[extname(relative).toLowerCase()];
    if (!mime) return deny(404);

    const rootReal = await realpath(resolve(root));
    // isSafePackPath já impede `..`; a contenção que importa é a do caminho REAL (symlink).
    let real;
    try { real = await realpath(resolve(rootReal, relative)); } catch { return deny(404); }
    if (!contained(rootReal, real)) return deny(404);
    const info = await stat(real);
    if (!info.isFile()) return deny(404);

    res.writeHead(200, { ...HEADERS, 'content-type': mime, 'content-length': String(info.size) });
    if (req.method === 'HEAD') { res.end(); return; }
    await new Promise((done) => {
      const stream = createReadStream(real);
      stream.on('error', () => { res.destroy(); done(); });
      stream.on('end', done);
      stream.pipe(res);
    });
  } catch (error) {
    console.error('[studio-packs]', req.url, '->', error?.message || error);
    deny(error?.code === 'ENOENT' || error?.code === 'ENOTDIR' ? 404 : 500);
  }
}

/* Plugin Vite para o dev server do Astro (astro.config.mjs). A raiz é lida a cada
   pedido: o mesmo processo responde 404 até alguém exportar STUDIO_PACK_ROOT. */
export function studioPackVitePlugin() {
  return {
    name: 'csbr-studio-packs',
    configureServer(server) {
      server.middlewares.use('/packs', (req, res) => { serveStudioPack(req, res, { rawPath: req.url }); });
    },
  };
}
