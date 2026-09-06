/* Logs WebGL anuláveis não podem esconder o diagnóstico real do shader.
   E o WeakMap de drawBuffers não pode derrubar o loop quando createFramebuffer falha (#171). */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';

const mutant = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || '';
if (mutant && !['sem-guardas', 'sem-cache-bust', 'addons-immutable', 'cloudflare-vendor', 'framebuffer-nulo', 'sem-contexto-sincrono'].includes(mutant)) {
  throw new Error(`mutante desconhecido: ${mutant}`);
}

const vendorOriginal = readFileSync('public/vendor/three.module.js', 'utf8');
const vendorHash = createHash('sha256').update(vendorOriginal).digest('hex').slice(0, 12);
let vendor = vendorOriginal;
const productFiles = [
  'src/pages/index.astro',
  'src/layouts/Layout.astro',
];
let productSources = productFiles.map((file) => [file, readFileSync(file, 'utf8')]);
let cloudflareSetup = readFileSync('scripts/cloudflare-setup.sh', 'utf8');
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
if (mutant === 'framebuffer-nulo') {
  const before = vendor;
  vendor = vendor.replace(
    /\n\t\t\t\tif \( framebuffer == null \) return;[^\n]*\n/,
    '',
  );
  if (vendor === before) throw new Error('MUTANTE NAO APLICOU: framebuffer-nulo');
}
if (mutant === 'sem-contexto-sincrono') {
  const before = vendor;
  vendor = vendor.replace(
    'if ( _isContextLost === true || _gl.isContextLost() === true ) return;',
    'if ( _isContextLost === true ) return;',
  );
  if (vendor === before) throw new Error('MUTANTE NAO APLICOU: sem-contexto-sincrono');
}
if (mutant === 'sem-cache-bust') {
  productSources = productSources.map(([file, source]) => [file, source.replace('?v=${V}', '')]);
  harnessSources = harnessSources.map(([file, source]) => [file, source.replace(/\?h=[a-f0-9]+/, '')]);
}
let vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
if (mutant === 'addons-immutable') {
  const route = vercel.headers?.find((item) => item.source === '/vendor/(.*)');
  const header = route?.headers?.find((item) => item.key.toLowerCase() === 'cache-control');
  if (header) header.value = 'public, max-age=31536000, immutable';
}
if (mutant === 'cloudflare-vendor') {
  const before = cloudflareSetup;
  cloudflareSetup = cloudflareSetup.replace(
    'starts_with(http.request.uri.path, \\"/js/\\")',
    'starts_with(http.request.uri.path, \\"/vendor/\\") or starts_with(http.request.uri.path, \\"/js/\\")',
  );
  if (cloudflareSetup === before) throw new Error('MUTANTE NAO APLICOU: cloudflare-vendor');
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

const vendorRoute = vercel.headers?.find((route) => route.source === '/vendor/(.*)');
const vendorCache = vendorRoute?.headers?.find((header) => header.key.toLowerCase() === 'cache-control')?.value || '';
const immutableVendor = /(?:^|,)\s*immutable(?:\s*,|$)/i.test(vendorCache);
for (const [file, source] of productSources) {
  if (!/["'`]\/?\.??\/vendor\/three\.module\.js\?v=\$\{V\}["'`]/.test(source)) {
    failures.push(`SL4 ${file} não versiona o core do Three`);
  }
}
for (const [file, source] of harnessSources) {
  if (!source.includes(`./vendor/three.module.js?h=${vendorHash}`)) {
    failures.push(`SL5 ${file} não usa o hash atual do Three (${vendorHash})`);
  }
}
const maxAge = vendorCache.match(/(?:^|,)\s*max-age\s*=\s*(\d+)/i);
const revalidatesNow = /(?:^|,)\s*no-cache(?:\s*,|$)/i.test(vendorCache)
  || (maxAge && Number(maxAge[1]) === 0);
if (immutableVendor || !revalidatesNow || cloudflareSetup.includes('starts_with(http.request.uri.path, \\"/vendor/\\")')) {
  failures.push('SL6 addons do Three sem URL própria precisam revalidar no servidor');
}

/* SL7 executa a drawBuffers REAL do vendor: com framebuffer nulo (falha de
   alocação sob pressão/perda de contexto, #171) ela não pode lançar — e os
   caminhos normais precisam continuar emitindo os mesmos draw buffers. */
const drawBuffersMatch = vendor.match(/function drawBuffers\( renderTarget, framebuffer \) \{[\s\S]*?\n\t\}/);
let drawBuffersFn = null;
if (drawBuffersMatch) {
  try {
    drawBuffersFn = Function(
      'defaultDrawbuffers', 'currentDrawbuffers', 'gl', 'capabilities', 'extensions',
      `${drawBuffersMatch[0]}\nreturn drawBuffers;`,
    );
  } catch { /* SL7 vermelha abaixo */ }
}
const runDrawBuffers = (renderTarget, framebuffer) => {
  const calls = [];
  const gl = {
    COLOR_ATTACHMENT0: 0x8CE0,
    BACK: 0x0405,
    drawBuffers: (buffers) => calls.push(buffers.slice()),
  };
  const extensions = { get: () => ({ drawBuffersWEBGL: (buffers) => calls.push(buffers.slice()) }) };
  drawBuffersFn([], new WeakMap(), gl, { isWebGL2: true }, extensions)(renderTarget, framebuffer);
  return calls;
};
if (!drawBuffersFn) {
  failures.push('SL7 drawBuffers não encontrada no vendor');
} else {
  try {
    const calls = runDrawBuffers({ isWebGLMultipleRenderTargets: false }, null);
    if (calls.length) failures.push('SL7 framebuffer nulo não devia emitir drawBuffers');
  } catch (error) {
    failures.push(`SL7 framebuffer nulo derruba o loop: ${error.message}`);
  }
  const esperados = [
    [{ isWebGLMultipleRenderTargets: false }, {}, [0x8CE0]],
    [{ isWebGLMultipleRenderTargets: true, texture: [{}, {}] }, {}, [0x8CE0, 0x8CE1]],
    [null, {}, [0x0405]],
  ];
  for (const [renderTarget, framebuffer, esperado] of esperados) {
    try {
      const calls = runDrawBuffers(renderTarget, framebuffer);
      if (calls.length !== 1 || calls[0].join(',') !== esperado.join(',')) {
        failures.push(`SL7 caminho normal alterado: [${calls.map((c) => c.join(',')).join('|')}] ≠ [${esperado.join(',')}]`);
      }
    } catch (error) {
      failures.push(`SL7 caminho normal quebrou: ${error.message}`);
    }
  }
}

/* SL8 · perda de contexto no MEIO do frame (#419/#420): `_isContextLost` só vira verdade
   quando o evento DOM webglcontextlost chega, e o evento é assíncrono — na janela entre a
   perda física e o despacho, createShader() devolve null e shaderSource(null,…) lança no
   WebKit. O render() precisa consultar a verdade síncrona do driver ALÉM da flag, e no
   topo — antes de tocar o grafo de cena. Textual-posicional como SL4-SL6: executar o
   render() inteiro exigiria stub do renderer inteiro, e arnês desse tamanho mede a si
   mesmo (lição registrada na EP12 do error-provenance-check). */
const guardaRender = /this\.render = function \( scene, camera \) \{[\s\S]{0,600}?if \( _isContextLost === true \|\| _gl\.isContextLost\(\) === true \) return;/;
if (!guardaRender.test(vendor)) {
  failures.push('SL8 render() não consulta gl.isContextLost() além da flag assíncrona (ou a guarda saiu do topo)');
}

if (mutant && !failures.length) failures.push(`mutação ${mutant} não foi detectada`);
for (const failure of failures) console.error(`  \x1b[31m✗\x1b[0m ${failure}`);
if (failures.length) {
  console.error(`\x1b[31mSHADER-LOG ${failures.length} VERMELHA(S)\x1b[0m${mutant ? ` (mutante=${mutant})` : ''}`);
  process.exitCode = 1;
} else {
  console.log('\x1b[32mSHADER-LOG verde: logs nulos, framebuffer nulo e entrega versionada protegidos\x1b[0m');
}
