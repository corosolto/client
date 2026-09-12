import { readFileSync } from 'node:fs';
import { GLTFLoader } from '../../public/vendor/addons/loaders/GLTFLoader.js';
import { hasProp, preloadMapProps } from '../../public/js/mapprops.js';

// Node valida a geometria GLB real; textura e aparência continuam no gate de browser.
export async function preloadPropGeometry(ids) {
  const selected=new Set(ids), original=GLTFLoader.prototype.load;
  GLTFLoader.prototype.load=function(url,onLoad,onProgress,onError) {
    const file=String(url).split('?')[0], id=file.match(/^models\/props\/([a-z0-9_]+)\.glb$/)?.[1];
    if(!selected.has(id)) return original.call(this,url,onLoad,onProgress,onError);
    try {
      const source=readFileSync(new URL(`../../public/${file}`,import.meta.url));
      const jsonLength=source.readUInt32LE(12), json=JSON.parse(source.subarray(20,20+jsonLength));
      json.materials=[{pbrMetallicRoughness:{baseColorFactor:[.5,.5,.5,1]}}];
      json.meshes.forEach(mesh=>mesh.primitives.forEach(primitive=>{primitive.material=0;}));
      delete json.textures; delete json.images;
      const encoded=Buffer.from(JSON.stringify(json)), padded=Buffer.alloc(Math.ceil(encoded.length/4)*4,32);
      encoded.copy(padded);
      const binary=source.subarray(20+jsonLength), glb=Buffer.alloc(20+padded.length+binary.length);
      source.copy(glb,0,0,20); glb.writeUInt32LE(glb.length,8); glb.writeUInt32LE(padded.length,12);
      padded.copy(glb,20); binary.copy(glb,20+padded.length);
      this.parse(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.byteLength),'',loaded=>{
        loaded.scene.userData.geometryFixtureAsset=id;onLoad(loaded);
      },onError);
    } catch(error) { onError(error); }
  };
  try { await preloadMapProps(ids); } finally { GLTFLoader.prototype.load=original; }
  const missing=ids.filter(id=>!hasProp(id));
  if(missing.length) throw new Error(`GLB geometry fixture ausente: ${missing.join(', ')}`);
}
