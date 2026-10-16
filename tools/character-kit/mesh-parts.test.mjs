import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, symlinkSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { sha256 } from './kit.mjs';
import { splitMeshParts, parseMeshPartsJSON } from './mesh-parts.mjs';

function pack(d, bin) {
  const j = Buffer.from(JSON.stringify(d)), jp = Buffer.alloc((j.length + 3) & ~3, 32), bp = Buffer.alloc((bin.length + 3) & ~3);
  j.copy(jp);
  bin.copy(bp);
  const b = Buffer.alloc(28 + jp.length + bp.length);
  [0x46546c67, 2, b.length, jp.length, 0x4e4f534a].forEach((v, i) => b.writeUInt32LE(v, i * 4));
  jp.copy(b, 20);
  b.writeUInt32LE(bp.length, 20 + jp.length);
  b.writeUInt32LE(0x004e4942, 24 + jp.length);
  bp.copy(b, 28 + jp.length);
  return b;
}
function unpack(b) { const n = b.readUInt32LE(12);
  return { d: JSON.parse(b.toString('utf8', 20, 20 + n)), bin: b.subarray(28 + n) };
}
function fixture(type = 5123, matrix = false) {
  const bin = Buffer.alloc(512, 0xab), width = { 5121: 1, 5123: 2, 5125: 4 }[type];
  [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 0], [1, 1, 0]].forEach((p, i) => p.forEach((v, c) => bin.writeFloatLE(v, 4 + i * 16 + c * 4)));
  for (let i = 0; i < 5; i++) { bin.writeFloatLE(0, 88 + i * 12);
    bin.writeFloatLE(0, 92 + i * 12);
    bin.writeFloatLE(1, 96 + i * 12);
  }
  [0, 1, 2, 3, 2, 4, 1, 4, 2].forEach((v, i) => bin[`writeUInt${width * 8}${width === 1 ? '' : 'LE'}`](v, 256 + width + i * width));
  for(let i=0;i<10;i++) bin.writeFloatLE(i/10,168+i*4);
  Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b49444154789c636000020000050001a5f645400000000049454e44ae426082','hex').copy(bin,320);
  for(let i=0;i<5;i++) [1,0,0,-1].forEach((v,c)=>bin.writeFloatLE(v,400+i*16+c*4));
  const d = { asset: { version: '2.0', generator: 'synthetic mesh parts test' }, scene: 0, scenes: [{ nodes: [0], extras: { frame: 'source' } }],
    nodes: [{ name: 'original', mesh: 0, ...(matrix ? { matrix: [0,2,0,0,-3,0,0,0,0,0,4,0,7,8,9,1] } : { translation: [7,8,9], rotation: [0,0,Math.SQRT1_2,Math.SQRT1_2], scale: [2,3,4] }), extras: { owner: 'synthetic' } }],
    meshes: [{ name: 'source', primitives: [{ attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2, TEXCOORD_0: 3, TANGENT: 5 }, indices: 4, material: 0, mode: 4 }] }],
    buffers: [{ byteLength: bin.length }], bufferViews: [{ buffer:0, byteOffset:0, byteLength:84, byteStride:16, target:34962 }, {buffer:0,byteOffset:88,byteLength:60,target:34962}, {buffer:0,byteOffset:148,byteLength:20,target:34962}, {buffer:0,byteOffset:168,byteLength:40,target:34962}, {buffer:0,byteOffset:256,byteLength:width * 10,target:34963}, {buffer:0,byteOffset:320,byteLength:68}, {buffer:0,byteOffset:400,byteLength:80,target:34962}],
    accessors: [{bufferView:0,byteOffset:4,componentType:5126,count:5,type:'VEC3',min:[0,0,0],max:[1,1,0]}, {bufferView:1,componentType:5126,count:5,type:'VEC3'}, {bufferView:2,componentType:5121,normalized:true,count:5,type:'VEC4'}, {bufferView:3,componentType:5126,count:5,type:'VEC2'}, {bufferView:4,byteOffset:width,componentType:type,count:9,type:'SCALAR'}, {bufferView:6,componentType:5126,count:5,type:'VEC4'}],
    materials:[{name:'sentinel',pbrMetallicRoughness:{baseColorFactor:[0.2,0.4,0.6,1]},doubleSided:true}], images:[{bufferView:5,mimeType:'image/png'}] };
  return {d, bin, bytes:pack(d,bin)};
}
function selection(bytes, ids = [1]) { return { schema:'cs-mesh-part-selection/1', sourceSha256:sha256(bytes), partName:'piece', sourceFaceIDs:ids };
}
function indices(d, bin, mesh) {
  const a=d.accessors[d.meshes[mesh].primitives[0].indices], v=d.bufferViews[a.bufferView], size={5121:1,5123:2,5125:4}[a.componentType];
  return Array.from({length:a.count},(_,i)=>bin[`readUInt${size*8}${size===1?'':'LE'}`]((v.byteOffset??0)+(a.byteOffset??0)+i*(v.byteStride??size)));
}
function oracle(source, output) {
  const {d:s,bin:sb}=unpack(source), {d:o,bin:ob}=unpack(output);
  assert.deepEqual(ob.subarray(0,sb.length),sb);
  assert.deepEqual(o.accessors.slice(0,s.accessors.length),s.accessors);
  assert.deepEqual(o.bufferViews.slice(0,s.bufferViews.length),s.bufferViews);
  for(const k of ['materials','images','scenes']) assert.deepEqual(o[k],s[k]);
  const root={...o.nodes[0]};
  delete root.children;
  root.mesh=0;
  assert.deepEqual(root,s.nodes[0]);
  assert.deepEqual(o.nodes[0].children,[1,2]);
  o.nodes.slice(1).forEach(n=>assert.deepEqual(Object.keys(n).sort(),['mesh','name']));
  const original=indices(s,sb,0), body=indices(o,ob,0), part=indices(o,ob,1);
  assert.deepEqual(body,[...original.slice(0,3),...original.slice(6,9)]);
  assert.deepEqual(part,original.slice(3,6));
  for(const m of o.meshes) { assert.deepEqual(m.primitives[0].attributes,s.meshes[0].primitives[0].attributes);
    assert.equal(m.primitives[0].material,0);
  }
  const world=(doc,bin,vertex)=>{
    const a=doc.accessors[0],v=doc.bufferViews[a.bufferView],p=[0,1,2].map(c=>bin.readFloatLE((v.byteOffset??0)+(a.byteOffset??0)+vertex*v.byteStride+c*4)), n=doc.nodes[0];
    if(n.matrix) return [0,1,2].map(r=>n.matrix[r]*p[0]+n.matrix[4+r]*p[1]+n.matrix[8+r]*p[2]+n.matrix[12+r]);
    const [x,y,z,w]=n.rotation, [px,py,pz]=p.map((v,i)=>v*n.scale[i]);
    const t=[2*(y*pz-z*py),2*(z*px-x*pz),2*(x*py-y*px)];
    return [px+w*t[0]+y*t[2]-z*t[1],py+w*t[1]+z*t[0]-x*t[2],pz+w*t[2]+x*t[1]-y*t[0]].map((v,i)=>v+n.translation[i]);
  };
  for(const i of [...body,...part]) assert.deepEqual(world(o,ob,i),world(s,sb,i));
}
for(const type of [5121,5123,5125]) for(const matrix of [false,true]) test(`decoded partition ${type} matrix=${matrix}`,()=>{ const f=fixture(type,matrix),r=splitMeshParts(f.bytes,selection(f.bytes));
  oracle(f.bytes,r.bytes);
  assert.equal(r.report.outputSha256,sha256(r.bytes));
  assert.equal(r.report.visualApproved,false);
});
test('selection fails closed',()=>{const f=fixture();
  for(const patch of [{sourceSha256:'0'.repeat(64)},{sourceFaceIDs:[]},{sourceFaceIDs:[0,1,2]},{sourceFaceIDs:[1,1]},{sourceFaceIDs:[2,1]},{sourceFaceIDs:[3]},{sourceFaceIDs:[-1]},{sourceFaceIDs:[0.5]},{unknown:true},{partName:'../piece'},{partName:'original'},{partName:'body'}]) assert.throws(()=>splitMeshParts(f.bytes,{...selection(f.bytes),...patch}));
});
test('invalid documents and bounds fail closed',()=>{
 const mutations=[d=>d.nodes.push({}),d=>d.scenes[0].nodes=[1],d=>d.scene=1,d=>d.nodes[0].translation=null,d=>d.meshes[0].primitives[0].mode=null,d=>d.bufferViews[0].byteOffset=null,d=>d.accessors[0].byteOffset=null,d=>d.nodes[0].children=[],d=>d.animations=[{}],d=>d.skins=[{}],d=>d.meshes[0].weights=[],d=>d.meshes[0].primitives[0].targets=[],d=>d.nodes[0].skin=0,d=>d.extensionsUsed=['KHR_draco_mesh_compression'],d=>d.bufferViews[0].extensions={EXT_meshopt_compression:{}},d=>d.buffers[0].uri='external.bin',d=>d.images[0].uri='data:image/png;base64,AA',d=>d.accessors[0].sparse={},d=>d.accessors[0].count=999,d=>d.accessors[4].count=99,d=>d.accessors[4].byteOffset=1,d=>d.bufferViews[0].byteStride=8,d=>d.bufferViews[1].byteLength=999,d=>d.meshes[0].primitives[0].attributes.NORMAL=99,d=>d.meshes[0].primitives[0].mode=1,d=>d.nodes[0].matrix=Array(16).fill(0),d=>d.nodes[0].rotation=[0,0,0,2],d=>d.accessors[0].min=[0,0],d=>d.meshes[0].primitives[0].material=5];
 for(const mutate of mutations){const f=fixture();
    mutate(f.d);
    const b=pack(f.d,f.bin);
    assert.throws(()=>splitMeshParts(b,selection(b)),String(mutate));
  }
 const f=fixture();
  f.bin.writeUInt16LE(99,258);
  const b=pack(f.d,f.bin);
  assert.throws(()=>splitMeshParts(b,selection(b)));
 for(const mutate of [b=>b.writeUInt32LE(1,0),b=>b.writeUInt32LE(1,8),b=>b.writeUInt32LE(99,12),b=>b.writeUInt32LE(0,16)]) {const b=Buffer.from(f.bytes);
    mutate(b);
    assert.throws(()=>splitMeshParts(b,selection(b)));
  }
});
test('oracles reject deliberate output corruption',()=>{
 const f=fixture(),out=splitMeshParts(f.bytes,selection(f.bytes)).bytes;
 for(const mutate of [(d,b)=>{b[88]^=1;},d=>{d.nodes[0].translation=[0,0,0];},d=>{d.accessors.at(-1).count=0;},(d,b)=>{const a=d.accessors.at(-1),v=d.bufferViews[a.bufferView];b.writeUInt16LE(0,v.byteOffset);},d=>{d.accessors.at(-2).count=3;}]) {const {d,bin}=unpack(out);
    mutate(d,bin);
    assert.throws(()=>oracle(f.bytes,pack(d,bin)));
  }
});
test('CLI exclusive directory and duplicate JSON',()=>{
 const p=mkdtempSync(join(realpathSync(tmpdir()),'mesh-parts-')), input=join(p,'in.glb'),sel=join(p,'selection.json'),out=join(p,'new');
 const cli=new URL('./mesh-parts-cli.mjs',import.meta.url);
  const run=(target=out)=>spawnSync(process.execPath,[cli.pathname,input,sel,target],{encoding:'utf8'});
 try {const f=fixture();
    writeFileSync(input,f.bytes);
    writeFileSync(sel,JSON.stringify(selection(f.bytes)));
    let r=run();
    assert.equal(r.status,0,r.stderr);
    oracle(f.bytes,readFileSync(join(out,'parts.glb')));
    assert.notEqual(run().status,0);
 symlinkSync(join(p,'missing'),join(p,'dangling'));
    assert.notEqual(run(join(p,'dangling')).status,0);
 mkdirSync(join(p,'real'));
    symlinkSync(join(p,'real'),join(p,'parent'));
    assert.notEqual(run(join(p,'parent','new')).status,0);
 writeFileSync(sel,JSON.stringify(selection(f.bytes)).replace('"schema":','"schema":"wrong","sche\\u006da":'));
    assert.notEqual(run(join(p,'dup')).status,0);
 }finally{rmSync(p,{recursive:true,force:true});
  }
});

if(process.env.MESH_PARTS_FIXTURES) { const f=fixture();
  writeFileSync(join(process.env.MESH_PARTS_FIXTURES,'synthetic-input.glb'),f.bytes);
  writeFileSync(join(process.env.MESH_PARTS_FIXTURES,'synthetic-output.glb'),splitMeshParts(f.bytes,selection(f.bytes)).bytes);
}

test('duplicate GLB JSON keys and malformed extra chunks are rejected',()=>{
  assert.throws(()=>parseMeshPartsJSON('{"x":0,"\\u0078":1}'));
  const f=fixture(), a=Buffer.from(f.bytes), n=a.readUInt32LE(12);
  const json=a.toString('utf8',20,20+n).replace('"version":"2.0"','"version":"2.0","version":"2.0"');
  const j=Buffer.from(json), padded=Buffer.alloc((j.length+3)&~3,32);
  j.copy(padded);
  const b=Buffer.concat([a.subarray(0,12),Buffer.alloc(8),padded,a.subarray(20+n)]);
  b.writeUInt32LE(b.length,8);
  b.writeUInt32LE(padded.length,12);
  b.writeUInt32LE(0x4e4f534a,16);
  assert.throws(()=>splitMeshParts(b,selection(b)),/duplicate/);
  const extra=Buffer.concat([a,Buffer.alloc(8)]);
  extra.writeUInt32LE(extra.length,8);
  assert.throws(()=>splitMeshParts(extra,selection(extra)));
});

function vertexStrideFixture(semantic, componentType, type, byteStride) {
  const f = fixture(), width = {5121: 1, 5123: 2, 5126: 4}[componentType];
  const arity = {VEC2: 2, VEC3: 3, VEC4: 4}[type];
  const view = {buffer: 0, byteOffset: f.bin.length, byteLength: (byteStride ?? width * arity) * 5, target: 34962};
  if (byteStride !== undefined) view.byteStride = byteStride;
  const accessor = {bufferView: f.d.bufferViews.length, componentType, count: 5, type};
  if (componentType !== 5126) accessor.normalized = true;
  f.d.meshes[0].primitives[0].attributes[semantic] = f.d.accessors.length;
  f.d.bufferViews.push(view);
  f.d.accessors.push(accessor);
  const bin = Buffer.concat([f.bin, Buffer.alloc(128)]);
  f.d.buffers[0].byteLength = bin.length;
  return pack(f.d, bin);
}
const alignmentCases = [
  ['color-u8-vec3', 'COLOR_0', 5121, 'VEC3', 4],
  ['uv-u8-vec2', 'TEXCOORD_0', 5121, 'VEC2', 4],
  ['color-u16-vec3', 'COLOR_0', 5123, 'VEC3', 8],
];
for (const [name, semantic, componentType, type, stride] of alignmentCases) {
  test(`reject implicit unaligned vertex stride: ${name}`, () => {
    const bytes = vertexStrideFixture(semantic, componentType, type);
    if (process.env.MESH_PARTS_ALIGNMENT_FIXTURES) writeFileSync(join(process.env.MESH_PARTS_ALIGNMENT_FIXTURES, `${name}-packed.glb`), bytes);
    assert.throws(() => splitMeshParts(bytes, selection(bytes)), /vertex stride alignment/);
  });
  test(`preserve explicit padded vertex stride: ${name}`, () => {
    const bytes = vertexStrideFixture(semantic, componentType, type, stride);
    const result = splitMeshParts(bytes, selection(bytes));
    oracle(bytes, result.bytes);
    if (process.env.MESH_PARTS_ALIGNMENT_FIXTURES) {
      writeFileSync(join(process.env.MESH_PARTS_ALIGNMENT_FIXTURES, `${name}-padded.glb`), bytes);
      writeFileSync(join(process.env.MESH_PARTS_ALIGNMENT_FIXTURES, `${name}-padded-output.glb`), result.bytes);
    }
  });
}
for (const [semantic, componentType, type] of [['COLOR_0', 5121, 'VEC4'], ['COLOR_0', 5123, 'VEC4'], ['TEXCOORD_0', 5126, 'VEC2'], ['COLOR_0', 5126, 'VEC3']]) {
  test(`preserve aligned implicit vertex stride: ${semantic}/${componentType}/${type}`, () => {
    const bytes = vertexStrideFixture(semantic, componentType, type);
    oracle(bytes, splitMeshParts(bytes, selection(bytes)).bytes);
  });
}
