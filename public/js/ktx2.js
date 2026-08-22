/* KTX2/Basis: textura que chega COMPRIMIDA na GPU. Um 1024² RGBA8 ocupa 5,6 MB de VRAM com
   mipmaps; transcodificado para BC/ASTC/ETC cai para ~0,7 MB — 8×. O preço é download
   (+45% por textura) e 571 KB de transcoder, então quem manda é a régua KTX1, não o gosto.
   O loader precisa do RENDERER para saber que formato a GPU aceita; por isso este módulo
   guarda a instância e main.js a arma no boot. Sem armar, GLB com KHR_texture_basisu não abre. */
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';

let _ktx2 = null;
export function armaKtx2(renderer) {
  if (_ktx2 || !renderer) return _ktx2;
  try {
    _ktx2 = new KTX2Loader().setTranscoderPath('/vendor/addons/libs/basis/').detectSupport(renderer);
  } catch (e) { console.warn('[ktx2] transcoder não subiu — textura basisu vai falhar', e); }
  return _ktx2;
}
/* Aplicado NA CARGA, não na montagem do módulo: glbchars/weapons/fparms avaliam ANTES do
   main.js, então no topo deles o transcoder ainda não existe. Idempotente e barato. */
export function aplicaKtx2(loader) {
  if (_ktx2 && loader && loader.ktx2Loader !== _ktx2) { loader.setKTX2Loader(_ktx2); loader.ktx2Loader = _ktx2; }
  return loader;
}
