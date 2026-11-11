// Kit visual HD do Lajes, atrás de ?hd=1 (demo de gráficos, desligado por padrão). Troca texturas por nome de material
// (lajes_houses.js dá nome a todos), projeta em metros de mundo, poça, vidro, luz e céu. Tudo volta em desliga().
import * as THREE from 'three';
import { cenografiaLajes, ceuLajes, ruidoTex, RUIDO_PARS } from './hd_cenografia_lajes.js';
import { pbrTex, materiaisDe } from './map_sertao_hd.js';
import { atlasJanelas, atlasPortas, pichacoes } from './hd_detalhes_lajes.js';

// Conjuntos CC0 em public/img/textures/hd_lajes (FONTE.md). `media` = cor média linear do mapa de cor: o shader
// divide por ela, então `cor` é o albedo final. `cor_rug` leva a rugosidade no alfa (uma leitura a menos).
const CONJ = {
  reboco: { media: [.523, .471, .406], metros: 1.7, cor: 'cor_rug' },
  piso: { media: [.142, .126, .095], metros: 1.9, cor: 'cor_rug' },
  forma: { media: [.147, .129, .105], metros: 1.8, cor: 'color' },
  chapa: { media: [.161, .159, .152], cor: 'color' },
};
const tex = (conj, mapa) => pbrTex(`hd_lajes/${conj}_${mapa}`, mapa !== 'normal');
// Paleta do dono: reboco e cimento cinza de verdade (o sol é quente, então o albedo puxa para o frio) e tijolo.
// O tijolo NÃO muda de escala nem de UV: medido 99 px por fiada em 1024 px com tile de 2 m = 19,3 cm.
const REGRAS = {
  cream: { reboco: true, cor: 0xd6d7d6, relevo: 2.4, miudo: .22 },
  ochre: { reboco: true, cor: 0xc4c5c2, relevo: 2.4 },
  rose: { reboco: true, cor: 0xb7bfc4, relevo: 2.4 },
  sage: { reboco: true, cor: 0xbdc2ba, relevo: 2.4 },
  adobe: { reboco: true, cor: 0xb9bab8, relevo: 2.4 },
  concrete: { concreto: [2.3, .69, 99], cor: 0xa9aaa9, relevo: 1.9 },
  brick: { tijolo: true, cor: 0xd8c4bc, relevo: 1.6, rugosidade: .9 },
  ground: { concreto: [2.0, .665, .3], cor: 0xbdbdba, relevo: 1.4 },
  paving: { concreto: [2.0, .665, .3], cor: 0xc2c2c1, relevo: 1.4 },
  zinc: { chapa: true, cor: 0x8e8d88, relevo: .5, metal: .3, rugosidade: .72 },
  recess: { cor: 0x10181c, rugosidade: .3, janela: true },
  tank: { rugosidade: .42 },
};
const TINTAS_PORTA = [0xffffff, 0xd9e8dc, 0xe9e2cf, 0xd2deea, 0xc4d2c0, 0xeadcdc];
const v3 = (a) => `vec3(${a.map((n) => n.toFixed(4)).join(', ')})`;
const LUMA = 'vec3(0.3, 0.59, 0.11)';
// Relevo por altura (em metros) sem textura extra: inclinação pela derivada de tela.
const BUMP = `vec3 hdBump(vec3 n, vec3 p, float h){ vec2 d = vec2(dFdx(h), dFdy(h)); vec3 sx = dFdx(p), sy = dFdy(p), r1 = cross(sy, n), r2 = cross(n, sx); float det = dot(sx, r1);
    return abs(det) < 1e-12 ? n : normalize(abs(det) * n - sign(det) * (d.x * r1 + d.y * r2)); }`;

// Faixa do corpo (0,6 a 1,9 m acima do piso do andar; a laje andável fica a 3,1 m): relevo e grão fino (< 10 cm)
// entram inteiros; só a mancha de albedo de 15 cm a 1 m fica contida. Fora das quatro lajes a altura conta do chão.
const PARS = `varying vec3 vHdPos;
  ${RUIDO_PARS}
  vec3 hdUmido(vec3 c, float k){ return mix(c, dot(c, ${LUMA}) * vec3(0.54, 0.57, 0.47), k); }
  vec3 hdBarro(vec3 c, float k){ return mix(c, dot(c, ${LUMA}) * vec3(0.58, 0.56, 0.52), k); }
  ${BUMP}
  float hdAndar(vec3 p){ return p.y - 3.1 * step(2.95, p.y) * step(5.0, abs(p.x)) * step(abs(p.x), 13.0) * step(abs(p.z), 20.2); }
  float hdFaixaCorpo(float y){ return smoothstep(0.42, 0.58, y) * (1.0 - smoothstep(1.92, 2.12, y)); }
  float hdTrinca(vec2 q, float w){ float c = floor(q.x / 1.7), fx = q.x - (c + 0.5) * 1.7, l = fwidth(q.x);
    return (1.0 - smoothstep(0.003, 0.005 + l * 1.2, abs(fx - (w - 0.5) * 1.2))) * step(0.5, hdH(vec2(c, 3.0))) * smoothstep(0.03, 0.008, l); }
  vec3 hdTijolo(vec2 q, float n){ vec2 b = vec2(q.x / 0.29 + 0.5 * floor(q.y / 0.193), q.y / 0.193), f = abs(fract(b) - 0.5);
    float px = fwidth(q.y), ja = smoothstep(0.07, 0.02, px);
    float j = (1.0 - smoothstep(0.008, 0.010 + px, min((0.5 - f.x) * 0.29, (0.5 - f.y) * 0.193))) * ja;
    vec3 c = vec3(0.22, 0.066, 0.056) * (1.0 + 0.5 * (hdH(floor(b)) - 0.5) * ja) * (1.0 - 0.10 * ja * step(0.5, fract(b.y * 5.0))) * (0.84 + 0.32 * n);
    return mix(c, vec3(0.36, 0.36, 0.35) * (0.8 + 0.4 * n), j); }`;
// Cimentado: placa com tom próprio, junta escura antialiasada, remendo, mancha e poça de borda irregular com halo
// molhado. `hdCob` = altura da cobertura sobre cada ponto: poça só a céu aberto, sujeira de contato no pé da parede.
const PISO_PARS = `uniform sampler2D hdCob; uniform samplerCube hdCuboB; uniform samplerCube hdCuboA; uniform vec3 hdPisoP;
  vec3 hdCimentado(vec3 c, vec2 p, float altura, out float poca, out float molhado){
    vec4 a = texture2D(hdRuido, p * 0.071), m = texture2D(hdRuido, p * 0.53 + 0.19);
    vec2 g = p / hdPisoP.x + vec2(0.0, 0.37), id = floor(g), f = fract(g); float px = max(fwidth(p.x), fwidth(p.y));
    float dj = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)) * hdPisoP.x;
    float junta = (1.0 - smoothstep(0.014, 0.022 + px * 1.5, dj)) * 0.03 / (0.03 + px * 0.6);
    float remendo = step(0.84, hdH(id + 31.0)) * smoothstep(0.50, 0.53, a.g);
    float mancha = smoothstep(0.56, 0.74, a.a * 0.6 + m.r * 0.4);
    float dh = texture2D(hdCob, vec2(p.x / 40.0 + 0.5, 0.5 - p.y / 66.0), 1.6).r - altura, contato = smoothstep(0.5, 2.0, dh) * step(altura, 900.0);
    float aberto = (1.0 - smoothstep(0.3, 0.9, dh)) * step(altura, hdPisoP.z);
    float fp = a.r * 0.72 + m.g * 0.22 + m.a * 0.06;
    fp += (m.b - 0.5) * 0.012; poca = smoothstep(hdPisoP.y, hdPisoP.y + 0.03, fp) * aberto; molhado = smoothstep(hdPisoP.y - 0.07, hdPisoP.y + 0.01, fp) * aberto;
    c *= mix(0.84, 1.10, hdH(id)) * mix(0.76, 1.16, a.g) * mix(0.84, 1.12, m.r) * (0.92 + 0.16 * m.b) * (1.0 - 0.45 * hdTrinca(p, a.a)) * (1.0 - 0.45 * hdTrinca(p.yx + 5.3, a.g));
    c = mix(c, c * vec3(1.16, 1.15, 1.12), remendo * 0.8);
    c = hdBarro(c, 0.5 * mancha) * (1.0 - 0.22 * mancha);
    c *= 1.0 - 0.72 * junta;
    c = hdUmido(c, 0.4 * contato) * (1.0 - 0.16 * contato);
    return c * mix(1.0, 0.85, molhado) * mix(1.0, 0.30, poca); }`;
// A água reflete o cubo capturado da própria cena (parede e céu de verdade), por emissão com Fresnel.
const CUBO = (dir) => `(vHdPos.y > 2.9 ? textureCube(hdCuboA, ${dir}).rgb : textureCube(hdCuboB, ${dir}).rgb)`;
const POCA = {
  normal: '\nnormal = normalize(mix(normal, nonPerturbedNormal, max(hdPoca, hdMolhado * 0.5)));',
  emissao: `
    if (hdPoca > 0.0) { vec3 hdV = normalize(vHdPos - cameraPosition), hdR = reflect(hdV, vec3(0.0, 1.0, 0.0));
      hdR.xz += (texture2D(hdRuido, vHdPos.xz * 0.9).rg - 0.5) * 0.03;
      vec3 hdRf = min(${CUBO('hdR')}, vec3(1.1)); hdRf = mix(vec3(dot(hdRf, ${LUMA})), hdRf, 0.3);
      totalEmissiveRadiance += hdPoca * hdRf * (0.04 + 0.76 * pow(1.0 - max(-hdV.y, 0.0), 4.0)); }`,
};
const NORMAL = THREE.ShaderChunk.normal_fragment_maps.replace('mapN.xy *= normalScale;', 'mapN.xy *= normalScale * hdRel;');

// Posição de mundo no fragmento e, com `metros`, UV projetado no mundo (parede: horizontal x altura; piso: xz).
// O shader define hdRel (ganho do relevo) e hdRug (rugosidade lida do alfa) antes dos ganchos.
function comMundo(shader, U, metros = 0, extra = '') {
  Object.assign(shader.uniforms, U);
  shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHdPos;')
    .replace('#include <uv_vertex>', `#include <uv_vertex>
      { vec4 hdW = vec4(position, 1.0); vec3 hdNm = normal;
        #ifdef USE_INSTANCING
          hdW = instanceMatrix * hdW; hdNm = mat3(instanceMatrix) * hdNm;
        #endif
        hdW = modelMatrix * hdW; hdNm = abs(normalize(mat3(modelMatrix) * hdNm)); vHdPos = hdW.xyz;
        ${metros ? `vec2 hdUv = (hdNm.y > max(hdNm.x, hdNm.z) ? hdW.xz : (hdNm.x > hdNm.z ? hdW.zy : hdW.xy)) / ${metros.toFixed(3)};
        #ifdef USE_MAP
          vMapUv = hdUv;
        #endif
        #ifdef USE_NORMALMAP
          vNormalMapUv = hdUv;
        #endif` : ''}
      }`);
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${PARS}\n${extra}`);
}
const ALTURA = '\nnormal = hdBump(normal, -vViewPosition, hdAlt);';
const ganchos = (shader) => { shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * hdRug;').replace('#include <normal_fragment_maps>', NORMAL + ALTURA); };

// Idade comum a reboco, tijolo e concreto de parede: escorrido acima de 2 m, trinca, descascado (pé e alto),
// sujeira e musgo no pé. Espera hdY, hdQ, hdCorpo, hdFora, hdA (ruído macro) e hdM (ruído médio).
const idade = (o, sub) => `
  ${o.umidade ? `{ float hdEsc = smoothstep(0.50, 0.78, texture2D(hdRuido, vec2(hdQ.x * 0.61, hdQ.y * 0.045) + 0.71).r * 0.8 + hdM.a * 0.2) * smoothstep(1.95, 2.5, hdY) * hdFora;
    diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.7 * hdEsc) * (1.0 - 0.30 * hdEsc); }` : ''}
  { float hdTr = hdTrinca(hdQ, hdA.a); diffuseColor.rgb *= 1.0 - 0.42 * mix(1.0, 0.6, hdCorpo) * hdTr; hdAlt -= 0.003 * hdTr; }
  float hdPele = 0.0;
  ${o.descasca && sub ? `{ float hdFb = hdA.g * 0.62 + hdM.g * 0.28 + hdM.a * 0.10, hdW = max(0.006, fwidth(hdFb));
    float hdLim = mix(mix(${sub.pe.toFixed(3)}, 1.5, smoothstep(0.08, 0.36, hdY)), ${sub.alto.toFixed(3)}, smoothstep(2.1, 2.75, hdY)) + hdMiF;
    hdPele = smoothstep(hdLim, hdLim + hdW, hdFb);
    diffuseColor.rgb *= 1.0 + 0.2 * smoothstep(hdLim - 0.03, hdLim, hdFb) * (1.0 - hdPele);
    diffuseColor.rgb = mix(diffuseColor.rgb, ${sub.glsl} * (1.0 - 0.42 * (1.0 - smoothstep(hdLim, hdLim + 0.035, hdFb))), hdPele); hdRel *= 1.0 - 0.5 * hdPele; hdAlt -= 0.012 * hdPele; }` : ''}
  ${o.umidade ? `{ float hdSuj = smoothstep(0.45, 0.04, hdY) * (0.45 + 0.55 * hdA.r) * (1.0 - 0.35 * hdPele);
    diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.8 * hdSuj) * (1.0 - 0.40 * hdSuj);
    float hdMusgo = smoothstep(0.30, 0.03, hdY) * smoothstep(0.50, 0.70, hdM.a);
    diffuseColor.rgb = mix(diffuseColor.rgb, dot(diffuseColor.rgb, ${LUMA}) * vec3(0.50, 0.66, 0.30), 0.55 * hdMusgo); }` : ''}`;
const CABECA = `float hdRel = 1.0, hdRug = 1.0, hdMiF = 0.0, hdAlt = 0.0;`;
const LOCAL = `float hdY = hdAndar(vHdPos); vec2 hdQ = vec2(vHdPos.x + vHdPos.z, hdY);
  vec4 hdA = texture2D(hdRuido, hdQ * 0.137), hdM = texture2D(hdRuido, hdQ * 0.83 + 0.37);`;
// O que aparece onde o reboco caiu: tijolo baiano sob a tinta; chapisco de cimento sobre o tijolo aparente.
const SUBS = { tijolo: { pe: .65, alto: .72, glsl: 'hdTijolo(hdQ + 3.7, hdM.r)' }, chapisco: { pe: .64, alto: .72, glsl: '(vec3(0.40, 0.38, 0.35) * (0.72 + 0.56 * hdM.r))' } };

// Reboco: fora da faixa do corpo, mapa de cor + duas escalas de mancha; dentro, cor lisa com grão (< 3 cm).
// `hdMi` marca caixa miúda do mapa (maçaneta, mercadoria): fica lisa e escura em vez de virar reboco.
function rebocoHD(m, r, U, o) {
  m.onBeforeCompile = (shader) => { comMundo(shader, U, CONJ.reboco.metros, 'varying float vHdMi; uniform float hdMiCor;'); shader.uniforms.hdMiCor = { value: r.miudo ?? .8 };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute float hdMi; varying float vHdMi;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvHdMi = hdMi;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `${CABECA} { ${LOCAL}
      float hdCorpo = max(hdFaixaCorpo(hdY), vHdMi), hdFora = 1.0 - hdCorpo; vec4 hdT = texture2D(map, vMapUv);
      vec3 hdB = texture2D(map, vMapUv, 4.5).rgb; float hdFino = pow(clamp(dot(hdT.rgb, ${LUMA}) / max(dot(hdB, ${LUMA}), 0.02), 0.4, 1.7), mix(1.0, 1.4, hdCorpo));
      hdRug = hdT.a; hdMiF = vHdMi; hdAlt = 0.0025 * hdM.b + 0.004 * hdFino;
      diffuseColor.rgb *= hdFino * (0.90 + 0.20 * hdM.b) * mix(mix(vec3(1.0), hdB / ${v3(CONJ.reboco.media)}, 0.7) * mix(0.80, 1.14, hdA.r) * mix(0.92, 1.08, hdM.r), vec3(0.97 + 0.06 * hdM.r), max(hdCorpo, vHdMi)) * mix(1.0, hdMiCor, vHdMi);
      ${idade(o, SUBS.tijolo)} }`);
    ganchos(shader); };
  m.customProgramCacheKey = () => `lajes-hd-reboco40-${o.umidade}-${o.descasca}`;
}
// Tijolo aparente: mesma textura e UV do mapa. Junta afundada (lida da saturação do texel), tom por fiada e por
// trecho de tijolo, chapisco no pé e no alto. Na faixa do corpo sobra só a junta.
function tijoloHD(m, U, o) {
  m.onBeforeCompile = (shader) => { comMundo(shader, U);
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `${CABECA} { ${LOCAL}
      float hdCorpo = hdFaixaCorpo(hdY), hdFora = 1.0 - hdCorpo; vec4 hdT = texture2D(map, vMapUv);
      float hdMx = max(hdT.r, max(hdT.g, hdT.b)), hdJ = 1.0 - smoothstep(0.16, 0.38, (hdMx - min(hdT.r, min(hdT.g, hdT.b))) / max(hdMx, 0.02));
      vec2 hdLu = vec2(vMapUv.x * 0.31, vMapUv.y * 1.78);
      vec2 hdLf = vec2(hdLu.x, (floor(fract(vMapUv.y) * 10.29) + 0.5) * 0.173 + floor(vMapUv.y) * 0.37);
      #ifdef texture2DGradEXT
        float hdTom = texture2DGradEXT(hdRuido, hdLf, dFdx(hdLu), dFdy(hdLu)).g;
      #else
        float hdTom = texture2D(hdRuido, hdLf).g;
      #endif
      vec4 hdMic = texture2D(hdRuido, hdQ * 5.3 + 0.11); float hdPx = fwidth(vMapUv.y) * 2.0, hdPerto = smoothstep(0.03, 0.008, hdPx);
      float hdFi = fract(vMapUv.y) * 10.29, hdRan = (0.5 + 0.5 * sin(hdFi * 43.98)) * smoothstep(0.012, 0.003, hdPx) * (1.0 - hdJ);
      float hdResp = smoothstep(0.70, 0.75, hdMic.g * 0.5 + hdM.a * 0.3 + hdA.g * 0.2) * hdPerto;
      vec3 hdC = hdT.rgb * (1.0 + (hdTom - 0.5) * 0.9 * mix(1.0, 0.6, hdCorpo) * (1.0 - hdJ)) * mix(mix(0.80, 1.16, hdA.r), 0.95, hdCorpo);
      hdC = mix(vec3(dot(hdC, ${LUMA})), hdC, mix(0.74, 0.62, hdCorpo)) * mix(1.10, 0.92, hdCorpo) * (0.84 + 0.32 * hdMic.r) * (0.90 + 0.20 * hdMic.b) * (1.0 - 0.16 * hdRan);
      vec3 hdMassa = vec3(0.47, 0.47, 0.455) * (0.74 + 0.52 * hdMic.b) * (0.86 + 0.28 * hdM.r);
      diffuseColor.rgb *= mix(mix(hdC, hdMassa, 0.86 * hdJ), hdMassa * 1.08, 0.9 * hdResp);
      hdAlt = hdPerto * (0.007 * (1.0 - hdJ) + 0.0016 * hdRan + 0.004 * hdResp + 0.0012 * hdMic.b);
      hdRug = mix(0.9, 1.0, hdJ); hdRel = 1.6;
      ${idade(o, SUBS.chapisco)} }`);
    ganchos(shader); };
  m.customProgramCacheKey = () => `lajes-hd-tijolo40-${o.umidade}-${o.descasca}`;
}
// Concreto serve piso e parede (orientação pela derivada da posição, constante por triângulo); chão e concreto
// dividem o programa. hdPisoP = (lado da placa, limiar da poça, altura máxima com poça).
function concretoHD(m, r, U, o) {
  const k = (CONJ.piso.metros / CONJ.forma.metros).toFixed(4);
  m.onBeforeCompile = (shader) => { comMundo(shader, U, CONJ.piso.metros, `${PISO_PARS}\nuniform sampler2D hdForma; uniform sampler2D hdFormaN;`);
    Object.assign(shader.uniforms, { hdForma: { value: tex('forma', 'color') }, hdFormaN: { value: tex('forma', 'normal') }, hdPisoP: { value: new THREE.Vector3(...r.concreto) } });
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `${CABECA} float hdPoca = 0.0, hdMolhado = 0.0;
      float hdNy = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))).y, hdPiso = step(0.7, abs(hdNy));
      if (hdPiso > 0.5) { vec4 hdT = texture2D(map, vMapUv); hdRug = hdT.a;
        diffuseColor.rgb = hdCimentado(diffuseColor.rgb * hdT.rgb / ${v3(CONJ.piso.media)}, vHdPos.xz, hdNy > 0.0 ? vHdPos.y : 999.0, hdPoca, hdMolhado); }
      else { ${LOCAL}
        float hdCorpo = hdFaixaCorpo(hdY), hdFora = 1.0 - hdCorpo; hdRug = 0.92;
        vec3 hdTf = texture2D(hdForma, vMapUv * ${k}).rgb, hdB = texture2D(hdForma, vMapUv * ${k}, 4.5).rgb; float hdFino = pow(clamp(dot(hdTf, ${LUMA}) / max(dot(hdB, ${LUMA}), 0.02), 0.4, 1.7), mix(1.0, 1.4, hdCorpo));
        diffuseColor.rgb *= hdFino * (0.90 + 0.20 * hdM.b) * mix(hdB / ${v3(CONJ.forma.media)} * mix(0.76, 1.14, hdA.r) * mix(0.90, 1.08, hdM.r), vec3(0.97 + 0.06 * hdM.r), hdCorpo);
        ${idade(o, null)} }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix(mix(roughness * hdRug, roughness * hdRug * 0.6, hdMolhado), 0.05, hdPoca);')
      .replace('#include <normal_fragment_maps>', NORMAL.replace(/vec3 mapN = texture2D\( normalMap, vNormalMapUv \)\.xyz \* 2\.0 - 1\.0;/,
        `vec3 mapN; if (hdPiso > 0.5) mapN = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0; else mapN = texture2D(hdFormaN, vNormalMapUv * ${k}).xyz * 2.0 - 1.0;`) + POCA.normal)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>${POCA.emissao}`); };
  m.customProgramCacheKey = () => `lajes-hd-concreto40-${o.umidade}`;
}
// Chapa: a onda do mapa corre em v; as caixas do mapa têm u ao longo da fachada, então troca os eixos (caimento).
function chapaHD(m) {
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
      #ifdef USE_MAP
        vMapUv = uv.yx * 1.1;
      #endif
      #ifdef USE_NORMALMAP
        vNormalMapUv = uv.yx * 1.1;
      #endif`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>\ndiffuseColor.rgb /= ${v3(CONJ.chapa.media)};`); };
  m.customProgramCacheKey = () => 'lajes-hd-chapa30';
}

// Porta: cinco tipos num atlas (cor + altura no alfa); o tipo e a tinta vão por uniforme, o programa é um só.
function portaHD(m, tipo, tinta) {
  m.onBeforeCompile = (shader) => { shader.uniforms.hdPorta = { value: new THREE.Vector4(tinta.r, tinta.g, tinta.b, tipo) };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform vec4 hdPorta;').replace('#include <uv_vertex>', `#include <uv_vertex>
      #ifdef USE_MAP
        vMapUv = vec2((hdPorta.w + clamp(uv.x / 0.9 + 0.5, 0.012, 0.988)) / 5.0, 0.5 - uv.y / 2.05);
      #endif`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\nuniform vec4 hdPorta;\n${BUMP}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float hdSol = step(0.5, diffuseColor.a), hdAlt = hdSol > 0.5 ? (diffuseColor.a - 0.55) * 0.035 : diffuseColor.a * 0.005; diffuseColor.a = 1.0; diffuseColor.rgb *= hdPorta.rgb;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.22, roughnessFactor, hdSol);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = hdBump(normal, -vViewPosition, hdAlt);'); };
  m.customProgramCacheKey = () => 'lajes-hd-porta40';
}

// Janela: o painel escuro do mapa fica 4 cm À FRENTE da moldura, então o vão de 16 cm é pintado por paralaxe
// (ombreira, verga em sombra, peitoril claro) e o fundo sai do atlas: hdJs.z = célula (+0,5 = espelhada).
const RECUO = .16;
function janelaHD(m, U) {
  m.onBeforeCompile = (shader) => { comMundo(shader, U, 0, 'varying vec3 vHdJc; varying vec3 vHdJs; uniform samplerCube hdCuboB; uniform samplerCube hdCuboA; uniform sampler2D hdJanelas;');
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 hdJc; attribute vec3 hdJs; varying vec3 vHdJc; varying vec3 vHdJs;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHdJc = hdJc; vHdJs = hdJs;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float hdVid = 0.0, hdJan = 0.0, hdFres = 0.0, hdAlt = 0.0; vec3 hdRefl = vec3(0.0, 1.0, 0.0);
        vec3 hdGn = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))), hdV = normalize(vHdPos - cameraPosition);
        if (dot(hdGn, hdV) > 0.0) hdGn = -hdGn;
        vec3 hdTg = normalize(vec3(-hdGn.z, 0.0, hdGn.x) + 1e-5); float hdVn = max(-dot(hdV, hdGn), 0.15);
        vec2 hdQ = vec2(dot(vHdPos - vHdJc, hdTg), vHdPos.y - vHdJc.y) + vec2(dot(hdV, hdTg), hdV.y) * (${RECUO.toFixed(3)} / hdVn);
        vec2 hdS = max(vHdJs.xy, vec2(0.01)), hdU = hdQ / hdS * 0.5 + 0.5; float hdCel = floor(vHdJs.z);
        hdU.x = mix(hdU.x, 1.0 - hdU.x, step(0.25, fract(vHdJs.z)));
        vec4 hdTx = texture2D(hdJanelas, (vec2(mod(hdCel, 3.0), floor(hdCel / 3.0)) + clamp(vec2(hdU.x, 1.0 - hdU.y), 0.006, 0.994)) / 3.0);
        if (vHdJs.x > 0.0 && abs(hdGn.y) < 0.5) { hdJan = 1.0;
          vec2 hdA = abs(hdQ) - hdS; float hdId = hdH(floor(vHdJc.xz * 2.0) + floor(vHdJc.y * 2.0)), hdGr = 0.9 + 0.2 * hdH(floor(vHdPos.xz * 40.0) + floor(vHdPos.y * 40.0));
          if (max(hdA.x, hdA.y) > 0.0) {
            float hdLado = hdA.x > hdA.y ? 0.50 : (hdQ.y > 0.0 ? 0.14 : 1.0 - 0.45 * hdH(floor(hdQ.xx * 9.0)));
            float hdQuebra = step(0.74, hdH(floor(vec2(hdQ.x + hdQ.y, hdQ.y - hdQ.x) * 6.0) + hdId * 31.0));
            diffuseColor.rgb = mix(vec3(0.47, 0.47, 0.46), vec3(0.24, 0.085, 0.065), hdQuebra) * hdLado * hdGr;
          } else { vec2 hdE = hdS - abs(hdQ); float hdSol = step(0.5, hdTx.a);
            hdAlt = hdSol > 0.5 ? (hdTx.a - 0.55) * 0.05 : hdTx.a * 0.008;
            diffuseColor.rgb = hdTx.rgb * (0.80 + 0.36 * hdId) * (1.0 - 0.6 * smoothstep(0.24, 0.05, hdE.y) * step(0.0, hdQ.y));
            hdVid = 1.0 - hdSol; hdRefl = reflect(hdV, hdGn); hdFres = (0.07 + 0.93 * pow(1.0 - hdVn, 4.0)) * (hdTx.a < 0.03 ? 1.0 : 0.4); } }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(mix(roughnessFactor, 0.7, hdJan), 0.10, hdVid);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = hdBump(normal, -vViewPosition, hdAlt);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (hdVid > 0.0) totalEmissiveRadiance += hdVid * hdFres * 0.6 * min(${CUBO('hdRefl')}, vec3(4.0));`); };
  m.customProgramCacheKey = () => 'lajes-hd-janela40';
}
// Cada caixa fundida tem 24 vértices. `visita(i, min, max, d)` recebe a caixa de cada uma em coordenadas de mundo.
function porCaixa(scene, mats, visita) {
  const p = new THREE.Vector3(), mn = [0, 0, 0], mx = [0, 0, 0], d = [0, 0, 0];
  scene.traverse((o) => {
    if (!o.isMesh || !mats.has(o.material) || !/^lajes-(alvenaria|entorno)/.test(o.name)) return;
    const pos = o.geometry.attributes.position; if (!pos || pos.count % 24) return;
    o.updateWorldMatrix(true, false);
    const cada = (f) => { for (let i = 0; i < pos.count; i += 24) { mn.fill(1e9); mx.fill(-1e9);
      for (let k = i; k < i + 24; k++) { p.fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld); if (p.x < mn[0]) mn[0] = p.x; if (p.y < mn[1]) mn[1] = p.y; if (p.z < mn[2]) mn[2] = p.z; if (p.x > mx[0]) mx[0] = p.x; if (p.y > mx[1]) mx[1] = p.y; if (p.z > mx[2]) mx[2] = p.z; }
      d[0] = mx[0] - mn[0]; d[1] = mx[1] - mn[1]; d[2] = mx[2] - mn[2]; f(i, mn, mx, d); } };
    visita(o, pos.count, cada);
  });
}
// Painel fino, alto e largo = janela. Sorteia o tipo pelo hash da posição do vão, devolve a lista e marca os vértices.
const PESO_JANELA = [.19, .13, .12, .12, .10, .06, .06, .11, .11];
const h3 = (x, y, z) => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); };
function marcaJanelas(scene, mat) {
  const marcadas = [], janelas = [], todas = [];
  porCaixa(scene, new Set([mat]), (o, n, cada) => { if (o.geometry.attributes.hdJc) return;
    const c = new Float32Array(n * 3), s = new Float32Array(n * 3);
    cada((i, mn, mx, d) => { const fino = d[0] < d[2] ? 0 : 2, larg = d[2 - fino];
      if (d[fino] > .07 || d[1] < .8 || larg < .8 || larg > 2 || d[1] > 1.6) return;
      const cx = (mn[0] + mx[0]) / 2, cy = (mn[1] + mx[1]) / 2, cz = (mn[2] + mx[2]) / 2;
      let tipo = 0; for (let a = h3(cx, cy, cz), k = 0; k < 9; k++) { a -= PESO_JANELA[k]; if (a < 0) { tipo = k; break; } }
      const j = { x: cx, y: cy, z: cz, w: larg, h: d[1], eixo: fino, tipo, grade: tipo < 4 && h3(cz, cx, cy + 3) < .5 };
      for (let k = i; k < i + 24; k++) { c[k * 3] = cx; c[k * 3 + 1] = cy; c[k * 3 + 2] = cz; s[k * 3] = larg / 2; s[k * 3 + 1] = d[1] / 2; s[k * 3 + 2] = tipo + (h3(cy, cz, cx) < .5 ? .5 : 0); }
      todas.push(j); if (o.name === 'lajes-alvenaria') janelas.push(j); });
    o.geometry.setAttribute('hdJc', new THREE.BufferAttribute(c, 3)); o.geometry.setAttribute('hdJs', new THREE.BufferAttribute(s, 3)); marcadas.push(o.geometry); });
  return { janelas, todas, desfaz() { for (const g of marcadas) { g.deleteAttribute('hdJc'); g.deleteAttribute('hdJs'); } } };
}
// A grade e o montante de aço do mapa são iguais em todo vão: somem (caixa degenerada) onde o tipo sorteado não os usa.
function tiraGrades(scene, mats, janelas) {
  const guardadas = [];
  porCaixa(scene, mats, (o, n, cada) => { const pos = o.geometry.attributes.position; let copia = null;
    cada((i, mn, mx, d) => { if ([d[0], d[1], d[2]].filter((v) => v <= .07).length < 2) return;
      const cx = (mn[0] + mx[0]) / 2, cy = (mn[1] + mx[1]) / 2, cz = (mn[2] + mx[2]) / 2;
      const j = janelas.find((w) => !w.grade && Math.abs(cy - w.y) < w.h / 2 + .08 && (w.eixo === 0 ? Math.abs(cx - w.x) < .09 && Math.abs(cz - w.z) < w.w / 2 + .05 : Math.abs(cz - w.z) < .09 && Math.abs(cx - w.x) < w.w / 2 + .05));
      if (!j) return; copia ||= pos.array.slice();
      for (let k = i + 1; k < i + 24; k++) pos.setXYZ(k, pos.getX(i), pos.getY(i), pos.getZ(i)); });
    if (copia) { pos.needsUpdate = true; guardadas.push([pos, copia]); } });
  return () => { for (const [pos, copia] of guardadas) { pos.array.set(copia); pos.needsUpdate = true; } };
}
function marcaMiudos(scene, mats) {
  const marcadas = [];
  porCaixa(scene, mats, (o, n, cada) => { if (o.geometry.attributes.hdMi) return;
    const a = new Float32Array(n); let algum = false;
    cada((i, mn, mx, d) => { if (Math.max(d[0], d[1], d[2]) < .3) { a.fill(1, i, i + 24); algum = true; } });
    if (algum) { o.geometry.setAttribute('hdMi', new THREE.BufferAttribute(a, 1)); marcadas.push(o.geometry); } });
  return () => { for (const g of marcadas) g.deleteAttribute('hdMi'); };
}

// Dois cubos capturados da cena (beco e laje) para poça e vidro. A captura repete depois que as texturas chegam.
function reflexos(scene, renderer, U, vivo, doKit) {
  const feito = [];
  for (const [u, p] of [[U.hdCuboB, [0, .55, 13]], [U.hdCuboA, [-9, 4.3, -9]]]) {
    const rt = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
    const cam = new THREE.CubeCamera(.25, 300, rt); cam.position.set(p[0], p[1], p[2]); rt.texture.name = 'hd-cubo'; feito.push({ rt, cam, u });
  }
  // Só entra na captura o que já tem programa compilado (ou é do kit): ela não pode compilar o que o jogador não viu.
  const captura = () => { if (!vivo()) return; U.hdCuboB.value = U.hdCuboA.value = null;
    const ocultos = []; scene.traverse((o) => { if (o.visible && o.material && materiaisDe(o).some((m) => !doKit(m) && !renderer.properties.get(m).currentProgram)) { o.visible = false; ocultos.push(o); } });
    for (const { cam } of feito) { try { cam.update(renderer, scene); } catch (e) { /* fica sem reflexo */ } }
    for (const o of ocultos) o.visible = true;
    for (const { rt, u } of feito) u.value = rt.texture; };
  const tempos = [1200, 6000].map((ms) => setTimeout(captura, ms));
  return { captura, desliga() { tempos.forEach(clearTimeout); U.hdCuboB.value = U.hdCuboA.value = null; for (const { rt } of feito) rt.dispose(); } };
}
// Altura da cobertura: o mapa visto de cima em projeção ortográfica (40 x 66 m), y de mundo no canal R.
function cobertura(scene, renderer, U, vivo) {
  const rt = new THREE.WebGLRenderTarget(256, 512, { type: THREE.HalfFloatType, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true });
  const cam = new THREE.OrthographicCamera(-20, 20, 33, -33, .5, 90); cam.position.set(0, 70, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0);
  const mat = new THREE.ShaderMaterial({ side: THREE.DoubleSide, fog: false,
    vertexShader: 'varying float vY; void main(){ vec4 p = vec4(position, 1.0);\n#ifdef USE_INSTANCING\n p = instanceMatrix * p;\n#endif\n p = modelMatrix * p; vY = p.y; gl_Position = projectionMatrix * viewMatrix * p; }',
    fragmentShader: 'varying float vY; void main(){ gl_FragColor = vec4(vY, 0.0, 0.0, 1.0); }' });
  rt.texture.name = 'hd-cobertura';
  const fora = (o) => o.isSkinnedMesh || o.isPoints || o.isSprite || o.isLine || /SKY|PIPA|HELI|AMBIENT|DUMONT|MORRO|^hd-/i.test(o.name || '') || (o.isMesh && materiaisDe(o).some((m) => m.transparent || m.depthWrite === false));
  const captura = () => { if (!vivo()) return;
    const ocultos = [], alvo = renderer.getRenderTarget(), om = scene.overrideMaterial, fundo = scene.background, cor = renderer.getClearColor(new THREE.Color()), alfa = renderer.getClearAlpha(), sombra = renderer.shadowMap.autoUpdate;
    scene.traverse((o) => { if (o.visible && fora(o)) { o.visible = false; ocultos.push(o); } });
    U.hdCob.value = null; scene.overrideMaterial = mat; scene.background = null; renderer.shadowMap.autoUpdate = false;
    try { renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, cam); } catch (e) { /* fica sem cobertura */ }
    renderer.setRenderTarget(alvo); renderer.setClearColor(cor, alfa); renderer.shadowMap.autoUpdate = sombra; scene.overrideMaterial = om; scene.background = fundo;
    for (const o of ocultos) o.visible = true; U.hdCob.value = rt.texture; };
  captura(); const tempo = setTimeout(() => { captura(); mat.dispose(); }, 4000);
  return { captura, desliga() { clearTimeout(tempo); U.hdCob.value = null; rt.dispose(); mat.dispose(); } };
}

// Luz sem ambiente por imagem: o hemisfério já dá o gradiente frio de cima / quente de baixo e não custa leitura
// de textura em nenhum material da cena. `solDir` troca o azimute (bloom.js guarda a direção em scene.userData.__sf).
function luzLajes(scene, U, { hemi = .76, ceu = 0xd0dcea, chao = 0x989490, solGanho = 1.72, solDir = null, nuvens = true } = {}) {
  let sol = null, hemisferio = null;
  scene.traverse((o) => { if (o.isDirectionalLight && o.castShadow) sol = o; if (o.isHemisphereLight) hemisferio = o; });
  if (!sol || !hemisferio) return () => {};
  const antes = { hemi: hemisferio.intensity, ceu: hemisferio.color.getHex(), chao: hemisferio.groundColor.getHex(), sol: sol.intensity };
  const dir = sol.position.clone().sub(sol.target.position).normalize(), dirAntes = dir.clone(), dist = () => Math.max(20, sol.position.distanceTo(sol.target.position));
  const aponta = (d) => { sol.position.copy(sol.target.position).addScaledVector(d, dist()); const sf = scene.userData.__sf; if (sf && sf.dir) sf.dir.copy(d); };
  if (solDir) { dir.set(solDir[0], solDir[1], solDir[2]).normalize(); aponta(dir); }
  hemisferio.intensity = antes.hemi * hemi; hemisferio.color.setHex(ceu); hemisferio.groundColor.setHex(chao); sol.intensity = antes.sol * solGanho;
  const tiraCeu = ceuLajes(scene, dir, U, { nuvens });
  return () => { hemisferio.intensity = antes.hemi; hemisferio.color.setHex(antes.ceu); hemisferio.groundColor.setHex(antes.chao); sol.intensity = antes.sol; tiraCeu(); if (solDir) aponta(dirAntes); };
}

export function aplicaLajesHD(scene, renderer, opts = {}) {
  const porNome = new Map(), portas = []; let vivo = true;
  scene.traverse((o) => {
    if (!o.isMesh) return;
    if (o.userData.lajesDoor === true && !Array.isArray(o.material)) portas.push(o);
    for (const m of materiaisDe(o)) if (m.name && m.isMeshStandardMaterial) (porNome.get(m.name) || porNome.set(m.name, new Set()).get(m.name)).add(m);
  });
  const antes = [], criadas = [], aniso = [], ruido = ruidoTex();
  const U = { hdRuido: { value: ruido }, hdCob: { value: null }, hdCuboB: { value: null }, hdCuboA: { value: null }, hdJanelas: { value: null } };
  const o = { umidade: opts.umidade !== false, descasca: opts.descasca !== false };
  const doKit = (m) => !!REGRAS[m.name] || /^hd-/.test(m.name);
  const cubos = opts.reflexos === false || opts.texturas === false ? null : reflexos(scene, renderer, U, () => vivo, doKit);
  const cob = opts.texturas === false ? null : cobertura(scene, renderer, U, () => vivo);
  let janelas = { janelas: [], todas: [], desfaz() {} }, tiraMiudos = () => {}, voltaGrades = () => {};
  if (opts.texturas !== false) {
    for (const [nome, r] of Object.entries(REGRAS)) for (const m of porNome.get(nome) || []) {
      antes.push({ m, map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap, bumpMap: m.bumpMap, cor: m.color.getHex(), roughness: m.roughness,
        metalness: m.metalness, ns: m.normalScale.x, obc: m.onBeforeCompile, key: m.customProgramCacheKey });
      const conj = r.reboco ? 'reboco' : r.concreto ? 'piso' : r.chapa ? 'chapa' : null;
      if (conj) { m.map = tex(conj, CONJ[conj].cor); m.normalMap = tex(conj, 'normal'); m.roughnessMap = null; m.roughness = 1; }
      if (r.cor !== undefined) m.color.setHex(r.cor);
      if (r.relevo && m.normalMap) m.normalScale.set(r.relevo, r.relevo);
      if (r.rugosidade !== undefined) m.roughness = r.rugosidade;
      if (r.metal !== undefined) m.metalness = r.metal;
      if (r.tijolo) m.roughnessMap = null;
      if (r.reboco) rebocoHD(m, r, U, o);
      if (r.tijolo) tijoloHD(m, U, o);
      if (r.concreto) concretoHD(m, r, U, o);
      if (r.chapa) chapaHD(m);
      if (r.janela && opts.janelas !== false) { if (!U.hdJanelas.value) criadas.push(U.hdJanelas.value = atlasJanelas()); janelas = marcaJanelas(scene, m); janelaHD(m, U); }
      for (const t of [m.map, m.normalMap]) if (t && t.anisotropy < 8) { aniso.push([t, t.anisotropy]); t.anisotropy = 8; t.needsUpdate = true; }
      // dispose() solta os programas antigos do material (o three guarda todas as variantes até lá).
      m.dispose(); m.needsUpdate = true;
    }
    if (janelas.todas.length) voltaGrades = tiraGrades(scene, porNome.get('steel') || new Set(), janelas.todas);
    tiraMiudos = marcaMiudos(scene, new Set(Object.entries(REGRAS).filter(([, r]) => r.reboco).flatMap(([nome]) => [...(porNome.get(nome) || [])])));
  }
  // Portas: tipo e tinta sorteados pela posição; grade e corrimão ficam no aço liso.
  const trocas = [];
  if (opts.portas !== false && portas.length) {
    const atlas = atlasPortas(), mats = new Map(), v = new THREE.Vector3(); criadas.push(atlas);
    for (const p of portas) { p.getWorldPosition(v); const tipo = Math.floor(h3(v.x, v.y, v.z) * 5), tinta = Math.floor(h3(v.z, v.x, 7) * TINTAS_PORTA.length), k = tipo * 10 + tinta;
      if (!mats.has(k)) { const m = new THREE.MeshStandardMaterial({ map: atlas, metalness: .1, roughness: .8, name: 'hd-porta' }); portaHD(m, tipo, new THREE.Color(TINTAS_PORTA[tinta])); mats.set(k, m); criadas.push(m); }
      trocas.push([p, p.material]); p.material = mats.get(k); }
  }
  const pixo = opts.pichacao === false || opts.texturas === false ? null : pichacoes(scene, opts.mundo || window.__game?.world, U, portas);
  // Cenografia sem colisão (hd_cenografia_lajes.js). Desliga tudo: opts.cenografia === false ou ?hdcen=0;
  // por item: opts.cenografia.{morro,fios,telhados,fachada,nuvens} === false ou ?hdcen=morro,fios (só os listados).
  const q = new URLSearchParams(location.search), qCen = q.get('hdcen'), soEstes = qCen && qCen !== '0' && qCen !== '1' ? qCen.split(',') : null;
  const oCen = opts.cenografia === false || qCen === '0' ? null : { ...(opts.cenografia || {}) };
  if (oCen && soEstes) for (const k of ['morro', 'fios', 'telhados', 'fachada', 'nuvens']) if (!soEstes.includes(k)) oCen[k] = false;
  const cen = oCen ? cenografiaLajes(scene, { ...oCen, janelas: janelas.janelas, ruido: U.hdRuido }) : null;
  // ?hdsol=1: sol alinhado ao beco (faixa de sol no chão do beco; em troca as fachadas da laje ficam em sombra).
  const desfazLuz = opts.luz === false ? () => {} : luzLajes(scene, U, { solDir: q.get('hdsol') === '1' ? [.24, .8, -.55] : null, nuvens: !!oCen && oCen.nuvens !== false, ...(opts.luz || {}) });
  return { alvos: [...porNome.keys()].filter((n) => REGRAS[n]), portas: portas.length, cenografia: cen, janelas: janelas.janelas.length, pichacao: pixo?.info, reflexos: cubos, cobertura: cob, desliga() {
    vivo = false;
    for (const s of antes) { Object.assign(s.m, { map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, bumpMap: s.bumpMap, roughness: s.roughness,
      metalness: s.metalness, onBeforeCompile: s.obc, customProgramCacheKey: s.key }); s.m.color.setHex(s.cor); s.m.normalScale.set(s.ns, s.ns); s.m.dispose(); s.m.needsUpdate = true; }
    for (const [p, m] of trocas) p.material = m;
    for (const [t, an] of aniso) { t.anisotropy = an; t.needsUpdate = true; }
    for (const c of criadas) c.dispose();
    janelas.desfaz(); voltaGrades(); tiraMiudos(); pixo?.desliga(); cubos?.desliga(); cob?.desliga(); desfazLuz(); cen?.desliga(); ruido.dispose();
  } };
}
