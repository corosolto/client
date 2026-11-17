// Kit visual HD do Córrego, atrás de ?hd=1 (demo de gráficos, desligado por padrão). O mapa não nomeia materiais: cada
// regra casa por `arquivo da textura|cor` (REGRAS; a textura chega assíncrona, então o casamento repete até 20 s).
// Tudo volta em desliga(). Kill-switches: ?hdmadeira=0 ?hdchao=0 ?hdmato=0 ?hdreboco=0 ?hdcanal=0 ?hdbloco=0 ?hdjanela=0 ?hdeletro=0
// ?hdespuma=0 (espuma marrom da água) ?hdluz=0 ?hdtravessia=0 (tabuleiro de concreto + mureta de bloco no vão + grade de ferro chato
// na rampa: volta a madeira) ?hdcen=0 (ou ?hdcen=postes,fachadas = só estes); por item em
// opts.cenografia.{postes,fachadas,palafitas,lajes,telhados,canal,margem,varais,roupas,sacos,toldos,comercio,guias,skyline,portoes,becos,guarda}
// (margem=0 também deixa os tufos de capim onde estavam; postes=0 deixa os gatos autorais baixos sobre a travessia; sacos=0 deixa
// os sacos autorais redondos; guarda = tubos da rampa da travessia, só com hdtravessia). Poça/mancha úmida do chão agora é
// padrão: opts.poca === false ou ?hdpoca=0 desliga. ?hdcalcada=0: calçada/sarjeta pela lista fixa de |x| em vez do campo de
// distância às fachadas (DataTexture 384 × 640 lida dos colisores das casas; a única textura criada pelo kit além dos atlas).
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
//   paus de tampo, pilares da prancha)   tex_madeira|7a5a3a pilares da travessia (pilarHD, cor pura)   tex_zinco|ffffff telhados e barracos
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
  'concrete_br|b4ada0': { concreto: 'parede', cor: 0xe6e3dc, rodape: true },
  'concrete_br|8d8579': { concreto: 'parede', cor: 0xcdc8be, rodape: true },
  'concrete_br|9d968a': { concreto: 'parede', cor: 0xe2e0dc, ao: 0.30, ganho: 2.3, rodape: true },
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
  'tex_madeira|7a5a3a': { semMapa: true, cor: 0xa6a49e, rugosidade: .9, metal: 0, pilar: true, frente: 'madeira' },
  'tex_zinco|ffffff': { chapa: true, cor: 0xa09e99, ferrugem: .25 },
  '|8a6a4e': { cor: 0x5e5751, rugosidade: .85, metal: 0, frente: 'madeira' },
  '|7c6a52': { cor: 0x9a9ea2, rugosidade: .55, metal: .3, frente: 'madeira' },
  '|9d968a': { concreto: 'parede', cor: 0xdcdad5 },
  'canvas128|7a5a3c': { cor: 0x3e464c, rugosidade: .62, metal: 0, linhaDagua: true },
  'canvas128|d6d3cb': { semMapa: true, cor: 0x8a8d90, rugosidade: .5, metal: 0, geladeira: true },
  'canvas512|6b6350': { cor: 0x5e584a, rugosidade: .85, frente: 'canal' },
  // Alagado das pontas e poças: rugosidade alta (0,32 dava uma elipse branca de sol na ponta do canal, poses `ponte`/`alto`).
  'tex_agua_poluida|42543b': { cor: 0x2b3528, rugosidade: .74, metal: 0, frente: 'canal' },
  'tex_agua_poluida|8fc4b4': { cor: 0x5a7465, opacidade: .16, frente: 'canal' },
  'tex_agua_poluida|73927a': { cor: 0x435846, rugosidade: .55, metal: 0, frente: 'canal' },
  'tex_agua_poluida|c2e0d5': { cor: 0x6f8274, opacidade: .10, rugosidade: .5, frente: 'canal' },
  // Placas de espuma autorais (7 caixas + 4 bolhas, cor pura 0xf0ecd3 emissiva): nata oliva, 60 % afundada (afundaEspuma), molhado escuro.
  '|f0ecd3': { cor: 0x6b6752, opacidade: .85, rugosidade: .95, metal: 0, semEmissivo: true, espuma: true, frente: 'canal' },
  // Faixa de limo autoral (T.dirt = canvas512, 0x3e5c40): linha d'água de verdade; a tira do topo do muro é escondida (lip de 4 cm ao sol = linha branca).
  'canvas512|3e5c40': { cor: 0xffffff, rugosidade: .6, metal: 0, limo: true, frente: 'canal' },
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
// do passeio da beira e do beco A–B (|x| 6,55 / 13,3), calçada de concreto claro de 1,2 m no pé de CADA fachada (hdDs = campo
// de distância aos colisores das casas, campoFachadas; a guia geométrica de hd_cenografia_corrego.js fecha em 1,26 m) com junta a
// cada 1,2 m ao longo da fachada e sarjeta úmida logo fora da guia; só a viela A–B (|x| 12,2–15,1) é beco sem calçada, mais
// escuro e com AO no pé das paredes. Sem campo (sem colisores) volta a lista fixa de |x| (7,45 / 12,2 / 15,1 / 18,85 / 22,45),
// que nunca dava calçada à face −z do bar nem às faces do largo do spawn. Poça rasa (rugosidade 0,15, sem cubo) + mancha úmida.
// Albedo: piso_cor_rug tem média linear 0,12; com cor 0x96 o cimento ficava em 0,04 (mais ESCURO que o asfalto de 0,185, que
// era o que lia como "rua clara"). Agora cimento ≈ 0,19 em luminância pura com tinta fria (0,955/1/1,06: o sol 0xffc888 levava o
// neutro a R−B 19 e a sombra sob a rampa lia como terra) e asfalto 0,135. Grão: cada frequência (3 cm e 1,1 cm) some pelo seu
// próprio fwidth e a metade da amplitude — abaixo de 4 px por ciclo o ruído de 1 cm virava "sal" no laplaciano.
function chaoHD(m, poca, campo) {
  m.map = tex('piso_cor_rug'); m.normalMap = tex('piso_normal', false); m.roughnessMap = null; m.roughness = 1; m.normalScale.set(1.1, 1.1); m.color.setHex(0xffffff);
  m.onBeforeCompile = (s) => { mundo(s, 1.2);
    if (campo) { s.uniforms.hdFachadas = { value: campo }; s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D hdFachadas;'); }
    s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      float hdRug = sampledDiffuseColor.a, hdRel = 1.0; diffuseColor.a = 1.0;
      { vec2 hdP = vHdPos.xz; float hdFw = fwidth(hdP.x), hdAx = abs(vHdPos.x);
        float hdA = hdN(hdP * 0.071), hdB = hdN(hdP * 0.23 + 3.1), hdM = hdN(hdP * 0.9 + 7.0), hdF = hdN(hdP * 3.7);
        float hdFino = smoothstep(0.6, 0.15, hdFw * 9.0) * ((hdN(hdP * 6.5 + 1.0) - 0.5) * 0.22 + smoothstep(0.5, 0.12, hdFw * 17.0) * (hdN(hdP * 17.0 + 2.0) - 0.5) * 0.10);
        // hdDs = distância à fachada mais perto; hdAo corre ao longo dela (juntas da calçada), hdPerp afasta-se dela.
        ${campo ? `vec4 hdFd = texture2D(hdFachadas, (hdP + vec2(24.0, 40.0)) / vec2(48.0, 80.0)); float hdDs = hdFd.r * 4.0;
        vec2 hdFn = hdFd.gb * 2.0 - 1.0; hdFn = length(hdFn) > 0.2 ? normalize(hdFn) : vec2(1.0, 0.0);
        float hdAo = dot(hdP, vec2(-hdFn.y, hdFn.x)), hdPerp = dot(hdP, hdFn);`
        : `float hdDs = min(min(abs(hdAx - 7.45), abs(hdAx - 12.2)), min(min(abs(hdAx - 15.1), abs(hdAx - 18.85)), abs(hdAx - 22.45))), hdAo = vHdPos.z, hdPerp = hdAx;`}
        float hdBeco = smoothstep(12.0, 12.5, hdAx) * (1.0 - smoothstep(14.8, 15.3, hdAx));
        float hdCalc = (1.0 - smoothstep(1.18, 1.22 + hdFw * 1.5, hdDs)) * (1.0 - hdBeco);
        // Hierarquia: calçada (≤ 1,22 m) | guia clara de 15 cm | sarjeta úmida escura (1,37–1,85) | faixa de asfalto no meio da rua
        // (≥ 1,9 m de toda fachada, só entre as fileiras: |x| > 7, nunca na beira do canal). Rua estreita (beco) fica em cimento.
        float hdCentro = smoothstep(1.85, 2.3, hdDs) * smoothstep(6.6, 7.4, hdAx) * (1.0 - hdBeco);
        float hdAr = hdA * 0.8 + hdB * 0.2, hdRem = smoothstep(0.60, 0.64, hdAr) * hdCentro, hdCord = (1.0 - smoothstep(0.008, 0.02 + hdFw * 1.5, abs(hdAr - 0.625))) * hdCentro, hdAsf = hdCentro;
        vec3 hdC = vec3(dot(diffuseColor.rgb, ${LUMA})) * vec3(0.955, 1.0, 1.06) * 1.6 * (1.0 + hdFino);
        vec2 hdPl = vec2(hdP.x / 2.5, hdP.y / 3.0), hdFr = fract(hdPl), hdDl = min(hdFr, 1.0 - hdFr) * vec2(2.5, 3.0);
        float hdJunta = (1.0 - smoothstep(0.006, 0.014 + hdFw * 1.5, min(hdDl.x, hdDl.y))) * smoothstep(0.08, 0.02, hdFw);
        hdC *= mix(0.94, 1.05, hdH(floor(hdPl))) * (1.0 - 0.3 * hdJunta * (1.0 - hdCalc));
        // Calçada: placas de 1,2 m ao longo da fachada, +14 % mais clara e fria, junta própria; trinca e remendo ficam fora dela.
        { float hdCj = fract(hdAo / 1.2), hdCd = min(hdCj, 1.0 - hdCj) * 1.2, hdJc = (1.0 - smoothstep(0.006, 0.014 + hdFw * 1.5, hdCd)) * smoothstep(0.08, 0.02, hdFw);
          vec3 hdCalC = hdC * vec3(1.14, 1.15, 1.16) * mix(0.95, 1.05, hdH(vec2(floor(hdAo / 1.2), floor(hdPerp)))) * (1.0 - 0.3 * hdJc);
          hdC = mix(hdC, hdCalC, hdCalc); }
        float hdGuia = step(1.22, hdDs) * (1.0 - smoothstep(1.37, 1.37 + hdFw * 1.5, hdDs)) * (1.0 - hdBeco);
        hdC = mix(hdC, hdC * vec3(1.22, 1.24, 1.27), hdGuia);
        // Asfalto: luma ≈ 0,07 (≤ 45 % do cimento 0,19), remendo de asfalto velho mais claro e cinza, cordão de piche na borda.
        vec3 hdAsfC = vec3(0.068, 0.071, 0.078) * (0.85 + 0.3 * hdM) * (1.0 + hdFino * 0.5);
        hdAsfC = mix(hdAsfC, vec3(0.112, 0.112, 0.116) * (0.9 + 0.2 * hdF), hdRem);
        hdC = mix(hdC, hdAsfC, hdCentro) * (1.0 - 0.35 * hdCord);
        float hdBrita = smoothstep(0.68, 0.76, hdN(hdP * 1.3 + 11.0)) * (1.0 - hdAsf) * (1.0 - hdGuia);
        hdC = mix(hdC, hdC * 0.85 * (0.9 + 0.2 * hdF), hdBrita * 0.6);
        float hdCan = 1.0 - smoothstep(0.10, 0.14 + hdFw, min(abs(hdAx - 6.55), abs(hdAx - 13.3)));
        hdC = hdUmido(hdC, 0.5 * hdCan) * (1.0 - 0.28 * hdCan * (0.7 + 0.3 * hdM));
        float hdSar = smoothstep(1.37, 1.41 + hdFw * 1.5, hdDs) * (1.0 - smoothstep(1.70, 1.95, hdDs)) * (1.0 - hdBeco) * (0.7 + 0.3 * hdN(vec2(hdAo * 0.7, hdPerp)));
        hdC = hdUmido(hdC, 0.6 * hdSar) * (1.0 - (0.40 + 0.14 * hdM) * hdSar);
        float hdSarj = (1.0 - smoothstep(0.01, 0.03 + hdFw * 1.5, abs(hdDs - 1.385))) * (1.0 - hdBeco);
        hdC *= 1.0 - 0.3 * hdSarj;
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
  m.customProgramCacheKey = () => `corrego-hd-chao13-${poca ? 1 : 0}-${campo ? 1 : 0}`;
}
// Campo de distância às fachadas que o chão lê (hdFachadas): colisores de casa (base ≤ 1,1 m, topo ≥ 2,2 m, lado ≥ 1,2 m, entre
// o passeio da beira e o muro externo — o corpo de cada casa, sobrado e barraco de passagem; não os pilares, postes, muro e
// entulho), 8 px/m sobre 48 × 80 m: R = distância (0–4 m, 1,6 cm por passo), GB = normal da fachada mais perta (as juntas da
// calçada correm ao longo dela). Mesma rotação de colRot/mundoDe (a = cos, b = sin). ~1 MB, sem disco, disposto em desliga().
function campoFachadas(cols) {
  const PX = 8, W = 48 * PX, H = 80 * PX, d = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) { d[i * 4] = 255; d[i * 4 + 1] = 128; d[i * 4 + 2] = 128; d[i * 4 + 3] = 255; }
  let n = 0;
  for (const c of cols || []) {
    if (!(c.minY <= 1.1 && c.maxY >= 2.2)) continue;
    const cx = c.cx ?? (c.minX + c.maxX) / 2, cz = c.cz ?? (c.minZ + c.maxZ) / 2, hx = c.hx ?? (c.maxX - c.minX) / 2, hz = c.hz ?? (c.maxZ - c.minZ) / 2, cs = c.cos ?? 1, sn = c.sin ?? 0;
    if (Math.max(hx, hz) < .6 || Math.min(hx, hz) < .07 || Math.abs(cx) < 6 || Math.abs(cx) > 23.5 || Math.abs(cz) > 39.5) continue;
    n++;
    const i0 = Math.max(0, Math.floor((c.minX + 20) * PX)), i1 = Math.min(W - 1, Math.ceil((c.maxX + 28) * PX));
    const j0 = Math.max(0, Math.floor((c.minZ + 36) * PX)), j1 = Math.min(H - 1, Math.ceil((c.maxZ + 44) * PX));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const wx = (i + .5) / PX - 24 - cx, wz = (j + .5) / PX - 40 - cz, lx = wx * cs - wz * sn, lz = wx * sn + wz * cs;
      const qx = Math.max(Math.abs(lx) - hx, 0), qz = Math.max(Math.abs(lz) - hz, 0), dist = Math.hypot(qx, qz);
      const b = Math.min(255, Math.round(dist * 63.75)), k = (j * W + i) * 4;
      if (b >= d[k]) continue;
      let nx = qx * Math.sign(lx), nz = qz * Math.sign(lz);
      if (dist < 1e-6) { if (hx - Math.abs(lx) < hz - Math.abs(lz)) { nx = Math.sign(lx) || 1; nz = 0; } else { nx = 0; nz = Math.sign(lz) || 1; } }
      const L = Math.hypot(nx, nz); nx /= L; nz /= L;
      d[k] = b; d[k + 1] = Math.round(128 + 127 * (nx * cs + nz * sn)); d[k + 2] = Math.round(128 + 127 * (nz * cs - nx * sn));
    }
  }
  if (!n) return null;
  const t = new THREE.DataTexture(d, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.name = 'hd-fachadas'; t.needsUpdate = true;
  return t;
}

// Concreto: fôrma (paredes, pilares das casas, postes, geladeira do canal) ou piso (canal). Mancha macro/média, grão,
// escorrido e pé sujo; o canal ganha linha d'água (limo até 45 cm acima da lâmina de −1,61 m, crosta clara, submerso escuro)
// e beiço sujo na aresta da margem; 'entulho' (manilha, caco, saco) ganha só a linha d'água e o pé sujo, esteja onde estiver.
const CANAL = `float hdYa = hdY + 1.61;
  float hdLimo = (1.0 - smoothstep(0.22, 0.38, hdYa)) * smoothstep(-0.4, -0.1, hdYa) * (0.75 + 0.25 * hdN(vec2(hdQ.x * 2.1, hdYa * 4.0))) * (1.0 - hdPiso);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.11, 0.13, 0.07) * (0.7 + 0.6 * hdMedio), hdLimo * 0.88);
  float hdCrosta = smoothstep(0.42, 0.5, hdYa) * (1.0 - smoothstep(0.55, 0.72, hdYa)) * smoothstep(0.35, 0.6, hdN(vec2(hdQ.x * 0.9, 2.0))) * (1.0 - hdPiso);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.60, 0.52), hdCrosta * 0.5);
  float hdNivel = smoothstep(0.12, 0.17, hdYa) * (1.0 - smoothstep(0.24, 0.32, hdYa)) * (1.0 - hdPiso) * (0.75 + 0.25 * hdN(vec2(hdQ.x * 1.4, 3.0)));
  diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.6 * hdNivel) * (1.0 - 0.38 * hdNivel);
  float hdSub = 1.0 - smoothstep(-0.15, 0.0, hdYa); diffuseColor.rgb *= 1.0 - 0.45 * hdSub; hdRug = mix(hdRug, 0.5, hdSub);
  float hdBeico = max(smoothstep(-0.35, -0.02, hdY) * (1.0 - hdPiso), hdPiso * step(-0.05, hdY) * (1.0 - smoothstep(3.1, 3.9, abs(vHdPos.x))) * (0.6 + 0.4 * hdN(vHdPos.xz * 0.8)));
  diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.45 * hdBeico) * (1.0 - 0.26 * hdBeico);
  float hdMancha = hdPiso * smoothstep(0.55, 0.75, hdN(vHdPos.xz * 0.35 + 9.0)); diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.4 * hdMancha) * (1.0 - 0.2 * hdMancha); hdRug = mix(hdRug, 0.35, hdMancha * 0.5);
  // Topo do muro do canal: fosco (o alfa do piso_cor_rug dava brilho ao sol = linha branca de 1 px a 20 m) e AO de 8 cm na aresta.
  float hdTopo = hdPiso * step(-0.05, hdY); hdRug = mix(hdRug, max(hdRug, 0.88), hdTopo);
  diffuseColor.rgb *= 1.0 - 0.3 * hdTopo * (1.0 - smoothstep(3.0, 3.1, abs(vHdPos.x)));`;
const FUNDO = `float hdSub = 1.0 - smoothstep(-1.66, -1.55, hdY); diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.55, 0.52, 0.40), hdSub) * (1.0 - 0.25 * hdSub); hdRug = mix(hdRug, 0.45, hdSub);
  float hdLodo = smoothstep(0.5, 0.7, hdN(vHdPos.xz * 0.4 + 2.0)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.10, 0.11, 0.07), hdLodo * 0.6 * hdSub);`;
const PE = `float hdSuj = smoothstep(0.55, 0.04, hdY) * (1.0 - hdCorpoF(hdY)) * (0.5 + 0.5 * hdN(hdQ * 1.3)) * (1.0 - hdPiso);
  diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.7 * hdSuj) * (1.0 - 0.35 * hdSuj);`;
// Rodapé pintado de 40 cm, borda dura, cinza-escuro frio (embasamento e pilares das casas; só acima do nível da rua: a mureta da
// rampa do canal fica em y < 0 e não entra). Faz a base da parede ler como acabamento, não como mancha de borda macia.
const RODAPE = `float hdRodP = step(-0.02, hdY) * (1.0 - smoothstep(0.40, 0.41 + fwidth(hdY) * 1.5, hdY)) * (1.0 - hdPiso);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.075, 0.078, 0.080) * (0.85 + 0.3 * hdN(hdQ * 6.0)) * hdGrao(hdQ), 0.85 * hdRodP); hdRug = mix(hdRug, 0.8, hdRodP);`;
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
const laje = (umi = '1.0', cru = false) => `{ vec2 hdG = vHdPos.xz / 1.2, hdFr = fract(hdG), hdPx = fwidth(hdG), hdDj = min(hdFr, 1.0 - hdFr) * 1.2; float hdPxM = max(hdPx.x, hdPx.y);
  float hdJunta = (1.0 - smoothstep(0.004, 0.010 + hdPxM * 1.8, min(hdDj.x, hdDj.y))) * smoothstep(0.25, 0.08, hdPxM);
  float hdRem = step(0.93, hdH(floor(hdG)));
  vec3 hdQue = vec3(0.218, 0.240, 0.260) * mix(0.92, 1.06, hdH(floor(hdG) + 5.0)) * (0.90 + 0.2 * hdN(vHdPos.xz * 0.7 + 3.0)) * (0.95 + 0.1 * hdMedio) * hdGrao(vHdPos.xz);
  hdQue = mix(hdQue, vec3(0.25, 0.27, 0.29) * (0.9 + 0.2 * hdN(vHdPos.xz * 2.7)), hdRem) * (1.0 - 0.35 * hdJunta);
  ${cru ? `// Tabuleiro: concreto cru (40 % da fôrma projetada, relevo a 55 %), não cimento queimado liso — lia como cartão bege chapado.
  hdQue = mix(hdQue, diffuseColor.rgb * 2.4 * vec3(0.96, 1.0, 1.04), 0.4);` : ''}
  float hdUmi = smoothstep(0.6, 0.85, hdN(vHdPos.xz * 0.55 + 11.0)) * (0.6 + 0.4 * hdN(vHdPos.xz * 3.1)) * ${umi};
  hdQue = hdUmido(hdQue, 0.5 * hdUmi) * (1.0 - 0.22 * hdUmi);
  diffuseColor.rgb = mix(diffuseColor.rgb, hdQue, hdPiso); hdRug = mix(hdRug, mix(0.72, 0.5, hdUmi), hdPiso); hdRel = mix(hdRel, ${cru ? '0.55' : '0.3'}, hdPiso); }`;
// Tabuleiro da travessia (x −5…5, z −11 ± 1,25): 2 juntas de dilatação em x = ±1,7, ferrugem escorrendo da base de cada montante
// (x = 1,4k − 0,7 nas duas bordas) para o meio, e poça seca (anel escuro, miolo claro). Só no plano horizontal de cima.
// Rampas da travessia (plano inclinado, 0,7 < n.y < 0,95, z −11 ± 1,3): ranhuras antiderrapantes transversais de 2–3 cm a cada
// 30 cm ao longo de |x| (decal escuro, some por fwidth). A rampa lisa a 30° lia como escorregador (`rua`); os degraus do pé são da cenografia.
const RANHURA = `{ float hdRp = step(0.7, hdGn.y) * (1.0 - step(0.95, hdGn.y)) * step(abs(vHdPos.z + 11.0), 1.3), hdAxr = abs(vHdPos.x), hdFwr = fwidth(hdAxr);
  float hdRan = (1.0 - smoothstep(0.010, 0.016 + hdFwr * 1.5, abs(fract(hdAxr / 0.30) - 0.5) * 0.30)) * hdRp * smoothstep(0.08, 0.03, hdFwr);
  diffuseColor.rgb *= 1.0 - 0.4 * hdRan; hdRug = mix(hdRug, 0.95, hdRan); }`;
const TABULEIRO = `{ float hdPl = step(0.95, hdGn.y) * step(abs(vHdPos.z + 11.0), 1.3) * step(abs(vHdPos.x), 5.1);
  float hdDil = (1.0 - smoothstep(0.012, 0.02 + fwidth(vHdPos.x) * 1.5, abs(abs(vHdPos.x) - 1.7))) * hdPl;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.05, 0.05), 0.85 * hdDil); hdRug = mix(hdRug, 0.95, hdDil);
  float hdPu = fract((vHdPos.x + 0.7) / 1.4) * 1.4, hdDx = min(abs(hdPu - 0.03), 1.4 - abs(hdPu - 0.03)), hdDz = 1.25 - abs(vHdPos.z + 11.0);
  float hdFerT = (smoothstep(0.24, 0.05, length(vec2(hdDx, max(hdDz, 0.0)))) * 0.7 + smoothstep(0.10, 0.02, hdDx + (hdN(vec2(vHdPos.x * 9.0, vHdPos.z * 3.0)) - 0.5) * 0.08) * (1.0 - smoothstep(0.1, 0.8, hdDz)) * 0.55) * hdPl;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.30, 0.13, 0.05) * (0.8 + 0.4 * hdN(vHdPos.xz * 15.0)), min(1.0, hdFerT) * 0.8);
  float hdPn = hdN(vHdPos.xz * 0.5 + 21.0), hdAnel = smoothstep(0.50, 0.55, hdPn) * (1.0 - smoothstep(0.58, 0.63, hdPn)) * hdPl, hdMiolo = smoothstep(0.58, 0.66, hdPn) * hdPl;
  diffuseColor.rgb *= (1.0 - 0.32 * hdAnel) * (1.0 + 0.06 * hdMiolo); hdRug = mix(hdRug, 0.6, hdMiolo * 0.5); }`;
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
  // Face inferior vista de baixo (hdGn.y < −0,5, a normal geométrica aponta para a câmera): albedo × 2, AO de vértice 0,1, sem
  // escorrido e um rebatimento falso (emissivo 10 % do albedo): só o hemisfério de chão chega lá e com ×1,6 ainda lia preta.
  const MANTA = `{ vec2 hdMc = floor(vHdPos.xz / 1.2); float hdPlano = step(0.95, hdGn.y), hdFaixa = abs(vHdPos.z + 11.0);
    float hdManta = 0.0; // manta asfáltica desligada: sob o sol quente lia como placas de terra em xadrez (r17/r18); fica só o cimento queimado com juntas.
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.070, 0.069, 0.070) * (0.85 + 0.3 * hdN(vHdPos.xz * 6.0)), hdManta); hdRug = mix(hdRug, 0.6, hdManta); hdRel = mix(hdRel, 0.2, hdManta);
    diffuseColor.rgb *= 1.0 - 0.14 * hdPlano * smoothstep(1.05, 1.22, hdFaixa) * step(hdFaixa, 1.3);
    hdBaixo = step(hdGn.y, -0.5); diffuseColor.rgb *= 1.0 + 1.0 * hdBaixo; }`;
  m.map = tex(piso || canal ? 'piso_cor_rug' : 'forma_color'); m.normalMap = tex(piso || canal ? 'piso_normal' : 'forma_normal', false); m.roughnessMap = null; m.roughness = 1; m.normalScale.set(1.3, 1.3);
  m.onBeforeCompile = (s) => { mundo(s, piso || canal ? 1.9 : 1.8);
    s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      float hdRug = ${piso || canal ? 'sampledDiffuseColor.a' : '0.92'}, hdRel = 1.0, hdBaixo = 0.0; diffuseColor.a = 1.0;
      { float hdY = vHdPos.y; vec3 hdGn = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))); float hdPiso = step(0.7, ${tabuleiro ? 'hdGn.y' : 'abs(hdGn.y)'});
        vec2 hdQ = ${tabuleiro ? 'abs(hdGn.y) > 0.7 ? vHdPos.xz : vec2(vHdPos.x + vHdPos.z, hdY)' : 'vec2(vHdPos.x + vHdPos.z, hdY)'};
        ${parede ? `diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, ${LUMA})), diffuseColor.rgb, 0.5) * ${ganho.toFixed(2)};` : ''}
        float hdMacro = hdN(hdQ * 0.55) * 0.6 + hdN(hdQ * 1.9) * 0.4, hdMedio = hdN(hdQ * 5.5) * 0.55 + hdN(hdQ * 13.0) * 0.45, hdCorpo = hdCorpoF(hdY);
        diffuseColor.rgb *= ${tabuleiro ? 'mix(0.92, 1.08, hdMacro)' : 'mix(mix(0.80, 1.10, hdMacro), mix(0.94, 1.04, hdMacro), hdCorpo)'} * mix(0.92, 1.06, hdMedio) * hdGrao(hdQ);
        ${parede ? laje(tabuleiro ? 'step(0.95, hdGn.y)' : '1.0', tabuleiro) : ''}${tabuleiro ? MANTA + TABULEIRO + RANHURA : ''}
        float hdEsc = smoothstep(0.64, 0.84, hdN(vec2(hdQ.x * 1.1 + hdN(hdQ * 0.31) * 2.0, hdY * 0.18))) * (1.0 - hdPiso) * (1.0 - hdBaixo) * ${canal ? 'smoothstep(-1.5, -0.15, hdY)' : 'smoothstep(1.9, 3.0, hdY)'};
        diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.5 * hdEsc) * (1.0 - 0.28 * hdEsc);
        ${canal ? CANAL : piso ? FUNDO : entulho ? LINHA : PE}${r.rodape ? RODAPE : ''} }`)
      .replace('#include <color_fragment>', parede ? aoMeio(tabuleiro ? `mix(${ao.toFixed(2)}, 0.10, hdBaixo)` : ao) : '#include <color_fragment>')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * hdRug;')
      .replace('#include <normal_fragment_maps>', NORMAL_REL);
    if (tabuleiro) s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * 0.10 * hdBaixo;'); };
  m.customProgramCacheKey = () => `corrego-hd-concreto13-${r.concreto}-${ao}-${ganho}-${r.rodape ? 1 : 0}`;
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
// Geladeira do canal (1,5 × 1,8 em x ±5,9 / z ±10) e caixa de energia do poste (matEletro, cor pura): leitura de função por face —
// FRENTE (voltada para as casas, +|x|): duas portas (freezer 1,22–1,74, porta 0,06–1,18) com borracha escura de 2,5 cm contornando
// cada uma, puxador vertical escuro de 4,5 cm em u = 0,55 e plaqueta; TRÁS (para o canal): serpentina do condensador (painel escuro
// 0,45–1,65 com tubos verticais a cada 3 cm) e nicho do compressor no pé; LADOS: friso fraco a 1,22 e amassado. Ferrugem no pé
// (0–0,3 m), nas borrachas e no condensador. Sem mapa, metalness 0 e sem AO de vértice. Antes lia como caixa metálica cinza chapada.
function geladeiraHD(m) {
  m.metalness = 0; m.vertexColors = false;
  m.onBeforeCompile = (s) => { mundo(s);
    s.fragmentShader = s.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float hdRug = 1.0;
      { float hdY = vHdPos.y; vec2 hdQ = vec2(vHdPos.x + vHdPos.z, hdY); float hdFw = fwidth(hdY);
        vec3 hdGs = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))), hdGn = abs(hdGs); float hdLado = 1.0 - step(0.7, hdGn.y);
        float hdSx = sign(vHdPos.x), hdFrente = step(0.5, hdGs.x * hdSx) * hdLado, hdTras = step(0.5, -hdGs.x * hdSx) * hdLado, hdLat = step(0.5, hdGn.z) * hdLado;
        float hdZc = vHdPos.z - 10.0 * floor(vHdPos.z / 10.0 + 0.5), hdXc = vHdPos.x - 5.9 * hdSx;
        float hdU = hdGn.x > hdGn.z ? hdZc : hdXc, hdFu = fwidth(hdU);
        float hdPainel = 1.0 + (hdN(hdQ * 0.9 + 4.0) - 0.5) * 0.14 + (hdN(hdQ * 7.0) - 0.5) * 0.06;
        float hdGel = step(abs(hdU), 0.76) * step(hdY, 1.9);
        float hdDiv = abs(hdY - 1.20), hdBorda = max(abs(hdU) - 0.70, max(hdY - 1.74, 0.06 - hdY));
        float hdBorr = hdFrente * hdGel * max(1.0 - smoothstep(0.0, 0.025 + hdFw * 1.5, abs(hdBorda)), 1.0 - smoothstep(0.012, 0.025 + hdFw * 1.5, hdDiv)) * step(hdBorda, 0.03);
        float hdPux = hdFrente * hdGel * (1.0 - smoothstep(0.02, 0.026 + hdFu * 1.5, abs(hdU - 0.55))) * (step(0.35, hdY) * step(hdY, 1.05) + step(1.30, hdY) * step(hdY, 1.66));
        float hdPlaca = hdFrente * hdGel * step(abs(hdU + 0.3), 0.09) * step(abs(hdY - 1.60), 0.02);
        float hdCond = hdTras * hdGel * step(abs(hdU), 0.58) * step(0.45, hdY) * step(hdY, 1.65);
        float hdTubo = hdCond * smoothstep(0.5, 0.15, hdFu / 0.03) * (1.0 - smoothstep(0.006, 0.010, abs(fract(hdU / 0.03) - 0.5) * 0.03));
        float hdNicho = hdTras * hdGel * step(abs(hdU), 0.55) * step(0.06, hdY) * step(hdY, 0.40);
        float hdComp = hdNicho * (1.0 - smoothstep(0.14, 0.17, length(vec2(hdU + 0.2, hdY - 0.22) * vec2(1.0, 1.4))));
        float hdFriso = hdLat * hdGel * (1.0 - smoothstep(0.010, 0.014 + hdFw * 1.5, abs(hdY - 1.22)));
        float hdFer = (1.0 - smoothstep(0.03, 0.32, hdY + (hdN(vec2(hdQ.x * 5.0, 2.0)) - 0.5) * 0.12)) * smoothstep(0.25, 0.6, hdN(hdQ * 6.0)) * hdLado;
        hdFer = max(hdFer, hdBorr * smoothstep(0.5, 0.75, hdN(vec2(hdQ.x * 9.0, 1.0))) * 0.7);
        hdFer = max(hdFer, (1.0 - smoothstep(0.0, 0.08, abs(abs(hdU) - 0.70))) * (1.0 - smoothstep(0.06, 0.5, hdY)) * smoothstep(0.4, 0.7, hdN(vec2(hdQ.x * 7.0, hdY * 3.0))) * hdFrente * hdGel);
        hdFer = max(hdFer, hdCond * smoothstep(0.55, 0.8, hdN(hdQ * 4.0)) * 0.6);
        diffuseColor.rgb *= hdPainel * (1.0 + (hdGrao(hdQ) - 1.0) * 0.5) * (1.0 - 0.6 * hdFriso) * (1.0 - 0.72 * hdBorr);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.09, 0.09, 0.095), 0.9 * hdCond); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.30, 0.30, 0.31), hdTubo);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.035, 0.035, 0.035), 0.92 * hdNicho); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.16, 0.15), hdComp);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.06, 0.06, 0.065), 0.85 * max(hdPux, hdPlaca));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.22, 0.10, 0.05) * (0.7 + 0.6 * hdN(hdQ * 15.0)), 0.85 * hdFer);
        hdRug = 1.0 + 0.6 * hdFer + 0.3 * hdBorr + 0.4 * hdCond - 0.3 * hdPux; }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = min(1.0, roughness * hdRug);'); };
  m.customProgramCacheKey = () => 'corrego-hd-geladeira3';
}
// Placas de espuma autorais na lâmina (−1,61): a parte abaixo da água escurece e esverdeia (afundaEspuma desce as caixas 60 %).
function espumaHD(m) {
  m.onBeforeCompile = (s) => { mundo(s);
    s.fragmentShader = s.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      { float hdSubE = 1.0 - smoothstep(-1.614, -1.606, vHdPos.y); vec2 hdQ = vHdPos.xz;
        diffuseColor.rgb *= (0.9 + 0.2 * hdN(hdQ * 9.0)) * (1.0 + (hdGrao(hdQ) - 1.0) * 0.5);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.45, 0.50, 0.40), hdSubE); }`); };
  m.customProgramCacheKey = () => 'corrego-hd-espuma1';
}
// Faixa de limo autoral na linha d'água (x ±2,94, y −1,96…−1,46): submerso escuro, limo verde-escuro com crosta clara no limite.
function limoHD(m) {
  m.map = null; m.metalness = 0;
  m.onBeforeCompile = (s) => { mundo(s);
    s.fragmentShader = s.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float hdRug = 1.0;
      { float hdYa = vHdPos.y + 1.61; vec2 hdQ = vec2(vHdPos.z, vHdPos.y);
        float hdSubL = 1.0 - smoothstep(-0.05, 0.02, hdYa);
        float hdLimo = 1.0 - smoothstep(0.26, 0.48, hdYa + (hdN(vec2(hdQ.x * 1.3, 1.0)) - 0.5) * 0.16);
        vec3 hdVerde = vec3(0.06, 0.09, 0.045) * (0.6 + 0.8 * hdN(hdQ * vec2(2.0, 9.0)));
        vec3 hdCrosta = vec3(0.30, 0.29, 0.24) * (0.8 + 0.4 * hdN(hdQ * vec2(3.0, 11.0)));
        diffuseColor.rgb = mix(hdCrosta, hdVerde, hdLimo) * (1.0 - 0.5 * hdSubL) * hdGrao(hdQ);
        hdRug = mix(1.25, 0.8, hdLimo) + 0.4 * hdSubL; }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = min(1.0, roughness * hdRug);'); };
  m.customProgramCacheKey = () => 'corrego-hd-limo1';
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
// Pilar da travessia (matMadeira, cor pura) lido como pilar de concreto: linha de fôrma a cada 1 m, mofo verde-escuro nos 45 cm
// de baixo (fora da faixa do corpo), escorrido de ferrugem da viga só acima de 2,1 m, tom por altura ±5 % e grão. Era tubo
// galvanizado com emenda a 1,5 m: lia como pilar liso (dpBloco 2,2).
function pilarHD(m) {
  m.onBeforeCompile = (s) => { mundo(s);
    s.fragmentShader = s.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float hdRug = 1.0;
      { float hdY = vHdPos.y; vec2 hdQ = vec2(vHdPos.x + vHdPos.z, hdY); float hdFw = fwidth(hdY);
        float hdTom = 1.0 + (hdN(vec2(hdQ.x * 1.7, hdY * 1.1)) - 0.5) * 0.10 + (hdN(hdQ * 9.0 + 2.0) - 0.5) * 0.05;
        float hdJ = fract(hdY), hdDj = min(hdJ, 1.0 - hdJ);
        float hdEm = (1.0 - smoothstep(0.004, 0.009 + hdFw * 1.5, hdDj)) * smoothstep(0.05, 0.01, hdFw);
        float hdMofo = (1.0 - smoothstep(0.12, 0.45, hdY + (hdN(vec2(hdQ.x * 3.0, 1.0)) - 0.5) * 0.12)) * (0.6 + 0.4 * hdN(hdQ * 6.0)) * step(-0.2, hdY);
        float hdFer = smoothstep(2.1, 2.7, hdY) * smoothstep(0.6, 0.8, hdN(vec2(hdQ.x * 13.0, hdY * 0.6))) * (0.5 + 0.5 * hdN(hdQ * 5.0));
        // Linha d'água dos pilares no leito (lâmina −1,61): submerso escuro, limo verde-escuro até 0,6 m acima com crosta clara no
        // limite, e escorrido escuro descendo da viga/laje (> 1,9 m). Antes o pilar chegava limpo à água (poses ponte e alto).
        float hdYa = hdY + 1.61, hdSubP = 1.0 - smoothstep(-0.06, 0.02, hdYa);
        float hdLimoP = (1.0 - smoothstep(0.30, 0.62, hdYa + (hdN(vec2(hdQ.x * 3.0, 5.0)) - 0.5) * 0.14)) * smoothstep(-0.35, -0.02, hdYa) * (0.7 + 0.3 * hdN(hdQ * 7.0));
        float hdCrostaP = smoothstep(0.55, 0.62, hdYa) * (1.0 - smoothstep(0.68, 0.80, hdYa)) * smoothstep(0.35, 0.6, hdN(vec2(hdQ.x * 1.2, 3.0)));
        float hdEscP = smoothstep(0.62, 0.82, hdN(vec2(hdQ.x * 9.0 + hdN(hdQ * 0.5) * 2.0, hdY * 0.25))) * smoothstep(1.9, 3.2, hdY);
        diffuseColor.rgb *= hdTom * (1.0 + (hdGrao(hdQ) - 1.0) * 0.6) * (1.0 - 0.35 * hdEm);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.07, 0.085, 0.06) * (0.7 + 0.6 * hdN(hdQ * 11.0)), 0.75 * hdMofo);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.26, 0.12, 0.05) * (0.7 + 0.6 * hdN(hdQ * 17.0)), 0.55 * hdFer);
        diffuseColor.rgb = hdUmido(diffuseColor.rgb, 0.6 * hdEscP) * (1.0 - 0.3 * hdEscP);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.07, 0.10, 0.05) * (0.7 + 0.6 * hdN(hdQ * 11.0)), 0.9 * hdLimoP);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.60, 0.50), 0.45 * hdCrostaP);
        diffuseColor.rgb *= 1.0 - 0.5 * hdSubP;
        hdRug = 1.0 + 0.3 * hdFer + 0.1 * hdMofo + 0.2 * hdLimoP - 0.35 * hdSubP; }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = min(1.0, roughness * hdRug);'); };
  m.customProgramCacheKey = () => 'corrego-hd-pilar2';
}
// Guarda-corpo da travessia alta (matGuarda: caixa de 0,9 × 0,1 m no vão e mureta de 0,55 m girada na rampa, sem sombra).
// Vão (|x| ≤ 5): a caixa inteira vira MURETA DE BLOCO cerâmico 39 × 19 com cinta de concreto de 12 cm no topo (a cenografia põe
// a pingadeira). Rampa (só com rampa = true, sem a cenografia `guarda`): GRADE DE FERRO CHATO cinza-chumbo com tinta azul
// descascada e ferrugem no pé — corrimão chato 0,80–0,85, barra inferior 0,10–0,14, barras verticais de 2,5 cm a cada 14 cm e
// montantes a cada 1,4 m (o último em |x| 13,52); nunca abaixo do piso (pisoPass de map_corrego.js). Com a cenografia ligada
// (rampa = false) a mureta da rampa é descartada e hd_cenografia_corrego.js põe a grade de verdade. Nada amarelo: o tubular amarelo
// industrial era a maior âncora de "não-favela" nas quatro poses.
function guardaHD(m, rampa) {
  m.onBeforeCompile = (s) => { mundo(s);
    s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      float hdRug = 1.0, hdMetal = 0.0;
      { float hdAx = abs(vHdPos.x), hdPiso = hdAx <= 5.0 ? 5.6 : hdAx <= 13.6 ? 5.6 * (1.0 - (hdAx - 5.0) / 8.6) : 0.0, hdAlt = vHdPos.y - hdPiso;
        ${rampa ? '' : 'if (hdAx > 4.95) discard;'}
        vec2 hdQ = vec2(vHdPos.x, vHdPos.y); vec3 hdGn = abs(normalize(cross(dFdx(vHdPos), dFdy(vHdPos)))); float hdTopoF = step(0.7, hdGn.y);
        // Corte em 4,95 (não 5,05): a cunha da mureta autoral da rampa (começa em |x| 5, girada) entrava na face de tijolo e lia
        // como fiada diagonal; o pilarete de concreto da cenografia (|x| 4,93–5,13) cobre a ponta. Fiada ao longo do eixo de mundo da face.
        if (hdAx <= 4.95) {
          float hdCinta = step(0.78, hdAlt), hdBu = hdGn.x > hdGn.z ? vHdPos.z : vHdPos.x;
          vec2 hdB = vec2(hdBu / 0.40 + 0.5 * floor(hdAlt / 0.20), hdAlt / 0.20), hdBf = abs(fract(hdB) - 0.5);
          float hdJa = smoothstep(0.5, 0.15, fwidth(hdB.y));
          float hdJ = (1.0 - smoothstep(0.006, 0.012, min((0.5 - hdBf.x) * 0.40, (0.5 - hdBf.y) * 0.20))) * hdJa;
          vec3 hdBl = vec3(0.40, 0.15, 0.07) * (0.85 + 0.3 * hdH(floor(hdB))) * (0.9 + 0.2 * hdN(hdQ * 9.0));
          vec3 hdCor = mix(hdBl, vec3(0.42, 0.41, 0.38) * (0.9 + 0.2 * hdN(hdQ * 5.0)), hdJ * 0.9);
          hdCor = mix(hdCor, vec3(0.36, 0.35, 0.32) * (0.9 + 0.2 * hdN(hdQ * 4.0)), max(hdCinta, hdTopoF));
          float hdEscB = smoothstep(0.6, 0.8, hdN(vec2(hdQ.x * 5.0, hdAlt * 0.4))) * (1.0 - hdCinta);
          diffuseColor.rgb = hdCor * (1.0 - 0.25 * hdEscB) * hdGrao(hdQ); hdRug = 0.95;
        } else {
          float hdTopo = step(0.80, hdAlt) * (1.0 - step(0.86, hdAlt)), hdBase = step(0.10, hdAlt) * (1.0 - step(0.16, hdAlt));
          float hdPb = fract((vHdPos.x + 0.10) / 0.20) * 0.20, hdBarra = (1.0 - step(0.04, hdPb)) * step(0.10, hdAlt) * step(hdAlt, 0.86);
          float hdPu = fract((vHdPos.x + 0.7) / 1.4) * 1.4, hdPoste = max(1.0 - step(0.05, hdPu), step(abs(hdAx - 13.52), 0.03)) * step(0.0, hdAlt) * step(hdAx, 13.6);
          if (hdTopo + hdBase + hdBarra + hdPoste < 0.5) discard;
          float hdTinta = smoothstep(0.35, 0.5, hdN(hdQ * vec2(2.2, 4.0) + 2.0) * 0.65 + hdN(hdQ * 11.0) * 0.35);
          vec3 hdChumbo = vec3(0.075, 0.08, 0.09) * (0.85 + 0.3 * hdN(hdQ * vec2(5.0, 9.0)));
          vec3 hdAzul = vec3(0.07, 0.15, 0.26) * (0.85 + 0.3 * hdN(hdQ * 13.0));
          diffuseColor.rgb = mix(hdChumbo, hdAzul, 0.8 * hdTinta);
          float hdFerr = min(1.0, smoothstep(0.22, 0.02, hdAlt) * 0.85 + smoothstep(0.62, 0.8, hdN(hdQ * vec2(3.0, 11.0) + 5.0)) * 0.5);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.20, 0.09, 0.04), hdFerr);
          hdMetal = (1.0 - 0.8 * hdTinta) * (1.0 - 0.7 * hdFerr); hdRug = mix(0.55, 0.8, hdTinta) + 0.25 * hdFerr;
        } }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = min(1.0, roughness * hdRug * 2.0);')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = min(1.0, metalness * 5.0 * hdMetal);'); };
  m.customProgramCacheKey = () => `corrego-hd-guarda3-${rampa ? 1 : 0}`;
}

// Chapa ondulada (worn_corrugated_iron, 13 ondas/m = 7,6 cm): a onda desce o caimento lido da normal; no telhado folhas
// de 1,0 × 2,2 m com sombra de sobreposição e tom por folha (legível de longe, onde a onda some no mip); na parede painel
// por ruído. Ferrugem só em mancha. Na parede, dentro da faixa do corpo (hdCorpoF), o mapa vai à sua média local (mip +5, grão
// ±7 %), sem ferrugem e com painel a 30 %: a mancha preta do worn_corrugated_iron tinha tamanho de torso na casinha (`alto`).
// Telhado: FIBROCIMENTO cinza-claro (luma neutra-fria × 1,45 a 85 %, metal 0, ferrugem à metade) com a onda desenhada no albedo
// (13/m, some por fwidth) — o marrom liso de longe era o mapa + metal 0,35 + 60 % de neutralização. `U.cerA/cerB` (6 caixas
// orientadas, preenchidas pela cenografia: 1 telhado em 4 + a palafita do centro da pose `alto`) viram TELHA CERÂMICA: fiada de
// 38 cm com sombra de sobreposição, onda de 20 cm, telha velha escura e musgo no caimento (grão some por fwidth, sem cintilar).
function chapaHD(m, r, U) {
  m.map = tex('chapa_color'); m.normalMap = tex('chapa_normal', false); m.roughnessMap = null; m.roughness = .66; m.metalness = .35; m.normalScale.set(.6, .6);
  m.onBeforeCompile = (s) => { mundo(s, 1.0, 'caimento');
    s.uniforms.hdCerA = U.cerA; s.uniforms.hdCerB = U.cerB;
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec4 hdCerA[6]; uniform vec4 hdCerB[6];')
      .replace('#include <map_fragment>', `#include <map_fragment>
      float hdMetal = 1.0, hdRug = 1.0, hdRel = 1.0; diffuseColor.a = 1.0;
      { vec2 hdQ = vec2(vHdPos.x + vHdPos.z, vHdPos.y);
        vec3 hdGn = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))); float hdTelha = smoothstep(0.35, 0.6, abs(hdGn.y)), hdCorpoC = hdCorpoF(vHdPos.y) * (1.0 - hdTelha);
        { vec3 hdMedC = diffuse * texture2D(map, vMapUv, 5.0).rgb; diffuseColor.rgb = mix(diffuseColor.rgb, hdMedC * clamp(diffuseColor.rgb / max(hdMedC, vec3(1e-4)), 0.93, 1.07), hdCorpoC); }
        float hdPainel = hdN(vHdPos.xz * 0.35 + vec2(vHdPos.y * 0.3, 0.0)), hdF2 = hdN(vec2(hdQ.x * 1.3 + 4.1, hdQ.y * 2.2));
        float hdFerr = smoothstep(0.60, 0.82, hdN(hdQ * 0.9 + 2.0) * 0.6 + hdF2 * 0.4) * (1.0 - hdCorpoC) * (1.0 - 0.5 * hdTelha);
        vec2 hdFolha = vec2(vMapUv.x, vMapUv.y / 2.2), hdFr = fract(hdFolha), hdPx = fwidth(hdFolha);
        float hdEmV = 1.0 - smoothstep(0.0, 0.02 + hdPx.y * 2.0, hdFr.y * 2.2), hdEmU = 1.0 - smoothstep(0.0, 0.012 + hdPx.x * 2.0, hdFr.x);
        float hdTom = mix(1.0 + (hdPainel - 0.5) * 0.36 * (1.0 - 0.7 * hdCorpoC), mix(0.88, 1.10, hdH(floor(hdFolha))), hdTelha);
        diffuseColor.rgb *= hdTom * (1.0 - hdTelha * (0.45 * hdEmV + 0.25 * hdEmU));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.22, 0.12, 0.07) * (0.7 + 0.6 * hdF2), ${r.ferrugem.toFixed(2)} * hdFerr);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, ${LUMA})) * vec3(0.96, 1.0, 1.05) * 1.45, 0.85 * hdTelha * (1.0 - hdFerr));
        float hdOnda = cos(vMapUv.x * 81.68) * smoothstep(0.5, 0.12, hdPx.x * 13.0);
        diffuseColor.rgb *= 1.0 + 0.12 * hdOnda * hdTelha;
        hdMetal = (1.0 - 0.8 * hdFerr) * (1.0 - hdTelha); hdRug = 1.0 + 0.3 * hdFerr + 0.35 * hdTelha; hdRel = mix(1.0, 1.6, hdTelha);
        float hdCer = 0.0;
        for (int i = 0; i < 6; i++) { vec4 hA = hdCerA[i], hB = hdCerB[i]; vec2 hdDc = vHdPos.xz - hA.xy;
          vec2 hdLc = vec2(hdDc.x * hA.z - hdDc.y * hA.w, hdDc.x * hA.w + hdDc.y * hA.z);
          hdCer = max(hdCer, step(abs(hdLc.x), hB.x) * step(abs(hdLc.y), hB.y) * step(0.01, hB.x)); }
        hdCer *= hdTelha;
        if (hdCer > 0.0) {
          vec2 hdT = vec2(vMapUv.x / 0.20, vMapUv.y / 0.38); float hdTa = smoothstep(0.6, 0.15, fwidth(hdT.y));
          float hdRow = fract(hdT.y), hdCol = fract(hdT.x + 0.5 * step(0.5, fract(floor(hdT.y) * 0.5)));
          float hdOndaC = 0.5 + 0.5 * cos(hdCol * 6.2832), hdSombra = 1.0 - smoothstep(0.0, 0.18, hdRow);
          vec3 hdTer = vec3(0.34, 0.16, 0.09) * (0.8 + 0.4 * hdH(floor(hdT)));
          hdTer = mix(hdTer, vec3(0.22, 0.20, 0.16), 0.7 * step(0.86, hdH(floor(hdT) + 7.0)));
          hdTer = mix(hdTer, vec3(0.12, 0.14, 0.08), 0.5 * smoothstep(0.55, 0.75, hdN(vHdPos.xz * 1.1 + 3.0)));
          hdTer *= mix(1.0, (0.78 + 0.32 * hdOndaC) * (1.0 - 0.35 * hdSombra), hdTa);
          diffuseColor.rgb = mix(diffuseColor.rgb, hdTer, hdCer); hdMetal *= 1.0 - hdCer; hdRug = mix(hdRug, 1.3, hdCer); hdRel = mix(hdRel, 0.3, hdCer); } }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = min(1.0, roughness * hdRug);')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = metalness * hdMetal;')
      .replace('#include <normal_fragment_maps>', NORMAL_REL); };
  m.customProgramCacheKey = () => `corrego-hd-chapa7-${r.ferrugem}`;
}

// Madeira que fica madeira vira tábua cinza desbotada (ponte, guarda, tablado da travessia) ou compensado claro (albedo ≈ 0,4) em
// chapas de 1,10 × 2,20 m com emenda escura, veio fraco (variação do mapa a 55 %) e AO de vértice a 35 % (barraco, tapume do
// puxadinho, vigas): tex_madeira tem média linear 0,17 e com AO cheio o tapume à sombra ficava em p50 64, chapado.
// Compensado projetado no mundo a 1,10 m (a emenda do tile cai na emenda da chapa) com o mapa deslocado por chapa (hash da
// célula): o tile de 2 × 2 por UV repetia a mesma veia e mostrava a costura no meio do tapume (`rua` x ≈ 150). Escorrido e
// sujeira só fora da faixa do corpo; face inferior (viga sob o tabuleiro) clareia como o tabuleiro.
function madeiraHD(m, r) {
  const comp = r.madeira === 'compensado';
  m.roughness = .9; m.metalness = 0;
  m.onBeforeCompile = (s) => { mundo(s, comp ? 1.1 : 0);
    s.fragmentShader = s.fragmentShader.replace('#include <map_fragment>', `${comp ? `#ifdef USE_MAP
      vec2 hdDeslM = vec2(0.0);
      { vec3 hdGd = abs(normalize(cross(dFdx(vHdPos), dFdy(vHdPos)))); vec2 hdSd = hdGd.y > 0.7 ? vHdPos.xz : (hdGd.x > hdGd.z ? vHdPos.zy : vHdPos.xy);
        vec2 hdCd = floor(hdSd / vec2(1.10, 2.20)); hdDeslM = vec2(hdH(hdCd), hdH(hdCd + 3.0)) * 0.5; }
      vec4 sampledDiffuseColor = texture2D(map, vMapUv + hdDeslM); diffuseColor *= sampledDiffuseColor;
      #endif` : '#include <map_fragment>'}
      float hdBaixoM = 0.0;
      { vec3 hdL = vec3(dot(diffuseColor.rgb, ${LUMA})); ${comp ? 'hdL = mix(vec3(0.17), hdL, 0.55);' : ''} vec2 hdQ = vec2(vHdPos.x + vHdPos.z, vHdPos.y);
        float hdW = hdN(hdQ * 0.8 + 3.0), hdForaM = 1.0 - hdCorpoF(vHdPos.y);
        diffuseColor.rgb = mix(diffuseColor.rgb, hdL * ${comp ? 'vec3(1.96, 1.86, 1.66)' : 'vec3(1.28, 1.32, 1.26)'}, ${comp ? '0.92' : '0.86'}) * mix(${comp ? '0.88, 1.08' : '0.78, 1.12'}, hdW) * hdGrao(hdQ * 0.5);
        ${comp ? `vec3 hdGs = normalize(cross(dFdx(vHdPos), dFdy(vHdPos))), hdGn = abs(hdGs); vec2 hdS = hdGn.y > 0.7 ? vHdPos.xz : (hdGn.x > hdGn.z ? vHdPos.zy : vHdPos.xy);
        vec2 hdG = hdS / vec2(1.10, 2.20), hdFr = abs(fract(hdG) - 0.5), hdPx = fwidth(hdG);
        float hdEm = max(1.0 - smoothstep(0.0, 0.012 + hdPx.x * 1.5, (0.5 - hdFr.x) * 1.10), 1.0 - smoothstep(0.0, 0.012 + hdPx.y * 1.5, (0.5 - hdFr.y) * 2.20));
        diffuseColor.rgb *= mix(0.86, 1.1, hdH(floor(hdG))) * (1.0 - 0.45 * hdEm);
        float hdEsc = smoothstep(0.6, 0.85, hdN(vec2(hdS.x * 2.3, hdS.y * 0.25) + 7.0)) * (1.0 - hdGn.y) * hdForaM;
        hdBaixoM = step(hdGs.y, -0.5); diffuseColor.rgb *= 1.0 + 0.8 * hdBaixoM;` : `float hdSuj = smoothstep(0.5, 0.8, hdN(hdQ * 1.7 + 1.0)) * hdForaM; diffuseColor.rgb *= 1.0 - 0.18 * hdSuj;
        // Tapume da palafita (faces verticais de tex_madeira|ffffff acima de 2 m): compensado claro em chapas de 1,10 × 2,20 com
        // emenda escura — a tábua cinza lia como cubo canelado/contêiner na pose alto. As réguas e cantoneiras são geometria da cenografia.
        vec3 hdGt = abs(normalize(cross(dFdx(vHdPos), dFdy(vHdPos)))); float hdTap = (1.0 - step(0.7, hdGt.y)) * step(2.0, vHdPos.y);
        vec2 hdSt = hdGt.x > hdGt.z ? vHdPos.zy : vHdPos.xy, hdGc = hdSt / vec2(1.10, 2.20), hdFc = abs(fract(hdGc) - 0.5), hdPc = fwidth(hdGc);
        float hdEmT = max(1.0 - smoothstep(0.0, 0.012 + hdPc.x * 1.5, (0.5 - hdFc.x) * 1.10), 1.0 - smoothstep(0.0, 0.012 + hdPc.y * 1.5, (0.5 - hdFc.y) * 2.20));
        vec3 hdCompT = hdL * vec3(1.9, 1.76, 1.5) * mix(0.9, 1.08, hdH(floor(hdGc))) * (1.0 - 0.4 * hdEmT) * (1.0 - 0.14 * hdSuj);
        diffuseColor.rgb = mix(diffuseColor.rgb, hdCompT, hdTap);`} }`)
      .replace('#include <color_fragment>', comp ? aoMeio('mix(0.35, 0.15, hdBaixoM)') : '#include <color_fragment>');
    if (comp) s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * 0.08 * hdBaixoM;'); };
  m.customProgramCacheKey = () => `corrego-hd-madeira10-${r.madeira}`;
}

// Reboco pintado: textura de reboco real projetada no mundo (1,7 m), relevo por normal, e a idade do Sertão (mancha,
// escorrido acima de 1,9 m, trinca, descascado mostrando tijolo com junta, pé sujo). As oito tintas autorais (map_corrego.js
// CORES_ALVENARIA) ficam na v0; v1/v2 trocam a tinta pela sua luma (lição do Lajes: tinta sobre reboco quente + sol quente + AgX
// neutraliza o matiz; m.color = luma × tom é o `diffuse` que entra no mapa E no corpoLiso, logo é o único lugar onde a tinta fica
// uniforme na faixa do corpo) e o tom pastel entra com croma ×1,8 (S ≈ 0,17 ao sol / 0,25 à sombra na tela), luma mantida.
// Tijolo menos saturado e quase só no pé: um buraco de 10 px no alto da empena lia como mancha magenta.
// corpoLiso 1: a mancha da própria reboco_cor_rug (cabeça, rgb≈69/50/32 a 4 m) entrava a 100 % na faixa do corpo; com 0,85 ainda
// sobrava 15 %. Fora da faixa a mancha do mapa entra à metade (`antes`: mip +5 a 50 %) e o macro a 60 %: as manchas de torso
// na palafita (y 2,2–4,9, `alto`) e na parede verde (`parede`) eram o mapa + macro inteiros. Sub-tijolo terroso (não salmão).
// Três acabamentos por tinta (variante = soma dos bytes da cor autoral mod 3, estável por material; pelo hash só e6d4b4 — muro
// externo, uma palafita, barracos da fileira C — caía em v1, invisível nas poses, e TINTA_FIXA sobrepõe: d9c78e, a casa A do bar
// (−9,75; 2,6) e a A leste (−1,1), vira v1 verde-água; c9a883, a B oeste (1,9) à direita/fundo da pose `rua`, fica v2 pelo hash):
// 0 chapisco cinza (grão fino de alta frequência, tinta a 55 %, +4 % de luz), 1 tinta pastel (verde-água/amarelo/azul: tom
// da tabela ou bits 8+16 da cor) descascada só acima de 2,1 m, 2 cinza-massa (luma, S ≈ 0,05: 90 % para a luma e 0,97/0,98/1,0
// contra o sol) com remendos de massa acima de 2,1 m — relativos à parede (luma × 1,06, dessaturados): placas de cor fixa liam
// como planos claros flutuando. Nada entra na faixa do corpo (0,45–2,1 m) além de tinta uniforme e grão; rodapé escuro de 0,45 m.
const SUB_TIJOLO = { tex: null, metros: 1.0, cor: [.9, .66, .5], tijolo: true, pe: .58, alto: .66, y0: 0, foraDoCorpo: true, sat: .65, forca: 1, beico: .55 };
const TINTA_PASTEL = [[0.738, 1.128, 1.026], [1.10, 1.02, 0.62], [0.824, 0.978, 1.596]];   // verde-água, amarelo, azul (luma 1)
const TINTA_FIXA = { 0xd9c78e: [1, 0], 0xe6d4b4: [1, 0] };   // [variante, tom] — e6d4b4 divide a parede do bar com d9c78e: mesmo verde-água (azul fazia costura lilás)
const varianteReboco = (v) => [
  `float hdChp = smoothstep(0.5, 0.1, fwidth(hdQb.x) * 40.0) * (hdN(hdQb * 40.0) - 0.5) * 0.5 + smoothstep(0.5, 0.1, fwidth(hdQb.x) * 90.0) * (hdN(hdQb * 90.0) - 0.5) * 0.25;
   diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, ${LUMA})) * vec3(0.98, 0.98, 0.95), 0.45) * 1.04 * (1.0 + hdChp);`,
  `// Descascado de borda DURA (largura = fwidth do ruído) acima de 2,1 m: massa cinza por baixo, lábio escuro da tinta na borda.
   float hdDn = hdN(hdQb * 0.9 + 5.0) * 0.7 + hdN(hdQb * 3.1) * 0.3, hdDw = max(0.004, fwidth(hdDn) * 0.8), hdDalto = hdAltoB;
   float hdDesc = smoothstep(0.52, 0.52 + hdDw, hdDn) * hdDalto, hdLabio = smoothstep(0.49, 0.52, hdDn) * (1.0 - hdDesc) * hdDalto;
   diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.30, 0.30, 0.28) * (0.85 + 0.3 * hdN(hdQb * 7.0)), hdDesc) * (1.0 - 0.3 * hdLabio);`,
  `diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, ${LUMA})), 0.9) * vec3(0.97, 0.98, 1.0);
   vec2 hdCel = floor(hdQb / vec2(1.3, 1.1)), hdCf = abs(fract(hdQb / vec2(1.3, 1.1)) - 0.5);
   float hdRem = step(0.78, hdH(hdCel + 3.0)) * step(max(hdCf.x, hdCf.y), 0.42) * hdAltoB;
   diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, ${LUMA})) * vec3(1.06, 1.06, 1.03) * (0.92 + 0.16 * hdN(hdQb * 5.0)), 0.8 * hdRem);`,
][v];
function rebocoHD(m) {
  SUB_TIJOLO.tex ||= pbrTex('/pbr_bricks051_color', true);
  const hex = m.color.getHex(), [v, t] = TINTA_FIXA[hex] || [((hex & 255) + ((hex >> 8) & 255) + (hex >> 16)) % 3, ((hex >> 8) & 1) + ((hex >> 16) & 1)];
  // v1/v2: a cor autoral vira a sua luma (linear) × tom (pastel já com croma ×1,8: 1 + 1,8·(tom − 1), luma 1), reescalada para
  // manter a luma de tela sob o reboco_cor_rug (quente, direção 69/50/32): tinta quente × textura quente somava +8–10 % que
  // a neutra perde — sem isto o p50 da cinza-massa caía de 56 para ≈ 52.
  if (v) {
    const c = m.color, d = [c.r, c.g, c.b], T = [0.0595, 0.0319, 0.0144], W = [0.3, 0.59, 0.11], lu = (a, b) => a.reduce((s, k, i) => s + W[i] * k * (b ? b[i] : 1), 0);
    const p = v === 1 ? TINTA_PASTEL[t].map((k) => 1 + 1.8 * (k - 1)) : [1, 1, 1], l = lu(d, T) / lu(p, T);
    c.setRGB(l * p[0], l * p[1], l * p[2]);
  }
  m.map = tex('reboco_cor_rug'); m.normalMap = tex('reboco_normal', false); m.roughnessMap = null; m.roughness = 1; m.normalScale.set(1.3, 1.3);
  const depois = `{ float hdRod = (1.0 - smoothstep(0.42, 0.46, hdYb)) * (1.0 - hdPisoB);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.085, 0.085, 0.082) * (0.85 + 0.3 * hdN(hdQb * 6.0)), 0.8 * hdRod); hdRugA = mix(hdRugA, 0.75, hdRod); }`;
  // A variante roda ANTES de idadeDaParede: o buraco de tijolo (sub) pinta por cima do descascado/remendo, que antes o cobria.
  const antes = `float hdRugA = texture2D(map, vMapUv).a; diffuseColor.a = 1.0;
    float hdYb = vHdPos.y; vec2 hdQb = vec2(vHdPos.x + vHdPos.z, hdYb); vec3 hdGb = abs(normalize(cross(dFdx(vHdPos), dFdy(vHdPos)))); float hdPisoB = step(0.7, hdGb.y);
    // Faixa do corpo relativa a CADA piso andável (lajes a 2,8k, travessia 5,6, palafita 2,2): descascado/remendo/tijolo só na
    // faixa 2,1–2,6 m acima do piso (sob a laje). Em y de mundo, a palafita (corpo a 2,2) e a parede alta da pose alto descascavam na altura do torso.
    float hdYf = mod(hdYb, 2.8), hdAltoB = smoothstep(2.05, 2.15, hdYf) * (1.0 - smoothstep(2.55, 2.65, hdYf));
    { vec3 hdMedA = diffuse * texture2D(map, vMapUv, 5.0).rgb; diffuseColor.rgb = mix(diffuseColor.rgb, hdMedA, 0.5); }
    { ${varianteReboco(v)} }`;
  projetaMundo(m, 1.7, { rodape: .5, sub: SUB_TIJOLO, pe: { altura: .5, cor: [.40, .38, .34], escuro: .3 }, corpoLiso: 1, macro: .6, extra: { chave: `corrego-reb10-v${v}`, antes, depois } });
  const obc = m.onBeforeCompile, chave = m.customProgramCacheKey;
  // O gate do tijolo (sub.foraDoCorpo, map_sertao_hd.js) é em y de mundo (> 2,1 ou < 0,45): troca pela faixa por piso (hdAltoB).
  m.onBeforeCompile = (s) => { obc(s); s.fragmentShader = s.fragmentShader.replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * hdRugA;')
    .replace('float hdFora = smoothstep(2.1, 2.25, hdY) + 1.0 - smoothstep(0.38, 0.5, hdY);', 'float hdFora = hdAltoB;'); };
  m.customProgramCacheKey = () => `${chave()}-rug2`;
}

// Tijolo cru (pbr_bricks051, cuja UV repetia o tile a cada ~180 px): bloco cerâmico de 6 furos 39 × 19 cm assentado com
// junta cinza de 1,5 cm, projetado em metros; tom por bloco e por fiada (quase plano na faixa do corpo), argamassa escorrida/
// respingada sobre o bloco, cinta de concreto de 15 cm no topo de cada pavimento (y = k·2,8) e verga corrida de 12 cm no nível
// dos vãos (2,15 m do piso, o topo da janela autoral) com sombra de 3 cm abaixo, e topo horizontal (piso da laje) em concreto.
// O mapa fica só como grão. Bloco laranja desbotado 0,42/0,14/0,06 (≈ 172/105/68 sRGB; sol + AgX lavam o matiz, croma alta
// de propósito) com junta cinza-clara 1,8 cm: o 0,40/0,215/0,135 lia como tijolinho escuro uniforme (sat 0,25) a 1500 px.
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
        float hdJunta = (1.0 - smoothstep(0.0, 0.018 + max(hdPx.x * 0.4, hdPx.y * 0.2) * 1.5, min(hdDj.x, hdDj.y))) * hdLonge;
        float hdVar = mix(1.0, 0.45, hdCorpoF(hdY)), hdTom = mix(1.0, mix(0.84, 1.12, hdH(floor(hdB))), hdVar) * mix(0.95, 1.05, hdH(vec2(hdFi, 7.0)));
        vec3 hdBloco = vec3(0.42, 0.14, 0.06) * hdTom * hdGr * (0.9 + 0.2 * hdN(hdQ * 9.0));
        vec3 hdArg = vec3(0.36, 0.35, 0.33) * (0.8 + 0.4 * hdN(hdQ * 23.0));
        float hdResp = smoothstep(0.66, 0.74, hdN(hdQ * 6.0 + 1.0) * 0.55 + hdN(vec2(hdU * 2.0, hdY * 0.5) + 4.0) * 0.45) * hdLonge * (1.0 - 0.7 * hdCorpoF(hdY));
        vec3 hdC = mix(mix(hdBloco, hdArg, 0.18 * (1.0 - hdLonge)), hdArg * 1.08, max(hdJunta, 0.85 * hdResp));
        float hdMod = fract(hdY / 2.8) * 2.8, hdCinta = max(max(smoothstep(2.63, 2.66, hdMod), hdPiso), smoothstep(2.13, 2.16, hdMod) * (1.0 - smoothstep(2.29, 2.32, hdMod)));
        float hdSombraV = smoothstep(2.09, 2.11, hdMod) * (1.0 - smoothstep(2.12, 2.14, hdMod)) * (1.0 - hdPiso);
        vec3 hdConc = vec3(0.40, 0.39, 0.36) * (0.85 + 0.3 * hdN(hdQ * 2.1)) * hdGrao(hdQ);
        hdC = mix(hdC, hdConc, hdCinta) * (1.0 - 0.4 * hdSombraV);
        float hdEsc = smoothstep(0.66, 0.86, hdN(vec2(hdU * 1.1, hdY * 0.18))) * (1.0 - hdPiso) * smoothstep(1.9, 3.0, hdY);
        hdC = hdUmido(hdC, 0.45 * hdEsc) * (1.0 - 0.25 * hdEsc);
        float hdSuj = smoothstep(0.55, 0.04, hdY) * (1.0 - hdPiso); hdC = hdUmido(hdC, 0.5 * hdSuj) * (1.0 - 0.3 * hdSuj);
        diffuseColor.rgb = hdC; hdRug = mix(0.95, 0.8, hdCinta); }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * hdRug;'); };
  m.customProgramCacheKey = () => 'corrego-hd-bloco3';
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
// água/margem era a "linha de 1 px" apontada; vira filete cinza-oliva estreito. Água marrom-oliva (0x4a4830 rasa / 0x201f14
// funda: verde-cinza lia como piscina), nata bege-oliva. Com `espuma`, o fragmento ganha nata marrom
// nos cantos (|x| > 2,2 m, junto aos muros) lida da textura B que já está no shader; a string original volta em desliga().
const ESPUMA_ANCORA = 'cor = mix(cor, uCeuCor, fres * 0.22);';
function aguaHD(scene, espuma) {
  let malha = null; scene.traverse((o) => { if (o.userData?.aguaViva && o.material?.uniforms) malha = o; });
  if (!malha) return () => {};
  const mat = malha.material, u = mat.uniforms, cores = {}, nums = {}, frag = mat.fragmentShader;
  for (const [k, v] of [['uCorRasa', 0x4a4830], ['uCorFunda', 0x201f14], ['uCorEspuma', 0x9c9a86]]) if (u[k]?.value?.isColor) { cores[k] = u[k].value.getHex(); u[k].value.setHex(v); }
  for (const [k, v] of [['uEspumaFaixa', .14], ['uEspumaMiolo', .05]]) if (typeof u[k]?.value === 'number') { nums[k] = u[k].value; u[k].value = Math.min(u[k].value, v); }
  const patch = espuma && typeof frag === 'string' && frag.includes(ESPUMA_ANCORA) && u.tNormalB && u.uTime;
  if (patch) {
    mat.fragmentShader = frag.replace(ESPUMA_ANCORA, `{ float hdB = smoothstep(2.2, 2.95, abs(vWorld.x)); float hdP = texture2D(tNormalB, vWorld.xz / 2.6 + uTime * vec2(0.012, 0.03)).g;
    float hdE = hdB * smoothstep(0.50, 0.78, hdP + 0.22 * hdB); cor = mix(cor, vec3(0.34, 0.29, 0.19), hdE * 0.75); alfa = max(alfa, hdE * 0.85); }
  ${ESPUMA_ANCORA}`); mat.needsUpdate = true;
  }
  return () => { for (const k in cores) u[k].value.setHex(cores[k]); for (const k in nums) u[k].value = nums[k]; if (patch) { mat.fragmentShader = frag; mat.needsUpdate = true; } };
}
// Placas de espuma autorais (map_corrego.js: 7 caixas de 1,8 cm em CANAL_AGUA + 0,02 e 4 bolhas em + 0,06, material cor pura
// 0xf0ecd3 transparente): quads flutuando 2 cm ACIMA da lâmina liam como placas claras soltas (`ponte`). Descem até ficar 60 %
// submersas (caixa: fundo em −1,621; bolha: 3 mm acima da lâmina). Posição restaurada em desliga().
function afundaEspuma(scene) {
  const movidos = [];
  scene.traverse((o) => { if (!o.isMesh) return; const m = o.material; if (!m || Array.isArray(m) || !m.transparent || (m.userData.hdChave !== '|f0ecd3' && m.color?.getHex() !== 0xf0ecd3)) return;
    const circ = o.geometry?.type === 'CircleGeometry', y0 = o.position.y;
    o.position.y = circ ? -1.61 + 0.003 : -1.621 + 0.009; movidos.push([o, y0]); });
  return () => { for (const [o, y] of movidos) o.position.y = y; };
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
  const ITENS = ['postes', 'fachadas', 'palafitas', 'lajes', 'telhados', 'canal', 'margem', 'varais', 'roupas', 'sacos', 'toldos', 'comercio', 'guias', 'skyline', 'portoes', 'becos', 'guarda'];
  const qCen = q.get('hdcen'), soEstes = qCen && qCen !== '0' && qCen !== '1' ? qCen.split(',') : null;
  const oCen = opts.cenografia === false || qCen === '0' ? null : { ...(opts.cenografia || {}) };
  if (oCen && soEstes) for (const k of ITENS) if (!soEstes.includes(k)) oCen[k] = false;
  if (oCen && !o.canal) { oCen.canal = false; oCen.margem = false; }
  const guardaCen = !!oCen && oCen.guarda !== false && o.travessia; if (oCen) oCen.guarda = guardaCen;
  const antes = [], aniso = [], feitos = new WeakSet(), marcados = new Set(), casados = new Set(), desfazVaos = [], criadas = [];
  const U = { janelas: { value: null }, portas: { value: null }, cerA: { value: Array.from({ length: 6 }, () => new THREE.Vector4()) }, cerB: { value: Array.from({ length: 6 }, () => new THREE.Vector4()) } };
  const mundoJogo = opts.mundo || (typeof window !== 'undefined' ? window.__game?.world : null);
  // ?hdcalcada=0: chão com a lista fixa de |x| (sem campo de fachadas); sem colisores o campo também não existe.
  const campo = o.chao && o.texturas && q.get('hdcalcada') !== '0' ? campoFachadas(mundoJogo?.colliders) : null;
  // Tira autoral de limo no TOPO do muro do canal (matLimo, 0,36 × 0,08 m em y −0,04…0,04): o lip de 4 cm fora da guia, virado
  // ao sol, era a linha branca pontilhada de 1 px na aresta do canal (`ponte`, `alto`). Some; a faixa da linha d'água (0,5 m) fica.
  const escondidos = [], limoTopo = (obj) => { if (obj.userData.hdLimoVisto) return; obj.userData.hdLimoVisto = true;
    const g = obj.geometry; if (!g.boundingBox) g.computeBoundingBox(); const b = g.boundingBox;
    if (b.max.y - b.min.y < 0.12 && obj.visible) { obj.visible = false; escondidos.push(obj); } };
  let vivo = true, tempo = 0;
  const aplica = (m, r, obj) => {
    antes.push({ m, map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap, cor: m.color.getHex(), emissive: m.emissive.getHex(), roughness: m.roughness, metalness: m.metalness, opacity: m.opacity, ns: m.normalScale.x, vc: m.vertexColors, obc: m.onBeforeCompile, key: m.customProgramCacheKey });
    if (r.cor !== undefined) m.color.setHex(r.cor);
    if (r.rugosidade !== undefined) m.roughness = r.rugosidade;
    if (r.metal !== undefined) m.metalness = r.metal;
    if (r.opacidade !== undefined) m.opacity = r.opacidade;
    if (r.semMapa) { m.map = null; m.normalMap = null; m.roughnessMap = null; }
    if (r.janela) { if (!U.janelas.value) criadas.push(U.janelas.value = atlasJanelas(), U.portas.value = atlasPortas()); const d = marcaVaos(obj); if (d) desfazVaos.push(d); }
    if (r.concreto || r.semEmissivo) m.emissive.setHex(0x000000);
    if (r.chao) chaoHD(m, o.poca, campo); else if (r.reboco) rebocoHD(m); else if (r.bloco) blocoHD(m); else if (r.janela) janelaHD(m, U); else if (r.concreto) concretoHD(m, r); else if (r.chapa) chapaHD(m, r, U); else if (r.madeira) madeiraHD(m, r); else if (r.linhaDagua) linhaDaguaHD(m);
    // Cor pura com shader próprio: ?hdeletro=0 deixa só a cor/rugosidade da regra (fallback chapado, nunca o material original).
    else if (r.geladeira) { if (o.eletro) geladeiraHD(m); } else if (r.pilar) { if (o.eletro) pilarHD(m); } else if (r.saco) sacoHD(m); else if (r.guarda) guardaHD(m, !guardaCen); else if (r.espuma) espumaHD(m); else if (r.limo) { limoHD(m); limoTopo(obj); }
    for (const t of [m.map, m.normalMap]) if (t && t.anisotropy < 8) { aniso.push([t, t.anisotropy]); t.anisotropy = 8; t.needsUpdate = true; }
    // dispose() solta os programas antigos do material (o three guarda todas as variantes até lá).
    m.dispose(); m.needsUpdate = true;
  };
  // Casamento por chave; material cujo mapa ainda não chegou fica pendente e volta na próxima passada. O vão é o único
  // que precisa do mesh (atributos): se o mesmo material aparecer noutro mesh, este também ganha os atributos.
  const casa = () => { let pendentes = 0;
    scene.traverse((obj) => { if (!obj.isMesh || obj.isSkinnedMesh) return; for (const m of materiaisDe(obj)) { if (!m.isMeshStandardMaterial) continue;
      if (feitos.has(m)) { if (m.userData.hdChave === 'concrete_br|2b2a27' && o.janela) { const d = marcaVaos(obj); if (d) desfazVaos.push(d); } if (m.userData.hdChave === 'canvas512|3e5c40' && o.canal) limoTopo(obj); continue; }
      if (m.map && !nomeDe(m.map)) { pendentes++; continue; }
      const chave0 = chaveDe(m), chave = chave0 === 'tex_madeira|ffffff' && m.map.repeat.x === 1 && m.map.repeat.y === 1 ? `${chave0}|guarda` : chave0, r = REGRAS[chave]; feitos.add(m); m.userData.hdChave = chave; marcados.add(m);
      if (!r || (r.frente && !o[r.frente])) continue;
      casados.add(chave); aplica(m, r, obj); } });
    return pendentes; };
  if (o.texturas) { const t0 = performance.now(); const passo = () => { if (!vivo) return; if (casa() && performance.now() - t0 < 20000) tempo = setTimeout(passo, 300); }; passo(); }
  const ceramicos = [], cen = oCen ? cenografiaCorrego(scene, { ...oCen, mundo: mundoJogo, ceramicos }) : null;
  // Telhados cerâmicos escolhidos pela cenografia (1 em 4 + palafita da pose `alto`): caixa orientada (x, z, cos, sin) e meios-lados.
  ceramicos.slice(0, 6).forEach((c, i) => { U.cerA.value[i].set(c.x, c.z, c.cs, c.sn); U.cerB.value[i].set(c.ha, c.hb, 0, 0); });
  const desfazEspuma = o.canal ? afundaEspuma(scene) : () => {};
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
    for (const obj of escondidos) { obj.visible = true; delete obj.userData.hdLimoVisto; }
    for (const d of desfazVaos) d();
    campo?.dispose();
    for (const t of criadas) t.dispose();
    cen?.desliga(); desfazAgua(); desfazProps(); desfazMato(); desfazRoupas(); desfazSacos(); desfazGatos(); desfazLuz(); desfazEspuma();
  } };
}
