// Validação oficial Khronos do modelo e dos 11 clipes, fora do registry central.
import { readFileSync, writeFileSync } from 'node:fs';
import validator from 'gltf-validator';

const [, , output, ...files] = process.argv;
if (!output || !files.length) throw new Error('uso: node script report.json files...');
const rows = [];
for (const file of files) {
  const result = await validator.validateBytes(new Uint8Array(readFileSync(file)), { uri: file });
  rows.push({
    file,
    errors: result.issues.numErrors,
    warnings: result.issues.numWarnings,
    infos: result.issues.numInfos,
    hints: result.issues.numHints,
    messages: result.issues.messages,
  });
}
const report = { validator: 'Khronos gltf-validator', files: rows, totalErrors: rows.reduce((n, row) => n + row.errors, 0) };
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output, files: rows.length, totalErrors: report.totalErrors, totalWarnings: rows.reduce((n, row) => n + row.warnings, 0) }));
if (report.totalErrors) process.exit(1);
