// Kit visual HD do Escadão, atrás de ?hd=1 (demo de gráficos, desligado por padrão). O mapa autoral não nomeia
// materiais: o casamento vai pelas chaves abaixo (regraDe). Projeta reboco/cimento em metros de mundo, janelas e
// portas por atlas, cenografia sem colisão (hd_cenografia_escadao.js). Tudo volta em desliga().
// Chaves de casamento (public/js/map_escadao.js):
//   degrau   canvas 256 + userData.metricTile 1.6 + cor c5c2b9        cimento  idem, cor b5b2a8
//   reboco   canvas 128 + cor em {8ba7a4, d7ccb1, bf9176, a9b38d}     tijolo   metricTile 1.65 ou src lajes_tijolo_baiano
//   guarda   cor c2baa7 com mapa (T.concrete)                         concreto src concrete_br ou canvas tilePuro cinza (256 claro / 512 escuro)
//   vidro    sem mapa, cor 273b42 (atlas só nas células 0,2,3,5,6; caixa sem hdJc/hdJs = tinta lisa)
//   porta    sem mapa, cor 49372a      ferro  sem mapa, cor 38413c (portão 0,6–1,5 x 1,4–2,3 m e veneziana autoral já têm frisos em
//            geometria: só acabamento; só o painel liso 0,72 x 0,85 m recebe basculante do atlas)      zinco  cor 777a76 + metalness .35
//   lixeira  malha sob userData.mapPropId === 'dumpster' (pichação legível vira mancha)
//   casa     malha sob userData.casario === 'casa_favela_tijolo' (atlas cozido do GLB: faces laranja ganham junta de bloco)
// Kill-switches: ?hdreboco=0 ?hdpiso=0 ?hdjanela=0 ?hdporta=0 ?hdtijolo=0 ?hdchapa=0 ?hdlixeira=0 ?hdcasa=0 ?hdcen=0[,item] e os mesmos em opts.
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
  reboco: { reboco: true, relevo: .9, remendo: 1, descasca: 1, cru: 1, umid: .35 },
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
const PARS = `varying vec3 vHdPos; varying vec3 vHdJc; varying vec3 vHdJs; varying vec2 vHdVar;
  ${RUIDO_PARS}
  uniform sampler2D hdCob;
  ${BUMP}
  vec3 hdUmido(vec3 c, float k){ return mix(c, dot(c, ${LUMA}) * vec3(0.54, 0.57, 0.47), k); }
  vec3 hdBarro(vec3 c, float k){ return mix(c, dot(c, ${LUMA}) * vec3(0.58, 0.56, 0.52), k); }
  float hdFaixaCorpo(float y){ return smoothstep(0.40, 0.55, y) * (1.0 - smoothstep(2.0, 2.2, y)); }
  float hdVis(float tam, vec2 q){ return clamp(tam / max(max(fwidth(q.x), fwidth(q.y)), 1e-6) - 1.0, 0.0, 1.0); }
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
  // Só o grão (< 10 cm) da textura: razão para a média local (mip 6 ≈ 10 cm por texel), limitada a ±4 %.
  vec3 hdGrao(vec3 t, vec3 tb){ return clamp(t / max(tb, vec3(0.02)), 0.95, 1.05); }
  // Escorrido da laje: uma coluna sorteada por célula de 1,5 m e por caixa (cs), 8–14 cm, só nos 0,35 m abaixo do topo da
  // caixa (topo = distância ao topo; 1000 sem caixa = nada). Ruído com offset por caixa: nunca ladrilha.
  float hdEscorrido(vec2 q, float topo, float cs){ float c = floor(q.x / 1.5), s = hdH(vec2(c, cs * 17.0)), s2 = hdH(vec2(c + 7.0, cs * 17.0));
    vec4 n = texture2D(hdRuido, vec2(q.x * 2.3, q.y * 0.7) + cs * 31.7);
    float w = 0.04 + 0.03 * s2, d = abs(q.x - (c + 0.15 + 0.7 * s) * 1.5 + 0.03 * (n.g - 0.5));
    return step(0.2, s) * (1.0 - smoothstep(w * 0.5, w + fwidth(q.x), d)) * smoothstep(0.35, 0.08, topo) * smoothstep(0.0, 0.04, topo) * (0.55 + 0.45 * n.r); }`;
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
// `metros`, UV projetado no mundo (parede: horizontal x altura; piso: xz).
function comMundo(shader, U, metros = 0, extra = '') {
  Object.assign(shader.uniforms, U);
  shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\nvarying vec3 vHdPos; varying vec3 vHdJc; varying vec3 vHdJs; varying vec2 vHdVar; attribute vec3 hdJc; attribute vec3 hdJs; attribute vec2 hdVar;\n${HASH}`)
    .replace('#include <uv_vertex>', `#include <uv_vertex>
      { vec4 hdW = vec4(position, 1.0); vec3 hdNm = normal;
        #ifdef USE_INSTANCING
          hdW = instanceMatrix * hdW; hdNm = mat3(instanceMatrix) * hdNm;
          vHdJc = (modelMatrix * vec4(instanceMatrix[3].xyz, 1.0)).xyz;
          vHdJs = 0.5 * vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
          vHdVar = vec2(hdH(floor(vHdJc.xz * 2.0) + floor(vHdJc.y * 2.0)), 0.0);
        #else
          vHdJc = hdJc; vHdJs = hdJs; vHdVar = hdVar;
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

// Reboco (PAREDES, cimento, guarda): cor + rugosidade de concrete_wall_003 em metros de mundo, tom por caixa e máscara lenta
// (período ≥ 3 m, ±8 %). Na faixa do corpo (0,4–2,1 m): grão fino ±6 %, média frequência ±7 % (15–40 cm, hdMeio, sem ladrilho)
// e relevo ×1,5; mancha lenta/média da textura só fora dela (× (1 − hdFaixaCorpo)). Fora, por célula: rasgo de eletroduto
// (> 2,1 m), remendo de tijolo com borda irregular (12 %), escorrido da laje (≤ 12 %), trinca, rodapé (−15 %) e musgo (< 0,3 m).
// Família de acabamento por caixa (hdFam): 35 % pintura lisa com pintura sobre pintura (barrado até 1,2 m 5 % mais escuro, borda de
// rolo clara), 35 % chapisco (grão SÓ de alta frequência ±5 %, some quando o período < 3 px; relevo ×1,6; no corpo NENHUM albedo vindo
// da normal), 30 % cimento queimado (mesma luminância sem cor, juntas 1,1 x 1,25 m) SÓ em caixa de cor com S < 0,15 (hdQueiOk: branco de
// cal, cimento, guarda); nas coloridas essa fatia vira pintura lisa. 15 % das caixas: platibanda sem reboco (tijolo nos 0,55–0,9 m de
// cima, acima de 2,1 m). Bloco cru em caixas marcadas (hdVar.y). Mercearia do mirante: pintura comercial por posição de mundo
// (|x| ≤ 2,4, face z −23,3 ± 7 cm): cobre parede e pilastras da quina, inclusive 7 cm da face lateral.
function rebocoHD(m, r, U, queiOk) {
  m.onBeforeCompile = (shader) => { comMundo(shader, U, CONJ.reboco.metros, 'uniform vec4 hdRebP; uniform float hdQueiOk;');
    shader.uniforms.hdRebP = { value: new THREE.Vector4(r.remendo, r.descasca, r.cru, r.umid) }; shader.uniforms.hdQueiOk = { value: queiOk };
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `${CABECA} { float hdY = hdAltura(vHdPos); vec2 hdQ = vec2(vHdPos.x + vHdPos.z, vHdPos.y);
      vec3 hdGn = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))); float hdCima = step(0.7, abs(hdGn.y));
      float hdS = vHdVar.x, hdCru = step(0.5, vHdVar.y) * hdRebP.z; vec4 hdT = texture2D(map, vMapUv);
      // Máscara lenta: ladrilho de 12,5 m lido com viés de mip 4 (sobra a oitava de ~3 m); hdM = meio-tom e grão (.b, < 2 cm).
      vec4 hdA = texture2D(hdRuido, hdQ * 0.08 + hdS * 3.0, 4.0), hdM = texture2D(hdRuido, hdQ * 0.83 + 0.37 + hdS * 7.0), hdM2 = hdMeio(hdQ, hdS);
      float hdCorpo = hdFaixaCorpo(hdY), hdFora = 1.0 - hdCorpo, hdNit = hdNitido(), hdWy = max(fwidth(hdY) * 1.5, 0.004);
      float hdLoja = step(abs(vHdPos.x), 2.40) * step(abs(vHdPos.z + 23.3), 0.07) * step(7.0, vHdPos.y);
      float hdFam = hdH(vec2(floor(hdS * 97.0), 2.0)), hdNcru = (1.0 - hdCru) * (1.0 - hdLoja);
      float hdQuei = step(0.70, hdFam) * hdNcru * hdQueiOk, hdChap = step(0.35, hdFam) * step(hdFam, 0.70) * hdNcru;
      float hdLiso = (step(hdFam, 0.35) + step(0.70, hdFam) * (1.0 - hdQueiOk)) * hdNcru * hdAltoBox();
      // Grão HF (período 1,9 cm; chapisco 1,04 cm): amplitude some quando o período fica abaixo de 3 px (0 abaixo de 1,5 px): nunca cintila.
      float hdFw = max(max(fwidth(hdQ.x), fwidth(hdQ.y)), 1e-6), hdGv = smoothstep(1.0, 2.4, mix(0.019, 0.0104, hdChap) / hdFw);
      float hdMed = 0.5 * (hdM.r + hdM2.r), hdFinoG = mix(mix(0.12, 0.08, hdQuei), mix(0.168, 0.10, hdCorpo), hdChap) * hdGv;
      float hdG = mix(hdM.b, texture2D(hdRuido, hdQ * 1.5 + hdS * 3.0).b, hdChap), hdChapC = hdChap * hdCorpo;
      hdRug = mix(hdT.a, 1.0, 0.5 * hdChap) * mix(1.0, 0.8, hdQuei);
      // Textura: no corpo só o grão; fora dele a mancha da concrete_wall_003 entra a 45 % (eram duas colunas escuras a cada 1,7 m).
      vec3 hdTb = texture2D(map, vMapUv, 6.0).rgb, hdTex = mix(hdGrao(hdT.rgb, hdTb) * mix(vec3(1.0), hdTb / ${v3(CONJ.reboco.media)}, 0.45 * hdFora), vec3(1.0), hdChapC);
      // Chapisco no corpo: de perto só grão HF; quando o grão some com a distância (hdGv→0) entra ±5 % de média frequência
      // (15–40 cm, hdMed) para a parede não virar chapa lisa a 3–4 m — ±5 % nunca forma mancha (< p50−18).
      vec3 hdReb = hdTex * mix(0.92, 1.06, hdS) * mix(mix(0.92, 1.08, hdA.r), 1.0, hdCorpo) * (1.0 + hdFinoG * (hdG - 0.5)) * mix(mix(0.96, 1.03, hdM.r), mix(mix(0.93, 1.07, hdMed), mix(0.95, 1.05, hdMed) * mix(1.0, mix(0.97, 1.03, hdM.b), 1.0 - hdGv), hdChap), hdCorpo);
      vec3 hdEmboco = vec3(0.43, 0.41, 0.375) * (0.76 + 0.48 * hdM.r) * mix(0.9, 1.1, hdTex.g);
      vec3 hdPint = diffuseColor.rgb * hdReb;
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
      float hdRas = step(1.0 - 0.15 * hdRebP.x, hdH(vec2(hdCol, 7.0))) * (1.0 - smoothstep(hdRw, hdRw + fwidth(hdCf) * 1.5, hdRd)) * smoothstep(2.1, 2.25, hdY) * hdFora * (1.0 - hdCru);
      hdPint = mix(hdPint, hdEmboco, 0.3 * hdRas);
      vec4 hdBk = hdBloco(hdQ + hdS * 5.0, 0.2 * hdFora);
      vec3 hdBl = vec3(0.50, 0.455, 0.44) * hdBk.rgb * mix(0.86 + 0.28 * hdM.r, 1.0, hdCorpo) * mix(0.92, 1.06, hdTex.g);
      diffuseColor.rgb = mix(hdPint, hdBl, hdCru); hdAlt -= 0.004 * hdBk.a * hdCru;
      // Remendo de tijolo exposto por célula de 2,6 m (12 %): platibanda (acima de 2,1 m) ou pé (< 0,4 m), 0,7–1,6 m de largura,
      // borda com ±4 cm de ruído e aro de emboço de 6–12 cm. Nunca na faixa do corpo, nunca retângulo de adesivo.
      float hdC2x = (hdQ.x + hdS * 10.0) / 2.6 + 0.5, hdC2 = floor(hdC2x);
      float hdJit = 0.08 * (hdM.g - 0.5), hdJx = 0.08 * (hdM.r - 0.5), hdHw = 0.35 + 0.45 * hdH(vec2(hdC2, 15.0));
      float hdDl = hdHw - abs((fract(hdC2x) - 0.5) * 2.6 - (hdH(vec2(hdC2, 16.0)) - 0.5) * (1.3 - hdHw)) + hdJx;
      float hdTopo = vHdJs.y > 0.001 ? vHdJc.y + vHdJs.y - vHdPos.y : 1000.0;
      float hdDt = min(0.5 + 0.6 * hdH(vec2(hdC2, 11.0)) - hdTopo + hdJit, hdDl), hdDp = min(0.12 + 0.25 * hdH(vec2(hdC2, 13.0)) - hdY + hdJit, hdDl);
      float hdPt = step(1.0 - 0.12 * hdRebP.y, hdH(vec2(hdC2, 12.0))) * smoothstep(0.0, hdWy, hdDt) * smoothstep(2.1, 2.2, hdY);
      float hdPp = step(1.0 - 0.12 * hdRebP.y, hdH(vec2(hdC2, 14.0))) * smoothstep(0.0, hdWy, hdDp) * hdAltoBox();
      // Platibanda sem reboco (15 % das caixas): 0,55–0,9 m de cima, borda inferior irregular (±6 cm), aro de emboço.
      float hdDpl = 0.55 + 0.35 * hdH(vec2(floor(hdS * 97.0), 5.0)) - hdTopo + 0.08 * (hdM.g - 0.5) + 0.05 * (hdA.g - 0.5);
      float hdPl = step(0.85, hdH(vec2(floor(hdS * 97.0), 3.0))) * hdNcru * smoothstep(0.0, hdWy, hdDpl) * smoothstep(2.1, 2.2, hdY) * hdAltoBox();
      float hdPele = max(max(hdPt, hdPp) * hdNcru, hdPl) * hdFora, hdRim = 1.0 - smoothstep(0.06, 0.09 + 0.03 * hdM.r, max(max(hdDt * hdPt, hdDp * hdPp), hdDpl * hdPl));
      // Tijolo exposto mais escuro e dessaturado (0,7× do 1,4 anterior) que o tijolo aparente autoral.
      vec4 hdTj = hdTijolo(hdQ + 3.7, hdM.r, 0.5); vec3 hdTjx = mix(vec3(dot(hdTj.rgb, ${LUMA})), hdTj.rgb, 0.6) * 0.98;
      diffuseColor.rgb = mix(diffuseColor.rgb, mix(hdTjx, hdEmboco, hdRim), hdPele);
      // Chapisco no corpo: o normal map base (feições de 5–40 cm) não pode ser amplificado — virava mancha por sombreamento.
      hdRel *= (1.0 - 0.5 * hdPele) * mix(0.6, 1.0, hdNit) * mix(1.0, mix(1.5, 1.2, hdChap), hdCorpo) * (1.0 + 0.6 * hdChap * hdFora) * (1.0 - 0.4 * hdChapC) * mix(1.0, 0.65, hdQuei); hdAlt -= 0.012 * hdPele + 0.003 * hdJun; hdLuzRel = 1.0 - 0.5 * hdChapC;
      float hdEsc = hdEscorrido(hdQ, hdTopo, hdS) * hdFora * hdAltoBox() * (1.0 - hdCru);
      diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.15 * hdEsc) * (1.0 - 0.05 * hdEsc);
      float hdTr = hdTrinca(hdQ + hdS * 5.0, hdA.a, hdS, hdY); diffuseColor.rgb *= 1.0 - 0.42 * mix(1.0, 0.25, hdCorpo) * hdTr; hdAlt -= 0.003 * hdTr;
      float hdSuj = smoothstep(0.50, 0.04, hdY) * (0.45 + 0.55 * hdA.r) * (1.0 - 0.35 * hdPele) * hdAltoBox() * hdFora;
      diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.45 * hdSuj) * (1.0 - 0.15 * hdSuj);
      float hdMusgo = smoothstep(0.30, 0.03, hdY) * smoothstep(0.50, 0.70, hdM.a) * hdAltoBox();
      diffuseColor.rgb = mix(diffuseColor.rgb, dot(diffuseColor.rgb, ${LUMA}) * vec3(0.83, 1.10, 0.50), 0.45 * hdMusgo);
      // Umidade no pé (≤ 0,4 m, hdRebP.w: mureta 1, cimento 0,7, reboco 0,35): escurece, perde brilho, linha de maré a 0,4 m.
      float hdUmi = smoothstep(0.42, 0.05, hdY) * max(hdAltoBox(), step(0.99, hdRebP.w)) * hdRebP.w * (0.6 + 0.4 * hdA.g);
      float hdMare = (1.0 - smoothstep(0.0, 0.05, abs(hdY - 0.40 - 0.05 * (hdM.g - 0.5)))) * hdRebP.w * (0.5 + 0.5 * hdA.g) * (1.0 - hdCima);
      diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.5 * hdUmi) * (1.0 - 0.22 * hdUmi - 0.06 * hdMare); hdRug = mix(hdRug, 0.6, 0.6 * hdUmi);
      diffuseColor.rgb *= mix(1.0, 0.74, hdCima);
      hdAlt += hdGv * 0.004 * (1.0 + 1.0 * hdChap) * (hdG - 0.5) + 0.008 * (hdMed - 0.5) * (1.0 - hdCru) * (1.0 - hdChapC); }`);
    ganchos(shader); };
  m.customProgramCacheKey = () => 'escadao-hd-reboco12';
}

// Concreto serve piso e parede (orientação pela derivada da posição). Piso: cimentado concrete_floor_02, junta de desempenadeira
// a 1,5 m, 2 remendos fixos no mirante (hdRemendo), mancha leve, canaleta de água dos lances (faixa úmida de 15 cm, rugosidade 0,3,
// fio d'água escuro no eixo e limo nas bordas; o espelho do degrau continua a faixa), poça rasa no patamar 1 (hdPoca, rugosidade
// 0,25, sem relevo), água escura/musgo só no encontro com a parede (hdCob no mip 1, ≤ 20 cm),
// quina de degrau com linha clara de 1–2 cm e lasca em 20 % dos degraus (borda +z da caixa). Parede: concreto de forma ou,
// no espelho, o próprio cimentado com sujeira de contato. Grão e relevo somem com a distância (hdNitido).
function concretoHD(m, r, U, o) {
  const k = (CONJ.piso.metros / CONJ.forma.metros).toFixed(4);
  m.onBeforeCompile = (shader) => { comMundo(shader, U, CONJ.piso.metros, 'uniform sampler2D hdForma; uniform sampler2D hdFormaN; uniform vec3 hdPisoT; uniform vec3 hdParT; uniform vec3 hdPisoP;');
    Object.assign(shader.uniforms, { hdForma: { value: tex('forma', 'color') }, hdFormaN: { value: tex('forma', 'normal') }, hdPisoT: { value: new THREE.Vector3(...r.piso) }, hdParT: { value: new THREE.Vector3(...r.parede) }, hdPisoP: { value: new THREE.Vector3(r.junta, r.nariz, o.pisoSujo ? 1 : 0) } });
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `${CABECA} hdLuzRel = 0.8;
      vec3 hdGn = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))); float hdPiso = step(0.7, abs(hdGn.y)), hdNariz = hdPisoP.y, hdNit = hdNitido(), hdFino = mix(0.7, 1.0, hdNit);
      hdRel = mix(0.45, 1.0, hdNit);
      if (hdPiso > 0.5) { vec4 hdT = texture2D(map, vMapUv); hdT.rgb = mix(texture2D(map, vMapUv, 3.5).rgb, hdT.rgb, hdFino); hdRug = hdT.a; vec2 p = vHdPos.xz; float hdS = vHdVar.x;
        vec4 a = texture2D(hdRuido, p * 0.071 + hdS), m2 = texture2D(hdRuido, p * 0.53 + 0.19);
        vec2 g = p / 1.5 + vec2(0.0, 0.37), id = floor(g), f = fract(g); float px = max(fwidth(p.x), fwidth(p.y));
        float dj = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y)) * 1.5, rem = hdRemendo(p, m2);
        float junta = (1.0 - smoothstep(0.014, 0.022 + px * 1.5, dj)) * 0.03 / (0.03 + px * 0.6) * hdPisoP.x * (1.0 - rem);
        float mancha = smoothstep(0.50, 0.70, a.a * 0.6 + m2.r * 0.4) * mix(1.0, 0.6, hdNariz);
        vec2 cu = vec2(p.x / 40.0 + 0.5, 0.5 - p.y / 84.0); float h0 = texture2D(hdCob, cu).r, hb = texture2D(hdCob, cu, 1.0).r;
        float parede = smoothstep(1.0, 2.2, hb - vHdPos.y) * (1.0 - smoothstep(0.3, 1.0, h0 - vHdPos.y)) * hdPisoP.z;
        float hdCd = hdCanalD(vHdPos), canal = (1.0 - smoothstep(0.075, 0.13, hdCd)) * hdPisoP.z, hdFio = (1.0 - smoothstep(0.006, 0.014 + px, hdCd)) * hdPisoP.z;
        float hdLimo = smoothstep(0.04, 0.10, hdCd) * (1.0 - smoothstep(0.14, 0.22, hdCd)) * smoothstep(0.35, 0.6, m2.a) * hdPisoP.z;
        vec2 hdPo = hdPoca(p, vHdPos.y, m2) * hdPisoP.z;
        // Grão do cimentado: canal fino do ruído (< 2 cm) com repetição de 1,2 m, ±22 % de média zero (não escurece); some no mip.
        vec4 gr = texture2D(hdRuido, p * 0.83 + hdS);
        vec3 c = hdPisoT * hdT.rgb / ${v3(CONJ.piso.media)} * (1.0 + 0.44 * (gr.b - 0.5));
        c *= mix(0.92, 1.06, hdH(id + hdS)) * mix(0.88, 1.10, a.g) * mix(0.92, 1.07, m2.r) * (1.0 - 0.45 * hdTrinca(p + hdS * 3.0, a.a, hdS)) * (1.0 - 0.45 * hdTrinca(p.yx + 5.3 + hdS, a.g, hdS));
        // Remendo: cimento mais novo, 10 % mais escuro e frio, grão próprio, 4 mm acima do piso.
        c = mix(c, c * vec3(0.88, 0.89, 0.92) * (1.0 + 0.16 * (m2.g - 0.5)), rem); hdAlt += 0.004 * rem;
        c = hdBarro(c, 0.3 * mancha) * (1.0 - 0.20 * mancha) * (1.0 - 0.72 * junta);
        c = hdUmido(c, 0.7 * canal) * (1.0 - 0.5 * canal) * (1.0 - 0.3 * hdFio);
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
        diffuseColor.rgb = c; hdRug = mix(mix(mix(hdRug, 0.72, 0.5 * parede), 0.30, canal), 0.25, hdPo.x); hdRel *= 1.0 - hdPo.x;
        hdAlt += (0.004 * (m2.b - 0.5) * hdVis(0.02, p) - 0.004 * junta) * (1.0 - hdPo.x); }
      else { float hdY = hdAltura(vHdPos); vec2 hdQ = vec2(vHdPos.x + vHdPos.z, vHdPos.y); float hdS = vHdVar.x;
        vec4 hdA = texture2D(hdRuido, hdQ * 0.08, 4.0), hdM = texture2D(hdRuido, hdQ * 0.83 + 0.37 + hdS * 7.0), hdM2 = hdMeio(hdQ, hdS); float hdMf = 0.5 * (hdM.r + hdM2.r);
        float hdCorpo = hdFaixaCorpo(hdY), hdFora = 1.0 - hdCorpo, hdTopo = vHdJs.y > 0.001 ? vHdJc.y + vHdJs.y - vHdPos.y : 1000.0; hdRug = 0.92;
        // No corpo só o grão da textura (hdGrao); fora dele a textura inteira, borrada (mip 6) de longe.
        vec3 hdT0, hdTb, hdMed; if (hdNariz > 0.5) { hdT0 = texture2D(map, vMapUv).rgb; hdTb = texture2D(map, vMapUv, 6.0).rgb; hdMed = ${v3(CONJ.piso.media)}; }
          else { hdT0 = texture2D(hdForma, vMapUv * ${k}).rgb; hdTb = texture2D(hdForma, vMapUv * ${k}, 6.0).rgb; hdMed = ${v3(CONJ.forma.media)}; }
        vec3 hdTf = mix(mix(hdTb, hdT0, hdFino) / hdMed, hdGrao(hdT0, hdTb), hdCorpo);
        // Faixa do corpo: grão ±6 %, média frequência ±7 % (hdMf, 15–40 cm) e relevo ×1,5; fora, a máscara lenta.
        vec3 c = hdParT * hdTf * (0.89 + 0.12 * hdM.b) * mix(mix(0.92, 1.06, hdA.r) * mix(0.96, 1.03, hdM.r), mix(0.93, 1.07, hdMf), hdCorpo);
        hdRel *= mix(1.0, 1.5, hdCorpo); hdAlt += 0.006 * (hdMf - 0.5) + hdVis(0.02, hdQ) * 0.003 * (hdM.b - 0.5);
        float hdEsc = hdEscorrido(hdQ, hdTopo, hdS) * hdFora;
        c = hdUmido(c, 0.15 * hdEsc) * (1.0 - 0.05 * hdEsc);
        float hdTr = hdTrinca(hdQ + 2.0 + hdS * 5.0, hdA.a, hdS, hdY); c *= 1.0 - 0.4 * mix(1.0, 0.25, hdCorpo) * hdTr; hdAlt -= 0.003 * hdTr;
        float hdSuj = smoothstep(0.50, 0.04, hdY) * (0.45 + 0.55 * hdA.r) * hdAltoBox() * hdFora; c = hdUmido(c, 0.45 * hdSuj) * (1.0 - 0.15 * hdSuj);
        float hdMusgo = smoothstep(0.30, 0.03, hdY) * smoothstep(0.50, 0.70, hdM.a) * hdAltoBox(); c = mix(c, dot(c, ${LUMA}) * vec3(0.83, 1.10, 0.50), 0.45 * hdMusgo);
        // Espelho do degrau: a faixa úmida da canaleta desce pelo espelho (continuidade da água), com limo onde o ruído deixa.
        float hdCanE = (1.0 - smoothstep(0.075, 0.14, hdCanalD(vHdPos))) * hdNariz * hdPisoP.z;
        c = hdUmido(c, 0.5 * hdCanE) * (1.0 - 0.3 * hdCanE); c = mix(c, dot(c, ${LUMA}) * vec3(0.45, 0.62, 0.30), 0.35 * hdCanE * smoothstep(0.4, 0.6, hdM.a)); hdRug = mix(hdRug, 0.45, hdCanE);
        if (hdNariz > 0.5 && vHdJs.y > 0.001) { float d = vHdJc.y + vHdJs.y - vHdPos.y, lasca = step(0.8, hdH(vec2(floor(vHdJc.z * 7.0), 4.0))) * smoothstep(0.45, 0.60, texture2D(hdRuido, vec2(vHdPos.x * 0.9, vHdJc.z * 3.1)).a);
          float nariz = lasca * smoothstep(0.03 + 0.04 * lasca, 0.0, d), aresta = (1.0 - smoothstep(0.012, 0.02 + fwidth(vHdPos.y), d)) * (1.0 - nariz);
          c *= (1.0 - 0.30 * nariz) * (1.0 + 0.16 * aresta); hdAlt -= 0.006 * nariz; }
        diffuseColor.rgb = c; }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * hdRug;')
      .replace('#include <normal_fragment_maps>', NORMAL.replace('vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;',
        `vec3 mapN; if (hdPiso > 0.5 || hdNariz > 0.5) mapN = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0; else mapN = texture2D(hdFormaN, vNormalMapUv * ${k}).xyz * 2.0 - 1.0;`) + ALTURA); };
  m.customProgramCacheKey = () => 'escadao-hd-concreto6';
}

// Tijolo aparente procedural (a textura do mapa fica ligada mas não é lida): tijolo baiano 19 x 9 cm a meio tijolo, junta cinza
// de 1,5 cm (±1,5 mm por tijolo, borda com ±2 mm de ruído, luminância ≈ 0,9× do tijolo médio: nunca a coisa mais clara da parede),
// 2 famílias de tom + tom por tijolo (±5 % no corpo, ±10 % fora), 3 ranhuras do 6 furos (−6 %), respingo de argamassa, remendo
// de massa fora do corpo, escorrido, trinca (≤ 1,2 m) e pé úmido com musgo.
// m.color vira branco em aplica(): o albedo sai inteiro daqui (restaurado em desliga()).
function tijoloHD(m, U) {
  m.onBeforeCompile = (shader) => { comMundo(shader, U);
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `${CABECA} { float hdY = hdAltura(vHdPos); vec2 hdQ = vec2(vHdPos.x + vHdPos.z, vHdPos.y); float hdS = vHdVar.x;
      vec4 hdA = texture2D(hdRuido, hdQ * 0.137 + hdS * 3.0), hdM = texture2D(hdRuido, hdQ * 0.83 + 0.37 + hdS * 7.0), hdMic = texture2D(hdRuido, hdQ * 5.3 + 0.11);
      float hdCorpo = hdFaixaCorpo(hdY), hdFora = 1.0 - hdCorpo, hdTopo = vHdJs.y > 0.001 ? vHdJc.y + vHdJs.y - vHdPos.y : 1000.0;
      vec2 hdPx = fwidth(hdQ); float hdJa = smoothstep(0.03, 0.01, max(hdPx.x, hdPx.y));
      vec2 hdB = vec2((hdQ.x + hdS * 3.0) / 0.205 + 0.5 * floor(hdQ.y / 0.105), hdQ.y / 0.105), hdId = floor(hdB), hdF = (fract(hdB) - 0.5) * vec2(0.205, 0.105) + 0.004 * (hdMic.rg - 0.5);
      float hdJw = 0.0075 + 0.003 * (hdH(hdId + 3.0) - 0.5);
      float hdJx = 1.0 - smoothstep(hdJw, hdJw + hdPx.x, 0.1025 - abs(hdF.x)), hdJy = 1.0 - smoothstep(hdJw, hdJw + hdPx.y, 0.0525 - abs(hdF.y));
      // Longe (junta < 1 px) a junta vira 15 % de massa misturada: a cor média não muda com a distância.
      float hdJ = mix(0.15, max(hdJx, hdJy), hdJa), hdFam = step(0.55, hdH(hdId + 7.0)), hdTom = hdH(hdId + 11.0);
      float hdRan = (1.0 - smoothstep(0.0012, 0.0025 + hdPx.y, min(abs(hdF.y), abs(abs(hdF.y) - 0.0225)))) * (1.0 - hdJ) * smoothstep(0.012, 0.004, hdPx.y);
      vec3 hdBrick = mix(vec3(0.393, 0.121, 0.0605), vec3(0.486, 0.187, 0.103), hdFam) * (1.0 + (hdTom - 0.5) * mix(0.20, 0.10, hdCorpo)) * mix(mix(0.84, 1.14, hdA.r), 0.97, hdCorpo) * (0.92 + 0.16 * hdMic.r) * (1.0 - 0.06 * hdRan);
      vec3 hdMassa = vec3(0.20, 0.19, 0.17) * (0.86 + 0.28 * hdMic.b) * (0.92 + 0.16 * hdM.r);
      float hdResp = smoothstep(0.70, 0.75, hdMic.g * 0.5 + hdM.a * 0.3 + hdA.g * 0.2) * hdJa;
      float hdRemM = smoothstep(0.72, 0.74, texture2D(hdRuido, hdQ * 0.23 + 0.61).r) * hdFora;
      diffuseColor.rgb *= mix(mix(hdBrick, hdMassa, hdJ), hdMassa * 1.08, max(0.9 * hdResp, hdRemM));
      hdAlt = hdJa * (0.009 * (1.0 - hdJ) * (1.0 - hdRemM) + 0.004 * hdResp - 0.0015 * hdRan + 0.0012 * hdMic.b); hdRug = mix(0.9, 1.0, hdJ); hdRel = 0.15;
      float hdEsc = hdEscorrido(hdQ, hdTopo, hdS) * hdFora;
      diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.15 * hdEsc) * (1.0 - 0.05 * hdEsc);
      float hdTr = hdTrinca(hdQ + hdS * 5.0, hdA.a, hdS, hdY); diffuseColor.rgb *= 1.0 - 0.42 * mix(1.0, 0.25, hdCorpo) * hdTr; hdAlt -= 0.003 * hdTr;
      float hdSuj = smoothstep(0.45, 0.04, hdY) * (0.45 + 0.55 * hdA.r) * hdAltoBox() * hdFora;
      diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.8 * hdSuj) * (1.0 - 0.40 * hdSuj);
      float hdMusgo = smoothstep(0.30, 0.03, hdY) * smoothstep(0.50, 0.70, hdM.a) * hdAltoBox();
      diffuseColor.rgb = mix(diffuseColor.rgb, dot(diffuseColor.rgb, ${LUMA}) * vec3(0.50, 0.66, 0.30), 0.55 * hdMusgo); }`);
    ganchos(shader); };
  m.customProgramCacheKey = () => 'escadao-hd-tijolo5';
}

// Janela: o painel escuro do mapa vira caixilho + vidro do atlas (cor + altura no alfa), célula sorteada pela posição
// do vão, vidro 4,5 cm atrás do caixilho por paralaxe e reflexo de céu por Fresnel. Painel largo repete a célula.
// Só células que leem inteiras de longe (correr, basculante, veneziana, tijolo, madeirite); folha aberta, vitrô com
// vidro faltando, lençol+ventilador e papelão pareciam célula vizinha cortada. UV recortado a 0,02–0,98 da célula.
// Caixa sem hdJc/hdJs (vHdJs = 0) não entra no if: fica a tinta lisa do material. Por cima do atlas: aro de 5 cm em relevo
// (+2,5 cm) e peitoril escuro de 7 cm com aresta clara. Sem grade: as células do atlas já trazem barras e a grade duplicava.
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
            diffuseColor.rgb = hdTx.rgb * (0.80 + 0.36 * hdId) * (1.0 - 0.45 * smoothstep(0.78, 1.0, hdU0.y) * (1.0 - hdSol));
            hdVid = 1.0 - hdSol; hdRefl = reflect(hdV, hdGn); hdFres = (0.10 + 0.9 * pow(1.0 - hdVn, 4.0)) * (hdTx.a < 0.03 ? 1.0 : 0.4);
            vec2 hdDb = hdS - abs(hdQ); float hdPxQ = max(fwidth(hdQ.x), fwidth(hdQ.y)), hdFundo = hdQ.y + hdS.y;
            float hdAro = 1.0 - smoothstep(0.03, 0.055 + hdPxQ, min(hdDb.x, hdDb.y)); hdAlt += 0.025 * hdAro * (1.0 - hdVid);
            float hdPeit = 1.0 - smoothstep(0.065, 0.08 + hdPxQ, hdFundo), hdPeitA = 1.0 - smoothstep(0.008, 0.016 + hdPxQ, abs(hdFundo - 0.085));
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.085, 0.08, 0.075), hdPeit) * (1.0 + 0.5 * hdPeitA); hdAlt += 0.03 * hdPeitA - 0.01 * hdPeit;
            hdVid *= 1.0 - hdPeit; } }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(mix(roughnessFactor, 0.7, hdJan), 0.10, hdVid);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = hdBump(normal, -vViewPosition, hdAlt);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (hdVid > 0.0) totalEmissiveRadiance += hdVid * hdFres * mix(vec3(0.26, 0.24, 0.21), vec3(0.34, 0.46, 0.68), smoothstep(-0.1, 0.5, hdRefl.y));`); };
  m.customProgramCacheKey = () => 'escadao-hd-janela4';
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

// Ferro: a mesma cor serve portão, veneziana, grade e corrimão; a caixa decide. Portão autoral (0,6–1,5 x 1,4–2,3 m, fino):
// tinta escura por caixa, AO de 10 % junto aos 3 frisos autorais (a cada 25 cm) e a um friso horizontal central, ferrolho
// (22 x 3 cm a 1,05 m, lado sorteado) com cadeado pendurado, ferrugem só do pé até 0,4 m, trilho escuro na base. Veneziana
// autoral (0,96 m, 6 réguas a cada 14 cm desde 7 cm): sombra de 1,5 cm a 40 % sob cada régua + aresta clara de 0,5 cm (+15 %),
// oliva, ferrugem no pé. Só o painel liso de 0,72 x 0,85 m vira basculante do atlas (célula 2). O resto, tinta com ferrugem.
function ferroHD(m, U) {
  m.onBeforeCompile = (shader) => { comMundo(shader, U, 0, 'uniform sampler2D hdJanelas;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float hdPor = 0.0, hdSol = 1.0, hdAlt = 0.0, hdFerr = 0.0;
        { vec3 hdGn = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))); float hdEx = step(vHdJs.x, vHdJs.z); vec2 hdS = vec2(mix(vHdJs.x, vHdJs.z, hdEx), vHdJs.y);
          float hdFino = step(min(vHdJs.x, vHdJs.z), 0.06) * step(abs(hdGn.y), 0.5), hdId = hdH(floor(vHdJc.xz * 2.0) + floor(vHdJc.y * 2.0) + 5.0);
          vec3 hdTg = mix(vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0), hdEx); vec2 hdQ = vec2(dot(vHdPos - vHdJc, hdTg), vHdPos.y - vHdJc.y);
          vec4 hdN = texture2D(hdRuido, vec2(vHdPos.x + vHdPos.z, vHdPos.y) * 2.1 + hdId);
          if (hdFino > 0.5 && hdS.x > 0.3 && hdS.x < 0.75 && hdS.y > 0.7 && hdS.y < 1.15) {
            float hdU = clamp(hdQ.y / hdS.y * 0.5 + 0.5, 0.0, 1.0), hdK = fract(hdId * 41.0), hdHb = hdQ.y + hdS.y;
            vec3 hdTinta = (hdK < 0.34 ? vec3(0.30, 0.36, 0.28) : (hdK < 0.67 ? vec3(0.26, 0.32, 0.40) : vec3(0.36, 0.34, 0.31))) * 0.6;
            float hdDf = abs(fract(hdQ.x / 0.25 + 0.5) - 0.5) * 0.25, hdAo = 1.0 - 0.10 * (1.0 - smoothstep(0.015, 0.07, hdDf)) * step(abs(hdQ.x), 0.33);
            hdAo *= 1.0 - 0.10 * (1.0 - smoothstep(0.015, 0.05, abs(hdQ.y)));
            hdFerr = min(1.0, smoothstep(0.45, 0.75, hdN.a + 0.4 * smoothstep(0.4, 0.0, hdHb)) * smoothstep(0.45, 0.08, hdHb) + 0.5 * smoothstep(0.86, 0.94, hdN.a));
            float hdTrilho = 1.0 - smoothstep(0.03, 0.07, hdHb);
            diffuseColor.rgb = mix(hdTinta * hdAo * (0.88 + 0.24 * hdN.r) * (1.0 - 0.12 * smoothstep(0.8, 1.0, hdU)), vec3(0.26, 0.14, 0.08) * (0.7 + 0.5 * hdN.g), hdFerr) * (1.0 - 0.6 * hdTrilho);
            // Ferrolho junto à borda (lado por caixa) e cadeado de latão: corpo arredondado 4,4 x 6 cm (SDF com aro escuro e furo)
            // sob a barra, alça em arco de 3,6 cm que entra na barra, sombra de contato no portão.
            float hdBx = (step(0.5, fract(hdId * 19.0)) * 2.0 - 1.0) * hdQ.x, hdCx = hdBx - (hdS.x - 0.12);
            float hdBar = step(hdS.x - 0.30, hdBx) * step(hdBx, hdS.x - 0.06) * step(abs(hdHb - 1.05), 0.016);
            vec2 hdCp = vec2(hdCx, hdHb - 0.99), hdAp = vec2(hdCx, hdHb - 1.02); float hdPxl = max(fwidth(hdHb), 0.0005);
            float hdDc = length(max(abs(hdCp) - vec2(0.012, 0.020), 0.0)) - 0.010;
            float hdCorpoC = 1.0 - smoothstep(0.0, hdPxl, hdDc), hdAro = smoothstep(-0.005, -0.001, hdDc), hdFuro = 1.0 - smoothstep(0.003, 0.003 + hdPxl, length(hdCp - vec2(0.0, -0.008)));
            float hdArco = (1.0 - smoothstep(0.0025, 0.0025 + hdPxl, abs(length(hdAp) - 0.018))) * step(0.0, hdAp.y);
            diffuseColor.rgb *= 1.0 - 0.35 * (1.0 - smoothstep(0.0, 0.015, hdDc)) * (1.0 - hdCorpoC);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.40, 0.38) * (0.8 + 0.4 * hdN.g), hdArco);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.15, 0.15, 0.14) * (0.8 + 0.4 * hdN.r), hdBar);
            vec3 hdLatao = vec3(0.36, 0.25, 0.08) * (0.85 + 0.3 * hdN.g) * (1.0 + 0.5 * smoothstep(-0.02, 0.02, hdCp.y)) * (1.0 - 0.55 * hdAro) * (1.0 - 0.8 * hdFuro);
            diffuseColor.rgb = mix(diffuseColor.rgb, hdLatao, hdCorpoC);
            hdAlt = 0.0015 * hdN.b * hdFerr + 0.004 * (1.0 - smoothstep(0.0, 0.02, abs(hdQ.y))) + 0.006 * hdBar + 0.010 * hdCorpoC + 0.005 * hdArco * (1.0 - hdBar); }
          else if (hdFino > 0.5 && abs(hdS.x - 0.36) < 0.03 && abs(hdS.y - 0.425) < 0.03) { hdPor = 1.0;
            vec2 hdU0 = clamp(hdQ / hdS * 0.5 + 0.5, 0.02, 0.98);
            vec4 hdTx = texture2D(hdJanelas, (vec2(2.0, 0.0) + vec2(hdU0.x, 1.0 - hdU0.y)) / 3.0); hdSol = step(0.5, hdTx.a);
            hdAlt = hdSol > 0.5 ? (hdTx.a - 0.55) * 0.04 : hdTx.a * 0.008;
            diffuseColor.rgb = hdTx.rgb * (0.75 + 0.3 * fract(hdId * 7.0)); }
          else if (hdFino > 0.5 && hdS.x > 0.3 && hdS.x < 0.56 && abs(hdS.y - 0.48) < 0.03) {
            // Régua ocupa hdReg 0–0,18; sombra de contato de 1,5 cm (40 %) logo abaixo dela (hdReg > 0,893), aresta clara de 0,5 cm
            // logo acima (0,18–0,216, +15 %) e AO suave no vão: o laplaciano sobe sem mancha larga.
            float hdHb = hdQ.y + hdS.y, hdReg = fract((hdHb - 0.07) / 0.14), hdPr = fwidth(hdHb) / 0.14;
            float hdSb = smoothstep(0.893 - hdPr, 0.893 + hdPr, hdReg), hdAr = smoothstep(0.18 - hdPr, 0.18 + hdPr, hdReg) * (1.0 - smoothstep(0.216 - hdPr, 0.216 + hdPr, hdReg));
            float hdSomb = (1.0 - 0.40 * hdSb) * (1.0 + 0.15 * hdAr) * (1.0 - 0.10 * smoothstep(0.45, 0.89, hdReg));
            vec3 hdTinta = vec3(0.21, 0.24, 0.12) * (0.9 + 0.2 * fract(hdId * 13.0));
            hdFerr = smoothstep(0.5, 0.78, hdN.a + 0.35 * smoothstep(0.2, 0.0, hdHb)) * smoothstep(0.25, 0.04, hdHb);
            diffuseColor.rgb = mix(hdTinta * hdSomb * (0.9 + 0.2 * hdN.r), vec3(0.26, 0.14, 0.08) * (0.7 + 0.5 * hdN.g), hdFerr); hdAlt = 0.0015 * hdN.b * hdFerr; }
          else { hdFerr = smoothstep(0.62, 0.84, hdN.a) * 0.6;
            diffuseColor.rgb *= 0.82 + 0.36 * hdN.r; diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.26, 0.14, 0.08) * (0.7 + 0.5 * hdN.g), hdFerr); hdAlt = 0.001 * hdN.b; } }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(mix(roughnessFactor, 0.95, hdFerr), mix(0.25, 0.7, hdSol), hdPor * (1.0 - hdFerr));')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = hdBump(normal, -vViewPosition, hdAlt);'); };
  m.customProgramCacheKey = () => 'escadao-hd-ferro5';
}

// Chapa de zinco: tom por painel e ferrugem escorrida; o mapa (tex_zinco) e o UV ficam como estão. Régua fina (caixa com
// ≤ 4 cm de altura: réguas da veneziana; telha de 9 cm e beiral não entram) fica galvanizada clara e sem ferrugem.
function chapaHD(m, U) {
  m.onBeforeCompile = (shader) => { comMundo(shader, U);
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        float hdFerr = 0.0; { vec4 hdCh = texture2D(hdRuido, vHdPos.xz * 0.075 + 0.37 + vHdVar.x), hdCh2 = texture2D(hdRuido, vec2(vHdPos.x + vHdPos.z, vHdPos.y) * vec2(0.11, 0.16) + 4.1);
          float hdRegua = step(0.001, vHdJs.y) * step(vHdJs.y, 0.02);
          float hdPainel = hdCh.r * 0.72 + hdCh.g * 0.28; hdFerr = smoothstep(0.56, 0.80, hdCh2.a * 0.72 + hdCh.b * 0.28) * (1.0 - hdRegua);
          diffuseColor.rgb *= mix(1.0 + (hdPainel - 0.5) * 0.36, 1.15, hdRegua);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.25, 0.15, 0.09) * (0.72 + 0.42 * hdCh2.r), 0.35 * hdFerr); }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.95, hdFerr);'); };
  m.customProgramCacheKey = () => 'escadao-hd-chapa2';
}

// Lixeira (GLB dumpster): a pichação legível da textura vira mancha — leitura com mip 4,5 (borrão) mais sujeira.
function lixeiraHD(m, U) {
  m.onBeforeCompile = (shader) => { comMundo(shader, U);
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#ifdef USE_MAP
      { vec4 hdT = texture2D(map, vMapUv, 4.5), hdN = texture2D(hdRuido, vHdPos.xz * 0.9 + vHdPos.y * 0.7);
        diffuseColor *= hdT; diffuseColor.rgb *= (0.78 + 0.44 * hdN.r) * (1.0 - 0.35 * smoothstep(0.5, 0.75, hdN.a)); }
      #endif`); };
  m.customProgramCacheKey = () => 'escadao-hd-lixeira1';
}

// Casa GLB casa_favela_tijolo (atlas cozido, esticado pela escala não uniforme do molde): nas faces verticais laranja a leitura
// vai ao mip 2 (some a fiada esticada) e entra junta de bloco 40 x 20 cm projetada no mundo (−28 %, 3 mm de relevo) com tom
// por bloco ±5 %. O resto do atlas (madeira, zinco, vidro) não muda; rugosidade do ORM continua.
function casaTijoloHD(m, U) {
  m.onBeforeCompile = (shader) => { comMundo(shader, U);
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `${CABECA}
      #ifdef USE_MAP
      { vec4 hdT = texture2D(map, vMapUv); vec3 hdC = hdT.rgb;
        float hdLar = smoothstep(0.14, 0.22, hdC.r - hdC.g) * step(0.05, hdC.g - hdC.b) * smoothstep(0.10, 0.16, hdC.r);
        vec3 hdGn = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))); float hdMask = hdLar * step(abs(hdGn.y), 0.5);
        vec2 hdQ = vec2(vHdPos.x + vHdPos.z, vHdPos.y) + 0.7; vec4 hdBk = hdBloco(hdQ, 0.0), hdN = texture2D(hdRuido, hdQ * 0.9 + 0.23);
        float hdTom = 1.0 + 0.10 * (hdH(floor(vec2(hdQ.x / 0.40 + 0.5 * floor(hdQ.y / 0.20), hdQ.y / 0.20))) - 0.5);
        vec3 hdLiso = texture2D(map, vMapUv, 2.0).rgb * hdTom * (0.94 + 0.12 * hdN.r) * (1.0 - 0.28 * hdBk.a);
        hdT.rgb = mix(hdC, hdLiso, hdMask); hdAlt -= 0.003 * hdBk.a * hdMask; hdRel = mix(1.0, 0.5, hdMask);
        diffuseColor *= hdT; }
      #endif`).replace('#include <normal_fragment_maps>', NORMAL + ALTURA); };
  m.customProgramCacheKey = () => 'escadao-hd-casa1';
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
const propDe = (o) => { for (let p = o; p; p = p.parent) { if (p.userData?.casario) return p.userData.casario === 'casa_favela_tijolo' ? 'casa' : null; if (p.userData?.mapPropId) return p.userData.mapPropId === 'dumpster' ? 'lixeira' : null; } return null; };

export function aplicaEscadaoHD(scene, renderer, opts = {}) {
  const hdq = new URLSearchParams(location.search), liga = (k, q) => opts[k] !== false && hdq.get(q) !== '0';
  const o = { reboco: liga('reboco', 'hdreboco'), piso: liga('piso', 'hdpiso'), janelas: liga('janelas', 'hdjanela'), portas: liga('portas', 'hdporta'),
    tijolo: liga('tijolo', 'hdtijolo'), chapa: liga('chapa', 'hdchapa'), lixeira: liga('lixeira', 'hdlixeira'), casa: liga('casa', 'hdcasa'), pisoSujo: opts.pisoSujo !== false };
  const ativa = { reboco: o.reboco, cimento: o.reboco, guarda: o.reboco, degrau: o.piso, concreto: o.piso, concretoEscuro: o.piso, tijolo: o.tijolo, vidro: o.janelas, porta: o.portas, ferro: o.portas, zinco: o.chapa };
  let vivo = true; const antes = [], criadas = [], timers = [], trocas = [], porRegra = new Map(), vistos = new Set(), props = [], tiraCaixas = [];
  const ruido = ruidoTex(); criadas.push(ruido);
  const U = { hdRuido: { value: ruido }, hdCob: { value: null }, hdJanelas: { value: null }, hdPortas: { value: null } };
  const atlasJ = () => { if (!U.hdJanelas.value) criadas.push(U.hdJanelas.value = atlasJanelas()); };
  const atlasP = () => { if (!U.hdPortas.value) criadas.push(U.hdPortas.value = atlasPortas()); };
  const DEFAULTS = { hdJc: [0, 0, 0], hdJs: [0, 0, 0], hdVar: [0, 0] }, propMats = new Map();
  const aplica = (nome, m) => { const r = REGRAS[nome];
    const s = { m, map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap, cor: m.color.getHex(), roughness: m.roughness, metalness: m.metalness, ns: m.normalScale.x, obc: m.onBeforeCompile, key: m.customProgramCacheKey, meu: null, meuN: null };
    antes.push(s); m.defaultAttributeValues = DEFAULTS;
    if (r.reboco) { m.map = s.meu = tex('reboco', 'cor_rug'); m.normalMap = s.meuN = tex('reboco', 'normal'); m.roughnessMap = null; m.roughness = 1; m.normalScale.set(r.relevo, r.relevo); m.color.setHex(nome === 'reboco' ? PALETA[s.cor] : r.cor); rebocoHD(m, r, U, satDeHex(m.color.getHex()) < .15 ? 1 : 0); }
    if (r.concreto) { m.map = s.meu = tex('piso', 'cor_rug'); m.normalMap = s.meuN = tex('piso', 'normal'); m.roughnessMap = null; m.roughness = 1; m.normalScale.set(1.3, 1.3); m.color.setHex(0xffffff); concretoHD(m, r, U, o); }
    if (r.tijolo) { m.roughnessMap = null; m.roughness = .9; m.color.setHex(0xffffff); tijoloHD(m, U); }
    if (r.janela) { atlasJ(); m.metalness = .05; m.roughness = .5; janelaHD(m, U); }
    if (r.porta) { atlasP(); m.roughness = .8; portaHD(m, U); }
    if (r.ferro) { atlasJ(); ferroHD(m, U); }
    if (r.chapa) chapaHD(m, U);
    // dispose() solta os programas antigos do material (o three guarda todas as variantes até lá).
    m.dispose(); m.needsUpdate = true; };
  // Casamento: o kit entra logo depois do build, antes de concrete_br/tex_zinco/tijolo chegarem (external em
  // map_escadao.js troca mapa e normal por fora). Reexecuta por 40 s: material novo entra, mapa do kit volta.
  const casa = () => { let novos = 0;
    scene.traverse((ob) => { if (!ob.isMesh) return;
      if ((o.lixeira || o.casa) && !Array.isArray(ob.material) && ob.material?.map && !propMats.has(ob.material) && !ob.material.name?.startsWith('hd-')) { const t = propDe(ob); if (t && o[t]) props.push([ob, t]); }
      for (const m of materiaisDe(ob)) { if (vistos.has(m)) continue; const r = regraDe(m); if (r && ativa[r]) { vistos.add(m); (porRegra.get(r) || porRegra.set(r, new Set()).get(r)).add(m); aplica(r, m); novos++; } } });
    // Props: a textura do GLB continua, lida pelo clone do material (lixeira borrada, casa com junta); o original volta em desliga().
    for (const [ob, t] of props.splice(0)) { const velho = ob.material; if (!propMats.has(velho)) { const n = velho.clone(); n.name = 'hd-' + t; n.defaultAttributeValues = DEFAULTS; (t === 'casa' ? casaTijoloHD : lixeiraHD)(n, U); propMats.set(velho, n); criadas.push(n); } trocas.push([ob, velho]); ob.material = propMats.get(velho); }
    if (novos) tiraCaixas.push(marcaCaixas(scene, new Set([...porRegra.values()].flatMap((s) => [...s])), porRegra.get('reboco') || new Set()));
    for (const s of antes) { if (!s.meu || s.m.map === s.meu) continue;
      s.map = s.m.map; s.normalMap = s.m.normalMap; s.roughnessMap = s.m.roughnessMap; s.m.map = s.meu; s.m.normalMap = s.meuN; s.m.roughnessMap = null; s.m.needsUpdate = true; } };
  casa();
  const laco = setInterval(() => { if (vivo) casa(); }, 1000); timers.push(setTimeout(() => clearInterval(laco), 40000));
  const cob = o.piso ? cobertura(scene, renderer, U, () => vivo) : null;
  // Cenografia sem colisão (hd_cenografia_escadao.js). Desliga tudo: opts.cenografia === false ou ?hdcen=0;
  // por item: opts.cenografia.{morro,casario,mata,telhados,fachada,postes,vida} === false ou ?hdcen=morro,postes (só os listados).
  const qCen = hdq.get('hdcen'), soEstes = qCen && qCen !== '0' && qCen !== '1' ? qCen.split(',') : null;
  const oCen = opts.cenografia === false || qCen === '0' ? null : { ...(opts.cenografia || {}) };
  if (oCen && soEstes) for (const k of ['morro', 'casario', 'mata', 'telhados', 'fachada', 'postes', 'vida']) if (!soEstes.includes(k)) oCen[k] = false;
  const cen = oCen ? cenografiaEscadao(scene, { ...oCen, ruido: U.hdRuido }) : null;
  return { alvos: () => Object.fromEntries([...porRegra].map(([k, s]) => [k, s.size])), lixeiras: () => trocas.length, cenografia: cen, cobertura: cob, desliga() {
    vivo = false; clearInterval(laco); timers.forEach(clearTimeout);
    for (const s of antes) { Object.assign(s.m, { map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, roughness: s.roughness, metalness: s.metalness, onBeforeCompile: s.obc, customProgramCacheKey: s.key });
      delete s.m.defaultAttributeValues; s.m.color.setHex(s.cor); s.m.normalScale.set(s.ns, s.ns); s.m.dispose(); s.m.needsUpdate = true; }
    for (const [ob, m] of trocas) ob.material = m;
    for (const f of tiraCaixas) f(); cob?.desliga(); cen?.desliga();
    for (const c of criadas) c.dispose();
  } };
}
