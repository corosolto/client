/* glbchars.js REAL em Node: fetch/GLTFLoader servindo public/ do disco, texturas webp
   trocadas por 1×1 e imports relativos absolutizados. `fonte` permite mutar o texto do
   módulo (mutantes das réguas) antes de importar. Usado por emotes-mocap-check.mjs e
   emotes-mocap-roster.mjs: as duas réguas medem o MESMO runtime pelo MESMO instrumento. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const requests = [];
const assetPath = (url) => path.resolve(root, 'public', String(url).split('?')[0].replace(/^\//, ''));
const localFetch = async (url) => {
  requests.push(String(url));
  const file = assetPath(url);
  return fs.existsSync(file) ? new Response(fs.readFileSync(file)) : new Response('', { status: 404 });
};
Object.defineProperty(globalThis, 'fetch', { configurable: true, get: () => localFetch, set() {} });
export const { THREE, CHARACTERS } = await import('../harness.mjs');
export const { GLTFLoader } = await import('../../../public/vendor/addons/loaders/GLTFLoader.js');
Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: localFetch });

const comWebp = () => {
  const loader = new GLTFLoader();
  loader.register(() => ({ name: 'EXT_texture_webp', async loadTexture() {
    const texture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    texture.needsUpdate = true; return texture;
  } }));
  return loader;
};
export const parseGlb = (bytes) => comWebp().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
GLTFLoader.prototype.load = function (url, done, progress, fail) {
  requests.push(String(url));
  Promise.resolve().then(async () => {
    const file = assetPath(url);
    if (!fs.existsSync(file)) throw new Error(`404 ${url}`);
    done(await parseGlb(fs.readFileSync(file)));
  }).catch((error) => { if (fail) fail(error); else throw error; });
};

export const absolutiza = (source, base) => source.replace(/from (['"])([^'"\n]+)\1/g, (all, quote, spec) => {
  const file = spec === 'three' ? path.join(root, 'public/vendor/three.module.js')
    : spec.startsWith('three/addons/') ? path.join(root, 'public/vendor/addons', spec.slice(13))
      : spec.startsWith('.') ? path.resolve(base, spec) : null;
  return file ? `from ${quote}${pathToFileURL(file).href}${quote}` : all;
});
export const comoModulo = (source) => import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
/** Troca UMA ocorrência exata; mutante que não aplica é erro (régua mentindo). */
export const once = (texto, before, after) => {
  const n = texto.split(before).length - 1;
  if (n !== 1) throw new Error(`mutante não aplicou (${n}×): ${before.slice(0, 80)}`);
  return texto.replace(before, after);
};

/** Catálogo + emotes.js + glbchars.js reais, com transformações opcionais do texto.
    `arquivoGlbchars` troca o arquivo lido (outra revisão), resolvendo imports em public/js. */
export async function carregaRuntime({ catalogo = (s) => s, glbchars = (s) => s, arquivoGlbchars } = {}) {
  const cat = catalogo(fs.readFileSync(path.join(root, 'public/js/data/emote-catalog.js'), 'utf8'));
  const catUrl = 'data:text/javascript;base64,' + Buffer.from(cat).toString('base64');
  const emotesSrc = fs.readFileSync(path.join(root, 'public/js/emotes.js'), 'utf8').replaceAll("'./data/emote-catalog.js'", `'${catUrl}'`);
  const E = await comoModulo(emotesSrc);
  const fonte = glbchars(fs.readFileSync(arquivoGlbchars || path.join(root, 'public/js/glbchars.js'), 'utf8'));
  const G = await comoModulo(absolutiza(fonte, path.join(root, 'public/js')));
  G.setEmoteDriver({ pose: E.poseEmote, duracao: E.emoteDuracao, laco: E.emoteLaco, clipe: E.emoteClipe });
  return { E, G, fonte };
}

export const step = (b, frames, moving = 0) => {
  for (let i = 0; i < frames; i++) b.ctrl.update(1 / 60, moving, moving > 0, moving ? 2 : 0, false, 0);
  b.group.updateMatrixWorld(true);
};
export const esperaClipe = async (b) => {
  for (let i = 0; i < 200 && !b.ctrl._emoteClipeAtivo; i++) { await new Promise((r) => setTimeout(r, 10)); step(b, 1); }
};
