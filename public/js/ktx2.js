/* Textura que chega COMPRIMIDA na GPU: 1024² RGBA8+mips custa 5,6 MB de VRAM, transcodificado
   cai a ~0,7 MB. Números e o preço em download: docs/LICOES.md e o PR do KTX2. */
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
