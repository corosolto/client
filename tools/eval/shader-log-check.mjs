/* Logs WebGL anuláveis não podem esconder o diagnóstico real do shader. */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';

const mutant = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || '';
if (mutant && !['sem-guardas', 'sem-cache-bust'].includes(mutant)) {
  throw new Error(`mutante desconhecido: ${mutant}`);
}

const vendorOriginal = readFileSync('public/vendor/three.module.js', 'utf8');
const vendorHash = createHash('sha256').update(vendorOriginal).digest('hex').slice(0, 12);
let vendor = vendorOriginal;
const productFiles = [
  'src/pages/index.astro',
  'src/layouts/Layout.astro',
  'src/pages/editor.astro',
];
let productSources = productFiles.map((file) => [file, readFileSync(file, 'utf8')]);
let harnessSources = readdirSync('public')
  .filter((file) => file.endsWith('.html'))
  .map((file) => [`public/${file}`, readFileSync(`public/${file}`, 'utf8')])
  .filter(([, source]) => source.includes('./vendor/three.module.js'));

if (mutant === 'sem-guardas') {
  vendor = vendor.replace(
    /(gl\.get(?:Shader|Program)InfoLog\([^;]+\))\s*\|\|\s*'';/g,
    '$1;',
  );
}
if (mutant === 'sem-cache-bust') {
  productSources = productSources.map(([file, source]) => [file, source.replace('?v=${V}', '')]);
  harnessSources = harnessSources.map(([file, source]) => [file, source.replace(/\?h=[a-f0-9]+/, '')]);
}

const failures = [];
const assignments = [...vendor.matchAll(
  /const\s+(\w+)\s*=\s*(gl\.get(?:Shader|Program)InfoLog\(([^;]+)\)\s*\|\|\s*'');/g,
)];
const calls = [...vendor.matchAll(/gl\.get(?:Shader|Program)InfoLog\([^;]+?\)/g)];
const unguarded = [...vendor.matchAll(
  /const\s+\w+\s*=\s*gl\.get(?:Shader|Program)InfoLog\([^;]+\);/g,
)];

if (assignments.length !== 4) failures.push(`SL1 ${assignments.length}/4 logs WebGL têm fallback de string`);
if (calls.length !== assignments.length || unguarded.length) {
  failures.push(`SL2 ${calls.length - assignments.length} chamada(s) fora das guardas; ${unguarded.length} atribuição(ões) insegura(s)`);
}

for (const [, variable, expression] of assignments) {
  if (!new RegExp(`\\b${variable}\\.trim\\(\\)`).test(vendor)) {
    failures.push(`SL3 ${variable} não alimenta o diagnóstico aparado`);
  }
  for (const [value, expected] of [[null, ''], ['  aviso  ', 'aviso']]) {
    const gl = {
      getShaderInfoLog: () => value,
      getProgramInfoLog: () => value,
    };
    try {
      const normalized = Function(
        'gl', 'shader', 'program', 'glVertexShader', 'glFragmentShader',
        `return (${expression}).trim()`,
      )(gl, {}, {}, {}, {});
      if (normalized !== expected) failures.push(`SL3 ${variable} normalizou ${String(value)} incorretamente`);
    } catch (error) {
      failures.push(`SL3 ${variable} lança com ${String(value)}: ${error.message}`);
    }
  }
}

const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
const vendorRoute = vercel.headers?.find((route) => route.source === '/vendor/(.*)');
const vendorCache = vendorRoute?.headers?.find((header) => header.key.toLowerCase() === 'cache-control')?.value || '';
const immutableVendor = /(?:^|,)\s*immutable(?:\s*,|$)/i.test(vendorCache);
if (immutableVendor) {
  for (const [file, source] of productSources) {
    if (!/["'`]\/?\.??\/vendor\/three\.module\.js\?v=\$\{V\}["'`]/.test(source)) {
      failures.push(`SL4 ${file} não versiona o Three com cache imutável`);
    }
  }
  for (const [file, source] of harnessSources) {
    if (!source.includes(`./vendor/three.module.js?h=${vendorHash}`)) {
      failures.push(`SL5 ${file} não usa o hash atual do Three (${vendorHash})`);
    }
  }
}

if (mutant && !failures.length) failures.push(`mutação ${mutant} não foi detectada`);
for (const failure of failures) console.error(`  \x1b[31m✗\x1b[0m ${failure}`);
if (failures.length) {
  console.error(`\x1b[31mSHADER-LOG ${failures.length} VERMELHA(S)\x1b[0m${mutant ? ` (mutante=${mutant})` : ''}`);
  process.exitCode = 1;
} else {
  console.log('\x1b[32mSHADER-LOG verde: logs nulos e entrega versionada protegidos\x1b[0m');
}
