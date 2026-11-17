// Kit visual HD do Córrego, atrás de ?hd=1 (demo de gráficos, desligado por padrão). O mapa não nomeia materiais: cada
// regra casa por `arquivo da textura|cor` (REGRAS; a textura chega assíncrona, então o casamento repete até 20 s).
// Tudo volta em desliga(). Kill-switches: ?hdmadeira=0 ?hdchao=0 ?hdmato=0 ?hdreboco=0 ?hdcanal=0 ?hdbloco=0 ?hdjanela=0 ?hdeletro=0
// ?hdespuma=0 (espuma marrom da água) ?hdluz=0 ?hdtravessia=0 (tabuleiro de concreto + guarda tubular da travessia alta: volta a madeira)
// ?hdcen=0 (ou ?hdcen=postes,fachadas = só estes); por item em
// opts.cenografia.{postes,fachadas,lajes,telhados,canal,margem,varais,roupas,sacos,toldos,comercio,guias,skyline,portoes,becos,guarda}
// (margem=0 também deixa os tufos de capim onde estavam; postes=0 deixa os gatos autorais baixos sobre a travessia; sacos=0 deixa
// os sacos autorais redondos; guarda = tubos da rampa da travessia, só com hdtravessia). Poça/mancha úmida do chão agora é
// padrão: opts.poca === false ou ?hdpoca=0 desliga.
import * as THREE from 'three';
import { pbrTex, materiaisDe, projetaMundo, RUIDO_GLSL, GRAO_GLSL } from './map_sertao_hd.js';
import { atlasJanelas, atlasPortas } from './hd_detalhes_lajes.js';
import { cenografiaCorrego, SACOS_AUTORAIS, folgaPass } from './hd_cenografia_corrego.js';

// Só CC0 já no repositório: hd_lajes (concreto de piso 1,9 m, concreto de fôrma 1,8 m, reboco 1,7 m, chapa ondulada)
// e pbr_bricks051 (tijolo sob o reboco / grão do bloco). `*_cor_rug` leva a rugosidade no alfa. Nenhuma textura nova;
// os atlas de janela e porta são canvas de hd_detalhes_lajes.js (1024², gerados na hora e dispostos em desliga()).
const tex = (nome, srgb = true) => pbrTex(`hd_lajes/${nome}`, srgb);
const LUMA = 'vec3(0.3, 0.59, 0.11)';

// Chave = nome do arquivo do mapa de cor (ou `canvasN`) + cor do material. Origem de cada cor: map_corrego.js.
//   asphalt_br|ffffff  rua (TEX.asphalt; todo o chão de rua é este — dirt_field não chega a material nenhum)
//   tex_madeira|ffffff tábua da ponte, tapume da palafita, guarda da travessia   tex_madeira|9a8f7e tablado da travessia/pranchas
//   tex_madeira|b08a6a barraco de passagem   tex_madeira|8a6a4e matMadeiraBruta (vigas da travessia, tapume largo do puxadinho,
//   paus de tampo, pilares da prancha)   tex_madeira|7a5a3a pilares da travessia (galvanizadoHD, cor pura)   tex_zinco|ffffff telhados e barracos
//   concrete_br|8f8b80 parede e rampa do canal   concrete_br|6f6f61 fundo do canal   concrete_br|b4ada0/8d8579 embasamento,
//   lajes (o topo é o piso da laje do sobrado), platibanda   concrete_br|9d968a pilar das casas/palafita e poste de distribuição
//   concrete_br|9a8f7e entulho  concrete_br|8a867c manilha  concrete_br|ffffff pilar da cobertura  concrete_br|3f7f9c caixa d'água cúbica
//   concrete_br|2b2a27 matVao (porta 1,0 × 2,1 e janela 1,0 × 1,0 das casas)   pbr_bricks051_color|ffffff tijolo cru (último
//   pavimento, faixas do sobrado, pilha de tijolo)   canvas128|7a5a3c tambor (linhaDaguaHD, cor pura)   canvas128|d6d3cb geladeira
//   do canal (1,5 × 1,8) e caixa de energia do poste (geladeiraHD, cor pura)   canvas512|6b6350 assoreamento das pontas do canal
//   |8a6a4e matRipa (mão-francesa da palafita, mureta da prancha, guarda do sobrado, cavalete)  |7c6a52 matVerga (ferro de espera)
//   |9d968a matConcretoFino (cruzeta, verga, escada)  |252925 |3d4435 |24211f sacos de lixo
//   tex_agua_poluida|42543b alagado das pontas; |8fc4b4 |73927a |c2e0d5 lâminas de reflexo/poça/brilho do canal
//   Nota: a área do inventário de materiais é a caixa envolvente do lote mesclado (1 malha): tambor e matVao somam
//   milhares de m² sem ser chão nem muro. forma_color tem média sRGB 106 (linear 0,14) e o lote multiplica AO por vértice:
//   concreto de fôrma leva cor quase branca e AO atenuado no shader, senão pilar/faixa em sombra vira marrom-preto.
const REGRAS = {
  'asphalt_br|ffffff': { chao: true, frente: 'chao' },
  'pbr_paintedplaster017_color|*': { reboco: true, frente: 'reboco' },
  'pbr_bricks051_color|ffffff': { bloco: true, frente: 'bloco' },
  'concrete_br|8f8b80': { concreto: 'canal', cor: 0x9a978e, frente: 'canal' },
  'concrete_br|6f6f61': { concreto: 'piso', cor: 0x6c6c64, frente: 'canal' },
  'concrete_br|b4ada0': { concreto: 'parede', cor: 0xe6e3dc },
  'concrete_br|8d8579': { concreto: 'parede', cor: 0xcdc8be },
  'concrete_br|9d968a': { concreto: 'parede', cor: 0xe2e0dc, ao: 0.30, ganho: 2.3 },
  'concrete_br|9a8f7e': { concreto: 'entulho', cor: 0xa39f96 },
  'concrete_br|8a867c': { concreto: 'entulho', cor: 0x9e9a92 },
  'concrete_br|ffffff': { concreto: 'parede', cor: 0xe0ded8 },
  'concrete_br|3f7f9c': { cor: 0x2c6a8c, rugosidade: .58 },
  'concrete_br|2b2a27': { janela: true, frente: 'janela' },
  'tex_madeira|ffffff': { madeira: 'tabua', cor: 0xffffff, frente: 'madeira' },
  // Guarda-corpo da travessia alta (matGuarda: sampler clonado com repeat 1×1; o tapume/ponte usa TEX.wall com repeat 2×2).
  'tex_madeira|ffffff|guarda': { semMapa: true, cor: 0xffffff, rugosidade: .5, metal: .2, guarda: true, frente: 'travessia' },
  // Tabuleiro da travessia alta e pranchas laje→travessia: em córrego canalizado de SP a travessia é laje de concreto, não tábua.
  'tex_madeira|9a8f7e': { concreto: 'tabuleiro', cor: 0xd6d4ce, ao: 0.4, frente: 'travessia' },
  'tex_madeira|b08a6a': { madeira: 'compensado', cor: 0xffffff, frente: 'madeira' },
  'tex_madeira|8a6a4e': { madeira: 'compensado', cor: 0xffffff, frente: 'madeira' },
  'tex_madeira|7a5a3a': { semMapa: true, cor: 0x9c9b97, rugosidade: .55, metal: .1, galvanizado: true, frente: 'madeira' },
  'tex_zinco|ffffff': { chapa: true, cor: 0xa09e99, ferrugem: .25 },
  '|8a6a4e': { cor: 0x5e5751, rugosidade: .85, metal: 0, frente: 'madeira' },
  '|7c6a52': { cor: 0x9a9ea2, rugosidade: .55, metal: .3, frente: 'madeira' },
  '|9d968a': { concreto: 'parede', cor: 0xdcdad5 },
  'canvas128|7a5a3c': { cor: 0x3e464c, rugosidade: .62, metal: 0, linhaDagua: true },
  'canvas128|d6d3cb': { semMapa: true, cor: 0x8a8d90, rugosidade: .5, metal: 0, geladeira: true },
  'canvas512|6b6350': { cor: 0x5e584a, rugosidade: .85, frente: 'canal' },
  'tex_agua_poluida|42543b': { cor: 0x2b3528, rugosidade: .32, metal: .05, frente: 'canal' },
  'tex_agua_poluida|8fc4b4': { cor: 0x5a7465, opacidade: .16, frente: 'canal' },
  'tex_agua_poluida|73927a': { cor: 0x435846, frente: 'canal' },
  'tex_agua_poluida|c2e0d5': { cor: 0x8aa08f, opacidade: .18, frente: 'canal' },
  '|252925': { cor: 0x2c3238, rugosidade: .7, saco: true },
  '|3d4435': { cor: 0x363d40, rugosidade: .7, saco: true },
  '|24211f': { cor: 0x282c31, rugosidade: .7, saco: true },
};
// Roupas do varal autoral (matRoupa, cor pura, instanciadas): vão a escala zero e a cenografia pendura pano com caimento.
const ROUPAS = new Set([0xd8d2c4, 0x8fa9c8, 0xc06a6a, 0xd8c46a, 0x7f9e78, 0xc9a2c2]);
function nomeDe(t) {
  if (!t) return '';
  const img = t.source?.data || t.image;
  if (typeof HTMLCanvasElement !== 'undefined' && img instanceof HTMLCanvasElement) return `canvas${img.width}`;
  const src = img?.currentSrc || img?.src || t.name || '';
  const m = /([^/?#]+?)(?:\.(?:webp|png|jpe?g))?(?:[?#].*)?$/.exec(src);
  return m ? m[1] : '';
}
const chaveDe = (m) => { const n = nomeDe(m.map); return n.startsWith('pbr_paintedplaster017') ? 'pbr_paintedplaster017_color|*' : `${n}|${m.color.getHexString()}`; };

// Posição de mundo no fragmento e, com `metros`, UV projetado no mundo (parede: horizontal x altura; piso: xz, ou zx
// quando a onda tem de descer o telhado; 'caimento': u atravessa o declive e v desce por ele, lido da normal da face).
const PARS = `varying vec3 vHdPos;
  ${RUIDO_GLSL}
  ${GRAO_GLSL}
  vec3 hdUmido(vec3 c, float k){ return mix(c, dot(c, ${LUMA}) * vec3(0.54, 0.57, 0.47), k); }
  float hdCorpoF(float y){ return smoothstep(0.42, 0.58, y) * (1.0 - smoothstep(1.92, 2.12, y)); }`;
function mundo(shader, metros = 0, modo = false) {
  shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHdPos;')
    .replace('#include <uv_vertex>', `#include <uv_vertex>
      { vec4 hdW = vec4(position, 1.0); vec3 hdNm = normal;
        #ifdef USE_INSTANCING
          hdW = instanceMatrix * hdW; hdNm = mat3(instanceMatrix) * hdNm;
        #endif
        hdW = modelMatrix * hdW; vec3 hdNs = normalize(mat3(modelMatrix) * hdNm); hdNm = abs(hdNs); vHdPos = hdW.xyz;
        ${metros ? `${modo === 'caimento' ? 'vec2 hdSl = length(hdNs.xz) > 0.03 ? normalize(hdNs.xz) : vec2(0.0, 1.0);' : ''}
        vec2 hdUv = (hdNm.y > max(hdNm.x, hdNm.z) ? ${modo === 'caimento' ? 'vec2(dot(hdW.xz, vec2(-hdSl.y, hdSl.x)), dot(hdW.xz, hdSl))' : `hdW.${modo ? 'zx' : 'xz'}`} : (hdNm.x > hdNm.z ? hdW.zy : hdW.xy)) / ${metros.toFixed(3)};
        #ifdef USE_MAP
          vMapUv = hdUv;
        #endif
        #ifdef USE_NORMALMAP
          vNormalMapUv = hdUv;
        #endif` : ''}
      }`);
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${PARS}`);
}
const NORMAL_REL = THREE.ShaderChunk.normal_fragment_maps.replace('mapN.xy *= normalScale;', 'mapN.xy *= normalScale * hdRel;');

// Rua: cimentado em placas de 2,5 × 3,0 m (junta de 1,5 cm, tom por placa), grão fino, remendo de asfalto escuro e frio com
// borda nítida e cordão de piche (≈ 20 % da área, mais denso a < 3 m das fachadas), brita miúda mais escura, canaleta no eixo
// do passeio da beira e do beco A–B (|x| 6,55 / 13,3), calçada de concreto claro de 1,2 m no pé das fachadas (|x| 7,45 / 12,2 /
// 15,1 / 18,85 / 22,45; a guia geométrica de hd_cenografia_corrego.js fecha em 1,26 m) com sarjeta úmida logo fora da guia; só a
// viela A–B (|x| 12,2–15,1) é beco sem calçada, mais escuro e com AO no pé das paredes — a rua do spawn (18,85–22,45) é rua.
// Poça rasa (rugosidade 0,15, sem cubo) + mancha úmida por padrão.
// Albedo: piso_cor_rug tem média linear 0,12; com cor 0x96 o cimento ficava em 0,04 (mais ESCURO que o asfalto de 0,185, que
// era o que lia como "rua clara"). Agora cimento ≈ 0,19 em luminância pura com tinta fria (0,955/1/1,06: o sol 0xffc888 levava o
// neutro a R−B 19 e a sombra sob a rampa lia como terra) e asfalto 0,135. Grão: cada frequência (3 cm e 1,1 cm) some pelo seu
// próprio fwidth e a metade da amplitude — abaixo de 4 px por ciclo o ruído de 1 cm virava "sal" no laplaciano.
function chaoHD(m, poca) {
  m.map = tex('piso_cor_rug'); m.normalMap = tex('piso_normal', false); m.roughnessMap = null; m.roughness = 1; m.normalScale.set(1.1, 1.1); m.color.setHex(0xffffff);
  m.onBeforeCompile = (s) => { mundo(s, 1.2);
    s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      float hdRug = sampledDiffuseColor.a, hdRel = 1.0; diffuseColor.a = 1.0;
      { vec2 hdP = vHdPos.xz; float hdFw = fwidth(hdP.x), hdAx = abs(vHdPos.x);
        float hdA = hdN(hdP * 0.071), hdB = hdN(hdP * 0.23 + 3.1), hdM = hdN(hdP * 0.9 + 7.0), hdF = hdN(hdP * 3.7);
        float hdFino = smoothstep(0.6, 0.15, hdFw * 9.0) * ((hdN(hdP * 6.5 + 1.0) - 0.5) * 0.22 + smoothstep(0.5, 0.12, hdFw * 17.0) * (hdN(hdP * 17.0 + 2.0) - 0.5) * 0.10);
        float hdDs = min(min(abs(hdAx - 7.45), abs(hdAx - 12.2)), min(min(abs(hdAx - 15.1), abs(hdAx - 18.85)), abs(hdAx - 22.45)));
        float hdBeco = smoothstep(12.0, 12.5, hdAx) * (1.0 - smoothstep(14.8, 15.3, hdAx));
        float hdCalc = (1.0 - smoothstep(1.18, 1.22 + hdFw * 1.5, hdDs)) * (1.0 - hdBeco);
        float hdPerto = 1.0 - smoothstep(1.4, 3.0, hdDs), hdLim = mix(0.66, 0.60, hdPerto);
        float hdAr = hdA * 0.8 + hdB * 0.2, hdAsf = smoothstep(hdLim, hdLim + 0.05, hdAr) * (1.0 - hdCalc), hdCord = (1.0 - smoothstep(0.008, 0.02 + hdFw * 1.5, abs(hdAr - hdLim - 0.025))) * (1.0 - hdCalc);
        vec3 hdC = vec3(dot(diffuseColor.rgb, ${LUMA})) * vec3(0.955, 1.0, 1.06) * 1.6 * (1.0 + hdFino);
        vec2 hdPl = vec2(hdP.x / 2.5, hdP.y / 3.0), hdFr = fract(hdPl), hdDl = min(hdFr, 1.0 - hdFr) * vec2(2.5, 3.0);
        float hdJunta = (1.0 - smoothstep(0.006, 0.014 + hdFw * 1.5, min(hdDl.x, hdDl.y))) * smoothstep(0.08, 0.02, hdFw);
        hdC *= mix(0.94, 1.05, hdH(floor(hdPl))) * (1.0 - 0.3 * hdJunta * (1.0 - hdCalc));
        // Calçada: placas de 1,2 m ao longo da fachada, tom mais claro e frio, junta própria; trinca e remendo ficam fora dela.
        { float hdCj = fract(vHdPos.z / 1.2), hdCd = min(hdCj, 1.0 - hdCj) * 1.2, hdJc = (1.0 - smoothstep(0.006, 0.014 + hdFw * 1.5, hdCd)) * smoothstep(0.08, 0.02, hdFw);
          vec3 hdCalC = hdC * vec3(1.14, 1.15, 1.16) * mix(0.95, 1.05, hdH(vec2(floor(vHdPos.z / 1.2), floor(hdAx)))) * (1.0 - 0.3 * hdJc);
          hdC = mix(hdC, hdCalC, hdCalc); }
        vec3 hdAsfC = vec3(0.135, 0.14, 0.15) * (0.85 + 0.3 * hdM) * (1.0 + hdFino * 0.5);
        hdC = mix(hdC, hdAsfC, hdAsf * 0.95) * (1.0 - 0.30 * hdCord);
        float hdBrita = smoothstep(0.68, 0.76, hdN(hdP * 1.3 + 11.0)) * (1.0 - hdAsf);
        hdC = mix(hdC, hdC * 0.85 * (0.9 + 0.2 * hdF), hdBrita * 0.6);
        float hdCan = 1.0 - smoothstep(0.10, 0.14 + hdFw, min(abs(hdAx - 6.55), abs(hdAx - 13.3)));
        hdC = hdUmido(hdC, 0.5 * hdCan) * (1.0 - 0.28 * hdCan * (0.7 + 0.3 * hdM));
        float hdSar = (1.0 - smoothstep(1.32, 1.85, hdDs)) * step(1.24, hdDs) * (0.6 + 0.4 * hdN(vec2(vHdPos.z * 0.7, hdAx)));
        hdC = hdUmido(hdC, 0.4 * hdSar) * (1.0 - 0.2 * hdSar);
        float hdSarj = (1.0 - smoothstep(0.04, 0.08 + hdFw * 1.5, abs(hdDs - 1.36))) * (1.0 - hdBeco);
        hdC = hdUmido(hdC, 0.35 * hdSarj) * (1.0 - 0.22 * hdSarj * (0.8 + 0.2 * hdM));
        // Beco: 10 % mais escuro no eixo e até 28 % no pé das paredes (AO local); a névoa autoral não muda.
        hdC *= 1.0 - hdBeco * (0.10 + 0.18 * (1.0 - smoothstep(0.0, 1.3, hdDs)));
        ${poca ? `float hdW = hdN(hdP * 0.45 + 5.0), hdUm = smoothstep(0.52, 0.72, hdW * 0.6 + hdM * 0.4) * (1.0 - hdCalc), hdPoca = smoothstep(0.70, 0.76, hdW * 0.75 + hdB * 0.25) * (1.0 - hdCalc);
        hdC = hdUmido(hdC, 0.35 * hdUm) * (1.0 - 0.18 * hdUm);
        hdC = mix(hdC, vec3(0.040, 0.048, 0.044), hdPoca * 0.9);` : 'float hdUm = 0.0, hdPoca = 0.0;'}
        float hdGr = 1.0 + smoothstep(0.5, 0.12, hdFw * 34.0) * (hdN(hdP * 34.0) - 0.5) * 0.11 + smoothstep(0.5, 0.12, hdFw * 87.0) * (hdN(hdP * 87.0) - 0.5) * 0.065;
        diffuseColor.rgb = hdC * hdGr * mix(0.92, 1.08, hdB);
        hdRug = max(mix(mix(hdRug, max(hdRug, 0.72), hdAsf), 0.45, max(hdUm * 0.3, max(hdCan * 0.4, hdSarj * 0.35))), 0.45); hdRug = mix(hdRug, 0.15, hdPoca); hdRel = 1.0 - 0.4 * hdAsf - 0.8 * hdPoca - 0.5 * hdJunta - 0.3 * hdCalc; }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * hdRug;')
      .replace('#include <normal_fragment_maps>', NORMAL_REL); };
  m.customProgramCacheKey = () => `corrego-hd-chao11-${poca ? 1 : 0}`;
}

// Concreto: fôrma (paredes, pilares das casas, postes, geladeira do canal) ou piso (canal). Mancha macro/média, grão,
// escorrido e pé sujo; o canal ganha linha d'água (limo até 45 cm acima da lâmina de −1,61 m, crosta clara, submerso escuro)
// e beiço sujo na aresta da margem; 'entulho' (manilha, caco, saco) ganha só a linha d'água e o pé sujo, esteja onde estiver.
const CANAL = `float hdYa = hdY + 1.61;
  float hdLimo = (1.0 - smoothstep(0.05, 0.5, hdYa)) * smoothstep(-0.4, -0.1, hdYa) * (0.7 + 0.3 * hdN(vec2(hdQ.x * 2.1, hdYa * 4.0))) * (1.0 - hdPiso);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.13, 0.15, 0.09) * (0.7 + 0.6 * hdMedio), hdLimo * 0.8);
  float hdCrosta = smoothstep(0.42, 0.5, hdYa) * (1.0 - smoothstep(0.55, 0.72, hdYa)) * smoothstep(0.35, 0.6, hdN(vec2(hdQ.x * 0.9, 2.0))) * (1.0 - hdPiso);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.60, 0.52), hdCrosta * 0.5);
  float hdNivel = smoothstep(0.12, 0.17, hdYa) * (1.0 - smoothstep(0.24, 0.32, hdYa)) * (1.0 - hdPiso) * (0.75 + 0.25 * hdN(vec2(hdQ.x * 1.4, 3.0)));
  diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.6 * hdNivel) * (1.0 - 0.38 * hdNivel);
  float hdSub = 1.0 - smoothstep(-0.15, 0.0, hdYa); diffuseColor.rgb *= 1.0 - 0.45 * hdSub; hdRug = mix(hdRug, 0.5, hdSub);
  float hdBeico = max(smoothstep(-0.35, -0.02, hdY) * (1.0 - hdPiso), hdPiso * step(-0.05, hdY) * (1.0 - smoothstep(3.1, 3.9, abs(vHdPos.x))) * (0.6 + 0.4 * hdN(vHdPos.xz * 0.8)));
  diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.45 * hdBeico) * (1.0 - 0.26 * hdBeico);
  float hdMancha = hdPiso * smoothstep(0.55, 0.75, hdN(vHdPos.xz * 0.35 + 9.0)); diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.4 * hdMancha) * (1.0 - 0.2 * hdMancha); hdRug = mix(hdRug, 0.35, hdMancha * 0.5);`;
const FUNDO = `float hdSub = 1.0 - smoothstep(-1.66, -1.55, hdY); diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.55, 0.52, 0.40), hdSub) * (1.0 - 0.25 * hdSub); hdRug = mix(hdRug, 0.45, hdSub);
  float hdLodo = smoothstep(0.5, 0.7, hdN(vHdPos.xz * 0.4 + 2.0)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.10, 0.11, 0.07), hdLodo * 0.6 * hdSub);`;
const PE = `float hdSuj = smoothstep(0.55, 0.04, hdY) * (1.0 - hdCorpoF(hdY)) * (0.5 + 0.5 * hdN(hdQ * 1.3)) * (1.0 - hdPiso);
  diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.7 * hdSuj) * (1.0 - 0.35 * hdSuj);`;
// Linha d'água de peça solta no leito (lâmina em −1,61 m): submerso escuro, limo até 40 cm acima, pé sujo quando está na rua.
const LINHA = `float hdYa = hdY + 1.61, hdSub = 1.0 - smoothstep(-0.12, 0.02, hdYa);
  float hdLimo = (1.0 - smoothstep(0.02, 0.4, hdYa)) * smoothstep(-0.25, -0.05, hdYa) * (0.6 + 0.4 * hdN(hdQ * 3.0));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.12, 0.14, 0.08) * (0.7 + 0.6 * hdMedio), hdLimo * 0.75);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.5, 0.5, 0.42), hdSub); hdRug = mix(hdRug, 0.45, hdSub);
  float hdSuj = smoothstep(0.55, 0.04, hdY) * step(-0.3, hdY) * (0.5 + 0.5 * hdN(hdQ * 1.3)) * (1.0 - hdPiso);
  diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.6 * hdSuj) * (1.0 - 0.3 * hdSuj);`;
// Topo/fundo horizontal do concreto de fôrma (piso da laje do sobrado, faixas): a fôrma tem veio de tábua e lia como deck.
// Vira cimento queimado cinza-frio (0,218/0,240/0,260: o sol 0xffc888 aquece o neutro em +30 de R−B) com junta de desempenadeira
// a 1,2 m, ~1 placa em 14 remendada e mancha de umidade (`umi` = fator GLSL: o tabuleiro só a aceita no plano horizontal —
// na rampa os borrões de 2–3 m liam como pelagem); o relevo da fôrma cai a 30 % no plano (as veias liam como tábua).
const laje = (umi = '1.0') => `{ vec2 hdG = vHdPos.xz / 1.2, hdFr = fract(hdG), hdPx = fwidth(hdG), hdDj = min(hdFr, 1.0 - hdFr) * 1.2; float hdPxM = max(hdPx.x, hdPx.y);
  float hdJunta = (1.0 - smoothstep(0.004, 0.010 + hdPxM * 1.8, min(hdDj.x, hdDj.y))) * smoothstep(0.25, 0.08, hdPxM);
  float hdRem = step(0.93, hdH(floor(hdG)));
  vec3 hdQue = vec3(0.218, 0.240, 0.260) * mix(0.92, 1.06, hdH(floor(hdG) + 5.0)) * (0.90 + 0.2 * hdN(vHdPos.xz * 0.7 + 3.0)) * (0.95 + 0.1 * hdMedio) * hdGrao(vHdPos.xz);
  hdQue = mix(hdQue, vec3(0.25, 0.27, 0.29) * (0.9 + 0.2 * hdN(vHdPos.xz * 2.7)), hdRem) * (1.0 - 0.35 * hdJunta);
  float hdUmi = smoothstep(0.6, 0.85, hdN(vHdPos.xz * 0.55 + 11.0)) * (0.6 + 0.4 * hdN(vHdPos.xz * 3.1)) * ${umi};
  hdQue = hdUmido(hdQue, 0.5 * hdUmi) * (1.0 - 0.22 * hdUmi);
  diffuseColor.rgb = mix(diffuseColor.rgb, hdQue, hdPiso); hdRug = mix(hdRug, mix(0.72, 0.5, hdUmi), hdPiso); hdRel = mix(hdRel, 0.3, hdPiso); }`;
// AO por vértice do lote (vao.js) entra atenuado (k = peso do AO, número ou expressão GLSL): pilar e faixa de laje em sombra
// viravam marrom-preto com o AO cheio.
const aoMeio = (k) => `#if defined( USE_COLOR_ALPHA ) || defined( USE_COLOR )
  diffuseColor.rgb *= mix(vec3(1.0), vColor.rgb, ${typeof k === 'number' ? k.toFixed(2) : k});
#endif`;
// r.ganho multiplica o albedo da fôrma (média linear 0,14 × cor): o pilar das casas precisa de ≈ 0,25 para não ler preto à sombra.
function concretoHD(m, r) {
  const piso = r.concreto === 'piso', canal = r.concreto === 'canal', entulho = r.concreto === 'entulho', tabuleiro = r.concreto === 'tabuleiro', parede = !piso && !canal && !entulho;
  const ao = r.ao ?? 0.55, ganho = r.ganho ?? 1;
  // Tabuleiro da travessia: topo (hdGn.y > 0,7, nunca o fundo) em cimento queimado; manta asfáltica preta só no plano horizontal
  // (> 0,95: a rampa a 0,84 fica fora) em placas de 1,2 m de borda nítida; AO de 10 cm na aresta longitudinal (z −11 ± 1,25).
  // Face inferior vista de baixo (hdGn.y < −0,5, a normal geométrica aponta para a câmera): albedo × 1,6, AO de vértice 0,2 e
  // sem escorrido — com AO 0,4, sem sol e com a manta pelo fundo, lia preta (p50 18).
  const MANTA = `{ vec2 hdMc = floor(vHdPos.xz / 1.2); float hdPlano = step(0.95, hdGn.y), hdFaixa = abs(vHdPos.z + 11.0);
    float hdManta = 0.0; // manta asfáltica desligada: sob o sol quente lia como placas de terra em xadrez (r17/r18); fica só o cimento queimado com juntas.
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.070, 0.069, 0.070) * (0.85 + 0.3 * hdN(vHdPos.xz * 6.0)), hdManta); hdRug = mix(hdRug, 0.6, hdManta); hdRel = mix(hdRel, 0.2, hdManta);
    diffuseColor.rgb *= 1.0 - 0.14 * hdPlano * smoothstep(1.05, 1.22, hdFaixa) * step(hdFaixa, 1.3);
    hdBaixo = step(hdGn.y, -0.5); diffuseColor.rgb *= 1.0 + 0.6 * hdBaixo; }`;
  m.map = tex(piso || canal ? 'piso_cor_rug' : 'forma_color'); m.normalMap = tex(piso || canal ? 'piso_normal' : 'forma_normal', false); m.roughnessMap = null; m.roughness = 1; m.normalScale.set(1.3, 1.3);
  m.onBeforeCompile = (s) => { mundo(s, piso || canal ? 1.9 : 1.8);
    s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      float hdRug = ${piso || canal ? 'sampledDiffuseColor.a' : '0.92'}, hdRel = 1.0, hdBaixo = 0.0; diffuseColor.a = 1.0;
      { float hdY = vHdPos.y; vec3 hdGn = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))); float hdPiso = step(0.7, ${tabuleiro ? 'hdGn.y' : 'abs(hdGn.y)'});
        vec2 hdQ = ${tabuleiro ? 'abs(hdGn.y) > 0.7 ? vHdPos.xz : vec2(vHdPos.x + vHdPos.z, hdY)' : 'vec2(vHdPos.x + vHdPos.z, hdY)'};
        ${parede ? `diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, ${LUMA})), diffuseColor.rgb, 0.5) * ${ganho.toFixed(2)};` : ''}
        float hdMacro = hdN(hdQ * 0.55) * 0.6 + hdN(hdQ * 1.9) * 0.4, hdMedio = hdN(hdQ * 5.5) * 0.55 + hdN(hdQ * 13.0) * 0.45, hdCorpo = hdCorpoF(hdY);
        diffuseColor.rgb *= ${tabuleiro ? 'mix(0.92, 1.08, hdMacro)' : 'mix(mix(0.80, 1.10, hdMacro), mix(0.94, 1.04, hdMacro), hdCorpo)'} * mix(0.92, 1.06, hdMedio) * hdGrao(hdQ);
        ${parede ? laje(tabuleiro ? 'step(0.95, hdGn.y)' : '1.0') : ''}${tabuleiro ? MANTA : ''}
        float hdEsc = smoothstep(0.64, 0.84, hdN(vec2(hdQ.x * 1.1 + hdN(hdQ * 0.31) * 2.0, hdY * 0.18))) * (1.0 - hdPiso) * (1.0 - hdBaixo) * ${canal ? 'smoothstep(-1.5, -0.15, hdY)' : 'smoothstep(1.9, 3.0, hdY)'};
        diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.5 * hdEsc) * (1.0 - 0.28 * hdEsc);
        ${canal ? CANAL : piso ? FUNDO : entulho ? LINHA : PE} }`)
      .replace('#include <color_fragment>', parede ? aoMeio(tabuleiro ? `mix(${ao.toFixed(2)}, 0.20, hdBaixo)` : ao) : '#include <color_fragment>')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * hdRug;')
      .replace('#include <normal_fragment_maps>', NORMAL_REL); };
  m.customProgramCacheKey = () => `corrego-hd-concreto11-${r.concreto}-${ao}-${ganho}`;
}
// Peça sem mapa que fica no leito (tambor): ferrugem em mancha, faixa de ferrugem laranja-escura de 10 cm logo acima da lâmina
// (−1,61 m), limo verde-escuro no submerso e limo claro até 35 cm acima. Metalness vai a zero: com 0,35 o reflexo do céu lavava a faixa.
function linhaDaguaHD(m) {
  m.metalness = 0;
  m.onBeforeCompile = (s) => { mundo(s);
    s.fragmentShader = s.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      { float hdYa = vHdPos.y + 1.61, hdSub = 1.0 - smoothstep(-0.12, 0.02, hdYa), hdLimo = (1.0 - smoothstep(0.12, 0.35, hdYa)) * smoothstep(-0.2, -0.05, hdYa);
        float hdFaixa = smoothstep(-0.01, 0.01, hdYa) * (1.0 - smoothstep(0.09, 0.11, hdYa));
        vec2 hdQ = vec2(vHdPos.x + vHdPos.z, vHdPos.y); float hdFer = smoothstep(0.55, 0.8, hdN(hdQ * 4.0)) * (0.5 + 0.5 * hdN(hdQ * 13.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.20, 0.11, 0.06), 0.5 * hdFer) * mix(0.85, 1.1, hdN(hdQ * 1.7));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.11, 0.13, 0.08), hdLimo * 0.7);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.04, 0.07, 0.03), 0.75 * hdSub) * (1.0 - 0.35 * hdSub);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.30, 0.12, 0.05) * (0.8 + 0.4 * hdN(hdQ * 9.0)), 0.85 * hdFaixa); }`); };
  m.customProgramCacheKey = () => 'corrego-hd-linha3';
}
// Geladeira do canal (1,5 × 1,8 em x ±5,9 / z ±10) e caixa de energia do poste (matEletro, cor pura): esmalte cinza neutro com
// friso horizontal a 0,60 m (1/3 de 1,8), puxador vertical na face voltada para a rua (z = ±10 + 0,45, 0,75–1,05 m), ferrugem no
// pé e no friso, grão fino. Sem mapa, metalness 0 e sem AO de vértice: a variante com forma_color (concreto 'parede') saiu preta.
function geladeiraHD(m) {
  m.metalness = 0; m.vertexColors = false;
  m.onBeforeCompile = (s) => { mundo(s);
    s.fragmentShader = s.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float hdRug = 1.0;
      { float hdY = vHdPos.y; vec2 hdQ = vec2(vHdPos.x + vHdPos.z, hdY); float hdFw = fwidth(hdY);
        vec3 hdGn = abs(normalize(cross(dFdx(vHdPos), dFdy(vHdPos)))); float hdLado = 1.0 - step(0.7, hdGn.y);
        float hdPainel = 1.0 + (hdN(hdQ * 0.9 + 4.0) - 0.5) * 0.10 + (hdN(hdQ * 7.0) - 0.5) * 0.05;
        float hdFriso = (1.0 - smoothstep(0.012, 0.018 + hdFw * 1.5, abs(hdY - 0.60))) * hdLado;
        float hdZc = vHdPos.z - 10.0 * floor(vHdPos.z / 10.0 + 0.5);
        float hdPux = step(hdGn.z, hdGn.x) * hdLado * (1.0 - smoothstep(0.014, 0.02 + fwidth(hdZc) * 1.5, abs(hdZc - 0.45))) * step(0.75, hdY) * (1.0 - step(1.05, hdY));
        float hdFer = (1.0 - smoothstep(0.02, 0.22, hdY)) * smoothstep(0.3, 0.65, hdN(hdQ * 6.0)) * hdLado;
        hdFer = max(hdFer, hdFriso * smoothstep(0.55, 0.8, hdN(vec2(hdQ.x * 9.0, 1.0))) * 0.7);
        diffuseColor.rgb *= hdPainel * (1.0 + (hdGrao(hdQ) - 1.0) * 0.5) * (1.0 - 0.55 * hdFriso);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.09, 0.09, 0.09), 0.8 * hdPux);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.22, 0.10, 0.05) * (0.7 + 0.6 * hdN(hdQ * 15.0)), 0.85 * hdFer);
        hdRug = 1.0 + 0.6 * hdFer; }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = min(1.0, roughness * hdRug);'); };
  m.customProgramCacheKey = () => 'corrego-hd-geladeira1';
}
// Saco de lixo (cor pura, dodecaedro autoral): pregas claras radiais que convergem no nó (ângulo em volta do eixo do objeto,
// torcidas por ruído, mais fortes para cima), amassado por ruído de 10–15 cm e grão fino; fosco. A posição é a do OBJETO
// (vHdLoc), não do mundo: o centro do saco é a origem da malha e a direção y é o alto. Sem mapa, sem AO de vértice.
function sacoHD(m) {
  m.metalness = 0; m.vertexColors = false;
  m.onBeforeCompile = (s) => { mundo(s);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vHdLoc;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvHdLoc = position;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vHdLoc;')
      .replace('#include <color_fragment>', `#include <color_fragment>
      float hdRug = 1.0;
      { vec3 hdL = vHdLoc; float hdLen = max(length(hdL), 1e-3), hdNy = hdL.y / hdLen, hdA = atan(hdL.z, hdL.x), hdV = hdNy * 0.5 + 0.5;
        float hdPr = sin(hdA * 7.0 + (hdN(hdL.xy * 4.0 + 3.0) - 0.5) * 5.0 + hdL.y * 6.0);
        float hdPre = smoothstep(0.55, 0.92, hdPr) * (0.3 + 0.7 * hdV) * (1.0 - smoothstep(0.9, 0.98, hdNy));
        float hdAm = hdN(vHdPos.xz * 7.0 + vHdPos.y * 9.0);
        diffuseColor.rgb *= (0.84 + 0.32 * hdAm) * (1.0 + 0.6 * hdPre) * (1.0 + (hdGrao(vHdPos.xz * 40.0 + vHdPos.y * 20.0) - 1.0) * 0.3);
        hdRug = 1.0 - 0.2 * hdPre; }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = min(1.0, roughness * hdRug);'); };
  m.customProgramCacheKey = () => 'corrego-hd-saco1';
}
// Pilar da travessia (matMadeira, cor pura) lido como tubo galvanizado: tom por altura em manchas de 20–40 cm (±6 %), emenda a
// cada 1,5 m com filete escuro e ferrugem leve escorrendo 12 cm abaixo, grão fino. Neutro 0x9c9b97: 0x9a9ea2 lia azulado à sombra.
function galvanizadoHD(m) {
  m.onBeforeCompile = (s) => { mundo(s);
    s.fragmentShader = s.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float hdRug = 1.0;
      { float hdY = vHdPos.y; vec2 hdQ = vec2(vHdPos.x + vHdPos.z, hdY); float hdFw = fwidth(hdY);
        float hdTom = 1.0 + (hdN(vec2(hdQ.x * 1.7, hdY * 3.3)) - 0.5) * 0.12 + (hdN(hdQ * 9.0 + 2.0) - 0.5) * 0.04;
        float hdJ = hdY / 1.5 - floor(hdY / 1.5), hdDj = min(hdJ, 1.0 - hdJ) * 1.5, hdAbaixo = hdJ * 1.5;
        float hdEm = (1.0 - smoothstep(0.006, 0.012 + hdFw * 1.5, hdDj)) * smoothstep(0.05, 0.01, hdFw);
        float hdFer = (1.0 - smoothstep(0.0, 0.12, hdAbaixo)) * smoothstep(0.45, 0.75, hdN(vec2(hdQ.x * 11.0, hdY * 2.0))) * step(0.01, hdY);
        diffuseColor.rgb *= hdTom * (1.0 + (hdGrao(hdQ) - 1.0) * 0.5) * (1.0 - 0.4 * hdEm);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.24, 0.11, 0.05) * (0.7 + 0.6 * hdN(hdQ * 17.0)), 0.6 * hdFer);
        hdRug = 1.0 + 0.5 * hdFer; }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = min(1.0, roughness * hdRug);'); };
  m.customProgramCacheKey = () => 'corrego-hd-galv1';
}
// Guarda-corpo da travessia alta (matGuarda: caixa de 0,9 × 0,1 m no vão e mureta de 0,55 m girada na rampa, sem sombra): vira
// guarda tubular galvanizado por descarte — só ficam o corrimão (0,76–0,86 m sobre o piso), a barra do meio (0,40–0,48) e os
// montantes a cada 1,4 m, nunca abaixo do piso; tinta amarela desgastada, ferrugem no pé. Piso = PASS de map_corrego.js (5,6 m
// no vão, rampa até |x| 13,6, rua depois). A mureta da rampa flutua 23 cm sobre a laje: com a cenografia `guarda` ligada
// (rampa = false) ela é descartada inteira e hd_cenografia_corrego.js põe tubos de verdade do piso ao corrimão; sem ela
// (rampa = true) o shader segue até o pé com montante final em |x| 13,52.
function guardaHD(m, rampa) {
  m.onBeforeCompile = (s) => { mundo(s);
    s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      float hdRug = 1.0, hdMetal = 1.0;
      { float hdAx = abs(vHdPos.x), hdPiso = hdAx <= 5.0 ? 5.6 : hdAx <= 13.6 ? 5.6 * (1.0 - (hdAx - 5.0) / 8.6) : 0.0, hdAlt = vHdPos.y - hdPiso;
        ${rampa ? '' : 'if (hdAx > 5.05) discard;'}
        float hdTopo = step(0.76, hdAlt) * (1.0 - step(0.86, hdAlt)), hdMeio = step(0.40, hdAlt) * (1.0 - step(0.48, hdAlt));
        float hdPu = fract((vHdPos.x + 0.7) / 1.4) * 1.4, hdPoste = max(1.0 - step(0.06, hdPu), ${rampa ? 'step(abs(hdAx - 13.52), 0.03)' : '0.0'}) * step(0.0, hdAlt) * step(hdAx, 13.6);
        if (hdTopo + hdMeio + hdPoste < 0.5) discard;
        float hdRound = max(max(hdTopo * (1.0 - abs(hdAlt - 0.81) / 0.05), hdMeio * (1.0 - abs(hdAlt - 0.44) / 0.04)), hdPoste * (1.0 - abs(hdPu - 0.03) / 0.03));
        vec2 hdQ = vec2(vHdPos.x, vHdPos.y);
        float hdTinta = smoothstep(0.38, 0.55, hdN(hdQ * vec2(1.7, 3.0) + 2.0) * 0.7 + hdN(hdQ * 9.0) * 0.3);
        vec3 hdGalv = vec3(0.36, 0.38, 0.39) * (0.85 + 0.3 * hdN(hdQ * vec2(5.0, 9.0)));
        diffuseColor.rgb = mix(hdGalv, vec3(0.55, 0.36, 0.03) * (0.9 + 0.2 * hdN(hdQ * 13.0)), 0.85 * hdTinta) * (0.62 + 0.5 * hdRound);
        float hdFerr = smoothstep(0.12, 0.02, hdAlt) * hdPoste * 0.75 + smoothstep(0.6, 0.8, hdN(hdQ * vec2(3.0, 11.0) + 5.0)) * 0.5;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.22, 0.10, 0.05), min(1.0, hdFerr));
        hdMetal = (1.0 - 0.85 * hdTinta) * (1.0 - 0.7 * min(1.0, hdFerr)); hdRug = mix(0.5, 0.78, hdTinta) + 0.3 * min(1.0, hdFerr); }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = min(1.0, roughness * hdRug * 2.0);')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = min(1.0, metalness * 5.0 * hdMetal);'); };
  m.customProgramCacheKey = () => `corrego-hd-guarda2-${rampa ? 1 : 0}`;
}

// Chapa ondulada (worn_corrugated_iron, 13 ondas/m = 7,6 cm): a onda desce o caimento lido da normal; no telhado folhas
// de 1,0 × 2,2 m com sombra de sobreposição e tom por folha (legível de longe, onde a onda some no mip); na parede painel
// por ruído. Ferrugem só em mancha. Tom claro: o mapa tem média 0,16, a cor compensa (0x9a–0xa0, não 0x7d).
function chapaHD(m, r) {
  m.map = tex('chapa_color'); m.normalMap = tex('chapa_normal', false); m.roughnessMap = null; m.roughness = .66; m.metalness = .35; m.normalScale.set(.6, .6);
  m.onBeforeCompile = (s) => { mundo(s, 1.0, 'caimento');
    s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      float hdMetal = 1.0, hdRug = 1.0, hdRel = 1.0; diffuseColor.a = 1.0;
      { vec2 hdQ = vec2(vHdPos.x + vHdPos.z, vHdPos.y);
        vec3 hdGn = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))); float hdTelha = smoothstep(0.35, 0.6, abs(hdGn.y));
        float hdPainel = hdN(vHdPos.xz * 0.35 + vec2(vHdPos.y * 0.3, 0.0)), hdF2 = hdN(vec2(hdQ.x * 1.3 + 4.1, hdQ.y * 2.2));
        float hdFerr = smoothstep(0.60, 0.82, hdN(hdQ * 0.9 + 2.0) * 0.6 + hdF2 * 0.4);
        vec2 hdFolha = vec2(vMapUv.x, vMapUv.y / 2.2), hdFr = fract(hdFolha), hdPx = fwidth(hdFolha);
        float hdEmV = 1.0 - smoothstep(0.0, 0.02 + hdPx.y * 2.0, hdFr.y * 2.2), hdEmU = 1.0 - smoothstep(0.0, 0.012 + hdPx.x * 2.0, hdFr.x);
        float hdTom = mix(1.0 + (hdPainel - 0.5) * 0.36, mix(0.86, 1.12, hdH(floor(hdFolha))), hdTelha);
        diffuseColor.rgb *= hdTom * (1.0 - hdTelha * (0.45 * hdEmV + 0.25 * hdEmU));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.22, 0.12, 0.07) * (0.7 + 0.6 * hdF2), ${r.ferrugem.toFixed(2)} * hdFerr);
        // Telhado lê fibrocimento cinza (não marrom metálico): no plano inclinado o albedo vai a 60 % de luminância neutra-fria.
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, ${LUMA})) * vec3(0.97, 1.0, 1.03), 0.6 * hdTelha * (1.0 - hdFerr));
        hdMetal = 1.0 - 0.8 * hdFerr; hdRug = 1.0 + 0.3 * hdFerr; hdRel = mix(1.0, 1.6, hdTelha); }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = min(1.0, roughness * hdRug);')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = metalness * hdMetal;')
      .replace('#include <normal_fragment_maps>', NORMAL_REL); };
  m.customProgramCacheKey = () => `corrego-hd-chapa5-${r.ferrugem}`;
}

// Madeira que fica madeira vira tábua cinza desbotada (ponte, guarda, tablado da travessia) ou compensado claro (albedo ≈ 0,4) em
// chapas de 1,10 × 2,20 m com emenda escura, veio fraco (variação do mapa a 55 %) e AO de vértice a 35 % (barraco, tapume do
// puxadinho, vigas): tex_madeira tem média linear 0,17 e com AO cheio o tapume à sombra ficava em p50 64, chapado.
function madeiraHD(m, r) {
  const comp = r.madeira === 'compensado';
  m.roughness = .9; m.metalness = 0;
  m.onBeforeCompile = (s) => { mundo(s);
    s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      { vec3 hdL = vec3(dot(diffuseColor.rgb, ${LUMA})); ${comp ? 'hdL = mix(vec3(0.17), hdL, 0.55);' : ''} vec2 hdQ = vec2(vHdPos.x + vHdPos.z, vHdPos.y);
        float hdW = hdN(hdQ * 0.8 + 3.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, hdL * ${comp ? 'vec3(1.96, 1.86, 1.66)' : 'vec3(1.28, 1.32, 1.26)'}, ${comp ? '0.92' : '0.86'}) * mix(${comp ? '0.88, 1.08' : '0.78, 1.12'}, hdW) * hdGrao(hdQ * 0.5);
        ${comp ? `vec3 hdGn = abs(normalize(cross(dFdx(vHdPos), dFdy(vHdPos)))); vec2 hdS = hdGn.y > 0.7 ? vHdPos.xz : (hdGn.x > hdGn.z ? vHdPos.zy : vHdPos.xy);
        vec2 hdG = hdS / vec2(1.10, 2.20), hdFr = abs(fract(hdG) - 0.5), hdPx = fwidth(hdG);
        float hdEm = max(1.0 - smoothstep(0.0, 0.012 + hdPx.x * 1.5, (0.5 - hdFr.x) * 1.10), 1.0 - smoothstep(0.0, 0.012 + hdPx.y * 1.5, (0.5 - hdFr.y) * 2.20));
        diffuseColor.rgb *= mix(0.86, 1.1, hdH(floor(hdG))) * (1.0 - 0.45 * hdEm);
        float hdEsc = smoothstep(0.6, 0.85, hdN(vec2(hdS.x * 2.3, hdS.y * 0.25) + 7.0)) * (1.0 - hdGn.y);
        diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.5 * hdEsc) * (1.0 - 0.22 * hdEsc);` : `float hdSuj = smoothstep(0.5, 0.8, hdN(hdQ * 1.7 + 1.0)); diffuseColor.rgb *= 1.0 - 0.18 * hdSuj;`} }`)
      .replace('#include <color_fragment>', comp ? aoMeio(0.35) : '#include <color_fragment>'); };
  m.customProgramCacheKey = () => `corrego-hd-madeira8-${r.madeira}`;
}

// Reboco pintado: textura de reboco real projetada no mundo (1,7 m), relevo por normal, e a idade do Sertão (mancha,
// escorrido acima de 1,9 m, trinca, descascado mostrando tijolo com junta, pé sujo). As oito tintas autorais ficam (× 1,0).
// Tijolo menos saturado e quase só no pé: um buraco de 10 px no alto da empena lia como mancha magenta.
// corpoLiso 0,85: a mancha da própria reboco_cor_rug (cabeça, rgb≈69/50/32 a 4 m) entrava a 100 % na faixa do corpo.
// Três acabamentos por tinta (variante = soma dos bytes da cor autoral mod 3, estável por material): 0 chapisco cinza (grão
// fino de alta frequência, tinta a 55 %, +4 % de luz), 1 tinta pastel luma-neutra em toda a parede (verde-água ou amarelo pelo
// bit 8 da cor) descascada só acima de 2,1 m, 2 cinza-massa (0,97/0,97/0,99 sobre 40 % da tinta) com remendos de massa acima de
// 2,1 m — relativos à parede (luma × 1,06, dessaturados): placas de cor fixa liam como planos claros flutuando. Nada entra na
// faixa do corpo (0,45–2,1 m) além de tinta uniforme e grão; rodapé escuro de 0,45 m em todas.
const SUB_TIJOLO = { tex: null, metros: 1.0, cor: [1.05, .95, .9], tijolo: true, pe: .60, alto: .80, y0: 0, foraDoCorpo: true, sat: .8, forca: 1, beico: .55 };
const TINTA_PASTEL = [[0.903, 1.050, 0.997], [1.044, 1.003, 0.863]];
const varianteReboco = (v, t) => [
  `float hdChp = smoothstep(0.5, 0.1, fwidth(hdQb.x) * 40.0) * (hdN(hdQb * 40.0) - 0.5) * 0.5 + smoothstep(0.5, 0.1, fwidth(hdQb.x) * 90.0) * (hdN(hdQb * 90.0) - 0.5) * 0.25;
   diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, ${LUMA})) * vec3(0.98, 0.98, 0.95), 0.45) * 1.04 * (1.0 + hdChp);`,
  `diffuseColor.rgb *= vec3(${TINTA_PASTEL[t].map((c) => c.toFixed(3)).join(', ')});
   float hdDesc = smoothstep(0.48, 0.58, hdN(hdQb * 0.9 + 5.0) * 0.7 + hdN(hdQb * 3.1) * 0.3) * smoothstep(2.05, 2.3, hdYb);
   diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.30, 0.30, 0.28) * (0.85 + 0.3 * hdN(hdQb * 7.0)), hdDesc);`,
  `diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, ${LUMA})), 0.6) * vec3(0.97, 0.97, 0.99);
   vec2 hdCel = floor(hdQb / vec2(1.3, 1.1)), hdCf = abs(fract(hdQb / vec2(1.3, 1.1)) - 0.5);
   float hdRem = step(0.78, hdH(hdCel + 3.0)) * step(max(hdCf.x, hdCf.y), 0.42) * smoothstep(2.05, 2.2, hdYb);
   diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, ${LUMA})) * vec3(1.06, 1.06, 1.03) * (0.92 + 0.16 * hdN(hdQb * 5.0)), 0.8 * hdRem);`,
][v];
function rebocoHD(m) {
  SUB_TIJOLO.tex ||= pbrTex('/pbr_bricks051_color', true);
  const hex = m.color.getHex(), v = ((hex & 255) + ((hex >> 8) & 255) + (hex >> 16)) % 3, t = (hex >> 8) & 1;
  m.map = tex('reboco_cor_rug'); m.normalMap = tex('reboco_normal', false); m.roughnessMap = null; m.roughness = 1; m.normalScale.set(1.3, 1.3);
  const depois = `float hdRugA = texture2D(map, vMapUv).a; diffuseColor.a = 1.0;
    { float hdYb = vHdPos.y; vec2 hdQb = vec2(vHdPos.x + vHdPos.z, hdYb); vec3 hdGb = abs(normalize(cross(dFdx(vHdPos), dFdy(vHdPos)))); float hdPisoB = step(0.7, hdGb.y);
      ${varianteReboco(v, t)}
      float hdRod = (1.0 - smoothstep(0.42, 0.46, hdYb)) * (1.0 - hdPisoB);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.085, 0.085, 0.082) * (0.85 + 0.3 * hdN(hdQb * 6.0)), 0.8 * hdRod); hdRugA = mix(hdRugA, 0.75, hdRod); }`;
  projetaMundo(m, 1.7, { rodape: .5, sub: SUB_TIJOLO, pe: { altura: .5, cor: [.40, .38, .34], escuro: .3 }, corpoLiso: .85, extra: { chave: `corrego-reb6-v${v}-${t}`, depois } });
  const obc = m.onBeforeCompile, chave = m.customProgramCacheKey;
  m.onBeforeCompile = (s) => { obc(s); s.fragmentShader = s.fragmentShader.replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * hdRugA;'); };
  m.customProgramCacheKey = () => `${chave()}-rug`;
}

// Tijolo cru (pbr_bricks051, cuja UV repetia o tile a cada ~180 px): bloco cerâmico de 6 furos 39 × 19 cm assentado com
// junta cinza de 1,5 cm, projetado em metros; tom por bloco e por fiada (quase plano na faixa do corpo), argamassa escorrida/
// respingada sobre o bloco, cinta de concreto de 15 cm no topo de cada pavimento (y = k·2,8) e verga corrida de 12 cm no nível
// dos vãos (2,15 m do piso) e topo horizontal (piso da laje) em concreto. O mapa fica só como grão. Bloco pouco saturado:
// o 0,46/0,21/0,10 anterior lia como tijolinho europeu a 1500 px.
function blocoHD(m) {
  m.normalMap = tex('reboco_normal', false); m.roughnessMap = null; m.roughness = 1; m.normalScale.set(.7, .7);
  m.onBeforeCompile = (s) => { mundo(s, 1.0);
    s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      float hdRug = 0.95; diffuseColor.a = 1.0;
      { vec3 hdGn = abs(normalize(cross(dFdx(vHdPos), dFdy(vHdPos)))); float hdPiso = step(0.7, hdGn.y), hdY = vHdPos.y;
        float hdU = hdGn.x > hdGn.z ? vHdPos.z : vHdPos.x; vec2 hdQ = vec2(hdU, hdY);
        float hdGr = 0.72 + 0.56 * dot(diffuseColor.rgb, ${LUMA});
        float hdFi = floor(hdY / 0.2), hdDesl = 0.2 * mod(hdFi, 2.0);
        vec2 hdB = vec2((hdU + hdDesl) / 0.4, hdY / 0.2), hdFr = fract(hdB), hdPx = fwidth(hdB), hdDj = min(hdFr, 1.0 - hdFr) * vec2(0.4, 0.2);
        float hdLonge = smoothstep(0.14, 0.04, hdPx.y * 0.2);
        float hdJunta = (1.0 - smoothstep(0.0, 0.015 + max(hdPx.x * 0.4, hdPx.y * 0.2) * 1.5, min(hdDj.x, hdDj.y))) * hdLonge;
        float hdVar = mix(1.0, 0.3, hdCorpoF(hdY)), hdTom = mix(1.0, mix(0.84, 1.12, hdH(floor(hdB))), hdVar) * mix(0.95, 1.05, hdH(vec2(hdFi, 7.0)));
        vec3 hdBloco = vec3(0.40, 0.215, 0.135) * hdTom * hdGr * (0.9 + 0.2 * hdN(hdQ * 9.0));
        vec3 hdArg = vec3(0.27, 0.265, 0.245) * (0.8 + 0.4 * hdN(hdQ * 23.0));
        float hdResp = smoothstep(0.66, 0.74, hdN(hdQ * 6.0 + 1.0) * 0.55 + hdN(vec2(hdU * 2.0, hdY * 0.5) + 4.0) * 0.45) * hdLonge * (1.0 - 0.7 * hdCorpoF(hdY));
        vec3 hdC = mix(mix(hdBloco, hdArg, 0.18 * (1.0 - hdLonge)), hdArg * 1.08, max(hdJunta, 0.85 * hdResp));
        float hdMod = fract(hdY / 2.8) * 2.8, hdCinta = max(max(smoothstep(2.63, 2.66, hdMod), hdPiso), smoothstep(2.13, 2.16, hdMod) * (1.0 - smoothstep(2.26, 2.29, hdMod)));
        vec3 hdConc = vec3(0.36, 0.355, 0.33) * (0.85 + 0.3 * hdN(hdQ * 2.1)) * hdGrao(hdQ);
        hdC = mix(hdC, hdConc, hdCinta);
        float hdEsc = smoothstep(0.66, 0.86, hdN(vec2(hdU * 1.1, hdY * 0.18))) * (1.0 - hdPiso) * smoothstep(1.9, 3.0, hdY);
        hdC = hdUmido(hdC, 0.45 * hdEsc) * (1.0 - 0.25 * hdEsc);
        float hdSuj = smoothstep(0.55, 0.04, hdY) * (1.0 - hdPiso); hdC = hdUmido(hdC, 0.5 * hdSuj) * (1.0 - 0.3 * hdSuj);
        diffuseColor.rgb = hdC; hdRug = mix(0.95, 0.8, hdCinta); }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * hdRug;'); };
  m.customProgramCacheKey = () => 'corrego-hd-bloco2';
}

// Vãos (matVao: porta 1,0 × 2,1 e janela 1,0 × 1,0 em placa de 10 cm, 2 cm à frente da parede). O lote estático funde todos
// num mesh só, então cada caixa é recuperada no CPU por corrida contígua de vértices (extensão ≤ 1,1 m na horizontal e ≤ 2,2 m
// na vertical: vãos vizinhos distam mais) e vira atributo: centro, tangente da fachada (eixo principal em xz), meia-largura e tipo
// (janela 0–8 do atlas de janelas, porta 10–14 do atlas de portas; +0,5 = espelhada). Sem isto cada vão era um preto chapado.
function marcaVaos(mesh) {
  const g = mesh.geometry, p = g?.attributes?.position; if (!p || g.attributes.hdJc) return null;
  const n = p.count, jc = new Float32Array(n * 3), js = new Float32Array(n * 4), caixas = [];
  let ini = 0, x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const nx0 = Math.min(x0, x), ny0 = Math.min(y0, y), nz0 = Math.min(z0, z), nx1 = Math.max(x1, x), ny1 = Math.max(y1, y), nz1 = Math.max(z1, z);
    if (i > ini && (Math.max(nx1 - nx0, nz1 - nz0) > 1.1 || ny1 - ny0 > 2.2)) { caixas.push([ini, i, x0, y0, z0, x1, y1, z1]); ini = i; x0 = x1 = x; y0 = y1 = y; z0 = z1 = z; continue; }
    x0 = nx0; y0 = ny0; z0 = nz0; x1 = nx1; y1 = ny1; z1 = nz1;
  }
  if (n > ini) caixas.push([ini, n, x0, y0, z0, x1, y1, z1]);
  const h3 = (a, b, c) => { const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return s - Math.floor(s); };
  for (const [a, b, bx0, by0, bz0, bx1, by1, bz1] of caixas) {
    const cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2, cz = (bz0 + bz1) / 2;
    let sxx = 0, sxz = 0, szz = 0;
    for (let i = a; i < b; i++) { const dx = p.getX(i) - cx, dz = p.getZ(i) - cz; sxx += dx * dx; sxz += dx * dz; szz += dz * dz; }
    const ang = .5 * Math.atan2(2 * sxz, sxx - szz), tx = Math.cos(ang), tz = Math.sin(ang);
    let hw = 0; for (let i = a; i < b; i++) hw = Math.max(hw, Math.abs((p.getX(i) - cx) * tx + (p.getZ(i) - cz) * tz));
    // Porta fica na faixa do corpo: sem a célula 2 (madeira velha, bege quente) e com tinta fria. Janela sem a célula 4
    // (vitrô: caixilho 0x4f5a5c sob vidro 128–142, lavado na névoa a 20 m; a irmã cobogó ao lado ficava nítida).
    const porta = by1 - by0 > 1.6, h = h3(cx, cy, cz), tipo = (porta ? 10 + [0, 1, 3, 4][Math.floor(h * 4)] : [0, 1, 2, 3, 5, 6, 7, 8][Math.floor(h * 8)]) + (h3(cz, cx, 3) < .5 ? .5 : 0);
    for (let i = a; i < b; i++) { jc[i * 3] = cx; jc[i * 3 + 1] = cy; jc[i * 3 + 2] = cz; js[i * 4] = tx; js[i * 4 + 1] = tz; js[i * 4 + 2] = hw; js[i * 4 + 3] = tipo; }
  }
  g.setAttribute('hdJc', new THREE.BufferAttribute(jc, 3)); g.setAttribute('hdJs', new THREE.BufferAttribute(js, 4));
  return () => { g.deleteAttribute('hdJc'); g.deleteAttribute('hdJs'); };
}
// Janela de alumínio/basculante/veneziana com vidro (reflexo de céu por fresnel, sem cubo) ou porta de chapa/enrolar/madeira
// nas faces largas; faces finas e topo em concreto (ombreira/peitoril). A oclusão por vértice do mapa é preservada.
function janelaHD(m, U) {
  m.map = null; m.normalMap = null; m.roughnessMap = null; m.roughness = 1; m.metalness = 0; m.color.setHex(0xffffff);
  m.onBeforeCompile = (s) => { mundo(s); s.uniforms.hdJanelas = U.janelas; s.uniforms.hdPortas = U.portas;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 hdJc; attribute vec4 hdJs; varying vec3 vHdJc; varying vec4 vHdJs;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHdJc = hdJc; vHdJs = hdJs;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D hdJanelas; uniform sampler2D hdPortas; varying vec3 vHdJc; varying vec4 vHdJs;')
      .replace('#include <color_fragment>', `#include <color_fragment>
      float hdVid = 0.0, hdFres = 0.0, hdRug = 0.75;
      { float hdAo = diffuseColor.r; vec3 hdGn = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))); vec2 hdT = vHdJs.xy;
        float hdHw = max(vHdJs.z, 0.05), hdPorta = step(9.5, vHdJs.w), hdCod = vHdJs.w - 10.0 * hdPorta, hdCel = floor(hdCod + 0.01), hdEsp = step(0.25, fract(hdCod));
        float hdHh = mix(0.5, 1.05, hdPorta);
        float hdU = dot(vHdPos.xz - vHdJc.xz, hdT) / (2.0 * hdHw) + 0.5, hdV = (vHdPos.y - vHdJc.y) / (2.0 * hdHh) + 0.5;
        hdU = mix(hdU, 1.0 - hdU, hdEsp);
        float hdFrente = step(abs(dot(hdGn.xz, hdT)), 0.5) * step(abs(hdGn.y), 0.5);
        float hdId = hdH(floor(vHdJc.xz * 2.0) + floor(vHdJc.y));
        vec2 hdUv = clamp(vec2(hdU, 1.0 - hdV), 0.006, 0.994);
        vec4 hdTj = texture2D(hdJanelas, (vec2(mod(hdCel, 3.0), floor(hdCel / 3.0)) + hdUv) / 3.0);
        vec4 hdTp = texture2D(hdPortas, vec2((min(hdCel, 4.0) + hdUv.x) / 5.0, hdUv.y));
        vec4 hdTx = mix(hdTj, hdTp, hdPorta); float hdSol = step(0.5, hdTx.a);
        vec3 hdTinta = hdId < 0.25 ? vec3(0.78, 0.86, 0.92) : hdId < 0.5 ? vec3(0.80, 0.88, 0.78) : hdId < 0.75 ? vec3(0.84, 0.88, 0.90) : vec3(0.96);
        vec3 hdCor = hdTx.rgb * mix(vec3(1.0), hdTinta, hdPorta) * (0.84 + 0.3 * hdId);
        vec3 hdMold = vec3(0.36, 0.35, 0.32) * (0.8 + 0.4 * hdN(vHdPos.xz * 7.0 + vHdPos.y));
        diffuseColor.rgb = mix(hdMold, hdCor, hdFrente) * hdAo;
        hdVid = (1.0 - hdSol) * hdFrente * (1.0 - hdPorta);
        vec3 hdOlho = normalize(vHdPos - cameraPosition); float hdVn = max(abs(dot(hdOlho, hdGn)), 0.15);
        hdFres = (0.10 + 0.9 * pow(1.0 - hdVn, 4.0)) * hdVid;
        hdRug = mix(0.75, 0.12, hdVid); }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * hdRug;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += hdFres * vec3(0.26, 0.30, 0.34);'); };
  m.customProgramCacheKey = () => 'corrego-hd-janela2';
}

// Lâmina do córrego (water.js): cor e espuma por uniforme; o update fica intacto. A faixa de espuma branca na emenda
// água/margem era a "linha de 1 px" apontada; vira filete cinza-oliva estreito. Com `espuma`, o fragmento ganha nata marrom
// nos cantos (|x| > 2,2 m, junto aos muros) lida da textura B que já está no shader; a string original volta em desliga().
const ESPUMA_ANCORA = 'cor = mix(cor, uCeuCor, fres * 0.22);';
function aguaHD(scene, espuma) {
  let malha = null; scene.traverse((o) => { if (o.userData?.aguaViva && o.material?.uniforms) malha = o; });
  if (!malha) return () => {};
  const mat = malha.material, u = mat.uniforms, cores = {}, nums = {}, frag = mat.fragmentShader;
  for (const [k, v] of [['uCorRasa', 0x4a6150], ['uCorFunda', 0x1c2a21], ['uCorEspuma', 0x9aa69b]]) if (u[k]?.value?.isColor) { cores[k] = u[k].value.getHex(); u[k].value.setHex(v); }
  for (const [k, v] of [['uEspumaFaixa', .14], ['uEspumaMiolo', .05]]) if (typeof u[k]?.value === 'number') { nums[k] = u[k].value; u[k].value = Math.min(u[k].value, v); }
  const patch = espuma && typeof frag === 'string' && frag.includes(ESPUMA_ANCORA) && u.tNormalB && u.uTime;
  if (patch) {
    mat.fragmentShader = frag.replace(ESPUMA_ANCORA, `{ float hdB = smoothstep(2.2, 2.95, abs(vWorld.x)); float hdP = texture2D(tNormalB, vWorld.xz / 2.6 + uTime * vec2(0.012, 0.03)).g;
    float hdE = hdB * smoothstep(0.50, 0.78, hdP + 0.22 * hdB); cor = mix(cor, vec3(0.34, 0.29, 0.19), hdE * 0.75); alfa = max(alfa, hdE * 0.85); }
  ${ESPUMA_ANCORA}`); mat.needsUpdate = true;
  }
  return () => { for (const k in cores) u[k].value.setHex(cores[k]); for (const k in nums) u[k].value = nums[k]; if (patch) { mat.fragmentShader = frag; mat.needsUpdate = true; } };
}
// GLBs sem chave útil: a "poça azul" fora do canal é a caixa d'água caída na rua (azul saturado → polietileno encardido);
// o botijão (botijao_gas.glb, material defaultMat_1001 branco sem mapa) vira P13 cinza-aço encardido.
function propsGLB(scene) {
  const feitos = [], vistos = new Set();
  scene.traverse((o) => { if (!o.isMesh) return; let id = null; for (let p = o; p && !id; p = p.parent) id = p.userData?.mapPropId;
    if (id !== 'caixa_dagua' && id !== 'botijao_gas') return;
    for (const m of materiaisDe(o)) { if (vistos.has(m) || !m.color) continue;
      if (id === 'caixa_dagua') { if (m.color.b < m.color.r * 1.2) continue; vistos.add(m); feitos.push([m, m.color.getHex(), m.roughness, m.metalness]); m.color.multiplyScalar(.5); if (typeof m.roughness === 'number') m.roughness = Math.max(m.roughness, .55); }
      else { if (m.map) continue; vistos.add(m); feitos.push([m, m.color.getHex(), m.roughness, m.metalness]); m.color.setHex(0x737a7f); m.roughness = .5; m.metalness = .35; } } });
  return () => { for (const [m, cor, rug, met] of feitos) { m.color.setHex(cor); if (typeof rug === 'number') m.roughness = rug; if (typeof met === 'number') m.metalness = met; } };
}
// Tufos de capim do chão (grama_corrego_01/02: grade instanciada por PropBatch mais as 26 peças plantadas): fica só o que está
// a ≤ 3,5 m da água (|x| ≤ 6,5; a fileira autoral da margem está em 5,5–6,2 m), o resto vai a escala zero por instância —
// menos 14 deles que, com `margem`, mudam só de posição para a beira do canal (|x| 3,4–4,5, fora de ponte, rampa e geladeira).
// Rua de favela de planície em SP é cimentado e asfalto remendado, não terreno baldio com tufo seco.
const RAMPAS_Z = [[-1, -33, -27], [1, -13, -7], [-1, 9, 15], [1, 26, 32]];
function matoHD(scene, limite = 6.5, margem = false) {
  const feitos = []; let s = 4421, movidos = 0; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const vago = (lado, z) => ![-22, 0, 22].some((b) => Math.abs(z - b) < 2.6) && !RAMPAS_Z.some(([l, a, b]) => l === lado && z > a - 1.2 && z < b + 1.2) && Math.abs(Math.abs(z) - 10) > 1.6;
  scene.traverse((o) => {
    if (o.isInstancedMesh && /Grass Tuft|Creekside Weeds/.test(o.material?.name || '')) {
      const a = o.instanceMatrix.array, copia = a.slice(); let mudou = false;
      for (let i = 0; i < o.count; i++) { const k = i * 16; if (Math.abs(a[k + 12]) <= limite) continue; mudou = true;
        let posto = false;
        for (let t = 0; margem && movidos < 14 && t < 8 && !posto; t++) { const lado = movidos % 2 ? 1 : -1, z = -31 + rnd() * 62; if (!vago(lado, z)) continue;
          a[k + 12] = lado * (3.4 + rnd() * 1.1); a[k + 13] = 0; a[k + 14] = z; movidos++; posto = true; }
        if (!posto) for (let j = 0; j < 12; j++) a[k + j] = 0; }
      if (mudou) { o.instanceMatrix.needsUpdate = true; feitos.push(() => { a.set(copia); o.instanceMatrix.needsUpdate = true; }); }
    } else if (!o.isMesh && /^grama_corrego/.test(o.userData?.mapPropId || '') && o.visible && Math.abs(o.position.x) > limite) { o.visible = false; feitos.push(() => { o.visible = true; }); }
  });
  return () => { for (const f of feitos) f(); };
}
// Retângulos de roupa do varal autoral (6 cores, InstBatch): escala zero; os panos novos estão em hd_cenografia_corrego.js.
function roupasHD(scene) {
  const feitos = [];
  scene.traverse((o) => {
    if (!o.isInstancedMesh) return; const m = o.material; if (!m?.isMeshStandardMaterial || m.map || !ROUPAS.has(m.color.getHex())) return;
    const a = o.instanceMatrix.array, copia = a.slice();
    for (let i = 0; i < o.count; i++) for (let j = 0; j < 12; j++) a[i * 16 + j] = 0;
    o.instanceMatrix.needsUpdate = true; feitos.push(() => { a.set(copia); o.instanceMatrix.needsUpdate = true; });
  });
  return () => { for (const f of feitos) f(); };
}
// Sacos de lixo autorais (3 dodecaedros de cor pura; tabela em hd_cenografia_corrego.js): esfera lisa lia como pneu. Achata
// (y × 0,8), varia o tamanho por saco e gira; o nó do topo é da cenografia e as pregas do sacoHD. Chave por cor original.
function sacosHD(scene) {
  const feitos = [];
  scene.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.geometry?.type !== 'DodecahedronGeometry') return;
    const m = o.material; if (!m?.isMeshStandardMaterial || m.map) return;
    const e = SACOS_AUTORAIS.find((s) => s[4] === (m.userData.hdChave || chaveDe(m))); if (!e) return;
    const esc = o.scale.clone(), ry = o.rotation.y, sz = e[3];
    // e[6] = some: o trio preto idêntico lia como bombas; ficam 1 saco preto + sacolas claras/papelão/tijolo da cenografia.
    if (e[6]) o.scale.set(0, 0, 0); else o.scale.set(esc.x * sz, esc.y * .8 * sz, esc.z * sz); o.rotation.y = ry + sz * 2.1; o.updateMatrixWorld(true);
    feitos.push(() => { o.scale.copy(esc); o.rotation.y = ry; o.updateMatrixWorld(true); });
  });
  return () => { for (const f of feitos) f(); };
}
// Gatos autorais (map_corrego.js: caixas de 3 cm a 6,4–7,7 m entre POSTES, cor pura 0x1d1b19) que cruzam a travessia alta
// (5,6 m) com menos de 2,6 m de folga somem: eram o cabo a 1,2 m do piso que a pose `alto` mostrava. Os cabos da cenografia
// (isolador a isolador, folga garantida) ficam no lugar deles. Os demais gatos autorais continuam.
function gatosHD(scene) {
  const feitos = [], c = new THREE.Vector3();
  scene.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || !o.visible) return;
    const m = o.material; if (!m?.isMeshStandardMaterial || m.map || m.color.getHex() !== 0x1d1b19) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox; if (!bb) return;
    const L = bb.max.z - bb.min.z; if (bb.max.x - bb.min.x > .06 || bb.max.y - bb.min.y > .06 || L < 2) return;
    o.getWorldPosition(c); const dx = Math.sin(o.rotation.y), dz = Math.cos(o.rotation.y), pts = [];
    for (let i = 0; i <= 24; i++) { const t = (i / 24 - .5) * L; pts.push({ x: c.x + dx * t, y: c.y, z: c.z + dz * t }); }
    if (folgaPass(pts)) return;
    o.visible = false; feitos.push(() => { o.visible = true; });
  });
  return () => { for (const f of feitos) f(); };
}
// Luz: o hemisfério do look (céu 0xd8b89a / chão 0x4a3830) esmagava a sombra em preto quente. Sobe e esfria o
// hemisfério; o sol (e scene.userData.__sf.dir) não muda.
function luzHD(scene, { hemi = 1.45, ceu = 0xc3ccd6, chao = 0x6b625a, sol = 1 } = {}) {
  let s = null, h = null; scene.traverse((o) => { if (o.isDirectionalLight && o.castShadow) s = o; if (o.isHemisphereLight) h = o; });
  if (!h) return () => {};
  const antes = { hemi: h.intensity, ceu: h.color.getHex(), chao: h.groundColor.getHex(), sol: s?.intensity };
  h.intensity = antes.hemi * hemi; h.color.setHex(ceu); h.groundColor.setHex(chao); if (s) s.intensity = antes.sol * sol;
  return () => { h.intensity = antes.hemi; h.color.setHex(antes.ceu); h.groundColor.setHex(antes.chao); if (s) s.intensity = antes.sol; };
}

export function aplicaCorregoHD(scene, renderer, opts = {}) {
  const q = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
  const liga = (k, flag) => opts[k] !== false && q.get(flag) !== '0';
  const o = { texturas: opts.texturas !== false,
    madeira: liga('madeira', 'hdmadeira'), chao: liga('chao', 'hdchao'), mato: liga('mato', 'hdmato'),
    reboco: liga('reboco', 'hdreboco'), canal: liga('canal', 'hdcanal'), bloco: liga('bloco', 'hdbloco'), janela: liga('janela', 'hdjanela'),
    eletro: liga('eletro', 'hdeletro'), espuma: liga('espuma', 'hdespuma'), travessia: liga('travessia', 'hdtravessia'), poca: opts.poca !== false && q.get('hdpoca') !== '0' };
  // Cenografia sem colisão (hd_cenografia_corrego.js). Desliga tudo: opts.cenografia === false ou ?hdcen=0;
  // por item: opts.cenografia.{postes,...} === false ou ?hdcen=postes,fios (só os listados). `guarda` (tubos da rampa da
  // travessia) só existe com a travessia de concreto: o shader da guarda descarta a mureta da rampa quando ela entra.
  const ITENS = ['postes', 'fachadas', 'lajes', 'telhados', 'canal', 'margem', 'varais', 'roupas', 'sacos', 'toldos', 'comercio', 'guias', 'skyline', 'portoes', 'becos', 'guarda'];
  const qCen = q.get('hdcen'), soEstes = qCen && qCen !== '0' && qCen !== '1' ? qCen.split(',') : null;
  const oCen = opts.cenografia === false || qCen === '0' ? null : { ...(opts.cenografia || {}) };
  if (oCen && soEstes) for (const k of ITENS) if (!soEstes.includes(k)) oCen[k] = false;
  if (oCen && !o.canal) { oCen.canal = false; oCen.margem = false; }
  const guardaCen = !!oCen && oCen.guarda !== false && o.travessia; if (oCen) oCen.guarda = guardaCen;
  const antes = [], aniso = [], feitos = new WeakSet(), marcados = new Set(), casados = new Set(), desfazVaos = [], criadas = [];
  const U = { janelas: { value: null }, portas: { value: null } };
  let vivo = true, tempo = 0;
  const aplica = (m, r, obj) => {
    antes.push({ m, map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap, cor: m.color.getHex(), emissive: m.emissive.getHex(), roughness: m.roughness, metalness: m.metalness, opacity: m.opacity, ns: m.normalScale.x, vc: m.vertexColors, obc: m.onBeforeCompile, key: m.customProgramCacheKey });
    if (r.cor !== undefined) m.color.setHex(r.cor);
    if (r.rugosidade !== undefined) m.roughness = r.rugosidade;
    if (r.metal !== undefined) m.metalness = r.metal;
    if (r.opacidade !== undefined) m.opacity = r.opacidade;
    if (r.semMapa) { m.map = null; m.normalMap = null; m.roughnessMap = null; }
    if (r.janela) { if (!U.janelas.value) criadas.push(U.janelas.value = atlasJanelas(), U.portas.value = atlasPortas()); const d = marcaVaos(obj); if (d) desfazVaos.push(d); }
    if (r.concreto) m.emissive.setHex(0x000000);
    if (r.chao) chaoHD(m, o.poca); else if (r.reboco) rebocoHD(m); else if (r.bloco) blocoHD(m); else if (r.janela) janelaHD(m, U); else if (r.concreto) concretoHD(m, r); else if (r.chapa) chapaHD(m, r); else if (r.madeira) madeiraHD(m, r); else if (r.linhaDagua) linhaDaguaHD(m);
    // Cor pura com shader próprio: ?hdeletro=0 deixa só a cor/rugosidade da regra (fallback chapado, nunca o material original).
    else if (r.geladeira) { if (o.eletro) geladeiraHD(m); } else if (r.galvanizado) { if (o.eletro) galvanizadoHD(m); } else if (r.saco) sacoHD(m); else if (r.guarda) guardaHD(m, !guardaCen);
    for (const t of [m.map, m.normalMap]) if (t && t.anisotropy < 8) { aniso.push([t, t.anisotropy]); t.anisotropy = 8; t.needsUpdate = true; }
    // dispose() solta os programas antigos do material (o three guarda todas as variantes até lá).
    m.dispose(); m.needsUpdate = true;
  };
  // Casamento por chave; material cujo mapa ainda não chegou fica pendente e volta na próxima passada. O vão é o único
  // que precisa do mesh (atributos): se o mesmo material aparecer noutro mesh, este também ganha os atributos.
  const casa = () => { let pendentes = 0;
    scene.traverse((obj) => { if (!obj.isMesh || obj.isSkinnedMesh) return; for (const m of materiaisDe(obj)) { if (!m.isMeshStandardMaterial) continue;
      if (feitos.has(m)) { if (m.userData.hdChave === 'concrete_br|2b2a27' && o.janela) { const d = marcaVaos(obj); if (d) desfazVaos.push(d); } continue; }
      if (m.map && !nomeDe(m.map)) { pendentes++; continue; }
      const chave0 = chaveDe(m), chave = chave0 === 'tex_madeira|ffffff' && m.map.repeat.x === 1 && m.map.repeat.y === 1 ? `${chave0}|guarda` : chave0, r = REGRAS[chave]; feitos.add(m); m.userData.hdChave = chave; marcados.add(m);
      if (!r || (r.frente && !o[r.frente])) continue;
      casados.add(chave); aplica(m, r, obj); } });
    return pendentes; };
  if (o.texturas) { const t0 = performance.now(); const passo = () => { if (!vivo) return; if (casa() && performance.now() - t0 < 20000) tempo = setTimeout(passo, 300); }; passo(); }
  const cen = oCen ? cenografiaCorrego(scene, { ...oCen, mundo: opts.mundo || (typeof window !== 'undefined' ? window.__game?.world : null) }) : null;
  const desfazAgua = o.canal ? aguaHD(scene, o.espuma) : () => {}, desfazProps = o.texturas ? propsGLB(scene) : () => {};
  const desfazMato = o.mato && o.chao ? matoHD(scene, 6.5, !!cen && oCen.margem !== false) : () => {}, desfazRoupas = cen && oCen.roupas !== false ? roupasHD(scene) : () => {};
  const desfazSacos = cen && oCen.sacos !== false ? sacosHD(scene) : () => {}, desfazGatos = cen && oCen.postes !== false ? gatosHD(scene) : () => {};
  const desfazLuz = opts.luz === false || q.get('hdluz') === '0' ? () => {} : luzHD(scene, opts.luz || {});
  return { alvos: casados, cenografia: cen, desliga() {
    vivo = false; clearTimeout(tempo);
    for (const s of antes) { Object.assign(s.m, { map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, roughness: s.roughness, metalness: s.metalness, opacity: s.opacity, vertexColors: s.vc, onBeforeCompile: s.obc, customProgramCacheKey: s.key });
      s.m.color.setHex(s.cor); s.m.emissive.setHex(s.emissive); s.m.normalScale.set(s.ns, s.ns); s.m.dispose(); s.m.needsUpdate = true; }
    for (const [t, an] of aniso) { t.anisotropy = an; t.needsUpdate = true; }
    for (const m of marcados) delete m.userData.hdChave;
    for (const d of desfazVaos) d();
    for (const t of criadas) t.dispose();
    cen?.desliga(); desfazAgua(); desfazProps(); desfazMato(); desfazRoupas(); desfazSacos(); desfazGatos(); desfazLuz();
  } };
}
