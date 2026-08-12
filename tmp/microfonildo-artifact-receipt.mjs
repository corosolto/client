import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
const base=process.argv[2] || 'references/tv/microfonildo/3d/blender-v1';
const sha=(file)=>createHash('sha256').update(readFileSync(file)).digest('hex');
const row=(file)=>({file,bytes:statSync(file).size,sha256:sha(file)});
const animations=readdirSync(`${base}/anims`).filter(f=>f.endsWith('.glb')).sort().map(f=>row(`${base}/anims/${f}`));
const audit=JSON.parse(readFileSync(`${base}/final-opt-audit.json`,'utf8'));
const khronos=JSON.parse(readFileSync(`${base}/khronos-report.json`,'utf8'));
const pose=JSON.parse(readFileSync(`${base}/pose-inflate.json`,'utf8'));
const receipt={
  generatedAt:new Date().toISOString(),
  final:row(`${base}/microfonildo-final-opt.glb`),
  source:row(`${base}/microfonildo-source.glb`),
  causalMutants:readdirSync(base).filter(f=>f.startsWith('mutant-')&&f.endsWith('-final-opt.glb')).sort().map(f=>row(`${base}/${f}`)),
  animations,
  technical:{
    blender:audit.blender, armatures:audit.armatureCount, meshes:audit.meshCount,
    triangles:audit.meshes.reduce((n,m)=>n+m.triangles,0), bones:audit.armatures.reduce((n,a)=>n+a.boneCount,0),
    khronosFiles:khronos.files.length, khronosErrors:khronos.totalErrors,
    poseInflate:pose.personagens?.[0] || null,
  },
  rig:{provider:'Meshy',taskId:'019ff2be-7bd7-7b61-b6a3-62e932e702aa',consumedCredits:5,source:'Tripo A/B candidate used as pose-estimation donor',finalSkin:'stable Meshy humanoid template + deterministic Blender component weights'},
  revision:{
    contractTarget:`${base}/microfonildo-final-opt.glb`,
    servedWidth:JSON.parse(readFileSync(`${base}/served-width.json`,'utf8')),
    causalContract:JSON.parse(readFileSync(`${base}/contract-clean.json`,'utf8')),
  },
};
writeFileSync(`${base}/artifact-receipt.json`,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({final:receipt.final.sha256,animations:animations.length,triangles:receipt.technical.triangles,bones:receipt.technical.bones,khronosErrors:receipt.technical.khronosErrors}));
