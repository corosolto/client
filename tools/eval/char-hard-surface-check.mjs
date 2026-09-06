/* O contrato CS_HARD_ continua no runtime após a retirada dos times adicionais.
   Os contratos geométricos do capacete do Motoca foram retirados com seu asset.
   --mutante=semmarcador precisa reprovar o opt-out do shader de pele. */
import fs from 'node:fs';
let source = fs.readFileSync('public/js/characters.js', 'utf8');
if (process.argv.includes('--mutante=semmarcador')) source = source.replace('^CS_HARD_', '^MARCADOR_REMOVIDO_');
const ok = /hardSurface\s*=\s*\/\^CS_HARD_/i.test(source)
  && /hardSurface\s*\?\s*m\s*:\s*applyCharFX/.test(source);
console.log(`${ok ? 'OK' : 'FAIL'} HARD1 materiais CS_HARD_ preservam o shader PBR sem efeitos de pele`);
process.exitCode = ok ? 0 : 1;
