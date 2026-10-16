import { sha256 } from './kit.mjs';
const must = (ok, message) => { if (!ok) throw new Error(message);
};
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const natural = n => Number.isSafeInteger(n) && n >= 0;
const index = (n, a) => natural(n) && n < a.length;
const vector = (v, n) => Array.isArray(v) && v.length === n && v.every(Number.isFinite);
const allowed = (v, keys, where) => must(object(v) && Object.keys(v).every(k => keys.includes(k)), `unsupported ${where} field`);

export function parseMeshPartsJSON(source) {
  must(typeof source === 'string', 'JSON text required');
  const parsed = JSON.parse(source);
  let cursor = 0;
  const space = () => { while (/\s/.test(source[cursor] ?? '') && cursor < source.length) cursor++;
  };
  const string = () => {
    const start = cursor++;
    while (cursor < source.length) { const c = source[cursor++];
      if (c === '\\') cursor++;
      else if (c === '"') return JSON.parse(source.slice(start, cursor));
    }
    throw new Error('unterminated JSON string');
  };
  const scan = depth => {
    must(depth <= 128, 'JSON nesting limit');
    space();
    if (source[cursor] === '{') {
      cursor++;
      space();
      const keys = new Set();
      if (source[cursor] === '}') { cursor++;
        return;
      }
      for (;;) { space();
        const key = string();
        must(!keys.has(key), 'duplicate JSON key');
        keys.add(key);
        space();
        cursor++;
        scan(depth + 1);
        space();
        if (source[cursor++] === '}') return;
      }
    }
    if (source[cursor] === '[') {
      cursor++;
      space();
      if (source[cursor] === ']') { cursor++;
        return;
      }
      for (;;) { scan(depth + 1);
        space();
        if (source[cursor++] === ']') return;
      }
    }
    if (source[cursor] === '"') { string();
      return;
    }
    while (cursor < source.length && !/[\s,}\]]/.test(source[cursor])) cursor++;
  };
  scan(0);
  const finite = v => { if (typeof v === 'number') must(Number.isFinite(v), 'non-finite number');
  else if (v && typeof v === 'object') Object.values(v).forEach(finite);
};
  finite(parsed);
return parsed;
}
function parse(bytes) {
  must(Buffer.isBuffer(bytes) && bytes.length <= 256 * 1024 * 1024, 'GLB 256 MiB safety limit');
  must(bytes.length >= 28 && bytes.readUInt32LE(0) === 0x46546c67 && bytes.readUInt32LE(4) === 2 && bytes.readUInt32LE(8) === bytes.length, 'invalid GLB header/length');
  let offset = 12, d, bin, count = 0;
  while (offset < bytes.length) {
    must(offset + 8 <= bytes.length, 'truncated chunk');
    const size = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    must(size % 4 === 0 && offset + 8 + size <= bytes.length, 'invalid chunk bounds');
    if (count === 0) { must(type === 0x4e4f534a, 'first chunk must be JSON');
    d = parseMeshPartsJSON(new TextDecoder('utf-8', {fatal:true}).decode(bytes.subarray(offset + 8, offset + 8 + size)));
  }
    else { must(count === 1 && type === 0x004e4942, 'unsupported chunk');
    bin = bytes.subarray(offset + 8, offset + 8 + size);
  }
    count++;
  offset += size + 8;
  }
  must(d?.asset?.version === '2.0' && bin, 'embedded glTF 2 required');
return { d, bin };
}
function validate(d, bin) {
  allowed(d.asset, ['version','minVersion','generator','copyright'], 'asset');
  for (const k of ['minVersion','generator','copyright']) must(d.asset[k] === undefined || typeof d.asset[k] === 'string', 'invalid asset metadata');
  must(d.asset.minVersion === undefined || d.asset.minVersion === '2.0', 'unsupported minimum version');
  allowed(d, ['asset','scene','scenes','nodes','meshes','buffers','bufferViews','accessors','materials','images','textures','samplers','extensionsUsed','extensionsRequired','extras'], 'document');
  for (const key of ['scenes','nodes','meshes','buffers','bufferViews','accessors']) must(Array.isArray(d[key]), `${key} array required`);
  for (const key of ['materials','images','textures','samplers']) must(d[key] === undefined || Array.isArray(d[key]), `${key} array required`);
  for (const key of ['extensionsUsed','extensionsRequired']) must(d[key] === undefined || (Array.isArray(d[key]) && new Set(d[key]).size === d[key].length && d[key].every(e => e === 'EXT_texture_webp')), 'unsupported extension');
  must((d.extensionsRequired ?? []).every(e => (d.extensionsUsed ?? []).includes(e)), 'required extension not declared used');
  must(d.scenes.length === 1 && (d.scene === undefined || d.scene === 0) && d.nodes.length === 1 && d.meshes.length === 1, 'single scene/root/mesh required');
  allowed(d.scenes[0], ['nodes','name','extras'], 'scene');
must(JSON.stringify(d.scenes[0].nodes) === '[0]', 'single root node 0 required');
  const metadata = v => { if (Array.isArray(v)) v.forEach(metadata);
  else if (object(v)) { if (Object.hasOwn(v,'name')) must(typeof v.name === 'string','invalid name');
    for (const [k,x] of Object.entries(v)) if(k !== 'extras') metadata(x);
  } };
  metadata(d);
  const n = d.nodes[0];
allowed(n, ['name','mesh','matrix','translation','rotation','scale','extras'], 'node');
must(n.mesh === 0, 'root mesh 0 required');
  for (const k of ['translation','rotation','scale']) must(n[k] !== null, 'null TRS');
  if (n.matrix !== undefined) {
    must(['translation','rotation','scale'].every(k => n[k] === undefined) && vector(n.matrix,16), 'matrix/TRS conflict or invalid matrix');
    const m = n.matrix, det = m[0]*(m[5]*m[10]-m[9]*m[6])-m[4]*(m[1]*m[10]-m[9]*m[2])+m[8]*(m[1]*m[6]-m[5]*m[2]);
    must(m[3] === 0 && m[7] === 0 && m[11] === 0 && m[15] === 1 && Number.isFinite(det) && det !== 0, 'invalid affine matrix');
  } else {
    must(vector(n.translation ?? [0,0,0],3) && vector(n.scale ?? [1,1,1],3) && (n.scale ?? [1,1,1]).every(v => v !== 0), 'invalid TRS');
    must(vector(n.rotation ?? [0,0,0,1],4) && Math.abs(Math.hypot(...(n.rotation ?? [0,0,0,1]))-1) <= 1e-5, 'invalid quaternion');
  }
  allowed(d.meshes[0], ['name','primitives','extras'], 'mesh');
  must(Array.isArray(d.meshes[0].primitives) && d.meshes[0].primitives.length === 1, 'one primitive required');
  const p = d.meshes[0].primitives[0];
allowed(p, ['attributes','indices','material','mode','extras'], 'primitive');
  must((p.mode === undefined || p.mode === 4) && object(p.attributes), 'indexed TRIANGLES required');
  must(d.buffers.length === 1, 'one embedded buffer required');
allowed(d.buffers[0], ['byteLength','name','extras'], 'buffer');
  const length = d.buffers[0].byteLength;
must(natural(length) && length > 0 && length <= bin.length && bin.length-length <= 3, 'BIN byteLength mismatch');
  d.bufferViews.forEach(v => {
    must(v.byteOffset !== null, 'null bufferView offset');
    allowed(v,['buffer','byteOffset','byteLength','byteStride','target','name','extras'],'bufferView');
    must(v.buffer === 0 && natural(v.byteOffset ?? 0) && natural(v.byteLength) && v.byteLength > 0 && (v.byteOffset ?? 0)+v.byteLength <= length, 'bufferView bounds');
    must(v.target === undefined || [34962,34963].includes(v.target), 'invalid bufferView target');
    must(v.byteStride === undefined || (natural(v.byteStride) && v.byteStride >= 4 && v.byteStride <= 252 && v.byteStride % 4 === 0), 'invalid byteStride');
  });
  const spec = {5120:[1,'readInt8'],5121:[1,'readUInt8'],5122:[2,'readInt16LE'],5123:[2,'readUInt16LE'],5125:[4,'readUInt32LE'],5126:[4,'readFloatLE']};
  let work = 0;
  const decoded = d.accessors.map(a => {
    must(a.byteOffset !== null, 'null accessor offset');
    allowed(a,['bufferView','byteOffset','componentType','count','type','normalized','min','max','name','extras'],'accessor');
    const arity={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type], s=spec[a.componentType];
    must(arity && s && natural(a.count) && a.count > 0 && index(a.bufferView,d.bufferViews), 'invalid accessor format/count/view');
    work += a.count * arity;
  must(work <= 4_000_000, 'accessor aggregate work safety limit');
    must(a.normalized === undefined || typeof a.normalized === 'boolean', 'invalid normalized');
  must(!a.normalized || [5120,5121,5122,5123].includes(a.componentType), 'unsupported normalized component');
    const v=d.bufferViews[a.bufferView], base=v.byteOffset ?? 0, local=a.byteOffset ?? 0, element=arity*s[0], stride=v.byteStride ?? element;
    must(natural(local) && local % s[0] === 0 && (base+local) % s[0] === 0 && stride >= element && stride % s[0] === 0 && local+(a.count-1)*stride+element <= v.byteLength, 'accessor bounds/alignment');
    for(const k of ['min','max']) must(a[k] === undefined || vector(a[k],arity), 'invalid accessor min/max');
    if(a.min && a.max) must(a.min.every((x,i)=>x <= a.max[i]), 'invalid min/max order');
    for(let i=0;i<a.count;i++) for(let c=0;c<arity;c++) { const x=bin[s[1]](base+local+i*stride+c*s[0]);
    must(Number.isFinite(x), 'nonfinite attribute');
    if(a.min) must(x >= a.min[c], 'accessor below min');
    if(a.max) must(x <= a.max[c], 'accessor above max');
  }
    return {a,v,arity,width:s[0],at:i=>bin[s[1]](base+local+i*stride)};
  });
  must(index(p.attributes.POSITION,decoded), 'POSITION required');
const pos=decoded[p.attributes.POSITION];
  must(pos.a.type === 'VEC3' && pos.a.componentType === 5126 && !pos.a.normalized && pos.a.min && pos.a.max, 'POSITION float VEC3 with bounds required');
  for(const [name,id] of Object.entries(p.attributes)) {
    must(index(id,decoded), 'attribute accessor missing');
  const {a,v}=decoded[id];
  must(a.count === pos.a.count && v.target !== 34963, 'attribute count/target');
    const float = a.componentType === 5126 && !a.normalized, norm = [5121,5123].includes(a.componentType) && a.normalized;
    const valid=name === 'POSITION' ? id === p.attributes.POSITION : name === 'NORMAL' ? a.type === 'VEC3' && float : name === 'TANGENT' ? a.type === 'VEC4' && float : /^TEXCOORD_[0-9]+$/.test(name) ? a.type === 'VEC2' && (float || norm) : /^COLOR_[0-9]+$/.test(name) ? ['VEC3','VEC4'].includes(a.type) && (float || norm) : false;
    must(valid, 'unsupported attribute semantic/format');
  must(((v.byteOffset ?? 0)+(a.byteOffset ?? 0)) % 4 === 0, 'vertex alignment');
    must((v.byteStride ?? decoded[id].arity * decoded[id].width) % 4 === 0, 'vertex stride alignment');
  }
  must(index(p.indices,decoded), 'indices required');
const ids=decoded[p.indices];
  must(ids.a.type === 'SCALAR' && [5121,5123,5125].includes(ids.a.componentType) && !ids.a.normalized && ids.a.count % 3 === 0 && ids.v.byteStride === undefined && ids.v.target !== 34962, 'invalid indices');
  for(let i=0;i<ids.a.count;i++) must(ids.at(i)<pos.a.count && ids.at(i)<2**(8*ids.width)-1, 'index outside vertex domain/reserved index');
  const images=d.images ?? [], textures=d.textures ?? [], materials=d.materials ?? [], samplers=d.samplers ?? [];
  images.forEach(im=>{allowed(im,['name','bufferView','mimeType','extras'],'image');
  must(index(im.bufferView,d.bufferViews) && ['image/png','image/jpeg','image/webp'].includes(im.mimeType), 'embedded image required');
  must(d.bufferViews[im.bufferView].byteStride === undefined && d.bufferViews[im.bufferView].target === undefined,'invalid image view');
});
  textures.forEach(t=>{
    allowed(t,['name','sampler','source','extensions','extras'],'texture');
  must(t.sampler === undefined || index(t.sampler,samplers),'invalid sampler reference');
    if(t.source !== undefined) must(index(t.source,images) && images[t.source].mimeType !== 'image/webp','invalid texture source');
    if(t.extensions !== undefined) {allowed(t.extensions,['EXT_texture_webp'],'texture extension');
    const e=t.extensions.EXT_texture_webp;
    allowed(e,['source'],'webp');
    must(index(e.source,images) && images[e.source].mimeType === 'image/webp' && d.extensionsUsed?.includes('EXT_texture_webp'),'invalid webp source/declaration');
  }
    must(t.source !== undefined || t.extensions?.EXT_texture_webp,'texture source required');
  });
  samplers.forEach(s=>{allowed(s,['name','magFilter','minFilter','wrapS','wrapT','extras'],'sampler');
  for(const k of ['magFilter','minFilter','wrapS','wrapT']) if(s[k] !== undefined) must((k === 'magFilter' ? [9728,9729] : k === 'minFilter' ? [9728,9729,9984,9985,9986,9987] : [33071,33648,10497]).includes(s[k]),'invalid sampler value');
});
  const factor=(v,size,min,max)=>vector(v,size) && v.every(x=>x>=min && x<=max);
  const textureInfo=(info,extra=[])=>{allowed(info,['index','texCoord','extras',...extra],'textureInfo');
  must(index(info.index,textures) && natural(info.texCoord ?? 0) && p.attributes[`TEXCOORD_${info.texCoord ?? 0}`] !== undefined,'invalid texture coordinates/reference');
};
  materials.forEach(m=>{
    allowed(m,['name','pbrMetallicRoughness','normalTexture','occlusionTexture','emissiveTexture','emissiveFactor','alphaMode','alphaCutoff','doubleSided','extras'],'material');
    must(m.alphaMode === undefined || ['OPAQUE','MASK','BLEND'].includes(m.alphaMode),'invalid alphaMode');
  must(m.doubleSided === undefined || typeof m.doubleSided === 'boolean','invalid doubleSided');
    must(m.alphaCutoff === undefined || (Number.isFinite(m.alphaCutoff) && m.alphaCutoff>=0),'invalid alphaCutoff');
    if(m.emissiveFactor !== undefined) must(factor(m.emissiveFactor,3,0,1),'invalid emissiveFactor');
    if(m.pbrMetallicRoughness !== undefined) { const r=m.pbrMetallicRoughness;
    allowed(r,['baseColorFactor','metallicFactor','roughnessFactor','baseColorTexture','metallicRoughnessTexture','extras'],'PBR');
    if(r.baseColorFactor!==undefined) must(factor(r.baseColorFactor,4,0,1),'invalid baseColorFactor');
    for(const k of ['metallicFactor','roughnessFactor']) if(r[k]!==undefined) must(Number.isFinite(r[k]) && r[k]>=0 && r[k]<=1,'invalid PBR factor');
    for(const k of ['baseColorTexture','metallicRoughnessTexture']) if(r[k]!==undefined) textureInfo(r[k]);
  }
    for(const k of ['normalTexture','occlusionTexture','emissiveTexture']) if(m[k]!==undefined) textureInfo(m[k],k==='normalTexture'?['scale']:k==='occlusionTexture'?['strength']:[]);
    if(m.normalTexture?.scale!==undefined) must(Number.isFinite(m.normalTexture.scale),'invalid normal scale');
  if(m.occlusionTexture?.strength!==undefined) must(Number.isFinite(m.occlusionTexture.strength) && m.occlusionTexture.strength>=0 && m.occlusionTexture.strength<=1,'invalid occlusion strength');
  });
  must(p.material === undefined || index(p.material,materials),'invalid material reference');
  return {p,ids};
}
function pack(d, bin) {
  const json=Buffer.from(JSON.stringify(d)), padded=Buffer.alloc((json.length+3)&~3,32);
json.copy(padded);
  const out=Buffer.alloc(28+padded.length+bin.length);
  [0x46546c67,2,out.length,padded.length,0x4e4f534a].forEach((n,i)=>out.writeUInt32LE(n,i*4));
padded.copy(out,20);
  out.writeUInt32LE(bin.length,20+padded.length);
out.writeUInt32LE(0x004e4942,24+padded.length);
bin.copy(out,28+padded.length);
return out;
}
export function splitMeshParts(bytes, selection) {
  must(Buffer.isBuffer(bytes) && bytes.length <= 256*1024*1024, 'GLB 256 MiB safety limit');
  allowed(selection,['schema','sourceSha256','partName','sourceFaceIDs'],'selection');
  must(['schema','sourceSha256','partName','sourceFaceIDs'].every(k => Object.hasOwn(selection,k)), 'missing selection field');
  must(selection.schema === 'cs-mesh-part-selection/1' && /^[a-f0-9]{64}$/.test(selection.sourceSha256 ?? '') && selection.sourceSha256 === sha256(bytes),'source schema/hash mismatch');
  must(typeof selection.partName === 'string' && /^[a-z][a-z0-9-]{0,79}$/.test(selection.partName) && selection.partName !== 'body','unsafe part name');
  const {d,bin}=parse(bytes), {p,ids}=validate(d,bin), selected=selection.sourceFaceIDs, count=ids.a.count/3;
  must(![...d.nodes,...d.meshes].some(n=>n.name === selection.partName || n.name === 'body'),'part name collision');
  must(Array.isArray(selected) && selected.length > 0 && selected.length < count && selected.every((id,i)=>natural(id) && id<count && (i===0 || id>selected[i-1])),'sourceFaceIDs must be sorted unique proper subset');
  const set=new Set(selected), body=Array.from({length:count},(_,i)=>i).filter(i=>!set.has(i)), chunks=[bin], names=['body',selection.partName];
let offset=bin.length;
  const meshes=[body,selected].map((faces,i)=>{
    const raw=Buffer.alloc(faces.length*3*ids.width), method=`writeUInt${ids.width*8}${ids.width===1?'':'LE'}`;
    faces.forEach((f,k)=>{for(let c=0;c<3;c++) raw[method](ids.at(f*3+c),(k*3+c)*ids.width);
  });
    const vi=d.bufferViews.length, ai=d.accessors.length;
  d.bufferViews.push({buffer:0,byteOffset:offset,byteLength:raw.length,target:34963});
  d.accessors.push({bufferView:vi,componentType:ids.a.componentType,count:faces.length*3,type:'SCALAR'});
    chunks.push(raw,Buffer.alloc((4-raw.length%4)%4));
  offset+=((raw.length+3)&~3);
    return {...d.meshes[0],name:names[i],primitives:[{...p,indices:ai}]};
  });
  const originalTransform=Object.fromEntries(['matrix','translation','rotation','scale'].filter(k=>d.nodes[0][k]!==undefined).map(k=>[k,d.nodes[0][k]]));
  delete d.nodes[0].mesh;
d.nodes[0].children=[1,2];
d.nodes.push(...names.map((name,mesh)=>({name,mesh})));
d.meshes=meshes;
d.buffers[0].byteLength=offset;
  const output=pack(d,Buffer.concat(chunks));
  return {bytes:output,report:{schema:'cs-mesh-part-correspondence/1',sourceSha256:selection.sourceSha256,outputSha256:sha256(output),partName:selection.partName,sourceFaceCount:count,bodySourceFaceIDs:body,partSourceFaceIDs:selected,bodyFaceCount:body.length,partFaceCount:selected.length,originalTransform,originalTransformPreserved:true,originalBINPrefixBytes:bin.length,originalBINPrefixSha256:sha256(bin),originalBINPrefixPreserved:true,sourceDrawCalls:1,outputDrawCalls:2,globalFaceOrderPreserved:body.concat(selected).every((id,i)=>id===i),withinPartitionFaceOrderPreserved:true,visualApproved:false,runtimeEnabled:false,unverified:['semantic-selection','pixels-and-material-appearance','transparency-and-seams','license','fit','contact','animation','reload','runtime-performance']}};
}
