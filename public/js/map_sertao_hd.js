// Kit visual HD do Sertão, atrás de ?hd=1 (demo de gráficos, desligado por padrão).
// Tudo reversível por desliga() para A/B na mesma sessão.
import * as THREE from 'three';
import { cenografiaSertaoHD } from './hd_cenografia_sertao.js';

const TEX = '/img/textures/pbr_';
const loader = new THREE.TextureLoader();
const cacheTex = new Map();
export function pbrTex(nome, srgb = false, rep = 1) {
  const [rx, ry] = Array.isArray(rep) ? rep : [rep, rep], chave = `${nome}|${rx}|${ry}`;
  if (!cacheTex.has(chave)) {
    const t = loader.load(nome.startsWith('/') ? `/img/textures${nome}.webp` : nome.includes('/') ? `/img/textures/${nome}.webp` : `${TEX}${nome}.webp`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.name = `hd-${nome}`;
    cacheTex.set(chave, t);
  }
  return cacheTex.get(chave);
}

// Conjuntos antigos só têm cor: deriva o relevo da luminância (Sobel) uma vez, na carga.
const cacheRelevo = new WeakMap();
export function relevoDeCor(tex, forca = 2.2, lado = 512) {
  // Uma tela por IMAGEM (tex.source): clones do mesmo mapa dividem a mesma textura na GPU.
  const copia = (base) => { const c = base.clone(); c.repeat.copy(tex.repeat); c.needsUpdate = true; return c; };
  if (cacheRelevo.has(tex.source)) return copia(cacheRelevo.get(tex.source));
  const cv = document.createElement('canvas'); cv.width = cv.height = lado;
  const saida = new THREE.CanvasTexture(cv);
  saida.wrapS = saida.wrapT = THREE.RepeatWrapping; saida.anisotropy = 8; saida.name = `hd-relevo-${tex.name || 'cor'}`;
  const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.fillStyle = '#8080ff'; ctx.fillRect(0, 0, lado, lado);
  const gera = () => {
    const img = tex.image; if (!img || !img.width) return false;
    ctx.drawImage(img, 0, 0, lado, lado);
    const src = ctx.getImageData(0, 0, lado, lado), d = src.data, L = new Float32Array(lado * lado);
    for (let i = 0; i < L.length; i++) L[i] = (d[i * 4] * .299 + d[i * 4 + 1] * .587 + d[i * 4 + 2] * .114) / 255;
    const at = (x, y) => L[((y + lado) % lado) * lado + ((x + lado) % lado)];
    for (let y = 0; y < lado; y++) for (let x = 0; x < lado; x++) {
      const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
      const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
      const nx = -dx * forca, ny = dy * forca, inv = 1 / Math.hypot(nx, ny, 1), i = (y * lado + x) * 4;
      d[i] = (nx * inv * .5 + .5) * 255; d[i + 1] = (ny * inv * .5 + .5) * 255; d[i + 2] = (inv * .5 + .5) * 255; d[i + 3] = 255;
    }
    ctx.putImageData(src, 0, 0); saida.needsUpdate = true; return true;
  };
  if (!gera()) { const t0 = performance.now(); const espera = () => { if (!gera() && performance.now() - t0 < 15000) setTimeout(espera, 120); }; espera(); }
  cacheRelevo.set(tex.source, saida); return copia(saida);
}

// Ruído de valor barato (sem leitura de textura) para mancha, escorrido e poça.
export const RUIDO_GLSL = `
  float hdH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float hdN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hdH(i), hdH(i + vec2(1.0, 0.0)), f.x), mix(hdH(i + vec2(0.0, 1.0)), hdH(i + vec2(1.0, 1.0)), f.x), f.y); }
`;
// Grão fino de superfície; some quando o passo vira menor que o pixel, para não cintilar ao longe.
export const GRAO_GLSL = `
  float hdGrao(vec2 q){ float a = smoothstep(0.5, 0.12, fwidth(q.x) * 34.0);
    return 1.0 + a * ((hdN(q * 34.0) - 0.5) * 0.22 + (hdN(q * 87.0) - 0.5) * 0.13); }
  // Trinca: uma linha por faixa de 1,7 m que serpenteia ao longo de q.y. Curva de nível de ruído fechava
  // laço e lia como rabisco; aqui a linha nunca volta sobre si. Some de longe (passo maior que o pixel).
  float hdTrincaL(vec2 q){ float c = floor(q.x / 1.7), fx = q.x - (c + 0.5) * 1.7, l = fwidth(q.x);
    float w = (hdN(vec2(c * 7.31, q.y * 1.1)) - 0.5) + (hdN(vec2(c * 3.7 + 9.0, q.y * 4.3)) - 0.5) * 0.18;
    float existe = step(0.5, hdH(vec2(c, 3.0))) * smoothstep(0.42, 0.6, hdN(vec2(c * 5.1, q.y * 0.35)));
    return (1.0 - smoothstep(0.003, 0.005 + l * 1.2, abs(fx - w))) * existe * smoothstep(0.03, 0.008, l); }
`;
// `sub` = material de baixo do reboco ({ tex, metros, cor }): o reboco descasca no pé e no alto
// e mostra o tijolo ou o adobe. Na faixa do corpo quase não descasca (leitura de inimigo).
export function ligaSub(shader, sub) {
  if (!sub) return;
  shader.uniforms.hdSub = { value: sub.tex };
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D hdSub;');
}
export const idadeDaParede = (rodape, piso = '0.0', suave = false, sub = null, pe = null, leve = false, grao = 1, macro = 1) => `
  { float hdY = vHdPos.y - ${piso}; vec2 hdQ = vec2(vHdPos.x + vHdPos.z, hdY);
    float hdMacro = hdN(hdQ * 0.55) * 0.6 + hdN(hdQ * 1.9) * 0.4;
    float hdCorpo = smoothstep(0.6, 0.9, hdY) * (1.0 - smoothstep(1.7, 2.0, hdY));
    ${suave ? `#ifdef USE_MAP
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuse * texture2D(map, vMapUv, 4.5).rgb, 0.7 * hdCorpo);
    #endif` : ''}
    float hdMedio = hdN(hdQ * 5.5) * 0.55 + hdN(hdQ * 13.0) * 0.45;
    diffuseColor.rgb *= ${macro === 1 ? '' : `mix(1.0, `}mix(mix(0.72, 1.12, hdMacro), mix(0.93, 1.05, hdMacro), hdCorpo)${macro === 1 ? '' : `, ${macro.toFixed(3)})`} * mix(mix(0.88, 1.08, hdMedio), mix(0.96, 1.03, hdMedio), hdCorpo) * ${grao === 1 ? 'hdGrao(hdQ)' : `mix(1.0, hdGrao(hdQ), ${grao.toFixed(3)})`};
    float hdEsc = smoothstep(0.66, 0.86, hdN(vec2(hdQ.x * 1.05 + hdN(hdQ * 0.31) * 2.3, hdY * 0.2))) * smoothstep(1.9, 3.1, hdY);
    diffuseColor.rgb *= 1.0 - 0.27 * hdEsc;
    float hdTrinca = hdTrincaL(vec2(hdQ.x, hdY));
    diffuseColor.rgb *= 1.0 - mix(0.42, 0.2, hdCorpo) * hdTrinca;
    float hdPele = 0.0;
    ${sub ? `vec2 hdP = hdQ + 3.7, hdP2 = hdP + vec2(0.0, max(0.02, length(fwidth(hdQ)) * 1.6));
      ${leve ? `float hdFbA = hdN(hdP * 8.0) * 0.14, hdFb = hdN(hdP * 1.1) * 0.56 + hdN(hdP * 3.0) * 0.30 + hdFbA;
      float hdFb2 = hdN(hdP2 * 1.1) * 0.56 + hdN(hdP2 * 3.0) * 0.30 + hdFbA;` : `float hdFb = hdN(hdP * 1.1) * 0.56 + hdN(hdP * 3.0) * 0.30 + hdN(hdP * 8.0) * 0.10 + hdN(hdP * 25.0) * 0.04;
      float hdFb2 = hdN(hdP2 * 1.1) * 0.56 + hdN(hdP2 * 3.0) * 0.30 + hdN(hdP2 * 8.0) * 0.10 + hdN(hdP2 * 25.0) * 0.04;`}
      float hdLim = mix(mix(mix(${(sub.pe ?? .56).toFixed(3)}, 0.73, smoothstep(${(sub.y0 ?? 0).toFixed(3)}, ${((sub.y0 ?? 0) + .75).toFixed(3)}, hdY)), ${(sub.alto ?? .71).toFixed(3)}, smoothstep(1.9, 2.4, hdY)), 0.80, hdCorpo);
      float hdW = max(0.004, fwidth(hdFb) * 0.5);
      hdPele = smoothstep(hdLim, hdLim + hdW, hdFb); float hdPele2 = smoothstep(hdLim, hdLim + hdW, hdFb2);
      ${sub.foraDoCorpo ? `float hdFora = smoothstep(2.1, 2.25, hdY) + 1.0 - smoothstep(0.38, 0.5, hdY); hdPele *= hdFora; hdPele2 *= hdFora;` : ''}
      ${sub.tijolo ? `// Tijolo com junta desenhada (fiada de 20 cm, amarração): buraco sem junta lia como mancha de pele ou sangue.
      vec2 hdBr = vec2(hdQ.x / 0.30 + 0.5 * floor(hdY / 0.20), hdY / 0.20), hdBf = abs(fract(hdBr) - 0.5);
      float hdJa = smoothstep(0.5, 0.15, fwidth(hdBr.y));
      float hdJ = (1.0 - smoothstep(0.006, 0.013, min((0.5 - hdBf.x) * 0.30, (0.5 - hdBf.y) * 0.20))) * hdJa;
      vec3 hdSubC = texture2D(hdSub, hdQ / ${sub.metros.toFixed(3)}, 6.0).rgb * vec3(${sub.cor.map((c) => c.toFixed(3)).join(', ')})
        * (1.0 + 0.3 * (hdH(floor(hdBr)) - 0.5) * hdJa) * (1.0 - 0.1 * hdJa * step(0.5, fract(hdBr.y * 4.0)));
      hdSubC = mix(hdSubC, vec3(0.50, 0.48, 0.45) * mix(0.8, 1.1, hdMedio), hdJ * 0.9);` : sub.adobe ? `// Adobe: brilho preso ao da parede (contraste fixo); a fiada some sozinha no mip quando passa de ~3 px.
      float hdAl = dot(texture2D(hdSub, hdQ / ${sub.metros.toFixed(3)}).rgb, vec3(0.3, 0.59, 0.11)) / ${(sub.media ?? .1).toFixed(4)};
      vec3 hdSubC = vec3(${sub.cor.map((c) => c.toFixed(3)).join(', ')}) * (dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)) * ${(sub.razao ?? .77).toFixed(3)})
        * clamp(1.0 + (1.0 - hdAl) * ${(sub.junta ?? .5).toFixed(3)}, 0.72, 1.3) * mix(0.93, 1.07, hdN(hdP * 0.6 + 9.0));` : sub.taipa ? `// Taipa: barro escuro acinzentado com a trama de varas à mostra; nunca tom de pele.
      float hdTa = smoothstep(0.6, 0.15, fwidth(hdY) / 0.17);
      float hdVh = smoothstep(0.26, 0.4, abs(fract(hdY / 0.17 + 0.2 * hdN(vec2(hdQ.x * 0.7, floor(hdY / 0.17)))) - 0.5));
      float hdVv = smoothstep(0.34, 0.44, abs(fract(hdQ.x / 0.31) - 0.5));
      float hdBarro = dot(texture2D(hdSub, hdQ / ${sub.metros.toFixed(3)}).rgb, vec3(0.3, 0.59, 0.11)) * 2.2;
      vec3 hdSubC = vec3(${sub.cor.map((c) => c.toFixed(3)).join(', ')}) * mix(0.75, 1.25, clamp(hdBarro, 0.0, 1.0)) * mix(0.8, 1.15, hdN(hdQ * 21.0));
      hdSubC = mix(hdSubC, hdSubC * 1.45, hdVh * hdTa * (1.0 - 0.5 * hdVv));
      hdSubC *= 1.0 - 0.45 * hdVv * hdTa * (1.0 - hdVh);` : `vec3 hdSubC = texture2D(hdSub, hdQ / ${sub.metros.toFixed(3)}).rgb * vec3(${sub.cor.map((c) => c.toFixed(3)).join(', ')});`}
      // Cada buraco com seu tom (quente ou frio) e menos saturado: mancha toda igual lia como tinta, não como parede.
      ${sub.adobe ? '' : `hdSubC = mix(vec3(dot(hdSubC, vec3(0.3, 0.59, 0.11))), hdSubC, ${(sub.sat ?? 1).toFixed(3)}) * mix(vec3(1.06, 0.98, 0.9), vec3(0.9, 0.97, 1.04), hdN(hdP * 0.45 + 2.0)) * mix(0.82, 1.1, hdN(hdP * 0.6 + 9.0));`}
      // Espessura do reboco: 2 cm acima ainda é reboco = sombra do beiço no buraco; o beiço de baixo pega luz de cima.
      hdSubC *= 1.0 - ${(sub.beico ?? .55).toFixed(3)} * (1.0 - hdPele2);
      diffuseColor.rgb *= 1.0 + 0.16 * hdPele2 * (1.0 - hdPele);
      diffuseColor.rgb = mix(diffuseColor.rgb, mix(diffuseColor.rgb, hdSubC, ${(sub.forca ?? 1).toFixed(3)}), hdPele);` : ''}
    ${pe ? `float hdSuj = smoothstep(${pe.altura.toFixed(3)}, 0.04, hdY + (hdN(hdQ * vec2(2.3, 0.0)) - 0.5) * 0.22) * (0.62 + 0.38 * hdN(hdQ * 1.3));
    vec3 hdTerra = vec3(${pe.cor.map((c) => c.toFixed(3)).join(', ')});
    hdTerra *= ${(1 - pe.escuro).toFixed(3)} * dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)) / dot(hdTerra, vec3(0.3, 0.59, 0.11));
    diffuseColor.rgb = mix(diffuseColor.rgb, hdTerra * mix(0.86, 1.12, hdMedio), hdSuj); }` : `float hdSuj = smoothstep(${rodape.toFixed(3)}, 0.05, hdY) * (0.5 + 0.5 * hdN(hdQ * 1.3)) * (1.0 - 0.6 * hdPele);
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.55, 0.45, 0.36), hdSuj); }`}`;

// Caixas instanciadas têm UV 0..1 por face: sem projeção no mundo o relevo estica com a parede.
export function projetaMundo(material, metros, { rodape = 0, metrosCor = metros, sub = null, pe = null, extra = null, leve = false, grao = 1, macro = 1 } = {}) {
  material.onBeforeCompile = (shader) => {
    if (rodape > 0) {
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\nvarying vec3 vHdPos;${extra?.vertCabeca || ''}`);
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vHdPos;${RUIDO_GLSL}${GRAO_GLSL}${extra?.cabeca || ''}`)
        .replace('#include <map_fragment>', `#include <map_fragment>\n${extra?.antes || ''}${idadeDaParede(rodape, '0.0', false, sub, pe, leve, grao, macro)}${extra?.depois || ''}`);
      if (extra?.normal) shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${extra.normal}`);
      ligaSub(shader, sub);
      if (extra?.uniforms) Object.assign(shader.uniforms, extra.uniforms);
    }
    shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
      {
        vec4 hdMundo = vec4(position, 1.0);
        vec3 hdN3 = normal;
        #ifdef USE_INSTANCING
          hdMundo = instanceMatrix * hdMundo;
          hdN3 = mat3(instanceMatrix) * hdN3;
        #endif
        hdMundo = modelMatrix * hdMundo;
        hdN3 = abs(normalize(mat3(modelMatrix) * hdN3));
        vec2 hdUv = (hdN3.y > max(hdN3.x, hdN3.z) ? hdMundo.xz : (hdN3.x > hdN3.z ? hdMundo.zy : hdMundo.xy)) / ${metros.toFixed(3)};
        #ifdef USE_MAP
          vMapUv = hdUv * ${(metros / metrosCor).toFixed(4)};
        #endif
        #ifdef USE_NORMALMAP
          vNormalMapUv = hdUv;
        #endif
        #ifdef USE_ROUGHNESSMAP
          vRoughnessMapUv = hdUv;
        #endif
        #ifdef USE_BUMPMAP
          vBumpMapUv = hdUv;
        #endif
        ${rodape > 0 ? `vHdPos = hdMundo.xyz;${extra?.vert || ''}` : ''}
      }`);
  };
  material.customProgramCacheKey = () => `sertao-hd-mundo10-${metros}-${rodape}-${metrosCor}-${sub ? `${sub.metros}${sub.cor}${sub.pe}${sub.alto}${sub.y0}${sub.sat}${sub.forca}${sub.tijolo}${sub.taipa}${sub.foraDoCorpo}${sub.adobe ? `a${sub.razao}${sub.junta}${sub.media}${sub.beico}` : ''}` : 0}-${pe ? `${pe.cor}${pe.altura}${pe.escuro}` : 0}${extra ? `-${extra.chave}` : ''}${leve ? '-leve' : ''}${grao === 1 && macro === 1 ? '' : `-g${grao}-${macro}`}`;
}

export const materiaisDe = (o) => (Array.isArray(o.material) ? o.material : [o.material]).filter(Boolean);

// Adobe aparente por baixo do reboco caiado (mesma imagem que o mapa já usa nas paredes sem reboco).
// A sapata de pedra cobre até 0,42 m: o descascado começa acima dela (y0).
const adobeDeBaixo = (extra = {}) => ({ tex: extra.tex || pbrTex('/tex_adobe', true), metros: 1.5, cor: [.82, .74, .66], y0: .38, pe: .55, alto: .66, sat: .85, ...extra });
// Terra do pé da parede no matiz que o chão mostra sob o sol da tarde; mais vermelha lia como ferrugem.
const TERRA = [.16, .118, .09];
// Barrado de tinta gasta por casa: anil, verde-água e ocre desbotados (linear). Nada verde-escuro (escondia perna).
const BARRADOS = [[.17, .26, .40], [.28, .42, .35], [.50, .36, .12]];
const LUMA = 'vec3(0.3, 0.59, 0.11)';
function acabamentoParede(scene, { albedo = .7, barrado = true, sujeira = .8, dessat = .4, fino = .9 } = {}) {
  const casas = []; scene.traverse((o) => { if (/^sertao-(casa-[a-z]+|praca-casa-interior)-\d+$/.test(o.name)) { const p = o.getWorldPosition(new THREE.Vector3()); casas.push(new THREE.Vector4(p.x, p.z, 56, casas.length % 3)); } });
  const matriz = scene.getObjectByName('sertao-igrejinha-0'); if (matriz) casas.push(new THREE.Vector4(matriz.position.x, matriz.position.z, 30, 0));
  const n = barrado ? casas.length : 0, cor = (c) => `vec3(${c.map((v) => v.toFixed(3)).join(', ')})`;
  return { chave: `parede14-${albedo}-${n}-${sujeira}-${dessat}-${fino}`,
    uniforms: { hdDet: { value: pbrTex('hd_sertao/white_rough_plaster_cor') }, ...(n ? { hdCasas: { value: casas } } : {}) },
    vertCabeca: `varying vec4 vHdBarra;${n ? `uniform vec4 hdCasas[${n}];` : ''}`,
    vert: `vHdBarra = vec4(0.0);${n ? `{ float hdPerto = 1e9; for (int i = 0; i < ${n}; i++) { vec2 hdDc = hdMundo.xz - hdCasas[i].xy; float hdD2c = dot(hdDc, hdDc);
      if (hdD2c < hdCasas[i].z && hdD2c < hdPerto) { hdPerto = hdD2c; vHdBarra = vec4(hdCasas[i].w < 0.5 ? ${cor(BARRADOS[0])} : (hdCasas[i].w < 1.5 ? ${cor(BARRADOS[1])} : ${cor(BARRADOS[2])}), 1.0); } } }` : ''}`,
    cabeca: 'uniform sampler2D hdDet; varying vec4 vHdBarra;',
    // Faixa do corpo (0,6 a 1,9 m): detalhe e mancha contidos; o grosso da sujeira fica acima de 2,1 m e abaixo de 0,5 m.
    antes: `float hdD1 = 1.0, hdD2 = 1.0, hdD3 = 1.0;
    { float hdYa = vHdPos.y; vec2 hdQa = vec2(vHdPos.x + vHdPos.z, hdYa);
      float hdCa = smoothstep(0.5, 0.62, hdYa) * (1.0 - smoothstep(1.95, 2.12, hdYa));
      #ifdef USE_NORMALMAP
        hdD1 = dot(texture2D(hdDet, vNormalMapUv).rgb, ${LUMA}) / 0.61;
        hdD3 = mix(1.0, dot(texture2D(hdDet, vNormalMapUv * 3.1 + 0.23).rgb, ${LUMA}) / 0.61, smoothstep(4.0, 1.5, length(fwidth(vNormalMapUv)) * 3174.0));
      #endif
      hdD2 = dot(texture2D(hdDet, hdQa / 4.7 + 0.37).rgb, ${LUMA}) / 0.61;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, ${LUMA})), ${dessat.toFixed(3)}) * vec3(1.0, 0.995, 0.98);
      diffuseColor.rgb *= ${albedo.toFixed(3)} * mix(1.0, clamp(hdD1, 0.5, 1.25), mix(0.95, 0.85, hdCa)) * mix(1.0, clamp(hdD2, 0.45, 1.25), mix(0.42, 0.07, hdCa)) * mix(1.0, clamp(hdD3, 0.6, 1.15), ${(0.5 * fino).toFixed(3)});
      if (vHdBarra.a > 0.5) { float hdTopo = 0.9 + (hdN(vec2(hdQa.x * 0.8, 3.0)) - 0.5) * 0.06;
        float hdGasto = smoothstep(0.42, 0.72, hdN(hdQa * vec2(1.7, 2.9) + 11.0) * 0.55 + hdN(hdQa * 7.0 + 5.0) * 0.25 + (1.0 - clamp(hdD1, 0.0, 1.0)) * 0.9);
        float hdTinta = (1.0 - smoothstep(hdTopo - 0.01, hdTopo + 0.01, hdYa)) * mix(0.8, 0.2, hdGasto);
        diffuseColor.rgb = mix(diffuseColor.rgb, vHdBarra.rgb * (dot(diffuseColor.rgb, ${LUMA}) * 0.84 / dot(vHdBarra.rgb, ${LUMA})), hdTinta); } }`,
    depois: `{ float hdYb = vHdPos.y; vec2 hdQb = vec2(vHdPos.x + vHdPos.z, hdYb);
      float hdAlto = smoothstep(2.1, 2.7, hdYb), hdBaixo = 1.0 - smoothstep(0.15, 0.5, hdYb);
      float hdFio = hdN(vec2(hdQb.x * 2.6, hdYb * 0.3)) * 0.55 + hdN(vec2(hdQb.x * 9.0, hdYb * 0.7 + 4.0)) * 0.45;
      float hdEscB = smoothstep(0.4, 0.72, hdFio + (1.0 - hdD2) * 0.5) * hdAlto;
      diffuseColor.rgb *= mix(vec3(1.0), vec3(0.66, 0.58, 0.5), min(1.0, hdEscB * ${(0.8 * sujeira).toFixed(3)}));
      float hdResp = hdBaixo * smoothstep(0.35, 0.7, hdN(hdQb * vec2(5.0, 8.0)) * 0.55 + hdN(hdQb * 19.0) * 0.45 + hdBaixo * 0.3);
      diffuseColor.rgb = mix(diffuseColor.rgb, ${cor(TERRA)} * (dot(diffuseColor.rgb, ${LUMA}) * 0.8 / ${(TERRA[0] * .3 + TERRA[1] * .59 + TERRA[2] * .11).toFixed(4)}), min(1.0, hdResp * ${(0.6 * sujeira).toFixed(3)})); }`,
    // Relevo fino do reboco (grão de ~1 cm) pela derivada de tela; some de longe para não cintilar.
    normal: `{ normal = normalize(mix(nonPerturbedNormal, normal, mix(0.88, 1.0, smoothstep(12.0, 4.0, length(fwidth(vNormalMapUv)) * 1024.0))));
      float hdAltP = (hdD3 - 1.0) * ${(0.017 * fino).toFixed(4)} * smoothstep(26.0, 9.0, length(vViewPosition));
      vec3 hdSx = dFdx(-vViewPosition), hdSy = dFdy(-vViewPosition), hdR1 = cross(hdSy, normal), hdR2 = cross(normal, hdSx); float hdDt = dot(hdSx, hdR1);
      normal = normalize(abs(hdDt) * normal - sign(hdDt) * (dFdx(hdAltP) * hdR1 + dFdy(hdAltP) * hdR2));
      // Face quase de costas para o sol: o relevo não pode acender ponto que a parede lisa não acenderia.
      #if NUM_DIR_LIGHTS > 0
        { vec3 hdLd = directionalLights[0].direction; float hdLim = max(dot(nonPerturbedNormal, hdLd), 0.0) * 3.0 + 0.02, hdPl = dot(normal, hdLd);
          if (hdPl > hdLim) normal = normalize(normal - hdLd * (hdPl - hdLim)); }
      #endif
    }` };
}
function rebocoHD(scene, { metros = 1.1, relevo = 3.15, rodape = .75, adobe = true, pe = { cor: TERRA, altura: .62, escuro: .34 }, parede = {} } = {}) {
  const alvos = new Set();
  scene.traverse((o) => { if (o.isMesh) for (const m of materiaisDe(o)) if (m.map?.name === 'oeste-adobe-paupique' || m.map?.name === 'oeste-adobe-real') alvos.add(m); });
  const antes = [...alvos].map((m) => ({ m, map: m.map, bumpMap: m.bumpMap, normalMap: m.normalMap, roughnessMap: m.roughnessMap,
    roughness: m.roughness, ns: m.normalScale.x, obc: m.onBeforeCompile, key: m.customProgramCacheKey }));
  const extra = parede === false ? null : acabamentoParede(scene, parede);
  for (const m of alvos) {
    // A cor autoral fica: trocá-la pelo reboco limpo apagava a pátina que dá idade à parede.
    m.bumpMap = null; m.normalMap = pbrTex('hd_sertao/white_rough_plaster_normal'); m.normalScale.set(relevo, relevo);
    m.roughnessMap = null; m.roughness = .93;
    projetaMundo(m, metros, { rodape, metrosCor: 3, pe: pe || null, extra, leve: true, macro: .6,
      sub: m.map?.name === 'oeste-adobe-paupique' ? adobeDeBaixo(adobe ? { adobe: true, foraDoCorpo: true, tex: pbrTex('hd_sertao/clay_block_wall_cor', true), metros: 1.6, media: .1178,
        cor: [1.38, .86, .5], razao: .56, junta: .9, alto: .725, pe: .66 } : {}) : null }); m.needsUpdate = true;
  }
  return () => { for (const s of antes) { Object.assign(s.m, { map: s.map, bumpMap: s.bumpMap, normalMap: s.normalMap,
    roughnessMap: s.roughnessMap, roughness: s.roughness, onBeforeCompile: s.obc, customProgramCacheKey: s.key }); s.m.normalScale.set(s.ns, s.ns); s.m.needsUpdate = true; } };
}

// Base de pedra, madeira e chão: os três ainda eram 512 px só cor, com bumpMap = a própria cor.
function baseHD(scene, { pedraMetros = 1.6, madeira = 2.2, chao = 300, telha = 2.6 } = {}) {
  const porMapa = new Map();
  scene.traverse((o) => { if (o.isMesh) for (const m of materiaisDe(o)) if (m.map?.name && m.isMeshStandardMaterial) (porMapa.get(m.map.name) || porMapa.set(m.map.name, new Set()).get(m.map.name)).add(m); });
  const antes = [], guarda = (m) => antes.push({ m, cor: m.color.clone(), map: m.map, bumpMap: m.bumpMap, normalMap: m.normalMap, roughnessMap: m.roughnessMap, roughness: m.roughness,
    ns: m.normalScale.x, obc: m.onBeforeCompile, key: m.customProgramCacheKey });
  for (const m of porMapa.get('oeste-pedra-real') || []) { guarda(m);
    m.map = pbrTex('cobblestone_floor_01_color', true); m.bumpMap = null; m.normalMap = pbrTex('cobblestone_floor_01_normal'); m.normalScale.set(3.1, 3.1);
    m.roughnessMap = pbrTex('cobblestone_floor_01_rough'); m.roughness = 1; m.color.setRGB(1.45, 1.36, 1.2); projetaMundo(m, pedraMetros); m.needsUpdate = true; }
  for (const m of telha ? porMapa.get('oeste-roof-real') || [] : []) { guarda(m); m.userData.hdLaje = true;
    m.map = pbrTex('hd_sertao/clay_roof_tiles_02_cor', true); m.bumpMap = null; m.normalMap = pbrTex('hd_sertao/clay_roof_tiles_02_normal'); m.normalScale.set(3.4, 3.4); m.color.setRGB(.66, .7, .74);
    // Fiada da telha segue a queda da água: a direção sai da componente horizontal da normal do plano.
    m.onBeforeCompile = (shader) => { shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vHdBaixo;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nif (vHdBaixo < -0.3) normal = nonPerturbedNormal;');
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying float vHdBaixo;').replace('#include <uv_vertex>', `#include <uv_vertex>
      { vec4 hdW = vec4(position, 1.0); vec3 hdNt = normal;
        #ifdef USE_INSTANCING
          hdW = instanceMatrix * hdW; hdNt = mat3(instanceMatrix) * hdNt;
        #endif
        hdW = modelMatrix * hdW; hdNt = normalize(mat3(modelMatrix) * hdNt); vHdBaixo = hdNt.y;
        float hdLs = length(hdNt.xz); vec2 hdE = hdLs > 0.04 ? hdNt.xz / hdLs : vec2(0.0, 1.0);
        vec2 hdUv = (abs(hdNt.y) > 0.5 ? vec2(dot(hdW.xz, vec2(-hdE.y, hdE.x)), dot(hdW.xz, hdE) / max(abs(hdNt.y), 0.3)) : (abs(hdNt.x) > abs(hdNt.z) ? hdW.zy : hdW.xy)) / ${telha.toFixed(3)};
        #ifdef USE_MAP
          vMapUv = hdUv;
        #endif
        #ifdef USE_NORMALMAP
          vNormalMapUv = hdUv;
        #endif
      }`); };
    m.customProgramCacheKey = () => `sertao-hd-telha2-${telha}`; m.needsUpdate = true; }
  for (const nome of [...(telha ? [] : ['oeste-roof-real']), 'oeste-hay-real', 'oeste-cactus-real'])
    for (const m of porMapa.get(nome) || []) { guarda(m); m.bumpMap = null; m.normalMap = relevoDeCor(m.map, madeira); m.normalScale.set(1, 1); m.needsUpdate = true; }
  for (const m of porMapa.get('oeste-sand-real') || []) { guarda(m);
    // Plano de 1200 m: 300 repetições = 4 m; com 2,2 m o pedrisco virava chiado visto da praça.
    m.normalMap = pbrTex('hd_sertao/dry_ground_rocks_normal', false, chao); m.normalScale.set(.52, .52); m.roughnessMap = null; m.roughness = 1;
    // Chão medido claro e lavado contra a arte (L 137, S 0,27 contra L 85, S 0,49): desce meio caminho.
    m.color.setRGB(.95, .79, .72); m.needsUpdate = true; }
  return () => { for (const s of antes) { Object.assign(s.m, { map: s.map, bumpMap: s.bumpMap, normalMap: s.normalMap, roughnessMap: s.roughnessMap,
    roughness: s.roughness, onBeforeCompile: s.obc, customProgramCacheKey: s.key }); s.m.color.copy(s.cor); s.m.normalScale.set(s.ns, s.ns); delete s.m.userData.hdLaje; s.m.needsUpdate = true; } };
}

// Só vale para caixa sem subdivisão: em todo vértice |position| é meia dimensão, e a dimensão
// da face sai do próprio atributo. Barril e tronco seguem no material original.
function madeiraHD(scene, { metros = 1.3, relevo = 3.4 } = {}) {
  const TINTAS = { '3b2115': 0x6a4a36, 'd9b17a': 0xa88f72 };
  const clones = new Map(), trocas = [];
  const cloneDe = (m) => {
    if (clones.has(m)) return clones.get(m);
    const c = m.clone();
    c.map = pbrTex('hd_sertao/old_planks_02_cor', true); c.bumpMap = null; c.normalMap = pbrTex('hd_sertao/old_planks_02_normal'); c.normalScale.set(relevo, relevo);
    const tinta = TINTAS[m.color.getHexString()]; if (tinta) c.color.setHex(tinta);
    // Tábua CC0 é mais escura que a madeira autoral: o ganho devolve a média de cor de cada peça.
    c.color.setRGB(c.color.r * 2.1, c.color.g * 1.9, c.color.b * 1.65);
    c.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
        {
          vec3 hdS = vec3(1.0);
          #ifdef USE_INSTANCING
            hdS = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
          #endif
          vec3 hdP = position * hdS, hdDim = 2.0 * abs(hdP), hdAn = abs(normal);
          vec2 hdA = hdAn.x > 0.5 ? hdP.zy : (hdAn.y > 0.5 ? hdP.xz : hdP.xy);
          vec2 hdD = hdAn.x > 0.5 ? hdDim.zy : (hdAn.y > 0.5 ? hdDim.xz : hdDim.xy);
          vec2 hdUv = (hdD.x >= hdD.y ? hdA.yx : hdA) / ${metros.toFixed(3)};
          #ifdef USE_MAP
            vMapUv = hdUv;
          #endif
          #ifdef USE_NORMALMAP
            vNormalMapUv = hdUv;
          #endif
        }`);
    };
    c.customProgramCacheKey = () => `sertao-hd-madeira2-${metros}`;
    clones.set(m, c); return c;
  };
  scene.traverse((o) => {
    if (!o.isMesh || o.geometry?.type !== 'BoxGeometry' || Array.isArray(o.material)) return;
    const m = o.material, p = o.geometry.parameters;
    if (!m?.isMeshStandardMaterial || !/^oeste-wood(-pale)?-real$/.test(m.map?.name || '')) return;
    if ((p.widthSegments || 1) > 1 || (p.heightSegments || 1) > 1 || (p.depthSegments || 1) > 1) return;
    trocas.push({ o, m }); o.material = cloneDe(m);
  });
  return () => { for (const { o, m } of trocas) o.material = m; for (const c of clones.values()) c.dispose(); };
}

let matPedraBase = null;
function pedraDeBase(scene) {
  let pronto = null; scene?.traverse((o) => { if (!pronto && o.isInstancedMesh && !o.instanceColor) { const m = materiaisDe(o)[0]; if (m?.map?.name === 'hd-cobblestone_floor_01_color') pronto = m; } });
  if (pronto) return pronto;
  if (matPedraBase) return matPedraBase;
  matPedraBase = new THREE.MeshStandardMaterial({ color: 0xf2e8d8, map: pbrTex('cobblestone_floor_01_color', true), normalMap: pbrTex('cobblestone_floor_01_normal'),
    roughnessMap: pbrTex('cobblestone_floor_01_rough'), roughness: 1, normalScale: new THREE.Vector2(1.6, 1.6), name: 'hd-embasamento' });
  projetaMundo(matPedraBase, 1.6);
  return matPedraBase;
}

// Embasamento de pedra: cada trecho de parede que toca o chão ganha uma sapata saliente com
// capa. Vão de porta não tem parede no chão, então a sapata se interrompe sozinha.
function embasamentoHD(scene) {
  const M = new THREE.Matrix4(), L = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pecas = [];
  scene.traverse((root) => {
    if (!root.userData?.interior) return;
    root.traverse((c) => {
      const g = c.geometry?.parameters;
      if (!c.isInstancedMesh || !g?.width || !/adobe|paupique/.test(materiaisDe(c)[0]?.map?.name || '')) return;
      c.updateWorldMatrix(true, false);
      for (let i = 0; i < c.count; i++) { c.getMatrixAt(i, M); M.decompose(p, q, s);
        if (p.y - s.y * g.height / 2 > .3) continue;
        pecas.push({ mundo: c.matrixWorld.clone(), x: p.x, z: p.z, w: s.x * g.width, d: s.z * g.depth, q: q.clone() }); }
    });
    // Soleira de pedra na porta da frente: laje de 9 cm, fora do colisor e abaixo do degrau de passo.
    if (/^sertao-(casa-|praca-casa-)/.test(root.name)) { const pl = root.userData.interior, fr = /praca-casa/.test(root.name) ? -1 : 1; root.updateWorldMatrix(true, false);
      pecas.push({ mundo: root.matrixWorld.clone(), x: 0, z: fr * (pl.halfD + .22), w: 2.15, d: .62, q: new THREE.Quaternion(), h: .09 }); }
  });
  // Casa maciça (caixa única): sapata em tiras nos quatro lados, com o vão da porta livre na frente (+z local).
  scene.traverse((o) => { const g = o.geometry?.parameters;
    if (!o.isMesh || o.isInstancedMesh || !/^parede-casa-\d+$/.test(o.name) || !(g?.width > 2.5) || o.material?.map?.name !== 'oeste-adobe-paupique') return;
    o.updateWorldMatrix(true, false); const mundo = o.matrixWorld.clone(), y0 = -g.height / 2 - .15, tira = (x, z, w, d) => pecas.push({ mundo, x, z, w, d, q: new THREE.Quaternion(), y0 });
    pecas.push({ mundo, x: 0, z: g.depth / 2 + .32, w: 1.5, d: .52, q: new THREE.Quaternion(), y0, h: .1 });
    tira(0, -g.depth / 2, g.width, .02); for (const sx of [-1, 1]) { tira(sx * g.width / 2, 0, .02, g.depth); tira(sx * (g.width / 4 + .46), g.depth / 2, g.width / 2 - .92, .02); } });
  if (!pecas.length) return () => {};
  const lote = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), pedraDeBase(scene), pecas.length); let k = 0;
  for (const c of pecas) { const h = c.h ?? .4, y = h / 2, folga = c.h ? 0 : .18, quina = c.h ? 0 : folga + .2, emX = c.w >= c.d;
    L.compose(p.set(c.x, y + (c.y0 || 0), c.z), c.q, s.set(c.w + (emX ? quina : folga), h, c.d + (emX ? folga : quina))); lote.setMatrixAt(k++, M.multiplyMatrices(c.mundo, L)); }
  lote.instanceMatrix.needsUpdate = true; lote.computeBoundingSphere(); lote.receiveShadow = true; lote.name = 'sertao-hd-embasamento'; scene.add(lote);
  return () => { scene.remove(lote); lote.geometry.dispose(); };
}

// Cunhal abaulado: meia-coluna de reboco que sai até 8 cm da quina e alarga no pé. Tira a aresta de caixa.
function quinasHD(scene) {
  const pontos = [], v = new THREE.Vector3(); let mat = null;
  scene.traverse((o) => {
    const pl = o.userData?.interior, g = o.geometry?.parameters;
    if (pl && /^sertao-(casa-|praca-casa-)/.test(o.name)) { o.updateWorldMatrix(true, false);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) pontos.push([v.set(sx * (pl.halfW + .02), .42, sz * (pl.halfD + .02)).applyMatrix4(o.matrixWorld).clone(), 2.95]); }
    else if (o.isMesh && !o.isInstancedMesh && /^parede-casa-\d+$/.test(o.name) && g?.width > 2.5 && g?.depth > 2.5 && o.material?.map?.name === 'oeste-adobe-paupique') { o.updateWorldMatrix(true, false); mat ||= o.material;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) pontos.push([v.set(sx * (g.width / 2 - .11), -g.height / 2 + .27, sz * (g.depth / 2 - .11)).applyMatrix4(o.matrixWorld).clone(), g.height - .17]); }
  });
  if (!pontos.length || !mat) return () => {};
  const geo = new THREE.CylinderGeometry(.17, .21, 1, 8, 1, true), lote = new THREE.InstancedMesh(geo, mat, pontos.length), o3 = new THREE.Object3D();
  pontos.forEach(([p, h], i) => { o3.position.set(p.x, p.y + h / 2, p.z); o3.scale.set(1, h, 1); o3.rotation.y = i * .7; o3.updateMatrix(); lote.setMatrixAt(i, o3.matrix); });
  lote.instanceMatrix.needsUpdate = true; lote.computeBoundingSphere(); lote.receiveShadow = true; lote.name = 'sertao-hd-quinas'; lote.userData.nonCollider = true; scene.add(lote);
  return () => { scene.remove(lote); geo.dispose(); };
}

// Esteio: a caixa de 16 cm vira tronco de 8 lados sobre uma pedra de apoio.
function esteiosHD(scene) {
  const M = new THREE.Matrix4(), L = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), itens = [];
  let mapaMadeira = null;
  scene.traverse((o) => { if (!mapaMadeira && o.isMesh) { const m = materiaisDe(o)[0]; if (/oeste-wood-real$/.test(m?.map?.name || '')) mapaMadeira = m.map; }
    const bp = o.userData?.boxParts; if (bp) for (const [chave, v] of Object.entries(bp)) if (/esteio/.test(chave) && v?.mesh?.isInstancedMesh) itens.push(v); });
  if (!itens.length || !mapaMadeira) return () => {};
  const mapa = mapaMadeira.clone(); mapa.rotation = Math.PI / 2; mapa.repeat.set(2.2, .5); mapa.needsUpdate = true;
  const relevo = relevoDeCor(mapa, 2.4); relevo.rotation = Math.PI / 2;
  const mat = new THREE.MeshStandardMaterial({ color: 0x6a4a36, map: mapa, normalMap: relevo, normalScale: new THREE.Vector2(2.6, 2.6), roughness: .9, name: 'hd-esteio' });
  const troncos = new THREE.InstancedMesh(new THREE.CylinderGeometry(.075, .095, 1, 8), mat, itens.length);
  const pes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), pedraDeBase(scene), itens.length), antes = [];
  itens.forEach(({ mesh, index }, i) => {
    const g = mesh.geometry.parameters; mesh.getMatrixAt(index, M); antes.push([mesh, index, M.clone()]); M.decompose(p, q, s);
    const h = s.y * g.height; mesh.updateWorldMatrix(true, false);
    L.compose(p, q, s.set(1, h, 1)); troncos.setMatrixAt(i, L.premultiply(mesh.matrixWorld));
    L.compose(p.set(p.x, p.y - h / 2 + .08, p.z), q, s.set(.30, .16, .30)); pes.setMatrixAt(i, L.premultiply(mesh.matrixWorld));
    M.decompose(p, q, s); mesh.setMatrixAt(index, L.compose(p, q, s.set(0, 0, 0))); mesh.instanceMatrix.needsUpdate = true;
  });
  for (const lote of [troncos, pes]) { lote.instanceMatrix.needsUpdate = true; lote.computeBoundingSphere(); lote.receiveShadow = true; scene.add(lote); }
  troncos.castShadow = true; troncos.name = 'sertao-hd-esteios';
  return () => { for (const [mesh, index, m] of antes) { mesh.setMatrixAt(index, m); mesh.instanceMatrix.needsUpdate = true; }
    scene.remove(troncos); scene.remove(pes); troncos.geometry.dispose(); pes.geometry.dispose(); mat.dispose(); mapa.dispose(); };
}

// Telha capa: meia-cana afunilada, eixo em z, barriga em +y. 3 gomos = 6 triângulos.
let geoTelha = null;
function telhaGeo() {
  if (geoTelha) return geoTelha;
  const S = 3, len = .48, r1 = .09, r2 = .112, pos = [], nor = [], uv = [], idx = [];
  for (let e = 0; e < 2; e++) {
    const z = e ? len / 2 : -len / 2, r = e ? r2 : r1;
    for (let i = 0; i <= S; i++) { const a = Math.PI * i / S; pos.push(Math.cos(a) * r, Math.sin(a) * r, z); nor.push(Math.cos(a), Math.sin(a), 0); uv.push(i / S, e); }
  }
  for (let i = 0; i < S; i++) idx.push(i, S + 1 + i, i + 1, i + 1, S + 1 + i, S + 2 + i);
  geoTelha = new THREE.BufferGeometry();
  geoTelha.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geoTelha.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geoTelha.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geoTelha.setIndex(idx);
  return geoTelha;
}

function rngDe(semente) { let s = semente; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

function telhadoCasaLaje(root, semente) {
  const M0 = new THREE.Matrix4(), p0 = new THREE.Vector3(), q0 = new THREE.Quaternion(), s0 = new THREE.Vector3();
  const rnd = rngDe(semente);
  const kit = new THREE.Group(); kit.name = 'sertao-hd-kit'; root.add(kit);
  // baseHD troca o mapa da laje antes: a marca hdLaje mantém a laje reconhecível.
  const lajes = []; root.traverse((o) => { const m = o.isMesh && materiaisDe(o)[0]; if (m && (m.map?.name === 'oeste-roof-real' || m.userData.hdLaje)) lajes.push(o); });
  lajes.forEach((o) => { o.visible = false; });
  // Testeira e cornija da platibanda atravessariam as águas do telhado: saem enquanto o kit estiver ligado.
  const ocultas = [], zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (const [chave, v] of Object.entries(root.userData.boxParts || {})) if (/platibanda-testeira$|cornija$/.test(chave) && v?.mesh?.isInstancedMesh) {
    const m0 = new THREE.Matrix4(); v.mesh.getMatrixAt(v.index, m0); ocultas.push([v, m0]); v.mesh.setMatrixAt(v.index, zero); v.mesh.instanceMatrix.needsUpdate = true; }
  let madeira = null, parede = null;
  root.traverse((o) => { if (!o.isMesh) return; const m = materiaisDe(o)[0];
    if (!madeira && /oeste-wood-real$/.test(m?.map?.name || '') && o.geometry?.type === 'BoxGeometry') madeira = m;
    if (!parede && o.isInstancedMesh && /adobe|paupique/.test(m?.map?.name || '')) parede = m; });
  madeira ||= new THREE.MeshStandardMaterial({ color: 0x3b2115, roughness: 1 });
  // Medidas saem da própria casa: laje de telhado (instância mais alta) e planta em userData.interior.
  let laje = null;
  for (const o of lajes) if (o.isInstancedMesh) for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, M0); M0.decompose(p0, q0, s0);
    const g = o.geometry.parameters; if (!laje || p0.y > laje.y) laje = { y: p0.y, w: s0.x * g.width, h: s0.y * g.height }; }
  const planta = root.userData.interior || { halfW: 3.6, halfD: 3.2 };
  const xParede = planta.halfW, D = planta.halfD + .14, beiral = .62, y0 = (laje ? laje.y - laje.h / 2 : 3.45), W = (laje ? laje.w : 7.7) + .4, H = D * .374;
  const th = Math.atan(H / D), cume = y0 + H, Ls = (D + beiral) / Math.cos(th), px = .25, ex = .41;
  const cols = Math.floor(W / px), rows = Math.ceil(Ls / ex);
  const matTelha = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .88, side: THREE.DoubleSide,
    normalMap: pbrTex('paintedplaster017_normal', false, .35), normalScale: new THREE.Vector2(1.7, 1.7) });
  const matFundo = new THREE.MeshStandardMaterial({ color: 0x6b3d2a, roughness: 1 });
  const capas = new THREE.InstancedMesh(telhaGeo(), matTelha, cols * rows * 2 + Math.ceil(W / .36));
  // Duas águas numa chamada só por peça (forro, caibros, oitões): o kit custa 4 draw calls por casa, não 7.
  const nc = Math.floor(W / .58), o3 = new THREE.Object3D();
  const forro = new THREE.InstancedMesh(new THREE.BoxGeometry(W - .04, .05, Ls), matFundo, 2), caibros = new THREE.InstancedMesh(new THREE.BoxGeometry(.07, .1, Ls + .06), madeira, (nc + 1) * 2);
  const M = new THREE.Matrix4(), R = new THREE.Matrix4(), cor = new THREE.Color(), eul = new THREE.Euler(), pecas = [];
  const tinta = () => { const v = .72 + rnd() * .3, w = rnd();
    if (w < .07) cor.setRGB(.20 * v, .13 * v, .10 * v); else if (w < .16) cor.setRGB(.46 * v, .26 * v, .17 * v); else cor.setRGB(.36 * v, .17 * v, .10 * v); };
  for (const s of [1, -1]) {
    const d = new THREE.Vector3(0, -Math.sin(th), s * Math.cos(th)), n = new THREE.Vector3(0, Math.cos(th), s * Math.sin(th)), X = new THREE.Vector3(s, 0, 0);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      // Beiral ondulado: a fiada cede mais perto da ponta (ripa empenada), nunca uma régua.
      const cede = (Math.sin(c * .43 + semente) * .022 + Math.sin(c * 1.9 + semente * .7) * .008) * (r / rows);
      const p = new THREE.Vector3((c + .5) * px - W / 2, cume, 0).addScaledVector(d, Math.min(r * ex + .25, Ls - .21) + cede * 1.5).addScaledVector(n, .05 + cede);
      M.makeBasis(X, n, d); R.makeRotationFromEuler(eul.set(-.06 + (rnd() - .5) * .03, (rnd() - .5) * .05, (rnd() - .5) * .06));
      M.multiply(R).setPosition(p); tinta(); pecas.push([M.clone(), cor.clone(), r >= rows - 2]);
    }
    const lado = s > 0 ? 0 : 1; o3.rotation.set(s * th, 0, 0);
    o3.position.set(0, cume - Math.sin(th) * Ls / 2 + .005, s * Math.cos(th) * Ls / 2); o3.updateMatrix(); forro.setMatrixAt(lado, o3.matrix);
    for (let i = 0; i <= nc; i++) { o3.position.set(-W / 2 + .08 + i * ((W - .16) / nc), cume - Math.sin(th) * Ls / 2 - .08, s * Math.cos(th) * Ls / 2); o3.updateMatrix(); caibros.setMatrixAt(lado * (nc + 1) + i, o3.matrix); }
  }
  forro.castShadow = true; forro.receiveShadow = true; forro.frustumCulled = false; caibros.frustumCulled = false; kit.add(forro, caibros);
  for (let i = 0; i < Math.ceil(W / .36); i++) {
    M.makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0));
    R.makeRotationFromEuler(eul.set(-.05, (rnd() - .5) * .04, (rnd() - .5) * .05)); M.multiply(R).scale(new THREE.Vector3(1.5, 1.35, 1));
    M.setPosition(-W / 2 + .23 + i * .36, cume + .06, 0); tinta(); pecas.push([M.clone(), cor.clone(), true]);
  }
  // De longe só a fiada do beiral e a cumeeira são telha de verdade; o resto vira a textura de telha no forro.
  pecas.sort((a, b) => b[2] - a[2]).forEach(([m, c], i) => { capas.setMatrixAt(i, m); capas.setColorAt(i, c); });
  const k = pecas.length, kLonge = pecas.filter((q) => q[2]).length, centro = root.getWorldPosition(new THREE.Vector3()), olho = new THREE.Vector3();
  const matLonge = lajes.map((o) => materiaisDe(o)[0]).find((m) => m?.userData.hdLaje) || null;
  forro.onBeforeRender = (r, sc, cam) => { const perto = olho.setFromMatrixPosition(cam.matrixWorld).distanceToSquared(centro) < 324;
    capas.count = perto ? k : kLonge; if (matLonge) forro.material = perto ? matFundo : matLonge; };
  capas.count = k; capas.instanceMatrix.needsUpdate = true; capas.instanceColor.needsUpdate = true;
  capas.receiveShadow = true; capas.computeBoundingSphere(); capas.name = 'sertao-hd-telhas'; kit.add(capas);
  if (parede) { const G = new THREE.BufferGeometry(), P = [], N = [];
    for (const sx of [1, -1]) { const x = sx * xParede;
      P.push(x - .14, y0, -D, x - .14, y0, D, x - .14, cume - .02, 0, x + .14, y0, -D, x + .14, y0, D, x + .14, cume - .02, 0); N.push(-1, 0, 0, -1, 0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0); }
    G.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); G.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    G.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(24).fill(0), 2)); G.setIndex([0, 1, 2, 3, 5, 4, 6, 7, 8, 9, 11, 10]);
    const oitao = new THREE.Mesh(G, parede); oitao.receiveShadow = true; kit.add(oitao);
  }
  return () => { root.remove(kit); kit.traverse((o) => { if (o.geometry && o.geometry !== geoTelha) o.geometry.dispose(); }); matTelha.dispose(); matFundo.dispose();
    lajes.forEach((o) => { o.visible = true; }); for (const [v, m0] of ocultas) { v.mesh.setMatrixAt(v.index, m0); v.mesh.instanceMatrix.needsUpdate = true; } };
}

// Casa maciça tem o telhado em placa: uma fiada de telha de verdade na borda baixa quebra a aresta reta.
function beiraisHD(scene) {
  const itens = [], v = new THREE.Vector3(), c = new THREE.Vector3(), rnd = rngDe(911);
  scene.traverse((root) => { if (!/^sertao-casa-paupique-\d+$/.test(root.name)) return;
    root.traverse((o) => { const g = o.geometry?.parameters, m = o.isMesh && !o.isInstancedMesh && materiaisDe(o)[0];
      if (!m || o.geometry.type !== 'BoxGeometry' || !(m.userData.hdLaje || m.map?.name === 'oeste-roof-real') || g.height > .3 || g.width * g.depth < 2) return;
      o.updateWorldMatrix(true, false); const yc = c.set(0, g.height / 2, 0).applyMatrix4(o.matrixWorld).y;
      for (const [ex, ez, comp] of [[1, 0, g.depth], [-1, 0, g.depth], [0, 1, g.width], [0, -1, g.width]])
        if (v.set(ex * g.width / 2, g.height / 2, ez * g.depth / 2).applyMatrix4(o.matrixWorld).y < yc - .08) itens.push({ o, ex, ez, n: Math.floor(comp / .25), g }); }); });
  if (!itens.length) return () => {};
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .88, side: THREE.DoubleSide, normalMap: pbrTex('paintedplaster017_normal', false, .35), normalScale: new THREE.Vector2(1.1, 1.1) });
  const lote = new THREE.InstancedMesh(telhaGeo(), mat, itens.reduce((a, i) => a + i.n, 0)), M = new THREE.Matrix4(), R = new THREE.Matrix4(), eul = new THREE.Euler(), cor = new THREE.Color(), Y = new THREE.Vector3(0, 1, 0); let k = 0;
  for (const { o, ex, ez, n, g } of itens) { const Z = new THREE.Vector3(ex, 0, ez), X = new THREE.Vector3().crossVectors(Y, Z);
    for (let i = 0; i < n; i++) { const ao = (i + .5 - n / 2) * .25;
      M.makeBasis(X, Y, Z); R.makeRotationFromEuler(eul.set(-.05 + (rnd() - .5) * .07, (rnd() - .5) * .09, (rnd() - .5) * .09));
      M.multiply(R).setPosition(ex ? ex * (g.width / 2 - .13) : ao, g.height / 2 + .03 + rnd() * .018, ez ? ez * (g.depth / 2 - .13) : ao).premultiply(o.matrixWorld);
      const t = .72 + rnd() * .3, w = rnd(); lote.setMatrixAt(k, M); lote.setColorAt(k++, w < .12 ? cor.setRGB(.46 * t, .26 * t, .17 * t) : cor.setRGB(.36 * t, .17 * t, .10 * t)); } }
  lote.instanceMatrix.needsUpdate = true; lote.instanceColor.needsUpdate = true; lote.computeBoundingSphere(); lote.receiveShadow = true; lote.name = 'sertao-hd-beirais'; lote.userData.nonCollider = true; scene.add(lote);
  return () => { scene.remove(lote); mat.dispose(); };
}

// Céu em gradiente + halo do sol virando ambiente por imagem: dá direção à luz indireta
// (frio de cima, quente do chão) e deixa relevo e rugosidade aparecerem na sombra.
export function ambienteDoCeu(renderer, sol, { zenite = 0x7f9cc4, horizonte = 0xf3c79a, chao = 0xa9825a, halo = 1, ganho = 1 } = {}) {
  const cena = new THREE.Scene(), geo = new THREE.SphereGeometry(50, 32, 16);
  const mat = new THREE.ShaderMaterial({ side: THREE.BackSide,
    uniforms: { uZ: { value: new THREE.Color(zenite) }, uH: { value: new THREE.Color(horizonte) }, uC: { value: new THREE.Color(chao) },
      uSol: { value: sol.clone().normalize() }, uHalo: { value: halo }, uGanho: { value: ganho } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vDir; uniform vec3 uZ, uH, uC, uSol; uniform float uHalo, uGanho;
      void main(){ vec3 dir = normalize(vDir); float y = dir.y;
        vec3 c = y > 0.0 ? mix(uH, uZ, pow(y, 0.55)) : mix(uH, uC, pow(-y, 0.35));
        float s = max(dot(dir, uSol), 0.0); c += vec3(1.0, 0.78, 0.52) * uHalo * (pow(s, 6.0) * 0.9 + pow(s, 60.0) * 5.0);
        gl_FragColor = vec4(c * uGanho, 1.0); }` });
  cena.add(new THREE.Mesh(geo, mat));
  const pmrem = new THREE.PMREMGenerator(renderer), rt = pmrem.fromScene(cena, 0.02);
  pmrem.dispose(); geo.dispose(); mat.dispose();
  return rt;
}

// Cúpula de céu: gradiente por direção, halo do sol e nuvens em ruído. Só pinta pixel de céu.
export function ceuHD(scene, sol, { zenite = 0x23407e, horizonte = null, solCor = 0x8a5a34, nuvem = 0xd9c2b0, nuvemSombra = 0x5a5f78, cobertura = .5, raio = 100, ganho = 1, curva = .8, morro = null } = {}) {
  // O horizonte usa a cor da névoa do mapa: o relevo distante some nela, e céu de outra cor vira faixa.
  horizonte ??= scene.fog?.color?.getHex() ?? 0xd7a477;
  const mat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uZ: { value: new THREE.Color(zenite) }, uH: { value: new THREE.Color(horizonte) }, uSolCor: { value: new THREE.Color(solCor) },
      uNuvem: { value: new THREE.Color(nuvem) }, uNuvemSombra: { value: new THREE.Color(nuvemSombra) }, uSol: { value: sol.clone().normalize() },
      uCobertura: { value: cobertura }, uGanho: { value: ganho }, uCurva: { value: curva },
      uMorro: { value: new THREE.Color(morro?.cor ?? 0x808080) }, uMorroAlt: { value: morro?.altura ?? 0 }, uCasas: { value: morro?.casas ? 1 : 0 } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vDir; uniform vec3 uZ, uH, uSolCor, uNuvem, uNuvemSombra, uSol; uniform vec3 uMorro; uniform float uCobertura, uGanho, uCurva, uMorroAlt, uCasas;${RUIDO_GLSL}
      float hdFbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * hdN(p); p = p * 2.03 + 17.0; a *= 0.5; } return s; }
      void main(){ vec3 d = normalize(vDir); float y = max(d.y, 0.0), s = max(dot(d, uSol), 0.0);
        vec3 c = mix(uH, uZ, pow(y, uCurva)) + uSolCor * (pow(s, 5.0) * 0.5 + pow(s, 90.0) * 2.5);
        float f = hdFbm(d.xz / (d.y + 0.16) * 1.15);
        float n = smoothstep(1.0 - uCobertura, 1.0 - uCobertura + 0.22, f) * smoothstep(0.02, 0.2, d.y);
        vec3 nu = mix(uNuvemSombra, uNuvem, clamp(0.3 + 0.7 * pow(s, 2.0) + (f - 0.55) * 1.4, 0.0, 1.0));
        c = mix(c, nu, n * 0.85);
        // Relevo no horizonte (morro com casario no Lajes, serra no Sertão): duas cristas, a de trás mais na névoa.
        if (uMorroAlt > 0.0) { vec2 cz = normalize(d.xz + 1e-5);
          float h2 = uMorroAlt * 1.5 * (0.3 + 0.7 * hdFbm(cz * 1.4 + 11.0));
          c = mix(c, mix(uH, uMorro, 0.84), smoothstep(h2, h2 - 0.006, d.y));
          float h1 = uMorroAlt * (0.25 + 0.75 * hdFbm(cz * 2.3 + 5.0)) + uMorroAlt * 0.12 * hdN(cz * 9.0);
          vec3 mc = mix(uH, uMorro * 0.8, 0.8 + 0.18 * smoothstep(0.0, h1, d.y));
          if (uCasas > 0.5) { vec2 g = vec2(atan(d.z, d.x) * 70.0, d.y * 110.0), id = floor(g);
            float casa = step(0.4, hdH(id)) * step(0.18, fract(g.x)) * step(0.25, fract(g.y));
            mc = mix(mc, mix(uMorro * 1.9, vec3(0.62, 0.36, 0.26), hdH(id + 7.0)), casa * 0.7) * (0.8 + 0.4 * hdN(g * 0.11)); }
          c = mix(c, mc, smoothstep(h1, h1 - 0.005, d.y)); }
        if (d.y < 0.0) c = uH * 0.9;
        gl_FragColor = vec4(c * uGanho, 1.0); }` });
  const cupula = new THREE.Mesh(new THREE.SphereGeometry(raio, 32, 16), mat);
  cupula.name = 'hd-ceu'; cupula.renderOrder = -1000; cupula.frustumCulled = false; cupula.castShadow = false;
  cupula.onBeforeRender = (r, sc, camera) => { cupula.position.copy(camera.position); cupula.scale.setScalar(camera.far * .9 / raio); cupula.updateMatrixWorld(); };
  // Mapa que já tem cúpula própria (Lajes) a desenharia por cima da nova: fica oculta enquanto o kit estiver ligado.
  const ocultas = []; scene.traverse((o) => { if (o.isMesh && /SKY_DOME/i.test(o.name) && o.visible) { o.visible = false; ocultas.push(o); } });
  scene.add(cupula);
  return () => { scene.remove(cupula); cupula.geometry.dispose(); mat.dispose(); for (const o of ocultas) o.visible = true; };
}

export function luzHD(scene, renderer, { hemi = .38, solGanho = 1.3, ceu = {}, cupula = null, solDir = null, solCor = null, ambiente = true, rebote = null } = {}) {
  let sol = null, hemisferio = null;
  scene.traverse((o) => { if (o.isDirectionalLight && o.castShadow) sol = o; if (o.isHemisphereLight) hemisferio = o; });
  if (!sol || !hemisferio) return () => {};
  const antes = { env: scene.environment, hemi: hemisferio.intensity, sol: sol.intensity, cor: sol.color.getHex(), chao: hemisferio.groundColor.getHex() };
  if (solCor !== null) sol.color.set(solCor);
  if (rebote !== null) hemisferio.groundColor.set(rebote);
  // Direção do sol: o foco de sombra (bloom.js) guarda a dele em scene.userData.__sf.dir e reposiciona
  // a luz todo quadro; trocar o azimute tem de ser lá. `solDir` é opcional (decisão de arte do mapa).
  const sf = scene.userData.__sf, dir = sol.position.clone().sub(sol.target.position).normalize(), dirAntes = dir.clone();
  if (solDir) { dir.set(solDir[0], solDir[1], solDir[2]).normalize();
    sol.position.copy(sol.target.position).addScaledVector(dir, Math.max(20, sol.position.distanceTo(sol.target.position)));
    if (sf && sf.dir) sf.dir.copy(dir); }
  const rt = ambiente ? ambienteDoCeu(renderer, dir, ceu) : null;
  if (rt) scene.environment = rt.texture; hemisferio.intensity = antes.hemi * hemi; sol.intensity = antes.sol * solGanho;
  const tiraCeu = cupula ? ceuHD(scene, dir, cupula) : () => {};
  return () => { scene.environment = antes.env; hemisferio.intensity = antes.hemi; sol.intensity = antes.sol; sol.color.setHex(antes.cor); hemisferio.groundColor.setHex(antes.chao); rt?.dispose(); tiraCeu();
    if (solDir) { const f = scene.userData.__sf; if (f && f.dir) f.dir.copy(dirAntes);
      sol.position.copy(sol.target.position).addScaledVector(dirAntes, Math.max(20, sol.position.distanceTo(sol.target.position))); } };
}

// Chão do Sertão: o detalhe mora no ALBEDO (o relevo some na sombra). Variação por posição de mundo,
// sulcos de roda e terra rachada; encadeia o onBeforeCompile que o mapa já pôs (untileSertaoSoil).
function chaoHD(scene, { cor = [.6, .535, .6], sulcos = true, rachado = true, contraste = .6, detalhe = .27, dessat = .5, fino = .16 } = {}) {
  const solo = scene.getObjectByName('sertao-solo'), m = solo?.material;
  if (!m?.isMeshStandardMaterial) return () => {};
  const antes = { cor: m.color.clone(), obc: m.onBeforeCompile, key: m.customProgramCacheKey };
  m.color.setRGB(cor[0], cor[1], cor[2]);
  m.onBeforeCompile = (shader, r) => {
    antes.obc?.call(m, shader, r);
    shader.uniforms.hdSolo = { value: pbrTex('hd_sertao/dry_ground_rocks_cor', true) };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHdPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvHdPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vHdPos;\nuniform sampler2D hdSolo;${RUIDO_GLSL}
      float hdVor(vec2 p){ vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
        for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y));
          float d = length(g + vec2(hdH(i + g), hdH(i + g + 17.3)) - f); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
        return d2 - d1; }
      // Par de rodas (bitola 1,44 m): x = fundo do sulco, y = faixa larga (ombro de poeira solta).
      vec2 hdRoda(float d, float existe){ float r = abs(abs(d) - 0.72); return vec2(1.0 - smoothstep(0.07, 0.24, r), 1.0 - smoothstep(0.2, 0.62, r)) * existe; }
      vec2 hdSulcos(vec2 p0){
        // Rastro serpenteia: o plano é deformado por ruído grave antes de medir a distância ao eixo.
        vec2 p = p0 + (vec2(hdN(p0 * 0.055 + 3.0), hdN(p0 * 0.055 + 41.0)) - 0.5) * 7.5 + (vec2(hdN(p0 * 0.23 + 7.0), hdN(p0 * 0.23 + 29.0)) - 0.5) * 1.5;
        float w = (hdN(p0 * 0.9) - 0.5) * 0.24; vec2 s = vec2(0.0);
        #define HD_E(a, id) smoothstep(-0.5, 0.1, sin((a) * 0.13 + id * 2.3) + 0.6 * sin((a) * 0.31 + id) + (hdN(p0 * 0.12 + id) - 0.5) * 1.4)
        s = max(s, hdRoda(p.x + 2.6 - 2.6 * sin(p.y * 0.045 + 0.6) - 0.05 * p.y + w, HD_E(p.y, 1.5)));
        s = max(s, hdRoda(p.x - 6.4 - 1.9 * sin(p.y * 0.06 + 2.0) + 0.09 * p.y + w, HD_E(p.y, 4.5)));
        s = max(s, hdRoda(p.x + 25.5 - 2.2 * sin(p.y * 0.05) + w, HD_E(p.y, 7.5)));
        s = max(s, hdRoda(p.x - 28.0 - 1.8 * sin(p.y * 0.04 + 1.0) + w, HD_E(p.y, 10.5)));
        s = max(s, hdRoda(p.y + 1.6 - 2.4 * sin(p.x * 0.05 + 1.0) - 0.07 * p.x + w, HD_E(p.x, 13.5)));
        s = max(s, hdRoda(p.y + 33.0 - 1.5 * sin(p.x * 0.05 + 2.0) + w, HD_E(p.x, 19.5)));
        s = max(s, hdRoda(length(p - vec2(0.6, 1.0)) - 9.2 + w, smoothstep(0.3, 0.6, hdN(p0 * 0.09 + 5.0))));
        return s * smoothstep(64.0, 52.0, abs(p0.x)) * smoothstep(110.0, 80.0, abs(p0.y)); }`)
      .replace('#include <color_fragment>', `float hdAlt = 0.0;
      { vec2 hdP = vHdPos.xz; float hdL = length(vViewPosition), hdPx = fwidth(hdP.x) + fwidth(hdP.y);
        float hdLum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)), hdRef = dot(diffuse * vec3(0.32666, 0.17893, 0.0758), vec3(0.3, 0.59, 0.11));
        diffuseColor.rgb *= clamp(pow(max(hdLum, 1e-4) / hdRef, ${contraste.toFixed(3)}), 0.5, 1.9);
        float hdMa2 = hdN(hdP * 0.37 + 5.0), hdMac = hdN(hdP * 0.09) * 0.6 + hdMa2 * 0.4, hdMed = hdN(hdP * 2.9);
        diffuseColor.rgb *= mix(0.76, 1.2, hdMac) * mix(0.9, 1.1, hdMed * smoothstep(0.9, 0.2, hdPx * 2.9));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11))) * vec3(1.14, 1.04, 0.9), 0.4 * smoothstep(0.5, 0.8, hdMa2));
        // Pedrisco e torrão: mesma UV do relevo, para o albedo casar com a normal.
        #ifdef USE_NORMALMAP
          float hdT1 = dot(texture2D(hdSolo, vNormalMapUv).rgb, vec3(0.3, 0.59, 0.11)) / 0.0793;
          diffuseColor.rgb *= mix(1.0, clamp(hdT1, 0.4, 1.8), ${detalhe.toFixed(3)} * mix(0.45, 1.0, smoothstep(0.09, 0.025, hdPx)));
          float hdF3 = smoothstep(0.05, 0.012, hdPx), hdT3 = dot(texture2D(hdSolo, vNormalMapUv * 3.0 + 0.37).rgb, vec3(0.3, 0.59, 0.11)) / 0.0793;
          diffuseColor.rgb *= mix(1.0, clamp(hdT3, 0.5, 1.6), ${fino.toFixed(3)} * hdF3); hdAlt += (clamp(hdT3, 0.4, 1.7) - 1.0) * 0.007 * hdF3;
        #endif
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11))), ${dessat.toFixed(3)});
        ${sulcos ? `if (hdPx < 0.9) { vec2 hdS = hdSulcos(hdP) * smoothstep(0.9, 0.2, hdPx);
          diffuseColor.rgb *= (1.0 - 0.46 * hdS.x) * (1.0 + 0.26 * (hdS.y - hdS.x));
          hdAlt += -0.035 * hdS.x + 0.012 * (hdS.y - hdS.x); }` : ''}
        ${rachado ? `if (hdPx < 0.4) { float hdV = hdVor(hdP * 1.25 + 3.0);
          float hdR = (1.0 - smoothstep(0.012, 0.04 + hdPx * 1.25, hdV)) * smoothstep(0.25, 0.5, hdMac) * smoothstep(0.4, 0.1, hdPx);
          diffuseColor.rgb *= 1.0 - 0.42 * hdR; hdAlt -= 0.01 * hdR; }` : ''}
        hdAlt *= smoothstep(45.0, 18.0, hdL); }
      #include <color_fragment>`)
      // Sol rasante num chão com rugosidade < 1 acende um espelho no horizonte que lê como açude.
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 1.0, 0.85);')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      { vec3 hdSx = dFdx(-vViewPosition), hdSy = dFdy(-vViewPosition), hdR1 = cross(hdSy, normal), hdR2 = cross(normal, hdSx);
        float hdDet = dot(hdSx, hdR1);
        normal = normalize(abs(hdDet) * normal - sign(hdDet) * (dFdx(hdAlt) * hdR1 + dFdy(hdAlt) * hdR2) * 1.6); }`);
  };
  m.customProgramCacheKey = () => `sertao-hd-chao7-${sulcos}-${rachado}-${contraste}-${detalhe}-${dessat}-${fino}-${antes.key ? antes.key.call(m) : ''}`;
  m.needsUpdate = true;
  return () => { m.color.copy(antes.cor); m.onBeforeCompile = antes.obc; m.customProgramCacheKey = antes.key; m.needsUpdate = true; };
}

// Céu de fim de tarde do Sertão: zênite âmbar empoeirado, horizonte quente puxando para o sol,
// disco solar e duas camadas de nuvem com a borda voltada ao sol iluminada.
export function ceuTardeHD(scene, sol, { zenite = 0x7a6c70, horizonte = null, horizonteSol = 0xffb04c, solCor = 0xffa648, disco = 9, bruma = 0xf6d49a, brumaForca = .55,
  nuvem = 0xffd08a, nuvemSombra = 0x8a756a, cobertura = .51, curva = .36, ganho = .95, raio = 100, morro = null } = {}) {
  horizonte ??= scene.fog?.color?.getHex() ?? 0xd7a477;
  const mat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uZ: { value: new THREE.Color(zenite) }, uH: { value: new THREE.Color(horizonte) }, uHS: { value: new THREE.Color(horizonteSol) },
      uSolCor: { value: new THREE.Color(solCor) }, uNuvem: { value: new THREE.Color(nuvem) }, uNuvemSombra: { value: new THREE.Color(nuvemSombra) },
      uSol: { value: sol.clone().normalize() }, uCob: { value: cobertura }, uCurva: { value: curva }, uGanho: { value: ganho }, uDisco: { value: disco },
      uMorro: { value: new THREE.Color(morro?.cor ?? 0x808080) }, uMorroAlt: { value: morro?.altura ?? 0 }, uBruma: { value: new THREE.Color(bruma) }, uBrumaF: { value: brumaForca } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vDir; uniform vec3 uZ, uH, uHS, uSolCor, uNuvem, uNuvemSombra, uSol, uMorro, uBruma; uniform float uCob, uCurva, uGanho, uDisco, uMorroAlt, uBrumaF;${RUIDO_GLSL}
      float hdFbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * hdN(p); p = p * 2.03 + 17.0; a *= 0.5; } return s; }
      float hdFbm2(vec2 p){ return 0.5 * hdN(p) + 0.25 * hdN(p * 2.03 + 17.0); }
      void main(){ vec3 d = normalize(vDir); float y = max(d.y, 0.0), s = max(dot(d, uSol), 0.0);
        vec2 az = normalize(d.xz + 1e-5), azSol = normalize(uSol.xz);
        float lado = pow(max(dot(az, azSol), 0.0), 2.5);
        vec3 hz = mix(uH, uHS, lado * 0.85);
        vec3 c = mix(hz, uZ, smoothstep(0.0, uCurva, y) * (0.82 + 0.18 * smoothstep(uCurva, 0.9, y)));
        c += uSolCor * (pow(s, 3.0) * 0.16 + pow(s, 7.0) * 0.34 + pow(s, 40.0) * 0.9 + pow(s, 600.0) * 2.5) + vec3(1.0, 0.9, 0.72) * uDisco * smoothstep(0.99975, 0.99990, dot(d, uSol));
        vec2 q1 = d.xz / (d.y + 0.3) * 2.2, q2 = d.xz / (d.y + 0.42) * 2.4, lz = azSol * 0.2;
        vec2 k1 = vec2(0.8, 1.2); mat2 r1 = mat2(0.83, -0.56, 0.56, 0.83), r2 = mat2(0.6, 0.8, -0.8, 0.6); q1 = r1 * q1; q1 += (vec2(hdN(q1 * 0.4 + 9.0), hdN(q1 * 0.4 + 23.0)) - 0.5) * 1.1; q2 = r2 * q2 * vec2(0.7, 1.2);
        vec2 lz1 = r1 * lz, lz2 = r2 * lz * vec2(0.7, 1.2);
        float f1 = hdFbm(q1 * k1 + 3.0), f2 = hdFbm(q2 * 2.3 + 40.0);
        float e1 = 1.0 - uCob, n1 = smoothstep(e1, e1 + 0.07, f1) * smoothstep(0.03, 0.12, d.y), m1 = smoothstep(e1 + 0.02, e1 + 0.17, f1);
        float n2 = smoothstep(e1 + 0.07, e1 + 0.2, f2) * smoothstep(0.1, 0.32, d.y) * 0.6;
        // Borda acesa: só as duas oitavas graves decidem o lado do sol; a camada alta acende pela borda rala.
        float b1 = clamp((hdFbm2(q1 * k1 + 3.0) - hdFbm2((q1 + lz1) * k1 + 3.0)) * 7.0, 0.0, 1.0), b2 = clamp((hdFbm2(q2 * 2.3 + 40.0) - hdFbm2((q2 + lz2) * 2.3 + 40.0)) * 6.0, 0.0, 1.0);
        vec3 quente = mix(uNuvem, uNuvem * vec3(1.25, 0.9, 0.5), lado) * (1.0 + 0.5 * pow(s, 4.0));
        vec3 c1 = mix(uNuvemSombra * (0.95 + 0.3 * y), quente, clamp(b1 * 0.7 + 1.0 - m1 * 0.93, 0.0, 1.0));
        vec3 c2 = mix(uNuvemSombra * 1.15, quente, clamp(0.35 + b2 * 0.7 + pow(s, 3.0) * 0.4, 0.0, 1.0));
        c = mix(c, c2, n2 * 0.7); c = mix(c, c1, n1 * 0.92);
        if (uMorroAlt > 0.0) { float h1 = uMorroAlt * (0.25 + 0.75 * hdFbm(az * 2.3 + 5.0)) + uMorroAlt * 0.12 * hdN(az * 9.0);
          c = mix(c, mix(uH, uMorro * 0.8, 0.85), smoothstep(h1, h1 - 0.005, d.y)); }
        // Poeira dourada rente ao horizonte, mais densa contra o sol: mora no céu, sem quad nem overdraw.
        c = mix(c, uBruma, exp(-y / 0.05) * uBrumaF * (0.35 + 0.65 * lado));
        if (d.y < 0.0) c = mix(hz * 0.9, uBruma, uBrumaF * (0.35 + 0.65 * lado));
        gl_FragColor = vec4(c * uGanho, 1.0); }` });
  const cupula = new THREE.Mesh(new THREE.SphereGeometry(raio, 32, 16), mat);
  cupula.name = 'hd-ceu'; cupula.renderOrder = 1000; cupula.frustumCulled = false; cupula.castShadow = false;
  cupula.onBeforeRender = (r, sc, camera) => { cupula.position.copy(camera.position); cupula.scale.setScalar(camera.far * .9 / raio); cupula.updateMatrixWorld(); };
  const ocultas = []; scene.traverse((o) => { if (o.isMesh && /SKY_DOME/i.test(o.name) && o.visible) { o.visible = false; ocultas.push(o); } });
  scene.add(cupula);
  return () => { scene.remove(cupula); cupula.geometry.dispose(); mat.dispose(); for (const o of ocultas) o.visible = true; };
}

// Sol rasante: o foco de sombra só cobria ~37 m a montante do centro (dist da luz do mapa); com a luz
// quase horizontal isso corta sombra dentro da área de jogo. Afasta a luz e força o recálculo de near/far.
function sombraRasante(scene, dist = 52) {
  let sol = null; scene.traverse((o) => { if (o.isDirectionalLight && o.castShadow) sol = o; });
  if (!sol) return () => {};
  const dir = sol.position.clone().sub(sol.target.position), sf = scene.userData.__sf, d0 = sf && sf.dir ? sf.dist : Math.max(20, dir.length());
  if (sf && sf.dir) { sf.dist = dist; sol.shadow.camera.right = 0; } else sol.position.copy(sol.target.position).addScaledVector(dir.normalize(), dist);
  return () => { const f = scene.userData.__sf; if (f && f.dir) { f.dist = d0; sol.shadow.camera.right = 0; } };
}

// A névoa do mapa lavava o casario a 30 m; o kit rarefaz e devolve na saída.
function nevoaHD(scene, fator = .5) { const f = scene.fog; if (!f?.isFogExp2) return () => {}; const d0 = f.density; f.density = d0 * fator; return () => { f.density = d0; }; }

// Azimute girado ~13° para o norte em relação ao sol do mapa: o disco entra no quadro da praça, atrás da árvore.
const SOL_TARDE = [-.708, .29, -.684];
// O three guarda em cada material todo programa que ele já usou; trocar ambiente e shader dobrava a conta.
function soltaProgramas(scene) { const vistos = new Set();
  scene.traverse((o) => { if (o.isMesh) for (const m of materiaisDe(o)) if (m.isMeshStandardMaterial && !vistos.has(m)) { vistos.add(m); m.dispose(); } }); }
export function aplicaSertaoHD(scene, renderer, opts = {}) {
  const q = new URLSearchParams(typeof location === 'undefined' ? '' : location.search), desfaz = [];
  soltaProgramas(scene);
  const cen = q.get('hdcen') === '0' || opts.cenografia === false ? null : (opts.cenografia || {});
  if (opts.reboco !== false) desfaz.push(rebocoHD(scene, opts.reboco || {}));
  if (opts.base !== false) desfaz.push(baseHD(scene, opts.base || {}));
  if (opts.chao !== false) desfaz.push(chaoHD(scene, { sulcos: !!cen && cen.sulcos !== false, rachado: !!cen && cen.rachado !== false, ...(opts.chao || {}) }));
  if (opts.madeira !== false) desfaz.push(madeiraHD(scene, opts.madeira || {}));
  if (opts.embasamento !== false) { desfaz.push(embasamentoHD(scene)); desfaz.push(esteiosHD(scene)); }
  if (opts.quinas !== false) desfaz.push(quinasHD(scene));
  if (opts.telhado !== false) {
    const casas = ['sertao-praca-casa-interior-0', 'sertao-praca-casa-interior-1', 'sertao-casa-pedra-7', 'sertao-casa-pedra-8', 'sertao-casa-geminada-9', 'sertao-casa-platibanda-0', 'sertao-casa-platibanda-1'];
    casas.forEach((nome, i) => { const root = scene.getObjectByName(nome); if (root && (opts.platibandas !== false || !/platibanda/.test(nome))) desfaz.push(telhadoCasaLaje(root, 7 + i * 131)); });
    if (opts.beirais !== false) desfaz.push(beiraisHD(scene));
    // A placa da venda ficava na testeira da platibanda; sem ela, desce para baixo do beiral, acima da porta.
    const placa = opts.platibandas !== false && scene.getObjectByName('sertao-venda-placa');
    if (placa) { const y0 = placa.position.y, e0 = placa.scale.clone(); placa.position.y = 2.98; placa.scale.multiplyScalar(.7); desfaz.push(() => { placa.position.y = y0; placa.scale.copy(e0); }); }
  }
  const serra = !!cen && cen.serra !== false;
  if (opts.luz !== false) {
    const tarde = q.get('hdsol') !== '0' && opts.solTarde !== false, ceuNovo = opts.ceu !== false;
    desfaz.push(luzHD(scene, renderer, { hemi: .16, solGanho: 1.5, ceu: { ganho: .34, halo: .6 }, cupula: ceuNovo ? null : { morro: { cor: 0x5e3f38, altura: .16 } },
      ...(tarde ? { solDir: SOL_TARDE, solCor: 0xffc088, solGanho: 3.19, hemi: .94, ambiente: false, rebote: 0xa08468 } : {}), ...(opts.luz || {}) }));
    if (tarde) desfaz.push(sombraRasante(scene));
    if (opts.nevoa !== false) desfaz.push(nevoaHD(scene, opts.nevoa));
    if (ceuNovo) { let sol = null; scene.traverse((o) => { if (o.isDirectionalLight && o.castShadow) sol = o; });
      const dir = sol ? sol.position.clone().sub(sol.target.position).normalize() : new THREE.Vector3(...SOL_TARDE);
      desfaz.push(ceuTardeHD(scene, dir, { morro: serra ? null : { cor: 0x5e3f38, altura: .12 }, ...(opts.ceu || {}) })); }
  }
  if (cen) desfaz.push(cenografiaSertaoHD(scene, renderer, cen, { pbrTex, relevoDeCor, RUIDO_GLSL, projetaMundo }));
  return { desliga() { while (desfaz.length) desfaz.pop()(); soltaProgramas(scene); } };
}
