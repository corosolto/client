/* Cria um único renderer pelo pedido menos restritivo que funcionar. A ordem e a
   metadata são contrato de compatibilidade; a cronologia vive no KNOWN-BUGS.md. */
import * as THREE from 'three';

const TIERS = [
  { rotulo: 'padrao', attrs: { antialias: true, powerPreference: 'default', stencil: true } },
  { rotulo: 'sem-msaa', attrs: { antialias: false, powerPreference: 'default', stencil: true } },
  { rotulo: 'economia', attrs: { antialias: false, powerPreference: 'low-power', stencil: false } },
  { rotulo: 'alto-desempenho', attrs: { antialias: false, powerPreference: 'high-performance', stencil: false } },
];

const SOFTWARE_RE = /llvmpipe|softpipe|swiftshader|software raster/i;

function rendererName(gl) {
  try {
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    return String(debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) || '');
  } catch { return ''; }
}

function lose(gl) {
  try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch {}
}

/** @returns {THREE.WebGLRenderer|null} */
export function criaRenderer(base = {}, options = {}) {
  const compatibility = options.compatibility === true;
  const names = compatibility ? ['webgl', 'experimental-webgl', 'webgl2'] : ['webgl2', 'webgl', 'experimental-webgl'];
  const tiers = compatibility ? TIERS.slice(1) : TIERS;
  const suppliedCanvas = base.canvas || null;
  const fixed = { ...base };
  delete fixed.canvas;
  delete fixed.context;
  const reasons = [];
  let ultimoErro = null;

  tentativas: for (const tier of tiers) {
    for (const name of names) {
      const canvas = suppliedCanvas || document.createElement('canvas');
      const attrs = {
        alpha: fixed.alpha ?? false,
        depth: fixed.depth ?? true,
        premultipliedAlpha: fixed.premultipliedAlpha ?? true,
        preserveDrawingBuffer: fixed.preserveDrawingBuffer ?? false,
        failIfMajorPerformanceCaveat: false,
        ...tier.attrs,
      };
      try {
        canvas.addEventListener('webglcontextcreationerror', (event) => {
          if (event.statusMessage) reasons.push(`${name}/${tier.rotulo}: ${event.statusMessage}`);
        }, { once: true });
        const gl = canvas.getContext(name, attrs);
        if (!gl) continue;

        let renderer;
        try {
          window.__webglTentativa = true;
          const Renderer = name === 'webgl2' ? THREE.WebGLRenderer : THREE.WebGL1Renderer;
          renderer = new Renderer({ ...fixed, ...attrs, canvas, context: gl });
        } catch (error) {
          ultimoErro = error;
          reasons.push(`${name}/${tier.rotulo}: ${error?.message || error}`);
          lose(gl);
          if (suppliedCanvas) break tentativas;
          continue;
        } finally {
          window.__webglTentativa = false;
        }

        const gpu = rendererName(gl);
        const metadata = Object.freeze({
          api: name === 'webgl2' ? 'webgl2' : 'webgl',
          tier: tier.rotulo,
          software: SOFTWARE_RE.test(gpu),
          renderer: gpu.slice(0, 120),
          degraded: compatibility || tier.rotulo !== 'padrao' || name !== 'webgl2' || SOFTWARE_RE.test(gpu),
        });
        renderer.__csWebgl = metadata;
        if (!options.optional) {
          window.__csWebgl = metadata;
          window.__semWebgl = false;
        }
        if (metadata.degraded && !options.optional) {
          try {
            window.va?.('event', { name: 'webgl_degradado', data: { api: metadata.api, tier: metadata.tier, software: metadata.software } });
            console.warn(`[webgl] ${metadata.api}/${metadata.tier}${metadata.software ? ' (software)' : ''}`);
          } catch {}
        }
        return renderer;
      } catch (error) {
        ultimoErro = error;
        reasons.push(`${name}/${tier.rotulo}: ${error?.message || error}`);
      }
    }
  }

  const detail = reasons.slice(-4).join(' | ') || ultimoErro?.message || String(ultimoErro || 'contexto recusado');
  if (options.optional) {
    console.warn(`webgl opcional indisponível · ${detail}`);
    return null;
  }
  window.__semWebgl = true;
  try {
    window.va?.('event', { name: 'sem_webgl', data: { detail: detail.slice(0, 120) } });
    console.error(`sem_webgl: nenhum contexto foi criado · ${detail}`);
  } catch {}
  return null;
}

/* Sem contexto não existe fallback gráfico dentro da página; o CTA muda a ordem e o
   custo da próxima tentativa, e o diagnóstico nativo continua no console. */
export function avisaSemWebgl(erro) {
  try {
    window.__semWebgl = true;
    const current = new URL(location.href);
    current.searchParams.set('safe', '1');
    const el = document.createElement('div');
    el.id = 'sem-webgl';
    el.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:8vw;background:#090704;color:#f4efe6;font:16px/1.6 system-ui,sans-serif;text-align:center';
    el.innerHTML = '<div style="max-width:46rem"><h1 style="font-size:1.6rem;margin:0 0 1rem">Seu navegador não conseguiu abrir o 3D</h1>'
      + '<p style="margin:0 0 1rem">O jogo precisa de <strong>WebGL</strong>. Atualize o driver de vídeo, ligue a aceleração por hardware ou teste outro navegador.</p>'
      + (new URLSearchParams(location.search).get('safe') === '1' ? '' : `<p><a style="display:inline-block;background:#ffc233;color:#090704;padding:.8rem 1.2rem;font-weight:800;text-decoration:none" href="${current.href}">TENTAR MODO COMPATIBILIDADE</a></p>`)
      + '<p style="margin:1rem 0"><a style="color:#ffc233" href="https://get.webgl.org/" rel="noopener">Testar WebGL neste navegador</a></p>'
      + '<p style="margin:0;opacity:.6;font-size:.85em">Detalhe técnico: <span data-webgl-detail></span></p></div>';
    el.querySelector('[data-webgl-detail]').textContent = String(erro?.message || erro || 'contexto não criado').slice(0, 200);
    (document.body || document.documentElement).appendChild(el);
  } catch {}
}
