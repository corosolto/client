/* ============================================================================
   webgl-compat-check.mjs — O BOOT DEGRADA O PEDIDO GRÁFICO ANTES DE DESISTIR?
   ----------------------------------------------------------------------------
   POR QUE EXISTE
     "ok tem um erro de webgl, meu colega tem linux e nao consegue rodar, tem como
     consertar isso?"

   CAUSA RAIZ (KNOWN-BUGS.md BUG-44)
     A tentativa mais exigente vinha primeiro, tentativas recuperadas viravam crash e
     o boot ainda abria contextos descartáveis além do renderer principal.

   O QUE MEDE
     Executa criaRenderer() de produção com canvas e Three controlados. A matriz falsa
     reproduz WebGL2/MSAA recusado e WebGL1 aceito sem depender do driver do CI. Também
     inventaria os pontos do boot que não podem criar outro contexto.

   MUTAÇÕES
     --mutante=alto-primeiro  troca a ordem e acende WG1
     --mutante=sem-webgl1     remove WebGL1 e acende WG3
     --mutante=erro-provisorio reporta uma tentativa recuperada e acende WG2
     --mutante=contexto-extra devolve a sonda descartável e acende WG5
     --mutante=fundo-fatal torna o fundo decorativo fatal e acende WG6
     --mutante=sem-context-loss remove a recuperação e acende WG7
     --mutante=qualidade-persistida volta a gravar o low temporário e acende WG8
     --mutante=canvas-reusado insiste num contexto fornecido que já falhou e acende WG9
     --mutante=preview-null remove o fallback do preview e acende WG10
     --mutante=texture-lod-ext devolve a chamada que exige extensão e acende WG11
   ============================================================================ */
import { readFileSync } from 'node:fs';

const MUT = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || '';
let source = readFileSync('public/js/glcontext.js', 'utf8');
if (MUT === 'alto-primeiro') source = source.replace("rotulo: 'padrao'", "rotulo: 'padrao-removido'");
if (MUT === 'sem-webgl1') source = source.replaceAll("'webgl'", "'webgl-removido'").replaceAll("'experimental-webgl'", "'experimental-removido'");
if (MUT === 'erro-provisorio') source = source.replace('if (!gl) continue;', "if (!gl) { console.error('tentativa provisoria'); continue; }");
if (MUT === 'canvas-reusado') source = source.replace('if (suppliedCanvas) break tentativas;', 'if (suppliedCanvas) continue;');
if (MUT && !['alto-primeiro', 'sem-webgl1', 'erro-provisorio', 'contexto-extra', 'fundo-fatal', 'sem-context-loss', 'qualidade-persistida', 'canvas-reusado', 'preview-null', 'texture-lod-ext'].includes(MUT)) throw new Error(`mutante desconhecido: ${MUT}`);

source = source.replace("import * as THREE from 'three';", 'const THREE = globalThis.__WEBGL_TEST_THREE;');
const nativeError = console.error.bind(console);
const errors = [];
console.error = (...args) => errors.push(args.map(String).join(' '));

let behavior = () => null;
let contextCalls = [];
let rendererFailure = false;
class FakeCanvas {
  constructor() { this.listeners = new Map(); this.width = 300; this.height = 150; }
  addEventListener(name, fn) { this.listeners.set(name, fn); }
  setAttribute() {}
  getContext(name, attrs) {
    contextCalls.push({ name, attrs: { ...(attrs || {}) } });
    const value = behavior(name, attrs || {});
    if (!value) this.listeners.get('webglcontextcreationerror')?.({ statusMessage: `${name} recusado` });
    return value;
  }
}
const fakeContext = (api, renderer = 'Mesa Intel') => ({
  api,
  RENDERER: 0x1f01,
  getExtension(name) { return name === 'WEBGL_debug_renderer_info' ? { UNMASKED_RENDERER_WEBGL: 0x9246 } : null; },
  getParameter(key) { return key === 0x9246 || key === this.RENDERER ? renderer : null; },
});
class FakeRenderer {
  constructor(opts) {
    if (!opts.context) throw new Error('renderer recebeu contexto nulo');
    if (rendererFailure) throw new Error('renderer recusou contexto criado');
    this.domElement = opts.canvas;
    this.context = opts.context;
    this.capabilities = { isWebGL2: opts.context.api === 'webgl2' };
  }
  getContext() { return this.context; }
}

globalThis.__WEBGL_TEST_THREE = { WebGLRenderer: FakeRenderer, WebGL1Renderer: FakeRenderer };
globalThis.window = { va() {} };
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'Linux test' }, configurable: true });
globalThis.location = { search: '' };
globalThis.document = { createElement: (name) => name === 'canvas' ? new FakeCanvas() : ({ style: {}, appendChild() {} }), body: { appendChild() {} }, documentElement: { appendChild() {} } };

const failures = [];
try {
  const mod = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}#${Date.now()}`);

  contextCalls = []; errors.length = 0;
  behavior = (name) => name === 'webgl2' ? fakeContext('webgl2') : null;
  const normal = mod.criaRenderer();
  if (!normal || contextCalls[0]?.attrs?.powerPreference !== 'default' || contextCalls[0]?.attrs?.antialias !== true)
    failures.push('WG1 o primeiro pedido não é WebGL padrão com MSAA');
  if (normal?.__csWebgl?.tier !== 'padrao' || normal?.__csWebgl?.api !== 'webgl2')
    failures.push('WG1 metadata não registra o caminho padrão real');

  contextCalls = []; errors.length = 0;
  behavior = (name, attrs) => name === 'webgl2' && attrs.antialias === false ? fakeContext('webgl2') : null;
  const degraded = mod.criaRenderer();
  if (!degraded || degraded.__csWebgl?.tier !== 'sem-msaa' || window.__semWebgl)
    failures.push('WG2 falha com MSAA não degrada para contexto sem MSAA');
  if (errors.length) failures.push(`WG2 tentativa recuperada gerou ${errors.length} console.error`);

  contextCalls = []; errors.length = 0; location.search = '?safe=1';
  behavior = (name) => name === 'webgl' ? fakeContext('webgl', 'llvmpipe') : null;
  const safe = mod.criaRenderer({}, { compatibility: true });
  if (!safe || contextCalls[0]?.name !== 'webgl' || safe.__csWebgl?.api !== 'webgl' || !safe.__csWebgl?.degraded)
    failures.push('WG3 modo compatibilidade não prioriza e registra WebGL1');

  contextCalls = []; errors.length = 0; location.search = '';
  behavior = () => null;
  const absent = mod.criaRenderer();
  if (absent !== null || errors.length !== 1 || !/^sem_webgl:/.test(errors[0] || ''))
    failures.push(`WG4 falha total não gera um único erro canônico (erros=${errors.length})`);

  errors.length = 0; window.__semWebgl = false;
  const optional = mod.criaRenderer({}, { optional: true });
  if (optional !== null || errors.length || window.__semWebgl)
    failures.push('WG6 WebGL decorativo ausente ainda escala como crash');

  contextCalls = []; rendererFailure = true;
  behavior = (name) => name === 'webgl2' ? fakeContext('webgl2') : null;
  const supplied = mod.criaRenderer({ canvas: new FakeCanvas() }, { optional: true });
  rendererFailure = false;
  if (supplied !== null || contextCalls.length !== 1)
    failures.push(`WG9 canvas fornecido foi reutilizado após falha do renderer (${contextCalls.length} tentativas)`);

  let main = readFileSync('public/js/main.js', 'utf8');
  let characters = readFileSync('public/js/characters.js', 'utf8');
  const threeVendor = readFileSync('public/vendor/three.module.js', 'utf8');
  let site = readFileSync('public/js/site-bg.js', 'utf8');
  if (MUT === 'contexto-extra') main += "\ndocument.createElement('canvas').getContext('webgl2');";
  if (MUT === 'fundo-fatal') site = site.replace('{ optional: true }', '{ optional: false }');
  if (MUT === 'sem-context-loss') main = main.replace("renderer.domElement.addEventListener('webglcontextlost'", "renderer.domElement.addEventListener('removido'");
  if (MUT === 'qualidade-persistida') main = main.replace('quality: preferredQuality ?? settings.quality', 'quality: settings.quality');
  if (MUT === 'preview-null') main = main.replace('if (!p) return fallbackUrl;', '');
  if (MUT === 'texture-lod-ext') characters = characters.replace('texture2D(map, vMapUv, csAlbLod)', 'texture2DLodEXT(map, vMapUv, csAlbLod)');
  const forbidden = (main.match(/createElement\('canvas'\)[\s\S]{0,180}getContext\(['\"]webgl/g) || []).length
    + (characters.match(/createElement\('canvas'\)[\s\S]{0,180}getContext\(['\"]webgl/g) || []).length;
  if (forbidden) failures.push(`WG5 boot ainda abre ${forbidden} contexto(s) de sonda`);
  if (/new THREE\.WebGLRenderer\(\{ canvas, antialias: true, alpha: true \}\)/.test(main))
    failures.push('WG5 preview ainda abre renderer sem a factory de compatibilidade');
  if (!main.includes("staticPreviews = COMPAT_MODE && !ASSET_CHECK"))
    failures.push('WG5 modo degradado não desliga o renderer secundário fora do smoke de assets');
  if (!site.includes('{ optional: true }') || /throw new Error\(['\"]site-bg/.test(site))
    failures.push('WG6 fundo WebGL decorativo ainda pode derrubar a rota');
  if (!main.includes("addEventListener('webglcontextlost'") || !main.includes("addEventListener('webglcontextrestored'") || !main.includes("'webgl-context-lost'"))
    failures.push('WG7 perda de contexto não oferece recuperação acionável');
  if (!main.includes('quality: preferredQuality ?? settings.quality') || !main.includes('preferredQuality = settings.quality'))
    failures.push('WG8 modo compatibilidade pode persistir qualidade baixa fora da sessão');
  if (!main.includes('if (!p) return fallbackUrl;'))
    failures.push('WG10 falha do renderer de preview ainda pode desreferenciar null');
  const regional = characters.match(/const CS_ALB_REGIONAL = `([\s\S]*?)`;/)?.[1] || '';
  if (!regional.includes('texture2D(map, vMapUv, csAlbLod)') || /texture2DLodEXT|\btextureLod\(/.test(regional))
    failures.push('WG11 shader regional exige extensão de LOD em vez do bias nativo do fragment shader');
  if (/_hasTextureLod|setCharacterRendererCapabilities/.test(characters)
    || !characters.includes('const regOn = clampOn && CHAR_FX.albReg;'))
    failures.push('WG11 variante do material depende da capacidade global de outro renderer');
  if (!threeVendor.includes('#define texture2D texture'))
    failures.push('WG11 vendor não traduz texture2D para texture no perfil GLSL 3');
} finally {
  console.error = nativeError;
}

if (MUT && !failures.length) failures.push(`mutação ${MUT} não foi detectada`);
for (const failure of failures) nativeError(`  \x1b[31m✗\x1b[0m ${failure}`);
if (failures.length) {
  nativeError(`\x1b[31mWEBGL-COMPAT ${failures.length} VERMELHA(S)\x1b[0m${MUT ? ` (mutante=${MUT})` : ''}`);
  process.exitCode = 1;
} else nativeError('\x1b[32mWEBGL-COMPAT verde: fallback executado, sem contextos descartáveis\x1b[0m');
