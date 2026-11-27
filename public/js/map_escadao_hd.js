// Kit visual HD do Escadão, atrás de ?hd=1 (desligado por padrão). O mapa não nomeia materiais: casa por regraDe; tudo volta em desliga().
// Interruptores ?hd*=0 e chaves de casamento: docs/hd-kit/escadao.md#interruptores e #materiais.
import * as THREE from 'three';
import { pbrTex, materiaisDe } from './map_sertao_hd.js';
import { ruidoTex, RUIDO_PARS } from './hd_cenografia_lajes.js';
import { atlasJanelas, atlasPortas } from './hd_detalhes_lajes.js';
import { cenografiaEscadao } from './hd_cenografia_escadao.js';

// Conjuntos CC0 de public/img/textures/hd_lajes (nenhuma textura nova: hd_escadao/FONTE.md). `media` = cor média
// linear do mapa; o shader divide por ela, então `cor` do material é o albedo final. `cor_rug` leva rugosidade no alfa.
const CONJ = { reboco: { media: [.523, .471, .406], metros: 1.7 }, piso: { media: [.142, .126, .095], metros: 1.9 }, forma: { media: [.147, .129, .105], metros: 1.8 } };
const tex = (conj, mapa) => pbrTex(`hd_lajes/${conj}_${mapa}`, mapa !== 'normal');
const v3 = (a) => `vec3(${a.map((n) => n.toFixed(4)).join(', ')})`;
const LUMA = 'vec3(0.3, 0.59, 0.11)';
// Paleta: as 4 cores autorais das PAREDES viram azul desbotado, branco de cal, ocre e verde-musgo (mais escuras e
// saturadas do que o alvo: o AgX lava cor clara). Cimento e guarda ficam cinza de reboco de cimento.
const PALETA = { 0x8ba7a4: 0x7a98a4, 0xd7ccb1: 0xd9d4c6, 0xbf9176: 0xb8876a, 0xa9b38d: 0x8fa07a };
const REGRAS = {
  reboco: { reboco: true, relevo: .9, remendo: 1, descasca: 1, cru: 1, umid: .5 },
  cimento: { reboco: true, cor: 0xa6a59f, relevo: .8, remendo: .6, descasca: .4, cru: 0, umid: .7 },
  guarda: { reboco: true, cor: 0xaaa79c, relevo: .8, remendo: .5, descasca: .3, cru: 0, umid: 1 },
  degrau: { concreto: true, piso: [.206, .200, .183], parede: [.20, .195, .18], junta: 0, nariz: 1 },
  concreto: { concreto: true, piso: [.200, .193, .175], parede: [.38, .37, .34], junta: 1, nariz: 0 },
  concretoEscuro: { concreto: true, piso: [.10, .098, .09], parede: [.29, .285, .27], junta: 1, nariz: 0 },
  tijolo: { tijolo: true }, vidro: { janela: true }, porta: { porta: true }, ferro: { ferro: true }, zinco: { chapa: true },
};
const h3 = (x, y, z) => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); };
// Saturação HSV do hex (0–1): decide se a caixa pode receber cimento queimado (S < 0,15: cinza/bege).
const satDeHex = (h) => { const r = (h >> 16) & 255, g = (h >> 8) & 255, b = h & 255, mx = Math.max(r, g, b); return mx ? (mx - Math.min(r, g, b)) / mx : 0; };

const HASH = 'float hdH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }';
// Relevo por altura (em metros) sem textura extra: inclinação pela derivada de tela.
const BUMP = `vec3 hdBump(vec3 n, vec3 p, float h){ vec2 d = vec2(dFdx(h), dFdy(h)); vec3 sx = dFdx(p), sy = dFdy(p), r1 = cross(sy, n), r2 = cross(n, sx); float det = dot(sx, r1);
    return abs(det) < 1e-12 ? n : normalize(abs(det) * n - sign(det) * (d.x * r1 + d.y * r2)); }`;
// hdChao = piso jogável aproximado (cotas de map_escadao.js: lances de 3,48 m e 2,52 m); a altura local do fragmento
// conta da base da própria caixa (hdJc/hdJs) ou desse piso, o que for mais alto. Faixa do corpo: 0,6 a 1,9 m.
const PARS = `varying vec3 vHdPos; varying vec3 vHdJc; varying vec3 vHdJs; varying vec2 vHdVar; varying float vHdInst;
  ${RUIDO_PARS}
  uniform sampler2D hdCob;
  ${BUMP}
  vec3 hdUmido(vec3 c, float k){ return mix(c, dot(c, ${LUMA}) * vec3(0.54, 0.57, 0.47), k); }
  vec3 hdBarro(vec3 c, float k){ return mix(c, dot(c, ${LUMA}) * vec3(0.58, 0.56, 0.52), k); }
  float hdFaixaCorpo(float y){ return smoothstep(0.40, 0.55, y) * (1.0 - smoothstep(2.0, 2.2, y)); }
  float hdVis(float tam, vec2 q){ return clamp(tam / max(max(fwidth(q.x), fwidth(q.y)), 1e-6) - 1.0, 0.0, 1.0); }
  // Grão de alta frequência: hdRuido com UV escalado (canal r: sem o quadriculado de texel do canal b); 2º tap girado só com
  // período ≥ 2,5 px. per = período em metros; devolve 0–1. Ver docs/hd-kit/escadao.md#grao.
  float hdGraoP(vec2 q, float per){ float fw = max(max(fwidth(q.x), fwidth(q.y)), 1e-6), vis = smoothstep(1.0, 2.5, per / fw);
    vec2 u = q / (per * 32.0); float g = texture2D(hdRuido, u).r;
    if (vis > 0.01) g = 0.5 * g + 0.5 * texture2D(hdRuido, vec2(u.y, -u.x) * 1.7 + 0.37).g;
    return mix(0.5, g, vis); }
  float hdNitido(){ return smoothstep(0.014, 0.004, max(length(dFdx(vHdPos)), length(dFdy(vHdPos)))); }
  float hdRampa(float z, float z1, float yb){ return yb + 2.52 * clamp((z1 - z) / 3.48, 0.0, 1.0); }
  float hdChao(vec3 p){ float ax = abs(p.x);
    if (p.z <= -5.44) return 7.56;
    if (p.x > -13.6 && p.x < -10.4) { if (p.z <= -1.96) return hdRampa(p.z, -1.96, 5.04); if (p.z <= 1.84) return 5.04; if (p.z <= 5.32) return hdRampa(p.z, 5.32, 2.52); }
    if (p.z <= 3.04 && p.z > -1.96 && p.x > -10.5 && p.x < 2.4) return 5.04;
    if (ax >= 8.9 && ax <= 15.1) { if (p.z >= 7.52 && p.z <= 11.0) return hdRampa(p.z, 11.0, 0.0); if (p.z >= 5.32 && p.z < 7.52) return 2.52; }
    if (ax < 8.9 && p.z >= 5.32 && p.z <= 10.52) return 2.52;
    if (ax <= 3.0) { if (p.z <= -1.96) return hdRampa(p.z, -1.96, 5.04); if (p.z > 3.04 && p.z <= 6.52) return hdRampa(p.z, 6.52, 2.52); if (p.z > 10.52 && p.z <= 14.0) return hdRampa(p.z, 14.0, 0.0); }
    return 0.0; }
  float hdAltura(vec3 p){ float base = vHdJs.y > 0.001 ? vHdJc.y - vHdJs.y : -1000.0; return p.y - max(base, hdChao(p)); }
  float hdAltoBox(){ return vHdJs.y > 0.001 ? smoothstep(0.7, 1.0, vHdJs.y) : 1.0; }
  // Canaleta lateral dos lances: distância (m) ao eixo da água (1,55 m do eixo central; 1,29 m do eixo do lance auxiliar); 10 = fora.
  float hdCanalD(vec3 p){ float ax = abs(p.x), d = 10.0;
    if (ax < 1.9 && ((p.z > 10.5 && p.z < 14.05) || (p.z > 3.0 && p.z < 6.55) || (p.z > -5.5 && p.z < -1.9))) d = abs(ax - 1.55);
    float bx = abs(ax - 12.0); if (bx < 1.6 && ((p.z > 7.4 && p.z < 11.1) || (p.x < 0.0 && ((p.z > 1.8 && p.z < 5.35) || (p.z > -5.5 && p.z < -1.9))))) d = min(d, abs(bx - 1.29));
    return d; }
  // Canaleta de esgoto de 15 cm no EIXO dos 3 lances centrais: distância ao eixo x = 0 (10 = fora dos lances).
  float hdCanalC(vec3 p){ float ax = abs(p.x); return ax < 1.9 && ((p.z > 10.5 && p.z < 14.05) || (p.z > 3.0 && p.z < 6.55) || (p.z > -5.5 && p.z < -1.9)) ? ax : 10.0; }
  // Poça rasa no patamar 1 (piso y = 2,53): elipse 1,24 x 0,84 m em (0,85; 8,55), borda ±4 cm; .x = água, .y = halo úmido (10 cm).
  vec2 hdPoca(vec2 p, float y, vec4 n){ if (abs(y - 2.53) > 0.08) return vec2(0.0); vec2 d = (p - vec2(0.85, 8.55)) / vec2(0.62, 0.42);
    float r = length(d) + 0.07 * (n.g - 0.5) + 0.05 * (n.r - 0.5); return vec2(1.0 - smoothstep(0.96, 1.0, r), 1.0 - smoothstep(1.0, 1.28, r)); }
  // Trinca: célula de 1,7 m, posição e sorteio (38 %) por célula E por caixa (cs): nunca repete a cada 1,7 m no mesmo bloco.
  float hdTrinca(vec2 q, float w, float cs){ float c = floor(q.x / 1.7), k = cs * 7.0, fx = q.x - (c + 0.5) * 1.7, l = fwidth(q.x);
    return (1.0 - smoothstep(0.003, 0.005 + l * 1.2, abs(fx - (hdH(vec2(c, 5.0 + k)) - 0.5) * 1.3 - (w - 0.5) * 0.3))) * step(0.62, hdH(vec2(c, 3.0 + k))) * smoothstep(0.03, 0.008, l); }
  // Parede: comprimento ≤ 1,2 m (centro sorteado entre 0,5 e 2,2 m de altura local y): nunca atravessa a parede inteira.
  float hdTrinca(vec2 q, float w, float cs, float y){ float yc = 0.5 + 1.7 * hdH(vec2(floor(q.x / 1.7), 9.0 + cs * 7.0));
    return hdTrinca(q, w, cs) * (1.0 - smoothstep(0.45, 0.6, abs(y - yc))); }
  // Média frequência (15–40 cm) sem ladrilho: hdM (1,2 m) e uma 2ª leitura girada 31° em 1,64 m; a média das duas não repete.
  vec4 hdMeio(vec2 q, float cs){ return texture2D(hdRuido, mat2(0.523, 0.314, -0.314, 0.523) * q + 0.11 + cs * 5.0); }
  // Dois remendos de cimento no piso do mirante (posições fixas, borda com ±3 cm de ruído).
  float hdRemendo(vec2 p, vec4 n){ float r = 0.0;
    for (int i = 0; i < 2; i++) { vec2 c = i == 0 ? vec2(3.1, -27.6) : vec2(-3.4, -25.5), h = i == 0 ? vec2(0.62, 0.45) : vec2(0.48, 0.70);
      vec2 d = abs(p - c) - h + 0.06 * (n.gb - 0.5); r = max(r, 1.0 - smoothstep(-0.02, 0.02, max(d.x, d.y))); } return r; }
  vec4 hdTijolo(vec2 q, float n, float v){ vec2 b = vec2(q.x / 0.29 + 0.5 * floor(q.y / 0.193), q.y / 0.193), f = abs(fract(b) - 0.5), px = fwidth(q);
    float ja = smoothstep(0.035, 0.012, max(px.x, px.y)), jf = smoothstep(0.05, 0.02, px.y);
    float j = max((1.0 - smoothstep(0.006, 0.008 + px.x, (0.5 - f.x) * 0.29)) * ja, (1.0 - smoothstep(0.006, 0.008 + px.y, (0.5 - f.y) * 0.193)) * jf);
    vec3 c = vec3(0.25, 0.105, 0.072) * (1.0 + v * (hdH(floor(b)) - 0.5) * ja) * (1.0 - 0.10 * ja * step(0.5, fract(b.y * 5.0))) * (0.84 + 0.32 * n);
    return vec4(mix(c, vec3(0.27, 0.265, 0.25) * (0.8 + 0.4 * n), max(j, 0.13 * (1.0 - jf))), j); }
  vec4 hdBloco(vec2 q, float v){ vec2 b = vec2(q.x / 0.40 + 0.5 * floor(q.y / 0.20), q.y / 0.20), f = abs(fract(b) - 0.5), px = fwidth(q);
    float ja = smoothstep(0.06, 0.02, max(px.x, px.y));
    float j = max(1.0 - smoothstep(0.005, 0.008 + px.x, (0.5 - f.x) * 0.40), 1.0 - smoothstep(0.005, 0.008 + px.y, (0.5 - f.y) * 0.20)) * ja;
    return vec4(mix(vec3(0.80 + v * (hdH(floor(b)) - 0.5) * ja), vec3(1.04, 1.02, 0.98), j), j); }
  // Tijolo baiano 19 x 14 cm (passo 21 x 16), junta ESCURA de 1 cm, croma ×1,2; remendo e pó (12 %) só fora do corpo. rgb = albedo,
  // a = relevo em metros, jun = máscara da junta. Mesma escala em tijoloHD e casaTijoloHD. Ver docs/hd-kit/escadao.md#tijolo.
  vec4 hdBaiano(vec2 q, float cs, float corpo, vec4 a, vec4 m, out float jun){ vec4 mic = texture2D(hdRuido, q * 5.3 + 0.11); float fora = 1.0 - corpo;
    vec2 px = fwidth(q); float ja = smoothstep(0.03, 0.01, max(px.x, px.y)), qy = q.y + 0.004 * sin((q.x + cs * 3.0) * 2.7 + floor(q.y / 0.16) * 1.7);
    vec2 b = vec2((q.x + cs * 3.0) / 0.21 + 0.5 * floor(qy / 0.16), qy / 0.16), id = floor(b), f = (fract(b) - 0.5) * vec2(0.21, 0.16) + 0.004 * (mic.rg - 0.5);
    float jw = 0.005 + 0.002 * (hdH(id + 3.0) - 0.5);
    float jx = 1.0 - smoothstep(jw, jw + px.x, 0.105 - abs(f.x)), jy = 1.0 - smoothstep(jw, jw + px.y, 0.08 - abs(f.y));
    float sobD = 0.08 - abs(f.y) - jw, sob = step(0.5, hdH(vec2(id.y, 5.0))) * step(0.0, f.y) * step(0.0, sobD) * (1.0 - smoothstep(0.004, 0.012 + px.y, sobD)) * smoothstep(0.4, 0.6, mic.r) * ja;
    float j = max(mix(0.15, max(jx, jy), ja), sob), fam = step(0.55, hdH(id + 7.0)), tom = hdH(id + 11.0);
    float ran = (1.0 - smoothstep(0.0012, 0.0025 + px.y, min(abs(f.y), abs(abs(f.y) - 0.035)))) * (1.0 - j) * smoothstep(0.012, 0.004, px.y);
    vec3 brick = mix(vec3(0.372, 0.153, 0.107), vec3(0.437, 0.20, 0.149), fam) * (1.0 + (tom - 0.5) * mix(0.30, 0.20, corpo)) * mix(mix(0.84, 1.14, a.r), 0.97, corpo) * (0.92 + 0.16 * mic.r) * (1.0 - 0.06 * ran);
    brick = vec3(dot(brick, ${LUMA})) + (brick - vec3(dot(brick, ${LUMA}))) * 1.2;
    vec3 massa = vec3(0.17, 0.165, 0.155) * (0.86 + 0.28 * mic.b) * (0.92 + 0.16 * m.r);
    float resp = smoothstep(0.70, 0.75, mic.g * 0.5 + m.a * 0.3 + a.g * 0.2) * ja, remM = smoothstep(0.72, 0.74, texture2D(hdRuido, q * 0.23 + 0.61).r) * fora;
    vec3 c = mix(mix(brick, massa, j), massa * 1.3, max(0.5 * resp, remM));
    c = mix(c, vec3(0.70, 0.68, 0.64), smoothstep(0.58, 0.78, a.g) * fora * 0.12); jun = j;
    return vec4(c, ja * (0.009 * (1.0 - j) * (1.0 - remM) + 0.004 * sob + 0.004 * resp - 0.0015 * ran + 0.0012 * mic.b)); }
  // Só o grão (< 10 cm) da textura: razão para a média local (mip 6 ≈ 10 cm por texel), limitada a ±4 %.
  vec3 hdGrao(vec3 t, vec3 tb){ return clamp(t / max(tb, vec3(0.02)), 0.95, 1.05); }
  // Escorrido da laje: uma coluna sorteada por célula de 1,5 m e por caixa (cs), 8–14 cm, só nos 0,35 m abaixo do topo da
  // caixa (topo = distância ao topo; 1000 sem caixa = nada). Ruído com offset por caixa: nunca ladrilha.
  float hdEscorrido(vec2 q, float topo, float cs){ float c = floor(q.x / 1.5), s = hdH(vec2(c, cs * 17.0)), s2 = hdH(vec2(c + 7.0, cs * 17.0));
    vec4 n = texture2D(hdRuido, vec2(q.x * 2.3, q.y * 0.7) + cs * 31.7);
    float w = 0.04 + 0.03 * s2, d = abs(q.x - (c + 0.15 + 0.7 * s) * 1.5 + 0.03 * (n.g - 0.5));
    return step(0.2, s) * (1.0 - smoothstep(w * 0.5, w + fwidth(q.x), d)) * smoothstep(0.9, 0.12, topo) * smoothstep(0.0, 0.04, topo) * (0.55 + 0.45 * n.r); }
  // Concreto de forma: junta de tábua (22 cm, 4 mm) em .x, tom por tábua (−0,5..0,5) em .y, boca do barbacã (Ø 7,5 cm a 0,45 m da
  // base, a cada 2 m com jitter, 75 % das células) em .z, escorrido escuro abaixo dele (≤ 0,45 m: fora do corpo) em .w; aro de PVC em aro.
  vec4 hdBarbaca(vec2 q, float y, float cs, vec4 m, vec4 a, float wy, out float aro){ float t = (y + 0.07) / 0.22, tf = fract(t) * 0.22;
    float j = (1.0 - smoothstep(0.003, 0.005 + wy, min(tf, 0.22 - tf))) * hdVis(0.01, q), tom = hdH(vec2(floor(t), floor(q.x / 1.8) + cs)) - 0.5;
    float bx = (q.x + cs * 10.0) / 2.0, bi = floor(bx), bo = (fract(bx) - 0.5) * 2.0 - (hdH(vec2(bi, 21.0)) - 0.5) * 0.8, on = step(0.25, hdH(vec2(bi, 22.0)));
    float d = length(vec2(bo, y - 0.45)), tubo = (1.0 - smoothstep(0.034, 0.04 + wy, d)) * on; aro = (1.0 - smoothstep(0.046, 0.052 + wy, d)) * on * (1.0 - tubo);
    float esc = on * (1.0 - smoothstep(0.03 + 0.03 * m.g, 0.07 + 0.03 * m.g, abs(bo + 0.03 * (a.g - 0.5)))) * smoothstep(0.45, 0.32, y) * (0.5 + 0.5 * m.r);
    return vec4(j, tom, tubo, esc); }
  // Sombra de contato sob beiral/laje: altura da cobertura (hdCob) menos a do fragmento, 0–30 cm; sem cobertura (hdCob vazio) dá 0.
  float hdBeiral(vec3 p){ float hb = texture2D(hdCob, vec2(p.x / 40.0 + 0.5, 0.5 - p.z / 84.0)).r; return smoothstep(0.32, 0.04, hb - p.y) * step(p.y - 0.03, hb); }`;
const NORMAL = THREE.ShaderChunk.normal_fragment_maps.replace('mapN.xy *= normalScale;', 'mapN.xy *= normalScale * hdRel;');
// Face de costas para o sol não pode ganhar sol pelo relevo: a sombra não cobre e vira faísca.
const SEM_FAISCA = `
  #if NUM_DIR_LIGHTS > 0
  { vec3 hdGeo = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition))), hdLz = directionalLights[0].direction; float hdDl = dot(normal, hdLz);
    if (hdDl > 0.0) normal = normalize(normal - hdLz * hdDl * smoothstep(0.12, 0.0, dot(hdGeo, hdLz)));
    float hdRl = dot(normal - hdGeo, normalize((viewMatrix * vec4(0.25, 1.0, 0.15, 0.0)).xyz));
    diffuseColor.rgb *= 1.0 + clamp(hdLuzRel * hdRl * smoothstep(0.24, 0.50, abs(hdRl)), -0.42, 0.42); }
  #endif`;
const ALTURA = `\nnormal = hdBump(normal, -vViewPosition, hdAlt);${SEM_FAISCA}`;
const CABECA = 'float hdRel = 1.0, hdRug = 1.0, hdAlt = 0.0, hdLuzRel = 1.0;';
const ganchos = (shader) => { shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * hdRug;').replace('#include <normal_fragment_maps>', NORMAL + ALTURA); };

// Posição de mundo, caixa (centro/meia-medida: da instância ou dos atributos hdJc/hdJs postos por marcaCaixas) e, com
// `metros`, UV projetado no mundo (parede: horizontal x altura; piso: xz). `nrm` multiplica só o UV do normal map (grão mais fino).
function comMundo(shader, U, metros = 0, extra = '', nrm = 1) {
  Object.assign(shader.uniforms, U);
  shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\nvarying vec3 vHdPos; varying vec3 vHdJc; varying vec3 vHdJs; varying vec2 vHdVar; varying float vHdInst; attribute vec3 hdJc; attribute vec3 hdJs; attribute vec2 hdVar;\n${HASH}`)
    .replace('#include <uv_vertex>', `#include <uv_vertex>
      { vec4 hdW = vec4(position, 1.0); vec3 hdNm = normal;
        #ifdef USE_INSTANCING
          hdW = instanceMatrix * hdW; hdNm = mat3(instanceMatrix) * hdNm;
          vHdJc = (modelMatrix * vec4(instanceMatrix[3].xyz, 1.0)).xyz;
          vHdJs = 0.5 * vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
          vHdVar = vec2(hdH(floor(vHdJc.xz * 2.0) + floor(vHdJc.y * 2.0)), 0.0); vHdInst = 1.0;
        #else
          vHdJc = hdJc; vHdJs = hdJs; vHdVar = hdVar; vHdInst = 0.0;
        #endif
        hdW = modelMatrix * hdW; hdNm = abs(normalize(mat3(modelMatrix) * hdNm)); vHdPos = hdW.xyz;
        ${metros ? `vec2 hdUv = (hdNm.y > max(hdNm.x, hdNm.z) ? hdW.xz : (hdNm.x > hdNm.z ? hdW.zy : hdW.xy)) / ${metros.toFixed(3)};
        #ifdef USE_MAP
          vMapUv = hdUv;
        #endif
        #ifdef USE_NORMALMAP
          vNormalMapUv = hdUv * ${nrm.toFixed(2)};
        #endif` : ''}
      }`);
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${PARS}\n${extra}`);
}

// Reboco (PAREDES, cimento, guarda) em metros de mundo; na faixa do corpo só grão fino e relevo, mancha de albedo só fora dela.
// Famílias por caixa, batente, mercearia e guarda: docs/hd-kit/escadao.md#reboco.
function rebocoHD(m, r, U, queiOk) {
  m.onBeforeCompile = (shader) => { comMundo(shader, U, CONJ.reboco.metros, 'uniform vec4 hdRebP; uniform float hdQueiOk; uniform float hdR26;', 8);
    shader.uniforms.hdRebP = { value: new THREE.Vector4(r.remendo, r.descasca, r.cru, r.umid) }; shader.uniforms.hdQueiOk = { value: queiOk };
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `${CABECA} { float hdY = hdAltura(vHdPos);
      vec3 hdGn = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))); float hdCima = step(0.7, abs(hdGn.y));
      float hdS = vHdVar.x, hdCru = step(0.5, vHdVar.y) * hdRebP.z; vec4 hdT = texture2D(map, vMapUv);
      // Projeção pelo eixo de mundo da face (x ou z pela normal geométrica) + deslocamento por caixa: somar x + z dá emenda
      // vertical onde duas faces da mesma prumada se encontram e repete o decal em caixas vizinhas.
      vec2 hdQ = vec2((abs(hdGn.x) > abs(hdGn.z) ? vHdPos.z : vHdPos.x) + hdS * 23.0, vHdPos.y);
      // Bairro instanciado (vHdInst): dessaturado 55 % e 8 % mais escuro; sem isso o verde-musgo 8fa07a lê como verde-lima ao sol.
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, ${LUMA})) * vec3(0.95, 0.94, 0.91), 0.55 * vHdInst);
      // Máscara lenta: ladrilho de 12,5 m lido com viés de mip 4 (sobra a oitava de ~3 m); hdM = meio-tom e grão (.b, < 2 cm).
      vec4 hdA = texture2D(hdRuido, hdQ * 0.08 + hdS * 3.0, 4.0), hdM = texture2D(hdRuido, hdQ * 0.83 + 0.37 + hdS * 7.0), hdM2 = hdMeio(hdQ, hdS);
      float hdCorpo = hdFaixaCorpo(hdY), hdFora = 1.0 - hdCorpo, hdNit = hdNitido(), hdWy = max(fwidth(hdY) * 1.5, 0.004);
      float hdLoja = step(abs(vHdPos.x), 2.40) * step(abs(vHdPos.z + 23.3), 0.07) * step(7.0, vHdPos.y);
      // Batente: caixa fina (≤ 16 cm) e estreita (≤ 1,24 m) = marco de porta/janela, pilastra, cano: concreto sem remendo, rasgo nem tijolo.
      float hdBat = step(0.001, vHdJs.y) * step(min(vHdJs.x, vHdJs.z), 0.08) * step(max(vHdJs.x, vHdJs.z), 0.62);
      float hdFam = hdH(vec2(floor(hdS * 97.0), 2.0)), hdNcru = (1.0 - hdCru) * (1.0 - hdLoja) * (1.0 - hdBat);
      // 3 variantes de albedo por caixa: 0 remendo de reboco com borda dura, 1 escorrido longo de calha, 2 tijolo aparente no pé.
      float hdVarA = floor(hdH(vec2(floor(hdS * 97.0), 23.0)) * 2.999);
      float hdQuei = step(0.70, hdFam) * hdNcru * hdQueiOk, hdChap = step(0.35, hdFam) * step(hdFam, 0.70) * hdNcru;
      float hdLiso = (step(hdFam, 0.35) + step(0.70, hdFam) * (1.0 - hdQueiOk)) * hdNcru * hdAltoBox();
      // Chapisco: ≥ 50 % de cada caixa vira reboco liso por máscara de 2–3 m (reboco novo sobre chapisco; inteiro lê como esponja).
      // hdChap0 = família original (rodapé de bloco aparente < 0,45 m só nela).
      float hdChap0 = hdChap, hdChMix = smoothstep(0.44, 0.56, texture2D(hdRuido, hdQ * 0.37 + hdS * 2.0, 2.0).g + 0.08) * hdChap;
      hdChap -= hdChMix; hdLiso += hdChMix * hdAltoBox();
      // Remendo de cimento no chapisco (acima de 2,1 m, 50 % das caixas, célula de 2,2 m): 0,6–1,2 m, borda ruidosa, sem grão.
      float hdPcx = (hdQ.x + hdS * 10.0) / 2.2, hdPci = floor(hdPcx), hdPw = 0.3 + 0.3 * hdH(vec2(hdPci, 7.0));
      float hdPd = hdPw - abs(fract(hdPcx) * 2.2 - 1.1 - (hdH(vec2(hdPci, 8.0)) - 0.5) * 0.6) + 0.05 * (hdM.g - 0.5);
      float hdPdy = 0.3 + 0.3 * hdH(vec2(hdPci, 9.0)) - abs(hdY - 2.6 - 0.5 * hdH(vec2(hdPci, 10.0))) + 0.05 * (hdM.r - 0.5);
      float hdRemC = step(0.5, hdH(vec2(floor(hdS * 97.0), 6.0))) * step(0.5, hdH(vec2(hdPci, 11.0))) * max(hdChap, 0.7 * hdLiso) * hdFora * smoothstep(2.1, 2.2, hdY) * smoothstep(0.0, hdWy, min(hdPd, hdPdy));
      // Grão HF (período 1,9 cm; chapisco 6,5 mm = grão real de 3–8 mm): a amplitude some com o período abaixo de 3 px, nunca cintila.
      // Procedural (hdGraoP): o canal b do hdRuido magnificado vira quadriculado. Ver docs/hd-kit/escadao.md#grao.
      float hdFw = max(max(fwidth(hdQ.x), fwidth(hdQ.y)), 1e-6), hdGv = smoothstep(1.0, 2.4, mix(0.019, 0.0065, hdChap) / hdFw);
      float hdMed = 0.5 * (hdM.r + hdM2.r), hdFinoG = mix(mix(0.12, 0.08, hdQuei), mix(0.11, 0.065, hdCorpo), hdChap) * hdGv * (1.0 - hdRemC);
      float hdG = mix(hdGraoP(hdQ, 0.019), hdGraoP(hdQ + 3.0, 0.0065), hdChap), hdChapC = hdChap * hdCorpo;
      hdRug = mix(hdT.a, 1.0, 0.5 * hdChap) * mix(1.0, 0.8, hdQuei);
      // Textura: no corpo só o grão; fora dele a mancha da concrete_wall_003 entra a 45 % (inteira dá duas colunas escuras a cada 1,7 m).
      vec3 hdTb = texture2D(map, vMapUv, 6.0).rgb, hdTex = mix(hdGrao(hdT.rgb, hdTb) * mix(vec3(1.0), hdTb / ${v3(CONJ.reboco.media)}, 0.45 * hdFora), vec3(1.0), hdChapC);
      // Média frequência no corpo ±3,5 % (acima disso lê como grão de 7 cm); o grão real vem do normal map 8× mais fino (comMundo nrm).
      vec3 hdReb = hdTex * mix(0.92, 1.06, hdS) * mix(mix(0.87, 1.10, hdA.r), 1.0, hdCorpo) * (1.0 + hdFinoG * (hdG - 0.5)) * mix(mix(0.96, 1.03, hdM.r), mix(mix(0.965, 1.035, hdMed), mix(mix(0.975, 1.025, hdMed), mix(0.96, 1.04, hdMed) * mix(0.985, 1.015, hdM2.g), 1.0 - hdGv), hdChap), hdCorpo);
      vec3 hdEmboco = vec3(0.43, 0.41, 0.375) * (0.76 + 0.48 * hdM.r) * mix(0.9, 1.1, hdTex.g);
      vec3 hdPint = diffuseColor.rgb * hdReb;
      // Emboço nunca mais claro que 92 % da luma da pintura: no salmão/verde lê como mancha branca.
      hdEmboco *= min(1.0, 0.92 * dot(hdPint, ${LUMA}) / max(dot(hdEmboco, ${LUMA}), 1e-3));
      // Batente de concreto: 14 % mais escuro que a parede (lê como recesso), lascas de 1–3 cm na aresta; no corpo, lasca rara e ≤ 1,8 cm.
      // Aresta = borda vertical da FACE vista (normal geométrica); medir pela caixa dá 0 na face inteira do pilar quadrado.
      if (hdBat > 0.5) { float hdDe = abs(hdGn.x) > abs(hdGn.z) ? vHdJs.z - abs(vHdPos.z - vHdJc.z) : vHdJs.x - abs(vHdPos.x - vHdJc.x);
        float hdChip = (1.0 - smoothstep(0.012, mix(0.03, 0.018, hdCorpo), hdDe + 0.02 * (hdM.b - 0.5))) * step(mix(0.72, 0.9, hdCorpo), hdM2.r) * hdVis(0.012, hdQ);
        hdPint = mix(vec3(0.44, 0.43, 0.40) * hdReb / mix(0.92, 1.06, hdS) * (0.9 + 0.2 * hdM.g), vec3(0.30, 0.29, 0.27) * (0.8 + 0.4 * hdM.b), hdChip); hdAlt -= 0.006 * hdChip; }
      hdPint = mix(hdPint, vec3(dot(hdPint, ${LUMA})) * vec3(0.97, 0.97, 0.95) * 0.92 * (0.9 + 0.2 * hdM.r), hdRemC);
      // Variante 0: remendo de reboco novo com borda DURA (0,9–1,6 x 0,8–1,3 m, 1 por célula de 2,9 m em 55 %), acima de 2,1 m, luma −8 %.
      float hdV0x = (hdQ.x + hdS * 10.0) / 2.9, hdV0i = floor(hdV0x), hdV0w = 0.45 + 0.35 * hdH(vec2(hdV0i, 31.0)), hdV0h = 0.4 + 0.25 * hdH(vec2(hdV0i, 32.0));
      float hdV0d = min(hdV0w - abs(fract(hdV0x) * 2.9 - 1.45 - (hdH(vec2(hdV0i, 33.0)) - 0.5) * 1.2), hdV0h - abs(hdY - 2.6 - hdV0h - 0.4 * hdH(vec2(hdV0i, 34.0))));
      float hdRemD = step(hdVarA, 0.5) * hdNcru * hdFora * step(0.45, hdH(vec2(hdV0i, 35.0))) * smoothstep(0.0, hdWy, hdV0d) * smoothstep(2.1, 2.14, hdY);
      hdPint = mix(hdPint, vec3(dot(hdPint, ${LUMA})) * vec3(0.98, 0.975, 0.95) * 0.92 * (0.94 + 0.12 * hdM.r), hdRemD); hdRemC = max(hdRemC, hdRemD);
      // Pintura sobre pintura: barrado até 1,2 m (±2 cm) em tom próximo (frio ou quente por caixa) e borda de rolo clara de 1,2 cm.
      float hdLim = 1.2 + 0.03 * (hdM.g - 0.5) + 0.04 * (hdA.g - 0.5);
      float hdBaixo = 1.0 - smoothstep(hdLim - 0.004, hdLim + 0.004 + hdWy, hdY), hdRolo = (1.0 - smoothstep(0.006, 0.012 + hdWy, abs(hdY - hdLim))) * hdVis(0.012, hdQ);
      hdPint = mix(hdPint, hdPint * mix(vec3(0.95, 0.955, 0.94), vec3(0.955, 0.945, 0.965), step(0.5, hdH(vec2(floor(hdS * 97.0), 4.0)))), hdBaixo * hdLiso) * (1.0 + 0.09 * hdRolo * hdLiso);
      // Cimento queimado: luminância da pintura sem cor, mancha de queima só fora do corpo, juntas de 8 mm a −20 %.
      vec2 hdJq = abs(fract(vec2(hdQ.x + hdS * 10.0, hdY) / vec2(1.1, 1.25)) - 0.5) * vec2(1.1, 1.25), hdJpx = fwidth(hdQ) * 1.5;
      float hdJun = max(1.0 - smoothstep(0.004, 0.006 + hdJpx.x, 0.55 - hdJq.x), 1.0 - smoothstep(0.004, 0.006 + hdJpx.y, 0.625 - hdJq.y)) * hdQuei * hdVis(0.01, hdQ);
      hdPint = mix(hdPint, vec3(dot(hdPint, ${LUMA})) * vec3(1.0, 0.99, 0.965) * (1.0 + 0.10 * (hdMed - 0.5) * hdFora), 0.85 * hdQuei) * (1.0 - 0.2 * hdJun);
      // Mercearia do mirante: ocre em cima, barrado verde-escuro até 1,10 m e filete claro de 2,4 cm.
      if (hdLoja > 0.5) { float hdBar = 1.0 - smoothstep(1.10, 1.10 + hdWy, hdY), hdFil = 1.0 - smoothstep(0.012, 0.012 + hdWy, abs(hdY - 1.125));
        hdPint = mix(mix(vec3(0.46, 0.42, 0.30), vec3(0.05, 0.115, 0.08), hdBar), vec3(0.56, 0.53, 0.45), hdFil) * hdReb / mix(0.92, 1.06, hdS); }
      // Rasgo de eletroduto: coluna de 1,3 m sorteada, faixa vertical de 12–22 cm só acima de 2,1 m, 30 % de emboço (≈ −10 %).
      float hdCx = (hdQ.x + hdS * 10.0) / 1.3, hdCol = floor(hdCx), hdCf = fract(hdCx) * 1.3;
      float hdRw = 0.06 + 0.05 * hdH(vec2(hdCol, 8.0)), hdRd = abs(hdCf - 0.25 - 0.8 * hdH(vec2(hdCol, 9.0)));
      float hdRas = step(1.0 - 0.15 * hdRebP.x, hdH(vec2(hdCol, 7.0))) * (1.0 - smoothstep(hdRw, hdRw + fwidth(hdCf) * 1.5, hdRd)) * smoothstep(2.1, 2.25, hdY) * hdFora * (1.0 - hdCru) * (1.0 - hdBat);
      hdPint = mix(hdPint, hdEmboco, 0.3 * hdRas);
      vec4 hdBk = hdBloco(hdQ + hdS * 5.0, 0.2 * hdFora);
      vec3 hdBl = vec3(0.50, 0.455, 0.44) * hdBk.rgb * mix(0.86 + 0.28 * hdM.r, 1.0, hdCorpo) * mix(0.92, 1.06, hdTex.g);
      float hdRodB = hdChap0 * (1.0 - smoothstep(0.42, 0.47 + 0.02 * (hdM.g - 0.5), hdY)) * hdAltoBox() * (1.0 - hdCima), hdBlk = max(hdCru, hdRodB);
      diffuseColor.rgb = mix(hdPint, hdBl * mix(1.0, 0.92, hdRodB), hdBlk); hdAlt -= 0.004 * hdBk.a * hdBlk + 0.006 * hdRodB;
      // Remendo de tijolo exposto por célula de 2,6 m (12 %): platibanda (acima de 2,1 m) ou pé (< 0,4 m), 0,7–1,6 m de largura,
      // borda com ±4 cm de ruído e aro de emboço de 6–12 cm. Nunca na faixa do corpo, nunca retângulo de adesivo.
      float hdC2x = (hdQ.x + hdS * 10.0) / 2.6 + 0.5, hdC2 = floor(hdC2x);
      float hdJit = 0.08 * (hdM.g - 0.5), hdJx = 0.08 * (hdM.r - 0.5), hdHw = 0.35 + 0.45 * hdH(vec2(hdC2, 15.0));
      float hdDl = hdHw - abs((fract(hdC2x) - 0.5) * 2.6 - (hdH(vec2(hdC2, 16.0)) - 0.5) * (1.3 - hdHw)) + hdJx;
      float hdTopo = vHdJs.y > 0.001 ? vHdJc.y + vHdJs.y - vHdPos.y : 1000.0;
      float hdDt = min(0.5 + 0.6 * hdH(vec2(hdC2, 11.0)) - hdTopo + hdJit, hdDl), hdDp = min(0.12 + 0.25 * hdH(vec2(hdC2, 13.0)) - hdY + hdJit, hdDl);
      float hdPt = step(1.0 - 0.12 * hdRebP.y, hdH(vec2(hdC2, 12.0))) * smoothstep(0.0, hdWy, hdDt) * smoothstep(2.1, 2.2, hdY);
      // Variante 2: tijolo aparente no pé em 70 % das células (as outras variantes ficam nos 12 % de hdRebP.y).
      float hdPp = max(step(1.0 - 0.12 * hdRebP.y, hdH(vec2(hdC2, 14.0))), step(1.5, hdVarA) * step(0.3, hdH(vec2(hdC2, 14.0)))) * hdNcru * smoothstep(0.0, hdWy, hdDp) * hdAltoBox();
      // Platibanda sem reboco (32 % das caixas): 0,55–0,9 m de cima, borda inferior irregular (±6 cm), aro de emboço.
      float hdDpl = 0.55 + 0.35 * hdH(vec2(floor(hdS * 97.0), 5.0)) - hdTopo + 0.08 * (hdM.g - 0.5) + 0.05 * (hdA.g - 0.5);
      float hdPl = step(0.68, hdH(vec2(floor(hdS * 97.0), 3.0))) * hdNcru * smoothstep(0.0, hdWy, hdDpl) * smoothstep(2.1, 2.2, hdY) * hdAltoBox();
      float hdPele = max(max(hdPt, hdPp) * hdNcru, hdPl) * hdFora, hdRim = 1.0 - smoothstep(0.06, 0.09 + 0.03 * hdM.r, max(max(hdDt * hdPt, hdDp * hdPp), hdDpl * hdPl));
      // Tijolo exposto: dessaturado a 60 % e mais escuro que o tijolo aparente autoral.
      vec4 hdTj = hdTijolo(hdQ + 3.7, hdM.r, 0.5); vec3 hdTjx = mix(vec3(dot(hdTj.rgb, ${LUMA})), hdTj.rgb, 0.6) * 0.98;
      diffuseColor.rgb = mix(diffuseColor.rgb, mix(hdTjx, hdEmboco, hdRim), hdPele);
      // Bairro instanciado fora da arena (|x| > 19,5 ou z > 43; hdR26 = 0 desliga): 62 % das caixas em bloco cerâmico à vista, 16 % só
      // no último pavimento, viga a cada 2,9 m e pilar a cada ~3,1 m. hdBaiano recebe hdCorpo. Ver docs/hd-kit/escadao.md#bairro-instanciado.
      float hdBairro = hdR26 * vHdInst * max(step(19.5, abs(vHdJc.x)), step(43.0, vHdJc.z)) * (1.0 - hdCima);
      if (hdBairro > 0.5) { float hdHc = hdH(vec2(floor(hdS * 97.0), 61.0)), hdBy = vHdPos.y - (vHdJc.y - vHdJs.y);
        float hdBx = abs(hdGn.x) > abs(hdGn.z) ? vHdPos.z - vHdJc.z : vHdPos.x - vHdJc.x, hdBm = abs(hdGn.x) > abs(hdGn.z) ? vHdJs.z : vHdJs.x;
        float hdCer = max(step(hdHc, 0.62), step(hdHc, 0.78) * step(hdTopo, 2.9));
        float hdNp = max(1.0, floor(2.0 * hdBm / 3.1 + 0.5)), hdPs = 2.0 * hdBm / hdNp, hdPd = abs(mod(hdBx + hdBm + 0.5 * hdPs, hdPs) - 0.5 * hdPs);
        float hdEst = max(1.0 - smoothstep(0.11, 0.11 + hdWy, abs(mod(hdBy + 1.45, 2.9) - 1.45)), 1.0 - smoothstep(0.09, 0.09 + fwidth(hdBx) * 1.5, hdPd));
        float hdJb; vec4 hdBai = hdBaiano(hdQ, hdS, hdCorpo, hdA, hdM, hdJb);
        vec3 hdConc = vec3(0.33, 0.32, 0.30) * (0.82 + 0.36 * hdM.r) * mix(0.9, 1.08, hdA.r);
        // Térreo chapiscado até ~2,1 m (borda solta): o bloco é da gama de pele e não pode cobrir a faixa do corpo à beira da arena.
        float hdTer = 1.0 - smoothstep(2.0, 2.2, hdY + 0.3 * (hdA.g - 0.5)); vec3 hdTerC = hdEmboco * (0.9 + 0.2 * hdM.g);
        diffuseColor.rgb = mix(diffuseColor.rgb, mix(mix(hdBai.rgb * mix(0.9, 1.15, hdHc), hdConc, hdEst), hdTerC, hdTer), hdCer); hdRel *= 1.0 - 0.6 * hdCer; }
      // Platibanda (caixa ≥ 2,5 m, sem tijolo exposto no topo): 30 cm de cima 3 % mais claros e friso de 1,5 cm em relevo na transição.
      float hdPlat = step(1.25, vHdJs.y) * (1.0 - hdBat) * (1.0 - hdCima) * hdNcru * (1.0 - hdPl);
      float hdPlL = (1.0 - smoothstep(0.008, 0.014 + hdWy, abs(hdTopo - 0.30 - 0.02 * (hdA.g - 0.5)))) * hdPlat * hdVis(0.012, hdQ);
      diffuseColor.rgb *= (1.0 + 0.03 * hdPlat * step(hdTopo, 0.30)) * (1.0 - 0.25 * hdPlL); hdAlt -= 0.006 * hdPlL;
      // Descascado da pintura lisa no terço de cima (> 2,1 m): emboço à vista em manchas de 10–30 cm com borda levantada clara.
      // 3 variantes por faixa de 1,5 m (ruído girado 0,6 / 1,7 / 2,8 rad e deslocado): senão o mesmo decal repete na prumada.
      float hdPk = mod(floor((hdY + hdS * 4.0) / 1.5), 3.0), hdPa = 0.6 + 1.1 * hdPk;
      vec2 hdPq = mat2(cos(hdPa), sin(hdPa), -sin(hdPa), cos(hdPa)) * (hdQ * 0.55) + hdPk * 0.37 + hdS * 3.0;
      float hdPeelN = texture2D(hdRuido, hdPq).g * 0.55 + hdA.r * 0.45, hdPeelOk = hdLiso * hdFora * smoothstep(2.1, 2.3, hdY) * step(0.5, hdH(vec2(floor(hdS * 97.0), 19.0)));
      float hdPeel = smoothstep(0.62, 0.67, hdPeelN) * hdPeelOk, hdPeelR = smoothstep(0.56, 0.62, hdPeelN) * (1.0 - hdPeel) * hdPeelOk;
      diffuseColor.rgb = mix(diffuseColor.rgb, hdEmboco * 1.08, hdPeel) * (1.0 + 0.08 * hdPeelR); hdAlt -= 0.003 * hdPeel;
      // Guarda alta (≥ 1,4 m, hdRebP.w = 1): concreto de forma com marca de tábua e barbacãs de PVC com escorrido e musgo ao pé.
      float hdGua = step(0.99, hdRebP.w) * step(0.7, vHdJs.y) * (1.0 - hdBat) * (1.0 - hdCima);
      if (hdGua > 0.5) { float hdAro; vec4 hdFo = hdBarbaca(hdQ, hdY, hdS, hdM, hdA, hdWy, hdAro);
        // Escorrido sob o cano a 0,8 / −45 %: mais fraco que isso não lê na pose da escada.
        diffuseColor.rgb *= (1.0 + 0.06 * hdFo.y) * (1.0 - 0.18 * hdFo.x); diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.8 * hdFo.w) * (1.0 - 0.45 * hdFo.w);
        diffuseColor.rgb = mix(diffuseColor.rgb, dot(diffuseColor.rgb, ${LUMA}) * vec3(0.5, 0.66, 0.3), 0.6 * hdFo.w * smoothstep(0.30, 0.05, hdY));
        diffuseColor.rgb = mix(mix(diffuseColor.rgb, vec3(0.55, 0.53, 0.48), hdAro), vec3(0.05, 0.05, 0.045), hdFo.z); hdAlt += 0.012 * hdAro - 0.012 * hdFo.z - 0.002 * hdFo.x; hdRel *= 1.0 - 0.5 * hdFo.z; }
      // Sombra de contato: sob beiral/laje (cobertura acima, 0–30 cm, caixas ≥ 1,5 m) e no pé da parede (≤ 22 cm).
      // Rodapé escuro de 10 cm com borda dura (cimento queimado sujo, −32 %) em toda caixa que toca o piso.
      float hdBei = hdBeiral(vHdPos) * step(0.75, vHdJs.y) * (1.0 - hdCima), hdPe = smoothstep(0.22, 0.0, hdY) * hdAltoBox() * (1.0 - hdCima);
      float hdRod = (1.0 - smoothstep(0.10, 0.11 + hdWy, hdY + 0.006 * (hdM.g - 0.5))) * hdAltoBox() * (1.0 - hdCima) * (1.0 - hdBat);
      diffuseColor.rgb *= (1.0 - 0.28 * hdBei) * (1.0 - 0.18 * hdPe);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, ${LUMA})) * vec3(0.62, 0.62, 0.60) * (0.9 + 0.2 * hdM.r), hdRod); hdRug = mix(hdRug, 0.75, hdRod);
      // Relevo do chapisco contido (×0,96 fora / ×0,75 no corpo): acima disso lê como esponja.
      // Normal map 8× mais fino (feições de 0,6–5 cm): no corpo ×1,0, nunca amplificado.
      hdRel *= (1.0 - 0.5 * hdPele) * (1.0 - 0.5 * hdRemC) * mix(0.6, 1.0, hdNit) * mix(1.0, mix(1.0, 0.75, hdChap), hdCorpo) * (1.0 - 0.04 * hdChap * hdFora) * (1.0 - 0.4 * hdChapC) * mix(1.0, 0.65, hdQuei); hdAlt -= 0.012 * hdPele + 0.003 * hdJun; hdLuzRel = 1.0 - 0.5 * hdChapC;
      float hdEsc = hdEscorrido(hdQ, hdTopo, hdS) * hdFora * hdAltoBox() * (1.0 - hdCru);
      diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.45 * hdEsc) * (1.0 - 0.18 * hdEsc);
      // Variante 1: escorrido de calha a partir do topo, 1 coluna por 3 m (8–11 cm), desce 1,6–2,6 m; no corpo é só um fio ≤ 11 cm, −12 %.
      float hdV1x = (hdQ.x + hdS * 7.0) / 3.0, hdV1i = floor(hdV1x), hdV1w = 0.04 + 0.015 * hdH(vec2(hdV1i, 42.0)), hdV1l = 1.6 + hdH(vec2(hdV1i, 43.0));
      float hdV1d = abs(fract(hdV1x) * 3.0 - 1.5 - (hdH(vec2(hdV1i, 41.0)) - 0.5) * 2.0 + 0.02 * (hdM.g - 0.5) + 0.03 * (hdA.g - 0.5));
      float hdEscL = step(0.5, hdVarA) * step(hdVarA, 1.5) * hdNcru * hdAltoBox() * (1.0 - hdCima) * step(0.001, vHdJs.y) * (1.0 - smoothstep(hdV1w * 0.6, hdV1w + fwidth(hdQ.x), hdV1d)) * smoothstep(hdV1l, hdV1l * 0.45, hdTopo) * smoothstep(0.0, 0.05, hdTopo) * (0.6 + 0.4 * hdM.r);
      diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.5 * hdEscL) * (1.0 - mix(0.22, 0.12, hdCorpo) * hdEscL);
      // Bairro instanciado: escorrido fino de sujeira sob os peitoris autorais (janelas em u = −1,25 / 1,1 da face, peitoril em
      // 1,4 + 2,9·andar − 0,48 m): 3 fios de 1–2,5 cm por janela descendo 0,75 m, −20 %.
      if (vHdInst > 0.5) { float hdU = abs(hdGn.x) > abs(hdGn.z) ? vHdPos.z - vHdJc.z : vHdPos.x - vHdJc.x, hdYb = vHdPos.y - (vHdJc.y - vHdJs.y);
        float hdAnd = floor((hdYb - 0.85) / 2.9), hdSill = 1.4 + 2.9 * hdAnd - 0.48, hdDy = hdSill - hdYb;
        float hdJu = abs(hdU + 1.25) < abs(hdU - 1.1) ? hdU + 1.25 : hdU - 1.1, hdJw = 0.33 + 0.12 * hdH(vec2(hdAnd, floor(hdS * 97.0)));
        float hdFioP = 0.0; for (int i = 0; i < 3; i++) { float hdPx = (hdH(vec2(float(i), hdAnd + hdS * 50.0)) - 0.5) * 2.0 * hdJw, hdWf = 0.01 + 0.015 * hdH(vec2(float(i) + 3.0, hdAnd + hdS * 50.0));
          hdFioP = max(hdFioP, 1.0 - smoothstep(hdWf, hdWf + fwidth(hdU) * 1.5, abs(hdJu - hdPx + 0.01 * (hdM.g - 0.5)))); }
        float hdPeit = hdFioP * step(0.0, hdAnd) * smoothstep(0.0, 0.05, hdDy) * smoothstep(0.75, 0.2, hdDy) * (0.5 + 0.5 * hdM.r) * step(abs(hdJu), hdJw + 0.02) * (1.0 - hdCima);
        diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.5 * hdPeit) * (1.0 - 0.2 * hdPeit); }
      float hdTr = hdTrinca(hdQ + hdS * 5.0, hdA.a, hdS, hdY); diffuseColor.rgb *= 1.0 - 0.42 * mix(1.0, 0.25, hdCorpo) * hdTr; hdAlt -= 0.003 * hdTr;
      float hdSuj = smoothstep(0.50, 0.04, hdY) * (0.45 + 0.55 * hdA.r) * (1.0 - 0.35 * hdPele) * hdAltoBox() * hdFora;
      diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.45 * hdSuj) * (1.0 - 0.15 * hdSuj);
      // Mofo cinza-verde no rodapé (< 0,45 m).
      float hdMusgo = smoothstep(0.45, 0.05, hdY) * smoothstep(0.40, 0.65, hdM.a) * hdAltoBox();
      // Respingo de barro nos 40 cm de baixo (fora do corpo): mancha parda de ruído médio.
      float hdBarroM = smoothstep(0.42, 0.10, hdY) * smoothstep(0.48, 0.70, hdM2.g * 0.6 + hdM.a * 0.4) * hdAltoBox() * (1.0 - hdCima);
      diffuseColor.rgb = hdBarro(diffuseColor.rgb, 0.5 * hdBarroM) * (1.0 - 0.12 * hdBarroM);
      diffuseColor.rgb = mix(diffuseColor.rgb, dot(diffuseColor.rgb, ${LUMA}) * vec3(0.72, 0.86, 0.60), 0.65 * hdMusgo);
      // Umidade no pé (≤ 0,4 m, hdRebP.w: mureta 1, cimento 0,7, reboco 0,35): escurece, perde brilho, linha de maré a 0,4 m.
      float hdUmi = smoothstep(0.42, 0.05, hdY) * max(hdAltoBox(), step(0.99, hdRebP.w)) * max(hdRebP.w, 0.7 * hdChap) * (0.6 + 0.4 * hdA.g);
      float hdMare = (1.0 - smoothstep(0.0, 0.05, abs(hdY - 0.40 - 0.05 * (hdM.g - 0.5)))) * hdRebP.w * (0.5 + 0.5 * hdA.g) * (1.0 - hdCima);
      diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.5 * hdUmi) * (1.0 - 0.22 * hdUmi - 0.06 * hdMare); hdRug = mix(hdRug, 0.6, 0.6 * hdUmi);
      diffuseColor.rgb *= mix(1.0, 0.74, hdCima);
      hdAlt += hdGv * 0.004 * (1.0 + 0.4 * hdChap) * (hdG - 0.5) + 0.004 * (hdMed - 0.5) * (1.0 - hdCru) * (1.0 - hdChapC * hdGv); }`);
    ganchos(shader); };
  m.customProgramCacheKey = () => 'escadao-hd-reboco18';
}

// Concreto serve piso e parede (orientação pela derivada da posição); grão e relevo somem com a distância (hdNitido).
// Piso: junta, remendos, canaletas, poça; parede: concreto de forma ou espelho do degrau. Ver docs/hd-kit/escadao.md#concreto.
function concretoHD(m, r, U, o) {
  const k = (CONJ.piso.metros / CONJ.forma.metros).toFixed(4);
  m.onBeforeCompile = (shader) => { comMundo(shader, U, CONJ.piso.metros, 'uniform sampler2D hdForma; uniform sampler2D hdFormaN; uniform vec3 hdPisoT; uniform vec3 hdParT; uniform vec3 hdPisoP;');
    Object.assign(shader.uniforms, { hdForma: { value: tex('forma', 'color') }, hdFormaN: { value: tex('forma', 'normal') }, hdPisoT: { value: new THREE.Vector3(...r.piso) }, hdParT: { value: new THREE.Vector3(...r.parede) }, hdPisoP: { value: new THREE.Vector3(r.junta, r.nariz, o.pisoSujo ? 1 : 0) } });
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `${CABECA} hdLuzRel = 0.8;
      vec3 hdGn = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))); float hdPiso = step(0.7, abs(hdGn.y)), hdNariz = hdPisoP.y, hdNit = hdNitido(), hdFino = mix(0.55, 0.85, hdNit);
      hdRel = mix(0.45, 1.0, hdNit);
      // Piso lido com viés de mip +1: sem ele o grão da cor + normal do concrete_floor_02 dá speckle branco.
      if (hdPiso > 0.5) { vec4 hdT = texture2D(map, vMapUv, 1.0); hdT.rgb = mix(texture2D(map, vMapUv, 3.5).rgb, hdT.rgb, hdFino); hdRug = max(hdT.a, 0.72); vec2 p = vHdPos.xz; float hdS = vHdVar.x;
        vec4 a = texture2D(hdRuido, p * 0.071 + hdS), m2 = texture2D(hdRuido, p * 0.53 + 0.19);
        // Junta de desempenadeira: malha de 1,5 m com fiadas desencontradas, reta com ±2 cm de deriva lenta + ±5 mm de ruído, 35 % das
        // juntas apagadas e mais 30 % dos trechos de 50 cm (junta quebrada); largura varia ao longo (não lê como estacionamento).
        vec2 g = (p + 0.04 * (a.gb - 0.5) + 0.01 * (m2.rg - 0.5)) / 1.5 + vec2(0.0, 0.37); g.x += 0.5 * mod(floor(g.y), 2.0); vec2 id = floor(g), f = fract(g); float px = max(fwidth(p.x), fwidth(p.y));
        float djx = min(f.x, 1.0 - f.x) * 1.5 + 10.0 * max(step(hdH(vec2(floor(g.x + 0.5), id.y) + 3.0), 0.35), step(hdH(vec2(floor(g.x + 0.5), floor(g.y * 3.0)) + 9.0), 0.3));
        float djy = min(f.y, 1.0 - f.y) * 1.5 + 10.0 * max(step(hdH(vec2(id.x, floor(g.y + 0.5)) + 5.0), 0.35), step(hdH(vec2(floor(g.x * 3.0), floor(g.y + 0.5)) + 11.0), 0.3));
        float dj = min(djx, djy), rem = hdRemendo(p, m2);
        // Remendo de asfalto (3 fixos no mirante, y = 7,56; dois no quadro da pose, entre a câmera em z −30 e a mercearia): quase preto,
        // borda ruidosa, 6 mm acima, sem grão. Ver docs/hd-kit/escadao.md#piso-mirante.
        float hdAsf = 0.0; if (abs(vHdPos.y - 7.58) < 0.1) { for (int i = 0; i < 3; i++) { vec2 cc = i == 0 ? vec2(-2.6, -27.4) : i == 1 ? vec2(3.6, -25.8) : vec2(-2.0, -14.5), hh = i == 0 ? vec2(1.3, 0.75) : i == 1 ? vec2(1.1, 0.7) : vec2(1.1, 0.75);
          vec2 d = abs(p - cc) - hh + 0.10 * (m2.rb - 0.5); hdAsf = max(hdAsf, 1.0 - smoothstep(-0.03, 0.03, max(d.x, d.y))); } }
        // Calçada da mercearia (z −24,25..−23,3): rebaixo de 2 cm e canaleta de esgoto de 22 cm em z −24,25 por |x| < 7 (fundo úmido
        // escuro, bordas claras de 1 cm, fio d'água no eixo). Atrás da fachada ela não aparece. Ver docs/hd-kit/escadao.md#piso-mirante.
        float hdNaM = step(abs(vHdPos.y - 7.58), 0.1) * step(abs(p.x), 7.0);
        float hdCanM = hdNaM * (1.0 - smoothstep(0.09, 0.12, abs(p.y + 24.25))), hdCanF = hdNaM * (1.0 - smoothstep(0.008, 0.016 + px, abs(p.y + 24.25 + 0.01 * (m2.g - 0.5))));
        float hdCanB = hdNaM * (1.0 - smoothstep(0.008, 0.012 + px, abs(abs(p.y + 24.25) - 0.095)));
        float hdReb = hdNaM * smoothstep(-24.27, -24.25, p.y) * step(p.y, -23.3), hdRebL = hdNaM * (1.0 - smoothstep(0.006, 0.012 + px, abs(p.y + 24.34)));
        float junta = (1.0 - smoothstep(0.014, 0.022 + px * 1.5, dj)) * 0.03 / (0.03 + px * 0.6) * hdPisoP.x * (1.0 - rem) * (1.0 - hdAsf) * (0.55 + 0.9 * m2.g);
        float mancha = smoothstep(0.50, 0.70, a.a * 0.6 + m2.r * 0.4) * mix(1.0, 0.6, hdNariz);
        // Mancha de água antiga: anel de maré (borda do ruído lento de 14 m) 14 % mais escuro, miolo 5 %; só no piso sujo.
        float hdAnel = smoothstep(0.50, 0.535, a.b) * (1.0 - smoothstep(0.55, 0.60, a.b)) * hdPisoP.z, hdMiolo = smoothstep(0.55, 0.62, a.b) * hdPisoP.z;
        vec2 cu = vec2(p.x / 40.0 + 0.5, 0.5 - p.y / 84.0); float h0 = texture2D(hdCob, cu).r, hb = texture2D(hdCob, cu, 1.0).r;
        float parede = smoothstep(1.0, 2.2, hb - vHdPos.y) * (1.0 - smoothstep(0.3, 1.0, h0 - vHdPos.y)) * hdPisoP.z;
        float hdCd = hdCanalD(vHdPos), canal = (1.0 - smoothstep(0.085, 0.16, hdCd)) * hdPisoP.z, hdFio = (1.0 - smoothstep(0.006, 0.014 + px, hdCd)) * hdPisoP.z;
        float hdLimo = smoothstep(0.04, 0.10, hdCd) * (1.0 - smoothstep(0.14, 0.22, hdCd)) * smoothstep(0.35, 0.6, m2.a) * hdPisoP.z;
        vec2 hdPo = hdPoca(p, vHdPos.y, m2) * hdPisoP.z;
        // Grão do cimentado: procedural (hdGraoP, período 1,6 cm), média zero; o canal b do hdRuido lê como quadriculado de perto.
        float gr = hdGraoP(p, 0.016);
        vec3 c = hdPisoT * hdT.rgb / ${v3(CONJ.piso.media)} * (1.0 + 0.16 * (gr - 0.5) * (1.0 - hdAsf));
        c *= mix(0.92, 1.06, hdH(id + hdS)) * mix(0.88, 1.10, a.g) * mix(0.92, 1.07, m2.r) * (1.0 - 0.45 * hdTrinca(p + hdS * 3.0, a.a, hdS)) * (1.0 - 0.45 * hdTrinca(p.yx + 5.3 + hdS, a.g, hdS));
        // Remendo: cimento mais novo, 10 % mais escuro e frio, grão próprio, 4 mm acima do piso.
        c = mix(c, c * vec3(0.88, 0.89, 0.92) * (1.0 + 0.16 * (m2.g - 0.5)), rem); hdAlt += 0.004 * rem;
        // 1 degrau remendado (lance 2, k = 7, centro z 4,635): cimento novo de 60 cm em x −0,55, borda dura, sem grão, 5 mm acima.
        float hdRemDg = hdNariz * step(abs(vHdJc.z - 4.635), 0.05) * (1.0 - smoothstep(0.30, 0.31 + px, abs(p.x + 0.55)));
        c = mix(c, hdPisoT * 0.95 * vec3(0.90, 0.91, 0.95) * (0.96 + 0.08 * m2.g), hdRemDg); hdAlt += 0.005 * hdRemDg;
        c = mix(c, vec3(0.055, 0.053, 0.05) * (0.8 + 0.4 * m2.g) * (1.0 + 0.3 * (gr - 0.5)), hdAsf); hdAlt += 0.006 * hdAsf;
        // Mirante (y 7,58): mancha de óleo (elipse 1,1 x 0,7 em (−1,2; −28,6), quase preta, brilhante, halo pardo), remendo de areia/brita
        // (elipse 1,6 x 1,1 em (4,1; −29,4), clara, borda esfarelada) e areia encostada ao muro (≤ 35 cm da parede, hdCob).
        float hdOleo = 0.0, hdOleoH = 0.0, hdBrita = 0.0, hdAreia = 0.0;
        if (abs(vHdPos.y - 7.58) < 0.1) { vec2 dO = (p - vec2(-1.2, -28.6)) / vec2(0.55, 0.35); float rO = length(dO) + 0.12 * (m2.r - 0.5) + 0.08 * (a.g - 0.5);
          hdOleo = 1.0 - smoothstep(0.85, 1.0, rO); hdOleoH = (1.0 - smoothstep(1.0, 1.35, rO)) * (1.0 - hdOleo);
          vec2 dB = (p - vec2(4.1, -29.4)) / vec2(0.8, 0.55); float rB = length(dB) + 0.18 * (m2.g - 0.5) + 0.1 * (a.r - 0.5); hdBrita = 1.0 - smoothstep(0.9, 1.05, rB);
          hdAreia = smoothstep(1.0, 1.7, hb - vHdPos.y) * (1.0 - smoothstep(0.2, 0.9, h0 - vHdPos.y)) * smoothstep(0.42, 0.62, a.r * 0.5 + m2.g * 0.5); }
        c = mix(c, vec3(0.025, 0.024, 0.022) * (0.9 + 0.2 * m2.g), hdOleo); c = hdBarro(c, 0.5 * hdOleoH) * (1.0 - 0.22 * hdOleoH);
        c = mix(c, vec3(0.36, 0.33, 0.27) * (0.72 + 0.56 * hdGraoP(p + 9.0, 0.012)) * (0.9 + 0.2 * m2.r), hdBrita); hdAlt += 0.008 * hdBrita * (hdGraoP(p + 2.0, 0.012) - 0.3);
        c = mix(c, vec3(0.40, 0.36, 0.29) * (0.85 + 0.3 * hdGraoP(p + 5.0, 0.014)), 0.75 * hdAreia); hdAlt += 0.004 * hdAreia;
        c = hdBarro(c, 0.3 * mancha) * (1.0 - 0.20 * mancha) * (1.0 - 0.72 * junta) * (1.0 - 0.14 * hdAnel - 0.05 * hdMiolo);
        c = hdUmido(c, 0.7 * canal) * (1.0 - 0.5 * canal) * (1.0 - 0.3 * hdFio);
        // Canaleta central de esgoto (15 cm, 2 cm rebaixada, fio d'água escuro, limo nas bordas) e musgo no pé do corrimão/mureta (|x| > 1,55).
        float hdCc = hdCanalC(vHdPos), hdCanC = (1.0 - smoothstep(0.065, 0.085 + px, hdCc)) * hdNariz * hdPisoP.z, hdFioC = (1.0 - smoothstep(0.006, 0.014 + px, hdCc)) * hdNariz * hdPisoP.z;
        float hdLimoC = smoothstep(0.05, 0.09, hdCc) * (1.0 - smoothstep(0.11, 0.17, hdCc)) * smoothstep(0.3, 0.55, m2.a) * hdNariz * hdPisoP.z;
        c = hdUmido(c, 0.85 * hdCanC) * (1.0 - 0.5 * hdCanC) * (1.0 - 0.35 * hdFioC); c = mix(c, dot(c, ${LUMA}) * vec3(0.42, 0.58, 0.28), 0.6 * hdLimoC); hdAlt -= 0.02 * hdCanC;
        float hdMusC = step(hdCc, 9.0) * smoothstep(0.30, 0.05, 1.81 - abs(p.x)) * smoothstep(0.35, 0.6, m2.a * 0.5 + a.g * 0.5) * hdNariz * hdPisoP.z;
        c = mix(c, dot(c, ${LUMA}) * vec3(0.40, 0.56, 0.26), 0.65 * hdMusC);
        c = hdUmido(c, 0.8 * hdCanM) * (1.0 - 0.6 * hdCanM) * (1.0 - 0.3 * hdCanF) * (1.0 + 0.14 * hdCanB) * (1.0 + 0.03 * hdReb) * (1.0 - 0.18 * hdRebL); hdAlt -= 0.035 * hdCanM + 0.02 * hdReb;
        // Mancha de água direcional no patamar 1 (y 2,53): faixa de 50 cm em x −0,6 descendo para o lance (z 6,6 → 3,0).
        float hdMan = step(abs(vHdPos.y - 2.53), 0.08) * (1.0 - smoothstep(0.22 + 0.1 * (m2.g - 0.5), 0.40, abs(p.x + 0.6 + 0.15 * (a.g - 0.5)))) * smoothstep(6.6, 4.0, p.y) * step(3.0, p.y) * (0.6 + 0.4 * m2.r);
        c = hdUmido(c, 0.45 * hdMan) * (1.0 - 0.22 * hdMan);
        c = mix(c, dot(c, ${LUMA}) * vec3(0.45, 0.62, 0.30), 0.55 * hdLimo);
        // Poça: halo úmido de 10 cm, água escura que puxa levemente para o cinza-azulado do céu, superfície lisa.
        c = hdUmido(c, 0.45 * hdPo.y) * (1.0 - 0.18 * hdPo.y);
        c = mix(c, hdUmido(c, 0.9) * 0.48 + vec3(0.012, 0.015, 0.02), hdPo.x);
        float musgo = parede * smoothstep(0.35, 0.65, m2.a * 0.6 + a.r * 0.4);
        c = hdUmido(c, 0.4 * parede) * (1.0 - 0.25 * parede);
        c = mix(c, dot(c, ${LUMA}) * vec3(0.42, 0.56, 0.28), 0.6 * musgo);
        if (hdNariz > 0.5 && vHdJs.z > 0.001) { float d = vHdJc.z + vHdJs.z - vHdPos.z, lasca = step(0.8, hdH(vec2(floor(vHdJc.z * 7.0), 4.0))) * smoothstep(0.45, 0.60, texture2D(hdRuido, vec2(vHdPos.x * 0.9, vHdJc.z * 3.1)).a);
          float nariz = lasca * smoothstep(0.03 + 0.04 * lasca, 0.0, d), aresta = (1.0 - smoothstep(0.012, 0.02 + fwidth(vHdPos.z), d)) * (1.0 - nariz);
          c *= (1.0 - 0.30 * nariz) * (1.0 + 0.16 * aresta); hdAlt -= 0.006 * nariz; }
        diffuseColor.rgb = c; hdRug = mix(mix(mix(mix(mix(mix(hdRug, 0.72, 0.5 * parede), 0.30, canal), 0.25, hdPo.x), 0.95, hdAsf), 0.6, hdMan), 0.32, hdOleo); hdRel *= (1.0 - hdPo.x) * (1.0 - 0.7 * hdAsf) * (1.0 - hdOleo);
        hdAlt += (0.004 * (m2.b - 0.5) * hdVis(0.02, p) - 0.004 * junta) * (1.0 - hdPo.x) * (1.0 - hdAsf); }
      else { float hdY = hdAltura(vHdPos); vec2 hdQ = vec2(vHdPos.x + vHdPos.z, vHdPos.y); float hdS = vHdVar.x;
        vec4 hdA = texture2D(hdRuido, hdQ * 0.08, 4.0), hdM = texture2D(hdRuido, hdQ * 0.83 + 0.37 + hdS * 7.0), hdM2 = hdMeio(hdQ, hdS); float hdMf = 0.5 * (hdM.r + hdM2.r);
        float hdCorpo = hdFaixaCorpo(hdY), hdFora = 1.0 - hdCorpo, hdTopo = vHdJs.y > 0.001 ? vHdJc.y + vHdJs.y - vHdPos.y : 1000.0; hdRug = 0.92;
        // No corpo só o grão da textura (hdGrao); fora dele a textura inteira, borrada (mip 6) de longe.
        vec3 hdT0, hdTb, hdMed; if (hdNariz > 0.5) { hdT0 = texture2D(map, vMapUv).rgb; hdTb = texture2D(map, vMapUv, 6.0).rgb; hdMed = ${v3(CONJ.piso.media)}; }
          else { hdT0 = texture2D(hdForma, vMapUv * ${k}).rgb; hdTb = texture2D(hdForma, vMapUv * ${k}, 6.0).rgb; hdMed = ${v3(CONJ.forma.media)}; }
        vec3 hdTf = mix(mix(hdTb, hdT0, hdFino) / hdMed, hdGrao(hdT0, hdTb), hdCorpo);
        // Faixa do corpo: grão ±6 %, média frequência ±7 % (hdMf, 15–40 cm) e relevo ×1,5; fora, a máscara lenta.
        float hdGp = hdGraoP(hdQ, 0.016); vec3 c = hdParT * hdTf * (0.89 + 0.12 * hdGp) * mix(mix(0.92, 1.06, hdA.r) * mix(0.96, 1.03, hdM.r), mix(0.93, 1.07, hdMf), hdCorpo);
        hdRel *= mix(1.0, 1.5, hdCorpo); hdAlt += 0.006 * (hdMf - 0.5) + 0.003 * (hdGp - 0.5);
        float hdEsc = hdEscorrido(hdQ, hdTopo, hdS) * hdFora;
        c = hdUmido(c, 0.15 * hdEsc) * (1.0 - 0.05 * hdEsc);
        // Muro de concreto (não espelho, ≥ 1,4 m): marca de tábua e barbacãs com escorrido e musgo; sombra de contato sob laje e no pé.
        float hdMuro = (1.0 - hdNariz) * step(0.7, vHdJs.y), hdWy = max(fwidth(hdY) * 1.5, 0.004);
        if (hdMuro > 0.5) { float hdAro; vec4 hdFo = hdBarbaca(hdQ, hdY, hdS, hdM, hdA, hdWy, hdAro);
          c *= (1.0 + 0.06 * hdFo.y) * (1.0 - 0.18 * hdFo.x); c = hdUmido(c, 0.6 * hdFo.w) * (1.0 - 0.3 * hdFo.w);
          c = mix(c, dot(c, ${LUMA}) * vec3(0.5, 0.66, 0.3), 0.5 * hdFo.w * smoothstep(0.30, 0.05, hdY));
          c = mix(mix(c, vec3(0.55, 0.53, 0.48), hdAro), vec3(0.05, 0.05, 0.045), hdFo.z); hdAlt += 0.012 * hdAro - 0.012 * hdFo.z - 0.002 * hdFo.x; hdRel *= 1.0 - 0.5 * hdFo.z; }
        c *= (1.0 - 0.28 * hdBeiral(vHdPos) * hdMuro) * (1.0 - 0.18 * smoothstep(0.22, 0.0, hdY) * hdAltoBox() * (1.0 - hdNariz));
        float hdTr = hdTrinca(hdQ + 2.0 + hdS * 5.0, hdA.a, hdS, hdY); c *= 1.0 - 0.4 * mix(1.0, 0.25, hdCorpo) * hdTr; hdAlt -= 0.003 * hdTr;
        float hdSuj = smoothstep(0.50, 0.04, hdY) * (0.45 + 0.55 * hdA.r) * hdAltoBox() * hdFora; c = hdUmido(c, 0.45 * hdSuj) * (1.0 - 0.15 * hdSuj);
        float hdMusgo = smoothstep(0.30, 0.03, hdY) * smoothstep(0.50, 0.70, hdM.a) * hdAltoBox(); c = mix(c, dot(c, ${LUMA}) * vec3(0.83, 1.10, 0.50), 0.45 * hdMusgo);
        // Espelho do degrau: a faixa úmida da canaleta desce pelo espelho (continuidade da água), com limo onde o ruído deixa.
        float hdCanE = max(1.0 - smoothstep(0.075, 0.14, hdCanalD(vHdPos)), 1.0 - smoothstep(0.065, 0.09, hdCanalC(vHdPos))) * hdNariz * hdPisoP.z;
        // Espelho do degrau remendado (k = 7 do lance 2, z 4,78) acompanha o remendo do piso.
        float hdRemE = hdNariz * step(abs(vHdJc.z - 4.78), 0.05) * (1.0 - smoothstep(0.30, 0.31 + fwidth(vHdPos.x), abs(vHdPos.x + 0.55)));
        c = mix(c, hdParT * 0.95 * vec3(0.90, 0.91, 0.95) * (0.96 + 0.08 * hdM.g), hdRemE);
        c = hdUmido(c, 0.5 * hdCanE) * (1.0 - 0.3 * hdCanE); c = mix(c, dot(c, ${LUMA}) * vec3(0.45, 0.62, 0.30), 0.35 * hdCanE * smoothstep(0.4, 0.6, hdM.a)); hdRug = mix(hdRug, 0.45, hdCanE);
        if (hdNariz > 0.5 && vHdJs.y > 0.001) { float d = vHdJc.y + vHdJs.y - vHdPos.y, lasca = step(0.8, hdH(vec2(floor(vHdJc.z * 7.0), 4.0))) * smoothstep(0.45, 0.60, texture2D(hdRuido, vec2(vHdPos.x * 0.9, vHdJc.z * 3.1)).a);
          float nariz = lasca * smoothstep(0.03 + 0.04 * lasca, 0.0, d), aresta = (1.0 - smoothstep(0.012, 0.02 + fwidth(vHdPos.y), d)) * (1.0 - nariz);
          c *= (1.0 - 0.30 * nariz) * (1.0 + 0.16 * aresta); hdAlt -= 0.006 * nariz; }
        diffuseColor.rgb = c; }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * hdRug;')
      .replace('#include <normal_fragment_maps>', NORMAL.replace('vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;',
        `vec3 mapN; if (hdPiso > 0.5) mapN = texture2D(normalMap, vNormalMapUv, 1.0).xyz * 2.0 - 1.0; else if (hdNariz > 0.5) mapN = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0; else mapN = texture2D(hdFormaN, vNormalMapUv * ${k}).xyz * 2.0 - 1.0;`) + ALTURA); };
  m.customProgramCacheKey = () => 'escadao-hd-concreto12';
}

// Tijolo aparente procedural (hdBaiano; a textura do mapa fica ligada mas não é lida). m.color vira branco em aplica():
// o albedo sai inteiro daqui (restaurado em desliga()). Batente/empena fina (hdBat) vira concreto. Ver docs/hd-kit/escadao.md#tijolo.
function tijoloHD(m, U) {
  m.onBeforeCompile = (shader) => { comMundo(shader, U);
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `${CABECA} { float hdY = hdAltura(vHdPos); vec2 hdQ = vec2(vHdPos.x + vHdPos.z, vHdPos.y); float hdS = vHdVar.x;
      vec4 hdA = texture2D(hdRuido, hdQ * 0.137 + hdS * 3.0), hdM = texture2D(hdRuido, hdQ * 0.83 + 0.37 + hdS * 7.0), hdM2 = hdMeio(hdQ, hdS);
      float hdCorpo = hdFaixaCorpo(hdY), hdFora = 1.0 - hdCorpo, hdTopo = vHdJs.y > 0.001 ? vHdJc.y + vHdJs.y - vHdPos.y : 1000.0;
      // hdBat (concreto 14 % mais escuro, lasca na aresta, sem tijolo): batente ≤ 16 cm x ≤ 1,24 m, empena de 20–50 cm (≥ 3 m x ≥ 5 m),
      // moradias dos becos (|x| 13,5–16, z 6–15) e pilar ≤ 0,8 x 0,8 m com ≥ 2 m. Ver docs/hd-kit/escadao.md#tijolo.
      vec3 hdGn = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))); float hdFino = min(vHdJs.x, vHdJs.z), hdLargo = max(vHdJs.x, vHdJs.z);
      float hdBeco = step(13.5, abs(vHdJc.x)) * step(abs(vHdJc.x), 16.0) * step(6.0, vHdJc.z) * step(vHdJc.z, 15.0), hdPilar = step(hdLargo, 0.4) * step(1.0, vHdJs.y);
      float hdBat = step(0.001, vHdJs.y) * max(max(max(step(hdFino, 0.08) * step(hdLargo, 0.62), step(0.1, hdFino) * step(hdFino, 0.25) * step(1.5, vHdJs.y) * step(2.5, hdLargo)), hdBeco), hdPilar);
      if (hdBat > 0.5) { float hdDe = abs(hdGn.x) > abs(hdGn.z) ? vHdJs.z - abs(vHdPos.z - vHdJc.z) : vHdJs.x - abs(vHdPos.x - vHdJc.x);
        float hdChip = (1.0 - smoothstep(0.012, mix(0.03, 0.018, hdCorpo), hdDe + 0.02 * (hdM.b - 0.5))) * step(mix(0.72, 0.9, hdCorpo), hdM2.r) * hdVis(0.012, hdQ);
        vec3 hdCim = vec3(0.44, 0.43, 0.40) * (0.9 + 0.2 * hdM.g) * mix(mix(0.92, 1.08, hdA.r), 1.0, hdCorpo) * mix(0.95, 1.05, 0.5 * (hdM.r + hdM2.r));
        diffuseColor.rgb *= mix(hdCim, vec3(0.30, 0.29, 0.27) * (0.8 + 0.4 * hdM.b), hdChip); hdAlt = -0.006 * hdChip + 0.004 * (hdM2.r - 0.5) * hdVis(0.02, hdQ); hdRug = 0.95; hdRel = 0.6; }
      else { float hdJ; vec4 hdBai = hdBaiano(hdQ, hdS, hdCorpo, hdA, hdM, hdJ);
        // Argamassa escorrida sob a junta (35 % das fiadas, 1–3 cm); reboco parcial só acima de 2,1 m em 50 % das caixas; na QUINA
        // (face cuja normal segue a dimensão fina da caixa, ≤ 35 cm) os 6 furos do bloco (2 x 3 de Ø 2,2 cm) em escuro e relevo.
        vec2 hdBq = vec2((hdQ.x + hdS * 3.0) / 0.21 + 0.5 * floor(hdQ.y / 0.16), hdQ.y / 0.16), hdBid = floor(hdBq), hdBf = (fract(hdBq) - 0.5) * vec2(0.21, 0.16);
        float hdSmL = 0.01 + 0.02 * hdH(hdBid + 41.0), hdSm = step(0.65, hdH(vec2(hdBid.y, 44.0))) * step(0.4, hdH(hdBid + 45.0)) * (1.0 - smoothstep(hdSmL * 0.5, hdSmL, 0.08 - hdBf.y - 0.006)) * step(0.0, hdBf.y) * smoothstep(0.012, 0.004, fwidth(hdQ.y)) * (1.0 - hdJ);
        hdBai.rgb = mix(hdBai.rgb, vec3(0.19, 0.185, 0.17) * (0.85 + 0.3 * hdM.g), 0.8 * hdSm); hdBai.a += 0.002 * hdSm;
        float hdRebP2 = step(0.5, hdH(vec2(floor(hdS * 97.0), 51.0))) * smoothstep(2.1, 2.25, hdY) * smoothstep(0.52, 0.58, texture2D(hdRuido, hdQ * 0.31 + hdS * 4.0, 2.0).g + 0.06 * (hdM.r - 0.5));
        vec3 hdEmb = vec3(0.40, 0.385, 0.35) * (0.8 + 0.4 * hdM.r) * (0.95 + 0.1 * hdGraoP(hdQ, 0.012)); hdBai.rgb = mix(hdBai.rgb, hdEmb, hdRebP2); hdBai.a = mix(hdBai.a, 0.008, hdRebP2);
        float hdQuina = step(0.001, vHdJs.y) * step(abs(hdGn.x) > abs(hdGn.z) ? vHdJs.z : vHdJs.x, 0.35) * hdVis(0.012, hdQ) * (1.0 - hdRebP2);
        vec2 hdFq = vec2((hdQ.x + hdS * 3.0) / 0.09, hdQ.y / 0.16), hdFf = (fract(hdFq) - 0.5) * vec2(0.09, 0.16);
        vec2 hdFc = vec2(sign(hdFf.x) * 0.022, clamp(floor(hdFf.y / 0.045 + 0.5), -1.0, 1.0) * 0.045), hdFd = hdFf - hdFc;
        float hdFuro = (1.0 - smoothstep(0.009, 0.012 + fwidth(hdQ.x), length(hdFd))) * hdQuina * (1.0 - hdJ);
        hdBai.rgb *= 1.0 - 0.72 * hdFuro; hdBai.a -= 0.012 * hdFuro;
        diffuseColor.rgb *= hdBai.rgb; hdAlt = hdBai.a; hdRug = mix(0.9, 1.0, max(hdJ, hdRebP2)); hdRel = mix(0.15, 0.6, hdRebP2); }
      float hdEsc = hdEscorrido(hdQ, hdTopo, hdS) * hdFora;
      diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.15 * hdEsc) * (1.0 - 0.05 * hdEsc);
      float hdTr = hdTrinca(hdQ + hdS * 5.0, hdA.a, hdS, hdY); diffuseColor.rgb *= 1.0 - 0.42 * mix(1.0, 0.25, hdCorpo) * hdTr; hdAlt -= 0.003 * hdTr;
      float hdSuj = smoothstep(0.45, 0.04, hdY) * (0.45 + 0.55 * hdA.r) * hdAltoBox() * hdFora;
      diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.8 * hdSuj) * (1.0 - 0.40 * hdSuj);
      float hdMusgo = smoothstep(0.30, 0.03, hdY) * smoothstep(0.50, 0.70, hdM.a) * hdAltoBox();
      diffuseColor.rgb = mix(diffuseColor.rgb, dot(diffuseColor.rgb, ${LUMA}) * vec3(0.50, 0.66, 0.30), 0.55 * hdMusgo); }`);
    ganchos(shader); };
  m.customProgramCacheKey = () => 'escadao-hd-tijolo9';
}

// Janela: o painel escuro do mapa vira caixilho + vidro do atlas (cor + altura no alfa), célula pela posição do vão, UV recortado
// a 0,02–0,98. Caixa sem hdJc/hdJs fica tinta lisa. Células permitidas e o porquê: docs/hd-kit/escadao.md#janela.
const CEL_JANELA = [[.26, 0], [.50, 2], [.70, 3], [.84, 5], [1.01, 6]];
function janelaHD(m, U) {
  m.onBeforeCompile = (shader) => { comMundo(shader, U, 0, 'uniform sampler2D hdJanelas;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float hdVid = 0.0, hdJan = 0.0, hdFres = 0.0, hdAlt = 0.0; vec3 hdRefl = vec3(0.0, 1.0, 0.0);
        { vec3 hdGn = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))), hdV = normalize(vHdPos - cameraPosition); if (dot(hdGn, hdV) > 0.0) hdGn = -hdGn;
          float hdEx = step(vHdJs.x, vHdJs.z); vec2 hdS = vec2(mix(vHdJs.x, vHdJs.z, hdEx), vHdJs.y);
          if (hdS.x > 0.12 && hdS.y > 0.15 && min(vHdJs.x, vHdJs.z) < 0.08 && abs(hdGn.y) < 0.5) { hdJan = 1.0;
            vec3 hdTg = mix(vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0), hdEx); float hdVn = max(-dot(hdV, hdGn), 0.15);
            vec2 hdQ = vec2(dot(vHdPos - vHdJc, hdTg), vHdPos.y - vHdJc.y); float hdId = hdH(floor(vHdJc.xz * 2.0) + floor(vHdJc.y * 2.0));
            float hdCel = ${CEL_JANELA.map(([p, c]) => `hdId < ${p.toFixed(2)} ? ${c.toFixed(1)} : `).join('')}0.0;
            float hdEsp = step(0.5, fract(hdId * 37.0)), hdRep = max(1.0, floor(hdS.x / hdS.y + 0.5));
            vec2 hdU0 = hdQ / hdS * 0.5 + 0.5; hdU0.x = fract(hdU0.x * hdRep); hdU0.x = mix(hdU0.x, 1.0 - hdU0.x, hdEsp);
            vec2 hdCe = vec2(mod(hdCel, 3.0), floor(hdCel / 3.0)), hdC0 = (hdCe + 0.02) / 3.0, hdC1 = (hdCe + 0.98) / 3.0;
            vec2 hdAt = clamp((hdCe + vec2(hdU0.x, 1.0 - hdU0.y)) / 3.0, hdC0, hdC1);
            vec4 hdTx = texture2D(hdJanelas, hdAt); float hdSol = step(0.5, hdTx.a);
            vec2 hdPar = vec2(dot(hdV, hdTg) * mix(1.0, -1.0, hdEsp) * hdRep, -hdV.y) * (0.045 / hdVn) / (hdS * 2.0) / 3.0;
            vec4 hdTx2 = texture2D(hdJanelas, clamp(hdAt + hdPar, hdC0, hdC1));
            hdTx = mix(hdTx2, hdTx, hdSol); hdSol = step(0.5, hdTx.a);
            hdAlt = hdSol > 0.5 ? (hdTx.a - 0.55) * 0.05 : hdTx.a * 0.008;
            diffuseColor.rgb = hdTx.rgb * (0.80 + 0.36 * hdId) * (1.0 - 0.45 * smoothstep(0.78, 1.0, hdU0.y) * (1.0 - hdSol)) * mix(1.0, 0.7, (1.0 - hdSol) * hdU0.y);
            // De longe (pixel ≥ 1,5 cm) a célula lê como retângulo cinza: vidro −45 %, caixilho +30 % e sombra da verga no topo.
            float hdLonge = smoothstep(0.008, 0.02, max(length(dFdx(vHdPos)), length(dFdy(vHdPos))));
            diffuseColor.rgb *= mix(1.0, mix(0.55, 1.3, hdSol), hdLonge) * (1.0 - 0.25 * smoothstep(0.80, 0.9, hdU0.y) * (1.0 - hdSol));
            // Fresnel leve sem cubo: reflexo do céu (gradiente vertical: mais no alto do vidro) + 15 % de reflexo difuso no rasante.
            hdVid = 1.0 - hdSol; hdRefl = reflect(hdV, hdGn); hdFres = (0.14 + 0.86 * pow(1.0 - hdVn, 3.0)) * (hdTx.a < 0.03 ? 1.0 : 0.4) * (0.6 + 0.6 * hdU0.y);
            vec2 hdDb = hdS - abs(hdQ); float hdPxQ = max(fwidth(hdQ.x), fwidth(hdQ.y)), hdFundo = hdQ.y + hdS.y;
            float hdAro = 1.0 - smoothstep(0.03, 0.055 + hdPxQ, min(hdDb.x, hdDb.y)); hdAlt += 0.025 * hdAro * (1.0 - hdVid);
            float hdPeit = 1.0 - smoothstep(0.065, 0.08 + hdPxQ, hdFundo), hdPeitA = 1.0 - smoothstep(0.008, 0.016 + hdPxQ, abs(hdFundo - 0.085));
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.085, 0.08, 0.075), hdPeit) * (1.0 + 0.5 * hdPeitA); hdAlt += 0.03 * hdPeitA - 0.01 * hdPeit;
            hdVid *= 1.0 - hdPeit; } }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(mix(roughnessFactor, 0.7, hdJan), 0.10, hdVid);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = hdBump(normal, -vViewPosition, hdAlt);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (hdVid > 0.0) totalEmissiveRadiance += hdVid * hdFres * mix(vec3(0.26, 0.24, 0.21), vec3(0.34, 0.46, 0.68), smoothstep(-0.1, 0.5, hdRefl.y));`); };
  m.customProgramCacheKey = () => 'escadao-hd-janela6';
}

// Porta de madeira do mapa: cinco tipos do atlas (cor + altura no alfa) por posição, tinta pastel, sujeira no pé.
function portaHD(m, U) {
  m.onBeforeCompile = (shader) => { comMundo(shader, U, 0, 'uniform sampler2D hdPortas;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float hdPor = 0.0, hdSol = 1.0, hdAlt = 0.0;
        { vec3 hdGn = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))); float hdEx = step(vHdJs.x, vHdJs.z); vec2 hdS = vec2(mix(vHdJs.x, vHdJs.z, hdEx), vHdJs.y);
          if (hdS.x > 0.3 && hdS.x < 0.75 && hdS.y > 0.7 && hdS.y < 1.15 && min(vHdJs.x, vHdJs.z) < 0.08 && abs(hdGn.y) < 0.5) { hdPor = 1.0;
            vec3 hdTg = mix(vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0), hdEx); vec2 hdQ = vec2(dot(vHdPos - vHdJc, hdTg), vHdPos.y - vHdJc.y);
            float hdId = hdH(floor(vHdJc.xz * 2.0) + floor(vHdJc.y * 2.0) + 3.0), hdTipo = floor(hdId * 4.999), hdK = floor(fract(hdId * 53.0) * 4.999);
            vec2 hdU0 = clamp(hdQ / hdS * 0.5 + 0.5, 0.01, 0.99); hdU0.x = mix(hdU0.x, 1.0 - hdU0.x, step(0.5, fract(hdId * 29.0)));
            vec4 hdTx = texture2D(hdPortas, vec2((hdTipo + hdU0.x) / 5.0, 1.0 - hdU0.y)); hdSol = step(0.5, hdTx.a);
            hdAlt = hdSol > 0.5 ? (hdTx.a - 0.55) * 0.035 : hdTx.a * 0.005;
            vec3 hdTinta = hdK < 0.5 ? vec3(1.0) : hdK < 1.5 ? vec3(0.70, 0.80, 0.92) : hdK < 2.5 ? vec3(0.68, 0.80, 0.66) : hdK < 3.5 ? vec3(0.93, 0.88, 0.78) : vec3(0.58, 0.62, 0.66);
            vec4 hdN = texture2D(hdRuido, hdQ * 0.8 + hdId * 7.0);
            diffuseColor.rgb = hdTx.rgb * hdTinta * (0.82 + 0.3 * fract(hdId * 7.0)) * (0.9 + 0.2 * hdN.r) * (1.0 - 0.35 * smoothstep(0.35, 0.0, hdU0.y) * hdN.a); } }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, mix(0.22, 0.78, hdSol), hdPor);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = hdBump(normal, -vViewPosition, hdAlt);'); };
  m.customProgramCacheKey = () => 'escadao-hd-porta1';
}

// Ferro: a mesma cor serve portão, veneziana, grade e corrimão; a caixa decide (portão 0,6–1,5 x 1,4–2,3 m, veneziana 1,04 x 0,96 m,
// painel liso 0,72 x 0,85 m = basculante do atlas). O resto é tinta com ferrugem. Ver docs/hd-kit/escadao.md#ferro.
function ferroHD(m, U) {
  m.onBeforeCompile = (shader) => { comMundo(shader, U, 0, 'uniform sampler2D hdJanelas;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float hdPor = 0.0, hdSol = 1.0, hdAlt = 0.0, hdFerr = 0.0, hdPint = 0.0;
        { vec3 hdGn = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))); float hdEx = step(vHdJs.x, vHdJs.z); vec2 hdS = vec2(mix(vHdJs.x, vHdJs.z, hdEx), vHdJs.y);
          float hdFino = step(min(vHdJs.x, vHdJs.z), 0.06) * step(abs(hdGn.y), 0.5), hdId = hdH(floor(vHdJc.xz * 2.0) + floor(vHdJc.y * 2.0) + 5.0);
          vec3 hdTg = mix(vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0), hdEx); vec2 hdQ = vec2(dot(vHdPos - vHdJc, hdTg), vHdPos.y - vHdJc.y);
          vec4 hdN = texture2D(hdRuido, vec2(vHdPos.x + vHdPos.z, vHdPos.y) * 2.1 + hdId);
          if (hdFino > 0.5 && hdS.x > 0.3 && hdS.x < 0.75 && hdS.y > 0.7 && hdS.y < 1.15) { hdPint = 1.0;
            float hdU = clamp(hdQ.y / hdS.y * 0.5 + 0.5, 0.0, 1.0), hdK = fract(hdId * 41.0), hdHb = hdQ.y + hdS.y, hdPxl = max(fwidth(hdHb), 0.0005);
            vec2 hdDb = hdS - abs(hdQ); float hdLadoC = step(0.5, fract(hdId * 19.0)) * 2.0 - 1.0, hdBx = hdLadoC * hdQ.x;
            // Tinta em camadas: cor atual por caixa sobre a antiga, que aparece em descascados de ruído fino (6,3 ciclos/m).
            vec3 hdTinta = hdK < 0.34 ? vec3(0.22, 0.30, 0.24) : (hdK < 0.67 ? vec3(0.20, 0.27, 0.36) : vec3(0.34, 0.30, 0.25));
            vec3 hdVelha = hdK < 0.34 ? vec3(0.36, 0.28, 0.18) : (hdK < 0.67 ? vec3(0.30, 0.34, 0.30) : vec3(0.22, 0.28, 0.34));
            vec4 hdN2 = texture2D(hdRuido, vec2(vHdPos.x + vHdPos.z, vHdPos.y) * 6.3 + hdId * 3.0);
            float hdDesc = smoothstep(0.66, 0.72, hdN2.a * 0.6 + hdN.g * 0.4);
            vec3 hdCor = mix(hdTinta, hdVelha, hdDesc) * (0.81 + 0.22 * hdN.r) * (1.0 - 0.10 * smoothstep(0.8, 1.0, hdU));
            // Quadro de metalon (5 cm) e travessa central (4 cm): 4 mm à frente, aresta clara, AO para dentro; AO junto aos 3 frisos autorais.
            float hdQd = min(hdDb.x, hdDb.y), hdQuadro = 1.0 - smoothstep(0.05, 0.05 + hdPxl, hdQd), hdTrav = 1.0 - smoothstep(0.02, 0.02 + hdPxl, abs(hdQ.y));
            float hdMet = max(hdQuadro, hdTrav), hdAresta = (1.0 - smoothstep(0.0, 0.004 + hdPxl, abs(hdQd - 0.05))) * (1.0 - hdTrav) + (1.0 - smoothstep(0.0, 0.004 + hdPxl, abs(abs(hdQ.y) - 0.02))) * (1.0 - hdQuadro);
            float hdAo = 1.0 - 0.14 * (1.0 - smoothstep(0.05, 0.08, hdQd)) * (1.0 - hdMet) - 0.10 * (1.0 - smoothstep(0.02, 0.045, abs(hdQ.y))) * (1.0 - hdMet);
            float hdDf = abs(fract(hdQ.x / 0.25 + 0.5) - 0.5) * 0.25; hdAo *= 1.0 - 0.10 * (1.0 - smoothstep(0.015, 0.07, hdDf)) * step(abs(hdQ.x), 0.33);
            // Sombra de recesso: 14 cm sob a verga e 10 cm no lado das dobradiças (a folha fica 3,5 cm à frente do marco autoral).
            float hdRec = 0.30 * (1.0 - smoothstep(0.0, 0.14, hdDb.y)) * step(0.0, hdQ.y) + 0.18 * (1.0 - smoothstep(0.0, 0.10, hdBx + hdS.x));
            hdCor = mix(hdCor * hdAo, hdCor * 0.92, hdMet) * (1.0 + 0.18 * hdAresta) * (1.0 - hdRec);
            // Rebites Ø 1 cm a cada 25 cm nos montantes e travessas; escorrido de ferrugem sob metade deles (≤ 12,5 cm) e sob a travessa.
            float hdRy = fract(hdQ.y / 0.25 + 0.5) * 0.25, hdRx = fract(hdQ.x / 0.25 + 0.5) * 0.25, hdRiL = floor(hdQ.y / 0.25 + 0.5);
            vec2 hdRv = vec2(abs(hdQ.x) - (hdS.x - 0.025), hdRy - 0.125), hdRv2 = vec2(hdRx - 0.125, min(abs(abs(hdQ.y) - (hdS.y - 0.025)), abs(hdQ.y)));
            float hdRiv = max(1.0 - smoothstep(0.005, 0.005 + hdPxl, length(hdRv)), 1.0 - smoothstep(0.005, 0.005 + hdPxl, length(hdRv2)));
            float hdDrip = step(0.5, hdH(vec2(hdRiL, sign(hdQ.x) + hdId * 9.0))) * step(hdRy, 0.125) * (1.0 - (0.125 - hdRy) / 0.125 * (0.6 + 0.4 * hdN.r)) * (1.0 - smoothstep(0.004, 0.008, abs(hdRv.x) + 0.003 * (hdN.g - 0.5)));
            float hdDr2 = step(0.6, hdH(vec2(floor(hdQ.x / 0.12), hdId * 7.0))) * (1.0 - smoothstep(0.003, 0.006, abs(fract(hdQ.x / 0.12) * 0.12 - 0.06 + 0.01 * (hdN.g - 0.5)))) * smoothstep(-0.12, -0.02, hdQ.y) * step(hdQ.y, -0.02);
            vec3 hdRust = vec3(0.26, 0.14, 0.08) * (0.7 + 0.5 * hdN.g);
            hdFerr = min(1.0, smoothstep(0.45, 0.75, hdN.a + 0.4 * smoothstep(0.4, 0.0, hdHb)) * smoothstep(0.45, 0.08, hdHb) + 0.5 * smoothstep(0.86, 0.94, hdN.a));
            float hdTrilho = 1.0 - smoothstep(0.03, 0.07, hdHb);
            diffuseColor.rgb = mix(hdCor, hdRust, max(hdFerr, 0.7 * max(hdDrip, hdDr2))) * (1.0 - 0.6 * hdTrilho);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.30, 0.30, 0.28) * (0.8 + 0.4 * hdN.r), hdRiv);
            // 3 dobradiças (3 x 9 cm, nó com brilho) no lado oposto ao cadeado, a 0,25 / 0,95 / 1,65 m da base.
            float hdHg = 0.0; for (int i = 0; i < 3; i++) { vec2 hp = vec2(hdBx + hdS.x - 0.03, hdHb - (0.25 + 0.7 * float(i))); hdHg = max(hdHg, 1.0 - smoothstep(0.0, hdPxl, length(max(abs(hp) - vec2(0.008, 0.035), 0.0)) - 0.007)); }
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.12, 0.12, 0.11) * (0.8 + 0.4 * hdN.r) * (1.0 + 0.6 * (1.0 - smoothstep(0.0, 0.005, abs(hdBx + hdS.x - 0.03)))), hdHg);
            // Ferrolho junto à borda (lado por caixa), cadeado de latão 6 x 8 cm sob a barra e corrente em U até a argola na borda da
            // folha (hdCx 0,12 = face do batente): nenhuma ponta no ar. Medidas: docs/hd-kit/escadao.md#ferro.
            float hdCx = hdBx - (hdS.x - 0.12);
            float hdBar = step(hdS.x - 0.30, hdBx) * step(hdBx, hdS.x - 0.06) * step(abs(hdHb - 1.05), 0.016);
            vec2 hdCp = vec2(hdCx, hdHb - 0.975), hdAp = vec2(hdCx, hdHb - 1.02);
            float hdDc = length(max(abs(hdCp) - vec2(0.018, 0.030), 0.0)) - 0.012;
            float hdCorpoC = 1.0 - smoothstep(0.0, hdPxl, hdDc), hdAro = smoothstep(-0.006, -0.0015, hdDc), hdFuro = 1.0 - smoothstep(0.004, 0.004 + hdPxl, length(hdCp - vec2(0.0, -0.012)));
            float hdArco = (1.0 - smoothstep(0.0035, 0.0035 + hdPxl, abs(length(hdAp) - 0.024))) * step(0.0, hdAp.y);
            vec2 hdCa = vec2(0.028, 0.985), hdCb = vec2(0.102, 1.032), hdPq = vec2(hdCx, hdHb); float hdDch = 1.0, hdSch = 0.0, hdLch = 0.0;
            for (int i = 0; i < 8; i++) { float t0 = float(i) * 0.125, t1 = t0 + 0.125;
              vec2 a = mix(hdCa, hdCb, t0) - vec2(0.0, 0.36 * t0 * (1.0 - t0)), ab = mix(hdCa, hdCb, t1) - vec2(0.0, 0.36 * t1 * (1.0 - t1)) - a;
              float ln = length(ab), h = clamp(dot(hdPq - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0), dd = length(hdPq - a - ab * h);
              if (dd < hdDch) { hdDch = dd; hdSch = hdLch + h * ln; } hdLch += ln; }
            float hdElo = min(fract(hdSch / 0.024), 1.0 - fract(hdSch / 0.024)) * 0.024, hdWch = mix(0.0025, 0.0045, step(0.5, fract(hdSch / 0.048)));
            float hdChain = (1.0 - smoothstep(hdWch, hdWch + hdPxl, hdDch)) * (1.0 - hdCorpoC), hdVao = (1.0 - smoothstep(0.0008, 0.0015 + hdPxl, hdElo)) * hdChain;
            float hdArg = 1.0 - smoothstep(0.003, 0.003 + hdPxl, abs(length(hdPq - vec2(0.112, 1.034)) - 0.009)); hdChain = max(hdChain, hdArg);
            diffuseColor.rgb *= 1.0 - 0.35 * (1.0 - smoothstep(0.0, 0.018, hdDc)) * (1.0 - hdCorpoC) - 0.25 * (1.0 - smoothstep(0.004, 0.012, hdDch)) * (1.0 - hdChain);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.40, 0.38) * (0.8 + 0.4 * hdN.g) * (1.0 - 0.5 * hdVao), max(hdArco, hdChain));
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.15, 0.15, 0.14) * (0.8 + 0.4 * hdN.r), hdBar);
            vec3 hdLatao = vec3(0.36, 0.25, 0.08) * (0.85 + 0.3 * hdN.g) * (1.0 + 0.5 * smoothstep(-0.03, 0.03, hdCp.y)) * (1.0 - 0.55 * hdAro) * (1.0 - 0.8 * hdFuro);
            diffuseColor.rgb = mix(diffuseColor.rgb, hdLatao, hdCorpoC);
            hdAlt = 0.0015 * hdN.b * hdFerr + 0.004 * hdMet + 0.003 * hdRiv + 0.012 * hdHg + 0.006 * hdBar + 0.012 * hdCorpoC + 0.006 * max(hdArco, hdChain) * (1.0 - hdBar); }
          else if (hdFino > 0.5 && abs(hdS.x - 0.36) < 0.03 && abs(hdS.y - 0.425) < 0.03) { hdPor = 1.0;
            vec2 hdU0 = clamp(hdQ / hdS * 0.5 + 0.5, 0.02, 0.98);
            vec4 hdTx = texture2D(hdJanelas, (vec2(2.0, 0.0) + vec2(hdU0.x, 1.0 - hdU0.y)) / 3.0); hdSol = step(0.5, hdTx.a);
            hdAlt = hdSol > 0.5 ? (hdTx.a - 0.55) * 0.04 : hdTx.a * 0.008;
            diffuseColor.rgb = hdTx.rgb * (0.75 + 0.3 * fract(hdId * 7.0)); }
          else if (hdFino > 0.5 && hdS.x > 0.3 && hdS.x < 0.56 && abs(hdS.y - 0.48) < 0.03) { hdPint = 1.0;
            // Veneziana de 2 folhas: montantes nas bordas e no meio + travessas (3,5 cm, 6 mm à frente, AO de 2 cm para dentro); 21 lâminas
            // de passo 4,2 cm em dente de serra (relevo), topo claro de 0,5 cm e sombra de 1 cm no vão; ao longe (passo < 2 px) vira tom médio.
            float hdHb = hdQ.y + hdS.y, hdPxl = max(max(fwidth(hdQ.x), fwidth(hdQ.y)), 0.0005); vec2 hdDb = hdS - abs(hdQ);
            float hdQu = 1.0 - smoothstep(0.035, 0.035 + hdPxl, min(hdDb.x, hdDb.y)), hdMeio = 1.0 - smoothstep(0.0175, 0.0175 + hdPxl, abs(hdQ.x)), hdCaix = max(hdQu, hdMeio);
            float hdAoV = 1.0 - 0.18 * (1.0 - smoothstep(0.035, 0.06, min(min(hdDb.x, hdDb.y), abs(hdQ.x) - 0.0175))) * (1.0 - hdCaix);
            float hdLam = fract((hdHb - 0.035) / 0.042), hdPr = fwidth(hdHb) / 0.042, hdLonge = smoothstep(0.25, 0.6, hdPr);
            float hdSomb = (1.0 - 0.45 * (1.0 - smoothstep(0.0, 0.25 + hdPr, hdLam)) - 0.10 * smoothstep(0.25, 0.85, hdLam)) * (1.0 + 0.18 * smoothstep(0.86 - hdPr, 0.90, hdLam) * (1.0 - smoothstep(0.97, 1.0, hdLam)));
            hdSomb = mix(hdSomb, 0.78, hdLonge) * hdAoV;
            float hdK = fract(hdId * 13.0); vec3 hdTinta = (hdK < 0.4 ? vec3(0.21, 0.24, 0.12) : (hdK < 0.7 ? vec3(0.16, 0.26, 0.20) : vec3(0.26, 0.29, 0.31))) * (0.9 + 0.2 * fract(hdId * 29.0));
            vec4 hdN2 = texture2D(hdRuido, vec2(vHdPos.x + vHdPos.z, vHdPos.y) * 6.3 + hdId * 3.0); float hdDesc = smoothstep(0.68, 0.74, hdN2.a * 0.6 + hdN.g * 0.4) * (1.0 - hdCaix);
            hdFerr = max(smoothstep(0.5, 0.78, hdN.a + 0.35 * smoothstep(0.2, 0.0, hdHb)) * smoothstep(0.25, 0.04, hdHb), 0.6 * hdDesc);
            diffuseColor.rgb = mix(hdTinta * mix(hdSomb, 1.06, hdCaix) * (0.9 + 0.2 * hdN.r), vec3(0.26, 0.14, 0.08) * (0.7 + 0.5 * hdN.g), hdFerr);
            hdAlt = 0.0015 * hdN.b * hdFerr + 0.006 * hdCaix + 0.005 * (hdLam - 0.5) * (1.0 - hdCaix) * (1.0 - hdLonge); }
          else { hdFerr = smoothstep(0.62, 0.84, hdN.a) * 0.6;
            diffuseColor.rgb *= 0.82 + 0.36 * hdN.r; diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.26, 0.14, 0.08) * (0.7 + 0.5 * hdN.g), hdFerr); hdAlt = 0.001 * hdN.b; } }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(mix(mix(roughnessFactor, 0.62, hdPint), 0.95, hdFerr), mix(0.25, 0.7, hdSol), hdPor * (1.0 - hdFerr));')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = hdBump(normal, -vViewPosition, hdAlt);'); };
  m.customProgramCacheKey = () => 'escadao-hd-ferro8';
}

// Chapa de zinco: tom por painel e ferrugem escorrida; mapa (tex_zinco) e UV ficam como estão. Régua fina (caixa ≤ 4 cm de altura)
// some com `semRegua` (discard), senão fica galvanizada clara e sem ferrugem. Ver docs/hd-kit/escadao.md#chapa.
function chapaHD(m, U, semRegua) {
  m.onBeforeCompile = (shader) => { comMundo(shader, U);
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float hdFerr = 0.0; { vec4 hdCh = texture2D(hdRuido, vHdPos.xz * 0.075 + 0.37 + vHdVar.x), hdCh2 = texture2D(hdRuido, vec2(vHdPos.x + vHdPos.z, vHdPos.y) * vec2(0.11, 0.16) + 4.1);
          float hdRegua = step(0.001, vHdJs.y) * step(vHdJs.y, 0.02);
          ${semRegua ? 'if (hdRegua > 0.5) discard;' : ''}
          float hdPainel = hdCh.r * 0.72 + hdCh.g * 0.28; hdFerr = smoothstep(0.56, 0.80, hdCh2.a * 0.72 + hdCh.b * 0.28) * (1.0 - hdRegua);
          diffuseColor.rgb *= mix(1.0 + (hdPainel - 0.5) * 0.36, 1.15, hdRegua);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.25, 0.15, 0.09) * (0.72 + 0.42 * hdCh2.r), 0.35 * hdFerr); }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.95, hdFerr);'); };
  m.customProgramCacheKey = () => 'escadao-hd-chapa3' + (semRegua ? 'r' : '');
}

// Lixeira (GLB dumpster): a pichação legível da textura vira mancha (leitura com mip 4,5) mais sujeira; a caçamba verde-oliva
// vira laranja de coleta desbotado (luma da textura × laranja escuro saturado: o AgX lava).
function lixeiraHD(m, U) {
  m.onBeforeCompile = (shader) => { comMundo(shader, U);
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#ifdef USE_MAP
      { vec4 hdT = texture2D(map, vMapUv, 4.5), hdN = texture2D(hdRuido, vHdPos.xz * 0.9 + vHdPos.y * 0.7);
        float hdLu = dot(hdT.rgb, ${LUMA}); vec3 hdLar = hdLu * vec3(1.55, 0.52, 0.10) * mix(1.0, 0.8, smoothstep(0.45, 0.7, hdN.g));
        diffuseColor.rgb *= mix(hdLar, vec3(hdLu) * vec3(0.9, 0.8, 0.7), 0.35 * smoothstep(0.5, 0.75, hdN.a)); diffuseColor.a *= hdT.a;
        diffuseColor.rgb *= (0.78 + 0.44 * hdN.r) * (1.0 - 0.35 * smoothstep(0.5, 0.75, hdN.a)); }
      #endif`); };
  m.customProgramCacheKey = () => 'escadao-hd-lixeira2';
}

// Casa GLB casa_favela_tijolo: nas faces verticais laranja do atlas cozido (máscara por croma e matiz, mip +3) entra o hdBaiano do
// tijoloHD projetado no mundo. Toras do molde (hdCol) viram pilar quadrado. Ver docs/hd-kit/escadao.md#casas-glb.
function casaTijoloHD(m, U) {
  m.onBeforeCompile = (shader) => { comMundo(shader, U);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 hdCol; varying float vHdCol; varying vec3 vHdLoc;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      vHdCol = hdCol.w; vHdLoc = position;
      if (hdCol.w > 0.5) { transformed.xz = hdCol.xy + sign(transformed.xz - hdCol.xy) * hdCol.z; vHdPos = (modelMatrix * vec4(transformed, 1.0)).xyz; }`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vHdCol; varying vec3 vHdLoc;')
      .replace('#include <map_fragment>', `${CABECA}
      #ifdef USE_MAP
      { vec4 hdT = texture2D(map, vMapUv); vec3 hdC = texture2D(map, vMapUv, 3.0).rgb;
        float hdMx = max(hdC.r, max(hdC.g, hdC.b)), hdCh = hdMx - min(hdC.r, min(hdC.g, hdC.b));
        float hdLar = step(hdC.g, hdC.r) * smoothstep(0.10, 0.145, hdCh) * smoothstep(0.285, 0.235, (hdC.g - hdC.b) / max(hdCh, 1e-4)) * smoothstep(0.5, 0.65, hdCh / max(hdMx, 1e-4));
        vec3 hdGn = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))); float hdMask = hdLar * step(abs(hdGn.y), 0.5) * (1.0 - vHdCol);
        vec2 hdQ = vec2(vHdPos.x + vHdPos.z, vHdPos.y) + 0.7; float hdY = hdAltura(vHdPos), hdCorpo = hdFaixaCorpo(hdY), hdJ;
        vec4 hdA = texture2D(hdRuido, hdQ * 0.137 + 1.1), hdM = texture2D(hdRuido, hdQ * 0.83 + 2.96); vec4 hdBai = hdBaiano(hdQ, 0.37, hdCorpo, hdA, hdM, hdJ);
        vec3 hdTij = vec3(dot(hdBai.rgb, ${LUMA})) + (hdBai.rgb - vec3(dot(hdBai.rgb, ${LUMA}))) * 1.15;
        diffuseColor.rgb = mix(diffuseColor.rgb * hdT.rgb, hdTij, hdMask); diffuseColor.a *= hdT.a; hdAlt += hdBai.a * hdMask; hdRel = mix(1.0, 0.15, hdMask);
        if (vHdCol > 0.5) { float hdFx = 1.0 - smoothstep(0.004, 0.008 + fwidth(hdY), abs(fract(hdY / 0.45) - 0.5) * 0.45);
          diffuseColor.rgb = vec3(0.42, 0.41, 0.38) * (0.86 + 0.28 * hdM.r) * (0.94 + 0.12 * hdA.g) * (1.0 - 0.12 * hdFx) * (1.0 - 0.28 * smoothstep(0.45, 0.05, hdY));
          diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.4 * smoothstep(0.3, 0.05, hdY)); hdRel = 0.0; hdAlt = 0.003 * (hdM.b - 0.5) - 0.004 * hdFx; }
        float hdDentro = smoothstep(0.03, 0.10, min(0.47 - abs(vHdLoc.x), 0.50 - abs(vHdLoc.z))) * (1.0 - vHdCol) * step(hdGn.y, 0.7) * smoothstep(0.08, -0.02, vHdLoc.y);
        diffuseColor.rgb *= 1.0 - 0.4 * hdDentro; }
      #endif`).replace('#include <normal_fragment_maps>', NORMAL + '\nif (vHdCol > 0.5) normal = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition)));' + ALTURA); };
  m.customProgramCacheKey = () => 'escadao-hd-casa6';
}

// Casa GLB casa_favela_azul (a do mirante em (7; −24)): faces de croma azul (b > r e b > g, croma ≥ 0,12) viram pintura azul lavada
// sobre reboco; madeira, vidro e o resto do atlas não mudam. Ver docs/hd-kit/escadao.md#casas-glb.
function casaAzulHD(m, U) {
  m.onBeforeCompile = (shader) => { comMundo(shader, U);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHdLoc;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvHdLoc = position;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vHdLoc;')
      .replace('#include <map_fragment>', `${CABECA}
      #ifdef USE_MAP
      { vec4 hdT = texture2D(map, vMapUv); vec3 hdC = texture2D(map, vMapUv, 3.0).rgb;
        float hdMx = max(hdC.r, max(hdC.g, hdC.b)), hdCh = hdMx - min(hdC.r, min(hdC.g, hdC.b));
        float hdAz = step(hdC.r, hdC.b) * step(hdC.g, hdC.b) * smoothstep(0.08, 0.12, hdCh);
        vec3 hdGn = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))); float hdCima = step(0.5, abs(hdGn.y));
        vec2 hdQ = vec2((abs(hdGn.x) > abs(hdGn.z) ? vHdPos.z : vHdPos.x) + 4.1, vHdPos.y); float hdY = hdAltura(vHdPos), hdCorpo = hdFaixaCorpo(hdY);
        vec4 hdA = texture2D(hdRuido, hdQ * 0.08 + 1.7, 4.0), hdM = texture2D(hdRuido, hdQ * 0.83 + 0.37 + 2.3); float hdG = hdGraoP(hdQ, 0.019), hdTopo = 0.5 - vHdLoc.y;
        vec3 hdPint = vec3(0.10, 0.19, 0.30) * mix(0.9, 1.1, hdA.r) * (1.0 + 0.09 * (hdG - 0.5)) * (0.96 + 0.08 * hdM.r);
        vec3 hdEmb = vec3(0.40, 0.39, 0.36) * (0.8 + 0.4 * hdM.r) * (1.0 + 0.1 * (hdG - 0.5));
        float hdPeelN = texture2D(hdRuido, hdQ * 0.55 + 2.9).g * 0.55 + hdA.r * 0.45, hdPeelOk = (1.0 - hdCorpo) * max(smoothstep(2.1, 2.3, hdY), smoothstep(0.25, 0.05, hdTopo));
        float hdPeel = smoothstep(0.60, 0.66, hdPeelN) * hdPeelOk, hdPeelR = smoothstep(0.54, 0.60, hdPeelN) * (1.0 - hdPeel) * hdPeelOk;
        vec3 hdPar = mix(hdPint, hdEmb, hdPeel) * (1.0 + 0.08 * hdPeelR);
        float hdEsc = hdEscorrido(hdQ, hdTopo, 0.37) * (1.0 - hdCorpo); hdPar = hdUmido(hdPar, 0.45 * hdEsc) * (1.0 - 0.18 * hdEsc);
        float hdSuj = smoothstep(0.50, 0.04, hdY) * (0.45 + 0.55 * hdA.r), hdMusgo = smoothstep(0.45, 0.05, hdY) * smoothstep(0.40, 0.65, hdM.a);
        hdPar = hdUmido(hdPar, 0.45 * hdSuj) * (1.0 - 0.2 * hdSuj); hdPar = mix(hdPar, dot(hdPar, ${LUMA}) * vec3(0.72, 0.86, 0.60), 0.5 * hdMusgo);
        float hdLu = dot(hdT.rgb, ${LUMA}) / max(dot(hdC, ${LUMA}), 1e-3);
        vec3 hdTelha = vec3(0.12, 0.20, 0.28) * clamp(hdLu, 0.7, 1.3) * (0.85 + 0.3 * hdM.r);
        float hdFer = smoothstep(0.55, 0.75, hdM.a * 0.6 + hdA.g * 0.4); hdTelha = mix(hdTelha, vec3(0.22, 0.12, 0.07) * (0.8 + 0.4 * hdM.g), 0.6 * hdFer) * (1.0 - 0.25 * smoothstep(0.4, 0.7, hdA.r));
        vec3 hdAzul = mix(hdPar, hdTelha, hdCima);
        diffuseColor.rgb = mix(diffuseColor.rgb * hdT.rgb, hdAzul, hdAz); diffuseColor.a *= hdT.a;
        hdAlt += hdAz * (1.0 - hdCima) * (0.004 * (hdG - 0.5) - 0.003 * hdPeel); hdRug = mix(1.0, 0.92 + 0.08 * hdPeel, hdAz); hdRel = mix(1.0, 0.3, hdAz); }
      #endif`); ganchos(shader); };
  m.customProgramCacheKey = () => 'escadao-hd-casaazul1';
}

// Coluna = ≥ 2 ANÉIS cilíndricos no mesmo eixo a ≥ 0,3 (local) de distância; vértice fora de anel válido fica hdCol = 0 (intocado).
// Grava hdCol = (eixo x, eixo z, raio, 1) e devolve topos LOCAIS [x, yTopo, z, raio]. Critério: docs/hd-kit/escadao.md#colunas.
function marcaColunas(g, escala = 1) {
  if (g.attributes.hdCol) return g.userData.hdColunas || [];
  const P = g.attributes.position, N = g.attributes.normal, n = P.count, col = new Float32Array(n * 4), topos = [];
  g.setAttribute('hdCol', new THREE.BufferAttribute(col, 4)); g.userData.hdColunas = topos; if (!N) return topos;
  const niv = new Map(), aneis = [], rMin = .05 / escala, rMax = .25 / escala;
  for (let i = 0; i < n; i++) { if (Math.abs(N.getY(i)) > .35) continue; const k = Math.round(P.getY(i) * 200); (niv.get(k) || niv.set(k, []).get(k)).push(i); }
  for (const ids of niv.values()) { const resto = new Set(ids);
    while (resto.size) { const [s] = resto; const grupo = [s]; resto.delete(s);
      for (let k = 0; k < grupo.length; k++) { const a = grupo[k]; for (const b of resto) if (Math.hypot(P.getX(a) - P.getX(b), P.getZ(a) - P.getZ(b)) < 1.2 * rMax) { grupo.push(b); resto.delete(b); } }
      if (grupo.length < 8) continue;
      let cx = 0, cz = 0, r = 0; for (const i of grupo) { cx += P.getX(i); cz += P.getZ(i); } cx /= grupo.length; cz /= grupo.length;
      for (const i of grupo) r += Math.hypot(P.getX(i) - cx, P.getZ(i) - cz); r /= grupo.length;
      if (r < rMin || r > rMax) continue;
      const anel = grupo.every((i) => { const dx = P.getX(i) - cx, dz = P.getZ(i) - cz, d = Math.hypot(dx, dz); return Math.abs(d - r) < .25 * r && (dx * N.getX(i) + dz * N.getZ(i)) / Math.max(d, 1e-6) > .8; });
      if (anel) aneis.push({ cx, cz, r, y: P.getY(s), ids: grupo }); } }
  const cols = [];
  for (const a of aneis) { let c = cols.find((c) => Math.hypot(c.cx - a.cx, c.cz - a.cz) < .25 * a.r); if (!c) cols.push(c = { cx: a.cx, cz: a.cz, r: a.r, aneis: [] }); c.aneis.push(a); }
  for (const c of cols) { const ys = c.aneis.map((a) => a.y), topo = Math.max(...ys); if (c.aneis.length < 2 || topo - Math.min(...ys) < .3) continue;
    for (const a of c.aneis) for (const i of a.ids) { col[i * 4] = c.cx; col[i * 4 + 1] = c.cz; col[i * 4 + 2] = c.r; col[i * 4 + 3] = 1; }
    topos.push([c.cx, topo, c.cz, c.r]); }
  g.attributes.hdCol.needsUpdate = true; return topos;
}
// Ferragem de espera no topo de cada pilar (4 vergalhões Ø 12 mm, tortos) numa malha fundida só para TODAS as casas (+1 draw call,
// 'hd-ferragem'; refeita quando chega outra casa). `topos` em mundo [x, yTopo, z, raio]. Sem colisão.
function toposMundo(malha, locais) {
  const q = new THREE.Vector3(), p = new THREE.Vector3(), s = new THREE.Vector3(); malha.updateWorldMatrix(true, false); malha.matrixWorld.decompose(p, new THREE.Quaternion(), s);
  return locais.map(([lx, ly, lz, lr]) => { q.set(lx, ly, lz).applyMatrix4(malha.matrixWorld); return [q.x, q.y, q.z, lr * Math.max(s.x, s.z)]; });
}
function ferragemColunas(topos, mat) {
  const pos = [], cor = [], c = new THREE.Color(0x3a2219);
  const caixa = (x, y, z, w, h, d) => { const v = [];
    for (let i = 0; i < 8; i++) v.push([x + ((i & 1) - .5) * w, y + ((i >> 1) & 1) * h, z + (((i >> 2) & 1) - .5) * d]);
    for (const [a, b, d2, e] of [[0, 2, 3, 1], [5, 7, 6, 4], [4, 6, 2, 0], [1, 3, 7, 5], [2, 6, 7, 3], [4, 0, 1, 5]]) for (const i of [a, b, d2, a, d2, e]) { pos.push(...v[i]); cor.push(c.r, c.g, c.b); } };
  for (const [x, y, z, r] of topos) { const k = h3(x, y, z);
    for (let i = 0; i < 4; i++) { const dx = (i & 1 ? .55 : -.55) * r, dz = (i & 2 ? .55 : -.55) * r, h = .18 + .12 * h3(k, i, 2); caixa(x + dx + (h3(k, i, 3) - .5) * .03, y - .05, z + dz + (h3(k, i, 5) - .5) * .03, .012, h, .012); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cor, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.name = 'hd-ferragem'; m.castShadow = false; m.raycast = () => {}; m.userData.nonSolidSurface = true; return m;
}

// Cada malha (não instanciada) dos materiais do kit ganha centro e meia-medida da caixa em mundo (hdJc/hdJs) e
// sorteio + bloco cru (hdVar). Instâncias tiram isso da instanceMatrix no vértice.
function marcaCaixas(scene, mats, cruMats) {
  const feitas = [], box = new THREE.Box3(), c = new THREE.Vector3(), s = new THREE.Vector3();
  scene.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || !o.geometry) return;
    const ms = materiaisDe(o); if (!ms.some((m) => mats.has(m))) return;
    const g = o.geometry, n = g.attributes.position?.count; if (!n || g.attributes.hdJc) return;
    o.updateWorldMatrix(true, false); box.setFromObject(o); if (box.isEmpty()) return;
    box.getCenter(c); box.getSize(s).multiplyScalar(.5);
    const sorte = h3(c.x, c.y, c.z);
    const cru = ms.some((m) => cruMats.has(m)) && s.y >= 1.2 && Math.max(s.x, s.z) >= 1.0 && Math.abs(c.x) > 5.5 && h3(c.z, c.x, 1.3) < .2 ? 1 : 0;
    const jc = new Float32Array(n * 3), js = new Float32Array(n * 3), va = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { jc[i * 3] = c.x; jc[i * 3 + 1] = c.y; jc[i * 3 + 2] = c.z; js[i * 3] = s.x; js[i * 3 + 1] = s.y; js[i * 3 + 2] = s.z; va[i * 2] = sorte; va[i * 2 + 1] = cru; }
    g.setAttribute('hdJc', new THREE.BufferAttribute(jc, 3)); g.setAttribute('hdJs', new THREE.BufferAttribute(js, 3)); g.setAttribute('hdVar', new THREE.BufferAttribute(va, 2)); feitas.push(g);
  });
  return () => { for (const g of feitas) { g.deleteAttribute('hdJc'); g.deleteAttribute('hdJs'); g.deleteAttribute('hdVar'); } };
}

// Altura da cobertura: o mapa visto de cima em projeção ortográfica (40 x 84 m), y de mundo no canal R. Repete aos 4 s
// (texturas e props que chegam depois); nunca inclui céu, cenografia, fiação, vegetação nem transparentes.
function cobertura(scene, renderer, U, vivo) {
  const rt = new THREE.WebGLRenderTarget(256, 512, { type: THREE.HalfFloatType, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true });
  const cam = new THREE.OrthographicCamera(-20, 20, 42, -42, .5, 90); cam.position.set(0, 70, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0);
  const mat = new THREE.ShaderMaterial({ side: THREE.DoubleSide, fog: false,
    vertexShader: 'varying float vY; void main(){ vec4 p = vec4(position, 1.0);\n#ifdef USE_INSTANCING\n p = instanceMatrix * p;\n#endif\n p = modelMatrix * p; vY = p.y; gl_Position = projectionMatrix * viewMatrix * p; }',
    fragmentShader: 'varying float vY; void main(){ gl_FragColor = vec4(vY, 0.0, 0.0, 1.0); }' });
  rt.texture.name = 'hd-cobertura';
  const fora = (o) => o.isSkinnedMesh || o.isPoints || o.isSprite || o.isLine || /SKY|PIPA|HELI|AMBIENT|DUMONT|MORRO|HORIZONTE|fiacao|vegetacao|^hd-/i.test(o.name || '') || (o.isMesh && materiaisDe(o).some((m) => m.transparent || m.depthWrite === false));
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

const srcDe = (t) => t?.image?.src || t?.image?.currentSrc || t?.source?.data?.src || t?.name || '';
// Média do canvas (8 x 8) para separar o concreto procedural (cinza) de placas, terra e azulejo (coloridos).
const mediaCanvas = new WeakMap();
function cinzaDoCanvas(cv) {
  if (mediaCanvas.has(cv)) return mediaCanvas.get(cv);
  let r = { cinza: false, escuro: false };
  try { const c = document.createElement('canvas'); c.width = c.height = 8; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(cv, 0, 0, 8, 8);
    const d = g.getImageData(0, 0, 8, 8).data; let sr = 0, sg = 0, sb = 0; for (let i = 0; i < 64; i++) { sr += d[i * 4]; sg += d[i * 4 + 1]; sb += d[i * 4 + 2]; }
    sr /= 64 * 255; sg /= 64 * 255; sb /= 64 * 255; const mx = Math.max(sr, sg, sb), mn = Math.min(sr, sg, sb);
    r = { cinza: mx - mn < .09 && mx > .25 && mx < .75, escuro: (sr + sg + sb) / 3 < .5 }; } catch (e) { /* canvas inacessível */ }
  mediaCanvas.set(cv, r); return r;
}
function regraDe(m) {
  if (!m || !m.isMeshStandardMaterial || m.name) return null;
  const cor = m.color.getHex(), img = m.map?.image, canvas = typeof HTMLCanvasElement !== 'undefined' && img instanceof HTMLCanvasElement, src = srcDe(m.map), mt = m.userData?.metricTile;
  if (mt === 1.6 && canvas) return cor === 0xc5c2b9 ? 'degrau' : 'cimento';
  if (mt === 1.65 || /lajes_tijolo_baiano/.test(src)) return 'tijolo';
  if (canvas && img.width === 128 && PALETA[cor] !== undefined) return 'reboco';
  if (cor === 0xc2baa7 && m.map) return 'guarda';
  if (/concrete_br/.test(src)) return m.map.repeat.x >= 4.5 ? 'concretoEscuro' : 'concreto';
  if (canvas && m.map.userData?.tilePuro && cor === 0xffffff && m.map.repeat.x === 1) { const c = cinzaDoCanvas(img); if (c.cinza) return c.escuro ? 'concretoEscuro' : 'concreto'; }
  if (!m.map) { if (cor === 0x273b42) return 'vidro'; if (cor === 0x49372a) return 'porta'; if (cor === 0x38413c) return 'ferro'; if (cor === 0x777a76 && Math.abs(m.metalness - .35) < .01) return 'zinco'; }
  if (/tex_zinco/.test(src) && cor === 0x777a76) return 'zinco';
  return null;
}
// Props do acervo vestidos por material clonado: lixeira (userData.mapPropId) e casa de tijolo do GLB (userData.casario).
const propDe = (o) => { for (let p = o; p; p = p.parent) { if (p.userData?.casario) return p.userData.casario === 'casa_favela_tijolo' ? 'casa' : p.userData.casario === 'casa_favela_azul' ? 'casaAzul' : null; if (p.userData?.mapPropId) return p.userData.mapPropId === 'dumpster' ? 'lixeira' : null; } return null; };

export function aplicaEscadaoHD(scene, renderer, opts = {}) {
  const hdq = new URLSearchParams(location.search), liga = (k, q) => opts[k] !== false && hdq.get(q) !== '0';
  const o = { reboco: liga('reboco', 'hdreboco'), piso: liga('piso', 'hdpiso'), janelas: liga('janelas', 'hdjanela'), portas: liga('portas', 'hdporta'),
    tijolo: liga('tijolo', 'hdtijolo'), chapa: liga('chapa', 'hdchapa'), regua: liga('regua', 'hdregua') && liga('portas', 'hdporta'), lixeira: liga('lixeira', 'hdlixeira'), casa: liga('casa', 'hdcasa'), casaAzul: liga('casaAzul', 'hdcasaazul'), colunas: opts.colunas === true || hdq.get('hdcoluna') === '1', pisoSujo: opts.pisoSujo !== false };
  const ativa = { reboco: o.reboco, cimento: o.reboco, guarda: o.reboco, degrau: o.piso, concreto: o.piso, concretoEscuro: o.piso, tijolo: o.tijolo, vidro: o.janelas, porta: o.portas, ferro: o.portas, zinco: o.chapa };
  let vivo = true; const antes = [], criadas = [], timers = [], trocas = [], porRegra = new Map(), vistos = new Set(), props = [], tiraCaixas = [];
  const ruido = ruidoTex(); criadas.push(ruido);
  const U = { hdRuido: { value: ruido }, hdCob: { value: null }, hdJanelas: { value: null }, hdPortas: { value: null }, hdR26: { value: liga('r26', 'hdr26') ? 1 : 0 } };
  const atlasJ = () => { if (!U.hdJanelas.value) criadas.push(U.hdJanelas.value = atlasJanelas()); };
  const atlasP = () => { if (!U.hdPortas.value) criadas.push(U.hdPortas.value = atlasPortas()); };
  const DEFAULTS = { hdJc: [0, 0, 0], hdJs: [0, 0, 0], hdVar: [0, 0], hdCol: [0, 0, 0, 0] }, propMats = new Map(), colGeos = new Set(), ferrTopos = [];
  let ferragem = null; const matFerr = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, metalness: .1, name: 'hd-ferragem' }); criadas.push(matFerr);
  const refazFerragem = () => { if (ferragem) { scene.remove(ferragem); ferragem.geometry.dispose(); } ferragem = ferrTopos.length ? ferragemColunas(ferrTopos, matFerr) : null; if (ferragem) scene.add(ferragem); };
  const aplica = (nome, m) => { const r = REGRAS[nome];
    const s = { m, map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap, cor: m.color.getHex(), roughness: m.roughness, metalness: m.metalness, ns: m.normalScale.x, obc: m.onBeforeCompile, key: m.customProgramCacheKey, meu: null, meuN: null };
    antes.push(s); m.defaultAttributeValues = DEFAULTS;
    if (r.reboco) { m.map = s.meu = tex('reboco', 'cor_rug'); m.normalMap = s.meuN = tex('reboco', 'normal'); m.roughnessMap = null; m.roughness = 1; m.normalScale.set(r.relevo, r.relevo); m.color.setHex(nome === 'reboco' ? PALETA[s.cor] : r.cor); rebocoHD(m, r, U, satDeHex(m.color.getHex()) < .15 ? 1 : 0); }
    if (r.concreto) { m.map = s.meu = tex('piso', 'cor_rug'); m.normalMap = s.meuN = tex('piso', 'normal'); m.roughnessMap = null; m.roughness = 1; m.normalScale.set(1.3, 1.3); m.color.setHex(0xffffff); concretoHD(m, r, U, o); }
    if (r.tijolo) { m.roughnessMap = null; m.roughness = .9; m.color.setHex(0xffffff); tijoloHD(m, U); }
    if (r.janela) { atlasJ(); m.metalness = .05; m.roughness = .5; janelaHD(m, U); }
    if (r.porta) { atlasP(); m.roughness = .8; portaHD(m, U); }
    if (r.ferro) { atlasJ(); ferroHD(m, U); }
    if (r.chapa) chapaHD(m, U, o.regua);
    // dispose() solta os programas antigos do material (o three guarda todas as variantes até lá).
    m.dispose(); m.needsUpdate = true; };
  // Casamento: o kit entra logo depois do build, antes de concrete_br/tex_zinco/tijolo chegarem (external em
  // map_escadao.js troca mapa e normal por fora). Reexecuta por 40 s: material novo entra, mapa do kit volta.
  const casa = () => { let novos = 0;
    scene.traverse((ob) => { if (!ob.isMesh) return;
      if ((o.lixeira || o.casa || o.casaAzul) && !Array.isArray(ob.material) && ob.material?.map && !propMats.has(ob.material) && !ob.material.name?.startsWith('hd-')) { const t = propDe(ob); if (t && o[t]) props.push([ob, t]); }
      for (const m of materiaisDe(ob)) { if (vistos.has(m)) continue; const r = regraDe(m); if (r && ativa[r]) { vistos.add(m); (porRegra.get(r) || porRegra.set(r, new Set()).get(r)).add(m); aplica(r, m); novos++; } } });
    // Props: a textura do GLB continua, lida pelo clone do material (lixeira borrada, casa com junta); o original volta em desliga().
    for (const [ob, t] of props.splice(0)) { const velho = ob.material; if (!propMats.has(velho)) { const n = velho.clone(); n.name = 'hd-' + t; n.defaultAttributeValues = DEFAULTS; (t === 'casa' ? casaTijoloHD : t === 'casaAzul' ? casaAzulHD : lixeiraHD)(n, U); propMats.set(velho, n); criadas.push(n); } trocas.push([ob, velho]); ob.material = propMats.get(velho);
      // Pilares do molde viram quadrados (atributo hdCol na geometria partilhada) e ganham ferragem no topo (1 malha para todas as casas).
      if (t === 'casa' && o.colunas && ob.geometry) { ob.updateWorldMatrix(true, false); const sc = new THREE.Vector3().setFromMatrixScale(ob.matrixWorld);
        const topos = marcaColunas(ob.geometry, Math.max(sc.x, sc.z)); colGeos.add(ob.geometry); if (topos.length) { ferrTopos.push(...toposMundo(ob, topos)); refazFerragem(); } } }
    if (novos) tiraCaixas.push(marcaCaixas(scene, new Set([...porRegra.values()].flatMap((s) => [...s])), porRegra.get('reboco') || new Set()));
    for (const s of antes) { if (!s.meu || s.m.map === s.meu) continue;
      s.map = s.m.map; s.normalMap = s.m.normalMap; s.roughnessMap = s.m.roughnessMap; s.m.map = s.meu; s.m.normalMap = s.meuN; s.m.roughnessMap = null; s.m.needsUpdate = true; } };
  casa();
  const laco = setInterval(() => { if (vivo) casa(); }, 1000); timers.push(setTimeout(() => clearInterval(laco), 40000));
  const cob = o.piso ? cobertura(scene, renderer, U, () => vivo) : null;
  // Cenografia sem colisão (hd_cenografia_escadao.js). Desliga tudo: opts.cenografia === false ou ?hdcen=0; por item:
  // opts.cenografia.<item> === false ou ?hdcen=morro,postes (só os listados). Itens: docs/hd-kit/escadao.md#interruptores.
  const qCen = hdq.get('hdcen'), soEstes = qCen && qCen !== '0' && qCen !== '1' ? qCen.split(',') : null;
  const oCen = opts.cenografia === false || qCen === '0' ? null : { ...(opts.cenografia || {}) };
  if (oCen && soEstes) for (const k of ['morro', 'casario', 'mata', 'telhados', 'fachada', 'postes', 'vida']) if (!soEstes.includes(k)) oCen[k] = false;
  const cen = oCen ? cenografiaEscadao(scene, { ...oCen, ruido: U.hdRuido, r23: liga('r23', 'hdr23'), r24: liga('r24', 'hdr24'), r26: liga('r26', 'hdr26') }) : null;
  return { alvos: () => Object.fromEntries([...porRegra].map(([k, s]) => [k, s.size])), lixeiras: () => trocas.length, cenografia: cen, cobertura: cob, desliga() {
    vivo = false; clearInterval(laco); timers.forEach(clearTimeout);
    for (const s of antes) { Object.assign(s.m, { map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, roughness: s.roughness, metalness: s.metalness, onBeforeCompile: s.obc, customProgramCacheKey: s.key });
      delete s.m.defaultAttributeValues; s.m.color.setHex(s.cor); s.m.normalScale.set(s.ns, s.ns); s.m.dispose(); s.m.needsUpdate = true; }
    for (const [ob, m] of trocas) ob.material = m;
    for (const f of tiraCaixas) f(); cob?.desliga(); cen?.desliga();
    for (const g of colGeos) { g.deleteAttribute('hdCol'); delete g.userData.hdColunas; }
    if (ferragem) { scene.remove(ferragem); ferragem.geometry.dispose(); }
    for (const c of criadas) c.dispose();
  } };
}
