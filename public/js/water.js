import * as THREE from 'three';
import { Pass, FullScreenQuad } from '../vendor/addons/postprocessing/Pass.js';
import { LOOK } from './look.js';

/* ============================================================================
   water.js — ÁGUA VIVA (RC2 do plans/23): depth-fade, espuma de contato, onda.
   ----------------------------------------------------------------------------
   O "mar" era a faixa azul assada no panorama do céu — o "plano azul morto" do
   dono. Aqui a água é UM plano com ShaderMaterial alimentado pelo depth da cena:

   • tinta por profundidade: coluna d'água = sceneViewZ - fragViewZ (mesma matemática
     do SSAO da casa) -> mix(uCorRasa, uCorFunda) e alfa crescente (o raso deixa ver
     o fundo, como no print de referência do dono);
   • espuma de contato: coluna pequena = linha d'água -> faixa de espuma quebrada
     pela textura de normais B (praia, pedra, casco — qualquer geometria);
   • oclusão MANUAL: descarta quando a cena está mais perto (o mesh fica com
     depthTest/depthWrite DESLIGADOS no modo composer);
   • onda: Gerstner leve no vértice (2 ondas) + 2 normal maps em scroll cruzado;
   • especular de sol do LOOK (RC1): a água não inventa um segundo sol.

   O FEEDBACK LOOP (medido no Chrome/Metal 19/08, GL_INVALID_OPERATION):
   amostrar o depthTexture do MESMO render target em que se desenha é feedback
   loop — mesmo com depthTest/depthWrite desligados, o ANGLE rejeita o draw.
   Por isso o caminho completo NÃO é "a água desenha no meio da cena": o mesh
   fica na WATER_LAYER (fora da câmera principal) e o DepthPass, colado no
   RenderPass, (1) copia o depth para um RT próprio já linearizado (viewZ/-far
   em meia-float — depth cru em meia-float perderia a faixa de espuma: 1e-5 de
   resolução a 40 m) e (2) desenha SÓ a camada da água no readBuffer amostrando
   a cópia. Framebuffer diferente: sem loop, depth do MESMO frame.

   Sem composer (quality 'low' / ?bloom=0): o mesh fica na camada 0 com
   uDepthOn=0 e depthTest=true — água animada com fresnel/especular, sem
   depth-fade nem espuma (mesmo degrau do SSAO, que também é med/high).
   Córrego/Brasília/piscina reutilizam este módulo.
   ============================================================================ */

export const WATER_LAYER = 12;   // layers 0-11: 0 default + 11 NO_BLOOM (bloom.js)
export const SOFT_LAYER = 13;    // partículas soft (RC3): mesmo passe, mesma cópia

/* Passe do RC2/RC3: cópia linearizada do depth + desenho das camadas que a
   consomem (água viva, partículas soft). Instalado pelo bloom.js logo após o
   RenderPass (needsSwap=false: escreve no próprio readBuffer, como o
   CharNoBloomPass). Chamava-se WaterPass até o RC3 — o nome novo é o contrato:
   quem precisa de depth de cena bebe DESTA cópia, não cria canal paralelo. */
const DEPTH_COPY_FRAG = /* glsl */`
uniform sampler2D tDepth;
uniform float uNear;
uniform float uFar;
varying vec2 vUv;
void main() {
  float d = texture2D(tDepth, vUv).x;
  float vz = (uNear * uFar) / ((uFar - uNear) * d - uFar);   // perspectiveDepthToViewZ
  gl_FragColor = vec4(clamp(-vz / uFar, 0.0, 1.0), 0.0, 0.0, 1.0);
}
`;
const DEPTH_COPY_VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export class DepthPass extends Pass {
  constructor(scene, camera, rawRender, aguas, softs = []) {
    super();
    this.needsSwap = false;
    this.scene = scene; this.camera = camera;
    this._raw = rawRender;           // render CRU: chamar renderer.render aqui recursaria no composer
    this.aguas = aguas;              // scene.userData.waters: UM passe p/ todas as lâminas
    this.softs = softs;              // scene.userData.softs: idem para partículas
    this.depthRT = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType, format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      depthBuffer: false, stencilBuffer: false,
    });
    const u = {
      tDepth: { value: null },
      uNear: { value: camera.near }, uFar: { value: camera.far },
    };
    this.copyMat = new THREE.ShaderMaterial({
      vertexShader: DEPTH_COPY_VERT, fragmentShader: DEPTH_COPY_FRAG,
      uniforms: u, depthTest: false, depthWrite: false,
    });
    this.fq = new FullScreenQuad(this.copyMat);
    for (const a of aguas) a.material.uniforms.tDepth.value = this.depthRT.texture;
    for (const s of softs) s.uniforms.tDepth.value = this.depthRT.texture;
  }
  setSize(w, h) { this.depthRT.setSize(w, h); }
  render(renderer, writeBuffer, readBuffer) {
    const cam = this.camera, sc = this.scene, u = this.copyMat.uniforms;
    u.tDepth.value = readBuffer.depthTexture;
    u.uNear.value = cam.near; u.uFar.value = cam.far;
    for (const a of this.aguas) { a.material.uniforms.uNear.value = cam.near; a.material.uniforms.uFar.value = cam.far; }
    for (const s of this.softs) {
      s.uniforms.uFar.value = cam.far;
      s.uniforms.uRes.value.set(readBuffer.width, readBuffer.height);
    }
    renderer.setRenderTarget(this.depthRT);
    this.fq.render(renderer);
    const oAuto = renderer.autoClear, oBg = sc.background, oLayers = cam.layers.mask;
    const sm = renderer.shadowMap, oSmAuto = sm.autoUpdate, oSmNeeds = sm.needsUpdate;
    renderer.setRenderTarget(readBuffer);
    renderer.autoClear = false;      // o RenderPass já desenhou aqui: limpar seria apagar o quadro
    sm.autoUpdate = false; sm.needsUpdate = false;   // água/soft não usam sombra; re-render dobraria custo
    sc.background = null;
    cam.layers.mask = (1 << WATER_LAYER) | (1 << SOFT_LAYER);
    this._raw(sc, cam);
    cam.layers.mask = oLayers;
    sc.background = oBg;
    sm.autoUpdate = oSmAuto; sm.needsUpdate = oSmNeeds;
    renderer.autoClear = oAuto;
  }
  dispose() { this.depthRT.dispose(); this.copyMat.dispose(); this.fq.dispose(); }
}

const VERT = /* glsl */`
uniform float uTime;
uniform float uAmp;
varying vec3 vWorld;
varying float vViewZ;
varying vec4 vClip;
varying vec2 vSlope;
// Gerstner leve: 2 ondas, amplitude em metros × uAmp (oceano 1,0; córrego 0,08 —
// ±14 cm de onda numa lâmina de 14 cm seria o mar reto num canal). Desloca o z
// LOCAL (o mesh é plano rotation.x=-PI/2: z local é o y do mundo — invariante).
vec2 gerstner(vec2 xz, float t) {
  vec2 s = vec2(0.0);
  s += 0.09 * uAmp * 6.28318 / 6.5 * cos(dot(normalize(vec2(0.30, 1.0)), xz) * 6.28318 / 6.5 - t * 1.1) * normalize(vec2(0.30, 1.0));
  s += 0.05 * uAmp * 6.28318 / 3.3 * cos(dot(normalize(vec2(-0.70, 0.8)), xz) * 6.28318 / 3.3 - t * 1.7) * normalize(vec2(-0.70, 0.8));
  return s;
}
float altura(vec2 xz, float t) {
  return 0.09 * uAmp * sin(dot(normalize(vec2(0.30, 1.0)), xz) * 6.28318 / 6.5 - t * 1.1)
       + 0.05 * uAmp * sin(dot(normalize(vec2(-0.70, 0.8)), xz) * 6.28318 / 3.3 - t * 1.7);
}
void main() {
  vec3 p = position;
  vec4 wp0 = modelMatrix * vec4(p, 1.0);
  p.z += altura(wp0.xz, uTime);
  vSlope = gerstner(wp0.xz, uTime);
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWorld = wp.xyz;
  vec4 mv = viewMatrix * wp;
  vViewZ = mv.z;
  vClip = projectionMatrix * mv;
  gl_Position = vClip;
}
`;

const FRAG = /* glsl */`
uniform float uTime;
uniform sampler2D tNormalA;
uniform sampler2D tNormalB;
uniform sampler2D tDepth;
uniform float uDepthOn;
uniform float uNear;
uniform float uFar;
uniform vec3 uCorRasa;
uniform vec3 uCorFunda;
uniform vec3 uCorEspuma;
uniform vec3 uCeuCor;
uniform vec3 uSolDir;
uniform vec3 uSolCor;
uniform vec3 uFogCor;
uniform float uFogD;
uniform vec3 uMarLongeCor;
uniform float uProfEscala;
uniform float uEspumaFaixa;
uniform float uEspumaMiolo;
uniform float uProfFallback;
uniform vec2 uFluxo;
uniform sampler2D tMapa;
uniform vec2 uMapaEscala;
uniform float uMapaForca;
varying vec3 vWorld;
varying float vViewZ;
varying vec4 vClip;
varying vec2 vSlope;

float sceneViewZ(vec2 suv) {
  // tDepth é a CÓPIA linearizada do DepthPass (viewZ/-far), não o depth cru
  return -texture2D(tDepth, suv).r * uFar;
}

void main() {
  // 2 normal maps em scroll cruzado (escalas 9 m e 3,2 m: tira o "padrão único")
  // + uFluxo: correnteza do canal (0 no oceano)
  vec2 uvA = vWorld.xz / 9.0 + uTime * (vec2(0.020, 0.014) + uFluxo);
  vec2 uvB = vWorld.xz / 3.2 + uTime * (vec2(-0.031, 0.022) + uFluxo * 0.6);
  vec3 nA = texture2D(tNormalA, uvA).xyz * 2.0 - 1.0;
  vec3 nB = texture2D(tNormalB, uvB).xyz * 2.0 - 1.0;
  vec2 pert = nA.xy * 0.90 + nB.xy * 0.60 + vSlope * 0.8;
  vec3 n = normalize(vec3(pert.x, 1.0, -pert.y));

  vec3 viewDir = normalize(cameraPosition - vWorld);

  // depth-fade: coluna d'água sob o fragmento (0 no raso/linha d'água).
  // Sem composer (uDepthOn=0) cai no uProfFallback: oceano 1,0 (fundo), córrego
  // ~0,3 (lâmina rasa — o jogador está DENTRO e a leitura opaca de oceano não vale)
  float coluna = 40.0;
  if (uDepthOn > 0.5) {
    vec2 suv = vClip.xy / vClip.w * 0.5 + 0.5;
    float sz = sceneViewZ(suv);
    if (sz > vViewZ) discard;   // cena mais perto que a água: oclusão manual
    coluna = vViewZ - sz;       // vViewZ e sz negativos: coluna >= 0
  }
  float prof = uDepthOn > 0.5 ? clamp(coluna / uProfEscala, 0.0, 1.0) : uProfFallback;

  vec3 cor = mix(uCorRasa, uCorFunda, prof);
  float alfa = mix(0.62, 0.94, prof);

  // albedo do mapa (córrego: água poluída da frente B) — média ~1: mancha, não tingi
  cor *= mix(vec3(1.0), texture2D(tMapa, vWorld.xz / uMapaEscala).rgb * 2.0, uMapaForca);

  /* espuma de contato: miolo sólido colado na linha d'água + manchas na faixa,
     quebradas pela textura B (padrao.r tem média 0,5 — o corte 0,60-0,82 segura
     só o terço de cima, senão a faixa vira lençol branco). Faixas em uniform:
     oceano 2,4/0,45 m; canal do córrego 0,30/0,06 m (a parede está a 3 m). */
  float foam = 0.0;
  if (uDepthOn > 0.5) {
    float faixa = smoothstep(uEspumaFaixa, uEspumaFaixa * 0.04, coluna);
    float padrao = texture2D(tNormalB, vWorld.xz / 3.4 + uTime * vec2(0.05, -0.037)).r;
    float miolo = smoothstep(uEspumaMiolo, uEspumaMiolo * 0.22, coluna);
    float manchas = faixa * smoothstep(0.60, 0.82, padrao);
    foam = clamp(max(miolo, manchas * 0.85), 0.0, 1.0);
    cor = mix(cor, uCorEspuma, foam * 0.9);
    alfa = max(alfa, foam);
  }

  // fresnel -> reflexo do horizonte do LOOK (o mar encontra o céu, RC1)
  float fres = pow(1.0 - max(dot(viewDir, n), 0.0), 3.0);
  cor = mix(cor, uCeuCor, fres * 0.22);

  // difusa suave + especular de sol (HDR: o composite ACES tonemapa; o glint alimenta o bloom)
  float ndl = max(dot(n, uSolDir), 0.0);
  cor *= 0.78 + 0.30 * ndl;
  vec3 h = normalize(viewDir + uSolDir);
  cor += uSolCor * pow(max(dot(n, h), 0.0), 220.0) * 2.2;

  /* neblina reduzida (0,55×: plano d'água inteiro lavava cinza cedo demais) e,
     mais longe, convergência para a cor do mar ASSADO no panorama — a câmera
     tem far=400 e sem esta convergência a borda do plano recortava uma tarja
     escura no encontro com o céu (medido na captura do RC2). */
  float dist = length(cameraPosition - vWorld);
  float fogF = 1.0 - exp(-uFogD * 0.55 * uFogD * 0.55 * dist * dist);
  cor = mix(cor, uFogCor, clamp(fogF, 0.0, 1.0));
  cor = mix(cor, uMarLongeCor, smoothstep(140.0, 370.0, dist));

  gl_FragColor = vec4(cor, alfa);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createWater(scene, T, mapId, {
  nivel = -0.9, centro = [0, -276], tamanho = [1000, 480], segmentos = 96,
  raso = 0x45b8bd,     // turquesa medida dos prints do dono, saturada p/ ler a 20 m (proc. no mansao-ocean-check)
  fundo = 0x17505f,    // médio medido #419493 escurecido: o fundo é mais escuro que qualquer raso
  marLonge = 0x5d7a99, // mar assado no sky_joa.webp, mediana y=450-470/887 (look-horizonte.py, mesmo sampler)
  profEscala = 7.0,    // coluna que fecha a tinta no fundo; córrego: 0,35 (lâmina de 0,14 m)
  espumaFaixa = 2.4, espumaMiolo = 0.45,
  profFallback = 1.0,  // leitura sem composer: oceano fundo; córrego ~0,3 (rasa)
  fluxo = [0, 0],      // correnteza (córrego: [0, ~0,06] no eixo do canal)
  ampEscala = 1.0,     // amplitude das ondas de vértice; córrego: 0,08
  mapa = null, mapaEscala = [9, 9], mapaForca = 0,   // albedo do mapa (água poluída)
  parent = null,       // default scene; córrego passa root (o contrato B lê world.root)
} = {}) {
  const L = LOOK[mapId] || {};
  const sol = (L.sol && L.sol.pos) || [20, 35, 15];
  const sl = Math.hypot(...sol);
  const load = (url) => {
    if (typeof document === 'undefined') return null;   // harness node: nunca renderiza
    const t = new THREE.TextureLoader().load(url);
    t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;   // emenda some por construção
    return t;
  };
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, depthTest: true,   // composer troca p/ false (feedback loop)
    uniforms: {
      uTime: { value: 0 },
      uAmp: { value: ampEscala },
      tNormalA: { value: load('/img/textures/water_normal_a.webp') },
      tNormalB: { value: load('/img/textures/water_normal_b.webp') },
      tDepth: { value: null },
      uDepthOn: { value: 0 },
      uNear: { value: 0.08 }, uFar: { value: 400 },
      uCorRasa: { value: new THREE.Color(raso) },
      uCorFunda: { value: new THREE.Color(fundo) },
      uCorEspuma: { value: new THREE.Color(0xe8f2f0) },
      uCeuCor: { value: new THREE.Color(L.horizonte ?? 0xb1aca5) },
      uSolDir: { value: new THREE.Vector3(sol[0] / sl, sol[1] / sl, sol[2] / sl) },
      uSolCor: { value: new THREE.Color((L.sol && L.sol.cor) ?? 0xffefd8) },
      uFogCor: { value: scene.fog && scene.fog.color ? scene.fog.color.clone() : new THREE.Color(0xb1aca5) },
      uFogD: { value: scene.fog && scene.fog.isFogExp2 ? scene.fog.density : 0.0 },
      uMarLongeCor: { value: new THREE.Color(marLonge) },
      uProfEscala: { value: profEscala },
      uEspumaFaixa: { value: espumaFaixa },
      uEspumaMiolo: { value: espumaMiolo },
      uProfFallback: { value: profFallback },
      uFluxo: { value: new THREE.Vector2(fluxo[0], fluxo[1]) },
      tMapa: { value: mapa },
      uMapaEscala: { value: new THREE.Vector2(mapaEscala[0], mapaEscala[1]) },
      uMapaForca: { value: mapaForca },
    },
  });
  if (mapa) mat.map = mapa;   // o shader amostra de verdade (tMapa): a contagem de superfície texturizada mede uso, não declaração
  const geo = new THREE.PlaneGeometry(tamanho[0], tamanho[1], segmentos, Math.round(segmentos * tamanho[1] / tamanho[0]));
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;   // invariante do shader: z local = y do mundo
  mesh.position.set(centro[0], nivel, centro[1]);
  mesh.userData.aguaViva = true;    // as réguas da família OC/CW procuram ESTE mesh vivo
  (parent || scene).add(mesh);

  /* Sem "plano longínquo": a câmera do jogo tem far=400 e um segundo plano a
     500 m+ seria recortado inteiro — a convergência p/ uMarLongeCor no shader é
     que costura a borda do plano com o mar assado no panorama. */

  const agua = {
    mesh, material: mat,
    update(dt) { mat.uniforms.uTime.value += dt; },
  };
  const ws = scene.userData.waters || (scene.userData.waters = []);
  ws.push(agua);
  scene.userData.water = ws[0];     // compat: quem lia a água única segue lendo a primeira
  return agua;
}
