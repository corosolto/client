import { readFileSync, statSync, lstatSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, parse } from 'node:path';
import { readJSON } from './kit.mjs';
import { parseMeshPartsJSON, splitMeshParts } from './mesh-parts.mjs';
try {
  const args=process.argv.slice(2);
  if(args.length!==3) throw new Error('usage: node mesh-parts-cli.mjs INPUT.glb SELECTION.json NEWOUT');
  const [input,selectionPath,target]=args, out=resolve(target);
  for(let parent=dirname(out);;parent=dirname(parent)) {const s=lstatSync(parent);
    if(s.isSymbolicLink() || !s.isDirectory()) throw new Error('output ancestor must be a real directory');
    if(parent===parse(parent).root) break;
  }
  try {lstatSync(out);
    throw new Error('NEWOUT already exists');
  } catch(error) {if(error.code!=='ENOENT') throw error;
  }
  const glbStat=statSync(input), jsonStat=statSync(selectionPath);
  if(!glbStat.isFile() || glbStat.size>256*1024*1024 || !jsonStat.isFile() || jsonStat.size>1024*1024) throw new Error('input read safety limit/type');
  parseMeshPartsJSON(new TextDecoder('utf-8',{fatal:true}).decode(readFileSync(selectionPath)));
  const {bytes,report}=splitMeshParts(readFileSync(input),readJSON(selectionPath));
  mkdirSync(out);
  writeFileSync(resolve(out,'parts.glb'),bytes,{flag:'wx'});
  writeFileSync(resolve(out,'correspondence.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({output:out,sourceSha256:report.sourceSha256,outputSha256:report.outputSha256,visualApproved:false,runtimeEnabled:false}));
} catch(error) {console.error(error.message);
  process.exitCode=1;
}
