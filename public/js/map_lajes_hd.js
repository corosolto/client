// Kit visual HD do Lajes, atrás de ?hd=1 (desligado por padrão): troca material por nome (REGRAS); tudo volta em desliga().
// Interruptores ?hd*=0 e chaves de material: docs/hd-kit/lajes.md#interruptores e #materiais.
import * as THREE from 'three';
import { cenografiaLajes, ceuLajes, fundidor, ruidoTex, RUIDO_PARS, soltaAoSubir } from './hd_cenografia_lajes.js';
import { pbrTex, materiaisDe } from './map_sertao_hd.js';
import { atlasJanelas, atlasPortas, pichacoes, pintaLetreiro } from './hd_detalhes_lajes.js';

// Conjuntos CC0 em public/img/textures/hd_lajes (FONTE.md). `media` = cor média linear do mapa de cor: o shader
// divide por ela, então `cor` é o albedo final. `cor_rug` leva a rugosidade no alfa (uma leitura a menos).
const CONJ = {
  reboco: { media: [.523, .471, .406], metros: 1.7, cor: 'reboco_cor_rug', normal: 'reboco_normal' },
  piso: { media: [.142, .126, .095], metros: 1.9, cor: 'piso_cor_rug', normal: 'piso_normal' },
  forma: { media: [.147, .129, .105], metros: 1.8, cor: 'forma_color', normal: 'forma_normal' },
  chapa: { media: [.161, .159, .152], cor: 'chapa_color', normal: 'chapa_normal' },
};
const tex = (arquivo) => pbrTex(`hd_lajes/${arquivo}`, !arquivo.endsWith('_normal'));
// Chave = nome do material do mapa (lajes_houses.js nomeia todos); tabela em docs/hd-kit/lajes.md#materiais.
// O tijolo NÃO muda de escala nem de UV (fiada de 19,3 cm no tile de 2 m); reboco e cimento puxam para o frio.
const REGRAS = {
  cream: { reboco: true, cor: 0xc0b6a5, relevo: 1.3, miudo: .22 },
  ochre: { reboco: true, cru: 1, cor: 0xfff6ee, relevo: 1.3 },
  rose: { reboco: true, cru: 1, cor: 0xe6dcd6, relevo: 1.3 },
  sage: { reboco: true, cor: 0xaea698, relevo: 1.3 },
  adobe: { reboco: true, cor: 0xb6ac9c, relevo: 1.3 },
  concrete: { concreto: [2.3, .69, 99], cor: 0xc6bcac, relevo: 1.9, piso: [.195, .170, .148], amb: [4.2, 4.05, 3.75] },
  brick: { tijolo: true, cor: 0xd8c4bc, relevo: 1.3, rugosidade: .9 },
  ground: { concreto: [2.0, .655, .3], cor: 0xbdbdba, relevo: 1.6, piso: [.47, .41, .30], amb: [2.0, 1.63, 1.14] },
  paving: { concreto: [2.0, .665, .3], cor: 0xc2c2c1, relevo: 1.6, piso: [.47, .41, .30], amb: [2.0, 1.63, 1.14] },
  zinc: { chapa: true, cor: 0x8e8d88, relevo: 1.0, metal: .3, rugosidade: .72 },
  recess: { cor: 0x10181c, rugosidade: .3, janela: true },
  tank: { rugosidade: .42 },
  steel: { aco: true, rugosidade: .62, metal: .2 },
};
const TINTAS_PORTA = [0xffffff, 0xd9e8dc, 0xe9e2cf, 0xd2deea, 0xc4d2c0, 0xeadcdc];
const v3 = (a) => `vec3(${a.map((n) => n.toFixed(4)).join(', ')})`;
const LUMA = 'vec3(0.3, 0.59, 0.11)';
// Relevo por altura (em metros) sem textura extra: inclinação pela derivada de tela.
const BUMP = `vec3 hdBump(vec3 n, vec3 p, float h){ vec2 d = vec2(dFdx(h), dFdy(h)); vec3 sx = dFdx(p), sy = dFdy(p), r1 = cross(sy, n), r2 = cross(n, sx); float det = dot(sx, r1);
    return abs(det) < 1e-12 ? n : normalize(abs(det) * n - sign(det) * (d.x * r1 + d.y * r2)); }`;
// Faixa do corpo (0,45 a 2,1 m acima do piso do andar; a laje andável fica a 3,1 m): relevo e grão fino (< 10 cm)
// entram inteiros; só a mancha de albedo de 15 cm a 1 m fica contida. Fora das quatro lajes a altura conta do chão.
const PARS = `varying vec3 vHdPos;
  ${RUIDO_PARS}
  vec3 hdUmido(vec3 c, float k){ return mix(c, dot(c, ${LUMA}) * vec3(0.54, 0.57, 0.47), k); }
  vec3 hdBarro(vec3 c, float k){ return mix(c, dot(c, ${LUMA}) * vec3(0.58, 0.56, 0.52), k); }
  ${BUMP}
  float hdAndar(vec3 p){ return p.y - 3.1 * step(2.95, p.y) * step(5.0, abs(p.x)) * step(abs(p.x), 13.0) * step(abs(p.z), 20.2); }
  float hdNitido(){ return smoothstep(0.014, 0.004, max(length(dFdx(vHdPos)), length(dFdy(vHdPos)))); }
  float hdVis(float tam, vec2 q){ return clamp(tam / max(max(fwidth(q.x), fwidth(q.y)), 1e-6) - 1.0, 0.0, 1.0); }
  vec4 hdBloco(vec2 q, float v){ vec2 b = vec2(q.x / 0.40 + 0.5 * floor(q.y / 0.20), q.y / 0.20), f = abs(fract(b) - 0.5), px = fwidth(q);
    float ja = smoothstep(0.06, 0.02, max(px.x, px.y));
    float j = max(1.0 - smoothstep(0.005, 0.008 + px.x, (0.5 - f.x) * 0.40), 1.0 - smoothstep(0.005, 0.008 + px.y, (0.5 - f.y) * 0.20)) * ja;
    return vec4(mix(vec3(0.80 + v * (hdH(floor(b)) - 0.5) * ja), vec3(1.04, 1.02, 0.98), j), j); }
  float hdFaixaCorpo(float y){ return smoothstep(0.42, 0.58, y) * (1.0 - smoothstep(1.92, 2.12, y)); }
  // Paredes vizinhas da laje (entorno em |x| = 14,85; quartos em |x| = 5,2) ficam fora da caixa de hdAndar, mas quem está na laje
  // as vê a 1,2 m: a faixa do corpo vale nos dois referenciais (chão e laje). hdBandaP = zero duro entre 0,46 e 2,08 m para mancha de albedo.
  float hdLajeViz(vec3 p){ return step(2.95, p.y) * step(3.5, abs(p.x)) * step(abs(p.x), 16.5) * step(abs(p.z), 22.0); }
  float hdCorpoP(vec3 p){ return max(hdFaixaCorpo(hdAndar(p)), hdFaixaCorpo(p.y - 3.1) * hdLajeViz(p)); }
  float hdBanda(float y){ return smoothstep(0.38, 0.46, y) * (1.0 - smoothstep(2.08, 2.25, y)); }
  float hdBandaP(vec3 p){ return max(hdBanda(hdAndar(p)), hdBanda(p.y - 3.1) * hdLajeViz(p)); }
  float hdHalo(vec2 q, float w){ float c = floor(q.x / 1.7), fx = q.x - (c + 0.5) * 1.7;
    return (1.0 - smoothstep(0.012, 0.06, abs(fx - (w - 0.5) * 1.2))) * step(0.5, hdH(vec2(c, 3.0))) * smoothstep(0.03, 0.008, fwidth(q.x)); }
  // e = espessura (0,45–1,5), variada pelo chamador com o ruído ao longo do traço: largura constante lê como vetor.
  float hdTrinca(vec2 q, float w, float e){ float c = floor(q.x / 1.7), fx = q.x - (c + 0.5) * 1.7, l = fwidth(q.x);
    return (1.0 - smoothstep(0.003 * e, (0.005 + l * 1.2) * e, abs(fx - (w - 0.5) * 1.2))) * step(0.5, hdH(vec2(c, 3.0))) * smoothstep(0.03, 0.008, l); }
  float hdTrinca(vec2 q, float w){ return hdTrinca(q, w, 1.0); }
  vec4 hdTijolo(vec2 q, float n, float v){ vec2 b = vec2(q.x / 0.29 + 0.5 * floor(q.y / 0.193), q.y / 0.193), f = abs(fract(b) - 0.5), px = fwidth(q);
    float ja = smoothstep(0.035, 0.012, max(px.x, px.y)), jf = smoothstep(0.05, 0.02, px.y);
    float j = max((1.0 - smoothstep(0.006, 0.008 + px.x, (0.5 - f.x) * 0.29)) * ja, (1.0 - smoothstep(0.006, 0.008 + px.y, (0.5 - f.y) * 0.193)) * jf);
    vec3 c = vec3(0.25, 0.105, 0.072) * (1.0 + v * (hdH(floor(b)) - 0.5) * ja) * (1.0 - 0.10 * ja * step(0.5, fract(b.y * 5.0))) * (0.84 + 0.32 * n);
    return vec4(mix(c, vec3(0.27, 0.265, 0.25) * (0.8 + 0.4 * n), max(j, 0.13 * (1.0 - jf))), j); }`;
// Cimentado: placa com tom próprio, junta escura antialiasada, remendo, mancha e poça de borda irregular com halo
// molhado. `hdCob` = altura da cobertura sobre cada ponto: poça só a céu aberto, sujeira de contato no pé da parede.
const PISO_PARS = `uniform sampler2D hdCob; uniform samplerCube hdCuboB; uniform samplerCube hdCuboA; uniform vec3 hdPisoP; uniform vec3 hdPisoT; uniform vec3 hdPisoA;
  vec3 hdCimentado(vec3 c, vec2 p, float altura, out float poca, out float molhado, out float canal){
    vec4 a = texture2D(hdRuido, p * 0.071), m = texture2D(hdRuido, p * 0.53 + 0.19);
    vec2 g = p / hdPisoP.x + vec2(0.0, 0.37), id = floor(g), f = fract(g); float px = max(fwidth(p.x), fwidth(p.y));
    float dj = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)) * hdPisoP.x;
    float junta = (1.0 - smoothstep(0.014, 0.022 + px * 1.5, dj)) * 0.03 / (0.03 + px * 0.6);
    float remendo = step(0.84, hdH(id + 31.0)) * smoothstep(0.50, 0.53, a.g);
    float mancha = smoothstep(0.50, 0.70, a.a * 0.6 + m.r * 0.4);
    float dh = texture2D(hdCob, vec2(p.x / 40.0 + 0.5, 0.5 - p.y / 66.0), 1.6).r - altura, contato = smoothstep(0.5, 2.0, dh) * step(altura, 900.0);
    float aberto = (1.0 - smoothstep(0.3, 0.9, dh)) * step(altura, hdPisoP.z);
    float fp = a.r * 0.72 + m.g * 0.22 + m.a * 0.06;
    fp += (m.b - 0.5) * 0.012; poca = smoothstep(hdPisoP.y, hdPisoP.y + 0.10, fp) * aberto; molhado = smoothstep(hdPisoP.y - 0.09, hdPisoP.y + 0.02, fp) * aberto;
    float hdBc = step(altura, 0.3) * step(abs(p.x), 1.0) * step(8.6, abs(p.y)), hdMg = 0.0, hdPe = 0.0, hdAgua = 0.0; canal = 0.0;
    if (hdBc > 0.5) { vec2 b2 = vec2(p.x * sign(p.y), abs(p.y)); float d = min(length((b2 - vec2(-0.22, 11.6)) / vec2(0.55, 0.95)), min(length((b2 - vec2(0.28, 15.1)) / vec2(0.62, 1.15)), length((b2 - vec2(-0.12, 20.4)) / vec2(0.50, 0.85))));
      float pz = 1.0 - d + (m.g - 0.5) * 0.7 + (m.a - 0.5) * 0.3; poca = max(poca, smoothstep(-0.10, 0.12, pz)); molhado = max(molhado, smoothstep(-0.55, 0.0, pz));
      // Canaleta de esgoto no eixo do beco (15 cm): perfil em U de 3 cm por relevo (parede inclinada de 4,5 a 7,5 cm do eixo), água parada no
      // fundo (rugosidade 0,2, reflexo do cubo) e musgo contínuo de 4 cm no rebordo. canal = profundidade; não entra em molhado (achataria a normal).
      float ax = abs(b2.x + 0.02 * (m.r - 0.5)), hdDentro = step(b2.y, 25.7); canal = (1.0 - smoothstep(0.045, 0.075, ax)) * hdDentro; hdAgua = (1.0 - smoothstep(0.035, 0.05, ax)) * hdDentro;
      hdMg = (smoothstep(0.055, 0.075, ax) - smoothstep(0.10, 0.115, ax)) * (0.6 + 0.4 * smoothstep(0.35, 0.65, m.a * 0.6 + a.g * 0.4)) * hdDentro;
      poca = max(poca, hdAgua);
      // Pé das paredes do beco: faixa úmida e escura de contato (as paredes estão em |x| = 0,94).
      hdPe = smoothstep(0.50, 0.90, abs(b2.x)) * (0.6 + 0.4 * a.a); }
    c *= mix(0.84, 1.10, hdH(id)) * mix(0.76, 1.16, a.g) * mix(0.84, 1.12, m.r) * (0.92 + 0.16 * m.b) * (1.0 - 0.45 * hdTrinca(p, a.a)) * (1.0 - 0.45 * hdTrinca(p.yx + 5.3, a.g));
    c = mix(c, c * vec3(1.16, 1.15, 1.12), remendo * 0.8);
    c = hdBarro(c, 0.4 * mancha) * (1.0 - 0.24 * mancha);
    // Laje andável (y = 3,1): manta asfáltica em 1/4 das placas inteiras (borda = junta, emenda a cada 1 m, grão da placa por baixo)
    // e mancha de umidade sob a caixa d'água (±11,4; ±7 e ±16). As outras placas ficam na luminância normal.
    if (altura > 2.9 && altura < 3.4) { vec2 pm = vec2(abs(p.x), abs(p.y));
      float hdMan = step(0.75, hdH(id + 7.0)), hdEm = (1.0 - smoothstep(0.012, 0.02 + px, abs(fract(p.y + 0.5) - 0.5))) * hdMan;
      c = mix(c, mix(c * 0.34, vec3(0.075, 0.072, 0.068) * (0.8 + 0.4 * m.r), 0.5) * (1.0 + 0.5 * hdEm), hdMan);
      float hdMc = smoothstep(1.4, 0.55, min(length(pm - vec2(11.4, 7.0)), length(pm - vec2(11.4, 16.0)))) * (0.7 + 0.3 * a.a);
      c = hdUmido(c, 0.5 * hdMc) * (1.0 - 0.22 * hdMc);
      // Ralo de 12 cm no canto de cada laje (±10,6; ±18,6) com mancha escura de 50 cm e grelha de ferro com rasgos.
      vec2 hdRv = pm - vec2(10.6, 18.6); float hdRd = length(hdRv), hdRalo = smoothstep(0.55, 0.10, hdRd + 0.12 * (m.g - 0.5)), hdGr = step(max(abs(hdRv.x), abs(hdRv.y)), 0.06);
      c = hdUmido(c, 0.6 * hdRalo) * (1.0 - 0.30 * hdRalo);
      c = mix(c, vec3(0.045, 0.045, 0.042) * (0.6 + 0.5 * step(0.5, fract(hdRv.y * 25.0))), hdGr); }
    c = mix(c, vec3(0.055, 0.11, 0.045) * (0.7 + 0.6 * m.b), 0.8 * hdMg);
    c = mix(c, c * vec3(0.62, 0.64, 0.60), canal); c = mix(c, vec3(0.05, 0.065, 0.055) * (0.7 + 0.6 * m.g), 0.7 * hdAgua);
    c *= 1.0 - 0.72 * junta;
    c = hdUmido(c, 0.18 * contato + 0.30 * hdPe) * (1.0 - 0.04 * contato - 0.16 * hdPe);
    return c * mix(1.0, 0.56, molhado) * mix(1.0, 0.48, poca); }`;
// A água reflete o cubo capturado da própria cena (parede e céu de verdade), por emissão com Fresnel.
const CUBO = (dir) => `(vHdPos.y > 2.9 ? textureCube(hdCuboA, ${dir}).rgb : textureCube(hdCuboB, ${dir}).rgb)`;
const POCA = {
  normal: '\nnormal = normalize(mix(normal, nonPerturbedNormal, max(hdPoca, hdMolhado * 0.5)));',
  emissao: `
    if (hdPoca > 0.0) { vec3 hdV = normalize(cameraPosition - vHdPos), hdR = reflect(-hdV, vec3(0.0, 1.0, 0.0));
      hdR.xz += (texture2D(hdRuido, vHdPos.xz * 0.9).rg - 0.5) * 0.03;
      vec3 hdRf = min(${CUBO('hdR')}, vec3(1.4)); hdRf = mix(vec3(dot(hdRf, ${LUMA})), hdRf, 0.42);
      totalEmissiveRadiance += hdPoca * hdRf * (0.03 + 0.46 * pow(1.0 - max(dot(hdV, vec3(0.0, 1.0, 0.0)), 0.0), 3.0)); }`,
};
const NORMAL = THREE.ShaderChunk.normal_fragment_maps.replace('mapN.xy *= normalScale;', 'mapN.xy *= normalScale * hdRel;').replace('texture2D( normalMap, vNormalMapUv )', 'texture2D( normalMap, vNormalMapUv, 0.8 )');

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
// Face de costas para o sol não pode ganhar sol pelo relevo: a sombra não cobre e vira faísca.
const SEM_FAISCA = `
  #if NUM_DIR_LIGHTS > 0
  { vec3 hdGeo = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition))), hdLz = directionalLights[0].direction; float hdDl = dot(normal, hdLz);
    if (hdDl > 0.0) normal = normalize(normal - hdLz * hdDl * smoothstep(0.12, 0.0, dot(hdGeo, hdLz)));
    float hdRl = dot(normal - hdGeo, normalize((viewMatrix * vec4(0.25, 1.0, 0.15, 0.0)).xyz));
    diffuseColor.rgb *= 1.0 + clamp(hdLuzRel * hdRl * smoothstep(0.24, 0.50, abs(hdRl)), -0.42, 0.42); }
  #endif`;
const ALTURA = `\nnormal = hdBump(normal, -vViewPosition, hdAlt);${SEM_FAISCA}`;
const ganchos = (shader) => { shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * hdRug;').replace('#include <normal_fragment_maps>', NORMAL + ALTURA); };

// Idade comum a reboco, tijolo e concreto de parede; espera hdY, hdQ, hdCorpo, hdFora, hdA e hdM. semPe pula o pé
// (o reboco tem rodapé próprio); `sobre` = { k, cor } é a tinta antiga. Ver docs/hd-kit/lajes.md#idade.
const idade = (o, sub, semPe = false, ao = true, sobre = null) => `
  ${ao ? `{ float hdAoC = 0.09 * (1.0 - smoothstep(0.03, 0.38, hdY)) + 0.14 * (1.0 - smoothstep(2.42, 2.96, hdY)) * step(hdY, 2.98); diffuseColor.rgb *= 1.0 - hdAoC; }` : ''}
  ${o.umidade ? `{ float hdEsc = smoothstep(0.46, 0.72, texture2D(hdRuido, vec2(hdQ.x * 0.61, hdQ.y * 0.045) + 0.71).r * 0.8 + hdM.a * 0.2) * smoothstep(2.12, 2.40, hdY) * hdFora;
    diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.7 * hdEsc) * (1.0 - 0.42 * hdEsc); }` : ''}
  // Trinca com descascado em volta (halo de até 6 cm, quebrado pelo ruído, só fora da faixa do corpo) e oclusão no sulco.
  { float hdTrE = 0.45 + 1.05 * texture2D(hdRuido, vec2(hdQ.y * 0.9 + 0.2, hdQ.x * 0.11)).b; float hdTr = hdTrinca(hdQ, hdA.a, hdTrE), hdHl = hdHalo(hdQ, hdA.a) * hdFora * smoothstep(0.30, 0.50, hdM.g);
    diffuseColor.rgb *= (1.0 - 0.48 * mix(1.0, 0.6, hdCorpo) * hdTr) * (1.0 - 0.22 * hdHl) * (1.0 + 0.12 * hdHl * step(0.5, hdM.b)); hdAlt -= 0.004 * hdTr + 0.005 * hdHl; }
  float hdPele = 0.0;
  ${o.descasca && sub ? `{ float hdFb = hdA.g * 0.62 + hdM.g * 0.28 + hdM.a * 0.10, hdW = max(0.006, fwidth(hdFb));
    float hdLim = mix(mix(${sub.pe.toFixed(3)}, 1.5, smoothstep(0.08, 0.36, hdY)), ${sub.alto.toFixed(3)}, smoothstep(2.35, 2.9, hdY)) + hdMiF;
    // Mancha cor de tijolo, halo claro e tinta antiga nunca entram na faixa do corpo: zero entre 0,48 e 2,08 m, rampa curta fora.
    float hdPeleOk = 1.0 - hdBandaP(vHdPos);
    hdPele = smoothstep(hdLim, hdLim + hdW, hdFb) * hdPeleOk; float hdMiolo = smoothstep(hdLim + 0.03, hdLim + 0.06, hdFb);
    ${sobre ? `{ float hdVelha = ${sobre.k} * step(2.1, hdY) * hdPeleOk * smoothstep(hdLim - 0.12, hdLim - 0.06, hdFb) * (1.0 - smoothstep(hdLim - 0.01, hdLim + 0.01, hdFb));
      diffuseColor.rgb = mix(diffuseColor.rgb, dot(diffuseColor.rgb, ${LUMA}) * (${sobre.cor}), hdVelha); }` : ''}
    diffuseColor.rgb *= 1.0 + 0.2 * smoothstep(hdLim - 0.03, hdLim, hdFb) * (1.0 - hdPele) * hdPeleOk;
    diffuseColor.rgb = mix(diffuseColor.rgb, ${sub.glsl} * (1.0 - 0.22 * (1.0 - smoothstep(hdLim, hdLim + 0.035, hdFb))), hdPele); hdRel *= 1.0 - 0.5 * hdPele; hdAlt -= ${sub.fundo} * hdPele; }` : ''}
  ${o.umidade && !semPe ? `{ float hdSuj = smoothstep(0.42, 0.04, hdY + 0.06 * (hdM.a - 0.5)) * (0.45 + 0.55 * hdA.r) * (1.0 - 0.35 * hdPele);
    // Rodapé: borda irregular abaixo de 0,45 m e no máximo -18 % de luminância; o musgo só muda o matiz.
    diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.30 * hdSuj) * (1.0 - 0.05 * hdSuj);
    float hdMusgo = smoothstep(0.30, 0.03, hdY) * smoothstep(0.50, 0.70, hdM.a);
    diffuseColor.rgb = mix(diffuseColor.rgb, dot(diffuseColor.rgb, ${LUMA}) * vec3(0.83, 1.10, 0.50), 0.45 * hdMusgo); }` : ''}`;
const CABECA = `float hdRel = 1.0, hdRug = 1.0, hdMiF = 0.0, hdAlt = 0.0, hdLuzRel = 1.0;`;
const LOCAL = `float hdY = hdAndar(vHdPos); vec2 hdQ = vec2(vHdPos.x + vHdPos.z, hdY);
  vec4 hdA = texture2D(hdRuido, hdQ * 0.137), hdM = texture2D(hdRuido, hdQ * 0.83 + 0.37);`;
// O que aparece onde o reboco caiu: tijolo baiano sob a tinta; chapisco de cimento sobre o tijolo aparente.
const CHAPISCO = '(vec3(0.40, 0.39, 0.37) * (0.72 + 0.56 * hdM.r))';
const EMBOCO = '(vec3(0.43, 0.41, 0.375) * (0.76 + 0.48 * hdM.r))';
const SUBS = { tijolo: { pe: .65, alto: .74, fundo: 'mix(0.012, -0.007, hdCr)', glsl: `mix(mix(${EMBOCO}, hdTj.rgb * vec3(1.30, 0.95, 0.72), hdMiolo * hdJa * hdJa), ${CHAPISCO}, hdCr)` }, chapisco: { pe: .64, alto: .72, fundo: '0.012', glsl: CHAPISCO },
  // Acabamento brasileiro do tijolo aparente (?hdtijolo=1): um pouco mais de reboco parcial no pé e no alto.
  chapiscoAcab: { pe: .60, alto: .68, fundo: '0.012', glsl: CHAPISCO } };

// Reboco: hdMi.x marca caixa miúda (lisa e escura); hdMi.y = (acabamento + sorteio) / 4 por casa, com acabamento
// 0 chapisco, 1 sarrafeado (pintado), 2 liso queimado, 3 bloco. Opções o.rebocoPe/Fam/Borda: docs/hd-kit/lajes.md#reboco.
function rebocoHD(m, r, U, o) {
  m.onBeforeCompile = (shader) => { comMundo(shader, U, CONJ.reboco.metros, 'varying float vHdMi; varying float vHdCasa; uniform float hdMiCor; uniform float hdCru; uniform float hdGrao; uniform float hdParede;\n  vec3 hdFam(float t){ return vec3(step(t, 0.5), step(0.5, t) * step(t, 1.5), step(1.5, t) * step(t, 2.5)); }'); shader.uniforms.hdMiCor = { value: r.miudo ?? .8 }; shader.uniforms.hdCru = { value: r.cru || 0 }; shader.uniforms.hdGrao = { value: o.tijoloGrao ? .42 : 1 }; shader.uniforms.hdParede = { value: o.rebocoSombra ? 1 : 0 };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 hdMi; varying float vHdMi; varying float vHdCasa; varying vec4 vHdCx;')
      // hdMi.x empacota (miúdo, meia-largura da face em cm, meia-altura em cm); o local da face é uv x 2 (tile [2,2] do mapa). Miúdo 2 = placa some.
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      { float hdMiX = hdMi.x; vHdMi = mod(hdMiX, 4.0); vHdCasa = hdMi.y; vHdCx = vec4(uv * 2.0, mod(floor(hdMiX / 4.0), 2048.0) * 0.01, floor(hdMiX / 8192.0) * 0.01); }`)
      .replace('#include <project_vertex>', '#include <project_vertex>\nif (vHdMi > 1.5) gl_Position = vec4(0.0, 0.0, 2.0, 1.0);');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec4 vHdCx;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `${CABECA} { float hdY = hdAndar(vHdPos); vec2 hdQ = vec2(vHdPos.x + vHdPos.z, hdY);
      float hdCs = fract(vHdCasa * 4.0), hdTp = floor(vHdCasa * 4.0), hdAng = hdCs * 6.2832, hdV3 = hdVis(0.003, hdQ), hdV9 = hdVis(0.009, hdQ), hdV2 = hdVis(0.02, hdQ), hdV6 = hdVis(0.06, hdQ);
      // Malha sem o atributo hdMi (geometria fundida, não caixa) lê vHdCasa = 0: a família vem do sorteio por célula
      // de 7 m no mundo, senão todas caem na família 0 (chapisco). Ver docs/hd-kit/lajes.md#reboco.
      if (vHdCasa < 0.001) { float hdSf = hdH(floor((vHdPos.xz + 100.0) / 7.0)); hdTp = floor(hdSf * 2.999); hdCs = fract(hdSf * 13.7) * 0.9; hdAng = hdCs * 6.2832; }
      vec2 hdQr = mat2(cos(hdAng), sin(hdAng), -sin(hdAng), cos(hdAng)) * hdQ * mix(0.085, 0.21, fract(hdCs * 5.7)) + hdCs * 11.0;
      vec4 hdA = texture2D(hdRuido, hdQr), hdM = texture2D(hdRuido, hdQ * 0.83 + 0.37 + hdCs * 3.0);
      float hdFamOn = ${o.rebocoFam ? '1.0' : '0.0'}; vec3 hdFm = hdFam(hdTp);
      float hdChap = hdFm.x, hdSarr = hdFm.y, hdLiso = hdFm.z, hdBl = step(2.5, hdTp) * step(vHdMi, 0.5) * (1.0 - hdCru);
      // Chapisco: amplitude contida e máscara de baixa frequência (célula ~9 m) que deixa metade da parede lisa;
      // relevo alto e uniforme lê como rocha.
      float hdLisoM = smoothstep(0.44, 0.58, texture2D(hdRuido, hdQ * 0.11 + hdCs * 4.0).r), hdChapR = hdChap * (1.0 - 0.75 * hdLisoM);
      float hdCorpo = max(hdCorpoP(vHdPos), vHdMi), hdFora = 1.0 - hdCorpo; vec4 hdT = texture2D(map, vMapUv);
      vec3 hdB = texture2D(map, vMapUv, 4.5).rgb; float hdRz = dot(hdT.rgb, ${LUMA}) / max(dot(hdB, ${LUMA}), 0.02), hdFuro = smoothstep(0.92, 0.70, hdRz) * (1.0 - 0.35 * hdLiso);
      float hdFino = clamp(hdRz, 0.95, 1.03);
      float hdGr = texture2D(hdRuido, hdQ * 1.3 + hdCs).b, hdGf = texture2D(hdRuido, hdQ * 4.2 + hdCs * 3.0).b, hdGm = smoothstep(0.30, 0.70, texture2D(hdRuido, hdQ * 3.1 + hdCs * 7.0).a), hdRisco = texture2D(hdRuido, vec2(hdQ.x * 0.23 + hdQ.y * 0.05, hdQ.y * 3.3) + hdCs).a;
      vec4 hdBk = hdBloco(hdQ + hdCs * 5.0, mix(0.2, 0.07, hdCorpo));
      hdRug = hdT.a * mix(1.0, 0.84, hdLiso); hdMiF = max(vHdMi, hdBl);
      float hdF2 = texture2D(hdRuido, hdQ * 0.47 + hdCs * 2.0).a * 0.7 + hdGm * 0.3, hdW2 = max(fwidth(hdF2) * 1.2, 0.003);
      float hdC1 = smoothstep(0.50, 0.50 + hdW2, hdF2), hdC2 = smoothstep(0.64, 0.64 + hdW2, hdF2);
      float hdBorda = (max(0.0, 1.0 - abs(hdF2 - 0.50) / (hdW2 * 1.6)) + max(0.0, 1.0 - abs(hdF2 - 0.64) / (hdW2 * 1.6))) * hdV6 * (1.0 - 0.5 * hdLiso);
      // Ondulação de sarrafeado: faixas de ~2 x 0,5 m com relevo de 0,6–1,8 cm e sombreado explícito pela inclinação
      // vertical, porque a face de costas para o sol só tem hemisfério. Ganho: docs/hd-kit/lajes.md#reboco-ondulacao.
      vec2 hdOq = vec2(hdQ.x * 0.06, hdQ.y * 0.22) + hdCs * 9.0; float hdOnd = texture2D(hdRuido, hdOq).a, hdOndY = texture2D(hdRuido, hdOq + vec2(0.0, 0.0132)).a;
      hdAlt = hdV3 * (0.0006 + 0.0005 * hdChapR) * hdGf + hdV9 * (0.001 * hdM.b - 0.004 * hdFuro + (0.001 + mix(0.0012, 0.0024, hdFamOn) * hdChapR) * hdGr + 0.002 * hdSarr * hdRisco - 0.004 * hdBl * hdBk.a)
        + hdV2 * 0.006 * hdGm * (1.0 - 0.4 * hdLiso) - hdV6 * (0.004 * hdC1 + 0.003 * hdC2) * (1.0 - 0.5 * hdLiso)
        + hdFamOn * (0.018 * hdSarr + 0.012 * hdLiso + 0.006 * hdChap) * (hdOnd - 0.5);
      float hdJa = smoothstep(0.035, 0.012, max(fwidth(hdQ.x), fwidth(hdQ.y)));
      vec4 hdTj = hdTijolo(hdQ + 3.7, hdM.r, mix(0.5, 0.2, hdCorpo)); hdTj.rgb = mix(hdTj.rgb, dot(hdTj.rgb, ${LUMA}) * vec3(1.03, 1.0, 0.95), 0.55 * hdCorpo);
      float hdCr = hdCru * step(vHdMi, 0.5) * step(abs(normalize(cross(dFdx(vHdPos), dFdy(vHdPos))).y), 0.7);
      float hdTom = mix(0.90, 1.08, fract(hdCs * 29.3)) * (1.0 - 0.10 * hdChap + 0.05 * hdLiso) * (1.0 + mix(0.08, 0.18, hdFamOn) * hdChapR * (hdGr - 0.5) * hdV9 + 0.08 * hdFamOn * hdChapR * (hdGm - 0.5) * hdV2 + 0.14 * hdSarr * (hdRisco - 0.5)) * (1.0 - 0.22 * hdBorda);
      vec2 hdJg = vec2(hdQ.x / 1.15 + hdCs * 3.0, hdQ.y / 0.92), hdJf = abs(fract(hdJg) - 0.5);
      float hdJu = (1.0 - smoothstep(0.005, 0.009 + max(fwidth(hdQ.x), fwidth(hdQ.y)) * 1.5, min((0.5 - hdJf.x) * 1.15, (0.5 - hdJf.y) * 0.92))) * hdLiso * hdV9 * hdFamOn; hdTom *= 1.0 - 0.14 * hdJu; hdAlt -= 0.0025 * hdJu;
      vec3 hdReb = hdFino * hdTom * (0.98 + 0.03 * hdM.b) * (1.0 + hdFamOn * (0.03 + 0.06 * hdChap - 0.06 * hdLiso)) * (1.0 + 0.03 * hdV2 * (hdGm - 0.5)) * mix(min(mix(vec3(1.0), hdB / ${v3(CONJ.reboco.media)}, 0.10), vec3(1.03)) * mix(0.86, 1.05, hdA.r) * mix(0.91, 1.04, hdM.r) * (1.0 - 0.06 * hdLiso * smoothstep(0.4, 0.7, hdM.a)), vec3(0.955 + 0.03 * hdM.r), max(hdCorpo, vHdMi)) * mix(1.0, hdMiCor, vHdMi) * mix(1.0, mix(0.62, 0.2, vHdMi), hdCru);
      // Família pintada: pastel de luminância igual; hdNeu tira o quente do material e o tom entra com croma ×1,8.
      // Matiz longe do cream (29°), senão some no reboco e no sol quentes. Ver docs/hd-kit/lajes.md#reboco-pintado.
      vec3 hdNeu = dot(diffuse, ${LUMA}) / max(diffuse, vec3(0.02));
      float hdPk = step(0.33, fract(hdCs * 7.7)), hdPk2 = step(0.5, fract(hdCs * 17.1));
      vec3 hdPas = mix(vec3(0.738, 1.128, 1.026), mix(vec3(0.824, 0.978, 1.596), vec3(1.205, 0.904, 0.954), hdPk2), hdPk);
      // Tinta antiga = outro pastel, nunca o de cima e nunca rosa (lê como pele sob a janela da casa viva).
      // Casa de tinta viva (hdCs ≥ 0,955, marcaMiudos): verde, ou azul com hdCs ≥ 0,975.
      vec3 hdPasV = mix(vec3(0.738, 1.128, 1.026), vec3(0.824, 0.978, 1.596), hdPk2);
      vec3 hdTinta = mix(mix(vec3(1.0), hdPas, 1.8), mix(vec3(0.50, 1.30, 0.55), vec3(0.60, 0.96, 2.00), step(0.975, hdCs)), step(0.955, hdCs));
      // Borda de rolo: distância à aresta da face (vHdCx: local x,y e meias-medidas); sem atributo (hw = 0) a tinta vai até a aresta.
      float hdDb = min(vHdCx.z - abs(vHdCx.x), vHdCx.w - abs(vHdCx.y)), hdIns = mix(0.10, 0.20, fract(hdCs * 3.3)) + 0.15 * step(2.5, vHdCx.w) + (hdM.a - 0.5) * 0.08 + (hdGm - 0.5) * 0.03;
      // No corpo da casa (hh ≥ 2,5 m) a cinta de cada andar (y = 3k + 2,95..3,14, lajes_houses side(.19, .19, d)) também é aresta: a tinta do térreo
      // não corre por trás dela até o andar de cima. O +0,15 anula o acréscimo de pilar: margem de 10–20 cm medida da face da cinta.
      hdDb = min(hdDb, mix(9.0, abs(mod(vHdPos.y - 1.545, 3.0) - 1.5) - 0.095 + 0.15, step(2.5, vHdCx.w))); float hdWb = max(fwidth(hdDb), 0.004);
      float hdPint = hdSarr * hdFamOn * (vHdCx.z > 0.001 ? mix(1.0, smoothstep(hdIns - hdWb, hdIns + hdWb, hdDb), ${o.rebocoBorda ? '1.0' : '0.0'}) : 1.0);
      float hdSobre = hdSarr * hdFamOn * step(0.66, fract(hdCs * 23.9));
      hdReb *= mix(vec3(1.0), hdNeu * hdTinta, hdPint) * (1.0 - 0.05 * hdPint * (1.0 - smoothstep(0.0, 0.025, hdDb - hdIns)));
      hdReb *= 1.0 - hdFamOn * (0.40 * hdSarr + 0.36 * hdLiso + 0.12 * hdChap) * clamp((hdOndY - hdOnd) * 16.0, -0.5, 0.5) * mix(1.0, 0.6, hdCorpo);
      float hdFina = texture2D(hdRuido, hdQ * 4.7 + hdCs * 3.0).b, hdMedia = texture2D(hdRuido, hdQ * 0.29 + hdCs * 1.7).g;
      float hdFaixa = hdCorpo, hdNvar = (hdFina - 0.5) * 0.16 + (hdGf - 0.5) * 0.07 + 1.18 * ((hdMedia - 0.5) * mix(0.22, 0.08, hdFaixa) + (hdA.r - 0.5) * mix(0.16, 0.05, hdFaixa));
      vec3 hdGn = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))); float hdAresta = clamp((length(dFdx(hdGn)) + length(dFdy(hdGn))) * 2.5, 0.0, 1.0);
      float hdOc = 0.07 * (1.0 - smoothstep(0.04, 0.40, hdY)) + 0.14 * (1.0 - smoothstep(2.42, 2.96, hdY)) + 0.08 * hdAresta;
      hdReb *= (1.0 + hdParede * hdNvar) * (1.0 - hdParede * hdOc);
      ${o.rebocoPe ? `{ float hdLiv = step(vHdMi, 0.5) * (1.0 - hdCru);
        float hdS1 = fract(hdCs * 7.3), hdS2 = fract(hdCs * 11.7), hdLin = 2.10 + 0.05 * hdA.g + 0.02 * hdM.b + 0.015 * hdFamOn * step(0.5, fract(hdQ.x / 0.23 + hdCs)), hdLb = 0.40 + 0.02 * (hdM.a - 0.5);
        float hdRep = max(step(0.55, hdS1), hdSarr * hdFamOn) * smoothstep(hdLin - 0.01, hdLin + 0.01, hdY) * hdLiv, hdBar = step(0.62, hdS2) * (1.0 - smoothstep(hdLb - 0.01, hdLb + 0.01, hdY)) * hdLiv;
        // A barra pintada cobre a umidade: juntas, barra e umidade residual ficam dentro dos -18 % de luminância.
        // hdAlvo = parede das poses parede/laje (face x = -5,2; z -16..-7). Ver docs/hd-kit/lajes.md#parede-alvo.
        float hdAlvo = step(abs(vHdPos.x + 5.2), 0.3) * step(2.95, vHdPos.y) * step(abs(vHdPos.z + 11.5), 4.5) * hdLiv;
        // Na parede alvo o rodapé de mofo sobe cheio até 0,45 m (a pose parede só vê o pé a partir de hdY 0,44).
        float hdRod = (1.0 - smoothstep(0.12 + 0.14 * hdAlvo, 0.42 + 0.04 * hdAlvo, hdY + 0.10 * (hdM.a - 0.5))) * hdLiv * (1.0 - 0.7 * hdBar);
        float hdMofo = hdRod * smoothstep(0.46 - 0.18 * hdAlvo, 0.62 - 0.18 * hdAlvo, hdGm * 0.5 + hdM.g * 0.5), hdSal = smoothstep(0.18, 0.30, hdY) * (1.0 - smoothstep(0.36, 0.45, hdY)) * smoothstep(0.48, 0.60, hdA.g) * hdLiv;
        hdReb = hdUmido(hdReb, 0.26 * hdRod) * (1.0 - 0.06 * hdRod);
        hdReb = mix(hdReb, hdReb * mix(vec3(0.72, 0.90, 0.55), vec3(0.60, 0.80, 0.44), hdAlvo) * (0.95 + 0.1 * hdM.r), (0.55 + 0.35 * hdAlvo) * hdMofo);
        { float hdEscT = hdAlvo * smoothstep(2.12, 2.30, hdY) * smoothstep(0.42, 0.62, texture2D(hdRuido, vec2(hdQ.x * 0.9, hdQ.y * 0.06) + 0.3).r) * (0.55 + 0.45 * smoothstep(2.3, 2.9, hdY));
          hdReb = hdUmido(hdReb, 0.6 * hdEscT) * (1.0 - 0.30 * hdEscT); }
        // Dois escorridos de calha na parede alvo (z ≈ -13,1 e -10,7): largos acima de 2,1 m; na faixa do corpo
        // afinam a 10 cm e -10 % (só detalhe fino é permitido ali).
        { float hdE1 = abs(hdQ.x + 18.3 + 0.03 * (hdM.g - 0.5)), hdE2 = abs(hdQ.x + 15.9 + 0.03 * (hdM.a - 0.5)), hdEw = fwidth(hdQ.x) * 1.5, hdAlto = smoothstep(2.05, 2.30, hdY);
          float hdLg = mix(0.05, 0.14, hdAlto), hdEsc2 = hdAlvo * max(1.0 - smoothstep(hdLg * 0.6, hdLg + hdEw, hdE1), 0.8 * (1.0 - smoothstep(hdLg * 0.5, hdLg * 0.8 + hdEw, hdE2))) * smoothstep(0.9, 1.6, hdY) * step(hdY, 2.97) * (0.7 + 0.3 * hdM.b);
          hdReb = hdUmido(hdReb, 0.6 * hdEsc2) * (1.0 - mix(0.10, 0.32, hdAlto) * hdEsc2); }
        hdReb = mix(hdReb, vec3(dot(hdReb, ${LUMA})) * 1.10 + 0.04, 0.6 * hdSal);
        // Remendo de massa nova (célula 1,8 x 0,8 m), só acima de 2,12 m ou abaixo de 0,52 m: cinza-claro neutro,
        // sem o quente do reboco.
        float hdRy = hdY > 1.3 ? (hdY - 2.12) / 0.8 : (hdY - 0.52) / 0.8, hdOk = (hdY > 1.3 ? step(2.12, hdY) : step(hdY, 0.52)) * (1.0 - hdBandaP(vHdPos));
        vec2 hdRc = vec2(hdQ.x / 1.8 + hdCs * 3.0, hdRy), hdRf = fract(hdRc), hdRw = fwidth(hdRc);
        float hdRr = hdH(floor(hdRc) + hdCs * 13.0), hdRd = min(min(hdRf.x, 1.0 - hdRf.x) - (0.05 + 0.06 * hdM.g), min(hdRf.y, 1.0 - hdRf.y) - (0.08 + 0.08 * hdM.r));
        // Sem remendo forçado na parede das poses parede/laje: o quadro da pose parede vê a face x = -5,2 só em hdY 0,26–2,0 (faixa do corpo,
        // mancha de 1,3 m² proibida) e o topo (> 2,12 m) fica atrás do telhado de zinco na pose laje. O remendo entra só pelo sorteio por célula.
        float hdSel = step(0.72, hdRr) * hdOk;
        float hdRw2 = max(fwidth(hdY), 0.003), hdRdT = mix(-1.0, hdRd, hdSel), hdRem = hdLiv * smoothstep(0.0, 0.012 + hdRw2 * 1.5, hdRdT);
        // Borda dura: sulco escuro de 1,5 cm ao redor (a massa nova fica 2 mm à frente); sem ele a borda lê como borrão.
        float hdRemB = (smoothstep(-0.015 - hdRw2, 0.0, hdRdT) - smoothstep(0.0, 0.012 + hdRw2 * 1.5, hdRdT)) * hdLiv;
        hdReb = mix(hdReb, hdNeu * vec3(dot(hdReb, ${LUMA})) * (1.14 + 0.06 * hdM.r) * (0.96 + 0.08 * hdGm), 0.95 * hdRem) * (1.0 - 0.22 * hdRemB); hdAlt += 0.002 * hdRem * hdV9; hdRel *= 1.0 - 0.6 * hdRem;
        // Borda de rolo: sobreposição de tinta mais clara e com relevo, não só uma linha escura.
        float hdBord = hdRep * (1.0 - smoothstep(0.0, 0.02 + fwidth(hdY) * 1.5, hdY - hdLin)) * hdV9; hdAlt += 0.0012 * hdBord;
        hdReb *= mix(vec3(1.0), mix(vec3(1.08, 1.05, 0.97), vec3(0.93, 0.955, 1.03), step(0.78, hdS1)), hdRep * (1.0 - hdRem)) * (1.0 + 0.12 * hdBord);
        hdReb = mix(hdReb, hdReb * mix(vec3(0.88, 0.875, 0.87), vec3(0.84, 0.89, 0.90), step(0.81, hdS2)), hdBar * (1.0 - hdRem));
        // Permitido na faixa do corpo (≤ 10 cm de largura, -10 %): 2–3 escorridos finos por parede de 4 m descendo da cinta superior (hdY 2,95)
        // por 1,5–2,9 m (célula de 1,1 m, sorteio 85 %, largura 6–10 cm, ponta esfumada) e células de 20–40 cm a ±4 % (canal R a 0,95/m: 26 cm).
        { float hdFc = floor(hdQ.x / 1.1 + hdCs * 7.0), hdFx = (fract(hdQ.x / 1.1 + hdCs * 7.0) - mix(0.25, 0.75, hdH(vec2(hdFc, 9.0 + hdCs)))) * 1.1;
          float hdFw = 0.03 + 0.02 * hdH(vec2(hdFc, 11.0)), hdFl = 1.5 + 1.4 * hdH(vec2(hdFc, 13.0)), hdFo = 2.95 - hdFl;
          float hdFio = step(0.15, hdH(vec2(hdFc, 5.0 + hdCs))) * (1.0 - smoothstep(hdFw * 0.5, hdFw + fwidth(hdFx) * 1.5, abs(hdFx + 0.012 * (hdM.g - 0.5)))) * smoothstep(hdFo, hdFo + 0.5, hdY) * step(hdY, 2.97) * hdLiv * (0.75 + 0.25 * hdM.b);
          hdReb = hdUmido(hdReb, 0.35 * hdFio) * (1.0 - 0.10 * hdFio);
          float hdCel = texture2D(hdRuido, hdQ * 0.95 + hdCs * 9.0 + 0.61).r; hdReb *= 1.0 + 0.08 * (hdCel - 0.5) * hdLiv; } }` : ''}
      hdReb *= mix(vec3(1.0), hdBk.rgb, hdBl);
      diffuseColor.rgb *= mix(hdReb, hdTj.rgb * mix(1.0, hdFino, 0.45) * (0.92 + 0.16 * hdM.b) * mix(mix(0.80, 1.14, hdA.r), 0.97, hdCorpo), hdCr);
      hdAlt = mix(hdAlt, hdV9 * (0.007 * (1.0 - hdTj.a) + 0.0015 * hdFino) + hdV3 * 0.0008 * hdGf, hdCr) * (1.0 - 0.9 * vHdMi); hdRel = mix((1.0 + 0.24 * hdChapR * hdFamOn - 0.5 * hdLiso - 0.2 * hdSarr) * (1.0 - 0.35 * hdChap * hdLisoM), 0.7, hdCr) * (1.0 - 0.85 * vHdMi); hdRug = mix(mix(hdRug, mix(0.86, 1.0, hdTj.a), hdCr), 0.6, vHdMi);
      ${idade(o, SUBS.tijolo, o.rebocoPe, false, { k: 'hdSobre', cor: 'hdNeu * mix(vec3(1.0), hdPasV, 1.8) * 0.9' })} }`);
    ganchos(shader); };
  m.customProgramCacheKey = () => `lajes-hd-reboco76-${o.umidade}-${o.descasca}-${o.rebocoSombra}-${o.tijoloGrao}-${o.rebocoPe}-${o.rebocoFam}-${o.rebocoBorda}`;
}
// Tijolo aparente: mesma textura e UV do mapa; junta afundada, tom por fiada e por trecho, chapisco no pé e no alto.
// Na faixa do corpo sobra só a junta. hdAcab (?hdtijolo=0 desliga): docs/hd-kit/lajes.md#tijolo.
function tijoloHD(m, U, o) {
  m.onBeforeCompile = (shader) => { comMundo(shader, U, 0, 'uniform float hdGrao; uniform float hdAcab;'); shader.uniforms.hdGrao = { value: o.tijoloGrao ? .42 : 1 }; shader.uniforms.hdAcab = { value: o.tijoloGrao ? 1 : 0 };
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `${CABECA} { ${LOCAL}
      float hdCorpo = hdCorpoP(vHdPos), hdFora = 1.0 - hdCorpo; vec4 hdT = texture2D(map, vMapUv); vec3 hdTb = texture2D(map, vMapUv, 2.5).rgb;
      float hdMx = max(hdTb.r, max(hdTb.g, hdTb.b)), hdSat = (hdMx - min(hdTb.r, min(hdTb.g, hdTb.b))) / max(hdMx, 0.02);
      float hdJ = mix(1.0 - smoothstep(0.18, 0.40, hdSat), 1.0 - smoothstep(0.22, 0.44, hdSat), hdAcab);
      vec2 hdLu = vec2(vMapUv.x * 0.31, vMapUv.y * 1.78);
      vec2 hdLf = vec2(hdLu.x, (floor(fract(vMapUv.y) * 10.29) + 0.5) * 0.173 + floor(vMapUv.y) * 0.37); vec2 hdLh = vec2(hdLu.x * 1.45, hdLf.y + 0.5);
      #ifdef texture2DGradEXT
        float hdTom = texture2DGradEXT(hdRuido, hdLf, dFdx(hdLu), dFdy(hdLu)).g, hdHue = texture2DGradEXT(hdRuido, hdLh, dFdx(hdLu) * 1.45, dFdy(hdLu) * 1.45).a;
      #else
        float hdTom = texture2D(hdRuido, hdLf).g, hdHue = texture2D(hdRuido, hdLh).a;
      #endif
      vec4 hdMic = texture2D(hdRuido, hdQ * 5.3 + 0.11); float hdPx = fwidth(vMapUv.y) * 2.0, hdPerto = smoothstep(0.03, 0.008, hdPx);
      float hdFi = fract(vMapUv.y) * 10.29, hdRan = (0.5 + 0.5 * sin(hdFi * 43.98)) * smoothstep(0.012, 0.003, hdPx) * (1.0 - hdJ);
      float hdResp2 = hdAcab * hdFora * smoothstep(0.63, 0.70, hdA.g * 0.55 + hdM.a * 0.45);
      vec3 hdC = hdT.rgb * (1.0 + (hdTom - 0.5) * 0.9 * hdGrao * mix(1.0, 0.6, hdCorpo) * (1.0 - hdJ)) * mix(mix(0.80, 1.16, hdA.r), 0.95, hdCorpo);
      hdC = mix(vec3(dot(hdC, ${LUMA})), hdC, mix(0.74, 0.62, hdCorpo)) * mix(1.10, 0.92, hdCorpo) * (1.0 + (0.84 + 0.32 * hdMic.r - 1.0) * hdGrao) * (1.0 + (0.90 + 0.20 * hdMic.b - 1.0) * hdGrao) * (1.0 - 0.16 * hdGrao * hdRan);
      hdC *= mix(vec3(1.0), vec3(0.88, 0.80, 0.76), hdAcab * smoothstep(0.44, 0.30, hdSat) * (1.0 - hdJ));
      // Junta cinza-areia escura; a máscara vem da saturação da leitura desfocada (LOD 1,5), não do texel:
      // os grãos rosados da argamassa furam a máscara por texel. Ver docs/hd-kit/lajes.md#tijolo.
      vec3 hdMassa = mix(vec3(0.17, 0.165, 0.15), vec3(0.135, 0.125, 0.105) * mix(0.85, 1.12, hdA.a), hdAcab) * (1.0 + (0.80 + 0.40 * hdMic.b - 1.0) * hdGrao) * (1.0 + (0.86 + 0.28 * hdM.r - 1.0) * hdGrao);
      diffuseColor.rgb *= mix(mix(hdC, hdMassa, 0.92 * hdJ), hdMassa * 1.35, 0.75 * hdResp2);
      hdAlt = hdPerto * (0.007 * (1.0 - hdJ) * (1.0 - 0.7 * hdResp2) + 0.0016 * hdGrao * hdRan + 0.003 * hdResp2 + 0.0006 * hdMic.b * (1.0 - hdJ));
      hdRug = mix(mix(0.9, 1.0, hdJ), 1.0, hdResp2); hdRel = 1.7 * mix(0.6, 1.0, hdNitido()) * (1.0 - 0.6 * hdResp2);
      // Reboco parcial (emboço cinza) de borda irregular sobre o tijolo de catálogo: só acima de 2,08 m e abaixo de 0,46 m (zero na faixa do corpo,
      // hdBandaP), sulco escuro de ~2 cm na borda. Na faixa do corpo sobram 2–3 tijolos por m² com tom próprio (célula 29 x 19,3 cm, sorteio 14 %).
      { vec4 hdRpN = texture2D(hdRuido, hdQ * 0.085 + 0.45); float hdRpM = hdRpN.a * 0.7 + hdM.g * 0.3, hdRpW = max(fwidth(hdRpM) * 1.5, 0.004);
        float hdRpZ = max(smoothstep(2.08, 2.30, hdY), 1.0 - smoothstep(0.32, 0.46, hdY)) * (1.0 - hdBandaP(vHdPos));
        float hdRp = smoothstep(0.54, 0.54 + hdRpW, hdRpM) * hdRpZ, hdRpB = (smoothstep(0.515, 0.54, hdRpM) - smoothstep(0.54, 0.54 + hdRpW, hdRpM)) * hdRpZ;
        vec3 hdEmb = ${EMBOCO} * (0.9 + 0.2 * hdMic.r) * (0.96 + 0.08 * hdA.r);
        diffuseColor.rgb = mix(diffuseColor.rgb, hdEmb, hdRp) * (1.0 - 0.18 * hdRpB); hdAlt = mix(hdAlt, 0.0008 * hdMic.b, hdRp) + 0.004 * hdRp; hdRel *= 1.0 - 0.8 * hdRp; hdRug = mix(hdRug, 1.0, hdRp);
        // Tom por tijolo em 3 degraus (-7 / 0 / +7 %, célula 29 x 19,3 cm: miúdo, pode entrar na faixa do corpo),
        // 5 % de tijolos lascados no canto inferior e 7 % de juntas com argamassa vazada.
        float hdRow = floor(vMapUv.y * 10.29), hdCol = floor(vMapUv.x * 6.9 + 0.5 * mod(hdRow, 2.0)), hdTjH = hdH(vec2(hdCol, hdRow) + 0.37), hdTjH2 = hdH(vec2(hdRow, hdCol) + 0.91);
        float hdTjS = step(0.83, hdTjH) * (1.0 - hdJ) * hdPerto * (1.0 - hdRp), hdTj3 = floor(hdTjH2 * 2.999) - 1.0;
        vec2 hdTjF = vec2(fract(vMapUv.x * 6.9 + 0.5 * mod(hdRow, 2.0)), fract(vMapUv.y * 10.29));
        float hdLasca = step(0.95, hdTjH) * smoothstep(0.40, 0.25, hdTjF.x + hdTjF.y * 0.8 + 0.12 * (hdMic.a - 0.5)) * (1.0 - hdJ) * hdPerto * (1.0 - hdRp);
        float hdVaza = step(0.93, hdTjH2) * smoothstep(0.10, 0.04, min(hdTjF.x, 1.0 - hdTjF.x) * 0.29) * (1.0 - hdJ) * hdPerto * (1.0 - hdRp);
        diffuseColor.rgb *= mix(1.0, mix(0.80, 1.16, step(0.93, hdTjH)), hdTjS) * (1.0 + 0.07 * hdTj3 * hdPerto * (1.0 - hdJ)) * (1.0 - 0.38 * hdLasca);
        diffuseColor.rgb = mix(diffuseColor.rgb, hdMassa * 1.45, 0.8 * hdVaza);
        hdAlt -= 0.006 * hdLasca; hdAlt += 0.003 * hdVaza; }
      ${idade(o, o.tijoloGrao ? SUBS.chapiscoAcab : SUBS.chapisco)} }`);
    ganchos(shader); };
  m.customProgramCacheKey = () => `lajes-hd-tijolo69-${o.umidade}-${o.descasca}-${o.tijoloGrao}`;
}
// Concreto serve piso e parede (orientação pela derivada da posição, constante por triângulo); chão e concreto
// dividem o programa. hdPisoP = (lado da placa, limiar da poça, altura máxima com poça).
function concretoHD(m, r, U, o) {
  // ?hdpiso: -5 % só no chão da rua (regras com poça até 0,3 m); a laje andável mantém a luminância da placa.
  const k = (CONJ.piso.metros / CONJ.forma.metros).toFixed(4), piso = r.piso ? r.piso.map((v) => v * (o.pisoEscuro && r.concreto[2] < 1 ? .95 : 1)) : null;
  m.onBeforeCompile = (shader) => { comMundo(shader, U, CONJ.piso.metros, `${PISO_PARS}\nuniform sampler2D hdForma; uniform sampler2D hdFormaN;`);
    Object.assign(shader.uniforms, { hdForma: { value: tex(CONJ.forma.cor) }, hdFormaN: { value: tex(CONJ.forma.normal) }, hdPisoP: { value: new THREE.Vector3(...r.concreto) }, hdPisoT: { value: new THREE.Vector3(...(piso || [1, 1, 1])) }, hdPisoA: { value: new THREE.Vector3(...(r.amb || [1, 1, 1])) } });
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `${CABECA} float hdPoca = 0.0, hdMolhado = 0.0, hdCanal = 0.0; hdLuzRel = 0.8;
      float hdNy = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))).y, hdPiso = step(0.7, abs(hdNy));
      hdRel = mix(0.65, 1.0, hdNitido());
      if (hdPiso > 0.5) { vec4 hdT = texture2D(map, vMapUv, 0.5); hdRug = hdT.a;
        diffuseColor.rgb = hdCimentado((hdNy > 0.0 ? hdPisoT : diffuseColor.rgb) * hdT.rgb / ${v3(CONJ.piso.media)}, vHdPos.xz, hdNy > 0.0 ? vHdPos.y : 999.0, hdPoca, hdMolhado, hdCanal); hdAlt = -0.03 * hdCanal; }
      else { ${LOCAL}
        float hdCorpo = hdCorpoP(vHdPos), hdFora = 1.0 - hdCorpo; hdRug = 0.92;
        vec3 hdTf = texture2D(hdForma, vMapUv * ${k}).rgb, hdB = texture2D(hdForma, vMapUv * ${k}, 4.5).rgb; float hdFino = mix(1.0, pow(clamp(dot(hdTf, ${LUMA}) / max(dot(hdB, ${LUMA}), 0.02), 0.6, 1.12), mix(1.0, 1.3, hdCorpo)), mix(0.45, 1.0, hdRel));
        diffuseColor.rgb *= hdFino * (0.84 + 0.14 * hdM.b) * mix(min(hdB / ${v3(CONJ.forma.media)}, vec3(1.0)) * mix(0.76, 1.02, hdA.r) * mix(0.90, 1.03, hdM.r), vec3(0.90 + 0.06 * hdM.r), hdCorpo);
        // Parede de concreto/sarrafeado: ondulação de 30–60 cm (2 cm) por relevo; sem ela a parede fica chapada.
        hdAlt = 0.016 * (texture2D(hdRuido, hdQ * 0.17 + 2.0).a - 0.5) * (1.0 - 0.5 * hdCorpo);
        ${idade(o, null)} }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix(mix(roughness * hdRug, roughness * hdRug * 0.6, hdMolhado), mix(0.05, 0.2, hdCanal), hdPoca);')
      .replace('#include <normal_fragment_maps>', NORMAL.replace(/vec3 mapN = texture2D\( normalMap, vNormalMapUv \)\.xyz \* 2\.0 - 1\.0;/,
        `vec3 mapN; if (hdPiso > 0.5) mapN = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0; else mapN = texture2D(hdFormaN, vNormalMapUv * ${k}).xyz * 2.0 - 1.0;`) + '\nnormal = hdBump(normal, -vViewPosition, hdAlt);' + POCA.normal + SEM_FAISCA)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>${POCA.emissao}`)
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\nif (hdPiso > 0.5 && hdNy > 0.0) reflectedLight.indirectDiffuse *= hdPisoA;'); };
  m.customProgramCacheKey = () => `lajes-hd-concreto65-${o.umidade}`;
}
// Chapa: a onda do mapa corre em v; as caixas do mapa têm u ao longo da fachada, então troca os eixos (caimento).
function chapaHD(m, U, o) {
  m.onBeforeCompile = (shader) => { comMundo(shader, U);
    shader.uniforms.hdChapaVar = { value: o.chapaVariacao ? 1 : 0 };
    shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
      #ifdef USE_MAP
        vMapUv = uv.yx * 1.1;
      #endif
      #ifdef USE_NORMALMAP
        vNormalMapUv = uv.yx * 1.1;
      #endif`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float hdChapaVar;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        diffuseColor.rgb /= ${v3(CONJ.chapa.media)};
        vec4 hdCh = texture2D(hdRuido, vHdPos.xz * 0.075 + 0.37), hdCh2 = texture2D(hdRuido, vec2(vHdPos.xz.y * 0.11 + 4.1, vHdPos.y * 0.16));
        float hdPainel = hdCh.r * 0.72 + hdCh.g * 0.28, hdFerrugem = smoothstep(0.59, 0.82, hdCh2.a * 0.72 + hdCh.b * 0.28) * smoothstep(0.12, 0.88, fract(vHdPos.y * 0.18 + hdCh2.g * 0.35));
        diffuseColor.rgb *= 1.0 + hdChapaVar * (hdPainel - 0.5) * 0.32;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.25, 0.17, 0.11) * (0.72 + 0.42 * hdCh2.r), hdChapaVar * 0.20 * hdFerrugem);
        // A caixa de zinco do mapa tem 7,5 cm de espessura: a face de baixo fica em sombra e a borda vira o caibro de madeira
        // que segura a telha (sem isso a borda vista de perto é uma fita lisa flutuando).
        vec3 hdGz = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))); float hdBordaZ = hdChapaVar * smoothstep(0.45, 0.25, abs(hdGz.y)), hdRel = 1.0 - hdBordaZ;
        diffuseColor.rgb *= mix(1.0, 0.78, hdChapaVar * smoothstep(-0.15, -0.75, hdGz.y));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.17, 0.125, 0.09) * (0.7 + 0.6 * hdCh2.g) * (0.85 + 0.3 * hdCh.b), hdBordaZ);
        // Onda de zinco nas faces horizontais (passo 7,6 cm em x, 4 mm de relevo, ±9 % de albedo, some com a distância)
        // e vinco de 2 cm no beiral: sem ela a cobertura vista de baixo e a marquise leem como chapa lisa.
        float hdOnZ = (0.5 + 0.5 * sin(vHdPos.x * 82.67)) * smoothstep(0.02, 0.006, fwidth(vHdPos.x)) * smoothstep(0.25, 0.6, abs(hdGz.y)) * (1.0 - hdBordaZ);
        diffuseColor.rgb *= 1.0 + hdChapaVar * (0.18 * hdOnZ - 0.09);
        float hdAltZ = hdChapaVar * 0.004 * hdOnZ;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 1.0, hdBordaZ);')
      .replace('#include <normal_fragment_maps>', NORMAL + '\nnormal = hdBump(normal, -vViewPosition, hdAltZ);'); };
  m.customProgramCacheKey = () => `lajes-hd-chapa35-${o.chapaVariacao}`;
}

// Aço do mapa (`steel`: grades, corrimão, postes, batentes — o painel verde-escuro constante da pose `beco` é este material em sombra):
// chapa pintada em dois tons por folha de 0,9 m, desgaste, ferrugem só abaixo de 0,35 m e ondulação de chapa por relevo. ?hdaco=0 desliga.
function acoHD(m, U) {
  m.onBeforeCompile = (shader) => { comMundo(shader, U);
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `${CABECA} { float hdY = hdAndar(vHdPos), hdU1 = vHdPos.x + vHdPos.z;
      vec4 hdNq = texture2D(hdRuido, vec2(hdU1 * 0.8, vHdPos.y * 0.21)), hdNq2 = texture2D(hdRuido, vec2(hdU1 * 0.23, vHdPos.y * 0.9) + 0.4);
      float hdOn = (0.5 + 0.5 * sin(hdU1 * 82.0)) * smoothstep(0.03, 0.008, fwidth(hdU1)), hdTom2 = step(0.5, fract(hdU1 / 0.9 + 0.3));
      vec3 hdCor = mix(vec3(0.70, 0.82, 0.78), vec3(1.04, 1.0, 0.90), hdTom2) * (0.72 + 0.4 * hdNq.r + 0.2 * hdNq.a);
      float hdFer = smoothstep(0.35, 0.0, hdY + 0.1 * (hdNq2.g - 0.5)) * smoothstep(0.35, 0.65, hdNq2.a * 0.6 + hdNq.g * 0.4);
      diffuseColor.rgb *= mix(hdCor, vec3(0.22, 0.12, 0.07) * (0.7 + 0.5 * hdNq2.r) / max(diffuse, vec3(0.05)), 0.7 * hdFer) * (0.9 + 0.2 * hdOn);
      hdAlt = 0.004 * hdOn + 0.0015 * hdNq2.b; hdRug = mix(1.0, 1.3, hdFer); }`);
    ganchos(shader); };
  m.customProgramCacheKey = () => 'lajes-hd-aco1';
}
// Madeira: veio corrido no eixo mais comprido da caixa (hdEixo) e emenda de tábua a cada 14 cm.
function madeiraHD(m, U) {
  m.onBeforeCompile = (shader) => { comMundo(shader, U, 0, 'varying float vHdEixo;');
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute float hdEixo; varying float vHdEixo;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvHdEixo = hdEixo;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float hdAlt = 0.0; { float hdAl = vHdEixo < 0.5 ? vHdPos.x : (vHdEixo < 1.5 ? vHdPos.y : vHdPos.z), hdAc = vHdPos.x + vHdPos.y + vHdPos.z - hdAl, hdNit = hdNitido();
          vec4 hdG1 = texture2D(hdRuido, vec2(hdAc * 2.3, hdAl * 0.17)), hdG2 = texture2D(hdRuido, vec2(hdAc * 9.0, hdAl * 0.6) + 0.3);
          float hdVeio = hdG1.a * 0.55 + hdG2.a * 0.45, hdTb = abs(fract(hdAc / 0.14) - 0.5) * 0.14, hdEm = (1.0 - smoothstep(0.066, 0.069 + fwidth(hdAc), hdTb)) * smoothstep(0.03, 0.01, fwidth(hdAc));
          diffuseColor.rgb = (diffuseColor.rgb * 2.3 + 0.02) * (0.58 + 0.80 * hdVeio) * (0.9 + 0.2 * hdH(vec2(floor(hdAc / 0.14), 5.0)));
          diffuseColor.rgb = mix(diffuseColor.rgb, dot(diffuseColor.rgb, ${LUMA}) * vec3(0.98, 1.0, 1.02), 0.55 * smoothstep(0.45, 0.75, hdG1.g)) * (1.0 - 0.6 * hdEm);
          hdAlt = hdNit * (0.0025 * hdG2.a + 0.0015 * hdG2.b) - 0.004 * hdEm; }`)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = hdBump(normal, -vViewPosition, hdAlt);'); };
  m.customProgramCacheKey = () => 'lajes-hd-madeira60';
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
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHdJc = hdJc; vHdJs = hdJs;')
      // Tira de ferro (hdJs.z = -1): a caixa 4,5 x 1,8 x 78 cm do mapa vira 1,2 x 5 x 78 cm em volta do centro,
      // encostada à folha. O mesh fundido já está no mundo (modelMatrix = I).
      .replace('#include <project_vertex>', `#include <project_vertex>
      if (hdJs.z < -0.5) { vec3 hdE = hdJs.y < 1.0 ? vec3(0.27, 2.8, 1.0) : vec3(1.0, 2.8, 0.27); vec3 hdP = hdJc + (vHdPos - hdJc) * hdE; vHdPos = hdP;
        mvPosition = viewMatrix * vec4(hdP, 1.0); gl_Position = projectionMatrix * mvPosition; }`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float hdVid = 0.0, hdJan = 0.0, hdFres = 0.0, hdAlt = 0.0; vec3 hdRefl = vec3(0.0, 1.0, 0.0);
        vec3 hdGn = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))), hdV = normalize(vHdPos - cameraPosition);
        if (dot(hdGn, hdV) > 0.0) hdGn = -hdGn;
        vec3 hdTg = normalize(vec3(-hdGn.z, 0.0, hdGn.x) + 1e-5); float hdVn = max(-dot(hdV, hdGn), 0.15);
        vec2 hdQ = vec2(dot(vHdPos - vHdJc, hdTg), vHdPos.y - vHdJc.y) + vec2(dot(hdV, hdTg), hdV.y) * (${RECUO.toFixed(3)} / hdVn);
        vec2 hdS = max(vHdJs.xy, vec2(0.01)), hdU = hdQ / hdS * (0.47 + 0.03 * hdH(vHdJc.xz + 3.0)) + 0.5; float hdCel = floor(vHdJs.z);
        hdU.x = mix(hdU.x, 1.0 - hdU.x, step(0.25, fract(vHdJs.z)));
        if (hdCel > 4.5 && hdCel < 6.5) hdU.x = abs(fract(hdU.x * 0.5 * max(1.0, floor(hdS.x / hdS.y + 0.5))) * 2.0 - 1.0);
        vec4 hdTx = texture2D(hdJanelas, (vec2(mod(hdCel, 3.0), floor(hdCel / 3.0)) + clamp(vec2(hdU.x, 1.0 - hdU.y), 0.006, 0.994)) / 3.0);
        if (vHdJs.x > 0.0 && abs(hdGn.y) < 0.5) { hdJan = 1.0;
          vec2 hdA = abs(hdQ) - hdS; float hdId = hdH(floor(vHdJc.xz * 2.0) + floor(vHdJc.y * 2.0));
          if (max(hdA.x, hdA.y) > 0.0) {
            float hdLado = hdA.x > hdA.y ? 0.50 : (hdQ.y > 0.0 ? 0.14 : 1.0 - 0.45 * hdH(floor(hdQ.xx * 9.0)));
            vec4 hdNq = texture2D(hdRuido, hdQ * 0.9 + hdId * 7.3);
            diffuseColor.rgb = vec3(0.47, 0.455, 0.42) * (0.74 + 0.3 * hdNq.b + 0.22 * hdNq.a) * hdLado;
          } else { vec2 hdE = hdS - abs(hdQ); float hdSol = step(0.5, hdTx.a);
            hdAlt = hdSol > 0.5 ? (hdTx.a - 0.55) * 0.05 : hdTx.a * 0.008;
            diffuseColor.rgb = hdTx.rgb * (0.80 + 0.36 * hdId) * vec3(1.0 + 0.14 * (hdH(vHdJc.xz) - 0.5), 1.0 + 0.10 * (hdH(vHdJc.zy) - 0.5), 1.0 + 0.16 * (hdH(vHdJc.yx) - 0.5)) * (1.0 - 0.6 * smoothstep(0.24, 0.05, hdE.y) * step(0.0, hdQ.y));
            hdVid = 1.0 - hdSol; hdRefl = reflect(hdV, hdGn); hdFres = (0.12 + 0.88 * pow(1.0 - hdVn, 4.0)) * (hdTx.a < 0.03 ? 1.0 : 0.4); } }
        else if (vHdJs.z < -0.5) { float hdU1 = vHdPos.x + vHdPos.z; vec4 hdNq = texture2D(hdRuido, vec2(hdU1 * 1.7, vHdPos.y * 2.3));
          // Tira de ferro chato (dobradiça/travessa) com rebite a cada 26 cm, não barra preta chapada à frente da porta.
          float hdRiv = (1.0 - smoothstep(0.007, 0.013, abs(fract(hdU1 / 0.26 + 0.5) - 0.5) * 0.26)) * smoothstep(0.02, 0.006, fwidth(hdU1));
          diffuseColor.rgb = vec3(0.085, 0.08, 0.075) * (0.75 + 0.5 * hdNq.r) * (1.0 - 0.3 * smoothstep(0.55, 0.75, hdNq.a)) * (1.0 + 0.6 * hdRiv); hdAlt = 0.003 * hdRiv + 0.0008 * hdNq.b; hdJan = 1.0; }
        else if (abs(hdGn.y) < 0.5) { float hdU1 = vHdPos.x + vHdPos.z, hdOn = (0.5 + 0.5 * sin(hdU1 * 82.0)) * smoothstep(0.03, 0.008, fwidth(hdU1)), hdY2 = hdAndar(vHdPos);
          // Painel escuro que não é janela: chapa pintada em folhas de 90 cm com dois tons e sujeira;
          // ferrugem só no pé (< 35 cm, fora da faixa do corpo).
          vec4 hdNq = texture2D(hdRuido, vec2(hdU1 * 0.8, vHdPos.y * 0.21)), hdNq2 = texture2D(hdRuido, vec2(hdU1 * 0.23, vHdPos.y * 0.9) + 0.4);
          vec3 hdCor = mix(vec3(0.17, 0.21, 0.20), vec3(0.24, 0.25, 0.22), step(0.5, fract(hdU1 / 0.9 + 0.3))) * (0.70 + 0.4 * hdNq.r + 0.2 * hdNq.a);
          float hdFer = smoothstep(0.35, 0.0, hdY2 + 0.1 * (hdNq2.g - 0.5)) * smoothstep(0.35, 0.65, hdNq2.a * 0.6 + hdNq.g * 0.4);
          hdCor = mix(hdCor, vec3(0.22, 0.12, 0.07) * (0.7 + 0.5 * hdNq2.r), 0.7 * hdFer);
          diffuseColor.rgb = hdCor * (0.85 + 0.3 * hdOn); hdAlt = 0.006 * hdOn + 0.002 * hdNq2.b; hdJan = 1.0; }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(mix(roughnessFactor, 0.7, hdJan), 0.10, hdVid);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = hdBump(normal, -vViewPosition, hdAlt);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (hdVid > 0.0) totalEmissiveRadiance += hdVid * hdFres * 0.8 * min(${CUBO('hdRefl')}, vec3(4.0));`); };
  m.customProgramCacheKey = () => 'lajes-hd-janela62';
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
// Peso por tipo: basculante de ferro, veneziana e vitrô com grade pesam mais, senão o correr de alumínio domina.
const PESO_JANELA = [.09, .13, .16, .14, .14, .05, .05, .13, .11];
const h3 = (x, y, z) => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); };
function marcaJanelas(scene, mat) {
  const marcadas = [], janelas = [], todas = [], ultimo = new Map();
  porCaixa(scene, new Set([mat]), (o, n, cada) => { if (o.geometry.attributes.hdJc) return;
    const c = new Float32Array(n * 3), s = new Float32Array(n * 3);
    cada((i, mn, mx, d) => { const fino = d[0] < d[2] ? 0 : 2, larg = d[2 - fino];
      // Travessa/dobradiça de ferro chato do mapa (1,6–1,8 cm de altura, 78 cm de vão): hdJs = (0, eixo fino, -1); o vertex shader a achata em tira
      // de 1,2 cm x 5 cm em volta do próprio centro (hdJc) e o fragmento pinta ferro escuro com rebite.
      if (d[1] < .03 && d[fino] < .06 && larg > .4) { const cx = (mn[0] + mx[0]) / 2, cy = (mn[1] + mx[1]) / 2, cz = (mn[2] + mx[2]) / 2;
        for (let k = i; k < i + 24; k++) { c[k * 3] = cx; c[k * 3 + 1] = cy; c[k * 3 + 2] = cz; s[k * 3 + 1] = fino; s[k * 3 + 2] = -1; } return; }
      if (d[fino] > .07 || d[1] < .8 || larg < .8 || larg > 2 || d[1] > 1.6) return;
      const cx = (mn[0] + mx[0]) / 2, cy = (mn[1] + mx[1]) / 2, cz = (mn[2] + mx[2]) / 2;
      let tipo = 0; for (let a = h3(cx, cy, cz), k = 0; k < 9; k++) { a -= PESO_JANELA[k]; if (a < 0) { tipo = k; break; } }
      // Duas janelas vizinhas na mesma fachada (mesmo plano e andar) nunca repetem a célula: a clonagem é o que denuncia o atlas.
      const chave = `${fino}|${(fino === 0 ? cx : cz).toFixed(1)}|${Math.round(cy * 2)}`;
      if (ultimo.get(chave) === tipo) tipo = (tipo + 1 + Math.floor(h3(cz, cy, cx + 5) * 7)) % 9; ultimo.set(chave, tipo);
      const j = { x: cx, y: cy, z: cz, w: larg, h: d[1], e: d[fino], eixo: fino, tipo, grade: tipo < 4 && h3(cz, cx, cy + 3) < .5 };
      for (let k = i; k < i + 24; k++) { c[k * 3] = cx; c[k * 3 + 1] = cy; c[k * 3 + 2] = cz; s[k * 3] = larg / 2; s[k * 3 + 1] = d[1] / 2; s[k * 3 + 2] = tipo + (h3(cy, cz, cx) < .5 ? .5 : 0); }
      todas.push(j); if (o.name === 'lajes-alvenaria') janelas.push(j); });
    o.geometry.setAttribute('hdJc', new THREE.BufferAttribute(c, 3)); o.geometry.setAttribute('hdJs', new THREE.BufferAttribute(s, 3)); marcadas.push(o.geometry); });
  return { janelas, todas, desfaz() { for (const g of marcadas) { g.deleteAttribute('hdJc'); g.deleteAttribute('hdJs'); } } };
}
// A grade de aço do mapa é igual em todo vão: some onde o tipo sorteado não a usa. Quem some é um gêmeo desenhado;
// a malha do mapa fica só invisível, porque o índice de raycast dela (BUG-141) morre se a posição mudar.
function tiraGrades(scene, mats, janelas) {
  const gemeos = [];
  porCaixa(scene, mats, (o, n, cada) => { if (!o.visible || !o.parent) return; let g2 = null, pos = null;
    cada((i, mn, mx, d) => { if ([d[0], d[1], d[2]].filter((v) => v <= .07).length < 2) return;
      const cx = (mn[0] + mx[0]) / 2, cy = (mn[1] + mx[1]) / 2, cz = (mn[2] + mx[2]) / 2;
      const j = janelas.find((w) => !w.grade && Math.abs(cy - w.y) < w.h / 2 + .08 && (w.eixo === 0 ? Math.abs(cx - w.x) < .09 && Math.abs(cz - w.z) < w.w / 2 + .05 : Math.abs(cz - w.z) < .09 && Math.abs(cx - w.x) < w.w / 2 + .05));
      if (!j) return; if (!g2) { g2 = o.geometry.clone(); pos = g2.attributes.position; }
      for (let k = i + 1; k < i + 24; k++) pos.setXYZ(k, pos.getX(i), pos.getY(i), pos.getZ(i)); });
    if (!g2) return;
    const t = new THREE.Mesh(soltaAoSubir(g2), o.material); t.name = 'hd-aco'; t.castShadow = o.castShadow; t.receiveShadow = o.receiveShadow; t.renderOrder = o.renderOrder;
    t.matrixAutoUpdate = false; o.updateMatrix(); t.matrix.copy(o.matrix); t.raycast = () => {}; gemeos.push([o, t]); });
  for (const [o, t] of gemeos) { o.parent.add(t); o.visible = false; }
  return () => { for (const [o, t] of gemeos) { o.visible = true; t.removeFromParent(); t.geometry.dispose(); } };
}
// Acabamento por casa: ACAB dá ~1/3 de chapisco, pintado e liso; a ORDEM vem do hash do centro da casa (semente 12.5).
// h3 é caótico: 5 cm no centro de uma casa trocam tudo. hdMi e VIVAS: docs/hd-kit/lajes.md#acabamento-por-casa.
const VIVAS = [[3.1, 17.1, .96], [-17.85, -11, .98]];
function marcaMiudos(scene, mats, cols, placa = true) {
  const marcadas = [], casas = cols.filter((c) => c.casa), ACAB = [0, 1, 2, 1, 0, 2, 3, 1, 2, 0], acab = new Map(), viva = new Map();
  casas.map((c) => [h3((c.minX + c.maxX) / 2, 12.5, (c.minZ + c.maxZ) / 2), c]).sort((p, q) => p[0] - q[0]).forEach(([, c], r) => acab.set(c, ACAB[r % 10]));
  for (const [tx, tz, cs] of VIVAS) { let perto = null, dm = 1e9;
    for (const c of casas) { if (acab.get(c) !== 1) continue; const dd = Math.hypot((c.minX + c.maxX) / 2 - tx, (c.minZ + c.maxZ) / 2 - tz); if (dd < dm) { dm = dd; perto = c; } }
    if (perto) viva.set(perto, cs); }
  porCaixa(scene, mats, (o, n, cada) => { if (o.geometry.attributes.hdMi) return;
    const a = new Float32Array(n * 2), nrm = o.geometry.attributes.normal?.array ? o.geometry.attributes.normal : null;
    cada((i, mn, mx, d) => { const cx = (mn[0] + mx[0]) / 2, cz = (mn[2] + mx[2]) / 2, c = casas.find((k) => cx > k.minX - .35 && cx < k.maxX + .35 && cz > k.minZ - .35 && cz < k.maxZ + .35);
      const placaPorta = placa && d[1] > .13 && d[1] < .15 && Math.max(d[0], d[2]) < .06;
      const mi = placaPorta ? 2 : Math.max(d[0], d[1], d[2]) < .3 || Math.min(d[0], d[1], d[2]) < .02 ? 1 : 0, sorte = c ? h3((c.minX + c.maxX) / 2, 1.7, (c.minZ + c.maxZ) / 2) : h3(Math.round(cx / 7), 3.1, Math.round(cz / 7));
      const s = c && viva.has(c) ? (1 + viva.get(c) + .01 * sorte) / 4 : ((c ? acab.get(c) : Math.floor(sorte * 2.999)) + .05 + .9 * sorte) / 4, hh = Math.min(1023, Math.round(d[1] * 50));
      for (let k = i; k < i + 24; k++) { const nx = nrm ? Math.abs(nrm.getX(k)) : 0, nz = nrm ? Math.abs(nrm.getZ(k)) : 0, hw = Math.min(2047, Math.round((nx > .5 ? d[2] : nz > .5 ? d[0] : 0) * 50));
        a[k * 2] = mi + 4 * hw + 8192 * hh; a[k * 2 + 1] = s; } });
    o.geometry.setAttribute('hdMi', new THREE.BufferAttribute(a, 2)); marcadas.push(o.geometry); });
  return () => { for (const g of marcadas) g.deleteAttribute('hdMi'); };
}
function marcaEixos(scene, mats) {
  const marcadas = [];
  porCaixa(scene, mats, (o, n, cada) => { if (o.geometry.attributes.hdEixo) return;
    const a = new Float32Array(n); cada((i, mn, mx, d) => a.fill(d[1] >= d[0] && d[1] >= d[2] ? 1 : d[0] >= d[2] ? 0 : 2, i, i + 24));
    o.geometry.setAttribute('hdEixo', new THREE.BufferAttribute(a, 1)); marcadas.push(o.geometry); });
  return () => { for (const g of marcadas) g.deleteAttribute('hdEixo'); };
}
// Placa do mapa: polygonOffset contra o z-fighting e, nas duas de loja, letreiro refeito com mais resolução
// (o texto vem de map_lajes_authored.js; a placa original volta em desliga()).
function soltaPlacas(scene) {
  const feitas = [];
  scene.traverse((o) => { const m = o.material; if (!o.isMesh || !m || Array.isArray(m) || m.polygonOffset || o.geometry.type !== 'PlaneGeometry' || !m.map || !m.map.isCanvasTexture || !m.isMeshStandardMaterial) return;
    const { width: w, height: h } = o.geometry.parameters, antes = m.map; let nova = null;
    if (w > 2 && h < .6) { const c = document.createElement('canvas'), g = c.getContext('2d'); c.width = 2048; c.height = Math.round(2048 * h / w);
      g.fillStyle = '#385d55'; g.fillRect(0, 0, c.width, c.height); g.strokeStyle = '#f0deae'; g.lineWidth = 6; g.strokeRect(16, 16, c.width - 32, c.height - 32);
      const rr = (() => { let s = 1711; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
      pintaLetreiro(g, rr, o.getWorldPosition(new THREE.Vector3()).x < 0 ? 'MERCEARIA DA PRAÇA' : 'BAR DO LARGO', 60, c.height / 2, c.width - 120, Math.round(c.height * .5), '#f0deae');
      nova = new THREE.CanvasTexture(c); nova.colorSpace = THREE.SRGBColorSpace; nova.anisotropy = 8; nova.name = 'hd-placa'; m.map = nova; }
    m.polygonOffset = true; m.polygonOffsetFactor = -3; m.polygonOffsetUnits = -3; feitas.push([m, antes, nova]); });
  return () => { for (const [m, antes, nova] of feitas) { m.polygonOffset = false; m.polygonOffsetFactor = 0; m.polygonOffsetUnits = 0; m.map = antes; nova?.dispose(); } };
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
function luzLajes(scene, U, { hemi = .68, ceu = 0xd0dcea, chao = 0xcfc0a4, solGanho = 4.0, solDir = [.27, .84, .47], nuvens = true } = {}) {
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
  const hdq = new URLSearchParams(location.search);
  scene.traverse((o) => {
    if (!o.isMesh) return;
    if (o.userData.lajesDoor === true && !Array.isArray(o.material)) portas.push(o);
    for (const m of materiaisDe(o)) if (m.name && m.isMeshStandardMaterial) (porNome.get(m.name) || porNome.set(m.name, new Set()).get(m.name)).add(m);
  });
  const antes = [], criadas = [], aniso = [], ruido = ruidoTex();
  const U = { hdRuido: { value: ruido }, hdCob: { value: null }, hdCuboB: { value: null }, hdCuboA: { value: null }, hdJanelas: { value: null } };
  const o = {
    umidade: opts.umidade !== false, descasca: opts.descasca !== false,
    tijoloGrao: opts.tijoloGrao !== false && hdq.get('hdtijolo') !== '0',
    rebocoSombra: opts.rebocoSombra !== false && hdq.get('hdreboco') !== '0',
    pisoEscuro: opts.pisoEscuro !== false && hdq.get('hdpiso') !== '0',
    chapaVariacao: opts.chapaVariacao !== false && hdq.get('hdchapa') !== '0',
    rebocoPe: opts.rebocoPe !== false && hdq.get('hdpe') !== '0',
    rebocoFam: opts.rebocoFam !== false && hdq.get('hdfam') !== '0',
    rebocoBorda: opts.rebocoBorda !== false && hdq.get('hdborda') !== '0',
  };
  const doKit = (m) => !!REGRAS[m.name] || /^hd-/.test(m.name);
  const cubos = opts.reflexos === false || opts.texturas === false ? null : reflexos(scene, renderer, U, () => vivo, doKit);
  const cob = opts.texturas === false ? null : cobertura(scene, renderer, U, () => vivo);
  let janelas = { janelas: [], todas: [], desfaz() {} }, tiraMiudos = () => {}, tiraEixos = () => {}, voltaGrades = () => {};
  const mundo = opts.mundo || window.__game?.world, prendePlacas = soltaPlacas(scene);
  if (opts.texturas !== false) {
    for (const [nome, r] of Object.entries(REGRAS)) for (const m of porNome.get(nome) || []) {
      antes.push({ m, map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap, bumpMap: m.bumpMap, cor: m.color.getHex(), roughness: m.roughness,
        metalness: m.metalness, ns: m.normalScale.x, obc: m.onBeforeCompile, key: m.customProgramCacheKey });
      const conj = r.reboco ? 'reboco' : r.concreto ? 'piso' : r.chapa ? 'chapa' : null;
      if (conj) { m.map = tex(CONJ[conj].cor); m.normalMap = tex(CONJ[conj].normal); m.roughnessMap = null; m.roughness = 1; }
      if (r.cor !== undefined) m.color.setHex(r.cor);
      if (r.relevo && m.normalMap) m.normalScale.set(r.relevo, r.relevo);
      if (r.rugosidade !== undefined) m.roughness = r.rugosidade;
      if (r.metal !== undefined) m.metalness = r.metal;
      if (r.tijolo) m.roughnessMap = null;
      if (r.reboco) rebocoHD(m, r, U, o);
      if (r.tijolo) tijoloHD(m, U, o);
      if (r.concreto) concretoHD(m, r, U, o);
      if (r.chapa) chapaHD(m, U, o);
      if (r.madeira) madeiraHD(m, U);
      if (r.aco && hdq.get('hdaco') !== '0') acoHD(m, U);
      if (r.janela && opts.janelas !== false) { if (!U.hdJanelas.value) criadas.push(U.hdJanelas.value = atlasJanelas()); janelas = marcaJanelas(scene, m); janelaHD(m, U); }
      for (const t of [m.map, m.normalMap]) if (t && t.anisotropy < 8) { aniso.push([t, t.anisotropy]); t.anisotropy = 8; t.needsUpdate = true; }
      // dispose() solta os programas antigos do material (o three guarda todas as variantes até lá).
      m.dispose(); m.needsUpdate = true;
    }
    if (janelas.todas.length) voltaGrades = tiraGrades(scene, porNome.get('steel') || new Set(), janelas.todas);
    tiraMiudos = marcaMiudos(scene, new Set(Object.entries(REGRAS).filter(([, r]) => r.reboco).flatMap(([nome]) => [...(porNome.get(nome) || [])])), mundo?.colliders || [], opts.placaPorta !== false && hdq.get('hdplaca') !== '0');
    tiraEixos = marcaEixos(scene, porNome.get('timber') || new Set());
  }
  // Portas: tipo e tinta sorteados pela posição; grade e corrimão ficam no aço liso. PORTA_FIXA força o tipo nas duas
  // portas da pose `beco` (x 0,9; z 15,5 = aço de enrolar; z 9,8 = chapa com postigo). Ver docs/hd-kit/lajes.md#portas.
  const PORTA_FIXA = hdq.get('hdportafixa') === '0' ? [] : [[.905, 15.515, 4], [.905, 9.765, 0]];
  const trocas = [], vergas = []; let cadeados = null;
  if (opts.portas !== false && portas.length) {
    const atlas = atlasPortas(), mats = new Map(), v = new THREE.Vector3(), bb = new THREE.Box3(); criadas.push(atlas);
    for (const p of portas) { p.getWorldPosition(v); const fixa = PORTA_FIXA.find(([x, z]) => Math.abs(v.x - x) < .05 && Math.abs(v.z - z) < .05);
      const tipo = fixa ? fixa[2] : Math.floor(h3(v.x, v.y, v.z) * 5), tinta = Math.floor(h3(v.z, v.x, 7) * TINTAS_PORTA.length), k = tipo * 10 + tinta;
      if (!mats.has(k)) { const m = new THREE.MeshStandardMaterial({ map: atlas, metalness: .1, roughness: .8, name: 'hd-porta' }); portaHD(m, tipo, new THREE.Color(TINTAS_PORTA[tinta])); m.userData.hdTipo = tipo; mats.set(k, m); criadas.push(m); }
      // Porta de madeira velha (tipo 2) do beco central ganha verga de concreto na cenografia (hd-fachada):
      // aqui vai a caixa do vão em mundo + a normal da fachada.
      if (tipo === 2 && p.userData.facadeNormal && Math.abs(v.x) < 1.2) { bb.setFromObject(p); vergas.push({ x: (bb.min.x + bb.max.x) / 2, z: (bb.min.z + bb.max.z) / 2, y: bb.max.y, w: Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z), nx: p.userData.facadeNormal[0], nz: p.userData.facadeNormal[2] }); }
      trocas.push([p, p.material]); p.material = mats.get(k); }
    // Cadeado (5,5 cm) na trava desenhada no atlas (TRAVA: u ao longo da folha, v do piso), encostado à folha (≤ 1 cm)
    // e só nas duas portas que a pose `beco` vê a menos de 3,5 m; ?hdcadeado=0 tira.
    const TRAVA = { 2: [.40, 1.044, -.06], 3: [-.365, .989, -.07], 4: [-.22, .064, -.03] };
    if (hdq.get('hdcadeado') !== '0') { const F = fundidor(), cx = new THREE.Box3(), V = (x, y, z) => new THREE.Vector3(x, y, z); let n = 0;
      for (const p of portas) { const nm = p.userData.facadeNormal, t = TRAVA[p.material.userData.hdTipo]; if (!nm || !t) continue; cx.setFromObject(p); cx.getCenter(v);
        if (Math.abs(v.x) > 1.2 || Math.hypot(v.x + 2, v.z - 17) > 3.5) continue;
        const ux = Math.abs(nm[2]), uz = Math.abs(nm[0]), x = v.x + nm[0] * .035 + ux * t[0], z = v.z + nm[2] * .035 + uz * t[0], y = cx.min.y + t[1] + t[2];
        F.cor(0x2a2623).caixa(x, y, z, .025 + ux * .03, .055, .025 + uz * .03).cor(0x8d9290).tubo([V(x - ux * .015, y + .05, z - uz * .015), V(x - ux * .015, y + .085, z - uz * .015), V(x + ux * .015, y + .085, z + uz * .015), V(x + ux * .015, y + .05, z + uz * .015)], .005, 4);
        // Aço de enrolar (tipo 4): corrente galvanizada do furo do trilho (u -0,43; 0,40 m) até o cadeado do pé,
        // e um segundo cadeado no trilho.
        if (p.material.userData.hdTipo === 4) { const pts = [], x0 = v.x + nm[0] * .03, z0 = v.z + nm[2] * .03;
          for (let i = 0; i <= 10; i++) { const k = i / 10, u = -.43 + .21 * k * k, yy = cx.min.y + .40 - .31 * k, w = (i % 2 ? 1 : -1) * .006; pts.push(V(x0 + ux * u + nm[0] * w, yy, z0 + uz * u + nm[2] * w)); }
          F.cor(0x8d9290, .9).tubo(pts, .005, 4).cor(0x2a2623).caixa(x0 + ux * -.43, cx.min.y + .40, z0 + uz * -.43, .022 + ux * .03, .05, .022 + uz * .03); }
        n++; }
      if (n) { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .55, metalness: .35, name: 'hd-cadeado' }); cadeados = new THREE.Mesh(F.geo(), m); cadeados.name = 'hd-cadeados'; cadeados.raycast = () => {}; scene.add(cadeados); criadas.push(m); } }
  }
  // Placa pintada do mercadinho (decalque) segue o mesmo interruptor do toldo: opts.loja === false ou ?hdloja=0.
  const comLoja = opts.loja !== false && hdq.get('hdloja') !== '0';
  const evita = [], pixo = opts.pichacao === false || opts.texturas === false ? null : pichacoes(scene, mundo, U, evita, janelas.janelas, { loja: comLoja });
  // Cenografia sem colisão (hd_cenografia_lajes.js): opts.cenografia === false ou ?hdcen=0 desliga tudo; por item,
  // opts.cenografia.<item> === false ou ?hdcen=<lista>. Tabela completa: docs/hd-kit/lajes.md#interruptores.
  const q = hdq, qCen = q.get('hdcen'), soEstes = qCen && qCen !== '0' && qCen !== '1' ? qCen.split(',') : null;
  const oCen = opts.cenografia === false || qCen === '0' ? null : { ...(opts.cenografia || {}) };
  if (oCen && soEstes) for (const k of ['morro', 'fios', 'telhados', 'fachada', 'vasos', 'props', 'sombras']) if (!soEstes.includes(k)) oCen[k] = false;
  if (oCen && q.get('hdnevoa') === '0') oCen.atmosfera = false;
  if (oCen && q.get('hdprops') === '0') oCen.props = false;
  if (oCen && q.get('hdsombra') === '0') oCen.sombras = false;
  if (oCen && q.get('hddenso') === '0') oCen.denso = false;
  if (oCen && q.get('hdcaixa') === '0') oCen.caixas = false;
  if (oCen && q.get('hdvaral') === '0') oCen.varal = false;
  if (oCen && !comLoja) oCen.loja = false;
  const cen = oCen ? cenografiaLajes(scene, { ...oCen, janelas: janelas.janelas, ruido: U.hdRuido, evita, vergas }) : null;
  // ?hdsol=1: sol alinhado ao beco (faixa de sol no chão do beco; em troca as fachadas da laje ficam em sombra).
  const desfazLuz = opts.luz === false ? () => {} : luzLajes(scene, U, { ...(q.get('hdsol') === '1' ? { solDir: [.24, .8, -.55] } : {}), nuvens: !!oCen && oCen.nuvens !== false, ...(opts.luz || {}) });
  return { alvos: [...porNome.keys()].filter((n) => REGRAS[n]), portas: portas.length, cenografia: cen, janelas: janelas.janelas.length, pichacao: pixo?.info, reflexos: cubos, cobertura: cob, desliga() {
    vivo = false;
    for (const s of antes) { Object.assign(s.m, { map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, bumpMap: s.bumpMap, roughness: s.roughness,
      metalness: s.metalness, onBeforeCompile: s.obc, customProgramCacheKey: s.key }); s.m.color.setHex(s.cor); s.m.normalScale.set(s.ns, s.ns); s.m.dispose(); s.m.needsUpdate = true; }
    for (const [p, m] of trocas) p.material = m;
    for (const [t, an] of aniso) { t.anisotropy = an; t.needsUpdate = true; }
    for (const c of criadas) c.dispose();
    janelas.desfaz(); voltaGrades(); tiraMiudos(); tiraEixos(); prendePlacas(); pixo?.desliga(); cubos?.desliga(); cob?.desliga(); desfazLuz(); cen?.desliga(); ruido.dispose();
    if (cadeados) { scene.remove(cadeados); cadeados.geometry.dispose(); }
  } };
}
