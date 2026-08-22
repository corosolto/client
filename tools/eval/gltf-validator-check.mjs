/* Valida os GLBs finais registrados com o validador oficial Khronos glTF 2.0.

   Three.js e Blender toleram alguns documentos inválidos; zero erro de carregamento não
   é conformidade. Warnings são reportados (tangentes geradas/atributo sem uso), mas só
   erros de spec bloqueiam. `--mutante=cabecalho` corrompe o magic do primeiro GLB;
   `--mutante=inclui-imagem` reintroduz WebP no escopo e prova que o filtro morde.
*/
import { readFileSync } from 'node:fs';
import validator from 'gltf-validator';
import { FINAL_ARTIFACT_TYPE, finalArtifacts } from './final-asset-registry.mjs';

const registry = JSON.parse(readFileSync('mint-assets.json', 'utf8'));
const MUT_HEADER = process.argv.includes('--mutante=cabecalho');
const MUT_SCOPE = process.argv.includes('--mutante=inclui-imagem');
const entries = finalArtifacts(registry, MUT_SCOPE ? {} : { type: FINAL_ARTIFACT_TYPE.GLTF_BINARY });
if (MUT_SCOPE && !entries.some((entry) => entry.artifactType === FINAL_ARTIFACT_TYPE.IMAGE_WEBP))
  throw new Error('MUTANTE NÃO APLICOU: nenhuma imagem final entrou no escopo Khronos');
let errors = 0, warnings = 0;
for (const [index, { id, file }] of entries.entries()) {
  const bytes = new Uint8Array(readFileSync(file));
  if (MUT_HEADER && index === 0) bytes[0] = 0;
  try {
    const result = await validator.validateBytes(bytes, { uri: file, maxIssues: 100 });
    const issue = result.issues;
    errors += issue.numErrors; warnings += issue.numWarnings;
    console.log(`${issue.numErrors ? '✗' : '✓'} ${id}: ${issue.numErrors} erro(s), ${issue.numWarnings} aviso(s)`);
    for (const message of issue.messages.filter((entry) => entry.severity === 0).slice(0, 5))
      console.error(`  ${message.code} ${message.pointer || ''}: ${message.message}`);
  } catch (error) {
    errors++;
    console.error(`✗ ${id}: validador não abriu ${file}: ${error?.message || String(error)}`);
  }
}
if (errors) process.exit(1);
console.log(`GLTF-VALIDATOR ✓ ${entries.length} GLBs finais, 0 erros (${warnings} avisos reportados)`);
