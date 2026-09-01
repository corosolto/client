import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import validator from 'gltf-validator';
for (const f of process.argv.slice(2)) {
  const bytes = new Uint8Array(readFileSync(f));
  const r = await validator.validateBytes(bytes, { uri: f, maxIssues: 20 });
  const sha = createHash('sha256').update(readFileSync(f)).digest('hex');
  console.log(`${r.issues.numErrors ? '✗' : '✓'} ${f.split('/').pop()} erros=${r.issues.numErrors} avisos=${r.issues.numWarnings} sha256=${sha}`);
  for (const m of r.issues.messages.filter(e=>e.severity===0).slice(0,3)) console.log('   ', m.code, m.pointer||'', m.message);
}
